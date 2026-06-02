import { ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import { IPC_CHANNELS } from '@shared/types';
import type { InspectionConfig, InspectionProgress, InspectionResult, InspectionResultItem } from '@shared/types';
import type { ConfigStore } from '../services/config-store';
import { PythonBridge } from '../services/python-bridge';
import { FileManager } from '../services/file-manager';
import { ReportDB } from '../services/report-db';
import { LgwrBuffer } from '../services/lgwr-buffer';

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
            // Create db-specific result directory and SQLite database
            const dbResultPath = path.join(baseResultPath, conn.dbType);
            FileManager.ensureDir(dbResultPath);

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const dbFileName = `${conn.description}_${timestamp}.db`;
            const dbPath = path.join(dbResultPath, dbFileName);

            const reportDB = new ReportDB(dbPath);
            const lgwr = new LgwrBuffer(reportDB);

            // Store meta info
            await reportDB.setMetaBatch([
              { key: 'db_type', value: conn.dbType },
              { key: 'description', value: conn.description },
              { key: 'generated_time', value: new Date().toLocaleString('zh-CN') },
              { key: 'db_name', value: conn.database || '' },
              { key: 'host', value: conn.host },
              { key: 'port', value: String(conn.port) },
            ]);

            // Register callbacks for real-time events from Python stderr
            pythonBridge.onInspectionEvent({
              debug: isDebug
                ? (line: string) => {
                    const dp: InspectionProgress = {
                      connectionId: conn.id,
                      description: conn.description,
                      currentIndex: i + 1,
                      total: selectedConnections.length,
                      currentScript: line,
                      status: 'running',
                      debugInfo: line,
                    };
                    mainWindow?.webContents.send(IPC_CHANNELS.INSPECTION_PROGRESS, dp);
                  }
                : null,
              result: (payload: Record<string, unknown>) => {
                const item: InspectionResultItem = {
                  connectionId: conn.id,
                  fileNum: payload.fileNum as number,
                  fileName: payload.fileName as string,
                  section: (payload.section as string) || '',
                  columns: payload.columns as string[] | undefined,
                  rows: payload.rows as (string | number | null)[][] | undefined,
                  rowCount: payload.rowCount as number | undefined,
                  error: payload.error as string | undefined,
                };
                // Write to SQLite for persistence (fire-and-forget, don't block)
                lgwr.push({
                  fileNum: item.fileNum,
                  fileName: item.fileName,
                  section: item.section,
                  columns: item.columns,
                  rows: item.rows,
                  error: item.error,
                }).catch(err => console.error('[Inspection IPC] LgwrBuffer push error:', err));
                // Send to renderer for real-time display
                mainWindow?.webContents.send(IPC_CHANNELS.INSPECTION_RESULT_ITEM, item);
              },
              complete: (payload: Record<string, unknown>) => {
                const status = (payload.status as string) === 'completed' ? 'completed' : 'failed';
                lgwr.finalize(status as 'completed' | 'failed', payload.total as number)
                  .catch(err => console.error('[Inspection IPC] LgwrBuffer finalize error:', err));
              },
            });

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
            }, 7200000) as {
              success: boolean;
              serverInfo?: string;
              error?: string;
              total?: number;
              errorCount?: number;
              reportPath?: string;
            };

            // Store server info if available
            if (result.serverInfo) {
              await reportDB.setMeta('server_info', result.serverInfo);
            }

            await lgwr.finalize(result.success ? 'completed' : 'failed');
            await reportDB.close();

            const inspectionResult: InspectionResult = {
              connectionId: conn.id,
              description: conn.description,
              dbType: conn.dbType,
              success: result.success,
              dbPath,
              error: result.error,
              completedAt: new Date().toISOString(),
              results: [],
              serverInfo: result.serverInfo,
              total: result.total,
              errorCount: result.errorCount,
            };

            mainWindow?.webContents.send(IPC_CHANNELS.INSPECTION_RESULT, inspectionResult);
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
        // Always clean up callbacks
        pythonBridge.onInspectionEvent(null);
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