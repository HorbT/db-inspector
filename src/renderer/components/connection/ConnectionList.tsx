import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Database, RefreshCw, CheckSquare, Trash2 } from 'lucide-react';
import { useConnectionStore } from '../../store/connectionStore';
import { DB_TYPE_LABELS, SUPPORTED_DB_TYPES } from '@shared/constants';
import type { DBType } from '@shared/constants';
import { Button } from '@renderer/components/ui/button';
import { Card } from '@renderer/components/ui/card';
import { EmptyState } from '@renderer/components/common/EmptyState';
import { cn } from '@renderer/lib/utils';

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
      <EmptyState
        icon={Database}
        title="暂无数据库连接"
        description="请在右侧添加连接"
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* DB Type filter tabs (Badge-style) */}
      <div className="flex gap-1 mb-2 flex-wrap">
        <button
          onClick={() => setFilterDbType('all')}
          className={cn(
            'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            filterDbType === 'all'
              ? 'border-transparent bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:text-foreground'
          )}
        >
          全部 ({connections.length})
        </button>
        {existingTypes.map(type => (
          <button
            key={type}
            onClick={() => setFilterDbType(type)}
            className={cn(
              'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filterDbType === type
                ? 'border-transparent bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {DB_TYPE_LABELS[type as DBType] || type} ({connections.filter(c => c.dbType === type).length})
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1 mb-2">
        <Button variant="secondary" size="sm" onClick={handleRefresh} title="刷新列表">
          <RefreshCw className="h-3.5 w-3.5" />
          刷新
        </Button>
        <Button variant="secondary" size="sm" onClick={handleSelectAll}>
          <CheckSquare className="h-3.5 w-3.5" />
          {allFilteredSelected ? '取消全选' : '全选'}
        </Button>
        {selectedConnectionIds.length > 0 && (
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            删除 ({selectedConnectionIds.length})
          </Button>
        )}
      </div>

      {/* Connection list */}
      <div className="space-y-1.5 flex-1">
        {filteredConnections.map((conn) => {
          const plugin = getPluginInfo(conn.dbType);
          const isSelected = selectedConnectionIds.includes(conn.id);

          return (
            <motion.div
              key={conn.id}
              whileHover={{ y: -2, transition: { duration: 0.2, ease: 'easeOut' } }}
              onClick={() => toggleConnectionSelection(conn.id)}
              className="cursor-pointer"
            >
              <Card
                className={cn(
                  'p-2.5 text-sm cursor-pointer',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-transparent hover:bg-muted/50'
                )}
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
              </Card>
            </motion.div>
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
