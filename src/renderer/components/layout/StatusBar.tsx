import React from 'react';
import { Loader2 } from 'lucide-react';
import { useInspectionStore } from '../../store/inspectionStore';

export function StatusBar(): React.ReactElement {
  const isRunning = useInspectionStore((s) => s.isRunning);
  const statusText = isRunning ? '巡检进行中...' : '就绪';

  return (
    <footer className="h-6 flex items-center justify-between px-3 text-[10px] text-muted-foreground border-t border-border/60 bg-background">
      <div className="flex items-center gap-2">
        {isRunning && <Loader2 className="h-3 w-3 animate-spin" />}
        <span>{statusText}</span>
      </div>
      <div className="flex items-center gap-3">
        {/* TODO(phase 7): wire to actual memory metric */}
        <span>—</span>
        <span>v1.0.0</span>
      </div>
    </footer>
  );
}
