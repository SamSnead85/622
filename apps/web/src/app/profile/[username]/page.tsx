'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { Navigation } from '@/components/Navigation';
import { RightSidebar } from '@/components/RightSidebar';
import { HeartIcon, PlayIcon } from '@/components/icons'; // Ensure PlayIcon is imported if referenced

export default function PublicProfilePage() {
    const params = useParams();
    const { username } = params as { username: string };
    const [profile, setProfile] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]); // Using 'any' for now to match API response speed
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                // 1. Fetch Profile
                const userRes = await apiFetch(`/users/username/${username}`);
                if (!userRes.ok) throw new Error('User not found');
                const userData = await userRes.json();
                setProfile(userData.user);

                // 2. Fetch Posts (using ID from profile)
                if (userData.user?.id) {
                    const userId = userData.user.id;
                    const postsRes = await apiFetch(`/users/${userId}/posts`);
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
        };
        loadData();
    }, [username]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050508] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-rose-500 rounded-full animate-spin" />
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
        <div className="min-h-screen bg-[#050508] relative">
            {/* Ambient Background matching Premium Theme */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/3 w-96 h-96 rounded-full bg-orange-500/5 blur-[100px]" />
                <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-violet-500/5 blur-[100px]" />
            </div>

            <Navigation activeTab="profile" />
            <RightSidebar />

            <main className="lg:ml-20 xl:ml-64 lg:mr-80 min-h-screen pb-20 lg:pb-8 relative z-10">
                {/* Cover & Header */}
                <div className="relative">
                    <div className="h-48 lg:h-64 bg-gradient-to-br from-slate-900 to-black relative overflow-hidden">
                        {/* Generic pleasant cover gradient/placeholder if no user cover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-900/20 via-rose-900/20 to-violet-900/20" />
                    </div>

                    <div className="max-w-4xl mx-auto px-6 relative">
                        <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-20 md:-mt-16 mb-8">
                            {/* Avatar */}
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-[#050508] p-1.5 relative z-10">
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

                                <div className="flex gap-6 text-sm mb-4">
                                    <span className="text-white"><strong className="text-white">{posts.length}</strong> <span className="text-white/50">Posts</span></span>
                                    <span className="text-white"><strong className="text-white">{profile._count?.followers || 0}</strong> <span className="text-white/50">Followers</span></span>
                                    <span className="text-white"><strong className="text-white">{profile._count?.following || 0}</strong> <span className="text-white/50">Following</span></span>
                                </div>

                                <p className="text-white/80 max-w-lg leading-relaxed">{profile.bio || 'Member of ZeroG'}</p>
                            </div>

                            {/* Actions */}
                            <div className="mb-4 self-center md:self-end">
                                <button className="bg-white text-black font-bold px-8 py-2.5 rounded-full hover:bg-white/90 transition-colors shadow-lg shadow-white/10">
                                    Follow
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="max-w-4xl mx-auto px-6">
                    <div className="border-t border-white/10 pt-8">
                        {posts.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2 md:gap-4">
                                {posts.map((post) => (
                                    <motion.div
                                        key={post.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="aspect-square bg-white/5 rounded-xl overflow-hidden relative group cursor-pointer"
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
