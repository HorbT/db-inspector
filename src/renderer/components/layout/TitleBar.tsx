import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Monitor, Minus, Square, X, Database } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { springs } from '@renderer/lib/motion';

export function TitleBar(): React.ReactElement {
  const { theme, cycleTheme } = useUIStore();
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    window.electronAPI.isMaximized().then(setMaximized);
    const cleanup = window.electronAPI.onWindowMaximizedChange(setMaximized);
    return cleanup;
  }, []);

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const themeLabel = theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '跟随系统';

  return (
    <div className="h-[30px] bg-background/72 backdrop-blur-material border-b border-border/60 titlebar-drag select-none flex items-center px-3">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-primary" />
        <span className="font-semibold text-xs">DB Inspector</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1 titlebar-no-drag">
        <button
          onClick={cycleTheme}
          className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          title={`主题: ${themeLabel}`}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={theme}
              initial={{ rotate: -180, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 180, opacity: 0 }}
              transition={springs.snappy}
              className="block"
            >
              <ThemeIcon className="w-4 h-4" />
            </motion.span>
          </AnimatePresence>
        </button>

        <button
          onClick={() => window.electronAPI.minimizeWindow()}
          className="win-control-btn"
          title="最小化"
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          onClick={() => window.electronAPI.maximizeWindow()}
          className="win-control-btn"
          title={maximized ? '还原' : '最大化'}
        >
          {maximized ? <Square className="w-3.5 h-3.5" /> : <Square className="w-4 h-4" />}
        </button>

        <button
          onClick={() => window.electronAPI.closeWindow()}
          className="win-control-btn close"
          title="关闭"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
