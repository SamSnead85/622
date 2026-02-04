'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// 0G LOGO COMPONENT
// ============================================
function ZeroGLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const sizes = { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl' };
    return (
        <div className={`font-bold tracking-tight ${sizes[size]}`}>
            <span className="text-[#00D4FF]">0</span>
            <span className="text-white">G</span>
        </div>
    );
}

// ============================================
// FEATURED LOCATIONS - Sacred Sites & Live Streams  
// ============================================
const FEATURED_LOCATIONS = [
    {
        id: 'mecca',
        name: 'Mecca',
        subtitle: 'Masjid al-Haram',
        image: '/featured/mecca.png',
        isLive: false,
        category: 'Sacred Sites',
    },
    {
        id: 'medina',
        name: 'Medina',
        subtitle: "Prophet's Mosque ﷺ",
        image: '/featured/medina.png',
        isLive: false,
        category: 'Sacred Sites',
    },
    {
        id: 'jerusalem',
        name: 'Jerusalem',
        subtitle: 'Al-Aqsa Compound',
        image: '/featured/jerusalem.png',
        isLive: false,
        category: 'Sacred Sites',
    },
    {
        id: 'abu-dhabi',
        name: 'Abu Dhabi',
        subtitle: 'Sheikh Zayed Mosque',
        image: '/featured/abu-dhabi.jpg',
        isLive: false,
        category: 'Cultural Heritage',
    },
    {
        id: 'istanbul',
        name: 'Istanbul',
        subtitle: 'Blue Mosque',
        image: '/featured/istanbul.png',
        isLive: false,
        category: 'Cultural Heritage',
    },
];

// ============================================
// FEATURED LOCATION CARD
// ============================================
function FeaturedLocationCard({ location, index }: { location: typeof FEATURED_LOCATIONS[0]; index: number }) {
    return (
        <motion.div
            className="relative group cursor-pointer w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -4, scale: 1.02 }}
        >
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 group-hover:border-[#00D4FF]/40 transition-colors">
                {/* Image */}
                <Image
                    src={location.image}
                    alt={location.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                {/* Live indicator */}
                {location.isLive && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/90 backdrop-blur-sm">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        <span className="text-white text-xs font-semibold">LIVE</span>
                    </div>
                )}

                {/* Category badge */}
                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
                    <span className="text-white/90 text-xs font-medium">{location.category}</span>
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="text-[#00D4FF] text-xs font-medium mb-1">{location.category}</div>
                    <h3 className="text-xl font-bold text-white mb-1">{location.name}</h3>
                    <p className="text-white/60 text-sm">{location.subtitle}</p>
                </div>

                {/* Watch button on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="px-6 py-3 rounded-xl bg-[#00D4FF] text-black font-semibold text-sm shadow-lg shadow-[#00D4FF]/30">
                        Watch Now
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// NAVIGATION SIDEBAR
// ============================================
function NavigationSidebar({ activeTab, user, onCreateClick }: { activeTab: string; user: any; onCreateClick: () => void }) {
    const navItems = [
        { id: 'feed', icon: '🏠', label: 'Feed', href: '/dashboard' },
        { id: 'explore', icon: '🔍', label: 'Explore', href: '/explore' },
        { id: 'live', icon: '📺', label: 'Live', href: '/campfire' },
        { id: 'communities', icon: '👥', label: 'Communities', href: '/communities' },
        { id: 'invite', icon: '🚀', label: 'Invite', href: '/invite', highlight: true },
        { id: 'messages', icon: '💬', label: 'Messages', href: '/messages', hasNotification: true },
    ];

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 xl:w-64 bg-[#0A0A0F]/95 backdrop-blur-xl border-r border-white/5 flex-col p-4 z-40">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 px-3 py-4 mb-6">
                    <ZeroGLogo size="lg" />
                    <span className="text-white/60 text-sm font-medium hidden xl:block">Zero Gravity</span>
                </Link>

                {/* Nav items */}
                <nav className="flex-1 space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === item.id
                                ? 'bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20'
                                : (item as any).highlight
                                    ? 'bg-gradient-to-r from-[#00D4FF]/20 to-[#8B5CF6]/20 text-[#00D4FF] border border-[#00D4FF]/30 hover:from-[#00D4FF]/30 hover:to-[#8B5CF6]/30'
                                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <span className="text-xl relative">
                                {item.icon}
                                {item.hasNotification && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#00D4FF] rounded-full" />
                                )}
                            </span>
                            <span className="font-medium hidden xl:block">{item.label}</span>
                            {(item as any).highlight && (
                                <span className="hidden xl:block ml-auto text-[10px] bg-[#00D4FF]/20 px-2 py-0.5 rounded-full text-[#00D4FF]">NEW</span>
                            )}
                        </Link>
                    ))}
                </nav>

                {/* Create button */}
                <button
                    onClick={onCreateClick}
                    className="flex items-center justify-center xl:justify-start gap-3 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-black font-semibold hover:opacity-90 transition-opacity mb-4"
                >
                    <span className="text-lg">+</span>
                    <span className="hidden xl:block">Create Post</span>
                </button>

                {/* Profile */}
                <Link href="/profile" className="flex items-center gap-3 px-3 py-3 border-t border-white/10 mt-auto">
                    {user?.avatarUrl ? (
                        <img
                            src={user.avatarUrl}
                            alt={user.displayName || 'Profile'}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold">
                            {user?.displayName?.[0] || 'U'}
                        </div>
                    )}
                    <div className="hidden xl:block">
                        <p className="font-semibold text-white text-sm">{user?.displayName || 'User'}</p>
                        <p className="text-xs text-white/50">@{user?.username || 'username'}</p>
                    </div>
                </Link>
            </aside>

            {/* Mobile Bottom Nav */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0F]/95 backdrop-blur-xl border-t border-white/10 z-50 safe-area-pb">
                <div className="flex items-center justify-around py-2">
                    {navItems.slice(0, 5).map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 p-2 ${activeTab === item.id ? 'text-[#00D4FF]' : 'text-white/50'
                                }`}
                        >
                            <span className="text-xl relative">
                                {item.icon}
                                {item.hasNotification && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#00D4FF] rounded-full" />
                                )}
                            </span>
                            <span className="text-[10px]">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </nav>
        </>
    );
}

// ============================================
// CONTENT REQUEST CARD (Citizen Journalism)
// ============================================
function ContentRequestCard() {
    const requests = [
        { location: 'Gaza', reason: 'Live coverage needed', votes: 1243, reward: '$500+' },
        { location: 'Cairo', reason: 'Tahrir Square', votes: 892, reward: '$200+' },
        { location: 'Sarajevo', reason: 'Historic sites', votes: 456, reward: '$100+' },
    ];

    return (
        <div className="bg-[#0A1628] rounded-2xl border border-[#00D4FF]/20 p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Content Requests</h3>
                <span className="text-xs text-[#00D4FF] bg-[#00D4FF]/10 px-2 py-1 rounded-full">Earn Rewards</span>
            </div>
            <p className="text-sm text-white/50 mb-4">Community wants coverage from these locations</p>

            <div className="space-y-3">
                {requests.map((req, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                        <div>
                            <p className="font-medium text-white">{req.location}</p>
                            <p className="text-xs text-white/50">{req.reason}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[#00D4FF] font-semibold">{req.reward}</p>
                            <p className="text-xs text-white/40">{req.votes} votes</p>
                        </div>
                    </div>
                ))}
            </div>

            <button className="w-full mt-4 py-2.5 rounded-xl border border-[#00D4FF]/30 text-[#00D4FF] font-medium hover:bg-[#00D4FF]/10 transition-colors">
                View All Requests
            </button>
        </div>
    );
}

// ============================================
// TRENDING TOPICS
// ============================================
function TrendingTopics() {
    const topics = [
        { tag: '#AIEntrepreneurship', posts: '2.4K' },
        { tag: '#MuslimFounders', posts: '1.8K' },
        { tag: '#TechForGood', posts: '1.2K' },
        { tag: '#FaithAndBusiness', posts: '956' },
    ];

    return (
        <div className="bg-white/[0.02] rounded-2xl border border-white/5 p-5">
            <h3 className="text-lg font-semibold text-white mb-4">Trending Now</h3>
            <div className="space-y-3">
                {topics.map((topic, i) => (
                    <div key={i} className="flex items-center justify-between py-2 cursor-pointer hover:bg-white/5 -mx-2 px-2 rounded-lg transition-colors">
                        <span className="text-[#00D4FF] font-medium">{topic.tag}</span>
                        <span className="text-xs text-white/40">{topic.posts} posts</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================
// MAIN DASHBOARD PAGE
// ============================================
export default function DashboardPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    if (!mounted || isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-[#00D4FF]/20 border-t-[#00D4FF] animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <main className="min-h-screen bg-black text-white">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0A1628] via-black to-black" />
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[#00D4FF]/5 blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[#8B5CF6]/5 blur-[100px]" />
            </div>

            {/* Navigation */}
            <NavigationSidebar
                activeTab="feed"
                user={user}
                onCreateClick={() => router.push('/create')}
            />

            {/* Main Content */}
            <div className="lg:pl-20 xl:pl-64">
                <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 pb-24 lg:pb-8">
                    {/* Sticky Header - No animation to prevent flash */}
                    <header className="mb-6 sticky top-0 z-20 -mx-4 lg:-mx-8 px-4 lg:px-8 py-4 bg-black/80 backdrop-blur-xl border-b border-white/5">
                        <div className="flex items-center justify-between">
                            {/* Welcome & Profile */}
                            <div className="flex items-center gap-4">
                                <Link href="/profile">
                                    {user.avatarUrl ? (
                                        <img
                                            src={user.avatarUrl}
                                            alt={user.displayName || 'Profile'}
                                            className="w-12 h-12 rounded-full object-cover ring-2 ring-[#00D4FF]/30"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold text-lg">
                                            {user.displayName?.[0] || 'U'}
                                        </div>
                                    )}
                                </Link>
                                <div>
                                    <h1 className="text-xl md:text-2xl font-bold text-white">
                                        Welcome back{user.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}
                                    </h1>
                                    <p className="text-white/50 text-sm">Your 0G social hub</p>
                                </div>
                            </div>

                            {/* Online Friends Indicator */}
                            <div className="flex items-center gap-4">
                                {/* Online friends */}
                                <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-sm text-white/70">
                                        <span className="text-green-400 font-medium">3</span> friends online
                                    </span>
                                </div>

                                {/* Notifications */}
                                <Link href="/notifications" className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                    <span className="text-xl">🔔</span>
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">2</span>
                                </Link>

                                {/* Settings */}
                                <Link href="/settings" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                    <span className="text-xl">⚙️</span>
                                </Link>
                            </div>
                        </div>
                    </header>

                    {/* Network Activity Bar - Who's online & recent activity */}
                    <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-white/[0.03] to-white/[0.01] border border-white/5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-white/80">Network Activity</h3>
                            <span className="text-xs text-white/40">Live</span>
                        </div>
                        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
                            {/* Online friends avatars */}
                            {[
                                { name: 'Sarah', status: 'online' },
                                { name: 'Ahmed', status: 'online' },
                                { name: 'Lisa', status: 'online' },
                                { name: 'Omar', status: 'away' },
                                { name: 'Mia', status: 'away' },
                            ].map((friend, i) => (
                                <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white text-sm font-medium">
                                            {friend.name[0]}
                                        </div>
                                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${friend.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'
                                            }`} />
                                    </div>
                                    <span className="text-[10px] text-white/50">{friend.name}</span>
                                </div>
                            ))}

                            {/* Divider */}
                            <div className="w-px h-10 bg-white/10 mx-2 flex-shrink-0" />

                            {/* Recent activity feed */}
                            <div className="flex-1 min-w-[200px] flex-shrink-0">
                                <div className="space-y-1">
                                    <p className="text-xs text-white/60">
                                        <span className="text-[#00D4FF]">Sarah</span> posted a new moment
                                        <span className="text-white/30 ml-2">2m ago</span>
                                    </p>
                                    <p className="text-xs text-white/60">
                                        <span className="text-[#00D4FF]">Ahmed</span> is watching live from Mecca
                                        <span className="text-white/30 ml-2">5m ago</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions Bar */}
                    <div className="mb-6 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {[
                            { name: 'Share Moment', icon: '📸', href: '/create', gradient: 'from-[#00D4FF] to-[#0088CC]' },
                            { name: 'Invite Friends', icon: '🚀', href: '/invite', gradient: 'from-[#8B5CF6] to-[#6D28D9]' },
                            { name: 'Go Live', icon: '📺', href: '/campfire', gradient: 'from-red-500 to-orange-500' },
                            { name: 'Find People', icon: '👥', href: '/explore', gradient: 'from-green-500 to-teal-500' },
                        ].map((action, i) => (
                            <Link
                                key={i}
                                href={action.href}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r ${action.gradient} text-white font-medium text-sm hover:opacity-90 transition-opacity flex-shrink-0`}
                            >
                                <span>{action.icon}</span>
                                <span>{action.name}</span>
                            </Link>
                        ))}
                    </div>

                    {/* Featured Locations - 2 column grid */}
                    <motion.section
                        className="mb-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-semibold text-white">Featured Destinations</h2>
                                <p className="text-sm text-white/40">Sacred and historic sites</p>
                            </div>
                            <Link href="/campfire" className="text-[#00D4FF] text-sm font-medium hover:underline">
                                View all →
                            </Link>
                        </div>

                        {/* Responsive grid - 2 columns on mobile, 3 on larger */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {FEATURED_LOCATIONS.slice(0, 4).map((location, i) => (
                                <FeaturedLocationCard key={location.id} location={location} index={i} />
                            ))}
                        </div>
                    </motion.section>

                    {/* Main content grid */}
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Feed - Main column */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Quick post with privacy controls */}
                            <motion.div
                                className="bg-white/[0.02] rounded-2xl border border-white/5 p-4"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <div className="flex gap-4">
                                    {user.avatarUrl ? (
                                        <img
                                            src={user.avatarUrl}
                                            alt={user.displayName || 'Profile'}
                                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold flex-shrink-0">
                                            {user.displayName?.[0] || 'U'}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="What's on your mind?"
                                            className="w-full bg-white/5 rounded-xl px-4 py-3 text-white placeholder:text-white/40 border border-white/5 focus:border-[#00D4FF]/30 focus:outline-none transition-colors"
                                            onFocus={() => router.push('/create')}
                                        />
                                        {/* Privacy selector */}
                                        <div className="flex items-center gap-3 mt-3">
                                            <span className="text-xs text-white/40">Share with:</span>
                                            <div className="flex gap-2">
                                                <button className="px-3 py-1 rounded-full bg-[#00D4FF]/20 text-[#00D4FF] text-xs font-medium border border-[#00D4FF]/30">
                                                    🌍 Public
                                                </button>
                                                <button className="px-3 py-1 rounded-full bg-white/5 text-white/60 text-xs font-medium border border-white/10 hover:bg-white/10 transition-colors">
                                                    👥 Friends
                                                </button>
                                                <button className="px-3 py-1 rounded-full bg-white/5 text-white/60 text-xs font-medium border border-white/10 hover:bg-white/10 transition-colors">
                                                    👨‍👩‍👧 Family
                                                </button>
                                                <button className="px-3 py-1 rounded-full bg-white/5 text-white/60 text-xs font-medium border border-white/10 hover:bg-white/10 transition-colors">
                                                    🔒 Only Me
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-4 pl-16">
                                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/60 hover:bg-white/5 transition-colors">
                                        <span>📷</span>
                                        <span className="text-sm">Photo</span>
                                    </button>
                                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/60 hover:bg-white/5 transition-colors">
                                        <span>🎬</span>
                                        <span className="text-sm">Video</span>
                                    </button>
                                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/60 hover:bg-white/5 transition-colors">
                                        <span>📺</span>
                                        <span className="text-sm">Go Live</span>
                                    </button>
                                    <div className="flex-1" />
                                    <button
                                        onClick={() => router.push('/create')}
                                        className="px-5 py-2 rounded-xl bg-[#00D4FF] text-black font-semibold text-sm hover:opacity-90 transition-opacity"
                                    >
                                        Post
                                    </button>
                                </div>
                            </motion.div>

                            {/* Your Feed - Sample posts */}
                            <motion.div
                                className="space-y-4"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                {/* Your Algorithm Banner */}
                                <div className="bg-gradient-to-r from-[#00D4FF]/10 to-transparent rounded-xl border border-[#00D4FF]/20 p-4 flex items-center gap-4">
                                    <span className="text-2xl">🎯</span>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-white">Your Feed, Your Rules</p>
                                        <p className="text-xs text-white/50">You control what shows here. No hidden algorithms.</p>
                                    </div>
                                    <Link href="/algorithm" className="text-xs text-[#00D4FF] font-medium hover:underline">
                                        Customize →
                                    </Link>
                                </div>

                                {/* Sample Post 1 */}
                                <div className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden">
                                    <div className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                                                S
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-white text-sm">Sarah M.</span>
                                                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px]">👥 Friends</span>
                                                    <span className="text-white/30 text-xs">• 2h</span>
                                                </div>
                                                <p className="text-white/70 text-sm mt-2">Just finished an amazing journey through Jordan! The Petra Treasury at sunrise was absolutely magical ✨ Can&apos;t wait to share more photos!</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-48 bg-gradient-to-br from-amber-900/30 to-rose-900/30 flex items-center justify-center">
                                        <span className="text-4xl">🏛️</span>
                                    </div>
                                    <div className="p-4 flex items-center gap-4 border-t border-white/5">
                                        <button className="flex items-center gap-2 text-white/60 hover:text-rose-400 transition-colors">
                                            <span>❤️</span>
                                            <span className="text-sm">124</span>
                                        </button>
                                        <button className="flex items-center gap-2 text-white/60 hover:text-[#00D4FF] transition-colors">
                                            <span>💬</span>
                                            <span className="text-sm">18</span>
                                        </button>
                                        <button className="flex items-center gap-2 text-white/60 hover:text-[#00D4FF] transition-colors">
                                            <span>↗️</span>
                                            <span className="text-sm">Share</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Sample Post 2 - Your own post */}
                                <div className="bg-white/[0.02] rounded-2xl border border-[#00D4FF]/20 overflow-hidden">
                                    <div className="p-4">
                                        <div className="flex items-start gap-3">
                                            {user.avatarUrl ? (
                                                <img
                                                    src={user.avatarUrl}
                                                    alt={user.displayName || 'You'}
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold text-sm">
                                                    {user.displayName?.[0] || 'U'}
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-white text-sm">{user.displayName || 'You'}</span>
                                                    <span className="px-2 py-0.5 rounded-full bg-[#00D4FF]/20 text-[#00D4FF] text-[10px]">🌍 Public</span>
                                                    <span className="text-white/30 text-xs">• 1d</span>
                                                </div>
                                                <p className="text-white/70 text-sm mt-2">Welcome to my 0G profile! This is where I share my journey, thoughts, and connect with amazing people. 🚀</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 flex items-center gap-4 border-t border-white/5">
                                        <button className="flex items-center gap-2 text-rose-400">
                                            <span>❤️</span>
                                            <span className="text-sm">47</span>
                                        </button>
                                        <button className="flex items-center gap-2 text-white/60 hover:text-[#00D4FF] transition-colors">
                                            <span>💬</span>
                                            <span className="text-sm">8</span>
                                        </button>
                                        <button className="flex items-center gap-2 text-white/60 hover:text-[#00D4FF] transition-colors">
                                            <span>↗️</span>
                                            <span className="text-sm">Share</span>
                                        </button>
                                        <div className="flex-1" />
                                        <button className="text-xs text-white/40 hover:text-white/60">
                                            ⋯
                                        </button>
                                    </div>
                                </div>

                                {/* Load More */}
                                <div className="text-center py-4">
                                    <button className="px-6 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm font-medium hover:bg-white/10 transition-colors border border-white/5">
                                        Load More
                                    </button>
                                </div>
                            </motion.div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Invite Friends Card */}
                            <motion.div
                                className="bg-gradient-to-br from-[#00D4FF]/10 to-[#8B5CF6]/10 rounded-2xl border border-[#00D4FF]/20 p-6"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <div className="text-3xl mb-3">👋</div>
                                <h3 className="text-lg font-semibold text-white mb-2">Invite Your People</h3>
                                <p className="text-sm text-white/50 mb-4">
                                    Zero Gravity is better with your tribe. Invite family and friends to join.
                                </p>
                                <Link
                                    href="/communities/create"
                                    className="block w-full py-2.5 rounded-xl bg-[#00D4FF] text-black text-center font-semibold text-sm hover:opacity-90 transition-opacity"
                                >
                                    Create a Tribe
                                </Link>
                            </motion.div>

                            {/* Your Communities */}
                            <motion.div
                                className="bg-white/[0.02] rounded-2xl border border-white/5 p-5"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.6 }}
                            >
                                <h3 className="text-lg font-semibold text-white mb-4">Your Tribes</h3>
                                <div className="text-center py-6">
                                    <div className="text-3xl mb-2">🏕️</div>
                                    <p className="text-sm text-white/40 mb-3">No tribes yet</p>
                                    <Link
                                        href="/communities"
                                        className="text-[#00D4FF] text-sm font-medium hover:underline"
                                    >
                                        Browse Communities
                                    </Link>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
