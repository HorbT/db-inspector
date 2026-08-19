import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';
type View = 'inspection' | 'reports' | 'settings';
type ToastType = 'success' | 'error' | 'info';

interface Toast {
  message: string;
  type: ToastType;
  id: number;
}

interface UIState {
  theme: Theme;
  currentView: View;
  sidebarCollapsed: boolean;
  toasts: Toast[];
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  cycleTheme: () => void;
  setCurrentView: (view: View) => void;
  toggleSidebar: () => void;
  applyTheme: (theme: Theme) => void;
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: number) => void;
}

let toastIdCounter = 0;

export const useUIStore = create<UIState>((set, get) => ({
  theme: 'system',
  currentView: 'inspection',
  sidebarCollapsed: false,
  toasts: [],

  setTheme: (theme) => {
    set({ theme });
    get().applyTheme(theme);
  },

  toggleTheme: () => {
    const current = get().theme;
    const next = current === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  cycleTheme: () => {
    const order: Theme[] = ['light', 'dark', 'system'];
    const current = get().theme;
    const next = order[(order.indexOf(current) + 1) % order.length];
    set({ theme: next });
    get().applyTheme(next);
  },

  setCurrentView: (view) => set({ currentView: view }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  applyTheme: (theme) => {
    const root = document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    root.classList.toggle('dark', isDark);
  },

  showToast: (message, type = 'info') => {
    const id = ++toastIdCounter;
    set((s) => ({ toasts: [...s.toasts, { message, type, id }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 3000);
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
