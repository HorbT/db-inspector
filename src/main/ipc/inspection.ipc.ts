import { ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import { IPC_CHANNELS } from '@shared/types';
import type { InspectionConfig, InspectionProgress, InspectionResult } from '@shared/types';
import type { ConfigStore } from '../services/config-store';
import { PythonBridge } from '../services/python-bridge';
import { FileManager } from '../services/file-manager';

let currentInspectionCancelled = false;

export function registerInspectionHandlers(configStore: ConfigStore): void {
  const pythonBridge = PythonBridge.getInstance();

  ipcMain.handle(IPC_CHANNELS.INSPECTION_START, async (_event, config: InspectionConfig) => {
    try {
      currentInspectionCancelled = false;
      const connections = configStore.getConnections();
      const selectedConnections = connections.filter(c => config.connectionIds.includes(c.id));

      if (selectedConnections.length === 0) {
        return false;
      }

      const baseResultPath = config.resultPath || configStore.getResultPath();
      FileManager.ensureDir(baseResultPath);

      // Copy report template libs (CSS/JS/Fonts) so relative paths work in preview
      const firstConn = selectedConnections[0];
      if (firstConn) {
        const srcLibsDir = FileManager.getReportTemplateLibsDir(firstConn.dbType);
        const destLibsDir = path.join(baseResultPath, 'report_template', 'libs');
        FileManager.copyDirectory(srcLibsDir, destLibsDir);
      }

      const mainWindow = BrowserWindow.getFocusedWindow();
      const isDebug = config.debug === true;

      // Register real-time debug callback on PythonBridge
      if (isDebug) {
        pythonBridge.onDebugLine((line: string) => {
          const progress: InspectionProgress = {
            connectionId: '',
            description: '',
            currentIndex: 0,
            total: 0,
            currentScript: line,
            status: 'running',
            debugInfo: line,
          };
          mainWindow?.webContents.send(IPC_CHANNELS.INSPECTION_PROGRESS, progress);
        });
      }

      try {
        // Process inspections one by one
        for (let i = 0; i < selectedConnections.length; i++) {
          if (currentInspectionCancelled) break;

          const conn = selectedConnections[i];
          const progress: InspectionProgress = {
            connectionId: conn.id,
            description: conn.description,
            currentIndex: i + 1,
            total: selectedConnections.length,
            currentScript: '',
            status: 'running',
          };

          mainWindow?.webContents.send(IPC_CHANNELS.INSPECTION_PROGRESS, progress);

          try {
            // Save reports in dbType-specific subfolder
            const dbResultPath = path.join(baseResultPath, conn.dbType);
            FileManager.ensureDir(dbResultPath);

            // Start inspection on Python side (2-hour timeout for large SQL sets)
            const result = await pythonBridge.call('inspection.execute', {
              connectionId: conn.id,
              dbType: conn.dbType,
              host: conn.host,
              port: conn.port,
              username: conn.username,
              password: conn.password,
              database: conn.database,
              description: conn.description,
              resultPath: dbResultPath,
              sqlScriptsDir: config.sqlScriptsDir || FileManager.getSqlScriptsDir(conn.dbType),
              reportTemplatePath: FileManager.getReportTemplatePath(conn.dbType),
              reportTemplateLibsDir: FileManager.getReportTemplateLibsDir(conn.dbType),
              queryTimeout: config.queryTimeout,
              debug: isDebug,
            }, 7200000) as InspectionResult; // 2 hours for large SQL sets

            mainWindow?.webContents.send(IPC_CHANNELS.INSPECTION_RESULT, result);
          } catch (err) {
            const errorResult: InspectionResult = {
              connectionId: conn.id,
              description: conn.description,
              dbType: conn.dbType,
              success: false,
              error: (err as Error).message,
              completedAt: new Date().toISOString(),
              results: [],
            };
            mainWindow?.webContents.send(IPC_CHANNELS.INSPECTION_RESULT, errorResult);
          }
        }
      } finally {
        // Always clean up debug callback
        pythonBridge.onDebugLine(null);
      }

      return true;
    } catch (err) {
      console.error('[Inspection IPC] Error:', err);
      return false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.INSPECTION_CANCEL, () => {
    currentInspectionCancelled = true;
    return true;
  });
}
