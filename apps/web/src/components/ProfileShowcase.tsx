'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import Image from 'next/image';

// ============================================
// UNIQUE PROFILE INNOVATIONS
// Features that make 0G profiles meaningful
// ============================================

// ============================================
// STORY CHAPTERS - Life timeline feature
// ============================================
interface StoryChapter {
    id: string;
    title: string;
    year: string;
    coverImage?: string;
    description: string;
    isPublic: boolean;
    mediaCount: number;
}

export function StoryChapters({
    chapters,
    isOwnProfile = false,
    onAddChapter,
    onViewChapter
}: {
    chapters: StoryChapter[];
    isOwnProfile?: boolean;
    onAddChapter?: () => void;
    onViewChapter?: (id: string) => void;
}) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span>📖</span> Story Chapters
                    </h3>
                    <p className="text-sm text-white/40">Life&apos;s milestones, curated by you</p>
                </div>
                {isOwnProfile && (
                    <button
                        onClick={onAddChapter}
                        className="px-4 py-2 rounded-xl bg-violet-500/20 text-violet-400 text-sm font-medium hover:bg-violet-500/30 transition-colors"
                    >
                        + Add Chapter
                    </button>
                )}
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {chapters.map((chapter, i) => (
                    <motion.button
                        key={chapter.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => onViewChapter?.(chapter.id)}
                        className="flex-shrink-0 w-40 group"
                    >
                        {/* Cover */}
                        <div className="relative w-40 h-52 rounded-2xl overflow-hidden mb-3">
                            {chapter.coverImage ? (
                                <Image
                                    src={chapter.coverImage}
                                    alt={chapter.title}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                            {/* Year badge */}
                            <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
                                <span className="text-xs font-medium text-white">{chapter.year}</span>
                            </div>

                            {/* Privacy indicator */}
                            {!chapter.isPublic && (
                                <div className="absolute top-3 right-3">
                                    <span className="text-sm">🔒</span>
                                </div>
                            )}

                            {/* Media count */}
                            <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
                                <span className="text-xs text-white/70">{chapter.mediaCount}</span>
                                <span className="text-xs text-white/50">📷</span>
                            </div>
                        </div>

                        {/* Title */}
                        <h4 className="font-medium text-white text-sm text-left truncate">
                            {chapter.title}
                        </h4>
                        <p className="text-xs text-white/40 text-left line-clamp-2">
                            {chapter.description}
                        </p>
                    </motion.button>
                ))}

                {/* Add chapter placeholder */}
                {isOwnProfile && (
                    <button
                        onClick={onAddChapter}
                        className="flex-shrink-0 w-40 h-52 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:border-white/20 transition-colors"
                    >
                        <span className="text-3xl text-white/20">+</span>
                        <span className="text-sm text-white/30">New Chapter</span>
                    </button>
                )}
            </div>
        </div>
    );
}

// ============================================
// VALUES & CAUSES DISPLAY
// ============================================
interface ValueCause {
    id: string;
    name: string;
    icon: string;
    category: 'value' | 'cause';
    color: string;
}

const AVAILABLE_VALUES: ValueCause[] = [
    { id: 'truth', name: 'Truth & Transparency', icon: '🔍', category: 'value', color: 'from-cyan-400 to-blue-500' },
    { id: 'family', name: 'Family First', icon: '👨‍👩‍👧‍👦', category: 'value', color: 'from-rose-400 to-pink-500' },
    { id: 'justice', name: 'Social Justice', icon: '⚖️', category: 'cause', color: 'from-purple-400 to-violet-500' },
    { id: 'environment', name: 'Environment', icon: '🌍', category: 'cause', color: 'from-green-400 to-emerald-500' },
    { id: 'education', name: 'Education for All', icon: '📚', category: 'cause', color: 'from-amber-400 to-orange-500' },
    { id: 'freedom', name: 'Press Freedom', icon: '📢', category: 'cause', color: 'from-red-400 to-rose-500' },
    { id: 'peace', name: 'Peace', icon: '☮️', category: 'cause', color: 'from-blue-400 to-indigo-500' },
    { id: 'privacy', name: 'Digital Privacy', icon: '🛡️', category: 'value', color: 'from-gray-400 to-slate-500' },
    { id: 'creativity', name: 'Creativity', icon: '🎨', category: 'value', color: 'from-pink-400 to-fuchsia-500' },
    { id: 'community', name: 'Community', icon: '🤝', category: 'value', color: 'from-teal-400 to-cyan-500' },
];

export function ValuesDisplay({
    selectedValues,
    isOwnProfile = false,
    onEdit
}: {
    selectedValues: string[];
    isOwnProfile?: boolean;
    onEdit?: () => void;
}) {
    const values = AVAILABLE_VALUES.filter(v => selectedValues.includes(v.id));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span>💜</span> Values & Causes
                    </h3>
                    <p className="text-sm text-white/40">What matters most</p>
                </div>
                {isOwnProfile && (
                    <button
                        onClick={onEdit}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 text-xs hover:bg-white/10 transition-colors"
                    >
                        Edit
                    </button>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                {values.map((value, i) => (
                    <motion.div
                        key={value.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className={`px-4 py-2 rounded-2xl bg-gradient-to-r ${value.color} bg-opacity-20 flex items-center gap-2`}
                        style={{ background: `linear-gradient(to right, var(--tw-gradient-stops))` }}
                    >
                        <span>{value.icon}</span>
                        <span className="text-sm font-medium text-white">{value.name}</span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

export function ValuesEditor({
    selectedValues,
    onChange,
    onClose
}: {
    selectedValues: string[];
    onChange: (values: string[]) => void;
    onClose: () => void;
}) {
    const [selected, setSelected] = useState<string[]>(selectedValues);
    const MAX_VALUES = 5;

    const toggleValue = (id: string) => {
        if (selected.includes(id)) {
            setSelected(selected.filter(v => v !== id));
        } else if (selected.length < MAX_VALUES) {
            setSelected([...selected, id]);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-[#0A0A0F] rounded-3xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-xl font-semibold text-white mb-2">Select Your Values</h3>
                <p className="text-sm text-white/50 mb-6">Choose up to {MAX_VALUES} values that define you</p>

                <div className="space-y-6">
                    <div>
                        <h4 className="text-sm font-medium text-white/70 mb-3">Core Values</h4>
                        <div className="flex flex-wrap gap-2">
                            {AVAILABLE_VALUES.filter(v => v.category === 'value').map((value) => (
                                <button
                                    key={value.id}
                                    onClick={() => toggleValue(value.id)}
                                    className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all ${selected.includes(value.id)
                                        ? 'bg-violet-500/30 border border-violet-500/50'
                                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                                        }`}
                                >
                                    <span>{value.icon}</span>
                                    <span className="text-sm text-white">{value.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-medium text-white/70 mb-3">Causes I Support</h4>
                        <div className="flex flex-wrap gap-2">
                            {AVAILABLE_VALUES.filter(v => v.category === 'cause').map((cause) => (
                                <button
                                    key={cause.id}
                                    onClick={() => toggleValue(cause.id)}
                                    className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all ${selected.includes(cause.id)
                                        ? 'bg-violet-500/30 border border-violet-500/50'
                                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                                        }`}
                                >
                                    <span>{cause.icon}</span>
                                    <span className="text-sm text-white">{cause.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onChange(selected);
                            onClose();
                        }}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-medium hover:opacity-90 transition-opacity"
                    >
                        Save ({selected.length}/{MAX_VALUES})
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================
// CONNECTION DEPTH DISPLAY
// ============================================
interface ConnectionDepth {
    level: 'acquaintance' | 'friend' | 'close' | 'family';
    mutualConnections: number;
    sharedCommunities: string[];
    interactionScore: number; // 0-100
    connectedSince: Date;
}

export function ConnectionDepthDisplay({
    connection,
    userName
}: {
    connection: ConnectionDepth;
    userName: string;
}) {
    const levelInfo = {
        acquaintance: { icon: '👋', label: 'Acquaintance', color: 'from-gray-400 to-gray-500' },
        friend: { icon: '🤝', label: 'Friend', color: 'from-blue-400 to-cyan-500' },
        close: { icon: '💜', label: 'Close Friend', color: 'from-violet-400 to-purple-500' },
        family: { icon: '👨‍👩‍👧‍👦', label: 'Family', color: 'from-rose-400 to-pink-500' },
    };

    const level = levelInfo[connection.level];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.02] rounded-2xl p-5 border border-white/5"
        >
            <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${level.color} flex items-center justify-center text-xl`}>
                    {level.icon}
                </div>
                <div>
                    <h4 className="font-semibold text-white">{level.label}</h4>
                    <p className="text-sm text-white/50">Your connection with {userName}</p>
                </div>
            </div>

            {/* Interaction score */}
            <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-white/50">Interaction Strength</span>
                    <span className="text-white font-medium">{connection.interactionScore}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        className={`h-full bg-gradient-to-r ${level.color} rounded-full`}
                        initial={{ width: 0 }}
                        animate={{ width: `${connection.interactionScore}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl bg-white/[0.02]">
                    <p className="text-lg font-semibold text-white">{connection.mutualConnections}</p>
                    <p className="text-xs text-white/40">Mutual Friends</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02]">
                    <p className="text-lg font-semibold text-white">{connection.sharedCommunities.length}</p>
                    <p className="text-xs text-white/40">Shared Tribes</p>
                </div>
            </div>

            {/* Connected since */}
            <p className="text-xs text-white/30 text-center mt-4">
                Connected since {connection.connectedSince.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
        </motion.div>
    );
}

// ============================================
// PROFILE BADGE SHOWCASE
// ============================================
interface ProfileBadge {
    id: string;
    name: string;
    icon: string;
    description: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    earnedAt: Date;
}

export function BadgeShowcase({
    badges,
    isOwnProfile = false
}: {
    badges: ProfileBadge[];
    isOwnProfile?: boolean;
}) {
    const rarityColors = {
        common: 'from-gray-400 to-gray-500',
        rare: 'from-blue-400 to-cyan-500',
        epic: 'from-violet-400 to-purple-500',
        legendary: 'from-amber-400 to-orange-500',
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>🏆</span> Badges
            </h3>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {badges.map((badge, i) => (
                    <motion.div
                        key={badge.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex-shrink-0 text-center"
                        title={badge.description}
                    >
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${rarityColors[badge.rarity]} p-0.5`}>
                            <div className="w-full h-full rounded-2xl bg-[#0A0A0F] flex items-center justify-center text-2xl">
                                {badge.icon}
                            </div>
                        </div>
                        <p className="text-xs text-white/60 mt-2 max-w-[64px] truncate">{badge.name}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// All components are individually named-exported above.
