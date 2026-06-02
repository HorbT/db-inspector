import React, { useEffect, useState } from 'react';
import { useReportStore } from '../../store/reportStore';
import { AIAnalysisDialog } from '../inspection/AIAnalysisDialog';
import { SUPPORTED_DB_TYPES, DB_TYPE_LABELS } from '@shared/constants';
import type { DBType } from '@shared/constants';
import type { ReportMeta } from '@shared/types';
import { ReportViewer } from './ReportViewer';

export function ReportPage(): React.ReactElement {
  const {
    reports, selectedReport, reportContent,
    loading, loadReports, selectReport, loadReportContent,
    deleteReports, filter, setFilter,
  } = useReportStore();

  const [searchText, setSearchText] = useState('');
  const [analyzeReport, setAnalyzeReport] = useState<ReportMeta | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const handleSearch = () => {
    setFilter({ ...filter, keyword: searchText || undefined });
    loadReports({ ...filter, keyword: searchText || undefined });
  };

  const handleDbTypeFilter = (dbType?: string) => {
    const newFilter = { ...filter, dbType };
    setFilter(newFilter);
    loadReports(newFilter);
  };

  const handleViewReport = (report: ReportMeta) => {
    selectReport(report);
    loadReportContent(report);
  };

  const handleDelete = async (id: string) => {
    await deleteReports([id]);
  };

  const handleAIAnalyze = (report: ReportMeta) => {
    setAnalyzeReport(report);
  };

  const handleSaveReport = async (report: ReportMeta) => {
    try {
      const result = await window.electronAPI.exportReportHtml(report.filePath);
      if (result.success) {
        alert(`报告已保存至: ${result.outputPath}`);
        loadReports(filter);
      } else {
        alert(`保存失败: ${result.error}`);
      }
    } catch (err) {
      alert(`保存失败: ${(err as Error).message}`);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <h1 className="text-xl font-bold">巡检报告管理</h1>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* DB Type filter */}
        <div className="flex gap-1">
          <button
            onClick={() => handleDbTypeFilter(undefined)}
            className={`px-2.5 py-1 rounded text-xs ${!filter.dbType ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            全部
          </button>
          {SUPPORTED_DB_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => handleDbTypeFilter(type)}
              className={`px-2.5 py-1 rounded text-xs ${filter.dbType === type ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
            >
              {DB_TYPE_LABELS[type as DBType]}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-1">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索报告..."
            className="input-field h-8 text-xs w-48"
          />
          <button onClick={handleSearch} className="btn-primary text-xs h-8">搜索</button>
        </div>

        <button
          onClick={() => loadReports(filter)}
          className="btn-secondary text-xs h-8"
        >
          刷新
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Report List */}
        <div className="card p-4 overflow-auto lg:col-span-1">
          <h2 className="font-semibold mb-3 text-sm">
            报告列表
            {loading && <span className="ml-2 text-xs text-muted-foreground">加载中...</span>}
          </h2>

          {reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="text-sm">暂无巡检报告</p>
              <p className="text-xs mt-1">请先执行巡检任务</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {reports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => handleViewReport(report)}
                  className={`p-2.5 rounded-md border cursor-pointer transition-all text-sm group ${
                    selectedReport?.id === report.id
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate flex-1">{report.fileName}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAIAnalyze(report); }}
                        className="text-primary hover:bg-primary/10 p-1 rounded text-xs"
                        title="AI分析"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(report.id); }}
                        className="text-danger hover:bg-danger/10 p-1 rounded text-xs"
                        title="删除"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                    {report.dbType !== 'unknown' && (
                      <span className="px-1 py-0.5 rounded bg-muted">
                        {DB_TYPE_LABELS[report.dbType as DBType] || report.dbType}
                      </span>
                    )}
                    <span>{report.description}</span>
                    <span>{new Date(report.createdAt).toLocaleDateString('zh-CN')}</span>
                    <span>{formatSize(report.fileSize)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Report Preview */}
        <div className="card p-4 overflow-auto lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">报告预览</h2>
            {selectedReport && (
              <div className="flex gap-2">
                {selectedReport.filePath.endsWith('.db') && (
                  <button
                    onClick={() => handleSaveReport(selectedReport)}
                    className="btn-primary text-xs h-7 px-3 flex items-center gap-1.5"
                    title="保存为HTML报告"
                  >
                    保存报告
                  </button>
                )}
                <button
                  onClick={() => handleAIAnalyze(selectedReport)}
                  className="btn-secondary text-xs h-7 px-3 flex items-center gap-1.5"
                  title="AI分析当前报告"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  AI分析
                </button>
              </div>
            )}
          </div>
          {selectedReport ? (
            selectedReport.filePath.endsWith('.db') ? (
              <div className="w-full h-[calc(100%-2rem)] overflow-auto">
                <ReportViewer dbPath={selectedReport.filePath} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <p className="text-gray-500 mb-2">旧版 HTML 报告</p>
                <p className="text-gray-400 text-sm mb-4">此报告为旧版本生成的完整 HTML 文件，不支持实时查看。</p>
                <button
                  onClick={() => {
                    const url = `file:///${selectedReport.filePath.replace(/\\/g, '/')}`;
                    window.open(url, '_blank');
                  }}
                  className="bg-primary text-white px-4 py-2 rounded text-sm hover:bg-primary/90 transition-colors"
                >
                  在浏览器中打开
                </button>
              </div>
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">请选择一个报告查看</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Analysis Dialog */}
      {analyzeReport && (
        <AIAnalysisDialog
          reportPath={analyzeReport.filePath}
          reportName={analyzeReport.fileName}
          onClose={() => setAnalyzeReport(null)}
        />
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
