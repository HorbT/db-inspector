"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerConnectionHandlers = registerConnectionHandlers;
const electron_1 = require("electron");
const types_1 = require("../../shared/types");
const python_bridge_1 = require("../services/python-bridge");
function registerConnectionHandlers(configStore) {
    const pythonBridge = python_bridge_1.PythonBridge.getInstance();
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CONNECTION_LIST, () => {
        return configStore.getConnections();
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CONNECTION_ADD, async (_event, config) => {
        try {
            // First test the connection via Python bridge
            const result = await pythonBridge.call('connection.test', {
                dbType: config.dbType,
                host: config.host,
                port: config.port,
                username: config.username,
                password: config.password,
                database: config.database,
            });
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
        }
        catch (err) {
            return { success: false, message: `连接错误: ${err.message}` };
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CONNECTION_DELETE, (_event, ids) => {
        try {
            configStore.deleteConnections(ids);
            return { success: true, message: `已删除 ${ids.length} 个连接` };
        }
        catch (err) {
            return { success: false, message: `删除失败: ${err.message}` };
        }
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CONNECTION_UPDATE, (_event, config) => {
        const success = configStore.updateConnection(config);
        return { success, message: success ? '更新成功' : '未找到该连接' };
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.CONNECTION_TEST, async (_event, config) => {
        try {
            const result = await pythonBridge.call('connection.test', {
                dbType: config.dbType,
                host: config.host,
                port: config.port,
                username: config.username,
                password: config.password,
                database: config.database,
            });
            return result;
        }
        catch (err) {
            return { success: false, message: `连接测试失败: ${err.message}` };
        }
    });
}
//# sourceMappingURL=connection.ipc.js.map