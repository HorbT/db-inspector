import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useConnectionStore } from '../../store/connectionStore';
import { useInspectionStore } from '../../store/inspectionStore';
import { ConnectionList } from '../connection/ConnectionList';
import { ConnectionForm } from '../connection/ConnectionForm';
import { ProgressLog } from './ProgressLog';
import { AIAnalysisDialog } from './AIAnalysisDialog';
import type { InspectionProgress, InspectionResult, InspectionResultItem } from '@shared/types';

export function InspectionPage(): React.ReactElement {
  const { selectedConnectionIds } = useConnectionStore();
  const {
    isRunning, startInspection, addProgress, addResult, addLog,
    finishInspection, clearLogs,
  } = useInspectionStore();

  const [latestReport, setLatestReport] = useState<{ path: string; name: string } | null>(null);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const hasResults = useRef(false);

  useEffect(() => {
    const unsubProgress = window.electronAPI.onInspectionProgress((progress: InspectionProgress) => {
      addProgress(progress);
      if (progress.debugInfo) {
        const level = progress.debugInfo.includes('失败') || progress.debugInfo.includes('错误')
          ? 'error' : progress.debugInfo.includes('成功')
          ? 'success' : progress.debugInfo.includes('跳过')
          ? 'warning' : 'info';
        addLog(`[${progress.description}] ${progress.debugInfo}`, level as 'info' | 'success' | 'warning' | 'error');
      } else {
        addLog(`[${progress.description}] ${progress.currentScript || '开始执行...'}`, 'info');
      }
    });

    const unsubResult = window.electronAPI.onInspectionResult((result: InspectionResult) => {
      addResult(result);
      hasResults.current = true;
      if (result.success) {
        addLog(`[${result.description}] 巡检完成`, 'success');
      } else {
        addLog(`[${result.description}] 巡检失败: ${result.error}`, 'error');
      }
      setIsDebugMode(false);
    });

    return () => {
      unsubProgress();
      unsubResult();
    };
  }, []);

  const handleStartInspection = useCallback(async (e?: React.MouseEvent) => {
    if (selectedConnectionIds.length === 0) {
      addLog('请至少选择一个数据库连接', 'warning');
      return;
    }

    const debug = e?.shiftKey === true;
    setIsDebugMode(debug);

    setLatestReport(null);
    hasResults.current = false;
    startInspection();
    if (debug) {
      addLog('[DEBUG模式] 开始执行数据库巡检任务（详细调试信息）...', 'warning');
    } else {
      addLog('开始执行数据库巡检任务...', 'info');
    }

    try {
      await window.electronAPI.startInspection({
        connectionIds: selectedConnectionIds,
        dbType: '',
        resultPath: '',
        sqlScriptsDir: '',
        queryTimeout: 300,
        debug,
      });
    } catch (err) {
      addLog(`巡检执行失败: ${(err as Error).message}`, 'error');
    } finally {
      finishInspection();
      addLog(debug ? '[DEBUG模式] 巡检任务结束' : '巡检任务结束', 'info');
    }
  }, [selectedConnectionIds]);

  const handleAIAnalyze = () => {
    if (latestReport) {
      setShowAIAnalysis(true);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">数据库巡检</h1>
        <div className="flex gap-2">
          {latestReport && !isRunning && (
            <button
              onClick={handleAIAnalyze}
              className="btn-primary text-xs flex items-center gap-1.5"
              title="AI分析巡检日志"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              AI分析巡检日志
            </button>
          )}
          <button onClick={clearLogs} className="btn-secondary text-xs">
            清空日志
          </button>
          <button
            onClick={handleStartInspection}
            disabled={isRunning}
            className={`btn-primary ${isDebugMode ? 'bg-warning text-black hover:bg-warning/90' : ''}`}
            title="按住Shift键点击进入Debug模式"
          >
            {isRunning ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {isDebugMode ? 'DEBUG巡检中...' : '巡检中...'}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                执行巡检
                <span className="text-[10px] opacity-60">(Shift+D)</span>
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Left: Connection List */}
        <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
          <div className="card p-4 flex-1 overflow-auto">
            <h2 className="font-semibold mb-3 text-sm">数据库连接列表</h2>
            <ConnectionList />
          </div>
        </div>

        {/* Right: Connection Form + Log */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          <div className="card p-4">
            <h2 className="font-semibold mb-3 text-sm">连接配置</h2>
            <ConnectionForm />
          </div>
          <div className="card p-4 flex-1 min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">执行日志</h2>
              {latestReport && !isRunning && (
                <button
                  onClick={handleAIAnalyze}
                  className="btn-primary text-xs h-7 px-3 flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  AI分析
                </button>
              )}
            </div>
            <ProgressLog />
          </div>
        </div>
      </div>

      {/* AI Analysis Dialog */}
      {showAIAnalysis && latestReport && (
        <AIAnalysisDialog
          reportPath={latestReport.path}
          reportName={latestReport.name}
          onClose={() => setShowAIAnalysis(false)}
        />
      )}
    </div>
  );
}