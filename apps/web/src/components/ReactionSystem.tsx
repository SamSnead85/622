'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartIcon, MessageIcon, ShareIcon } from '@/components/icons';

// ============================================
// TYPES
// ============================================

export type ReactionType = 'like' | 'love' | 'fire' | 'laugh' | 'wow' | 'sad' | 'pray';

export interface Reaction {
    type: ReactionType;
    userId: string;
    userName: string;
    createdAt: Date;
}

export interface ReactionSummary {
    type: ReactionType;
    count: number;
    users: string[];
    hasReacted: boolean;
}

// ============================================
// REACTION CONFIG
// ============================================

const REACTION_EMOJIS: Record<ReactionType, { emoji: string; label: string; color: string }> = {
    like: { emoji: '👍', label: 'Like', color: 'from-blue-500 to-blue-600' },
    love: { emoji: '❤️', label: 'Love', color: 'from-red-500 to-pink-500' },
    fire: { emoji: '🔥', label: 'Fire', color: 'from-orange-500 to-red-500' },
    laugh: { emoji: '😂', label: 'Haha', color: 'from-yellow-500 to-amber-500' },
    wow: { emoji: '😮', label: 'Wow', color: 'from-purple-500 to-indigo-500' },
    sad: { emoji: '😢', label: 'Sad', color: 'from-blue-400 to-cyan-500' },
    pray: { emoji: '🙏', label: 'Pray', color: 'from-amber-400 to-yellow-500' },
};

// ============================================
// FLOATING REACTION ANIMATION
// ============================================

interface FloatingReactionProps {
    emoji: string;
    x: number;
    onComplete: () => void;
}

function FloatingReaction({ emoji, x, onComplete }: FloatingReactionProps) {
    useEffect(() => {
        const timer = setTimeout(onComplete, 2000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            initial={{ y: 0, opacity: 1, scale: 0.5 }}
            animate={{ y: -150, opacity: 0, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="absolute bottom-0 pointer-events-none text-3xl"
            style={{ left: `${x}%` }}
        >
            {emoji}
        </motion.div>
    );
}

// ============================================
// REACTION PICKER COMPONENT
// ============================================

interface ReactionPickerProps {
    isOpen: boolean;
    onSelect: (type: ReactionType) => void;
    onClose: () => void;
}

export function ReactionPicker({ isOpen, onSelect, onClose }: ReactionPickerProps) {
    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute bottom-full mb-2 left-0 flex gap-1 px-3 py-2 bg-[#1A1A1F] rounded-full border border-white/10 shadow-xl z-10"
            onMouseLeave={onClose}
        >
            {Object.entries(REACTION_EMOJIS).map(([type, { emoji, label }]) => (
                <motion.button
                    key={type}
                    whileHover={{ scale: 1.3, y: -5 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onSelect(type as ReactionType)}
                    className="relative w-9 h-9 flex items-center justify-center text-xl hover:bg-white/10 rounded-full transition-colors group"
                    title={label}
                >
                    {emoji}
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {label}
                    </span>
                </motion.button>
            ))}
        </motion.div>
    );
}

// ============================================
// REACTION BUTTON WITH ANIMATIONS
// ============================================

interface ReactionButtonProps {
    reactions: ReactionSummary[];
    onReact: (type: ReactionType) => void;
    onRemoveReaction: (type: ReactionType) => void;
}

export function ReactionButton({ reactions, onReact, onRemoveReaction }: ReactionButtonProps) {
    const [showPicker, setShowPicker] = useState(false);
    const [floatingReactions, setFloatingReactions] = useState<{ id: number; emoji: string; x: number }[]>([]);
    const nextId = useRef(0);

    const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);
    const topReactions = reactions.sort((a, b) => b.count - a.count).slice(0, 3);
    const hasUserReacted = reactions.some(r => r.hasReacted);

    const handleReact = (type: ReactionType) => {
        const existing = reactions.find(r => r.type === type);
        if (existing?.hasReacted) {
            onRemoveReaction(type);
        } else {
            onReact(type);
            // Add floating animation
            const emoji = REACTION_EMOJIS[type].emoji;
            const id = nextId.current++;
            const x = 20 + Math.random() * 60;
            setFloatingReactions(prev => [...prev, { id, emoji, x }]);
        }
        setShowPicker(false);
    };

    const removeFloating = useCallback((id: number) => {
        setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, []);

    return (
        <div className="relative">
            {/* Floating Reactions */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <AnimatePresence>
                    {floatingReactions.map(({ id, emoji, x }) => (
                        <FloatingReaction
                            key={id}
                            emoji={emoji}
                            x={x}
                            onComplete={() => removeFloating(id)}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Reaction Summary */}
            <div className="flex items-center gap-2">
                <button
                    onMouseEnter={() => setShowPicker(true)}
                    onClick={() => handleReact('like')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${hasUserReacted
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                >
                    {topReactions.length > 0 ? (
                        <div className="flex -space-x-1">
                            {topReactions.map(r => (
                                <span key={r.type} className="text-sm">{REACTION_EMOJIS[r.type].emoji}</span>
                            ))}
                        </div>
                    ) : (
                        <HeartIcon size={16} />
                    )}
                    {totalReactions > 0 && (
                        <span className="text-sm font-medium">{totalReactions}</span>
                    )}
                </button>
            </div>

            {/* Picker */}
            <AnimatePresence>
                {showPicker && (
                    <ReactionPicker
                        isOpen={showPicker}
                        onSelect={handleReact}
                        onClose={() => setShowPicker(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// LIVE REACTION STREAM (for posts/streams)
// ============================================

interface LiveReactionStreamProps {
    streamId: string;
}

export function LiveReactionStream({ streamId }: LiveReactionStreamProps) {
    const [reactions, setReactions] = useState<{ id: number; emoji: string; x: number }[]>([]);
    const nextId = useRef(0);

    // Simulate receiving reactions from WebSocket
    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.7) {
                const types = Object.keys(REACTION_EMOJIS) as ReactionType[];
                const type = types[Math.floor(Math.random() * types.length)];
                const emoji = REACTION_EMOJIS[type].emoji;
                const id = nextId.current++;
                const x = 10 + Math.random() * 80;
                setReactions(prev => [...prev, { id, emoji, x }]);
            }
        }, 500);

        return () => clearInterval(interval);
    }, [streamId]);

    const removeReaction = useCallback((id: number) => {
        setReactions(prev => prev.filter(r => r.id !== id));
    }, []);

    return (
        <div className="fixed bottom-20 right-4 w-32 h-48 pointer-events-none overflow-hidden">
            <AnimatePresence>
                {reactions.map(({ id, emoji, x }) => (
                    <FloatingReaction
                        key={id}
                        emoji={emoji}
                        x={x}
                        onComplete={() => removeReaction(id)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// CONFETTI CELEBRATION
// ============================================

interface ConfettiProps {
    trigger: boolean;
}

export function Confetti({ trigger }: ConfettiProps) {
    const [particles, setParticles] = useState<{ id: number; x: number; color: string; delay: number }[]>([]);
    const nextId = useRef(0);

    useEffect(() => {
        if (trigger) {
            const newParticles = Array.from({ length: 30 }, () => ({
                id: nextId.current++,
                x: Math.random() * 100,
                color: ['#00D4FF', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899'][Math.floor(Math.random() * 5)],
                delay: Math.random() * 0.5,
            }));
            setParticles(newParticles);

            // Clear after animation
            const timer = setTimeout(() => setParticles([]), 3000);
            return () => clearTimeout(timer);
        }
    }, [trigger]);

    if (particles.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
            {particles.map(({ id, x, color, delay }) => (
                <motion.div
                    key={id}
                    initial={{ y: -20, opacity: 1, rotate: 0 }}
                    animate={{ y: '100vh', opacity: 0, rotate: 720 }}
                    transition={{ duration: 2 + Math.random(), delay, ease: 'easeIn' }}
                    className="absolute w-3 h-3"
                    style={{ left: `${x}%`, backgroundColor: color }}
                />
            ))}
        </div>
    );
}

export default ReactionButton;
