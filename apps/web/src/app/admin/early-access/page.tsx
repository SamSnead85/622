'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProtectedRoute, useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/lib/api';
import { NavigationSidebar } from '@/components/dashboard/NavigationSidebar';

interface EarlyAccessRequest {
    id: string;
    name: string;
    email: string;
    reason: string;
    role: string | null;
    socialUrl: string | null;
    status: string;
    accessCode: string | null;
    createdAt: string;
    reviewedAt: string | null;
}

interface AccessCode {
    id: string;
    code: string;
    type: string;
    maxUses: number;
    useCount: number;
    expiresAt: string | null;
    isActive: boolean;
    createdAt: string;
}

function AdminContent() {
    const { user } = useAuth();
    const [tab, setTab] = useState<'requests' | 'codes'>('requests');
    const [requests, setRequests] = useState<EarlyAccessRequest[]>([]);
    const [codes, setCodes] = useState<AccessCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [newCodeForm, setNewCodeForm] = useState({ code: '', maxUses: 1, type: 'early_access' });
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;

    const fetchRequests = useCallback(async () => {
        try {
            const hdrs = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
            const url = filter === 'all'
                ? `${API_URL}/api/v1/auth/admin/early-access`
                : `${API_URL}/api/v1/auth/admin/early-access?status=${filter}`;
            const res = await fetch(url, { headers: hdrs });
            if (res.ok) setRequests(await res.json());
        } catch { /* */ }
    }, [filter, token]);

    const fetchCodes = useCallback(async () => {
        try {
            const hdrs = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
            const res = await fetch(`${API_URL}/api/v1/auth/admin/access-codes`, { headers: hdrs });
            if (res.ok) setCodes(await res.json());
        } catch { /* */ }
    }, [token]);

    useEffect(() => {
        setLoading(true);
        Promise.all([fetchRequests(), fetchCodes()]).finally(() => setLoading(false));
    }, [fetchRequests, fetchCodes]);

    const approveRequest = async (id: string) => {
        setActionLoading(id);
        const hdrs = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        try {
            const res = await fetch(`${API_URL}/api/v1/auth/admin/early-access/${id}/approve`, { method: 'POST', headers: hdrs });
            if (res.ok) await fetchRequests();
        } catch { /* */ }
        setActionLoading(null);
    };

    const rejectRequest = async (id: string) => {
        setActionLoading(id);
        const hdrs = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        try {
            const res = await fetch(`${API_URL}/api/v1/auth/admin/early-access/${id}/reject`, { method: 'POST', headers: hdrs });
            if (res.ok) await fetchRequests();
        } catch { /* */ }
        setActionLoading(null);
    };

    const createCode = async () => {
        const hdrs = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        try {
            const res = await fetch(`${API_URL}/api/v1/auth/admin/access-codes`, {
                method: 'POST', headers: hdrs,
                body: JSON.stringify(newCodeForm),
            });
            if (res.ok) {
                await fetchCodes();
                setShowCodeModal(false);
                setNewCodeForm({ code: '', maxUses: 1, type: 'early_access' });
            }
        } catch { /* */ }
    };

    const deactivateCode = async (id: string) => {
        const hdrs = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        try {
            await fetch(`${API_URL}/api/v1/auth/admin/access-codes/${id}`, { method: 'DELETE', headers: hdrs });
            await fetchCodes();
        } catch { /* */ }
    };

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    return (
        <div className="min-h-screen bg-[#030305]">
            <NavigationSidebar />
            <main className="pt-20 pb-16 px-4 md:px-8 max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Early Access Management</h1>
                    <p className="text-white/50">Review applications and manage access codes</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-8 border-b border-white/[0.06]">
                    <button
                        onClick={() => setTab('requests')}
                        className={`pb-3 px-1 text-sm font-medium transition-colors relative ${tab === 'requests' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                    >
                        Applications {pendingCount > 0 && <span className="ml-1.5 px-2 py-0.5 rounded-full bg-[#7C8FFF]/20 text-[#7C8FFF] text-xs">{pendingCount}</span>}
                        {tab === 'requests' && <motion.div layoutId="adminTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
                    </button>
                    <button
                        onClick={() => setTab('codes')}
                        className={`pb-3 px-1 text-sm font-medium transition-colors relative ${tab === 'codes' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                    >
                        Access Codes ({codes.length})
                        {tab === 'codes' && <motion.div layoutId="adminTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
                    </button>
                </div>

                {tab === 'requests' && (
                    <>
                        {/* Filter */}
                        <div className="flex gap-2 mb-6">
                            {['all', 'pending', 'approved', 'rejected'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* Requests */}
                        <div className="space-y-3">
                            {loading ? (
                                <div className="text-center py-20 text-white/30">Loading...</div>
                            ) : requests.length === 0 ? (
                                <div className="text-center py-20 text-white/30">No applications found</div>
                            ) : requests.map(req => (
                                <motion.div
                                    key={req.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover:bg-white/[0.04] transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-semibold text-white">{req.name}</h3>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                    req.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                                    req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>
                                                    {req.status}
                                                </span>
                                                {req.role && <span className="text-xs text-white/30">{req.role}</span>}
                                            </div>
                                            <p className="text-sm text-white/50 mb-1">{req.email}</p>
                                            <p className="text-sm text-white/70 leading-relaxed">{req.reason}</p>
                                            {req.socialUrl && <a href={req.socialUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#7C8FFF]/60 hover:text-[#7C8FFF] mt-1 inline-block">{req.socialUrl}</a>}
                                            {req.accessCode && <p className="text-xs text-emerald-400/70 mt-1 font-mono">Code: {req.accessCode}</p>}
                                            <p className="text-xs text-white/20 mt-2">{new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                        {req.status === 'pending' && (
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => approveRequest(req.id)}
                                                    disabled={actionLoading === req.id}
                                                    className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                                                >
                                                    {actionLoading === req.id ? '...' : 'Approve'}
                                                </button>
                                                <button
                                                    onClick={() => rejectRequest(req.id)}
                                                    disabled={actionLoading === req.id}
                                                    className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </>
                )}

                {tab === 'codes' && (
                    <>
                        <div className="flex justify-end mb-6">
                            <button
                                onClick={() => setShowCodeModal(true)}
                                className="px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all"
                            >
                                Create Access Code
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/[0.06] text-white/40">
                                        <th className="text-left py-3 px-4 font-medium">Code</th>
                                        <th className="text-left py-3 px-4 font-medium">Type</th>
                                        <th className="text-left py-3 px-4 font-medium">Usage</th>
                                        <th className="text-left py-3 px-4 font-medium">Status</th>
                                        <th className="text-left py-3 px-4 font-medium">Created</th>
                                        <th className="text-right py-3 px-4 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {codes.map(code => (
                                        <tr key={code.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                                            <td className="py-3 px-4 font-mono text-white">{code.code}</td>
                                            <td className="py-3 px-4 text-white/50">{code.type}</td>
                                            <td className="py-3 px-4 text-white/50">{code.useCount} / {code.maxUses}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${code.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}>
                                                    {code.isActive ? 'Active' : 'Disabled'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-white/30">{new Date(code.createdAt).toLocaleDateString()}</td>
                                            <td className="py-3 px-4 text-right">
                                                {code.isActive && (
                                                    <button onClick={() => deactivateCode(code.id)} className="text-red-400/60 hover:text-red-400 text-xs">
                                                        Deactivate
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Create Code Modal */}
                        <AnimatePresence>
                            {showCodeModal && (
                                <motion.div
                                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setShowCodeModal(false)}
                                >
                                    <motion.div
                                        className="bg-[#0A0A0F] border border-white/[0.08] rounded-2xl p-6 w-full max-w-md"
                                        initial={{ scale: 0.95, y: 20 }}
                                        animate={{ scale: 1, y: 0 }}
                                        exit={{ scale: 0.95, y: 20 }}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <h3 className="text-lg font-semibold text-white mb-4">Create Access Code</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm text-white/60 mb-1.5">Code (optional, auto-generated if empty)</label>
                                                <input
                                                    value={newCodeForm.code}
                                                    onChange={e => setNewCodeForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                                                    placeholder="AUTO-GENERATED"
                                                    className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-white/20 font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-white/60 mb-1.5">Max Uses</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={newCodeForm.maxUses}
                                                    onChange={e => setNewCodeForm(f => ({ ...f, maxUses: parseInt(e.target.value) || 1 }))}
                                                    className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-white/20"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-white/60 mb-1.5">Type</label>
                                                <select
                                                    value={newCodeForm.type}
                                                    onChange={e => setNewCodeForm(f => ({ ...f, type: e.target.value }))}
                                                    className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-white/20 appearance-none"
                                                >
                                                    <option value="early_access" className="bg-black">Early Access</option>
                                                    <option value="founder_invite" className="bg-black">Founder Invite</option>
                                                    <option value="admin" className="bg-black">Admin</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-3 mt-6">
                                            <button onClick={() => setShowCodeModal(false)} className="px-4 py-2 text-sm text-white/50 hover:text-white">Cancel</button>
                                            <button onClick={createCode} className="px-5 py-2 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90">Create</button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </main>
        </div>
    );
}

export default function AdminEarlyAccessPage() {
    return (
        <ProtectedRoute>
            <AdminContent />
        </ProtectedRoute>
    );
}
