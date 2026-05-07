"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_CONFIG_STORE_FILE = exports.CONFIG_STORE_FILE = exports.CONNECTION_STORE_FILE = exports.CONNECTION_ENCRYPTION_KEY_FILE = exports.RESOURCES_BASE_PATH = exports.PLUGIN_MANIFEST_PATH = exports.DB_TYPE_ICONS = exports.DB_TYPE_LABELS = exports.SUPPORTED_DB_TYPES = exports.PYTHON_STARTUP_TIMEOUT = exports.PYTHON_BRIDGE_TIMEOUT = exports.DEFAULT_QUERY_TIMEOUT = exports.DEFAULT_RESULT_PATH = exports.APP_VERSION = exports.APP_NAME = void 0;
exports.APP_NAME = 'DB Inspector';
exports.APP_VERSION = '1.0.0';
exports.DEFAULT_RESULT_PATH = 'inspection_results';
exports.DEFAULT_QUERY_TIMEOUT = 300; // seconds
exports.PYTHON_BRIDGE_TIMEOUT = 30000; // ms
exports.PYTHON_STARTUP_TIMEOUT = 10000; // ms
exports.SUPPORTED_DB_TYPES = ['mysql', 'oracle', 'sqlserver', 'tidb'];
exports.DB_TYPE_LABELS = {
    mysql: 'MySQL',
    oracle: 'Oracle',
    sqlserver: 'SQL Server',
    tidb: 'TiDB',
};
exports.DB_TYPE_ICONS = {
    mysql: 'database',
    oracle: 'database-zap',
    sqlserver: 'server',
    tidb: 'database',
};
exports.PLUGIN_MANIFEST_PATH = 'plugins';
exports.RESOURCES_BASE_PATH = 'resources/dbinspection';
exports.CONNECTION_ENCRYPTION_KEY_FILE = 'encryption_key.key';
exports.CONNECTION_STORE_FILE = 'connections.enc';
exports.CONFIG_STORE_FILE = 'db_inspector_config.json';
exports.AI_CONFIG_STORE_FILE = 'db_inspector_ai_config.json';
//# sourceMappingURL=constants.js.map