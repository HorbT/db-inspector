// Shared type definitions for the DB Inspector application

// ==================== Plugin Types ====================

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

// ==================== Connection Types ====================

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

// ==================== Inspection Types ====================

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

// ==================== Report Types ====================

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

// ==================== AI Types ====================

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

// ==================== App Config Types ====================

export interface AppConfig {
  resultPath: string;
  queryTimeout: number;
  theme: 'light' | 'dark' | 'system';
  language: string;
  pythonPath?: string;
}

// ==================== IPC Channel Names ====================

export const IPC_CHANNELS = {
  // Connection channels
  CONNECTION_LIST: 'connection:list',
  CONNECTION_ADD: 'connection:add',
  CONNECTION_DELETE: 'connection:delete',
  CONNECTION_UPDATE: 'connection:update',
  CONNECTION_TEST: 'connection:test',
  CONNECTION_IMPORT: 'connection:import',
  CONNECTION_EXPORT: 'connection:export',

  // Inspection channels
  INSPECTION_START: 'inspection:start',
  INSPECTION_CANCEL: 'inspection:cancel',
  INSPECTION_PROGRESS: 'inspection:progress',
  INSPECTION_RESULT: 'inspection:result',
  INSPECTION_RESULT_ITEM: 'inspection:result-item',

  // Report channels
  REPORT_LIST: 'report:list',
  REPORT_DELETE: 'report:delete',
  REPORT_READ: 'report:read',
  REPORT_EXPORT_PDF: 'report:export-pdf',
  REPORT_COMPARE: 'report:compare',
  REPORT_SEARCH: 'report:search',

  // Config channels
  CONFIG_LOAD: 'config:load',
  CONFIG_SAVE: 'config:save',
  CONFIG_GET_RESULT_PATH: 'config:get-result-path',

  // AI channels
  AI_ANALYZE: 'ai:analyze',
  AI_CONFIG_LOAD: 'ai:config-load',
  AI_CONFIG_SAVE: 'ai:config-save',
  AI_FETCH_MODELS: 'ai:fetch-models',

  // Plugin channels
  PLUGIN_LIST: 'plugin:list',
  PLUGIN_GET: 'plugin:get',

  // Python bridge channels
  PYTHON_STATUS: 'python:status',
  PYTHON_RESTART: 'python:restart',

  // Dialog channels
  DIALOG_SELECT_DIR: 'dialog:select-dir',
  DIALOG_SELECT_FILE: 'dialog:select-file',
} as const;

// ==================== Python RPC Types ====================

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
