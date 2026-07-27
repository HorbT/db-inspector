import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, FileText, Settings } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { springs } from '@renderer/lib/motion';
import { cn } from '@renderer/lib/utils';

type NavItem = {
  id: 'inspection' | 'reports' | 'settings';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { id: 'inspection', label: '巡检', icon: Database },
  { id: 'reports', label: '报告', icon: FileText },
  { id: 'settings', label: '设置', icon: Settings },
];

export function Sidebar(): React.ReactElement {
  const { currentView, setCurrentView, sidebarCollapsed } = useUIStore();

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 72 : 220 }}
      transition={springs.gentle}
      className="bg-sidebar-bg/72 backdrop-blur-material border-r border-border/60 flex flex-col overflow-hidden"
    >
      <div className="p-3 border-b border-border/60 flex items-center gap-2">
        <Database className="w-5 h-5 text-primary flex-shrink-0" />
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <div className="text-sm font-bold tracking-wide">DB Inspector</div>
              <div className="text-[10px] text-muted-foreground">统一数据库巡检平台</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              whileHover={active ? undefined : { backgroundColor: 'rgba(125, 125, 125, 0.1)' }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-fg/70 hover:text-sidebar-fg'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border/60">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-success" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                在线
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
