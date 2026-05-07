import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/types';
import type { ConnectionConfig, ConnectionTestResult } from '@shared/types';
import type { ConfigStore } from '../services/config-store';
import { PythonBridge } from '../services/python-bridge';

export function registerConnectionHandlers(configStore: ConfigStore): void {
  const pythonBridge = PythonBridge.getInstance();

  ipcMain.handle(IPC_CHANNELS.CONNECTION_LIST, () => {
    return configStore.getConnections();
  });

  ipcMain.handle(IPC_CHANNELS.CONNECTION_ADD, async (_event, config: ConnectionConfig) => {
    try {
      // First test the connection via Python bridge
      const result = await pythonBridge.call('connection.test', {
        dbType: config.dbType,
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.database,
      }) as ConnectionTestResult;

      if (result.success) {
        const now = new Date().toISOString();
        configStore.addConnection({
          ...config,
          createdAt: config.createdAt || now,
          updatedAt: now,
        });
        return { success: true, message: '连接成功', serverInfo: result.serverInfo };
      }
      return { success: false, message: result.message || '连接测试失败' };
    } catch (err) {
      return { success: false, message: `连接错误: ${(err as Error).message}` };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CONNECTION_DELETE, (_event, ids: string[]) => {
    try {
      configStore.deleteConnections(ids);
      return { success: true, message: `已删除 ${ids.length} 个连接` };
    } catch (err) {
      return { success: false, message: `删除失败: ${(err as Error).message}` };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CONNECTION_UPDATE, (_event, config: ConnectionConfig) => {
    const success = configStore.updateConnection(config);
    return { success, message: success ? '更新成功' : '未找到该连接' };
  });

  ipcMain.handle(IPC_CHANNELS.CONNECTION_TEST, async (_event, config: ConnectionConfig) => {
    try {
      const result = await pythonBridge.call('connection.test', {
        dbType: config.dbType,
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.database,
      }) as ConnectionTestResult;
      return result;
    } catch (err) {
      return { success: false, message: `连接测试失败: ${(err as Error).message}` };
    }
  });
}
