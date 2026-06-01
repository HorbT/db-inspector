# SQLite 流式巡检报告系统设计

**日期**: 2026-06-01
**版本**: v1.0

---

## 1. 背景与问题

### 现状
当前巡检报告生成流程：
1. Python 后端一次性执行全部 SQL 脚本
2. 每条结果转成 HTML `<table>` 字符串
3. 全部塞入模板匹配 `{ result_N }` 占位符
4. 生成一个完整的单体 HTML 文件

### 痛点
- HTML 文件随数据量膨胀，大库巡检可能到几十 MB
- 浏览器加载时一次性渲染全部 DOM，卡顿甚至 OOM
- 用户打开报告后要等很久才能开始浏览

### 目标
- 巡检结果存入 SQLite，报告改为「骨架 + 按需加载」模式
- 报告可在 Electron 前端和外部浏览器中同时访问
- 保留导出完整 HTML 文件的能力（用于离线分享）

---

## 2. 整体架构

```
[Python Backend]              [Electron Main Process]          [Browser / Renderer]
      |                               |                              |
  逐条执行SQL ── stderr [DBG] ──→  LGWR Buffer                   Report Shell
      |                           (累积 + 触发写入)                 (纯 HTML+JS+CSS)
      |                               |                              |
      |                           better-sqlite3                     ↓ HTTP
      |                               ↓                        GET /api/report/:dbId/meta
      |                           inspection_xxx.db            GET /api/report/:dbId/result/:num
      |                               |                       GET /api/report/:dbId/results
      |                               |                              |
      |                           Express HTTP(:PORT)  ─────────────┘
      |                           WebSocket /ws (进度推送)
```

### 关键模块

| 模块 | 位置 | 职责 |
|------|------|------|
| LGWR Buffer | `src/main/services/lgwr-buffer.ts` | 累积结果，按 5 条触发规则 flush 到 SQLite |
| ReportDB | `src/main/services/report-db.ts` | better-sqlite3 CRUD 封装 |
| ReportServer | `src/main/services/report-server.ts` | Express HTTP 服务器 + WebSocket |
| ReportShell | `src/renderer/report/` | React 前端报告查看器（含导出） |
| Python Inspector | 已有，微调 | 去掉 report_generator.py，结果通过 stderr 逐条转发 |

---

## 3. SQLite 数据库设计

每个巡检任务一个 `.db` 文件，路径格式：
`{resultBasePath}/{dbType}/{dbName}_{timestamp}/inspection.db`

### 表结构

```sql
-- 巡检元信息
CREATE TABLE inspection_meta (
    key    TEXT PRIMARY KEY,
    value  TEXT
);
-- meta key 列表: description, generated_time, server_info, db_type, db_name

-- 巡检结果
CREATE TABLE inspection_results (
    file_name   TEXT NOT NULL,      -- '0.sql'
    file_num    INTEGER NOT NULL,   -- 0
    section     TEXT,               -- 'basic' | 'topology' | 'runtime' | 'config' | 'assets' | 'tasks'
    columns     TEXT,               -- JSON array: ["col1","col2"]
    row_count   INTEGER DEFAULT 0,  -- 总行数
    row_pages   INTEGER DEFAULT 0,  -- 分页数
    error       TEXT,               -- 错误信息(nullable)
    created_at  TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (file_num)
);

-- 结果数据分页存储（避免单条 JSON 太大）
CREATE TABLE result_pages (
    file_num    INTEGER NOT NULL,
    page_idx    INTEGER NOT NULL,   -- 0, 1, 2...
    page_data   TEXT NOT NULL,      -- JSON: [[row1], [row2], ...]
    PRIMARY KEY (file_num, page_idx),
    FOREIGN KEY (file_num) REFERENCES inspection_results(file_num)
);

-- 巡检进度（供 WebSocket 推送）
CREATE TABLE inspection_progress (
    id          INTEGER PRIMARY KEY DEFAULT 1,
    total       INTEGER DEFAULT 0,
    completed   INTEGER DEFAULT 0,
    status      TEXT DEFAULT 'running',  -- 'running' | 'completed' | 'failed'
    updated_at  TEXT DEFAULT (datetime('now'))
);
```

### 分页策略
- 每页最多 200 行
- 首次展示只返回 page_0
- 表格底部提供「加载更多」按钮或滚动自动加载下一页

---

## 4. LGWR 写入缓冲区

### 触发规则（5 条）

| 规则 | 触发条件 | 阈值 | 类比 Oracle |
|------|----------|------|------------|
| T1 | 定时器超时 | 2 秒 | LGWR 3秒超时 |
| T2 | buffer 累积条数 | >= 5 条 | redo buffer 1/3 满 |
| T3 | 单条结果过大 | row JSON > 500KB | 1MB threshold |
| T4 | section 切换 | 板块变更 | 类比 COMMIT |
| T5 | 巡检结束 | Python 进程返回 | Checkpoint |

### 伪代码

```typescript
class LgwrBuffer {
  private buffer: InspectionResult[] = [];
  private timer: NodeJS.Timeout | null = null;
  private lastSection: string | null = null;
  private db: ReportDB;

  push(result: InspectionResult): void {
    this.buffer.push(result);
    this.startTimerIfNeeded();

    // T3: 大结果立即 flush
    if (this.estimateSize(result) > 500 * 1024) {
      this.flush();
      return;
    }
    // T2: 条数阈值
    if (this.buffer.length >= 5) {
      this.flush();
      return;
    }
    // T4: 板块切换
    if (result.section !== this.lastSection && this.lastSection !== null) {
      this.flush();
    }
    this.lastSection = result.section;
  }

  // T1: 定时器
  private startTimerIfNeeded(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.flush();
      this.timer = null;
    }, 2000);
  }

  // T5: 巡检结束
  finalize(status: string): void {
    if (this.timer) clearTimeout(this.timer);
    this.flush();
    this.db.setProgressStatus(status);
    this.db.vacuum();
  }

  private flush(): void {
    if (this.buffer.length === 0) return;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    const batch = [...this.buffer];
    this.buffer = [];
    this.db.insertBatch(batch);
  }
}
```

---

## 5. Express HTTP 服务器

### API 设计

| Method | Path | 说明 | 响应 |
|--------|------|------|------|
| GET | `/api/reports` | 列出所有已完成的巡检报告 | `[{dbId, dbType, dbName, time, description}]` |
| GET | `/api/report/:dbId/meta` | 获取巡检元信息 | `{description, generated_time, server_info, db_type, db_name}` |
| GET | `/api/report/:dbId/result/:num` | 获取单条结果 | `{fileName, columns, rows, rowCount, hasMore, error}` |
| GET | `/api/report/:dbId/result/:num/page/:page` | 获取某条结果的指定页 | `{pageIdx, rows}` |
| GET | `/api/report/:dbId/results` | 获取全部结果（导出用） | `[{fileName, columns, rows, section}, ...]` |
| GET | `/api/report/:dbId/progress` | 获取当前进度 | `{total, completed, status}` |
| GET | `/` | 报告 Shell 页面 | HTML |
| GET | `/report/:dbId` | 指定报告的 Shell 页面 | HTML (含 dbId 参数) |
| WS | `/ws` | 巡检进度实时推送 | `{type:"progress", total, completed, status}` |

### 端口分配
- 默认 `18921`（可在配置中修改）
- 启动时检测端口占用，自动递增直到找到可用端口

### 静态资源
- `/assets/libs/` → `resources/dbinspection/common/report_template/libs/`
- `/assets/template/` → `resources/dbinspection/{dbType}/report_template/`

---

## 6. 前端报告查看器

### 两种查看模式

| 模式 | 技术栈 | 入口 | 说明 |
|------|--------|------|------|
| **Electron 内嵌** | React + TypeScript | 应用内"查看报告"按钮 | 侧边栏集成，功能完整，直接通过 HTTP API 获取数据 |
| **外部浏览器** | 纯 HTML+CSS+JS（无框架依赖） | `http://localhost:PORT/report/:dbId` | Express 返回的静态 Shell 页面，同样通过 HTTP API 获取数据 |

两种模式共享同一套 HTTP API，核心差异只在 UI 框架。

### 6.1 Electron React 模式

组件树：

```
ReportViewer
├── ReportHeader          ← meta 信息（一次加载）
│   ├── 巡检描述、时间
│   ├── 数据库类型、版本
│   └── 导出按钮
├── ReportSidebar         ← 导航（由 section 元数据生成）
│   └── SectionNav[]
└── ReportContent         ← 滚动区域
    ├── Section("集群基础信息")
    │   ├── ResultBlock(fileNum=0)   ← IntersectionObserver 懒加载
    │   ├── ResultBlock(fileNum=1)
    │   └── ...
    ├── Section("集群运行状态")
    │   └── ...
    └── ...
```

### 6.2 外部浏览器模式

单个 `report_viewer.html` 文件，由 Express 的 `GET /report/:dbId` 返回。
包含内联的 CSS（复用 Tailwind CDN）+ JS（fetch + Chart.js CDN + IntersectionObserver），
结构逻辑与 React 模式等价，但不依赖构建工具。

两种模式的数据加载流程相同，见 6.3。

### 6.3 数据加载流程

1. 页面打开 → fetch `/api/report/:dbId/meta` → 渲染 header + 导航
2. 导航生成 → fetch `/api/report/:dbId/result/:num?meta_only=1` 获取所有 file_num/section/file_name 列表
3. 各 `ResultBlock` 挂载到可视区域（IntersectionObserver） → fetch `/api/report/:dbId/result/:num` → 渲染表格
4. 图表渲染同理，数据到位后 new Chart.js

### 结果渲染优化
- 表格行超过 200 行时分页，默认显示前 200 行 + "展开全部"/"加载下一页"
- 错误结果单独样式展示（红色边框）
- 空结果显示 "无数据"
- 图表数据准备好后异步渲染，不影响表格先展示

---

## 7. 导出 HTML 功能

前端点击「导出」按钮：

1. 前端 fetch `/api/report/:dbId/results` 获取全部数据
2. 前端 fetch 模板 HTML 骨架（`/assets/template/report_template.html`）
3. 在前端执行占位符替换（复用现有的 Python report_generator 逻辑改为 JS 实现）
4. 通过 `<a download>` 或 Blob URL 触发浏览器下载

---

## 8. 需要删除/废弃的模块

- `python-backend/core/report_generator.py` — 整个文件删除
- `src/main/ipc/report.ipc.ts` 中的 `report:read` 处理（不再需要读取完整 HTML 文件）

---

## 9. 需要新增的模块

| 文件 | 说明 |
|------|------|
| `src/main/services/report-db.ts` | better-sqlite3 CRUD 封装 |
| `src/main/services/lgwr-buffer.ts` | LGWR 写入缓冲区 |
| `src/main/services/report-server.ts` | Express HTTP 服务器 + WebSocket |
| `src/main/services/report-exporter.ts` | 导出 HTML 的后端辅助（可选） |
| `src/renderer/report/ReportViewer.tsx` | 报告查看器主组件 |
| `src/renderer/report/ReportHeader.tsx` | 报告头部 |
| `src/renderer/report/ReportSidebar.tsx` | 左侧导航 |
| `src/renderer/report/ReportContent.tsx` | 内容区域容器 |
| `src/renderer/report/ResultBlock.tsx` | 单个结果块（懒加载） |
| `src/renderer/report/DataTable.tsx` | 数据表格组件（支持分页） |
| `src/renderer/report/ChartBlock.tsx` | 图表块（Chart.js） |
| `src/renderer/report/reportExport.ts` | 前端导出逻辑 |

---

## 10. StarRocks section 映射

SQL 文件编号到板块的映射关系（在 LGWR 中自动标记）：

```
0      → 'basic'      会话与版本信息
1-4    → 'topology'   FE/BE/Compute/Broker 节点
5-9    → 'runtime'    集群运行状态
10-12  → 'config'     配置与权限
13-16  → 'assets'     数据资产概览
17-21  → 'tasks'      数据任务管理
```

---

## 11. Python 后端改动

改动最小化：
1. 删除 `report_generator.py`
2. `inspector.py` 中每条 SQL 执行完毕后，通过 stderr 发送 `[DBG]:RESULT:<JSON>` 格式的消息
3. `execute()` 返回 `{ status: 'completed', total: N }`，不再返回 results 数组

### Python → Electron 消息格式

**普通调试消息**（已有机制，不变）：
```
[DBG] connecting to database...
```

**结果数据消息**（新增，LGWR buffer 消费）：
```
[DBG]:RESULT:{"file_name":"0.sql","file_num":0,"section":"basic","columns":["now_date","CONNECTION_ID","db_name","current_version","tx_isolation","autocommit"],"rows":[["2026-06-01 10:30:00","12345","test_db","3.2.0","READ-COMMITTED","1"]],"row_count":1}
```

**大结果集**：当 rows 列表很大时，Python 端按 200 行分页发送：
```
[DBG]:RESULT:{"file_name":"14.sql","file_num":14,"section":"assets","columns":["db_name","ob_type","sums"],"rows":[...最多200行...],"row_count":450,"page":0,"has_more":true}
[DBG]:RESULT:{"file_name":"14.sql","file_num":14,"section":"assets","rows":[...200行...],"page":1,"has_more":true}
[DBG]:RESULT:{"file_name":"14.sql","file_num":14,"section":"assets","rows":[...最后50行...],"page":2,"has_more":false}
```

**错误消息**：
```
[DBG]:RESULT:{"file_name":"5.sql","file_num":5,"section":"runtime","error":"Connection timeout after 300s"}
```

**巡检完成消息**：
```
[DBG]:COMPLETE:{"status":"completed","total":22}
[DBG]:COMPLETE:{"status":"failed","total":22,"error":"Connection lost"}
```

### Result JSON Schema

```typescript
interface ResultMessage {
  file_name: string;           // '0.sql'
  file_num: number;            // 0
  section: string;             // 'basic' | 'topology' | 'runtime' | 'config' | 'assets' | 'tasks'
  columns?: string[];          // 仅第一页有
  rows?: any[][];              // 当前页数据
  row_count?: number;          // 总行数（仅第一页有）
  page?: number;               // 当前页号，0-based
  has_more?: boolean;          // 是否还有下一页
  error?: string;              // 错误信息
}
```

---

## 12. 风险与注意事项

- **better-sqlite3 是 native addon**，需确认 Electron 构建配置兼容
- **端口冲突**：使用 portfinder 或自动递增策略
- **大数据结果**：单条 SQL 返回 10万+ 行时，分页存储避免 JSON 序列化爆内存
- **并发巡检**：多个巡检任务应使用不同的 db 文件，互不冲突
- **报告 Shell 是纯静态 HTML + JS**，不依赖 React/Electron API，确保浏览器兼容性