'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

export type CampaignType = 'boycott' | 'petition' | 'letter' | 'phone' | 'divestment' | 'awareness';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'victory';

export interface CampaignTarget {
    id: string;
    name: string;
    type: 'company' | 'politician' | 'institution' | 'organization';
    logo?: string;
    website?: string;
    reason: string;
    alternatives?: string[];
}

export interface CampaignAction {
    id: string;
    type: 'sign' | 'share' | 'call' | 'email' | 'post';
    description: string;
    completedBy: number;
    target?: number;
}

export interface CampaignMilestone {
    id: string;
    title: string;
    description: string;
    targetValue: number;
    currentValue: number;
    reachedAt?: Date;
}

export interface Campaign {
    id: string;
    title: string;
    description: string;
    type: CampaignType;
    status: CampaignStatus;
    targets: CampaignTarget[];
    actions: CampaignAction[];
    milestones: CampaignMilestone[];
    supporters: number;
    signatures?: number;
    signatureGoal?: number;
    createdAt: Date;
    updatedAt: Date;
    organizer: {
        id: string;
        name: string;
        avatar: string;
        circleName?: string;
    };
    hashtag?: string;
    victories: string[];
}

// ============================================================================
// CAMPAIGN TYPE CONFIG
// ============================================================================

const campaignTypeConfig: Record<CampaignType, { label: string; icon: string; color: string; description: string }> = {
    boycott: { label: 'Boycott', icon: '🚫', color: 'bg-red-500/20 text-red-400', description: 'Refuse to buy from target companies' },
    petition: { label: 'Petition', icon: '📝', color: 'bg-violet-500/20 text-violet-400', description: 'Collect signatures for change' },
    letter: { label: 'Letter Writing', icon: '✉️', color: 'bg-cyan-500/20 text-cyan-400', description: 'Send letters to decision makers' },
    phone: { label: 'Phone Banking', icon: '📞', color: 'bg-emerald-500/20 text-emerald-400', description: 'Call representatives and officials' },
    divestment: { label: 'Divestment', icon: '💰', color: 'bg-amber-500/20 text-amber-400', description: 'Withdraw investments from targets' },
    awareness: { label: 'Awareness', icon: '📢', color: 'bg-blue-500/20 text-blue-400', description: 'Spread information and educate' },
};

const statusConfig: Record<CampaignStatus, { label: string; color: string }> = {
    draft: { label: 'Draft', color: 'bg-white/20 text-white/60' },
    active: { label: 'Active', color: 'bg-emerald-500/20 text-emerald-400' },
    paused: { label: 'Paused', color: 'bg-amber-500/20 text-amber-400' },
    completed: { label: 'Completed', color: 'bg-white/20 text-white/60' },
    victory: { label: '🏆 Victory!', color: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400' },
};

// ============================================================================
// PETITION SIGNATURE TRACKER
// ============================================================================

interface SignatureTrackerProps {
    current: number;
    goal: number;
    onSign?: () => void;
    hasSigned?: boolean;
}

export function SignatureTracker({ current, goal, onSign, hasSigned = false }: SignatureTrackerProps) {
    const progress = (current / goal) * 100;
    const milestones = [100, 500, 1000, 5000, 10000, 50000, 100000].filter((m) => m <= goal);

    return (
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">📝 Petition Signatures</h3>
                <span className="text-2xl font-bold text-white">{current.toLocaleString()}</span>
            </div>

            {/* Progress Bar */}
            <div className="relative h-4 bg-white/10 rounded-full overflow-hidden mb-4">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-fuchsia-500"
                />
                {/* Milestone markers */}
                {milestones.map((m) => (
                    <div
                        key={m}
                        className="absolute top-0 bottom-0 w-0.5 bg-white/20"
                        style={{ left: `${(m / goal) * 100}%` }}
                    />
                ))}
            </div>

            <div className="flex items-center justify-between text-sm mb-6">
                <span className="text-white/50">Goal: {goal.toLocaleString()}</span>
                <span className="text-violet-400">{Math.round(progress)}% complete</span>
            </div>

            {/* Sign Button */}
            {hasSigned ? (
                <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 font-medium">
                    <span>✓</span> You signed this petition
                </div>
            ) : (
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onSign}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold text-lg"
                >
                    ✍️ Sign This Petition
                </motion.button>
            )}
        </div>
    );
}

// ============================================================================
// BOYCOTT TARGET CARD
// ============================================================================

interface TargetCardProps {
    target: CampaignTarget;
    onLearnMore?: () => void;
}

export function TargetCard({ target, onLearnMore }: TargetCardProps) {
    const typeLabel = {
        company: '🏢 Company',
        politician: '🏛️ Politician',
        institution: '🎓 Institution',
        organization: '🏛️ Organization',
    };

    return (
        <div className="bg-white/5 rounded-xl p-5 border border-red-500/20">
            <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-red-500/10 flex items-center justify-center text-3xl border border-red-500/20">
                    🚫
                </div>
                <div className="flex-1">
                    <span className="text-xs text-red-400 font-medium">{typeLabel[target.type]}</span>
                    <h4 className="text-lg font-bold text-white">{target.name}</h4>
                    <p className="text-sm text-white/60 mt-1">{target.reason}</p>

                    {target.alternatives && target.alternatives.length > 0 && (
                        <div className="mt-3">
                            <span className="text-xs text-emerald-400 font-medium">✓ Alternatives:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {target.alternatives.map((alt) => (
                                    <span key={alt} className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs">
                                        {alt}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// ACTION CARD
// ============================================================================

interface ActionCardProps {
    action: CampaignAction;
    onTakeAction?: () => void;
}

export function ActionCard({ action, onTakeAction }: ActionCardProps) {
    const actionConfig = {
        sign: { icon: '✍️', label: 'Sign', color: 'violet' },
        share: { icon: '🔗', label: 'Share', color: 'cyan' },
        call: { icon: '📞', label: 'Call', color: 'emerald' },
        email: { icon: '✉️', label: 'Email', color: 'amber' },
        post: { icon: '📱', label: 'Post', color: 'fuchsia' },
    };

    const config = actionConfig[action.type];
    const progress = action.target ? (action.completedBy / action.target) * 100 : 0;

    return (
        <motion.div
            whileHover={{ y: -2 }}
            className="bg-white/5 rounded-xl p-4 border border-white/10"
        >
            <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{config.icon}</span>
                <div className="flex-1">
                    <p className="font-medium text-white">{action.description}</p>
                    <p className="text-xs text-white/50">{action.completedBy.toLocaleString()} people took this action</p>
                </div>
            </div>

            {action.target && (
                <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progress, 100)}%` }}
                        className={`h-full bg-${config.color}-500`}
                    />
                </div>
            )}

            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onTakeAction}
                className={`w-full py-2 rounded-lg bg-${config.color}-500/20 text-${config.color}-400 font-medium text-sm`}
            >
                Take Action
            </motion.button>
        </motion.div>
    );
}

// ============================================================================
// CAMPAIGN DETAIL VIEW
// ============================================================================

interface CampaignDetailProps {
    campaign: Campaign;
    currentUserId: string;
    onSign?: () => void;
    onTakeAction?: (actionId: string) => void;
}

export function CampaignDetail({ campaign, currentUserId, onSign, onTakeAction }: CampaignDetailProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'targets' | 'actions' | 'updates'>('overview');
    const typeConfig = campaignTypeConfig[campaign.type];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeConfig.color}`}>
                        {typeConfig.icon} {typeConfig.label}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[campaign.status].color}`}>
                        {statusConfig[campaign.status].label}
                    </span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">{campaign.title}</h1>
                {campaign.hashtag && (
                    <p className="text-violet-400 font-medium">#{campaign.hashtag}</p>
                )}
            </div>

            {/* Organizer */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                    {campaign.organizer.avatar}
                </div>
                <div>
                    <p className="text-sm text-white/50">Organized by</p>
                    <p className="text-white font-medium">{campaign.organizer.name}</p>
                </div>
                {campaign.organizer.circleName && (
                    <span className="px-3 py-1 rounded-full bg-white/10 text-white/60 text-sm">
                        ⭕ {campaign.organizer.circleName}
                    </span>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
                    <p className="text-2xl font-bold text-white">{campaign.supporters.toLocaleString()}</p>
                    <p className="text-sm text-white/50">Supporters</p>
                </div>
                {campaign.signatures !== undefined && (
                    <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
                        <p className="text-2xl font-bold text-violet-400">{campaign.signatures.toLocaleString()}</p>
                        <p className="text-sm text-white/50">Signatures</p>
                    </div>
                )}
                <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
                    <p className="text-2xl font-bold text-emerald-400">{campaign.victories.length}</p>
                    <p className="text-sm text-white/50">Victories</p>
                </div>
            </div>

            {/* Petition Tracker (if applicable) */}
            {campaign.type === 'petition' && campaign.signatures !== undefined && campaign.signatureGoal && (
                <SignatureTracker
                    current={campaign.signatures}
                    goal={campaign.signatureGoal}
                    onSign={onSign}
                />
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-4">
                {[
                    { id: 'overview' as const, label: 'Overview' },
                    { id: 'targets' as const, label: `Targets (${campaign.targets.length})` },
                    { id: 'actions' as const, label: `Actions (${campaign.actions.length})` },
                    { id: 'updates' as const, label: 'Updates' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-xl font-medium transition-colors ${activeTab === tab.id
                                ? 'bg-white text-gray-900'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                >
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">About This Campaign</h3>
                                <p className="text-white/70">{campaign.description}</p>
                            </div>

                            {/* Victories */}
                            {campaign.victories.length > 0 && (
                                <div className="p-5 rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20">
                                    <h3 className="font-semibold text-amber-400 mb-3">🏆 Victories</h3>
                                    <ul className="space-y-2">
                                        {campaign.victories.map((victory, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-white/80">
                                                <span className="text-amber-400">✓</span>
                                                {victory}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'targets' && (
                        <div className="space-y-4">
                            {campaign.targets.map((target) => (
                                <TargetCard key={target.id} target={target} />
                            ))}
                        </div>
                    )}

                    {activeTab === 'actions' && (
                        <div className="grid md:grid-cols-2 gap-4">
                            {campaign.actions.map((action) => (
                                <ActionCard
                                    key={action.id}
                                    action={action}
                                    onTakeAction={() => onTakeAction?.(action.id)}
                                />
                            ))}
                        </div>
                    )}

                    {activeTab === 'updates' && (
                        <div className="text-center py-12 text-white/40">
                            No updates yet. Check back soon!
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

// ============================================================================
// CAMPAIGN CARD
// ============================================================================

interface CampaignCardProps {
    campaign: Campaign;
    onClick?: () => void;
}

export function CampaignCard({ campaign, onClick }: CampaignCardProps) {
    const typeConfig = campaignTypeConfig[campaign.type];
    const progress = campaign.signatureGoal ? (campaign.signatures || 0) / campaign.signatureGoal * 100 : 0;

    return (
        <motion.div
            whileHover={{ y: -4 }}
            onClick={onClick}
            className="bg-white/5 rounded-2xl p-6 border border-white/10 cursor-pointer hover:border-violet-500/30 transition-colors"
        >
            <div className="flex items-start justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeConfig.color}`}>
                    {typeConfig.icon} {typeConfig.label}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[campaign.status].color}`}>
                    {statusConfig[campaign.status].label}
                </span>
            </div>

            <h3 className="text-lg font-semibold text-white mb-2">{campaign.title}</h3>
            <p className="text-sm text-white/50 line-clamp-2 mb-4">{campaign.description}</p>

            {campaign.signatureGoal && (
                <div className="mb-4">
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(progress, 100)}%` }}
                            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                        />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-white/50">
                        <span>{(campaign.signatures || 0).toLocaleString()} signed</span>
                        <span>{campaign.signatureGoal.toLocaleString()} goal</span>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <span className="text-sm text-white/40">{campaign.supporters.toLocaleString()} supporters</span>
                {campaign.victories.length > 0 && (
                    <span className="text-xs text-amber-400">🏆 {campaign.victories.length} victories</span>
                )}
            </div>
        </motion.div>
    );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default CampaignDetail;
