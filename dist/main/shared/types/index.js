"use strict";
// Shared type definitions for the DB Inspector application
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC_CHANNELS = void 0;
// ==================== IPC Channel Names ====================
exports.IPC_CHANNELS = {
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
};
//# sourceMappingURL=index.js.map