"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electronAPI = {
    // Connection operations
    listConnections: () => electron_1.ipcRenderer.invoke('connection:list'),
    addConnection: (config) => electron_1.ipcRenderer.invoke('connection:add', config),
    deleteConnections: (ids) => electron_1.ipcRenderer.invoke('connection:delete', ids),
    updateConnection: (config) => electron_1.ipcRenderer.invoke('connection:update', config),
    testConnection: (config) => electron_1.ipcRenderer.invoke('connection:test', config),
    // Inspection operations
    startInspection: (config) => electron_1.ipcRenderer.invoke('inspection:start', config),
    cancelInspection: () => electron_1.ipcRenderer.invoke('inspection:cancel'),
    // Inspection events (main -> renderer)
    onInspectionProgress: (callback) => {
        const handler = (_event, progress) => callback(progress);
        electron_1.ipcRenderer.on('inspection:progress', handler);
        return () => electron_1.ipcRenderer.removeListener('inspection:progress', handler);
    },
    onInspectionResult: (callback) => {
        const handler = (_event, result) => callback(result);
        electron_1.ipcRenderer.on('inspection:result', handler);
        return () => electron_1.ipcRenderer.removeListener('inspection:result', handler);
    },
    onInspectionResultItem: (callback) => {
        const handler = (_event, item) => callback(item);
        electron_1.ipcRenderer.on('inspection:result-item', handler);
        return () => electron_1.ipcRenderer.removeListener('inspection:result-item', handler);
    },
    // Report operations
    listReports: (filter) => electron_1.ipcRenderer.invoke('report:list', filter),
    deleteReports: (ids) => electron_1.ipcRenderer.invoke('report:delete', ids),
    readReport: (filePath) => electron_1.ipcRenderer.invoke('report:read', filePath),
    exportReportPdf: (filePath) => electron_1.ipcRenderer.invoke('report:export-pdf', filePath),
    compareReports: (path1, path2) => electron_1.ipcRenderer.invoke('report:compare', path1, path2),
    fetchReportMeta: (dbPath) => electron_1.ipcRenderer.invoke('report:read-db-meta', dbPath),
    fetchReportResults: (dbPath) => electron_1.ipcRenderer.invoke('report:read-db-results', dbPath),
    renderReportHtml: (dbPath) => electron_1.ipcRenderer.invoke('report:render-db-to-html', dbPath),
    getPreviewUrl: (dbPath) => electron_1.ipcRenderer.invoke('report:get-preview-url', dbPath),
    exportReportHtml: (dbPath) => electron_1.ipcRenderer.invoke('report:export-db-to-html', dbPath),
    getResultsByIndices: (dbPath, indices) => electron_1.ipcRenderer.invoke('report:get-results-by-indices', dbPath, indices),
    // Config operations
    loadConfig: () => electron_1.ipcRenderer.invoke('config:load'),
    saveConfig: (config) => electron_1.ipcRenderer.invoke('config:save', config),
    // AI operations
    analyzeWithAI: (reportPath, aiConfig) => electron_1.ipcRenderer.invoke('ai:analyze', reportPath, aiConfig),
    analyzeText: (text, aiConfig) => electron_1.ipcRenderer.invoke('ai:analyze-text', text, aiConfig),
    loadAIConfig: () => electron_1.ipcRenderer.invoke('ai:config-load'),
    saveAIConfig: (config) => electron_1.ipcRenderer.invoke('ai:config-save', config),
    fetchAIModels: (config) => electron_1.ipcRenderer.invoke('ai:fetch-models', config),
    aiCacheGet: (key) => electron_1.ipcRenderer.invoke('ai:cache-get', key),
    aiCacheSet: (key, value) => electron_1.ipcRenderer.invoke('ai:cache-set', key, value),
    // Plugin operations
    listPlugins: () => electron_1.ipcRenderer.invoke('plugin:list'),
    getPlugin: (id) => electron_1.ipcRenderer.invoke('plugin:get', id),
    // Dialog operations
    selectDirectory: () => electron_1.ipcRenderer.invoke('dialog:select-dir'),
    selectFile: (filters) => electron_1.ipcRenderer.invoke('dialog:select-file', filters),
    // Python bridge
    getPythonStatus: () => electron_1.ipcRenderer.invoke('python:status'),
    restartPython: () => electron_1.ipcRenderer.invoke('python:restart'),
    // Window controls
    minimizeWindow: () => {
        electron_1.ipcRenderer.send('window:minimize');
    },
    maximizeWindow: () => {
        electron_1.ipcRenderer.send('window:maximize');
    },
    closeWindow: () => {
        electron_1.ipcRenderer.send('window:close');
    },
    isMaximized: () => electron_1.ipcRenderer.invoke('window:is-maximized'),
    onWindowMaximizedChange: (callback) => {
        const handler = (_event, maximized) => callback(maximized);
        electron_1.ipcRenderer.on('window:maximized-change', handler);
        return () => electron_1.ipcRenderer.removeListener('window:maximized-change', handler);
    },
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
//# sourceMappingURL=index.js.map