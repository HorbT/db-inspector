import React, { useEffect, useRef, useState } from 'react';
import type { InspectionResultItem } from '@shared/types';

interface LiveResultViewProps {
  items: InspectionResultItem[];
  isRunning: boolean;
}

export function LiveResultView({ items, isRunning }: LiveResultViewProps): React.ReactElement {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  // Auto-expand newest items and scroll to bottom
  useEffect(() => {
    if (items.length > 0) {
      setExpandedItems(prev => {
        const next = new Set(prev);
        next.add(items.length - 1);
        return next;
      });
      // Delay scroll to let render complete
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [items.length]);

  const toggleExpand = (idx: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <div className="h-full overflow-auto bg-muted/30 rounded-md p-3">
        <div className="text-muted-foreground py-8 text-center text-sm">
          {isRunning ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              等待巡检结果...
            </span>
          ) : (
            '暂无巡检结果'
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-muted/30 rounded-md">
      {items.map((item, idx) => (
        <div key={`${item.fileNum}-${idx}`} className="border-b border-border/30 last:border-b-0">
          {/* Item header — clickable to expand/collapse */}
          <button
            onClick={() => toggleExpand(idx)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
          >
            {/* Status icon */}
            {item.error ? (
              <svg className="w-4 h-4 text-danger shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-success shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            )}
            {/* Item info */}
            <span className="text-xs font-mono font-medium truncate flex-1">
              [{item.fileNum}] {item.fileName}
            </span>
            {item.error ? (
              <span className="text-[10px] text-danger truncate max-w-[200px]">{item.error}</span>
            ) : (
              <span className="text-[10px] text-muted-foreground">
                {item.columns ? `${item.columns.length}列` : ''}
                {item.rowCount !== undefined ? ` ${item.rowCount}行` : ''}
              </span>
            )}
            {/* Expand icon */}
            <svg
              className={`w-3 h-3 text-muted-foreground shrink-0 transition-transform ${expandedItems.has(idx) ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Expanded: result table */}
          {expandedItems.has(idx) && !item.error && item.columns && item.rows && (
            <div className="px-3 pb-3 overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-2 py-1 text-left text-muted-foreground font-medium border border-border/30 w-8">#</th>
                    {item.columns.map((col, ci) => (
                      <th key={ci} className="px-2 py-1 text-left text-muted-foreground font-medium border border-border/30 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {item.rows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-muted/30">
                      <td className="px-2 py-0.5 text-muted-foreground/50 border border-border/30 text-center">
                        {ri + 1}
                      </td>
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-2 py-0.5 border border-border/30 max-w-[300px] truncate">
                          {cell === null ? (
                            <span className="text-muted-foreground/40 italic">NULL</span>
                          ) : (
                            String(cell)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Expanded: error display */}
          {expandedItems.has(idx) && item.error && (
            <div className="px-3 pb-3">
              <div className="bg-danger/10 text-danger text-xs rounded p-2 font-mono">
                {item.error}
              </div>
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}