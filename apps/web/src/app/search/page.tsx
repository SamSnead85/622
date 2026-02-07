'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL, apiFetch } from '@/lib/api';
import { NavigationSidebar } from '@/components/dashboard/NavigationSidebar';
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

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [type, setType] = useState<SearchType>('all');
    const [results, setResults] = useState<SearchResults>({});
    const [counts, setCounts] = useState<SearchCounts>({});
    const [isLoading, setIsLoading] = useState(false);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

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
                    // Silently restore -- full reload picks up real auth
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

    return (
        <div className="min-h-screen bg-black text-white">
            <NavigationSidebar />
            <div className="lg:ml-20 xl:ml-64 pb-24 lg:pb-8 p-4 sm:p-8 max-w-4xl mx-auto">
            {/* Search input */}
            <div className="relative mb-6">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                    </svg>
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    placeholder="Search people, posts, communities, hashtags..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#00D4FF]/50"
                    autoFocus
                    aria-label="Search"
                />
                {query && (
                    <button
                        onClick={() => { setQuery(''); setResults({}); setCounts({}); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                        aria-label="Clear search"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Type tabs */}
            <div className="flex gap-1.5 mb-6 overflow-x-auto">
                {(['all', 'posts', 'users', 'communities', 'hashtags'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => handleTypeChange(t)}
                        className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap capitalize ${
                            type === t ? 'bg-white/15 text-white font-medium' : 'bg-white/5 text-white/40'
                        }`}
                    >
                        {t}
                        {counts[t as keyof SearchCounts] !== undefined && (
                            <span className="ml-1.5 text-xs opacity-60">{counts[t as keyof SearchCounts]}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full animate-spin mx-auto" />
                </div>
            )}

            {/* Results */}
            {!isLoading && (
                <div className="space-y-8">
                    {/* Users */}
                    {results.users && results.users.length > 0 && (
                        <section>
                            <h2 className="text-white/40 text-xs uppercase tracking-wider mb-3">People</h2>
                            <div className="space-y-2">
                                {results.users.map((user: any) => (
                                    <Link key={user.id} href={`/profile/${user.username}`}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-sm font-bold">
                                            {user.avatarUrl ? (
                                                <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                                            ) : user.displayName?.[0] || user.username[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-medium text-sm truncate">
                                                {user.displayName || user.username}
                                                {user.isVerified && ' \u2713'}
                                            </p>
                                            <p className="text-white/40 text-xs">@{user.username} · {user._count?.followers || 0} followers</p>
                                        </div>
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
                                    <div key={post.id} className="p-4 rounded-xl bg-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-white text-sm font-medium">@{post.author?.username}</span>
                                            <span className="text-white/30 text-xs">{new Date(post.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-white/70 text-sm line-clamp-3">{post.caption}</p>
                                        <div className="flex gap-4 mt-2 text-white/30 text-xs">
                                            <span>{post._count?.likes || 0} likes</span>
                                            <span>{post._count?.comments || 0} comments</span>
                                        </div>
                                    </div>
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
                                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/20 flex items-center justify-center text-lg">
                                            {community.iconUrl ? (
                                                <img src={community.iconUrl} alt="" className="w-full h-full rounded-xl object-cover" />
                                            ) : '\uD83C\uDFDB'}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium text-sm">{community.name}</p>
                                            <p className="text-white/40 text-xs">{community._count?.members || 0} members</p>
                                        </div>
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
                                    <span key={tag.id} className="px-3 py-1.5 rounded-xl bg-white/5 text-[#00D4FF] text-sm">
                                        #{tag.name} <span className="text-white/30 text-xs">{tag.usageCount}</span>
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}

            {/* Empty state */}
            {!isLoading && query.length >= 2 && Object.values(results).every(r => !r || r.length === 0) && (
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

            {/* Search history (when no query) */}
            {!query && searchHistory.length > 0 && (
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-white/40 text-xs uppercase tracking-wider">Recent Searches</h3>
                        <button onClick={clearHistory} className="text-white/30 text-xs hover:text-white">Clear</button>
                    </div>
                    <div className="space-y-1">
                        {searchHistory.map((term, i) => (
                            <button
                                key={i}
                                onClick={() => { setQuery(term); performSearch(term, type); }}
                                className="w-full text-left px-3 py-2 rounded-lg text-white/60 text-sm hover:bg-white/5"
                            >
                                {term}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}
