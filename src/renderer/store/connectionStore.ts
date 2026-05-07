import { create } from 'zustand';
import type { ConnectionConfig, ConnectionTestResult, PluginManifest } from '@shared/types';

interface ConnectionState {
  connections: ConnectionConfig[];
  plugins: PluginManifest[];
  selectedDbType: string;
  selectedConnectionIds: string[];
  loading: boolean;
  error: string | null;

  loadConnections: () => Promise<void>;
  loadPlugins: () => Promise<void>;
  addConnection: (config: ConnectionConfig) => Promise<{ success: boolean; message: string }>;
  deleteConnections: (ids: string[]) => Promise<void>;
  testConnection: (config: ConnectionConfig) => Promise<ConnectionTestResult>;
  setSelectedDbType: (dbType: string) => void;
  setSelectedConnectionIds: (ids: string[]) => void;
  toggleConnectionSelection: (id: string) => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  connections: [],
  plugins: [],
  selectedDbType: 'mysql',
  selectedConnectionIds: [],
  loading: false,
  error: null,

  loadConnections: async () => {
    set({ loading: true, error: null });
    try {
      const connections = await window.electronAPI.listConnections();
      set({ connections, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  loadPlugins: async () => {
    try {
      const plugins = await window.electronAPI.listPlugins();
      set({ plugins });
      if (plugins.length > 0 && !get().selectedDbType) {
        set({ selectedDbType: plugins[0].id });
      }
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  addConnection: async (config) => {
    set({ loading: true, error: null });
    try {
      const result = await window.electronAPI.addConnection(config);
      if (result.success) {
        await get().loadConnections();
      }
      set({ loading: false });
      return result;
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      return { success: false, message: (err as Error).message };
    }
  },

  deleteConnections: async (ids) => {
    set({ loading: true, error: null });
    try {
      await window.electronAPI.deleteConnections(ids);
      await get().loadConnections();
      set((s) => ({
        selectedConnectionIds: s.selectedConnectionIds.filter((id) => !ids.includes(id)),
        loading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  testConnection: async (config) => {
    return await window.electronAPI.testConnection(config);
  },

  setSelectedDbType: (dbType) => set({ selectedDbType: dbType }),

  setSelectedConnectionIds: (ids) => set({ selectedConnectionIds: ids }),

  toggleConnectionSelection: (id) =>
    set((s) => ({
      selectedConnectionIds: s.selectedConnectionIds.includes(id)
        ? s.selectedConnectionIds.filter((i) => i !== id)
        : [...s.selectedConnectionIds, id],
    })),
}));
