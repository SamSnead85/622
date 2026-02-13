'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, ProtectedRoute } from '@/contexts/AuthContext';
import { NavigationSidebar } from '@/components/dashboard/NavigationSidebar';
import { API_URL as API } from '@/lib/api';

interface Campaign {
    id: string;
    slug: string;
    title: string;
    description: string;
    type: string;
    status: string;
    coverUrl?: string;
    brandColor?: string;
    eventDate?: string;
    eventLocation?: string;
    eventCity?: string;
    incentiveType?: string;
    incentiveValue?: string;
    incentiveRules?: string;
    raffleDrawDate?: string;
    signupGoal: number;
    signupCount: number;
    viewCount: number;
    partnerName?: string;
    createdAt: string;
    _count?: { signups: number; accessCodes: number };
}

interface CampaignSignup {
    id: string;
    name: string;
    email: string;
    phone?: string;
    source?: string;
    referredBy?: string;
    isConverted: boolean;
    createdAt: string;
}

const CAMPAIGN_TYPES = ['event', 'sponsorship', 'partnership', 'fundraiser', 'raffle'];
const INCENTIVE_TYPES = ['raffle', 'gift_card', 'early_access', 'badge', 'custom'];

function CampaignsContent() {
    const { user } = useAuth();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
    const [signups, setSignups] = useState<CampaignSignup[]>([]);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({
        title: '', description: '', type: 'event', slug: '',
        eventDate: '', eventLocation: '', eventCity: '',
        incentiveType: 'raffle', incentiveValue: '', incentiveRules: '',
        raffleDrawDate: '', signupGoal: '100',
        partnerName: '', brandColor: '#7C8FFF',
    });

    const getToken = () => localStorage.getItem('token') || '';
    const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

    const fetchCampaigns = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/v1/campaigns`, { headers: { Authorization: `Bearer ${getToken()}` } });
            if (res.ok) setCampaigns(await res.json());
        } catch { /* noop */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

    const fetchSignups = async (id: string) => {
        try {
            const res = await fetch(`${API}/api/v1/campaigns/${id}/signups`, { headers: { Authorization: `Bearer ${getToken()}` } });
            if (res.ok) {
                const data = await res.json();
                setSignups(data.signups || []);
            }
        } catch { /* noop */ }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const body = {
                ...form,
                signupGoal: parseInt(form.signupGoal) || 100,
                eventDate: form.eventDate || undefined,
                raffleDrawDate: form.raffleDrawDate || undefined,
            };
            const res = await fetch(`${API}/api/v1/campaigns`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
            if (res.ok) {
                await fetchCampaigns();
                setShowCreate(false);
                setForm({ title: '', description: '', type: 'event', slug: '', eventDate: '', eventLocation: '', eventCity: '', incentiveType: 'raffle', incentiveValue: '', incentiveRules: '', raffleDrawDate: '', signupGoal: '100', partnerName: '', brandColor: '#7C8FFF' });
            }
        } catch { /* noop */ }
        finally { setCreating(false); }
    };

    const toggleStatus = async (id: string, current: string) => {
        const newStatus = current === 'active' ? 'ended' : 'active';
        await fetch(`${API}/api/v1/campaigns/${id}`, {
            method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ status: newStatus }),
        });
        fetchCampaigns();
    };

    return (
        <div className="min-h-screen bg-[#050508] text-white">
            <NavigationSidebar />
            <main className="lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
                <div className="max-w-5xl mx-auto px-4 py-6 lg:py-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-xl font-bold text-white">Campaign Manager</h1>
                            <p className="text-xs text-white/40 mt-1">Create and manage events, sponsorships, and growth campaigns</p>
                        </div>
                        <button
                            onClick={() => setShowCreate(!showCreate)}
                            className="px-4 py-2 rounded-xl bg-[#7C8FFF]/10 border border-[#7C8FFF]/20 text-xs font-medium text-[#7C8FFF] hover:bg-[#7C8FFF]/15 transition-colors"
                        >
                            {showCreate ? 'Cancel' : 'New Campaign'}
                        </button>
                    </div>

                    {/* Create form */}
                    <AnimatePresence>
                        {showCreate && (
                            <motion.form
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                onSubmit={handleCreate}
                                className="mb-8 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden"
                            >
                                <h3 className="text-sm font-semibold text-white mb-4">Create Campaign</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] text-white/40 mb-1">Title</label>
                                        <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="e.g. Ramadan Iftar Night — Tampa" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/15" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] text-white/40 mb-1">Description</label>
                                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required rows={3} placeholder="Describe the campaign, event, or partnership..." className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/15 resize-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-white/40 mb-1">Type</label>
                                        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none">
                                            {CAMPAIGN_TYPES.map(t => <option key={t} value={t} className="bg-[#0A0A0C]">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-white/40 mb-1">URL Slug</label>
                                        <input type="text" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated from title" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/15" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-white/40 mb-1">Event Date</label>
                                        <input type="date" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-white/40 mb-1">Location</label>
                                        <input type="text" value={form.eventLocation} onChange={e => setForm(f => ({ ...f, eventLocation: e.target.value }))} placeholder="Venue name or address" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/15" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-white/40 mb-1">City</label>
                                        <input type="text" value={form.eventCity} onChange={e => setForm(f => ({ ...f, eventCity: e.target.value }))} placeholder="e.g. Tampa, FL" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/15" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-white/40 mb-1">Partner Name</label>
                                        <input type="text" value={form.partnerName} onChange={e => setForm(f => ({ ...f, partnerName: e.target.value }))} placeholder="e.g. Tampa Bay Muslim Community" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/15" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-white/40 mb-1">Incentive Type</label>
                                        <select value={form.incentiveType} onChange={e => setForm(f => ({ ...f, incentiveType: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none">
                                            {INCENTIVE_TYPES.map(t => <option key={t} value={t} className="bg-[#0A0A0C]">{t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-white/40 mb-1">Incentive Value</label>
                                        <input type="text" value={form.incentiveValue} onChange={e => setForm(f => ({ ...f, incentiveValue: e.target.value }))} placeholder="e.g. $100 Gift Card" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/15" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] text-white/40 mb-1">Incentive Rules</label>
                                        <textarea value={form.incentiveRules} onChange={e => setForm(f => ({ ...f, incentiveRules: e.target.value }))} rows={2} placeholder="e.g. 1 in 100 signups wins a $100 gift card. Must be present at event." className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/15 resize-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-white/40 mb-1">Raffle Draw Date</label>
                                        <input type="date" value={form.raffleDrawDate} onChange={e => setForm(f => ({ ...f, raffleDrawDate: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-white/40 mb-1">Signup Goal</label>
                                        <input type="number" value={form.signupGoal} onChange={e => setForm(f => ({ ...f, signupGoal: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none" />
                                    </div>
                                </div>
                                <button type="submit" disabled={creating} className="mt-4 px-6 py-2.5 rounded-xl bg-[#7C8FFF] text-sm font-medium text-white hover:bg-[#7C8FFF]/90 transition-all disabled:opacity-50">
                                    {creating ? 'Creating...' : 'Create Campaign'}
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {/* Campaign list */}
                    {loading ? (
                        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-white/[0.02] animate-pulse" />)}</div>
                    ) : campaigns.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-white/40 text-sm">No campaigns yet</p>
                            <p className="text-white/20 text-xs mt-1">Create your first campaign to start driving signups</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {campaigns.map(c => (
                                <div key={c.id} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                                    <div
                                        className="p-5 cursor-pointer hover:bg-white/[0.01] transition-colors"
                                        onClick={() => {
                                            if (selectedCampaign === c.id) { setSelectedCampaign(null); }
                                            else { setSelectedCampaign(c.id); fetchSignups(c.id); }
                                        }}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-sm font-semibold text-white">{c.title}</h3>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${c.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : c.status === 'ended' ? 'bg-white/5 text-white/30' : 'bg-amber-500/15 text-amber-400'}`}>
                                                        {c.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-white/40 line-clamp-1">{c.description}</p>
                                                {c.partnerName && <p className="text-[10px] text-white/25 mt-1">Partner: {c.partnerName}</p>}
                                            </div>
                                            <div className="text-right shrink-0 ml-4">
                                                <p className="text-lg font-bold text-white">{c.signupCount}</p>
                                                <p className="text-[10px] text-white/30">of {c.signupGoal} goal</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 mt-3 text-[10px] text-white/25">
                                            <span>Type: {c.type}</span>
                                            <span>Views: {c.viewCount}</span>
                                            <span>Link: /c/{c.slug}</span>
                                            {c.eventDate && <span>Date: {new Date(c.eventDate).toLocaleDateString()}</span>}
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {selectedCampaign === c.id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-white/[0.04] overflow-hidden"
                                            >
                                                <div className="p-5">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="text-xs font-semibold text-white">Signups ({signups.length})</h4>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => toggleStatus(c.id, c.status)}
                                                                className={`px-3 py-1 rounded-lg text-[10px] font-medium ${c.status === 'active' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/15' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15'} transition-colors`}
                                                            >
                                                                {c.status === 'active' ? 'End Campaign' : 'Reactivate'}
                                                            </button>
                                                            <button
                                                                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/c/${c.slug}`)}
                                                                className="px-3 py-1 rounded-lg text-[10px] font-medium bg-white/5 text-white/50 hover:bg-white/10 transition-colors"
                                                            >
                                                                Copy Link
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {signups.length === 0 ? (
                                                        <p className="text-xs text-white/25">No signups yet. Share the campaign link: /c/{c.slug}</p>
                                                    ) : (
                                                        <div className="max-h-64 overflow-y-auto space-y-1">
                                                            {signups.map(s => (
                                                                <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.02]">
                                                                    <div>
                                                                        <span className="text-xs text-white/70">{s.name}</span>
                                                                        <span className="text-[10px] text-white/25 ml-2">{s.email}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {s.source && <span className="text-[10px] text-white/20">{s.source}</span>}
                                                                        <span className="text-[10px] text-white/15">{new Date(s.createdAt).toLocaleDateString()}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function AdminCampaignsPage() {
    return (
        <ProtectedRoute>
            <CampaignsContent />
        </ProtectedRoute>
    );
}
