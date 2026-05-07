import React, { useEffect, useState } from 'react';
import { useUIStore } from '../../store/uiStore';

export function TitleBar(): React.ReactElement {
  const { theme, toggleTheme } = useUIStore();
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    // Get initial maximize state
    window.electronAPI.isMaximized().then(setMaximized);

    // Listen for maximize/unmaximize changes
    const cleanup = window.electronAPI.onWindowMaximizedChange(setMaximized);
    return cleanup;
  }, []);

  return (
    <div className="h-10 bg-sidebar-bg text-sidebar-fg flex items-center px-2 titlebar-drag select-none border-b border-sidebar-hover">
      <div className="flex items-center gap-2 pl-2">
        <svg className="w-5 h-5 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
        <span className="font-semibold text-sm">DB Inspector</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-0.5 titlebar-no-drag">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded hover:bg-sidebar-hover transition-colors"
          title={theme === 'dark' ? '浅色主题' : '深色主题'}
        >
          {theme === 'dark' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* Minimize */}
        <button
          onClick={() => window.electronAPI.minimizeWindow()}
          className="win-control-btn"
          title="最小化"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Maximize / Restore */}
        <button
          onClick={() => window.electronAPI.maximizeWindow()}
          className="win-control-btn"
          title={maximized ? '还原' : '最大化'}
        >
          {maximized ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <rect x="6" y="6" width="9" height="9" />
              <path d="M9 6V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-1" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <rect x="4" y="4" width="16" height="16" />
            </svg>
          )}
        </button>

        {/* Close */}
        <button
          onClick={() => window.electronAPI.closeWindow()}
          className="win-control-btn close"
          title="关闭"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
