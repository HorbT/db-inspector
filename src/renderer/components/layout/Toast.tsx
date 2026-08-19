import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { springs } from '@renderer/lib/motion';
import { cn } from '@renderer/lib/utils';

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const iconColorMap = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-info',
};

export function ToastContainer(): React.ReactElement | null {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = iconMap[toast.type];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={springs.bouncy}
              className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border/60 bg-popover/95 backdrop-blur-material shadow-lg min-w-[260px]"
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', iconColorMap[toast.type])} />
              <span className="text-sm flex-1">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
