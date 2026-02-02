'use client';

import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useState, useEffect, useRef, ReactNode, useCallback } from 'react';

// ============================================
// MODAL - Premium overlay dialog
// ============================================
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    showClose?: boolean;
    className?: string;
}

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showClose = true,
    className = '',
}: ModalProps) {
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-[95vw] max-h-[95vh]',
    };

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

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    {/* Modal Content */}
                    <motion.div
                        className={`
                            relative w-full ${sizeClasses[size]} bg-[#0a0a0f] border border-white/10
                            overflow-hidden ${className}
                        `}
                        style={{
                            clipPath: 'polygon(20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px), 0 20px)',
                        }}
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 20, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        {/* Header */}
                        {(title || showClose) && (
                            <div className="flex items-center justify-between p-4 border-b border-white/10">
                                {title && (
                                    <h2 className="text-lg font-semibold text-white">{title}</h2>
                                )}
                                {showClose && (
                                    <button
                                        onClick={onClose}
                                        className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Body */}
                        <div className="p-4">
                            {children}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ============================================
// BOTTOM SHEET - Mobile-friendly drawer
// ============================================
interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    title?: string;
    snapPoints?: number[];
    className?: string;
}

export function BottomSheet({
    isOpen,
    onClose,
    children,
    title,
    snapPoints = [0.5, 1],
    className = '',
}: BottomSheetProps) {
    const [currentSnap, setCurrentSnap] = useState(0);
    const y = useMotionValue(0);

    const handleDragEnd = (_: unknown, info: PanInfo) => {
        const velocity = info.velocity.y;
        const offset = info.offset.y;

        if (velocity > 500 || offset > 100) {
            onClose();
        } else if (velocity < -500 || offset < -100) {
            setCurrentSnap(Math.min(currentSnap + 1, snapPoints.length - 1));
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    {/* Sheet */}
                    <motion.div
                        className={`fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0f] border-t border-white/10 rounded-t-3xl ${className}`}
                        style={{ y, maxHeight: `${snapPoints[currentSnap] * 100}vh` }}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.2}
                        onDragEnd={handleDragEnd}
                    >
                        {/* Handle */}
                        <div className="flex justify-center py-3">
                            <div className="w-10 h-1 bg-white/30 rounded-full" />
                        </div>

                        {/* Title */}
                        {title && (
                            <div className="px-4 pb-2 border-b border-white/10">
                                <h3 className="text-lg font-semibold text-white text-center">{title}</h3>
                            </div>
                        )}

                        {/* Content */}
                        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100% - 60px)' }}>
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ============================================
// TOAST - Notification popup
// ============================================
interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
}

interface ToastProps {
    toast: Toast;
    onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(toast.id);
        }, toast.duration || 5000);

        return () => clearTimeout(timer);
    }, [toast, onDismiss]);

    const typeStyles = {
        success: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
        error: 'bg-red-500/20 border-red-500/30 text-red-400',
        warning: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
        info: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    };

    const icons = {
        success: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
        ),
        error: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
        ),
        warning: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        ),
        info: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl ${typeStyles[toast.type]}`}
        >
            {icons[toast.type]}
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
                onClick={() => onDismiss(toast.id)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </motion.div>
    );
}

export function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <div key={toast.id} className="pointer-events-auto">
                        <ToastItem toast={toast} onDismiss={onDismiss} />
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// TABS - Premium tab navigation
// ============================================
interface Tab {
    id: string;
    label: string;
    icon?: ReactNode;
    badge?: number;
}

interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onChange: (id: string) => void;
    variant?: 'default' | 'pills' | 'underline';
    className?: string;
}

export function Tabs({
    tabs,
    activeTab,
    onChange,
    variant = 'default',
    className = '',
}: TabsProps) {
    const containerClasses = {
        default: 'bg-white/5 p-1 rounded-xl',
        pills: 'gap-2',
        underline: 'border-b border-white/10 gap-4',
    };

    const tabClasses = {
        default: {
            base: 'px-4 py-2 rounded-lg text-sm font-medium',
            active: 'bg-gradient-to-r from-amber-500 via-rose-500 to-violet-500 text-white',
            inactive: 'text-white/60 hover:text-white hover:bg-white/10',
        },
        pills: {
            base: 'px-4 py-2 rounded-full text-sm font-medium border',
            active: 'bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-violet-500/20 border-amber-500/30 text-white',
            inactive: 'border-white/10 text-white/60 hover:text-white hover:border-white/30',
        },
        underline: {
            base: 'pb-3 text-sm font-medium relative',
            active: 'text-white',
            inactive: 'text-white/60 hover:text-white',
        },
    };

    return (
        <div className={`flex ${containerClasses[variant]} ${className}`}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`
                        ${tabClasses[variant].base}
                        ${activeTab === tab.id ? tabClasses[variant].active : tabClasses[variant].inactive}
                        transition-all flex items-center gap-2
                    `}
                >
                    {tab.icon}
                    {tab.label}
                    {tab.badge !== undefined && tab.badge > 0 && (
                        <span className="px-1.5 py-0.5 text-xs bg-rose-500 text-white rounded-full">
                            {tab.badge > 99 ? '99+' : tab.badge}
                        </span>
                    )}
                    {variant === 'underline' && activeTab === tab.id && (
                        <motion.div
                            layoutId="tab-indicator"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 via-rose-400 to-violet-400"
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                    )}
                </button>
            ))}
        </div>
    );
}

// ============================================
// INPUT - Premium form input
// ============================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    icon?: ReactNode;
    iconPosition?: 'left' | 'right';
}

export function Input({
    label,
    error,
    hint,
    icon,
    iconPosition = 'left',
    className = '',
    ...props
}: InputProps) {
    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-sm font-medium text-white/70">
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && iconPosition === 'left' && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                        {icon}
                    </div>
                )}
                <input
                    className={`
                        w-full px-4 py-3 bg-white/5 border rounded-xl text-white
                        placeholder:text-white/30
                        focus:outline-none focus:border-amber-500/50 focus:bg-white/[0.07]
                        transition-all
                        ${icon && iconPosition === 'left' ? 'pl-11' : ''}
                        ${icon && iconPosition === 'right' ? 'pr-11' : ''}
                        ${error ? 'border-red-500/50' : 'border-white/10'}
                        ${className}
                    `}
                    {...props}
                />
                {icon && iconPosition === 'right' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
                        {icon}
                    </div>
                )}
            </div>
            {error && (
                <p className="text-sm text-red-400">{error}</p>
            )}
            {hint && !error && (
                <p className="text-sm text-white/40">{hint}</p>
            )}
        </div>
    );
}

// ============================================
// SWITCH - Toggle component
// ============================================
interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
    size?: 'sm' | 'md';
    className?: string;
}

export function Switch({
    checked,
    onChange,
    label,
    disabled = false,
    size = 'md',
    className = '',
}: SwitchProps) {
    const sizeClasses = {
        sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4' },
        md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translate: 'translate-x-5' },
    };

    return (
        <label className={`inline-flex items-center gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={`
                    relative rounded-full transition-colors
                    ${sizeClasses[size].track}
                    ${checked ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-white/20'}
                `}
            >
                <motion.span
                    className={`
                        absolute top-0.5 left-0.5 bg-white rounded-full shadow-lg
                        ${sizeClasses[size].thumb}
                    `}
                    animate={{ x: checked ? (size === 'sm' ? 16 : 20) : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
            </button>
            {label && (
                <span className="text-sm text-white/70">{label}</span>
            )}
        </label>
    );
}

// ============================================
// DROPDOWN - Select menu
// ============================================
interface DropdownOption {
    value: string;
    label: string;
    icon?: ReactNode;
}

interface DropdownProps {
    options: DropdownOption[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
}

export function Dropdown({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    label,
    className = '',
}: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const selected = options.find((o) => o.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={ref} className={`relative ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-white/70 mb-1.5">
                    {label}
                </label>
            )}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl
                    text-left flex items-center justify-between
                    hover:bg-white/[0.07] transition-colors
                    ${isOpen ? 'border-amber-500/50' : ''}
                `}
            >
                <span className={selected ? 'text-white' : 'text-white/40'}>
                    {selected ? (
                        <span className="flex items-center gap-2">
                            {selected.icon}
                            {selected.label}
                        </span>
                    ) : (
                        placeholder
                    )}
                </span>
                <svg
                    className={`w-5 h-5 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0f] border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl"
                    >
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`
                                    w-full px-4 py-3 text-left flex items-center gap-2
                                    hover:bg-white/10 transition-colors
                                    ${option.value === value ? 'text-amber-400 bg-amber-500/10' : 'text-white'}
                                `}
                            >
                                {option.icon}
                                {option.label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
