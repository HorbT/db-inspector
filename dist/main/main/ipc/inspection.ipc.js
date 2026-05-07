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
            // Register real-time debug callback on PythonBridge
            if (isDebug) {
                pythonBridge.onDebugLine((line) => {
                    const progress = {
                        connectionId: '',
                        description: '',
                        currentIndex: 0,
                        total: 0,
                        currentScript: line,
                        status: 'running',
                        debugInfo: line,
                    };
                    mainWindow?.webContents.send(types_1.IPC_CHANNELS.INSPECTION_PROGRESS, progress);
                });
            }
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
                        // Save reports in dbType-specific subfolder
                        const dbResultPath = path_1.default.join(baseResultPath, conn.dbType);
                        file_manager_1.FileManager.ensureDir(dbResultPath);
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
                        }, 7200000); // 2 hours for large SQL sets
                        mainWindow?.webContents.send(types_1.IPC_CHANNELS.INSPECTION_RESULT, result);
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
                // Always clean up debug callback
                pythonBridge.onDebugLine(null);
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