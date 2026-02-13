'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';

interface Proposal {
    id: string;
    title: string;
    description: string;
    type: string;
    status: string;
    votesFor: number;
    votesAgainst: number;
    quorum: number;
    expiresAt: string;
    createdAt: string;
    author: { id: string; username: string; displayName: string; avatarUrl?: string };
}

export default function GovernancePage() {
    const { id: communityId } = useParams();
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [filter, setFilter] = useState<string>('');

    const fetchProposals = useCallback(async () => {
        try {
            const url = filter
                ? `/api/v1/governance/${communityId}/proposals?status=${filter}`
                : `/api/v1/governance/${communityId}/proposals`;
            const data = await apiFetch(url);
            const parsed: any = data.data ?? data;
            setProposals(parsed?.proposals || []);
        } catch {
            // Handle silently
        }
        setIsLoading(false);
    }, [communityId, filter]);

    useEffect(() => { fetchProposals(); }, [fetchProposals]);

    const handleVote = async (proposalId: string, vote: boolean) => {
        await apiFetch(`/api/v1/governance/proposals/${proposalId}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vote }),
        });
        fetchProposals();
    };

    const handleCreateProposal = async (data: { title: string; description: string; type: string }) => {
        await apiFetch(`/api/v1/governance/${communityId}/proposals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, expiresInDays: 7 }),
        });
        setShowCreate(false);
        fetchProposals();
    };

    const statusColors: Record<string, string> = {
        ACTIVE: 'text-[#7C8FFF] bg-[#7C8FFF]/10',
        PASSED: 'text-emerald-400 bg-emerald-400/10',
        REJECTED: 'text-red-400 bg-red-400/10',
        EXPIRED: 'text-white/40 bg-white/5',
        WITHDRAWN: 'text-yellow-400 bg-yellow-400/10',
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 sm:p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold">Community Governance</h1>
                    <p className="text-white/50 text-sm mt-1">Democratic proposals and community decisions</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="px-4 py-2 rounded-xl bg-[#7C8FFF] text-white font-semibold text-sm hover:opacity-90"
                >
                    New Proposal
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
                {['', 'ACTIVE', 'PASSED', 'REJECTED', 'EXPIRED'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
                            filter === f ? 'bg-white/15 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                        }`}
                    >
                        {f || 'All'}
                    </button>
                ))}
            </div>

            {isLoading && (
                <div className="text-center py-12 text-white/40">Loading proposals...</div>
            )}

            <div className="space-y-4">
                {proposals.map((proposal) => {
                    const totalVotes = proposal.votesFor + proposal.votesAgainst;
                    const forPercent = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 50;

                    return (
                        <motion.div
                            key={proposal.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/5 border border-white/10 rounded-2xl p-5"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[proposal.status] || ''}`}>
                                            {proposal.status}
                                        </span>
                                        <span className="text-white/30 text-xs">{proposal.type.replace('_', ' ')}</span>
                                    </div>
                                    <h3 className="text-white font-semibold">{proposal.title}</h3>
                                    <p className="text-white/50 text-sm mt-1 line-clamp-2">{proposal.description}</p>
                                </div>
                            </div>

                            {/* Voting bar */}
                            <div className="mt-4">
                                <div className="flex justify-between text-xs text-white/40 mb-1">
                                    <span>For: {proposal.votesFor}</span>
                                    <span>Against: {proposal.votesAgainst}</span>
                                </div>
                                <div className="h-2 rounded-full bg-white/10 overflow-hidden flex">
                                    <div className="bg-emerald-400 h-full" style={{ width: `${forPercent}%` }} />
                                    <div className="bg-red-400 h-full" style={{ width: `${100 - forPercent}%` }} />
                                </div>
                                <div className="flex justify-between text-xs text-white/30 mt-1">
                                    <span>Quorum: {totalVotes}/{proposal.quorum}</span>
                                    <span>Expires: {new Date(proposal.expiresAt).toLocaleDateString()}</span>
                                </div>
                            </div>

                            {/* Vote buttons */}
                            {proposal.status === 'ACTIVE' && (
                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => handleVote(proposal.id, true)}
                                        className="flex-1 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-colors"
                                    >
                                        Vote For
                                    </button>
                                    <button
                                        onClick={() => handleVote(proposal.id, false)}
                                        className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors"
                                    >
                                        Vote Against
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                                <span className="text-white/30 text-xs">
                                    by @{proposal.author.username} · {new Date(proposal.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {!isLoading && proposals.length === 0 && (
                <div className="text-center py-16">
                    <p className="text-white/30 text-lg mb-2">No proposals yet</p>
                    <p className="text-white/20 text-sm">Be the first to propose a change to this community</p>
                </div>
            )}

            {/* Create proposal modal */}
            <AnimatePresence>
                {showCreate && (
                    <CreateProposalModal
                        onClose={() => setShowCreate(false)}
                        onCreate={handleCreateProposal}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function CreateProposalModal({ onClose, onCreate }: {
    onClose: () => void;
    onCreate: (data: { title: string; description: string; type: string }) => void;
}) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('FEATURE_REQUEST');

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="bg-[#12121A] border border-white/10 rounded-2xl p-6 max-w-lg w-full"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-white font-semibold text-lg mb-4">New Proposal</h3>

                <div className="space-y-4">
                    <div>
                        <label className="text-white/60 text-sm mb-1 block">Type</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
                        >
                            <option value="FEATURE_REQUEST">Feature Request</option>
                            <option value="RULE_CHANGE">Rule Change</option>
                            <option value="POLICY_CHANGE">Policy Change</option>
                            <option value="MODERATOR_ELECTION">Moderator Election</option>
                            <option value="BAN_APPEAL">Ban Appeal</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-white/60 text-sm mb-1 block">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/30"
                            placeholder="Proposal title"
                        />
                    </div>

                    <div>
                        <label className="text-white/60 text-sm mb-1 block">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/30 resize-none"
                            placeholder="Describe your proposal..."
                        />
                    </div>
                </div>

                <div className="flex gap-2 mt-6">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm">Cancel</button>
                    <button
                        onClick={() => onCreate({ title, description, type })}
                        disabled={!title.trim() || !description.trim()}
                        className="flex-1 py-2.5 rounded-xl bg-[#7C8FFF] text-white font-semibold text-sm disabled:opacity-50"
                    >
                        Submit
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
