'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// TYPES
// ============================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastContextValue {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => string;
    removeToast: (id: string) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
}

// ============================================
// CONTEXT
// ============================================

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

// ============================================
// TOAST ITEM
// ============================================

const toastConfig: Record<ToastType, { icon: string; bg: string; border: string }> = {
    success: { icon: '✓', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
    error: { icon: '✕', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    warning: { icon: '⚠', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    info: { icon: 'ℹ', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
};

interface ToastItemProps {
    toast: Toast;
    onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
    const config = toastConfig[toast.type];

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`
                flex items-start gap-3 p-4 rounded-xl border backdrop-blur-sm
                ${config.bg} ${config.border}
                shadow-lg shadow-black/20
            `}
        >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-sm">
                {config.icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-white">{toast.title}</p>
                {toast.message && (
                    <p className="text-sm text-white/60 mt-0.5">{toast.message}</p>
                )}
                {toast.action && (
                    <button
                        onClick={() => {
                            toast.action?.onClick();
                            onRemove(toast.id);
                        }}
                        className="mt-2 text-sm text-cyan-400 hover:text-cyan-300"
                    >
                        {toast.action.label}
                    </button>
                )}
            </div>
            <button
                onClick={() => onRemove(toast.id)}
                className="flex-shrink-0 p-1 text-white/40 hover:text-white transition-colors"
            >
                ✕
            </button>
        </motion.div>
    );
}

// ============================================
// TOAST PROVIDER
// ============================================

interface ToastProviderProps {
    children: ReactNode;
    maxToasts?: number;
    defaultDuration?: number;
}

export function ToastProvider({
    children,
    maxToasts = 5,
    defaultDuration = 5000,
}: ToastProviderProps) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback(
        (toast: Omit<Toast, 'id'>) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const duration = toast.duration ?? defaultDuration;

            setToasts((prev) => {
                const next = [...prev, { ...toast, id }];
                return next.slice(-maxToasts);
            });

            if (duration > 0) {
                setTimeout(() => removeToast(id), duration);
            }

            return id;
        },
        [defaultDuration, maxToasts, removeToast]
    );

    const success = useCallback(
        (title: string, message?: string) => addToast({ type: 'success', title, message }),
        [addToast]
    );

    const error = useCallback(
        (title: string, message?: string) => addToast({ type: 'error', title, message }),
        [addToast]
    );

    const warning = useCallback(
        (title: string, message?: string) => addToast({ type: 'warning', title, message }),
        [addToast]
    );

    const info = useCallback(
        (title: string, message?: string) => addToast({ type: 'info', title, message }),
        [addToast]
    );

    return (
        <ToastContext.Provider
            value={{ toasts, addToast, removeToast, success, error, warning, info }}
        >
            {children}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
                <AnimatePresence mode="popLayout">
                    {toasts.map((toast) => (
                        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export default ToastProvider;
