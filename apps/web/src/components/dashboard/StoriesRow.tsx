'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_URL } from '@/lib/api';

// ============================================
// STORIES ROW - Friends & Active Users (Instagram/TikTok style)
// ============================================
// Quick-action entries shown when no users are loaded
const ACTION_ENTRIES = [
    { id: 'invite-1', username: 'invite', displayName: 'Invite Friends', emoji: '👥', isInvite: true },
    { id: 'explore-1', username: 'explore', displayName: 'Explore', emoji: '🔍', isExplore: true },
];

export function StoriesRow({ currentUser }: { currentUser: { id: string; username?: string; displayName?: string; avatarUrl?: string } }) {
    const [users, setUsers] = useState<Array<{
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
        emoji?: string;
        hasStory?: boolean;
        isLive?: boolean;
        isInvite?: boolean;
        isExplore?: boolean;
    }>>([]); // Start empty, populated by API
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
                const response = await fetch(
                    `${API_URL}/api/v1/users?limit=20`,
                    {
                        headers: {
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                        },
                        credentials: 'include',
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    // Filter out current user
                    const otherUsers = (data.users || []).filter((u: { id: string }) => u.id !== currentUser?.id);
                    if (otherUsers.length > 0) {
                        // Set story/live status to false since we don't have real story/live data
                        const usersWithStatus = otherUsers.map((u: { id: string; username: string; displayName: string; avatarUrl?: string }) => ({
                            ...u,
                            hasStory: false,
                            isLive: false,
                        }));
                        setUsers(usersWithStatus.slice(0, 15));
                    } else {
                        // No users found — show quick-action entries
                        setUsers(ACTION_ENTRIES);
                    }
                } else {
                    setUsers(ACTION_ENTRIES);
                }
            } catch (err) {
                console.error('Error fetching users:', err);
                setUsers(ACTION_ENTRIES);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [currentUser?.id]);

    // Always render the Stories row

    return (
        <div className="mb-4 overflow-x-auto scrollbar-hide">
            <div className="flex gap-4 pb-2">
                {/* Your Story */}
                <Link
                    href="/create"
                    className="flex flex-col items-center gap-1 flex-shrink-0"
                >
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00D4FF]/20 to-[#8B5CF6]/20 border-2 border-dashed border-[#00D4FF]/50 flex items-center justify-center">
                            {currentUser?.avatarUrl ? (
                                <img
                                    src={currentUser.avatarUrl}
                                    alt="Your story"
                                    className="w-14 h-14 rounded-full object-cover opacity-60"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold opacity-60">
                                    {currentUser?.displayName?.[0] || 'U'}
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#00D4FF] flex items-center justify-center border-2 border-[#0A0A0A]">
                            <span className="text-xs text-black font-bold">+</span>
                        </div>
                    </div>
                    <span className="text-xs text-white/60">Your Story</span>
                </Link>

                {/* Other Users */}
                {users.map((user) => {
                    // Determine the href based on user type
                    const href = user.isInvite
                        ? '/invite'
                        : user.isExplore
                            ? '/explore'
                            : user.hasStory || user.isLive
                                ? `/stories/${user.id}`
                                : `/profile/${user.username}`;

                    return (
                        <Link
                            key={user.id}
                            href={href}
                            className="flex flex-col items-center gap-1 flex-shrink-0 group"
                        >
                            <div className="relative">
                                <div className={`w-16 h-16 rounded-full p-0.5 ${user.isLive
                                    ? 'bg-gradient-to-br from-red-500 to-orange-500 animate-pulse'
                                    : user.hasStory
                                        ? 'bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6]'
                                        : user.isInvite
                                            ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                                            : user.isExplore
                                                ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                                                : 'bg-white/20'
                                    }`}>
                                    <div className="w-full h-full rounded-full bg-[#0A0A0A] p-0.5">
                                        {user.avatarUrl ? (
                                            <img
                                                src={user.avatarUrl}
                                                alt={user.displayName}
                                                className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform"
                                            />
                                        ) : user.emoji ? (
                                            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
                                                {user.emoji}
                                            </div>
                                        ) : (
                                            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold text-sm">
                                                {user.displayName?.[0] || 'U'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {user.isLive && (
                                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-red-500 text-[10px] font-bold text-white border border-[#0A0A0A]">
                                        LIVE
                                    </div>
                                )}
                            </div>
                            <span className="text-xs text-white/60 group-hover:text-white transition-colors max-w-16 truncate">
                                {user.displayName?.split(' ')[0] || user.username}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
