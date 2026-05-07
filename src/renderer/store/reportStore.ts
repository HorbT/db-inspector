import { create } from 'zustand';
import type { ReportMeta, ReportFilter } from '@shared/types';

interface ReportState {
  reports: ReportMeta[];
  selectedReport: ReportMeta | null;
  reportContent: string | null;
  compareReport1: ReportMeta | null;
  compareReport2: ReportMeta | null;
  filter: ReportFilter;
  loading: boolean;
  error: string | null;

  loadReports: (filter?: ReportFilter) => Promise<void>;
  selectReport: (report: ReportMeta | null) => void;
  loadReportContent: (report: ReportMeta) => Promise<void>;
  deleteReports: (ids: string[]) => Promise<void>;
  setCompareReport: (slot: 1 | 2, report: ReportMeta | null) => void;
  setFilter: (filter: ReportFilter) => void;
  clearCompare: () => void;
}

export const useReportStore = create<ReportState>((set, get) => ({
  reports: [],
  selectedReport: null,
  reportContent: null,
  compareReport1: null,
  compareReport2: null,
  filter: {},
  loading: false,
  error: null,

  loadReports: async (filter) => {
    set({ loading: true, error: null });
    try {
      const reports = await window.electronAPI.listReports(filter);
      set({ reports, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  selectReport: (report) =>
    set({ selectedReport: report, reportContent: null }),

  loadReportContent: async (report) => {
    try {
      const content = await window.electronAPI.readReport(report.filePath);
      set({ reportContent: content, selectedReport: report });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  deleteReports: async (ids) => {
    try {
      await window.electronAPI.deleteReports(ids);
      await get().loadReports(get().filter);
      const selected = get().selectedReport;
      if (selected && ids.includes(selected.id)) {
        set({ selectedReport: null, reportContent: null });
      }
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  setCompareReport: (slot, report) =>
    set(slot === 1 ? { compareReport1: report } : { compareReport2: report }),

  setFilter: (filter) => set({ filter }),

  clearCompare: () => set({ compareReport1: null, compareReport2: null }),
}));
