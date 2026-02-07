'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface UserSuggestion {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    isFollowing?: boolean;
}

export function RightSidebar() {
    const { user } = useAuth();
    const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetchSuggestions = async () => {
            try {
                // Fetch real users to follow. Using public users endpoint.
                const res = await apiFetch('/users?limit=5');
                if (res.ok) {
                    const data = await res.json();
                    // Filter out self and already following (if API doesn't)
                    const users = (data.users || []).filter((u: any) => u.id !== user.id);
                    setSuggestions(users.slice(0, 3));
                }
            } catch (err) {
                console.error('Failed to load suggestions');
            }
            setLoading(false);
        };
        fetchSuggestions();
    }, [user]);

    const handleFollow = async (targetId: string) => {
        try {
            // Optimistic update
            setSuggestions(prev => prev.map(u =>
                u.id === targetId ? { ...u, isFollowing: true } : u
            ));

            const res = await apiFetch(`/users/${targetId}/follow`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed');
        } catch (error) {
            // Revert on failure
            setSuggestions(prev => prev.map(u =>
                u.id === targetId ? { ...u, isFollowing: false } : u
            ));
            console.error('Follow failed', error);
        }
    };

    if (!user) return null;

    return (
        <aside className="fixed right-0 top-0 bottom-0 w-80 border-l border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent hidden xl:block pt-24 px-6 overflow-y-auto">
            {/* Search */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search 0G..."
                    className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/20 transition-colors"
                />
            </div>

            {/* Suggestions */}
            <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-white">People to Follow</h3>
                    <Link href="/explore" className="text-xs text-rose-500 hover:text-rose-400">See All</Link>
                </div>

                {loading ? (
                    <div className="flex justify-center py-4">
                        <div className="w-5 h-5 border-2 border-white/20 border-t-rose-500 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {suggestions.length === 0 ? (
                            <p className="text-white/40 text-sm text-center">No suggestions yet</p>
                        ) : (
                            suggestions.map((u) => (
                                <div key={u.id} className="flex items-center justify-between group hover:bg-white/[0.04] rounded-xl px-2 py-2 -mx-2 transition-all duration-200">
                                    <Link href={`/profile/${u.username}`} className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 p-0.5">
                                            <div className="w-full h-full rounded-full overflow-hidden bg-black relative">
                                                {u.avatarUrl ? (
                                                    <Image src={u.avatarUrl} alt={u.displayName} fill className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-white/50 text-xs font-bold">
                                                        {u.displayName?.charAt(0) || '?'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-white group-hover:text-rose-500 transition-colors line-clamp-1">{u.displayName}</p>
                                            <p className="text-xs text-white/40">@{u.username}</p>
                                        </div>
                                    </Link>
                                    <button
                                        onClick={() => handleFollow(u.id)}
                                        disabled={u.isFollowing}
                                        className={`text-xs font-semibold px-4 py-1.5 rounded-full transition-all duration-200 ${u.isFollowing
                                                ? 'bg-white/10 text-white/50 cursor-default'
                                                : 'bg-[#00D4FF] text-black hover:bg-[#00D4FF]/80 hover:shadow-[0_0_12px_rgba(0,212,255,0.3)]'
                                            }`}
                                    >
                                        {u.isFollowing ? 'Following' : 'Follow'}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Footer Links */}
            <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/30 px-2">
                <Link href="/about" className="hover:text-white/50">About</Link>
                <Link href="/privacy" className="hover:text-white/50">Privacy</Link>
                <Link href="/terms" className="hover:text-white/50">Terms</Link>
                <span className="w-full mt-2">© 2026 ZeroG Inc.</span>
            </div>
        </aside>
    );
}
