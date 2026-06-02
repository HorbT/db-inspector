import { create } from 'zustand';
import type { InspectionProgress, InspectionResult, InspectionResultItem } from '@shared/types';

interface InspectionState {
  isRunning: boolean;
  progress: InspectionProgress | null;
  results: InspectionResult[];
  resultItems: InspectionResultItem[];
  logs: { time: string; message: string; level: 'info' | 'success' | 'warning' | 'error' }[];

  startInspection: () => void;
  addProgress: (progress: InspectionProgress) => void;
  addResult: (result: InspectionResult) => void;
  addResultItem: (item: InspectionResultItem) => void;
  addLog: (message: string, level?: 'info' | 'success' | 'warning' | 'error') => void;
  finishInspection: () => void;
  clearResults: () => void;
  clearLogs: () => void;
}

function getTime(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

export const useInspectionStore = create<InspectionState>((set) => ({
  isRunning: false,
  progress: null,
  results: [],
  resultItems: [],
  logs: [],

  startInspection: () =>
    set({ isRunning: true, results: [], resultItems: [], progress: null }),

  addProgress: (progress) =>
    set({ progress }),

  addResult: (result) =>
    set((s) => ({ results: [...s.results, result] })),

  addResultItem: (item) =>
    set((s) => ({ resultItems: [...s.resultItems, item] })),

  addLog: (message, level = 'info') =>
    set((s) => ({
      logs: [...s.logs, { time: getTime(), message, level }],
    })),

  finishInspection: () =>
    set({ isRunning: false, progress: null }),

  clearResults: () =>
    set({ results: [], resultItems: [] }),

  clearLogs: () =>
    set({ logs: [] }),
}));