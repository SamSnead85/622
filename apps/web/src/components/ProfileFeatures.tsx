'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// PROFILE QR CODE
// Generate shareable QR code for profiles
// ============================================

interface ProfileQRCodeProps {
    isOpen: boolean;
    onClose: () => void;
    username: string;
    displayName: string;
    avatarUrl?: string;
}

export function ProfileQRCode({ isOpen, onClose, username, displayName }: ProfileQRCodeProps) {
    const profileUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/profile/${username}`
        : `https://0g.social/profile/${username}`;

    // Generate simple QR pattern (in production, use a proper QR library)
    const qrPattern = useMemo(() => {
        const grid = [];
        for (let i = 0; i < 21; i++) {
            const row = [];
            for (let j = 0; j < 21; j++) {
                // Corner patterns
                const isCorner =
                    (i < 7 && j < 7) ||
                    (i < 7 && j > 13) ||
                    (i > 13 && j < 7);
                // Random fill for middle
                const isFilled = isCorner ?
                    ((i === 0 || i === 6 || j === 0 || j === 6) || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) :
                    Math.random() > 0.5;
                row.push(isFilled);
            }
            grid.push(row);
        }
        return grid;
    }, []);

    const handleShare = useCallback(async () => {
        if (navigator.share) {
            await navigator.share({
                title: `${displayName} on 0G`,
                text: `Check out ${displayName}'s profile on 0G`,
                url: profileUrl,
            });
        } else {
            await navigator.clipboard.writeText(profileUrl);
            alert('Profile link copied!');
        }
    }, [displayName, profileUrl]);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[#1A1A1F] rounded-3xl w-full max-w-sm overflow-hidden border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 text-center border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white">{displayName}</h3>
                    <p className="text-sm text-white/50">@{username}</p>
                </div>

                {/* QR Code */}
                <div className="p-8 flex items-center justify-center">
                    <div className="p-4 bg-white rounded-2xl">
                        <div className="grid gap-[1px]" style={{ gridTemplateColumns: `repeat(21, 1fr)` }}>
                            {qrPattern.map((row, i) =>
                                row.map((filled, j) => (
                                    <div
                                        key={`${i}-${j}`}
                                        className={`w-2.5 h-2.5 ${filled ? 'bg-black' : 'bg-white'}`}
                                    />
                                ))
                            )}
                        </div>
                        {/* 0G Logo in center */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-10 h-10 rounded-xl bg-[#00D4FF] flex items-center justify-center text-black font-bold text-lg">
                                0G
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 pt-0 space-y-3">
                    <button
                        onClick={handleShare}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-black font-semibold hover:opacity-90 transition-opacity"
                    >
                        Share Profile
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/15 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================
// PINNED POSTS
// Display and manage pinned posts on profile
// ============================================

interface PinnedPost {
    id: string;
    content?: string;
    mediaUrl?: string;
    createdAt: string;
    isPinned: boolean;
}

interface PinnedPostsProps {
    posts: PinnedPost[];
    onUnpin: (postId: string) => void;
    onPostClick: (postId: string) => void;
    isOwner?: boolean;
}

export function PinnedPosts({ posts, onUnpin, onPostClick, isOwner = false }: PinnedPostsProps) {
    const pinnedPosts = posts.filter(p => p.isPinned);

    if (pinnedPosts.length === 0) return null;

    return (
        <div className="mb-6">
            <h3 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2">
                📌 Pinned Posts
            </h3>
            <div className="space-y-3">
                {pinnedPosts.map((post) => (
                    <motion.div
                        key={post.id}
                        className="relative p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:border-white/20 transition-colors"
                        onClick={() => onPostClick(post.id)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                    >
                        {post.content && (
                            <p className="text-white/80 text-sm line-clamp-2">{post.content}</p>
                        )}

                        {isOwner && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUnpin(post.id);
                                }}
                                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/10 hover:bg-red-500/20 flex items-center justify-center text-xs transition-colors"
                                title="Unpin"
                            >
                                📌
                            </button>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// ============================================
// POST SCHEDULING
// Schedule posts for future publishing
// ============================================

interface PostSchedulerProps {
    isOpen: boolean;
    onClose: () => void;
    onSchedule: (scheduledTime: Date) => void;
}

export function PostScheduler({ isOpen, onClose, onSchedule }: PostSchedulerProps) {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');

    const handleSchedule = useCallback(() => {
        if (!date || !time) return;
        const scheduledTime = new Date(`${date}T${time}`);
        if (scheduledTime > new Date()) {
            onSchedule(scheduledTime);
            onClose();
        }
    }, [date, time, onSchedule, onClose]);

    const minDate = new Date().toISOString().split('T')[0];

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[#1A1A1F] rounded-2xl w-full max-w-sm border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        📅 Schedule Post
                    </h3>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-sm text-white/60 mb-2 block">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            min={minDate}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00D4FF]/50"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-white/60 mb-2 block">Time</label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00D4FF]/50"
                        />
                    </div>
                </div>

                <div className="p-6 pt-0 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/15 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSchedule}
                        disabled={!date || !time}
                        className="flex-1 py-3 rounded-xl bg-[#00D4FF] text-black font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        Schedule
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================
// DRAFT POSTS
// Save and manage post drafts
// ============================================

interface Draft {
    id: string;
    content: string;
    mediaUrls?: string[];
    createdAt: string;
    updatedAt: string;
}

const DRAFTS_KEY = '0g_post_drafts';

export function useDrafts() {
    const [drafts, setDrafts] = useState<Draft[]>([]);

    React.useEffect(() => {
        const saved = localStorage.getItem(DRAFTS_KEY);
        if (saved) {
            try {
                setDrafts(JSON.parse(saved));
            } catch {
                setDrafts([]);
            }
        }
    }, []);

    const saveDraft = useCallback((content: string, mediaUrls?: string[]) => {
        const draft: Draft = {
            id: Date.now().toString(),
            content,
            mediaUrls,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        setDrafts(prev => {
            const updated = [draft, ...prev];
            localStorage.setItem(DRAFTS_KEY, JSON.stringify(updated));
            return updated;
        });

        return draft;
    }, []);

    const updateDraft = useCallback((id: string, content: string, mediaUrls?: string[]) => {
        setDrafts(prev => {
            const updated = prev.map(d =>
                d.id === id
                    ? { ...d, content, mediaUrls, updatedAt: new Date().toISOString() }
                    : d
            );
            localStorage.setItem(DRAFTS_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const deleteDraft = useCallback((id: string) => {
        setDrafts(prev => {
            const updated = prev.filter(d => d.id !== id);
            localStorage.setItem(DRAFTS_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    return { drafts, saveDraft, updateDraft, deleteDraft };
}

interface DraftsListProps {
    onDraftSelect: (draft: Draft) => void;
    onDraftDelete: (id: string) => void;
    drafts: Draft[];
}

export function DraftsList({ drafts, onDraftSelect, onDraftDelete }: DraftsListProps) {
    if (drafts.length === 0) {
        return (
            <div className="text-center py-8 text-white/40 text-sm">
                No drafts saved
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {drafts.map((draft) => (
                <div
                    key={draft.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                >
                    <button
                        onClick={() => onDraftSelect(draft)}
                        className="flex-1 text-left"
                    >
                        <p className="text-white/70 text-sm line-clamp-2">{draft.content}</p>
                        <span className="text-xs text-white/40">
                            {new Date(draft.updatedAt).toLocaleDateString()}
                        </span>
                    </button>
                    <button
                        onClick={() => onDraftDelete(draft.id)}
                        className="text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                        🗑️
                    </button>
                </div>
            ))}
        </div>
    );
}
