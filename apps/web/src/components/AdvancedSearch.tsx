'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SearchIcon, CloseIcon } from '@/components/icons';

// ============================================
// TYPES
// ============================================

export type SearchResultType = 'user' | 'post' | 'group' | 'event' | 'resource' | 'hashtag' | 'business' | 'fundraiser';

export interface SearchResult {
    id: string;
    type: SearchResultType;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    metadata?: Record<string, string | number>;
    score: number;
}

export interface SearchFilter {
    type?: SearchResultType[];
    dateRange?: { from: Date; to: Date };
    location?: string;
    verified?: boolean;
    sortBy?: 'relevance' | 'recent' | 'popular';
}

export interface SavedSearch {
    id: string;
    query: string;
    filters: SearchFilter;
    notifyOnNew: boolean;
    createdAt: Date;
}

// ============================================
// SEARCH BAR
// ============================================

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    onFocus?: () => void;
    placeholder?: string;
    autoFocus?: boolean;
}

export function SearchBar({ value, onChange, onFocus, placeholder = 'Search...', autoFocus }: SearchBarProps) {
    return (
        <div className="relative">
            <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input type="text" value={value} onChange={(e) => onChange(e.target.value)} onFocus={onFocus}
                placeholder={placeholder} autoFocus={autoFocus}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-500/50" />
            {value && (
                <button onClick={() => onChange('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                    <CloseIcon size={16} />
                </button>
            )}
        </div>
    );
}

// ============================================
// SEARCH RESULT ITEM
// ============================================

interface SearchResultItemProps {
    result: SearchResult;
    onClick: (result: SearchResult) => void;
}

const TYPE_ICONS: Record<SearchResultType, string> = {
    user: '👤', post: '📝', group: '👥', event: '📅', resource: '📚', hashtag: '#', business: '🏪', fundraiser: '💖'
};

export function SearchResultItem({ result, onClick }: SearchResultItemProps) {
    return (
        <motion.button whileHover={{ x: 4 }} onClick={() => onClick(result)}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-left">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {result.imageUrl ? <img src={result.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-lg">{TYPE_ICONS[result.type]}</span>}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{result.title}</p>
                {result.subtitle && <p className="text-xs text-white/40 truncate">{result.subtitle}</p>}
            </div>
            <span className="text-xs text-white/30 capitalize">{result.type}</span>
        </motion.button>
    );
}

// ============================================
// SEARCH FILTERS
// ============================================

interface SearchFiltersProps {
    filters: SearchFilter;
    onFilterChange: (filters: SearchFilter) => void;
}

const RESULT_TYPES: SearchResultType[] = ['user', 'post', 'group', 'event', 'resource', 'hashtag', 'business', 'fundraiser'];

export function SearchFilters({ filters, onFilterChange }: SearchFiltersProps) {
    const toggleType = (type: SearchResultType) => {
        const current = filters.type || [];
        const updated = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
        onFilterChange({ ...filters, type: updated.length > 0 ? updated : undefined });
    };

    return (
        <div className="space-y-4">
            <div>
                <p className="text-sm text-white/40 mb-2">Type</p>
                <div className="flex flex-wrap gap-2">
                    {RESULT_TYPES.map(type => (
                        <button key={type} onClick={() => toggleType(type)}
                            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${filters.type?.includes(type) ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/60'}`}>
                            {TYPE_ICONS[type]} {type}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <p className="text-sm text-white/40 mb-2">Sort By</p>
                <div className="flex gap-2">
                    {(['relevance', 'recent', 'popular'] as const).map(sort => (
                        <button key={sort} onClick={() => onFilterChange({ ...filters, sortBy: sort })}
                            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${filters.sortBy === sort ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/60'}`}>
                            {sort}
                        </button>
                    ))}
                </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filters.verified} onChange={(e) => onFilterChange({ ...filters, verified: e.target.checked })} />
                <span className="text-sm text-white/60">Verified only</span>
            </label>
        </div>
    );
}

// ============================================
// ADVANCED SEARCH
// ============================================

interface AdvancedSearchProps {
    results: SearchResult[];
    recentSearches: string[];
    trendingSearches: string[];
    onSearch: (query: string, filters: SearchFilter) => void;
    onResultClick: (result: SearchResult) => void;
    onClearRecent: () => void;
}

export function AdvancedSearch({ results, recentSearches, trendingSearches, onSearch, onResultClick, onClearRecent }: AdvancedSearchProps) {
    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState<SearchFilter>({ sortBy: 'relevance' });
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        const debounce = setTimeout(() => {
            if (query.trim()) onSearch(query, filters);
        }, 300);
        return () => clearTimeout(debounce);
    }, [query, filters, onSearch]);

    return (
        <div className="space-y-6">
            <SearchBar value={query} onChange={setQuery} placeholder="Search people, posts, groups, events..." autoFocus />

            <div className="flex items-center justify-between">
                <button onClick={() => setShowFilters(!showFilters)} className="text-sm text-cyan-400 hover:underline">
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
                {Object.keys(filters).length > 1 && (
                    <button onClick={() => setFilters({ sortBy: 'relevance' })} className="text-sm text-white/40 hover:text-white">Clear Filters</button>
                )}
            </div>

            {showFilters && <SearchFilters filters={filters} onFilterChange={setFilters} />}

            {query ? (
                results.length > 0 ? (
                    <div className="space-y-1">
                        {results.map(r => <SearchResultItem key={r.id} result={r} onClick={onResultClick} />)}
                    </div>
                ) : (
                    <div className="py-12 text-center">
                        <p className="text-white/40">No results for &quot;{query}&quot;</p>
                    </div>
                )
            ) : (
                <>
                    {recentSearches.length > 0 && (
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-white/40">Recent</span>
                                <button onClick={onClearRecent} className="text-xs text-white/30 hover:text-white">Clear</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {recentSearches.map(s => (
                                    <button key={s} onClick={() => setQuery(s)} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-white/10">{s}</button>
                                ))}
                            </div>
                        </div>
                    )}
                    {trendingSearches.length > 0 && (
                        <div>
                            <span className="text-sm text-white/40 block mb-2">🔥 Trending</span>
                            <div className="flex flex-wrap gap-2">
                                {trendingSearches.map(s => (
                                    <button key={s} onClick={() => setQuery(s)} className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 text-sm hover:bg-orange-500/20">{s}</button>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default AdvancedSearch;
