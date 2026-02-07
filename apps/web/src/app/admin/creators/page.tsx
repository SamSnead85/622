'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth, ProtectedRoute } from '@/contexts/AuthContext';
import { NavigationSidebar } from '@/components/dashboard/NavigationSidebar';
import { API_URL as API } from '@/lib/api';

interface CreatorApp {
    id: string;
    userId: string;
    tier: string;
    status: string;
    platform?: string;
    platformHandle?: string;
    followerCount: number;
    contentNiche?: string;
    referralCode: string;
    totalReferrals: number;
    activeReferrals: number;
    earlyAccessSlots: number;
    slotsUsed: number;
    bio?: string;
    applicationNote?: string;
    createdAt: string;
    user: { id: string; username: string; displayName: string; avatarUrl?: string; email: string };
}

function CreatorsContent() {
    const { user } = useAuth();
    const [creators, setCreators] = useState<CreatorApp[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');

    const getToken = () => localStorage.getItem('token') || '';

    const fetchCreators = useCallback(async () => {
        try {
            const params = filter !== 'all' ? `?status=${filter}` : '';
            const res = await fetch(`${API}/api/v1/creators${params}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (res.ok) setCreators(await res.json());
        } catch { /* noop */ }
        finally { setLoading(false); }
    }, [filter]);

    useEffect(() => { fetchCreators(); }, [fetchCreators]);

    const handleAction = async (id: string, action: 'approve' | 'reject', tier?: string) => {
        try {
            const body = action === 'approve' ? { tier: tier || 'ambassador', earlyAccessSlots: tier === 'partner' ? 100 : tier === 'creator' ? 50 : 10 } : {};
            await fetch(`${API}/api/v1/creators/${id}/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify(body),
            });
            fetchCreators();
        } catch { /* noop */ }
    };

    return (
        <div className="min-h-screen bg-[#050508] text-white">
            <NavigationSidebar />
            <main className="lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
                <div className="max-w-5xl mx-auto px-4 py-6 lg:py-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-xl font-bold text-white">Creator Applications</h1>
                            <p className="text-xs text-white/40 mt-1">Review and manage creator program applications</p>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2 mb-6">
                        {['pending', 'active', 'suspended', 'all'].map(f => (
                            <button
                                key={f}
                                onClick={() => { setFilter(f); setLoading(true); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'}`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)} {f === 'pending' && creators.filter(c => c.status === 'pending').length > 0 ? `(${creators.filter(c => c.status === 'pending').length})` : ''}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-white/[0.02] animate-pulse" />)}</div>
                    ) : creators.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-white/40 text-sm">No {filter !== 'all' ? filter : ''} applications</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {creators.map((c, i) => (
                                <motion.div
                                    key={c.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                                                {c.user.avatarUrl ? (
                                                    <img src={c.user.avatarUrl} alt="" className="w-full h-full rounded-xl object-cover" />
                                                ) : (
                                                    <span className="text-sm font-semibold text-white/40">{(c.user.displayName || c.user.username).charAt(0)}</span>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-white">{c.user.displayName}</span>
                                                    <span className="text-xs text-white/30">@{c.user.username}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${c.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : c.status === 'pending' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'}`}>
                                                        {c.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-[10px] text-white/30">
                                                    {c.platform && <span>{c.platform}: {c.platformHandle}</span>}
                                                    <span>{c.followerCount.toLocaleString()} followers</span>
                                                    {c.contentNiche && <span>Niche: {c.contentNiche}</span>}
                                                </div>
                                                {c.applicationNote && (
                                                    <p className="text-xs text-white/35 mt-2 line-clamp-2">{c.applicationNote}</p>
                                                )}
                                                {c.status === 'active' && (
                                                    <div className="flex items-center gap-4 mt-2 text-[10px] text-white/25">
                                                        <span>Code: {c.referralCode}</span>
                                                        <span>Referrals: {c.totalReferrals}</span>
                                                        <span>Slots: {c.slotsUsed}/{c.earlyAccessSlots}</span>
                                                        <span>Tier: {c.tier}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {c.status === 'pending' && (
                                            <div className="flex gap-2 shrink-0 ml-4">
                                                <select
                                                    onChange={e => handleAction(c.id, 'approve', e.target.value)}
                                                    defaultValue=""
                                                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 focus:outline-none cursor-pointer"
                                                >
                                                    <option value="" disabled className="bg-[#0A0A0C]">Approve as...</option>
                                                    <option value="ambassador" className="bg-[#0A0A0C]">Ambassador (10 codes)</option>
                                                    <option value="creator" className="bg-[#0A0A0C]">Creator (50 codes)</option>
                                                    <option value="partner" className="bg-[#0A0A0C]">Partner (100 codes)</option>
                                                </select>
                                                <button
                                                    onClick={() => handleAction(c.id, 'reject')}
                                                    className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 hover:bg-red-500/15 transition-colors"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function AdminCreatorsPage() {
    return (
        <ProtectedRoute>
            <CreatorsContent />
        </ProtectedRoute>
    );
}
