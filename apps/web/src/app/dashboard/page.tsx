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
        viewers: 12453,
        isLive: true,
        category: 'Sacred Sites',
    },
    {
        id: 'medina',
        name: 'Medina',
        subtitle: "Prophet's Mosque ﷺ",
        image: '/featured/medina.png',
        viewers: 8721,
        isLive: true,
        category: 'Sacred Sites',
    },
    {
        id: 'jerusalem',
        name: 'Jerusalem',
        subtitle: 'Al-Aqsa Compound',
        image: '/featured/jerusalem.png',
        viewers: 5432,
        isLive: true,
        category: 'Sacred Sites',
    },
    {
        id: 'abu-dhabi',
        name: 'Abu Dhabi',
        subtitle: 'Sheikh Zayed Mosque',
        image: '/featured/abu-dhabi.jpg',
        viewers: 4256,
        isLive: true,
        category: 'Cultural Heritage',
    },
    {
        id: 'istanbul',
        name: 'Istanbul',
        subtitle: 'Blue Mosque',
        image: '/featured/istanbul.png',
        viewers: 3891,
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
            className="relative group cursor-pointer flex-shrink-0 w-72 md:w-80"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -8, scale: 1.02 }}
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

                {/* Viewer count */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
                    <svg className="w-4 h-4 text-white/70" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-white/90 text-xs font-medium">{location.viewers.toLocaleString()}</span>
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
        { id: 'messages', icon: '💬', label: 'Messages', href: '/messages', hasNotification: true },
        { id: 'notifications', icon: '🔔', label: 'Notifications', href: '/notifications' },
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
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold">
                        {user?.displayName?.[0] || 'U'}
                    </div>
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
                    {/* Header */}
                    <motion.div
                        className="mb-8"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h1 className="text-3xl font-bold text-white mb-2">
                            Welcome back, <span className="text-[#00D4FF]">{user.displayName?.split(' ')[0] || 'Explorer'}</span>
                        </h1>
                        <p className="text-white/50">Discover what's happening around the world</p>
                    </motion.div>

                    {/* Featured Live Streams */}
                    <motion.section
                        className="mb-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-semibold text-white">Featured Streams</h2>
                                <p className="text-sm text-white/40">Live from sacred and historic sites</p>
                            </div>
                            <Link href="/campfire" className="text-[#00D4FF] text-sm font-medium hover:underline">
                                View all →
                            </Link>
                        </div>

                        {/* Horizontal scroll */}
                        <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                            {FEATURED_LOCATIONS.map((location, i) => (
                                <FeaturedLocationCard key={location.id} location={location} index={i} />
                            ))}
                        </div>
                    </motion.section>

                    {/* Main content grid */}
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Feed - Main column */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Quick post */}
                            <motion.div
                                className="bg-white/[0.02] rounded-2xl border border-white/5 p-4"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold flex-shrink-0">
                                        {user.displayName?.[0] || 'U'}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Share something with your community..."
                                        className="flex-1 bg-white/5 rounded-xl px-4 py-3 text-white placeholder:text-white/40 border border-white/5 focus:border-[#00D4FF]/30 focus:outline-none transition-colors"
                                        onFocus={() => router.push('/create')}
                                    />
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
                                </div>
                            </motion.div>

                            {/* Empty state / Coming soon */}
                            <motion.div
                                className="bg-gradient-to-br from-[#00D4FF]/5 to-[#8B5CF6]/5 rounded-2xl border border-white/5 p-8 text-center"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <div className="text-6xl mb-4">🚀</div>
                                <h3 className="text-xl font-semibold text-white mb-2">Your Feed is Ready</h3>
                                <p className="text-white/50 mb-6 max-w-md mx-auto">
                                    Follow communities and creators to see their content here. Or be the first to share something amazing!
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <Link
                                        href="/explore"
                                        className="px-6 py-3 rounded-xl bg-[#00D4FF] text-black font-semibold hover:opacity-90 transition-opacity"
                                    >
                                        Explore Communities
                                    </Link>
                                    <Link
                                        href="/create"
                                        className="px-6 py-3 rounded-xl border border-[#00D4FF]/30 text-[#00D4FF] font-semibold hover:bg-[#00D4FF]/10 transition-colors"
                                    >
                                        Create Your First Post
                                    </Link>
                                </div>
                            </motion.div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <ContentRequestCard />
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.6 }}
                            >
                                <TrendingTopics />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
