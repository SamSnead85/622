'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

// Navigation Component
function Navigation({ activeTab }: { activeTab: string }) {
    const navItems = [
        { id: 'home', icon: '🏠', label: 'Home', href: '/dashboard' },
        { id: 'explore', icon: '🔍', label: 'Explore', href: '/explore' },
        { id: 'journeys', icon: '🎬', label: 'Journeys', href: '/journeys' },
        { id: 'campfire', icon: '🔥', label: 'Live', href: '/campfire' },
        { id: 'messages', icon: '💬', label: 'Messages', href: '/messages' },
    ];

    return (
        <>
            <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 xl:w-64 bg-black/40 backdrop-blur-xl border-r border-white/5 flex-col p-4 z-40">
                <Link href="/" className="flex items-center gap-3 px-3 py-4 mb-6">
                    <svg width="40" height="40" viewBox="0 0 40 40" className="flex-shrink-0">
                        <defs>
                            <linearGradient id="profile-nav-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#F59E0B" />
                                <stop offset="50%" stopColor="#F43F5E" />
                                <stop offset="100%" stopColor="#8B5CF6" />
                            </linearGradient>
                        </defs>
                        <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="url(#profile-nav-grad)" />
                        <text x="20" y="24" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">6</text>
                    </svg>
                    <span className="text-xl font-semibold bg-gradient-to-r from-amber-400 via-rose-400 to-violet-400 bg-clip-text text-transparent hidden xl:block">Six22</span>
                </Link>
                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => (
                        <Link key={item.id} href={item.href} className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>
                            <span className="text-2xl">{item.icon}</span>
                            <span className="font-medium hidden xl:block">{item.label}</span>
                        </Link>
                    ))}
                </nav>
            </aside>
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 z-50">
                <div className="flex items-center justify-around py-2">
                    {navItems.map((item) => (
                        <Link key={item.id} href={item.href} className={`flex flex-col items-center gap-1 p-2 ${activeTab === item.id ? 'text-white' : 'text-white/50'}`}>
                            <span className="text-xl">{item.icon}</span>
                            <span className="text-[10px]">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </nav>
        </>
    );
}

// User's posts
const userPosts = [
    { id: 1, image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop', likes: 1247 },
    { id: 2, image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=400&fit=crop', likes: 892 },
    { id: 3, image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=400&fit=crop', likes: 2150 },
    { id: 4, image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=400&fit=crop', likes: 1893 },
    { id: 5, image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop', likes: 3421 },
    { id: 6, image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop', likes: 756 },
    { id: 7, image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop', likes: 1567 },
    { id: 8, image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop', likes: 2890 },
    { id: 9, image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop', likes: 1234 },
];

export default function ProfilePage() {
    const [activeTab, setActiveTab] = useState<'posts' | 'journeys' | 'saved'>('posts');
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    if (!mounted) {
        return <div className="min-h-screen bg-[#050508]" />;
    }

    return (
        <div className="min-h-screen bg-[#050508] relative">
            {/* Ambient */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/3 w-96 h-96 rounded-full bg-orange-500/5 blur-[100px]" />
                <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-violet-500/5 blur-[100px]" />
            </div>

            <Navigation activeTab="profile" />

            <main className="relative z-10 lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
                {/* Profile Header */}
                <div className="relative">
                    {/* Cover Image */}
                    <div className="h-32 md:h-48 lg:h-56 bg-gradient-to-br from-orange-900/50 via-rose-900/50 to-violet-900/50 relative overflow-hidden">
                        <Image
                            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=400&fit=crop"
                            alt="Cover"
                            fill
                            className="object-cover opacity-50"
                        />
                    </div>

                    {/* Profile Info */}
                    <div className="max-w-4xl mx-auto px-4 lg:px-6">
                        <div className="relative -mt-16 md:-mt-20 flex flex-col md:flex-row md:items-end gap-4 pb-6 border-b border-white/10">
                            {/* Avatar */}
                            <motion.div
                                className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden relative ring-4 ring-[#050508] bg-[#050508]"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                            >
                                <Image
                                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face"
                                    alt="Profile"
                                    fill
                                    className="object-cover"
                                />
                            </motion.div>

                            {/* Info */}
                            <div className="flex-1">
                                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
                                    <h1 className="text-2xl md:text-3xl font-bold text-white">Abu Jawad</h1>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 rounded-full bg-white/10 text-white/70 text-sm">@abujawad</span>
                                        <span className="px-2 py-1 rounded-full bg-gradient-to-r from-orange-400 to-rose-500 text-white text-xs font-medium">PRO</span>
                                    </div>
                                </div>
                                <p className="text-white/60 mb-4 max-w-lg">Explorer. Creator. Building amazing things one day at a time. 🌍✨</p>

                                {/* Stats */}
                                <div className="flex items-center gap-6">
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-white">247</p>
                                        <p className="text-xs text-white/50">Posts</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-white">12.4K</p>
                                        <p className="text-xs text-white/50">Followers</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-white">892</p>
                                        <p className="text-xs text-white/50">Following</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Link
                                    href="/settings"
                                    className="px-6 py-2 rounded-full bg-white/10 text-white font-medium hover:bg-white/15 transition-colors"
                                >
                                    Edit Profile
                                </Link>
                                <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/15 transition-colors">
                                    ⚙️
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-white/10">
                            {(['posts', 'journeys', 'saved'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-4 text-center font-medium capitalize transition-colors relative ${activeTab === tab ? 'text-white' : 'text-white/50 hover:text-white/70'
                                        }`}
                                >
                                    {tab}
                                    {activeTab === tab && (
                                        <motion.div
                                            layoutId="profileTab"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-400 to-rose-500"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Content Grid */}
                        <div className="py-6">
                            <div className="grid grid-cols-3 gap-1 md:gap-2">
                                {userPosts.map((post, i) => (
                                    <motion.div
                                        key={post.id}
                                        className="relative aspect-square overflow-hidden rounded-lg cursor-pointer group"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.03 }}
                                        whileHover={{ scale: 1.02 }}
                                    >
                                        <Image
                                            src={post.image}
                                            alt={`Post ${post.id}`}
                                            fill
                                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white font-semibold flex items-center gap-1">
                                                🔥 {post.likes.toLocaleString()}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
