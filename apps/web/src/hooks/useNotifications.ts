'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS, apiFetch } from '@/lib/api';
import { useSocket } from './useSocket';

// ============================================
// TYPES
// ============================================
export interface Notification {
    id: string;
    type: 'LIKE' | 'COMMENT' | 'FOLLOW' | 'MENTION' | 'MESSAGE' | 'COMMUNITY' | 'COMMUNITY_INVITE' | 'JOURNEY' | 'WAVE' | 'SYSTEM';
    message: string;
    read: boolean;
    actorId: string;
    actor: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
    };
    targetId?: string;
    targetType?: string;
    createdAt: string;
}

// ============================================
// NOTIFICATIONS HOOK
// ============================================
export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { on } = useSocket();

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await apiFetch(API_ENDPOINTS.notifications);

            if (response.ok) {
                const data = await response.json();
                const notifs = data.notifications || [];
                setNotifications(notifs);
                setUnreadCount(notifs.filter((n: Notification) => !n.read).length);
            } else {
                setError('Failed to load notifications');
            }
        } catch (err) {
            console.error('Error fetching notifications:', err);
            setError('Network error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Mark single notification as read
    const markAsRead = useCallback(async (notificationId: string) => {
        try {
            const response = await apiFetch(API_ENDPOINTS.notificationRead(notificationId), {
                method: 'PUT',
            });

            if (response.ok) {
                setNotifications((prev) =>
                    prev.map((n) =>
                        n.id === notificationId ? { ...n, read: true } : n
                    )
                );
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    }, []);

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        try {
            const response = await apiFetch(API_ENDPOINTS.notificationsReadAll, {
                method: 'PUT',
            });

            if (response.ok) {
                setNotifications((prev) =>
                    prev.map((n) => ({ ...n, read: true }))
                );
                setUnreadCount(0);
            }
        } catch (err) {
            console.error('Error marking all notifications as read:', err);
        }
    }, []);

    // Listen for real-time notifications
    useEffect(() => {
        const unsubscribe = on<Notification>('notification:new', (notification) => {
            setNotifications((prev) => [notification, ...prev]);
            setUnreadCount((prev) => prev + 1);
        });

        return () => {
            unsubscribe?.();
        };
    }, [on]);

    // Initial fetch
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    return {
        notifications,
        unreadCount,
        isLoading,
        error,
        markAsRead,
        markAllAsRead,
        refetch: fetchNotifications,
    };
}
