'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrendingIcon } from '@/components/icons';

// ============================================
// TRENDING HASHTAGS COMPONENT
// Featured hashtags with post counts
// ============================================

interface TrendingHashtag {
    tag: string;
    postCount: number;
    trending?: boolean;
    category?: string;
}

// Mock trending data - in production this would come from API
const MOCK_TRENDING: TrendingHashtag[] = [
    { tag: 'zerogravity', postCount: 12500, trending: true },
    { tag: 'culturalheritage', postCount: 8420, trending: true },
    { tag: 'communitybuilding', postCount: 6100 },
    { tag: 'entrepreneurship', postCount: 5800 },
    { tag: 'muslimtech', postCount: 4200, trending: true },
    { tag: 'diaspora', postCount: 3900 },
    { tag: 'africanfuturism', postCount: 3500, trending: true },
    { tag: 'halalbusiness', postCount: 3100 },
    { tag: 'mentalwellness', postCount: 2800 },
    { tag: 'sustainablefashion', postCount: 2400 },
];

interface TrendingHashtagsProps {
    limit?: number;
    showHeader?: boolean;
    compact?: boolean;
    onHashtagClick?: (tag: string) => void;
}

export function TrendingHashtags({
    limit = 5,
    showHeader = true,
    compact = false,
    onHashtagClick
}: TrendingHashtagsProps) {
    const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate API fetch
        const timer = setTimeout(() => {
            setHashtags(MOCK_TRENDING.slice(0, limit));
            setLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, [limit]);

    const formatCount = (count: number) => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
    };

    if (loading) {
        return (
            <div className="space-y-3">
                {[...Array(limit)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/10" />
                        <div className="flex-1">
                            <div className="h-4 w-24 rounded bg-white/10 mb-1" />
                            <div className="h-3 w-16 rounded bg-white/5" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
            {showHeader && (
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <TrendingIcon size={18} className="text-orange-500" />
                        Trending Now
                    </h3>
                    <Link
                        href="/explore?tab=trending"
                        className="text-xs text-[#00D4FF] hover:underline"
                    >
                        See all
                    </Link>
                </div>
            )}

            {hashtags.map((hashtag, index) => (
                <motion.div
                    key={hashtag.tag}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                >
                    <Link
                        href={`/explore?tag=${hashtag.tag}`}
                        onClick={() => onHashtagClick?.(hashtag.tag)}
                        className={`flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group ${compact ? 'p-1.5' : 'p-2'
                            }`}
                    >
                        <div className={`flex items-center justify-center rounded-lg bg-gradient-to-br from-[#00D4FF]/20 to-[#8B5CF6]/20 ${compact ? 'w-7 h-7' : 'w-9 h-9'
                            }`}>
                            <span className={compact ? 'text-sm' : 'text-base'}>#{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className={`font-medium text-white group-hover:text-[#00D4FF] transition-colors ${compact ? 'text-sm' : ''
                                    }`}>
                                    #{hashtag.tag}
                                </span>
                                {hashtag.trending && (
                                    <span className="text-orange-500 animate-pulse">🔥</span>
                                )}
                            </div>
                            <span className={`text-white/40 ${compact ? 'text-xs' : 'text-sm'}`}>
                                {formatCount(hashtag.postCount)} posts
                            </span>
                        </div>
                    </Link>
                </motion.div>
            ))}
        </div>
    );
}

// ============================================
// SEARCH HISTORY COMPONENT
// Recent searches with persistence
// ============================================

const SEARCH_HISTORY_KEY = '0g_search_history';
const MAX_HISTORY_ITEMS = 10;

interface SearchHistoryProps {
    onSearchSelect: (query: string) => void;
    onClear?: () => void;
}

export function SearchHistory({ onSearchSelect, onClear }: SearchHistoryProps) {
    const [history, setHistory] = useState<string[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
        if (saved) {
            try {
                setHistory(JSON.parse(saved));
            } catch {
                setHistory([]);
            }
        }
    }, []);

    const clearHistory = useCallback(() => {
        localStorage.removeItem(SEARCH_HISTORY_KEY);
        setHistory([]);
        onClear?.();
    }, [onClear]);

    const removeItem = useCallback((query: string) => {
        setHistory(prev => {
            const updated = prev.filter(q => q !== query);
            localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    if (history.length === 0) {
        return (
            <div className="text-center py-8 text-white/40 text-sm">
                No recent searches
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white/60">Recent Searches</h3>
                <button
                    onClick={clearHistory}
                    className="text-xs text-[#00D4FF] hover:underline"
                >
                    Clear all
                </button>
            </div>
            <div className="space-y-1">
                {history.map((query) => (
                    <div
                        key={query}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 group"
                    >
                        <button
                            onClick={() => onSearchSelect(query)}
                            className="flex items-center gap-2 flex-1 text-left"
                        >
                            <span className="text-white/40">🔍</span>
                            <span className="text-white/70 group-hover:text-white">{query}</span>
                        </button>
                        <button
                            onClick={() => removeItem(query)}
                            className="text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Helper function to add to search history
export function addToSearchHistory(query: string) {
    if (!query.trim()) return;

    const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
    let history: string[] = [];

    try {
        history = saved ? JSON.parse(saved) : [];
    } catch {
        history = [];
    }

    // Remove if already exists, then add to front
    history = history.filter(q => q !== query);
    history.unshift(query);

    // Limit history size
    history = history.slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
}
