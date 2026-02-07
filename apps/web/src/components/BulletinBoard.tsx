'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { API_URL } from '@/lib/api';
import {
    MegaphoneIcon,
    HeartIcon,
    MapPinIcon,
    CalendarIcon,
    UsersIcon,
    ZapIcon,
    PlusIcon,
    CheckCircleIcon,
    ClockIcon,
    ArrowUpIcon,
    ShareIcon,
    MessageIcon,
    FilterIcon,
    SearchIcon
} from '@/components/icons';

// ============================================
// TYPES
// ============================================

export type BulletinType = 'ANNOUNCEMENT' | 'NEED' | 'EVENT' | 'SERVICE' | 'JOB' | 'DISCUSSION';
export type BulletinCategory = 'COMMUNITY' | 'CHARITY' | 'EDUCATION' | 'BUSINESS' | 'SOCIAL' | 'EMERGENCY' | 'OTHER';
export type BulletinPriority = 'NORMAL' | 'IMPORTANT' | 'URGENT';

export interface BulletinPost {
    id: string;
    type: BulletinType;
    title: string;
    content: string;
    mediaUrl?: string;
    externalLink?: string;
    upvotes: number;
    downvotes: number;
    viewCount: number;
    category: BulletinCategory;
    tags: string[];
    isPinned: boolean;
    isVerified: boolean;
    location?: string;
    locationGeo?: string;
    eventDate?: string;
    expiresAt?: string;
    author: {
        id: string;
        displayName: string;
        avatarUrl?: string;
        isVerified: boolean;
    };
    commentsCount: number;
    createdAt: string;
    // UI-only fields
    isInterested?: boolean;
    isGoing?: boolean;
}

// ============================================
// CATEGORY CONFIG
// ============================================

const JobIcon = () => (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
    </svg>
);

const BULLETIN_TYPES: { value: BulletinType; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'ANNOUNCEMENT', label: 'Announcements', icon: <MegaphoneIcon size={18} />, color: 'from-blue-500 to-cyan-500' },
    { value: 'EVENT', label: 'Events', icon: <CalendarIcon size={18} />, color: 'from-purple-500 to-indigo-500' },
    { value: 'JOB', label: 'Jobs & Gigs', icon: <JobIcon />, color: 'from-sky-500 to-blue-600' },
    { value: 'NEED', label: 'Looking For', icon: <HeartIcon size={18} />, color: 'from-rose-500 to-pink-500' },
    { value: 'SERVICE', label: 'Services', icon: <ZapIcon size={18} />, color: 'from-amber-500 to-orange-500' },
    { value: 'DISCUSSION', label: 'Discussion', icon: <MessageIcon size={18} />, color: 'from-emerald-500 to-teal-500' },
];

const PRIORITY_CONFIG = {
    URGENT: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50', label: '🚨 Urgent' },
    IMPORTANT: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/50', label: '⚡ Important' },
    NORMAL: { bg: 'bg-white/5', text: 'text-white/60', border: 'border-white/10', label: '' },
};

// ============================================
// BULLETIN CARD COMPONENT
// ============================================

interface BulletinCardProps {
    post: BulletinPost;
    onInterested?: (id: string) => void;
    onGoing?: (id: string) => void;
    onUpvote?: (id: string) => void;
}

function BulletinCard({ post, onInterested, onGoing, onUpvote }: BulletinCardProps) {
    const typeConfig = BULLETIN_TYPES.find(t => t.value === post.type);
    const isEvent = post.type === 'EVENT';
    const isNeed = post.type === 'NEED';
    const isExpiringSoon = post.expiresAt && new Date(post.expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const formatRelativeTime = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return new Date(dateStr).toLocaleDateString();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative bg-white/5 backdrop-blur-sm rounded-2xl border ${post.isPinned ? 'border-amber-500/50' : 'border-white/10'
                } overflow-hidden hover:bg-white/[0.07] transition-all duration-300 group`}
        >
            {/* Pinned Badge */}
            {post.isPinned && (
                <div className="absolute top-3 right-3 z-10 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/50">
                    <span className="text-xs font-medium text-amber-400">📌 Pinned</span>
                </div>
            )}

            {/* Type Badge */}
            <div className="px-5 pt-5 pb-3">
                <div className="flex items-center gap-3 mb-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${typeConfig?.color} flex items-center justify-center`}>
                        <span className="text-white">{typeConfig?.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-white/50 uppercase tracking-wide">
                            {typeConfig?.label}
                        </span>
                        {post.isVerified && (
                            <span className="ml-2 text-xs text-cyan-400">✓ Verified</span>
                        )}
                    </div>
                    {isExpiringSoon && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 border border-red-500/50">
                            <ClockIcon size={12} className="text-red-400" />
                            <span className="text-xs text-red-400">Expires soon</span>
                        </div>
                    )}
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-cyan-300 transition-colors">
                    {post.title}
                </h3>

                {/* Content Preview */}
                <p className="text-sm text-white/60 line-clamp-3 mb-4">
                    {post.content}
                </p>

                {/* Event Details */}
                {isEvent && post.eventDate && (
                    <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <div className="flex items-center gap-2 text-purple-300">
                            <CalendarIcon size={16} />
                            <span className="text-sm font-medium">{formatDate(post.eventDate)}</span>
                        </div>
                        {post.location && (
                            <div className="flex items-center gap-2 text-purple-300/70">
                                <MapPinIcon size={16} />
                                <span className="text-sm">{post.location}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Need Help Details */}
                {isNeed && (
                    <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                        <HeartIcon size={16} className="text-rose-400" />
                        <span className="text-sm text-rose-300">Community help needed</span>
                    </div>
                )}

                {/* Location (non-event) */}
                {!isEvent && post.location && (
                    <div className="flex items-center gap-2 mb-4 text-white/50">
                        <MapPinIcon size={14} />
                        <span className="text-sm">{post.location}</span>
                    </div>
                )}

                {/* External Link */}
                {post.externalLink && (
                    <a
                        href={post.externalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-colors text-sm"
                    >
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Learn more →
                    </a>
                )}

                {/* Tags */}
                {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {post.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="px-2 py-1 rounded-full bg-white/5 text-xs text-white/50">
                                #{tag}
                            </span>
                        ))}
                        {post.tags.length > 3 && (
                            <span className="text-xs text-white/30">+{post.tags.length - 3} more</span>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between">
                {/* Author */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                        {post.author.avatarUrl ? (
                            <img src={post.author.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            post.author.displayName[0]
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white/80 flex items-center gap-1">
                            {post.author.displayName}
                            {post.author.isVerified && <CheckCircleIcon size={14} className="text-cyan-400" />}
                        </p>
                        <p className="text-xs text-white/40">{formatRelativeTime(post.createdAt)}</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {/* RSVP Buttons for Events */}
                    {isEvent && (
                        <>
                            <button
                                onClick={() => onInterested?.(post.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${post.isInterested
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                                    }`}
                            >
                                Interested
                            </button>
                            <button
                                onClick={() => onGoing?.(post.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${post.isGoing
                                        ? 'bg-cyan-500 text-white'
                                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                                    }`}
                            >
                                Going
                            </button>
                        </>
                    )}

                    {/* Can Help Button for Needs */}
                    {isNeed && (
                        <button
                            onClick={() => onInterested?.(post.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${post.isInterested
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            ❤️ Can Help
                        </button>
                    )}

                    {/* Upvote */}
                    <button
                        onClick={() => onUpvote?.(post.id)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-all"
                    >
                        <ArrowUpIcon size={14} />
                        <span className="text-xs">{post.upvotes}</span>
                    </button>

                    {/* Comments */}
                    <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-all">
                        <MessageIcon size={14} />
                        <span className="text-xs">{post.commentsCount}</span>
                    </button>

                    {/* Share */}
                    <button className="p-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-all">
                        <ShareIcon size={14} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// BULLETIN BOARD COMPONENT
// ============================================

interface BulletinBoardProps {
    communityId?: string;
    showComposer?: boolean;
    onCreatePost?: () => void;
}

export function BulletinBoard({ communityId, showComposer = true, onCreatePost }: BulletinBoardProps) {
    const [activeType, setActiveType] = useState<BulletinType | 'ALL'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [posts, setPosts] = useState<BulletinPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Seed data used as fallback when API returns empty
    const SEED_POSTS: BulletinPost[] = [
        {
            id: 'seed-heal',
            type: 'EVENT',
            title: 'HEAL Palestine — Medical Aid Fundraiser',
            content: 'Join us in supporting HEAL Palestine\'s mission to provide essential medical care and healthcare access to Palestinian communities. Learn about ongoing medical relief efforts, hear from doctors on the ground, and find out how you can help — whether through donations, volunteering, or spreading awareness. Every contribution matters.',
            externalLink: 'https://www.healpalestine.org/',
            upvotes: 89,
            downvotes: 0,
            viewCount: 412,
            category: 'CHARITY',
            tags: ['palestine', 'medical-aid', 'fundraiser', 'humanitarian'],
            isPinned: true,
            isVerified: true,
            location: 'Online & In-Person',
            eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            author: { id: 'heal', displayName: 'HEAL Palestine', avatarUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200&h=200&fit=crop', isVerified: true },
            commentsCount: 24,
            createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'seed-1',
            type: 'ANNOUNCEMENT',
            title: 'Community Iftar this Friday — All Welcome!',
            content: 'Join us for a beautiful community iftar at the community center. Bring a dish to share if you can, but all are welcome regardless. We will have a short program and plenty of food for everyone.',
            upvotes: 47,
            downvotes: 0,
            viewCount: 234,
            category: 'COMMUNITY',
            tags: ['ramadan', 'community', 'iftar'],
            isPinned: true,
            isVerified: true,
            location: 'Community Center',
            eventDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            author: { id: '1', displayName: 'Community Admin', isVerified: true },
            commentsCount: 12,
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'seed-job-1',
            type: 'JOB',
            title: 'Looking for a part-time graphic designer',
            content: 'Small Muslim-owned business looking for a freelance graphic designer to help with social media content, branding materials, and product packaging. Flexible hours, remote-friendly. Portfolio required.',
            upvotes: 22,
            downvotes: 0,
            viewCount: 178,
            category: 'BUSINESS',
            tags: ['design', 'freelance', 'remote', 'hiring'],
            isPinned: false,
            isVerified: false,
            author: { id: 'job1', displayName: 'Barakah Goods', isVerified: false },
            commentsCount: 7,
            createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'seed-2',
            type: 'NEED',
            title: 'Family needs help with groceries this week',
            content: 'A local family is going through a difficult time and could use some help with groceries. If you can contribute or help deliver, please reach out. Everything is appreciated.',
            upvotes: 31,
            downvotes: 0,
            viewCount: 156,
            category: 'CHARITY',
            tags: ['help', 'groceries', 'urgent'],
            isPinned: false,
            isVerified: true,
            author: { id: '2', displayName: 'Sarah Ahmed', isVerified: true },
            commentsCount: 8,
            createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'seed-3',
            type: 'EVENT',
            title: 'Youth Basketball Tournament',
            content: 'Annual youth basketball tournament for ages 12-18. Teams of 5, register by Wednesday. Prizes for top 3 teams!',
            upvotes: 23,
            downvotes: 0,
            viewCount: 89,
            category: 'SOCIAL',
            tags: ['sports', 'youth', 'basketball'],
            isPinned: false,
            isVerified: false,
            location: 'Recreation Center',
            eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            author: { id: '3', displayName: 'Youth Committee', isVerified: false },
            commentsCount: 5,
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'seed-job-2',
            type: 'JOB',
            title: 'Community center seeking weekend volunteers',
            content: 'Our community center is looking for volunteers to help run weekend programs for kids ages 5-12. Activities include arts & crafts, sports, and mentoring. 4-hour shifts, flexible schedule.',
            upvotes: 14,
            downvotes: 0,
            viewCount: 92,
            category: 'COMMUNITY',
            tags: ['volunteer', 'kids', 'weekend'],
            isPinned: false,
            isVerified: true,
            author: { id: 'cc', displayName: 'Community Center', isVerified: true },
            commentsCount: 4,
            createdAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'seed-4',
            type: 'SERVICE',
            title: 'Free tutoring for high school students',
            content: 'Offering free tutoring in math and science for high school students. Sessions on weekends. DM to schedule.',
            upvotes: 18,
            downvotes: 0,
            viewCount: 67,
            category: 'EDUCATION',
            tags: ['tutoring', 'education', 'free'],
            isPinned: false,
            isVerified: false,
            author: { id: '4', displayName: 'Hassan', isVerified: false },
            commentsCount: 3,
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: 'seed-5',
            type: 'DISCUSSION',
            title: 'Ideas for summer community programs?',
            content: 'What programs would you like to see this summer? Share your ideas and lets make it happen together!',
            upvotes: 15,
            downvotes: 0,
            viewCount: 45,
            category: 'COMMUNITY',
            tags: ['ideas', 'summer', 'programs'],
            isPinned: false,
            isVerified: false,
            author: { id: '5', displayName: 'Planning Committee', isVerified: false },
            commentsCount: 22,
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
    ];

    // Fetch from API, fall back to seed data
    useEffect(() => {
        setIsLoading(true);
        const fetchBulletins = async () => {
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
                const res = await fetch(`${API_URL}/api/v1/community/bulletins`, {
                    headers: {
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    },
                });
                if (res.ok) {
                    const data = await res.json();
                    const apiPosts: BulletinPost[] = (data.bulletins || data || []).map((b: any) => ({
                        id: b.id,
                        type: b.type || 'ANNOUNCEMENT',
                        title: b.title,
                        content: b.content || b.desc || '',
                        externalLink: b.externalLink,
                        mediaUrl: b.mediaUrl,
                        upvotes: b.upvotes || 0,
                        downvotes: b.downvotes || 0,
                        viewCount: b.viewCount || 0,
                        category: b.category || 'COMMUNITY',
                        tags: b.tags || [],
                        isPinned: b.isPinned || false,
                        isVerified: b.isVerified || false,
                        location: b.location,
                        eventDate: b.eventDate,
                        expiresAt: b.expiresAt,
                        author: b.author || { id: '0', displayName: b.author_name || 'Unknown', isVerified: false },
                        commentsCount: b.commentsCount || b._count?.comments || 0,
                        createdAt: b.createdAt || new Date().toISOString(),
                    }));
                    // Use API data if available, otherwise seed data
                    setPosts(apiPosts.length > 0 ? apiPosts : SEED_POSTS);
                } else {
                    setPosts(SEED_POSTS);
                }
            } catch {
                setPosts(SEED_POSTS);
            }
            setIsLoading(false);
        };
        fetchBulletins();
    }, [communityId]);

    const handleInterested = (id: string) => {
        setPosts(prev => prev.map(p =>
            p.id === id ? { ...p, isInterested: !p.isInterested } : p
        ));
    };

    const handleGoing = (id: string) => {
        setPosts(prev => prev.map(p =>
            p.id === id ? { ...p, isGoing: !p.isGoing, isInterested: false } : p
        ));
    };

    const handleUpvote = (id: string) => {
        setPosts(prev => prev.map(p =>
            p.id === id ? { ...p, upvotes: p.upvotes + 1 } : p
        ));
    };

    const filteredPosts = posts
        .filter(p => activeType === 'ALL' || p.type === activeType)
        .filter(p => !searchQuery ||
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            // Pinned first
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            // Then by date
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                            <MegaphoneIcon size={20} className="text-white" />
                        </div>
                        Community Bulletin
                    </h2>
                    <p className="text-white/50 mt-1">Announcements, events, needs, and services</p>
                </div>

                {/* Create Button */}
                {showComposer && (
                    <button
                        onClick={onCreatePost}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity"
                    >
                        <PlusIcon size={18} />
                        Post to Bulletin
                    </button>
                )}
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setActiveType('ALL')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeType === 'ALL'
                            ? 'bg-white/10 text-white border border-white/20'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                >
                    All
                </button>
                {BULLETIN_TYPES.map(type => (
                    <button
                        key={type.value}
                        onClick={() => setActiveType(type.value)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeType === type.value
                                ? `bg-gradient-to-r ${type.color} text-white`
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                    >
                        {type.icon}
                        {type.label}
                    </button>
                ))}
            </div>

            {/* Search Bar */}
            <div className="relative">
                <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                    type="text"
                    placeholder="Search bulletin posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
            </div>

            {/* Posts Grid */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />
                    ))}
                </div>
            ) : filteredPosts.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                        <MegaphoneIcon size={32} className="text-white/20" />
                    </div>
                    <h3 className="text-lg font-medium text-white/60 mb-2">No posts found</h3>
                    <p className="text-white/40">Be the first to post something!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {filteredPosts.map((post, index) => (
                            <motion.div
                                key={post.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <BulletinCard
                                    post={post}
                                    onInterested={handleInterested}
                                    onGoing={handleGoing}
                                    onUpvote={handleUpvote}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

export default BulletinBoard;
