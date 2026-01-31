'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

// ============================================
// TYPES
// ============================================
interface SearchResult {
    id: string;
    type: 'user' | 'post' | 'community' | 'journey';
    title: string;
    subtitle?: string;
    avatar?: string;
    image?: string;
}

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// ============================================
// MOCK DATA
// ============================================
const RECENT_SEARCHES = ['photography tips', 'travel Japan', 'cooking class', '@sarah'];

const MOCK_RESULTS: SearchResult[] = [
    { id: '1', type: 'user', title: 'Sarah Chen', subtitle: '@sarahchen • 12.5k followers', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    { id: '2', type: 'user', title: 'Marcus Johnson', subtitle: '@marcusj • 8.2k followers', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100' },
    { id: '3', type: 'community', title: 'Photography Enthusiasts', subtitle: '45k members', image: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=100' },
    { id: '4', type: 'journey', title: 'Tokyo Street Photography', subtitle: 'by @alex • 24 moments', image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=100' },
];

// ============================================
// SEARCH MODAL
// ============================================
export function SearchModal({ isOpen, onClose }: SearchModalProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    // Debounced search
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        const timer = setTimeout(() => {
            // Mock search - filter by query
            const filtered = MOCK_RESULTS.filter(r =>
                r.title.toLowerCase().includes(query.toLowerCase()) ||
                r.subtitle?.toLowerCase().includes(query.toLowerCase())
            );
            setResults(filtered.length > 0 ? filtered : MOCK_RESULTS);
            setLoading(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Keyboard handler
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            return () => document.removeEventListener('keydown', handleEsc);
        }
    }, [isOpen, onClose]);

    const handleRecentSearch = useCallback((search: string) => {
        setQuery(search);
    }, []);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="relative w-full max-w-xl bg-[#0a0a0f] rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 p-4 border-b border-white/10">
                    <span className="text-white/50">🔍</span>
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search people, posts, communities..."
                        className="flex-1 bg-transparent text-white placeholder:text-white/40 focus:outline-none text-lg"
                        autoFocus
                    />
                    {query && (
                        <button onClick={() => setQuery('')} className="text-white/50 hover:text-white">
                            ✕
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="max-h-[60vh] overflow-y-auto">
                    {!query && (
                        <div className="p-4">
                            <h3 className="text-sm font-medium text-white/50 mb-3">Recent Searches</h3>
                            <div className="flex flex-wrap gap-2">
                                {RECENT_SEARCHES.map(search => (
                                    <button
                                        key={search}
                                        onClick={() => handleRecentSearch(search)}
                                        className="px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-sm hover:bg-white/15 transition-colors"
                                    >
                                        {search}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="p-8 text-center">
                            <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white/80 animate-spin mx-auto" />
                        </div>
                    )}

                    {!loading && results.length > 0 && (
                        <div className="py-2">
                            {results.map(result => (
                                <button
                                    key={result.id}
                                    onClick={onClose}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                                >
                                    <div className="w-10 h-10 rounded-full overflow-hidden relative bg-white/10">
                                        {(result.avatar || result.image) && (
                                            <Image
                                                src={result.avatar || result.image || ''}
                                                alt={result.title}
                                                fill
                                                className="object-cover"
                                            />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-medium truncate">{result.title}</p>
                                        <p className="text-sm text-white/50 truncate">{result.subtitle}</p>
                                    </div>
                                    <span className="text-xs text-white/30 capitalize px-2 py-1 rounded bg-white/5">
                                        {result.type}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {!loading && query && results.length === 0 && (
                        <div className="p-8 text-center">
                            <span className="text-4xl mb-2 block">🔍</span>
                            <p className="text-white/50">No results for &ldquo;{query}&rdquo;</p>
                        </div>
                    )}
                </div>

                {/* Keyboard hint */}
                <div className="px-4 py-2 border-t border-white/10 text-xs text-white/30">
                    Press ESC to close
                </div>
            </motion.div>
        </motion.div>
    );
}

export default SearchModal;
