import type { AppConfig, AIConfig, ConnectionConfig } from '../../shared/types';
export declare class ConfigStore {
    private static instance;
    private userDataPath;
    private configPath;
    private aiConfigPath;
    private connectionsPath;
    private config;
    private aiConfig;
    private connections;
    private constructor();
    static getInstance(): ConfigStore;
    private ensureFile;
    private loadConfig;
    getConfig(): AppConfig;
    saveConfig(updates: Partial<AppConfig>): boolean;
    getResultPath(): string;
    private loadAIConfig;
    getAIConfig(): AIConfig;
    saveAIConfig(config: AIConfig): boolean;
    private loadConnections;
    getConnections(): ConnectionConfig[];
    getConnection(id: string): ConnectionConfig | undefined;
    addConnection(config: ConnectionConfig): void;
    deleteConnections(ids: string[]): void;
    updateConnection(config: ConnectionConfig): boolean;
    private persistConnections;
}
