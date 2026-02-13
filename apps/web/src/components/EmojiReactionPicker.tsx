'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// EMOJI REACTION PICKER
// Premium reaction system with 6 emoji types
// ============================================

export interface Reaction {
    emoji: string;
    label: string;
    color: string;
}

export const REACTIONS: Reaction[] = [
    { emoji: '❤️', label: 'Love', color: '#FF3B5C' },
    { emoji: '🔥', label: 'Fire', color: '#FF9500' },
    { emoji: '😂', label: 'Haha', color: '#FFD60A' },
    { emoji: '😮', label: 'Wow', color: '#7C8FFF' },
    { emoji: '😢', label: 'Sad', color: '#6070EE' },
    { emoji: '👏', label: 'Clap', color: '#10B981' },
];

interface EmojiReactionPickerProps {
    onReact: (reaction: Reaction) => void;
    currentReaction?: string;
    showLabels?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function EmojiReactionPicker({
    onReact,
    currentReaction,
    showLabels = false,
    size = 'md'
}: EmojiReactionPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);

    const sizeClasses = {
        sm: 'text-lg p-1.5',
        md: 'text-2xl p-2',
        lg: 'text-3xl p-2.5',
    };

    const handleReact = useCallback((reaction: Reaction) => {
        onReact(reaction);
        setIsOpen(false);
    }, [onReact]);

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
                onClick={() => setIsOpen(prev => !prev)}
                className={`flex items-center gap-1.5 rounded-full transition-all ${currentReaction
                        ? 'bg-white/10 hover:bg-white/15'
                        : 'hover:bg-white/5'
                    } ${sizeClasses[size]}`}
            >
                <span>{currentReaction || '👍'}</span>
                {showLabels && (
                    <span className="text-sm text-white/60">React</span>
                )}
            </button>

            {/* Reaction Picker Popup */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50"
                        onMouseEnter={() => setIsOpen(true)}
                        onMouseLeave={() => setIsOpen(false)}
                    >
                        <div className="flex items-center gap-1 p-2 rounded-full bg-[#1A1A1F] border border-white/10 shadow-xl backdrop-blur-xl">
                            {REACTIONS.map((reaction) => (
                                <motion.button
                                    key={reaction.emoji}
                                    onClick={() => handleReact(reaction)}
                                    onMouseEnter={() => setHoveredEmoji(reaction.emoji)}
                                    onMouseLeave={() => setHoveredEmoji(null)}
                                    className={`relative p-1.5 rounded-full transition-all ${currentReaction === reaction.emoji
                                            ? 'bg-white/20'
                                            : 'hover:bg-white/10'
                                        }`}
                                    whileHover={{ scale: 1.3, y: -8 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <span className="text-2xl">{reaction.emoji}</span>

                                    {/* Tooltip */}
                                    <AnimatePresence>
                                        {hoveredEmoji === reaction.emoji && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-black/90 text-white text-xs font-medium whitespace-nowrap"
                                            >
                                                {reaction.label}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// REACTION DISPLAY
// Shows reactions on a post with counts
// ============================================

interface ReactionCount {
    emoji: string;
    count: number;
}

interface ReactionDisplayProps {
    reactions: ReactionCount[];
    onReactionClick?: (emoji: string) => void;
    compact?: boolean;
}

export function ReactionDisplay({ reactions, onReactionClick, compact = false }: ReactionDisplayProps) {
    if (reactions.length === 0) return null;

    const totalCount = reactions.reduce((sum, r) => sum + r.count, 0);
    const topReactions = reactions.slice(0, 3);

    return (
        <div className="flex items-center gap-1">
            <div className={`flex items-center ${compact ? '-space-x-1' : 'gap-0.5'}`}>
                {topReactions.map((r) => (
                    <button
                        key={r.emoji}
                        onClick={() => onReactionClick?.(r.emoji)}
                        className={`${compact ? 'text-sm' : 'text-base'} hover:scale-110 transition-transform`}
                    >
                        {r.emoji}
                    </button>
                ))}
            </div>
            {totalCount > 0 && (
                <span className={`${compact ? 'text-xs' : 'text-sm'} text-white/50 font-medium`}>
                    {totalCount.toLocaleString()}
                </span>
            )}
        </div>
    );
}
