'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

interface Journey {
    id: string;
    videoUrl: string;
    thumbnailUrl: string;
    caption: string;
    musicName?: string;
    musicArtist?: string;
    likes: number;
    comments: number;
    shares: number;
    user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string;
        isFollowing: boolean;
    };
}

// Mock data
const MOCK_JOURNEYS: Journey[] = [
    {
        id: '1',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=700&fit=crop',
        caption: 'Mountain sunrise vibes 🌄 This view was absolutely worth the 4am wake up call! #nature #hiking #adventure',
        musicName: 'Sunrise Dreams',
        musicArtist: 'Ambient Collective',
        likes: 45200,
        comments: 1234,
        shares: 890,
        user: {
            id: '1',
            username: 'sarahc',
            displayName: 'Sarah Chen',
            avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
            isFollowing: false,
        },
    },
    {
        id: '2',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=700&fit=crop',
        caption: 'Forest trail therapy 🌲 Sometimes you just need to disconnect #wellness #mindfulness',
        musicName: 'Forest Ambience',
        musicArtist: 'Nature Sounds',
        likes: 23400,
        comments: 567,
        shares: 234,
        user: {
            id: '2',
            username: 'marcusj',
            displayName: 'Marcus Johnson',
            avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
            isFollowing: true,
        },
    },
    {
        id: '3',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=700&fit=crop',
        caption: 'Secret recipe time 👨‍🍳 Drop a 🔥 if you want the full tutorial! #cooking #food #recipe',
        likes: 89100,
        comments: 4521,
        shares: 2100,
        user: {
            id: '3',
            username: 'chefemily',
            displayName: 'Emily Park',
            avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
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
                            src={journey.user.avatarUrl}
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
    const [journeys] = useState<Journey[]>(MOCK_JOURNEYS);
    const containerRef = useRef<HTMLDivElement>(null);
    const [viewportHeight, setViewportHeight] = useState(0);

    // Initialize viewport height on client mount
    useEffect(() => {
        const updateHeight = () => setViewportHeight(window.innerHeight);
        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, []);

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

    // Don't render content until viewport height is known (client-side only)
    if (!viewportHeight) {
        return <div className="h-screen w-full bg-black" />;
    }

    return (
        <div ref={containerRef} className="h-screen w-full bg-black overflow-hidden">
            {/* Back button */}
            <Link
                href="/dashboard"
                className="fixed top-4 left-4 z-30 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </Link>

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

            {/* Progress dots */}
            <div className="fixed right-1.5 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5">
                {journeys.map((_, index) => (
                    <div
                        key={index}
                        className={`w-1 rounded-full transition-all ${index === currentIndex ? 'h-6 bg-white' : 'h-1.5 bg-white/40'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}
