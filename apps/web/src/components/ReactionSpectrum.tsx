'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

// ============================================
// REACTION SPECTRUM - Beyond Basic Likes
// Unique to 0G: Meaningful reactions that express connection
// ============================================

export interface Reaction {
    id: string;
    emoji: string;
    label: string;
    color: string;
    description: string;
}

export const REACTION_SPECTRUM: Reaction[] = [
    { id: 'resonate', emoji: '💫', label: 'Resonate', color: '#00D4FF', description: 'This speaks to me' },
    { id: 'curious', emoji: '🤔', label: 'Curious', color: '#F59E0B', description: 'Tell me more' },
    { id: 'inspired', emoji: '✨', label: 'Inspired', color: '#8B5CF6', description: 'This motivates me' },
    { id: 'support', emoji: '🤝', label: 'Support', color: '#10B981', description: "I'm with you" },
    { id: 'love', emoji: '❤️', label: 'Love', color: '#EF4444', description: 'Love this' },
    { id: 'celebrate', emoji: '🎉', label: 'Celebrate', color: '#EC4899', description: 'Congratulations!' },
];

interface ReactionSpectrumProps {
    postId: string;
    reactions?: Record<string, number>;
    userReaction?: string | null;
    onReact?: (reactionId: string) => void;
    compact?: boolean;
}

export function ReactionSpectrum({
    postId,
    reactions = {},
    userReaction = null,
    onReact,
    compact = false
}: ReactionSpectrumProps) {
    const [showPicker, setShowPicker] = useState(false);
    const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);

    const totalReactions = Object.values(reactions).reduce((sum, count) => sum + count, 0);

    // Get top 3 reactions for display
    const topReactions = REACTION_SPECTRUM
        .filter(r => reactions[r.id] > 0)
        .sort((a, b) => (reactions[b.id] || 0) - (reactions[a.id] || 0))
        .slice(0, 3);

    const handleReact = (reactionId: string) => {
        onReact?.(reactionId);
        setShowPicker(false);
    };

    if (compact) {
        return (
            <div className="relative">
                <button
                    onClick={() => setShowPicker(!showPicker)}
                    className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
                >
                    {topReactions.length > 0 ? (
                        <div className="flex -space-x-1">
                            {topReactions.map(r => (
                                <span key={r.id} className="text-sm">{r.emoji}</span>
                            ))}
                        </div>
                    ) : (
                        <span className="text-sm">💫</span>
                    )}
                    <span className="text-sm">{totalReactions || 'React'}</span>
                </button>

                <AnimatePresence>
                    {showPicker && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="absolute bottom-full left-0 mb-2 bg-[#0A0A0F] rounded-2xl border border-white/10 p-2 shadow-xl z-50"
                        >
                            <div className="flex gap-1">
                                {REACTION_SPECTRUM.map(reaction => (
                                    <motion.button
                                        key={reaction.id}
                                        whileHover={{ scale: 1.3, y: -5 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => handleReact(reaction.id)}
                                        onMouseEnter={() => setHoveredReaction(reaction.id)}
                                        onMouseLeave={() => setHoveredReaction(null)}
                                        className={`
                                            p-2 rounded-xl transition-colors relative
                                            ${userReaction === reaction.id ? 'bg-white/10' : 'hover:bg-white/5'}
                                        `}
                                        style={{
                                            boxShadow: userReaction === reaction.id
                                                ? `0 0 10px ${reaction.color}40`
                                                : undefined
                                        }}
                                    >
                                        <span className="text-xl">{reaction.emoji}</span>

                                        {/* Tooltip */}
                                        <AnimatePresence>
                                            {hoveredReaction === reaction.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 5 }}
                                                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap"
                                                >
                                                    <div
                                                        className="px-2 py-1 rounded-lg text-xs font-medium"
                                                        style={{
                                                            backgroundColor: reaction.color,
                                                            color: '#000'
                                                        }}
                                                    >
                                                        {reaction.label}
                                                    </div>
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

    // Full display mode
    return (
        <div className="flex flex-wrap gap-2">
            {REACTION_SPECTRUM.map(reaction => {
                const count = reactions[reaction.id] || 0;
                const isSelected = userReaction === reaction.id;

                return (
                    <motion.button
                        key={reaction.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleReact(reaction.id)}
                        className={`
                            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                            transition-all border
                            ${isSelected
                                ? 'bg-white/10 border-white/20'
                                : 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                            }
                        `}
                        style={{
                            color: isSelected ? reaction.color : 'rgba(255,255,255,0.6)',
                            borderColor: isSelected ? `${reaction.color}40` : undefined,
                            boxShadow: isSelected ? `0 0 15px ${reaction.color}20` : undefined
                        }}
                    >
                        <span>{reaction.emoji}</span>
                        <span>{reaction.label}</span>
                        {count > 0 && (
                            <span className="opacity-60">({count})</span>
                        )}
                    </motion.button>
                );
            })}
        </div>
    );
}

// ============================================
// POST INTENTION TAGS - Unique to 0G
// Let posters tag their intent so readers know how to engage
// ============================================

export interface PostIntention {
    id: string;
    emoji: string;
    label: string;
    color: string;
    placeholder: string;
}

export const POST_INTENTIONS: PostIntention[] = [
    { id: 'share', emoji: '📢', label: 'Share', color: '#00D4FF', placeholder: "What's on your mind?" },
    { id: 'question', emoji: '❓', label: 'Question', color: '#F59E0B', placeholder: 'Ask your community...' },
    { id: 'reflection', emoji: '💭', label: 'Reflection', color: '#8B5CF6', placeholder: 'Share your thoughts...' },
    { id: 'celebration', emoji: '🎉', label: 'Celebration', color: '#10B981', placeholder: 'Celebrate something!' },
    { id: 'request', emoji: '🤝', label: 'Request', color: '#EC4899', placeholder: 'Ask for help or support...' },
    { id: 'announcement', emoji: '📣', label: 'Announcement', color: '#EF4444', placeholder: 'Make an announcement...' },
];

interface IntentionSelectorProps {
    selected: string;
    onSelect: (intentionId: string) => void;
}

export function IntentionSelector({ selected, onSelect }: IntentionSelectorProps) {
    return (
        <div className="flex flex-wrap gap-2">
            {POST_INTENTIONS.map(intention => {
                const isSelected = selected === intention.id;

                return (
                    <motion.button
                        key={intention.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onSelect(intention.id)}
                        className={`
                            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                            transition-all border
                            ${isSelected
                                ? 'border-opacity-40'
                                : 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                            }
                        `}
                        style={{
                            backgroundColor: isSelected ? `${intention.color}20` : undefined,
                            borderColor: isSelected ? intention.color : undefined,
                            color: isSelected ? intention.color : 'rgba(255,255,255,0.6)'
                        }}
                    >
                        <span>{intention.emoji}</span>
                        <span>{intention.label}</span>
                    </motion.button>
                );
            })}
        </div>
    );
}

// Intention Badge for displaying on posts
interface IntentionBadgeProps {
    intentionId: string;
    size?: 'sm' | 'md';
}

export function IntentionBadge({ intentionId, size = 'sm' }: IntentionBadgeProps) {
    const intention = POST_INTENTIONS.find(i => i.id === intentionId);
    if (!intention) return null;

    return (
        <span
            className={`
                inline-flex items-center gap-1 rounded-full font-medium
                ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}
            `}
            style={{
                backgroundColor: `${intention.color}20`,
                color: intention.color
            }}
        >
            <span>{intention.emoji}</span>
            <span>{intention.label}</span>
        </span>
    );
}

// ============================================
// CONNECTION DEPTH INDICATOR
// Shows how close you are to the poster
// ============================================

export type ConnectionDepth = 'self' | 'close' | 'friend' | 'following' | 'community' | 'discover';

interface ConnectionDepthProps {
    depth: ConnectionDepth;
}

export function ConnectionDepthIndicator({ depth }: ConnectionDepthProps) {
    const config: Record<ConnectionDepth, { label: string; color: string; rings: number }> = {
        self: { label: 'You', color: '#00D4FF', rings: 4 },
        close: { label: 'Close Friend', color: '#10B981', rings: 3 },
        friend: { label: 'Friend', color: '#8B5CF6', rings: 2 },
        following: { label: 'Following', color: '#F59E0B', rings: 1 },
        community: { label: 'Community', color: '#6B7280', rings: 1 },
        discover: { label: 'Discover', color: '#374151', rings: 0 },
    };

    const { label, color, rings } = config[depth];

    return (
        <div className="flex items-center gap-1.5" title={label}>
            <div className="relative w-4 h-4">
                {/* Orbiting rings */}
                {Array.from({ length: Math.max(rings, 1) }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute inset-0 rounded-full border opacity-40"
                        style={{
                            borderColor: color,
                            transform: `scale(${1 + i * 0.3})`,
                            opacity: 0.4 - i * 0.1
                        }}
                    />
                ))}
                <div
                    className="absolute inset-1 rounded-full"
                    style={{ backgroundColor: color }}
                />
            </div>
            <span className="text-[10px] text-white/40">{label}</span>
        </div>
    );
}

export default ReactionSpectrum;
