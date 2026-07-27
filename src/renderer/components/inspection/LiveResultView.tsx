import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { springs } from '@renderer/lib/motion';
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
      <ScrollArea className="h-full rounded-md bg-muted/30 p-3">
        <div className="text-muted-foreground py-8 text-center text-sm">
          {isRunning ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              等待巡检结果...
            </span>
          ) : (
            '暂无巡检结果'
          )}
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full rounded-md bg-muted/30">
      <div>
        {items.map((item, idx) => (
          <div key={`${item.fileNum}-${idx}`} className="border-b border-border/30 last:border-b-0">
            {/* Item header — clickable to expand/collapse */}
            <button
              onClick={() => toggleExpand(idx)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
            >
              {/* Status icon with spring pop */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={springs.snappy}
                className="shrink-0"
              >
                {item.error ? (
                  <XCircle className="w-4 h-4 text-danger" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                )}
              </motion.div>
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
              <ChevronDown
                className={`w-3 h-3 text-muted-foreground shrink-0 transition-transform ${expandedItems.has(idx) ? 'rotate-180' : ''}`}
              />
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
    </ScrollArea>
  );
}
