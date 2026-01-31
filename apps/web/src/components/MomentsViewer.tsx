'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface Moment {
    id: string;
    type: 'IMAGE' | 'VIDEO' | 'TEXT';
    mediaUrl: string;
    caption: string | null;
    viewCount: number;
    createdAt: string;
    hasViewed: boolean;
}

interface UserMoments {
    user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
    };
    moments: Moment[];
    hasUnviewed: boolean;
}

interface MomentsViewerProps {
    isOpen: boolean;
    onClose: () => void;
    userMoments: UserMoments[];
    initialUserIndex?: number;
}

export default function MomentsViewer({
    isOpen,
    onClose,
    userMoments,
    initialUserIndex = 0,
}: MomentsViewerProps) {
    const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
    const [currentMomentIndex, setCurrentMomentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const currentUser = userMoments[currentUserIndex];
    const currentMoment = currentUser?.moments[currentMomentIndex];
    const momentDuration = currentMoment?.type === 'VIDEO' ? 15000 : 5000; // 15s for video, 5s for image

    // Progress bar timer
    useEffect(() => {
        if (!isOpen || !currentMoment || isPaused) return;

        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min((elapsed / momentDuration) * 100, 100);
            setProgress(newProgress);

            if (newProgress >= 100) {
                goToNext();
            }
        }, 50);

        return () => clearInterval(interval);
    }, [isOpen, currentUserIndex, currentMomentIndex, isPaused, momentDuration]);

    // Reset progress when moment changes
    useEffect(() => {
        setProgress(0);
    }, [currentUserIndex, currentMomentIndex]);

    // Mark moment as viewed
    useEffect(() => {
        if (currentMoment && !currentMoment.hasViewed) {
            // In production: fetch(`/api/moments/${currentMoment.id}/view`, { method: 'POST' });
        }
    }, [currentMoment]);

    const goToNext = useCallback(() => {
        if (!currentUser) return;

        if (currentMomentIndex < currentUser.moments.length - 1) {
            // Next moment in same user's story
            setCurrentMomentIndex((prev) => prev + 1);
        } else if (currentUserIndex < userMoments.length - 1) {
            // Next user's story
            setCurrentUserIndex((prev) => prev + 1);
            setCurrentMomentIndex(0);
        } else {
            // End of all stories
            onClose();
        }
    }, [currentUserIndex, currentMomentIndex, currentUser, userMoments.length, onClose]);

    const goToPrev = useCallback(() => {
        if (currentMomentIndex > 0) {
            setCurrentMomentIndex((prev) => prev - 1);
        } else if (currentUserIndex > 0) {
            setCurrentUserIndex((prev) => prev - 1);
            setCurrentMomentIndex(userMoments[currentUserIndex - 1].moments.length - 1);
        }
    }, [currentUserIndex, currentMomentIndex, userMoments]);

    const handleClick = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const isLeftSide = x < rect.width * 0.3;

        if (isLeftSide) {
            goToPrev();
        } else {
            goToNext();
        }
    };

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') goToPrev();
            if (e.key === 'ArrowRight') goToNext();
            if (e.key === ' ') setIsPaused((prev) => !prev);
        },
        [goToPrev, goToNext, onClose]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, handleKeyDown]);

    if (!isOpen || !currentMoment) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black flex items-center justify-center"
                onMouseDown={() => setIsPaused(true)}
                onMouseUp={() => setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                </button>

                {/* Story container */}
                <motion.div
                    key={`${currentUserIndex}-${currentMomentIndex}`}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full max-w-[400px] aspect-[9/16] bg-gray-900 rounded-xl overflow-hidden cursor-pointer"
                    onClick={handleClick}
                >
                    {/* Progress bars */}
                    <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
                        {currentUser.moments.map((_, idx) => (
                            <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white transition-all duration-50 ease-linear"
                                    style={{
                                        width:
                                            idx < currentMomentIndex
                                                ? '100%'
                                                : idx === currentMomentIndex
                                                    ? `${progress}%`
                                                    : '0%',
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Header - User info */}
                    <div className="absolute top-6 left-0 right-0 z-20 px-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden relative ring-2 ring-white/50">
                            <Image
                                src={
                                    currentUser.user.avatarUrl ||
                                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face'
                                }
                                alt={currentUser.user.displayName}
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div className="flex-1">
                            <p className="text-[14px] font-semibold text-white">{currentUser.user.displayName}</p>
                            <p className="text-[12px] text-white/60">
                                {formatTimeAgo(new Date(currentMoment.createdAt))}
                            </p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="absolute inset-0">
                        {currentMoment.type === 'VIDEO' ? (
                            <video
                                src={currentMoment.mediaUrl}
                                autoPlay
                                playsInline
                                muted
                                loop
                                className="w-full h-full object-cover"
                            />
                        ) : currentMoment.type === 'IMAGE' ? (
                            <Image
                                src={currentMoment.mediaUrl}
                                alt=""
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600 p-8">
                                <p className="text-white text-2xl font-bold text-center">{currentMoment.caption}</p>
                            </div>
                        )}
                    </div>

                    {/* Caption overlay */}
                    {currentMoment.caption && currentMoment.type !== 'TEXT' && (
                        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/80 to-transparent">
                            <p className="text-white text-[14px]">{currentMoment.caption}</p>
                        </div>
                    )}

                    {/* Navigation indicators */}
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-32" />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-32" />
                </motion.div>

                {/* User navigation (desktop) */}
                <div className="hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2">
                    {currentUserIndex > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrentUserIndex((prev) => prev - 1);
                                setCurrentMomentIndex(0);
                            }}
                            className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                        >
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="2"
                            >
                                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    )}
                </div>
                <div className="hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2">
                    {currentUserIndex < userMoments.length - 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrentUserIndex((prev) => prev + 1);
                                setCurrentMomentIndex(0);
                            }}
                            className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                        >
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="2"
                            >
                                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
}
