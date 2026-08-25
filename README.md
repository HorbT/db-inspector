# DB Inspector

> 一款面向数据库运维工作者的智能巡检与健康评估工具，支持 MySQL、Oracle、SQL Server、TiDB、StarRocks、PostgreSQL 六大主流数据库，内置 AI 智能分析引擎。

[![License: PolyForm Noncommercial](https://img.shields.io/badge/License-PolyForm%20Noncommercial%201.0.0-blue.svg)](https://polyformproject.org/licenses/noncommercial/1.0.0)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows-lightgrey.svg)](https://github.com/HorbT/db-inspector/releases)
[![Version: 1.0.0](https://img.shields.io/badge/Version-1.0.0-green.svg)](https://github.com/HorbT/db-inspector/releases)

---

## 简介

凌晨两点，线上数据库又出问题了——你睡眼惺忪爬起来，手动执行一条条检查 SQL，在十几个监控面板间来回切换，等定位完根因天已蒙蒙亮。

**DB Inspector** 就是为解决这个痛点而生。配置好连接，点一下"开始巡检"，系统自动执行针对该数据库类型的全套健康检查脚本，几分钟后生成结构化可视化报告。更关键的是，每个巡检点都能让 AI 给出专业评估和改进建议——相当于身边多了一位 7×24 小时的数据库专家。

## 核心功能

### 一键自动化巡检

告别手工登录数据库执行 SQL 的原始方式。内置标准化巡检脚本体系，覆盖：

- 实例与版本信息
- 数据库大小与表空间
- 连接与会话状态
- 锁与阻塞分析
- 慢 SQL / 高消耗 SQL 排行
- 索引使用情况（未使用索引、缺失主键）
- 主从复制 / 流复制状态
- 参数配置与安全审计
- WAL / Redo 日志状态
- 缓存命中率与 IO 性能
- ……以及更多

巡检过程中，每个 SQL 脚本完成的实时结果会立即显示在"实时结果"区域，不用等全部跑完才知道。

### 专业可视化巡检报告

巡检完成后自动生成结构化报告，采用三级目录结构，每个巡检点独立展示，配有 HTML 表格、彩色标注。报告以 **SQLite 轻量数据库** 格式存储，体积小巧、便于归档、跨平台兼容。支持随时预览历史报告，追踪数据库健康趋势。还可导出为独立 HTML 文件，便于分享给团队汇报。

### AI 智能分析（核心亮点）

传统巡检工具只能告诉你"某个指标是多少"，DB Inspector 还能告诉你**这个指标意味着什么、风险有多高、应该怎么优化**。

在巡检报告的每个三级标题右侧都有"AI 分析"按钮。点击后，系统自动提取该巡检点的全部数据发送给 AI 模型（支持 OpenAI 兼容接口、Google Gemini），几秒内返回专业的分析结论和改进建议。分析结果为每个巡检点独立缓存，软件关闭后自动清空，保护数据隐私。

- "锁和会话"巡检点 —— AI 分析当前锁等待情况、是否存在潜在死锁风险
- "慢 SQL"巡检点 —— AI 评估执行效率、给出索引优化建议
- "复制延迟"巡检点 —— AI 判断延迟是否在安全范围内、是否需要扩容

### 六大数据库类型全覆盖

插件化架构，目前完整支持：

| 数据库类型 | 状态 |
|-----------|------|
| MySQL | 完整支持 |
| Oracle | 完整支持 |
| SQL Server | 完整支持 |
| TiDB | 完整支持 |
| StarRocks | 完整支持 |
| PostgreSQL | 完整支持 |

连接管理界面按数据库类型提供分类选项卡，可按类型快速筛选，支持全选、批量删除。

### 轻量高性能

经过深度性能优化，软件在内存使用上做到了极致克制：

- 启动后 Python 后端插件**按需懒加载**，只在实际使用时加载对应数据库驱动
- SQLite 报告数据采用**分页按需读取**，避免一次性加载全部数据行
- ReportDB 引擎实例采用 **LRU 缓存复用**，同一报告多次操作共享 WASM 内存

## 下载安装

前往 [Releases](https://github.com/HorbT/db-inspector/releases) 下载最新的 `DB Inspector-1.0.0-Setup.exe`，双击安装即可。目前仅提供 Windows 版本。

## 使用指南

1. **添加连接**：打开软件 → 巡检页右侧"连接配置"→ 选择数据库类型 → 填写主机/端口/账号/密码 → 添加/更新连接
2. **执行巡检**：在连接列表勾选要巡检的连接 → 点击"执行巡检"（按住 Shift 点击进入 Debug 模式查看详细调试信息）
3. **查看报告**：巡检完成后切换到"报告"页 → 点击报告卡片预览 → 在报告内点击三级标题右侧的"AI 分析"按钮获取智能解读
4. **AI 配置**：在"设置 → AI 配置"页填写 API 提供商、API 密钥、模型名称等参数

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面框架 | Electron 33 + React 18 + TypeScript 5 |
| 构建工具 | Vite 5 + electron-builder |
| UI | Tailwind CSS 3 + Radix UI + shadcn/ui 风格 primitives |
| 动效 | framer-motion（spring 物理动画） |
| 状态管理 | Zustand |
| 报告存储 | SQLite（sql.js WASM） |
| 后端 | Python 3（插件化架构，按数据库类型懒加载驱动） |
| AI | OpenAI 兼容接口 / Google Gemini |
| 数据库驱动 | mysql-connector、oracledb、pyodbc、pymysql 等 |

## 项目结构

```
db-inspector/
├── src/
│   ├── main/              # Electron 主进程（IPC、窗口、文件管理）
│   ├── renderer/          # React 渲染层（UI 组件、store、primitives）
│   ├── preload/           # 预加载脚本（IPC 桥接）
│   └── shared/            # 共享类型与常量
├── python-backend/        # Python 巡检后端（插件化）
│   ├── plugins/          # 各数据库类型插件
│   ├── core/              # 巡检核心逻辑
│   └── lib/               # 通用工具库
├── resources/dbinspection/
│   ├── mysql/             # MySQL 巡检 SQL 脚本 + 报告模板
│   ├── oracle/            # Oracle 巡检 SQL 脚本 + 报告模板
│   ├── sqlserver/         # SQL Server ...
│   ├── tidb/              # TiDB ...
│   ├── starrocks/         # StarRocks ...
│   ├── postgresql/        # PostgreSQL ...
│   ├── report-lazy-render.js   # 报告延迟渲染脚本
│   └── ai-analysis-inject.js   # AI 分析按钮注入脚本
└── docs/                  # 文档（博客、PPT 大纲、设计 spec）
```

## 开发

```bash
# 安装依赖
npm install

# 开发模式（同时启动主进程 + 渲染进程 + Python 后端）
npm run dev

# 构建
npm run build

# 打包 Windows 安装包
npm run package:win
```

开发模式需要本地安装 Python 3 并安装 Python 依赖：

```bash
cd python-backend
pip install -r requirements.txt
```

## 许可证

本项目采用 [PolyForm Noncommercial License 1.0.0](./LICENSE) 授权。

你可以自由地使用、复制、修改、合并、发布、分发本软件及其源码，**但仅限于非商业用途**。商业用途（包括但不限于销售、授权、租赁、用于商业产品或服务、提供付费 SaaS 服务、支持商业运营等）需另行获得授权。

简单来说：个人学习、教学、学术研究、贡献开源项目都可以；拿去卖钱不行。

## 反馈与贡献

欢迎通过 [Issues](https://github.com/HorbT/db-inspector/issues) 提交 Bug 报告、功能建议或使用反馈。提交 PR 前请先在 Issue 中讨论。

---

*如果这个项目对你有帮助，欢迎 Star ⭐ 支持*
