import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, type?: ToastType, duration?: number) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const MAX_TOASTS = 20;
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

/** Evict oldest entries when the Map exceeds MAX_TOASTS */
function pruneTimeouts() {
  while (toastTimeouts.size > MAX_TOASTS) {
    const oldestKey = toastTimeouts.keys().next().value;
    if (oldestKey === undefined) break;
    const oldTimeout = toastTimeouts.get(oldestKey);
    if (oldTimeout) clearTimeout(oldTimeout);
    toastTimeouts.delete(oldestKey);
  }
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, type = 'info', duration = 3000) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    set(state => ({ toasts: [...state.toasts.slice(-4), { id, message, type, duration }] }));
    if (duration > 0) {
      const timeoutId = setTimeout(() => get().dismiss(id), duration);
      toastTimeouts.set(id, timeoutId);
      pruneTimeouts();
    }
  },
  dismiss: (id) => {
    const timeoutId = toastTimeouts.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      toastTimeouts.delete(id);
    }
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
  },
  dismissAll: () => {
    for (const timeoutId of toastTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    toastTimeouts.clear();
    set({ toasts: [] });
  },
}));

// Convenience functions
export const showToast = (message: string, type?: ToastType, duration?: number) => 
  useToastStore.getState().show(message, type, duration);
export const showError = (message: string) => showToast(message, 'error', 4000);
export const showSuccess = (message: string) => showToast(message, 'success', 2500);
