'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

interface TrendingTag {
    id: string;
    name: string;
    usageCount: number;
}

interface TrendingCommunity {
    id: string;
    name: string;
    iconUrl?: string;
    _count?: { members: number };
}

export function TrendingSection() {
    const [hashtags, setHashtags] = useState<TrendingTag[]>([]);
    const [communities, setCommunities] = useState<TrendingCommunity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadTrending = async () => {
            try {
                const [tagsData, commData] = await Promise.all([
                    apiFetch('/api/v1/search/trending').catch(() => ({ trending: [] })),
                    apiFetch('/api/v1/communities?limit=5&sortBy=memberCount').catch(() => ({ communities: [] })),
                ]);
                setHashtags((tagsData?.trending || []).slice(0, 8));
                setCommunities((commData?.communities || commData || []).slice(0, 5));
            } catch {}
            setIsLoading(false);
        };
        loadTrending();
    }, []);

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-10 rounded-xl bg-white/5 animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Trending Hashtags */}
            {hashtags.length > 0 && (
                <div>
                    <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#7C8FFF" strokeWidth={2}>
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                            <circle cx="7" cy="7" r="1" fill="#7C8FFF" />
                        </svg>
                        Trending
                    </h3>
                    <div className="space-y-1">
                        {hashtags.map((tag, i) => (
                            <motion.div
                                key={tag.id}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                            >
                                <div>
                                    <p className="text-white text-sm font-medium group-hover:text-[#7C8FFF] transition-colors">
                                        #{tag.name}
                                    </p>
                                    <p className="text-white/30 text-xs">{tag.usageCount.toLocaleString()} posts</p>
                                </div>
                                <span className="text-white/20 text-xs font-mono">{i + 1}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Communities */}
            {communities.length > 0 && (
                <div>
                    <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#6070EE" strokeWidth={2}>
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                        </svg>
                        Active Communities
                    </h3>
                    <div className="space-y-1">
                        {communities.map((community, i) => (
                            <Link
                                key={community.id}
                                href={`/communities/${community.id}`}
                                className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-lg bg-[#6070EE]/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {community.iconUrl ? (
                                        <img src={community.iconUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-sm">🏛</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium truncate">{community.name}</p>
                                    <p className="text-white/30 text-xs">{community._count?.members || 0} members</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Security reminder */}
            <Link
                href="/transparency"
                className="block p-4 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/10 hover:border-emerald-500/20 transition-colors"
            >
                <div className="flex items-center gap-2 mb-1">
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="#10B981">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                    </svg>
                    <span className="text-emerald-400 text-xs font-semibold">Your Privacy Matters</span>
                </div>
                <p className="text-white/40 text-xs">See what we don&apos;t track →</p>
            </Link>
        </div>
    );
}
