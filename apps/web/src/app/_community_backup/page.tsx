"use client";

/**
 * COMMUNITY COMMAND CENTER
 * Main community bulletin board with live pulse, trending content,
 * and external stream integration
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';

// Types
interface BulletinPost {
    id: string;
    type: 'ANNOUNCEMENT' | 'JOB' | 'COLLABORATION' | 'INVESTMENT' | 'EVENT' | 'CALL_TO_ACTION' | 'SPOTLIGHT' | 'DISCUSSION';
    title: string;
    content: string;
    category: string;
    mediaUrl?: string;
    externalLink?: string;
    location?: string;
    eventDate?: string;
    upvotes: number;
    downvotes: number;
    viewCount: number;
    commentsCount: number;
    isPinned: boolean;
    isVerified: boolean;
    createdAt: string;
    author: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
        isVerified: boolean;
    };
}

interface LiveStream {
    id: string;
    title: string;
    embedUrl: string;
    thumbnailUrl?: string;
    platformType: string;
    upvotes: number;
    suggestedBy: {
        username: string;
        avatarUrl?: string;
    };
}

// Category icons and colors
const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
    ANNOUNCEMENT: { icon: '📢', color: 'from-blue-500 to-cyan-500', label: 'Announcement' },
    JOB: { icon: '💼', color: 'from-emerald-500 to-teal-500', label: 'Job' },
    COLLABORATION: { icon: '🤝', color: 'from-violet-500 to-purple-500', label: 'Collaboration' },
    INVESTMENT: { icon: '💰', color: 'from-yellow-500 to-orange-500', label: 'Investment' },
    EVENT: { icon: '📅', color: 'from-rose-500 to-pink-500', label: 'Event' },
    CALL_TO_ACTION: { icon: '⚡', color: 'from-red-500 to-orange-500', label: 'Call to Action' },
    SPOTLIGHT: { icon: '✨', color: 'from-amber-500 to-yellow-500', label: 'Spotlight' },
    DISCUSSION: { icon: '💬', color: 'from-slate-500 to-gray-500', label: 'Discussion' },
};

// Live Pulse Component
function LivePulse({ count }: { count: number }) {
    return (
        <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full border border-red-500/30">
            <div className="relative">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping" />
            </div>
            <span className="text-white font-bold text-lg">{count.toLocaleString()}</span>
            <span className="text-white/70 text-sm">Online Now</span>
        </div>
    );
}

// Bulletin Card Component
function BulletinCard({ post, onVote }: { post: BulletinPost; onVote: (id: string, isUpvote: boolean) => void }) {
    const config = TYPE_CONFIG[post.type] || TYPE_CONFIG.DISCUSSION;
    const timeAgo = getTimeAgo(post.createdAt);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative p-5 rounded-2xl bg-gradient-to-br ${post.isPinned ? 'from-amber-900/30 to-orange-900/30 border-amber-500/30' : 'from-white/5 to-white/[0.02] border-white/10'} border backdrop-blur-sm hover:border-white/20 transition-all duration-300`}
        >
            {/* Pinned Badge */}
            {post.isPinned && (
                <div className="absolute -top-2 -right-2 px-2 py-1 bg-amber-500 text-black text-xs font-bold rounded-full">
                    📌 Pinned
                </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    {post.author.avatarUrl ? (
                        <Image
                            src={post.author.avatarUrl}
                            alt={post.author.displayName}
                            width={44}
                            height={44}
                            className="rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-500 to-violet-500 flex items-center justify-center text-white font-bold">
                            {post.author.displayName[0]}
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{post.author.displayName}</span>
                            {post.author.isVerified && <span className="text-blue-400">✓</span>}
                        </div>
                        <span className="text-sm text-white/50">@{post.author.username} · {timeAgo}</span>
                    </div>
                </div>

                {/* Type Badge */}
                <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${config.color} text-white text-sm font-medium flex items-center gap-1`}>
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                </div>
            </div>

            {/* Content */}
            <h3 className="text-xl font-bold text-white mb-2">{post.title}</h3>
            <p className="text-white/70 mb-4 line-clamp-3">{post.content}</p>

            {/* Event Details */}
            {post.type === 'EVENT' && post.eventDate && (
                <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl mb-4">
                    <div className="text-2xl">📅</div>
                    <div>
                        <div className="text-white font-medium">{new Date(post.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                        {post.location && <div className="text-white/60 text-sm">📍 {post.location}</div>}
                    </div>
                </div>
            )}

            {/* Media Preview */}
            {post.mediaUrl && (
                <div className="relative aspect-video rounded-xl overflow-hidden mb-4">
                    <Image
                        src={post.mediaUrl}
                        alt={post.title}
                        fill
                        className="object-cover"
                    />
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="flex items-center gap-4">
                    {/* Upvote */}
                    <button
                        onClick={() => onVote(post.id, true)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-white/70 hover:text-emerald-400 transition-colors"
                    >
                        <span>▲</span>
                        <span>{post.upvotes}</span>
                    </button>

                    {/* Downvote */}
                    <button
                        onClick={() => onVote(post.id, false)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/70 hover:text-rose-400 transition-colors"
                    >
                        <span>▼</span>
                    </button>

                    {/* Comments */}
                    <div className="flex items-center gap-2 text-white/50">
                        <span>💬</span>
                        <span>{post.commentsCount}</span>
                    </div>

                    {/* Views */}
                    <div className="flex items-center gap-2 text-white/50">
                        <span>👁</span>
                        <span>{post.viewCount}</span>
                    </div>
                </div>

                {post.externalLink && (
                    <a
                        href={post.externalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                        Learn More →
                    </a>
                )}
            </div>
        </motion.div>
    );
}

// Live Stream Card
function LiveStreamCard({ stream }: { stream: LiveStream }) {
    return (
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer">
            <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-white/10">
                {stream.thumbnailUrl ? (
                    <Image src={stream.thumbnailUrl} alt={stream.title} fill className="object-cover" />
                ) : (
                    <div className="flex items-center justify-center h-full text-2xl">📺</div>
                )}
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded font-bold">LIVE</div>
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-white truncate">{stream.title}</h4>
                <p className="text-xs text-white/50">{stream.upvotes} upvotes</p>
            </div>
        </div>
    );
}

// Helper function
function getTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
}

// Main Page Component
export default function CommunityPage() {
    const { isAuthenticated } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [view, setView] = useState<'community' | 'personal'>('community');
    const [filter, setFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'hot' | 'recent' | 'trending'>('hot');

    // Data states
    const [bulletins, setBulletins] = useState<BulletinPost[]>([]);
    const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
    const [onlineCount, setOnlineCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<{ total: number; byType: Record<string, number> }>({ total: 0, byType: {} });

    // Fetch bulletins
    const fetchBulletins = useCallback(async () => {
        try {
            const params = new URLSearchParams({ sortBy });
            if (filter !== 'all') params.append('type', filter);

            const response = await apiFetch(`/community/bulletins?${params}`);
            if (response.ok) {
                const data = await response.json();
                setBulletins(data.bulletins || []);
            }
        } catch (error) {
            console.error('Failed to fetch bulletins:', error);
        }
    }, [filter, sortBy]);

    // Fetch live streams
    const fetchLiveStreams = useCallback(async () => {
        try {
            const response = await apiFetch('/community/streams/live');
            if (response.ok) {
                const data = await response.json();
                setLiveStreams(data || []);
            }
        } catch (error) {
            console.error('Failed to fetch streams:', error);
        }
    }, []);

    // Fetch online count
    const fetchOnlineCount = useCallback(async () => {
        try {
            const response = await apiFetch('/community/presence/count');
            if (response.ok) {
                const data = await response.json();
                setOnlineCount(data.onlineNow || 0);
            }
        } catch (error) {
            console.error('Failed to fetch online count:', error);
        }
    }, []);

    // Fetch stats
    const fetchStats = useCallback(async () => {
        try {
            const response = await apiFetch('/community/bulletins-stats');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    }, []);

    // Vote handler
    const handleVote = async (bulletinId: string, isUpvote: boolean) => {
        if (!isAuthenticated) return;

        try {
            const response = await apiFetch(`/community/bulletins/${bulletinId}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isUpvote }),
            });

            if (response.ok) {
                // Optimistic update
                setBulletins(prev => prev.map(b => {
                    if (b.id === bulletinId) {
                        return {
                            ...b,
                            upvotes: isUpvote ? b.upvotes + 1 : b.upvotes,
                            downvotes: !isUpvote ? b.downvotes + 1 : b.downvotes,
                        };
                    }
                    return b;
                }));
            }
        } catch (error) {
            console.error('Failed to vote:', error);
        }
    };

    // Initial load
    useEffect(() => {
        setMounted(true);

        const loadData = async () => {
            setLoading(true);
            await Promise.all([
                fetchBulletins(),
                fetchLiveStreams(),
                fetchOnlineCount(),
                fetchStats(),
            ]);
            setLoading(false);
        };

        loadData();

        // Refresh online count every 30 seconds
        const interval = setInterval(fetchOnlineCount, 30000);
        return () => clearInterval(interval);
    }, [fetchBulletins, fetchLiveStreams, fetchOnlineCount, fetchStats]);

    // Refetch when filters change
    useEffect(() => {
        if (mounted) {
            fetchBulletins();
        }
    }, [filter, sortBy, mounted, fetchBulletins]);

    if (!mounted) {
        return <div className="min-h-screen bg-[#050508]" />;
    }

    const filterTypes = [
        { key: 'all', label: 'All', icon: '🌐' },
        { key: 'EVENT', label: 'Events', icon: '📅' },
        { key: 'JOB', label: 'Jobs', icon: '💼' },
        { key: 'COLLABORATION', label: 'Collab', icon: '🤝' },
        { key: 'CALL_TO_ACTION', label: 'Actions', icon: '⚡' },
        { key: 'ANNOUNCEMENT', label: 'News', icon: '📢' },
    ];

    return (
        <div className="min-h-screen bg-[#050508]">
            <Navigation activeTab="community" />

            <main className="pt-20 pb-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">Community Command Center</h1>
                            <p className="text-white/60">Unite, organize, and mobilize together</p>
                        </div>

                        {/* View Toggle */}
                        <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl">
                            <button
                                onClick={() => setView('community')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${view === 'community' ? 'bg-gradient-to-r from-orange-500 to-violet-500 text-white' : 'text-white/60 hover:text-white'}`}
                            >
                                🌍 Community
                            </button>
                            <button
                                onClick={() => setView('personal')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${view === 'personal' ? 'bg-gradient-to-r from-orange-500 to-violet-500 text-white' : 'text-white/60 hover:text-white'}`}
                            >
                                👤 Personal
                            </button>
                        </div>
                    </div>

                    {/* Live Pulse Bar */}
                    <div className="flex items-center justify-between mb-8 p-4 bg-gradient-to-r from-white/5 to-white/[0.02] rounded-2xl border border-white/10">
                        <LivePulse count={onlineCount} />

                        <div className="flex items-center gap-2">
                            <span className="text-white/50 text-sm">Total Community Posts:</span>
                            <span className="text-white font-bold">{stats.total.toLocaleString()}</span>
                        </div>

                        {isAuthenticated && (
                            <Link
                                href="/community/create"
                                className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-violet-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all"
                            >
                                + New Post
                            </Link>
                        )}
                    </div>

                    <div className="flex gap-8">
                        {/* Main Content */}
                        <div className="flex-1">
                            {/* Filters */}
                            <div className="flex items-center gap-4 mb-6">
                                {/* Type Filters */}
                                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                                    {filterTypes.map(f => (
                                        <button
                                            key={f.key}
                                            onClick={() => setFilter(f.key)}
                                            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${filter === f.key ? 'bg-white text-black font-semibold' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                                        >
                                            {f.icon} {f.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Sort */}
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as 'hot' | 'recent' | 'trending')}
                                    className="ml-auto px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                    <option value="hot">🔥 Hot</option>
                                    <option value="trending">📈 Trending</option>
                                    <option value="recent">🕐 Recent</option>
                                </select>
                            </div>

                            {/* Bulletins List */}
                            {loading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-48 bg-white/5 rounded-2xl animate-pulse" />
                                    ))}
                                </div>
                            ) : bulletins.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="text-6xl mb-4">📭</div>
                                    <h3 className="text-xl font-semibold text-white mb-2">No posts yet</h3>
                                    <p className="text-white/60 mb-6">Be the first to share with the community!</p>
                                    {isAuthenticated && (
                                        <Link
                                            href="/community/create"
                                            className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-violet-500 text-white font-semibold rounded-xl"
                                        >
                                            Create First Post
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    <div className="space-y-4">
                                        {bulletins.map(post => (
                                            <BulletinCard
                                                key={post.id}
                                                post={post}
                                                onVote={handleVote}
                                            />
                                        ))}
                                    </div>
                                </AnimatePresence>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="hidden lg:block w-80 space-y-6">
                            {/* Live Streams */}
                            <div className="p-5 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-white flex items-center gap-2">
                                        <span className="text-red-500">📺</span> Live Now
                                    </h3>
                                    <Link href="/community/streams" className="text-sm text-orange-500 hover:underline">
                                        See All
                                    </Link>
                                </div>

                                {liveStreams.length === 0 ? (
                                    <div className="text-center py-8 text-white/50">
                                        <p className="text-sm">No live streams right now</p>
                                        <Link
                                            href="/community/streams/suggest"
                                            className="inline-block mt-4 px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition-colors"
                                        >
                                            + Suggest a Stream
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {liveStreams.slice(0, 4).map(stream => (
                                            <LiveStreamCard key={stream.id} stream={stream} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Quick Stats */}
                            <div className="p-5 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10">
                                <h3 className="font-semibold text-white mb-4">📊 Activity</h3>
                                <div className="space-y-3">
                                    {Object.entries(stats.byType || {}).slice(0, 5).map(([type, count]) => {
                                        const config = TYPE_CONFIG[type];
                                        if (!config) return null;
                                        return (
                                            <div key={type} className="flex items-center justify-between">
                                                <span className="text-white/70">{config.icon} {config.label}</span>
                                                <span className="text-white font-medium">{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Call to Action */}
                            <div className="p-5 bg-gradient-to-br from-orange-500/20 to-violet-500/20 rounded-2xl border border-orange-500/30">
                                <h3 className="font-bold text-white mb-2">🚀 Join the Movement</h3>
                                <p className="text-white/70 text-sm mb-4">
                                    Post events, find collaborators, and organize together.
                                </p>
                                <Link
                                    href="/community/create"
                                    className="block text-center py-2.5 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-colors"
                                >
                                    Get Started
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
