import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import type { AppConfig, AIConfig, ConnectionConfig } from '@shared/types';
import { SUPPORTED_DB_TYPES } from '@shared/constants';

const DEFAULT_CONFIG: AppConfig = {
  resultPath: '',
  queryTimeout: 300,
  theme: 'system',
  language: 'zh-CN',
};

const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'openai',
  apiKey: '',
  apiBase: '',
  modelName: '',
  temperature: 0.7,
  maxTokens: 32000,
  systemPrompt: '',
};

export class ConfigStore {
  private static instance: ConfigStore;
  private userDataPath: string;
  private configPath: string;
  private aiConfigPath: string;
  private connectionsPath: string;
  private config: AppConfig;
  private aiConfig: AIConfig;
  private connections: ConnectionConfig[];

  private constructor() {
    this.userDataPath = app.getPath('userData');
    this.configPath = path.join(this.userDataPath, 'app_config.json');
    this.aiConfigPath = path.join(this.userDataPath, 'ai_config.json');
    this.connectionsPath = path.join(this.userDataPath, 'connections.json');
    this.config = this.loadConfig();
    this.aiConfig = this.loadAIConfig();
    this.connections = this.loadConnections();
  }

  static getInstance(): ConfigStore {
    if (!ConfigStore.instance) {
      ConfigStore.instance = new ConfigStore();
    }
    return ConfigStore.instance;
  }

  private ensureFile(filePath: string, defaultContent: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, defaultContent, 'utf-8');
    }
  }

  // ==================== App Config ====================

  private loadConfig(): AppConfig {
    try {
      this.ensureFile(this.configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
      const data = fs.readFileSync(this.configPath, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  saveConfig(updates: Partial<AppConfig>): boolean {
    try {
      this.config = { ...this.config, ...updates };
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[ConfigStore] Failed to save config:', err);
      return false;
    }
  }

  getResultPath(): string {
    return this.config.resultPath || path.join(app.getPath('documents'), 'DBInspector_Results');
  }

  // ==================== AI Config ====================

  private loadAIConfig(): AIConfig {
    try {
      this.ensureFile(this.aiConfigPath, JSON.stringify(DEFAULT_AI_CONFIG, null, 2));
      const data = fs.readFileSync(this.aiConfigPath, 'utf-8');
      return { ...DEFAULT_AI_CONFIG, ...JSON.parse(data) };
    } catch {
      return { ...DEFAULT_AI_CONFIG };
    }
  }

  getAIConfig(): AIConfig {
    return { ...this.aiConfig };
  }

  saveAIConfig(config: AIConfig): boolean {
    try {
      this.aiConfig = { ...config };
      fs.writeFileSync(this.aiConfigPath, JSON.stringify(this.aiConfig, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[ConfigStore] Failed to save AI config:', err);
      return false;
    }
  }

  // ==================== Connections ====================

  private loadConnections(): ConnectionConfig[] {
    try {
      this.ensureFile(this.connectionsPath, JSON.stringify([], null, 2));
      const data = fs.readFileSync(this.connectionsPath, 'utf-8');
      return JSON.parse(data) as ConnectionConfig[];
    } catch {
      return [];
    }
  }

  getConnections(): ConnectionConfig[] {
    return [...this.connections];
  }

  getConnection(id: string): ConnectionConfig | undefined {
    return this.connections.find(c => c.id === id);
  }

  addConnection(config: ConnectionConfig): void {
    const existingIdx = this.connections.findIndex(c => c.id === config.id);
    if (existingIdx >= 0) {
      this.connections[existingIdx] = config;
    } else {
      this.connections.push(config);
    }
    this.persistConnections();
  }

  deleteConnections(ids: string[]): void {
    this.connections = this.connections.filter(c => !ids.includes(c.id));
    this.persistConnections();
  }

  updateConnection(config: ConnectionConfig): boolean {
    const idx = this.connections.findIndex(c => c.id === config.id);
    if (idx >= 0) {
      this.connections[idx] = { ...config, updatedAt: new Date().toISOString() };
      this.persistConnections();
      return true;
    }
    return false;
  }

  private persistConnections(): void {
    try {
      fs.writeFileSync(this.connectionsPath, JSON.stringify(this.connections, null, 2), 'utf-8');
    } catch (err) {
      console.error('[ConfigStore] Failed to save connections:', err);
    }
  }
}
