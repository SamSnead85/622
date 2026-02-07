'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface BulletinPost {
    id: string;
    type: string;
    title: string;
    content: string;
    category: string;
    authorId: string;
    author?: { displayName: string; username: string; avatarUrl?: string };
    mediaUrl?: string;
    externalLink?: string;
    location?: string;
    eventDate?: string;
    tags: string[];
    upvotes: number;
    downvotes: number;
    viewCount: number;
    isPinned: boolean;
    isVerified: boolean;
    createdAt: string;
    _count?: { comments: number };
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    ANNOUNCEMENT: { label: 'Announcement', color: '#00D4FF', bg: 'rgba(0,212,255,0.08)' },
    NEED: { label: 'Community Need', color: '#F472B6', bg: 'rgba(244,114,182,0.08)' },
    EVENT: { label: 'Event', color: '#A78BFA', bg: 'rgba(167,139,250,0.08)' },
    JOB: { label: 'Job / Gig', color: '#38BDF8', bg: 'rgba(56,189,248,0.08)' },
    SERVICE: { label: 'Service', color: '#FBBF24', bg: 'rgba(251,191,36,0.08)' },
    CALL_TO_ACTION: { label: 'Call to Action', color: '#F87171', bg: 'rgba(248,113,113,0.08)' },
    DISCUSSION: { label: 'Discussion', color: '#34D399', bg: 'rgba(52,211,153,0.08)' },
    SPOTLIGHT: { label: 'Spotlight', color: '#C084FC', bg: 'rgba(192,132,252,0.08)' },
};

const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'COMMUNITY', label: 'Community' },
    { id: 'SOCIAL_JUSTICE', label: 'Social Justice' },
    { id: 'CAREER', label: 'Career' },
    { id: 'BUSINESS', label: 'Business' },
    { id: 'CULTURE', label: 'Culture' },
    { id: 'TECH', label: 'Tech' },
    { id: 'ACTIVISM', label: 'Activism' },
    { id: 'GENERAL', label: 'General' },
];

export default function PublicNeedsPage() {
    const [posts, setPosts] = useState<BulletinPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState<string | null>(null);

    const fetchPosts = useCallback(async () => {
        try {
            const params = new URLSearchParams({ limit: '50', sortBy: 'recent' });
            if (filter !== 'all') params.set('category', filter);
            if (typeFilter !== 'all') params.set('type', typeFilter);
            if (search) params.set('search', search);

            const res = await fetch(`${API}/api/v1/community/bulletins?${params}`);
            if (res.ok) {
                const data = await res.json();
                setPosts(data.bulletins || data);
            }
        } catch {
            // Silent fail — public page
        } finally {
            setLoading(false);
        }
    }, [filter, typeFilter, search]);

    useEffect(() => { fetchPosts(); }, [fetchPosts]);

    const formatDate = (d: string) => {
        const diff = Date.now() - new Date(d).getTime();
        const hours = diff / 3600000;
        if (hours < 1) return `${Math.floor(diff / 60000)}m ago`;
        if (hours < 24) return `${Math.floor(hours)}h ago`;
        if (hours < 168) return `${Math.floor(hours / 24)}d ago`;
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-[#0A0A0C] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0A0A0C]/90 backdrop-blur-lg border-b border-white/[0.04]">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#00D4FF]/10 border border-[#00D4FF]/20 flex items-center justify-center">
                                <span className="text-xs font-bold text-[#00D4FF]">0G</span>
                            </div>
                        </Link>
                        <div className="h-5 w-px bg-white/10" />
                        <h1 className="text-sm font-medium text-white/80">Community Board</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/early-access"
                            className="px-4 py-2 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-xs font-medium text-[#00D4FF] hover:bg-[#00D4FF]/15 transition-colors"
                        >
                            Request Early Access
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <div className="relative overflow-hidden border-b border-white/[0.04]">
                <div className="absolute inset-0">
                    <div className="absolute top-0 left-1/3 w-96 h-64 rounded-full blur-[120px] opacity-5 bg-[#00D4FF]" />
                    <div className="absolute bottom-0 right-1/3 w-64 h-48 rounded-full blur-[100px] opacity-5 bg-[#8B5CF6]" />
                </div>
                <div className="relative max-w-5xl mx-auto px-4 pt-10 sm:pt-16 pb-10">
                    <h2 className="text-2xl sm:text-4xl font-bold tracking-tight mb-3">Community Needs Board</h2>
                    <p className="text-sm sm:text-base text-white/50 max-w-2xl leading-relaxed">
                        Real needs from real communities. Fundraisers, volunteer calls, events, job postings, and more.
                        Built on ZeroG — a social platform where communities own their voice.
                    </p>

                    {/* Search */}
                    <div className="mt-6 max-w-md">
                        <div className="relative">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search needs, events, jobs..."
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/15 transition-colors"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="max-w-5xl mx-auto px-4 py-4 border-b border-white/[0.04]">
                <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-1">
                    <div className="flex gap-2 min-w-max">
                        {['all', 'NEED', 'EVENT', 'JOB', 'CALL_TO_ACTION', 'SERVICE', 'ANNOUNCEMENT'].map(t => (
                            <button
                                key={t}
                                onClick={() => setTypeFilter(t)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${typeFilter === t
                                    ? 'bg-white/10 text-white'
                                    : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                                    }`}
                            >
                                {t === 'all' ? 'All Types' : (TYPE_CONFIG[t]?.label || t)}
                            </button>
                        ))}
                    </div>
                    <div className="h-6 w-px bg-white/10 shrink-0 self-center" />
                    <div className="flex gap-2 min-w-max">
                        {CATEGORIES.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setFilter(c.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === c.id
                                    ? 'bg-white/10 text-white'
                                    : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                                    }`}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Posts Grid */}
            <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-48 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
                        ))}
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
                                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                            </svg>
                        </div>
                        <p className="text-white/40 text-sm mb-2">No posts yet</p>
                        <p className="text-white/20 text-xs">Be the first to post a community need.</p>
                        <Link href="/early-access" className="inline-block mt-4 px-5 py-2 rounded-xl bg-[#00D4FF]/10 text-[#00D4FF] text-xs font-medium hover:bg-[#00D4FF]/15 transition-colors">
                            Get Early Access to Post
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {posts.map((post, idx) => {
                            const config = TYPE_CONFIG[post.type] || { label: post.type, color: '#888', bg: 'rgba(136,136,136,0.08)' };
                            const isExpanded = expanded === post.id;

                            return (
                                <motion.article
                                    key={post.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="group rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] overflow-hidden transition-all cursor-pointer"
                                    onClick={() => setExpanded(isExpanded ? null : post.id)}
                                >
                                    {/* Image */}
                                    {post.mediaUrl && (
                                        <div className="aspect-[2/1] overflow-hidden">
                                            <img
                                                src={post.mediaUrl}
                                                alt={post.title}
                                                loading="lazy"
                                                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                                            />
                                        </div>
                                    )}

                                    <div className="p-5">
                                        {/* Type + Date */}
                                        <div className="flex items-center justify-between mb-3">
                                            <span
                                                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider"
                                                style={{ color: config.color, background: config.bg }}
                                            >
                                                {config.label}
                                            </span>
                                            <span className="text-[10px] text-white/25">{formatDate(post.createdAt)}</span>
                                        </div>

                                        {/* Pinned */}
                                        {post.isPinned && (
                                            <div className="flex items-center gap-1 mb-2">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="text-amber-400"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /></svg>
                                                <span className="text-[10px] text-amber-400/70">Pinned</span>
                                            </div>
                                        )}

                                        <h3 className="text-sm font-semibold text-white mb-2 leading-snug">{post.title}</h3>
                                        <p className={`text-xs text-white/45 leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}>
                                            {post.content}
                                        </p>

                                        {/* Event date/location */}
                                        {post.eventDate && (
                                            <div className="flex items-center gap-2 mt-3 text-white/30">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                                </svg>
                                                <span className="text-[10px]">{new Date(post.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            </div>
                                        )}
                                        {post.location && (
                                            <div className="flex items-center gap-2 mt-1.5 text-white/30">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                                                </svg>
                                                <span className="text-[10px]">{post.location}</span>
                                            </div>
                                        )}

                                        {/* External link */}
                                        {post.externalLink && isExpanded && (
                                            <a
                                                href={post.externalLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg bg-[#00D4FF]/10 text-[#00D4FF] text-[10px] font-medium hover:bg-[#00D4FF]/15 transition-colors"
                                            >
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                                                Visit Link
                                            </a>
                                        )}

                                        {/* Footer */}
                                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04]">
                                            {/* Author */}
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                                                    {post.author?.avatarUrl ? (
                                                        <img src={post.author.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        <span className="text-[8px] text-white/40">{(post.author?.displayName || 'A').charAt(0)}</span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-white/30">{post.author?.displayName || 'Community Member'}</span>
                                            </div>
                                            {/* Engagement */}
                                            <div className="flex items-center gap-3 text-white/20">
                                                <span className="flex items-center gap-1 text-[10px]">
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 9V5a3 3 0 00-6 0v1" /><path d="M18 14v-3a2 2 0 00-2-2H4a2 2 0 00-2 2v7a2 2 0 002 2h12" /></svg>
                                                    {post.upvotes}
                                                </span>
                                                {post._count?.comments !== undefined && (
                                                    <span className="flex items-center gap-1 text-[10px]">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                                                        {post._count.comments}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.article>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* CTA Banner */}
            <div className="border-t border-white/[0.04]">
                <div className="max-w-5xl mx-auto px-4 py-12 text-center">
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Have a need? Share it with your community.</h3>
                    <p className="text-sm text-white/40 mb-6 max-w-md mx-auto">
                        ZeroG lets real communities coordinate around real needs.
                        No algorithms deciding what gets seen. No ads. Just people helping people.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Link
                            href="/early-access"
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#00D4FF]/80 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                        >
                            Request Early Access
                        </Link>
                        <Link
                            href="/about"
                            className="px-6 py-3 rounded-xl bg-white/5 border border-white/[0.08] text-sm font-medium text-white/70 hover:bg-white/10 transition-colors"
                        >
                            Learn About ZeroG
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
