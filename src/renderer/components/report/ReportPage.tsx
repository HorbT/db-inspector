import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Trash2, Search, RefreshCw, FileText, Save } from 'lucide-react';
import { useReportStore } from '../../store/reportStore';
import { AIAnalysisDialog } from '../inspection/AIAnalysisDialog';
import { SUPPORTED_DB_TYPES, DB_TYPE_LABELS } from '@shared/constants';
import type { DBType } from '@shared/constants';
import type { ReportMeta } from '@shared/types';
import { ReportViewer } from './ReportViewer';
import { Button } from '@renderer/components/ui/button';
import { Card } from '@renderer/components/ui/card';
import { EmptyState } from '@renderer/components/common/EmptyState';
import { staggerContainerVariants, staggerItemVariants } from '@renderer/lib/motion';
import { cn } from '@renderer/lib/utils';

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
      {/* Hero */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">巡检报告</h1>
          <p className="text-sm text-muted-foreground mt-1">查看历史巡检报告</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* DB Type filter (Badge-style chips) */}
        <div className="flex gap-1.5">
          <button
            onClick={() => handleDbTypeFilter(undefined)}
            className={cn(
              'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              !filter.dbType
                ? 'border-transparent bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            全部
          </button>
          {SUPPORTED_DB_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => handleDbTypeFilter(type)}
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                filter.dbType === type
                  ? 'border-transparent bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
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
          <Button variant="primary" size="sm" onClick={handleSearch}>
            <Search className="h-3.5 w-3.5" />
            搜索
          </Button>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => loadReports(filter)}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          刷新
        </Button>
      </div>

      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0"
      >
        {/* Report List */}
        <motion.div variants={staggerItemVariants} className="lg:col-span-1 min-h-0">
          <Card className="p-4 overflow-auto h-full flex flex-col">
            <h2 className="font-semibold mb-3 text-sm">
              报告列表
              {loading && <span className="ml-2 text-xs text-muted-foreground">加载中...</span>}
            </h2>

            {reports.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="暂无巡检报告"
                description="请先执行巡检任务"
              />
            ) : (
              <motion.div
                variants={staggerContainerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-1.5 flex-1"
              >
                {reports.map((report) => (
                  <motion.div
                    key={report.id}
                    variants={staggerItemVariants}
                    whileHover={{ y: -2 }}
                  >
                    <Card
                      onClick={() => handleViewReport(report)}
                      className={cn(
                      'p-2.5 cursor-pointer text-sm group',
                      selectedReport?.id === report.id
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-transparent hover:bg-muted/50 shadow-none hover:shadow-none'
                    )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate flex-1">{report.fileName}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAIAnalyze(report); }}
                            className="text-primary hover:bg-primary/10 p-1 rounded text-xs"
                            title="AI分析"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(report.id); }}
                            className="text-danger hover:bg-danger/10 p-1 rounded text-xs"
                            title="删除"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span>{DB_TYPE_LABELS[report.dbType as DBType] || report.dbType}</span>
                        <span>{new Date(report.createdAt).toLocaleDateString('zh-CN')}</span>
                        <span>{formatSize(report.fileSize)}</span>
                      </div>
                    </Card>
                    </motion.div>
                  ))}
                </motion.div>
              )}
          </Card>
        </motion.div>

        {/* Report Preview */}
        <motion.div variants={staggerItemVariants} className="lg:col-span-2 flex flex-col min-h-0">
          <Card className="p-4 overflow-hidden flex flex-col h-full min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">报告预览</h2>
              {selectedReport && (
                <div className="flex gap-2">
                  {selectedReport.filePath.endsWith('.db') && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSaveReport(selectedReport)}
                      title="保存为HTML报告"
                    >
                      <Save className="h-3.5 w-3.5" />
                      保存报告
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAIAnalyze(selectedReport)}
                    title="AI分析当前报告"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    AI分析
                  </Button>
                </div>
              )}
            </div>
            {selectedReport ? (
              selectedReport.filePath.endsWith('.db') ? (
                <div className="flex flex-col flex-1 min-h-0">
                  <ReportViewer dbPath={selectedReport.filePath} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
                  <FileText className="h-16 w-16 mb-4 text-gray-300" />
                  <p className="text-gray-500 mb-2">旧版 HTML 报告</p>
                  <p className="text-gray-400 text-sm mb-4">此报告为旧版本生成的完整 HTML 文件，不支持实时查看。</p>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      const url = `file:///${selectedReport.filePath.replace(/\\/g, '/')}`;
                      window.open(url, '_blank');
                    }}
                  >
                    在浏览器中打开
                  </Button>
                </div>
              )
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p className="text-sm">请选择一个报告查看</p>
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>

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
