import React, { useState, useMemo } from 'react';
import { useConnectionStore } from '../../store/connectionStore';
import { useInspectionStore } from '../../store/inspectionStore';
import { generateConnectionId } from '@shared/validators';
import type { PluginField } from '@shared/types';
import { Button } from '@renderer/components/ui/button';
import { Label } from '@renderer/components/ui/label';
import { cn } from '@renderer/lib/utils';

export function ConnectionForm(): React.ReactElement {
  const { plugins, selectedDbType, setSelectedDbType, addConnection } = useConnectionStore();
  const { addLog } = useInspectionStore();

  const currentPlugin = useMemo(
    () => plugins.find(p => p.id === selectedDbType),
    [plugins, selectedDbType]
  );

  const [formData, setFormData] = useState<Record<string, string>>({});

  const getFieldValue = (field: PluginField): string => {
    return formData[field.name] ?? field.defaultValue;
  };

  const updateField = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddConnection = async () => {
    if (!currentPlugin) return;

    const config = {
      id: generateConnectionId(),
      dbType: currentPlugin.id,
      host: getFieldValue(currentPlugin.fields[0]),
      port: parseInt(getFieldValue(currentPlugin.fields.find(f => f.name === 'port') || currentPlugin.fields[1]), 10) || 0,
      username: getFieldValue(currentPlugin.fields.find(f => f.name === 'username') || currentPlugin.fields[2]),
      password: getFieldValue(currentPlugin.fields.find(f => f.name === 'password') || currentPlugin.fields[3]),
      database: getFieldValue(currentPlugin.fields.find(f => f.name === 'database') || currentPlugin.fields[4]),
      description: getFieldValue(currentPlugin.fields.find(f => f.name === 'description') || currentPlugin.fields[5]),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addLog(`正在测试连接到 ${config.description}...`, 'info');
    const result = await addConnection(config);

    if (result.success) {
      addLog(`连接成功: ${result.message}`, 'success');
      // Clear form
      setFormData({});
    } else {
      addLog(`连接失败: ${result.message}`, 'error');
    }
  };

  if (plugins.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        正在加载插件...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* DB Type selector */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">数据库类型</Label>
        <div className="flex gap-1.5 flex-wrap">
          {plugins.map((plugin) => (
            <Button
              key={plugin.id}
              variant={selectedDbType === plugin.id ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setSelectedDbType(plugin.id);
                setFormData({});
              }}
              className={cn('text-xs font-medium')}
            >
              {plugin.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Dynamic fields */}
      {currentPlugin && (
        <div className="grid grid-cols-2 gap-3">
          {currentPlugin.fields.map((field) => (
            <div
              key={field.name}
              className={field.name === 'description' ? 'col-span-2' : ''}
            >
              <Label className="text-xs text-muted-foreground mb-1 block">
                {field.label}
                {field.required && <span className="text-danger ml-0.5">*</span>}
              </Label>
              <input
                type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                value={getFieldValue(field)}
                onChange={(e) => updateField(field.name, e.target.value)}
                placeholder={field.placeholder || field.tooltip}
                className="input-field h-9 text-sm"
              />
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <Button onClick={handleAddConnection}>
          添加/更新连接
        </Button>
        <Button variant="secondary" onClick={() => setFormData({})}>
          清空
        </Button>
      </div>
    </div>
  );
}
