'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { API_ENDPOINTS, apiFetch } from '@/lib/api';

// ============================================
// TYPES
// ============================================
interface CommunityDetail {
    id: string;
    name: string;
    description: string;
    memberCount: number;
    isPrivate: boolean;
    coverUrl?: string;
    role: 'admin' | 'moderator' | 'member';
    createdAt: string;
    category?: string;
}

// ============================================
// SVG ICONS
// ============================================
const Icons = {
    back: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
    ),
    users: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
    ),
    cog: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    lock: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
    ),
    globe: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
    ),
    plus: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
    ),
    share: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
    ),
};

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&h=400&fit=crop';

// ============================================
// MAIN COMPONENT
// ============================================
export default function CommunityDetailPage() {
    const params = useParams();
    const communityId = params.id as string;
    const { user } = useAuth();

    const [community, setCommunity] = useState<CommunityDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchCommunity() {
            try {
                setIsLoading(true);
                const response = await apiFetch(`${API_ENDPOINTS.communities}/${communityId}`);
                if (response.ok) {
                    const data = await response.json();
                    setCommunity(data.community || data);
                } else if (response.status === 404) {
                    setError('Community not found');
                } else {
                    setError('Failed to load community');
                }
            } catch (err) {
                console.error('Error fetching community:', err);
                setError('Network error');
            } finally {
                setIsLoading(false);
            }
        }

        if (communityId) {
            fetchCommunity();
        }
    }, [communityId]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !community) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl font-semibold mb-2">Community Not Found</h1>
                <p className="text-white/50 mb-6">{error || 'This community does not exist or you don\'t have access.'}</p>
                <Link href="/communities" className="px-6 py-3 rounded-xl bg-[#00D4FF] text-black font-semibold">
                    Back to Tribes
                </Link>
            </div>
        );
    }

    const coverImage = community?.coverUrl || DEFAULT_COVER;
    const role = community?.role || 'member';
    const isAdmin = role === 'admin';
    const memberCount = community?.memberCount || 0;

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Cover Image */}
            <div className="relative h-48 md:h-64">
                <Image
                    src={coverImage}
                    alt={community.name}
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black" />

                {/* Back button */}
                <Link
                    href="/communities"
                    className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 rounded-xl bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
                >
                    {Icons.back}
                    <span className="text-sm font-medium">Back</span>
                </Link>

                {/* Settings button (admin only) */}
                {isAdmin && (
                    <Link
                        href={`/communities/${communityId}/settings`}
                        className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
                    >
                        {Icons.cog}
                    </Link>
                )}
            </div>

            {/* Content */}
            <div className="relative z-10 -mt-16 px-4 pb-8">
                <div className="max-w-2xl mx-auto">
                    {/* Header */}
                    <motion.div
                        className="bg-[#0A1628]/90 backdrop-blur-xl rounded-2xl border border-white/10 p-6 mb-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-white mb-1">{community.name}</h1>
                                <div className="flex items-center gap-3 text-sm text-white/50">
                                    <span className="flex items-center gap-1">
                                        {community.isPrivate ? Icons.lock : Icons.globe}
                                        {community.isPrivate ? 'Private' : 'Public'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        {Icons.users}
                                        {memberCount} members
                                    </span>
                                </div>
                            </div>
                            <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${role === 'admin'
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                : role === 'moderator'
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                    : 'bg-white/10 text-white/60 border border-white/10'
                                }`}>
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                            </span>
                        </div>

                        {community.description && (
                            <p className="text-white/70 mb-4">{community.description}</p>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-3">
                            <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#00D4FF] text-black font-semibold hover:opacity-90 transition-opacity">
                                {Icons.plus}
                                Post
                            </button>
                            <button className="px-4 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/15 transition-colors">
                                {Icons.share}
                            </button>
                        </div>
                    </motion.div>

                    {/* Posts Feed Placeholder */}
                    <motion.div
                        className="bg-white/5 rounded-2xl border border-white/10 p-8 text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#00D4FF]/20 to-[#8B5CF6]/20 flex items-center justify-center">
                            <span className="text-3xl">📝</span>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">No posts yet</h3>
                        <p className="text-white/50 mb-4">
                            Be the first to share something with your tribe!
                        </p>
                        <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white font-semibold hover:opacity-90 transition-opacity">
                            Create First Post
                        </button>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
