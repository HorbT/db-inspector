# DB Inspector UI 美化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 spec `docs/superpowers/specs/2026-07-24-ui-optimization-design.md` 重做 Electron 软件 UI，融合 Apple 结构克制 + Emil 卡片动效，覆盖 AppShell + 巡检/报告/设置三页 + 连接管理，双主题。

**Architecture:** 三层基础设施（设计 token / shadcn primitives / framer-motion 动效）→ AppShell 框架 → 内页辐射。7 个 PR 顺序推进，每个独立可回滚。

**Tech Stack:** React 18 + TypeScript + Tailwind 3 + Radix UI（已装）+ framer-motion（新增）+ electron-builder

**Testing Strategy:** 项目无自动化测试基建（package.json 无 `test` 脚本）。每个任务的"测试"= TypeScript 类型检查 + Vite 构建 + 手动浏览器验证（light/dark 双主题 + 巡检/报告/设置三页 + reduced-motion）。

---

## 文件结构

新建：
- `src/renderer/lib/motion.ts` — spring 预设 + variants
- `src/renderer/lib/utils.ts` — `cn()` 工具（clsx + tailwind-merge）
- `src/renderer/components/ui/` — 11 个 primitives
  - `button.tsx`、`card.tsx`、`dialog.tsx`、`tooltip.tsx`、`dropdown-menu.tsx`、`tabs.tsx`、`switch.tsx`、`label.tsx`、`badge.tsx`、`scroll-area.tsx`、`separator.tsx`
- `src/renderer/components/ui/__preview__/PreviewPage.tsx` — primitives 预览页
- `src/renderer/components/common/EmptyState.tsx` — 统一空态

修改：
- `src/renderer/styles/globals.css` — token 重写、颜色过渡、reduced-motion
- `tailwind.config.js` — 扩展 radius/shadow/animation/blur 工具类
- `src/renderer/App.tsx` — 加 MotionConfig
- `src/renderer/components/layout/AppShell.tsx`、`TitleBar.tsx`、`Sidebar.tsx`、`StatusBar.tsx`
- `src/renderer/components/layout/Toast.tsx` — 改 sonner 风格
- `src/renderer/store/uiStore.ts` — 三态主题循环
- `src/renderer/components/inspection/InspectionPage.tsx`、`LiveResultView.tsx`、`ProgressLog.tsx`、`AIAnalysisDialog.tsx`
- `src/renderer/components/connection/ConnectionList.tsx`、`ConnectionForm.tsx`
- `src/renderer/components/report/ReportPage.tsx`、`ReportViewer.tsx`
- `src/renderer/components/config/SettingsPage.tsx`
- `package.json` — 加 framer-motion 依赖

清理：
- `src/renderer/styles/globals.css` 中 `.btn-primary`、`.btn-secondary`、`.btn-danger`、`.card`、`.badge`、`.input-field`（最后阶段，在所有引用迁移完成后）

---

## Phase 1: framer-motion + 设计 token 重写（PR #1）

### Task 1.1: 安装 framer-motion

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装依赖**

```bash
npm install framer-motion@^11
```

- [ ] **Step 2: 验证安装**

Run: `npm ls framer-motion`
Expected: `framer-motion@11.x` 出现，无 peer dependency 警告

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(ui): add framer-motion dependency"
```

### Task 1.2: 创建 `lib/utils.ts`（cn 工具）

**Files:**
- Create: `src/renderer/lib/utils.ts`

- [ ] **Step 1: 写 cn 工具**

```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc -p tsconfig.node.json --noEmit src/renderer/lib/utils.ts 2>&1 | head -20`
Expected: 无错误（或仅文件不在编译路径警告）

- [ ] **Step 3: Commit**

```bash
git add src/renderer/lib/utils.ts
git commit -m "feat(ui): add cn() utility for class merging"
```

### Task 1.3: 创建 `lib/motion.ts`（spring 预设）

**Files:**
- Create: `src/renderer/lib/motion.ts`

- [ ] **Step 1: 写 spring 预设**

```ts
import type { Transition, Variants } from 'framer-motion';

export const springs = {
  snappy: { type: 'spring', stiffness: 400, damping: 28 },
  normal: { type: 'spring', stiffness: 300, damping: 30 },
  gentle: { type: 'spring', stiffness: 200, damping: 26 },
  bouncy: { type: 'spring', stiffness: 350, damping: 18 },
} as const;

export const easeEmphasized = [0.2, 0, 0, 1] as const;

export const defaultTransition: Transition = springs.normal;

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: springs.normal },
};

export const staggerContainerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: springs.bouncy },
};

export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: springs.normal },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export const dialogOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit src/renderer/lib/motion.ts 2>&1 | head -20`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/renderer/lib/motion.ts
git commit -m "feat(ui): add spring presets and motion variants"
```

### Task 1.4: 重写 `globals.css` 设计 token

**Files:**
- Modify: `src/renderer/styles/globals.css` (整文件重写)

- [ ] **Step 1: 替换 `:root` 与 `.dark` 块**

替换 `@layer base { :root { ... } .dark { ... } }` 整段为：

```css
@layer base {
  :root {
    --background: 240 33% 99%;
    --foreground: 240 3% 12%;
    --card: 0 0% 100%;
    --card-foreground: 240 3% 12%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 3% 12%;
    --primary: 211 100% 50%;
    --primary-foreground: 0 0% 100%;
    --secondary: 240 9% 96%;
    --secondary-foreground: 240 3% 12%;
    --muted: 240 9% 96%;
    --muted-foreground: 240 2% 54%;
    --accent: 240 9% 96%;
    --accent-foreground: 240 3% 12%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 0%;
    --input: 0 0% 0%;
    --ring: 211 100% 50%;
    --radius: 0.625rem;

    --radius-sm: 0.375rem;
    --radius-md: 0.625rem;
    --radius-lg: 0.875rem;
    --radius-xl: 1.25rem;

    --sidebar-bg: 0 0% 100%;
    --sidebar-fg: 240 3% 12%;
    --sidebar-hover: 0 0% 0%;
    --sidebar-active: 211 100% 50%;
    --sidebar-active-fg: 0 0% 100%;

    --success: 142 71% 45%;
    --warning: 38 92% 50%;
    --danger: 0 84% 60%;
    --info: 199 89% 48%;

    --material-bg: 0 0% 100% / 0.72;
    --material-border: 0 0% 0% / 0.06;
    --material-blur: saturate(180%) blur(20px);

    --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
    --shadow-md: 0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06);
    --shadow-lg: 0 2px 8px rgba(0,0,0,0.06), 0 20px 40px rgba(0,0,0,0.10);

    --ease-emphasized: cubic-bezier(0.2, 0, 0, 1);
  }

  .dark {
    --background: 240 3% 11%;
    --foreground: 240 9% 96%;
    --card: 240 2% 18%;
    --card-foreground: 240 9% 96%;
    --popover: 240 2% 18%;
    --popover-foreground: 240 9% 96%;
    --primary: 211 100% 53%;
    --primary-foreground: 0 0% 100%;
    --secondary: 240 2% 18%;
    --secondary-foreground: 240 9% 96%;
    --muted: 240 2% 18%;
    --muted-foreground: 240 2% 61%;
    --accent: 240 2% 18%;
    --accent-foreground: 240 9% 96%;
    --destructive: 0 63% 41%;
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 100%;
    --input: 0 0% 100%;
    --ring: 211 100% 53%;

    --sidebar-bg: 240 3% 8%;
    --sidebar-fg: 240 9% 96%;
    --sidebar-hover: 0 0% 100%;
    --sidebar-active: 211 100% 53%;
    --sidebar-active-fg: 0 0% 100%;

    --success: 142 71% 45%;
    --warning: 38 92% 50%;
    --danger: 0 84% 60%;
    --info: 199 89% 48%;

    --material-bg: 240 3% 11% / 0.72;
    --material-border: 0 0% 100% / 0.08;

    --shadow-sm: 0 1px 2px rgba(0,0,0,0.2);
    --shadow-md: 0 1px 3px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.4);
    --shadow-lg: 0 2px 8px rgba(0,0,0,0.4), 0 20px 40px rgba(0,0,0,0.5);
  }
}
```

- [ ] **Step 2: 在 `@layer base` 中给 `*` 加颜色过渡**

在现有 `* { border-color: hsl(var(--border)); }` 这一行下方加：

```css
* {
  border-color: hsl(var(--border));
  transition: background-color 200ms var(--ease-emphasized),
              border-color 200ms var(--ease-emphasized),
              color 200ms var(--ease-emphasized);
}
```

注意：transition 仅作用于颜色属性，不影响布局性能。

- [ ] **Step 3: 加 reduced-motion media query**

在 `@layer base` 末尾加：

```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 100ms !important;
    animation-duration: 100ms !important;
  }
}
```

- [ ] **Step 4: 验证 dev 启动**

Run: `npm run dev:renderer`
Expected: Vite 启动无 CSS 解析错误。浏览器打开后 light/dark 切换颜色过渡 200ms。

- [ ] **Step 5: Commit**

```bash
git add src/renderer/styles/globals.css
git commit -m "feat(ui): rewrite design tokens (Apple system colors + material + shadow)"
```

### Task 1.5: 扩展 `tailwind.config.js`

**Files:**
- Modify: `tailwind.config.js`

- [ ] **Step 1: 加 radius / shadow / backdropBlur 工具类**

在 `theme.extend` 中加：

```js
borderRadius: {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
},
boxShadow: {
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
},
backdropBlur: {
  material: '20px',
},
```

并修改 `colors.primary` 与 `colors.accent` 的 `DEFAULT` 为 `hsl(var(--primary))`：

```js
primary: {
  // ...保留 50-950 字阶...
  DEFAULT: 'hsl(var(--primary))',
  foreground: 'hsl(var(--primary-foreground))',
},
```

删除 `accent` 字阶块（不再使用紫色 accent，用 `--accent` token）。

- [ ] **Step 2: 验证构建**

Run: `npm run build:renderer`
Expected: 构建成功，无 Tailwind 配置错误

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.js
git commit -m "feat(ui): extend tailwind with radius/shadow/material tokens"
```

### Task 1.6: App.tsx 加 MotionConfig

**Files:**
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: 包 MotionConfig**

```tsx
import React, { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { useUIStore } from './store/uiStore';
import { useConnectionStore } from './store/connectionStore';
import { AppShell } from './components/layout/AppShell';
import { defaultTransition } from './lib/motion';

export function App(): React.ReactElement {
  const { theme, applyTheme } = useUIStore();
  const { loadConnections, loadPlugins } = useConnectionStore();

  useEffect(() => {
    applyTheme(theme);
    loadPlugins();
    loadConnections();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (useUIStore.getState().theme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <MotionConfig transition={defaultTransition} reducedMotion="user">
      <AppShell />
    </MotionConfig>
  );
}
```

- [ ] **Step 2: 验证 dev 启动**

Run: `npm run dev`
Expected: 应用启动，无 framer-motion 导入错误

- [ ] **Step 3: Commit**

```bash
git add src/renderer/App.tsx
git commit -m "feat(ui): wrap App with MotionConfig for unified spring defaults"
```

### Task 1.7: 验证 Phase 1

- [ ] **Step 1: 全量构建**

Run: `npm run build`
Expected: 主进程 + 渲染进程都构建成功

- [ ] **Step 2: 手动验证**

启动应用，检查：
- light/dark 切换时颜色 200ms 过渡，无闪烁
- 系统偏好切换（macOS / Windows 主题设置）能跟随
- 当前 UI 元素（旧手写类）仍能用，颜色对齐 Apple 系统色

- [ ] **Step 3: 推送分支**

```bash
git push origin feat/ui-optimization
```

---

## Phase 2: shadcn primitives 基础集（PR #2）

### Task 2.1: Button

**Files:**
- Create: `src/renderer/components/ui/button.tsx`

- [ ] **Step 1: 写 Button**

```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { cn } from '@/renderer/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : motion.button;
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        whileTap={asChild ? undefined : { scale: 0.96 }}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { buttonVariants };
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i button | head`
Expected: 无 button.tsx 相关错误

注：若 tsconfig 路径别名 `@/renderer` 未配，改用相对路径 `../../lib/utils`。

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/ui/button.tsx
git commit -m "feat(ui): add Button primitive with 4 variants + tap spring"
```

### Task 2.2: Card

**Files:**
- Create: `src/renderer/components/ui/card.tsx`

- [ ] **Step 1: 写 Card**

```tsx
import * as React from 'react';
import { cn } from '@/renderer/lib/utils';

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border border-border/60 bg-card text-card-foreground shadow-md',
      'transition-shadow duration-200 hover:shadow-lg',
      className
    )}
    {...props}
  />
));
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col space-y-1.5 p-5', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center p-5 pt-0', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/ui/card.tsx
git commit -m "feat(ui): add Card primitive with header/title/content/footer"
```

### Task 2.3: Dialog

**Files:**
- Create: `src/renderer/components/ui/dialog.tsx`

- [ ] **Step 1: 写 Dialog**

```tsx
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/renderer/lib/utils';
import { dialogOverlayVariants, scaleInVariants } from '@/renderer/lib/motion';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/40 backdrop-blur-sm', className)}
    {...props}
  />
));
DialogOverlay.displayName = 'DialogOverlay';

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4',
        'rounded-lg border bg-background p-6 shadow-lg',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = 'DialogContent';

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
);

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
));
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
DialogDescription.displayName = 'DialogDescription';
```

注：AnimatePresence 包装留到使用 Dialog 的页面（AIAnalysisDialog 等）实现，primitive 层保持 Radix 默认动效以避免与 AnimatePresence 冲突。

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/ui/dialog.tsx
git commit -m "feat(ui): add Dialog primitive with Radix + blur backdrop"
```

### Task 2.4: Tooltip, DropdownMenu, Tabs, Switch, Label, Badge, ScrollArea, Separator

**Files:**
- Create: 8 个 primitives 文件

- [ ] **Step 1: Tooltip**

写 `src/renderer/components/ui/tooltip.tsx`：

```tsx
import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/renderer/lib/utils';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md bg-popover/95 px-2 py-1 text-xs text-popover-foreground shadow-md',
      'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95',
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = 'TooltipContent';
```

- [ ] **Step 2: DropdownMenu**

写 `src/renderer/components/ui/dropdown-menu.tsx`：

```tsx
import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@/renderer/lib/utils';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
      'focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = 'DropdownMenuItem';

export const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-border', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';
```

- [ ] **Step 3: Tabs**

写 `src/renderer/components/ui/tabs.tsx`：

```tsx
import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { motion } from 'framer-motion';
import { cn } from '@/renderer/lib/utils';

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('inline-flex h-9 items-center justify-center gap-1 rounded-md bg-muted p-1 text-muted-foreground', className)}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      'transition-colors',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-2 focus-visible:outline-none', className)}
    {...props}
  />
));
TabsContent.displayName = 'TabsContent';
```

注：Tabs 激活下划线的 `layoutId` 动画留到使用页面实现（页面知道何时切换），primitive 仅暴露 class hook。

- [ ] **Step 4: Switch**

写 `src/renderer/components/ui/switch.tsx`：

```tsx
import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@/renderer/lib/utils';

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform',
        'data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0'
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = 'Switch';
```

- [ ] **Step 5: Label**

写 `src/renderer/components/ui/label.tsx`：

```tsx
import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/renderer/lib/utils';

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)}
    {...props}
  />
));
Label.displayName = 'Label';
```

- [ ] **Step 6: Badge**

写 `src/renderer/components/ui/badge.tsx`：

```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/renderer/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/10 text-primary',
        info: 'border-transparent bg-info/10 text-info',
        success: 'border-transparent bg-success/10 text-success',
        warning: 'border-transparent bg-warning/10 text-warning',
        danger: 'border-transparent bg-danger/10 text-danger',
        outline: 'text-foreground border-border',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
```

- [ ] **Step 7: ScrollArea**

写 `src/renderer/components/ui/scroll-area.tsx`：

```tsx
import * as React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { cn } from '@/renderer/lib/utils';

export const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn('relative overflow-hidden', className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = 'ScrollArea';

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      'flex touch-none select-none transition-colors',
      orientation === 'vertical' && 'h-full w-1.5 border-l border-l-transparent p-[1px]',
      orientation === 'horizontal' && 'h-1.5 flex-col border-t border-t-transparent p-[1px]',
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = 'ScrollBar';
```

- [ ] **Step 8: Separator**

写 `src/renderer/components/ui/separator.tsx`：

```tsx
import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '@/renderer/lib/utils';

export const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = 'horizontal', ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    orientation={orientation}
    className={cn(
      'shrink-0 bg-border',
      orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
      className
    )}
    {...props}
  />
));
Separator.displayName = 'Separator';
```

- [ ] **Step 9: 类型检查**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "ui/(tooltip|dropdown|tabs|switch|label|badge|scroll|separator)" | head`
Expected: 无错误

- [ ] **Step 10: 一次性 Commit**

```bash
git add src/renderer/components/ui/tooltip.tsx src/renderer/components/ui/dropdown-menu.tsx src/renderer/components/ui/tabs.tsx src/renderer/components/ui/switch.tsx src/renderer/components/ui/label.tsx src/renderer/components/ui/badge.tsx src/renderer/components/ui/scroll-area.tsx src/renderer/components/ui/separator.tsx
git commit -m "feat(ui): add Tooltip/DropdownMenu/Tabs/Switch/Label/Badge/ScrollArea/Separator primitives"
```

### Task 2.5: PreviewPage

**Files:**
- Create: `src/renderer/components/ui/__preview__/PreviewPage.tsx`
- Modify: `src/renderer/components/layout/AppShell.tsx`（临时入口，PR #3 会移除）

- [ ] **Step 1: 写预览页**

```tsx
import { Button } from '../button';
import { Card, CardHeader, CardTitle, CardContent } from '../card';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '../dialog';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../tooltip';
import { Badge } from '../badge';
import { Switch } from '../switch';
import { Label } from '../label';
import { Separator } from '../separator';
import { ScrollArea } from '../scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';

export function PreviewPage() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Primitives Preview</h1>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Button</h2>
        <div className="flex gap-2">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Card</h2>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Report Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Card content</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Dialog</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description text</DialogDescription>
          </DialogContent>
        </Dialog>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Tooltip / Badge / Switch / Tabs</h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost">Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>Tooltip content</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex gap-2">
          <Badge>Default</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Switch id="t" defaultChecked />
          <Label htmlFor="t">Toggle</Label>
        </div>

        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">A</TabsTrigger>
            <TabsTrigger value="b">B</TabsTrigger>
          </TabsList>
          <TabsContent value="a">Content A</TabsContent>
          <TabsContent value="b">Content B</TabsContent>
        </Tabs>
      </section>

      <Separator />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">ScrollArea</h2>
        <ScrollArea className="h-32 w-72 rounded-md border p-4">
          <div className="space-y-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="text-sm">Item {i + 1}</div>
            ))}
          </div>
        </ScrollArea>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: 临时挂载到 AppShell（仅用于预览）**

修改 `src/renderer/components/layout/AppShell.tsx` 的 main 内容区，加一个临时开关切换到 PreviewPage（具体位置：在 `currentView` switch 之前加 `if (uiStore.previewMode) return <PreviewPage />`，并加一个键盘快捷键 `Ctrl+Shift+P` 切换）。

如 AppShell 不便加，更简单做法：在 `App.tsx` 临时把 `<AppShell />` 换成 `<PreviewPage />`，提交前再换回来。

推荐做法：在 `App.tsx` 临时替换：

```tsx
// 临时预览，Phase 3 后移除
import { PreviewPage } from './components/ui/__preview__/PreviewPage';
// ...
return (
  <MotionConfig transition={defaultTransition} reducedMotion="user">
    <PreviewPage />
  </MotionConfig>
);
```

- [ ] **Step 3: 验证 dev 启动 + 浏览器查看**

Run: `npm run dev`
Expected: 应用打开后显示 PreviewPage，所有 primitives 在 light/dark 双主题下视觉正确

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/ui/__preview__/PreviewPage.tsx src/renderer/App.tsx
git commit -m "feat(ui): add primitives preview page (temporary)"
```

- [ ] **Step 5: 推送**

```bash
git push origin feat/ui-optimization
```

---

## Phase 3: AppShell 重做（PR #3）

### Task 3.1: uiStore 三态主题循环

**Files:**
- Modify: `src/renderer/store/uiStore.ts`

- [ ] **Step 1: 加 cycleTheme action**

读取 `uiStore.ts`，找到 `theme` 字段定义与 `applyTheme` 函数。加 `cycleTheme`：

```ts
cycleTheme: () => {
  const order: Theme[] = ['light', 'dark', 'system'];
  const current = get().theme;
  const next = order[(order.indexOf(current) + 1) % order.length];
  set({ theme: next });
  get().applyTheme(next);
},
```

（具体变量名根据实际文件调整）

- [ ] **Step 2: Commit**

```bash
git add src/renderer/store/uiStore.ts
git commit -m "feat(ui): add cycleTheme action for 3-state theme switch"
```

### Task 3.2: TitleBar 重做

**Files:**
- Modify: `src/renderer/components/layout/TitleBar.tsx`

- [ ] **Step 1: 读现有 TitleBar**

```bash
# 读 E:\ClaudeCode\db-inspector\src\renderer\components\layout\TitleBar.tsx
```

- [ ] **Step 2: 重写为磨砂玻璃 + 主题切换按钮**

新结构：

```tsx
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor, Settings, Minus, Square, X } from 'lucide-react';
import { useUIStore } from '@/renderer/store/uiStore';
import { cn } from '@/renderer/lib/utils';

// 保留现有窗口控制 IPC 调用不变，只改样式与主题切换按钮
```

关键样式：
- 根 div：`h-[30px] flex items-center px-3 bg-background/72 backdrop-blur-material border-b border-border/60 titlebar-drag`
- 应用名：`text-xs font-semibold text-foreground`
- 中间视图标题：`text-xs text-muted-foreground` 前面加 `·`
- 右侧按钮组：`titlebar-no-drag flex items-center gap-1`
- 主题切换按钮：`<motion.button whileTap={{ scale: 0.9 }}>`，根据当前 theme 显示 Sun/Moon/Monitor icon，icon 用 `<motion.span animate={{ rotate: 360 }} transition={{ duration: 0.4 }}>`
- 窗口控制按钮复用现有 `.win-control-btn` 类（PR #7 清理时统一）

- [ ] **Step 3: 验证 dev 启动**

Run: `npm run dev`
Expected: TitleBar 磨砂玻璃效果，主题切换按钮点击三态循环，icon 旋转过渡

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/layout/TitleBar.tsx
git commit -m "refactor(ui): TitleBar with material blur + 3-state theme toggle"
```

### Task 3.3: Sidebar 重做

**Files:**
- Modify: `src/renderer/components/layout/Sidebar.tsx`

- [ ] **Step 1: 读现有 Sidebar**

了解现有导航项数据结构与 active 判定逻辑。

- [ ] **Step 2: 重写 Sidebar**

新结构要点：
- 根 div：`<motion.aside animate={{ width: collapsed ? 72 : 220 }} transition={springs.gentle}>` + 磨砂玻璃背景 `bg-sidebar-bg/72 backdrop-blur-material`
- 导航项：用 motion.div + whileHover（背景 80% 透明度渐显）+ active 态用 Apple 系统蓝胶囊（`bg-primary/10 text-primary rounded-md`）
- 文字用 AnimatePresence + opacity fade 配合折叠
- 底部加连接状态指示：`<div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">` + 圆点

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { springs } from '@/renderer/lib/motion';
import { cn } from '@/renderer/lib/utils';
// 现有 icon 与 navItems 数组保留
```

- [ ] **Step 3: 验证**

Run: `npm run dev`
Expected: Sidebar 折叠/展开 spring 动画，导航项 hover 渐显，激活态胶囊高亮

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/layout/Sidebar.tsx
git commit -m "refactor(ui): Sidebar with spring collapse + material blur + pill active"
```

### Task 3.4: StatusBar 重做

**Files:**
- Modify: `src/renderer/components/layout/StatusBar.tsx`（若不存在则创建并在 AppShell 引入）

- [ ] **Step 1: 写 StatusBar**

```tsx
import { Loader2 } from 'lucide-react';
import { useInspectionStore } from '@/renderer/store/inspectionStore';

export function StatusBar() {
  const isRunning = useInspectionStore((s) => s.isRunning);
  const statusText = useInspectionStore((s) => s.statusText);
  const memoryMb = useUIStore((s) => s.memoryMb);  // 若无此字段，先硬编码 '—'

  return (
    <footer className="h-6 flex items-center justify-between px-3 text-[10px] text-muted-foreground border-t border-border/60 bg-background">
      <div className="flex items-center gap-2">
        {isRunning && <Loader2 className="h-3 w-3 animate-spin" />}
        <span>{statusText || '就绪'}</span>
      </div>
      <div className="flex items-center gap-3">
        <span>{memoryMb ? `${memoryMb} MB` : '—'}</span>
        <span>v1.0.0</span>
      </div>
    </footer>
  );
}
```

如 inspectionStore 无 `statusText`，用现有字段（如 `status`）映射。

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/layout/StatusBar.tsx
git commit -m "refactor(ui): StatusBar with running spinner + memory/version"
```

### Task 3.5: Toast 改 sonner 风格

**Files:**
- Modify: `src/renderer/components/layout/Toast.tsx`

- [ ] **Step 1: 读现有 Toast**

了解 toasts 数据结构与 add/remove action。

- [ ] **Step 2: 重写为 sonner 风格**

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { springs } from '@/renderer/lib/motion';

// 在右下角堆叠，每个 toast 用 motion.div 进入：y 20→0 + opacity + spring.bouncy
```

关键样式：`fixed bottom-4 right-4 z-50 flex flex-col gap-2`，单个 toast：`rounded-lg bg-popover/95 backdrop-blur-material border border-border/60 shadow-lg p-4 max-w-sm`

- [ ] **Step 3: 验证**

Run: `npm run dev`，手动触发一个 toast（如保存设置），观察进入动画

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/layout/Toast.tsx
git commit -m "refactor(ui): Toast with sonner-style spring entrance + material blur"
```

### Task 3.6: AppShell 主视图切换动画

**Files:**
- Modify: `src/renderer/components/layout/AppShell.tsx`

- [ ] **Step 1: 移除 PreviewPage 临时挂载**

恢复 `App.tsx` 的 `<AppShell />`。

- [ ] **Step 2: 包 AnimatePresence 视图切换**

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { fadeUpVariants } from '@/renderer/lib/motion';

// 在 currentView switch 外层包：
<AnimatePresence mode="wait">
  <motion.main
    key={currentView}
    variants={fadeUpVariants}
    initial="hidden"
    animate="visible"
    exit="hidden"
    className="flex-1 overflow-auto"
  >
    {renderView()}
  </motion.main>
</AnimatePresence>
```

- [ ] **Step 3: 验证**

Run: `npm run dev`
Expected: 切换视图时 200ms fade + y 8px 动画

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/layout/AppShell.tsx src/renderer/App.tsx
git commit -m "refactor(ui): AppShell main view with AnimatePresence fade-up + remove preview page"
```

### Task 3.7: 验证 Phase 3

- [ ] **Step 1: 全量构建 + dev 启动**

Run: `npm run build && npm run dev`
Expected: 启动成功，TitleBar/Sidebar/StatusBar/Toast 全部按新设计语言呈现，light/dark 双主题正确

- [ ] **Step 2: 手动验证清单**

- [ ] 视图切换有 fade-up 动画
- [ ] Sidebar 折叠/展开 spring
- [ ] 主题切换三态循环，icon 旋转
- [ ] Toast 进入有 spring bouncy
- [ ] reduced-motion 下动画降级

- [ ] **Step 3: 推送**

```bash
git push origin feat/ui-optimization
```

---

## Phase 4: 巡检页 + 连接管理改造（PR #4）

### Task 4.1: EmptyState 通用组件

**Files:**
- Create: `src/renderer/components/common/EmptyState.tsx`

- [ ] **Step 1: 写 EmptyState**

```tsx
import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/renderer/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/common/EmptyState.tsx
git commit -m "feat(ui): add EmptyState component for empty list states"
```

### Task 4.2: InspectionPage hero + 连接列表改造

**Files:**
- Modify: `src/renderer/components/inspection/InspectionPage.tsx`

- [ ] **Step 1: 读现有 InspectionPage**

了解连接列表数据来源与点击行为。

- [ ] **Step 2: 加 hero 区**

```tsx
import { motion } from 'framer-motion';
import { staggerContainerVariants, staggerItemVariants } from '@/renderer/lib/motion';
import { Button } from '@/renderer/components/ui/button';
import { Card } from '@/renderer/components/ui/card';
import { Badge } from '@/renderer/components/ui/badge';
import { Plus, Database } from 'lucide-react';

// 页面顶部：
<div className="flex items-start justify-between mb-6">
  <div>
    <h1 className="text-2xl font-bold tracking-tight">巡检</h1>
    <p className="text-sm text-muted-foreground mt-1">选择数据库连接开始巡检</p>
  </div>
  <Button onClick={onNewInspection} size="md">
    <Plus className="h-4 w-4" />
    新建巡检
  </Button>
</div>
```

- [ ] **Step 3: 连接列表用 Card + stagger**

```tsx
<motion.div
  variants={staggerContainerVariants}
  initial="hidden"
  animate="visible"
  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
>
  {connections.map((conn) => (
    <motion.div key={conn.id} variants={staggerItemVariants} whileHover={{ y: -2 }}>
      <Card className="p-4 cursor-pointer" onClick={() => onSelect(conn)}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{conn.name}</h3>
              <Badge variant={conn.status === 'online' ? 'success' : 'default'}>
                {conn.status === 'online' ? '在线' : '离线'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {conn.host}:{conn.port}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  ))}
</motion.div>
```

- [ ] **Step 4: 空态用 EmptyState**

```tsx
{connections.length === 0 && (
  <EmptyState
    icon={Database}
    title="还没有数据库连接"
    description="添加一个连接开始巡检"
    action={<Button onClick={onNewConnection}>添加连接</Button>}
  />
)}
```

- [ ] **Step 5: 验证 dev + Commit**

```bash
git add src/renderer/components/inspection/InspectionPage.tsx
git commit -m "refactor(ui): InspectionPage with hero + Card grid + stagger entrance"
```

### Task 4.3: LiveResultView + ProgressLog 改造

**Files:**
- Modify: `src/renderer/components/inspection/LiveResultView.tsx`, `ProgressLog.tsx`

- [ ] **Step 1: LiveResultView 用 Card 包裹**

外层换 `<Card className="p-4">`，进度条用 spring 圆角样式：
```tsx
<div className="h-2 rounded-full bg-muted overflow-hidden">
  <motion.div
    className="h-full bg-primary rounded-full"
    initial={{ width: 0 }}
    animate={{ width: `${progress}%` }}
    transition={springs.normal}
  />
</div>
```

- [ ] **Step 2: ProgressLog 用 ScrollArea**

```tsx
import { ScrollArea } from '@/renderer/components/ui/scroll-area';

<ScrollArea className="h-[400px] rounded-md border bg-background">
  <div className="p-3 font-mono text-xs space-y-0.5">
    {logs.map((log) => (
      <div className={cn('log-line', log.level)}>{log.message}</div>
    ))}
  </div>
</ScrollArea>
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/inspection/LiveResultView.tsx src/renderer/components/inspection/ProgressLog.tsx
git commit -m "refactor(ui): LiveResultView Card + spring progress, ProgressLog ScrollArea"
```

### Task 4.4: AIAnalysisDialog 用 Dialog primitive

**Files:**
- Modify: `src/renderer/components/inspection/AIAnalysisDialog.tsx`

- [ ] **Step 1: 读现有 AIAnalysisDialog**

了解 open state 与 AI 结果数据流。

- [ ] **Step 2: 用 Dialog 替换手写 modal**

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/renderer/components/ui/dialog';
import { AnimatePresence, motion } from 'framer-motion';

// 用 Dialog.Root 的 open / onOpenChange 控制可见性
// DialogContent 内部用 motion 包内容做 scale 0.95→1（可选，Radix 自带动效已足够）
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/inspection/AIAnalysisDialog.tsx
git commit -m "refactor(ui): AIAnalysisDialog uses Dialog primitive"
```

### Task 4.5: ConnectionList + ConnectionForm 改造

**Files:**
- Modify: `src/renderer/components/connection/ConnectionList.tsx`, `ConnectionForm.tsx`

- [ ] **Step 1: ConnectionList 列表项用 Card**

同巡检页风格 — Card + stagger + hover y -2。

- [ ] **Step 2: 右键菜单用 DropdownMenu**

```tsx
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/renderer/components/ui/dropdown-menu';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Card>...</Card>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={onEdit}>编辑</DropdownMenuItem>
    <DropdownMenuItem onClick={onDuplicate}>复制</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={onDelete} className="text-destructive">删除</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

- [ ] **Step 3: ConnectionForm 用 Dialog + Label**

替换手写 modal 为 Dialog，表单字段用 `<Label>` + 精修后的 `.input-field`。

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/connection/ConnectionList.tsx src/renderer/components/connection/ConnectionForm.tsx
git commit -m "refactor(ui): ConnectionList Card + DropdownMenu, ConnectionForm Dialog"
```

### Task 4.6: 验证 Phase 4

- [ ] **Step 1: dev 启动 + 手动验证**

- [ ] 巡检页 hero + 连接卡片网格 + stagger 进入
- [ ] LiveResultView 进度条 spring
- [ ] ProgressLog ScrollArea 滚动
- [ ] AIAnalysisDialog 弹窗
- [ ] 右键菜单
- [ ] 连接表单 Dialog
- [ ] 空态显示

- [ ] **Step 2: Commit + Push**

```bash
git push origin feat/ui-optimization
```

---

## Phase 5: 报告页改造（PR #5）

### Task 5.1: ReportPage 卡片网格 + Badge 筛选

**Files:**
- Modify: `src/renderer/components/report/ReportPage.tsx`

- [ ] **Step 1: 读现有 ReportPage**

了解报告列表数据结构与筛选逻辑。

- [ ] **Step 2: 报告卡片用 Card + Badge**

```tsx
import { motion } from 'framer-motion';
import { staggerContainerVariants, staggerItemVariants } from '@/renderer/lib/motion';
import { Card } from '@/renderer/components/ui/card';
import { Badge } from '@/renderer/components/ui/badge';
import { Button } from '@/renderer/components/ui/button';

// 顶部：hero + 筛选 chip
<div className="flex items-start justify-between mb-6">
  <div>
    <h1 className="text-2xl font-bold tracking-tight">报告</h1>
    <p className="text-sm text-muted-foreground mt-1">查看历史巡检报告</p>
  </div>
</div>

<div className="flex gap-2 mb-4">
  {dbTypes.map((type) => (
    <button
      key={type}
      onClick={() => onFilter(type)}
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        activeType === type
          ? 'border-transparent bg-primary text-primary-foreground'
          : 'border-border text-muted-foreground hover:text-foreground'
      )}
    >
      {type}
    </button>
  ))}
</div>

<motion.div variants={staggerContainerVariants} initial="hidden" animate="visible" className="grid ...">
  {reports.map((r) => (
    <motion.div key={r.id} variants={staggerItemVariants} whileHover={{ y: -2 }}>
      <Card className="p-4 cursor-pointer" onClick={() => onOpen(r)}>
        {/* 内容 */}
      </Card>
    </motion.div>
  ))}
</motion.div>
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/report/ReportPage.tsx
git commit -m "refactor(ui): ReportPage Card grid + Badge filters + stagger"
```

### Task 5.2: ReportViewer 工具栏磨砂玻璃 + iframe 圆角

**Files:**
- Modify: `src/renderer/components/report/ReportViewer.tsx`

- [ ] **Step 1: 工具栏改磨砂玻璃**

```tsx
<div className="flex items-center gap-2 px-4 py-2 bg-background/72 backdrop-blur-material border-b border-border/60">
  {/* 保留现有按钮逻辑，只换样式 */}
</div>
```

- [ ] **Step 2: iframe 容器圆角 + 内边距**

```tsx
<div className="p-2 bg-muted/30">
  <iframe className="w-full h-full rounded-lg border border-border/60 bg-white" src={reportUrl} />
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/report/ReportViewer.tsx
git commit -m "refactor(ui): ReportViewer material toolbar + rounded iframe"
```

### Task 5.3: 验证 Phase 5

- [ ] dev 启动 + 手动验证报告列表 + 报告查看
- [ ] Push

---

## Phase 6: 设置页改造（PR #6）

### Task 6.1: SettingsPage 用 Tabs + Card 分组

**Files:**
- Modify: `src/renderer/components/config/SettingsPage.tsx`

- [ ] **Step 1: 读现有 SettingsPage**

- [ ] **Step 2: 左侧分类 Tabs + 右侧 Card 分组**

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/renderer/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/renderer/components/ui/card';
import { Switch } from '@/renderer/components/ui/switch';
import { Label } from '@/renderer/components/ui/label';
import { Button } from '@/renderer/components/ui/button';

<Tabs defaultValue="general" className="flex gap-6 h-full">
  <TabsList orientation="vertical" className="flex-col h-full w-40">
    <TabsTrigger value="general">通用</TabsTrigger>
    <TabsTrigger value="inspection">巡检</TabsTrigger>
    <TabsTrigger value="ai">AI 分析</TabsTrigger>
    <TabsTrigger value="about">关于</TabsTrigger>
  </TabsList>

  <div className="flex-1 overflow-auto">
    <TabsContent value="general">
      <Card>
        <CardHeader>
          <CardTitle>主题</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Switch id="auto-theme" checked={autoTheme} onCheckedChange={setAutoTheme} />
            <Label htmlFor="auto-theme">跟随系统主题</Label>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
    {/* 其他 Tab */}
  </div>
</Tabs>
```

注：Radix Tabs 默认水平。垂直需用 `orientation="vertical"` 且 TabsList 加 `flex-col`。

- [ ] **Step 3: 保存按钮带 loading**

```tsx
<Button disabled={saving}>
  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
  {saving ? '保存中...' : '保存'}
</Button>
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/config/SettingsPage.tsx
git commit -m "refactor(ui): SettingsPage with vertical Tabs + Card groups + Switch + Label"
```

### Task 6.2: 验证 Phase 6

- [ ] dev + 手动验证设置页所有 Tab + Switch + 保存按钮 loading 态
- [ ] Push

---

## Phase 7: 清理与打包（PR #7）

### Task 7.1: 删除旧手写组件类

**Files:**
- Modify: `src/renderer/styles/globals.css`
- Grep 全局确保无引用

- [ ] **Step 1: 搜索旧类引用**

Run Grep：
- `.btn-primary` → 在 `src/renderer/**/*.tsx` 中搜索
- `.btn-secondary`、`.btn-danger`、`.card`、`.badge`、`.input-field`

如仍有引用，先迁移到 primitive 或对应 Tailwind 工具类。

- [ ] **Step 2: 删除 globals.css 中的旧类**

从 `@layer components` 删除：
- `.btn-primary`、`.btn-secondary`、`.btn-danger`
- `.card`
- `.badge`
- `.input-field`（如已被 primitive 替换则删，否则保留）

保留：
- `.sidebar-item`（已被 Sidebar 内部 Tailwind 类替换后也可删）
- `.log-line`（仍有用）
- `.titlebar-drag` / `.titlebar-no-drag`（Electron 必需）
- `.win-control-btn`（TitleBar 用）
- `.animate-slide-up` + `@keyframes slide-up`（如 Toast 已改 framer-motion，可删）

- [ ] **Step 3: 类型检查 + 构建验证**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 4: Commit**

```bash
git add src/renderer/styles/globals.css
git commit -m "chore(ui): remove obsolete hand-written component classes"
```

### Task 7.2: 删除 PreviewPage 临时挂载

**Files:**
- Delete: `src/renderer/components/ui/__preview__/PreviewPage.tsx`

如该文件仅用于开发预览且不再需要，删除。如想保留作为文档，则留在 `__preview__/` 目录不删除。

- [ ] **Step 1: 删除或保留**

```bash
# 如删除：
git rm src/renderer/components/ui/__preview__/PreviewPage.tsx
git commit -m "chore(ui): remove temporary primitives preview page"
```

### Task 7.3: 全量验证 + 打包

- [ ] **Step 1: 全量构建**

Run: `npm run build`
Expected: 主进程 + 渲染进程构建成功，无 TS 错误，无 Tailwind 警告

- [ ] **Step 2: dev 启动完整功能验证**

- [ ] 巡检页：连接列表 + 新建巡检 + LiveResultView + ProgressLog + AIAnalysisDialog
- [ ] 报告页：列表 + 筛选 + ReportViewer
- [ ] 设置页：所有 Tab + Switch + 保存
- [ ] AppShell：TitleBar / Sidebar / StatusBar / Toast
- [ ] light/dark 双主题切换
- [ ] reduced-motion 降级

- [ ] **Step 3: 内存基线对比**

启动应用，记录内存占用。与 Phase 1 开始前的内存基线对比，差距应 < 50MB。

- [ ] **Step 4: electron-builder 打包**

确认无 DB Inspector 进程在运行（避免文件锁），然后：

```bash
npm run package:win
```

Expected: `release/DB Inspector-1.0.0-Setup.exe` 生成

- [ ] **Step 5: 安装包验证**

安装生成的 Setup.exe，启动应用，跑一遍巡检/报告/设置，确认无回归。

- [ ] **Step 6: Commit + Push**

```bash
git add -A
git commit -m "chore(ui): final cleanup + verify build + release package"
git push origin feat/ui-optimization
```

### Task 7.4: 合并到 main

- [ ] **Step 1: 创建 PR**

```bash
gh pr create --title "feat(ui): AppShell + pages + connection mgmt UI overhaul" --body "$(cat <<'EOF'
## Summary
- 引入 framer-motion + 设计 token 重写（Apple 系统色 + 材质 + 阴影）
- 生成 11 个 shadcn primitives（Button/Card/Dialog/Tooltip/DropdownMenu/Tabs/Switch/Label/Badge/ScrollArea/Separator）
- AppShell 重做（TitleBar/Sidebar/StatusBar/Toast）
- 巡检页 + 连接管理 + 报告页 + 设置页全部按融合派设计语言重做
- 双主题（light/dark）正确切换
- reduced-motion 偏好正确降级
- 内存增长 < 50MB

## Test plan
- [ ] 巡检页 hero + 连接卡片网格 + stagger
- [ ] LiveResultView 进度条 spring
- [ ] ProgressLog ScrollArea
- [ ] AIAnalysisDialog 弹窗
- [ ] 右键菜单 DropdownMenu
- [ ] 报告页 Badge 筛选 + Card 网格
- [ ] ReportViewer 磨砂玻璃工具栏 + iframe 圆角
- [ ] 设置页 Tabs + Switch + Label
- [ ] light/dark 切换 + 主题切换按钮三态
- [ ] reduced-motion 降级
- [ ] 安装包验证

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: 合并 PR 后删除分支**

```bash
git checkout main
git pull
git branch -d feat/ui-optimization
git push origin --delete feat/ui-optimization
```

---

## 验收清单（最终）

- [ ] 三个主页面 + AppShell 在 light/dark 双主题下视觉统一
- [ ] 关键交互动效（视图切换/弹窗/列表/Sidebar/Toast）有 spring 物理感
- [ ] `prefers-reduced-motion: reduce` 下动效正确降级
- [ ] 内存增长 < 50MB
- [ ] 应用打包后正常启动，巡检/报告/设置/AI 分析无回归
