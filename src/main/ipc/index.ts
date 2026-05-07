import { ipcMain, dialog, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@shared/types';
import { ConfigStore } from '../services/config-store';
import { PluginRegistry } from '../plugin-registry';
import { registerConnectionHandlers } from './connection.ipc';
import { registerInspectionHandlers } from './inspection.ipc';
import { registerReportHandlers } from './report.ipc';
import { registerConfigHandlers } from './config.ipc';

export function registerAllIpcHandlers(): void {
  const configStore = ConfigStore.getInstance();

  // Initialize plugin registry
  PluginRegistry.initialize();

  // Register module-specific handlers
  registerConnectionHandlers(configStore);
  registerInspectionHandlers(configStore);
  registerReportHandlers(configStore);
  registerConfigHandlers(configStore);

  // Plugin handlers
  ipcMain.handle(IPC_CHANNELS.PLUGIN_LIST, () => {
    return PluginRegistry.getAllPlugins();
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_GET, (_event, id: string) => {
    return PluginRegistry.getPlugin(id);
  });

  // Dialog handlers
  ipcMain.handle(IPC_CHANNELS.DIALOG_SELECT_DIR, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle(IPC_CHANNELS.DIALOG_SELECT_FILE, async (_event, filters?: { name: string; extensions: string[] }[]) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters,
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // Python bridge status
  ipcMain.handle(IPC_CHANNELS.PYTHON_STATUS, () => {
    const { PythonBridge } = require('../services/python-bridge');
    return PythonBridge.getInstance().getStatus();
  });

  ipcMain.handle(IPC_CHANNELS.PYTHON_RESTART, async () => {
    const { PythonBridge } = require('../services/python-bridge');
    const bridge = PythonBridge.getInstance();
    bridge.stop();
    await bridge.start();
    return true;
  });

  // Window controls
  ipcMain.on('window:minimize', () => {
    BrowserWindow.getFocusedWindow()?.minimize();
  });

  ipcMain.on('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    BrowserWindow.getFocusedWindow()?.close();
  });

  ipcMain.handle('window:is-maximized', () => {
    return BrowserWindow.getFocusedWindow()?.isMaximized() ?? false;
  });

  console.log('[IPC] All handlers registered');
}

export function notifyWindowMaximizedChange(maximized: boolean): void {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('window:maximized-change', maximized);
  });
}
