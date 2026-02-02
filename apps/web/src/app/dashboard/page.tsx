'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePosts } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';
import { FeedFilters, TribeSelector } from '@/components/FeedFilters';
import { FullscreenPostViewer, PostData } from '@/components/FullscreenPostViewer';
import { Six22Logo } from '@/components/Six22Logo';


// Default avatar/image fallbacks
const DEFAULT_AVATARS = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
];

const DEFAULT_IMAGES = [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=1000&fit=crop',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=1000&fit=crop',
];

// ============================================
// FLOWING PATH PATTERN SVG
// Abstract journey-inspired background element
// Subtle, modern, and inclusive
// ============================================
function FlowingPathPattern() {
    return (
        <svg className="absolute inset-0 w-full h-full opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="six22-flow-pattern" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
                    {/* Flowing journey lines - abstract paths */}
                    <g fill="none" stroke="url(#flow-grad)" strokeWidth="0.8" strokeLinecap="round">
                        {/* Main flow */}
                        <path d="M 20 180 Q 50 140, 100 150 T 180 100" opacity="0.5" />
                        <path d="M 0 100 Q 40 80, 80 90 T 160 60 T 200 50" opacity="0.4" />
                        <path d="M 40 200 Q 80 160, 120 170 T 200 140" opacity="0.3" />
                        {/* Subtle dots at waypoints */}
                        <circle cx="100" cy="150" r="2" fill="currentColor" opacity="0.4" />
                        <circle cx="160" cy="60" r="1.5" fill="currentColor" opacity="0.3" />
                    </g>
                </pattern>
                <linearGradient id="flow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="50%" stopColor="#F43F5E" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#six22-flow-pattern)" />
        </svg>
    );
}


// ============================================
// LUMINOUS VOID BACKGROUND
// Premium atmospheric canvas with Six22 identity
// ============================================
function LuminousVoidBackground() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className="fixed inset-0 bg-[#030305]" />;

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
            {/* Deep void base */}
            <div className="absolute inset-0 bg-[#030305]" />

            {/* Subtle Islamic geometric pattern overlay */}
            <FlowingPathPattern />

            {/* Gradient meshes - amber/rose/violet Six22 colors */}
            <motion.div
                className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, rgba(245,158,11,0.06) 40%, transparent 70%)',
                }}
                animate={{
                    scale: [1, 1.15, 1],
                    x: [0, 30, 0],
                    y: [0, 20, 0],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute top-1/3 -right-20 w-[500px] h-[500px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(244,63,94,0.06) 0%, transparent 70%)',
                }}
                animate={{
                    scale: [1.15, 1, 1.15],
                    x: [0, -20, 0],
                }}
                transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute -bottom-20 left-1/3 w-[450px] h-[450px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)',
                }}
                animate={{
                    scale: [1, 1.2, 1],
                    y: [0, -30, 0],
                }}
                transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Horizon line glow */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/25 to-transparent" />
        </div>
    );
}

// ============================================
// TRIBE CONSTELLATION
// Unique hexagonal tribe member display
// ============================================
function TribeConstellation({
    members,
    onMemberClick,
}: {
    members: { name: string; image: string; hasUnread: boolean }[];
    onMemberClick?: (index: number) => void;
}) {
    return (
        <div className="relative py-6">
            {/* Journey path line */}
            <div className="absolute top-1/2 left-0 right-0 h-[1px] -translate-y-1/2">
                <motion.div
                    className="h-full bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                />
            </div>

            {/* Scrollable tribe members */}
            <div className="flex items-center gap-6 overflow-x-auto pb-2 scrollbar-hide px-4 lg:px-6">
                {/* Add to tribe button */}
                <motion.button
                    className="relative flex-shrink-0 group"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <div className="relative w-16 h-16 md:w-20 md:h-20">
                        {/* Hexagonal shape */}
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                            <defs>
                                <linearGradient id="hex-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="rgba(245,158,11,0.3)" />
                                    <stop offset="50%" stopColor="rgba(244,63,94,0.3)" />
                                    <stop offset="100%" stopColor="rgba(139,92,246,0.3)" />
                                </linearGradient>
                            </defs>
                            <polygon
                                points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
                                fill="transparent"
                                stroke="url(#hex-gradient)"
                                strokeWidth="2"
                                strokeDasharray="4 2"
                                className="group-hover:stroke-amber-400 transition-all"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl text-white/60 group-hover:text-amber-400 transition-colors">+</span>
                        </div>
                    </div>
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/40 whitespace-nowrap">
                        Join Tribe
                    </span>
                </motion.button>

                {members.map((member, i) => (
                    <motion.button
                        key={member.name}
                        onClick={() => onMemberClick?.(i)}
                        className="relative flex-shrink-0 group"
                        initial={{ opacity: 0, scale: 0, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.05 + i * 0.03 }}
                        whileHover={{ scale: 1.08, y: -4 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <div className="relative w-16 h-16 md:w-20 md:h-20">
                            {/* Glow ring for unread */}
                            {member.hasUnread && (
                                <motion.div
                                    className="absolute inset-0"
                                    animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.1, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    <svg className="w-full h-full" viewBox="0 0 100 100">
                                        <polygon
                                            points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
                                            fill="transparent"
                                            stroke="url(#hex-gradient)"
                                            strokeWidth="3"
                                            style={{ filter: 'blur(4px)' }}
                                        />
                                    </svg>
                                </motion.div>
                            )}
                            {/* Hexagonal clip for avatar */}
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                                <defs>
                                    <clipPath id={`hex-clip-${i}`}>
                                        <polygon points="50,8 87,28 87,72 50,92 13,72 13,28" />
                                    </clipPath>
                                </defs>
                                <polygon
                                    points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
                                    fill="transparent"
                                    stroke={member.hasUnread ? '#F59E0B' : 'rgba(255,255,255,0.15)'}
                                    strokeWidth="2"
                                    className="group-hover:stroke-white/40 transition-colors"
                                />
                                <image
                                    href={member.image}
                                    x="8"
                                    y="8"
                                    width="84"
                                    height="84"
                                    clipPath={`url(#hex-clip-${i})`}
                                    preserveAspectRatio="xMidYMid slice"
                                />
                            </svg>
                        </div>
                        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/50 whitespace-nowrap group-hover:text-white/80 transition-colors">
                            {member.name}
                        </span>
                    </motion.button>
                ))}

                {/* Find more tribes */}
                <Link href="/explore?tab=tribes" className="relative flex-shrink-0 group">
                    <motion.div
                        className="relative w-16 h-16 md:w-20 md:h-20"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                            <polygon
                                points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
                                fill="rgba(139,92,246,0.1)"
                                stroke="rgba(139,92,246,0.3)"
                                strokeWidth="2"
                                className="group-hover:fill-violet-500/20 group-hover:stroke-violet-400 transition-all"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl">🔍</span>
                        </div>
                    </motion.div>
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white/40 whitespace-nowrap">
                        Explore
                    </span>
                </Link>
            </div>
        </div>
    );
}

// ============================================
// MOMENT CARD - Unique Six22 post design
// Octagonal corners, journey metaphor
// ============================================
function MomentCard({
    post,
    delay = 0,
    onClick,
    variant = 'standard',
}: {
    post: {
        author: string;
        avatar: string;
        image: string;
        caption: string;
        likes: number;
        time: string;
    };
    delay?: number;
    onClick: () => void;
    variant?: 'standard' | 'featured' | 'compact';
}) {
    const [isLiked, setIsLiked] = useState(false);

    return (
        <motion.article
            className="relative cursor-pointer group"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay }}
            whileHover={{ y: -6 }}
            onClick={onClick}
        >
            {/* Card with chamfered corners (Islamic geometric reference) */}
            <div
                className="relative overflow-hidden bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm transition-all duration-500 group-hover:from-white/[0.06]"
                style={{
                    clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px)',
                }}
            >
                {/* Decorative corner accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-l border-t border-amber-500/20 group-hover:border-amber-400/40 transition-colors" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
                <div className="absolute top-0 right-0 w-8 h-8 border-r border-t border-rose-500/20 group-hover:border-rose-400/40 transition-colors" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }} />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-l border-b border-violet-500/20 group-hover:border-violet-400/40 transition-colors" style={{ clipPath: 'polygon(0 0, 0 100%, 100% 100%)' }} />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-r border-b border-amber-500/20 group-hover:border-amber-400/40 transition-colors" style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }} />

                {/* Border glow on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute inset-0 border border-white/10" style={{
                        clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px)',
                    }} />
                </div>

                {/* Image */}
                <div className={`relative ${variant === 'compact' ? 'aspect-square' : 'aspect-[4/5]'} overflow-hidden`}>
                    <Image
                        src={post.image}
                        alt={`Moment by ${post.author}`}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    {/* Gradient overlay with Six22 colors */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Author info */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="flex items-center gap-3 mb-2">
                            {/* Hexagonal avatar mini */}
                            <div className="relative w-10 h-10 flex-shrink-0">
                                <svg className="w-full h-full" viewBox="0 0 40 40">
                                    <defs>
                                        <clipPath id={`mini-hex-${post.author}`}>
                                            <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" />
                                        </clipPath>
                                    </defs>
                                    <polygon
                                        points="20,1 37,11 37,29 20,39 3,29 3,11"
                                        fill="transparent"
                                        stroke="rgba(255,255,255,0.3)"
                                        strokeWidth="1"
                                    />
                                    <image
                                        href={post.avatar}
                                        x="2"
                                        y="2"
                                        width="36"
                                        height="36"
                                        clipPath={`url(#mini-hex-${post.author})`}
                                        preserveAspectRatio="xMidYMid slice"
                                    />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold text-white text-sm truncate">{post.author}</p>
                                <p className="text-[10px] text-white/50">{post.time}</p>
                            </div>
                        </div>
                        <p className="text-xs text-white/70 line-clamp-2">{post.caption}</p>
                    </div>
                </div>

                {/* Actions bar with tribal styling */}
                <div className="flex items-center justify-between p-3 bg-black/40 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsLiked(!isLiked); }}
                            className="flex items-center gap-1.5 group/btn"
                        >
                            <motion.span
                                className="text-lg"
                                animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
                                transition={{ duration: 0.3 }}
                            >
                                {isLiked ? '🔥' : '🤍'}
                            </motion.span>
                        </button>
                        <button className="text-lg opacity-70 hover:opacity-100 transition-opacity">💬</button>
                        <button className="text-lg opacity-70 hover:opacity-100 transition-opacity">↗</button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/50">
                        <span>{post.likes.toLocaleString()}</span>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span>Ignited</span>
                    </div>
                </div>
            </div>
        </motion.article>
    );
}

// ============================================
// JOURNEY HEADER - Six22 branded header
// ============================================
function JourneyHeader({ onCreateClick }: { onCreateClick: () => void }) {
    return (
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/40 border-b border-white/5">
            <div className="max-w-6xl mx-auto px-4 lg:px-6 py-3 lg:py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="relative w-10 h-10">
                            {/* Hexagonal logo container */}
                            <svg className="w-full h-full" viewBox="0 0 40 40">
                                <defs>
                                    <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#F59E0B" />
                                        <stop offset="50%" stopColor="#F43F5E" />
                                        <stop offset="100%" stopColor="#8B5CF6" />
                                    </linearGradient>
                                </defs>
                                <polygon
                                    points="20,2 36,11 36,29 20,38 4,29 4,11"
                                    fill="url(#logo-gradient)"
                                    className="group-hover:opacity-90 transition-opacity"
                                />
                                <text
                                    x="20"
                                    y="24"
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize="12"
                                    fontWeight="bold"
                                >
                                    6
                                </text>
                            </svg>
                        </div>
                        <div className="hidden md:block">
                            <span className="text-lg font-semibold bg-gradient-to-r from-amber-400 via-rose-400 to-violet-400 bg-clip-text text-transparent">
                                Six22
                            </span>
                            <p className="text-[10px] text-white/40 -mt-0.5">Start a New Chapter</p>
                        </div>
                    </Link>

                    {/* Center - Search (desktop) */}
                    <div className="hidden lg:flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 w-80 group hover:border-white/20 transition-colors">
                        <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search tribes, moments, people..."
                            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
                        />
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-2 md:gap-3">
                        <button className="relative p-2 rounded-full hover:bg-white/5 transition-colors">
                            <span className="text-xl">🔔</span>
                            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
                        </button>
                        <button
                            onClick={onCreateClick}
                            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-violet-500 text-white font-medium text-sm hover:opacity-90 transition-opacity"
                        >
                            <span>✨</span>
                            <span>Share Moment</span>
                        </button>
                        <Link href="/profile" className="relative w-9 h-9">
                            <svg className="w-full h-full" viewBox="0 0 36 36">
                                <defs>
                                    <clipPath id="profile-hex">
                                        <polygon points="18,2 32,10 32,26 18,34 4,26 4,10" />
                                    </clipPath>
                                </defs>
                                <polygon
                                    points="18,1 33,10 33,26 18,35 3,26 3,10"
                                    fill="transparent"
                                    stroke="rgba(255,255,255,0.2)"
                                    strokeWidth="1"
                                />
                                <image
                                    href="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
                                    x="2"
                                    y="2"
                                    width="32"
                                    height="32"
                                    clipPath="url(#profile-hex)"
                                    preserveAspectRatio="xMidYMid slice"
                                />
                            </svg>
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
}

// ============================================
// NAVIGATION DOCK - Hexagonal floating nav
// ============================================
function NavigationDock({ onCreateClick, activeTab }: { onCreateClick: () => void; activeTab: string }) {
    const navItems = [
        { id: 'home', icon: '🏠', label: 'Home', href: '/dashboard' },
        { id: 'explore', icon: '🔍', label: 'Explore', href: '/explore' },
        { id: 'journeys', icon: '🎬', label: 'Journeys', href: '/journeys' },
        { id: 'campfire', icon: '🔥', label: 'Live', href: '/campfire' },
        { id: 'messages', icon: '💬', label: 'Messages', href: '/messages', notification: true },
    ];

    return (
        <>
            {/* Desktop sidebar */}
            <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 xl:w-64 bg-black/40 backdrop-blur-xl border-r border-white/5 flex-col p-4 z-40">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 px-1 py-4 mb-6">
                    <Six22Logo size="md" variant="full" animated={false} className="xl:hidden" />
                    <Six22Logo size="lg" variant="full" animated={false} className="hidden xl:flex" />
                </Link>

                {/* Nav items */}
                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === item.id
                                ? 'bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-violet-500/20 text-white border border-white/10'
                                : 'text-white/60 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <span className="text-2xl relative">
                                {item.icon}
                                {item.notification && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full" />
                                )}
                            </span>
                            <span className="font-medium hidden xl:block">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                {/* Create button */}
                <button
                    onClick={onCreateClick}
                    className="flex items-center justify-center xl:justify-start gap-3 w-full px-3 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-rose-500 to-violet-500 text-white font-semibold hover:opacity-90 transition-opacity"
                >
                    <span className="text-xl">✨</span>
                    <span className="hidden xl:block">Share Moment</span>
                </button>

                {/* Profile link */}
                <Link href="/profile" className="flex items-center gap-3 px-3 py-4 mt-4 border-t border-white/10">
                    <div className="relative w-10 h-10 flex-shrink-0">
                        <svg className="w-full h-full" viewBox="0 0 40 40">
                            <defs>
                                <clipPath id="sidebar-avatar">
                                    <polygon points="20,3 35,12 35,28 20,37 5,28 5,12" />
                                </clipPath>
                            </defs>
                            <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="transparent" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                            <image
                                href="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
                                x="3"
                                y="3"
                                width="34"
                                height="34"
                                clipPath="url(#sidebar-avatar)"
                                preserveAspectRatio="xMidYMid slice"
                            />
                        </svg>
                    </div>
                    <div className="hidden xl:block">
                        <p className="font-semibold text-white text-sm">Abu Jawad</p>
                        <p className="text-xs text-white/50">@abujawad</p>
                    </div>
                </Link>
            </aside>

            {/* Mobile bottom nav */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 z-50 safe-area-pb">
                <div className="flex items-center justify-around py-2">
                    {navItems.slice(0, 2).map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 p-2 ${activeTab === item.id ? 'text-amber-400' : 'text-white/50'}`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="text-[10px]">{item.label}</span>
                        </Link>
                    ))}

                    {/* Create button */}
                    <button
                        onClick={onCreateClick}
                        className="flex items-center justify-center w-14 h-14 -mt-6 rounded-full bg-gradient-to-br from-amber-400 via-rose-500 to-violet-500 shadow-lg shadow-rose-500/30"
                        style={{
                            clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                        }}
                    >
                        <span className="text-white text-2xl">+</span>
                    </button>

                    {navItems.slice(2, 4).map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 p-2 relative ${activeTab === item.id ? 'text-amber-400' : 'text-white/50'}`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="text-[10px]">{item.label}</span>
                            {item.notification && (
                                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
                            )}
                        </Link>
                    ))}
                </div>
            </nav>
        </>
    );
}

// ============================================
// CREATE MODAL
// ============================================
function CreateModal({
    isOpen,
    onClose,
    onPost
}: {
    isOpen: boolean;
    onClose: () => void;
    onPost: (content: string, file?: File) => Promise<{ success: boolean; error?: string }>;
}) {
    const [preview, setPreview] = useState<string | null>(null);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [caption, setCaption] = useState('');
    const [isStory, setIsStory] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setPreview(null);
            setMediaFile(null);
            setCaption('');
            setIsStory(false);
            setIsSubmitting(false);
            setError(null);
            setIsDragging(false);
        }
    }, [isOpen]);

    const handleFileSelect = (file: File) => {
        if (file) {
            setMediaFile(file);
            setPreview(URL.createObjectURL(file));
            setError(null);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
                handleFileSelect(file);
            } else {
                setError('Please drop an image or video file');
            }
        }
    };

    const handleShare = async () => {
        if (!caption.trim() && !mediaFile) {
            setError('Please add a photo/video or write something');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const result = await onPost(caption, mediaFile || undefined);

        if (result.success) {
            onClose();
        } else {
            setError(result.error || 'Failed to create post');
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <motion.div
                className="relative w-full max-w-lg bg-[#0a0a0f] border border-white/10 overflow-hidden"
                style={{
                    clipPath: 'polygon(20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px), 0 20px)',
                }}
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 25 }}
            >
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <button onClick={onClose} disabled={isSubmitting} className="text-white/50 hover:text-white transition-colors">
                        Cancel
                    </button>
                    <h2 className="font-semibold text-white">{isStory ? 'Share Story' : 'Share Moment'}</h2>
                    <button
                        onClick={handleShare}
                        disabled={isSubmitting || (!caption.trim() && !mediaFile)}
                        className={`font-semibold transition-colors ${isSubmitting || (!caption.trim() && !mediaFile) ? 'text-white/30 cursor-not-allowed' : 'text-amber-400 hover:text-amber-300'}`}
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                                Sharing
                            </span>
                        ) : (
                            'Share'
                        )}
                    </button>
                </div>

                <div className="flex gap-2 p-4 border-b border-white/10">
                    <button
                        onClick={() => setIsStory(false)}
                        className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${!isStory ? 'bg-gradient-to-r from-amber-400 to-rose-500 text-white' : 'bg-white/10 text-white/60'}`}
                    >
                        Moment
                    </button>
                    <button
                        onClick={() => setIsStory(true)}
                        className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${isStory ? 'bg-gradient-to-r from-rose-400 to-violet-500 text-white' : 'bg-white/10 text-white/60'}`}
                    >
                        Story
                    </button>
                </div>

                {error && (
                    <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {!preview ? (
                    <div className="p-6">
                        <div
                            className={`flex flex-col items-center justify-center min-h-[250px] border-2 border-dashed transition-colors ${isDragging ? 'border-amber-400 bg-amber-400/10' : 'border-white/20 hover:border-white/30'}`}
                            style={{
                                clipPath: 'polygon(16px 0, calc(100% - 16px) 0, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0 calc(100% - 16px), 0 16px)',
                            }}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <span className="text-5xl mb-4">{isStory ? '📱' : '✨'}</span>
                            <p className="text-white/50 mb-4 text-center px-4">
                                {isDragging ? 'Drop your moment here!' : 'Drag & drop your photos or videos'}
                            </p>
                            <label className="px-6 py-3 rounded-full bg-gradient-to-r from-amber-400 to-rose-500 text-white font-semibold cursor-pointer hover:opacity-90 transition-opacity">
                                Choose File
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileSelect(file);
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                ) : (
                    <div className="p-4">
                        <div className="relative aspect-square overflow-hidden mb-4" style={{
                            clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px)',
                        }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                            <button
                                onClick={() => { if (preview) URL.revokeObjectURL(preview); setPreview(null); setMediaFile(null); }}
                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        {!isStory && (
                            <textarea
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="What's your story?"
                                className="w-full bg-white/5 rounded-xl p-3 text-white placeholder:text-white/30 resize-none focus:outline-none focus:bg-white/10 transition-colors"
                                rows={3}
                            />
                        )}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

// ============================================
// MAIN DASHBOARD
// ============================================
export default function DashboardPage() {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
    const [fullscreenIndex, setFullscreenIndex] = useState<number>(-1);
    const [activeFilter, setActiveFilter] = useState('all');
    const [activeTribe, setActiveTribe] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { posts: apiPosts, friends: apiFriends, isLoading, likePost, loadMore, hasMore, createPost } = usePosts();
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login?error=auth_required');
        }
    }, [authLoading, isAuthenticated, router]);

    // Wrapper for createPost that checks auth first
    const handleCreatePost = useCallback(async (content: string, file?: File): Promise<{ success: boolean; error?: string }> => {
        if (!isAuthenticated) {
            return { success: false, error: 'Authentication required. Please log in again.' };
        }
        return createPost(content, file);
    }, [isAuthenticated, createPost]);
    const tribes = [
        { id: 'tech', name: 'Tech Builders', icon: '💻' },
        { id: 'fitness', name: 'Fitness Tribe', icon: '💪' },
        { id: 'art', name: 'Creatives', icon: '🎨' },
        { id: 'faith', name: 'Faith Community', icon: '🕌' },
    ];

    const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading) {
            loadMore();
        }
    }, [hasMore, isLoading, loadMore]);

    useEffect(() => {
        const observer = new IntersectionObserver(handleObserver, {
            root: null,
            rootMargin: '200px',
            threshold: 0,
        });

        const currentRef = loadMoreRef.current;
        if (currentRef) observer.observe(currentRef);

        return () => {
            if (currentRef) observer.unobserve(currentRef);
        };
    }, [handleObserver]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const friends = apiFriends.length > 0 ? apiFriends.map((f, i) => ({
        name: f.displayName || f.username,
        image: f.avatarUrl || DEFAULT_AVATARS[i % DEFAULT_AVATARS.length],
        hasUnread: f.hasStory,
    })) : [
        { name: 'Sarah', image: DEFAULT_AVATARS[0], hasUnread: true },
        { name: 'Marcus', image: DEFAULT_AVATARS[1], hasUnread: true },
        { name: 'Emily', image: DEFAULT_AVATARS[2], hasUnread: true },
        { name: 'Jordan', image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=face', hasUnread: false },
        { name: 'Alex', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=face', hasUnread: false },
    ];

    const posts = apiPosts.length > 0 ? apiPosts.map((p, i) => ({
        id: p.id,
        author: p.author.displayName || p.author.username,
        avatar: p.author.avatarUrl || DEFAULT_AVATARS[i % DEFAULT_AVATARS.length],
        image: p.mediaUrl || DEFAULT_IMAGES[i % DEFAULT_IMAGES.length],
        caption: p.content,
        likes: p.likes,
        time: formatTimeAgo(p.createdAt),
        isLiked: p.isLiked,
    })) : [
        { id: 'mock-1', author: 'Sarah Chen', avatar: DEFAULT_AVATARS[0], image: DEFAULT_IMAGES[0], caption: 'Found this magical spot in the mountains ✨ The journey was worth every step.', likes: 1247, time: '2h ago' },
        { id: 'mock-2', author: 'Marcus Johnson', avatar: DEFAULT_AVATARS[1], image: DEFAULT_IMAGES[1], caption: 'Family time is the best time. Building memories that last forever 👨‍👩‍👧‍👦', likes: 2150, time: '5h ago' },
        { id: 'mock-3', author: 'Emily Rose', avatar: DEFAULT_AVATARS[2], image: DEFAULT_IMAGES[2], caption: 'Trying something new today. What do you think?', likes: 892, time: '8h ago' },
    ];

    function formatTimeAgo(dateStr: string): string {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    }

    // Show loading while checking auth
    if (!mounted || authLoading) {
        return (
            <div className="min-h-screen bg-[#030305] flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent animate-spin" style={{
                    clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                }} />
            </div>
        );
    }

    // Don't render if not authenticated (redirect will happen)
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#030305] flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent animate-spin" style={{
                    clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                }} />
            </div>
        );
    }

    return (
        <div className="min-h-screen relative">
            <LuminousVoidBackground />

            <NavigationDock onCreateClick={() => setShowCreateModal(true)} activeTab="home" />

            <main className="relative z-10 lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
                {/* Mobile Header */}
                <header className="lg:hidden sticky top-0 z-40 px-4 py-3 bg-black/60 backdrop-blur-xl border-b border-white/5">
                    <div className="flex items-center justify-between">
                        <Six22Logo size="sm" variant="minimal" animated={false} />
                        <div className="flex items-center gap-3">
                            <button className="relative">
                                <span className="text-xl">🔔</span>
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />
                            </button>
                            <Link href="/profile" className="w-8 h-8">
                                <svg className="w-full h-full" viewBox="0 0 32 32">
                                    <defs>
                                        <clipPath id="mobile-avatar">
                                            <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" />
                                        </clipPath>
                                    </defs>
                                    <polygon points="16,1 30,9 30,23 16,31 2,23 2,9" fill="transparent" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                                    <image
                                        href="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
                                        x="1"
                                        y="1"
                                        width="30"
                                        height="30"
                                        clipPath="url(#mobile-avatar)"
                                        preserveAspectRatio="xMidYMid slice"
                                    />
                                </svg>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Desktop header */}
                <header className="hidden lg:block sticky top-0 z-30 px-6 py-4 bg-black/40 backdrop-blur-xl border-b border-white/5">
                    <div className="max-w-5xl mx-auto flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-white">Your Journey</h1>
                            <p className="text-xs text-white/40">Continue where you left off</p>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 w-80">
                            <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search tribes, moments, people..."
                                className="flex-1 bg-transparent text-white text-sm placeholder:text-white/40 focus:outline-none"
                            />
                        </div>
                        <button className="relative">
                            <span className="text-xl">🔔</span>
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />
                        </button>
                    </div>
                </header>

                {/* Tribe Constellation */}
                <section className="border-b border-white/5">
                    <div className="max-w-5xl mx-auto">
                        <TribeConstellation members={friends} />
                    </div>
                </section>

                {/* Feed Filters */}
                <section className="border-b border-white/5 py-3">
                    <FeedFilters
                        activeFilter={activeFilter}
                        onFilterChange={setActiveFilter}
                        className="max-w-5xl mx-auto"
                    />

                    {activeFilter === 'tribes' && (
                        <TribeSelector
                            tribes={tribes}
                            activeTribe={activeTribe}
                            onTribeChange={setActiveTribe}
                            className="max-w-5xl mx-auto mt-3"
                        />
                    )}
                </section>

                {/* Moments Grid */}
                <section className="px-4 lg:px-6 py-6 lg:py-8">
                    <div className="max-w-5xl mx-auto">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6">
                            {posts.map((post, i) => (
                                <MomentCard
                                    key={post.id || post.author + i}
                                    post={post}
                                    delay={0.1 + i * 0.05}
                                    onClick={() => setFullscreenIndex(i)}
                                />
                            ))}
                        </div>

                        <div ref={loadMoreRef} className="py-8 flex justify-center">
                            {isLoading && (
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent animate-spin" style={{
                                        clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                                    }} />
                                    <span className="text-white/50 text-sm">Discovering more moments...</span>
                                </div>
                            )}
                            {!hasMore && posts.length > 0 && (
                                <p className="text-white/30 text-sm">You&apos;ve seen all moments ✨</p>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            <AnimatePresence>
                {showCreateModal && (
                    <CreateModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onPost={handleCreatePost} />
                )}
                {fullscreenIndex >= 0 && (
                    <FullscreenPostViewer
                        posts={posts}
                        initialIndex={fullscreenIndex}
                        isOpen={fullscreenIndex >= 0}
                        onClose={() => setFullscreenIndex(-1)}
                        onLike={(index) => {
                            const post = posts[index];
                            if (post?.id) likePost(post.id);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
