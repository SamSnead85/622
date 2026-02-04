'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// ============================================
// COMMUNITY VOTING SYSTEM
// The community decides what matters
// ============================================

interface VoteOption {
    id: string;
    title: string;
    description: string;
    votes: number;
    userVoted: boolean;
    icon?: string;
}

interface CommunityVoteProps {
    title: string;
    description: string;
    options: VoteOption[];
    totalVotes?: number;
    expiresIn?: string;
    onVote?: (optionId: string) => void;
}

export function CommunityVote({
    title,
    description,
    options,
    totalVotes = 0,
    expiresIn = '2 days',
    onVote
}: CommunityVoteProps) {
    const [selectedOption, setSelectedOption] = useState<string | null>(
        options.find(o => o.userVoted)?.id || null
    );
    const [hasVoted, setHasVoted] = useState(options.some(o => o.userVoted));

    const handleVote = (optionId: string) => {
        if (hasVoted) return;
        setSelectedOption(optionId);
        setHasVoted(true);
        onVote?.(optionId);
    };

    const total = options.reduce((sum, o) => sum + o.votes, 0) + (hasVoted && !options.some(o => o.userVoted) ? 1 : 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.02] rounded-2xl border border-white/5 p-6"
        >
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🗳️</span>
                        <span className="text-xs text-violet-400 font-medium uppercase tracking-wide">Community Vote</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <p className="text-sm text-white/50 mt-1">{description}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-white/40">Ends in</p>
                    <p className="text-sm text-white/60 font-medium">{expiresIn}</p>
                </div>
            </div>

            <div className="space-y-3 my-6">
                {options.map((option) => {
                    const percentage = total > 0 ? Math.round(((option.votes + (selectedOption === option.id && !option.userVoted ? 1 : 0)) / total) * 100) : 0;
                    const isSelected = selectedOption === option.id;

                    return (
                        <motion.button
                            key={option.id}
                            onClick={() => handleVote(option.id)}
                            disabled={hasVoted}
                            className={`
                                w-full p-4 rounded-xl text-left transition-all relative overflow-hidden
                                ${isSelected
                                    ? 'bg-violet-500/20 border border-violet-500/30'
                                    : hasVoted
                                        ? 'bg-white/[0.02] border border-white/5'
                                        : 'bg-white/5 border border-white/5 hover:bg-white/10 cursor-pointer'
                                }
                            `}
                            whileTap={!hasVoted ? { scale: 0.98 } : {}}
                        >
                            {/* Progress bar background */}
                            {hasVoted && (
                                <motion.div
                                    className="absolute inset-0 bg-violet-500/10 origin-left"
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: percentage / 100 }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                />
                            )}

                            <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {option.icon && <span className="text-xl">{option.icon}</span>}
                                    <div>
                                        <p className="font-medium text-white">{option.title}</p>
                                        {option.description && (
                                            <p className="text-xs text-white/40 mt-0.5">{option.description}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {hasVoted && (
                                        <span className="text-sm font-medium text-white/60">{percentage}%</span>
                                    )}
                                    {isSelected && (
                                        <span className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center text-white text-[10px]">✓</span>
                                    )}
                                </div>
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            <div className="flex items-center justify-between text-xs text-white/40">
                <span>{total.toLocaleString()} votes</span>
                <Link href="/algorithm" className="text-violet-400 hover:underline">
                    View all community decisions →
                </Link>
            </div>
        </motion.div>
    );
}

// ============================================
// COLLECTIVE SPONSORSHIP
// Community funds truth-tellers together
// ============================================

interface SponsorshipTarget {
    id: string;
    name: string;
    avatar: string;
    description: string;
    goal: number;
    raised: number;
    backers: number;
    daysLeft: number;
    location?: string;
    isLive?: boolean;
}

interface CollectiveSponsorshipProps {
    targets: SponsorshipTarget[];
    onContribute?: (targetId: string, amount: number) => void;
}

export function CollectiveSponsorship({ targets, onContribute }: CollectiveSponsorshipProps) {
    const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
    const [contributionAmount, setContributionAmount] = useState<number>(5);

    const handleContribute = (targetId: string) => {
        onContribute?.(targetId, contributionAmount);
        setSelectedTarget(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">💜</span>
                        <span className="text-xs text-purple-400 font-medium uppercase tracking-wide">Collective Sponsorship</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">Fund Truth-Tellers</h3>
                    <p className="text-sm text-white/50">Rally your community to sponsor a storyteller</p>
                </div>
                <Link
                    href="/sponsorship/create"
                    className="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 text-sm font-medium hover:bg-purple-500/30 transition-colors"
                >
                    Propose Story
                </Link>
            </div>

            <div className="space-y-4">
                {targets.map((target) => {
                    const percentage = Math.min(Math.round((target.raised / target.goal) * 100), 100);

                    return (
                        <motion.div
                            key={target.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/[0.02] rounded-2xl border border-white/5 p-5"
                        >
                            <div className="flex items-start gap-4">
                                <div className="relative">
                                    <div className="w-14 h-14 rounded-full overflow-hidden relative">
                                        <Image
                                            src={target.avatar}
                                            alt={target.name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    {target.isLive && (
                                        <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                                            LIVE
                                        </span>
                                    )}
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-white">{target.name}</h4>
                                        {target.location && (
                                            <span className="text-xs text-white/40">📍 {target.location}</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-white/60 mb-3">{target.description}</p>

                                    {/* Progress bar */}
                                    <div className="mb-3">
                                        <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                                            <span>${target.raised.toLocaleString()} raised</span>
                                            <span>${target.goal.toLocaleString()} goal</span>
                                        </div>
                                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percentage}%` }}
                                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 text-xs text-white/40">
                                            <span>👥 {target.backers} backers</span>
                                            <span>⏰ {target.daysLeft} days left</span>
                                        </div>

                                        {selectedTarget === target.id ? (
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={contributionAmount}
                                                    onChange={(e) => setContributionAmount(Number(e.target.value))}
                                                    className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm border border-white/10"
                                                >
                                                    <option value="5">$5</option>
                                                    <option value="10">$10</option>
                                                    <option value="25">$25</option>
                                                    <option value="50">$50</option>
                                                    <option value="100">$100</option>
                                                </select>
                                                <button
                                                    onClick={() => handleContribute(target.id)}
                                                    className="px-4 py-1.5 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors"
                                                >
                                                    Contribute
                                                </button>
                                                <button
                                                    onClick={() => setSelectedTarget(null)}
                                                    className="p-1.5 rounded-lg text-white/40 hover:text-white"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setSelectedTarget(target.id)}
                                                className="px-4 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-sm font-medium hover:bg-purple-500/30 transition-colors"
                                            >
                                                Back This Story
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

// ============================================
// STORY REQUEST BOARD
// Community requests stories from around the world
// ============================================

interface StoryRequest {
    id: string;
    title: string;
    location: string;
    description: string;
    votes: number;
    userVoted: boolean;
    status: 'open' | 'funded' | 'in-progress' | 'completed';
}

interface StoryRequestBoardProps {
    requests: StoryRequest[];
    onVote?: (requestId: string) => void;
    onPropose?: () => void;
}

export function StoryRequestBoard({ requests, onVote, onPropose }: StoryRequestBoardProps) {
    const statusColors: Record<string, string> = {
        open: 'text-amber-400 bg-amber-500/20',
        funded: 'text-emerald-400 bg-emerald-500/20',
        'in-progress': 'text-blue-400 bg-blue-500/20',
        completed: 'text-violet-400 bg-violet-500/20',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.02] rounded-2xl border border-white/5 p-6"
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">📍</span>
                        <span className="text-xs text-emerald-400 font-medium uppercase tracking-wide">Story Requests</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">Where should we go next?</h3>
                </div>
                <button
                    onClick={onPropose}
                    className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-colors"
                >
                    + Request Story
                </button>
            </div>

            <div className="space-y-3">
                {requests.map((request, index) => (
                    <motion.div
                        key={request.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                    >
                        <button
                            onClick={() => onVote?.(request.id)}
                            className={`
                                flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[50px]
                                ${request.userVoted
                                    ? 'bg-violet-500/20 text-violet-400'
                                    : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                                }
                            `}
                        >
                            <span className="text-sm">▲</span>
                            <span className="text-xs font-medium">{request.votes}</span>
                        </button>

                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-white">{request.title}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[request.status]}`}>
                                    {request.status.replace('-', ' ')}
                                </span>
                            </div>
                            <p className="text-sm text-white/50">📍 {request.location}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}

export default CommunityVote;
