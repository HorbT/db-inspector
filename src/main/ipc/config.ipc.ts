import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/types';
import type { AIConfig, AppConfig, AIAnalysisResult } from '@shared/types';
import type { ConfigStore } from '../services/config-store';
import { FileManager } from '../services/file-manager';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JSONData = any;

export function registerConfigHandlers(configStore: ConfigStore): void {
  // App config
  ipcMain.handle(IPC_CHANNELS.CONFIG_LOAD, () => {
    return configStore.getConfig();
  });

  ipcMain.handle(IPC_CHANNELS.CONFIG_SAVE, (_event, updates: Partial<AppConfig>) => {
    return configStore.saveConfig(updates);
  });

  ipcMain.handle(IPC_CHANNELS.CONFIG_GET_RESULT_PATH, () => {
    return configStore.getResultPath();
  });

  // AI config
  ipcMain.handle(IPC_CHANNELS.AI_CONFIG_LOAD, () => {
    return configStore.getAIConfig();
  });

  ipcMain.handle(IPC_CHANNELS.AI_CONFIG_SAVE, (_event, config: AIConfig) => {
    return configStore.saveAIConfig(config);
  });

  // AI analyze
  ipcMain.handle(IPC_CHANNELS.AI_ANALYZE, async (_event, reportPath: string, aiConfig: AIConfig) => {
    try {
      const reportContent = FileManager.readFile(reportPath);
      if (!reportContent) {
        return { success: false, error: '报告文件不存在' };
      }

      const result = await callAIAPI(reportContent, aiConfig);
      return result;
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // AI analyze text (for section-level analysis)
  ipcMain.handle('ai:analyze-text', async (_event, text: string, aiConfig: AIConfig) => {
    try {
      const result = await callAIAPI(text, aiConfig);
      return result;
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // Fetch models
  ipcMain.handle(IPC_CHANNELS.AI_FETCH_MODELS, async (_event, config: AIConfig) => {
    try {
      if (!config.apiKey) return [];
      if (!config.apiBase) {
        config.apiBase = config.provider === 'openai'
          ? 'https://api.openai.com/v1'
          : 'https://generativelanguage.googleapis.com/v1';
      }
      const models = await fetchModels(config);
      return models;
    } catch (err) {
      console.error('[Config IPC] Failed to fetch models:', err);
      return [];
    }
  });
}

async function callAIAPI(reportContent: string, config: AIConfig): Promise<AIAnalysisResult> {
  const cleanedContent = stripHtml(reportContent).substring(0, 60000);

  const apiBase = config.apiBase || (
    config.provider === 'openai'
      ? 'https://api.openai.com/v1'
      : 'https://generativelanguage.googleapis.com/v1'
  );

  if (config.provider === 'openai') {
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.modelName,
        messages: [
          { role: 'system', content: config.systemPrompt || 'You are a database expert.' },
          { role: 'user', content: `请分析以下数据库巡检报告:\n\n${cleanedContent}` },
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`API错误 ${response.status}: ${errBody}`);
    }

    const data: JSONData = await response.json();
    return {
      success: true,
      content: data.choices?.[0]?.message?.content || '',
      modelUsed: config.modelName,
      tokensUsed: data.usage?.total_tokens,
    };
  }

  // Gemini
  const response = await fetch(`${apiBase}/models/${config.modelName}:generateContent`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: config.systemPrompt || 'You are a database expert.' },
          { text: `请分析以下数据库巡检报告:\n\n${cleanedContent}` },
        ],
      }],
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini API错误 ${response.status}: ${errBody}`);
  }

  const data: JSONData = await response.json();
  return {
    success: true,
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    modelUsed: config.modelName,
  };
}

async function fetchModels(config: AIConfig): Promise<string[]> {
  const apiBase = config.apiBase || (
    config.provider === 'openai'
      ? 'https://api.openai.com/v1'
      : 'https://generativelanguage.googleapis.com/v1'
  );

  const headers: Record<string, string> = config.provider === 'openai'
    ? { 'Authorization': `Bearer ${config.apiKey}` }
    : { 'Authorization': `Bearer ${config.apiKey}` };

  const endpoint = `${apiBase}/models`;

  const response = await fetch(endpoint, { headers });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data: JSONData = await response.json();
  const models: string[] = [];

  if (config.provider === 'openai') {
    for (const m of (data.data || []) as JSONData[]) {
      if (m.id) models.push(m.id);
    }
  } else {
    for (const m of (data.models || []) as JSONData[]) {
      if (m.name) models.push(m.name);
    }
  }

  return models;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
