'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { API_URL } from '@/lib/api';

// ============================================
// NEW MEMBERS BANNER - Welcome Ticker
// ============================================
export function NewMembersBanner() {
    const [newMembers, setNewMembers] = useState<Array<{
        id: string;
        username: string;
        displayName: string;
        createdAt: string;
    }>>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchNewMembers = async () => {
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
                const response = await fetch(
                    `${API_URL}/api/v1/users?limit=10&sortBy=createdAt&sortOrder=desc`,
                    {
                        headers: {
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                        },
                        credentials: 'include',
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    // Filter to users joined in the last 7 days
                    const recentUsers = (data.users || []).filter((user: { createdAt: string }) => {
                        const joinDate = new Date(user.createdAt);
                        const sevenDaysAgo = new Date();
                        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                        return joinDate > sevenDaysAgo;
                    });
                    setNewMembers(recentUsers);
                }
            } catch (err) {
                console.error('Error fetching new members:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNewMembers();
        // Refresh every 30 seconds
        const interval = setInterval(fetchNewMembers, 30000);
        return () => clearInterval(interval);
    }, []);

    // Always show banner - with placeholder when loading/empty
    if (isLoading) {
        return (
            <div className="mb-4 h-10 overflow-hidden rounded-xl bg-gradient-to-r from-green-500/5 via-[#00D4FF]/5 to-purple-500/5 border border-white/5 animate-pulse" />
        );
    }

    if (newMembers.length === 0) {
        return (
            <div className="mb-4 overflow-hidden rounded-xl bg-gradient-to-r from-[#00D4FF]/10 to-[#8B5CF6]/10 border border-[#00D4FF]/20">
                <div className="py-2 px-4 flex items-center gap-3">
                    <span className="text-lg">👥</span>
                    <span className="text-sm text-white/70">Be among the first! Invite friends to grow the community.</span>
                    <Link href="/invite" className="ml-auto text-xs text-[#00D4FF] font-semibold hover:underline">Invite →</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-4 overflow-hidden rounded-xl bg-gradient-to-r from-green-500/10 via-[#00D4FF]/10 to-purple-500/10 border border-green-500/20">
            <div className="py-2 px-4 flex items-center gap-3">
                <div className="flex-shrink-0 flex items-center gap-2 text-green-400">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs font-semibold uppercase tracking-wider">New</span>
                </div>
                <div className="flex-1 overflow-hidden">
                    <motion.div
                        className="flex gap-6 whitespace-nowrap"
                        animate={{ x: ['0%', '-50%'] }}
                        transition={{
                            duration: newMembers.length * 4,
                            repeat: Infinity,
                            ease: 'linear',
                        }}
                    >
                        {/* Duplicate for seamless loop */}
                        {[...newMembers, ...newMembers].map((member, idx) => (
                            <Link
                                key={`${member.id}-${idx}`}
                                href={`/profile/${member.username}`}
                                className="flex items-center gap-2 text-sm text-white hover:text-[#00D4FF] transition-colors"
                            >
                                <span className="text-lg">👋</span>
                                <span>
                                    Welcome <span className="font-semibold text-[#00D4FF]">{member.displayName || member.username}</span>!
                                </span>
                            </Link>
                        ))}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
