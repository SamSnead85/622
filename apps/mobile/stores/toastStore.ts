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

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, type = 'info', duration = 3000) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    set(state => ({ toasts: [...state.toasts.slice(-4), { id, message, type, duration }] }));
    if (duration > 0) {
      setTimeout(() => get().dismiss(id), duration);
    }
  },
  dismiss: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
  dismissAll: () => set({ toasts: [] }),
}));

// Convenience functions
export const showToast = (message: string, type?: ToastType, duration?: number) => 
  useToastStore.getState().show(message, type, duration);
export const showError = (message: string) => showToast(message, 'error', 4000);
export const showSuccess = (message: string) => showToast(message, 'success', 2500);
