import React, { useEffect, useRef } from 'react';
import { useInspectionStore } from '../../store/inspectionStore';

export function ProgressLog(): React.ReactElement {
  const { logs } = useInspectionStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="h-full overflow-auto bg-muted/30 rounded-md p-3 font-mono text-xs">
      {logs.length === 0 ? (
        <div className="text-muted-foreground py-4 text-center">
          暂无日志，点击"执行巡检"开始
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
  );
}
