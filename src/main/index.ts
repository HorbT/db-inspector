import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { registerAllIpcHandlers, notifyWindowMaximizedChange } from './ipc';
import { PythonBridge } from './services/python-bridge';
import { ConfigStore } from './services/config-store';

let mainWindow: BrowserWindow | null = null;
let pythonBridge: PythonBridge | null = null;

const isDev = !app.isPackaged;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
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
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  // Notify renderer when window maximize state changes
  mainWindow.on('maximize', () => notifyWindowMaximizedChange(true));
  mainWindow.on('unmaximize', () => notifyWindowMaximizedChange(false));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initializeApp(): Promise<void> {
  // Initialize config store
  const configStore = ConfigStore.getInstance();

  // Initialize Python bridge
  pythonBridge = PythonBridge.getInstance();
  try {
    await pythonBridge.start();
    console.log('[Main] Python bridge started successfully');
  } catch (err) {
    console.error('[Main] Failed to start Python bridge:', err);
  }

  // Register IPC handlers
  registerAllIpcHandlers();

  // Create the main window
  createWindow();
}

app.whenReady().then(initializeApp);

app.on('window-all-closed', () => {
  if (pythonBridge) {
    pythonBridge.stop();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (pythonBridge) {
    pythonBridge.stop();
  }
});
