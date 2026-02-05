'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// POST ACTIONS MENU
// Three-dot menu with delete and other options
// ============================================

interface PostActionsProps {
    postId: string;
    isOwner: boolean;
    onDelete: (postId: string) => Promise<{ success: boolean; error?: string }>;
    onReport?: (postId: string) => void;
    onSave?: (postId: string) => void;
    postContent?: string;
    authorName?: string;
}

export function PostActions({ postId, isOwner, onDelete, onReport, onSave, postContent, authorName }: PostActionsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared'>('idle');

    const handleDelete = useCallback(async () => {
        setIsDeleting(true);
        setError(null);

        const result = await onDelete(postId);

        if (result.success) {
            setShowDeleteConfirm(false);
            setIsOpen(false);
        } else {
            setError(result.error || 'Failed to delete post');
        }

        setIsDeleting(false);
    }, [postId, onDelete]);

    const handleShare = useCallback(async () => {
        const shareUrl = `${window.location.origin}/post/${postId}`;
        const shareTitle = authorName ? `Post by ${authorName} on 0G` : 'Check out this post on 0G';
        const shareText = postContent ? `${postContent.slice(0, 100)}${postContent.length > 100 ? '...' : ''}` : 'Check out this post!';

        // Try native Web Share API first (mobile & some browsers)
        if (navigator.share) {
            try {
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: shareUrl,
                });
                setShareStatus('shared');
                setTimeout(() => setShareStatus('idle'), 2000);
            } catch (err) {
                // User cancelled or error - fall back to clipboard
                if ((err as Error).name !== 'AbortError') {
                    await fallbackCopyToClipboard(shareUrl);
                }
            }
        } else {
            // Fallback: copy link to clipboard
            await fallbackCopyToClipboard(shareUrl);
        }
        setIsOpen(false);
    }, [postId, postContent, authorName]);

    const fallbackCopyToClipboard = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setShareStatus('copied');
            setTimeout(() => setShareStatus('idle'), 2000);
        } catch {
            // Last resort: prompt user
            window.prompt('Copy this link:', url);
        }
    };

    return (
        <>
            {/* Share status toast */}
            <AnimatePresence>
                {shareStatus !== 'idle' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-green-500 text-white rounded-full text-sm font-medium shadow-lg"
                    >
                        {shareStatus === 'copied' ? '✓ Link copied to clipboard!' : '✓ Shared successfully!'}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Three-dot Menu Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Post options"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-white/60">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Menu */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute right-0 top-full mt-1 w-48 bg-[#1A1A1F] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                        >
                            {/* Share - Always available */}
                            <button
                                onClick={handleShare}
                                className="w-full px-4 py-3 text-left text-white hover:bg-white/5 transition-colors flex items-center gap-3"
                            >
                                <span>📤</span>
                                <span>Share via Text/Message</span>
                            </button>

                            {onSave && (
                                <button
                                    onClick={() => {
                                        onSave(postId);
                                        setIsOpen(false);
                                    }}
                                    className="w-full px-4 py-3 text-left text-white hover:bg-white/5 transition-colors flex items-center gap-3"
                                >
                                    <span>🔖</span>
                                    <span>Save</span>
                                </button>
                            )}

                            {!isOwner && onReport && (
                                <button
                                    onClick={() => {
                                        onReport(postId);
                                        setIsOpen(false);
                                    }}
                                    className="w-full px-4 py-3 text-left text-white hover:bg-white/5 transition-colors flex items-center gap-3"
                                >
                                    <span>🚩</span>
                                    <span>Report</span>
                                </button>
                            )}

                            {isOwner && (
                                <button
                                    onClick={() => {
                                        setShowDeleteConfirm(true);
                                        setIsOpen(false);
                                    }}
                                    className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3 border-t border-white/10"
                                >
                                    <span>🗑️</span>
                                    <span>Delete</span>
                                </button>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowDeleteConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-[#1A1A1F] rounded-2xl p-6 max-w-sm w-full border border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">🗑️</span>
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">Delete Post?</h3>
                                <p className="text-white/60">
                                    This action cannot be undone. This post will be permanently removed.
                                </p>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/15 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        'Delete'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// ============================================
// YOUTUBE VIDEO EMBED
// Extract and render YouTube videos
// ============================================

export function extractYouTubeId(url: string): string | null {
    const patterns = [
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
        /youtube\.com\/live\/([a-zA-Z0-9_-]+)/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,  // YouTube Shorts support
        /youtu\.be\/([a-zA-Z0-9_-]+)/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    return null;
}

export function getYouTubeEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}`;
}

export function getYouTubeThumbnail(videoId: string): string {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

interface YouTubeEmbedProps {
    url: string;
    className?: string;
}

export function YouTubeEmbed({ url, className = '' }: YouTubeEmbedProps) {
    const videoId = extractYouTubeId(url);

    if (!videoId) {
        return (
            <div className={`bg-white/5 rounded-xl flex items-center justify-center p-8 ${className}`}>
                <p className="text-white/50">Invalid YouTube URL</p>
            </div>
        );
    }

    return (
        <div className={`aspect-video rounded-xl overflow-hidden ${className}`}>
            <iframe
                src={getYouTubeEmbedUrl(videoId)}
                title="YouTube video"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        </div>
    );
}

// ============================================
// VIDEO URL INPUT
// Parse and validate video URLs
// ============================================

interface VideoUrlInputProps {
    value: string;
    onChange: (url: string) => void;
    onValidUrl: (embedUrl: string, thumbnailUrl: string) => void;
}

export function VideoUrlInput({ value, onChange, onValidUrl }: VideoUrlInputProps) {
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const [previewId, setPreviewId] = useState<string | null>(null);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value;
        onChange(url);

        if (!url.trim()) {
            setIsValid(null);
            setPreviewId(null);
            return;
        }

        const videoId = extractYouTubeId(url);
        if (videoId) {
            setIsValid(true);
            setPreviewId(videoId);
            onValidUrl(getYouTubeEmbedUrl(videoId), getYouTubeThumbnail(videoId));
        } else {
            setIsValid(false);
            setPreviewId(null);
        }
    }, [onChange, onValidUrl]);

    return (
        <div className="space-y-4">
            <div className="relative">
                <input
                    type="url"
                    value={value}
                    onChange={handleChange}
                    placeholder="Paste YouTube URL (e.g. youtube.com/watch?v=...)"
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none transition-colors ${isValid === true
                        ? 'border-green-500/50 focus:border-green-500'
                        : isValid === false
                            ? 'border-red-500/50 focus:border-red-500'
                            : 'border-white/10 focus:border-[#00D4FF]/50'
                        }`}
                />
                {isValid !== null && (
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${isValid ? 'text-green-400' : 'text-red-400'}`}>
                        {isValid ? '✓' : '✗'}
                    </span>
                )}
            </div>

            {/* Preview */}
            {previewId && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl overflow-hidden border border-white/10"
                >
                    <div className="aspect-video">
                        <iframe
                            src={`https://www.youtube.com/embed/${previewId}`}
                            title="Video preview"
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                    <div className="p-3 bg-white/5 flex items-center gap-2">
                        <span className="text-red-500">▶️</span>
                        <span className="text-sm text-white/70">YouTube video ready to share</span>
                    </div>
                </motion.div>
            )}

            {isValid === false && value && (
                <p className="text-sm text-red-400">
                    Please enter a valid YouTube URL
                </p>
            )}
        </div>
    );
}
