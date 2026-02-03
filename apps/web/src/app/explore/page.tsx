'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth, ProtectedRoute } from '@/contexts/AuthContext';

// Shared Navigation Component
function Navigation({ activeTab, userAvatarUrl, displayName, username }: { activeTab: string; userAvatarUrl?: string; displayName?: string; username?: string }) {
    const avatarHref = userAvatarUrl && !userAvatarUrl.startsWith('preset:') ? userAvatarUrl : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face';
    const navItems = [
        { id: 'home', icon: '🏠', label: 'Home', href: '/dashboard' },
        { id: 'explore', icon: '🔍', label: 'Explore', href: '/explore' },
        { id: 'communities', icon: '👥', label: 'Tribes', href: '/communities' },
        { id: 'invite', icon: '🚀', label: 'Invite', href: '/invite' },
        { id: 'messages', icon: '💬', label: 'Messages', href: '/messages' },
    ];

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 xl:w-64 bg-[#0A0A0F]/95 backdrop-blur-xl border-r border-white/5 flex-col p-4 z-40">
                <Link href="/" className="flex items-center gap-3 px-3 py-4 mb-6">
                    <div className="font-bold text-2xl tracking-tight">
                        <span className="text-[#00D4FF]">0</span>
                        <span className="text-white">G</span>
                    </div>
                    <span className="text-white/60 text-sm font-medium hidden xl:block">Zero Gravity</span>
                </Link>

                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === item.id
                                ? 'bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20'
                                : 'text-white/60 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <span className="text-2xl">{item.icon}</span>
                            <span className="font-medium hidden xl:block">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <Link href="/profile" className="flex items-center gap-3 px-3 py-4 mt-4 border-t border-white/10">
                    <div className="w-10 h-10 rounded-full overflow-hidden relative ring-2 ring-white/20">
                        <Image
                            src={avatarHref}
                            alt="Profile"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="hidden xl:block">
                        <p className="font-semibold text-white text-sm">{displayName || 'Your Name'}</p>
                        <p className="text-xs text-white/50">@{username || 'username'}</p>
                    </div>
                </Link>
            </aside>

            {/* Mobile Bottom Nav */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 z-50">
                <div className="flex items-center justify-around py-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 p-2 ${activeTab === item.id ? 'text-white' : 'text-white/50'}`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="text-[10px]">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </nav>
        </>
    );
}

// Trending Topics
const trendingTopics = [
    { tag: '#adventure', posts: '12.4K' },
    { tag: '#foodie', posts: '8.2K' },
    { tag: '#travel', posts: '15.1K' },
    { tag: '#fitness', posts: '9.8K' },
    { tag: '#photography', posts: '11.3K' },
];

// Explore Grid Items
const exploreItems = [
    { type: 'large', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=800&fit=crop', likes: 2341 },
    { type: 'small', image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=400&fit=crop', likes: 892 },
    { type: 'small', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop', likes: 1567 },
    { type: 'video', image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=600&fit=crop', views: 45000 },
    { type: 'small', image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop', likes: 3421 },
    { type: 'small', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=400&fit=crop', likes: 1893 },
    { type: 'large', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=800&fit=crop', likes: 4567 },
    { type: 'small', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop', likes: 2156 },
    { type: 'small', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop', likes: 1789 },
    { type: 'video', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop', views: 32000 },
    { type: 'small', image: 'https://images.unsplash.com/photo-1524638431109-93d95c968f03?w=400&h=400&fit=crop', likes: 2890 },
    { type: 'small', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop', likes: 1234 },
];

// Suggested Users
const suggestedUsers = [
    { name: 'Sarah Chen', username: 'sarahc', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face', followers: '12.4K' },
    { name: 'Marcus J', username: 'marcusj', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', followers: '8.9K' },
    { name: 'Emily Park', username: 'emilyp', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face', followers: '15.2K' },
];

function ExplorePageContent() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [mounted, setMounted] = useState(false);
    const { user } = useAuth();
    const userAvatarUrl = user?.avatarUrl;

    useEffect(() => { setMounted(true); }, []);

    const categories = ['all', 'travel', 'food', 'fitness', 'music', 'art'];

    if (!mounted) {
        return <div className="min-h-screen bg-[#050508]" />;
    }

    return (
        <div className="min-h-screen bg-[#050508] relative">
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-violet-500/5 blur-[100px]" />
                <div className="absolute bottom-1/4 left-1/4 w-80 h-80 rounded-full bg-cyan-500/5 blur-[100px]" />
            </div>

            <Navigation
                activeTab="explore"
                userAvatarUrl={userAvatarUrl}
                displayName={user?.displayName}
                username={user?.username}
            />

            <main className="relative z-10 lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
                {/* Header */}
                <header className="sticky top-0 z-30 px-4 lg:px-6 py-4 bg-black/60 backdrop-blur-xl border-b border-white/5">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center gap-4">
                            {/* Search */}
                            <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10">
                                <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
                                </svg>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search people, posts, tags..."
                                    className="flex-1 bg-transparent text-white placeholder:text-white/40 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Categories */}
                        <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium capitalize whitespace-nowrap transition-all ${activeCategory === cat
                                        ? 'bg-white text-black'
                                        : 'bg-white/10 text-white hover:bg-white/15'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Grid */}
                        <div className="lg:col-span-2">
                            {/* Trending */}
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold text-white mb-4">🔥 Trending Now</h2>
                                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                                    {trendingTopics.map((topic) => (
                                        <motion.button
                                            key={topic.tag}
                                            className="flex-shrink-0 px-4 py-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-rose-500/20 border border-orange-500/20 hover:border-orange-500/40 transition-colors"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <p className="font-semibold text-white">{topic.tag}</p>
                                            <p className="text-xs text-white/50">{topic.posts} posts</p>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>

                            {/* Explore Grid */}
                            <div className="grid grid-cols-3 gap-1 md:gap-2">
                                {exploreItems.map((item, i) => (
                                    <motion.div
                                        key={i}
                                        className={`relative overflow-hidden rounded-lg md:rounded-xl cursor-pointer group ${item.type === 'large' ? 'col-span-2 row-span-2' : ''
                                            } ${item.type === 'video' ? 'row-span-2' : ''}`}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.03 }}
                                        whileHover={{ scale: 1.02 }}
                                    >
                                        <div className={`relative ${item.type === 'large' || item.type === 'video' ? 'aspect-square' : 'aspect-square'}`}>
                                            <Image
                                                src={item.image}
                                                alt="Explore"
                                                fill
                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-4 text-white">
                                                    {item.type === 'video' ? (
                                                        <span className="flex items-center gap-1">
                                                            <span>▶️</span>
                                                            <span className="font-semibold">{(item.views! / 1000).toFixed(0)}K</span>
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1">
                                                            <span>🔥</span>
                                                            <span className="font-semibold">{item.likes?.toLocaleString()}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {item.type === 'video' && (
                                                <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/50 text-white text-xs">
                                                    ▶️
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="hidden lg:block space-y-6">
                            {/* Suggested Users */}
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                <h3 className="font-semibold text-white mb-4">Suggested for you</h3>
                                <div className="space-y-4">
                                    {suggestedUsers.map((user) => (
                                        <div key={user.username} className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full overflow-hidden relative">
                                                <Image src={user.avatar} alt={user.name} fill className="object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-white text-sm truncate">{user.name}</p>
                                                <p className="text-xs text-white/50">@{user.username} · {user.followers}</p>
                                            </div>
                                            <button className="px-4 py-1.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors">
                                                Follow
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer Links */}
                            <div className="text-xs text-white/30 space-y-2">
                                <div className="flex flex-wrap gap-2">
                                    <Link href="#" className="hover:text-white/50">About</Link>
                                    <Link href="#" className="hover:text-white/50">Help</Link>
                                    <Link href="#" className="hover:text-white/50">Privacy</Link>
                                    <Link href="#" className="hover:text-white/50">Terms</Link>
                                </div>
                                <p>© 2026 0G (Zero Gravity)</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Wrap with ProtectedRoute for authentication requirement
export default function ExplorePage() {
    return (
        <ProtectedRoute>
            <ExplorePageContent />
        </ProtectedRoute>
    );
}
