import React, { useEffect } from 'react';
import { useUIStore } from './store/uiStore';
import { useConnectionStore } from './store/connectionStore';
import { AppShell } from './components/layout/AppShell';

export function App(): React.ReactElement {
  const { theme, applyTheme } = useUIStore();
  const { loadConnections, loadPlugins } = useConnectionStore();

  useEffect(() => {
    applyTheme(theme);
    loadPlugins();
    loadConnections();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (useUIStore.getState().theme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return <AppShell />;
}
