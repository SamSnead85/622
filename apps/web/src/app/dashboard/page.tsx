'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePosts } from '@/hooks';
import { FeedFilters, TribeSelector, DEFAULT_FEED_FILTERS } from '@/components/FeedFilters';
import { FullscreenPostViewer, PostData } from '@/components/FullscreenPostViewer';

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
// AMBIENT CAMPFIRE BACKGROUND
// ============================================
function CampfireBackground() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className="fixed inset-0 bg-[#050508]" />;

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-[#050508]" />
            <div className="absolute inset-0 bg-gradient-to-t from-orange-950/20 via-transparent to-transparent" />
            <motion.div
                className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-violet-500/5 blur-[100px]"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute top-20 right-1/4 w-80 h-80 rounded-full bg-cyan-500/5 blur-[100px]"
                animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            />
        </div>
    );
}

// ============================================
// FRIEND ORB
// ============================================
function FriendOrb({
    name,
    image,
    hasUnread = false,
    delay = 0,
    onClick,
}: {
    name: string;
    image: string;
    hasUnread?: boolean;
    delay?: number;
    onClick?: () => void;
}) {
    return (
        <motion.button
            onClick={onClick}
            className="relative flex flex-col items-center gap-2 flex-shrink-0"
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay }}
            whileHover={{ scale: 1.1, y: -5 }}
            whileTap={{ scale: 0.95 }}
        >
            {hasUnread && (
                <motion.div
                    className="absolute inset-0 w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-orange-400 via-rose-500 to-violet-500"
                    style={{ filter: 'blur(8px)' }}
                    animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            )}
            <div className={`relative w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden ring-2 ${hasUnread ? 'ring-orange-400' : 'ring-white/10'}`}>
                <Image src={image} alt={name} fill className="object-cover" />
            </div>
            <span className="text-[10px] md:text-xs text-white/60 truncate max-w-14 md:max-w-16">{name}</span>
        </motion.button>
    );
}

// ============================================
// POST DETAIL MODAL
// ============================================
function PostDetailModal({
    post,
    isOpen,
    onClose
}: {
    post: {
        author: string;
        avatar: string;
        image: string;
        caption: string;
        likes: number;
        time: string;
    } | null;
    isOpen: boolean;
    onClose: () => void;
}) {
    const [isLiked, setIsLiked] = useState(false);
    const [comment, setComment] = useState('');

    if (!isOpen || !post) return null;

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="absolute inset-0 bg-black/90" onClick={onClose} />

            <motion.div
                className="relative w-full max-w-4xl max-h-[90vh] bg-[#0a0a0f] rounded-2xl md:rounded-3xl overflow-hidden flex flex-col md:flex-row"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 25 }}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                    ✕
                </button>

                {/* Image */}
                <div className="relative aspect-square md:w-1/2 md:aspect-auto md:h-auto flex-shrink-0">
                    <Image src={post.image} alt={`Post by ${post.author}`} fill className="object-cover" />
                </div>

                {/* Details */}
                <div className="flex flex-col flex-1 max-h-[50vh] md:max-h-none">
                    {/* Header */}
                    <div className="flex items-center gap-3 p-4 border-b border-white/10">
                        <div className="w-10 h-10 rounded-full overflow-hidden relative">
                            <Image src={post.avatar} alt={post.author} fill className="object-cover" />
                        </div>
                        <div>
                            <p className="font-semibold text-white">{post.author}</p>
                            <p className="text-xs text-white/50">{post.time}</p>
                        </div>
                    </div>

                    {/* Caption & Comments */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <p className="text-white/80 mb-4">{post.caption}</p>

                        {/* Fake comments */}
                        <div className="space-y-3">
                            {['Amazing shot! 📸', 'Love this so much!', 'Where is this?? 😍'].map((c, i) => (
                                <div key={i} className="flex gap-2">
                                    <div className="w-8 h-8 rounded-full bg-white/10" />
                                    <div>
                                        <span className="font-semibold text-white text-sm">user{i + 1}</span>
                                        <span className="text-white/60 text-sm ml-2">{c}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 border-t border-white/10">
                        <div className="flex items-center gap-4 mb-3">
                            <button onClick={() => setIsLiked(!isLiked)} className="text-2xl">
                                {isLiked ? '🔥' : '🤍'}
                            </button>
                            <button className="text-2xl">💬</button>
                            <button className="text-2xl">📤</button>
                            <span className="ml-auto text-white/50">{post.likes.toLocaleString()} likes</span>
                        </div>

                        {/* Comment input */}
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Add a comment..."
                                className="flex-1 bg-white/5 rounded-full px-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:bg-white/10 transition-colors"
                            />
                            <button className="text-orange-400 font-semibold">Post</button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================
// CONTENT CARD
// ============================================
function ContentCard({
    post,
    delay = 0,
    onClick,
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
}) {
    const [isLiked, setIsLiked] = useState(false);

    return (
        <motion.div
            className="relative cursor-pointer group"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay }}
            whileHover={{ y: -4 }}
            onClick={onClick}
        >
            <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl transition-all duration-300 group-hover:border-white/20 group-hover:shadow-2xl">
                <div className="relative aspect-[4/5] overflow-hidden">
                    <Image
                        src={post.image}
                        alt={`Post by ${post.author}`}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Author overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                        <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden relative ring-2 ring-white/20">
                                <Image src={post.avatar} alt={post.author} fill className="object-cover" />
                            </div>
                            <div>
                                <p className="font-semibold text-white text-sm md:text-base">{post.author}</p>
                                <p className="text-[10px] md:text-xs text-white/50">{post.time}</p>
                            </div>
                        </div>
                        <p className="text-xs md:text-sm text-white/80 line-clamp-2">{post.caption}</p>
                    </div>
                </div>

                {/* Quick actions bar */}
                <div className="flex items-center justify-between p-3 md:p-4 bg-black/30">
                    <div className="flex items-center gap-3 md:gap-4">
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsLiked(!isLiked); }}
                            className="text-lg md:text-xl"
                        >
                            {isLiked ? '🔥' : '🤍'}
                        </button>
                        <span className="text-lg md:text-xl">💬</span>
                    </div>
                    <span className="text-xs md:text-sm text-white/50">{post.likes.toLocaleString()}</span>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// CREATE MODAL
// ============================================
function CreateModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [preview, setPreview] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [isStory, setIsStory] = useState(false);

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
                className="relative w-full max-w-lg bg-[#0a0a0f] rounded-2xl md:rounded-3xl border border-white/10 overflow-hidden"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 25 }}
            >
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">Cancel</button>
                    <h2 className="font-semibold text-white">{isStory ? 'Add Story' : 'Create Post'}</h2>
                    <button className="text-orange-400 font-semibold hover:text-orange-300 transition-colors">Share</button>
                </div>

                {/* Toggle */}
                <div className="flex gap-2 p-4 border-b border-white/10">
                    <button
                        onClick={() => setIsStory(false)}
                        className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${!isStory ? 'bg-white text-black' : 'bg-white/10 text-white'}`}
                    >
                        Post
                    </button>
                    <button
                        onClick={() => setIsStory(true)}
                        className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${isStory ? 'bg-gradient-to-r from-orange-400 to-rose-500 text-white' : 'bg-white/10 text-white'}`}
                    >
                        Story
                    </button>
                </div>

                {!preview ? (
                    <div className="p-6 md:p-8">
                        <div className="flex flex-col items-center justify-center min-h-[250px] md:min-h-[300px] border-2 border-dashed border-white/20 rounded-2xl hover:border-white/30 transition-colors">
                            <span className="text-5xl md:text-6xl mb-4">{isStory ? '📱' : '📸'}</span>
                            <p className="text-white/50 mb-4 text-center px-4">
                                {isStory ? 'Share a moment with your friends' : 'Drop your content here'}
                            </p>
                            <label className="px-6 py-3 rounded-full bg-gradient-to-r from-orange-400 to-rose-500 text-white font-semibold cursor-pointer hover:opacity-90 transition-opacity">
                                Choose File
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setPreview(URL.createObjectURL(file));
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                ) : (
                    <div className="p-4">
                        <div className="relative aspect-square rounded-2xl overflow-hidden mb-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                            <button
                                onClick={() => setPreview(null)}
                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        {!isStory && (
                            <textarea
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Write a caption..."
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
// NAVIGATION DOCK
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
                <Link href="/" className="flex items-center gap-3 px-3 py-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-lg">C</span>
                    </div>
                    <span className="text-xl font-semibold text-white hidden xl:block">Six22</span>
                </Link>

                {/* Nav */}
                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === item.id
                                ? 'bg-white/10 text-white'
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
                    className="flex items-center justify-center xl:justify-start gap-3 w-full px-3 py-3 rounded-xl bg-gradient-to-r from-orange-400 via-rose-500 to-violet-500 text-white font-semibold hover:opacity-90 transition-opacity"
                >
                    <span className="text-xl">✨</span>
                    <span className="hidden xl:block">Create</span>
                </button>

                {/* Profile */}
                <Link href="/profile" className="flex items-center gap-3 px-3 py-4 mt-4 border-t border-white/10">
                    <div className="w-10 h-10 rounded-full overflow-hidden relative ring-2 ring-white/20">
                        <Image
                            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
                            alt="Profile"
                            fill
                            className="object-cover"
                        />
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
                            className={`flex flex-col items-center gap-1 p-2 ${activeTab === item.id ? 'text-white' : 'text-white/50'}`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="text-[10px]">{item.label}</span>
                        </Link>
                    ))}

                    {/* Create button */}
                    <button
                        onClick={onCreateClick}
                        className="flex items-center justify-center w-14 h-14 -mt-6 rounded-full bg-gradient-to-br from-orange-400 via-rose-500 to-violet-500 shadow-lg shadow-rose-500/30"
                    >
                        <span className="text-white text-2xl">+</span>
                    </button>

                    {navItems.slice(2, 4).map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 p-2 relative ${activeTab === item.id ? 'text-white' : 'text-white/50'}`}
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
// MAIN DASHBOARD
// ============================================
export default function DashboardPage() {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
    const [fullscreenIndex, setFullscreenIndex] = useState<number>(-1);
    const [activeFilter, setActiveFilter] = useState('all');
    const [activeTribe, setActiveTribe] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const { posts: apiPosts, friends: apiFriends, isLoading, likePost, loadMore, hasMore } = usePosts();
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Mock tribes for demo
    const tribes = [
        { id: 'tech', name: 'Tech Builders', icon: '💻' },
        { id: 'fitness', name: 'Fitness Tribe', icon: '💪' },
        { id: 'art', name: 'Creatives', icon: '🎨' },
        { id: 'faith', name: 'Faith Community', icon: '🕌' },
    ];

    // Infinite scroll using IntersectionObserver
    const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading) {
            loadMore();
        }
    }, [hasMore, isLoading, loadMore]);

    useEffect(() => {
        const observer = new IntersectionObserver(handleObserver, {
            root: null,
            rootMargin: '200px', // Start loading 200px before reaching bottom
            threshold: 0,
        });

        const currentRef = loadMoreRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [handleObserver]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Convert API posts to display format, or use mock data as fallback
    const friends = apiFriends.length > 0 ? apiFriends.map((f, i) => ({
        name: f.displayName || f.username,
        image: f.avatarUrl || DEFAULT_AVATARS[i % DEFAULT_AVATARS.length],
        hasUnread: f.hasStory,
    })) : [
        { name: 'Sarah', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face', hasUnread: true },
        { name: 'Marcus', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face', hasUnread: true },
        { name: 'Emily', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face', hasUnread: true },
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
        { id: 'mock-1', author: 'Sarah Chen', avatar: DEFAULT_AVATARS[0], image: DEFAULT_IMAGES[0], caption: 'Found this magical spot ✨', likes: 1247, time: '2h ago' },
        { id: 'mock-2', author: 'Marcus Johnson', avatar: DEFAULT_AVATARS[1], image: DEFAULT_IMAGES[1], caption: 'Family time is the best time 👨‍👩‍👧‍👦', likes: 2150, time: '5h ago' },
    ];

    // Helper to format time
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

    if (!mounted) {
        return (
            <div className="min-h-screen bg-[#050508] flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen relative">
            <CampfireBackground />

            <NavigationDock onCreateClick={() => setShowCreateModal(true)} activeTab="home" />

            {/* Main Content */}
            <main className="relative z-10 lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
                {/* Mobile Header */}
                <header className="lg:hidden sticky top-0 z-40 px-4 py-3 bg-black/60 backdrop-blur-xl border-b border-white/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
                                <span className="text-white font-bold">C</span>
                            </div>
                            <span className="text-lg font-semibold text-white">Six22</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="relative">
                                <span className="text-xl">🔔</span>
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />
                            </button>
                            <Link href="/profile" className="w-8 h-8 rounded-full overflow-hidden relative">
                                <Image
                                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
                                    alt="Profile"
                                    fill
                                    className="object-cover"
                                />
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Desktop header with search */}
                <header className="hidden lg:block sticky top-0 z-30 px-6 py-4 bg-black/40 backdrop-blur-xl border-b border-white/5">
                    <div className="max-w-5xl mx-auto flex items-center justify-between">
                        <h1 className="text-xl font-semibold text-white">Home</h1>
                        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 w-80">
                            <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search..."
                                className="flex-1 bg-transparent text-white text-sm placeholder:text-white/40 focus:outline-none"
                            />
                        </div>
                        <button className="relative">
                            <span className="text-xl">🔔</span>
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />
                        </button>
                    </div>
                </header>

                {/* Stories/Friends Row */}
                <section className="px-4 lg:px-6 py-4 lg:py-6 border-b border-white/5">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex items-center gap-4 lg:gap-6 overflow-x-auto pb-2 scrollbar-hide">
                            {/* Add Story */}
                            <motion.button
                                onClick={() => setShowCreateModal(true)}
                                className="flex flex-col items-center gap-2 flex-shrink-0"
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-orange-400/30 to-rose-500/30 flex items-center justify-center border-2 border-dashed border-white/30 hover:border-white/50 transition-colors">
                                    <span className="text-xl md:text-2xl text-white">+</span>
                                </div>
                                <span className="text-[10px] md:text-xs text-white/60">Add story</span>
                            </motion.button>

                            {friends.map((friend, i) => (
                                <FriendOrb key={friend.name} {...friend} delay={0.05 + i * 0.03} />
                            ))}

                            {/* Find Friends button */}
                            <Link
                                href="/explore?tab=people"
                                className="flex flex-col items-center gap-2 flex-shrink-0"
                            >
                                <motion.div
                                    className="relative w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/10 flex items-center justify-center border border-white/20 hover:bg-white/15 transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <span className="text-xl md:text-2xl">🔍</span>
                                </motion.div>
                                <span className="text-[10px] md:text-xs text-white/60">Find Friends</span>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Feed Filters */}
                <section className="border-b border-white/5 py-3">
                    <FeedFilters
                        activeFilter={activeFilter}
                        onFilterChange={setActiveFilter}
                        className="max-w-5xl mx-auto"
                    />

                    {/* Tribe sub-selector (shows when Tribes filter active) */}
                    {activeFilter === 'tribes' && (
                        <TribeSelector
                            tribes={tribes}
                            activeTribe={activeTribe}
                            onTribeChange={setActiveTribe}
                            className="max-w-5xl mx-auto mt-3"
                        />
                    )}
                </section>

                {/* Content Grid */}
                <section className="px-4 lg:px-6 py-6 lg:py-8">
                    <div className="max-w-5xl mx-auto">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
                            {posts.map((post, i) => (
                                <ContentCard
                                    key={post.author + i}
                                    post={post}
                                    delay={0.1 + i * 0.05}
                                    onClick={() => setFullscreenIndex(i)}
                                />
                            ))}
                        </div>

                        {/* Infinite scroll trigger */}
                        <div ref={loadMoreRef} className="py-8 flex justify-center">
                            {isLoading && (
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
                                    <span className="text-white/50 text-sm">Loading more posts...</span>
                                </div>
                            )}
                            {!hasMore && posts.length > 0 && (
                                <p className="text-white/30 text-sm">You&apos;ve seen all posts ✨</p>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            {/* Modals */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
                )}
                {selectedPost && (
                    <PostDetailModal
                        post={selectedPost}
                        isOpen={!!selectedPost}
                        onClose={() => setSelectedPost(null)}
                    />
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
