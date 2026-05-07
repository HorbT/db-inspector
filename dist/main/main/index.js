"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const ipc_1 = require("./ipc");
const python_bridge_1 = require("./services/python-bridge");
const config_store_1 = require("./services/config-store");
let mainWindow = null;
let pythonBridge = null;
const isDev = !electron_1.app.isPackaged;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1100,
        minHeight: 700,
        frame: false,
        titleBarStyle: 'hidden',
        backgroundColor: '#0f172a',
        webPreferences: {
            preload: path_1.default.join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
        show: false,
    });
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    // Open external links in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../../renderer/index.html'));
    }
    // Notify renderer when window maximize state changes
    mainWindow.on('maximize', () => (0, ipc_1.notifyWindowMaximizedChange)(true));
    mainWindow.on('unmaximize', () => (0, ipc_1.notifyWindowMaximizedChange)(false));
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
async function initializeApp() {
    // Initialize config store
    const configStore = config_store_1.ConfigStore.getInstance();
    // Initialize Python bridge
    pythonBridge = python_bridge_1.PythonBridge.getInstance();
    try {
        await pythonBridge.start();
        console.log('[Main] Python bridge started successfully');
    }
    catch (err) {
        console.error('[Main] Failed to start Python bridge:', err);
    }
    // Register IPC handlers
    (0, ipc_1.registerAllIpcHandlers)();
    // Create the main window
    createWindow();
}
electron_1.app.whenReady().then(initializeApp);
electron_1.app.on('window-all-closed', () => {
    if (pythonBridge) {
        pythonBridge.stop();
    }
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
electron_1.app.on('before-quit', () => {
    if (pythonBridge) {
        pythonBridge.stop();
    }
});
//# sourceMappingURL=index.js.map