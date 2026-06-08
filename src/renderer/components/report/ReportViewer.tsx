import React, { useEffect, useState, useRef, useCallback } from 'react';

interface ReportViewerProps {
  dbPath: string;
}

export function ReportViewer({ dbPath }: ReportViewerProps): React.ReactElement {
  const [htmlPath, setHtmlPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancelled = false;
    setHtmlPath(null);
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const previewUrl = await window.electronAPI.getPreviewUrl(dbPath);
        if (!cancelled) {
          setHtmlPath(previewUrl);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [dbPath]);

  const handleMessage = useCallback(async (event: MessageEvent) => {
    const data = event.data;
    if (!data || data.type !== 'ai-analyze-section') return;

    const { sectionId, sectionTitle, indices } = data;
    const cacheKey = `${dbPath}:${sectionId}`;

    try {
      // Check cache first
      const cached = await window.electronAPI.aiCacheGet(cacheKey);
      if (cached) {
        iframeRef.current?.contentWindow?.postMessage({
          type: 'ai-section-result',
          sectionId,
          content: cached,
        }, '*');
        return;
      }

      // Load AI config
      const aiConfig = await window.electronAPI.loadAIConfig();
      if (!aiConfig.apiKey) {
        iframeRef.current?.contentWindow?.postMessage({
          type: 'ai-section-result',
          sectionId,
          error: '请先在设置中配置AI API密钥',
        }, '*');
        return;
      }

      // Get results by indices
      const results = await window.electronAPI.getResultsByIndices(dbPath, indices);

      // Format data for AI
      const textParts: string[] = [];
      textParts.push(`巡检点: ${sectionTitle}`);
      textParts.push('');
      for (const r of results as Array<{ file_name: string; columns: string; rows: unknown[]; error: string | null }>) {
        textParts.push(`--- ${r.file_name} ---`);
        if (r.error) {
          textParts.push(`错误: ${r.error}`);
        } else if (r.columns) {
          try {
            const cols: string[] = JSON.parse(r.columns);
            textParts.push(cols.join(' | '));
            if (Array.isArray(r.rows)) {
              for (const row of r.rows) {
                if (Array.isArray(row)) {
                  textParts.push(row.map(c => c === null ? '' : String(c)).join(' | '));
                }
              }
            }
          } catch {
            textParts.push('(数据解析失败)');
          }
        }
        textParts.push('');
      }

      const prompt = `你是一个数据库巡检专家。请对以下 "${sectionTitle}" 巡检点的数据进行分析，给出专业的评估和建议。\n\n${textParts.join('\n')}`;

      const aiResult = await window.electronAPI.analyzeText(prompt, aiConfig);

      if (aiResult.success && aiResult.content) {
        // Cache the result
        await window.electronAPI.aiCacheSet(cacheKey, aiResult.content);
        iframeRef.current?.contentWindow?.postMessage({
          type: 'ai-section-result',
          sectionId,
          content: aiResult.content,
        }, '*');
      } else {
        iframeRef.current?.contentWindow?.postMessage({
          type: 'ai-section-result',
          sectionId,
          error: aiResult.error || 'AI分析失败',
        }, '*');
      }
    } catch (err) {
      iframeRef.current?.contentWindow?.postMessage({
        type: 'ai-section-result',
        sectionId,
        error: (err as Error).message,
      }, '*');
    }
  }, [dbPath]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto mb-3 text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-muted-foreground text-sm">加载巡检报告...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-danger">
          <p className="text-sm">加载报告失败</p>
          <p className="text-xs mt-1 text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!htmlPath) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground text-sm">无报告数据</p>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      key={htmlPath}
      src={htmlPath}
      className="w-full h-full border-0 bg-white"
      title="巡检报告"
    />
  );
}