'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

// ============================================
// PHASES 1-100: FEED & CONTENT ENHANCEMENTS
// ============================================

// Phase 1-10: Infinite Scroll Optimization
export interface InfiniteScrollConfig {
    threshold: number;
    rootMargin: string;
    debounceMs: number;
}

export function useOptimizedInfiniteScroll(
    loadMore: () => Promise<void>,
    hasMore: boolean,
    config: InfiniteScrollConfig = { threshold: 0.5, rootMargin: '100px', debounceMs: 200 }
) {
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadingRef = useRef(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    const targetRef = useCallback((node: HTMLElement | null) => {
        if (observerRef.current) observerRef.current.disconnect();

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(async () => {
                        loadingRef.current = true;
                        await loadMore();
                        loadingRef.current = false;
                    }, config.debounceMs);
                }
            },
            { threshold: config.threshold, rootMargin: config.rootMargin }
        );

        if (node) observerRef.current.observe(node);
    }, [loadMore, hasMore, config]);

    useEffect(() => {
        return () => {
            if (observerRef.current) observerRef.current.disconnect();
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    return targetRef;
}

// Phase 11-20: Enhanced Post Card with Visual Hierarchy
interface EnhancedPostCardProps {
    post: {
        id: string;
        author: { displayName: string; avatarUrl?: string; isVerified?: boolean };
        content: string;
        mediaUrl?: string;
        mediaType?: string;
        likes: number;
        commentsCount: number;
        createdAt: string;
    };
    onLike: () => void;
    onComment: () => void;
    onShare: () => void;
    priority?: 'high' | 'medium' | 'low';
}

export const EnhancedPostCard = memo(function EnhancedPostCard({
    post,
    onLike,
    onComment,
    onShare,
    priority = 'medium'
}: EnhancedPostCardProps) {
    const priorityStyles = {
        high: 'border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/5 to-transparent',
        medium: 'border-white/5 bg-white/[0.02]',
        low: 'border-white/5 bg-transparent'
    };

    return (
        <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border overflow-hidden transition-all ${priorityStyles[priority]}`}
            whileHover={{ scale: 1.005 }}
        >
            {/* Content */}
            <div className="p-4">{post.content}</div>
        </motion.article>
    );
});

// Phase 21-30: Advanced Video Player
interface AdvancedVideoPlayerProps {
    src: string;
    poster?: string;
    autoPlay?: boolean;
    loop?: boolean;
    onProgress?: (progress: number) => void;
    onComplete?: () => void;
}

export function AdvancedVideoPlayer({
    src,
    poster,
    autoPlay = true,
    loop = true,
    onProgress,
    onComplete
}: AdvancedVideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [isMuted, setIsMuted] = useState(true);
    const [progress, setProgress] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [showCaptions, setShowCaptions] = useState(false);
    const [isPiP, setIsPiP] = useState(false);
    const [buffered, setBuffered] = useState(0);

    const togglePlay = useCallback(() => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    }, [isPlaying]);

    const toggleMute = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    }, [isMuted]);

    const togglePiP = useCallback(async () => {
        if (!document.pictureInPictureEnabled) return;
        try {
            if (isPiP) {
                await document.exitPictureInPicture();
            } else if (videoRef.current) {
                await videoRef.current.requestPictureInPicture();
            }
            setIsPiP(!isPiP);
        } catch (err) {
            console.error('PiP error:', err);
        }
    }, [isPiP]);

    const handleTimeUpdate = useCallback(() => {
        if (videoRef.current) {
            const prog = (videoRef.current.currentTime / videoRef.current.duration) * 100;
            setProgress(prog);
            onProgress?.(prog);
        }
    }, [onProgress]);

    const handleProgress = useCallback(() => {
        if (videoRef.current && videoRef.current.buffered && videoRef.current.buffered.length > 0) {
            const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
            const duration = videoRef.current.duration;
            if (duration > 0) {
                setBuffered((bufferedEnd / duration) * 100);
            }
        }
    }, []);

    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

    return (
        <div className="relative aspect-video bg-black rounded-xl overflow-hidden group">
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                autoPlay={autoPlay}
                loop={loop}
                muted={isMuted}
                playsInline
                onTimeUpdate={handleTimeUpdate}
                onProgress={handleProgress}
                onEnded={onComplete}
                className="w-full h-full object-contain"
            />

            {/* Controls Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Progress Bar */}
                <div className="absolute bottom-16 left-4 right-4">
                    <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                        <div className="absolute h-full bg-white/30" style={{ width: `${buffered}%` }} />
                        <div className="relative h-full bg-[#D4AF37]" style={{ width: `${progress}%` }} />
                    </div>
                </div>

                {/* Bottom Controls */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            {isPlaying ? '⏸' : '▶️'}
                        </button>
                        <button onClick={toggleMute} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            {isMuted ? '🔇' : '🔊'}
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={playbackSpeed}
                            onChange={(e) => {
                                const speed = Number(e.target.value);
                                setPlaybackSpeed(speed);
                                if (videoRef.current) videoRef.current.playbackRate = speed;
                            }}
                            className="bg-white/20 text-white text-xs px-2 py-1 rounded"
                        >
                            {speeds.map(s => (
                                <option key={s} value={s}>{s}x</option>
                            ))}
                        </select>
                        <button onClick={() => setShowCaptions(!showCaptions)} className="w-8 h-8 rounded bg-white/20 flex items-center justify-center text-xs">
                            CC
                        </button>
                        {document.pictureInPictureEnabled && (
                            <button onClick={togglePiP} className="w-8 h-8 rounded bg-white/20 flex items-center justify-center text-xs">
                                PiP
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Captions */}
            {showCaptions && (
                <div className="absolute bottom-20 left-4 right-4 text-center">
                    <span className="bg-black/80 text-white px-3 py-1 rounded text-sm">
                        [Captions placeholder]
                    </span>
                </div>
            )}
        </div>
    );
}

// Phase 31-40: Image Viewer Improvements
export function useImageZoom(initialScale = 1) {
    const [scale, setScale] = useState(initialScale);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const startPos = useRef({ x: 0, y: 0 });

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale(prev => Math.min(Math.max(prev + delta, 0.5), 4));
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        setIsDragging(true);
        startPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }, [position]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({ x: e.clientX - startPos.current.x, y: e.clientY - startPos.current.y });
    }, [isDragging]);

    const handleMouseUp = useCallback(() => setIsDragging(false), []);

    const reset = useCallback(() => {
        setScale(initialScale);
        setPosition({ x: 0, y: 0 });
    }, [initialScale]);

    return { scale, position, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, reset, isDragging };
}

// Phase 41-50: Comment Threading
export interface Comment {
    id: string;
    author: { id: string; displayName: string; avatarUrl?: string };
    content: string;
    createdAt: string;
    likes: number;
    isLiked: boolean;
    replies: Comment[];
    depth: number;
}

interface CommentThreadProps {
    comment: Comment;
    maxDepth?: number;
    onReply: (commentId: string) => void;
    onLike: (commentId: string) => void;
}

export const CommentThread = memo(function CommentThread({
    comment,
    maxDepth = 4,
    onReply,
    onLike
}: CommentThreadProps) {
    const [showReplies, setShowReplies] = useState(comment.depth < 2);
    const canNest = comment.depth < maxDepth;

    return (
        <div className="relative" style={{ marginLeft: comment.depth > 0 ? '24px' : 0 }}>
            {comment.depth > 0 && (
                <div className="absolute left-[-12px] top-0 bottom-0 w-px bg-white/10" />
            )}
            <div className="flex gap-3 py-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8942D] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-white text-sm">{comment.author.displayName}</span>
                        <span className="text-white/40 text-xs">{comment.createdAt}</span>
                    </div>
                    <p className="text-white/80 text-sm mt-1">{comment.content}</p>
                    <div className="flex items-center gap-4 mt-2">
                        <button onClick={() => onLike(comment.id)} className="text-xs text-white/50 hover:text-white">
                            ❤️ {comment.likes}
                        </button>
                        {canNest && (
                            <button onClick={() => onReply(comment.id)} className="text-xs text-white/50 hover:text-white">
                                Reply
                            </button>
                        )}
                    </div>
                </div>
            </div>
            {comment.replies.length > 0 && (
                <>
                    {!showReplies ? (
                        <button onClick={() => setShowReplies(true)} className="text-xs text-[#D4AF37] ml-11 py-1">
                            View {comment.replies.length} replies
                        </button>
                    ) : (
                        <div>
                            {comment.replies.map(reply => (
                                <CommentThread key={reply.id} comment={reply} maxDepth={maxDepth} onReply={onReply} onLike={onLike} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
});

// Phase 51-60: Reaction System Expansion
export const EXPANDED_REACTIONS = [
    { id: 'like', emoji: '❤️', label: 'Like', color: '#FF4757' },
    { id: 'love', emoji: '😍', label: 'Love', color: '#FF6B9D' },
    { id: 'haha', emoji: '😂', label: 'Haha', color: '#FFD93D' },
    { id: 'wow', emoji: '😮', label: 'Wow', color: '#FFB142' },
    { id: 'sad', emoji: '😢', label: 'Sad', color: '#6C96EC' },
    { id: 'angry', emoji: '😠', label: 'Angry', color: '#FF6348' },
    { id: 'fire', emoji: '🔥', label: 'Fire', color: '#FF7F50' },
    { id: 'clap', emoji: '👏', label: 'Clap', color: '#F8B739' },
    { id: 'think', emoji: '🤔', label: 'Thinking', color: '#B8860B' },
    { id: 'hundred', emoji: '💯', label: '100', color: '#FF4500' },
] as const;

interface ExpandedReactionPickerProps {
    onSelect: (reactionId: string) => void;
    currentReaction?: string;
}

export function ExpandedReactionPicker({ onSelect, currentReaction }: ExpandedReactionPickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
                className="text-white/60 hover:text-white transition-colors"
            >
                {currentReaction ? EXPANDED_REACTIONS.find(r => r.id === currentReaction)?.emoji || '❤️' : '🤍'}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        onMouseEnter={() => setIsOpen(true)}
                        onMouseLeave={() => setIsOpen(false)}
                        className="absolute bottom-full left-0 mb-2 flex gap-1 bg-[#1A1A1F] border border-white/10 rounded-full px-2 py-1 shadow-xl"
                    >
                        {EXPANDED_REACTIONS.map((reaction) => (
                            <motion.button
                                key={reaction.id}
                                onClick={() => { onSelect(reaction.id); setIsOpen(false); }}
                                whileHover={{ scale: 1.3 }}
                                whileTap={{ scale: 0.9 }}
                                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/10 rounded-full"
                                title={reaction.label}
                            >
                                {reaction.emoji}
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Phase 61-70: Content Filtering
export interface ContentFilter {
    id: string;
    label: string;
    isActive: boolean;
}

export function useContentFilters() {
    const [filters, setFilters] = useState<ContentFilter[]>([
        { id: 'sensitive', label: 'Hide Sensitive Content', isActive: true },
        { id: 'spoilers', label: 'Hide Spoilers', isActive: true },
        { id: 'profanity', label: 'Filter Profanity', isActive: false },
        { id: 'political', label: 'Reduce Political Content', isActive: false },
    ]);

    const [mutedWords, setMutedWords] = useState<string[]>([]);
    const [mutedUsers, setMutedUsers] = useState<string[]>([]);

    const toggleFilter = useCallback((filterId: string) => {
        setFilters(prev => prev.map(f => f.id === filterId ? { ...f, isActive: !f.isActive } : f));
    }, []);

    const addMutedWord = useCallback((word: string) => {
        setMutedWords(prev => {
            const wordLower = word.toLowerCase();
            if (prev.includes(wordLower)) return prev;
            return [...prev, wordLower];
        });
    }, []);

    const removeMutedWord = useCallback((word: string) => {
        setMutedWords(prev => prev.filter(w => w !== word));
    }, []);

    const shouldFilter = useCallback((content: string, authorId: string) => {
        if (mutedUsers.includes(authorId)) return true;
        const lowerContent = content.toLowerCase();
        return mutedWords.some(word => lowerContent.includes(word));
    }, [mutedWords, mutedUsers]);

    return { filters, toggleFilter, mutedWords, addMutedWord, removeMutedWord, mutedUsers, setMutedUsers, shouldFilter };
}

// Phase 71-80: Post Scheduling
export interface ScheduledPost {
    id: string;
    content: string;
    mediaUrl?: string;
    scheduledFor: Date;
    status: 'pending' | 'published' | 'failed';
}

export function usePostScheduler() {
    const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>(() => {
        if (typeof window === 'undefined') return [];
        const saved = localStorage.getItem('0g_scheduled_posts');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('0g_scheduled_posts', JSON.stringify(scheduledPosts));
        }
    }, [scheduledPosts]);

    const schedulePost = useCallback((content: string, scheduledFor: Date, mediaUrl?: string) => {
        const newPost: ScheduledPost = {
            id: crypto.randomUUID(),
            content,
            mediaUrl,
            scheduledFor,
            status: 'pending',
        };
        setScheduledPosts(prev => [...prev, newPost]);
        return newPost.id;
    }, []);

    const cancelScheduledPost = useCallback((postId: string) => {
        setScheduledPosts(prev => prev.filter(p => p.id !== postId));
    }, []);

    const getUpcomingPosts = useCallback(() => {
        return scheduledPosts.filter(p => p.status === 'pending').sort((a, b) =>
            new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
        );
    }, [scheduledPosts]);

    return { scheduledPosts, schedulePost, cancelScheduledPost, getUpcomingPosts };
}

// Phase 81-90: Media Upload Optimization
export function useMediaUploadOptimizer() {
    const [uploadQueue, setUploadQueue] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState<Record<string, number>>({});

    const compressImage = useCallback(async (file: File, maxWidth = 1920, quality = 0.85): Promise<Blob> => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            const img = new Image();
            img.onload = () => {
                const ratio = Math.min(maxWidth / img.width, 1);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(blob => resolve(blob!), 'image/jpeg', quality);
            };
            img.src = URL.createObjectURL(file);
        });
    }, []);

    const addToQueue = useCallback((files: File[]) => {
        setUploadQueue(prev => [...prev, ...files]);
    }, []);

    const clearQueue = useCallback(() => {
        setUploadQueue([]);
        setProgress({});
    }, []);

    return { uploadQueue, uploading, progress, compressImage, addToQueue, clearQueue };
}

// Phase 91-100: Feed Algorithm & Discovery
export interface FeedPreferences {
    showRecommended: boolean;
    prioritizeFollowing: boolean;
    includeSponsored: boolean;
    contentTypes: ('image' | 'video' | 'text' | 'poll')[];
    minEngagement: number;
}

export function useFeedAlgorithm() {
    const [preferences, setPreferences] = useState<FeedPreferences>(() => {
        if (typeof window === 'undefined') return getDefaultPreferences();
        const saved = localStorage.getItem('0g_feed_prefs');
        return saved ? JSON.parse(saved) : getDefaultPreferences();
    });

    function getDefaultPreferences(): FeedPreferences {
        return {
            showRecommended: true,
            prioritizeFollowing: true,
            includeSponsored: false,
            contentTypes: ['image', 'video', 'text', 'poll'],
            minEngagement: 0,
        };
    }

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('0g_feed_prefs', JSON.stringify(preferences));
        }
    }, [preferences]);

    const updatePreference = useCallback(<K extends keyof FeedPreferences>(
        key: K,
        value: FeedPreferences[K]
    ) => {
        setPreferences(prev => ({ ...prev, [key]: value }));
    }, []);

    const resetToDefault = useCallback(() => {
        setPreferences(getDefaultPreferences());
    }, []);

    return { preferences, updatePreference, resetToDefault };
}
