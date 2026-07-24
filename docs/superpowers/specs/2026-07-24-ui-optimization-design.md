# DB Inspector UI 美化设计

- **日期**：2026-07-24
- **分支**：`feat/ui-optimization`
- **状态**：已通过 brainstorming，待写入实施计划
- **设计哲学**：emil-design-eng + apple-design 融合派

## 目标

在不改动 HTML 报告模板的前提下，对 Electron 软件 UI（React 渲染层）做全面美化。基于 Apple HIG 的结构克制 + Emil Kowalski 的卡片层级与签名动效，在 light/dark 双主题下统一设计语言。

## 决策摘要

| 维度 | 选择 |
|---|---|
| 范围 | 全量覆盖（巡检/报告/设置 + AppShell + 连接管理） |
| 改造深度 | 中度升级（framer-motion 关键交互 + 必需 shadcn primitives + 手写类精修） |
| 设计方向 | 融合派（Apple 结构 + Emil 卡片/动效） |
| 暗色模式 | 双主题都做 |
| 执行路线 | AppShell 框架优先 → 内页辐射 |

## 不在范围

- HTML 报告模板（`resources/dbinspection/*/report_template/`）
- 主进程 / IPC / Python 后端
- `dist/` 构建产物（由源码生成）
- 现有 Zustand store 结构（除非组件 props 变化触发必要调整）

## 架构总览

三层基础设施，辐射到所有页面：

### 1. 设计 token 层（`src/renderer/styles/globals.css`）

- 颜色 token：保留 HSL CSS 变量结构，重写取值对齐 Apple 系统色
- 动效 token：`--spring-snappy/normal/gentle/bouncy`、`--duration-fast/normal/slow`、`--ease-emphasized`（cubic-bezier(0.2, 0, 0, 1)）
- 半透明材质 token：`--material-bg`、`--material-border`、`--material-blur`，供 TitleBar/Sidebar/弹窗背景遮罩使用
- 圆角 token 分级：`--radius-sm/md/lg/xl`（6/10/14/20px）

### 2. shadcn primitives 层（`src/renderer/components/ui/`）

按需生成 11 个：Button、Card、Dialog、Tooltip、DropdownMenu、Tabs、Switch、Label、Badge、ScrollArea、Separator。基于 Radix + CVA + tailwind-merge（依赖已装），不引第三方 UI 库。每个 primitive 内置 light/dark + spring 动效。手写而非 `npx shadcn add`，避免 CLI 拉外部模板版本不一致。

### 3. 动效层（`framer-motion`）

- 新增依赖 `framer-motion`（约 32KB gzip，Electron 可接受）
- `App.tsx` 包 `<MotionConfig>` 统一 spring 配置
- 关键交互用 spring：视图切换、弹窗进入、列表项 stagger、按钮 tap 反馈、Sidebar 折叠
- 普通微动效用 CSS transitions

## 颜色 token 取值

颜色 token 以 HSL 三元组形式写入 CSS 变量（如 `--background: 240 33% 99%`），保持与现有 `tailwind.config.js` 的 `hsl(var(--token))` 消费模式兼容。下表同时给出 hex 等价供参考：

| Token | Light (HSL / hex) | Dark (HSL / hex) |
|---|---|---|
| `--background` | `240 33% 99%` / `#fbfbfd` | `240 3% 11%` / `#1c1c1e` |
| `--card` | `0 0% 100%` / `#ffffff` | `240 2% 18%` / `#2c2c2e` |
| `--popover` | `0 0% 100% / 0.92` | `240 2% 18% / 0.92` |
| `--primary` | `211 100% 50%` / `#007aff` | `211 100% 53%` / `#0a84ff` |
| `--foreground` | `240 3% 12%` / `#1d1d1f` | `240 9% 96%` / `#f5f5f7` |
| `--muted-foreground` | `240 2% 54%` / `#86868b` | `240 2% 61%` / `#98989d` |
| `--border` | `0 0% 0% / 0.06` | `0 0% 100% / 0.08` |
| `--success` / `--warning` / `--danger` / `--info` | 保持现有语义色，微调饱和度 | 同步调 |

材质 token 用 rgba 写法，shadow token 用多层叠加写法（见下节）。

### 材质 token

```css
:root {
  --material-bg: rgba(255,255,255,0.72);
  --material-border: rgba(0,0,0,0.06);
  --material-blur: saturate(180%) blur(20px);
}
.dark {
  --material-bg: rgba(28,28,30,0.72);
  --material-border: rgba(255,255,255,0.08);
  --material-blur: saturate(180%) blur(20px);
}
```

### 阴影 token（多层叠加，emil 风格）

```css
:root {
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06);
  --shadow-lg: 0 2px 8px rgba(0,0,0,0.06), 0 20px 40px rgba(0,0,0,0.10);
}
.dark {
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.2);
  --shadow-md: 0 1px 3px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.4);
  --shadow-lg: 0 2px 8px rgba(0,0,0,0.4), 0 20px 40px rgba(0,0,0,0.5);
}
```

### 颜色过渡

`globals.css` 加全局：`* { transition: background-color 200ms, border-color 200ms, color 200ms; }`，仅颜色过渡，不影响布局性能。

## AppShell 重做

### TitleBar（顶部 30px，磨砂玻璃）

- `backdrop-filter: blur(20px)` + 半透明背景
- 左：应用名 + 当前视图标题（小字），分隔用 `·`
- 中：窗口拖拽区
- 右：主题切换按钮（spring 图标翻转）+ 设置入口 + 窗口控制按钮
- 底边 1px hairline border

### Sidebar（左侧 72px 折叠 / 220px 展开）

- 磨砂玻璃背景
- 导航项：图标 + 文字，激活态用 Apple 系统蓝胶囊形高亮（`border-radius: 8px`）
- 折叠/展开 spring（`stiffness: 300, damping: 30`），文字 fade 配合
- hover：背景 80% 透明度渐显，100ms transition
- 底部连接状态指示（绿点在线 / 灰点离线）

### StatusBar（底部 24px）

- 1px hairline 顶边
- 左：当前操作状态文字 + 旋转 spinner（仅运行时）
- 右：内存占用 / 版本号（极淡）
- 整体纯色背景（不磨砂），与主区微对比

### Toast（右下角浮层，sonner 风格）

- 圆角 12px、卡片浮起阴影、spring 进入（`y: 20 → 0, opacity: 0 → 1`）、自动堆叠
- 关闭按钮带 tap 缩放反馈

### 主视图容器

- `<AnimatePresence mode="wait">` 包裹，视图切换 fade + 微 y 位移（8px），200ms，emphasized ease

## shadcn primitives 清单

| Primitive | 关键定制 |
|---|---|
| `Button` | 4 variant（primary/secondary/ghost/destructive）+ 3 size；`whileTap: scale 0.96`；variant 色用 token |
| `Card` | 圆角 14px、多层阴影、hover 阴影加深 |
| `Dialog` | Radix Dialog + framer-motion AnimatePresence；进入 `scale 0.95→1` + fade + 背景模糊 |
| `Tooltip` | Radix Tooltip；悬停 delay 400ms（避免误触），进入 spring 150ms；圆角 6px；半透明背景 |
| `DropdownMenu` | Radix DropdownMenu；进入 `y -4→0` + fade |
| `Tabs` | Radix Tabs；激活下划线用 `layoutId` 做 spring 滑动 |
| `Switch` | Radix Switch；thumb spring 平移 |
| `Label` | 极简，仅样式 |
| `Badge` | 4 semantic 色（info/success/warning/danger），半透明背景 |
| `ScrollArea` | Radix ScrollArea；自定义滚动条（细 6px，hover 时 8px） |
| `Separator` | hairline 1px，颜色用 border token |

不生成：`Input`/`Textarea`/`Select` 等表单类本次先用精修后的 `.input-field`，下一轮再上 primitive。

每个 primitive 在 `src/renderer/components/ui/__preview__/` 写最小预览页，开发时手动切 light/dark 验证。无自动测试（项目目前无测试基建）。

## 动效系统

### 全局 MotionConfig

```tsx
import { MotionConfig } from 'framer-motion';
<MotionConfig transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
  <AppShell/>
</MotionConfig>
```

### Spring 预设（`src/renderer/lib/motion.ts`）

| 名称 | stiffness | damping | 用途 |
|---|---|---|---|
| `spring.snappy` | 400 | 28 | 按钮点击、Toggle |
| `spring.normal` | 300 | 30 | 默认（弹窗、视图切换） |
| `spring.gentle` | 200 | 26 | 大型容器进入（Sidebar 展开、Sheet） |
| `spring.bouncy` | 350 | 18 | 列表项 stagger 进入（签名感） |

### 关键动效清单

| 场景 | 实现 | 时长 |
|---|---|---|
| 视图切换 | `AnimatePresence mode="wait"` + fade + y 8px | 200ms |
| 弹窗进入 | `scale 0.95→1` + fade + 背景模糊 | 250ms |
| Sidebar 折叠 | width spring + 文字 fade | 300ms |
| 列表项进入 | stagger 0.04s + y 12→0 + fade | 300ms |
| 按钮点击 | `whileTap: scale 0.96` | spring |
| Toast 进入 | y 20→0 + fade + spring bouncy | 350ms |
| 主题切换 | 图标 rotate 180° + fade | 400ms |
| Tabs 激活下划线 | `layoutId` + spring normal | 300ms |

### 减弱动效偏好

`@media (prefers-reduced-motion: reduce)` 下：spring 改为 0ms duration，CSS transition 改为 100ms，关闭 AnimatePresence 视图切换动画。写到 `globals.css` 全局 media query。

### 性能注意

- `<motion.div>` 只挂在需要动效的元素上，不包裹整个页面
- `layoutId` 用于 Tabs 下划线、共享元素过渡
- 列表 stagger 用 `motion.div` + `variants`，不每个 li 单独写动画

## 主题切换策略

- `uiStore` 保留 `theme: 'light' | 'dark' | 'system'` 三态
- `applyTheme` 函数：`system` 时监听 `prefers-color-scheme`，给 `<html>` 加/去 `dark` class
- 切换时 `<MotionConfig>` 内动效自然过渡（CSS transition 200ms 在颜色变量上）
- Windows Electron 不支持原生系统色，用 CSS 模拟，不引 `@radix-ui/colors`
- TitleBar 主题切换按钮：light/dark/system 三态循环，icon 用 framer-motion 旋转过渡

## 页面级改造

### 巡检页 `InspectionPage.tsx`

- hero 区：大标题「巡检」+ 副标题 + 右上「新建巡检」实心胶囊按钮（shadow）
- 连接列表用 `Card`：圆角 14px、多层阴影、左侧数据库类型图标（圆角方形背景）、右侧连接名 + 主机 + 状态 Badge
- hover：阴影加深 + 微 y 上移 2px
- 进入：stagger 0.04s，y 12→0 + fade
- 右侧 LiveResultView 用 `Card` 包裹，进度条改 spring 圆角进度条
- ProgressLog 用 `ScrollArea` 包裹，日志行等宽字体 + 语义色

### 报告页 `ReportPage.tsx` + `ReportViewer.tsx`

- 报告列表用 `Card` 网格布局（保留现有数据库类型筛选 chip）
- 筛选 chip 改 `Badge` 风格，激活实心、未激活描边
- `ReportViewer` 顶部工具栏用磨砂玻璃（与 TitleBar 视觉延续）
- 报告 iframe 容器外加 8px 内边距 + 圆角，让报告像浮在窗口里
- 报告内 HTML 模板不在本次范围，仅优化软件内外框

### 设置页 `SettingsPage.tsx`

- 左侧分类导航（`Tabs` 垂直布局 或 `ScrollArea` + list item）
- 右侧设置面板用 `Card` 分组，每组带 `Label` + 描述文字
- `Switch` 替换手写开关
- 表单输入先用精修后的 `.input-field`，下一轮再上 `Input` primitive
- 保存按钮带 loading 态 + spring 完成反馈

### 连接管理 `ConnectionList.tsx` / `ConnectionForm.tsx`

- 列表项用 `Card`（同巡检页风格）
- 右键菜单用 `DropdownMenu`
- 表单对话框用 `Dialog` 替换手写 modal
- 表单字段用 `Label` + 精修后的 input

### 共性改造

- 所有页面外层包 `<motion.main>` 做视图切换动画
- 页面标题统一 hero 区样式（h1 + subtitle + 右上 action）
- 列表数据空态用统一 `EmptyState` 组件（图标 + 文字 + CTA）

## 推进计划

按 AppShell 框架优先路线，拆 7 个 PR：

| # | PR 标题 | 范围 | 依赖 |
|---|---|---|---|
| 1 | `feat(ui): 引入 framer-motion + 设计 token 重写` | `globals.css` token 重写、`tailwind.config.js` 扩展、`App.tsx` MotionConfig、`lib/motion.ts` spring 预设、`.gitignore` 忽略 `.superpowers/` | 无 |
| 2 | `feat(ui): 生成 shadcn primitives 基础集` | `components/ui/` 下 11 个 primitive + `__preview__/` 预览页 | #1 |
| 3 | `refactor(ui): AppShell + TitleBar + Sidebar + StatusBar + Toast 重做` | `components/layout/` 全部 | #2 |
| 4 | `refactor(ui): 巡检页与连接管理改造` | `components/inspection/` + `components/connection/` | #3 |
| 5 | `refactor(ui): 报告页与查看器改造` | `components/report/` | #3 |
| 6 | `refactor(ui): 设置页改造` | `components/config/` | #3 |
| 7 | `chore(ui): 清理旧手写组件类、构建验证、release 打包` | `globals.css` 旧 `.btn-*/.card` 删除、`dist/` 重建、release 产物 | #4 #5 #6 |

### 合并策略

- 每个 PR 合并到 `feat/ui-optimization` 分支
- 全部完成后一次性合并 `feat/ui-optimization` → `main`
- 每个 PR 单独审查，本地跑通 dev 模式才能合并

### 验证清单（每个 PR 合并前）

- [ ] `npm run dev` 启动无报错
- [ ] light/dark 双主题切换无闪烁
- [ ] 巡检/报告/设置三页都能打开
- [ ] framer-motion 动效在 `prefers-reduced-motion: reduce` 下正确降级
- [ ] 内存占用无明显增长（与合并前对比，差距 < 50MB）
- [ ] 无控制台 React warning

## 风险与对策

| 风险 | 对策 |
|---|---|
| framer-motion 与 React 18 StrictMode 双调用动效 | `App.tsx` 不开 StrictMode（项目目前就没开），动效设计为可中断 |
| Radix + framer-motion AnimatePresence 弹窗卸载竞态 | 弹窗用 `forceMount` + AnimatePresence 控制可见性，不用 Radix 默认卸载 |
| 颜色变量 transition 影响布局性能 | 仅 transition 颜色相关属性，不 transition `all` |
| 旧手写类与新 primitives 共存期混乱 | 第 7 个 PR 一次性清理，过渡期保留旧类做 fallback |
| Electron 打包后 backdrop-filter 在某些 Windows GPU 上失效 | 退化方案：fallback 到纯色背景，不依赖 blur |

## 完成验收标准

- 三个主页面 + AppShell 在 light/dark 双主题下视觉统一
- 关键交互动效（视图切换/弹窗/列表/Sidebar/Toast）有 spring 物理感
- `prefers-reduced-motion` 正确降级
- 内存增长 < 50MB
- 应用打包后正常启动，所有现有功能（巡检/报告/设置/AI 分析）无回归
