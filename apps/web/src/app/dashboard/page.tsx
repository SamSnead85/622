'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { API_URL } from '@/lib/api';
import { FeedPost, PostSkeleton } from '@/components/FeedPost';
import {
    MessageIcon,
    PlusIcon,
    BellIcon,
    SettingsIcon,
} from '@/components/icons';
import { NavigationSidebar } from '@/components/dashboard/NavigationSidebar';
import { PeopleToFollow } from '@/components/dashboard/PeopleToFollow';
import { TrendingSection } from '@/components/feed/TrendingSection';
import { useFeedMode } from '@/components/feed/FeedModeToggle';
import { FullscreenVideoFeed } from '@/components/feed/FullscreenVideoFeed';
import { usePullToRefresh } from '@/hooks/useInfiniteScroll';
import { useFeedView } from '@/contexts/FeedViewContext';
import { JoinCommunityModal } from '@/components/JoinCommunityModal';
import { DECOY_POSTS } from '@/lib/stealth/decoyData';

// ============================================
// MAIN DASHBOARD PAGE
// ============================================
export default function DashboardPage() {
    const { user, isLoading, isAdmin, isStealth } = useAuth();
    const { feedView, setFeedView, communityOptIn, showJoinModal, setShowJoinModal } = useFeedView();
    const { posts: realPosts, likePost, deletePost, pinPost, movePost, isLoading: postsLoading, refetch, hasMore, loadMore, toggleRsvp } = usePosts({ feedView });

    // Travel Shield: Use decoy posts when stealth is active
    const posts = isStealth ? (DECOY_POSTS as unknown as typeof realPosts) : realPosts;
    const router = useRouter();
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const [zenMode] = useState(false);
    const [feedMode, setFeedMode] = useFeedMode();

    const { pullDistance, isRefreshing, containerRef: pullRef } = usePullToRefresh({
        onRefresh: async () => { await refetch(); },
    });

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
            return;
        }
        // Group-only users: redirect to their community instead of the main feed
        if (user?.isGroupOnly && user?.primaryCommunityId) {
            router.replace(`/communities/${user.primaryCommunityId}`);
        }
    }, [user, isLoading, router]);

    // Auto-join pending community (from invite link signup flow)
    useEffect(() => {
        if (!user || isStealth) return;
        const pendingSlug = localStorage.getItem('0g_pending_community');
        if (!pendingSlug) return;
        localStorage.removeItem('0g_pending_community');
        (async () => {
            try {
                const res = await fetch(`${API_URL}/api/v1/communities/${pendingSlug}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.id && !data.isMember) {
                        const token = localStorage.getItem('0g_token');
                        await fetch(`${API_URL}/api/v1/communities/${data.id}/join`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        });
                    }
                }
            } catch { /* non-critical */ }
        })();
    }, [user, isStealth]);

    if (isLoading) {
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
                    <div className="w-8 h-8 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
                    <p className="text-white/30 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-black text-white">
            {/* Background - z-[-1] ensures it renders BEHIND content */}
            <div className="fixed inset-0 pointer-events-none z-[-1]">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-black to-black" />
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[#D4AF37]/5 blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[#B8942D]/5 blur-[100px]" />
            </div>

            {/* Navigation */}
            <NavigationSidebar />

            {/* Main Content */}
            <div ref={pullRef} className="lg:pl-20 xl:pl-64 h-screen overflow-y-auto">
                {/* Pull-to-refresh indicator */}
                <div
                    className="flex items-center justify-center overflow-hidden transition-all"
                    style={{ height: pullDistance > 0 ? pullDistance : 0 }}
                >
                    <div className={`flex items-center gap-2 ${isRefreshing ? 'animate-pulse' : ''}`}>
                        <div className={`w-5 h-5 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full ${isRefreshing ? 'animate-spin' : ''}`}
                            style={{ transform: `rotate(${pullDistance * 3}deg)` }}
                        />
                        <span className="text-xs text-white/40">
                            {isRefreshing ? 'Refreshing...' : pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
                        </span>
                    </div>
                </div>
                <div className="max-w-6xl mx-auto px-4 lg:px-8 pb-24 lg:pb-8">
                    {/* ===== MOBILE HEADER: Clean, minimal — logo + icons only ===== */}
                    <header className="sticky top-0 z-20 -mx-4 px-4 py-2.5 bg-black/80 backdrop-blur-xl border-b border-white/5 lg:hidden">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                                    <span className="text-black font-bold text-xs">0G</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Link href="/notifications" className="p-2 rounded-full hover:bg-white/5 transition-colors">
                                    <BellIcon size={20} className="text-white/70" />
                                </Link>
                                <Link href="/messages" className="p-2 rounded-full hover:bg-white/5 transition-colors">
                                    <MessageIcon size={20} className="text-white/70" />
                                </Link>
                            </div>
                        </div>
                    </header>

                    {/* ===== DESKTOP HEADER: Full welcome with settings ===== */}
                    <header className="hidden lg:block mb-4 sticky top-0 z-20 -mx-8 px-8 py-3 bg-black/80 backdrop-blur-xl border-b border-white/5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Link href="/profile">
                                    {user.avatarUrl ? (
                                        <img
                                            src={user.avatarUrl}
                                            alt={user.displayName || 'Profile'}
                                            className="w-10 h-10 rounded-full object-cover ring-2 ring-[#D4AF37]/30"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8942D] flex items-center justify-center text-black font-bold">
                                            {user.displayName?.[0] || 'U'}
                                        </div>
                                    )}
                                </Link>
                                <h1 className="text-lg font-semibold text-white">
                                    Welcome back{user.displayName ? `, ${user.displayName}` : ''}
                                </h1>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link href="/notifications" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                    <BellIcon size={20} />
                                </Link>
                                <Link href="/settings" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                    <SettingsIcon size={20} />
                                </Link>
                            </div>
                        </div>
                    </header>

                    {/* ===== FEED VIEW TOGGLE: Private <-> Community ===== */}
                    <div className="flex items-center justify-between py-3 border-b border-white/[0.06] mb-2">
                        <div className="flex items-center bg-white/[0.04] rounded-full p-0.5">
                            <button
                                onClick={() => setFeedView('private')}
                                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    feedView === 'private'
                                        ? 'text-white'
                                        : 'text-white/40 hover:text-white/60'
                                }`}
                            >
                                {feedView === 'private' && (
                                    <motion.div
                                        layoutId="feedViewToggle"
                                        className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-full"
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-1.5">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                                    </svg>
                                    My Circle
                                </span>
                            </button>
                            <button
                                onClick={() => setFeedView('community')}
                                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    feedView === 'community'
                                        ? 'text-white'
                                        : 'text-white/40 hover:text-white/60'
                                }`}
                            >
                                {feedView === 'community' && (
                                    <motion.div
                                        layoutId="feedViewToggle"
                                        className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/20 to-[#B8942D]/20 border border-[#D4AF37]/30 rounded-full"
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-1.5">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                                    </svg>
                                    Community
                                    {!communityOptIn && (
                                        <span className="text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] px-1.5 py-0.5 rounded-full ml-1">Join</span>
                                    )}
                                </span>
                            </button>
                        </div>

                        {/* Privacy indicator */}
                        <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${
                            feedView === 'private'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'
                        }`}>
                            {feedView === 'private' ? (
                                <>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                                    </svg>
                                    Private
                                </>
                            ) : (
                                <>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <circle cx="12" cy="12" r="10" />
                                    </svg>
                                    Public
                                </>
                            )}
                        </div>
                    </div>

                    {/* Join Community Modal */}
                    {showJoinModal && <JoinCommunityModal />}

                    {/* ===== EMPTY STATE: Welcome cards when zero posts ===== */}
                    {posts.length === 0 && !postsLoading && (
                        <div className="space-y-4 py-4">
                            {/* Welcome card */}
                            <div className="bg-gradient-to-br from-[#D4AF37]/10 via-[#B8942D]/5 to-transparent rounded-2xl border border-[#D4AF37]/20 p-6 text-center">
                                <h3 className="text-xl font-bold text-white mb-2">Welcome to 0G</h3>
                                <p className="text-white/50 text-sm mb-5 max-w-md mx-auto">
                                    Your feed is empty because you&apos;re early! Create your first post, explore communities, or invite friends to get started.
                                </p>
                                <div className="flex flex-wrap justify-center gap-3">
                                    <Link
                                        href="/create"
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8942D] text-black font-semibold text-sm hover:opacity-90 transition-opacity"
                                    >
                                        <PlusIcon size={16} />
                                        Create Post
                                    </Link>
                                    <Link
                                        href="/communities"
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white font-medium text-sm hover:bg-white/15 transition-colors"
                                    >
                                        Join Communities
                                    </Link>
                                </div>
                            </div>

                            {/* Quick actions */}
                            <div className="grid grid-cols-2 gap-3">
                                <Link href="/search" className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.06] transition-colors group">
                                    <div className="mb-2 text-white/30"><svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></div>
                                    <h4 className="text-sm font-semibold text-white group-hover:text-[#D4AF37] transition-colors">Explore</h4>
                                    <p className="text-xs text-white/40 mt-0.5">Discover people &amp; content</p>
                                </Link>
                                <Link href="/bulletin" className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.06] transition-colors group">
                                    <div className="mb-2 text-white/30"><svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg></div>
                                    <h4 className="text-sm font-semibold text-white group-hover:text-[#D4AF37] transition-colors">Bulletin Board</h4>
                                    <p className="text-xs text-white/40 mt-0.5">Events, jobs &amp; more</p>
                                </Link>
                                <Link href="/communities/create" className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.06] transition-colors group">
                                    <div className="mb-2 text-white/30"><svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div>
                                    <h4 className="text-sm font-semibold text-white group-hover:text-[#D4AF37] transition-colors">Create a Group</h4>
                                    <p className="text-xs text-white/40 mt-0.5">Bring your people here</p>
                                </Link>
                                <Link href="/invite" className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.06] transition-colors group">
                                    <div className="mb-2 text-white/30"><svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
                                    <h4 className="text-sm font-semibold text-white group-hover:text-[#D4AF37] transition-colors">Invite Friends</h4>
                                    <p className="text-xs text-white/40 mt-0.5">Share invite links</p>
                                </Link>
                            </div>
                        </div>
                    )}

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
                        {/* ===== FEED: Main column — CONTENT FIRST ===== */}
                        <div className="lg:col-span-2 space-y-3">
                            <div className="space-y-3">

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
                                        <div className="mb-4 text-white/20"><svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg></div>
                                        <h3 className="text-lg font-semibold text-white mb-2">No posts yet</h3>
                                        <p className="text-white/50 mb-4">Share your first moment with the community!</p>
                                        <button
                                            onClick={() => router.push('/create')}
                                            className="px-6 py-2.5 rounded-xl bg-[#D4AF37] text-black font-semibold text-sm hover:opacity-90 transition-opacity"
                                        >
                                            Create Post
                                        </button>
                                    </div>
                                )}

                                {/* Real Posts - Standardized Card Sizing */}
                                {posts.map((post, index) => (
                                    <div
                                        key={post.id}
                                        className="animate-fade-in"
                                    >
                                        <FeedPost
                                            post={post}
                                            likePost={likePost}
                                            toggleRsvp={toggleRsvp}
                                            deletePost={deletePost}
                                            pinPost={pinPost}
                                            movePost={movePost}
                                            isFirst={index === 0}
                                            isLast={index === posts.length - 1}
                                            zenMode={zenMode}
                                        />
                                    </div>
                                ))}

                                {/* Infinite Scroll Sentinel */}
                                {hasMore && (
                                    <div ref={loadMoreRef} className="py-8 flex justify-center">
                                        <div onClick={loadMore} className="flex flex-col items-center gap-2 cursor-pointer group">
                                            <div className="w-8 h-8 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
                                            <span className="text-xs text-white/40 group-hover:text-[#D4AF37] transition-colors">Loading more...</span>
                                        </div>
                                    </div>
                                )}

                                {/* Refresh Feed Button */}
                                {posts.length > 0 && !hasMore && (
                                    <div className="text-center py-6">
                                        <div className="text-white/30 text-sm mb-3">You&apos;re all caught up</div>
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

                        {/* Sidebar - Desktop only, clean & focused */}
                        <div className="hidden lg:block space-y-4">
                            {/* People to Follow */}
                            <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-white">People to Follow</h3>
                                    <Link href="/search" className="text-xs text-[#D4AF37] hover:underline">See All</Link>
                                </div>
                                <PeopleToFollow currentUserId={user?.id} />
                            </div>

                            {/* Trending */}
                            <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-4">
                                <TrendingSection />
                            </div>

                            {/* Invite Card */}
                            <div className="bg-gradient-to-br from-[#D4AF37]/10 to-[#B8942D]/10 rounded-2xl border border-[#D4AF37]/20 p-4">
                                <h3 className="text-sm font-semibold text-white mb-1">Invite Your People</h3>
                                <p className="text-xs text-white/50 mb-3">
                                    0G is better with your community.
                                </p>
                                <Link
                                    href="/invite"
                                    className="block w-full py-2 rounded-xl bg-[#D4AF37] text-black text-center font-semibold text-sm hover:opacity-90 transition-opacity"
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
