'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useAudioFocus } from '@/contexts/AudioFocusContext';
import { Post } from '@/hooks/usePosts';
import { PostActions } from '@/components/PostActions';
import {
    HeartIcon,
    MessageIcon,
    ShareIcon,
    RefreshIcon,
    CheckCircleIcon,
    HandIcon,
    TrashIcon,
    PlayIcon,
    MoreHorizontalIcon
} from '@/components/icons';

// ============================================
// YOUTUBE HELPERS
// ============================================
export function isYouTubeUrl(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtube-nocookie.com') || url.includes('youtu.be');
}

export function isKickUrl(url: string): boolean {
    return url.includes('kick.com');
}

export function getYouTubeEmbedUrl(url: string): string {
    if (url.includes('/embed/')) {
        if (!url.includes('modestbranding')) {
            return url + (url.includes('?') ? '&' : '?') + 'modestbranding=1&rel=0&showinfo=0&autoplay=1&mute=1';
        }
        return url.replace('autoplay=0', 'autoplay=1') + '&mute=1';
    }
    let videoId = '';
    if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
    } else if (url.includes('/shorts/')) {
        videoId = url.split('/shorts/')[1]?.split('?')[0] || '';
    } else if (url.includes('watch?v=')) {
        videoId = url.split('watch?v=')[1]?.split('&')[0] || '';
    }
    if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0&showinfo=0&autoplay=1&mute=1&controls=1`;
    }
    return url;
}

export function getKickEmbedUrl(url: string): string {
    // kick.com/username/video/uuid
    // kick.com/username
    if (url.includes('kick.com/')) {
        const parts = url.split('kick.com/')[1].split('/');
        const username = parts[0];

        // Live channel embed
        if (parts.length === 1 || (parts.length > 0 && !parts.includes('video'))) {
            return `https://player.kick.com/${username}?autoplay=true&muted=true`;
        }

        // VOD embed not officially supported purely via ID in simplified player, 
        // but often player.kick.com works for clips if structured right.
        // For now, default to channel player for live discovery.
        return `https://player.kick.com/${username}?autoplay=true&muted=true`;
    }
    return url;
}

export function KickEmbed({ src }: { src: string }) {
    const embedUrl = getKickEmbedUrl(src);
    return (
        <div className="relative w-full aspect-video bg-black">
            <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                frameBorder="0"
                title="Kick Video"
                scrolling="no"
            />
        </div>
    );
}



export function YouTubeEmbed({ src }: { src: string }) {
    const embedUrl = getYouTubeEmbedUrl(src);
    return (
        <div className="relative w-full aspect-video bg-black">
            <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                frameBorder="0"
                title="Video"
            />
        </div>
    );
}

// ============================================
// AUTOPLAY VIDEO — Single-play + always-visible controls
// Only the topmost visible video plays. All others are paused.
// Mute & pause buttons are always visible at top-right (no hover required).
// ============================================
interface AutoPlayVideoProps {
    src: string;
    postId?: string;
    className?: string;
    aspectRatio?: string;
    cropY?: number;
}

export function AutoPlayVideo({ src, postId, className = '', aspectRatio, cropY }: AutoPlayVideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [userPaused, setUserPaused] = useState(false); // User manually paused
    const audioFocus = useAudioFocus();
    const videoId = postId || src;

    const cssAspectRatio = aspectRatio ? {
        '16:9': '16/9', '4:3': '4/3', '1:1': '1/1', '4:5': '4/5',
    }[aspectRatio] : undefined;
    const useCrop = !!cssAspectRatio;

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                        // Register with audio focus — only the focus owner actually plays
                        const getsAudio = audioFocus.registerVisible(videoId, video);

                        if (getsAudio && !userPaused) {
                            // This is the focused video — play with audio
                            video.muted = false;
                            setIsMuted(false);
                            video.play()
                                .then(() => setIsPlaying(true))
                                .catch(() => {
                                    video.muted = true;
                                    setIsMuted(true);
                                    video.play().then(() => setIsPlaying(true)).catch(() => {});
                                });
                        } else {
                            // NOT the focused video — stay paused and muted
                            video.muted = true;
                            setIsMuted(true);
                            video.pause();
                            setIsPlaying(false);
                        }
                    } else {
                        // Scrolled out of view — always pause and unregister
                        video.pause();
                        setIsPlaying(false);
                        setUserPaused(false); // Reset manual pause when scrolled away
                        audioFocus.unregisterVisible(videoId);
                    }
                });
            },
            { threshold: 0.5 }
        );

        observer.observe(video);
        return () => {
            observer.disconnect();
            audioFocus.unregisterVisible(videoId);
        };
    }, [videoId, audioFocus, userPaused]);

    // When audio focus changes, sync this video's play/pause state
    useEffect(() => {
        const video = videoRef.current;
        if (!video || userPaused) return;

        const interval = setInterval(() => {
            const hasFocusNow = audioFocus.hasFocus(videoId);
            if (hasFocusNow && video.paused && !userPaused) {
                // We gained focus — start playing
                video.muted = false;
                setIsMuted(false);
                video.play().then(() => setIsPlaying(true)).catch(() => {
                    video.muted = true;
                    setIsMuted(true);
                    video.play().then(() => setIsPlaying(true)).catch(() => {});
                });
            } else if (!hasFocusNow && !video.paused) {
                // We lost focus — pause
                video.pause();
                video.muted = true;
                setIsMuted(true);
                setIsPlaying(false);
            }
        }, 300);

        return () => clearInterval(interval);
    }, [audioFocus, videoId, userPaused]);

    const togglePlayPause = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            video.pause();
            setIsPlaying(false);
            setUserPaused(true);
        } else {
            setUserPaused(false);
            // Claim focus so this becomes the active video
            audioFocus.claimFocus(videoId);
            video.muted = false;
            setIsMuted(false);
            video.play().then(() => setIsPlaying(true)).catch(() => {
                video.muted = true;
                setIsMuted(true);
                video.play().then(() => setIsPlaying(true)).catch(() => {});
            });
        }
    }, [isPlaying, audioFocus, videoId]);

    const toggleMute = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const video = videoRef.current;
        if (!video) return;

        if (isMuted) {
            audioFocus.claimFocus(videoId);
            video.muted = false;
            setIsMuted(false);
            // If paused, also start playing
            if (!isPlaying) {
                setUserPaused(false);
                video.play().then(() => setIsPlaying(true)).catch(() => {});
            }
        } else {
            audioFocus.releaseFocus(videoId);
            video.muted = true;
            setIsMuted(true);
        }
    }, [isMuted, isPlaying, audioFocus, videoId]);

    return (
        <div
            className="relative"
            style={cssAspectRatio ? { aspectRatio: cssAspectRatio } : undefined}
        >
            <video
                ref={videoRef}
                src={src}
                className={`w-full h-full ${useCrop ? 'object-cover' : 'object-contain max-h-[500px]'} bg-black ${className}`}
                style={useCrop && cropY != null ? { objectPosition: `center ${cropY}%` } : undefined}
                loop
                playsInline
                muted={isMuted}
            />

            {/* ── Always-visible control buttons ── top-right corner ── */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                {/* Play / Pause */}
                <button
                    onClick={togglePlayPause}
                    className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors active:scale-90"
                    title={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    )}
                </button>

                {/* Mute / Unmute */}
                <button
                    onClick={toggleMute}
                    className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors active:scale-90"
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <line x1="23" y1="9" x2="17" y2="15" />
                            <line x1="17" y1="9" x2="23" y2="15" />
                        </svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Paused overlay — visual indicator when manually paused */}
            {!isPlaying && (
                <div
                    className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer"
                    onClick={togglePlayPause}
                >
                    <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// DOUBLE-TAP HEART
// ============================================
export function DoubleTapHeart({
    children,
    onDoubleTap,
    className = ''
}: {
    children: React.ReactNode;
    onDoubleTap: () => void;
    className?: string;
}) {
    const [showHeart, setShowHeart] = useState(false);
    const lastTapRef = useRef<number>(0);

    const handleTap = useCallback(() => {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
            onDoubleTap();
            setShowHeart(true);
            setTimeout(() => setShowHeart(false), 1200);
        }
        lastTapRef.current = now;
    }, [onDoubleTap]);

    return (
        <div className={`relative ${className}`} onClick={handleTap}>
            {children}
            <AnimatePresence>
                {showHeart && (
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: [0, 1.4, 1], rotate: [-20, 10, 0] }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="relative"
                        >
                            <HeartIcon size={120} className="text-rose-500 fill-rose-500 drop-shadow-[0_0_50px_rgba(244,63,94,0.6)]" />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// POST SKELETON
// ============================================
export function PostSkeleton() {
    return (
        <div className="bg-gradient-to-b from-white/[0.04] to-white/[0.01] rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="p-4 pb-2">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/[0.06] animate-pulse" />
                    <div className="flex-1">
                        <div className="h-4 w-32 bg-white/[0.06] rounded-lg mb-2 animate-pulse" />
                        <div className="h-3 w-48 bg-white/[0.04] rounded-lg animate-pulse" />
                    </div>
                </div>
            </div>
            <div className="aspect-[4/3] bg-gradient-to-br from-white/[0.04] to-white/[0.02] animate-pulse" />
            <div className="px-4 py-3 border-t border-white/[0.04]">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-6 rounded-lg bg-white/[0.04] animate-pulse" />
                    <div className="w-16 h-6 rounded-lg bg-white/[0.04] animate-pulse" />
                    <div className="w-16 h-6 rounded-lg bg-white/[0.04] animate-pulse" />
                </div>
            </div>
        </div>
    );
}

// ============================================
// FEED POST COMPONENT
// ============================================
interface ColorPalette {
    dominant: string;
    muted: string;
    vibrant: string;
}

interface FeedPostProps {
    post: Post;
    likePost: (id: string) => void;
    toggleRsvp: (id: string) => void;
    deletePost: (id: string) => Promise<{ success: boolean; error?: string }>;
    pinPost?: (id: string) => void;
    zenMode?: boolean;
    colorPalette?: ColorPalette;
}

export function FeedPost({ post, likePost, toggleRsvp, deletePost, pinPost, zenMode = false, colorPalette }: FeedPostProps) {
    const { user, isAdmin } = useAuth();
    const router = useRouter();

    // Adaptive sizing based on post type
    const isVideoPost = post.type === 'VIDEO' || post.mediaType === 'VIDEO';
    const isImagePost = post.type === 'IMAGE' || (post.mediaUrl && !isVideoPost);
    const isTextOnly = !post.mediaUrl;

    // Resolve display aspect ratio for consistent feed layout
    const resolvedRatio = post.mediaAspectRatio || (isVideoPost ? '16:9' : undefined);
    const ratioMap: Record<string, string> = { '16:9': '16/9', '4:3': '4/3', '1:1': '1/1', '4:5': '4/5' };
    const feedAspectCSS = resolvedRatio ? ratioMap[resolvedRatio] : undefined;
    const useFeedCrop = !!feedAspectCSS;
    const feedCropY = post.mediaCropY ?? 50;

    // Content-aware tinting via colorPalette
    const tintStyle = colorPalette ? {
        background: `linear-gradient(to bottom, ${colorPalette.dominant}08, ${colorPalette.muted}04)`,
    } : undefined;

    return (
        <motion.div
            layoutId={`post-${post.id}`}
            className="bg-gradient-to-b from-white/[0.04] to-white/[0.01] rounded-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-sm overflow-hidden mb-6 transition-all duration-300 hover:border-[#00D4FF]/20 hover:shadow-[0_8px_32px_rgba(0,212,255,0.08)] hover:from-white/[0.06] hover:to-white/[0.02] group"
            style={tintStyle}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        >
            {/* Header */}
            <div className="p-4 pb-2">
                <div className="flex items-start gap-3">
                    {post.author.avatarUrl ? (
                        <Image
                            src={post.author.avatarUrl}
                            alt={post.author.displayName}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0 cursor-pointer ring-2 ring-white/10 hover:ring-[#00D4FF]/40 transition-all duration-300"
                            onClick={() => router.push(`/profile/${post.author.username}`)}
                        />
                    ) : (
                        <div
                            className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D4FF] via-[#7C3AED] to-[#F472B6] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 cursor-pointer ring-2 ring-white/10 hover:ring-[#00D4FF]/40 transition-all duration-300"
                            onClick={() => router.push(`/profile/${post.author.username}`)}
                        >
                            {post.author.displayName?.[0] || 'U'}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span
                                className="font-bold text-white text-sm cursor-pointer hover:underline"
                                onClick={() => router.push(`/profile/${post.author.username}`)}
                            >
                                {post.author.displayName}
                            </span>
                            <span
                                className="text-white/40 text-xs cursor-pointer hover:text-[#00D4FF] hover:underline transition-colors"
                                onClick={() => router.push(`/profile/${post.author.username}`)}
                            >@{post.author.username}</span>
                            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#00D4FF]/20 to-[#7C3AED]/20 text-[#00D4FF] text-[10px] font-medium flex-shrink-0 border border-[#00D4FF]/10">
                                {post.type === 'RALLY' ? 'Rally' : 'Public'}
                            </span>
                            <span className="text-white/30 text-xs flex-shrink-0">• {new Date(post.createdAt).toLocaleDateString()}</span>
                            {post.isPinned && (
                                <span className="px-2 py-0.5 rounded-full bg-[#00D4FF]/10 text-[#00D4FF] text-[10px] font-medium flex-shrink-0 border border-[#00D4FF]/20 flex items-center gap-1">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
                                    Pinned
                                </span>
                            )}
                        </div>
                        {post.content && (
                            <p className="text-white/70 text-sm mt-1 line-clamp-3">{post.content}</p>
                        )}
                    </div>
                    <div className="relative flex-shrink-0">
                        <PostActions
                            postId={post.id}
                            isOwner={post.author.id === user?.id}
                            isPinned={post.isPinned}
                            onDelete={() => deletePost(post.id)}
                            onPin={pinPost ? () => pinPost(post.id) : undefined}
                            postContent={post.content}
                            authorName={post.author.displayName}
                            mediaUrl={post.mediaUrl}
                            thumbnailUrl={post.mediaUrl}
                            postType={post.type}
                        />
                    </div>
                </div>
            </div>

            {/* Media - Consistent aspect-ratio containers */}
            {post.mediaUrl && (
                <DoubleTapHeart onDoubleTap={() => !post.isLiked && likePost(post.id)}>
                    <div
                        className="relative w-full bg-black/30 overflow-hidden cursor-pointer"
                        style={feedAspectCSS ? { aspectRatio: feedAspectCSS } : undefined}
                        onClick={() => router.push(`/post/${post.id}`)}
                    >
                        {isYouTubeUrl(post.mediaUrl) ? (
                            <YouTubeEmbed src={post.mediaUrl} />
                        ) : isKickUrl(post.mediaUrl) ? (
                            <KickEmbed src={post.mediaUrl} />
                        ) : isVideoPost ? (
                            <AutoPlayVideo
                                src={post.mediaUrl}
                                postId={post.id}
                                aspectRatio={resolvedRatio}
                                cropY={post.mediaCropY ?? undefined}
                            />
                        ) : (
                            <Image
                                src={post.mediaUrl}
                                alt="Post media"
                                width={800}
                                height={600}
                                className={`w-full ${useFeedCrop ? 'h-full object-cover' : 'h-auto max-h-[500px] object-contain'}`}
                                style={useFeedCrop ? { objectPosition: `center ${feedCropY}%` } : undefined}
                                loading="lazy"
                                placeholder="blur"
                                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMGEwYTBmIi8+PC9zdmc+"
                                sizes="(max-width: 768px) 100vw, 800px"
                            />
                        )}
                    </div>
                </DoubleTapHeart>
            )}

            {!post.mediaUrl && (
                <div
                    className="px-6 py-8 flex items-center justify-center min-h-[140px] bg-gradient-to-br from-[#00D4FF]/[0.06] via-transparent to-[#8B5CF6]/[0.06] cursor-pointer relative overflow-hidden"
                    onClick={() => router.push(`/post/${post.id}`)}
                >
                    <div className="absolute inset-0 opacity-30">
                        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 rounded-full bg-[#00D4FF]/10 blur-[60px]" />
                        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 rounded-full bg-[#8B5CF6]/10 blur-[60px]" />
                    </div>
                    <div className="text-center text-white/20">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                        </svg>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="px-4 py-3 border-t border-white/[0.04] bg-white/[0.01]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => likePost(post.id)}
                            className={`flex items-center gap-2 transition-all group min-h-[44px] px-1 active:scale-90 ${post.isLiked ? 'text-rose-500' : 'text-white/60 hover:text-rose-400'}`}
                        >
                            <div className="relative">
                                <HeartIcon size={22} className={`transition-all duration-300 group-hover:scale-125 ${post.isLiked ? 'fill-rose-500 scale-110 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]' : ''}`} />
                            </div>
                            <span className={`text-sm font-medium transition-opacity ${zenMode ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                                {post.likes || 0}
                            </span>
                        </button>

                        <button
                            onClick={() => router.push(`/post/${post.id}`)}
                            className="flex items-center gap-2 text-white/60 hover:text-[#00D4FF] transition-all group min-h-[44px] px-1 active:scale-90"
                        >
                            <MessageIcon size={24} className="transition-transform duration-300 group-hover:scale-110" />
                            <span className={`text-sm font-medium transition-opacity ${zenMode ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                                {post.commentsCount || 0}
                            </span>
                        </button>

                        {post.type === 'RALLY' && (
                            <button
                                onClick={() => toggleRsvp(post.id)}
                                className={`flex items-center gap-2 transition-all group ${post.isRsvped ? 'text-emerald-500' : 'text-white/60 hover:text-emerald-400'}`}
                            >
                                <CheckCircleIcon size={24} className={`transition-transform duration-300 group-hover:scale-110 ${post.isRsvped ? 'fill-emerald-500/20' : ''}`} />
                                <span className="text-sm font-medium">{post.isRsvped ? "I'm In!" : "Join Rally"}</span>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                const url = `${window.location.origin}/post/${post.id}`;
                                if (navigator.share) {
                                    navigator.share({ title: 'Check out this post on 0G', url });
                                } else {
                                    navigator.clipboard.writeText(url);
                                    // Could show toast here
                                }
                            }}
                            className="text-white/40 hover:text-[#00D4FF] transition-all duration-300 hover:scale-110 hover:drop-shadow-[0_0_8px_rgba(0,212,255,0.3)] min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-90"
                        >
                            <ShareIcon size={24} />
                        </button>

                        <button
                            onClick={() => router.push(`/create?repost=${post.id}`)}
                            className="text-white/40 hover:text-green-400 transition-all duration-300 hover:scale-110 hover:drop-shadow-[0_0_8px_rgba(0,212,255,0.3)]"
                        >
                            <RefreshIcon size={22} className="rotate-90" />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
