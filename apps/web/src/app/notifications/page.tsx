'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

// Navigation
function Navigation({ activeTab }: { activeTab: string }) {
    const navItems = [
        { id: 'home', icon: '🏠', label: 'Home', href: '/dashboard' },
        { id: 'explore', icon: '🔍', label: 'Explore', href: '/explore' },
        { id: 'journeys', icon: '🎬', label: 'Journeys', href: '/journeys' },
        { id: 'campfire', icon: '🔥', label: 'Live', href: '/campfire' },
        { id: 'messages', icon: '💬', label: 'Messages', href: '/messages' },
    ];

    return (
        <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 xl:w-64 bg-black/40 backdrop-blur-xl border-r border-white/5 flex-col p-4 z-40">
            <Link href="/" className="flex items-center gap-3 px-3 py-4 mb-6">
                <svg width="40" height="40" viewBox="0 0 40 40" className="flex-shrink-0">
                    <defs>
                        <linearGradient id="notif-nav-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#F59E0B" />
                            <stop offset="50%" stopColor="#F43F5E" />
                            <stop offset="100%" stopColor="#8B5CF6" />
                        </linearGradient>
                    </defs>
                    <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="url(#notif-nav-grad)" />
                    <text x="20" y="24" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">6</text>
                </svg>
                <span className="text-xl font-semibold bg-gradient-to-r from-amber-400 via-rose-400 to-violet-400 bg-clip-text text-transparent hidden xl:block">Six22</span>
            </Link>
            <nav className="flex-1 space-y-2">
                {navItems.map((item) => (
                    <Link key={item.id} href={item.href} className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'}`}>
                        <span className="text-2xl">{item.icon}</span>
                        <span className="font-medium hidden xl:block">{item.label}</span>
                    </Link>
                ))}
            </nav>
        </aside>
    );
}

// Notification types
const notifications = [
    { id: 1, type: 'like', user: 'Sarah Chen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face', action: 'liked your photo', time: '2m', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100&h=100&fit=crop', read: false },
    { id: 2, type: 'follow', user: 'Marcus Johnson', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', action: 'started following you', time: '15m', read: false },
    { id: 3, type: 'comment', user: 'Emily Park', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face', action: 'commented: "Amazing shot! 📸"', time: '1h', image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=100&h=100&fit=crop', read: false },
    { id: 4, type: 'mention', user: 'Jordan Lee', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=face', action: 'mentioned you in a post', time: '3h', read: true },
    { id: 5, type: 'like', user: 'Alex Rivera', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face', action: 'and 12 others liked your journey', time: '5h', image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=100&h=100&fit=crop', read: true },
    { id: 6, type: 'live', user: 'Casey Morgan', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face', action: 'went live: "Sunday vibes"', time: '1d', read: true },
    { id: 7, type: 'follow', user: 'Omar Hassan', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face', action: 'and 5 others started following you', time: '2d', read: true },
];

export default function NotificationsPage() {
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

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
                            <button className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
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

                {/* Notifications List */}
                <div className="max-w-2xl mx-auto">
                    {filteredNotifications.length === 0 ? (
                        <div className="py-20 text-center">
                            <span className="text-5xl mb-4 block">🔔</span>
                            <p className="text-white/50">No unread notifications</p>
                        </div>
                    ) : (
                        filteredNotifications.map((notif, i) => (
                            <motion.div
                                key={notif.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className={`flex items-center gap-3 p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${!notif.read ? 'bg-white/[0.02]' : ''}`}
                            >
                                {/* Icon/Avatar */}
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full overflow-hidden relative">
                                        <Image src={notif.avatar} alt={notif.user} fill className="object-cover" />
                                    </div>
                                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#050508] flex items-center justify-center text-sm">
                                        {notif.type === 'like' && '🔥'}
                                        {notif.type === 'follow' && '👤'}
                                        {notif.type === 'comment' && '💬'}
                                        {notif.type === 'mention' && '@'}
                                        {notif.type === 'live' && '🔴'}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-white">
                                        <span className="font-semibold">{notif.user}</span>
                                        {' '}{notif.action}
                                    </p>
                                    <p className="text-sm text-white/40">{notif.time}</p>
                                </div>

                                {/* Post thumbnail or action */}
                                {notif.image && (
                                    <div className="w-12 h-12 rounded-lg overflow-hidden relative flex-shrink-0">
                                        <Image src={notif.image} alt="Post" fill className="object-cover" />
                                    </div>
                                )}

                                {notif.type === 'follow' && (
                                    <button className="px-4 py-1.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors">
                                        Follow
                                    </button>
                                )}

                                {notif.type === 'live' && (
                                    <button className="px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 text-white text-sm font-medium hover:opacity-90 transition-opacity">
                                        Watch
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
            </main>
        </div>
    );
}
