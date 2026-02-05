'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useJourneys, Journey } from '@/hooks/useJourneys';

// Note: Journey interface imported from useJourneys hook

// Mock data - Family & Community focused content
const MOCK_JOURNEYS: Journey[] = [
    {
        id: '1',
        userId: '1',
        videoUrl: '', // Will show thumbnail as placeholder
        thumbnailUrl: 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=400&h=700&fit=crop',
        caption: 'Eid Mubarak from our family to yours! The kids were so excited to see everyone together again after so long.',
        musicName: 'Family Gathering',
        musicArtist: 'Peaceful Moments',
        likes: 342,
        comments: 89,
        shares: 45,
        createdAt: new Date().toISOString(),
        user: {
            id: '1',
            username: 'fatima_h',
            displayName: 'Fatima Hassan',
            avatarUrl: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=100&h=100&fit=crop&crop=face',
            isFollowing: true,
        },
    },
    {
        id: '2',
        userId: '2',
        videoUrl: '',
        thumbnailUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=700&fit=crop',
        caption: 'Grandma teaching me her famous biryani recipe. These moments are priceless. Save this for when you want to try it!',
        musicName: 'Kitchen Memories',
        musicArtist: 'Home Sounds',
        likes: 567,
        comments: 124,
        shares: 89,
        createdAt: new Date().toISOString(),
        user: {
            id: '2',
            username: 'amira_k',
            displayName: 'Amira Khalil',
            avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face',
            isFollowing: true,
        },
    },
    {
        id: '3',
        userId: '3',
        videoUrl: '',
        thumbnailUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=700&fit=crop',
        caption: 'Family reunion after 3 years! 25 cousins, 4 aunties, and endless food. This is what life is about.',
        likes: 892,
        comments: 234,
        shares: 156,
        createdAt: new Date().toISOString(),
        user: {
            id: '3',
            username: 'omar_family',
            displayName: 'Omar & Family',
            avatarUrl: 'https://ui-avatars.com/api/?name=User&background=random',
            isFollowing: false,
        },
    },
];

function formatCount(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
}

function JourneyCard({
    journey,
    isActive,
    isMuted,
    onToggleMute,
    onLike,
}: {
    journey: Journey;
    isActive: boolean;
    isMuted: boolean;
    onToggleMute: () => void;
    onLike: () => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLiked, setIsLiked] = useState(false);
    const [showHeart, setShowHeart] = useState(false);

    useEffect(() => {
        if (videoRef.current) {
            if (isActive) {
                videoRef.current.play().catch(() => { });
            } else {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
            }
        }
    }, [isActive]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
        }
    }, [isMuted]);

    const handleDoubleTap = () => {
        if (!isLiked) {
            setIsLiked(true);
            onLike();
        }
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 800);
    };

    return (
        <div className="relative w-full h-full bg-black" onDoubleClick={handleDoubleTap}>
            {/* Video */}
            <video
                ref={videoRef}
                src={journey.videoUrl}
                className="absolute inset-0 w-full h-full object-cover"
                loop
                playsInline
                muted={isMuted}
                poster={journey.thumbnailUrl}
            />

            {/* Double-tap heart animation */}
            <AnimatePresence>
                {showHeart && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.5, opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                    >
                        <svg width="100" height="100" viewBox="0 0 24 24" fill="#fff" className="drop-shadow-lg">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sound toggle */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleMute();
                }}
                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center"
            >
                {isMuted ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </button>

            {/* Right side actions */}
            <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-10">
                {/* Profile */}
                <div className="relative">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white">
                        <Image
                            src={journey.user.avatarUrl || '/placeholder-avatar.png'}
                            alt={journey.user.displayName}
                            width={48}
                            height={48}
                            className="object-cover"
                        />
                    </div>
                    {!journey.user.isFollowing && (
                        <button className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2">
                                <path d="M6 2v8M2 6h8" strokeLinecap="round" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Like */}
                <button
                    onClick={() => {
                        setIsLiked(!isLiked);
                        onLike();
                    }}
                    className="flex flex-col items-center"
                >
                    <div className="w-12 h-12 flex items-center justify-center">
                        <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill={isLiked ? '#ef4444' : 'none'}
                            stroke={isLiked ? '#ef4444' : 'white'}
                            strokeWidth="2"
                        >
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                    </div>
                    <span className="text-white text-xs font-semibold">{formatCount(journey.likes)}</span>
                </button>

                {/* Comment */}
                <button className="flex flex-col items-center">
                    <div className="w-12 h-12 flex items-center justify-center">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
                        </svg>
                    </div>
                    <span className="text-white text-xs font-semibold">{formatCount(journey.comments)}</span>
                </button>

                {/* Share */}
                <button className="flex flex-col items-center">
                    <div className="w-12 h-12 flex items-center justify-center">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span className="text-white text-xs font-semibold">{formatCount(journey.shares)}</span>
                </button>

                {/* Music disc */}
                {journey.musicName && (
                    <motion.div
                        animate={{ rotate: isActive ? 360 : 0 }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        className="w-10 h-10 rounded-full bg-gray-900 border-2 border-gray-700 flex items-center justify-center"
                    >
                        <div className="w-4 h-4 rounded-full bg-white" />
                    </motion.div>
                )}
            </div>

            {/* Bottom info */}
            <div className="absolute left-3 right-20 bottom-6 z-10">
                <Link href={`/@${journey.user.username}`} className="font-bold text-white mb-2 inline-block">
                    @{journey.user.username}
                </Link>
                <p className="text-white text-sm line-clamp-2 mb-2">{journey.caption}</p>
                {journey.musicName && (
                    <div className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                        <p className="text-white text-xs truncate">
                            {journey.musicName} · {journey.musicArtist}
                        </p>
                    </div>
                )}
            </div>

            {/* Gradient overlays */}
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
        </div>
    );
}

export default function JourneysPage() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(true);
    const { journeys: apiJourneys, isLoading, error, likeJourney, followUser, loadMore, hasMore } = useJourneys();
    const containerRef = useRef<HTMLDivElement>(null);
    const [viewportHeight, setViewportHeight] = useState(0);

    // Use API data or fall back to mock data if empty
    const journeys = apiJourneys.length > 0 ? apiJourneys : MOCK_JOURNEYS;

    // Initialize viewport height on client mount
    useEffect(() => {
        const updateHeight = () => setViewportHeight(window.innerHeight);
        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, []);

    // Load more when reaching near end
    useEffect(() => {
        if (currentIndex >= journeys.length - 2 && hasMore && !isLoading) {
            loadMore();
        }
    }, [currentIndex, journeys.length, hasMore, isLoading, loadMore]);

    const handleDragEnd = useCallback(
        (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
            const threshold = 50;
            if (info.offset.y < -threshold && currentIndex < journeys.length - 1) {
                setCurrentIndex((prev) => prev + 1);
            } else if (info.offset.y > threshold && currentIndex > 0) {
                setCurrentIndex((prev) => prev - 1);
            }
        },
        [currentIndex, journeys.length]
    );

    const handleWheel = useCallback(
        (e: WheelEvent) => {
            if (e.deltaY > 50 && currentIndex < journeys.length - 1) {
                setCurrentIndex((prev) => prev + 1);
            } else if (e.deltaY < -50 && currentIndex > 0) {
                setCurrentIndex((prev) => prev - 1);
            }
        },
        [currentIndex, journeys.length]
    );

    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.addEventListener('wheel', handleWheel);
            return () => container.removeEventListener('wheel', handleWheel);
        }
    }, [handleWheel]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown' && currentIndex < journeys.length - 1) {
                setCurrentIndex((prev) => prev + 1);
            } else if (e.key === 'ArrowUp' && currentIndex > 0) {
                setCurrentIndex((prev) => prev - 1);
            } else if (e.key === 'm') {
                setIsMuted((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, journeys.length]);

    // First time visitor state
    const [showOnboarding, setShowOnboarding] = useState(true);

    // Check if first visit
    useEffect(() => {
        const hasSeenOnboarding = localStorage.getItem('0g_moments_onboarding');
        if (hasSeenOnboarding) {
            setShowOnboarding(false);
        }
    }, []);

    const dismissOnboarding = () => {
        localStorage.setItem('0g_moments_onboarding', 'true');
        setShowOnboarding(false);
    };

    // Don't render content until viewport height is known (client-side only)
    if (!viewportHeight) {
        return <div className="h-screen w-full bg-black" />;
    }

    return (
        <div ref={containerRef} className="h-screen w-full bg-black overflow-hidden">
            {/* First-time Onboarding Overlay */}
            <AnimatePresence>
                {showOnboarding && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="max-w-md w-full text-center"
                        >
                            <div className="text-6xl mb-6">✨</div>
                            <h2 className="text-3xl font-bold text-white mb-4">
                                Welcome to Moments
                            </h2>
                            <p className="text-white/60 mb-8 leading-relaxed">
                                Short videos from your circle. Swipe up to discover family updates,
                                community highlights, and stories from the people who matter most.
                            </p>
                            <div className="space-y-4 text-left bg-white/5 rounded-2xl p-6 mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                        <span>👆</span>
                                    </div>
                                    <p className="text-white/80">Swipe up to see more moments</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                        <span>❤️</span>
                                    </div>
                                    <p className="text-white/80">Double-tap to like</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                        <span>🔊</span>
                                    </div>
                                    <p className="text-white/80">Tap the sound icon for audio</p>
                                </div>
                            </div>
                            <button
                                onClick={dismissOnboarding}
                                className="w-full py-4 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-colors"
                            >
                                Start Watching
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="fixed top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none py-4 px-4">
                <div className="flex items-center justify-between pointer-events-auto">
                    <Link
                        href="/dashboard"
                        className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Link>
                    <h1 className="text-lg font-semibold text-white">Moments</h1>
                    <Link
                        href="/create?type=moment"
                        className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                        </svg>
                    </Link>
                </div>
            </div>

            {/* Create Moment FAB */}
            <Link
                href="/create?type=moment"
                className="fixed bottom-8 right-6 z-30 w-14 h-14 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/30 hover:scale-105 transition-transform"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
            </Link>

            {/* Empty State */}
            {journeys.length === 0 && !isLoading && (
                <div className="h-full flex flex-col items-center justify-center px-8 text-center">
                    <div className="text-6xl mb-4">🎬</div>
                    <h2 className="text-2xl font-bold text-white mb-2">No moments yet</h2>
                    <p className="text-white/50 mb-6 max-w-xs">
                        Be the first to share a moment with your tribe
                    </p>
                    <Link
                        href="/create?type=moment"
                        className="px-8 py-3 bg-white text-black font-semibold rounded-xl"
                    >
                        Create Your First Moment
                    </Link>
                </div>
            )}

            {/* Content */}
            {journeys.length > 0 && (
                <motion.div
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0.1}
                    onDragEnd={handleDragEnd}
                    animate={{ y: -currentIndex * viewportHeight }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="h-screen"
                >
                    {journeys.map((journey, index) => (
                        <div key={journey.id} className="h-screen w-full">
                            <JourneyCard
                                journey={journey}
                                isActive={index === currentIndex}
                                isMuted={isMuted}
                                onToggleMute={() => setIsMuted(!isMuted)}
                                onLike={() => { }}
                            />
                        </div>
                    ))}
                </motion.div>
            )}

            {/* Progress dots */}
            {journeys.length > 1 && (
                <div className="fixed right-1.5 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5">
                    {journeys.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`w-1 rounded-full transition-all ${index === currentIndex ? 'h-6 bg-white' : 'h-1.5 bg-white/40'
                                }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

