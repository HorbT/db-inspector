export interface PluginField {
    name: string;
    label: string;
    type: 'text' | 'password' | 'number';
    defaultValue: string;
    required: boolean;
    tooltip: string;
    placeholder?: string;
}
export interface PluginManifest {
    id: string;
    name: string;
    description: string;
    icon: string;
    defaultPort: number;
    fields: PluginField[];
    supportedFeatures: string[];
}
export interface ConnectionConfig {
    id: string;
    dbType: string;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    description: string;
    createdAt: string;
    updatedAt: string;
}
export interface ConnectionTestResult {
    success: boolean;
    message: string;
    serverInfo?: string;
    error?: string;
}
export type InspectionStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
export interface InspectionConfig {
    connectionIds: string[];
    dbType: string;
    resultPath: string;
    sqlScriptsDir: string;
    queryTimeout: number;
    debug?: boolean;
}
export interface QueryResult {
    fileName: string;
    columns?: string[];
    rows?: (string | number | null)[][];
    rowCount?: number;
    error?: string;
}
export interface InspectionProgress {
    connectionId: string;
    description: string;
    currentIndex: number;
    total: number;
    currentScript: string;
    status: InspectionStatus;
    error?: string;
    debugInfo?: string;
}
export interface InspectionResult {
    connectionId: string;
    description: string;
    dbType: string;
    success: boolean;
    reportPath?: string;
    dbPath?: string;
    error?: string;
    completedAt: string;
    results: QueryResult[];
    serverInfo?: string;
    total?: number;
    errorCount?: number;
}
export interface InspectionResultItem {
    connectionId: string;
    fileNum: number;
    fileName: string;
    section?: string;
    columns?: string[];
    rows?: (string | number | null)[][];
    rowCount?: number;
    error?: string;
}
export interface ReportMeta {
    id: string;
    fileName: string;
    filePath: string;
    dbType: string;
    description: string;
    createdAt: string;
    fileSize: number;
    dbId?: string;
}
export interface ReportFilter {
    dbType?: string;
    keyword?: string;
    dateFrom?: string;
    dateTo?: string;
}
export type AIProvider = 'openai' | 'gemini';
export interface AIConfig {
    provider: AIProvider;
    apiKey: string;
    apiBase: string;
    modelName: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
}
export interface AIAnalysisResult {
    success: boolean;
    content?: string;
    error?: string;
    modelUsed?: string;
    tokensUsed?: number;
}
export interface AppConfig {
    resultPath: string;
    queryTimeout: number;
    theme: 'light' | 'dark' | 'system';
    language: string;
    pythonPath?: string;
}
export declare const IPC_CHANNELS: {
    readonly CONNECTION_LIST: "connection:list";
    readonly CONNECTION_ADD: "connection:add";
    readonly CONNECTION_DELETE: "connection:delete";
    readonly CONNECTION_UPDATE: "connection:update";
    readonly CONNECTION_TEST: "connection:test";
    readonly CONNECTION_IMPORT: "connection:import";
    readonly CONNECTION_EXPORT: "connection:export";
    readonly INSPECTION_START: "inspection:start";
    readonly INSPECTION_CANCEL: "inspection:cancel";
    readonly INSPECTION_PROGRESS: "inspection:progress";
    readonly INSPECTION_RESULT: "inspection:result";
    readonly INSPECTION_RESULT_ITEM: "inspection:result-item";
    readonly REPORT_LIST: "report:list";
    readonly REPORT_DELETE: "report:delete";
    readonly REPORT_READ: "report:read";
    readonly REPORT_EXPORT_PDF: "report:export-pdf";
    readonly REPORT_COMPARE: "report:compare";
    readonly REPORT_SEARCH: "report:search";
    readonly CONFIG_LOAD: "config:load";
    readonly CONFIG_SAVE: "config:save";
    readonly CONFIG_GET_RESULT_PATH: "config:get-result-path";
    readonly AI_ANALYZE: "ai:analyze";
    readonly AI_CONFIG_LOAD: "ai:config-load";
    readonly AI_CONFIG_SAVE: "ai:config-save";
    readonly AI_FETCH_MODELS: "ai:fetch-models";
    readonly PLUGIN_LIST: "plugin:list";
    readonly PLUGIN_GET: "plugin:get";
    readonly PYTHON_STATUS: "python:status";
    readonly PYTHON_RESTART: "python:restart";
    readonly DIALOG_SELECT_DIR: "dialog:select-dir";
    readonly DIALOG_SELECT_FILE: "dialog:select-file";
};
export interface JsonRpcRequest {
    jsonrpc: '2.0';
    id: number;
    method: string;
    params: Record<string, unknown>;
}
export interface JsonRpcResponse {
    jsonrpc: '2.0';
    id: number;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}
