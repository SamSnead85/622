'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

interface StoryUser {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    hasMoment: boolean;
    isLive?: boolean;
    momentCount?: number;
}

export function EnhancedStoriesBar() {
    const [users, setUsers] = useState<StoryUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const load = async () => {
            try {
                // Fetch active moments/stories
                const momentsData = await apiFetch('/api/v1/moments').catch(() => ({ moments: [] }));
                const moments = momentsData?.moments || momentsData || [];

                // Create unique users from moments
                const userMap = new Map<string, StoryUser>();
                
                if (Array.isArray(moments)) {
                    moments.forEach((m: any) => {
                        const user = m.author || m.user;
                        if (user && !userMap.has(user.id)) {
                            userMap.set(user.id, {
                                id: user.id,
                                username: user.username,
                                displayName: user.displayName || user.username,
                                avatarUrl: user.avatarUrl,
                                hasMoment: true,
                                momentCount: 1,
                            });
                        } else if (user && userMap.has(user.id)) {
                            const existing = userMap.get(user.id)!;
                            existing.momentCount = (existing.momentCount || 0) + 1;
                        }
                    });
                }

                setUsers(Array.from(userMap.values()));
            } catch {}
            setIsLoading(false);
        };
        load();
    }, []);

    // Scroll with arrow buttons
    const scroll = (direction: 'left' | 'right') => {
        if (!scrollRef.current) return;
        const amount = direction === 'left' ? -200 : 200;
        scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    };

    return (
        <div className="relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00D4FF] animate-pulse" />
                    Stories
                </h3>
                <Link href="/moments" className="text-[#00D4FF] text-xs font-medium hover:underline">
                    See All
                </Link>
            </div>

            {/* Scrollable row */}
            <div className="relative group">
                {/* Scroll buttons */}
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Scroll left"
                >
                    ‹
                </button>
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Scroll right"
                >
                    ›
                </button>

                <div
                    ref={scrollRef}
                    className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 px-1"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {/* Add Your Story */}
                    <Link
                        href="/create"
                        className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[72px]"
                    >
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center hover:border-[#00D4FF]/50 transition-colors">
                                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} opacity={0.5}>
                                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                                </svg>
                            </div>
                        </div>
                        <span className="text-white/50 text-[10px] text-center truncate w-full">Your Story</span>
                    </Link>

                    {/* Loading state */}
                    {isLoading && Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[72px]">
                            <div className="w-16 h-16 rounded-full bg-white/10 animate-pulse" />
                            <div className="w-10 h-2 rounded bg-white/10 animate-pulse" />
                        </div>
                    ))}

                    {/* Story avatars */}
                    {users.map((user, i) => (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <Link
                                href={`/stories/${user.id}`}
                                className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[72px] group/story"
                            >
                                <div className="relative">
                                    {/* Gradient ring */}
                                    <div className={`w-[68px] h-[68px] rounded-full p-[3px] ${
                                        user.isLive
                                            ? 'bg-gradient-to-tr from-red-500 via-red-400 to-orange-500 animate-pulse'
                                            : user.hasMoment
                                                ? 'bg-gradient-to-tr from-[#00D4FF] via-[#8B5CF6] to-[#EC4899]'
                                                : 'bg-white/20'
                                    }`}>
                                        <div className="w-full h-full rounded-full bg-[#0A0A0F] p-[2px]">
                                            {user.avatarUrl ? (
                                                <img
                                                    src={user.avatarUrl}
                                                    alt={user.displayName}
                                                    className="w-full h-full rounded-full object-cover group-hover/story:scale-105 transition-transform"
                                                />
                                            ) : (
                                                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold text-lg">
                                                    {user.displayName[0]?.toUpperCase() || 'U'}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Live badge */}
                                    {user.isLive && (
                                        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-bold rounded uppercase tracking-wider">
                                            LIVE
                                        </span>
                                    )}

                                    {/* Moment count badge */}
                                    {user.momentCount && user.momentCount > 1 && !user.isLive && (
                                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#00D4FF] text-black text-[9px] font-bold rounded-full flex items-center justify-center">
                                            {user.momentCount}
                                        </span>
                                    )}
                                </div>
                                <span className="text-white/60 text-[10px] text-center truncate w-full group-hover/story:text-white transition-colors">
                                    {user.username}
                                </span>
                            </Link>
                        </motion.div>
                    ))}

                    {/* Empty state */}
                    {!isLoading && users.length === 0 && (
                        <div className="flex items-center gap-2 px-4 py-3 text-white/30 text-sm">
                            <span>No stories yet.</span>
                            <Link href="/create" className="text-[#00D4FF] hover:underline">Share yours</Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
