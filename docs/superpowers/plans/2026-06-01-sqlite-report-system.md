# SQLite 流式巡检报告系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将巡检报告从"单体巨型 HTML"改为"SQLite 存储 + 按需加载 + HTTP API"模式，在 Electron 和外部浏览器中均可流畅查看。

**Architecture:** Python 逐条输出 RESULT 消息 → Electron LGWR Buffer 批量写入 SQLite → Express HTTP API 提供数据 → React 组件 / 纯 HTML 查看器按 IntersectionObserver 懒加载渲染。

**Tech Stack:** better-sqlite3, Express, ws (WebSocket), React + TypeScript + Tailwind + Zustand, Chart.js（CDN）

---

### Task 0: 安装新依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装 better-sqlite3, express, ws 及类型定义**

```bash
cd "E:/ClaudeCode/db-inspector"
npm install better-sqlite3 express ws
npm install --save-dev @types/better-sqlite3 @types/express @types/ws
```

- [ ] **Step 2: 验证原生模块兼容 Electron**

```bash
npx electron-rebuild -f -w better-sqlite3
```

Expected: 无错误输出，better-sqlite3 编译通过。

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add better-sqlite3, express, ws dependencies"
```

---

### Task 1: 创建 ReportDB 服务

**Files:**
- Create: `src/main/services/report-db.ts`

ReportDB 封装 better-sqlite3 的所有 CRUD 操作，是 LGWR Buffer 和 ReportServer 的共享数据层。

- [ ] **Step 1: 编写 ReportDB 类**

```typescript
// src/main/services/report-db.ts
import Database from 'better-sqlite3';
import path from 'path';

export interface InspectionMetaRow {
  key: string;
  value: string;
}

export interface InspectionResultRow {
  file_name: string;
  file_num: number;
  section: string;
  columns: string | null;
  row_count: number;
  row_pages: number;
  error: string | null;
  created_at: string;
}

export interface ResultPageRow {
  page_idx: number;
  page_data: string;
}

export class ReportDB {
  private db: Database.Database;
  readonly dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.createTables();
  }

  private createTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS inspection_meta (
        key    TEXT PRIMARY KEY,
        value  TEXT
      );

      CREATE TABLE IF NOT EXISTS inspection_results (
        file_name   TEXT NOT NULL,
        file_num    INTEGER NOT NULL PRIMARY KEY,
        section     TEXT,
        columns     TEXT,
        row_count   INTEGER DEFAULT 0,
        row_pages   INTEGER DEFAULT 0,
        error       TEXT,
        created_at  TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS result_pages (
        file_num    INTEGER NOT NULL,
        page_idx    INTEGER NOT NULL,
        page_data   TEXT NOT NULL,
        PRIMARY KEY (file_num, page_idx),
        FOREIGN KEY (file_num) REFERENCES inspection_results(file_num)
      );

      CREATE TABLE IF NOT EXISTS inspection_progress (
        id          INTEGER PRIMARY KEY DEFAULT 1,
        total       INTEGER DEFAULT 0,
        completed   INTEGER DEFAULT 0,
        status      TEXT DEFAULT 'running',
        updated_at  TEXT DEFAULT (datetime('now'))
      );

      INSERT OR IGNORE INTO inspection_progress (id, total, completed, status)
      VALUES (1, 0, 0, 'running');
    `);
  }

  // ========== Meta ==========

  setMeta(key: string, value: string): void {
    this.db.prepare(
      'INSERT OR REPLACE INTO inspection_meta (key, value) VALUES (?, ?)'
    ).run(key, value);
  }

  setMetaBatch(entries: Array<{ key: string; value: string }>): void {
    const insert = this.db.prepare(
      'INSERT OR REPLACE INTO inspection_meta (key, value) VALUES (?, ?)'
    );
    const tx = this.db.transaction(() => {
      for (const e of entries) {
        insert.run(e.key, e.value);
      }
    });
    tx();
  }

  getMeta(): Map<string, string> {
    const rows = this.db.prepare('SELECT key, value FROM inspection_meta').all() as InspectionMetaRow[];
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.key, r.value);
    return map;
  }

  getMetaValue(key: string): string | undefined {
    const row = this.db.prepare('SELECT value FROM inspection_meta WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    return row?.value;
  }

  // ========== Results ==========

  insertBatch(results: Array<{
    file_name: string;
    file_num: number;
    section: string;
    columns?: string[];
    rows?: unknown[][];
    error?: string;
  }>): void {
    const insertResult = this.db.prepare(`
      INSERT OR REPLACE INTO inspection_results
        (file_name, file_num, section, columns, row_count, row_pages, error)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertPage = this.db.prepare(`
      INSERT OR REPLACE INTO result_pages (file_num, page_idx, page_data)
      VALUES (?, ?, ?)
    `);

    const PAGE_SIZE = 200;

    const tx = this.db.transaction(() => {
      for (const r of results) {
        const rows = r.rows || [];
        const totalPages = Math.ceil(rows.length / PAGE_SIZE);
        const columnsJson = r.columns ? JSON.stringify(r.columns) : null;

        insertResult.run(
          r.file_name,
          r.file_num,
          r.section,
          columnsJson,
          rows.length,
          totalPages,
          r.error || null
        );

        for (let p = 0; p < totalPages; p++) {
          const pageRows = rows.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
          insertPage.run(r.file_num, p, JSON.stringify(pageRows));
        }
      }

      // Update progress
      const completed = this.db.prepare(
        'SELECT COUNT(*) as cnt FROM inspection_results'
      ).get() as { cnt: number };
      this.db.prepare(
        'UPDATE inspection_progress SET completed = ?, updated_at = datetime(\'now\') WHERE id = 1'
      ).run(completed.cnt);
    });
    tx();
  }

  getResult(fileNum: number): InspectionResultRow | undefined {
    return this.db.prepare(
      'SELECT * FROM inspection_results WHERE file_num = ?'
    ).get(fileNum) as InspectionResultRow | undefined;
  }

  getResultPage(fileNum: number, pageIdx: number): ResultPageRow | undefined {
    return this.db.prepare(
      'SELECT page_idx, page_data FROM result_pages WHERE file_num = ? AND page_idx = ?'
    ).get(fileNum, pageIdx) as ResultPageRow | undefined;
  }

  getAllResults(): Array<InspectionResultRow & { rows: unknown[][] }> {
    const results = this.db.prepare(
      'SELECT * FROM inspection_results ORDER BY file_num'
    ).all() as InspectionResultRow[];

    return results.map((r) => {
      const pages = this.db.prepare(
        'SELECT page_data FROM result_pages WHERE file_num = ? ORDER BY page_idx'
      ).all(r.file_num) as { page_data: string }[];

      const rows = pages.flatMap((p) => JSON.parse(p.page_data));
      return { ...r, rows };
    });
  }

  getAllResultMetas(): Array<{ file_num: number; file_name: string; section: string }> {
    return this.db.prepare(
      'SELECT file_num, file_name, section FROM inspection_results ORDER BY file_num'
    ).all() as Array<{ file_num: number; file_name: string; section: string }>;
  }

  // ========== Progress ==========

  setProgressStatus(status: 'running' | 'completed' | 'failed'): void {
    this.db.prepare(
      "UPDATE inspection_progress SET status = ?, updated_at = datetime('now') WHERE id = 1"
    ).run(status);
  }

  setProgressTotal(total: number): void {
    this.db.prepare(
      'UPDATE inspection_progress SET total = ?, updated_at = datetime(\'now\') WHERE id = 1'
    ).run(total);
  }

  getProgress(): { total: number; completed: number; status: string } {
    const row = this.db.prepare('SELECT total, completed, status FROM inspection_progress WHERE id = 1').get() as
      | { total: number; completed: number; status: string }
      | undefined;
    return row || { total: 0, completed: 0, status: 'unknown' };
  }

  // ========== Lifecycle ==========

  vacuum(): void {
    this.db.exec('PRAGMA optimize');
  }

  close(): void {
    this.db.close();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/services/report-db.ts
git commit -m "feat: add ReportDB service with better-sqlite3 CRUD"
```

---

### Task 2: 创建 LGWR Buffer 服务

**Files:**
- Create: `src/main/services/lgwr-buffer.ts`

- [ ] **Step 1: 编写 LgwrBuffer 类**

```typescript
// src/main/services/lgwr-buffer.ts
import { ReportDB } from './report-db';

export interface ResultPayload {
  file_name: string;
  file_num: number;
  section: string;
  columns?: string[];
  rows?: unknown[][];
  row_count?: number;
  page?: number;
  has_more?: boolean;
  error?: string;
}

interface PendingResult {
  file_name: string;
  file_num: number;
  section: string;
  columns?: string[];
  rows: unknown[][];
  error?: string;
}

const FLUSH_INTERVAL_MS = 2000;
const FLUSH_BATCH_SIZE = 5;
const FLUSH_ROW_SIZE_THRESHOLD = 500 * 1024; // 500KB

export class LgwrBuffer {
  private buffer: PendingResult[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastSection: string | null = null;
  private db: ReportDB;
  private partialCollector: Map<number, ResultPayload> = new Map();

  constructor(db: ReportDB) {
    this.db = db;
  }

  /** 接收来自 Python 的逐条结果（可能是分页的） */
  push(payload: ResultPayload): void {
    // 处理分页结果：拼接同一个 file_num 的多页数据
    if (payload.page !== undefined && payload.page > 0) {
      const existing = this.partialCollector.get(payload.file_num);
      if (existing && payload.rows) {
        existing.rows = [...(existing.rows || []), ...payload.rows];
        if (!payload.has_more) {
          // 最后一页，flush 完整结果
          this.addToBuffer({
            file_name: existing.file_name,
            file_num: existing.file_num,
            section: existing.section,
            columns: existing.columns,
            rows: existing.rows || [],
            error: existing.error,
          });
          this.partialCollector.delete(payload.file_num);
        }
      }
      return;
    }

    if (payload.has_more) {
      // 第一页，暂存到 collector
      this.partialCollector.set(payload.file_num, payload);
      return;
    }

    // 单页完整结果
    this.addToBuffer({
      file_name: payload.file_name,
      file_num: payload.file_num,
      section: payload.section,
      columns: payload.columns,
      rows: payload.rows || [],
      error: payload.error,
    });
  }

  private addToBuffer(result: PendingResult): void {
    this.startTimerIfNeeded();

    // T3: 大结果立即 flush
    const rowJson = JSON.stringify(result.rows);
    if (rowJson.length > FLUSH_ROW_SIZE_THRESHOLD) {
      this.buffer.push(result);
      this.flush();
      return;
    }

    // T4: 板块切换时 flush
    if (result.section !== this.lastSection && this.lastSection !== null && this.buffer.length > 0) {
      this.flush();
    }

    this.buffer.push(result);
    this.lastSection = result.section;

    // T2: 条数阈值
    if (this.buffer.length >= FLUSH_BATCH_SIZE) {
      this.flush();
    }
  }

  // T1: 定时器
  private startTimerIfNeeded(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.flush();
      this.timer = null;
    }, FLUSH_INTERVAL_MS);
  }

  // T5: 巡检结束
  finalize(status: 'completed' | 'failed', total?: number): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.flush();
    if (total !== undefined) {
      this.db.setProgressTotal(total);
    }
    this.db.setProgressStatus(status);
    this.db.vacuum();
  }

  private flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.buffer.length === 0) return;

    const batch = [...this.buffer];
    this.buffer = [];

    try {
      this.db.insertBatch(batch);
    } catch (err) {
      console.error('[LgwrBuffer] Flush error:', err);
      // 失败的数据放回 buffer 重试
      this.buffer = [...batch, ...this.buffer];
    }
  }

  getDb(): ReportDB {
    return this.db;
  }

  destroy(): void {
    if (this.timer) clearTimeout(this.timer);
    this.flush();
    this.db.close();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/services/lgwr-buffer.ts
git commit -m "feat: add LGWR buffer with 5-trigger flush rules"
```

---

### Task 3: 修改 PythonBridge 解析 RESULT 消息

**Files:**
- Modify: `src/main/services/python-bridge.ts`

需要在 stderr 解析中增加 `[DBG]:RESULT:` 和 `[DBG]:COMPLETE:` 的识别，并新增回调接口。

- [ ] **Step 1: 添加 result 回调和 COMPLETE 回调接口**

在 `PythonBridge` 类中添加两个新回调字段，并扩展 `onDebugLine`：

需要修改的点（在 `python-bridge.ts` 中）：

```typescript
// 在类的属性声明区域（约 line 17 之后）添加：
private resultCallback: ((payload: Record<string, unknown>) => void) | null = null;
private completeCallback: ((payload: Record<string, unknown>) => void) | null = null;

// 修改 onDebugLine 方法签名为 onInspectionEvent:
onInspectionEvent(opts: {
  debug?: ((line: string) => void) | null;
  result?: ((payload: Record<string, unknown>) => void) | null;
  complete?: ((payload: Record<string, unknown>) => void) | null;
}): void {
  this.debugCallback = opts.debug ?? null;
  this.resultCallback = opts.result ?? null;
  this.completeCallback = opts.complete ?? null;
}
```

- [ ] **Step 2: 修改 stderr 解析逻辑**

在 stderr data 处理中（当前约 line 88-100），增加 RESULT 和 COMPLETE 前缀的识别：

```typescript
this.process.stderr?.on('data', (data: Buffer) => {
  const text = data.toString('utf-8');
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('[DBG]:RESULT:') && this.resultCallback) {
      try {
        const json = trimmed.substring('[DBG]:RESULT:'.length);
        this.resultCallback(JSON.parse(json));
      } catch {
        console.error('[PythonBridge] Failed to parse RESULT:', trimmed);
      }
    } else if (trimmed.startsWith('[DBG]:COMPLETE:') && this.completeCallback) {
      try {
        const json = trimmed.substring('[DBG]:COMPLETE:'.length);
        this.completeCallback(JSON.parse(json));
      } catch {
        console.error('[PythonBridge] Failed to parse COMPLETE:', trimmed);
      }
    } else if (trimmed.startsWith('[DBG]') && this.debugCallback) {
      this.debugCallback(trimmed.substring(5).trim());
    } else if (trimmed) {
      console.error('[PythonBridge stderr]', trimmed);
    }
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add src/main/services/python-bridge.ts
git commit -m "feat: add RESULT/COMPLETE message parsing to PythonBridge stderr"
```

---

### Task 4: 修改 Python inspector.py 发送 RESULT 消息

**Files:**
- Modify: `python-backend/core/inspector.py`
- Delete: `python-backend/core/report_generator.py`

- [ ] **Step 1: 定义 section 映射并修改 execute 方法**

修改 `inspector.py`，在每条 SQL 执行后发送 `[DBG]:RESULT:<JSON>` 而非仅发送调试日志。移除 `ReportGenerator` 依赖。

将 `execute()` 方法的返回类型简化为只返回状态信号：

```python
"""
Inspection engine - executes SQL scripts against databases.
Results are streamed via stderr [DBG]:RESULT: messages.
"""
import os
import sys
import json
from typing import Any
from plugins.base import BaseDBPlugin
from core.utils import read_sql_files, ensure_directory, get_timestamp

# Section mapping: file_num → section name
# 0: basic, 1-4: topology, 5-9: runtime, 10-12: config, 13-16: assets, 17-21: tasks
SECTION_MAP = {}
for n in range(0, 22):
    if n == 0:
        SECTION_MAP[n] = 'basic'
    elif 1 <= n <= 4:
        SECTION_MAP[n] = 'topology'
    elif 5 <= n <= 9:
        SECTION_MAP[n] = 'runtime'
    elif 10 <= n <= 12:
        SECTION_MAP[n] = 'config'
    elif 13 <= n <= 16:
        SECTION_MAP[n] = 'assets'
    else:
        SECTION_MAP[n] = 'tasks'


def _extract_file_num(file_name: str) -> int:
    """Extract numeric prefix from SQL filename, e.g. '13.sql' -> 13"""
    import re
    m = re.match(r'(\d+)', file_name)
    return int(m.group(1)) if m else -1


def _emit_result(file_name: str, columns: list, rows: list, error: str = None):
    """Emit a structured result message to stderr for LGWR buffer consumption."""
    file_num = _extract_file_num(file_name)
    section = SECTION_MAP.get(file_num, 'unknown')
    result = {
        'file_name': file_name,
        'file_num': file_num,
        'section': section,
    }

    if error:
        result['error'] = error
        print(f'[DBG]:RESULT:{json.dumps(result, ensure_ascii=False)}', file=sys.stderr, flush=True)
        return

    result['columns'] = columns
    result['row_count'] = len(rows)

    PAGE_SIZE = 200
    if len(rows) <= PAGE_SIZE:
        result['rows'] = rows
        print(f'[DBG]:RESULT:{json.dumps(result, ensure_ascii=False, default=str)}', file=sys.stderr, flush=True)
    else:
        total_pages = (len(rows) + PAGE_SIZE - 1) // PAGE_SIZE
        for p in range(total_pages):
            page_rows = rows[p * PAGE_SIZE:(p + 1) * PAGE_SIZE]
            page_result = {
                'file_name': file_name,
                'file_num': file_num,
                'section': section,
                'page': p,
                'has_more': p < total_pages - 1,
            }
            if p == 0:
                page_result['columns'] = columns
                page_result['row_count'] = len(rows)
            page_result['rows'] = page_rows
            print(f'[DBG]:RESULT:{json.dumps(page_result, ensure_ascii=False, default=str)}',
                  file=sys.stderr, flush=True)


def _emit_complete(status: str, total: int, error: str = None):
    """Emit inspection completion message."""
    msg = {'status': status, 'total': total}
    if error:
        msg['error'] = error
    print(f'[DBG]:COMPLETE:{json.dumps(msg, ensure_ascii=False)}', file=sys.stderr, flush=True)


def _emit_debug(msg: str):
    """Write a debug progress line to stderr for real-time streaming to Electron."""
    print(f"[DBG] {msg}", file=sys.stderr, flush=True)


class InspectorEngine:
    def __init__(self, plugins: dict[str, BaseDBPlugin]):
        self.plugins = plugins

    def execute(
        self,
        plugin: BaseDBPlugin,
        connection_config: dict,
        description: str,
        sql_scripts_dir: str,
        report_template_path: str,         # kept for API compatibility, unused
        report_template_libs_dir: str,     # kept for API compatibility, unused
        result_path: str,                  # kept for API compatibility, unused  
        query_timeout: int = 300,
        debug: bool = False,
    ) -> dict:
        """
        Execute a full inspection for a single database connection.
        Results are streamed via stderr [DBG]:RESULT: messages.
        Returns a minimal status dict (no results array).
        """
        error_count = 0

        if not os.path.exists(sql_scripts_dir):
            _emit_complete('failed', 0, f'SQL脚本目录不存在: {sql_scripts_dir}')
            return {
                'connectionId': '',
                'description': description,
                'dbType': plugin.db_type,
                'success': False,
                'error': f'SQL脚本目录不存在: {sql_scripts_dir}',
                'completedAt': get_timestamp(),
            }

        sql_files = read_sql_files(sql_scripts_dir)
        if not sql_files:
            _emit_complete('failed', 0, f'在 {sql_scripts_dir} 中未找到SQL文件')
            return {
                'connectionId': '',
                'description': description,
                'dbType': plugin.db_type,
                'success': False,
                'error': f'在 {sql_scripts_dir} 中未找到SQL文件',
                'completedAt': get_timestamp(),
            }

        if debug:
            _emit_debug(f'巡检开始 | 数据库类型: {plugin.db_type} | 脚本目录: {sql_scripts_dir}')
            _emit_debug(f'共找到 {len(sql_files)} 个SQL脚本文件')

        try:
            server_info = plugin.connect(connection_config)
            if debug:
                _emit_debug(f'数据库连接成功 | 服务器信息: {server_info}')

            total_scripts = len(sql_files)
            for idx, (file_name, sql_content) in enumerate(sql_files, 1):
                if not sql_content.strip():
                    if debug:
                        _emit_debug(f'[{idx}/{total_scripts}] 跳过空脚本: {file_name}')
                    continue

                try:
                    if debug:
                        sql_preview = sql_content[:200].replace('\n', ' ')
                        _emit_debug(f'[{idx}/{total_scripts}] 执行: {file_name} | SQL: {sql_preview}...')

                    query_result = plugin.execute_query(connection_config, sql_content, query_timeout)
                    _emit_result(
                        file_name,
                        query_result.get('columns', []),
                        query_result.get('rows', []),
                    )

                    if debug:
                        col_count = len(query_result.get('columns', []))
                        row_count = len(query_result.get('rows', []))
                        _emit_debug(f'[{idx}/{total_scripts}] 成功: {file_name} | 列数: {col_count} | 行数: {row_count}')

                except Exception as e:
                    error_count += 1
                    _emit_result(file_name, [], [], error=str(e))
                    if debug:
                        _emit_debug(f'[{idx}/{total_scripts}] 失败: {file_name} | 错误: {str(e)}')

            try:
                plugin.disconnect(connection_config)
            except Exception:
                pass

            if debug:
                _emit_debug(f'巡检结束 | 共执行 {total_scripts} 个查询 | 错误数: {error_count}')

            _emit_complete('completed', total_scripts)

            return {
                'connectionId': '',
                'description': description,
                'dbType': plugin.db_type,
                'success': True,
                'serverInfo': server_info,
                'total': total_scripts,
                'errorCount': error_count,
                'completedAt': get_timestamp(),
            }

        except Exception as e:
            import traceback
            _emit_complete('failed', len(sql_files), str(e))
            return {
                'connectionId': '',
                'description': description,
                'dbType': plugin.db_type,
                'success': False,
                'error': str(e),
                'traceback': traceback.format_exc(),
                'completedAt': get_timestamp(),
            }
```

- [ ] **Step 2: 删除 report_generator.py**

```bash
rm "E:/ClaudeCode/db-inspector/python-backend/core/report_generator.py"
```

- [ ] **Step 3: Commit**

```bash
git add python-backend/core/inspector.py
git rm python-backend/core/report_generator.py
git commit -m "refactor: stream results via stderr RESULT messages, remove report_generator.py"
```

---

### Task 5: 修改 inspection IPC 接入 LGWR Buffer

**Files:**
- Modify: `src/main/ipc/inspection.ipc.ts`

- [ ] **Step 1: 重写 inspection IPC 处理逻辑**

```typescript
// src/main/ipc/inspection.ipc.ts
import { ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import { IPC_CHANNELS } from '@shared/types';
import type { InspectionConfig, InspectionProgress, InspectionResult } from '@shared/types';
import type { ConfigStore } from '../services/config-store';
import { PythonBridge } from '../services/python-bridge';
import { FileManager } from '../services/file-manager';
import { ReportDB } from '../services/report-db';
import { LgwrBuffer, type ResultPayload } from '../services/lgwr-buffer';

let currentInspectionCancelled = false;

export function registerInspectionHandlers(configStore: ConfigStore, getReportServerPort: () => number): void {
  const pythonBridge = PythonBridge.getInstance();

  ipcMain.handle(IPC_CHANNELS.INSPECTION_START, async (_event, config: InspectionConfig) => {
    try {
      currentInspectionCancelled = false;
      const connections = configStore.getConnections();
      const selectedConnections = connections.filter(c => config.connectionIds.includes(c.id));

      if (selectedConnections.length === 0) return false;

      const baseResultPath = config.resultPath || configStore.getResultPath();
      FileManager.ensureDir(baseResultPath);

      const mainWindow = BrowserWindow.getFocusedWindow();
      const isDebug = config.debug === true;

      try {
        for (let i = 0; i < selectedConnections.length; i++) {
          if (currentInspectionCancelled) break;

          const conn = selectedConnections[i];
          const progress: InspectionProgress = {
            connectionId: conn.id,
            description: conn.description,
            currentIndex: i + 1,
            total: selectedConnections.length,
            currentScript: '',
            status: 'running',
          };
          mainWindow?.webContents.send(IPC_CHANNELS.INSPECTION_PROGRESS, progress);

          try {
            // Create db-specific result directory and SQLite database
            const dbResultPath = path.join(baseResultPath, conn.dbType);
            FileManager.ensureDir(dbResultPath);

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const dbFileName = `${conn.description}_${timestamp}.db`;
            const dbPath = path.join(dbResultPath, dbFileName);

            const reportDB = new ReportDB(dbPath);
            const lgwr = new LgwrBuffer(reportDB);

            // Store meta info
            reportDB.setMetaBatch([
              { key: 'db_type', value: conn.dbType },
              { key: 'description', value: conn.description },
              { key: 'generated_time', value: new Date().toLocaleString('zh-CN') },
              { key: 'db_name', value: conn.database || '' },
              { key: 'host', value: conn.host },
              { key: 'port', value: String(conn.port) },
            ]);

            // Register callbacks
            pythonBridge.onInspectionEvent({
              debug: isDebug
                ? (line: string) => {
                    const dp: InspectionProgress = {
                      connectionId: conn.id,
                      description: conn.description,
                      currentIndex: i + 1,
                      total: selectedConnections.length,
                      currentScript: line,
                      status: 'running',
                      debugInfo: line,
                    };
                    mainWindow?.webContents.send(IPC_CHANNELS.INSPECTION_PROGRESS, dp);
                  }
                : null,
              result: (payload: Record<string, unknown>) => {
                lgwr.push(payload as unknown as ResultPayload);
              },
              complete: (payload: Record<string, unknown>) => {
                const status = (payload.status as string) === 'completed' ? 'completed' : 'failed';
                lgwr.finalize(status as 'completed' | 'failed', payload.total as number);
              },
            });

            // Get server info from the inspection result
            const params = {
              connectionId: conn.id,
              dbType: conn.dbType,
              host: conn.host,
              port: conn.port,
              username: conn.username,
              password: conn.password,
              database: conn.database,
              description: conn.description,
              resultPath: dbResultPath,
              sqlScriptsDir: config.sqlScriptsDir || FileManager.getSqlScriptsDir(conn.dbType),
              reportTemplatePath: FileManager.getReportTemplatePath(conn.dbType),
              reportTemplateLibsDir: FileManager.getReportTemplateLibsDir(conn.dbType),
              queryTimeout: config.queryTimeout,
              debug: isDebug,
            };

            const result = await pythonBridge.call('inspection.execute', params, 7200000) as {
              success: boolean;
              serverInfo?: string;
              error?: string;
              total?: number;
              errorCount?: number;
            };

            // Store server info if available
            if (result.serverInfo) {
              reportDB.setMeta('server_info', result.serverInfo);
            }

            lgwr.finalize(result.success ? 'completed' : 'failed');

            // Construct report URL for the renderer
            const port = getReportServerPort();
            const dbId = path.basename(dbPath, '.db');
            const reportUrl = `http://localhost:${port}/report/${encodeURIComponent(dbId)}`;

            const inspectionResult: InspectionResult = {
              connectionId: conn.id,
              description: conn.description,
              dbType: conn.dbType,
              success: result.success,
              reportPath: dbPath,
              error: result.error,
              completedAt: new Date().toISOString(),
              results: [],
            };

            mainWindow?.webContents.send(IPC_CHANNELS.INSPECTION_RESULT, inspectionResult);
          } catch (err) {
            const errorResult: InspectionResult = {
              connectionId: conn.id,
              description: conn.description,
              dbType: conn.dbType,
              success: false,
              error: (err as Error).message,
              completedAt: new Date().toISOString(),
              results: [],
            };
            mainWindow?.webContents.send(IPC_CHANNELS.INSPECTION_RESULT, errorResult);
          }
        }
      } finally {
        pythonBridge.onInspectionEvent({ debug: null, result: null, complete: null });
      }

      return true;
    } catch (err) {
      console.error('[Inspection IPC] Error:', err);
      return false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.INSPECTION_CANCEL, () => {
    currentInspectionCancelled = true;
    return true;
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/ipc/inspection.ipc.ts
git commit -m "refactor: wire LGWR buffer into inspection IPC, remove report_generator usage"
```

---

### Task 6: 创建 ReportServer（Express HTTP + WebSocket）

**Files:**
- Create: `src/main/services/report-server.ts`

- [ ] **Step 1: 编写 ReportServer 类**

```typescript
// src/main/services/report-server.ts
import express, { type Request, type Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { ReportDB } from './report-db';
import { FileManager } from './file-manager';

interface ReportMeta {
  dbId: string;
  dbType: string;
  description: string;
  host: string;
  port: string;
  generatedTime: string;
  fileSize: number;
}

export class ReportServer {
  private app: express.Application;
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private port: number;
  private dbRegistry: Map<string, ReportDB> = new Map();
  private dbMetaCache: Map<string, ReportMeta> = new Map();

  constructor(port: number = 18921) {
    this.port = port;
    this.app = express();
    this.setupRoutes();
  }

  getPort(): number {
    return this.port;
  }

  async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, '127.0.0.1', () => {
        console.log(`[ReportServer] HTTP server started on port ${this.port}`);

        this.wss = new WebSocketServer({ server: this.server! });
        this.wss.on('connection', (ws) => {
          ws.on('error', () => { /* ignore */ });
        });

        resolve(this.port);
      });

      this.server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          this.port++;
          this.server?.close();
          this.start().then(resolve).catch(reject);
        } else {
          reject(err);
        }
      });
    });
  }

  /** Register a completed inspection DB so it can be served */
  registerDb(dbId: string, db: ReportDB): void {
    this.dbRegistry.set(dbId, db);
    // Build and cache meta
    const meta = db.getMeta();
    this.dbMetaCache.set(dbId, {
      dbId,
      dbType: meta.get('db_type') || 'unknown',
      description: meta.get('description') || '',
      host: meta.get('host') || '',
      port: meta.get('port') || '',
      generatedTime: meta.get('generated_time') || '',
      fileSize: fs.statSync(db.dbPath).size,
    });
  }

  unregisterDb(dbId: string): void {
    this.dbRegistry.delete(dbId);
    this.dbMetaCache.delete(dbId);
  }

  private getDb(req: Request): ReportDB | undefined {
    const dbId = decodeURIComponent(req.params.dbId);
    return this.dbRegistry.get(dbId);
  }

  private setupRoutes(): void {
    // CORS for browser access
    this.app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      next();
    });

    // Static assets for browser report viewer
    this.app.use('/assets', express.static(path.join(__dirname, '../../../../resources/dbinspection')));

    // GET /api/reports — list all completed inspections
    this.app.get('/api/reports', (_req: Request, res: Response) => {
      const reports = Array.from(this.dbMetaCache.values());
      res.json(reports);
    });

    // GET /api/report/:dbId/meta — inspection metadata
    this.app.get('/api/report/:dbId/meta', (req: Request, res: Response) => {
      const db = this.getDb(req);
      if (!db) return res.status(404).json({ error: 'Report not found' });
      const meta = db.getMeta();
      res.json(Object.fromEntries(meta));
    });

    // GET /api/report/:dbId/result/:num — single result (page 0)
    this.app.get('/api/report/:dbId/result/:num', (req: Request, res: Response) => {
      const db = this.getDb(req);
      if (!db) return res.status(404).json({ error: 'Report not found' });

      const fileNum = parseInt(req.params.num, 10);
      const result = db.getResult(fileNum);
      if (!result) return res.status(404).json({ error: 'Result not found' });

      const page0 = db.getResultPage(fileNum, 0);

      res.json({
        file_name: result.file_name,
        file_num: result.file_num,
        section: result.section,
        columns: result.columns ? JSON.parse(result.columns) : [],
        rows: page0 ? JSON.parse(page0.page_data) : [],
        row_count: result.row_count,
        has_more: result.row_pages > 1,
        error: result.error,
      });
    });

    // GET /api/report/:dbId/result/:num/page/:page — specific page
    this.app.get('/api/report/:dbId/result/:num/page/:page', (req: Request, res: Response) => {
      const db = this.getDb(req);
      if (!db) return res.status(404).json({ error: 'Report not found' });

      const fileNum = parseInt(req.params.num, 10);
      const pageIdx = parseInt(req.params.page, 10);
      const page = db.getResultPage(fileNum, pageIdx);
      if (!page) return res.status(404).json({ error: 'Page not found' });

      const result = db.getResult(fileNum);
      res.json({
        page_idx: page.page_idx,
        rows: JSON.parse(page.page_data),
        has_more: result ? pageIdx + 1 < result.row_pages : false,
      });
    });

    // GET /api/report/:dbId/results — all results (export)
    this.app.get('/api/report/:dbId/results', (req: Request, res: Response) => {
      const db = this.getDb(req);
      if (!db) return res.status(404).json({ error: 'Report not found' });

      const results = db.getAllResults();
      res.json(results.map(r => ({
        file_name: r.file_name,
        file_num: r.file_num,
        section: r.section,
        columns: r.columns ? JSON.parse(r.columns) : [],
        rows: r.rows,
        row_count: r.row_count,
        error: r.error,
      })));
    });

    // GET /api/report/:dbId/result-metas — lightweight list of all results
    this.app.get('/api/report/:dbId/result-metas', (req: Request, res: Response) => {
      const db = this.getDb(req);
      if (!db) return res.status(404).json({ error: 'Report not found' });
      res.json(db.getAllResultMetas());
    });

    // GET /api/report/:dbId/progress — inspection progress
    this.app.get('/api/report/:dbId/progress', (req: Request, res: Response) => {
      const db = this.getDb(req);
      if (!db) return res.status(404).json({ error: 'Report not found' });
      res.json(db.getProgress());
    });

    // GET /report/:dbId — browser report viewer page
    this.app.get('/report/:dbId', (req: Request, res: Response) => {
      const viewerPath = path.join(__dirname, '../../../../resources/dbinspection/common/report_viewer.html');
      if (fs.existsSync(viewerPath)) {
        res.sendFile(viewerPath);
      } else {
        res.status(404).send('Report viewer not found. Please build the project first.');
      }
    });

    // GET / — redirect to reports list
    this.app.get('/', (_req: Request, res: Response) => {
      res.json({ message: 'DB Inspector Report Server', reports: '/api/reports' });
    });
  }

  /** Broadcast inspection progress update via WebSocket */
  broadcastProgress(dbId: string, progress: { total: number; completed: number; status: string }): void {
    if (!this.wss) return;
    const msg = JSON.stringify({ type: 'progress', dbId, ...progress });
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  async stop(): Promise<void> {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('[ReportServer] Stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/services/report-server.ts
git commit -m "feat: add ReportServer with Express HTTP API and WebSocket"
```

---

### Task 7: 在 App 初始化中集成 ReportServer

**Files:**
- Modify: `src/main/index.ts`
- Modify: `src/main/ipc/index.ts`

- [ ] **Step 1: 修改 app 初始化流程**

在 `src/main/index.ts` 中初始化 ReportServer：

```typescript
// 在 initializeApp 函数中，pythonBridge.start() 之后添加：
import { ReportServer } from './services/report-server';

let reportServer: ReportServer;

async function initializeApp(): Promise<void> {
  const configStore = ConfigStore.getInstance();

  pythonBridge = PythonBridge.getInstance();
  try {
    await pythonBridge.start();
    console.log('[Main] Python bridge started successfully');
  } catch (err) {
    console.error('[Main] Failed to start Python bridge:', err);
  }

  // Start ReportServer
  reportServer = new ReportServer(18921);
  const port = await reportServer.start();
  console.log(`[Main] ReportServer started on port ${port}`);

  // Register IPC handlers
  registerAllIpcHandlers(() => port);

  createWindow();
}

// 在 app.on('before-quit') 中添加:
app.on('before-quit', () => {
  if (pythonBridge) pythonBridge.stop();
  if (reportServer) reportServer.stop();
});
```

- [ ] **Step 2: 修改 IPC 注册函数接受 port getter**

在 `src/main/ipc/index.ts` 中：

```typescript
export function registerAllIpcHandlers(getReportServerPort?: () => number): void {
  // ... existing code ...
  registerInspectionHandlers(configStore, getReportServerPort || (() => 18921));
  // ... existing code ...
}
```

- [ ] **Step 3: Commit**

```bash
git add src/main/index.ts src/main/ipc/index.ts
git commit -m "feat: integrate ReportServer into app lifecycle"
```

---

### Task 8: 创建共享类型定义

**Files:**
- Modify: `src/shared/types/index.ts`

- [ ] **Step 1: 添加新的 IPC 通道和类型**

在 `IPC_CHANNELS` 中添加：

```typescript
REPORT_FETCH_META: 'report:fetch-meta',
REPORT_FETCH_RESULT: 'report:fetch-result',
REPORT_FETCH_RESULT_PAGE: 'report:fetch-result-page',
REPORT_FETCH_ALL_RESULTS: 'report:fetch-all-results',
REPORT_FETCH_RESULT_METAS: 'report:fetch-result-metas',
REPORT_EXPORT: 'report:export',
REPORT_GET_SERVER_URL: 'report:get-server-url',
```

在 Report Types 区域添加：

```typescript
export interface ReportResultData {
  file_name: string;
  file_num: number;
  section: string;
  columns: string[];
  rows: (string | number | null)[][];
  row_count: number;
  has_more: boolean;
  error?: string;
}

export interface ResultMeta {
  file_num: number;
  file_name: string;
  section: string;
}
```

修改 `ReportMeta`：

```typescript
export interface ReportMeta {
  id: string;
  fileName: string;
  filePath: string;
  dbType: string;
  description: string;
  createdAt: string;
  fileSize: number;
  dbId?: string;       // SQLite db identifier
  reportUrl?: string;   // HTTP URL for the report viewer
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/types/index.ts
git commit -m "feat: add report data types and IPC channels for SQLite-based viewer"
```

---

### Task 9: 创建 Report IPC Handlers（后端数据查询）

**Files:**
- Modify: `src/main/ipc/report.ipc.ts`

- [ ] **Step 1: 添加报告数据查询 IPC handlers**

添加新的 IPC handler 来查询 SQLite 数据库（用于 Electron 内部的 React 查看器）：

```typescript
// 在 registerReportHandlers 函数中添加以下 handlers:

// 获取报告元信息
ipcMain.handle('report:fetch-meta', (_event, dbPath: string) => {
  const reportDB = new ReportDB(dbPath);
  const meta = reportDB.getMeta();
  const progress = reportDB.getProgress();
  reportDB.close();
  return {
    meta: Object.fromEntries(meta),
    total: progress.total,
    completed: progress.completed,
    status: progress.status,
  };
});

// 获取单条结果
ipcMain.handle('report:fetch-result', (_event, dbPath: string, fileNum: number) => {
  const reportDB = new ReportDB(dbPath);
  const result = reportDB.getResult(fileNum);
  if (!result) { reportDB.close(); return null; }

  const page0 = reportDB.getResultPage(fileNum, 0);
  reportDB.close();

  return {
    file_name: result.file_name,
    file_num: result.file_num,
    section: result.section,
    columns: result.columns ? JSON.parse(result.columns) : [],
    rows: page0 ? JSON.parse(page0.page_data) : [],
    row_count: result.row_count,
    has_more: result.row_pages > 1,
    error: result.error,
  };
});

// 获取结果分页
ipcMain.handle('report:fetch-result-page', (_event, dbPath: string, fileNum: number, pageIdx: number) => {
  const reportDB = new ReportDB(dbPath);
  const page = reportDB.getResultPage(fileNum, pageIdx);
  const result = reportDB.getResult(fileNum);
  reportDB.close();

  if (!page) return null;
  return {
    page_idx: page.page_idx,
    rows: JSON.parse(page.page_data),
    has_more: result ? pageIdx + 1 < result.row_pages : false,
  };
});

// 获取全部结果（导出用）
ipcMain.handle('report:fetch-all-results', (_event, dbPath: string) => {
  const reportDB = new ReportDB(dbPath);
  const results = reportDB.getAllResults();
  reportDB.close();
  return results.map(r => ({
    file_name: r.file_name,
    file_num: r.file_num,
    section: r.section,
    columns: r.columns ? JSON.parse(r.columns) : [],
    rows: r.rows,
    row_count: r.row_count,
    error: r.error,
  }));
});

// 获取结果元信息列表（用于构建导航）
ipcMain.handle('report:fetch-result-metas', (_event, dbPath: string) => {
  const reportDB = new ReportDB(dbPath);
  const metas = reportDB.getAllResultMetas();
  reportDB.close();
  return metas;
});

// 获取报告服务器 URL
ipcMain.handle('report:get-server-url', () => {
  return `http://localhost:${getReportServerPort()}`;
});
```

- [ ] **Step 2: 更新 preload 暴露的 API**

在 `src/preload/index.ts` 中添加新的 API 方法（需要读取当前 preload 文件来了解现有结构）。

- [ ] **Step 3: Commit**

```bash
git add src/main/ipc/report.ipc.ts src/preload/index.ts
git commit -m "feat: add report data query IPC handlers for SQLite-backed viewer"
```

---

### Task 10: 创建 React 报告查看器核心组件

**Files:**
- Create: `src/renderer/components/report/ReportViewer.tsx`
- Create: `src/renderer/components/report/ReportHeader.tsx`
- Create: `src/renderer/components/report/ReportSidebar.tsx`
- Create: `src/renderer/components/report/ResultBlock.tsx`
- Create: `src/renderer/components/report/DataTable.tsx`
- Create: `src/renderer/components/report/ChartBlock.tsx`

- [ ] **Step 1: 创建 ResultBlock 组件**

```tsx
// src/renderer/components/report/ResultBlock.tsx
import React, { useEffect, useRef, useState } from 'react';
import { DataTable } from './DataTable';
import type { ReportResultData } from '@shared/types';

interface ResultBlockProps {
  dbPath: string;
  fileNum: number;
  title?: string;
}

export function ResultBlock({ dbPath, fileNum, title }: ResultBlockProps): React.ReactElement {
  const [data, setData] = useState<ReportResultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loaded.current) {
          loaded.current = true;
          setLoading(true);
          window.electronAPI
            .fetchReportResult(dbPath, fileNum)
            .then((result) => {
              if (result) {
                setData(result as ReportResultData);
              } else {
                setError('结果不存在');
              }
            })
            .catch((err: Error) => setError(err.message))
            .finally(() => setLoading(false));
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [dbPath, fileNum]);

  return (
    <div ref={ref} className="mb-8">
      {title && <h4 className="text-lg font-medium text-gray-700 mb-3">{title}</h4>}
      <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm overflow-x-auto overflow-y-auto max-h-[400px]">
        {loading && (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            加载中...
          </div>
        )}
        {error && <div className="text-red-500 py-4">错误: {error}</div>}
        {data && !loading && (
          <>
            {data.error ? (
              <div className="text-red-500">查询错误: {data.error}</div>
            ) : data.columns.length === 0 ? (
              <div className="text-gray-400">无数据</div>
            ) : (
              <DataTable
                columns={data.columns}
                rows={data.rows}
                dbPath={dbPath}
                fileNum={fileNum}
                hasMore={data.has_more}
                rowCount={data.row_count}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 DataTable 组件（含分页加载）**

```tsx
// src/renderer/components/report/DataTable.tsx
import React, { useState } from 'react';

interface DataTableProps {
  columns: string[];
  rows: (string | number | null)[][];
  dbPath: string;
  fileNum: number;
  hasMore: boolean;
  rowCount: number;
}

export function DataTable({ columns, rows, dbPath, fileNum, hasMore, rowCount }: DataTableProps): React.ReactElement {
  const [allRows, setAllRows] = useState(rows);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [moreAvailable, setMoreAvailable] = useState(hasMore);

  const loadMore = async () => {
    const nextPage = currentPage + 1;
    setLoadingMore(true);
    try {
      const page = await window.electronAPI.fetchReportResultPage(dbPath, fileNum, nextPage);
      if (page) {
        setAllRows(prev => [...prev, ...page.rows]);
        setCurrentPage(nextPage);
        setMoreAvailable(page.has_more);
      }
    } catch (err) {
      console.error('Failed to load more rows:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="result-section">
      <table>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allRows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell === null ? <span className="text-gray-400 italic">NULL</span> : String(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {(moreAvailable || allRows.length < rowCount) && (
        <div className="flex justify-center py-2">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="text-sm text-primary hover:underline disabled:text-gray-400"
          >
            {loadingMore ? '加载中...' : `加载更多 (已显示 ${allRows.length}/${rowCount} 行)`}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 创建 ReportHeader 组件**

```tsx
// src/renderer/components/report/ReportHeader.tsx
import React from 'react';

interface ReportHeaderProps {
  description: string;
  dbType: string;
  generatedTime: string;
  serverInfo?: string;
  onExport?: () => void;
  onOpenInBrowser?: () => void;
}

export function ReportHeader({
  description, dbType, generatedTime, serverInfo, onExport, onOpenInBrowser,
}: ReportHeaderProps): React.ReactElement {
  return (
    <header className="bg-primary text-white shadow-lg z-10">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-[clamp(1.5rem,3vw,2.5rem)] font-bold text-shadow">
              {description}{dbType}数据库巡检报告
            </h1>
            <p className="mt-2 opacity-90">全面数据库性能与健康状况分析</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <p className="text-xs opacity-80">巡检时间</p>
                <p className="font-medium">{generatedTime}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <p className="text-xs opacity-80">数据库类型</p>
                <p className="font-medium">{dbType}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                <p className="text-xs opacity-80">版本</p>
                <p className="font-medium text-sm truncate max-w-[200px]" title={serverInfo}>
                  {serverInfo || '-'}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {onExport && (
                <button onClick={onExport} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded text-sm transition-colors">
                  导出HTML
                </button>
              )}
              {onOpenInBrowser && (
                <button onClick={onOpenInBrowser} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded text-sm transition-colors">
                  在浏览器中打开
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: 创建 ReportSidebar 组件**

```tsx
// src/renderer/components/report/ReportSidebar.tsx
import React from 'react';
import type { ResultMeta } from '@shared/types';

interface SectionDef {
  id: string;
  label: string;
  icon: string;
  description: string;
  resultNums: number[];
  titles: Record<number, string>;
}

interface ReportSidebarProps {
  resultMetas: ResultMeta[];
  activeSection: string;
  onNavigate: (sectionId: string) => void;
}

const STARROCKS_SECTIONS: SectionDef[] = [
  {
    id: 'section-1', label: '（一）集群基础信息', icon: 'fa-server', description: '涵盖数据库会话、版本信息以及FE/BE/Compute/Broker各类节点的拓扑情况。',
    resultNums: [0, 1, 2, 3, 4],
    titles: { 0: '会话与版本信息', 1: 'FE节点（Frontend）', 2: 'BE节点（Backend）', 3: 'Compute节点', 4: 'Broker节点' },
  },
  {
    id: 'section-2', label: '（二）集群运行状态', icon: 'fa-heartbeat', description: '监控集群运行时状态，包含元信息、均衡状态、当前查询、进程列表及FE锁信息。',
    resultNums: [5, 6, 7, 8, 9],
    titles: { 5: '集群元信息', 6: '集群均衡状态', 7: '全局当前查询', 8: '数据库进程列表', 9: 'FE锁信息' },
  },
  {
    id: 'section-3', label: '（三）系统配置与权限', icon: 'fa-cogs', description: '检查数据库字符集、全局参数配置以及用户权限信息。',
    resultNums: [10, 11, 12],
    titles: { 10: '字符集', 11: '全局变量', 12: '数据库用户信息' },
  },
  {
    id: 'section-4', label: '（四）数据资产概览', icon: 'fa-pie-chart', description: '盘点数据库容量分布、对象分类统计、大表排行及存储引擎使用情况。',
    resultNums: [13, 14, 15, 16],
    titles: { 13: '数据库容量分析', 14: '数据库对象分类统计', 15: '大表TOP10', 16: '存储引擎分布' },
  },
  {
    id: 'section-5', label: '（五）数据任务管理', icon: 'fa-tasks', description: '监控数据导入、物化视图刷新、备份与恢复等任务的执行情况。',
    resultNums: [17, 18, 19, 20, 21],
    titles: { 17: '导入任务汇总', 18: '失败导入任务', 19: '物化视图', 20: '备份任务', 21: '恢复任务' },
  },
];

export function ReportSidebar({ activeSection, onNavigate }: ReportSidebarProps): React.ReactElement {
  return (
    <aside className="fixed top-0 left-0 h-full w-full lg:w-[300px] bg-white border-r border-gray-200 shadow-sm lg:shadow-none flex-shrink-0 hidden lg:block overflow-y-auto scrollbar-hide z-10" id="sidebar">
      <nav className="p-4">
        <ul className="space-y-1">
          {STARROCKS_SECTIONS.map((section) => (
            <li key={section.id} className="nav-group">
              <div
                className={`nav-item flex items-center py-2 px-3 rounded-md hover:bg-neutral-light cursor-pointer transition-colors duration-200 ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => onNavigate(section.id)}
              >
                <i className={`fa ${section.icon} w-5 text-center mr-3 text-primary`}></i>
                <span>{section.label}</span>
              </div>
              <ul className="pl-10 mt-1 mb-2 space-y-1">
                {section.resultNums.map((num) => (
                  <li key={num}>
                    <a
                      href={`#result-${num}`}
                      className="nav-item flex items-center py-1.5 px-3 rounded-md hover:bg-neutral-light text-sm cursor-pointer transition-colors duration-200"
                      onClick={(e) => { e.preventDefault(); document.getElementById(`result-${num}`)?.scrollIntoView({ behavior: 'smooth' }); }}
                    >
                      {section.titles[num] || `结果 ${num}`}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
```

- [ ] **Step 5: 创建 ReportViewer 主组件**

```tsx
// src/renderer/components/report/ReportViewer.tsx
import React, { useEffect, useState } from 'react';
import { ReportHeader } from './ReportHeader';
import { ReportSidebar } from './ReportSidebar';
import { ResultBlock } from './ResultBlock';
import { ChartBlock } from './ChartBlock';
import type { ResultMeta } from '@shared/types';

interface ReportViewerProps {
  dbPath: string;
  onExport?: () => void;
  onOpenInBrowser?: () => void;
}

const CHART_FILE_NUMS = new Set([13, 14]);

export function ReportViewer({ dbPath, onExport, onOpenInBrowser }: ReportViewerProps): React.ReactElement {
  const [meta, setMeta] = useState<Record<string, string>>({});
  const [resultMetas, setResultMetas] = useState<ResultMeta[]>([]);
  const [activeSection, setActiveSection] = useState('section-1');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const metaResult = await window.electronAPI.fetchReportMeta(dbPath);
        if (metaResult) {
          setMeta(metaResult.meta || {});
        }
        const metas = await window.electronAPI.fetchReportResultMetas(dbPath);
        setResultMetas(metas || []);
      } catch (err) {
        console.error('Failed to load report:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [dbPath]);

  // IntersectionObserver for section tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const sectionId = (entry.target as HTMLElement).dataset.section;
            if (sectionId) setActiveSection(sectionId);
          }
        }
      },
      { threshold: 0.3 }
    );

    document.querySelectorAll('[data-section]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [resultMetas]);

  // Group results by section
  const sectionGroups: Record<string, number[]> = {
    'section-1': [0, 1, 2, 3, 4],
    'section-2': [5, 6, 7, 8, 9],
    'section-3': [10, 11, 12],
    'section-4': [13, 14, 15, 16],
    'section-5': [17, 18, 19, 20, 21],
  };

  const sectionLabels: Record<string, { label: string; icon: string; desc: string }> = {
    'section-1': { label: '（一）集群基础信息', icon: 'fa-server', desc: '涵盖数据库会话、版本信息以及FE/BE/Compute/Broker各类节点的拓扑情况，全面呈现集群基础配置。' },
    'section-2': { label: '（二）集群运行状态', icon: 'fa-heartbeat', desc: '监控集群运行时状态，包含元信息、均衡状态、当前查询、进程列表及FE锁信息。' },
    'section-3': { label: '（三）系统配置与权限', icon: 'fa-cogs', desc: '检查数据库字符集、全局参数配置以及用户权限信息，确保系统配置合理且安全。' },
    'section-4': { label: '（四）数据资产概览', icon: 'fa-pie-chart', desc: '盘点数据库容量分布、对象分类统计、大表排行及存储引擎使用情况，全面掌握数据资产现状。' },
    'section-5': { label: '（五）数据任务管理', icon: 'fa-tasks', desc: '监控数据导入、物化视图刷新、备份与恢复等任务的执行情况，确保数据流转正常。' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 mx-auto mb-4 text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-500">加载报告数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <div className="flex flex-1 overflow-hidden">
        <ReportSidebar resultMetas={resultMetas} activeSection={activeSection} onNavigate={(id) => {
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        }} />

        <main className="flex-1 overflow-y-auto main-content bg-gray-50 p-4 lg:p-8">
          <ReportHeader
            description={meta.description || ''}
            dbType={meta.db_type || 'StarRocks'}
            generatedTime={meta.generated_time || ''}
            serverInfo={meta.server_info}
            onExport={onExport}
            onOpenInBrowser={onOpenInBrowser}
          />

          {Object.entries(sectionGroups).map(([sectionId, fileNums]) => (
            <section key={sectionId} id={sectionId} data-section={sectionId} className="mb-12 content-section visible">
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                  <i className={`fa ${sectionLabels[sectionId].icon} text-primary mr-3`}></i>
                  {sectionLabels[sectionId].label}
                </h2>
                <p className="text-gray-600">{sectionLabels[sectionId].desc}</p>
              </div>

              {fileNums.map((num) => (
                <div key={num} id={`result-${num}`}>
                  {CHART_FILE_NUMS.has(num) ? (
                    <ChartBlock
                      dbPath={dbPath}
                      fileNum={num}
                      title={sectionLabels[sectionId]?.label}
                    />
                  ) : (
                    <ResultBlock
                      dbPath={dbPath}
                      fileNum={num}
                    />
                  )}
                </div>
              ))}
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 创建 ChartBlock 组件（骨架，图表逻辑后续完善）**

```tsx
// src/renderer/components/report/ChartBlock.tsx
import React from 'react';
import { ResultBlock } from './ResultBlock';

interface ChartBlockProps {
  dbPath: string;
  fileNum: number;
  title?: string;
}

export function ChartBlock({ dbPath, fileNum }: ChartBlockProps): React.ReactElement {
  // 先用 ResultBlock 渲染数据表格，图表渲染在后续任务中通过读取 DOM 表格数据实现
  return <ResultBlock dbPath={dbPath} fileNum={fileNum} />;
}
```

- [ ] **Step 7: Commit**

```bash
git add src/renderer/components/report/
git commit -m "feat: add React report viewer with lazy-loaded ResultBlock and DataTable"
```

---

### Task 11: 更新 ReportPage 集成 React 查看器

**Files:**
- Modify: `src/renderer/components/report/ReportPage.tsx`

- [ ] **Step 1: 修改 ReportPage 使用 ReportViewer**

将原来的 iframe 替换为 React ReportViewer 组件：

```tsx
// 在文件顶部添加 import
import { ReportViewer } from './ReportViewer';

// 修改右侧预览区域（将 iframe 替换为 ReportViewer）：
{selectedReport ? (
  <ReportViewer
    dbPath={selectedReport.filePath}
    onExport={async () => {
      // 触发导出流程
      const results = await window.electronAPI.fetchReportAllResults(selectedReport.filePath);
      // ... 导出逻辑见 Task 12
    }}
    onOpenInBrowser={async () => {
      const serverUrl = await window.electronAPI.getReportServerUrl();
      const url = `${serverUrl}/report/${encodeURIComponent(selectedReport.dbId || '')}`;
      window.open(url, '_blank');
    }}
  />
) : (
  // ... 空状态不变
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/report/ReportPage.tsx
git commit -m "refactor: replace iframe with React ReportViewer in ReportPage"
```

---

### Task 12: 创建报告导出功能

**Files:**
- Create: `src/renderer/components/report/reportExport.ts`

- [ ] **Step 1: 编写前端导出逻辑**

```typescript
// src/renderer/components/report/reportExport.ts
import type { ReportResultData, ResultMeta } from '@shared/types';

export async function exportReportHTML(
  dbPath: string,
  meta: Record<string, string>,
  resultMetas: ResultMeta[],
): Promise<void> {
  // 1. 获取模板 HTML 骨架
  const templateResponse = await fetch('/assets/starrocks/report_template/report_template_starrocks.html');
  let html = await templateResponse.text();

  // 2. 替换元信息占位符
  html = html.replace('{{description}}', meta.description || '');
  html = html.replace('{{generated_time}}', meta.generated_time || '');
  html = html.replace('{{server_info}}', meta.server_info || '');

  // 3. 获取所有结果并生成 HTML
  const results = await window.electronAPI.fetchReportAllResults(dbPath) as ReportResultData[];

  for (const result of results) {
    const htmlTable = buildResultHTML(result);
    const placeholder1 = `{{ result_${result.file_num} }}`;
    const placeholder2 = `{ result_${result.file_num} }`;
    html = html.replace(placeholder1, htmlTable);
    html = html.replace(placeholder2, htmlTable);
  }

  // 4. 清理未匹配的占位符
  html = html.replace(/\{\{\s*result_\d+\s*\}\}/g, '');
  html = html.replace(/\{\s*result_\d+\s*\}/g, '');

  // 5. 触发下载
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${meta.description || 'report'}_${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildResultHTML(result: ReportResultData): string {
  if (result.error) {
    return `<div class="result-section"><p style="color:red">错误: ${escapeHTML(result.error)}</p></div>`;
  }
  if (!result.columns || result.columns.length === 0) {
    return `<div class="result-section"><p>无数据</p></div>`;
  }

  let table = '<div class="result-section"><table><thead><tr>';
  for (const col of result.columns) {
    table += `<th>${escapeHTML(col)}</th>`;
  }
  table += '</tr></thead><tbody>';
  for (const row of result.rows) {
    table += '<tr>';
    for (const cell of row) {
      const val = cell === null ? '<span style="color:#999;font-style:italic">NULL</span>' : escapeHTML(String(cell));
      table += `<td>${val}</td>`;
    }
    table += '</tr>';
  }
  table += '</tbody></table></div>';
  return table;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/report/reportExport.ts
git commit -m "feat: add report HTML export function"
```

---

### Task 13: 创建浏览器模式报告查看器

**Files:**
- Create: `resources/dbinspection/common/report_viewer.html`

- [ ] **Step 1: 编写纯 HTML 报告查看器**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StarRocks 巡检报告</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.8/dist/chart.umd.min.js"></script>
  <style>
    html { scroll-behavior: smooth; }
    .content-section { opacity: 0; transform: translateY(20px); transition: opacity 0.5s, transform 0.5s; }
    .content-section.visible { opacity: 1; transform: translateY(0); }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.875rem; }
    table th { background: #F7F8FA; color: #4E5969; font-weight: 600; text-align: left; padding: 0.75rem 1rem; border: 1px solid #F2F3F5; }
    table td { padding: 0.75rem 1rem; border: 1px solid #F2F3F5; }
    table tr:hover { background: rgba(54,207,201,0.15); transition: background 0.2s; }
    .nav-item.active::before { content: ''; position: absolute; left: 0; top: 0; height: 100%; width: 4px; background: #165DFF; }
    .main-content { margin-left: 300px; }
    @media (max-width: 1023px) { .main-content { margin-left: 0; } }
    .result-section { overflow-x: auto; margin: 1rem 0; }
  </style>
</head>
<body class="bg-gray-50 font-sans text-gray-800">
  <div id="app">
    <div class="flex items-center justify-center h-screen">
      <p class="text-gray-500 text-lg">加载中...</p>
    </div>
  </div>

  <script>
    // Extract dbId from URL path: /report/:dbId
    const pathParts = window.location.pathname.split('/');
    const dbId = decodeURIComponent(pathParts[pathParts.length - 1] || '');

    const SECTIONS = [
      { id: 'section-1', label: '（一）集群基础信息', icon: 'fa-server', desc: '涵盖数据库会话、版本信息以及FE/BE/Compute/Broker各类节点的拓扑情况。', nums: [0,1,2,3,4] },
      { id: 'section-2', label: '（二）集群运行状态', icon: 'fa-heartbeat', desc: '监控集群运行时状态。', nums: [5,6,7,8,9] },
      { id: 'section-3', label: '（三）系统配置与权限', icon: 'fa-cogs', desc: '字符集、全局参数配置及用户权限。', nums: [10,11,12] },
      { id: 'section-4', label: '（四）数据资产概览', icon: 'fa-pie-chart', desc: '数据库容量分布、对象统计、大表及引擎。', nums: [13,14,15,16] },
      { id: 'section-5', label: '（五）数据任务管理', icon: 'fa-tasks', desc: '导入、物化视图、备份与恢复任务。', nums: [17,18,19,20,21] },
    ];

    const CHART_NUMS = { 13: true, 14: true };

    async function loadMeta() {
      const res = await fetch(`/api/report/${dbId}/meta`);
      return res.json();
    }

    async function loadResult(fileNum) {
      const res = await fetch(`/api/report/${dbId}/result/${fileNum}`);
      if (!res.ok) return null;
      return res.json();
    }

    async function loadResultPage(fileNum, page) {
      const res = await fetch(`/api/report/${dbId}/result/${fileNum}/page/${page}`);
      if (!res.ok) return null;
      return res.json();
    }

    function buildTable(columns, rows) {
      let html = '<div class="result-section"><table><thead><tr>';
      columns.forEach(c => html += `<th>${esc(c)}</th>`);
      html += '</tr></thead><tbody>';
      rows.forEach(row => {
        html += '<tr>';
        row.forEach(cell => {
          const val = cell === null ? '<span class="text-gray-400 italic">NULL</span>' : esc(String(cell));
          html += `<td>${val}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table></div>';
      return html;
    }

    function esc(str) {
      return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // Observer for lazy loading result blocks
    function observeResults() {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const fileNum = parseInt(el.dataset.fileNum);
            if (el.dataset.loaded === 'true') return;
            el.dataset.loaded = 'true';

            loadResult(fileNum).then(data => {
              if (!data) { el.innerHTML = '<p class="text-red-500">加载失败</p>'; return; }
              if (data.error) { el.innerHTML = `<p class="text-red-500">错误: ${esc(data.error)}</p>`; return; }
              if (data.columns.length === 0) { el.innerHTML = '<p class="text-gray-400">无数据</p>'; return; }

              let html = buildTable(data.columns, data.rows);
              if (data.has_more) {
                html += `<div class="text-center py-2">
                  <button class="text-sm text-blue-500 hover:underline load-more-btn"
                    data-file-num="${fileNum}" data-page="1" data-has-more="${data.has_more}"
                    data-row-count="${data.row_count}">加载更多 (已显示 ${data.rows.length}/${data.row_count} 行)</button>
                </div>`;
              }
              el.innerHTML = html;

              // Re-bind load-more buttons
              el.querySelectorAll('.load-more-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                  const fn = parseInt(this.dataset.fileNum);
                  const page = parseInt(this.dataset.page);
                  const rowCount = parseInt(this.dataset.rowCount);
                  this.disabled = true;
                  this.textContent = '加载中...';

                  const pageData = await loadResultPage(fn, page);
                  if (!pageData) { this.textContent = '加载失败'; return; }

                  const tableBody = el.querySelector('tbody');
                  pageData.rows.forEach(row => {
                    const tr = document.createElement('tr');
                    row.forEach(cell => {
                      const td = document.createElement('td');
                      td.innerHTML = cell === null ? '<span class="text-gray-400 italic">NULL</span>' : esc(String(cell));
                      tr.appendChild(td);
                    });
                    tableBody.appendChild(tr);
                  });

                  const displayed = (page + 1) * 200;
                  if (pageData.has_more) {
                    this.dataset.page = page + 1;
                    this.textContent = `加载更多 (已显示 ${Math.min(displayed, rowCount)}/${rowCount} 行)`;
                    this.disabled = false;
                  } else {
                    this.remove();
                  }
                });
              });
            });
          }
        });
      }, { rootMargin: '200px' });

      document.querySelectorAll('.result-block').forEach(el => observer.observe(el));
    }

    async function init() {
      const meta = await loadMeta();
      document.title = `${meta.description || ''} StarRocks 巡检报告`;

      let html = '';
      // Header
      html += `<header class="bg-[#165DFF] text-white shadow-lg">
        <div class="px-4 py-6">
          <h1 class="text-2xl font-bold">${esc(meta.description || '')}StarRocks数据库巡检报告</h1>
          <p class="mt-2 opacity-90">全面数据库性能与健康状况分析</p>
          <div class="flex gap-4 mt-3 text-sm">
            <span>巡检时间: ${esc(meta.generated_time || '-')}</span>
            <span>数据库类型: ${esc(meta.db_type || 'StarRocks')}</span>
            <span>版本: ${esc(meta.server_info || '-')}</span>
          </div>
        </div>
      </header>`;

      // Sidebar + Content
      html += '<div class="flex"><aside class="fixed top-0 left-0 h-full w-[300px] bg-white border-r overflow-y-auto hidden lg:block" style="padding-top:140px"><nav class="p-4"><ul class="space-y-2">';

      SECTIONS.forEach(s => {
        html += `<li><a href="#${s.id}" class="block py-1.5 px-3 rounded hover:bg-gray-100 text-sm font-medium"><i class="fa ${s.icon} mr-2 text-[#165DFF]"></i>${s.label}</a></li>`;
      });

      html += '</ul></nav></aside>';
      html += '<main class="flex-1 main-content p-8">';

      // Sections
      SECTIONS.forEach(s => {
        html += `<section id="${s.id}" class="mb-12"><div class="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 class="text-2xl font-bold mb-2"><i class="fa ${s.icon} text-[#165DFF] mr-3"></i>${s.label}</h2>
          <p class="text-gray-600">${s.desc}</p></div>`;

        s.nums.forEach(num => {
          html += `<div id="result-${num}" class="result-block bg-white rounded-xl shadow-sm p-6 mb-4" data-file-num="${num}">
            <div class="flex items-center justify-center py-8 text-gray-400">加载中...</div>
          </div>`;
        });

        html += '</section>';
      });

      html += '</main></div>';
      document.getElementById('app').innerHTML = html;

      // Start observing
      observeResults();
    }

    init().catch(err => {
      document.getElementById('app').innerHTML = `<div class="p-8 text-red-500">加载失败: ${esc(err.message)}</div>`;
    });
  </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add resources/dbinspection/common/report_viewer.html
git commit -m "feat: add browser-mode report viewer (pure HTML/JS)"
```

---

### Task 14: 更新 preload 暴露新的 IPC API

**Files:**
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/types.d.ts`

- [ ] **Step 1: 在 preload/index.ts 中 Report operations 区域添加新方法**

在 `readReport` 之后插入以下代码（约 line 45）:

```typescript
// Report data query (SQLite-based viewer)
fetchReportMeta: (dbPath: string): Promise<{ meta: Record<string, string>; total: number; completed: number; status: string } | null> =>
  ipcRenderer.invoke('report:fetch-meta', dbPath),
fetchReportResult: (dbPath: string, fileNum: number): Promise<{
  file_name: string; file_num: number; section: string;
  columns: string[]; rows: (string | number | null)[][];
  row_count: number; has_more: boolean; error?: string;
} | null> =>
  ipcRenderer.invoke('report:fetch-result', dbPath, fileNum),
fetchReportResultPage: (dbPath: string, fileNum: number, pageIdx: number): Promise<{
  page_idx: number; rows: (string | number | null)[][]; has_more: boolean;
} | null> =>
  ipcRenderer.invoke('report:fetch-result-page', dbPath, fileNum, pageIdx),
fetchReportAllResults: (dbPath: string): Promise<Array<{
  file_name: string; file_num: number; section: string;
  columns: string[]; rows: (string | number | null)[][];
  row_count: number; error?: string;
}>> =>
  ipcRenderer.invoke('report:fetch-all-results', dbPath),
fetchReportResultMetas: (dbPath: string): Promise<Array<{
  file_num: number; file_name: string; section: string;
}>> =>
  ipcRenderer.invoke('report:fetch-result-metas', dbPath),
getReportServerUrl: (): Promise<string> =>
  ipcRenderer.invoke('report:get-server-url'),
```

- [ ] **Step 2: 更新 renderer/types.d.ts 中的全局类型声明**

```typescript
// src/renderer/types.d.ts
import type { ElectronAPI } from '../preload';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    /** Browser-mode only: configured via report_viewer.html inline fetch */
  }
}

export {};
```

preload 的 `ElectronAPI` 类型会自动从 `electronAPI` 对象推断，无需手动维护 types.d.ts。

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd "E:/ClaudeCode/db-inspector"
npx tsc -p tsconfig.node.json --noEmit 2>&1 | head -30
```

Expected: 无类型错误。

- [ ] **Step 4: Commit**

```bash
git add src/preload/index.ts src/renderer/types.d.ts
git commit -m "feat: expose report data query APIs via preload"
```

---

### Task 15: 清理与收尾

**Files:**
- Remove: `python-backend/core/report_generator.py`（已在 Task 4 删除）
- Remove: 旧的 `dist/` 中的编译产物（通过重新构建清理）
- Modify: `src/main/ipc/report.ipc.ts` 中删除不再需要的 `report:read` handler

- [ ] **Step 1: 清理 report:read handler**

`report:read` 原是返回完整 HTML 文件内容的 handler，现在改为用新的 IPC handler 逐条查询数据。保留 `report:list` 和 `report:delete` 不变，删除或简化 `report:read`。

- [ ] **Step 2: 全量构建验证**

```bash
npm run build
```

Expected: TypeScript 编译无错误。

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: cleanup old report generation code, finalize SQLite-based pipeline"
```