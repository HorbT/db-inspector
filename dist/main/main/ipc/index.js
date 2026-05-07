"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAllIpcHandlers = registerAllIpcHandlers;
exports.notifyWindowMaximizedChange = notifyWindowMaximizedChange;
const electron_1 = require("electron");
const types_1 = require("../../shared/types");
const config_store_1 = require("../services/config-store");
const plugin_registry_1 = require("../plugin-registry");
const connection_ipc_1 = require("./connection.ipc");
const inspection_ipc_1 = require("./inspection.ipc");
const report_ipc_1 = require("./report.ipc");
const config_ipc_1 = require("./config.ipc");
function registerAllIpcHandlers() {
    const configStore = config_store_1.ConfigStore.getInstance();
    // Initialize plugin registry
    plugin_registry_1.PluginRegistry.initialize();
    // Register module-specific handlers
    (0, connection_ipc_1.registerConnectionHandlers)(configStore);
    (0, inspection_ipc_1.registerInspectionHandlers)(configStore);
    (0, report_ipc_1.registerReportHandlers)(configStore);
    (0, config_ipc_1.registerConfigHandlers)(configStore);
    // Plugin handlers
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PLUGIN_LIST, () => {
        return plugin_registry_1.PluginRegistry.getAllPlugins();
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PLUGIN_GET, (_event, id) => {
        return plugin_registry_1.PluginRegistry.getPlugin(id);
    });
    // Dialog handlers
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.DIALOG_SELECT_DIR, async () => {
        const result = await electron_1.dialog.showOpenDialog({
            properties: ['openDirectory'],
        });
        return result.canceled ? null : result.filePaths[0];
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.DIALOG_SELECT_FILE, async (_event, filters) => {
        const result = await electron_1.dialog.showOpenDialog({
            properties: ['openFile'],
            filters,
        });
        return result.canceled ? null : result.filePaths[0];
    });
    // Python bridge status
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PYTHON_STATUS, () => {
        const { PythonBridge } = require('../services/python-bridge');
        return PythonBridge.getInstance().getStatus();
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.PYTHON_RESTART, async () => {
        const { PythonBridge } = require('../services/python-bridge');
        const bridge = PythonBridge.getInstance();
        bridge.stop();
        await bridge.start();
        return true;
    });
    // Window controls
    electron_1.ipcMain.on('window:minimize', () => {
        electron_1.BrowserWindow.getFocusedWindow()?.minimize();
    });
    electron_1.ipcMain.on('window:maximize', () => {
        const win = electron_1.BrowserWindow.getFocusedWindow();
        if (win?.isMaximized()) {
            win.unmaximize();
        }
        else {
            win?.maximize();
        }
    });
    electron_1.ipcMain.on('window:close', () => {
        electron_1.BrowserWindow.getFocusedWindow()?.close();
    });
    electron_1.ipcMain.handle('window:is-maximized', () => {
        return electron_1.BrowserWindow.getFocusedWindow()?.isMaximized() ?? false;
    });
    console.log('[IPC] All handlers registered');
}
function notifyWindowMaximizedChange(maximized) {
    electron_1.BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('window:maximized-change', maximized);
    });
}
//# sourceMappingURL=index.js.map