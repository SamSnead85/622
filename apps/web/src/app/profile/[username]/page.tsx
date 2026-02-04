'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';
import { MessageIcon, PlusIcon, MinusIcon, CameraIcon, PlayIcon } from '@/components/icons';

interface UserProfile {
    id: string;
    username: string;
    displayName: string;
    bio?: string;
    avatarUrl?: string;
    isFollowing?: boolean;
    followersCount: number;
    followingCount: number;
    postsCount: number;
}

interface Post {
    id: string;
    type: 'IMAGE' | 'VIDEO' | 'TEXT' | 'POLL';
    mediaUrl?: string;
    content?: string;
    likesCount: number;
    commentsCount: number;
    createdAt: string;
}

export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const username = params?.username as string;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    // Redirect to own profile if viewing self
    useEffect(() => {
        if (mounted && currentUser?.username === username) {
            router.replace('/profile');
        }
    }, [mounted, currentUser?.username, username, router]);

    const fetchProfile = useCallback(async () => {
        if (!username) return;

        try {
            setLoading(true);
            setError(null);

            const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://caravanserver-production-d7da.up.railway.app';

            // Fetch user profile
            const profileRes = await fetch(`${apiUrl}/api/v1/users/${username}`, {
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                credentials: 'include',
            });

            if (!profileRes.ok) {
                if (profileRes.status === 404) {
                    setError('User not found');
                } else {
                    setError('Failed to load profile');
                }
                setLoading(false);
                return;
            }

            const profileData = await profileRes.json();
            setProfile(profileData.user || profileData);
            setIsFollowing(profileData.user?.isFollowing || profileData.isFollowing || false);

            // Fetch user's posts
            const userId = profileData.user?.id || profileData.id;
            if (userId) {
                const postsRes = await fetch(`${apiUrl}/api/v1/users/${userId}/posts`, {
                    headers: {
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    },
                    credentials: 'include',
                });

                if (postsRes.ok) {
                    const postsData = await postsRes.json();
                    setPosts(postsData.posts || []);
                }
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            setError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    }, [username]);

    useEffect(() => {
        if (mounted && username) {
            fetchProfile();
        }
    }, [mounted, username, fetchProfile]);

    const handleFollow = async () => {
        if (!profile?.id) return;

        const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
        if (!token) {
            router.push('/auth');
            return;
        }

        setFollowLoading(true);
        const method = isFollowing ? 'DELETE' : 'POST';
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://caravanserver-production-d7da.up.railway.app';

        try {
            const res = await fetch(`${apiUrl}/api/v1/users/${profile.id}/follow`, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (res.ok) {
                setIsFollowing(!isFollowing);
                // Update follower count
                setProfile(prev => prev ? {
                    ...prev,
                    followersCount: prev.followersCount + (isFollowing ? -1 : 1)
                } : null);
            }
        } catch (err) {
            console.error('Error following user:', err);
        } finally {
            setFollowLoading(false);
        }
    };

    const handleMessage = () => {
        if (!profile?.id) return;
        router.push(`/messages?user=${profile.id}`);
    };

    if (!mounted) {
        return <div className="min-h-screen bg-black" />;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-[#00D4FF]/20 border-t-[#00D4FF] animate-spin" />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-black text-white">
                <Navigation activeTab="explore" />
                <main className="lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
                    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                        <div className="text-6xl mb-4">🔍</div>
                        <h1 className="text-2xl font-bold mb-2">{error || 'User not found'}</h1>
                        <p className="text-white/50 mb-6">The user @{username} doesn't exist or their profile is private.</p>
                        <Link
                            href="/explore"
                            className="inline-block px-6 py-3 rounded-xl bg-[#00D4FF] text-black font-semibold hover:opacity-90"
                        >
                            Explore Users
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0A1628] via-black to-black" />
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[#00D4FF]/5 blur-[120px]" />
            </div>

            <Navigation activeTab="explore" />

            <main className="relative z-10 lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
                {/* Cover Image */}
                <div className="h-32 md:h-48 lg:h-56 bg-gradient-to-br from-[#00D4FF]/20 via-[#8B5CF6]/20 to-black relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />
                </div>

                {/* Profile Info */}
                <div className="max-w-4xl mx-auto px-4 lg:px-6">
                    <div className="relative -mt-16 md:-mt-20 flex flex-col md:flex-row md:items-end gap-4 pb-6 border-b border-white/10">
                        {/* Avatar */}
                        <motion.div
                            className="ring-4 ring-black bg-black rounded-full w-28 h-28 md:w-36 md:h-36 overflow-hidden"
                            initial={false}
                        >
                            {profile.avatarUrl ? (
                                <Image
                                    src={profile.avatarUrl}
                                    alt={profile.displayName}
                                    width={144}
                                    height={144}
                                    className="object-cover w-full h-full"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold text-4xl">
                                    {profile.displayName?.[0] || 'U'}
                                </div>
                            )}
                        </motion.div>

                        {/* Info */}
                        <div className="flex-1">
                            <div className="flex flex-col md:flex-row md:items-start gap-3 mb-3">
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-white">{profile.displayName}</h1>
                                    <span className="text-white/50">@{profile.username}</span>
                                </div>
                            </div>
                            {profile.bio && (
                                <p className="text-white/70 mb-4 max-w-lg">{profile.bio}</p>
                            )}

                            {/* Stats */}
                            <div className="flex items-center gap-6">
                                <div className="text-center">
                                    <p className="text-xl font-bold text-white">{profile.postsCount || 0}</p>
                                    <p className="text-xs text-white/50">Posts</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-bold text-white">{profile.followersCount || 0}</p>
                                    <p className="text-xs text-white/50">Followers</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-bold text-white">{profile.followingCount || 0}</p>
                                    <p className="text-xs text-white/50">Following</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button
                                onClick={handleFollow}
                                disabled={followLoading}
                                className={`flex items-center gap-2 px-6 py-2 rounded-full font-medium transition-all ${isFollowing
                                    ? 'bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400'
                                    : 'bg-[#00D4FF] text-black hover:opacity-90'
                                    }`}
                            >
                                {isFollowing ? (
                                    <>
                                        <MinusIcon size={18} />
                                        Following
                                    </>
                                ) : (
                                    <>
                                        <PlusIcon size={18} />
                                        Follow
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleMessage}
                                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                            >
                                <MessageIcon size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Posts Grid */}
                    <div className="py-6">
                        {posts.length > 0 ? (
                            <div className="grid grid-cols-3 gap-1 md:gap-2">
                                {posts.map((post, i) => (
                                    <Link
                                        key={post.id}
                                        href={`/post/${post.id}`}
                                        className="relative aspect-square overflow-hidden rounded-lg cursor-pointer group"
                                    >
                                        {post.mediaUrl ? (
                                            <Image
                                                src={post.mediaUrl}
                                                alt={post.content || `Post ${post.id}`}
                                                fill
                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-[#00D4FF]/20 to-[#8B5CF6]/20 flex items-center justify-center">
                                                <span className="text-white/70 text-sm text-center px-2 line-clamp-3">{post.content?.slice(0, 50)}</span>
                                            </div>
                                        )}
                                        {post.type === 'VIDEO' && (
                                            <div className="absolute top-2 right-2 text-white">
                                                <PlayIcon size={20} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white font-semibold flex items-center gap-1">
                                                ❤️ {post.likesCount || 0}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#00D4FF]/20 to-[#8B5CF6]/20 flex items-center justify-center">
                                    <CameraIcon size={32} className="text-[#00D4FF]" />
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">No Posts Yet</h3>
                                <p className="text-white/50">
                                    {profile.displayName} hasn't shared any posts yet.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
