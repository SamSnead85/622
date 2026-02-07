'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, ProtectedRoute } from '@/contexts/AuthContext';
import { API_ENDPOINTS, apiFetch } from '@/lib/api';
import { usePullToRefresh } from '@/hooks/useInfiniteScroll';
import { Navigation } from '@/components/Navigation';
import {
    HomeIcon,
    SearchIcon,
    UsersIcon,
    SendIcon,
    MessageIcon,
    TrendingIcon,
    HeartIcon,
    PlayIcon
} from '@/components/icons';

// Types for real data
// Enhanced User Interface
interface User {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    followersCount?: number;
    isOnline?: boolean;
    isFollowing?: boolean;
    isVerified?: boolean;
}

interface Post {
    id: string;
    type: 'IMAGE' | 'VIDEO' | 'TEXT';
    mediaUrl?: string;
    thumbnailUrl?: string;
    caption?: string;
    viewCount: number;
    user?: User;
}

// Shared Navigation Component
// Navigation imported from components

function ExplorePageContent() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('people');
    const [mounted, setMounted] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [connectingIds, setConnectingIds] = useState<Set<string>>(new Set());
    const { user } = useAuth();
    const userAvatarUrl = user?.avatarUrl;

    // Fetch real users from API
    const fetchUsers = useCallback(async () => {
        try {
            const response = await apiFetch(`${API_ENDPOINTS.users}?limit=20`);
            if (response.ok) {
                const data = await response.json();
                const otherUsers = (data.users || data || []).filter((u: User) => u.id !== user?.id);
                setUsers(otherUsers);

                // Initialize following status
                const initialFollowing = new Set<string>();
                otherUsers.forEach((u: User) => {
                    if (u.isFollowing) initialFollowing.add(u.id);
                });
                setFollowingIds(initialFollowing);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    }, [user?.id]);

    // Fetch real posts from API
    const fetchPosts = useCallback(async () => {
        try {
            const response = await apiFetch(`${API_ENDPOINTS.posts}?limit=20`);
            if (response.ok) {
                const data = await response.json();
                setPosts(data.posts || data || []);
            }
        } catch (error) {
            console.error('Failed to fetch posts:', error);
        }
    }, []);

    // Search users
    const searchUsers = useCallback(async (query: string) => {
        if (!query.trim()) {
            fetchUsers();
            return;
        }
        try {
            const response = await apiFetch(`${API_ENDPOINTS.users}/search?q=${encodeURIComponent(query)}`);
            if (response.ok) {
                const data = await response.json();
                const otherUsers = (data.users || data || []).filter((u: User) => u.id !== user?.id);
                setUsers(otherUsers);

                // Update following status for search results
                const currentFollowing = new Set<string>(followingIds); // Keep existing known follows
                otherUsers.forEach((u: User) => {
                    if (u.isFollowing) currentFollowing.add(u.id);
                });
                setFollowingIds(currentFollowing);
            }
        } catch (error) {
            console.error('Search failed:', error);
        }
    }, [fetchUsers, user?.id, followingIds]);

    // Follow a user
    const handleFollow = async (userId: string) => {
        setConnectingIds(prev => new Set(prev).add(userId));
        try {
            const response = await apiFetch(`${API_ENDPOINTS.users}/${userId}/follow`, {
                method: 'POST',
            });
            if (response.ok) {
                setFollowingIds(prev => new Set(prev).add(userId));
            }
        } catch (error) {
            console.error('Failed to follow:', error);
        } finally {
            setConnectingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
        }
    };

    // Unfollow a user
    const handleUnfollow = async (userId: string) => {
        setConnectingIds(prev => new Set(prev).add(userId));
        try {
            const response = await apiFetch(`${API_ENDPOINTS.users}/${userId}/follow`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setFollowingIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(userId);
                    return newSet;
                });
            }
        } catch (error) {
            console.error('Failed to unfollow:', error);
        } finally {
            setConnectingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
        }
    };

    const { pullDistance, isRefreshing, containerRef: pullRef } = usePullToRefresh({
        onRefresh: async () => {
            await Promise.all([fetchUsers(), fetchPosts()]);
        },
    });

    useEffect(() => {
        setMounted(true);
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchUsers(), fetchPosts()]);
            setLoading(false);
        };
        loadData();
    }, [fetchUsers, fetchPosts]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeCategory === 'people' && searchQuery) {
                searchUsers(searchQuery);
            } else if (activeCategory === 'people' && !searchQuery) {
                fetchUsers();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, activeCategory, searchUsers, fetchUsers]);

    const categories = [
        { id: 'people', label: 'People' },
        { id: 'posts', label: 'Posts' },
        { id: 'tribes', label: 'Tribes' }
    ];

    if (!mounted) {
        return <div className="min-h-screen bg-[#050508]" />;
    }

    return (
        <div ref={pullRef} className="min-h-screen bg-[#050508] relative font-sans">
            {/* Pull-to-refresh indicator */}
            {pullDistance > 0 && (
                <div className="flex items-center justify-center py-2" style={{ height: pullDistance }}>
                    <div className={`w-5 h-5 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full ${isRefreshing ? 'animate-spin' : ''}`} />
                </div>
            )}
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[120px]" />
                <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-cyan-600/5 blur-[120px]" />
            </div>

            <Navigation
                activeTab="explore"
                userAvatarUrl={userAvatarUrl}
                displayName={user?.displayName}
                username={user?.username}
            />

            <main className="relative z-10 lg:ml-20 xl:ml-64 pb-24 lg:pb-8 transition-all duration-300">
                {/* Header */}
                <header className="sticky top-0 z-30 px-4 lg:px-6 py-4 bg-black/80 backdrop-blur-xl border-b border-white/5 supports-[backdrop-filter]:bg-black/60">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center gap-4">
                            {/* Search */}
                            <div className="flex-1 flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 focus-within:border-[#00D4FF]/30 focus-within:shadow-[0_0_20px_rgba(0,212,255,0.08)] transition-all duration-300 group">
                                <SearchIcon className="w-5 h-5 text-white/40 group-focus-within:text-[#00D4FF] transition-colors" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search people, tags, and vibes..."
                                    className="flex-1 bg-transparent text-white placeholder:text-white/30 focus:outline-none font-medium"
                                />
                            </div>
                        </div>

                        {/* Categories */}
                        <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide py-1">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`rounded-full px-4 py-1.5 text-sm transition-all ${activeCategory === cat.id
                                        ? 'bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/20 font-medium'
                                        : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:text-white/70 hover:bg-white/[0.06] duration-200'
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
                    {loading ? (
                        <div className="space-y-8">
                            {/* People grid skeleton */}
                            <div>
                                <div className="skeleton skeleton-text w-40 mb-4" />
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                        <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-3">
                                            <div className="skeleton w-16 h-16 rounded-full mx-auto" />
                                            <div className="skeleton skeleton-text w-24 mx-auto" />
                                            <div className="skeleton skeleton-text-sm w-16 mx-auto" />
                                            <div className="skeleton skeleton-button w-full" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Posts grid skeleton */}
                            <div>
                                <div className="skeleton skeleton-text w-40 mb-4" />
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <div key={i} className="skeleton rounded-xl aspect-square" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : activeCategory === 'people' ? (
                        /* People Grid */
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
                                    {searchQuery ? `Searching "${searchQuery}"` : 'Discover People'}
                                </span>
                            </h2>

                            {users.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden border-dashed">
                                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                                        <UsersIcon size={40} className="text-white/20" />
                                    </div>
                                    <p className="text-white/50 text-lg font-medium">No explorers found here.</p>
                                    <p className="text-white/30 text-sm mt-1">Try a different search term.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {users.map((u) => {
                                        const isFollowing = followingIds.has(u.id);
                                        const isConnecting = connectingIds.has(u.id);

                                        return (
                                            <motion.div
                                                key={u.id}
                                                className="group relative bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden p-5 hover:border-[#00D4FF]/20 transition-all duration-300"
                                                initial={{ opacity: 0, y: 15 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                layoutId={`user-${u.id}`}
                                            >
                                                {/* Hover Glow Effect */}
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-[#00D4FF]/10 blur-[50px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                                <div className="flex items-start gap-4 relative z-10">
                                                    <Link href={`/profile/${u.username}`} className="relative flex-shrink-0">
                                                        <div className="w-16 h-16 rounded-full overflow-hidden relative ring-2 ring-white/10 group-hover:ring-[#00D4FF]/50 transition-all">
                                                            <Image
                                                                src={u.avatarUrl && !u.avatarUrl.startsWith('preset:') ? u.avatarUrl : `https://ui-avatars.com/api/?name=${u.displayName || u.username}&background=random`}
                                                                alt={u.displayName || u.username}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                        {u.isOnline && (
                                                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-4 border-[#121216]" />
                                                        )}
                                                    </Link>

                                                    <div className="flex-1 min-w-0 pt-1">
                                                        <Link href={`/profile/${u.username}`} className="block">
                                                            <div className="flex items-center gap-1.5">
                                                                <h3 className="font-bold text-white text-lg truncate group-hover:text-[#00D4FF] transition-colors leading-tight">
                                                                    {u.displayName || u.username}
                                                                </h3>
                                                                {u.isVerified && (
                                                                    <div className="text-[#00D4FF]">
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                                        </svg>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <p className="text-white/40 text-sm font-medium">@{u.username}</p>
                                                        </Link>

                                                        {u.followersCount !== undefined && (
                                                            <p className="text-white/30 text-xs mt-1">
                                                                {u.followersCount} followers
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Bio */}
                                                {u.bio && (
                                                    <p className="text-white/60 text-sm mt-3 line-clamp-2 leading-relaxed h-[2.5em] relative z-10">
                                                        {u.bio}
                                                    </p>
                                                )}

                                                {/* Actions */}
                                                <div className="grid grid-cols-2 gap-2 mt-5 relative z-10">
                                                    <button
                                                        onClick={() => isFollowing ? handleUnfollow(u.id) : handleFollow(u.id)}
                                                        disabled={isConnecting}
                                                        className={`col-span-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${isFollowing
                                                            ? 'bg-white/5 text-white/60 hover:bg-red-500/10 hover:text-red-400 border border-white/5'
                                                            : 'bg-[#00D4FF] text-black hover:bg-[#00D4FF]/90 shadow-[0_4px_12px_rgba(6,182,212,0.2)]'
                                                            } ${isConnecting ? 'opacity-80 cursor-wait' : ''}`}
                                                    >
                                                        {isConnecting ? (
                                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                        ) : isFollowing ? (
                                                            'Following'
                                                        ) : (
                                                            'Connect'
                                                        )}
                                                    </button>
                                                    <Link
                                                        href={`/messages?to=${u.id}`}
                                                        className="col-span-1 py-2.5 rounded-xl bg-white/5 text-white font-medium text-sm hover:bg-white/10 hover:text-white transition-colors border border-white/5 flex items-center justify-center"
                                                    >
                                                        Message
                                                    </Link>
                                                </div>

                                                <Link
                                                    href={`/communities?invite=${u.id}`}
                                                    className="block w-full text-center mt-3 py-2 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors"
                                                >
                                                    + Invite to Tribe
                                                </Link>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : activeCategory === 'posts' ? (
                        /* Posts Grid */
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <TrendingIcon size={24} className="text-orange-500" />
                                <span>Trending Now</span>
                            </h2>

                            {posts.length === 0 ? (
                                <div className="text-center py-20 bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden border-dashed">
                                    <PlayIcon size={40} className="mx-auto text-white/20 mb-4" />
                                    <p className="text-white/50 font-medium">The feed is quiet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 md:gap-3">
                                    {posts.map((post, i) => (
                                        <motion.div
                                            key={post.id}
                                            className="relative bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden aspect-square group cursor-pointer hover:border-[#00D4FF]/20 transition-all duration-300"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: i * 0.05 }}
                                            whileHover={{ y: -5, zIndex: 10 }}
                                        >
                                            <Image
                                                src={post.thumbnailUrl || post.mediaUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&h=500&fit=crop'}
                                                alt={post.caption || 'Post'}
                                                fill
                                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                            {/* Gradient Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                                                <div className="text-white w-full">
                                                    <div className="flex items-center justify-between text-xs font-medium">
                                                        <div className="flex items-center gap-1">
                                                            <HeartIcon size={14} className="text-white" />
                                                            {post.viewCount}
                                                        </div>
                                                        {post.type === 'VIDEO' && <PlayIcon size={14} />}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Tribes Link */
                        <div className="flex flex-col items-center justify-center py-32 bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-[#00D4FF]/20 transition-all duration-300">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mb-6 ring-1 ring-white/10">
                                <UsersIcon size={48} className="text-violet-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Find Your Tribe</h3>
                            <p className="text-white/50 text-center max-w-md mb-8 leading-relaxed">
                                Connect with communities that share your passions. <br />From creators to gamers, everyone has a home here.
                            </p>
                            <Link href="/communities" className="px-8 py-3 rounded-full bg-white text-black font-bold hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                                Enter Tribes
                            </Link>
                        </div>
                    )}
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
