"use client";

/**
 * PERSONAL MISSION CONTROL
 * Individual dashboard with stats, connections, and quick actions
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';

interface ConnectionRequest {
    id: string;
    message?: string;
    createdAt: string;
    sender: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
        isVerified: boolean;
        bio?: string;
    };
}

interface DashboardStats {
    followersCount: number;
    followingCount: number;
    postsCount: number;
    groupsCount: number;
    pendingConnections: number;
}

export default function PersonalDashboardPage() {
    const { isAuthenticated, user } = useAuth();
    const [mounted, setMounted] = useState(false);

    // Data states
    const [stats, setStats] = useState<DashboardStats>({
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        groupsCount: 0,
        pendingConnections: 0,
    });
    const [pendingRequests, setPendingRequests] = useState<ConnectionRequest[]>([]);
    const [autoApprove, setAutoApprove] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetch dashboard data
    const fetchDashboard = useCallback(async () => {
        if (!isAuthenticated) return;

        try {
            setLoading(true);

            const [pendingRes, settingsRes, userRes] = await Promise.all([
                apiFetch('/community/connections/pending?limit=10'),
                apiFetch('/community/connections/settings'),
                apiFetch(`/users/${user?.id}`),
            ]);

            if (pendingRes.ok) {
                const data = await pendingRes.json();
                setPendingRequests(data.requests || []);
                setStats(prev => ({ ...prev, pendingConnections: data.count || 0 }));
            }

            if (settingsRes.ok) {
                const data = await settingsRes.json();
                setAutoApprove(data.autoApprove || false);
            }

            if (userRes.ok) {
                const data = await userRes.json();
                setStats(prev => ({
                    ...prev,
                    followersCount: data.followersCount || 0,
                    followingCount: data.followingCount || 0,
                    postsCount: data.postsCount || 0,
                }));
            }
        } catch (error) {
            console.error('Failed to fetch dashboard:', error);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, user?.id]);

    // Handle connection response
    const handleConnectionResponse = async (requestId: string, accept: boolean) => {
        try {
            const response = await apiFetch(`/community/connections/respond/${requestId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accept }),
            });

            if (response.ok) {
                setPendingRequests(prev => prev.filter(r => r.id !== requestId));
                setStats(prev => ({ ...prev, pendingConnections: prev.pendingConnections - 1 }));

                if (accept) {
                    setStats(prev => ({
                        ...prev,
                        followersCount: prev.followersCount + 1,
                        followingCount: prev.followingCount + 1,
                    }));
                }
            }
        } catch (error) {
            console.error('Failed to respond to connection:', error);
        }
    };

    // Handle bulk accept/decline
    const handleBulkResponse = async (accept: boolean) => {
        const requestIds = pendingRequests.map(r => r.id);

        try {
            const response = await apiFetch('/community/connections/bulk-respond', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestIds, accept }),
            });

            if (response.ok) {
                const data = await response.json();
                fetchDashboard();
                console.log(`Processed ${data.succeeded} of ${data.total} requests`);
            }
        } catch (error) {
            console.error('Failed to bulk respond:', error);
        }
    };

    // Toggle auto-approve
    const handleToggleAutoApprove = async () => {
        try {
            const response = await apiFetch('/community/connections/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ autoApprove: !autoApprove }),
            });

            if (response.ok) {
                setAutoApprove(!autoApprove);
            }
        } catch (error) {
            console.error('Failed to update settings:', error);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchDashboard();
    }, [fetchDashboard]);

    if (!mounted || !isAuthenticated) {
        return <div className="min-h-screen bg-[#050508]" />;
    }

    const statCards = [
        { label: 'Followers', value: stats.followersCount, icon: '👥', color: 'from-blue-500 to-cyan-500' },
        { label: 'Following', value: stats.followingCount, icon: '👤', color: 'from-violet-500 to-purple-500' },
        { label: 'Posts', value: stats.postsCount, icon: '📝', color: 'from-orange-500 to-amber-500' },
        { label: 'Groups', value: stats.groupsCount, icon: '🏘️', color: 'from-emerald-500 to-teal-500' },
    ];

    return (
        <div className="min-h-screen bg-[#050508]">
            <Navigation activeTab="community" />

            <main className="pt-20 pb-24">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/community"
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-white/70"
                            >
                                ← Community
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold text-white">Mission Control</h1>
                                <p className="text-white/60">Your personal command center</p>
                            </div>
                        </div>

                        {/* User Info */}
                        <div className="flex items-center gap-4">
                            {user?.avatarUrl ? (
                                <Image
                                    src={user.avatarUrl}
                                    alt={user.displayName || ''}
                                    width={48}
                                    height={48}
                                    className="rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-violet-500 flex items-center justify-center text-white font-bold text-lg">
                                    {user?.displayName?.[0] || 'U'}
                                </div>
                            )}
                            <div className="text-right">
                                <div className="font-semibold text-white">{user?.displayName}</div>
                                <div className="text-sm text-white/50">@{user?.username}</div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {statCards.map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="p-5 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10"
                            >
                                <div className="text-3xl mb-2">{stat.icon}</div>
                                <div className="text-3xl font-bold text-white">{stat.value.toLocaleString()}</div>
                                <div className="text-white/50">{stat.label}</div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Pending Connections */}
                        <div className="lg:col-span-2">
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                            🔔 Pending Connections
                                            {stats.pendingConnections > 0 && (
                                                <span className="px-2.5 py-1 bg-orange-500 text-white text-sm font-bold rounded-full">
                                                    {stats.pendingConnections}
                                                </span>
                                            )}
                                        </h2>
                                    </div>

                                    {pendingRequests.length > 0 && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleBulkResponse(true)}
                                                className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors text-sm font-medium"
                                            >
                                                Accept All
                                            </button>
                                            <button
                                                onClick={() => handleBulkResponse(false)}
                                                className="px-4 py-2 bg-white/5 text-white/70 rounded-lg hover:bg-white/10 transition-colors text-sm"
                                            >
                                                Decline All
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {loading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
                                        ))}
                                    </div>
                                ) : pendingRequests.length === 0 ? (
                                    <div className="text-center py-12 text-white/50">
                                        <div className="text-5xl mb-4">✅</div>
                                        <p>No pending connection requests</p>
                                    </div>
                                ) : (
                                    <AnimatePresence mode="popLayout">
                                        <div className="space-y-3">
                                            {pendingRequests.map((request, i) => (
                                                <motion.div
                                                    key={request.id}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className="flex items-center gap-4 p-4 bg-white/5 rounded-xl hover:bg-white/[0.07] transition-colors"
                                                >
                                                    {request.sender.avatarUrl ? (
                                                        <Image
                                                            src={request.sender.avatarUrl}
                                                            alt={request.sender.displayName}
                                                            width={48}
                                                            height={48}
                                                            className="rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-violet-500 flex items-center justify-center text-white font-bold">
                                                            {request.sender.displayName[0]}
                                                        </div>
                                                    )}

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-white">{request.sender.displayName}</span>
                                                            {request.sender.isVerified && <span className="text-blue-400">✓</span>}
                                                        </div>
                                                        <div className="text-sm text-white/50 truncate">
                                                            @{request.sender.username}
                                                            {request.sender.bio && ` · ${request.sender.bio.slice(0, 50)}...`}
                                                        </div>
                                                        {request.message && (
                                                            <div className="text-sm text-white/70 mt-1 line-clamp-1">
                                                                &quot;{request.message}&quot;
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleConnectionResponse(request.id, true)}
                                                            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-violet-500 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                                                        >
                                                            Accept
                                                        </button>
                                                        <button
                                                            onClick={() => handleConnectionResponse(request.id, false)}
                                                            className="px-4 py-2 bg-white/5 text-white/70 rounded-lg hover:bg-white/10 transition-colors"
                                                        >
                                                            Decline
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </AnimatePresence>
                                )}
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Quick Publish */}
                            <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-500/20 to-violet-500/20 border border-orange-500/30">
                                <h3 className="font-bold text-white mb-4">📢 Quick Publish</h3>
                                <p className="text-white/70 text-sm mb-4">Share with the community</p>
                                <div className="space-y-2">
                                    <Link
                                        href="/community/create"
                                        className="block w-full py-3 text-center bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-colors"
                                    >
                                        Create Post
                                    </Link>
                                    <Link
                                        href="/community/streams/suggest"
                                        className="block w-full py-3 text-center bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                                    >
                                        Suggest Live Stream
                                    </Link>
                                </div>
                            </div>

                            {/* Connection Settings */}
                            <div className="p-5 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
                                <h3 className="font-bold text-white mb-4">⚙️ Connection Settings</h3>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                                    <div>
                                        <div className="font-medium text-white">Auto-Approve</div>
                                        <div className="text-sm text-white/50">Automatically accept connection requests</div>
                                    </div>
                                    <button
                                        onClick={handleToggleAutoApprove}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${autoApprove ? 'bg-emerald-500' : 'bg-white/20'}`}
                                    >
                                        <div
                                            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${autoApprove ? 'left-7' : 'left-1'}`}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Quick Links */}
                            <div className="p-5 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
                                <h3 className="font-bold text-white mb-4">🔗 Quick Links</h3>
                                <div className="space-y-2">
                                    <Link href="/profile" className="block p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-white">
                                        👤 My Profile
                                    </Link>
                                    <Link href="/settings" className="block p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-white">
                                        ⚙️ Settings
                                    </Link>
                                    <Link href="/communities" className="block p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-white">
                                        🏘️ My Communities
                                    </Link>
                                    <Link href="/messages" className="block p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-white">
                                        💬 Messages
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
