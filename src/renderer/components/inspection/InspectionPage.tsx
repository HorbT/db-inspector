import React, { useEffect, useCallback, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Trash2, Play, Loader2 } from 'lucide-react';
import { useConnectionStore } from '../../store/connectionStore';
import { useInspectionStore } from '../../store/inspectionStore';
import { ConnectionList } from '../connection/ConnectionList';
import { ConnectionForm } from '../connection/ConnectionForm';
import { ProgressLog } from './ProgressLog';
import { LiveResultView } from './LiveResultView';
import { AIAnalysisDialog } from './AIAnalysisDialog';
import { Button } from '@renderer/components/ui/button';
import { Card } from '@renderer/components/ui/card';
import { staggerContainerVariants, staggerItemVariants } from '@renderer/lib/motion';
import type { InspectionProgress, InspectionResult, InspectionResultItem } from '@shared/types';

export function InspectionPage(): React.ReactElement {
  const { selectedConnectionIds } = useConnectionStore();
  const {
    isRunning, startInspection, addProgress, addResult, addResultItem, addLog,
    finishInspection, clearLogs, resultItems,
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

    const unsubResultItem = window.electronAPI.onInspectionResultItem((item: InspectionResultItem) => {
      addResultItem(item);
      hasResults.current = true;
    });

    return () => {
      unsubProgress();
      unsubResult();
      unsubResultItem();
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
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">数据库巡检</h1>
          <p className="text-sm text-muted-foreground mt-1">选择数据库连接开始巡检</p>
        </div>
        <div className="flex gap-2">
          {latestReport && !isRunning && (
            <Button variant="secondary" size="sm" onClick={handleAIAnalyze}>
              <Sparkles className="h-3.5 w-3.5" />
              AI分析
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={clearLogs}>
            <Trash2 className="h-3.5 w-3.5" />
            清空日志
          </Button>
          <Button
            onClick={handleStartInspection}
            disabled={isRunning}
            variant={isDebugMode ? 'destructive' : 'primary'}
            title="按住Shift键点击进入Debug模式"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isDebugMode ? 'DEBUG巡检中...' : '巡检中...'}
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                执行巡检
              </>
            )}
          </Button>
        </div>
      </div>

      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0"
      >
        <motion.div variants={staggerItemVariants} className="lg:col-span-1 flex flex-col gap-4 min-h-0">
          <Card className="p-4 flex-1 overflow-auto">
            <h2 className="font-semibold mb-3 text-sm">数据库连接列表</h2>
            <ConnectionList />
          </Card>
        </motion.div>
        <motion.div variants={staggerItemVariants} className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          <Card className="p-4">
            <h2 className="font-semibold mb-3 text-sm">连接配置</h2>
            <ConnectionForm />
          </Card>
          <Card className="p-4 min-h-0 max-h-[40%] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">执行日志</h2>
              {latestReport && !isRunning && (
                <Button variant="secondary" size="sm" onClick={handleAIAnalyze}>
                  <Sparkles className="h-3.5 w-3.5" />
                  AI分析
                </Button>
              )}
            </div>
            <ProgressLog />
          </Card>
          <Card className="p-4 flex-1 min-h-0 flex flex-col">
            <h2 className="font-semibold text-sm mb-3">实时结果</h2>
            <LiveResultView items={resultItems} isRunning={isRunning} />
          </Card>
        </motion.div>
      </motion.div>

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
