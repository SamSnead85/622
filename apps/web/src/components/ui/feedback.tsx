'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, useState, useEffect, createContext, useContext, useCallback } from 'react';

// ============================================
// MODAL & FEEDBACK COMPONENTS
// Six22 Silk Road Renaissance Overlays
// ============================================

// ============================================
// MODAL
// Centered dialog box
// ============================================

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    showClose?: boolean;
    className?: string;
}

export function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    size = 'md',
    showClose = true,
    className = '',
}: ModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
            return () => window.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, onClose]);

    const sizes = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        full: 'max-w-[90vw]',
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className={`
                            relative w-full ${sizes[size]}
                            bg-[#0a0a12] border border-white/10 rounded-2xl
                            shadow-2xl overflow-hidden
                            ${className}
                        `}
                    >
                        {(title || showClose) && (
                            <div className="flex items-center justify-between p-4 border-b border-white/10">
                                <div>
                                    {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
                                    {description && <p className="text-sm text-white/50 mt-0.5">{description}</p>}
                                </div>
                                {showClose && (
                                    <button
                                        onClick={onClose}
                                        className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="p-4">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

// ============================================
// SHEET (Bottom Sheet)
// Mobile-friendly bottom drawer
// ============================================

interface SheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    title?: string;
    height?: 'auto' | 'half' | 'full';
    className?: string;
}

export function Sheet({
    isOpen,
    onClose,
    children,
    title,
    height = 'auto',
    className = '',
}: SheetProps) {
    const heights = {
        auto: 'max-h-[90vh]',
        half: 'h-[50vh]',
        full: 'h-[90vh]',
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={`
                            absolute bottom-0 left-0 right-0
                            bg-[#0a0a12] border-t border-white/10 rounded-t-3xl
                            ${heights[height]}
                            ${className}
                        `}
                    >
                        {/* Handle */}
                        <div className="flex justify-center py-3">
                            <div className="w-12 h-1 bg-white/20 rounded-full" />
                        </div>

                        {title && (
                            <div className="px-4 pb-3 border-b border-white/10">
                                <h2 className="text-lg font-semibold text-white text-center">{title}</h2>
                            </div>
                        )}

                        <div className="overflow-y-auto p-4">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

// ============================================
// ALERT DIALOG
// Confirmation dialog
// ============================================

interface AlertDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'danger';
}

export function AlertDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'default',
}: AlertDialogProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" showClose={false}>
            <div className="text-center">
                <div className={`
                    w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center
                    ${variant === 'danger' ? 'bg-rose-500/20' : 'bg-violet-500/20'}
                `}>
                    {variant === 'danger' ? (
                        <svg className="w-6 h-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                </div>

                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                {description && <p className="text-white/60 mb-6">{description}</p>}

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className={`
                            flex-1 px-4 py-2.5 rounded-xl text-white transition-colors
                            ${variant === 'danger'
                                ? 'bg-rose-500 hover:bg-rose-600'
                                : 'bg-violet-500 hover:bg-violet-600'}
                        `}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ============================================
// TOAST SYSTEM
// Global notification toasts
// ============================================

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    description?: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast: Toast = { ...toast, id };

        setToasts(prev => [...prev, newToast]);

        const duration = toast.duration ?? 5000;
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const icons: Record<ToastType, ReactNode> = {
        success: (
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
        ),
        error: (
            <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        ),
        warning: (
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        ),
        info: (
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    };

    const bgColors: Record<ToastType, string> = {
        success: 'border-emerald-500/30 bg-emerald-500/10',
        error: 'border-rose-500/30 bg-rose-500/10',
        warning: 'border-amber-500/30 bg-amber-500/10',
        info: 'border-cyan-500/30 bg-cyan-500/10',
    };

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}

            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 100, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 100, scale: 0.9 }}
                            className={`
                                flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl
                                ${bgColors[toast.type]}
                            `}
                        >
                            <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-white">{toast.title}</p>
                                {toast.description && (
                                    <p className="text-sm text-white/60 mt-0.5">{toast.description}</p>
                                )}
                            </div>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="shrink-0 text-white/40 hover:text-white/60"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

// ============================================
// POPOVER
// Floating content panel
// ============================================

interface PopoverProps {
    trigger: ReactNode;
    children: ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    align?: 'start' | 'center' | 'end';
    className?: string;
}

export function Popover({
    trigger,
    children,
    position = 'bottom',
    align = 'center',
    className = '',
}: PopoverProps) {
    const [isOpen, setIsOpen] = useState(false);

    const positions = {
        top: 'bottom-full mb-2',
        bottom: 'top-full mt-2',
        left: 'right-full mr-2',
        right: 'left-full ml-2',
    };

    const alignments = {
        start: 'left-0',
        center: 'left-1/2 -translate-x-1/2',
        end: 'right-0',
    };

    return (
        <div className="relative inline-block">
            <div onClick={() => setIsOpen(!isOpen)}>
                {trigger}
            </div>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`
                                absolute z-50
                                ${positions[position]}
                                ${alignments[align]}
                                bg-[#0a0a12] border border-white/10 rounded-xl
                                shadow-xl overflow-hidden
                                ${className}
                            `}
                        >
                            {children}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// TOOLTIP
// Hover hint
// ============================================

interface TooltipProps {
    content: ReactNode;
    children: ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
}

export function Tooltip({
    content,
    children,
    position = 'top',
    delay = 300,
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

    const showTooltip = () => {
        const id = setTimeout(() => setIsVisible(true), delay);
        setTimeoutId(id);
    };

    const hideTooltip = () => {
        if (timeoutId) clearTimeout(timeoutId);
        setIsVisible(false);
    };

    const positions = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    return (
        <div
            className="relative inline-block"
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
        >
            {children}

            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`
                            absolute ${positions[position]}
                            px-2 py-1 bg-white/10 backdrop-blur-sm
                            text-sm text-white rounded-lg
                            whitespace-nowrap pointer-events-none
                            z-50
                        `}
                    >
                        {content}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// SKELETON
// Loading placeholder
// ============================================

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    variant?: 'text' | 'circular' | 'rectangular';
    className?: string;
}

export function Skeleton({
    width,
    height,
    variant = 'text',
    className = '',
}: SkeletonProps) {
    const variants = {
        text: 'rounded-lg',
        circular: 'rounded-full',
        rectangular: 'rounded-xl',
    };

    const defaultHeight = variant === 'text' ? '1em' : undefined;

    return (
        <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={`bg-white/10 ${variants[variant]} ${className}`}
            style={{
                width: width || '100%',
                height: height || defaultHeight,
            }}
        />
    );
}

// ============================================
// EMPTY STATE
// No content placeholder
// ============================================

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
    className?: string;
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    className = '',
}: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
            {icon && (
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-white/30">
                    {icon}
                </div>
            )}

            <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
            {description && <p className="text-white/50 max-w-sm mb-4">{description}</p>}
            {action}
        </div>
    );
}

// ============================================
// EXPORTS
// ============================================

export {
    type ModalProps,
    type SheetProps,
    type AlertDialogProps,
    type Toast,
    type ToastType,
    type PopoverProps,
    type TooltipProps,
    type SkeletonProps,
    type EmptyStateProps,
};
