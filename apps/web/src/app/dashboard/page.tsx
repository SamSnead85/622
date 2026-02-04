'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { ReactionSpectrum, IntentionBadge, REACTION_SPECTRUM } from '@/components/ReactionSpectrum';
import { DataOwnershipPanel, PrivacyFirstBadge, LiveLatencyIndicator } from '@/components/PlatformDifferentiators';
import {
    HomeIcon,
    SearchIcon,
    VideoIcon,
    UsersIcon,
    SendIcon,
    MessageIcon,
    PlusIcon,
    BellIcon,
    SettingsIcon,
    CameraIcon,
    GlobeIcon,
    LockIcon,
    UnlockIcon,
    DollarIcon,
    ShieldIcon,
    HeartIcon,
    ShareIcon,
    MapPinIcon,
    ZapIcon,
    WaveIcon
} from '@/components/icons';
import React from 'react';

// ============================================
// 0G LOGO COMPONENT
// ============================================
function ZeroGLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const sizes = { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl' };
    return (
        <div className={`font-bold tracking-tight ${sizes[size]}`}>
            <span className="text-[#00D4FF]">0</span>
            <span className="text-white">G</span>
        </div>
    );
}

// ============================================
// AUTOPLAY VIDEO - TikTok/Instagram style (plays when in view)
// ============================================
function AutoPlayVideo({ src, className = '' }: { src: string; className?: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [progress, setProgress] = useState(0);
    const [showControls, setShowControls] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Update progress bar
        const handleTimeUpdate = () => {
            if (video.duration) {
                setProgress((video.currentTime / video.duration) * 100);
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);

        // Intersection Observer for autoplay when in view
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
                        video.play().catch(() => {
                            console.log('Autoplay blocked, user interaction required');
                        });
                        setIsPlaying(true);
                    } else {
                        video.pause();
                        setIsPlaying(false);
                    }
                });
            },
            {
                threshold: [0, 0.25, 0.5, 0.75, 1.0],
                rootMargin: '-10% 0px',
            }
        );

        observer.observe(video);

        return () => {
            observer.disconnect();
            video.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, []);

    const toggleMute = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(!isMuted);
        }
    }, [isMuted]);

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

    const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (videoRef.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            videoRef.current.currentTime = percent * videoRef.current.duration;
        }
    }, []);

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
                muted={isMuted}
                playsInline
                preload="metadata"
            />
            {/* Play/Pause Overlay */}
            <div
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                onClick={togglePlay}
            >
                <AnimatePresence>
                    {!isPlaying && (
                        <motion.div
                            className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/20"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                        >
                            <span className="text-3xl ml-1">▶️</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Controls Overlay - Bottom */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent"
                initial={false}
                animate={{ opacity: showControls || !isPlaying ? 1 : 0 }}
                transition={{ duration: 0.2 }}
            >
                {/* Progress Bar - Clickable */}
                <div
                    className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-2 group/progress"
                    onClick={handleSeek}
                >
                    <motion.div
                        className="h-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] rounded-full relative"
                        style={{ width: `${progress}%` }}
                    >
                        {/* Scrubber Handle */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                    </motion.div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={toggleMute}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                        <span className="text-lg">{isMuted ? '🔇' : '🔊'}</span>
                    </button>
                    <span className="text-xs text-white/60 font-medium">
                        {videoRef.current ? `${Math.floor(videoRef.current.currentTime)}s` : '0s'}
                    </span>
                </div>
            </motion.div>
        </div>
    );
}

// ============================================
// DOUBLE-TAP HEART ANIMATION - Instagram style
// ============================================
function DoubleTapHeart({
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
    const DOUBLE_TAP_DELAY = 300;

    const handleTap = useCallback(() => {
        const now = Date.now();
        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            // Double tap detected
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
                        {/* Main heart */}
                        <motion.div
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: [0, 1.4, 1], rotate: [-20, 10, 0] }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="relative"
                        >
                            <span className="text-[100px] drop-shadow-[0_0_40px_rgba(255,0,100,0.8)]">❤️</span>
                        </motion.div>
                        {/* Particle burst */}
                        {[...Array(8)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-3 h-3 rounded-full"
                                style={{ background: i % 2 === 0 ? '#FF0064' : '#00D4FF' }}
                                initial={{ scale: 0, x: 0, y: 0 }}
                                animate={{
                                    scale: [0, 1, 0],
                                    x: Math.cos((i * 45 * Math.PI) / 180) * 100,
                                    y: Math.sin((i * 45 * Math.PI) / 180) * 100,
                                    opacity: [1, 1, 0],
                                }}
                                transition={{ duration: 0.7, delay: 0.1 }}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// LOADING SKELETON - Premium animated placeholder
// ============================================
function PostSkeleton() {
    return (
        <div className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden animate-pulse">
            {/* Header skeleton */}
            <div className="p-4 pb-2">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10" />
                    <div className="flex-1">
                        <div className="h-4 w-32 bg-white/10 rounded mb-2" />
                        <div className="h-3 w-48 bg-white/5 rounded" />
                    </div>
                </div>
            </div>
            {/* Media skeleton */}
            <div className="aspect-[4/3] bg-white/5">
                <div className="w-full h-full bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer" />
            </div>
            {/* Actions skeleton */}
            <div className="p-4 border-t border-white/5">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/10" />
                    <div className="w-8 h-8 rounded-full bg-white/10" />
                    <div className="w-8 h-8 rounded-full bg-white/10" />
                </div>
            </div>
        </div>
    );
}


// ============================================
// NEW MEMBERS BANNER - Welcome Ticker
// ============================================
function NewMembersBanner() {
    const [newMembers, setNewMembers] = useState<Array<{
        id: string;
        username: string;
        displayName: string;
        createdAt: string;
    }>>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchNewMembers = async () => {
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || 'https://caravanserver-production-d7da.up.railway.app'}/api/v1/users?limit=10&sortBy=createdAt&sortOrder=desc`,
                    {
                        headers: {
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                        },
                        credentials: 'include',
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    // Filter to users joined in the last 7 days
                    const recentUsers = (data.users || []).filter((user: { createdAt: string }) => {
                        const joinDate = new Date(user.createdAt);
                        const sevenDaysAgo = new Date();
                        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                        return joinDate > sevenDaysAgo;
                    });
                    setNewMembers(recentUsers);
                }
            } catch (err) {
                console.error('Error fetching new members:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNewMembers();
        // Refresh every 30 seconds
        const interval = setInterval(fetchNewMembers, 30000);
        return () => clearInterval(interval);
    }, []);

    // Always show banner - with placeholder when loading/empty
    if (isLoading) {
        return (
            <div className="mb-4 h-10 overflow-hidden rounded-xl bg-gradient-to-r from-green-500/5 via-[#00D4FF]/5 to-purple-500/5 border border-white/5 animate-pulse" />
        );
    }

    if (newMembers.length === 0) {
        return (
            <div className="mb-4 overflow-hidden rounded-xl bg-gradient-to-r from-[#00D4FF]/10 to-[#8B5CF6]/10 border border-[#00D4FF]/20">
                <div className="py-2 px-4 flex items-center gap-3">
                    <span className="text-lg">👥</span>
                    <span className="text-sm text-white/70">Be among the first! Invite friends to grow the community.</span>
                    <Link href="/invite" className="ml-auto text-xs text-[#00D4FF] font-semibold hover:underline">Invite →</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-4 overflow-hidden rounded-xl bg-gradient-to-r from-green-500/10 via-[#00D4FF]/10 to-purple-500/10 border border-green-500/20">
            <div className="py-2 px-4 flex items-center gap-3">
                <div className="flex-shrink-0 flex items-center gap-2 text-green-400">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs font-semibold uppercase tracking-wider">New</span>
                </div>
                <div className="flex-1 overflow-hidden">
                    <motion.div
                        className="flex gap-6 whitespace-nowrap"
                        animate={{ x: ['0%', '-50%'] }}
                        transition={{
                            duration: newMembers.length * 4,
                            repeat: Infinity,
                            ease: 'linear',
                        }}
                    >
                        {/* Duplicate for seamless loop */}
                        {[...newMembers, ...newMembers].map((member, idx) => (
                            <Link
                                key={`${member.id}-${idx}`}
                                href={`/profile/${member.username}`}
                                className="flex items-center gap-2 text-sm text-white hover:text-[#00D4FF] transition-colors"
                            >
                                <span className="text-lg">👋</span>
                                <span>
                                    Welcome <span className="font-semibold text-[#00D4FF]">{member.displayName || member.username}</span>!
                                </span>
                            </Link>
                        ))}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

// ============================================
// STORIES ROW - Friends & Active Users (Instagram/TikTok style)
// ============================================
const FALLBACK_USERS = [
    { id: 'invite-1', username: 'invite', displayName: 'Invite Friends', emoji: '👥', isInvite: true },
    { id: 'explore-1', username: 'explore', displayName: 'Explore', emoji: '🔍', isExplore: true },
    { id: 'demo-1', username: 'traveler', displayName: 'Traveler', emoji: '✈️', hasStory: true },
    { id: 'demo-2', username: 'foodie', displayName: 'Foodie', emoji: '🍜', hasStory: true },
    { id: 'demo-3', username: 'artist', displayName: 'Artist', emoji: '🎨', hasStory: true },
    { id: 'demo-4', username: 'musician', displayName: 'Musician', emoji: '🎵', hasStory: true },
    { id: 'demo-5', username: 'gamer', displayName: 'Gamer', emoji: '🎮', isLive: true },
    { id: 'demo-6', username: 'fitness', displayName: 'Fitness', emoji: '💪', hasStory: true },
];

function StoriesRow({ currentUser }: { currentUser: { id: string; username?: string; displayName?: string; avatarUrl?: string } }) {
    const [users, setUsers] = useState<Array<{
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
        emoji?: string;
        hasStory?: boolean;
        isLive?: boolean;
        isInvite?: boolean;
        isExplore?: boolean;
    }>>(FALLBACK_USERS); // Start with fallback users
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || 'https://caravanserver-production-d7da.up.railway.app'}/api/v1/users?limit=20`,
                    {
                        headers: {
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                        },
                        credentials: 'include',
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    // Filter out current user
                    const otherUsers = (data.users || []).filter((u: { id: string }) => u.id !== currentUser?.id);
                    if (otherUsers.length > 0) {
                        // Add random story/live status for visual variety
                        const usersWithStatus = otherUsers.map((u: { id: string; username: string; displayName: string; avatarUrl?: string }) => ({
                            ...u,
                            hasStory: Math.random() > 0.5,
                            isLive: Math.random() > 0.85,
                        }));
                        setUsers(usersWithStatus.slice(0, 15));
                    }
                    // If no users returned, keep fallback users
                }
                // If API fails, keep fallback users
            } catch (err) {
                console.error('Error fetching users:', err);
                // Keep fallback users on error
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [currentUser?.id]);

    // Always render the Stories row

    return (
        <div className="mb-4 overflow-x-auto scrollbar-hide">
            <div className="flex gap-4 pb-2">
                {/* Your Story */}
                <Link
                    href="/create"
                    className="flex flex-col items-center gap-1 flex-shrink-0"
                >
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00D4FF]/20 to-[#8B5CF6]/20 border-2 border-dashed border-[#00D4FF]/50 flex items-center justify-center">
                            {currentUser?.avatarUrl ? (
                                <img
                                    src={currentUser.avatarUrl}
                                    alt="Your story"
                                    className="w-14 h-14 rounded-full object-cover opacity-60"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold opacity-60">
                                    {currentUser?.displayName?.[0] || 'U'}
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#00D4FF] flex items-center justify-center border-2 border-[#0A0A0A]">
                            <span className="text-xs text-black font-bold">+</span>
                        </div>
                    </div>
                    <span className="text-xs text-white/60">Your Story</span>
                </Link>

                {/* Other Users */}
                {users.map((user) => {
                    // Determine the href based on user type
                    const href = user.isInvite
                        ? '/invite'
                        : user.isExplore
                            ? '/explore'
                            : user.hasStory || user.isLive
                                ? `/stories/${user.id}`
                                : `/profile/${user.username}`;

                    return (
                        <Link
                            key={user.id}
                            href={href}
                            className="flex flex-col items-center gap-1 flex-shrink-0 group"
                        >
                            <div className="relative">
                                <div className={`w-16 h-16 rounded-full p-0.5 ${user.isLive
                                    ? 'bg-gradient-to-br from-red-500 to-orange-500 animate-pulse'
                                    : user.hasStory
                                        ? 'bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6]'
                                        : user.isInvite
                                            ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                                            : user.isExplore
                                                ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                                                : 'bg-white/20'
                                    }`}>
                                    <div className="w-full h-full rounded-full bg-[#0A0A0A] p-0.5">
                                        {user.avatarUrl ? (
                                            <img
                                                src={user.avatarUrl}
                                                alt={user.displayName}
                                                className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform"
                                            />
                                        ) : user.emoji ? (
                                            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                                                {user.emoji}
                                            </div>
                                        ) : (
                                            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold text-sm">
                                                {user.displayName?.[0] || 'U'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {user.isLive && (
                                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-red-500 text-[10px] font-bold text-white border border-[#0A0A0A]">
                                        LIVE
                                    </div>
                                )}
                            </div>
                            <span className="text-xs text-white/60 group-hover:text-white transition-colors max-w-16 truncate">
                                {user.displayName?.split(' ')[0] || user.username}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

// ============================================
// PEOPLE TO FOLLOW - Real Users with Follow Buttons
// ============================================
function PeopleToFollow({ currentUserId }: { currentUserId?: string }) {
    const [users, setUsers] = useState<Array<{
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
        isFollowing: boolean;
    }>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || 'https://caravanserver-production-d7da.up.railway.app'}/api/v1/users?limit=5`,
                    {
                        headers: {
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                        },
                        credentials: 'include',
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    // Filter out current user and add isFollowing status
                    const filteredUsers = (data.users || [])
                        .filter((u: { id: string }) => u.id !== currentUserId)
                        .slice(0, 5)
                        .map((u: any) => ({ ...u, isFollowing: false }));
                    setUsers(filteredUsers);
                }
            } catch (err) {
                console.error('Error fetching users:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [currentUserId]);

    const handleFollow = async (userId: string) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
        if (!token) return;

        const isCurrentlyFollowing = followingIds.has(userId);
        const method = isCurrentlyFollowing ? 'DELETE' : 'POST';

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'https://caravanserver-production-d7da.up.railway.app'}/api/v1/users/${userId}/follow`,
                {
                    method,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                }
            );

            if (response.ok) {
                setFollowingIds(prev => {
                    const next = new Set(prev);
                    if (isCurrentlyFollowing) {
                        next.delete(userId);
                    } else {
                        next.add(userId);
                    }
                    return next;
                });
            }
        } catch (err) {
            console.error('Error following user:', err);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 border-2 border-white/20 border-t-[#00D4FF] rounded-full animate-spin" />
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <p className="text-xs text-white/40 text-center py-4">No users to suggest yet</p>
        );
    }

    return (
        <div className="space-y-3">
            {users.map((user) => (
                <div key={user.id} className="flex items-center gap-3">
                    <Link href={`/profile/${user.username}`} className="flex-shrink-0">
                        {user.avatarUrl ? (
                            <img
                                src={user.avatarUrl}
                                alt={user.displayName}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-semibold text-sm">
                                {user.displayName?.[0] || 'U'}
                            </div>
                        )}
                    </Link>
                    <Link href={`/profile/${user.username}`} className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
                        <p className="text-xs text-white/50 truncate">@{user.username}</p>
                    </Link>
                    <button
                        onClick={() => handleFollow(user.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${followingIds.has(user.id)
                            ? 'bg-white/10 text-white/70 hover:bg-white/20'
                            : 'bg-[#00D4FF] text-black hover:opacity-90'
                            }`}
                    >
                        {followingIds.has(user.id) ? 'Following' : 'Follow'}
                    </button>
                </div>
            ))}
        </div>
    );
}

// ============================================
// FEATURED LOCATIONS - Sacred Sites & Live Streams  
// ============================================
const FEATURED_LOCATIONS = [
    {
        id: 'mecca',
        name: 'Mecca',
        subtitle: 'Masjid al-Haram',
        image: '/featured/mecca.png',
        isLive: false,
        category: 'Sacred Sites',
    },
    {
        id: 'medina',
        name: 'Medina',
        subtitle: "Prophet's Mosque ﷺ",
        image: '/featured/medina.png',
        isLive: false,
        category: 'Sacred Sites',
    },
    {
        id: 'jerusalem',
        name: 'Jerusalem',
        subtitle: 'Al-Aqsa Compound',
        image: '/featured/jerusalem.png',
        isLive: false,
        category: 'Sacred Sites',
    },
    {
        id: 'abu-dhabi',
        name: 'Abu Dhabi',
        subtitle: 'Sheikh Zayed Mosque',
        image: '/featured/abu-dhabi.jpg',
        isLive: false,
        category: 'Cultural Heritage',
    },
    {
        id: 'istanbul',
        name: 'Istanbul',
        subtitle: 'Blue Mosque',
        image: '/featured/istanbul.png',
        isLive: false,
        category: 'Cultural Heritage',
    },
];

// ============================================
// FEATURED LOCATION CARD
// ============================================
function FeaturedLocationCard({ location, index }: { location: typeof FEATURED_LOCATIONS[0]; index: number }) {
    return (
        <motion.div
            className="relative group cursor-pointer w-full"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -4, scale: 1.02 }}
        >
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 group-hover:border-[#00D4FF]/40 transition-colors">
                {/* Image */}
                <Image
                    src={location.image}
                    alt={location.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                {/* Live indicator */}
                {location.isLive && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/90 backdrop-blur-sm">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        <span className="text-white text-xs font-semibold">LIVE</span>
                    </div>
                )}

                {/* Category badge */}
                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
                    <span className="text-white/90 text-xs font-medium">{location.category}</span>
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="text-[#00D4FF] text-xs font-medium mb-1">{location.category}</div>
                    <h3 className="text-xl font-bold text-white mb-1">{location.name}</h3>
                    <p className="text-white/60 text-sm">{location.subtitle}</p>
                </div>

                {/* Watch button on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="px-6 py-3 rounded-xl bg-[#00D4FF] text-black font-semibold text-sm shadow-lg shadow-[#00D4FF]/30">
                        Watch Now
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// NAVIGATION SIDEBAR
// ============================================
function NavigationSidebar({ activeTab, user, onCreateClick }: { activeTab: string; user: any; onCreateClick: () => void }) {
    const navItems = [
        { id: 'feed', Icon: HomeIcon, label: 'Feed', href: '/dashboard' },
        { id: 'explore', Icon: SearchIcon, label: 'Explore', href: '/explore' },
        { id: 'live', Icon: VideoIcon, label: 'Live', href: '/campfire' },
        { id: 'communities', Icon: UsersIcon, label: 'Communities', href: '/communities' },
        { id: 'invite', Icon: SendIcon, label: 'Invite', href: '/invite', highlight: true },
        { id: 'messages', Icon: MessageIcon, label: 'Messages', href: '/messages', hasNotification: true },
    ];

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 xl:w-64 bg-[#0A0A0F]/95 backdrop-blur-xl border-r border-white/5 flex-col p-4 z-40">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 px-3 py-4 mb-6">
                    <ZeroGLogo size="lg" />
                    <span className="text-white/60 text-sm font-medium hidden xl:block">ZeroG</span>
                </Link>

                {/* Nav items */}
                <nav className="flex-1 space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === item.id
                                ? 'bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20'
                                : (item as any).highlight
                                    ? 'bg-gradient-to-r from-[#00D4FF]/20 to-[#8B5CF6]/20 text-[#00D4FF] border border-[#00D4FF]/30 hover:from-[#00D4FF]/30 hover:to-[#8B5CF6]/30'
                                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <span className="relative">
                                <item.Icon size={22} />
                                {item.hasNotification && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#00D4FF] rounded-full" />
                                )}
                            </span>
                            <span className="font-medium hidden xl:block">{item.label}</span>
                            {(item as any).highlight && (
                                <span className="hidden xl:block ml-auto text-[10px] bg-[#00D4FF]/20 px-2 py-0.5 rounded-full text-[#00D4FF]">NEW</span>
                            )}
                        </Link>
                    ))}
                </nav>

                {/* Create button */}
                <button
                    onClick={onCreateClick}
                    className="flex items-center justify-center xl:justify-start gap-3 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-black font-semibold hover:opacity-90 transition-opacity mb-4"
                >
                    <PlusIcon size={18} />
                    <span className="hidden xl:block">Create Post</span>
                </button>

                {/* Profile */}
                <Link href="/profile" className="flex items-center gap-3 px-3 py-3 border-t border-white/10 mt-auto">
                    {user?.avatarUrl ? (
                        <img
                            src={user.avatarUrl}
                            alt={user.displayName || 'Profile'}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold">
                            {user?.displayName?.[0] || 'U'}
                        </div>
                    )}
                    <div className="hidden xl:block">
                        <p className="font-semibold text-white text-sm">{user?.displayName || 'User'}</p>
                        <p className="text-xs text-white/50">@{user?.username || 'username'}</p>
                    </div>
                </Link>
            </aside>

            {/* Mobile Bottom Nav */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0F]/95 backdrop-blur-xl border-t border-white/10 z-50 safe-area-pb">
                <div className="flex items-center justify-around py-2">
                    {navItems.slice(0, 5).map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 p-2 ${activeTab === item.id ? 'text-[#00D4FF]' : 'text-white/50'
                                }`}
                        >
                            <span className="relative">
                                <item.Icon size={22} />
                                {item.hasNotification && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#00D4FF] rounded-full" />
                                )}
                            </span>
                            <span className="text-[10px]">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </nav>

            {/* Mobile Floating Action Button */}
            <motion.button
                onClick={onCreateClick}
                className="lg:hidden fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] shadow-lg shadow-[#00D4FF]/30 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                initial={false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
                <PlusIcon size={24} className="text-black" />
            </motion.button>
        </>
    );
}


// ============================================
// MAIN DASHBOARD PAGE
// ============================================
export default function DashboardPage() {
    const { user, isLoading } = useAuth();
    const { posts, likePost, isLoading: postsLoading, refetch, hasMore, loadMore } = usePosts();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    if (!mounted || isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-[#00D4FF]/20 border-t-[#00D4FF] animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <main className="min-h-screen bg-black text-white">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0A1628] via-black to-black" />
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[#00D4FF]/5 blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[#8B5CF6]/5 blur-[100px]" />
            </div>

            {/* Navigation */}
            <NavigationSidebar
                activeTab="feed"
                user={user}
                onCreateClick={() => router.push('/create')}
            />

            {/* Main Content */}
            <div className="lg:pl-20 xl:pl-64">
                <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 pb-24 lg:pb-8">
                    {/* Sticky Header - Compact */}
                    <header className="mb-4 sticky top-0 z-20 -mx-4 lg:-mx-8 px-4 lg:px-8 py-3 bg-black/80 backdrop-blur-xl border-b border-white/5">
                        <div className="flex items-center justify-between">
                            {/* Welcome & Profile */}
                            <div className="flex items-center gap-4">
                                <Link href="/profile">
                                    {user.avatarUrl ? (
                                        <img
                                            src={user.avatarUrl}
                                            alt={user.displayName || 'Profile'}
                                            className="w-12 h-12 rounded-full object-cover ring-2 ring-[#00D4FF]/30"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold text-lg">
                                            {user.displayName?.[0] || 'U'}
                                        </div>
                                    )}
                                </Link>
                                <div>
                                    <h1 className="text-xl md:text-2xl font-bold text-white">
                                        Welcome back{user.displayName ? `, ${user.displayName}` : ''}
                                    </h1>
                                    <p className="text-white/50 text-sm">Your 0G social hub</p>
                                </div>
                            </div>

                            {/* Header Actions */}
                            <div className="flex items-center gap-3">
                                {/* Notifications */}
                                <Link href="/notifications" className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                    <BellIcon size={22} />
                                </Link>

                                {/* Settings */}
                                <Link href="/settings" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                    <SettingsIcon size={22} />
                                </Link>
                            </div>
                        </div>
                    </header>

                    {/* Stories Row - Friends & Active Users */}
                    <StoriesRow currentUser={user} />

                    {/* New Members Welcome Banner */}
                    <NewMembersBanner />

                    {/* Invite Friends CTA - Compact */}
                    <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-[#00D4FF]/10 to-[#8B5CF6]/10 border border-[#00D4FF]/20">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center">
                                <UsersIcon size={24} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-white">Build Your Network</h3>
                                <p className="text-xs text-white/50">Invite friends and family to connect on 0G</p>
                            </div>
                            <Link
                                href="/invite"
                                className="px-4 py-2 rounded-xl bg-[#00D4FF] text-black font-medium text-sm hover:opacity-90 transition-opacity"
                            >
                                Invite
                            </Link>
                        </div>
                    </div>

                    {/* Quick Actions Bar - Always visible */}
                    <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {[
                            { name: 'Share Moment', Icon: CameraIcon, href: '/create', gradient: 'from-[#00D4FF] to-[#0088CC]' },
                            { name: 'Invite Friends', Icon: SendIcon, href: '/invite', gradient: 'from-[#8B5CF6] to-[#6D28D9]' },
                            { name: 'Go Live', Icon: VideoIcon, href: '/campfire', gradient: 'from-red-500 to-orange-500' },
                            { name: 'Find People', Icon: UsersIcon, href: '/explore', gradient: 'from-green-500 to-teal-500' },
                        ].map((action, i) => (
                            <Link
                                key={i}
                                href={action.href}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r ${action.gradient} text-white font-medium text-sm hover:opacity-90 transition-opacity flex-shrink-0 whitespace-nowrap`}
                            >
                                <action.Icon size={18} />
                                <span>{action.name}</span>
                            </Link>
                        ))}
                    </div>


                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Feed - Main column */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Quick post with privacy controls */}
                            <motion.div
                                className="bg-white/[0.02] rounded-2xl border border-white/5 p-4"
                                initial={false}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <div className="flex gap-4">
                                    {user.avatarUrl ? (
                                        <img
                                            src={user.avatarUrl}
                                            alt={user.displayName || 'Profile'}
                                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold flex-shrink-0">
                                            {user.displayName?.[0] || 'U'}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            placeholder="What's on your mind?"
                                            className="w-full bg-white/5 rounded-xl px-4 py-3 text-white placeholder:text-white/40 border border-white/5 focus:border-[#00D4FF]/30 focus:outline-none transition-colors"
                                            onFocus={() => router.push('/create')}
                                        />
                                        {/* Privacy selector */}
                                        <div className="flex items-center gap-3 mt-3">
                                            <span className="text-xs text-white/40">Share with:</span>
                                            <div className="flex gap-2">
                                                <button className="px-3 py-1 rounded-full bg-[#00D4FF]/20 text-[#00D4FF] text-xs font-medium border border-[#00D4FF]/30">
                                                    🌍 Public
                                                </button>
                                                <button className="px-3 py-1 rounded-full bg-white/5 text-white/60 text-xs font-medium border border-white/10 hover:bg-white/10 transition-colors">
                                                    👥 Friends
                                                </button>
                                                <button className="px-3 py-1 rounded-full bg-white/5 text-white/60 text-xs font-medium border border-white/10 hover:bg-white/10 transition-colors">
                                                    👨‍👩‍👧 Family
                                                </button>
                                                <button className="px-3 py-1 rounded-full bg-white/5 text-white/60 text-xs font-medium border border-white/10 hover:bg-white/10 transition-colors">
                                                    🔒 Only Me
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-4 pl-16">
                                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/60 hover:bg-white/5 transition-colors">
                                        <CameraIcon size={18} />
                                        <span className="text-sm">Photo</span>
                                    </button>
                                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/60 hover:bg-white/5 transition-colors">
                                        <VideoIcon size={18} />
                                        <span className="text-sm">Video</span>
                                    </button>
                                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/60 hover:bg-white/5 transition-colors">
                                        <VideoIcon size={18} />
                                        <span className="text-sm">Go Live</span>
                                    </button>
                                    <div className="flex-1" />
                                    <button
                                        onClick={() => router.push('/create')}
                                        className="px-5 py-2 rounded-xl bg-[#00D4FF] text-black font-semibold text-sm hover:opacity-90 transition-opacity"
                                    >
                                        Post
                                    </button>
                                </div>
                            </motion.div>

                            {/* Your Feed - Real Posts from API */}
                            <motion.div
                                className="space-y-4"
                                initial={false}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                {/* Your Algorithm Banner */}
                                <div className="bg-gradient-to-r from-[#00D4FF]/10 to-transparent rounded-xl border border-[#00D4FF]/20 p-4 flex items-center gap-4">
                                    <span className="text-2xl">🎯</span>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-white">Your Feed, Your Rules</p>
                                        <p className="text-xs text-white/50">You control what shows here. No hidden algorithms.</p>
                                    </div>
                                    <Link href="/algorithm" className="text-xs text-[#00D4FF] font-medium hover:underline">
                                        Customize →
                                    </Link>
                                </div>

                                {/* Loading State - Premium Skeletons */}
                                {postsLoading && posts.length === 0 && (
                                    <div className="space-y-4">
                                        <PostSkeleton />
                                        <PostSkeleton />
                                        <PostSkeleton />
                                    </div>
                                )}

                                {/* Empty State */}
                                {!postsLoading && posts.length === 0 && (
                                    <div className="text-center py-12 bg-white/[0.02] rounded-2xl border border-white/5">
                                        <div className="text-4xl mb-4">📸</div>
                                        <h3 className="text-lg font-semibold text-white mb-2">No posts yet</h3>
                                        <p className="text-white/50 mb-4">Share your first moment with the community!</p>
                                        <button
                                            onClick={() => router.push('/create')}
                                            className="px-6 py-2.5 rounded-xl bg-[#00D4FF] text-black font-semibold text-sm hover:opacity-90 transition-opacity"
                                        >
                                            Create Post
                                        </button>
                                    </div>
                                )}

                                {/* Real Posts - Standardized Card Sizing */}
                                {posts.map(post => (
                                    <div key={post.id} className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden">
                                        {/* Header - Fixed Height */}
                                        <div className="p-4 pb-2">
                                            <div className="flex items-start gap-3">
                                                {post.author.avatarUrl ? (
                                                    <img
                                                        src={post.author.avatarUrl}
                                                        alt={post.author.displayName}
                                                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                                                        {post.author.displayName?.[0] || 'U'}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold text-white text-sm truncate">{post.author.displayName}</span>
                                                        <span className="px-2 py-0.5 rounded-full bg-[#00D4FF]/20 text-[#00D4FF] text-[10px] flex-shrink-0">🌍 Public</span>
                                                        <span className="text-white/30 text-xs flex-shrink-0">• {new Date(post.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    {post.content && (
                                                        <p className="text-white/70 text-sm mt-1 line-clamp-3">{post.content}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Media Container - Double-tap to like */}
                                        {post.mediaUrl && (
                                            <DoubleTapHeart onDoubleTap={() => !post.isLiked && likePost(post.id)}>
                                                <div className="relative w-full aspect-[4/3] bg-black/30 overflow-hidden cursor-pointer">
                                                    {post.mediaType === 'VIDEO' ? (
                                                        <div className="absolute inset-0">
                                                            <AutoPlayVideo src={post.mediaUrl} />
                                                        </div>
                                                    ) : (
                                                        <img
                                                            src={post.mediaUrl}
                                                            alt="Post media"
                                                            className="absolute inset-0 w-full h-full object-cover"
                                                        />
                                                    )}
                                                </div>
                                            </DoubleTapHeart>
                                        )}

                                        {/* Text-only posts get a consistent height placeholder */}
                                        {!post.mediaUrl && (
                                            <div className="px-4 py-6 flex items-center justify-center min-h-[120px] bg-gradient-to-br from-[#00D4FF]/5 to-[#8B5CF6]/5">
                                                <div className="text-center">
                                                    <span className="text-4xl">{post.content?.length && post.content.length > 100 ? '📝' : '💭'}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Interaction Buttons - Large & Visible */}
                                        <div className="p-4 border-t border-white/5">
                                            <div className="flex items-center justify-between">
                                                {/* Left side - reactions */}
                                                <div className="flex items-center gap-4">
                                                    {/* Like/Heart Button */}
                                                    <button
                                                        onClick={() => likePost(post.id)}
                                                        className={`flex flex-col items-center gap-1 transition-all transform hover:scale-110 ${post.isLiked ? 'text-rose-500' : 'text-white/70 hover:text-rose-400'}`}
                                                    >
                                                        <span className="text-2xl">{post.isLiked ? '❤️' : '🤍'}</span>
                                                        <span className="text-xs font-medium">{post.likes || 0}</span>
                                                    </button>

                                                    {/* Dislike Button */}
                                                    <button
                                                        className="flex flex-col items-center gap-1 text-white/70 hover:text-blue-400 transition-all transform hover:scale-110"
                                                    >
                                                        <span className="text-2xl">👎</span>
                                                        <span className="text-xs font-medium">0</span>
                                                    </button>

                                                    {/* Comment Button */}
                                                    <button
                                                        onClick={() => router.push(`/post/${post.id}`)}
                                                        className="flex flex-col items-center gap-1 text-white/70 hover:text-[#00D4FF] transition-all transform hover:scale-110"
                                                    >
                                                        <span className="text-2xl">💬</span>
                                                        <span className="text-xs font-medium">{post.commentsCount || 0}</span>
                                                    </button>
                                                </div>

                                                {/* Right side - share/repost */}
                                                <div className="flex items-center gap-4">
                                                    {/* Share Button */}
                                                    <button
                                                        onClick={() => {
                                                            const url = `${window.location.origin}/post/${post.id}`;
                                                            if (navigator.share) {
                                                                navigator.share({
                                                                    title: 'Check out this post on 0G',
                                                                    url
                                                                });
                                                            } else {
                                                                navigator.clipboard.writeText(url);
                                                                alert('Link copied!');
                                                            }
                                                        }}
                                                        className="flex flex-col items-center gap-1 text-white/70 hover:text-[#00D4FF] transition-all transform hover:scale-110"
                                                    >
                                                        <span className="text-2xl">📤</span>
                                                        <span className="text-xs font-medium">Share</span>
                                                    </button>

                                                    {/* Repost Button */}
                                                    <button
                                                        onClick={() => router.push(`/create?repost=${post.id}`)}
                                                        className="flex flex-col items-center gap-1 text-white/70 hover:text-green-400 transition-all transform hover:scale-110"
                                                    >
                                                        <span className="text-2xl">🔄</span>
                                                        <span className="text-xs font-medium">Repost</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Infinite Scroll Sentinel */}
                                {hasMore && (
                                    <div ref={loadMoreRef} className="py-8 flex justify-center">
                                        <div onClick={loadMore} className="flex flex-col items-center gap-2 cursor-pointer group">
                                            <div className="w-8 h-8 rounded-full border-2 border-[#00D4FF]/30 border-t-[#00D4FF] animate-spin" />
                                            <span className="text-xs text-white/40 group-hover:text-[#00D4FF] transition-colors">Loading more...</span>
                                        </div>
                                    </div>
                                )}

                                {/* Refresh Feed Button */}
                                {posts.length > 0 && !hasMore && (
                                    <div className="text-center py-6">
                                        <div className="text-white/30 text-sm mb-3">You're all caught up! ✨</div>
                                        <button
                                            onClick={() => refetch()}
                                            className="px-6 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm font-medium hover:bg-white/10 transition-colors border border-white/5"
                                        >
                                            Refresh Feed
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {/* Sidebar - 0G Differentiators */}
                        <div className="space-y-6">
                            {/* People to Follow - Real Users */}
                            <motion.div
                                className="bg-white/[0.02] rounded-2xl border border-white/5 p-4"
                                initial={false}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.35 }}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-white">People to Follow</h3>
                                    <Link href="/explore" className="text-xs text-[#00D4FF] hover:underline">See All</Link>
                                </div>
                                <PeopleToFollow currentUserId={user?.id} />
                            </motion.div>

                            {/* Data Ownership - No Lock-in */}
                            <motion.div
                                initial={false}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <DataOwnershipPanel />
                            </motion.div>

                            {/* Privacy & Latency Indicators */}
                            <motion.div
                                className="bg-white/[0.02] rounded-2xl border border-white/5 p-5"
                                initial={false}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.55 }}
                            >
                                <h3 className="text-sm font-semibold text-white mb-4">Why 0G is Different</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                                        <UnlockIcon size={20} className="text-[#00D4FF]" />
                                        <div>
                                            <p className="text-xs font-medium text-white">No Platform Lock-in</p>
                                            <p className="text-[10px] text-white/40">Export all data anytime</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                                        <DollarIcon size={20} className="text-[#00D4FF]" />
                                        <div>
                                            <p className="text-xs font-medium text-white">Creators Keep 90%</p>
                                            <p className="text-[10px] text-white/40">vs 50% on TikTok</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                                        <ZapIcon size={20} className="text-[#00D4FF]" />
                                        <div>
                                            <p className="text-xs font-medium text-white">&lt;1s Live Latency</p>
                                            <p className="text-[10px] text-white/40">Others: 3-5s delay</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                                        <ShieldIcon size={20} className="text-[#00D4FF]" />
                                        <div>
                                            <p className="text-xs font-medium text-white">Privacy-First</p>
                                            <p className="text-[10px] text-white/40">Your data stays yours</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Invite Card */}
                            <motion.div
                                className="bg-gradient-to-br from-[#00D4FF]/10 to-[#8B5CF6]/10 rounded-2xl border border-[#00D4FF]/20 p-5"
                                initial={false}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.6 }}
                            >
                                <WaveIcon size={28} className="text-[#00D4FF] mb-2" />
                                <h3 className="text-sm font-semibold text-white mb-1">Invite Your People</h3>
                                <p className="text-xs text-white/50 mb-3">
                                    0G is better with your tribe.
                                </p>
                                <Link
                                    href="/invite"
                                    className="block w-full py-2 rounded-xl bg-[#00D4FF] text-black text-center font-semibold text-sm hover:opacity-90 transition-opacity"
                                >
                                    Send Invites
                                </Link>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
