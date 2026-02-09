'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { NavigationSidebar } from '@/components/dashboard/NavigationSidebar';
import { API_URL } from '@/lib/api';

// ============================================
// TYPES
// ============================================
interface OverviewStats {
    totalMembers: number;
    newMembersThisMonth: number;
    newMembersThisWeek: number;
    totalPosts: number;
    postsThisWeek: number;
    activeMembersThisWeek: number;
    bannedMembers: number;
    mutedMembers: number;
    engagementRate: number;
}

interface TopPost {
    id: string;
    content: string;
    likes: number;
    comments: number;
    shares: number;
    createdAt: string;
    author: { username: string; displayName: string; avatarUrl?: string };
}

interface TopContributor {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    postCount: number;
}

interface GrowthData {
    week: string;
    count: number;
}

interface Report {
    id: string;
    reason: string;
    details?: string;
    createdAt: string;
    reporter: { username: string; displayName: string };
    post: {
        id: string;
        content: string;
        mediaUrl?: string;
        createdAt: string;
        user: { username: string; displayName: string; avatarUrl?: string };
    };
}

interface FlaggedMember {
    userId: string;
    role: string;
    isBanned: boolean;
    isMuted: boolean;
    user: { username: string; displayName: string; avatarUrl?: string };
}

interface Member {
    id: string;
    userId: string;
    role: string;
    isMuted: boolean;
    isBanned: boolean;
    joinedAt: string;
    user: { username: string; displayName: string; avatarUrl?: string; email?: string };
}

const API = API_URL;
const getToken = () => typeof window !== 'undefined'
    ? (localStorage.getItem('token') || localStorage.getItem('0g_token') || '')
    : '';

// ============================================
// MAIN PAGE
// ============================================
export default function CommunityAdminPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'moderation' | 'filters' | 'settings'>('overview');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Analytics data
    const [overview, setOverview] = useState<OverviewStats | null>(null);
    const [topPosts, setTopPosts] = useState<TopPost[]>([]);
    const [topContributors, setTopContributors] = useState<TopContributor[]>([]);
    const [memberGrowth, setMemberGrowth] = useState<GrowthData[]>([]);

    // Moderation data
    const [reports, setReports] = useState<Report[]>([]);
    const [flaggedMembers, setFlaggedMembers] = useState<FlaggedMember[]>([]);

    // Member management
    const [members, setMembers] = useState<Member[]>([]);
    const [memberSearch, setMemberSearch] = useState('');
    const [memberPage, setMemberPage] = useState(1);

    // Content filters
    const [filters, setFilters] = useState<Array<{
        id: string; type: string; pattern: string; action: string; isActive: boolean; hitCount: number; createdAt: string;
    }>>([]);

    const [communityName, setCommunityName] = useState('');

    const fetchAnalytics = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/v1/communities/${id}/analytics`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (!res.ok) {
                if (res.status === 403) {
                    setError('You do not have admin access to this community.');
                    return;
                }
                throw new Error('Failed to load analytics');
            }
            const data = await res.json();
            setOverview(data.overview);
            setTopPosts(data.topPosts);
            setTopContributors(data.topContributors);
            setMemberGrowth(data.memberGrowth);
        } catch {
            setError('Failed to load analytics.');
        }
    }, [id]);

    const fetchModeration = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/v1/communities/${id}/moderation`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (res.ok) {
                const data = await res.json();
                setReports(data.reports);
                setFlaggedMembers(data.flaggedMembers);
            }
        } catch { /* ignore */ }
    }, [id]);

    const fetchMembers = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/v1/communities/${id}/members?page=${memberPage}&limit=50`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (res.ok) {
                const data = await res.json();
                setMembers(data.members || data);
            }
        } catch { /* ignore */ }
    }, [id, memberPage]);

    const fetchFilters = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/v1/communities/${id}/filters`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (res.ok) {
                const data = await res.json();
                setFilters(data.filters || []);
            }
        } catch { /* ignore */ }
    }, [id]);

    const fetchCommunityName = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/v1/communities/${id}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (res.ok) {
                const data = await res.json();
                setCommunityName(data.name || data.community?.name || '');
            }
        } catch { /* ignore */ }
    }, [id]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([fetchAnalytics(), fetchModeration(), fetchMembers(), fetchFilters(), fetchCommunityName()]);
            setLoading(false);
        };
        load();
    }, [fetchAnalytics, fetchModeration, fetchMembers, fetchFilters, fetchCommunityName]);

    const handleMemberAction = async (userId: string, action: 'mute' | 'unmute' | 'ban' | 'unban' | 'promote' | 'demote') => {
        try {
            const bodyMap: Record<string, Record<string, unknown>> = {
                mute: { isMuted: true },
                unmute: { isMuted: false },
                ban: { isBanned: true },
                unban: { isBanned: false },
                promote: { role: 'MODERATOR' },
                demote: { role: 'MEMBER' },
            };

            await fetch(`${API}/api/v1/communities/${id}/members/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify(bodyMap[action]),
            });

            fetchMembers();
            fetchModeration();
        } catch { /* ignore */ }
    };

    const filteredMembers = members.filter(m => {
        if (!memberSearch) return true;
        const q = memberSearch.toLowerCase();
        return m.user?.username?.toLowerCase().includes(q) || m.user?.displayName?.toLowerCase().includes(q);
    });

    if (error) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-white/60 mb-4">{error}</p>
                    <Link href={`/communities/${id}`} className="text-[#D4AF37] text-sm hover:underline">
                        Back to community
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            <NavigationSidebar />
            <div className="lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
            {/* Header */}
            <div className="border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-3 mb-3">
                        <Link href={`/communities/${id}`} className="text-white/40 hover:text-white/60 transition">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-white">{communityName || 'Community'} Admin</h1>
                            <p className="text-xs text-white/40">Analytics, moderation, and member management</p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1">
                        {(['overview', 'members', 'moderation', 'filters', 'settings'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                    activeTab === tab
                                        ? 'bg-white/10 text-white'
                                        : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                                }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                {tab === 'moderation' && reports.length > 0 && (
                                    <span className="ml-1.5 px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded-full">
                                        {reports.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {activeTab === 'overview' && (
                            <OverviewTab
                                key="overview"
                                overview={overview}
                                topPosts={topPosts}
                                topContributors={topContributors}
                                memberGrowth={memberGrowth}
                            />
                        )}
                        {activeTab === 'members' && (
                            <MembersTab
                                key="members"
                                members={filteredMembers}
                                search={memberSearch}
                                onSearchChange={setMemberSearch}
                                onAction={handleMemberAction}
                            />
                        )}
                        {activeTab === 'moderation' && (
                            <ModerationTab
                                key="moderation"
                                reports={reports}
                                flaggedMembers={flaggedMembers}
                                communityId={id as string}
                                onRefresh={() => { fetchModeration(); fetchMembers(); }}
                            />
                        )}
                        {activeTab === 'filters' && (
                            <FiltersTab
                                key="filters"
                                filters={filters}
                                communityId={id as string}
                                onRefresh={fetchFilters}
                            />
                        )}
                        {activeTab === 'settings' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <div className="text-center py-12">
                                    <p className="text-white/40 mb-4">Community settings are available on the dedicated settings page.</p>
                                    <Link
                                        href={`/communities/${id}/settings`}
                                        className="px-4 py-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-lg text-sm hover:bg-[#D4AF37]/20 transition"
                                    >
                                        Open Settings
                                    </Link>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>
            </div>
        </div>
    );
}

// ============================================
// OVERVIEW TAB
// ============================================
function OverviewTab({ overview, topPosts, topContributors, memberGrowth }: {
    overview: OverviewStats | null;
    topPosts: TopPost[];
    topContributors: TopContributor[];
    memberGrowth: GrowthData[];
}) {
    if (!overview) return null;

    const statCards = [
        { label: 'Total Members', value: overview.totalMembers, icon: '👥', color: 'from-blue-500/20 to-blue-600/5' },
        { label: 'New This Week', value: overview.newMembersThisWeek, icon: '📈', color: 'from-green-500/20 to-green-600/5' },
        { label: 'New This Month', value: overview.newMembersThisMonth, icon: '📊', color: 'from-purple-500/20 to-purple-600/5' },
        { label: 'Posts This Week', value: overview.postsThisWeek, icon: '📝', color: 'from-amber-500/20 to-amber-600/5' },
        { label: 'Active Members', value: overview.activeMembersThisWeek, icon: '🔥', color: 'from-orange-500/20 to-orange-600/5' },
        { label: 'Engagement Rate', value: `${overview.engagementRate}%`, icon: '💡', color: 'from-cyan-500/20 to-cyan-600/5' },
    ];

    const maxGrowth = Math.max(...memberGrowth.map(g => g.count), 1);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
        >
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {statCards.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`rounded-xl border border-white/[0.06] bg-gradient-to-br ${stat.color} p-4`}
                    >
                        <div className="text-lg mb-1">{stat.icon}</div>
                        <div className="text-2xl font-bold text-white">{stat.value}</div>
                        <div className="text-xs text-white/40">{stat.label}</div>
                    </motion.div>
                ))}
            </div>

            {/* Member Growth Chart */}
            {memberGrowth.length > 0 && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">Member Growth (12 weeks)</h3>
                    <div className="flex items-end gap-1 h-32">
                        {memberGrowth.map((g, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <div
                                    className="w-full bg-gradient-to-t from-[#D4AF37]/40 to-[#D4AF37]/10 rounded-t"
                                    style={{ height: `${(g.count / maxGrowth) * 100}%`, minHeight: '4px' }}
                                />
                                <span className="text-[8px] text-white/30">{g.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Two-column layout */}
            <div className="grid md:grid-cols-2 gap-4">
                {/* Top Posts */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                    <h3 className="text-sm font-semibold text-white mb-3">Top Posts</h3>
                    <div className="space-y-3">
                        {topPosts.slice(0, 5).map(post => (
                            <div key={post.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/30 to-purple-600/30 flex items-center justify-center text-xs shrink-0">
                                    {post.author?.avatarUrl && !post.author.avatarUrl.startsWith('preset:') ? (
                                        <img src={post.author.avatarUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                                    ) : (
                                        post.author?.displayName?.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white/70 line-clamp-2">{post.content}</p>
                                    <div className="flex gap-3 mt-1">
                                        <span className="text-[10px] text-white/30">❤️ {post.likes}</span>
                                        <span className="text-[10px] text-white/30">💬 {post.comments}</span>
                                        <span className="text-[10px] text-white/30">🔄 {post.shares}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {topPosts.length === 0 && (
                            <p className="text-xs text-white/30 text-center py-4">No posts yet</p>
                        )}
                    </div>
                </div>

                {/* Top Contributors */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                    <h3 className="text-sm font-semibold text-white mb-3">Top Contributors (30 days)</h3>
                    <div className="space-y-2">
                        {topContributors.map((c, i) => (
                            <div key={c.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition">
                                <span className="text-xs font-bold text-white/30 w-5 text-right">#{i + 1}</span>
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/30 to-purple-600/30 flex items-center justify-center text-[10px] shrink-0">
                                    {c.avatarUrl && !c.avatarUrl.startsWith('preset:') ? (
                                        <img src={c.avatarUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                                    ) : (
                                        c.displayName?.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white/80 truncate">{c.displayName}</p>
                                    <p className="text-[10px] text-white/30">@{c.username}</p>
                                </div>
                                <div className="text-xs font-medium text-[#D4AF37]">{c.postCount} posts</div>
                            </div>
                        ))}
                        {topContributors.length === 0 && (
                            <p className="text-xs text-white/30 text-center py-4">No activity yet</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Moderation Summary */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h3 className="text-sm font-semibold text-white mb-2">Moderation Summary</h3>
                <div className="flex gap-6">
                    <div>
                        <span className="text-lg font-bold text-red-400">{overview.bannedMembers}</span>
                        <span className="text-xs text-white/30 ml-1">banned</span>
                    </div>
                    <div>
                        <span className="text-lg font-bold text-amber-400">{overview.mutedMembers}</span>
                        <span className="text-xs text-white/30 ml-1">muted</span>
                    </div>
                    <div>
                        <span className="text-lg font-bold text-white/60">{overview.totalPosts}</span>
                        <span className="text-xs text-white/30 ml-1">total posts</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// MEMBERS TAB
// ============================================
function MembersTab({ members, search, onSearchChange, onAction }: {
    members: Member[];
    search: string;
    onSearchChange: (v: string) => void;
    onAction: (userId: string, action: 'mute' | 'unmute' | 'ban' | 'unban' | 'promote' | 'demote') => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
        >
            {/* Search */}
            <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text"
                    placeholder="Search members..."
                    value={search}
                    onChange={e => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37]/30"
                />
            </div>

            {/* Members List */}
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 px-4 py-2 bg-white/[0.03] text-[10px] text-white/40 uppercase tracking-wider">
                    <span>Member</span>
                    <span>Role</span>
                    <span>Joined</span>
                    <span>Actions</span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                    {members.map(m => (
                        <div key={m.id || m.userId} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 px-4 py-3 items-center hover:bg-white/[0.02] transition">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/30 to-purple-600/30 flex items-center justify-center text-[10px] shrink-0">
                                    {m.user?.avatarUrl && !m.user.avatarUrl.startsWith('preset:') ? (
                                        <img src={m.user.avatarUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                                    ) : (
                                        m.user?.displayName?.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs text-white/80 truncate">{m.user?.displayName}</p>
                                    <p className="text-[10px] text-white/30 truncate">@{m.user?.username}</p>
                                </div>
                                {m.isBanned && <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[9px] rounded">Banned</span>}
                                {m.isMuted && <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] rounded">Muted</span>}
                            </div>
                            <div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                    m.role === 'ADMIN' || m.role === 'OWNER'
                                        ? 'bg-[#D4AF37]/10 text-[#D4AF37]'
                                        : m.role === 'MODERATOR'
                                        ? 'bg-purple-500/10 text-purple-400'
                                        : 'bg-white/[0.05] text-white/40'
                                }`}>
                                    {m.role}
                                </span>
                            </div>
                            <div className="text-[10px] text-white/30">
                                {new Date(m.joinedAt).toLocaleDateString()}
                            </div>
                            <div className="flex gap-1">
                                {m.role !== 'OWNER' && m.role !== 'ADMIN' && (
                                    <>
                                        <button
                                            onClick={() => onAction(m.userId, m.isMuted ? 'unmute' : 'mute')}
                                            className="p-1.5 rounded-lg hover:bg-white/[0.06] transition text-white/30 hover:text-amber-400"
                                            title={m.isMuted ? 'Unmute' : 'Mute'}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                {m.isMuted ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                                ) : (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                                )}
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => onAction(m.userId, m.isBanned ? 'unban' : 'ban')}
                                            className="p-1.5 rounded-lg hover:bg-white/[0.06] transition text-white/30 hover:text-red-400"
                                            title={m.isBanned ? 'Unban' : 'Ban'}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => onAction(m.userId, m.role === 'MODERATOR' ? 'demote' : 'promote')}
                                            className="p-1.5 rounded-lg hover:bg-white/[0.06] transition text-white/30 hover:text-purple-400"
                                            title={m.role === 'MODERATOR' ? 'Demote to Member' : 'Promote to Moderator'}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                            </svg>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {members.length === 0 && (
                <p className="text-center text-xs text-white/30 py-8">No members found</p>
            )}
        </motion.div>
    );
}

// ============================================
// MODERATION TAB
// ============================================
function ModerationTab({ reports, flaggedMembers, communityId, onRefresh }: {
    reports: Report[];
    flaggedMembers: FlaggedMember[];
    communityId: string;
    onRefresh: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
        >
            {/* Reports Queue */}
            <div>
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    Reported Content
                    {reports.length > 0 && (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded-full">{reports.length}</span>
                    )}
                </h3>
                {reports.length > 0 ? (
                    <div className="space-y-3">
                        {reports.map(r => (
                            <div key={r.id} className="rounded-xl border border-red-500/10 bg-red-500/[0.03] p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <span className="text-[10px] text-red-400 font-medium">{r.reason}</span>
                                        <p className="text-xs text-white/50 mt-0.5">Reported by @{r.reporter?.username}</p>
                                    </div>
                                    <span className="text-[10px] text-white/20">{new Date(r.createdAt).toLocaleDateString()}</span>
                                </div>
                                {r.post && (
                                    <div className="bg-white/[0.03] rounded-lg p-3 mt-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] text-white/40">@{r.post.user?.username}</span>
                                        </div>
                                        <p className="text-xs text-white/60 line-clamp-3">{r.post.content}</p>
                                    </div>
                                )}
                                {r.details && (
                                    <p className="text-[10px] text-white/30 mt-2 italic">&quot;{r.details}&quot;</p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
                        <div className="text-2xl mb-2">✨</div>
                        <p className="text-xs text-white/40">No pending reports. Community is clean!</p>
                    </div>
                )}
            </div>

            {/* Flagged Members */}
            <div>
                <h3 className="text-sm font-semibold text-white mb-3">Flagged Members</h3>
                {flaggedMembers.length > 0 ? (
                    <div className="space-y-2">
                        {flaggedMembers.map(m => (
                            <div key={m.userId} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/30 to-purple-600/30 flex items-center justify-center text-xs shrink-0">
                                    {m.user?.avatarUrl && !m.user.avatarUrl.startsWith('preset:') ? (
                                        <img src={m.user.avatarUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                                    ) : (
                                        m.user?.displayName?.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white/80">{m.user?.displayName}</p>
                                    <p className="text-[10px] text-white/30">@{m.user?.username}</p>
                                </div>
                                <div className="flex gap-1.5">
                                    {m.isBanned && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded">Banned</span>}
                                    {m.isMuted && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] rounded">Muted</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
                        <p className="text-xs text-white/40">No flagged members</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ============================================
// FILTERS TAB
// ============================================
function FiltersTab({ filters, communityId, onRefresh }: {
    filters: Array<{ id: string; type: string; pattern: string; action: string; isActive: boolean; hitCount: number; createdAt: string }>;
    communityId: string;
    onRefresh: () => void;
}) {
    const [showAdd, setShowAdd] = useState(false);
    const [newFilter, setNewFilter] = useState({ type: 'keyword', pattern: '', action: 'flag' });
    const [saving, setSaving] = useState(false);

    const handleAdd = async () => {
        if (!newFilter.pattern.trim()) return;
        setSaving(true);
        try {
            await fetch(`${API}/api/v1/communities/${communityId}/filters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify(newFilter),
            });
            setNewFilter({ type: 'keyword', pattern: '', action: 'flag' });
            setShowAdd(false);
            onRefresh();
        } catch { /* ignore */ }
        setSaving(false);
    };

    const handleDelete = async (filterId: string) => {
        try {
            await fetch(`${API}/api/v1/communities/${communityId}/filters/${filterId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            onRefresh();
        } catch { /* ignore */ }
    };

    const handleToggle = async (filterId: string, isActive: boolean) => {
        try {
            await fetch(`${API}/api/v1/communities/${communityId}/filters/${filterId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify({ isActive: !isActive }),
            });
            onRefresh();
        } catch { /* ignore */ }
    };

    const typeLabels: Record<string, string> = {
        keyword: 'Keyword Filter',
        link: 'Link Filter',
        spam: 'Spam Detection',
        newuser: 'New Member Restriction',
    };

    const actionLabels: Record<string, string> = {
        flag: 'Flag for review',
        block: 'Block post',
        mute_author: 'Mute author',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
        >
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Content Filters</h2>
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    className="px-3 py-1.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-lg text-xs font-medium hover:bg-[#D4AF37]/20 transition"
                >
                    {showAdd ? 'Cancel' : '+ Add Filter'}
                </button>
            </div>

            {/* Add Filter Form */}
            {showAdd && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.03] p-4 space-y-3"
                >
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-white/40 block mb-1">Filter Type</label>
                            <select
                                value={newFilter.type}
                                onChange={e => setNewFilter(f => ({ ...f, type: e.target.value }))}
                                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-white focus:outline-none"
                            >
                                <option value="keyword">Keyword</option>
                                <option value="link">Link/URL</option>
                                <option value="spam">Spam Pattern</option>
                                <option value="newuser">New Member Restriction</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-white/40 block mb-1">Action</label>
                            <select
                                value={newFilter.action}
                                onChange={e => setNewFilter(f => ({ ...f, action: e.target.value }))}
                                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-white focus:outline-none"
                            >
                                <option value="flag">Flag for review</option>
                                <option value="block">Block post</option>
                                <option value="mute_author">Mute author</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-white/40 block mb-1">
                            {newFilter.type === 'keyword' ? 'Keywords (comma-separated)' :
                             newFilter.type === 'link' ? 'Domains to block (comma-separated, or * for all links)' :
                             newFilter.type === 'spam' ? 'Spam sensitivity (auto-detected)' :
                             'Days before new members can post'}
                        </label>
                        <input
                            value={newFilter.pattern}
                            onChange={e => setNewFilter(f => ({ ...f, pattern: e.target.value }))}
                            placeholder={
                                newFilter.type === 'keyword' ? 'spam, scam, buy now' :
                                newFilter.type === 'link' ? 'tiktok.com, facebook.com or *' :
                                newFilter.type === 'spam' ? 'auto' :
                                '7'
                            }
                            className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/30"
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        disabled={saving || !newFilter.pattern.trim()}
                        className="w-full py-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-lg text-xs font-medium hover:bg-[#D4AF37]/20 transition disabled:opacity-50"
                    >
                        {saving ? 'Creating...' : 'Create Filter'}
                    </button>
                </motion.div>
            )}

            {/* Filters List */}
            {filters.length > 0 ? (
                <div className="space-y-2">
                    {filters.map(f => (
                        <div key={f.id} className={`rounded-xl border p-4 flex items-center gap-3 ${
                            f.isActive ? 'border-white/[0.06] bg-white/[0.02]' : 'border-white/[0.03] bg-white/[0.01] opacity-50'
                        }`}>
                            <button
                                onClick={() => handleToggle(f.id, f.isActive)}
                                className={`w-8 h-5 rounded-full transition-colors relative ${f.isActive ? 'bg-[#D4AF37]' : 'bg-white/10'}`}
                            >
                                <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${f.isActive ? 'left-4' : 'left-0.5'}`} />
                            </button>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-white/70 font-medium">{typeLabels[f.type] || f.type}</span>
                                    <span className="text-[9px] text-white/20">{actionLabels[f.action] || f.action}</span>
                                </div>
                                <p className="text-[10px] text-white/30 truncate mt-0.5">
                                    {f.type === 'spam' ? 'Auto-detect spam patterns' : f.pattern}
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-[10px] text-white/20">{f.hitCount} hits</div>
                            </div>
                            <button
                                onClick={() => handleDelete(f.id)}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 transition text-white/20 hover:text-red-400"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
                    <div className="text-3xl mb-2">🔍</div>
                    <p className="text-sm text-white/40 mb-1">No content filters configured</p>
                    <p className="text-[10px] text-white/20">Add keyword, link, or spam filters to automatically moderate content in this community.</p>
                </div>
            )}

            {/* Help Text */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <h4 className="text-xs font-semibold text-white/50 mb-2">Filter Types</h4>
                <div className="space-y-1.5 text-[10px] text-white/30">
                    <p><span className="text-white/50 font-medium">Keyword:</span> Block posts containing specific words or phrases (comma-separated).</p>
                    <p><span className="text-white/50 font-medium">Link:</span> Block posts with URLs. Use * to block all links, or specific domains.</p>
                    <p><span className="text-white/50 font-medium">Spam:</span> Auto-detect spam patterns like excessive caps, repeated characters, or excessive punctuation.</p>
                    <p><span className="text-white/50 font-medium">New Member:</span> Restrict posting for members who joined within the specified number of days.</p>
                </div>
            </div>
        </motion.div>
    );
}
