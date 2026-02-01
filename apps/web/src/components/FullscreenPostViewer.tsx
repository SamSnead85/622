'use client';

import { useState, useRef, useEffect, TouchEvent, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

// ============================================
// TYPES
// ============================================
export interface PostData {
    id?: string;
    author: string;
    avatar: string;
    image: string;
    caption: string;
    likes: number;
    time: string;
    isLiked?: boolean;
    tribe?: string;
}

interface FullscreenPostViewerProps {
    posts: PostData[];
    initialIndex: number;
    isOpen: boolean;
    onClose: () => void;
    onLike?: (index: number) => void;
}

// ============================================
// FULLSCREEN POST VIEWER
// ============================================
export function FullscreenPostViewer({
    posts,
    initialIndex,
    isOpen,
    onClose,
    onLike,
}: FullscreenPostViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isLiked, setIsLiked] = useState(false);
    const [showOverlay, setShowOverlay] = useState(true);
    const [comment, setComment] = useState('');
    const touchStartRef = useRef<number>(0);
    const touchDeltaRef = useRef<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const currentPost = posts[currentIndex];

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            setIsLiked(posts[initialIndex]?.isLiked || false);
        }
    }, [isOpen, initialIndex, posts]);

    const goToNext = useCallback(() => {
        if (currentIndex < posts.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setIsLiked(posts[currentIndex + 1]?.isLiked || false);
        }
    }, [currentIndex, posts]);

    const goToPrev = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setIsLiked(posts[currentIndex - 1]?.isLiked || false);
        }
    }, [currentIndex, posts]);

    const handleLike = useCallback(() => {
        setIsLiked(prev => !prev);
        onLike?.(currentIndex);
    }, [currentIndex, onLike]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown' || e.key === 'j') {
                goToNext();
            } else if (e.key === 'ArrowUp' || e.key === 'k') {
                goToPrev();
            } else if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'l') {
                handleLike();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, goToNext, goToPrev, handleLike, onClose]);

    // Touch handlers for swipe
    const handleTouchStart = (e: TouchEvent) => {
        touchStartRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
        touchDeltaRef.current = e.touches[0].clientY - touchStartRef.current;
    };

    const handleTouchEnd = () => {
        const delta = touchDeltaRef.current;
        const threshold = 50;

        if (delta < -threshold) {
            goToNext(); // Swipe up → next post
        } else if (delta > threshold) {
            goToPrev(); // Swipe down → prev post
        }

        touchDeltaRef.current = 0;
    };

    if (!isOpen || !currentPost) return null;

    return (
        <motion.div
            ref={containerRef}
            className="fixed inset-0 z-50 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={() => setShowOverlay(!showOverlay)}
        >
            {/* Close button */}
            <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
                ✕
            </button>

            {/* Progress indicator */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-1">
                {posts.slice(0, Math.min(posts.length, 10)).map((_, i) => (
                    <div
                        key={i}
                        className={`h-1 rounded-full transition-all ${i === currentIndex
                            ? 'w-6 bg-white'
                            : 'w-2 bg-white/30'
                            }`}
                    />
                ))}
                {posts.length > 10 && (
                    <span className="text-white/50 text-xs ml-1">+{posts.length - 10}</span>
                )}
            </div>

            {/* Post content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    className="absolute inset-0"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* Full screen image */}
                    <Image
                        src={currentPost.image}
                        alt={`Post by ${currentPost.author}`}
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                </motion.div>
            </AnimatePresence>

            {/* Overlay content */}
            <AnimatePresence>
                {showOverlay && (
                    <motion.div
                        className="absolute inset-0 flex flex-col justify-end pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* Right side actions */}
                        <div className="absolute right-4 bottom-32 flex flex-col items-center gap-5 pointer-events-auto">
                            <button onClick={(e) => { e.stopPropagation(); handleLike(); }} className="flex flex-col items-center">
                                <motion.span
                                    className="text-3xl"
                                    animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
                                >
                                    {isLiked ? '🔥' : '🤍'}
                                </motion.span>
                                <span className="text-white text-xs mt-1">{currentPost.likes.toLocaleString()}</span>
                            </button>
                            <button className="flex flex-col items-center">
                                <span className="text-3xl">💬</span>
                                <span className="text-white text-xs mt-1">Comments</span>
                            </button>
                            <button className="flex flex-col items-center">
                                <span className="text-3xl">📤</span>
                                <span className="text-white text-xs mt-1">Share</span>
                            </button>
                            <button className="flex flex-col items-center">
                                <span className="text-3xl">🔖</span>
                                <span className="text-white text-xs mt-1">Save</span>
                            </button>
                        </div>

                        {/* Bottom info */}
                        <div className="p-4 pb-8 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                            {/* Author info */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 rounded-full overflow-hidden relative ring-2 ring-white/20">
                                    <Image src={currentPost.avatar} alt={currentPost.author} fill className="object-cover" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-white text-lg">{currentPost.author}</p>
                                    <p className="text-white/50 text-sm">{currentPost.time}</p>
                                </div>
                                <button className="px-4 py-2 rounded-full bg-white text-black font-semibold text-sm">
                                    Follow
                                </button>
                            </div>

                            {/* Caption */}
                            <p className="text-white/90 mb-4">{currentPost.caption}</p>

                            {/* Tribe tag */}
                            {currentPost.tribe && (
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-sm mb-4">
                                    <span>🏕️</span>
                                    <span>{currentPost.tribe}</span>
                                </div>
                            )}

                            {/* Comment input */}
                            <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                                <input
                                    type="text"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Add a comment..."
                                    className="flex-1 bg-transparent text-white placeholder:text-white/40 focus:outline-none"
                                />
                                {comment && (
                                    <button className="text-orange-400 font-semibold text-sm">Post</button>
                                )}
                            </div>
                        </div>

                        {/* Swipe hint */}
                        <motion.div
                            className="absolute left-1/2 bottom-2 -translate-x-1/2 text-white/30 text-xs"
                            animate={{ y: [0, 5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            Swipe to browse
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navigation arrows (desktop) */}
            <div className="hidden md:flex absolute inset-y-0 left-4 right-4 items-center justify-between pointer-events-none">
                <button
                    onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                    disabled={currentIndex === 0}
                    className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors pointer-events-auto disabled:opacity-30"
                >
                    ↑
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); goToNext(); }}
                    disabled={currentIndex === posts.length - 1}
                    className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors pointer-events-auto disabled:opacity-30"
                >
                    ↓
                </button>
            </div>
        </motion.div>
    );
}

export default FullscreenPostViewer;
