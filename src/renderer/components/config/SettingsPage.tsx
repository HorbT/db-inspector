import React, { useEffect, useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import type { AppConfig, AIConfig } from '@shared/types';

export function SettingsPage(): React.ReactElement {
  const { theme, setTheme } = useUIStore();

  const [appConfig, setAppConfig] = useState<AppConfig>({
    resultPath: '',
    queryTimeout: 300,
    theme: 'system',
    language: 'zh-CN',
  });

  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'openai',
    apiKey: '',
    apiBase: '',
    modelName: '',
    temperature: 0.7,
    maxTokens: 32000,
    systemPrompt: '',
  });

  const [models, setModels] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'ai'>('general');
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const config = await window.electronAPI.loadConfig();
      setAppConfig(config);
      setTheme(config.theme);

      const aiCfg = await window.electronAPI.loadAIConfig();
      setAiConfig(aiCfg);
    } catch (err) {
      console.error('Failed to load configs:', err);
    }
  };

  const saveAppConfig = async () => {
    setSaving(true);
    try {
      await window.electronAPI.saveConfig(appConfig);
      setTheme(appConfig.theme);
      showToast('常规设置已保存', 'success');
    } catch {
      showToast('保存失败，请重试', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveAiConfig = async () => {
    setSaving(true);
    try {
      await window.electronAPI.saveAIConfig(aiConfig);
      showToast('AI配置已保存', 'success');
    } catch {
      showToast('保存失败，请重试', 'error');
    } finally {
      setSaving(false);
    }
  };

  const fetchModels = async () => {
    try {
      const result = await window.electronAPI.fetchAIModels(aiConfig);
      setModels(result);
      if (result.length > 0 && !aiConfig.modelName) {
        setAiConfig(prev => ({ ...prev, modelName: result[0] }));
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
    }
  };

  const browseResultPath = async () => {
    const dir = await window.electronAPI.selectDirectory();
    if (dir) {
      setAppConfig(prev => ({ ...prev, resultPath: dir }));
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 max-w-2xl">
      <h1 className="text-xl font-bold">系统设置</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b pb-0">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-3 py-1.5 text-sm rounded-t-md transition-colors ${
            activeTab === 'general'
              ? 'border-b-2 border-primary text-primary font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          常规设置
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-3 py-1.5 text-sm rounded-t-md transition-colors ${
            activeTab === 'ai'
              ? 'border-b-2 border-primary text-primary font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          AI配置
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="card p-4 space-y-4">
          {/* Result Path */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">巡检结果保存路径</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={appConfig.resultPath}
                onChange={(e) => setAppConfig(p => ({ ...p, resultPath: e.target.value }))}
                className="input-field flex-1 text-sm"
                placeholder="选择或输入路径..."
              />
              <button onClick={browseResultPath} className="btn-secondary text-sm">浏览...</button>
            </div>
          </div>

          {/* Query Timeout */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">查询超时时间 (秒)</label>
            <input
              type="number"
              value={appConfig.queryTimeout}
              onChange={(e) => setAppConfig(p => ({ ...p, queryTimeout: parseInt(e.target.value, 10) || 300 }))}
              className="input-field w-32 text-sm"
              min={10}
              max={3600}
            />
          </div>

          {/* Theme */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">界面主题</label>
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setAppConfig(p => ({ ...p, theme: t }))}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    appConfig.theme === t
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {t === 'light' ? '浅色' : t === 'dark' ? '深色' : '跟随系统'}
                </button>
              ))}
            </div>
          </div>

          <button onClick={saveAppConfig} disabled={saving} className="btn-primary text-sm">
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="card p-4 space-y-4">
          {/* Provider */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">API提供商</label>
            <div className="flex gap-2">
              {(['openai', 'gemini'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setAiConfig(prev => ({ ...prev, provider: p }))}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    aiConfig.provider === p
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {p === 'openai' ? 'OpenAI兼容' : 'Google Gemini'}
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">API密钥</label>
            <input
              type="password"
              value={aiConfig.apiKey}
              onChange={(e) => setAiConfig(p => ({ ...p, apiKey: e.target.value }))}
              className="input-field text-sm"
              placeholder="输入API密钥..."
            />
          </div>

          {/* API Base URL */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">API地址</label>
            <input
              type="text"
              value={aiConfig.apiBase}
              onChange={(e) => setAiConfig(p => ({ ...p, apiBase: e.target.value }))}
              className="input-field text-sm"
              placeholder={aiConfig.provider === 'openai' ? 'https://api.openai.com/v1' : 'https://generativelanguage.googleapis.com/v1'}
            />
          </div>

          {/* Model */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">模型名称</label>
            <div className="flex gap-2">
              <select
                value={aiConfig.modelName}
                onChange={(e) => setAiConfig(p => ({ ...p, modelName: e.target.value }))}
                className="input-field flex-1 text-sm"
              >
                <option value="">-- 选择模型 --</option>
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <button onClick={fetchModels} className="btn-secondary text-sm">获取模型</button>
            </div>
          </div>

          {/* Temperature */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              温度: {aiConfig.temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={aiConfig.temperature}
              onChange={(e) => setAiConfig(p => ({ ...p, temperature: parseFloat(e.target.value) }))}
              className="w-full"
            />
          </div>

          {/* Max Tokens */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">最大Tokens</label>
            <input
              type="number"
              value={aiConfig.maxTokens}
              onChange={(e) => setAiConfig(p => ({ ...p, maxTokens: parseInt(e.target.value, 10) || 32000 }))}
              className="input-field w-32 text-sm"
            />
          </div>

          {/* System Prompt */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">AI提示词 (System Prompt)</label>
            <textarea
              value={aiConfig.systemPrompt}
              onChange={(e) => setAiConfig(p => ({ ...p, systemPrompt: e.target.value }))}
              className="input-field min-h-[120px] text-sm resize-y"
              placeholder="输入AI提示词，用于指导AI分析巡检报告..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              自定义AI分析时的系统提示词，留空则使用默认提示词
            </p>
          </div>

          <button onClick={saveAiConfig} disabled={saving} className="btn-primary text-sm">
            {saving ? '保存中...' : '保存AI配置'}
          </button>
        </div>
      )}
    </div>
  );
}
