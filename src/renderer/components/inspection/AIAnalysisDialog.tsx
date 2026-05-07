import React, { useState, useEffect } from 'react';
import type { AIConfig, AIAnalysisResult } from '@shared/types';

interface AIAnalysisDialogProps {
  reportPath: string;
  reportName: string;
  onClose: () => void;
}

export function AIAnalysisDialog({ reportPath, reportName, onClose }: AIAnalysisDialogProps): React.ReactElement {
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAIConfig();
  }, []);

  const loadAIConfig = async () => {
    try {
      const config = await window.electronAPI.loadAIConfig();
      setAiConfig(config);
    } catch (err) {
      setError('加载AI配置失败');
    }
  };

  const handleAnalyze = async () => {
    if (!aiConfig) {
      setError('请先在设置页面配置AI参数');
      return;
    }
    if (!aiConfig.apiKey) {
      setError('请先在设置页面配置API密钥');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const res = await window.electronAPI.analyzeWithAI(reportPath, aiConfig);
      setResult(res);
      if (!res.success) {
        setError(res.error || 'AI分析失败');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopy = () => {
    if (result?.content) {
      navigator.clipboard.writeText(result.content);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card border rounded-lg shadow-xl w-[720px] max-h-[85vh] flex flex-col m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <h2 className="font-semibold text-sm">AI 分析巡检报告</h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[500px]">
              {reportName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            title="关闭"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5 space-y-4">
          {/* AI Config summary */}
          {aiConfig && !result && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 space-y-1">
              <div>提供商: {aiConfig.provider === 'openai' ? 'OpenAI兼容' : 'Google Gemini'}</div>
              <div>模型: {aiConfig.modelName || '未选择'}</div>
              {aiConfig.apiBase && <div>API地址: {aiConfig.apiBase}</div>}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Loading */}
          {analyzing && (
            <div className="flex flex-col items-center py-8 gap-3">
              <svg className="animate-spin w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-muted-foreground">AI正在分析巡检报告，请稍候...</p>
            </div>
          )}

          {/* Result */}
          {result?.success && result.content && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">
                  模型: {result.modelUsed || aiConfig?.modelName}
                  {result.tokensUsed && ` | Tokens: ${result.tokensUsed}`}
                </span>
                <button onClick={handleCopy} className="btn-secondary text-xs h-7 px-2">
                  复制结果
                </button>
              </div>
              <div className="bg-muted/50 rounded-md p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-auto">
                {result.content}
              </div>
            </div>
          )}

          {/* No analysis yet */}
          {!analyzing && !result && !error && (
            <div className="text-center py-8 text-muted-foreground">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
              <p className="text-sm">点击下方按钮开始AI分析</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t">
          <span className="text-xs text-muted-foreground">
            {aiConfig && !aiConfig.apiKey ? '未配置API密钥' : ''}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary text-sm">
              {result?.success ? '关闭' : '取消'}
            </button>
            {!result?.success && (
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !aiConfig?.apiKey}
                className="btn-primary text-sm"
              >
                {analyzing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    分析中...
                  </span>
                ) : (
                  '开始分析'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
