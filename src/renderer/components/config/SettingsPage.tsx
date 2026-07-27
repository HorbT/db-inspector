import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { Button } from '@renderer/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Label } from '@renderer/components/ui/label';
import { Separator } from '@renderer/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { cn } from '@renderer/lib/utils';
import type { AppConfig, AIConfig } from '@shared/types';

export function SettingsPage(): React.ReactElement {
  const { setTheme } = useUIStore();

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
    <div className="flex flex-col h-full gap-4 max-w-3xl">
      {/* Hero */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">设置</h1>
          <p className="text-sm text-muted-foreground mt-1">应用配置与 AI 参数</p>
        </div>
      </div>

      <Tabs defaultValue="general" orientation="vertical" className="flex gap-6 flex-1 min-h-0">
        <TabsList className="flex-col h-full w-40 items-start justify-start gap-1 bg-transparent border-r border-border/60 p-2">
          <TabsTrigger value="general" className="w-full justify-start">常规设置</TabsTrigger>
          <TabsTrigger value="ai" className="w-full justify-start">AI 配置</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto">
          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>常规设置</CardTitle>
                <CardDescription>巡检结果路径、查询超时与界面主题</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Result Path */}
                <div className="space-y-2">
                  <Label htmlFor="resultPath">巡检结果保存路径</Label>
                  <div className="flex gap-2">
                    <input
                      id="resultPath"
                      type="text"
                      value={appConfig.resultPath}
                      onChange={(e) => setAppConfig(p => ({ ...p, resultPath: e.target.value }))}
                      className="input-field flex-1 text-sm"
                      placeholder="选择或输入路径..."
                    />
                    <Button variant="secondary" size="sm" onClick={browseResultPath}>浏览...</Button>
                  </div>
                </div>

                <Separator />

                {/* Query Timeout */}
                <div className="space-y-2">
                  <Label htmlFor="queryTimeout">查询超时时间 (秒)</Label>
                  <input
                    id="queryTimeout"
                    type="number"
                    value={appConfig.queryTimeout}
                    onChange={(e) => setAppConfig(p => ({ ...p, queryTimeout: parseInt(e.target.value, 10) || 300 }))}
                    className="input-field w-32 text-sm"
                    min={10}
                    max={3600}
                  />
                </div>

                <Separator />

                {/* Theme */}
                <div className="space-y-2">
                  <Label>界面主题</Label>
                  <div className="flex gap-2">
                    {(['light', 'dark', 'system'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAppConfig(p => ({ ...p, theme: t }))}
                        className={cn(
                          'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                          appConfig.theme === t
                            ? 'border-transparent bg-primary text-primary-foreground'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {t === 'light' ? '浅色' : t === 'dark' ? '深色' : '跟随系统'}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                <Button onClick={saveAppConfig} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    '保存设置'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Settings */}
          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle>AI 配置</CardTitle>
                <CardDescription>大模型 API 参数、模型与系统提示词</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Provider */}
                <div className="space-y-2">
                  <Label>API 提供商</Label>
                  <div className="flex gap-2">
                    {(['openai', 'gemini'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setAiConfig(prev => ({ ...prev, provider: p }))}
                        className={cn(
                          'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                          aiConfig.provider === p
                            ? 'border-transparent bg-primary text-primary-foreground'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {p === 'openai' ? 'OpenAI 兼容' : 'Google Gemini'}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* API Key */}
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API 密钥</Label>
                  <input
                    id="apiKey"
                    type="password"
                    value={aiConfig.apiKey}
                    onChange={(e) => setAiConfig(p => ({ ...p, apiKey: e.target.value }))}
                    className="input-field text-sm"
                    placeholder="输入 API 密钥..."
                  />
                </div>

                {/* API Base */}
                <div className="space-y-2">
                  <Label htmlFor="apiBase">API 地址</Label>
                  <input
                    id="apiBase"
                    type="text"
                    value={aiConfig.apiBase}
                    onChange={(e) => setAiConfig(p => ({ ...p, apiBase: e.target.value }))}
                    className="input-field text-sm"
                    placeholder={aiConfig.provider === 'openai' ? 'https://api.openai.com/v1' : 'https://generativelanguage.googleapis.com/v1'}
                  />
                </div>

                {/* Model */}
                <div className="space-y-2">
                  <Label htmlFor="modelName">模型名称</Label>
                  <div className="flex gap-2">
                    <select
                      id="modelName"
                      value={aiConfig.modelName}
                      onChange={(e) => setAiConfig(p => ({ ...p, modelName: e.target.value }))}
                      className="input-field flex-1 text-sm"
                    >
                      <option value="">-- 选择模型 --</option>
                      {models.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <Button variant="secondary" size="sm" onClick={fetchModels}>获取模型</Button>
                  </div>
                </div>

                <Separator />

                {/* Temperature */}
                <div className="space-y-2">
                  <Label htmlFor="temperature">温度: {aiConfig.temperature.toFixed(1)}</Label>
                  <input
                    id="temperature"
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
                <div className="space-y-2">
                  <Label htmlFor="maxTokens">最大 Tokens</Label>
                  <input
                    id="maxTokens"
                    type="number"
                    value={aiConfig.maxTokens}
                    onChange={(e) => setAiConfig(p => ({ ...p, maxTokens: parseInt(e.target.value, 10) || 32000 }))}
                    className="input-field w-32 text-sm"
                  />
                </div>

                <Separator />

                {/* System Prompt */}
                <div className="space-y-2">
                  <Label htmlFor="systemPrompt">AI 提示词 (System Prompt)</Label>
                  <textarea
                    id="systemPrompt"
                    value={aiConfig.systemPrompt}
                    onChange={(e) => setAiConfig(p => ({ ...p, systemPrompt: e.target.value }))}
                    className="input-field min-h-[120px] text-sm resize-y"
                    placeholder="输入 AI 提示词，用于指导 AI 分析巡检报告..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    自定义 AI 分析时的系统提示词，留空则使用默认提示词
                  </p>
                </div>

                <Separator />

                <Button onClick={saveAiConfig} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    '保存 AI 配置'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
