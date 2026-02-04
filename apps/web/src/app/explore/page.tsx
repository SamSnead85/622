'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useAuth, ProtectedRoute } from '@/contexts/AuthContext';
import { API_ENDPOINTS, apiFetch } from '@/lib/api';
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
interface User {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    followersCount?: number;
    isOnline?: boolean;
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
function Navigation({ activeTab, userAvatarUrl, displayName, username }: { activeTab: string; userAvatarUrl?: string; displayName?: string; username?: string }) {
    const avatarHref = userAvatarUrl && !userAvatarUrl.startsWith('preset:') ? userAvatarUrl : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face';
    const navItems = [
        { id: 'home', Icon: HomeIcon, label: 'Home', href: '/dashboard' },
        { id: 'explore', Icon: SearchIcon, label: 'Explore', href: '/explore' },
        { id: 'communities', Icon: UsersIcon, label: 'Tribes', href: '/communities' },
        { id: 'invite', Icon: SendIcon, label: 'Invite', href: '/invite' },
        { id: 'messages', Icon: MessageIcon, label: 'Messages', href: '/messages' },
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
                            <item.Icon size={24} />
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
                            <item.Icon size={22} />
                            <span className="text-[10px]">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </nav>
        </>
    );
}

function ExplorePageContent() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('people');
    const [mounted, setMounted] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const { user } = useAuth();
    const userAvatarUrl = user?.avatarUrl;

    // Fetch real users from API
    const fetchUsers = useCallback(async () => {
        try {
            const response = await apiFetch(`${API_ENDPOINTS.users}?limit=20`);
            if (response.ok) {
                const data = await response.json();
                // Filter out current user
                const otherUsers = (data.users || data || []).filter((u: User) => u.id !== user?.id);
                setUsers(otherUsers);
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
            }
        } catch (error) {
            console.error('Search failed:', error);
        }
    }, [fetchUsers, user?.id]);

    // Follow a user
    const handleFollow = async (userId: string) => {
        try {
            const response = await apiFetch(`${API_ENDPOINTS.users}/${userId}/follow`, {
                method: 'POST',
            });
            if (response.ok) {
                setFollowingIds(prev => new Set(prev).add(userId));
            }
        } catch (error) {
            console.error('Failed to follow:', error);
        }
    };

    // Unfollow a user
    const handleUnfollow = async (userId: string) => {
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
        }
    };

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
            if (activeCategory === 'people') {
                searchUsers(searchQuery);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, activeCategory, searchUsers]);

    const categories = ['people', 'posts', 'tribes'];

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
                                    placeholder="Search people by name or username..."
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
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full animate-spin" />
                        </div>
                    ) : activeCategory === 'people' ? (
                        /* People Grid */
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <UsersIcon size={20} className="text-cyan-500" />
                                {searchQuery ? `Search results for "${searchQuery}"` : 'People on 0G'}
                            </h2>

                            {users.length === 0 ? (
                                <div className="text-center py-12">
                                    <UsersIcon size={48} className="mx-auto text-white/20 mb-4" />
                                    <p className="text-white/50">
                                        {searchQuery ? 'No users found matching your search' : 'No other users yet. Invite friends to join!'}
                                    </p>
                                    <Link href="/invite" className="inline-block mt-4 px-6 py-2 rounded-full bg-[#00D4FF] text-black font-medium">
                                        Invite Friends
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {users.map((u) => (
                                        <motion.div
                                            key={u.id}
                                            className="bg-white/5 rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-colors"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Link href={`/profile/${u.username}`} className="relative">
                                                    <div className="w-14 h-14 rounded-full overflow-hidden relative ring-2 ring-white/10">
                                                        <Image
                                                            src={u.avatarUrl && !u.avatarUrl.startsWith('preset:') ? u.avatarUrl : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'}
                                                            alt={u.displayName || u.username}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                    {/* Online indicator */}
                                                    {u.isOnline && (
                                                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-[#050508]" />
                                                    )}
                                                </Link>
                                                <div className="flex-1 min-w-0">
                                                    <Link href={`/profile/${u.username}`}>
                                                        <p className="font-semibold text-white truncate hover:text-[#00D4FF] transition-colors">
                                                            {u.displayName || u.username}
                                                        </p>
                                                    </Link>
                                                    <p className="text-sm text-white/50">@{u.username}</p>
                                                    {u.bio && <p className="text-xs text-white/40 truncate mt-1">{u.bio}</p>}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-4">
                                                {followingIds.has(u.id) ? (
                                                    <button
                                                        onClick={() => handleUnfollow(u.id)}
                                                        className="flex-1 px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors"
                                                    >
                                                        Following
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleFollow(u.id)}
                                                        className="flex-1 px-4 py-2 rounded-xl bg-[#00D4FF] text-black text-sm font-medium hover:bg-[#00D4FF]/90 transition-colors"
                                                    >
                                                        Connect
                                                    </button>
                                                )}
                                                <Link href={`/messages?to=${u.id}`} className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors">
                                                    Message
                                                </Link>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : activeCategory === 'posts' ? (
                        /* Posts Grid */
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <TrendingIcon size={20} className="text-orange-500" />
                                Public Posts
                            </h2>

                            {posts.length === 0 ? (
                                <div className="text-center py-12">
                                    <PlayIcon size={48} className="mx-auto text-white/20 mb-4" />
                                    <p className="text-white/50">No public posts yet. Be the first to share!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-1 md:gap-2">
                                    {posts.map((post, i) => (
                                        <motion.div
                                            key={post.id}
                                            className="relative overflow-hidden rounded-lg md:rounded-xl cursor-pointer group aspect-square"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: i * 0.03 }}
                                            whileHover={{ scale: 1.02 }}
                                        >
                                            <Image
                                                src={post.thumbnailUrl || post.mediaUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop'}
                                                alt={post.caption || 'Post'}
                                                fill
                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-4 text-white">
                                                    {post.type === 'VIDEO' ? (
                                                        <span className="flex items-center gap-1">
                                                            <PlayIcon size={18} />
                                                            <span className="font-semibold">{(post.viewCount / 1000).toFixed(0)}K</span>
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1">
                                                            <HeartIcon size={18} />
                                                            <span className="font-semibold">{post.viewCount}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {post.type === 'VIDEO' && (
                                                <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/50 text-white text-xs">
                                                    <PlayIcon size={14} />
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Tribes Link */
                        <div className="text-center py-12">
                            <UsersIcon size={48} className="mx-auto text-white/20 mb-4" />
                            <p className="text-white/50 mb-4">Explore and join tribes to connect with communities</p>
                            <Link href="/communities" className="inline-block px-6 py-2 rounded-full bg-[#00D4FF] text-black font-medium">
                                Browse Tribes
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
