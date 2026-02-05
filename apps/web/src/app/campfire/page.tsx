'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { TrendingIcon, VideoIcon, ArrowLeftIcon } from '@/components/icons';
import { apiFetch } from '@/lib/api';

interface LiveStream {
    id: string;
    title: string;
    viewerCount: number;
    thumbnailUrl: string | null;
    user: {
        username: string;
        displayName: string;
        avatarUrl: string | null;
    };
}

function StreamCard({ stream }: { stream: LiveStream }) {
    return (
        <Link href={`/campfire/watch/${stream.id}`} className="group">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 border border-white/10">
                <Image
                    src={stream.thumbnailUrl || 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=80'}
                    alt={stream.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100"
                />
                {/* Live badge */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-rose-500 px-2 py-1 rounded-md shadow-lg shadow-rose-500/20">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-white tracking-wider">LIVE</span>
                </div>
                {/* Viewer count */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md border border-white/10">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span className="text-xs font-semibold text-white">{stream.viewerCount.toLocaleString()}</span>
                </div>
            </div>
            <div className="flex gap-3 mt-3">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-rose-500/50">
                    <Image
                        src={stream.user.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop'}
                        alt={stream.user.displayName}
                        width={40}
                        height={40}
                        className="object-cover"
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-white truncate leading-tight mb-0.5">{stream.title}</h3>
                    <p className="text-xs text-gray-400 truncate">@{stream.user.username}</p>
                </div>
            </div>
        </Link>
    );
}

export default function CampfireDiscoverPage() {
    const [streams, setStreams] = useState<LiveStream[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStreams = async () => {
            try {
                const res = await apiFetch('/livestream/active');
                if (res.ok) {
                    const data = await res.json();
                    setStreams(data.streams || []);
                }
            } catch (error) {
                console.error('Failed to fetch streams', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStreams();
        // Poll every 30 seconds
        const interval = setInterval(fetchStreams, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-[#050508] text-white">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-[#050508]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                            <ArrowLeftIcon size={20} />
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-gradient-to-br from-orange-500 to-rose-600 rounded-lg">
                                <TrendingIcon size={20} className="text-white" />
                            </div>
                            <h1 className="text-lg font-bold tracking-tight">Campfire</h1>
                        </div>
                    </div>

                    <Link
                        href="/campfire/go-live"
                        className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2"
                    >
                        <VideoIcon size={16} />
                        Go Live
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="pt-6 pb-20 px-4 max-w-7xl mx-auto">
                {/* Featured */}
                <section className="mb-10">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <h2 className="text-lg font-bold text-white">Live Now</h2>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="aspect-video bg-white/5 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : streams.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {streams.map((stream) => (
                                <StreamCard key={stream.id} stream={stream} />
                            ))}
                        </div>
                    ) : (
                        /* Empty state */
                        <div className="text-center py-20 border border-white/5 rounded-2xl bg-white/[0.02]">
                            <div className="w-16 h-16 mx-auto mb-6 bg-white/5 rounded-full flex items-center justify-center ring-1 ring-white/10">
                                <TrendingIcon size={32} className="text-white/40" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-white">No active campfires</h3>
                            <p className="text-gray-400 mb-8 max-w-sm mx-auto">The forest is quiet. Be the first to spark a conversation.</p>
                            <Link
                                href="/campfire/go-live"
                                className="inline-flex items-center gap-2 bg-[#00D4FF] hover:bg-[#00D4FF]/90 text-black px-8 py-3 rounded-full font-bold transition-transform hover:scale-105"
                            >
                                Start Streaming
                            </Link>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
