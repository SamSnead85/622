'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { API_URL } from '@/lib/api';
import { usePullToRefresh } from '@/hooks/useInfiniteScroll';
import { Navigation } from '@/components/Navigation';
import { RightSidebar } from '@/components/RightSidebar';
import { HeartIcon, PlayIcon } from '@/components/icons'; // Ensure PlayIcon is imported if referenced

export default function PublicProfilePage() {
    const params = useParams();
    const { username } = params as { username: string };
    const [profile, setProfile] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]); // Using 'any' for now to match API response speed
    const [loading, setLoading] = useState(true);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    // Close more menu on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setShowMoreMenu(false);
            }
        }
        if (showMoreMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showMoreMenu]);

    const loadProfileData = useCallback(async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            // GET /api/v1/users/:username returns user object directly (not wrapped in .user)
            const userRes = await fetch(`${API_URL}/api/v1/users/${encodeURIComponent(username)}`, {
                headers,
                credentials: 'include',
            });
            if (!userRes.ok) throw new Error('User not found');
            const userData = await userRes.json();
            setProfile(userData);

            if (userData?.id) {
                const postsRes = await fetch(`${API_URL}/api/v1/users/${userData.id}/posts`, {
                    headers,
                    credentials: 'include',
                });
                if (postsRes.ok) {
                    const postsData = await postsRes.json();
                    setPosts(postsData.posts || []);
                }
            }
        } catch (error) {
            console.error('Failed to load profile', error);
        } finally {
            setLoading(false);
        }
    }, [username]);

    const { pullDistance, isRefreshing, containerRef: pullRef } = usePullToRefresh({
        onRefresh: loadProfileData,
    });

    useEffect(() => {
        loadProfileData();
    }, [loadProfileData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050508]">
                <div className="max-w-4xl mx-auto">
                    {/* Cover skeleton */}
                    <div className="skeleton h-48 md:h-64 w-full" />
                    {/* Profile info skeleton */}
                    <div className="px-4 -mt-16 relative z-10">
                        <div className="skeleton w-28 h-28 rounded-full border-4 border-[#050508]" />
                        <div className="mt-4 space-y-2">
                            <div className="skeleton skeleton-text w-48" />
                            <div className="skeleton skeleton-text-sm w-32" />
                            <div className="skeleton skeleton-text w-72 mt-3" />
                        </div>
                        <div className="flex gap-6 mt-4">
                            <div className="skeleton w-20 h-8 rounded-lg" />
                            <div className="skeleton w-20 h-8 rounded-lg" />
                            <div className="skeleton w-20 h-8 rounded-lg" />
                        </div>
                    </div>
                    {/* Posts grid skeleton */}
                    <div className="grid grid-cols-3 gap-1 mt-8 px-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="skeleton aspect-square rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-[#050508] flex items-center justify-center text-white/50">
                User not found
            </div>
        );
    }

    return (
        <div ref={pullRef} className="min-h-screen bg-[#050508] relative">
            {/* Pull-to-refresh indicator */}
            {pullDistance > 0 && (
                <div className="flex items-center justify-center py-2 relative z-50" style={{ height: pullDistance }}>
                    <div className={`w-5 h-5 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full ${isRefreshing ? 'animate-spin' : ''}`} />
                </div>
            )}
            {/* Ambient Background matching Premium Theme */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/3 w-96 h-96 rounded-full bg-[#00D4FF]/[0.03] blur-[120px]" />
                <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-[#7C3AED]/[0.03] blur-[120px]" />
            </div>

            <Navigation activeTab="profile" />
            <RightSidebar />

            <main className="lg:ml-20 xl:ml-64 lg:mr-80 min-h-screen pb-20 lg:pb-8 relative z-10">
                {/* Cover & Header */}
                <div className="relative">
                    <div className="h-48 lg:h-64 bg-gradient-to-br from-[#0a0a1a] via-[#1a0a2e] to-[#0a1a2e] relative overflow-hidden">
                        {/* Decorative blur orbs for cover */}
                        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[#00D4FF]/10 blur-[80px]" />
                        <div className="absolute bottom-0 right-1/3 w-48 h-48 rounded-full bg-[#7C3AED]/10 blur-[60px]" />
                        {/* Overlay gradient for text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    </div>

                    <div className="max-w-4xl mx-auto px-6 relative">
                        <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-20 md:-mt-16 mb-8">
                            {/* Avatar */}
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-[#050508] p-1.5 relative z-10 ring-4 ring-black ring-offset-2 ring-offset-[#00D4FF]/20 shadow-[0_0_20px_rgba(0,212,255,0.2)]">
                                <div className="w-full h-full rounded-full overflow-hidden bg-gray-800 relative">
                                    {profile.avatarUrl ? (
                                        <Image src={profile.avatarUrl} alt={profile.displayName} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white/40 bg-white/5">
                                            {profile.displayName?.[0]}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="flex-1 pb-4 md:pb-0">
                                <h1 className="text-3xl font-bold text-white mb-1">{profile.displayName}</h1>
                                <p className="text-white/60 mb-4">@{profile.username}</p>

                                <div className="flex divide-x divide-white/10 mb-4">
                                    <div className="text-center px-4 first:pl-0">
                                        <div className="text-xl font-bold text-white">{posts.length}</div>
                                        <div className="text-xs text-white/40 uppercase tracking-wider">Posts</div>
                                    </div>
                                    <div className="text-center px-4">
                                        <div className="text-xl font-bold text-white">{profile._count?.followers || 0}</div>
                                        <div className="text-xs text-white/40 uppercase tracking-wider">Followers</div>
                                    </div>
                                    <div className="text-center px-4">
                                        <div className="text-xl font-bold text-white">{profile._count?.following || 0}</div>
                                        <div className="text-xs text-white/40 uppercase tracking-wider">Following</div>
                                    </div>
                                </div>

                                <p className="text-white/80 max-w-lg leading-relaxed">{profile.bio || 'Member of ZeroG'}</p>
                            </div>

                            {/* Actions */}
                            <div className="mb-4 self-center md:self-end flex items-center gap-2">
                                <button className="bg-gradient-to-r from-[#00D4FF] to-[#7C3AED] text-white font-semibold px-6 py-2.5 rounded-xl hover:shadow-[0_4px_20px_rgba(0,212,255,0.3)] transition-all duration-300 hover:scale-[1.02]">
                                    Follow
                                </button>
                                <button className="bg-white/[0.06] border border-white/[0.1] text-white font-medium px-6 py-2.5 rounded-xl hover:bg-white/[0.1] hover:border-[#00D4FF]/20 transition-all duration-300">
                                    Message
                                </button>
                                <div className="relative" ref={moreMenuRef}>
                                    <button
                                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                                    >
                                        <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" className="text-white/60">
                                            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                                        </svg>
                                    </button>
                                    {showMoreMenu && (
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a2e] rounded-xl border border-white/10 shadow-xl z-50 overflow-hidden">
                                            <button
                                                onClick={() => { /* Call POST /api/v1/reports with type: 'USER' */ setShowMoreMenu(false); }}
                                                className="w-full px-4 py-3 text-left text-sm text-white/70 hover:bg-white/5 transition-colors"
                                            >
                                                Report User
                                            </button>
                                            <button
                                                onClick={() => { /* Call POST /api/v1/users/:id/block */ setShowMoreMenu(false); }}
                                                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-white/5 transition-colors"
                                            >
                                                Block User
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="max-w-4xl mx-auto px-6">
                    {/* Tab Navigation */}
                    <div className="flex gap-8 border-b border-white/[0.06] mb-8">
                        <button className="text-[#00D4FF] border-b-2 border-[#00D4FF] pb-3 font-semibold text-sm">Posts</button>
                        <button className="text-white/40 hover:text-white/70 pb-3 transition-colors duration-200 text-sm">Likes</button>
                        <button className="text-white/40 hover:text-white/70 pb-3 transition-colors duration-200 text-sm">Media</button>
                    </div>

                    <div className="pt-0">
                        {posts.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2 md:gap-4">
                                {posts.map((post) => (
                                    <motion.div
                                        key={post.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="aspect-square bg-white/5 rounded-xl overflow-hidden relative group cursor-pointer hover:ring-2 hover:ring-[#00D4FF]/30 transition-all duration-300"
                                    >
                                        {post.mediaUrl ? (
                                            <Image src={post.mediaUrl} alt="" fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center p-4 text-center text-white/50 text-xs text-balance">
                                                {post.caption?.slice(0, 50)}...
                                            </div>
                                        )}

                                        {post.type === 'VIDEO' && (
                                            <div className="absolute top-2 right-2 text-white drop-shadow-md">
                                                <PlayIcon size={20} />
                                            </div>
                                        )}

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold">
                                            <HeartIcon className="fill-white" size={20} />
                                            {post.likesCount || 0}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
                                <p className="text-white/30">No posts yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
