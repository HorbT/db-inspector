"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerInspectionHandlers = registerInspectionHandlers;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const types_1 = require("../../shared/types");
const python_bridge_1 = require("../services/python-bridge");
const file_manager_1 = require("../services/file-manager");
const report_db_1 = require("../services/report-db");
const lgwr_buffer_1 = require("../services/lgwr-buffer");
let currentInspectionCancelled = false;
function registerInspectionHandlers(configStore) {
    const pythonBridge = python_bridge_1.PythonBridge.getInstance();
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.INSPECTION_START, async (_event, config) => {
        try {
            currentInspectionCancelled = false;
            const connections = configStore.getConnections();
            const selectedConnections = connections.filter(c => config.connectionIds.includes(c.id));
            if (selectedConnections.length === 0) {
                return false;
            }
            const baseResultPath = config.resultPath || configStore.getResultPath();
            file_manager_1.FileManager.ensureDir(baseResultPath);
            // Copy report template libs (CSS/JS/Fonts) so relative paths work in preview
            const firstConn = selectedConnections[0];
            if (firstConn) {
                const srcLibsDir = file_manager_1.FileManager.getReportTemplateLibsDir(firstConn.dbType);
                const destLibsDir = path_1.default.join(baseResultPath, 'report_template', 'libs');
                file_manager_1.FileManager.copyDirectory(srcLibsDir, destLibsDir);
            }
            const mainWindow = electron_1.BrowserWindow.getFocusedWindow();
            const isDebug = config.debug === true;
            try {
                // Process inspections one by one
                for (let i = 0; i < selectedConnections.length; i++) {
                    if (currentInspectionCancelled)
                        break;
                    const conn = selectedConnections[i];
                    const progress = {
                        connectionId: conn.id,
                        description: conn.description,
                        currentIndex: i + 1,
                        total: selectedConnections.length,
                        currentScript: '',
                        status: 'running',
                    };
                    mainWindow?.webContents.send(types_1.IPC_CHANNELS.INSPECTION_PROGRESS, progress);
                    try {
                        // Create db-specific result directory and SQLite database
                        const dbResultPath = path_1.default.join(baseResultPath, conn.dbType);
                        file_manager_1.FileManager.ensureDir(dbResultPath);
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                        const dbFileName = `${conn.description}_${timestamp}.db`;
                        const dbPath = path_1.default.join(dbResultPath, dbFileName);
                        const reportDB = new report_db_1.ReportDB(dbPath);
                        const lgwr = new lgwr_buffer_1.LgwrBuffer(reportDB);
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
                                ? (line) => {
                                    const dp = {
                                        connectionId: conn.id,
                                        description: conn.description,
                                        currentIndex: i + 1,
                                        total: selectedConnections.length,
                                        currentScript: line,
                                        status: 'running',
                                        debugInfo: line,
                                    };
                                    mainWindow?.webContents.send(types_1.IPC_CHANNELS.INSPECTION_PROGRESS, dp);
                                }
                                : null,
                            result: (payload) => {
                                const item = {
                                    connectionId: conn.id,
                                    fileNum: payload.fileNum,
                                    fileName: payload.fileName,
                                    section: payload.section || '',
                                    columns: payload.columns,
                                    rows: payload.rows,
                                    rowCount: payload.rowCount,
                                    error: payload.error,
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
                                mainWindow?.webContents.send(types_1.IPC_CHANNELS.INSPECTION_RESULT_ITEM, item);
                            },
                            complete: (payload) => {
                                const status = payload.status === 'completed' ? 'completed' : 'failed';
                                lgwr.finalize(status, payload.total)
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
                            sqlScriptsDir: config.sqlScriptsDir || file_manager_1.FileManager.getSqlScriptsDir(conn.dbType),
                            reportTemplatePath: file_manager_1.FileManager.getReportTemplatePath(conn.dbType),
                            reportTemplateLibsDir: file_manager_1.FileManager.getReportTemplateLibsDir(conn.dbType),
                            queryTimeout: config.queryTimeout,
                            debug: isDebug,
                        }, 7200000);
                        // Store server info if available
                        if (result.serverInfo) {
                            await reportDB.setMeta('server_info', result.serverInfo);
                        }
                        await lgwr.finalize(result.success ? 'completed' : 'failed');
                        await reportDB.close();
                        const inspectionResult = {
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
                        mainWindow?.webContents.send(types_1.IPC_CHANNELS.INSPECTION_RESULT, inspectionResult);
                    }
                    catch (err) {
                        const errorResult = {
                            connectionId: conn.id,
                            description: conn.description,
                            dbType: conn.dbType,
                            success: false,
                            error: err.message,
                            completedAt: new Date().toISOString(),
                            results: [],
                        };
                        mainWindow?.webContents.send(types_1.IPC_CHANNELS.INSPECTION_RESULT, errorResult);
                    }
                }
            }
            finally {
                // Always clean up callbacks
                pythonBridge.onInspectionEvent(null);
            }
            return true;
        }
        catch (err) {
            console.error('[Inspection IPC] Error:', err);
            return false;
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.INSPECTION_CANCEL, () => {
        currentInspectionCancelled = true;
        return true;
    });
}
//# sourceMappingURL=inspection.ipc.js.map