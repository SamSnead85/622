'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { ReactionSpectrum, IntentionBadge, REACTION_SPECTRUM } from '@/components/ReactionSpectrum';
import { DataOwnershipPanel, PrivacyFirstBadge, LiveLatencyIndicator } from '@/components/PlatformDifferentiators';
import {
    HomeIcon,
    SearchIcon,
    VideoIcon,
    UsersIcon,
    SendIcon,
    MessageIcon,
    PlusIcon,
    BellIcon,
    SettingsIcon,
    CameraIcon,
    GlobeIcon,
    LockIcon,
    UnlockIcon,
    DollarIcon,
    ShieldIcon,
    HeartIcon,
    ShareIcon,
    MapPinIcon,
    ZapIcon,
    WaveIcon
} from '@/components/icons';
import React from 'react';

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
// NEW MEMBERS BANNER - Welcome Ticker
// ============================================
function NewMembersBanner() {
    const [newMembers, setNewMembers] = useState<Array<{
        id: string;
        username: string;
        displayName: string;
        createdAt: string;
    }>>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchNewMembers = async () => {
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || 'https://caravanserver-production-d7da.up.railway.app'}/api/v1/users?limit=10&sortBy=createdAt&sortOrder=desc`,
                    {
                        headers: {
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                        },
                        credentials: 'include',
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    // Filter to users joined in the last 7 days
                    const recentUsers = (data.users || []).filter((user: { createdAt: string }) => {
                        const joinDate = new Date(user.createdAt);
                        const sevenDaysAgo = new Date();
                        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                        return joinDate > sevenDaysAgo;
                    });
                    setNewMembers(recentUsers);
                }
            } catch (err) {
                console.error('Error fetching new members:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNewMembers();
        // Refresh every 30 seconds
        const interval = setInterval(fetchNewMembers, 30000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading || newMembers.length === 0) return null;

    return (
        <div className="mb-4 overflow-hidden rounded-xl bg-gradient-to-r from-green-500/10 via-[#00D4FF]/10 to-purple-500/10 border border-green-500/20">
            <div className="py-2 px-4 flex items-center gap-3">
                <div className="flex-shrink-0 flex items-center gap-2 text-green-400">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs font-semibold uppercase tracking-wider">New</span>
                </div>
                <div className="flex-1 overflow-hidden">
                    <motion.div
                        className="flex gap-6 whitespace-nowrap"
                        animate={{ x: ['0%', '-50%'] }}
                        transition={{
                            duration: newMembers.length * 4,
                            repeat: Infinity,
                            ease: 'linear',
                        }}
                    >
                        {/* Duplicate for seamless loop */}
                        {[...newMembers, ...newMembers].map((member, idx) => (
                            <Link
                                key={`${member.id}-${idx}`}
                                href={`/profile/${member.username}`}
                                className="flex items-center gap-2 text-sm text-white hover:text-[#00D4FF] transition-colors"
                            >
                                <span className="text-lg">👋</span>
                                <span>
                                    Welcome <span className="font-semibold text-[#00D4FF]">{member.displayName || member.username}</span>!
                                </span>
                            </Link>
                        ))}
                    </motion.div>
                </div>
            </div>
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
        { id: 'feed', Icon: HomeIcon, label: 'Feed', href: '/dashboard' },
        { id: 'explore', Icon: SearchIcon, label: 'Explore', href: '/explore' },
        { id: 'live', Icon: VideoIcon, label: 'Live', href: '/campfire' },
        { id: 'communities', Icon: UsersIcon, label: 'Communities', href: '/communities' },
        { id: 'invite', Icon: SendIcon, label: 'Invite', href: '/invite', highlight: true },
        { id: 'messages', Icon: MessageIcon, label: 'Messages', href: '/messages', hasNotification: true },
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
                            <span className="relative">
                                <item.Icon size={22} />
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
                    <PlusIcon size={18} />
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
                            <span className="relative">
                                <item.Icon size={22} />
                                {item.hasNotification && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#00D4FF] rounded-full" />
                                )}
                            </span>
                            <span className="text-[10px]">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </nav>

            {/* Mobile Floating Action Button */}
            <motion.button
                onClick={onCreateClick}
                className="lg:hidden fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] shadow-lg shadow-[#00D4FF]/30 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
                <PlusIcon size={24} className="text-black" />
            </motion.button>
        </>
    );
}


// ============================================
// MAIN DASHBOARD PAGE
// ============================================
export default function DashboardPage() {
    const { user, isLoading } = useAuth();
    const { posts, likePost, isLoading: postsLoading, refetch } = usePosts();
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
                                        Welcome back{user.displayName ? `, ${user.displayName}` : ''}
                                    </h1>
                                    <p className="text-white/50 text-sm">Your 0G social hub</p>
                                </div>
                            </div>

                            {/* Header Actions */}
                            <div className="flex items-center gap-3">
                                {/* Notifications */}
                                <Link href="/notifications" className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                    <BellIcon size={22} />
                                </Link>

                                {/* Settings */}
                                <Link href="/settings" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                    <SettingsIcon size={22} />
                                </Link>
                            </div>
                        </div>
                    </header>

                    {/* New Members Welcome Banner */}
                    <NewMembersBanner />

                    {/* Invite Friends CTA - Build your network */}
                    <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-[#00D4FF]/10 to-[#8B5CF6]/10 border border-[#00D4FF]/20">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center">
                                <UsersIcon size={24} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-white">Build Your Network</h3>
                                <p className="text-xs text-white/50">Invite friends and family to connect on 0G</p>
                            </div>
                            <Link
                                href="/invite"
                                className="px-4 py-2 rounded-xl bg-[#00D4FF] text-black font-medium text-sm hover:opacity-90 transition-opacity"
                            >
                                Invite
                            </Link>
                        </div>
                    </div>

                    {/* Quick Actions Bar */}
                    <div className="mb-6 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {[
                            { name: 'Share Moment', Icon: CameraIcon, href: '/create', gradient: 'from-[#00D4FF] to-[#0088CC]' },
                            { name: 'Invite Friends', Icon: SendIcon, href: '/invite', gradient: 'from-[#8B5CF6] to-[#6D28D9]' },
                            { name: 'Go Live', Icon: VideoIcon, href: '/campfire', gradient: 'from-red-500 to-orange-500' },
                            { name: 'Find People', Icon: UsersIcon, href: '/explore', gradient: 'from-green-500 to-teal-500' },
                        ].map((action, i) => (
                            <Link
                                key={i}
                                href={action.href}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r ${action.gradient} text-white font-medium text-sm hover:opacity-90 transition-opacity flex-shrink-0`}
                            >
                                <action.Icon size={18} />
                                <span>{action.name}</span>
                            </Link>
                        ))}
                    </div>


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
                                        <CameraIcon size={18} />
                                        <span className="text-sm">Photo</span>
                                    </button>
                                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/60 hover:bg-white/5 transition-colors">
                                        <VideoIcon size={18} />
                                        <span className="text-sm">Video</span>
                                    </button>
                                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/60 hover:bg-white/5 transition-colors">
                                        <VideoIcon size={18} />
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

                            {/* Your Feed - Real Posts from API */}
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

                                {/* Loading State */}
                                {postsLoading && posts.length === 0 && (
                                    <div className="flex justify-center py-8">
                                        <div className="w-8 h-8 rounded-full border-2 border-[#00D4FF]/20 border-t-[#00D4FF] animate-spin" />
                                    </div>
                                )}

                                {/* Empty State */}
                                {!postsLoading && posts.length === 0 && (
                                    <div className="text-center py-12 bg-white/[0.02] rounded-2xl border border-white/5">
                                        <div className="text-4xl mb-4">📸</div>
                                        <h3 className="text-lg font-semibold text-white mb-2">No posts yet</h3>
                                        <p className="text-white/50 mb-4">Share your first moment with the community!</p>
                                        <button
                                            onClick={() => router.push('/create')}
                                            className="px-6 py-2.5 rounded-xl bg-[#00D4FF] text-black font-semibold text-sm hover:opacity-90 transition-opacity"
                                        >
                                            Create Post
                                        </button>
                                    </div>
                                )}

                                {/* Real Posts */}
                                {posts.map(post => (
                                    <div key={post.id} className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden">
                                        <div className="p-4">
                                            <div className="flex items-start gap-3">
                                                {post.author.avatarUrl ? (
                                                    <img
                                                        src={post.author.avatarUrl}
                                                        alt={post.author.displayName}
                                                        className="w-10 h-10 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold text-sm">
                                                        {post.author.displayName?.[0] || 'U'}
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-white text-sm">{post.author.displayName}</span>
                                                        <span className="px-2 py-0.5 rounded-full bg-[#00D4FF]/20 text-[#00D4FF] text-[10px]">🌍 Public</span>
                                                        <span className="text-white/30 text-xs">• {new Date(post.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    {post.content && (
                                                        <p className="text-white/70 text-sm mt-2">{post.content}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Media Display */}
                                        {post.mediaUrl && (
                                            <div className="relative">
                                                {post.mediaType === 'VIDEO' ? (
                                                    <video
                                                        src={post.mediaUrl}
                                                        controls
                                                        className="w-full max-h-[500px] object-contain bg-black"
                                                    />
                                                ) : (
                                                    <img
                                                        src={post.mediaUrl}
                                                        alt="Post media"
                                                        className="w-full max-h-[500px] object-contain bg-black/50"
                                                    />
                                                )}
                                            </div>
                                        )}

                                        <div className="p-4 flex items-center gap-4 border-t border-white/5">
                                            <button
                                                onClick={() => likePost(post.id)}
                                                className={`flex items-center gap-2 transition-colors ${post.isLiked ? 'text-rose-400' : 'text-white/60 hover:text-rose-400'}`}
                                            >
                                                <span>{post.isLiked ? '❤️' : '🤍'}</span>
                                                <span className="text-sm">{post.likes}</span>
                                            </button>
                                            <button
                                                onClick={() => router.push(`/post/${post.id}`)}
                                                className="flex items-center gap-2 text-white/60 hover:text-[#00D4FF] transition-colors"
                                            >
                                                <span>💬</span>
                                                <span className="text-sm">{post.commentsCount}</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const url = `${window.location.origin}/post/${post.id}`;
                                                    navigator.clipboard.writeText(url);
                                                    alert('Link copied to clipboard!');
                                                }}
                                                className="flex items-center gap-2 text-white/60 hover:text-[#00D4FF] transition-colors"
                                            >
                                                <span>↗️</span>
                                                <span className="text-sm">Share</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    // Repost functionality - creates a new post with reference
                                                    router.push(`/create?repost=${post.id}`);
                                                }}
                                                className="flex items-center gap-2 text-white/60 hover:text-green-400 transition-colors ml-auto"
                                            >
                                                <span>🔄</span>
                                                <span className="text-sm">Repost</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* Load More */}
                                {posts.length > 0 && (
                                    <div className="text-center py-4">
                                        <button
                                            onClick={() => refetch()}
                                            className="px-6 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm font-medium hover:bg-white/10 transition-colors border border-white/5"
                                        >
                                            Refresh Feed
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {/* Sidebar - 0G Differentiators */}
                        <div className="space-y-6">
                            {/* Data Ownership - No Lock-in */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <DataOwnershipPanel />
                            </motion.div>

                            {/* Privacy & Latency Indicators */}
                            <motion.div
                                className="bg-white/[0.02] rounded-2xl border border-white/5 p-5"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.55 }}
                            >
                                <h3 className="text-sm font-semibold text-white mb-4">Why 0G is Different</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                                        <UnlockIcon size={20} className="text-[#00D4FF]" />
                                        <div>
                                            <p className="text-xs font-medium text-white">No Platform Lock-in</p>
                                            <p className="text-[10px] text-white/40">Export all data anytime</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                                        <DollarIcon size={20} className="text-[#00D4FF]" />
                                        <div>
                                            <p className="text-xs font-medium text-white">Creators Keep 90%</p>
                                            <p className="text-[10px] text-white/40">vs 50% on TikTok</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                                        <ZapIcon size={20} className="text-[#00D4FF]" />
                                        <div>
                                            <p className="text-xs font-medium text-white">&lt;1s Live Latency</p>
                                            <p className="text-[10px] text-white/40">Others: 3-5s delay</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                                        <ShieldIcon size={20} className="text-[#00D4FF]" />
                                        <div>
                                            <p className="text-xs font-medium text-white">Privacy-First</p>
                                            <p className="text-[10px] text-white/40">Your data stays yours</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Invite Card */}
                            <motion.div
                                className="bg-gradient-to-br from-[#00D4FF]/10 to-[#8B5CF6]/10 rounded-2xl border border-[#00D4FF]/20 p-5"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.6 }}
                            >
                                <WaveIcon size={28} className="text-[#00D4FF] mb-2" />
                                <h3 className="text-sm font-semibold text-white mb-1">Invite Your People</h3>
                                <p className="text-xs text-white/50 mb-3">
                                    0G is better with your tribe.
                                </p>
                                <Link
                                    href="/invite"
                                    className="block w-full py-2 rounded-xl bg-[#00D4FF] text-black text-center font-semibold text-sm hover:opacity-90 transition-opacity"
                                >
                                    Send Invites
                                </Link>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
