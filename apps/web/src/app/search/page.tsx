'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL, apiFetch } from '@/lib/api';
import { NavigationSidebar } from '@/components/dashboard/NavigationSidebar';
import { useAuth, ProtectedRoute } from '@/contexts/AuthContext';
import { useFeedView } from '@/contexts/FeedViewContext';
import Link from 'next/link';
import { isStealthActive, deactivateStealth } from '@/lib/stealth/engine';

type SearchType = 'all' | 'posts' | 'users' | 'communities' | 'hashtags';

interface SearchResults {
    posts?: any[];
    users?: any[];
    communities?: any[];
    hashtags?: any[];
}

interface SearchCounts {
    posts?: number;
    users?: number;
    communities?: number;
    hashtags?: number;
}

function SearchPageContent() {
    const { user } = useAuth();
    const { communityOptIn, feedView, setShowJoinModal } = useFeedView();
    const [query, setQuery] = useState('');
    const [type, setType] = useState<SearchType>('all');
    const [results, setResults] = useState<SearchResults>({});
    const [counts, setCounts] = useState<SearchCounts>({});
    const [isLoading, setIsLoading] = useState(false);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load search history
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('0g_search_history') || '[]');
            setSearchHistory(saved.slice(0, 10));
        } catch {}
    }, []);

    const performSearch = useCallback(async (q: string, t: SearchType) => {
        if (q.length < 2) {
            setResults({});
            setCounts({});
            return;
        }

        setIsLoading(true);
        try {
            const response = await apiFetch(
                `${API_URL}/api/v1/search?q=${encodeURIComponent(q)}&type=${t}`
            );
            if (!response.ok) throw new Error('Search failed');
            const data = await response.json();
            setResults(data.results || {});
            setCounts(data.counts || {});

            // Save to history
            const history = [q, ...searchHistory.filter(h => h !== q)].slice(0, 10);
            setSearchHistory(history);
            localStorage.setItem('0g_search_history', JSON.stringify(history));
        } catch {
            // silently fail
        }
        setIsLoading(false);
    }, [searchHistory]);

    // Debounced search -- also checks for Travel Shield passphrase
    const handleQueryChange = (value: string) => {
        setQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            // Travel Shield: check if the query is the deactivation passphrase
            if (isStealthActive() && value.length >= 4) {
                const success = await deactivateStealth(value);
                if (success) {
                    window.location.href = '/dashboard';
                    return;
                }
            }
            performSearch(value, type);
        }, 300);
    };

    const handleTypeChange = (t: SearchType) => {
        setType(t);
        if (query.length >= 2) performSearch(query, t);
    };

    const clearHistory = () => {
        setSearchHistory([]);
        localStorage.removeItem('0g_search_history');
    };

    const hasResults = Object.values(results).some(r => r && r.length > 0);
    const hasSearched = query.length >= 2;

    // Available tabs change based on community mode
    const searchTabs: { id: SearchType; label: string }[] = communityOptIn
        ? [
            { id: 'all', label: 'All' },
            { id: 'users', label: 'People' },
            { id: 'posts', label: 'Posts' },
            { id: 'communities', label: 'Communities' },
            { id: 'hashtags', label: 'Hashtags' },
        ]
        : [
            { id: 'all', label: 'All' },
            { id: 'communities', label: 'My Communities' },
            { id: 'users', label: 'Contacts' },
        ];

    return (
        <div className="min-h-screen bg-[#050508] text-white">
            <NavigationSidebar />
            <main className="lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
                {/* Header */}
                <header className="sticky top-0 z-30 px-4 lg:px-6 py-3 lg:py-4 bg-black/80 backdrop-blur-xl border-b border-white/5">
                    <div className="max-w-3xl mx-auto">
                        {/* Search input */}
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                                </svg>
                            </div>
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => handleQueryChange(e.target.value)}
                                placeholder={communityOptIn
                                    ? 'Search people, posts, communities, hashtags...'
                                    : 'Search your communities and contacts...'
                                }
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-10 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-[#00D4FF]/50 transition-colors"
                                autoFocus
                                aria-label="Search"
                            />
                            {query && (
                                <button
                                    onClick={() => { setQuery(''); setResults({}); setCounts({}); }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                                    aria-label="Clear search"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Type tabs */}
                        <div className="flex gap-1.5 mt-3 overflow-x-auto scrollbar-hide">
                            {searchTabs.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => handleTypeChange(t.id)}
                                    className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all ${
                                        type === t.id
                                            ? 'bg-[#00D4FF]/15 text-[#00D4FF] font-medium border border-[#00D4FF]/20'
                                            : 'bg-white/5 text-white/40 hover:text-white/60 border border-transparent'
                                    }`}
                                >
                                    {t.label}
                                    {counts[t.id as keyof SearchCounts] !== undefined && (
                                        <span className="ml-1.5 text-xs opacity-60">{counts[t.id as keyof SearchCounts]}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
                    {/* Loading */}
                    {isLoading && (
                        <div className="text-center py-12">
                            <div className="w-8 h-8 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full animate-spin mx-auto" />
                        </div>
                    )}

                    {/* Search Results */}
                    {!isLoading && hasSearched && (
                        <div className="space-y-8">
                            {/* Users */}
                            {results.users && results.users.length > 0 && (
                                <section>
                                    <h2 className="text-white/40 text-xs uppercase tracking-wider mb-3">People</h2>
                                    <div className="space-y-2">
                                        {results.users.map((u: any) => (
                                            <Link key={u.id} href={`/profile/${u.username}`}
                                                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all">
                                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
                                                    {u.avatarUrl ? (
                                                        <img src={u.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                                                    ) : (u.displayName?.[0] || u.username?.[0] || 'U')}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-medium text-sm truncate">
                                                        {u.displayName || u.username}
                                                        {u.isVerified && <span className="text-[#00D4FF] ml-1">✓</span>}
                                                    </p>
                                                    <p className="text-white/40 text-xs">@{u.username}{u._count?.followers ? ` · ${u._count.followers} followers` : ''}</p>
                                                </div>
                                                <span className="text-white/20">→</span>
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Posts */}
                            {results.posts && results.posts.length > 0 && (
                                <section>
                                    <h2 className="text-white/40 text-xs uppercase tracking-wider mb-3">Posts</h2>
                                    <div className="space-y-2">
                                        {results.posts.map((post: any) => (
                                            <Link key={post.id} href={`/post/${post.id}`}
                                                className="block p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-white text-sm font-medium">
                                                        {post.user?.displayName || `@${post.user?.username || 'unknown'}`}
                                                    </span>
                                                    <span className="text-white/30 text-xs">{new Date(post.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-white/60 text-sm line-clamp-3">{post.caption}</p>
                                                <div className="flex gap-4 mt-2 text-white/30 text-xs">
                                                    <span>{post._count?.likes || 0} likes</span>
                                                    <span>{post._count?.comments || 0} comments</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Communities */}
                            {results.communities && results.communities.length > 0 && (
                                <section>
                                    <h2 className="text-white/40 text-xs uppercase tracking-wider mb-3">Communities</h2>
                                    <div className="space-y-2">
                                        {results.communities.map((community: any) => (
                                            <Link key={community.id} href={`/communities/${community.id}`}
                                                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all">
                                                <div className="w-11 h-11 rounded-xl bg-[#8B5CF6]/20 flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                                                    {community.iconUrl ? (
                                                        <img src={community.iconUrl} alt="" className="w-full h-full rounded-xl object-cover" />
                                                    ) : '🏛'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-medium text-sm truncate">{community.name}</p>
                                                    <p className="text-white/40 text-xs">{community._count?.members || 0} members</p>
                                                </div>
                                                <span className="text-white/20">→</span>
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Hashtags */}
                            {results.hashtags && results.hashtags.length > 0 && (
                                <section>
                                    <h2 className="text-white/40 text-xs uppercase tracking-wider mb-3">Hashtags</h2>
                                    <div className="flex flex-wrap gap-2">
                                        {results.hashtags.map((tag: any) => (
                                            <span key={tag.id} className="px-3 py-1.5 rounded-xl bg-white/5 text-[#00D4FF] text-sm border border-white/[0.06]">
                                                #{tag.name} <span className="text-white/30 text-xs">{tag.usageCount}</span>
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* No results */}
                            {!hasResults && (
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                                        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5}>
                                            <circle cx="11" cy="11" r="8" />
                                            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                    <h3 className="text-white/60 font-medium mb-1">No results found</h3>
                                    <p className="text-white/30 text-sm">Try different keywords or check spelling</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Before search — Quick actions & context */}
                    {!isLoading && !hasSearched && (
                        <div className="space-y-8">
                            {/* Recent searches */}
                            {searchHistory.length > 0 && (
                                <section>
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-white/40 text-xs uppercase tracking-wider">Recent Searches</h3>
                                        <button onClick={clearHistory} className="text-white/30 text-xs hover:text-white transition-colors">Clear</button>
                                    </div>
                                    <div className="space-y-1">
                                        {searchHistory.map((term, i) => (
                                            <button
                                                key={i}
                                                onClick={() => { setQuery(term); performSearch(term, type); }}
                                                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 text-sm hover:bg-white/5 transition-colors"
                                            >
                                                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-white/20 flex-shrink-0">
                                                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                {term}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Quick actions */}
                            <section>
                                <h3 className="text-white/40 text-xs uppercase tracking-wider mb-3">Quick Actions</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <Link href="/communities" className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all group">
                                        <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/15 flex items-center justify-center mb-3">
                                            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
                                            </svg>
                                        </div>
                                        <p className="text-white font-medium text-sm">Communities</p>
                                        <p className="text-white/40 text-xs mt-0.5">Your groups & tribes</p>
                                    </Link>

                                    <Link href="/messages" className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all group">
                                        <div className="w-10 h-10 rounded-xl bg-[#00D4FF]/15 flex items-center justify-center mb-3">
                                            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                                            </svg>
                                        </div>
                                        <p className="text-white font-medium text-sm">Messages</p>
                                        <p className="text-white/40 text-xs mt-0.5">Direct conversations</p>
                                    </Link>

                                    <Link href="/invite" className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all group">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-3">
                                            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
                                            </svg>
                                        </div>
                                        <p className="text-white font-medium text-sm">Invite Friends</p>
                                        <p className="text-white/40 text-xs mt-0.5">Grow your circle</p>
                                    </Link>

                                    {!communityOptIn ? (
                                        <button
                                            onClick={() => setShowJoinModal(true)}
                                            className="p-4 rounded-xl bg-gradient-to-br from-[#00D4FF]/10 to-[#8B5CF6]/10 border border-[#00D4FF]/20 hover:border-[#00D4FF]/40 transition-all text-left"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-[#00D4FF]/15 flex items-center justify-center mb-3">
                                                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                                                </svg>
                                            </div>
                                            <p className="text-[#00D4FF] font-medium text-sm">Join Community</p>
                                            <p className="text-white/40 text-xs mt-0.5">Discover more people</p>
                                        </button>
                                    ) : (
                                        <Link href="/bulletin" className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all group">
                                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center mb-3">
                                                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                                                </svg>
                                            </div>
                                            <p className="text-white font-medium text-sm">Bulletin Board</p>
                                            <p className="text-white/40 text-xs mt-0.5">Jobs, events & more</p>
                                        </Link>
                                    )}
                                </div>
                            </section>

                            {/* Privacy context message */}
                            {!communityOptIn && (
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2}>
                                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-white/70 text-sm font-medium">You&apos;re in private mode</p>
                                            <p className="text-white/40 text-xs mt-1 leading-relaxed">
                                                Search finds your communities and contacts. To discover people and content from the broader community,{' '}
                                                <button onClick={() => setShowJoinModal(true)} className="text-[#00D4FF] hover:underline">
                                                    join the community feed
                                                </button>.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function SearchPage() {
    return (
        <ProtectedRoute>
            <SearchPageContent />
        </ProtectedRoute>
    );
}
