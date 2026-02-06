'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_URL } from '@/lib/api';

// ============================================
// PEOPLE TO FOLLOW - Real Users with Follow Buttons
// ============================================
export function PeopleToFollow({ currentUserId }: { currentUserId?: string }) {
    const [users, setUsers] = useState<Array<{
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
        isFollowing: boolean;
    }>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
                const response = await fetch(
                    `${API_URL}/api/v1/users?limit=5`,
                    {
                        headers: {
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                        },
                        credentials: 'include',
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    // Filter out current user and add isFollowing status
                    const filteredUsers = (data.users || [])
                        .filter((u: { id: string }) => u.id !== currentUserId)
                        .slice(0, 5)
                        .map((u: any) => ({ ...u, isFollowing: false }));
                    setUsers(filteredUsers);
                }
            } catch (err) {
                console.error('Error fetching users:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [currentUserId]);

    const handleFollow = async (userId: string) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
        if (!token) return;

        const isCurrentlyFollowing = followingIds.has(userId);
        const method = isCurrentlyFollowing ? 'DELETE' : 'POST';

        try {
            const response = await fetch(
                `${API_URL}/api/v1/users/${userId}/follow`,
                {
                    method,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                }
            );

            if (response.ok) {
                setFollowingIds(prev => {
                    const next = new Set(prev);
                    if (isCurrentlyFollowing) {
                        next.delete(userId);
                    } else {
                        next.add(userId);
                    }
                    return next;
                });
            }
        } catch (err) {
            console.error('Error following user:', err);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 border-2 border-white/20 border-t-[#00D4FF] rounded-full animate-spin" />
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <p className="text-xs text-white/40 text-center py-4">No users to suggest yet</p>
        );
    }

    return (
        <div className="space-y-3">
            {users.map((user) => (
                <div key={user.id} className="flex items-center gap-3">
                    <Link href={`/profile/${user.username}`} className="flex-shrink-0">
                        {user.avatarUrl ? (
                            <img
                                src={user.avatarUrl}
                                alt={user.displayName}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-semibold text-sm">
                                {user.displayName?.[0] || 'U'}
                            </div>
                        )}
                    </Link>
                    <Link href={`/profile/${user.username}`} className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
                        <p className="text-xs text-white/50 truncate">@{user.username}</p>
                    </Link>
                    <button
                        onClick={() => handleFollow(user.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${followingIds.has(user.id)
                            ? 'bg-white/10 text-white/70 hover:bg-white/20'
                            : 'bg-[#00D4FF] text-black hover:opacity-90'
                            }`}
                    >
                        {followingIds.has(user.id) ? 'Following' : 'Follow'}
                    </button>
                </div>
            ))}
        </div>
    );
}
