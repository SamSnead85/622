'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon, CheckCircleIcon } from '@/components/icons';

// ============================================
// TYPES
// ============================================

export interface MobileNavItem {
    id: string;
    label: string;
    icon: string;
    href: string;
    badge?: number;
    isActive?: boolean;
}

export interface PushNotification {
    id: string;
    title: string;
    body: string;
    icon?: string;
    action?: string;
    timestamp: Date;
    isRead: boolean;
}

// ============================================
// BOTTOM NAVIGATION
// ============================================

interface BottomNavProps {
    items: MobileNavItem[];
    onNavigate: (id: string) => void;
}

export function BottomNav({ items, onNavigate }: BottomNavProps) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0F]/95 backdrop-blur-lg border-t border-white/10 safe-bottom">
            <div className="flex justify-around items-center h-16 px-2">
                {items.map(item => (
                    <button key={item.id} onClick={() => onNavigate(item.id)}
                        className={`relative flex flex-col items-center justify-center flex-1 h-full ${item.isActive ? 'text-cyan-400' : 'text-white/50'}`}>
                        <span className="text-2xl">{item.icon}</span>
                        <span className="text-[10px] mt-0.5">{item.label}</span>
                        {item.badge && item.badge > 0 && (
                            <span className="absolute top-1 right-1/4 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                                {item.badge > 99 ? '99+' : item.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </nav>
    );
}

// ============================================
// PULL TO REFRESH
// ============================================

interface PullToRefreshProps {
    children: React.ReactNode;
    onRefresh: () => Promise<void>;
}

export function PullToRefresh({ children, onRefresh }: PullToRefreshProps) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const threshold = 80;

    const handleTouchMove = (e: React.TouchEvent) => {
        if (window.scrollY === 0) {
            const touch = e.touches[0];
            const start = (e.target as HTMLElement).getBoundingClientRect().top;
            const distance = Math.max(0, touch.clientY - start);
            setPullDistance(Math.min(distance, threshold * 1.5));
        }
    };

    const handleTouchEnd = async () => {
        if (pullDistance >= threshold && !isRefreshing) {
            setIsRefreshing(true);
            try { await onRefresh(); }
            finally { setIsRefreshing(false); }
        }
        setPullDistance(0);
    };

    return (
        <div onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
            <div className="flex items-center justify-center overflow-hidden transition-all" style={{ height: isRefreshing ? 50 : pullDistance * 0.5 }}>
                <motion.div animate={{ rotate: isRefreshing ? 360 : pullDistance * 2 }} transition={{ duration: isRefreshing ? 1 : 0, repeat: isRefreshing ? Infinity : 0 }}
                    className="w-6 h-6 rounded-full border-2 border-cyan-400 border-t-transparent" />
            </div>
            {children}
        </div>
    );
}

// ============================================
// SWIPEABLE ACTIONS
// ============================================

interface SwipeableItemProps {
    children: React.ReactNode;
    leftActions?: { icon: string; color: string; onAction: () => void }[];
    rightActions?: { icon: string; color: string; onAction: () => void }[];
}

export function SwipeableItem({ children, leftActions, rightActions }: SwipeableItemProps) {
    const [offset, setOffset] = useState(0);
    const [startX, setStartX] = useState(0);

    const handleTouchStart = (e: React.TouchEvent) => setStartX(e.touches[0].clientX);

    const handleTouchMove = (e: React.TouchEvent) => {
        const diff = e.touches[0].clientX - startX;
        const maxOffset = (leftActions?.length || 0) * 60;
        const minOffset = -((rightActions?.length || 0) * 60);
        setOffset(Math.max(minOffset, Math.min(maxOffset, diff)));
    };

    const handleTouchEnd = () => {
        if (Math.abs(offset) < 30) setOffset(0);
        else if (offset > 0 && leftActions) setOffset(leftActions.length * 60);
        else if (offset < 0 && rightActions) setOffset(-(rightActions.length * 60));
    };

    return (
        <div className="relative overflow-hidden">
            {leftActions && (
                <div className="absolute left-0 top-0 bottom-0 flex">
                    {leftActions.map((action, i) => (
                        <button key={i} onClick={action.onAction} className={`w-[60px] flex items-center justify-center bg-${action.color}-500`}>
                            <span className="text-2xl">{action.icon}</span>
                        </button>
                    ))}
                </div>
            )}
            {rightActions && (
                <div className="absolute right-0 top-0 bottom-0 flex">
                    {rightActions.map((action, i) => (
                        <button key={i} onClick={action.onAction} className={`w-[60px] flex items-center justify-center bg-${action.color}-500`}>
                            <span className="text-2xl">{action.icon}</span>
                        </button>
                    ))}
                </div>
            )}
            <motion.div animate={{ x: offset }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
                className="relative bg-[#0A0A0F]">{children}</motion.div>
        </div>
    );
}

// ============================================
// TOAST NOTIFICATION
// ============================================

interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
    onClose: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-cyan-500', warning: 'bg-yellow-500' };
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };

    return (
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-20 left-4 right-4 z-50 flex items-center gap-3 p-4 rounded-xl ${colors[type]} text-white shadow-lg`}>
            <span className="text-lg">{icons[type]}</span>
            <span className="flex-1">{message}</span>
            <button onClick={onClose}><CloseIcon size={16} /></button>
        </motion.div>
    );
}

// ============================================
// ACTION SHEET
// ============================================

interface ActionSheetProps {
    isOpen: boolean;
    title?: string;
    actions: { label: string; icon?: string; destructive?: boolean; onAction: () => void }[];
    onClose: () => void;
}

export function ActionSheet({ isOpen, title, actions, onClose }: ActionSheetProps) {
    if (!isOpen) return null;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                className="w-full bg-[#1A1A1F] rounded-t-2xl safe-bottom" onClick={e => e.stopPropagation()}>
                {title && <p className="text-center text-white/50 text-sm py-4 border-b border-white/10">{title}</p>}
                <div className="py-2">
                    {actions.map((action, i) => (
                        <button key={i} onClick={() => { action.onAction(); onClose(); }}
                            className={`w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-white/10 ${action.destructive ? 'text-red-400' : 'text-white'}`}>
                            {action.icon && <span className="text-xl">{action.icon}</span>}
                            <span>{action.label}</span>
                        </button>
                    ))}
                </div>
                <button onClick={onClose} className="w-full py-4 border-t border-white/10 text-white/50 hover:bg-white/10">Cancel</button>
            </motion.div>
        </motion.div>
    );
}

// ============================================
// FLOATING ACTION BUTTON
// ============================================

interface FABProps {
    icon?: string;
    actions?: { icon: string; label: string; onAction: () => void }[];
    onClick?: () => void;
}

export function FloatingActionButton({ icon = '+', actions, onClick }: FABProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleClick = () => {
        if (actions) setIsExpanded(!isExpanded);
        else onClick?.();
    };

    return (
        <div className="fixed bottom-20 right-4 z-40">
            <AnimatePresence>
                {isExpanded && actions && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-16 right-0 flex flex-col-reverse gap-2 mb-2">
                        {actions.map((action, i) => (
                            <motion.button key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 }}
                                onClick={() => { action.onAction(); setIsExpanded(false); }}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1A1F] border border-white/10 text-white shadow-lg">
                                <span>{action.icon}</span>
                                <span className="text-sm">{action.label}</span>
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
            <motion.button onClick={handleClick} whileTap={{ scale: 0.9 }} animate={{ rotate: isExpanded ? 45 : 0 }}
                className="w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-2xl shadow-lg flex items-center justify-center">
                {icon}
            </motion.button>
        </div>
    );
}

export default BottomNav;
