import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Copy, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
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
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[720px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>AI 分析巡检报告</DialogTitle>
          <DialogDescription className="truncate">{reportName}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="p-5 space-y-4">
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
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Loading */}
            {analyzing && (
              <div className="flex flex-col items-center py-8 gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
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
                  <Button variant="secondary" size="sm" onClick={handleCopy}>
                    <Copy className="h-3.5 w-3.5" />
                    复制结果
                  </Button>
                </div>
                <div className="bg-muted/50 rounded-md p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-auto">
                  {result.content}
                </div>
              </div>
            )}

            {/* No analysis yet */}
            {!analyzing && !result && !error && (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p className="text-sm">点击下方按钮开始AI分析</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {aiConfig && !aiConfig.apiKey ? '未配置API密钥' : ''}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              {result?.success ? '关闭' : '取消'}
            </Button>
            {!result?.success && (
              <Button
                onClick={handleAnalyze}
                disabled={analyzing || !aiConfig?.apiKey}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    分析中...
                  </>
                ) : (
                  '开始分析'
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
