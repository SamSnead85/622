'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchIcon, CheckCircleIcon } from '@/components/icons';

// ============================================
// TYPES
// ============================================

export interface MentionUser {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
}

export interface HashtagSuggestion {
    tag: string;
    count: number;
    trending?: boolean;
}

// ============================================
// MENTION AUTOCOMPLETE
// ============================================

interface MentionAutocompleteProps {
    query: string;
    position: { top: number; left: number };
    onSelect: (user: MentionUser) => void;
    onClose: () => void;
}

export function MentionAutocomplete({ query, position, onSelect, onClose }: MentionAutocompleteProps) {
    const [users, setUsers] = useState<MentionUser[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Mock search - replace with API call
    useEffect(() => {
        const mockUsers: MentionUser[] = [
            { id: '1', displayName: 'Sarah Ahmed', username: 'sarah_ahmed', avatarUrl: undefined },
            { id: '2', displayName: 'Omar Hassan', username: 'omar_h', avatarUrl: undefined },
            { id: '3', displayName: 'Fatima Ali', username: 'fatima', avatarUrl: undefined },
            { id: '4', displayName: 'Yusuf Khan', username: 'yusuf_k', avatarUrl: undefined },
            { id: '5', displayName: 'Aisha Mahmoud', username: 'aisha_m', avatarUrl: undefined },
        ];

        const filtered = mockUsers.filter(u =>
            u.displayName.toLowerCase().includes(query.toLowerCase()) ||
            u.username.toLowerCase().includes(query.toLowerCase())
        );
        setUsers(filtered.slice(0, 5));
        setSelectedIndex(0);
    }, [query]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, users.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' && users[selectedIndex]) {
                e.preventDefault();
                onSelect(users[selectedIndex]);
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [users, selectedIndex, onSelect, onClose]);

    if (users.length === 0) return null;

    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed z-50 w-64 bg-[#1A1A1F] border border-white/10 rounded-xl shadow-xl overflow-hidden"
            style={{ top: position.top, left: position.left }}
        >
            {users.map((user, index) => (
                <button
                    key={user.id}
                    onClick={() => onSelect(user)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${index === selectedIndex ? 'bg-cyan-500/20' : 'hover:bg-white/5'
                        }`}
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                        {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            user.displayName[0]
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
                        <p className="text-xs text-white/50">@{user.username}</p>
                    </div>
                </button>
            ))}
        </motion.div>
    );
}

// ============================================
// HASHTAG AUTOCOMPLETE
// ============================================

interface HashtagAutocompleteProps {
    query: string;
    position: { top: number; left: number };
    onSelect: (tag: string) => void;
    onClose: () => void;
}

export function HashtagAutocomplete({ query, position, onSelect, onClose }: HashtagAutocompleteProps) {
    const [suggestions, setSuggestions] = useState<HashtagSuggestion[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        const mockTags: HashtagSuggestion[] = [
            { tag: 'community', count: 234, trending: true },
            { tag: 'ramadan', count: 189, trending: true },
            { tag: 'volunteer', count: 145 },
            { tag: 'events', count: 123 },
            { tag: 'youth', count: 98 },
            { tag: 'education', count: 87 },
            { tag: 'sports', count: 76 },
        ];

        const filtered = mockTags.filter(t => t.tag.includes(query.toLowerCase()));
        setSuggestions(filtered.slice(0, 5));
        setSelectedIndex(0);
    }, [query]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' && suggestions[selectedIndex]) {
                e.preventDefault();
                onSelect(suggestions[selectedIndex].tag);
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [suggestions, selectedIndex, onSelect, onClose]);

    if (suggestions.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed z-50 w-56 bg-[#1A1A1F] border border-white/10 rounded-xl shadow-xl overflow-hidden"
            style={{ top: position.top, left: position.left }}
        >
            {suggestions.map((item, index) => (
                <button
                    key={item.tag}
                    onClick={() => onSelect(item.tag)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${index === selectedIndex ? 'bg-cyan-500/20' : 'hover:bg-white/5'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-cyan-400">#</span>
                        <span className="text-white">{item.tag}</span>
                        {item.trending && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400">🔥</span>
                        )}
                    </div>
                    <span className="text-xs text-white/40">{item.count}</span>
                </button>
            ))}
        </motion.div>
    );
}

// ============================================
// POST DRAFT MANAGER
// ============================================

export interface PostDraft {
    id: string;
    content: string;
    mediaUrls?: string[];
    type: 'post' | 'bulletin' | 'comment';
    parentId?: string;
    scheduledFor?: Date;
    updatedAt: Date;
}

const DRAFT_KEY = 'og_post_drafts';

export function useDraftManager() {
    const [drafts, setDrafts] = useState<PostDraft[]>([]);

    useEffect(() => {
        // Load drafts from localStorage
        try {
            const saved = localStorage.getItem(DRAFT_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setDrafts(parsed.map((d: PostDraft) => ({
                    ...d,
                    updatedAt: new Date(d.updatedAt),
                    scheduledFor: d.scheduledFor ? new Date(d.scheduledFor) : undefined,
                })));
            }
        } catch (e) {
            console.error('Failed to load drafts:', e);
        }
    }, []);

    useEffect(() => {
        // Save drafts to localStorage
        try {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
        } catch (e) {
            console.error('Failed to save drafts:', e);
        }
    }, [drafts]);

    const saveDraft = useCallback((draft: Omit<PostDraft, 'id' | 'updatedAt'>) => {
        const newDraft: PostDraft = {
            ...draft,
            id: Date.now().toString(),
            updatedAt: new Date(),
        };
        setDrafts(prev => [...prev, newDraft]);
        return newDraft.id;
    }, []);

    const updateDraft = useCallback((id: string, content: string) => {
        setDrafts(prev => prev.map(d =>
            d.id === id ? { ...d, content, updatedAt: new Date() } : d
        ));
    }, []);

    const deleteDraft = useCallback((id: string) => {
        setDrafts(prev => prev.filter(d => d.id !== id));
    }, []);

    const getDraft = useCallback((id: string) => {
        return drafts.find(d => d.id === id);
    }, [drafts]);

    return { drafts, saveDraft, updateDraft, deleteDraft, getDraft };
}

// ============================================
// DRAFT INDICATOR
// ============================================

interface DraftIndicatorProps {
    lastSaved?: Date;
    isSaving?: boolean;
}

export function DraftIndicator({ lastSaved, isSaving }: DraftIndicatorProps) {
    if (!lastSaved && !isSaving) return null;

    return (
        <div className="flex items-center gap-2 text-xs text-white/40">
            {isSaving ? (
                <>
                    <div className="w-3 h-3 border border-white/40 border-t-white/80 rounded-full animate-spin" />
                    <span>Saving...</span>
                </>
            ) : lastSaved ? (
                <>
                    <CheckCircleIcon size={12} className="text-green-400" />
                    <span>Draft saved</span>
                </>
            ) : null}
        </div>
    );
}

// ============================================
// SCHEDULED POST PICKER
// ============================================

interface SchedulePickerProps {
    value?: Date;
    onChange: (date: Date | undefined) => void;
    minDate?: Date;
}

export function SchedulePicker({ value, onChange, minDate = new Date() }: SchedulePickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    const formatDate = (date: Date) => {
        return date.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const quickOptions = [
        { label: 'In 1 hour', getDate: () => new Date(Date.now() + 60 * 60 * 1000) },
        {
            label: 'Tonight 8 PM', getDate: () => {
                const d = new Date();
                d.setHours(20, 0, 0, 0);
                if (d < new Date()) d.setDate(d.getDate() + 1);
                return d;
            }
        },
        {
            label: 'Tomorrow 9 AM', getDate: () => {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                d.setHours(9, 0, 0, 0);
                return d;
            }
        },
        {
            label: 'This Weekend', getDate: () => {
                const d = new Date();
                const day = d.getDay();
                const daysUntilSaturday = (6 - day + 7) % 7 || 7;
                d.setDate(d.getDate() + daysUntilSaturday);
                d.setHours(10, 0, 0, 0);
                return d;
            }
        },
    ];

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${value
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
            >
                <span className="text-sm">📅</span>
                <span className="text-sm">
                    {value ? formatDate(value) : 'Schedule'}
                </span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full mb-2 right-0 w-64 bg-[#1A1A1F] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
                    >
                        <div className="p-3 border-b border-white/10">
                            <p className="text-sm font-medium text-white mb-2">Quick Select</p>
                            <div className="space-y-1">
                                {quickOptions.map(opt => (
                                    <button
                                        key={opt.label}
                                        onClick={() => { onChange(opt.getDate()); setIsOpen(false); }}
                                        className="w-full px-3 py-2 text-left text-sm text-white/70 hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-3">
                            <p className="text-sm font-medium text-white mb-2">Custom</p>
                            <input
                                type="datetime-local"
                                min={minDate.toISOString().slice(0, 16)}
                                value={value?.toISOString().slice(0, 16) || ''}
                                onChange={(e) => { onChange(new Date(e.target.value)); setIsOpen(false); }}
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                            />
                        </div>

                        {value && (
                            <div className="p-3 pt-0">
                                <button
                                    onClick={() => { onChange(undefined); setIsOpen(false); }}
                                    className="w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    Remove Schedule
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// BOOKMARK MANAGER
// ============================================

export interface Bookmark {
    id: string;
    postId: string;
    title: string;
    preview: string;
    savedAt: Date;
    collection?: string;
}

const BOOKMARK_KEY = 'og_bookmarks';

export function useBookmarks() {
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(BOOKMARK_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setBookmarks(parsed.map((b: Bookmark) => ({
                    ...b,
                    savedAt: new Date(b.savedAt),
                })));
            }
        } catch (e) {
            console.error('Failed to load bookmarks:', e);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
        } catch (e) {
            console.error('Failed to save bookmarks:', e);
        }
    }, [bookmarks]);

    const addBookmark = useCallback((postId: string, title: string, preview: string, collection?: string) => {
        if (bookmarks.some(b => b.postId === postId)) return;

        const newBookmark: Bookmark = {
            id: Date.now().toString(),
            postId,
            title,
            preview,
            savedAt: new Date(),
            collection,
        };
        setBookmarks(prev => [newBookmark, ...prev]);
    }, [bookmarks]);

    const removeBookmark = useCallback((postId: string) => {
        setBookmarks(prev => prev.filter(b => b.postId !== postId));
    }, []);

    const isBookmarked = useCallback((postId: string) => {
        return bookmarks.some(b => b.postId === postId);
    }, [bookmarks]);

    return { bookmarks, addBookmark, removeBookmark, isBookmarked };
}

export default MentionAutocomplete;
