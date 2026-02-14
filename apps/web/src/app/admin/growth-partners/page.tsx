'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AdminRoute } from '@/contexts/AuthContext';
import { NavigationSidebar } from '@/components/dashboard/NavigationSidebar';
import { API_URL } from '@/lib/api';

const API = API_URL;
const getToken = () => typeof window !== 'undefined'
    ? (localStorage.getItem('token') || localStorage.getItem('0g_token') || '')
    : '';

// ============================================
// TYPES
// ============================================
interface Partner {
    id: string;
    userId: string;
    status: string;
    tier: string;
    enrolledAt: string;
    paymentEmail: string | null;
    paymentMethod: string;
    totalEarned: number;
    totalPaid: number;
    pendingPayout: number;
    directReferralsQualified: number;
    secondLevelReferralsQualified: number;
    referralCode: string;
    user: { username: string; displayName: string; email: string } | null;
    _count: { referrals: number; earnings: number };
}

interface ProgramTotals {
    totalPartners: number;
    totalEarned: number;
    totalPaid: number;
    pendingPayouts: number;
}

interface FlaggedReferral {
    id: string;
    partnerId: string;
    partnerUsername: string;
    referredUserId: string;
    level: string;
    flagReason: string;
    invitedAt: string;
    daysActive: number;
}

// ============================================
// MAIN PAGE
// ============================================
function GrowthPartnersContent() {
    const [activeTab, setActiveTab] = useState<'overview' | 'partners' | 'flagged'>('overview');
    const [loading, setLoading] = useState(true);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [totals, setTotals] = useState<ProgramTotals | null>(null);
    const [flagged, setFlagged] = useState<FlaggedReferral[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const [tierFilter, setTierFilter] = useState('');

    const fetchPartners = useCallback(async () => {
        try {
            const params = new URLSearchParams({ page: String(page), limit: '20' });
            if (statusFilter) params.set('status', statusFilter);
            if (tierFilter) params.set('tier', tierFilter);

            const res = await fetch(`${API}/api/v1/growth/admin/all?${params}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (res.ok) {
                const data = await res.json();
                setPartners(data.partners);
                setTotal(data.total);
                setTotals(data.programTotals);
            }
        } catch { /* ignore */ }
    }, [page, statusFilter, tierFilter]);

    const fetchFlagged = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/v1/growth/admin/flagged`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (res.ok) {
                const data = await res.json();
                setFlagged(data.flagged);
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([fetchPartners(), fetchFlagged()]);
            setLoading(false);
        };
        load();
    }, [fetchPartners, fetchFlagged]);

    const handleReview = async (referralId: string, action: 'approve' | 'reject', note?: string) => {
        try {
            await fetch(`${API}/api/v1/growth/admin/referrals/${referralId}/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify({ action, note }),
            });
            fetchFlagged();
            fetchPartners();
        } catch { /* ignore */ }
    };

    const handleUpdatePartner = async (id: string, data: { status?: string; tier?: string }) => {
        try {
            await fetch(`${API}/api/v1/growth/admin/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify(data),
            });
            fetchPartners();
        } catch { /* ignore */ }
    };

    const MONTHLY_CAP = 50000;
    const spendPct = totals ? Math.min(((totals.totalEarned) / MONTHLY_CAP) * 100, 100) : 0;

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            <NavigationSidebar />
            <div className="lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
            {/* Header */}
            <div className="border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <Link href="/admin" className="text-white/40 hover:text-white/60 transition">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold">Growth Partner Program</h1>
                                <p className="text-xs text-white/40">Manage affiliates, review referrals, track payouts</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-1">
                        {(['overview', 'partners', 'flagged'] as const).map(tab => (
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
                                {tab === 'flagged' && flagged.length > 0 && (
                                    <span className="ml-1.5 px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded-full">
                                        {flagged.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-[#7C8FFF]/30 border-t-[#7C8FFF] rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* OVERVIEW TAB */}
                        {activeTab === 'overview' && totals && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                {/* Program Stats */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-4">
                                        <div className="text-[10px] text-white/40 mb-1">Total Partners</div>
                                        <div className="text-2xl font-bold text-white">{totals.totalPartners}</div>
                                    </div>
                                    <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-green-500/10 to-green-600/5 p-4">
                                        <div className="text-[10px] text-white/40 mb-1">Total Earned</div>
                                        <div className="text-2xl font-bold text-green-400">${totals.totalEarned.toFixed(2)}</div>
                                    </div>
                                    <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-4">
                                        <div className="text-[10px] text-white/40 mb-1">Total Paid</div>
                                        <div className="text-2xl font-bold text-purple-400">${totals.totalPaid.toFixed(2)}</div>
                                    </div>
                                    <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-4">
                                        <div className="text-[10px] text-white/40 mb-1">Pending Payouts</div>
                                        <div className="text-2xl font-bold text-amber-400">${totals.pendingPayouts.toFixed(2)}</div>
                                    </div>
                                </div>

                                {/* Monthly Spend vs Cap */}
                                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-semibold text-white">Monthly Spend vs Cap</h3>
                                        <span className="text-xs text-white/30">${totals.totalEarned.toFixed(0)} / ${MONTHLY_CAP.toLocaleString()}</span>
                                    </div>
                                    <div className="w-full bg-white/[0.06] rounded-full h-3">
                                        <div
                                            className={`h-3 rounded-full transition-all ${
                                                spendPct > 80 ? 'bg-red-500' : spendPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                            }`}
                                            style={{ width: `${spendPct}%` }}
                                        />
                                    </div>
                                    {spendPct > 80 && (
                                        <p className="text-[10px] text-red-400 mt-1">Warning: Approaching monthly cap</p>
                                    )}
                                </div>

                                {/* Fraud Queue Summary */}
                                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-white">Fraud Review Queue</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                            flagged.length > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                                        }`}>
                                            {flagged.length} pending
                                        </span>
                                    </div>
                                    {flagged.length > 0 && (
                                        <button
                                            onClick={() => setActiveTab('flagged')}
                                            className="mt-2 text-xs text-[#7C8FFF] hover:underline"
                                        >
                                            Review flagged referrals
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* PARTNERS TAB */}
                        {activeTab === 'partners' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                {/* Filters */}
                                <div className="flex gap-2 flex-wrap">
                                    <select
                                        value={statusFilter}
                                        onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                                        className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-white focus:outline-none"
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="active">Active</option>
                                        <option value="paused">Paused</option>
                                        <option value="suspended">Suspended</option>
                                        <option value="graduated">Graduated</option>
                                    </select>
                                    <select
                                        value={tierFilter}
                                        onChange={e => { setTierFilter(e.target.value); setPage(1); }}
                                        className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-white focus:outline-none"
                                    >
                                        <option value="">All Tiers</option>
                                        <option value="affiliate">Affiliate</option>
                                        <option value="community_leader">Community Leader</option>
                                        <option value="cofounder_track">Co-Founder Track</option>
                                    </select>
                                    <span className="text-xs text-white/30 self-center ml-2">{total} total</span>
                                </div>

                                {/* Partners Table */}
                                <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 px-4 py-2 bg-white/[0.03] text-[10px] text-white/40 uppercase tracking-wider">
                                        <span>Partner</span>
                                        <span>Tier</span>
                                        <span>Referrals</span>
                                        <span>Earned</span>
                                        <span>Pending</span>
                                        <span>Actions</span>
                                    </div>
                                    <div className="divide-y divide-white/[0.04]">
                                        {partners.map(p => (
                                            <div key={p.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 px-4 py-3 items-center hover:bg-white/[0.02] transition">
                                                <div className="min-w-0">
                                                    <p className="text-xs text-white/80 truncate">{p.user?.displayName || 'Unknown'}</p>
                                                    <p className="text-[10px] text-white/30 truncate">@{p.user?.username} &middot; {p.referralCode}</p>
                                                </div>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full w-fit ${
                                                    p.tier === 'cofounder_track' ? 'bg-amber-500/20 text-amber-400' :
                                                    p.tier === 'community_leader' ? 'bg-purple-500/20 text-purple-400' :
                                                    'bg-white/[0.06] text-white/40'
                                                }`}>
                                                    {p.tier.replace('_', ' ')}
                                                </span>
                                                <span className="text-xs text-white/60">{p.directReferralsQualified + p.secondLevelReferralsQualified}</span>
                                                <span className="text-xs text-green-400">${p.totalEarned.toFixed(2)}</span>
                                                <span className="text-xs text-amber-400">${p.pendingPayout.toFixed(2)}</span>
                                                <div className="flex gap-1">
                                                    {p.status === 'active' ? (
                                                        <button
                                                            onClick={() => handleUpdatePartner(p.id, { status: 'suspended' })}
                                                            className="px-2 py-1 text-[10px] bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition"
                                                        >
                                                            Suspend
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleUpdatePartner(p.id, { status: 'active' })}
                                                            className="px-2 py-1 text-[10px] bg-emerald-500/10 text-emerald-400 rounded hover:bg-emerald-500/20 transition"
                                                        >
                                                            Activate
                                                        </button>
                                                    )}
                                                    {p.tier === 'affiliate' && p.directReferralsQualified >= 50 && (
                                                        <button
                                                            onClick={() => handleUpdatePartner(p.id, { tier: 'community_leader' })}
                                                            className="px-2 py-1 text-[10px] bg-purple-500/10 text-purple-400 rounded hover:bg-purple-500/20 transition"
                                                        >
                                                            Promote
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {partners.length === 0 && (
                                    <p className="text-center text-xs text-white/30 py-8">No growth partners found</p>
                                )}

                                {/* Pagination */}
                                {total > 20 && (
                                    <div className="flex justify-center gap-2">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="px-3 py-1.5 text-xs bg-white/[0.04] rounded-lg text-white/40 disabled:opacity-30"
                                        >
                                            Previous
                                        </button>
                                        <span className="px-3 py-1.5 text-xs text-white/30">
                                            Page {page} of {Math.ceil(total / 20)}
                                        </span>
                                        <button
                                            onClick={() => setPage(p => p + 1)}
                                            disabled={page >= Math.ceil(total / 20)}
                                            className="px-3 py-1.5 text-xs bg-white/[0.04] rounded-lg text-white/40 disabled:opacity-30"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* FLAGGED TAB */}
                        {activeTab === 'flagged' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
                                    Fraud Review Queue ({flagged.length})
                                </h2>
                                {flagged.length > 0 ? (
                                    <div className="space-y-3">
                                        {flagged.map(r => (
                                            <div key={r.id} className="rounded-xl border border-red-500/10 bg-red-500/[0.03] p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <span className="text-xs text-white/70">@{r.partnerUsername}</span>
                                                        <span className="text-[10px] text-white/30 ml-2">{r.level} referral</span>
                                                    </div>
                                                    <span className="text-[10px] text-white/20">
                                                        {new Date(r.invitedAt).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                <div className="flex gap-3 mb-3">
                                                    <div className="rounded-lg bg-red-500/10 px-2.5 py-1">
                                                        <span className="text-[10px] text-red-400 font-medium">Flag: {r.flagReason?.replace(/_/g, ' ')}</span>
                                                    </div>
                                                    <div className="rounded-lg bg-white/[0.04] px-2.5 py-1">
                                                        <span className="text-[10px] text-white/40">{r.daysActive} days active</span>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleReview(r.id, 'approve')}
                                                        className="flex-1 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition"
                                                    >
                                                        Approve (pay reward)
                                                    </button>
                                                    <button
                                                        onClick={() => handleReview(r.id, 'reject', r.flagReason || undefined)}
                                                        className="flex-1 py-2 bg-red-500/10 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 transition"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
                                        <div className="text-3xl mb-2">✨</div>
                                        <p className="text-sm text-white/40">No flagged referrals. Queue is clean!</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </>
                )}
            </div>
            </div>
        </div>
    );
}

export default function AdminGrowthPartnersPage() {
    return (
        <AdminRoute>
            <GrowthPartnersContent />
        </AdminRoute>
    );
}
