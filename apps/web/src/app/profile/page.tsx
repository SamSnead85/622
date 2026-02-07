'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, ProtectedRoute } from '@/contexts/AuthContext';
import { Avatar, useProfile, SECONDARY_LANGUAGES } from '@/components/ProfileEditor';
import { NavigationSidebar } from '@/components/dashboard/NavigationSidebar';
import { SettingsIcon, CameraIcon, PlusIcon, PlayIcon, HeartIcon } from '@/components/icons';
import { API_URL, API_ENDPOINTS, apiFetch } from '@/lib/api';
import { InlineComposer } from '@/components/InlineComposer';
import { DECOY_USER, DECOY_POSTS } from '@/lib/stealth/decoyData';

interface Post {
    id: string;
    type: 'IMAGE' | 'VIDEO' | 'TEXT' | 'POLL';
    mediaUrl?: string;
    mediaType?: string;
    content?: string;
    caption?: string;
    likesCount: number;
    commentsCount: number;
    viewCount: number;
    createdAt: string;
    sortOrder?: number;
    isPinned?: boolean;
}

function ProfilePageContent() {
    const { user, updateUser, isStealth } = useAuth();
    const { profile } = useProfile();
    const [activeTab, setActiveTab] = useState<'posts' | 'journeys' | 'saved'>('posts');
    const [mounted, setMounted] = useState(false);
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [savedPosts, setSavedPosts] = useState<Post[]>([]);
    const [savedLoading, setSavedLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ postsCount: 0, followersCount: 0, followingCount: 0 });
    const [coverUploading, setCoverUploading] = useState(false);
    const [reorderMode, setReorderMode] = useState(false);
    const [reorderSaving, setReorderSaving] = useState(false);
    const coverInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setMounted(true); }, []);

    // Seed stats from auth user object
    useEffect(() => {
        if (user) {
            setStats({
                postsCount: user.postsCount || 0,
                followersCount: user.followersCount || 0,
                followingCount: user.followingCount || 0,
            });
        }
    }, [user]);

    // Fetch user's posts from API
    const fetchPosts = useCallback(async () => {
        if (!user?.id) return;

        try {
            setLoading(true);
            const data = await apiFetch(`${API_URL}/api/v1/users/${user.id}/posts`);
            const posts = data.posts || [];
            setUserPosts(posts);
            // Update stats from server response
            setStats({
                postsCount: data.postsCount || posts.length,
                followersCount: data.followersCount || 0,
                followingCount: data.followingCount || 0,
            });
        } catch (error) {
            console.error('Failed to fetch posts:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    // Fetch saved posts
    const fetchSavedPosts = useCallback(async () => {
        if (!user?.id) return;
        try {
            setSavedLoading(true);
            const data = await apiFetch(`${API_URL}/api/v1/posts/saved`);
            setSavedPosts(data.posts || []);
        } catch (error) {
            console.error('Failed to fetch saved posts:', error);
        } finally {
            setSavedLoading(false);
        }
    }, [user?.id]);

    // ── Post reorder helpers ──
    const movePost = useCallback((index: number, direction: 'up' | 'down') => {
        setUserPosts(prev => {
            const arr = [...prev];
            const targetIdx = direction === 'up' ? index - 1 : index + 1;
            if (targetIdx < 0 || targetIdx >= arr.length) return prev;
            [arr[index], arr[targetIdx]] = [arr[targetIdx], arr[index]];
            return arr;
        });
    }, []);

    const saveReorder = useCallback(async () => {
        if (!user?.id || reorderSaving) return;
        try {
            setReorderSaving(true);
            // Send the new order — highest sortOrder = appears first
            const posts = userPosts.map((p, i) => ({
                id: p.id,
                sortOrder: userPosts.length - i, // first in array gets highest sortOrder
            }));
            await apiFetch(`${API_URL}/api/v1/posts/reorder`, {
                method: 'PUT',
                body: JSON.stringify({ posts }),
            });
            setReorderMode(false);
        } catch (error) {
            console.error('Failed to save post order:', error);
        } finally {
            setReorderSaving(false);
        }
    }, [user?.id, userPosts, reorderSaving]);

    const cancelReorder = useCallback(() => {
        setReorderMode(false);
        // Re-fetch to reset any local reorder
        fetchPosts();
    }, [fetchPosts]);

    // Upload cover image
    const handleCoverUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setCoverUploading(true);
            const formData = new FormData();
            formData.append('file', file);

            const token = localStorage.getItem('0g_token');
            const res = await fetch(API_ENDPOINTS.upload.cover, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                updateUser({ coverUrl: data.url });
            } else {
                console.error('Cover upload failed');
            }
        } catch (error) {
            console.error('Cover upload error:', error);
        } finally {
            setCoverUploading(false);
            // Reset input so same file can be re-selected
            if (coverInputRef.current) coverInputRef.current.value = '';
        }
    }, [updateUser]);

    useEffect(() => {
        if (mounted && user?.id) {
            if (isStealth) {
                // Travel Shield: load decoy posts
                const myDecoyPosts = DECOY_POSTS.filter(p => p.author.id === DECOY_USER.id);
                setUserPosts(myDecoyPosts.map(p => ({
                    id: p.id,
                    type: (p.type || 'IMAGE') as Post['type'],
                    mediaUrl: p.mediaUrl,
                    content: p.content,
                    likesCount: p.likes,
                    commentsCount: p.commentsCount,
                    viewCount: 0,
                    createdAt: p.createdAt,
                })));
                setStats({
                    postsCount: DECOY_USER.postsCount,
                    followersCount: DECOY_USER.followersCount,
                    followingCount: DECOY_USER.followingCount,
                });
                setLoading(false);
            } else {
                fetchPosts();
            }
        }
    }, [mounted, user?.id, fetchPosts, isStealth]);

    // Fetch saved posts when switching to saved tab
    useEffect(() => {
        if (mounted && user?.id && activeTab === 'saved' && savedPosts.length === 0) {
            fetchSavedPosts();
        }
    }, [mounted, user?.id, activeTab, fetchSavedPosts, savedPosts.length]);

    if (!mounted) {
        return <div className="min-h-screen bg-[#050508]" />;
    }

    // Use real user data with fallbacks
    const displayName = user?.displayName || profile?.displayName || 'Your Name';
    const displayNameSecondary = profile?.displayNameSecondary;
    const secondaryLanguage = profile?.secondaryLanguage;
    const secondaryLangInfo = SECONDARY_LANGUAGES.find(l => l.code === secondaryLanguage);
    const username = user?.username || profile?.username || 'username';
    const bio = user?.bio || profile?.bio || 'Add a bio to tell people about yourself';
    const avatarUrl = user?.avatarUrl || profile?.avatarCustomUrl;

    return (
        <div className="min-h-screen bg-[#050508] relative">
            {/* Ambient */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/3 w-96 h-96 rounded-full bg-orange-500/5 blur-[100px]" />
                <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-violet-500/5 blur-[100px]" />
            </div>

            <NavigationSidebar />

            <main className="relative z-10 lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
                {/* Profile Header */}
                <div className="relative">
                    {/* Cover Image */}
                    <div className="h-32 md:h-48 lg:h-56 bg-gradient-to-br from-orange-900/50 via-rose-900/50 to-violet-900/50 relative overflow-hidden group/cover">
                        <Image
                            src={user?.coverUrl || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=400&fit=crop"}
                            alt="Cover"
                            fill
                            className={`object-cover ${user?.coverUrl ? 'opacity-80' : 'opacity-50'}`}
                        />
                        {/* Cover upload overlay */}
                        <input
                            ref={coverInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={handleCoverUpload}
                        />
                        <button
                            onClick={() => coverInputRef.current?.click()}
                            disabled={coverUploading}
                            className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/cover:bg-black/40 transition-all duration-300 cursor-pointer"
                        >
                            <div className="opacity-0 group-hover/cover:opacity-100 transition-opacity duration-300 flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm text-white/90 text-sm font-medium">
                                {coverUploading ? (
                                    <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                                ) : (
                                    <CameraIcon size={18} />
                                )}
                                {coverUploading ? 'Uploading...' : 'Change Cover'}
                            </div>
                        </button>
                    </div>

                    {/* Profile Info */}
                    <div className="max-w-4xl mx-auto px-4 lg:px-6">
                        <div className="relative -mt-16 md:-mt-20 flex flex-col md:flex-row md:items-end gap-4 pb-6 border-b border-white/10">
                            {/* Avatar - Now using real user data */}
                            <motion.div
                                className="ring-4 ring-[#050508] bg-[#050508] rounded-full"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                            >
                                {avatarUrl && !avatarUrl.startsWith('preset:') ? (
                                    <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden relative">
                                        <Image
                                            src={avatarUrl}
                                            alt={displayName}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        {/* Desktop Avatar */}
                                        <div className="hidden md:block">
                                            <Avatar profile={profile} size={144} />
                                        </div>
                                        {/* Mobile Avatar */}
                                        <div className="md:hidden">
                                            <Avatar profile={profile} size={112} />
                                        </div>
                                    </>
                                )}
                            </motion.div>

                            {/* Info */}
                            <div className="flex-1">
                                <div className="flex flex-col md:flex-row md:items-start gap-3 mb-3">
                                    {/* Name Display - Primary + Secondary Language */}
                                    <div className="flex flex-col">
                                        <h1 className="text-2xl md:text-3xl font-bold text-white">{displayName}</h1>
                                        {/* Secondary Language Name */}
                                        {displayNameSecondary && (
                                            <span
                                                className="text-lg text-white/60 mt-0.5"
                                                dir={secondaryLangInfo?.direction || 'ltr'}
                                                style={{
                                                    fontFamily: secondaryLanguage === 'ar' || secondaryLanguage === 'fa' || secondaryLanguage === 'ur' || secondaryLanguage === 'he'
                                                        ? '"Noto Sans Arabic", "Segoe UI", sans-serif'
                                                        : secondaryLanguage === 'zh' || secondaryLanguage === 'ja'
                                                            ? '"Noto Sans CJK", "Segoe UI", sans-serif'
                                                            : undefined
                                                }}
                                            >
                                                {displayNameSecondary}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 rounded-full bg-white/10 text-white/70 text-sm">@{username}</span>
                                        {user?.isVerified && (
                                            <span className="px-2 py-1 rounded-full bg-gradient-to-r from-orange-400 to-rose-500 text-white text-xs font-medium">PRO</span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-white/60 mb-4 max-w-lg">{bio}</p>

                                {/* Stats - Now using real counts */}
                                <div className="flex items-center gap-6">
                                    <div className="text-center">
                                        <p className="text-xl font-bold text-white">{stats.postsCount}</p>
                                        <p className="text-xs text-white/50">Posts</p>
                                    </div>
                                    <div className="text-center cursor-pointer hover:opacity-80">
                                        <p className="text-xl font-bold text-white">{stats.followersCount}</p>
                                        <p className="text-xs text-white/50">Followers</p>
                                    </div>
                                    <div className="text-center cursor-pointer hover:opacity-80">
                                        <p className="text-xl font-bold text-white">{stats.followingCount}</p>
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
                                <Link href="/settings" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/15 transition-colors">
                                    <SettingsIcon size={18} className="text-white/70" />
                                </Link>
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
                            {activeTab === 'posts' && (
                                <>
                                    {/* Compose on your profile — visible to your followers */}
                                    {user && !isStealth && (
                                        <div className="mb-6 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 hover:border-white/[0.12] focus-within:border-[#00D4FF]/30 transition-all">
                                            <InlineComposer
                                                user={user}
                                                onPostSuccess={() => fetchPosts()}
                                            />
                                        </div>
                                    )}

                                    {/* Reorder controls bar */}
                                    {userPosts.length > 1 && user && !isStealth && (
                                        <div className="flex items-center justify-between mb-4 px-1">
                                            {reorderMode ? (
                                                <>
                                                    <span className="text-sm text-white/60">
                                                        Drag posts up/down to set display order
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={cancelReorder}
                                                            className="px-4 py-1.5 text-sm rounded-full bg-white/10 text-white/70 hover:bg-white/15 transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={saveReorder}
                                                            disabled={reorderSaving}
                                                            className="px-4 py-1.5 text-sm rounded-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                                                        >
                                                            {reorderSaving ? 'Saving...' : 'Save Order'}
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-sm text-white/40">
                                                        {userPosts.length} posts
                                                    </span>
                                                    <button
                                                        onClick={() => setReorderMode(true)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full bg-white/[0.06] text-white/60 hover:bg-white/10 hover:text-white/80 transition-all"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <line x1="4" y1="9" x2="20" y2="9" />
                                                            <line x1="4" y1="15" x2="20" y2="15" />
                                                            <line x1="10" y1="3" x2="8" y2="6" />
                                                            <line x1="10" y1="3" x2="12" y2="6" />
                                                            <line x1="14" y1="21" x2="12" y2="18" />
                                                            <line x1="14" y1="21" x2="16" y2="18" />
                                                        </svg>
                                                        Reorder Posts
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {userPosts.length > 0 ? (
                                        reorderMode ? (
                                            /* ── Reorder list view ── */
                                            <div className="space-y-2">
                                                {userPosts.map((post, i) => (
                                                    <motion.div
                                                        key={post.id}
                                                        layout
                                                        className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] transition-colors"
                                                    >
                                                        {/* Position number */}
                                                        <span className="w-7 h-7 flex-shrink-0 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/60">
                                                            {i + 1}
                                                        </span>

                                                        {/* Thumbnail */}
                                                        <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-black/30">
                                                            {post.mediaUrl ? (
                                                                <Image
                                                                    src={post.mediaUrl}
                                                                    alt=""
                                                                    width={56}
                                                                    height={56}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full bg-gradient-to-br from-orange-900/50 to-violet-900/50 flex items-center justify-center">
                                                                    <span className="text-white/40 text-[10px]">Text</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Post info */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-white/80 truncate">
                                                                {post.content || post.caption || `${post.type} post`}
                                                            </p>
                                                            <p className="text-xs text-white/40 mt-0.5">
                                                                {post.likesCount} likes · {post.commentsCount} comments
                                                                {post.isPinned && <span className="ml-2 text-[#00D4FF]">📌 Pinned</span>}
                                                            </p>
                                                        </div>

                                                        {/* Up/Down arrows */}
                                                        <div className="flex flex-col gap-0.5">
                                                            <button
                                                                onClick={() => movePost(i, 'up')}
                                                                disabled={i === 0}
                                                                className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center hover:bg-white/15 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                                                                title="Move up"
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="18 15 12 9 6 15" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => movePost(i, 'down')}
                                                                disabled={i === userPosts.length - 1}
                                                                className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center hover:bg-white/15 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                                                                title="Move down"
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="6 9 12 15 18 9" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        ) : (
                                            /* ── Normal grid view ── */
                                            <div className="grid grid-cols-3 gap-1 md:gap-2">
                                                {userPosts.map((post, i) => (
                                                    <Link key={post.id} href={`/post/${post.id}`}>
                                                        <motion.div
                                                            className="relative aspect-square overflow-hidden rounded-lg cursor-pointer group"
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ delay: i * 0.03 }}
                                                            whileHover={{ scale: 1.02 }}
                                                        >
                                                            {post.mediaUrl ? (
                                                                <Image
                                                                    src={post.mediaUrl}
                                                                    alt={post.content || post.caption || `Post ${post.id}`}
                                                                    fill
                                                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full bg-gradient-to-br from-orange-900/50 to-violet-900/50 flex items-center justify-center">
                                                                    <span className="text-white/70 text-sm text-center px-2">{(post.content || post.caption)?.slice(0, 50)}</span>
                                                                </div>
                                                            )}
                                                            {post.type === 'VIDEO' && (
                                                                <div className="absolute top-2 right-2 text-white">
                                                                    <PlayIcon size={20} />
                                                                </div>
                                                            )}
                                                            {/* Position badge in reorder-aware mode */}
                                                            {post.isPinned && (
                                                                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] text-[#00D4FF] font-medium">
                                                                    📌
                                                                </div>
                                                            )}
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white font-semibold flex items-center gap-2">
                                                                    <HeartIcon size={20} className="fill-white" />
                                                                    {post.likesCount.toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </motion.div>
                                                    </Link>
                                                ))}
                                            </div>
                                        )
                                    ) : (
                                        <div className="text-center py-16">
                                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-400/20 to-rose-400/20 flex items-center justify-center">
                                                <CameraIcon size={32} className="text-orange-400" />
                                            </div>
                                            <h3 className="text-xl font-semibold text-white mb-2">No Posts Yet</h3>
                                            <p className="text-white/50 mb-6 max-w-md mx-auto">
                                                Share your first moment with your community
                                            </p>
                                            <Link
                                                href="/create"
                                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-semibold hover:opacity-90 transition-opacity"
                                            >
                                                <PlusIcon size={18} />
                                                Create Your First Post
                                            </Link>
                                        </div>
                                    )}
                                </>
                            )}

                            {activeTab === 'journeys' && (
                                <div className="text-center py-16">
                                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center text-white/25">
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-2">No Journeys Yet</h3>
                                    <p className="text-white/50 mb-6 max-w-md mx-auto">
                                        Share short videos with your community
                                    </p>
                                    <Link
                                        href="/create?type=moment"
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-opacity"
                                    >
                                        <PlusIcon size={18} />
                                        Create a Journey
                                    </Link>
                                </div>
                            )}

                            {activeTab === 'saved' && (
                                <>
                                    {savedLoading ? (
                                        <div className="grid grid-cols-3 gap-1 md:gap-2">
                                            {[1,2,3,4,5,6].map(i => (
                                                <div key={i} className="aspect-square bg-white/5 rounded-lg animate-pulse" />
                                            ))}
                                        </div>
                                    ) : savedPosts.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-1 md:gap-2">
                                            {savedPosts.map((post, i) => (
                                                <Link key={post.id} href={`/post/${post.id}`}>
                                                    <motion.div
                                                        className="relative aspect-square overflow-hidden rounded-lg cursor-pointer group"
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: i * 0.03 }}
                                                        whileHover={{ scale: 1.02 }}
                                                    >
                                                        {post.mediaUrl ? (
                                                            <Image
                                                                src={post.mediaUrl}
                                                                alt={post.content || post.caption || `Saved post`}
                                                                fill
                                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-violet-900/50 to-blue-900/50 flex items-center justify-center">
                                                                <span className="text-white/70 text-sm text-center px-2">{(post.content || post.caption)?.slice(0, 50)}</span>
                                                            </div>
                                                        )}
                                                        {post.type === 'VIDEO' && (
                                                            <div className="absolute top-2 right-2 text-white">
                                                                <PlayIcon size={20} />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white font-semibold flex items-center gap-2">
                                                                <HeartIcon size={20} className="fill-white" />
                                                                {post.likesCount.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </motion.div>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-16">
                                            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center text-white/25">
                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                                            </div>
                                            <h3 className="text-xl font-semibold text-white mb-2">No Saved Posts</h3>
                                            <p className="text-white/50 mb-6 max-w-md mx-auto">
                                                Bookmark posts you love and they&apos;ll appear here
                                            </p>
                                            <Link
                                                href="/explore"
                                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/15 transition-colors"
                                            >
                                                Explore Posts
                                            </Link>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Wrap with ProtectedRoute for authentication requirement
export default function ProfilePage() {
    return (
        <ProtectedRoute>
            <ProfilePageContent />
        </ProtectedRoute>
    );
}
