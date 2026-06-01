import type { PluginManifest } from '@shared/types';

export const APP_NAME = 'DB Inspector';
export const APP_VERSION = '1.0.0';

export const DEFAULT_RESULT_PATH = 'inspection_results';
export const DEFAULT_QUERY_TIMEOUT = 300; // seconds
export const PYTHON_BRIDGE_TIMEOUT = 30000; // ms
export const PYTHON_STARTUP_TIMEOUT = 10000; // ms

export const SUPPORTED_DB_TYPES = ['mysql', 'oracle', 'sqlserver', 'tidb', 'starrocks'] as const;
export type DBType = (typeof SUPPORTED_DB_TYPES)[number];

export const DB_TYPE_LABELS: Record<DBType, string> = {
  mysql: 'MySQL',
  oracle: 'Oracle',
  sqlserver: 'SQL Server',
  tidb: 'TiDB',
  starrocks: 'StarRocks',
};

export const DB_TYPE_ICONS: Record<DBType, string> = {
  mysql: 'database',
  oracle: 'database-zap',
  sqlserver: 'server',
  tidb: 'database',
  starrocks: 'database',
};

export const PLUGIN_MANIFEST_PATH = 'plugins';

export const RESOURCES_BASE_PATH = 'resources/dbinspection';

export const CONNECTION_ENCRYPTION_KEY_FILE = 'encryption_key.key';
export const CONNECTION_STORE_FILE = 'connections.enc';
export const CONFIG_STORE_FILE = 'db_inspector_config.json';
export const AI_CONFIG_STORE_FILE = 'db_inspector_ai_config.json';
