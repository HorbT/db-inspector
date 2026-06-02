import { contextBridge, ipcRenderer } from 'electron';
import type {
  ConnectionConfig, ConnectionTestResult, InspectionConfig,
  InspectionProgress, InspectionResult, InspectionResultItem, ReportMeta, ReportFilter,
  AIConfig, AIAnalysisResult, AppConfig, PluginManifest
} from '@shared/types';

const electronAPI = {
  // Connection operations
  listConnections: (): Promise<ConnectionConfig[]> =>
    ipcRenderer.invoke('connection:list'),
  addConnection: (config: ConnectionConfig): Promise<{ success: boolean; message: string; serverInfo?: string }> =>
    ipcRenderer.invoke('connection:add', config),
  deleteConnections: (ids: string[]): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('connection:delete', ids),
  updateConnection: (config: ConnectionConfig): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('connection:update', config),
  testConnection: (config: ConnectionConfig): Promise<ConnectionTestResult> =>
    ipcRenderer.invoke('connection:test', config),

  // Inspection operations
  startInspection: (config: InspectionConfig): Promise<boolean> =>
    ipcRenderer.invoke('inspection:start', config),
  cancelInspection: (): Promise<boolean> =>
    ipcRenderer.invoke('inspection:cancel'),

  // Inspection events (main -> renderer)
  onInspectionProgress: (callback: (progress: InspectionProgress) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: InspectionProgress) => callback(progress);
    ipcRenderer.on('inspection:progress', handler);
    return () => ipcRenderer.removeListener('inspection:progress', handler);
  },
  onInspectionResult: (callback: (result: InspectionResult) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, result: InspectionResult) => callback(result);
    ipcRenderer.on('inspection:result', handler);
    return () => ipcRenderer.removeListener('inspection:result', handler);
  },
  onInspectionResultItem: (callback: (item: InspectionResultItem) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, item: InspectionResultItem) => callback(item);
    ipcRenderer.on('inspection:result-item', handler);
    return () => ipcRenderer.removeListener('inspection:result-item', handler);
  },

  // Report operations
  listReports: (filter?: ReportFilter): Promise<ReportMeta[]> =>
    ipcRenderer.invoke('report:list', filter),
  deleteReports: (ids: string[]): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('report:delete', ids),
  readReport: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('report:read', filePath),
  exportReportPdf: (filePath: string): Promise<{ success: boolean; outputPath?: string }> =>
    ipcRenderer.invoke('report:export-pdf', filePath),
  compareReports: (path1: string, path2: string): Promise<string> =>
    ipcRenderer.invoke('report:compare', path1, path2),
  fetchReportMeta: (dbPath: string): Promise<Record<string, string> | null> =>
    ipcRenderer.invoke('report:read-db-meta', dbPath),
  fetchReportResults: (dbPath: string): Promise<unknown[]> =>
    ipcRenderer.invoke('report:read-db-results', dbPath),
  renderReportHtml: (dbPath: string): Promise<string> =>
    ipcRenderer.invoke('report:render-db-to-html', dbPath),
  exportReportHtml: (dbPath: string): Promise<{ success: boolean; outputPath?: string; error?: string }> =>
    ipcRenderer.invoke('report:export-db-to-html', dbPath),

  // Config operations
  loadConfig: (): Promise<AppConfig> =>
    ipcRenderer.invoke('config:load'),
  saveConfig: (config: Partial<AppConfig>): Promise<boolean> =>
    ipcRenderer.invoke('config:save', config),

  // AI operations
  analyzeWithAI: (reportPath: string, aiConfig: AIConfig): Promise<AIAnalysisResult> =>
    ipcRenderer.invoke('ai:analyze', reportPath, aiConfig),
  loadAIConfig: (): Promise<AIConfig> =>
    ipcRenderer.invoke('ai:config-load'),
  saveAIConfig: (config: AIConfig): Promise<boolean> =>
    ipcRenderer.invoke('ai:config-save', config),
  fetchAIModels: (config: AIConfig): Promise<string[]> =>
    ipcRenderer.invoke('ai:fetch-models', config),

  // Plugin operations
  listPlugins: (): Promise<PluginManifest[]> =>
    ipcRenderer.invoke('plugin:list'),
  getPlugin: (id: string): Promise<PluginManifest | null> =>
    ipcRenderer.invoke('plugin:get', id),

  // Dialog operations
  selectDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:select-dir'),
  selectFile: (filters?: { name: string; extensions: string[] }[]): Promise<string | null> =>
    ipcRenderer.invoke('dialog:select-file', filters),

  // Python bridge
  getPythonStatus: (): Promise<{ running: boolean; pid?: number }> =>
    ipcRenderer.invoke('python:status'),
  restartPython: (): Promise<boolean> =>
    ipcRenderer.invoke('python:restart'),

  // Window controls
  minimizeWindow: (): void => {
    ipcRenderer.send('window:minimize');
  },
  maximizeWindow: (): void => {
    ipcRenderer.send('window:maximize');
  },
  closeWindow: (): void => {
    ipcRenderer.send('window:close');
  },
  isMaximized: (): Promise<boolean> =>
    ipcRenderer.invoke('window:is-maximized'),
  onWindowMaximizedChange: (callback: (maximized: boolean) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, maximized: boolean) => callback(maximized);
    ipcRenderer.on('window:maximized-change', handler);
    return () => ipcRenderer.removeListener('window:maximized-change', handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
