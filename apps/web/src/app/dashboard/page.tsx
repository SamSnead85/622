'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { ReactionSpectrum, IntentionBadge, REACTION_SPECTRUM } from '@/components/ReactionSpectrum';
import { DataOwnershipPanel, PrivacyFirstBadge, LiveLatencyIndicator } from '@/components/PlatformDifferentiators';
import { API_URL } from '@/lib/api';
import { PostActions } from '@/components/PostActions';
import { FeedPost, PostSkeleton } from '@/components/FeedPost';
import { InlineComposer } from '@/components/InlineComposer';
import { TheCompass, ViewMode, ScopeMode } from '@/components/TheCompass';
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

    ShieldIcon,
    HeartIcon,
    ShareIcon,
    MapPinIcon,
    ZapIcon,
    WaveIcon
} from '@/components/icons';
import React from 'react';

// Dashboard sub-components
import { ZeroGLogo } from '@/components/dashboard/ZeroGLogo';
import { isYouTubeUrl, getYouTubeEmbedUrl, YouTubeEmbed, AutoPlayVideo } from '@/components/dashboard/VideoPlayers';
import { DoubleTapHeart } from '@/components/dashboard/DoubleTapHeart';
import { NavigationSidebar } from '@/components/dashboard/NavigationSidebar';
import { NewMembersBanner } from '@/components/dashboard/NewMembersBanner';
import { StoriesRow } from '@/components/dashboard/StoriesRow';
import { EnhancedStoriesBar } from '@/components/stories/EnhancedStoriesBar';
import { PeopleToFollow } from '@/components/dashboard/PeopleToFollow';
import { FEATURED_LOCATIONS, FeaturedLocationCard } from '@/components/dashboard/FeaturedLocations';
import { TrendingSection } from '@/components/feed/TrendingSection';
import { FeedModeToggle, useFeedMode } from '@/components/feed/FeedModeToggle';
import { FullscreenVideoFeed } from '@/components/feed/FullscreenVideoFeed';
import { usePullToRefresh } from '@/hooks/useInfiniteScroll';

// ============================================
// MAIN DASHBOARD PAGE
// ============================================
export default function DashboardPage() {
    const { user, isLoading, isAdmin } = useAuth();
    const { posts, likePost, deletePost, isLoading: postsLoading, refetch, hasMore, loadMore, toggleRsvp } = usePosts();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('standard');
    const [scopeMode, setScopeMode] = useState<ScopeMode>('orbit');
    const [zenMode, setZenMode] = useState(false);
    const [feedMode, setFeedMode] = useFeedMode();

    const { pullDistance, isRefreshing, containerRef: pullRef } = usePullToRefresh({
        onRefresh: async () => { await refetch(); },
    });

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
            <div className="min-h-screen bg-black">
                <div className="max-w-2xl mx-auto px-4 pt-20 space-y-6">
                    {/* Header skeleton */}
                    <div className="flex items-center gap-3">
                        <div className="skeleton skeleton-avatar" />
                        <div className="flex-1 space-y-2">
                            <div className="skeleton skeleton-text w-48" />
                            <div className="skeleton skeleton-text-sm w-32" />
                        </div>
                    </div>
                    {/* Composer skeleton */}
                    <div className="skeleton rounded-2xl h-24" />
                    {/* Post skeletons */}
                    {[1, 2, 3].map(i => (
                        <div key={i} className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                            <div className="flex items-center gap-3">
                                <div className="skeleton w-10 h-10 rounded-full" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="skeleton skeleton-text w-32" />
                                    <div className="skeleton skeleton-text-sm w-20" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="skeleton skeleton-text w-full" />
                                <div className="skeleton skeleton-text w-3/4" />
                            </div>
                            <div className="skeleton rounded-xl h-64" />
                            <div className="flex gap-6 pt-2">
                                <div className="skeleton w-16 h-8 rounded-lg" />
                                <div className="skeleton w-16 h-8 rounded-lg" />
                                <div className="skeleton w-16 h-8 rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full animate-spin" />
                    <p className="text-white/30 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-black text-white">
            {/* Background - z-[-1] ensures it renders BEHIND content */}
            <div className="fixed inset-0 pointer-events-none z-[-1]">
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
            <div ref={pullRef} className="lg:pl-20 xl:pl-64 h-screen overflow-y-auto">
                {/* Pull-to-refresh indicator */}
                <div
                    className="flex items-center justify-center overflow-hidden transition-all"
                    style={{ height: pullDistance > 0 ? pullDistance : 0 }}
                >
                    <div className={`flex items-center gap-2 ${isRefreshing ? 'animate-pulse' : ''}`}>
                        <div className={`w-5 h-5 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full ${isRefreshing ? 'animate-spin' : ''}`}
                            style={{ transform: `rotate(${pullDistance * 3}deg)` }}
                        />
                        <span className="text-xs text-white/40">
                            {isRefreshing ? 'Refreshing...' : pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
                        </span>
                    </div>
                </div>
                <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 pb-24 lg:pb-8">
                    {/* Sticky Header - Compact */}
                    <header className="mb-4 sticky top-0 z-20 -mx-4 lg:-mx-8 px-4 lg:px-8 py-3 bg-black/80 backdrop-blur-xl border-b border-white/5">
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
                                    <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                                        Welcome back{user.displayName ? `, ${user.displayName}` : ''}
                                    </h1>
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

                    {/* Quick Actions Bar - Premium Glassmorphism */}
                    <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { name: 'Share Moment', Icon: CameraIcon, href: '/create', color: 'text-[#00D4FF]' },
                            { name: 'Invite Friends', Icon: SendIcon, href: '/invite', color: 'text-[#00D4FF]' },
                            { name: 'Go Live', Icon: VideoIcon, href: '/campfire', color: 'text-[#00D4FF]' },
                            { name: 'Find People', Icon: UsersIcon, href: '/explore', color: 'text-[#00D4FF]' },
                        ].map((action, i) => (
                            <Link
                                key={i}
                                href={action.href}
                                className="group flex items-center justify-center gap-3 px-4 py-3 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-[#00D4FF]/20 transition-all duration-300 rounded-xl hover:shadow-[0_0_20px_rgba(0,212,255,0.1)] active:scale-95"
                            >
                                <div className={`p-2 rounded-lg bg-black/40 ${action.color} group-hover:scale-110 transition-transform`}>
                                    <action.Icon size={18} />
                                </div>
                                <span className="font-semibold text-sm text-white/70 group-hover:text-white transition-colors">{action.name}</span>
                            </Link>
                        ))}
                    </div>

                    {/* Stories Row - Enhanced Stories Bar */}
                    <EnhancedStoriesBar />

                    {/* New Members Welcome Banner */}
                    <NewMembersBanner />

                    {/* Invite Friends CTA - Compact */}
                    <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-[#00D4FF]/10 to-[#8B5CF6]/10 border border-[#00D4FF]/20">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center">
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


                    {/* First-time user: Introduce yourself prompt */}
                    {posts.length === 0 && !postsLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 p-5 rounded-2xl bg-gradient-to-br from-[#00D4FF]/5 via-[#8B5CF6]/5 to-transparent border border-[#00D4FF]/20"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center shrink-0">
                                    <WaveIcon size={24} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-white mb-1">Welcome to 0G! 👋</h3>
                                    <p className="text-white/50 text-sm mb-4 leading-relaxed">
                                        You&apos;re one of the first people here. Introduce yourself to the community -- share who you are, what you&apos;re passionate about, or just say hello. Your post will be one of the first things new members see.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <Link
                                            href="/create"
                                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-black font-semibold text-sm hover:opacity-90 transition-opacity active:scale-95"
                                        >
                                            <PlusIcon size={16} />
                                            Create Your First Post
                                        </Link>
                                        <Link
                                            href="/explore"
                                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 font-medium text-sm hover:bg-white/10 transition-colors active:scale-95"
                                        >
                                            <SearchIcon size={16} />
                                            Explore First
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Feed Mode Toggle */}
                    <div className="mb-4 flex items-center justify-between">
                        <FeedModeToggle mode={feedMode} onChange={setFeedMode} />
                    </div>

                    {/* Fullscreen Video Feed Mode */}
                    {feedMode === 'video' && (
                        <FullscreenVideoFeed
                            posts={posts}
                            onLoadMore={loadMore}
                            hasMore={hasMore}
                            onLike={likePost}
                            onClose={() => setFeedMode('standard')}
                        />
                    )}

                    <div className="grid lg:grid-cols-3 gap-4">
                        {/* Feed - Main column */}
                        <div className="lg:col-span-2 space-y-3">
                            {/* Quick post with privacy controls */}
                            {/* Quick post - Inline Composer (X-Style) */}
                            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl hover:border-white/[0.12] focus-within:border-[#00D4FF]/30 focus-within:shadow-[0_0_20px_rgba(0,212,255,0.08)] transition-all duration-300 p-4">
                                <InlineComposer
                                    user={user}
                                    onPostSuccess={() => {
                                        refetch();
                                        // Optional: Scroll to top or show toast
                                    }}
                                />
                            </div>

                            {/* Your Feed - Real Posts from API */}
                            <div className="space-y-3">
                                {/* THE COMPASS - Navigation Singularity */}
                                <TheCompass
                                    viewMode={viewMode}
                                    setViewMode={setViewMode}
                                    scopeMode={scopeMode}
                                    setScopeMode={setScopeMode}
                                    zenMode={zenMode}
                                    setZenMode={setZenMode}
                                />

                                {/* PINNED: HEAL Palestine Town Hall */}
                                <div className="relative w-full rounded-3xl overflow-hidden mb-6 group border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.15)]">
                                    {/* Gradient Background */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/80 via-[#0A1628] to-teal-900/60" />
                                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-emerald-500/10 blur-[80px]" />
                                    <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-teal-500/10 blur-[60px]" />

                                    {/* Content Container */}
                                    <div className="relative flex flex-col items-center justify-center text-center p-8 py-12 z-10">

                                        {/* Badge */}
                                        <div className="mb-6">
                                            <span className="px-4 py-1.5 rounded-full bg-emerald-500/90 text-black text-xs font-bold uppercase tracking-widest shadow-lg backdrop-blur-md">
                                                Pinned Invite
                                            </span>
                                        </div>

                                        {/* Headline */}
                                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight max-w-3xl drop-shadow-xl">
                                            Community Town Hall:<br />
                                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
                                                Strengthening Dignity &amp; Healing
                                            </span>
                                        </h2>

                                        {/* Description */}
                                        <p className="text-white/90 text-lg md:text-xl leading-relaxed max-w-2xl mb-8">
                                            Join HEAL Palestine&apos;s leadership to reflect on 2025&apos;s impact and strengthen our community-led efforts for children and families.
                                        </p>

                                        {/* Date Widget */}
                                        <div className="flex items-center gap-3 px-5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 mb-8">
                                            <span className="text-2xl">📅</span>
                                            <div className="text-left">
                                                <p className="text-xs text-white/60 font-bold uppercase">Date</p>
                                                <p className="text-white font-semibold">Monday, Feb 16, 2026</p>
                                            </div>
                                            <div className="w-px h-8 bg-white/20 mx-2" />
                                            <span className="text-2xl">⏰</span>
                                            <div className="text-left">
                                                <p className="text-xs text-white/60 font-bold uppercase">Time</p>
                                                <p className="text-white font-semibold">11:00 AM - 12:00 PM (ET)</p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                                            <a
                                                href="https://healpalestine.org/register"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 px-8 py-4 rounded-xl bg-emerald-500 text-black font-bold text-lg hover:bg-emerald-400 hover:scale-105 transition-all shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                                            >
                                                Register Now
                                            </a>
                                            <a
                                                href="mailto:info@healpalestine.org"
                                                className="px-8 py-4 rounded-xl bg-white/10 backdrop-blur-md text-white font-bold text-lg border border-white/20 hover:bg-white/20 transition-all hover:scale-105"
                                            >
                                                Contact Us
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {/* Loading State - Premium Skeletons */}
                                {postsLoading && posts.length === 0 && (
                                    <div className="space-y-4">
                                        <PostSkeleton />
                                        <PostSkeleton />
                                        <PostSkeleton />
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

                                {/* Real Posts - Standardized Card Sizing */}
                                {posts.map((post) => (
                                    <motion.div
                                        key={post.id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <FeedPost
                                            post={post}
                                            likePost={likePost}
                                            toggleRsvp={toggleRsvp}
                                            deletePost={deletePost}
                                            zenMode={zenMode}
                                        />
                                    </motion.div>
                                ))}

                                {/* Infinite Scroll Sentinel */}
                                {hasMore && (
                                    <div ref={loadMoreRef} className="py-8 flex justify-center">
                                        <div onClick={loadMore} className="flex flex-col items-center gap-2 cursor-pointer group">
                                            <div className="w-8 h-8 rounded-full border-2 border-[#00D4FF]/30 border-t-[#00D4FF] animate-spin" />
                                            <span className="text-xs text-white/40 group-hover:text-[#00D4FF] transition-colors">Loading more...</span>
                                        </div>
                                    </div>
                                )}

                                {/* Refresh Feed Button */}
                                {posts.length > 0 && !hasMore && (
                                    <div className="text-center py-6">
                                        <div className="text-white/30 text-sm mb-3">You&apos;re all caught up! ✨</div>
                                        <button
                                            onClick={() => refetch()}
                                            className="px-6 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm font-medium hover:bg-white/10 transition-colors border border-white/5"
                                        >
                                            Refresh Feed
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar - 0G Differentiators */}
                        <div className="space-y-4">
                            {/* People to Follow - Real Users */}
                            <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-white">People to Follow</h3>
                                    <Link href="/explore" className="text-xs text-[#00D4FF] hover:underline">See All</Link>
                                </div>
                                <PeopleToFollow currentUserId={user?.id} />
                            </div>

                            {/* Trending / Discovery */}
                            <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-4">
                                <TrendingSection />
                            </div>

                            {/* Data Ownership - No Lock-in */}
                            <div>
                                <DataOwnershipPanel />
                            </div>

                            {/* Privacy & Latency Indicators */}
                            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-2xl border border-emerald-500/20 p-5">
                                <h3 className="text-sm font-semibold text-white mb-4">Why 0G is Different</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04]">
                                        <UnlockIcon size={20} className="text-[#00D4FF]" />
                                        <div>
                                            <p className="text-xs font-medium text-white">No Platform Lock-in</p>
                                            <p className="text-[10px] text-white/40">Export all data anytime</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04]">
                                        <HeartIcon size={20} className="text-[#00D4FF]" />
                                        <div>
                                            <p className="text-xs font-medium text-white">100% Zero-Profit Mission</p>
                                            <p className="text-[10px] text-white/40">No fees. No coins. No fraud.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04]">
                                        <ZapIcon size={20} className="text-[#00D4FF]" />
                                        <div>
                                            <p className="text-xs font-medium text-white">&lt;1s Live Latency</p>
                                            <p className="text-[10px] text-white/40">Others: 3-5s delay</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04]">
                                        <ShieldIcon size={20} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                        <div>
                                            <p className="text-xs font-medium text-white">Your Privacy Matters</p>
                                            <p className="text-[10px] text-white/40">Your data stays yours</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Invite Card */}
                            <div className="bg-gradient-to-br from-[#00D4FF]/10 to-[#8B5CF6]/10 rounded-2xl border border-[#00D4FF]/20 p-5">
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
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
