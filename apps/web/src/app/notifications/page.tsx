'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { Navigation } from '@/components/Navigation';
import { HeartIcon, UserIcon, MessageIcon, BellIcon, UsersIcon, VideoIcon } from '@/components/icons';
import React from 'react';


// Mock notifications for fallback
const MOCK_NOTIFICATIONS = [
    { id: '1', type: 'LIKE' as const, message: 'liked your photo', read: false, actorId: '1', actor: { id: '1', username: 'sarah_chen', displayName: 'Sarah Chen', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face' }, createdAt: new Date().toISOString() },
    { id: '2', type: 'FOLLOW' as const, message: 'started following you', read: false, actorId: '2', actor: { id: '2', username: 'marcus_j', displayName: 'Marcus Johnson', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face' }, createdAt: new Date().toISOString() },
    { id: '3', type: 'COMMENT' as const, message: 'commented: "Amazing shot! 📸"', read: false, actorId: '3', actor: { id: '3', username: 'emily_park', displayName: 'Emily Park', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face' }, createdAt: new Date().toISOString() },
    { id: '4', type: 'MENTION' as const, message: 'mentioned you in a post', read: true, actorId: '4', actor: { id: '4', username: 'jordan_lee', displayName: 'Jordan Lee', avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=face' }, createdAt: new Date().toISOString() },
];

function getNotificationIcon(type: Notification['type']): React.ReactNode {
    const iconProps = { size: 14, className: 'text-white' };
    switch (type) {
        case 'LIKE': return <HeartIcon {...iconProps} />;
        case 'FOLLOW': return <UserIcon {...iconProps} />;
        case 'COMMENT': return <MessageIcon {...iconProps} />;
        case 'MENTION': return <span className="text-white text-xs font-bold">@</span>;
        case 'MESSAGE': return <MessageIcon {...iconProps} />;
        case 'COMMUNITY': return <UsersIcon {...iconProps} />;
        case 'JOURNEY': return <VideoIcon {...iconProps} />;
        default: return <BellIcon {...iconProps} />;
    }
}

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
}

export default function NotificationsPage() {
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [mounted, setMounted] = useState(false);
    const { notifications: apiNotifications, isLoading, error, markAsRead, markAllAsRead } = useNotifications();

    useEffect(() => { setMounted(true); }, []);

    // Use API data or fall back to mock
    const notifications = apiNotifications.length > 0 ? apiNotifications : MOCK_NOTIFICATIONS;

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications;

    if (!mounted) return <div className="min-h-screen bg-[#050508]" />;

    return (
        <div className="min-h-screen bg-[#050508] relative">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/3 left-1/4 w-80 h-80 rounded-full bg-orange-500/5 blur-[100px]" />
            </div>

            <Navigation activeTab="notifications" />

            <main className="relative z-10 lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
                {/* Header */}
                <header className="sticky top-0 z-30 px-4 lg:px-6 py-4 bg-black/60 backdrop-blur-xl border-b border-white/5">
                    <div className="max-w-2xl mx-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-xl font-bold text-white">Notifications</h1>
                            <button
                                onClick={markAllAsRead}
                                className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
                            >
                                Mark all as read
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'all' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/15'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilter('unread')}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'unread' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/15'}`}
                            >
                                Unread
                            </button>
                        </div>
                    </div>
                </header>

                {/* Loading State */}
                {isLoading && (
                    <div className="py-20 text-center">
                        <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-white/50">Loading notifications...</p>
                    </div>
                )}

                {/* Error State */}
                {error && !isLoading && (
                    <div className="py-20 text-center">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                            <BellIcon size={28} className="text-amber-400" />
                        </div>
                        <p className="text-white/50">{error}</p>
                    </div>
                )}

                {/* Notifications List */}
                {!isLoading && !error && (
                    <div className="max-w-2xl mx-auto">
                        {filteredNotifications.length === 0 ? (
                            <div className="py-20 text-center">
                                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                                    <BellIcon size={28} className="text-white/40" />
                                </div>
                                <p className="text-white/50">No unread notifications</p>
                            </div>
                        ) : (
                            filteredNotifications.map((notif, i) => (
                                <motion.div
                                    key={notif.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    onClick={() => !notif.read && markAsRead(notif.id)}
                                    className={`flex items-center gap-3 p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${!notif.read ? 'bg-white/[0.02]' : ''}`}
                                >
                                    {/* Icon/Avatar */}
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full overflow-hidden relative">
                                            <Image
                                                src={notif.actor?.avatarUrl || '/placeholder-avatar.png'}
                                                alt={notif.actor?.displayName || 'User'}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#050508] flex items-center justify-center text-sm">
                                            {getNotificationIcon(notif.type)}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white">
                                            <span className="font-semibold">{notif.actor?.displayName || 'Someone'}</span>
                                            {' '}{notif.message}
                                        </p>
                                        <p className="text-sm text-white/40">{formatTimeAgo(notif.createdAt)}</p>
                                    </div>

                                    {/* Follow button for follow notifications */}
                                    {notif.type === 'FOLLOW' && (
                                        <button className="px-4 py-1.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors">
                                            Follow
                                        </button>
                                    )}

                                    {/* Unread indicator */}
                                    {!notif.read && (
                                        <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                                    )}
                                </motion.div>
                            ))
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
