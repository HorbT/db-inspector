import type { ConnectionConfig, PluginField } from './types';
export declare function validateConnection(config: Partial<ConnectionConfig>, fields: PluginField[]): string | null;
export declare function generateConnectionId(): string;
export declare function generateReportId(): string;
export declare function isValidPort(port: unknown): port is number;
export declare function formatFileSize(bytes: number): string;
