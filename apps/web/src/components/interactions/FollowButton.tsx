'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FollowButtonProps {
    isFollowing: boolean;
    onToggle: () => Promise<void> | void;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function FollowButton({ isFollowing, onToggle, size = 'md', className = '' }: FollowButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showUnfollow, setShowUnfollow] = useState(false);
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

    const sizes = {
        sm: 'px-3 py-1 text-xs',
        md: 'px-4 py-1.5 text-sm',
        lg: 'px-6 py-2 text-base',
    };

    const handleClick = useCallback(async () => {
        if (isFollowing) {
            // Show unfollow confirmation on click
            setShowUnfollow(true);
            return;
        }
        setIsLoading(true);
        try {
            await onToggle();
        } finally {
            setIsLoading(false);
        }
    }, [isFollowing, onToggle]);

    const handleUnfollow = useCallback(async () => {
        setIsLoading(true);
        setShowUnfollow(false);
        try {
            await onToggle();
        } finally {
            setIsLoading(false);
        }
    }, [onToggle]);

    const handleMouseLeave = useCallback(() => {
        setShowUnfollow(false);
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
    }, [longPressTimer]);

    return (
        <div className="relative" onMouseLeave={handleMouseLeave}>
            <motion.button
                onClick={handleClick}
                disabled={isLoading}
                className={`relative overflow-hidden rounded-lg font-semibold transition-colors ${sizes[size]} ${
                    showUnfollow
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : isFollowing
                            ? 'bg-white/10 text-white/70 hover:bg-white/15 border border-white/10'
                            : 'bg-[#D4AF37] text-black hover:opacity-90'
                } ${className}`}
                whileTap={{ scale: 0.95 }}
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                aria-label={isFollowing ? 'Unfollow' : 'Follow'}
                aria-pressed={isFollowing}
            >
                <AnimatePresence mode="wait" initial={false}>
                    {isLoading ? (
                        <motion.span
                            key="loading"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-1"
                        >
                            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        </motion.span>
                    ) : showUnfollow ? (
                        <motion.span
                            key="unfollow"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            onClick={(e) => { e.stopPropagation(); handleUnfollow(); }}
                        >
                            Unfollow?
                        </motion.span>
                    ) : isFollowing ? (
                        <motion.span
                            key="following"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-1.5"
                        >
                            <motion.svg
                                width={12} height={12} viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth={3}
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                            >
                                <motion.path
                                    d="M5 13l4 4L19 7"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </motion.svg>
                            Following
                        </motion.span>
                    ) : (
                        <motion.span
                            key="follow"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            Follow
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>
        </div>
    );
}
