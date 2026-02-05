'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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
// AUTOPLAY VIDEO
// ============================================
export function AutoPlayVideo({ src, className = '' }: { src: string; className?: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                        video.muted = false;
                        video.play()
                            .then(() => {
                                setIsMuted(false);
                                setIsPlaying(true);
                            })
                            .catch(() => {
                                video.muted = true;
                                setIsMuted(true);
                                video.play().then(() => setIsPlaying(true)).catch(() => { });
                            });
                    } else {
                        video.pause();
                        setIsPlaying(false);
                    }
                });
            },
            { threshold: 0.5 }
        );

        observer.observe(video);
        return () => observer.disconnect();
    }, []);

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(!isMuted);
        }
    };

    return (
        <div
            className="relative group"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            <video
                ref={videoRef}
                src={src}
                className={`w-full max-h-[600px] object-contain bg-black ${className}`}
                loop
                playsInline
                muted={isMuted}
            />
            {showControls && (
                <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm z-20">
                    <button onClick={toggleMute} className="text-white hover:text-[#00D4FF]">
                        <span className="text-lg">{isMuted ? '🔇' : '🔊'}</span>
                    </button>
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
        <div className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden animate-pulse">
            <div className="p-4 pb-2">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10" />
                    <div className="flex-1">
                        <div className="h-4 w-32 bg-white/10 rounded mb-2" />
                        <div className="h-3 w-48 bg-white/5 rounded" />
                    </div>
                </div>
            </div>
            <div className="aspect-[4/3] bg-white/5" />
            <div className="p-4 border-t border-white/5">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/10" />
                    <div className="w-8 h-8 rounded-full bg-white/10" />
                </div>
            </div>
        </div>
    );
}

// ============================================
// FEED POST COMPONENT
// ============================================
interface FeedPostProps {
    post: Post;
    likePost: (id: string) => void;
    toggleRsvp: (id: string) => void;
    deletePost: (id: string) => Promise<{ success: boolean; error?: string }>;
    zenMode?: boolean;
}

export function FeedPost({ post, likePost, toggleRsvp, deletePost, zenMode = false }: FeedPostProps) {
    const { user, isAdmin } = useAuth();
    const router = useRouter();

    return (
        <div className="bg-white/[0.02] rounded-2xl border border-white/10 shadow-lg shadow-black/20 overflow-hidden mb-6 transition-all duration-200 hover:border-[#00D4FF]/30 hover:shadow-[#00D4FF]/10 group">
            {/* Header */}
            <div className="p-4 pb-2">
                <div className="flex items-start gap-3">
                    {post.author.avatarUrl ? (
                        <img
                            src={post.author.avatarUrl}
                            alt={post.author.displayName}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0 cursor-pointer"
                            onClick={() => router.push(`/profile/${post.author.username}`)}
                        />
                    ) : (
                        <div
                            className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold text-sm flex-shrink-0 cursor-pointer"
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
                            <span className="text-white/40 text-xs">@{post.author.username}</span>
                            <span className="px-2 py-0.5 rounded-full bg-[#00D4FF]/20 text-[#00D4FF] text-[10px] flex-shrink-0">
                                {post.type === 'RALLY' ? '📅 Rally' : '🌍 Public'}
                            </span>
                            <span className="text-white/30 text-xs flex-shrink-0">• {new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                        {post.content && (
                            <p className="text-white/70 text-sm mt-1 line-clamp-3">{post.content}</p>
                        )}
                    </div>
                    <div className="relative flex-shrink-0">
                        <PostActions
                            postId={post.id}
                            isOwner={post.author.id === user?.id}
                            onDelete={() => deletePost(post.id)}
                            postContent={post.content}
                            authorName={post.author.displayName}
                            mediaUrl={post.mediaUrl}
                            thumbnailUrl={post.mediaUrl}
                            postType={post.type}
                        />
                    </div>
                </div>
            </div>

            {/* Media */}
            {post.mediaUrl && (
                <DoubleTapHeart onDoubleTap={() => !post.isLiked && likePost(post.id)}>
                    <div className="relative w-full bg-black/30 overflow-hidden cursor-pointer" onClick={() => router.push(`/post/${post.id}`)}>
                        {isYouTubeUrl(post.mediaUrl) ? (
                            <YouTubeEmbed src={post.mediaUrl} />
                        ) : isKickUrl(post.mediaUrl) ? (
                            <KickEmbed src={post.mediaUrl} />
                        ) : post.mediaType === 'VIDEO' ? (
                            <div className="aspect-[4/3]">
                                <AutoPlayVideo src={post.mediaUrl} />
                            </div>
                        ) : (
                            <img
                                src={post.mediaUrl}
                                alt="Post media"
                                className="w-full h-auto max-h-[500px] object-contain"
                            />
                        )}
                    </div>
                </DoubleTapHeart>
            )}

            {!post.mediaUrl && (
                <div
                    className="px-4 py-6 flex items-center justify-center min-h-[120px] bg-gradient-to-br from-[#00D4FF]/5 to-[#8B5CF6]/5 cursor-pointer"
                    onClick={() => router.push(`/post/${post.id}`)}
                >
                    <div className="text-center">
                        <span className="text-4xl">{post.content?.length && post.content.length > 100 ? '📝' : '💭'}</span>
                        {post.type === 'RALLY' && <span className="text-4xl ml-2">📣</span>}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="p-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => likePost(post.id)}
                            className={`flex items-center gap-2 transition-all group ${post.isLiked ? 'text-rose-500' : 'text-white/60 hover:text-rose-400'}`}
                        >
                            <div className="relative">
                                <HeartIcon size={24} className={`transition-transform duration-300 group-hover:scale-110 ${post.isLiked ? 'fill-rose-500' : ''}`} />
                            </div>
                            <span className={`text-sm font-medium transition-opacity ${zenMode ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                                {post.likes || 0}
                            </span>
                        </button>

                        <button
                            onClick={() => router.push(`/post/${post.id}`)}
                            className="flex items-center gap-2 text-white/60 hover:text-[#00D4FF] transition-all group"
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
                            className="text-white/60 hover:text-[#00D4FF] transition-all hover:scale-110"
                        >
                            <ShareIcon size={24} />
                        </button>

                        <button
                            onClick={() => router.push(`/create?repost=${post.id}`)}
                            className="text-white/60 hover:text-green-400 transition-all hover:scale-110"
                        >
                            <RefreshIcon size={22} className="rotate-90" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
