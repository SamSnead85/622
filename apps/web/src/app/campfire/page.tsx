'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { TrendingIcon, VideoIcon, ArrowLeftIcon } from '@/components/icons';
import { NavigationSidebar } from '@/components/dashboard/NavigationSidebar';
import { apiFetch } from '@/lib/api';

// ============================================
// TYPES
// ============================================

interface LiveStream {
    id: string;
    title: string;
    viewerCount: number;
    thumbnailUrl: string | null;
    category: string | null;
    tags: string[];
    muxPlaybackId: string | null;
    startedAt: string | null;
    user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        isVerified: boolean;
    };
}

interface VOD {
    id: string;
    title: string;
    totalViews: number;
    peakViewerCount: number;
    thumbnailUrl: string | null;
    category: string | null;
    muxPlaybackId: string | null;
    endedAt: string | null;
    startedAt: string | null;
    user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        isVerified: boolean;
    };
}

interface Category {
    id: string;
    label: string;
    activeStreams: number;
}

// ============================================
// CONSTANTS
// ============================================

const CATEGORY_ICONS: Record<string, string> = {
    gaming: 'G',
    music: 'M',
    creative: 'C',
    irl: 'I',
    sports: 'S',
    tech: 'T',
    education: 'E',
    entertainment: 'E',
    other: 'O',
};

// ============================================
// STREAM CARD
// ============================================

function StreamCard({ stream, index }: { stream: LiveStream; index: number }) {
    const thumbnailSrc = stream.thumbnailUrl || `https://picsum.photos/seed/${stream.id}/640/360`;
    const timeLive = stream.startedAt ? getTimeSince(stream.startedAt) : '';

    return (
        <Link href={`/campfire/watch/${stream.id}`} className="group block">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
            >
                {/* Thumbnail */}
                <div className="relative aspect-video rounded-xl overflow-hidden bg-[#0A0A0F] border border-white/[0.06] group-hover:border-[#7C8FFF]/20 transition-all">
                    <Image
                        src={thumbnailSrc}
                        alt={stream.title}
                        fill
                        className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />

                    {/* Live badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-rose-500/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-lg shadow-rose-500/20">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-white tracking-wider">LIVE</span>
                    </div>

                    {/* Viewer count */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        <span className="text-[11px] font-semibold text-white">{stream.viewerCount.toLocaleString()}</span>
                    </div>

                    {/* Category badge */}
                    {stream.category && (
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg">
                            <span className="text-[10px] text-white/80 capitalize">
                                {CATEGORY_ICONS[stream.category] || stream.category[0]?.toUpperCase() || ''} {stream.category}
                            </span>
                        </div>
                    )}

                    {/* Duration */}
                    {timeLive && (
                        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg">
                            <span className="text-[10px] font-mono text-white/70">{timeLive}</span>
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex gap-3 mt-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-rose-500/30">
                        {stream.user.avatarUrl ? (
                            <Image src={stream.user.avatarUrl} alt={stream.user.displayName} width={36} height={36} className="object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                                {stream.user.displayName[0]}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-white truncate leading-tight">{stream.title}</h3>
                        <p className="text-[11px] text-white/40 truncate mt-0.5">
                            @{stream.user.username}
                            {stream.user.isVerified && <span className="text-[#7C8FFF] ml-0.5">✓</span>}
                        </p>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}

// ============================================
// VOD CARD
// ============================================

function VODCard({ vod, index }: { vod: VOD; index: number }) {
    const thumbnailSrc = vod.thumbnailUrl || `https://picsum.photos/seed/${vod.id}/640/360`;
    const durationText = vod.startedAt && vod.endedAt ? getDuration(vod.startedAt, vod.endedAt) : '';

    return (
        <Link href={`/campfire/watch/${vod.id}`} className="group block">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
            >
                <div className="relative aspect-video rounded-xl overflow-hidden bg-[#0A0A0F] border border-white/[0.06] group-hover:border-white/[0.12] transition-all">
                    <Image
                        src={thumbnailSrc}
                        alt={vod.title}
                        fill
                        className="object-cover opacity-70 group-hover:opacity-90 transition-all duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />

                    {/* VOD badge */}
                    <div className="absolute top-2 left-2 bg-white/10 backdrop-blur-sm px-2 py-1 rounded-lg">
                        <span className="text-[10px] font-bold text-white/80 tracking-wider">VOD</span>
                    </div>

                    {/* Duration */}
                    {durationText && (
                        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg">
                            <span className="text-[10px] font-mono text-white/70">{durationText}</span>
                        </div>
                    )}

                    {/* Views */}
                    <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        <span className="text-[10px] font-semibold text-white/80">{vod.totalViews.toLocaleString()}</span>
                    </div>
                </div>

                <div className="flex gap-3 mt-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/10">
                        {vod.user.avatarUrl ? (
                            <Image src={vod.user.avatarUrl} alt={vod.user.displayName} width={36} height={36} className="object-cover" />
                        ) : (
                            <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/50 text-xs font-bold">
                                {vod.user.displayName[0]}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-white/80 truncate leading-tight">{vod.title}</h3>
                        <p className="text-[11px] text-white/30 truncate mt-0.5">
                            @{vod.user.username} · {vod.peakViewerCount.toLocaleString()} peak viewers
                        </p>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}

// ============================================
// HELPERS
// ============================================

function getTimeSince(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
}

function getDuration(startStr: string, endStr: string): string {
    const diff = new Date(endStr).getTime() - new Date(startStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
}

// ============================================
// MAIN PAGE
// ============================================

export default function CampfireDiscoverPage() {
    const [streams, setStreams] = useState<LiveStream[]>([]);
    const [vods, setVods] = useState<VOD[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [loadingVods, setLoadingVods] = useState(true);

    // Fetch live streams
    useEffect(() => {
        const fetchStreams = async () => {
            try {
                const categoryParam = activeCategory !== 'all' ? `?category=${activeCategory}` : '';
                const res = await apiFetch(`/livestream/active${categoryParam}`);
                if (res.ok) {
                    const data = await res.json();
                    setStreams(data.streams || []);
                }
            } catch {
                console.error('Failed to fetch streams');
            } finally {
                setLoading(false);
            }
        };

        fetchStreams();
        const interval = setInterval(fetchStreams, 15000);
        return () => clearInterval(interval);
    }, [activeCategory]);

    // Fetch categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await apiFetch('/livestream/categories');
                if (res.ok) {
                    const data = await res.json();
                    setCategories(data.categories || []);
                }
            } catch { /* ignore */ }
        };
        fetchCategories();
    }, []);

    // Fetch VODs
    useEffect(() => {
        const fetchVods = async () => {
            try {
                const params = new URLSearchParams();
                if (activeCategory !== 'all') params.set('category', activeCategory);
                params.set('limit', '6');
                const res = await apiFetch(`/livestream/vods?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setVods(data.vods || []);
                }
            } catch { /* ignore */ }
            finally {
                setLoadingVods(false);
            }
        };
        fetchVods();
    }, [activeCategory]);

    const totalLive = categories.reduce((sum, c) => sum + c.activeStreams, 0);

    return (
        <div className="min-h-screen bg-[#050508] text-white">
            <NavigationSidebar />
            <div className="lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-[#050508]/90 backdrop-blur-xl border-b border-white/[0.06]">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="text-white/40 hover:text-white transition-colors">
                            <ArrowLeftIcon size={20} />
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-gradient-to-br from-orange-500 to-rose-600 rounded-lg">
                                <TrendingIcon size={18} className="text-white" />
                            </div>
                            <h1 className="text-base font-bold tracking-tight">Campfire</h1>
                            {totalLive > 0 && (
                                <span className="text-[10px] font-bold bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20">
                                    {totalLive} live
                                </span>
                            )}
                        </div>
                    </div>

                    <Link
                        href="/campfire/go-live"
                        className="bg-gradient-to-r from-rose-500 to-orange-500 hover:opacity-90 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 active:scale-95 shadow-lg shadow-rose-500/20"
                    >
                        <VideoIcon size={16} />
                        Go Live
                    </Link>
                </div>

                {/* Category tabs */}
                <div className="max-w-7xl mx-auto px-4 pb-3">
                    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                        <button
                            onClick={() => setActiveCategory('all')}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                activeCategory === 'all'
                                    ? 'bg-white/10 text-white border border-white/20'
                                    : 'text-white/40 hover:text-white/60 border border-transparent'
                            }`}
                        >
                            All
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(activeCategory === cat.id ? 'all' : cat.id)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                                    activeCategory === cat.id
                                        ? 'bg-[#7C8FFF]/15 text-[#7C8FFF] border border-[#7C8FFF]/30'
                                        : 'text-white/40 hover:text-white/60 border border-transparent hover:border-white/[0.06]'
                                }`}
                            >
                                <span>{CATEGORY_ICONS[cat.id] || cat.id[0]?.toUpperCase() || ''}</span>
                                {cat.label}
                                {cat.activeStreams > 0 && (
                                    <span className="bg-rose-500/20 text-rose-400 px-1 py-0.5 rounded text-[9px] ml-0.5">{cat.activeStreams}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="pb-20 px-4 max-w-7xl mx-auto">
                {/* Live Now */}
                <section className="mt-6 mb-10">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Live Now</h2>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="aspect-video bg-white/[0.03] rounded-xl animate-pulse border border-white/[0.04]" />
                            ))}
                        </div>
                    ) : streams.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {streams.map((stream, i) => (
                                <StreamCard key={stream.id} stream={stream} index={i} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 border border-white/[0.04] rounded-2xl bg-white/[0.01]">
                            <div className="w-14 h-14 mx-auto mb-4 bg-white/[0.04] rounded-full flex items-center justify-center ring-1 ring-white/[0.06]">
                                <TrendingIcon size={28} className="text-white/30" />
                            </div>
                            <h3 className="text-lg font-bold mb-1.5 text-white/80">No active streams</h3>
                            <p className="text-white/30 text-sm mb-6 max-w-xs mx-auto">
                                {activeCategory !== 'all'
                                    ? `No streams in this category right now.`
                                    : `Be the first to start streaming.`}
                            </p>
                            <Link
                                href="/campfire/go-live"
                                className="inline-flex items-center gap-2 bg-[#7C8FFF] hover:bg-[#7C8FFF]/90 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
                            >
                                Start Streaming
                            </Link>
                        </div>
                    )}
                </section>

                {/* VODs / Recent Streams */}
                {!loadingVods && vods.length > 0 && (
                    <section className="mb-10">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Recent Streams</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {vods.map((vod, i) => (
                                <VODCard key={vod.id} vod={vod} index={i} />
                            ))}
                        </div>
                    </section>
                )}
            </main>
            </div>
        </div>
    );
}
