import React from 'react';
import { useConnectionStore } from '../../store/connectionStore';
import { DB_TYPE_LABELS } from '@shared/constants';
import type { DBType } from '@shared/constants';

export function ConnectionList(): React.ReactElement {
  const {
    connections, plugins, selectedConnectionIds,
    toggleConnectionSelection, deleteConnections, loadConnections,
  } = useConnectionStore();

  const getPluginInfo = (dbType: string) => {
    return plugins.find(p => p.id === dbType);
  };

  const handleDelete = async () => {
    if (selectedConnectionIds.length === 0) return;
    await deleteConnections(selectedConnectionIds);
  };

  const handleRefresh = () => {
    loadConnections();
  };

  if (connections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7" />
          <ellipse cx="12" cy="4" rx="8" ry="2" />
          <line x1="12" y1="6" x2="12" y2="12" />
        </svg>
        <p className="text-sm">暂无数据库连接</p>
        <p className="text-xs mt-1">请在右侧添加连接</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 mb-2">
        <button onClick={handleRefresh} className="text-xs btn-secondary py-1 px-2" title="刷新列表">
          刷新
        </button>
        {selectedConnectionIds.length > 0 && (
          <button onClick={handleDelete} className="text-xs btn-danger py-1 px-2">
            删除 ({selectedConnectionIds.length})
          </button>
        )}
      </div>
      <div className="space-y-1.5 overflow-auto flex-1">
        {connections.map((conn) => {
          const plugin = getPluginInfo(conn.dbType);
          const isSelected = selectedConnectionIds.includes(conn.id);

          return (
            <div
              key={conn.id}
              onClick={() => toggleConnectionSelection(conn.id)}
              className={`p-2.5 rounded-md cursor-pointer border transition-all text-sm ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-transparent hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium truncate">{conn.description}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {plugin?.name || conn.dbType}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 truncate">
                {conn.host}:{conn.port}/{conn.database}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
