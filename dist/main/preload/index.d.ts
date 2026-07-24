import type { ConnectionConfig, ConnectionTestResult, InspectionConfig, InspectionProgress, InspectionResult, InspectionResultItem, ReportMeta, ReportFilter, AIConfig, AIAnalysisResult, AppConfig, PluginManifest } from '../shared/types';
declare const electronAPI: {
    listConnections: () => Promise<ConnectionConfig[]>;
    addConnection: (config: ConnectionConfig) => Promise<{
        success: boolean;
        message: string;
        serverInfo?: string;
    }>;
    deleteConnections: (ids: string[]) => Promise<{
        success: boolean;
        message: string;
    }>;
    updateConnection: (config: ConnectionConfig) => Promise<{
        success: boolean;
        message: string;
    }>;
    testConnection: (config: ConnectionConfig) => Promise<ConnectionTestResult>;
    startInspection: (config: InspectionConfig) => Promise<boolean>;
    cancelInspection: () => Promise<boolean>;
    onInspectionProgress: (callback: (progress: InspectionProgress) => void) => (() => void);
    onInspectionResult: (callback: (result: InspectionResult) => void) => (() => void);
    onInspectionResultItem: (callback: (item: InspectionResultItem) => void) => (() => void);
    listReports: (filter?: ReportFilter) => Promise<ReportMeta[]>;
    deleteReports: (ids: string[]) => Promise<{
        success: boolean;
        message: string;
    }>;
    readReport: (filePath: string) => Promise<string>;
    exportReportPdf: (filePath: string) => Promise<{
        success: boolean;
        outputPath?: string;
    }>;
    compareReports: (path1: string, path2: string) => Promise<string>;
    fetchReportMeta: (dbPath: string) => Promise<Record<string, string> | null>;
    fetchReportResults: (dbPath: string) => Promise<unknown[]>;
    renderReportHtml: (dbPath: string) => Promise<string>;
    getPreviewUrl: (dbPath: string) => Promise<string>;
    exportReportHtml: (dbPath: string) => Promise<{
        success: boolean;
        outputPath?: string;
        error?: string;
    }>;
    getResultsByIndices: (dbPath: string, indices: number[]) => Promise<unknown[]>;
    loadConfig: () => Promise<AppConfig>;
    saveConfig: (config: Partial<AppConfig>) => Promise<boolean>;
    analyzeWithAI: (reportPath: string, aiConfig: AIConfig) => Promise<AIAnalysisResult>;
    analyzeText: (text: string, aiConfig: AIConfig) => Promise<AIAnalysisResult>;
    loadAIConfig: () => Promise<AIConfig>;
    saveAIConfig: (config: AIConfig) => Promise<boolean>;
    fetchAIModels: (config: AIConfig) => Promise<string[]>;
    aiCacheGet: (key: string) => Promise<string | null>;
    aiCacheSet: (key: string, value: string) => Promise<void>;
    listPlugins: () => Promise<PluginManifest[]>;
    getPlugin: (id: string) => Promise<PluginManifest | null>;
    selectDirectory: () => Promise<string | null>;
    selectFile: (filters?: {
        name: string;
        extensions: string[];
    }[]) => Promise<string | null>;
    getPythonStatus: () => Promise<{
        running: boolean;
        pid?: number;
    }>;
    restartPython: () => Promise<boolean>;
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;
    isMaximized: () => Promise<boolean>;
    onWindowMaximizedChange: (callback: (maximized: boolean) => void) => (() => void);
};
export type ElectronAPI = typeof electronAPI;
export {};
