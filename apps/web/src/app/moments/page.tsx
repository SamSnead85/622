'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
    HeartIcon,
    MessageIcon,
    ShareIcon,
    BookmarkIcon,
    MusicIcon,
    HomeIcon,
    SearchIcon,
    PlusIcon,
    UserIcon,
} from '@/components/icons';
import { API_URL } from '@/lib/api';

// ============================================
// TYPES
// ============================================
interface VideoPost {
    id: string;
    content: string;
    mediaUrl: string;
    mediaType: 'VIDEO' | 'IMAGE';
    likes: number;
    isLiked: boolean;
    isBookmarked?: boolean;
    commentsCount: number;
    views?: number;
    author: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
        isVerified?: boolean;
        isFollowing?: boolean;
    };
    sound?: {
        name: string;
        artist: string;
    };
    tags?: string[];
    location?: string;
}

// ============================================
// FLOATING PARTICLES BACKGROUND
// ============================================
function FloatingParticles() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {[...Array(20)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-[#00D4FF]/30 rounded-full"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                        y: [0, -100, 0],
                        opacity: [0, 0.6, 0],
                        scale: [0, 1.5, 0],
                    }}
                    transition={{
                        duration: 4 + Math.random() * 4,
                        repeat: Infinity,
                        delay: Math.random() * 4,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </div>
    );
}

// ============================================
// ANIMATED HEART EXPLOSION
// ============================================
function HeartExplosion({ show }: { show: boolean }) {
    if (!show) return null;

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            {/* Main heart */}
            <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: [0, 1.4, 1], rotate: [-20, 10, 0] }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="relative"
            >
                <span className="text-[120px] drop-shadow-[0_0_40px_rgba(255,0,100,0.8)]">❤️</span>
            </motion.div>

            {/* Particle burst */}
            {[...Array(12)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-3 h-3 rounded-full"
                    style={{
                        background: i % 2 === 0 ? '#FF0064' : '#00D4FF',
                    }}
                    initial={{ scale: 0, x: 0, y: 0 }}
                    animate={{
                        scale: [0, 1, 0],
                        x: Math.cos((i * 30 * Math.PI) / 180) * 120,
                        y: Math.sin((i * 30 * Math.PI) / 180) * 120,
                        opacity: [1, 1, 0],
                    }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                />
            ))}
        </div>
    );
}

// ============================================
// SOUND VISUALIZER
// ============================================
function SoundVisualizer({ isPlaying }: { isPlaying: boolean }) {
    return (
        <div className="flex items-center gap-0.5 h-4">
            {[...Array(5)].map((_, i) => (
                <motion.div
                    key={i}
                    className="w-0.5 bg-white rounded-full"
                    animate={isPlaying ? {
                        height: [4, 16, 8, 14, 4],
                    } : { height: 4 }}
                    transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </div>
    );
}

// ============================================
// PREMIUM ACTION BUTTON
// ============================================
function ActionButton({
    children,
    count,
    active,
    accentColor,
    onClick
}: {
    children: React.ReactNode;
    count?: number | string;
    active?: boolean;
    accentColor?: string;
    onClick?: () => void;
}) {
    return (
        <motion.button
            onClick={onClick}
            whileTap={{ scale: 0.9 }}
            className="flex flex-col items-center gap-1.5 group"
        >
            <motion.div
                className={`
                    relative w-14 h-14 rounded-2xl flex items-center justify-center
                    bg-black/30 backdrop-blur-xl border border-white/10
                    shadow-[0_8px_32px_rgba(0,0,0,0.4)]
                    group-hover:border-white/30 transition-all duration-300
                    ${active ? 'border-rose-500/50 shadow-[0_0_20px_rgba(255,0,100,0.3)]' : ''}
                `}
                style={active && accentColor ? {
                    boxShadow: `0 0 20px ${accentColor}40`,
                    borderColor: `${accentColor}80`,
                } : {}}
            >
                {/* Glow effect */}
                {active && (
                    <div
                        className="absolute inset-0 rounded-2xl opacity-30 blur-sm"
                        style={{ background: accentColor || '#FF0064' }}
                    />
                )}
                {children}
            </motion.div>
            {count !== undefined && (
                <span className="text-white text-xs font-semibold tracking-wide">
                    {typeof count === 'number' ? (count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count) : count}
                </span>
            )}
        </motion.button>
    );
}

// ============================================
// SPINNING SOUND DISC
// ============================================
function SpinningDisc({ avatarUrl, isPlaying }: { avatarUrl?: string; isPlaying: boolean }) {
    return (
        <motion.div
            animate={isPlaying ? { rotate: 360 } : {}}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="relative w-12 h-12"
        >
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#FF0064] p-[2px]">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                    {/* Inner disc */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center overflow-hidden border-2 border-zinc-700">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                            <div className="w-3 h-3 rounded-full bg-zinc-600" />
                        )}
                    </div>
                </div>
            </div>
            {/* Grooves */}
            <div className="absolute inset-2 rounded-full border border-zinc-700/50" />
            <div className="absolute inset-3 rounded-full border border-zinc-700/30" />
        </motion.div>
    );
}

// ============================================
// MAIN MOMENTS PAGE
// ============================================
export default function MomentsPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const [posts, setPosts] = useState<VideoPost[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isMuted, setIsMuted] = useState(true);
    const [showHeart, setShowHeart] = useState(false);
    const [isVideoPlaying, setIsVideoPlaying] = useState(true);
    const [showComments, setShowComments] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
    const lastTapRef = useRef<number>(0);

    // For parallax effect
    const y = useMotionValue(0);
    const opacity = useTransform(y, [-100, 0, 100], [0.5, 1, 0.5]);

    // Fetch video posts
    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const token = localStorage.getItem('0g_token');
                const response = await fetch(`${API_URL}/api/v1/posts?limit=50`, {
                    headers: {
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    // Get all posts with media (prioritize videos)
                    const mediaPosts = (data.posts || [])
                        .filter((p: VideoPost) => p.mediaUrl)
                        .map((p: VideoPost) => ({
                            ...p,
                            views: Math.floor(Math.random() * 50000) + 1000,
                            sound: p.mediaType === 'VIDEO' ? {
                                name: '✨ Original Sound',
                                artist: p.author.displayName,
                            } : undefined,
                            tags: ['#0G', '#ZeroGravity', '#Moment'],
                        }));
                    setPosts(mediaPosts);
                }
            } catch (err) {
                console.error('Error fetching posts:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPosts();
    }, [API_URL]);

    // Handle video playback
    useEffect(() => {
        videoRefs.current.forEach((video, id) => {
            if (posts[currentIndex]?.id !== id) {
                video.pause();
                video.currentTime = 0;
            }
        });

        const currentPost = posts[currentIndex];
        if (currentPost?.mediaType === 'VIDEO') {
            const video = videoRefs.current.get(currentPost.id);
            if (video) {
                video.play().catch(() => { });
                setIsVideoPlaying(true);
            }
        }
    }, [currentIndex, posts]);

    // Swipe navigation
    const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = 50;

        if (info.offset.y < -threshold && currentIndex < posts.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else if (info.offset.y > threshold && currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    }, [currentIndex, posts.length]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown' && currentIndex < posts.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else if (e.key === 'ArrowUp' && currentIndex > 0) {
                setCurrentIndex(prev => prev - 1);
            } else if (e.key === 'm') {
                setIsMuted(prev => !prev);
            } else if (e.key === ' ') {
                e.preventDefault();
                togglePlayPause();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, posts.length]);

    // Toggle play/pause
    const togglePlayPause = useCallback(() => {
        const currentPost = posts[currentIndex];
        if (currentPost?.mediaType === 'VIDEO') {
            const video = videoRefs.current.get(currentPost.id);
            if (video) {
                if (video.paused) {
                    video.play();
                    setIsVideoPlaying(true);
                } else {
                    video.pause();
                    setIsVideoPlaying(false);
                }
            }
        }
    }, [currentIndex, posts]);

    // Double-tap to like
    const handleTap = useCallback((postId: string) => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;

        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            handleLike(postId);
            setShowHeart(true);
            setTimeout(() => setShowHeart(false), 1200);
        } else {
            // Single tap - toggle play/pause
            togglePlayPause();
        }
        lastTapRef.current = now;
    }, [togglePlayPause]);

    // Handle like
    const handleLike = async (postId: string) => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        // Optimistic update
        setPosts(prev => prev.map(p =>
            p.id === postId
                ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
                : p
        ));

        try {
            const token = localStorage.getItem('0g_token');
            await fetch(`${API_URL}/api/v1/posts/${postId}/like`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });
        } catch (err) {
            console.error('Error liking post:', err);
        }
    };

    // Handle bookmark (persist via save/unsave API)
    const handleBookmark = async (postId: string) => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        const post = posts.find(p => p.id === postId);
        const wasBookmarked = post?.isBookmarked;

        // Optimistic update
        setPosts(prev => prev.map(p =>
            p.id === postId ? { ...p, isBookmarked: !p.isBookmarked } : p
        ));

        try {
            const token = localStorage.getItem('0g_token');
            await fetch(`${API_URL}/api/v1/posts/${postId}/save`, {
                method: wasBookmarked ? 'DELETE' : 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });
        } catch (err) {
            console.error('Error bookmarking post:', err);
            // Revert on failure
            setPosts(prev => prev.map(p =>
                p.id === postId ? { ...p, isBookmarked: wasBookmarked } : p
            ));
        }
    };

    // Handle share
    const handleShare = async (postId: string) => {
        const url = `${window.location.origin}/post/${postId}`;
        try {
            await navigator.share({ url, title: '0G Moment' });
        } catch {
            await navigator.clipboard.writeText(url);
        }
    };

    const currentPost = posts[currentIndex];

    // Loading state
    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="w-16 h-16 rounded-full border-2 border-transparent border-t-[#00D4FF] border-r-[#8B5CF6]"
                />
            </div>
        );
    }

    // Empty state
    if (posts.length === 0) {
        return (
            <div className="fixed inset-0 bg-gradient-to-b from-black via-[#0A0A12] to-black flex flex-col items-center justify-center text-white px-6">
                <FloatingParticles />
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10 }}
                    className="text-8xl mb-6"
                >
                    🎬
                </motion.div>
                <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                    No Moments Yet
                </h1>
                <p className="text-white/50 text-center mb-8 max-w-xs">
                    Be the first to break gravity and share your story
                </p>
                <Link
                    href="/create?type=moment"
                    className="group relative px-8 py-4 rounded-2xl overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#FF0064] opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-[1px] bg-black rounded-2xl" />
                    <span className="relative font-bold text-white">Create Your First Moment</span>
                </Link>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black overflow-hidden" ref={containerRef}>
            <FloatingParticles />

            {/* Video Feed */}
            <motion.div
                className="h-full w-full"
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                style={{ y }}
            >
                <AnimatePresence mode="popLayout">
                    <motion.div
                        key={currentPost.id}
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.4 }}
                        className="absolute inset-0"
                        onClick={() => handleTap(currentPost.id)}
                        style={{ opacity }}
                    >
                        {/* Video/Image */}
                        {currentPost.mediaType === 'VIDEO' ? (
                            <video
                                ref={(el) => { if (el) videoRefs.current.set(currentPost.id, el); }}
                                src={currentPost.mediaUrl}
                                className="w-full h-full object-cover"
                                loop
                                playsInline
                                muted={isMuted}
                                autoPlay
                            />
                        ) : (
                            <motion.img
                                src={currentPost.mediaUrl}
                                alt=""
                                className="w-full h-full object-cover"
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 20, repeat: Infinity }}
                            />
                        )}

                        {/* Double-tap heart animation */}
                        <HeartExplosion show={showHeart} />

                        {/* Premium gradient overlays */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black via-black/60 to-transparent" />
                            {/* Cinematic bars */}
                            <div className="absolute inset-x-0 top-0 h-6 bg-black/50" />
                            <div className="absolute inset-x-0 bottom-0 h-20 bg-black/50" />
                        </div>

                        {/* Play/Pause indicator */}
                        <AnimatePresence>
                            {!isVideoPlaying && currentPost.mediaType === 'VIDEO' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                >
                                    <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center">
                                        <span className="text-4xl ml-1">▶️</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Top bar - Views & Location */}
                        <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-10">
                            <div className="flex items-center gap-3">
                                <Link href="/dashboard">
                                    <motion.div
                                        whileTap={{ scale: 0.9 }}
                                        className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-xl flex items-center justify-center"
                                    >
                                        <span className="text-white text-lg">←</span>
                                    </motion.div>
                                </Link>
                                {currentPost.views && (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-xl">
                                        <span className="text-white/80 text-xs">👁</span>
                                        <span className="text-white text-xs font-medium">
                                            {currentPost.views >= 1000 ? `${(currentPost.views / 1000).toFixed(1)}K` : currentPost.views}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="text-right">
                                <div className="font-bold text-lg tracking-tight">
                                    <span className="text-[#00D4FF]">0</span>
                                    <span className="text-white">G</span>
                                </div>
                                <div className="text-white/40 text-[10px] uppercase tracking-widest">Moments</div>
                            </div>
                        </div>

                        {/* Bottom content */}
                        <div className="absolute bottom-24 left-4 right-20 z-10">
                            {/* Author info */}
                            <div className="flex items-center gap-3 mb-4">
                                <Link href={`/profile/${currentPost.author.username}`} className="relative">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] rounded-full opacity-80" />
                                    {currentPost.author.avatarUrl ? (
                                        <img
                                            src={currentPost.author.avatarUrl}
                                            alt={currentPost.author.displayName}
                                            className="relative w-11 h-11 rounded-full object-cover border-2 border-black"
                                        />
                                    ) : (
                                        <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold border-2 border-black">
                                            {currentPost.author.displayName?.[0] || 'U'}
                                        </div>
                                    )}
                                </Link>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={`/profile/${currentPost.author.username}`}
                                            className="font-bold text-white hover:underline"
                                        >
                                            {currentPost.author.displayName}
                                        </Link>
                                        {currentPost.author.isVerified && (
                                            <span className="text-[#00D4FF]">✓</span>
                                        )}
                                    </div>
                                    <span className="text-white/50 text-sm">@{currentPost.author.username}</span>
                                </div>
                                {!currentPost.author.isFollowing && (
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        className="px-4 py-1.5 rounded-lg bg-[#00D4FF] text-black text-sm font-bold"
                                    >
                                        Follow
                                    </motion.button>
                                )}
                            </div>

                            {/* Caption */}
                            {currentPost.content && (
                                <p className="text-white text-sm mb-3 leading-relaxed line-clamp-3">
                                    {currentPost.content}
                                </p>
                            )}

                            {/* Tags */}
                            {currentPost.tags && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {currentPost.tags.slice(0, 3).map((tag, i) => (
                                        <span key={i} className="text-[#00D4FF] text-sm font-medium">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Sound info */}
                            {currentPost.sound && (
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <SoundVisualizer isPlaying={isVideoPlaying && !isMuted} />
                                    <motion.div
                                        animate={{ x: ['0%', '-100%'] }}
                                        transition={{ duration: 10, repeat: Infinity, repeatType: 'loop', ease: 'linear' }}
                                        className="whitespace-nowrap text-white text-sm"
                                    >
                                        {currentPost.sound.name} • {currentPost.sound.artist}
                                        <span className="mx-8">|</span>
                                        {currentPost.sound.name} • {currentPost.sound.artist}
                                    </motion.div>
                                </div>
                            )}
                        </div>

                        {/* Right side actions */}
                        <div className="absolute right-3 bottom-36 flex flex-col items-center gap-4 z-10">
                            {/* Like */}
                            <ActionButton
                                count={currentPost.likes}
                                active={currentPost.isLiked}
                                accentColor="#FF0064"
                                onClick={() => handleLike(currentPost.id)}
                            >
                                <HeartIcon
                                    size={28}
                                    className={currentPost.isLiked ? 'text-rose-500 fill-current' : 'text-white'}
                                />
                            </ActionButton>

                            {/* Comment */}
                            <Link href={`/post/${currentPost.id}`}>
                                <ActionButton count={currentPost.commentsCount}>
                                    <MessageIcon size={28} className="text-white" />
                                </ActionButton>
                            </Link>

                            {/* Bookmark */}
                            <ActionButton
                                active={currentPost.isBookmarked}
                                accentColor="#8B5CF6"
                                onClick={() => handleBookmark(currentPost.id)}
                            >
                                <BookmarkIcon
                                    size={28}
                                    className={currentPost.isBookmarked ? 'text-violet-500 fill-current' : 'text-white'}
                                />
                            </ActionButton>

                            {/* Share */}
                            <ActionButton onClick={() => handleShare(currentPost.id)}>
                                <ShareIcon size={28} className="text-white" />
                            </ActionButton>

                            {/* Mute toggle */}
                            <motion.button
                                onClick={() => setIsMuted(!isMuted)}
                                whileTap={{ scale: 0.9 }}
                                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center border border-white/10"
                            >
                                <span className="text-lg">{isMuted ? '🔇' : '🔊'}</span>
                            </motion.button>

                            {/* Spinning disc */}
                            <SpinningDisc
                                avatarUrl={currentPost.author.avatarUrl}
                                isPlaying={isVideoPlaying}
                            />
                        </div>

                        {/* Navigation dots */}
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
                            {posts.slice(
                                Math.max(0, currentIndex - 3),
                                Math.min(posts.length, currentIndex + 4)
                            ).map((_, idx) => {
                                const actualIdx = Math.max(0, currentIndex - 3) + idx;
                                const isActive = actualIdx === currentIndex;
                                return (
                                    <motion.div
                                        key={actualIdx}
                                        className={`rounded-full transition-all cursor-pointer ${isActive
                                            ? 'w-1.5 h-6 bg-gradient-to-b from-[#00D4FF] to-[#8B5CF6]'
                                            : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/50'
                                            }`}
                                        onClick={() => setCurrentIndex(actualIdx)}
                                        whileHover={{ scale: 1.2 }}
                                    />
                                );
                            })}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </motion.div>

            {/* Premium Bottom Navigation */}
            <nav className="absolute bottom-0 left-0 right-0 bg-black/90 backdrop-blur-2xl border-t border-white/5 z-50">
                <div className="flex items-center justify-around py-3 px-2">
                    <Link href="/dashboard" className="flex flex-col items-center gap-1 text-white/40 hover:text-white/70 transition-colors">
                        <HomeIcon size={24} />
                        <span className="text-[10px] font-medium">Home</span>
                    </Link>
                    <Link href="/explore" className="flex flex-col items-center gap-1 text-white/40 hover:text-white/70 transition-colors">
                        <SearchIcon size={24} />
                        <span className="text-[10px] font-medium">Explore</span>
                    </Link>
                    <Link href="/create?type=moment" className="relative -mt-4">
                        <motion.div
                            className="relative w-14 h-10 flex items-center justify-center"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {/* Gradient background layers */}
                            <div className="absolute inset-0 rounded-xl bg-[#00D4FF] blur-sm opacity-50" />
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#FF0064]" />
                            <PlusIcon size={24} className="relative text-white" />
                        </motion.div>
                    </Link>
                    <Link href="/moments" className="flex flex-col items-center gap-1 text-white">
                        <MusicIcon size={24} />
                        <span className="text-[10px] font-medium">Moments</span>
                    </Link>
                    <Link href="/profile" className="flex flex-col items-center gap-1 text-white/40 hover:text-white/70 transition-colors">
                        <UserIcon size={24} />
                        <span className="text-[10px] font-medium">Profile</span>
                    </Link>
                </div>
            </nav>
        </div>
    );
}
