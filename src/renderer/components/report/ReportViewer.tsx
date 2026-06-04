import React, { useEffect, useState } from 'react';

interface ReportViewerProps {
  dbPath: string;
}

export function ReportViewer({ dbPath }: ReportViewerProps): React.ReactElement {
  const [htmlPath, setHtmlPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Use key to force iframe recreate on path change, src loads via file:///
  return (
    <iframe
      key={htmlPath}
      src={htmlPath}
      className="w-full h-full border-0 bg-white"
      title="巡检报告"
    />
  );
}