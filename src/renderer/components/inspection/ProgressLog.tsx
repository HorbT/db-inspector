import React, { useEffect, useRef } from 'react';
import { useInspectionStore } from '../../store/inspectionStore';
import { ScrollArea } from '@renderer/components/ui/scroll-area';

export function ProgressLog(): React.ReactElement {
  const { logs } = useInspectionStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <ScrollArea className="h-full rounded-md border bg-muted/30">
      <div className="p-3 font-mono text-xs space-y-0.5">
        {logs.length === 0 ? (
          <div className="text-muted-foreground py-4 text-center">
            暂无日志，点击&quot;执行巡检&quot;开始
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`log-line ${log.level}`}>
              <span className="text-muted-foreground/50">[{log.time}]</span>{' '}
              {log.message}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
