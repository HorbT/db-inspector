import React, { useState, useMemo } from 'react';
import { useConnectionStore } from '../../store/connectionStore';
import { DB_TYPE_LABELS, SUPPORTED_DB_TYPES } from '@shared/constants';
import type { DBType } from '@shared/constants';

export function ConnectionList(): React.ReactElement {
  const {
    connections, plugins, selectedConnectionIds,
    toggleConnectionSelection, deleteConnections, loadConnections,
    setSelectedConnectionIds,
  } = useConnectionStore();

  const [filterDbType, setFilterDbType] = useState<string>('all');

  // Get unique db types from existing connections for tabs
  const existingTypes = useMemo(() => {
    const types = new Set(connections.map(c => c.dbType));
    return SUPPORTED_DB_TYPES.filter(t => types.has(t));
  }, [connections]);

  // Filtered connections
  const filteredConnections = useMemo(() => {
    if (filterDbType === 'all') return connections;
    return connections.filter(c => c.dbType === filterDbType);
  }, [connections, filterDbType]);

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

  const handleSelectAll = () => {
    const allIds = filteredConnections.map(c => c.id);
    if (allIds.length === 0) return;
    // If all filtered are already selected, deselect all; otherwise select all
    const allSelected = allIds.every(id => selectedConnectionIds.includes(id));
    if (allSelected) {
      setSelectedConnectionIds(
        selectedConnectionIds.filter(id => !allIds.includes(id))
      );
    } else {
      // Select all filtered + keep any selections from other filters
      const newIds = new Set([...selectedConnectionIds, ...allIds]);
      setSelectedConnectionIds([...newIds]);
    }
  };

  // Check if all filtered connections are selected
  const allFilteredSelected = filteredConnections.length > 0
    && filteredConnections.every(c => selectedConnectionIds.includes(c.id));

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
      {/* DB Type filter tabs */}
      <div className="flex gap-1 mb-2 flex-wrap">
        <button
          onClick={() => setFilterDbType('all')}
          className={`px-2 py-0.5 rounded text-xs transition-colors ${
            filterDbType === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          全部 ({connections.length})
        </button>
        {existingTypes.map(type => (
          <button
            key={type}
            onClick={() => setFilterDbType(type)}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              filterDbType === type
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {DB_TYPE_LABELS[type as DBType] || type} ({connections.filter(c => c.dbType === type).length})
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1 mb-2">
        <button onClick={handleRefresh} className="text-xs btn-secondary py-1 px-2" title="刷新列表">
          刷新
        </button>
        <button
          onClick={handleSelectAll}
          className={`text-xs py-1 px-2 rounded transition-colors ${
            allFilteredSelected
              ? 'bg-muted text-muted-foreground'
              : 'btn-secondary'
          }`}
        >
          {allFilteredSelected ? '取消全选' : '全选'}
        </button>
        {selectedConnectionIds.length > 0 && (
          <button onClick={handleDelete} className="text-xs btn-danger py-1 px-2">
            删除 ({selectedConnectionIds.length})
          </button>
        )}
      </div>

      {/* Connection list */}
      <div className="space-y-1.5 overflow-auto flex-1">
        {filteredConnections.map((conn) => {
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
        {filteredConnections.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-xs">
            {filterDbType === 'all' ? '暂无连接' : `暂无 ${DB_TYPE_LABELS[filterDbType as DBType] || filterDbType} 连接`}
          </div>
        )}
      </div>
    </div>
  );
}