'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// NOTIFICATION BADGE
// Animated badge for notification counts
// ============================================

interface NotificationBadgeProps {
    count: number;
    max?: number;
    pulse?: boolean;
    className?: string;
}

export function NotificationBadge({ count, max = 99, pulse = false, className = '' }: NotificationBadgeProps) {
    if (count <= 0) return null;

    const displayCount = count > max ? `${max}+` : count.toString();

    return (
        <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-semibold ${pulse ? 'animate-pulse' : ''
                } ${className}`}
        >
            {displayCount}
        </motion.span>
    );
}

// ============================================
// NOTIFICATION SOUND
// Play sound on new notifications
// ============================================

const NOTIFICATION_SOUNDS = {
    default: '/sounds/notification.mp3',
    message: '/sounds/message.mp3',
    like: '/sounds/like.mp3',
    follow: '/sounds/follow.mp3',
};

export function useNotificationSound(enabled: boolean = true) {
    const play = useCallback((type: keyof typeof NOTIFICATION_SOUNDS = 'default') => {
        if (!enabled) return;

        try {
            const audio = new Audio(NOTIFICATION_SOUNDS[type]);
            audio.volume = 0.5;
            audio.play().catch(() => {
                // Ignore autoplay errors
            });
        } catch {
            // Ignore audio errors
        }
    }, [enabled]);

    return { play };
}

// ============================================
// PUSH NOTIFICATION PERMISSION
// Request and manage push notification permissions
// ============================================

export function usePushNotifications() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        if ('Notification' in window) {
            setIsSupported(true);
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = useCallback(async () => {
        if (!isSupported) return false;

        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            return result === 'granted';
        } catch {
            return false;
        }
    }, [isSupported]);

    const showNotification = useCallback((title: string, options?: NotificationOptions) => {
        if (permission !== 'granted') return;

        try {
            new Notification(title, {
                icon: '/icons/icon-192x192.png',
                badge: '/icons/badge.png',
                ...options,
            });
        } catch {
            // Ignore notification errors
        }
    }, [permission]);

    return { permission, isSupported, requestPermission, showNotification };
}

// ============================================
// NOTIFICATION PREFERENCES
// Manage notification settings
// ============================================

interface NotificationPreferences {
    push: boolean;
    email: boolean;
    sound: boolean;
    vibration: boolean;
    likes: boolean;
    comments: boolean;
    follows: boolean;
    mentions: boolean;
    messages: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
    push: true,
    email: true,
    sound: true,
    vibration: true,
    likes: true,
    comments: true,
    follows: true,
    mentions: true,
    messages: true,
};

const PREFERENCES_KEY = '0g_notification_preferences';

export function useNotificationPreferences() {
    const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);

    useEffect(() => {
        const saved = localStorage.getItem(PREFERENCES_KEY);
        if (saved) {
            try {
                setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(saved) });
            } catch {
                setPreferences(DEFAULT_PREFERENCES);
            }
        }
    }, []);

    const updatePreference = useCallback(<K extends keyof NotificationPreferences>(
        key: K,
        value: NotificationPreferences[K]
    ) => {
        setPreferences(prev => {
            const updated = { ...prev, [key]: value };
            localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    return { preferences, updatePreference };
}

// ============================================
// NOTIFICATION CENTER
// Slide-out notification panel
// ============================================

interface Notification {
    id: string;
    type: 'like' | 'comment' | 'follow' | 'mention' | 'message' | 'system' | 'WAVE';
    title: string;
    body: string;
    avatarUrl?: string;
    createdAt: string;
    isRead: boolean;
    actionUrl?: string;
}

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: Notification[];
    onNotificationClick: (notification: Notification) => void;
    onMarkAllRead: () => void;
    loading?: boolean;
}

export function NotificationCenter({
    isOpen,
    onClose,
    notifications,
    onNotificationClick,
    onMarkAllRead,
    loading = false,
}: NotificationCenterProps) {
    const unreadCount = notifications.filter(n => !n.isRead).length;

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'like': return '❤️';
            case 'comment': return '💬';
            case 'follow': return '👤';
            case 'mention': return '@';
            case 'message': return '✉️';
            case 'system': return '🔔';
            case 'WAVE': return '👋';
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#1A1A1F] border-l border-white/10 z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-white">Notifications</h2>
                                {unreadCount > 0 && (
                                    <p className="text-xs text-white/50">{unreadCount} unread</p>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={onMarkAllRead}
                                        className="text-sm text-[#D4AF37] hover:underline"
                                    >
                                        Mark all read
                                    </button>
                                )}
                                <button onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="p-4 space-y-4">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="flex gap-3 animate-pulse">
                                            <div className="w-10 h-10 rounded-full bg-white/10" />
                                            <div className="flex-1">
                                                <div className="h-4 w-3/4 rounded bg-white/10 mb-2" />
                                                <div className="h-3 w-1/2 rounded bg-white/5" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                    <span className="text-4xl mb-3">🔔</span>
                                    <p className="text-white/50">No notifications yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {notifications.map((notification) => (
                                        <button
                                            key={notification.id}
                                            onClick={() => onNotificationClick(notification)}
                                            className={`w-full flex items-start gap-3 p-4 hover:bg-white/5 transition-colors text-left ${!notification.isRead ? 'bg-[#D4AF37]/5' : ''
                                                }`}
                                        >
                                            <div className="relative flex-shrink-0">
                                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                                    <span className="text-lg">{getIcon(notification.type)}</span>
                                                </div>
                                                {!notification.isRead && (
                                                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#D4AF37]" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white font-medium">{notification.title}</p>
                                                <p className="text-sm text-white/60 line-clamp-2">{notification.body}</p>
                                                <span className="text-xs text-white/40">{formatTime(notification.createdAt)}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
