'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

interface QAQuestion {
    id: string;
    text: string;
    author: {
        name: string;
        avatar: string;
        verified: boolean;
    };
    upvotes: number;
    timestamp: Date;
    isAnswered: boolean;
    isPinned: boolean;
}

interface Donation {
    id: string;
    amount: number;
    donor: {
        name: string;
        avatar: string;
    };
    message?: string;
    timestamp: Date;
}

interface StreamMetrics {
    viewers: number;
    peakViewers: number;
    duration: number;
    donations: number;
    questionsAnswered: number;
    engagement: number;
}

// ============================================================================
// Q&A OVERLAY COMPONENT
// ============================================================================

interface QAOverlayProps {
    questions: QAQuestion[];
    onPinQuestion?: (id: string) => void;
    onMarkAnswered?: (id: string) => void;
    isHost?: boolean;
}

export function QAOverlay({ questions, onPinQuestion, onMarkAnswered, isHost = false }: QAOverlayProps) {
    const [filter, setFilter] = useState<'all' | 'unanswered' | 'pinned'>('unanswered');
    const [newQuestion, setNewQuestion] = useState('');

    const filteredQuestions = questions.filter(q => {
        if (filter === 'unanswered') return !q.isAnswered;
        if (filter === 'pinned') return q.isPinned;
        return true;
    });

    const pinnedQuestion = questions.find(q => q.isPinned);

    return (
        <div className="bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/5">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <span>❓</span> Q&A
                    </h3>
                    <span className="text-xs text-white/50">{questions.filter(q => !q.isAnswered).length} pending</span>
                </div>

                {/* Filters */}
                <div className="flex gap-1">
                    {(['all', 'unanswered', 'pinned'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filter === f
                                    ? 'bg-white text-gray-900'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Pinned Question */}
            {pinnedQuestion && (
                <div className="p-4 bg-amber-500/10 border-b border-amber-500/20">
                    <div className="flex items-start gap-3">
                        <span className="text-amber-400">📌</span>
                        <div className="flex-1">
                            <p className="text-white font-medium">{pinnedQuestion.text}</p>
                            <p className="text-xs text-white/50 mt-1">from {pinnedQuestion.author.name}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Questions List */}
            <div className="max-h-80 overflow-y-auto p-4 space-y-3">
                {filteredQuestions.map((question) => (
                    <motion.div
                        key={question.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-3 rounded-xl ${question.isAnswered ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5'
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-sm">
                                {question.author.avatar}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-white">{question.author.name}</span>
                                    {question.author.verified && <span className="text-blue-400 text-xs">✓</span>}
                                </div>
                                <p className="text-sm text-white/80">{question.text}</p>

                                {isHost && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <button
                                            onClick={() => onPinQuestion?.(question.id)}
                                            className="px-2 py-1 rounded text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                                        >
                                            {question.isPinned ? 'Unpin' : 'Pin'}
                                        </button>
                                        {!question.isAnswered && (
                                            <button
                                                onClick={() => onMarkAnswered?.(question.id)}
                                                className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                            >
                                                Mark Answered
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="text-center">
                                <button className="text-white/40 hover:text-violet-400 transition-colors">
                                    ▲
                                </button>
                                <span className="block text-xs text-white/60">{question.upvotes}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Ask Question */}
            {!isHost && (
                <div className="p-4 border-t border-white/5">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            placeholder="Ask a question..."
                            className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-violet-500/50"
                        />
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-4 py-2 rounded-xl bg-violet-500 text-white font-medium hover:bg-violet-600"
                        >
                            Ask
                        </motion.button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// DONATION TICKER
// ============================================================================

interface DonationTickerProps {
    donations: Donation[];
    totalRaised: number;
    goal?: number;
}

export function DonationTicker({ donations, totalRaised, goal }: DonationTickerProps) {
    const recentDonations = donations.slice(0, 5);
    const progressPercent = goal ? (totalRaised / goal) * 100 : 0;

    return (
        <div className="bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
            {/* Header with Total */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <span>💜</span> Support
                </h3>
                <div className="text-right">
                    <span className="text-2xl font-bold text-white">${totalRaised.toLocaleString()}</span>
                    {goal && <span className="text-sm text-white/50 ml-1">/ ${goal.toLocaleString()}</span>}
                </div>
            </div>

            {/* Progress Bar */}
            {goal && (
                <div className="mb-4">
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(progressPercent, 100)}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                        />
                    </div>
                </div>
            )}

            {/* Recent Donations */}
            <div className="space-y-2">
                <AnimatePresence>
                    {recentDonations.map((donation) => (
                        <motion.div
                            key={donation.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex items-center gap-3 p-2 rounded-lg bg-white/5"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm">
                                {donation.donor.avatar}
                            </div>
                            <div className="flex-1">
                                <span className="text-sm text-white font-medium">{donation.donor.name}</span>
                                {donation.message && (
                                    <p className="text-xs text-white/50 truncate">{donation.message}</p>
                                )}
                            </div>
                            <span className="text-emerald-400 font-bold">${donation.amount}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Donate Button */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium"
            >
                Support This Stream
            </motion.button>
        </div>
    );
}

// ============================================================================
// STREAM METRICS DASHBOARD
// ============================================================================

interface StreamMetricsDashboardProps {
    metrics: StreamMetrics;
}

export function StreamMetricsDashboard({ metrics }: StreamMetricsDashboardProps) {
    const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const stats = [
        { label: 'Viewers', value: metrics.viewers.toLocaleString(), icon: '👁️', color: 'text-cyan-400' },
        { label: 'Peak', value: metrics.peakViewers.toLocaleString(), icon: '📈', color: 'text-emerald-400' },
        { label: 'Duration', value: formatDuration(metrics.duration), icon: '⏱️', color: 'text-amber-400' },
        { label: 'Raised', value: `$${metrics.donations.toLocaleString()}`, icon: '💜', color: 'text-violet-400' },
    ];

    return (
        <div className="bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <span>📊</span> Live Metrics
                </h3>
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    LIVE
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {stats.map((stat) => (
                    <div key={stat.label} className="p-3 rounded-xl bg-white/5">
                        <div className="flex items-center gap-2 mb-1">
                            <span>{stat.icon}</span>
                            <span className="text-xs text-white/50">{stat.label}</span>
                        </div>
                        <span className={`text-xl font-bold ${stat.color}`}>{stat.value}</span>
                    </div>
                ))}
            </div>

            {/* Engagement Score */}
            <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Engagement Score</span>
                    <span className="text-2xl font-bold text-white">{metrics.engagement}%</span>
                </div>
                <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${metrics.engagement}%` }}
                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                    />
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// MULTI-STREAM LAYOUT
// ============================================================================

interface StreamSource {
    id: string;
    name: string;
    type: 'primary' | 'guest' | 'screen' | 'camera';
    isActive: boolean;
}

interface MultiStreamLayoutProps {
    sources: StreamSource[];
    layout: 'single' | 'pip' | 'split' | 'grid';
    onLayoutChange?: (layout: 'single' | 'pip' | 'split' | 'grid') => void;
    onSourceToggle?: (sourceId: string) => void;
}

export function MultiStreamLayout({ sources, layout, onLayoutChange, onSourceToggle }: MultiStreamLayoutProps) {
    const layouts = [
        { id: 'single' as const, label: 'Single', icon: '⬜' },
        { id: 'pip' as const, label: 'PiP', icon: '🖼️' },
        { id: 'split' as const, label: 'Split', icon: '⬛⬛' },
        { id: 'grid' as const, label: 'Grid', icon: '🔲' },
    ];

    return (
        <div className="bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <span>🎬</span> Stream Layout
                </h3>
            </div>

            {/* Layout Options */}
            <div className="grid grid-cols-4 gap-2 mb-4">
                {layouts.map((l) => (
                    <motion.button
                        key={l.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onLayoutChange?.(l.id)}
                        className={`p-3 rounded-xl text-center transition-colors ${layout === l.id
                                ? 'bg-violet-500 text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                    >
                        <span className="block text-xl mb-1">{l.icon}</span>
                        <span className="text-xs">{l.label}</span>
                    </motion.button>
                ))}
            </div>

            {/* Sources */}
            <div className="space-y-2">
                <span className="text-xs text-white/50">Sources</span>
                {sources.map((source) => (
                    <div
                        key={source.id}
                        className={`flex items-center justify-between p-3 rounded-xl ${source.isActive ? 'bg-white/10' : 'bg-white/5'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xl">
                                {source.type === 'primary' ? '📹' : source.type === 'guest' ? '👤' : source.type === 'screen' ? '🖥️' : '📷'}
                            </span>
                            <span className="text-white font-medium">{source.name}</span>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onSourceToggle?.(source.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium ${source.isActive
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-white/5 text-white/40'
                                }`}
                        >
                            {source.isActive ? 'Active' : 'Off'}
                        </motion.button>
                    </div>
                ))}
            </div>

            {/* Add Source */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-4 py-2 rounded-xl bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors"
            >
                + Add Source
            </motion.button>
        </div>
    );
}

// ============================================================================
// STREAM CHAT OVERLAY
// ============================================================================

interface ChatMessage {
    id: string;
    text: string;
    author: {
        name: string;
        avatar: string;
        isMod: boolean;
        isVIP: boolean;
    };
    timestamp: Date;
}

interface StreamChatOverlayProps {
    messages: ChatMessage[];
    isSlowMode?: boolean;
    slowModeSeconds?: number;
}

export function StreamChatOverlay({ messages, isSlowMode = false, slowModeSeconds = 30 }: StreamChatOverlayProps) {
    const [newMessage, setNewMessage] = useState('');
    const recentMessages = messages.slice(-50);

    return (
        <div className="bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden flex flex-col h-96">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <span>💬</span> Live Chat
                </h3>
                {isSlowMode && (
                    <span className="text-xs text-amber-400 flex items-center gap-1">
                        <span>🐢</span> Slow mode: {slowModeSeconds}s
                    </span>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {recentMessages.map((message) => (
                    <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2"
                    >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs shrink-0">
                            {message.author.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="inline-flex items-center gap-1">
                                <span className={`text-sm font-medium ${message.author.isMod ? 'text-emerald-400' :
                                        message.author.isVIP ? 'text-amber-400' : 'text-white/80'
                                    }`}>
                                    {message.author.name}
                                </span>
                                {message.author.isMod && <span className="text-[10px] px-1 bg-emerald-500/20 text-emerald-400 rounded">MOD</span>}
                                {message.author.isVIP && <span className="text-[10px] px-1 bg-amber-500/20 text-amber-400 rounded">VIP</span>}
                            </span>
                            <p className="text-sm text-white/70 break-words">{message.text}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/5">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Send a message..."
                        className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-violet-500/50"
                    />
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 rounded-xl bg-violet-500 text-white"
                    >
                        Send
                    </motion.button>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// EXPORTS
// ============================================================================

// All components are individually named-exported above.
