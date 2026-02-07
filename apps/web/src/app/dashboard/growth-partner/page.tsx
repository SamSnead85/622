'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { NavigationSidebar } from '@/components/dashboard/NavigationSidebar';
import { API_URL } from '@/lib/api';

const API = API_URL;
const getToken = () => typeof window !== 'undefined'
    ? (localStorage.getItem('token') || localStorage.getItem('0g_token') || '')
    : '';

// ============================================
// TYPES
// ============================================
interface PartnerInfo {
    id: string;
    referralCode: string;
    tier: string;
    status: string;
    enrolledAt: string;
    paymentEmail: string | null;
    paymentMethod: string;
}

interface Stats {
    totalEarned: number;
    totalPaid: number;
    pendingPayout: number;
    monthlyEarnings: number;
    nextPayoutDate: string;
    directReferrals: { total: number; qualified: number; pending: number; inactive: number };
    secondLevelReferrals: { total: number; qualified: number; pending: number };
}

interface Referral {
    id: string;
    level: string;
    status: string;
    invitedAt: string;
    qualifiedAt: string | null;
    daysActive: number;
    rewardAmount: number;
    flagReason: string | null;
}

interface EarningEntry {
    id: string;
    type: string;
    amount: number;
    status: string;
    earnedAt: string;
    paidAt: string | null;
}

interface LeaderboardEntry {
    rank: number;
    username: string;
    displayName: string;
    avatarUrl?: string;
    qualifiedReferrals: number;
    tier: string;
}

// ============================================
// MAIN PAGE
// ============================================
export default function GrowthPartnerPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'referrals' | 'leaderboard' | 'settings'>('dashboard');
    const [loading, setLoading] = useState(true);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [enrolling, setEnrolling] = useState(false);

    // Dashboard data
    const [partner, setPartner] = useState<PartnerInfo | null>(null);
    const [stats, setStats] = useState<Stats | null>(null);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [earnings, setEarnings] = useState<EarningEntry[]>([]);

    // Leaderboard
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [myRank, setMyRank] = useState(-1);

    // Enrollment form
    const [enrollForm, setEnrollForm] = useState({ paymentEmail: '', legalName: '', country: '' });

    // Copy state
    const [copied, setCopied] = useState(false);

    // Access gate: only growth partners and admins can view this page
    const hasAccess = !!(
        user?.isGrowthPartner ||
        user?.role === 'ADMIN' ||
        user?.role === 'SUPERADMIN'
    );

    const fetchDashboard = useCallback(async () => {
        if (!hasAccess) return;
        try {
            const res = await fetch(`${API}/api/v1/growth/me`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (res.status === 404) {
                setIsEnrolled(false);
                setLoading(false);
                return;
            }
            if (!res.ok) throw new Error();
            const data = await res.json();
            setPartner(data.partner);
            setStats(data.stats);
            setReferrals(data.recentReferrals);
            setEarnings(data.recentEarnings);
            setIsEnrolled(true);
        } catch {
            setIsEnrolled(false);
        } finally {
            setLoading(false);
        }
    }, [hasAccess]);

    const fetchLeaderboard = useCallback(async () => {
        if (!hasAccess) return;
        try {
            const res = await fetch(`${API}/api/v1/growth/leaderboard`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (res.ok) {
                const data = await res.json();
                setLeaderboard(data.leaderboard);
                setMyRank(data.myRank);
            }
        } catch { /* ignore */ }
    }, [hasAccess]);

    useEffect(() => {
        if (!authLoading && user && !hasAccess) {
            router.replace('/dashboard');
        }
    }, [authLoading, user, hasAccess, router]);

    useEffect(() => {
        fetchDashboard();
        fetchLeaderboard();
    }, [fetchDashboard, fetchLeaderboard]);

    // Show access-denied while redirecting
    if (!authLoading && user && !hasAccess) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] text-white">
                <NavigationSidebar />
                <div className="lg:ml-20 xl:ml-64 flex items-center justify-center min-h-screen">
                    <div className="text-center max-w-md mx-auto px-6">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">🔒</span>
                        </div>
                        <h2 className="text-xl font-bold mb-2">Invite-Only Program</h2>
                        <p className="text-white/50 text-sm leading-relaxed">
                            The Growth Partner program is available by invitation only for select content creators and community leaders.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const handleEnroll = async () => {
        setEnrolling(true);
        try {
            const res = await fetch(`${API}/api/v1/growth/enroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify(enrollForm),
            });
            if (res.ok) {
                await fetchDashboard();
            }
        } catch { /* ignore */ }
        setEnrolling(false);
    };

    const copyLink = () => {
        if (!partner) return;
        const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${partner.referralCode}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareLink = (platform: 'whatsapp' | 'twitter' | 'sms') => {
        if (!partner) return;
        const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${partner.referralCode}`;
        const text = `Join me on 0G — the platform that puts you first. No algorithms, no censorship, just community.`;
        const urlMap = {
            whatsapp: `https://wa.me/?text=${encodeURIComponent(text + '\n' + link)}`,
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`,
            sms: `sms:?body=${encodeURIComponent(text + ' ' + link)}`,
        };
        window.open(urlMap[platform], '_blank');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full animate-spin" />
            </div>
        );
    }

    // Enrollment Screen
    if (!isEnrolled) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] text-white">
                <NavigationSidebar />
                <div className="lg:ml-20 xl:ml-64 max-w-lg mx-auto px-4 py-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-8"
                    >
                        <div className="text-4xl mb-3">🚀</div>
                        <h1 className="text-2xl font-bold mb-2">Become a Growth Partner</h1>
                        <p className="text-sm text-white/50 max-w-md mx-auto">
                            Help 0G grow by inviting people you believe in. Earn $5 for every qualified direct referral
                            and $1 for every second-level referral. Top performers unlock community leadership and co-founder opportunities.
                        </p>
                    </motion.div>

                    {/* Benefits */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-3 mb-8"
                    >
                        {[
                            { icon: '💰', title: '$5 per direct referral', desc: 'When they stay active for 7 consecutive days' },
                            { icon: '🔗', title: '$1 per second-level referral', desc: 'When your referrals invite others who qualify' },
                            { icon: '📊', title: 'Real-time dashboard', desc: 'Track your referrals, earnings, and rank on the leaderboard' },
                            { icon: '🏆', title: 'Progression path', desc: '50 referrals → Community Leader ($500 bonus). 200 → Co-Founder track' },
                            { icon: '💳', title: 'Monthly payouts', desc: 'Paid on the 1st of each month (min $25)' },
                        ].map((b, i) => (
                            <div key={i} className="flex gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                                <span className="text-xl">{b.icon}</span>
                                <div>
                                    <p className="text-sm font-medium text-white">{b.title}</p>
                                    <p className="text-[10px] text-white/40">{b.desc}</p>
                                </div>
                            </div>
                        ))}
                    </motion.div>

                    {/* Enrollment Form */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4"
                    >
                        <h3 className="text-sm font-semibold text-white">Optional Payment Info</h3>
                        <p className="text-[10px] text-white/30">You can add this later. Required for payouts over $25.</p>

                        <input
                            type="email"
                            placeholder="PayPal email (optional)"
                            value={enrollForm.paymentEmail}
                            onChange={e => setEnrollForm(f => ({ ...f, paymentEmail: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00D4FF]/30"
                        />
                        <input
                            type="text"
                            placeholder="Legal name (for tax purposes, optional)"
                            value={enrollForm.legalName}
                            onChange={e => setEnrollForm(f => ({ ...f, legalName: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00D4FF]/30"
                        />
                        <input
                            type="text"
                            placeholder="Country of residence (optional)"
                            value={enrollForm.country}
                            onChange={e => setEnrollForm(f => ({ ...f, country: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00D4FF]/30"
                        />

                        <button
                            onClick={handleEnroll}
                            disabled={enrolling}
                            className="w-full py-3 bg-gradient-to-r from-[#00D4FF] to-[#00B4E6] text-black font-semibold rounded-xl text-sm hover:opacity-90 transition disabled:opacity-50"
                        >
                            {enrolling ? 'Enrolling...' : 'Join Growth Partner Program'}
                        </button>

                        <p className="text-[9px] text-white/20 text-center">
                            By enrolling, you agree to the Growth Partner Terms. 3-month limited program.
                        </p>
                    </motion.div>
                </div>
            </div>
        );
    }

    // Dashboard (enrolled)
    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            <NavigationSidebar />
            <div className="lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
            {/* Header */}
            <div className="border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D4FF]/30 to-violet-500/30 flex items-center justify-center text-lg">
                                🚀
                            </div>
                            <div>
                                <h1 className="text-lg font-bold">Growth Partner</h1>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                        partner?.tier === 'cofounder_track' ? 'bg-amber-500/20 text-amber-400' :
                                        partner?.tier === 'community_leader' ? 'bg-purple-500/20 text-purple-400' :
                                        'bg-[#00D4FF]/10 text-[#00D4FF]'
                                    }`}>
                                        {partner?.tier?.replace('_', ' ').toUpperCase()}
                                    </span>
                                    {myRank > 0 && (
                                        <span className="text-[10px] text-white/30">Rank #{myRank}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-1">
                        {(['dashboard', 'referrals', 'leaderboard', 'settings'] as const).map(tab => (
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
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6">
                <AnimatePresence mode="wait">
                    {/* DASHBOARD TAB */}
                    {activeTab === 'dashboard' && stats && (
                        <motion.div
                            key="dashboard"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            {/* Earnings Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-green-500/10 to-green-600/5 p-4">
                                    <div className="text-[10px] text-white/40 mb-1">This Month</div>
                                    <div className="text-2xl font-bold text-green-400">${stats.monthlyEarnings.toFixed(2)}</div>
                                </div>
                                <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-[#00D4FF]/10 to-blue-600/5 p-4">
                                    <div className="text-[10px] text-white/40 mb-1">Total Earned</div>
                                    <div className="text-2xl font-bold text-[#00D4FF]">${stats.totalEarned.toFixed(2)}</div>
                                </div>
                                <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-4">
                                    <div className="text-[10px] text-white/40 mb-1">Total Paid</div>
                                    <div className="text-2xl font-bold text-purple-400">${stats.totalPaid.toFixed(2)}</div>
                                </div>
                                <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-4">
                                    <div className="text-[10px] text-white/40 mb-1">Next Payout</div>
                                    <div className="text-lg font-bold text-amber-400">${stats.pendingPayout.toFixed(2)}</div>
                                    <div className="text-[9px] text-white/20">
                                        {new Date(stats.nextPayoutDate).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                            {/* Referral Stats */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                                    <h3 className="text-sm font-semibold text-white mb-3">Direct Referrals ($5 each)</h3>
                                    <div className="grid grid-cols-4 gap-2 text-center">
                                        <div>
                                            <div className="text-xl font-bold text-white">{stats.directReferrals.total}</div>
                                            <div className="text-[9px] text-white/30">Total</div>
                                        </div>
                                        <div>
                                            <div className="text-xl font-bold text-green-400">{stats.directReferrals.qualified}</div>
                                            <div className="text-[9px] text-white/30">Qualified</div>
                                        </div>
                                        <div>
                                            <div className="text-xl font-bold text-amber-400">{stats.directReferrals.pending}</div>
                                            <div className="text-[9px] text-white/30">Pending</div>
                                        </div>
                                        <div>
                                            <div className="text-xl font-bold text-white/30">{stats.directReferrals.inactive}</div>
                                            <div className="text-[9px] text-white/30">Inactive</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                                    <h3 className="text-sm font-semibold text-white mb-3">Second-Level ($1 each)</h3>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div>
                                            <div className="text-xl font-bold text-white">{stats.secondLevelReferrals.total}</div>
                                            <div className="text-[9px] text-white/30">Total</div>
                                        </div>
                                        <div>
                                            <div className="text-xl font-bold text-green-400">{stats.secondLevelReferrals.qualified}</div>
                                            <div className="text-[9px] text-white/30">Qualified</div>
                                        </div>
                                        <div>
                                            <div className="text-xl font-bold text-amber-400">{stats.secondLevelReferrals.pending}</div>
                                            <div className="text-[9px] text-white/30">Pending</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Invite Tools */}
                            <div className="rounded-xl border border-[#00D4FF]/20 bg-gradient-to-br from-[#00D4FF]/5 to-transparent p-5">
                                <h3 className="text-sm font-semibold text-white mb-3">Your Invite Link</h3>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        readOnly
                                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join/${partner?.referralCode}`}
                                        className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-white/60 focus:outline-none"
                                    />
                                    <button
                                        onClick={copyLink}
                                        className="px-4 py-2 bg-[#00D4FF]/10 text-[#00D4FF] rounded-lg text-xs font-medium hover:bg-[#00D4FF]/20 transition"
                                    >
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => shareLink('whatsapp')}
                                        className="flex-1 py-2 bg-green-600/20 text-green-400 rounded-lg text-xs font-medium hover:bg-green-600/30 transition"
                                    >
                                        WhatsApp
                                    </button>
                                    <button
                                        onClick={() => shareLink('twitter')}
                                        className="flex-1 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition"
                                    >
                                        Twitter/X
                                    </button>
                                    <button
                                        onClick={() => shareLink('sms')}
                                        className="flex-1 py-2 bg-white/[0.06] text-white/50 rounded-lg text-xs font-medium hover:bg-white/[0.1] transition"
                                    >
                                        SMS
                                    </button>
                                </div>
                            </div>

                            {/* Progress to Next Tier */}
                            {partner?.tier === 'affiliate' && (
                                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                                    <h3 className="text-sm font-semibold text-white mb-2">Progress to Community Leader</h3>
                                    <p className="text-[10px] text-white/30 mb-3">Reach 50 qualified referrals to unlock $500 bonus + leadership invitation</p>
                                    <div className="w-full bg-white/[0.06] rounded-full h-3 mb-1">
                                        <div
                                            className="bg-gradient-to-r from-[#00D4FF] to-violet-500 h-3 rounded-full transition-all"
                                            style={{ width: `${Math.min((stats.directReferrals.qualified / 50) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-white/30">
                                        <span>{stats.directReferrals.qualified} / 50</span>
                                        <span>{50 - stats.directReferrals.qualified} remaining</span>
                                    </div>
                                </div>
                            )}

                            {/* Recent Earnings */}
                            {earnings.length > 0 && (
                                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                                    <h3 className="text-sm font-semibold text-white mb-3">Recent Earnings</h3>
                                    <div className="space-y-2">
                                        {earnings.slice(0, 10).map(e => (
                                            <div key={e.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                                                <div>
                                                    <span className="text-xs text-white/60">
                                                        {e.type.replace(/_/g, ' ')}
                                                    </span>
                                                    <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded ${
                                                        e.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                                                        e.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                                                        'bg-white/[0.06] text-white/30'
                                                    }`}>
                                                        {e.status}
                                                    </span>
                                                </div>
                                                <div className="text-sm font-medium text-green-400">+${e.amount.toFixed(2)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* REFERRALS TAB */}
                    {activeTab === 'referrals' && (
                        <motion.div
                            key="referrals"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Your Referrals</h2>
                            {referrals.length > 0 ? (
                                <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                                    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 px-4 py-2 bg-white/[0.03] text-[10px] text-white/40 uppercase tracking-wider">
                                        <span>Level</span>
                                        <span>Status</span>
                                        <span>Days Active</span>
                                        <span>Invited</span>
                                        <span>Earned</span>
                                    </div>
                                    <div className="divide-y divide-white/[0.04]">
                                        {referrals.map(r => (
                                            <div key={r.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 px-4 py-3 items-center hover:bg-white/[0.02] transition">
                                                <span className={`text-xs ${r.level === 'direct' ? 'text-[#00D4FF]' : 'text-violet-400'}`}>
                                                    {r.level === 'direct' ? 'Direct' : '2nd Level'}
                                                </span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block w-fit ${
                                                    r.status === 'qualified' ? 'bg-green-500/20 text-green-400' :
                                                    r.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                                    r.status === 'flagged' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-white/[0.06] text-white/30'
                                                }`}>
                                                    {r.status}{r.flagReason ? ` (${r.flagReason})` : ''}
                                                </span>
                                                <span className="text-xs text-white/40">
                                                    {r.daysActive}/7 days
                                                    {r.status === 'pending' && (
                                                        <span className="text-[9px] text-amber-400 ml-1">
                                                            ({7 - r.daysActive} left)
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="text-[10px] text-white/30">
                                                    {new Date(r.invitedAt).toLocaleDateString()}
                                                </span>
                                                <span className={`text-xs font-medium ${r.rewardAmount > 0 ? 'text-green-400' : 'text-white/20'}`}>
                                                    {r.rewardAmount > 0 ? `+$${r.rewardAmount.toFixed(2)}` : '—'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
                                    <div className="text-3xl mb-2">👋</div>
                                    <p className="text-sm text-white/40">No referrals yet. Share your invite link to get started!</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* LEADERBOARD TAB */}
                    {activeTab === 'leaderboard' && (
                        <motion.div
                            key="leaderboard"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Monthly Leaderboard</h2>
                                {myRank > 0 && (
                                    <span className="text-xs text-[#00D4FF]">Your rank: #{myRank}</span>
                                )}
                            </div>
                            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                                {leaderboard.map((entry, i) => {
                                    const isMe = entry.username === user?.username;
                                    return (
                                        <motion.div
                                            key={entry.rank}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            className={`flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 ${
                                                isMe ? 'bg-[#00D4FF]/[0.04]' : 'hover:bg-white/[0.02]'
                                            } transition`}
                                        >
                                            <div className={`w-8 text-center text-sm font-bold ${
                                                i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-white/20'
                                            }`}>
                                                {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${entry.rank}`}
                                            </div>
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/30 to-purple-600/30 flex items-center justify-center text-[10px] shrink-0">
                                                {entry.avatarUrl && !entry.avatarUrl.startsWith('preset:') ? (
                                                    <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                                                ) : (
                                                    entry.displayName?.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${isMe ? 'text-[#00D4FF] font-semibold' : 'text-white/70'}`}>
                                                    {entry.displayName} {isMe && '(You)'}
                                                </p>
                                                <p className="text-[10px] text-white/30">@{entry.username}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-white">{entry.qualifiedReferrals}</div>
                                                <div className="text-[9px] text-white/30">referrals</div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                                {leaderboard.length === 0 && (
                                    <div className="p-12 text-center">
                                        <p className="text-xs text-white/30">No growth partners ranked yet. Be the first!</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* SETTINGS TAB */}
                    {activeTab === 'settings' && (
                        <motion.div
                            key="settings"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="max-w-lg space-y-6"
                        >
                            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Payment Settings</h2>
                            <PaymentSettings partner={partner} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            </div>
        </div>
    );
}

// ============================================
// PAYMENT SETTINGS COMPONENT
// ============================================
function PaymentSettings({ partner }: { partner: PartnerInfo | null }) {
    const [form, setForm] = useState({
        paymentEmail: partner?.paymentEmail || '',
        paymentMethod: partner?.paymentMethod || 'manual',
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await fetch(`${API}/api/v1/growth/me/payment`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify(form),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch { /* ignore */ }
        setSaving(false);
    };

    return (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
            <div>
                <label className="text-xs text-white/40 block mb-1">PayPal Email</label>
                <input
                    type="email"
                    value={form.paymentEmail}
                    onChange={e => setForm(f => ({ ...f, paymentEmail: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00D4FF]/30"
                />
            </div>
            <div>
                <label className="text-xs text-white/40 block mb-1">Payment Method</label>
                <select
                    value={form.paymentMethod}
                    onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-[#00D4FF]/30"
                >
                    <option value="manual">Manual (Admin Transfer)</option>
                    <option value="paypal">PayPal</option>
                    <option value="crypto">Crypto/USDC</option>
                </select>
            </div>
            <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-[#00D4FF]/10 text-[#00D4FF] rounded-xl text-sm font-medium hover:bg-[#00D4FF]/20 transition disabled:opacity-50"
            >
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Update Payment Info'}
            </button>
        </div>
    );
}
