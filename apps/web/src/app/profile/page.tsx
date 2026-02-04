'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useAuth, ProtectedRoute } from '@/contexts/AuthContext';
import { Avatar, useProfile, SECONDARY_LANGUAGES } from '@/components/ProfileEditor';
import { Navigation } from '@/components/Navigation';
import { SettingsIcon, CameraIcon, PlusIcon, PlayIcon } from '@/components/icons';
import { API_ENDPOINTS, apiFetch } from '@/lib/api';

interface Post {
    id: string;
    type: 'IMAGE' | 'VIDEO' | 'TEXT' | 'POLL';
    mediaUrl?: string;
    caption?: string;
    likesCount: number;
    commentsCount: number;
    viewCount: number;
    createdAt: string;
}

function ProfilePageContent() {
    const { user } = useAuth();
    const { profile } = useProfile();
    const [activeTab, setActiveTab] = useState<'posts' | 'journeys' | 'saved'>('posts');
    const [mounted, setMounted] = useState(false);
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ postsCount: 0, followersCount: 0, followingCount: 0 });

    useEffect(() => { setMounted(true); }, []);

    // Fetch user's posts from API
    const fetchPosts = useCallback(async () => {
        if (!user?.id) return;

        try {
            setLoading(true);
            const response = await apiFetch(`/users/${user.id}/posts`);

            if (response.ok) {
                const data = await response.json();
                setUserPosts(data.posts || []);
                setStats({
                    postsCount: data.postsCount || 0,
                    followersCount: data.followersCount || 0,
                    followingCount: data.followingCount || 0,
                });
            }
        } catch (error) {
            console.error('Failed to fetch posts:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (mounted && user?.id) {
            fetchPosts();
        }
    }, [mounted, user?.id, fetchPosts]);

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

            <Navigation activeTab="profile" />

            <main className="relative z-10 lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
                {/* Profile Header */}
                <div className="relative">
                    {/* Cover Image */}
                    <div className="h-32 md:h-48 lg:h-56 bg-gradient-to-br from-orange-900/50 via-rose-900/50 to-violet-900/50 relative overflow-hidden">
                        <Image
                            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=400&fit=crop"
                            alt="Cover"
                            fill
                            className="object-cover opacity-50"
                        />
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
                            {userPosts.length > 0 ? (
                                <div className="grid grid-cols-3 gap-1 md:gap-2">
                                    {userPosts.map((post, i) => (
                                        <motion.div
                                            key={post.id}
                                            className="relative aspect-square overflow-hidden rounded-lg cursor-pointer group"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: i * 0.03 }}
                                            whileHover={{ scale: 1.02 }}
                                        >
                                            {post.mediaUrl ? (
                                                <Image
                                                    src={post.mediaUrl}
                                                    alt={post.caption || `Post ${post.id}`}
                                                    fill
                                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-orange-900/50 to-violet-900/50 flex items-center justify-center">
                                                    <span className="text-white/70 text-sm text-center px-2">{post.caption?.slice(0, 50)}</span>
                                                </div>
                                            )}
                                            {/* Video indicator */}
                                            {post.type === 'VIDEO' && (
                                                <div className="absolute top-2 right-2 text-white">
                                                    <PlayIcon size={20} />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white font-semibold flex items-center gap-1">
                                                    🔥 {post.likesCount.toLocaleString()}
                                                </span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
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
