'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { CommunityVote, CollectiveSponsorship, StoryRequestBoard } from '@/components/CommunityGovernance';

// ============================================================================
// SAMPLE DATA
// ============================================================================

const ACTIVE_VOTES = [
    {
        id: 'v1',
        title: 'Algorithm Transparency: Show ranking factors',
        description: 'Should posts display why they appeared in your feed?',
        expiresIn: '2 days',
        options: [
            { id: '1', title: 'Full transparency', description: 'Show all ranking factors', votes: 8234, userVoted: false, icon: '👁️' },
            { id: '2', title: 'Summary only', description: 'High-level reasons', votes: 3421, userVoted: false, icon: '📋' },
            { id: '3', title: 'On request', description: 'Click to reveal', votes: 1892, userVoted: false, icon: '🔍' },
        ],
    },
    {
        id: 'v2',
        title: 'Verification Priority: Who gets verified first?',
        description: 'Rank which creators should receive expedited verification',
        expiresIn: '5 days',
        options: [
            { id: '1', title: 'Journalists in conflict zones', description: 'Priority for those in danger', votes: 12847, userVoted: true, icon: '📰' },
            { id: '2', title: 'Humanitarian workers', description: 'Aid workers on the ground', votes: 8921, userVoted: false, icon: '🏥' },
            { id: '3', title: 'Citizen journalists', description: 'Community documenters', votes: 6234, userVoted: false, icon: '📱' },
            { id: '4', title: 'Researchers & academics', description: 'Subject matter experts', votes: 4102, userVoted: false, icon: '🎓' },
        ],
    },
];

const SPONSORSHIP_TARGETS = [
    {
        id: 's1',
        name: 'Bisan Owda',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
        description: 'Documenting daily life in Gaza with raw, unfiltered visual journalism',
        goal: 50000,
        raised: 47823,
        backers: 12847,
        daysLeft: 8,
        location: 'Gaza',
        isLive: true,
    },
    {
        id: 's2',
        name: 'Drop Site News',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
        description: 'Investigative journalism breaking stories mainstream media won\'t touch',
        goal: 75000,
        raised: 68900,
        backers: 15234,
        daysLeft: 12,
        location: 'Global',
    },
    {
        id: 's3',
        name: 'Zeteo',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face',
        description: 'Independent media holding power accountable with fearless reporting',
        goal: 100000,
        raised: 82340,
        backers: 18921,
        daysLeft: 15,
        location: 'USA',
    },
];

const STORY_REQUESTS = [
    { id: 'r1', title: 'Water crisis in Jackson, Mississippi', location: 'Jackson, MS', description: 'Years after the crisis began, what has changed?', votes: 2834, userVoted: false, status: 'open' as const },
    { id: 'r2', title: 'UNRWA schools during the crisis', location: 'West Bank', description: 'How are Palestinian children continuing education?', votes: 4521, userVoted: true, status: 'funded' as const },
    { id: 'r3', title: 'Prison labor and corporate profits', location: 'Multiple States', description: 'Investigation into companies using prison labor', votes: 3102, userVoted: false, status: 'in-progress' as const },
    { id: 'r4', title: 'Indigenous land rights in the Amazon', location: 'Brazil', description: 'Deforestation impact on native communities', votes: 1893, userVoted: false, status: 'open' as const },
];

// ============================================================================
// GOVERNANCE PAGE
// ============================================================================

type Tab = 'votes' | 'sponsorship' | 'requests' | 'moderation';

export default function GovernancePage() {
    const [activeTab, setActiveTab] = useState<Tab>('votes');

    const tabs: { id: Tab; label: string; icon: string; badge?: number }[] = [
        { id: 'votes', label: 'Active Votes', icon: '🗳️', badge: 2 },
        { id: 'sponsorship', label: 'Sponsorship', icon: '💜' },
        { id: 'requests', label: 'Story Requests', icon: '📍', badge: 4 },
        { id: 'moderation', label: 'Moderation', icon: '🛡️' },
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            {/* Header */}
            <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">
                                ← Back
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-white">Community Governance</h1>
                                <p className="text-sm text-white/50">Shape the future of 0G together</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-xs text-white/40">Your Voting Power</p>
                                <p className="text-lg font-bold text-white">1,247 VP</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold">
                                S
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Stats Banner */}
            <div className="bg-gradient-to-r from-violet-900/20 to-fuchsia-900/20 border-b border-white/5">
                <div className="max-w-6xl mx-auto px-6 py-6">
                    <div className="grid grid-cols-4 gap-6">
                        {[
                            { label: 'Active Proposals', value: '12', icon: '📜' },
                            { label: 'Total Voters', value: '48,234', icon: '👥' },
                            { label: 'Funds Raised', value: '$2.4M', icon: '💰' },
                            { label: 'Stories Funded', value: '89', icon: '📰' },
                        ].map((stat) => (
                            <div key={stat.label} className="text-center">
                                <span className="text-2xl mb-2 block">{stat.icon}</span>
                                <p className="text-2xl font-bold text-white">{stat.value}</p>
                                <p className="text-sm text-white/50">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Tabs */}
                <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
                    {tabs.map((tab) => (
                        <motion.button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                                ? 'bg-white text-gray-900'
                                : 'bg-white/5 text-white/70 hover:bg-white/10'
                                }`}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                            {tab.badge && (
                                <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-gray-900 text-white' : 'bg-white/10'
                                    }`}>
                                    {tab.badge}
                                </span>
                            )}
                        </motion.button>
                    ))}
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'votes' && (
                            <div className="space-y-6">
                                {ACTIVE_VOTES.map((vote) => (
                                    <CommunityVote
                                        key={vote.id}
                                        title={vote.title}
                                        description={vote.description}
                                        options={vote.options}
                                        expiresIn={vote.expiresIn}
                                    />
                                ))}

                                {/* How Voting Works */}
                                <div className="bg-white/[0.02] rounded-2xl border border-white/5 p-6 mt-8">
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                        <span>ℹ️</span> How Community Voting Works
                                    </h3>
                                    <div className="grid md:grid-cols-3 gap-6">
                                        <div>
                                            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400 mb-3">
                                                1
                                            </div>
                                            <h4 className="font-medium text-white mb-1">Earn Voting Power</h4>
                                            <p className="text-sm text-white/50">
                                                Your voting power grows based on your contributions, engagement, and time on the platform.
                                            </p>
                                        </div>
                                        <div>
                                            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400 mb-3">
                                                2
                                            </div>
                                            <h4 className="font-medium text-white mb-1">Cast Your Vote</h4>
                                            <p className="text-sm text-white/50">
                                                Vote on proposals that shape the platform. Your vote is weighted by your voting power.
                                            </p>
                                        </div>
                                        <div>
                                            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400 mb-3">
                                                3
                                            </div>
                                            <h4 className="font-medium text-white mb-1">See Results</h4>
                                            <p className="text-sm text-white/50">
                                                Winning proposals are implemented. You can track progress in real-time.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'sponsorship' && (
                            <CollectiveSponsorship targets={SPONSORSHIP_TARGETS} />
                        )}

                        {activeTab === 'requests' && (
                            <StoryRequestBoard requests={STORY_REQUESTS} />
                        )}

                        {activeTab === 'moderation' && (
                            <ModerationPanel />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

// ============================================================================
// MODERATION PANEL
// ============================================================================

function ModerationPanel() {
    const [selectedAction, setSelectedAction] = useState<string | null>(null);

    const moderationPrinciples = [
        { icon: '🤝', title: 'Community-First', desc: 'Moderation decisions prioritize community safety and trust' },
        { icon: '👁️', title: 'Transparent', desc: 'All moderation actions are logged and reviewable' },
        { icon: '⚖️', title: 'Fair', desc: 'Appeals are handled by diverse community panels' },
        { icon: '🛡️', title: 'Protective', desc: 'Zero tolerance for harassment, hate speech, and misinformation' },
    ];

    const recentActions = [
        { type: 'removed', content: 'Spam post', reason: 'Automated spam detection', timestamp: '2 hours ago' },
        { type: 'warning', content: '@user_handle', reason: 'Harassment policy violation', timestamp: '5 hours ago' },
        { type: 'appealed', content: 'Misinformation flag', reason: 'Under community review', timestamp: '1 day ago' },
    ];

    return (
        <div className="space-y-6">
            {/* Principles */}
            <div className="bg-white/[0.02] rounded-2xl border border-white/5 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Community Moderation Principles</h3>
                <div className="grid md:grid-cols-4 gap-4">
                    {moderationPrinciples.map((principle) => (
                        <div key={principle.title} className="text-center p-4 rounded-xl bg-white/[0.02]">
                            <span className="text-2xl mb-2 block">{principle.icon}</span>
                            <h4 className="font-medium text-white mb-1">{principle.title}</h4>
                            <p className="text-xs text-white/50">{principle.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Actions */}
            <div className="bg-white/[0.02] rounded-2xl border border-white/5 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Recent Moderation Actions</h3>
                    <span className="text-xs text-white/40">Transparency log</span>
                </div>
                <div className="space-y-3">
                    {recentActions.map((action, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                            <div className={`w-2 h-2 rounded-full ${action.type === 'removed' ? 'bg-red-500' :
                                action.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                                }`} />
                            <div className="flex-1">
                                <p className="text-white font-medium">{action.content}</p>
                                <p className="text-sm text-white/50">{action.reason}</p>
                            </div>
                            <span className="text-xs text-white/40">{action.timestamp}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Join Moderation Council */}
            <div className="bg-gradient-to-r from-emerald-900/20 to-cyan-900/20 rounded-2xl border border-emerald-500/20 p-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center text-3xl">
                        🛡️
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">Join the Moderation Council</h3>
                        <p className="text-sm text-white/60">
                            Help keep 0G safe and fair. Council members review appeals and shape moderation policies.
                        </p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
                    >
                        Apply Now
                    </motion.button>
                </div>
            </div>
        </div>
    );
}
