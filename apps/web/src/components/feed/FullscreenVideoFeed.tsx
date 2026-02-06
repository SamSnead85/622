'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import type { Post } from '@/hooks/usePosts';

interface FullscreenVideoFeedProps {
    posts: Post[];
    onLoadMore?: () => void;
    hasMore?: boolean;
    onLike?: (postId: string) => void;
    onClose?: () => void;
    startIndex?: number;
}

export function FullscreenVideoFeed({
    posts,
    onLoadMore,
    hasMore,
    onLike,
    onClose,
    startIndex = 0,
}: FullscreenVideoFeedProps) {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [isMuted, setIsMuted] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

    const videoPosts = posts.filter(p => p.type === 'VIDEO' && p.mediaUrl);

    // Navigate to next/prev
    const goTo = useCallback((index: number) => {
        const clamped = Math.max(0, Math.min(index, videoPosts.length - 1));
        setCurrentIndex(clamped);

        // Load more when near end
        if (clamped >= videoPosts.length - 2 && hasMore && onLoadMore) {
            onLoadMore();
        }
    }, [videoPosts.length, hasMore, onLoadMore]);

    // Keyboard navigation
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown' || e.key === 'j') goTo(currentIndex + 1);
            if (e.key === 'ArrowUp' || e.key === 'k') goTo(currentIndex - 1);
            if (e.key === 'm') setIsMuted(m => !m);
            if (e.key === 'Escape' && onClose) onClose();
            if (e.key === 'l' && onLike && videoPosts[currentIndex]) {
                onLike(videoPosts[currentIndex].id);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [currentIndex, goTo, onClose, onLike, videoPosts]);

    // Swipe handling
    const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = 50;
        if (info.offset.y < -threshold) goTo(currentIndex + 1);
        else if (info.offset.y > threshold) goTo(currentIndex - 1);
    }, [currentIndex, goTo]);

    // Auto-play current video
    useEffect(() => {
        videoRefs.current.forEach((video, index) => {
            if (index === currentIndex) {
                video.play().catch(() => {});
            } else {
                video.pause();
                video.currentTime = 0;
            }
        });
    }, [currentIndex]);

    if (videoPosts.length === 0) {
        return (
            <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
                <p className="text-white/50">No videos to show</p>
                {onClose && (
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white">
                        Close
                    </button>
                )}
            </div>
        );
    }

    const currentPost = videoPosts[currentIndex];

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 bg-black z-50 overflow-hidden"
        >
            {/* Close button */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-4 left-4 z-50 w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center"
                    aria-label="Close"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            )}

            {/* Mute toggle */}
            <button
                onClick={() => setIsMuted(m => !m)}
                className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
                {isMuted ? '🔇' : '🔊'}
            </button>

            {/* Video container with swipe */}
            <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                animate={{ y: -currentIndex * window.innerHeight }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="h-screen"
            >
                {videoPosts.map((post, index) => (
                    <div key={post.id} className="h-screen w-full relative">
                        <video
                            ref={(el) => {
                                if (el) videoRefs.current.set(index, el);
                            }}
                            src={post.mediaUrl}
                            className="absolute inset-0 w-full h-full object-contain bg-black"
                            loop
                            playsInline
                            muted={isMuted}
                            preload={Math.abs(index - currentIndex) <= 1 ? 'auto' : 'none'}
                        />

                        {/* Gradient overlay */}
                        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

                        {/* Post info */}
                        <div className="absolute bottom-6 left-4 right-20 z-10">
                            <p className="font-bold text-white mb-1">
                                @{post.author?.username || 'unknown'}
                            </p>
                            {post.content && (
                                <p className="text-white/80 text-sm line-clamp-2">{post.content}</p>
                            )}
                        </div>

                        {/* Side actions */}
                        <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-10">
                            <button
                                onClick={() => onLike?.(post.id)}
                                className="flex flex-col items-center"
                                aria-label="Like"
                            >
                                <div className="w-12 h-12 flex items-center justify-center">
                                    <svg width="28" height="28" viewBox="0 0 24 24"
                                        fill={post.isLiked ? '#ef4444' : 'none'}
                                        stroke={post.isLiked ? '#ef4444' : 'white'}
                                        strokeWidth="2"
                                    >
                                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                    </svg>
                                </div>
                                <span className="text-white text-xs font-semibold">{post.likes}</span>
                            </button>

                            <button className="flex flex-col items-center" aria-label="Comments">
                                <div className="w-12 h-12 flex items-center justify-center">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
                                    </svg>
                                </div>
                                <span className="text-white text-xs font-semibold">{post.commentsCount}</span>
                            </button>
                        </div>
                    </div>
                ))}
            </motion.div>

            {/* Progress dots */}
            {videoPosts.length > 1 && videoPosts.length <= 20 && (
                <div className="fixed right-1.5 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1.5">
                    {videoPosts.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goTo(index)}
                            className={`w-1 rounded-full transition-all ${
                                index === currentIndex ? 'h-6 bg-white' : 'h-1.5 bg-white/40'
                            }`}
                            aria-label={`Go to video ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
