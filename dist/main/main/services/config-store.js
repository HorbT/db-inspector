"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigStore = void 0;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const DEFAULT_CONFIG = {
    resultPath: '',
    queryTimeout: 300,
    theme: 'system',
    language: 'zh-CN',
};
const DEFAULT_AI_CONFIG = {
    provider: 'openai',
    apiKey: '',
    apiBase: '',
    modelName: '',
    temperature: 0.7,
    maxTokens: 32000,
    systemPrompt: '',
};
class ConfigStore {
    constructor() {
        this.userDataPath = electron_1.app.getPath('userData');
        this.configPath = path_1.default.join(this.userDataPath, 'app_config.json');
        this.aiConfigPath = path_1.default.join(this.userDataPath, 'ai_config.json');
        this.connectionsPath = path_1.default.join(this.userDataPath, 'connections.json');
        this.config = this.loadConfig();
        this.aiConfig = this.loadAIConfig();
        this.connections = this.loadConnections();
    }
    static getInstance() {
        if (!ConfigStore.instance) {
            ConfigStore.instance = new ConfigStore();
        }
        return ConfigStore.instance;
    }
    ensureFile(filePath, defaultContent) {
        const dir = path_1.default.dirname(filePath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        if (!fs_1.default.existsSync(filePath)) {
            fs_1.default.writeFileSync(filePath, defaultContent, 'utf-8');
        }
    }
    // ==================== App Config ====================
    loadConfig() {
        try {
            this.ensureFile(this.configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
            const data = fs_1.default.readFileSync(this.configPath, 'utf-8');
            return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
        }
        catch {
            return { ...DEFAULT_CONFIG };
        }
    }
    getConfig() {
        return { ...this.config };
    }
    saveConfig(updates) {
        try {
            this.config = { ...this.config, ...updates };
            fs_1.default.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
            return true;
        }
        catch (err) {
            console.error('[ConfigStore] Failed to save config:', err);
            return false;
        }
    }
    getResultPath() {
        return this.config.resultPath || path_1.default.join(electron_1.app.getPath('documents'), 'DBInspector_Results');
    }
    // ==================== AI Config ====================
    loadAIConfig() {
        try {
            this.ensureFile(this.aiConfigPath, JSON.stringify(DEFAULT_AI_CONFIG, null, 2));
            const data = fs_1.default.readFileSync(this.aiConfigPath, 'utf-8');
            return { ...DEFAULT_AI_CONFIG, ...JSON.parse(data) };
        }
        catch {
            return { ...DEFAULT_AI_CONFIG };
        }
    }
    getAIConfig() {
        return { ...this.aiConfig };
    }
    saveAIConfig(config) {
        try {
            this.aiConfig = { ...config };
            fs_1.default.writeFileSync(this.aiConfigPath, JSON.stringify(this.aiConfig, null, 2), 'utf-8');
            return true;
        }
        catch (err) {
            console.error('[ConfigStore] Failed to save AI config:', err);
            return false;
        }
    }
    // ==================== Connections ====================
    loadConnections() {
        try {
            this.ensureFile(this.connectionsPath, JSON.stringify([], null, 2));
            const data = fs_1.default.readFileSync(this.connectionsPath, 'utf-8');
            return JSON.parse(data);
        }
        catch {
            return [];
        }
    }
    getConnections() {
        return [...this.connections];
    }
    getConnection(id) {
        return this.connections.find(c => c.id === id);
    }
    addConnection(config) {
        const existingIdx = this.connections.findIndex(c => c.id === config.id);
        if (existingIdx >= 0) {
            this.connections[existingIdx] = config;
        }
        else {
            this.connections.push(config);
        }
        this.persistConnections();
    }
    deleteConnections(ids) {
        this.connections = this.connections.filter(c => !ids.includes(c.id));
        this.persistConnections();
    }
    updateConnection(config) {
        const idx = this.connections.findIndex(c => c.id === config.id);
        if (idx >= 0) {
            this.connections[idx] = { ...config, updatedAt: new Date().toISOString() };
            this.persistConnections();
            return true;
        }
        return false;
    }
    persistConnections() {
        try {
            fs_1.default.writeFileSync(this.connectionsPath, JSON.stringify(this.connections, null, 2), 'utf-8');
        }
        catch (err) {
            console.error('[ConfigStore] Failed to save connections:', err);
        }
    }
}
exports.ConfigStore = ConfigStore;
//# sourceMappingURL=config-store.js.map