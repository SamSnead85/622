'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { TrendingIcon, VideoIcon, ArrowLeftIcon } from '@/components/icons';

interface LiveStream {
    id: string;
    title: string;
    viewerCount: number;
    thumbnailUrl: string;
    user: {
        username: string;
        displayName: string;
        avatarUrl: string;
    };
}

// Mock live streams
const MOCK_STREAMS: LiveStream[] = [
    {
        id: '1',
        title: 'Late night coding session 💻',
        viewerCount: 1243,
        thumbnailUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=225&fit=crop',
        user: {
            username: 'devguru',
            displayName: 'Dev Guru',
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face',
        },
    },
    {
        id: '2',
        title: 'Cooking dinner - ask me anything! 🍳',
        viewerCount: 892,
        thumbnailUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=225&fit=crop',
        user: {
            username: 'chefanna',
            displayName: 'Chef Anna',
            avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&h=50&fit=crop&crop=face',
        },
    },
    {
        id: '3',
        title: 'Sunset meditation stream 🌅',
        viewerCount: 567,
        thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=225&fit=crop',
        user: {
            username: 'zenmaster',
            displayName: 'Zen Master',
            avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=50&h=50&fit=crop&crop=face',
        },
    },
];

function StreamCard({ stream }: { stream: LiveStream }) {
    return (
        <Link href={`/campfire/watch/${stream.id}`} className="group">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900">
                <Image
                    src={stream.thumbnailUrl}
                    alt={stream.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Live badge */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-500 px-2 py-1 rounded-md">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-white">LIVE</span>
                </div>
                {/* Viewer count */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-1 rounded-md">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                    </svg>
                    <span className="text-xs font-semibold text-white">{stream.viewerCount.toLocaleString()}</span>
                </div>
            </div>
            <div className="flex gap-3 mt-3">
                <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-red-500">
                    <Image
                        src={stream.user.avatarUrl}
                        alt={stream.user.displayName}
                        width={36}
                        height={36}
                        className="object-cover"
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-white truncate">{stream.title}</h3>
                    <p className="text-xs text-gray-400">@{stream.user.username}</p>
                </div>
            </div>
        </Link>
    );
}

export default function CampfireDiscoverPage() {
    const [streams, setStreams] = useState<LiveStream[]>(MOCK_STREAMS);

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-20 bg-gray-950/80 backdrop-blur-lg border-b border-gray-900">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-gray-400 hover:text-white">
                            <ArrowLeftIcon size={20} />
                        </Link>
                        <div className="flex items-center gap-2">
                            <TrendingIcon size={24} className="text-orange-500" />
                            <h1 className="text-xl font-bold">Campfire</h1>
                        </div>
                    </div>

                    <Link
                        href="/campfire/go-live"
                        className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2"
                    >
                        <VideoIcon size={16} />
                        Go Live
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="pt-20 pb-8 px-4 max-w-7xl mx-auto">
                {/* Featured */}
                <section className="mb-10">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span className="text-rose-500">●</span> Live Now
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {streams.map((stream) => (
                            <StreamCard key={stream.id} stream={stream} />
                        ))}
                    </div>
                </section>

                {/* Categories */}
                <section className="mb-10">
                    <h2 className="text-lg font-semibold mb-4">Browse Categories</h2>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {['All', 'Gaming', 'Music', 'Cooking', 'Fitness', 'Education', 'Art', 'Talk Shows'].map((cat) => (
                            <button
                                key={cat}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${cat === 'All'
                                    ? 'bg-white text-gray-950'
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Empty state for when no streams */}
                {streams.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 mx-auto mb-6 bg-gray-800 rounded-full flex items-center justify-center">
                            <TrendingIcon size={40} className="text-orange-500" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No live streams right now</h3>
                        <p className="text-gray-400 mb-6">Be the first to start a campfire!</p>
                        <Link
                            href="/campfire/go-live"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 to-orange-500 px-6 py-3 rounded-lg font-semibold"
                        >
                            Start Streaming
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}
