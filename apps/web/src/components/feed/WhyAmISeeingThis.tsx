'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RankingFactors {
    engagementScore: number;
    timeDecay: number;
    interestMatch: number;
    authorRelationship: number;
    diversityBoost: number;
    newUserBoost: number;
}

interface WhyAmISeeingThisProps {
    postId: string;
    factors?: RankingFactors;
    onClose: () => void;
}

export function WhyAmISeeingThis({ postId, factors, onClose }: WhyAmISeeingThisProps) {
    const defaultFactors: RankingFactors = {
        engagementScore: 0.7,
        timeDecay: 0.85,
        interestMatch: 0.6,
        authorRelationship: 0.9,
        diversityBoost: 0.3,
        newUserBoost: 0,
    };

    const f = factors || defaultFactors;

    const factorList = [
        { label: 'Author Relationship', value: f.authorRelationship, desc: 'How closely you interact with this creator', color: '#00D4FF' },
        { label: 'Engagement Score', value: f.engagementScore, desc: 'Likes, comments, and shares from the community', color: '#8B5CF6' },
        { label: 'Time Freshness', value: f.timeDecay, desc: 'How recent this content is', color: '#10B981' },
        { label: 'Interest Match', value: f.interestMatch, desc: 'How well this matches topics you engage with', color: '#F59E0B' },
        { label: 'Diversity Boost', value: f.diversityBoost, desc: 'Boosted to show you diverse content', color: '#EC4899' },
        { label: 'New Creator Boost', value: f.newUserBoost, desc: 'Boost for new creators finding their audience', color: '#6366F1' },
    ].filter(item => item.value > 0).sort((a, b) => b.value - a.value);

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="bg-[#12121A] border border-white/10 rounded-2xl p-6 max-w-md w-full"
                initial={{ scale: 0.95, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-white font-semibold text-lg">Why you&apos;re seeing this</h3>
                    <button onClick={onClose} className="text-white/40 hover:text-white" aria-label="Close">
                        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <p className="text-white/50 text-sm mb-5">
                    Our algorithm ranked this post based on these factors. You can adjust your feed preferences to change what you see.
                </p>

                <div className="space-y-4">
                    {factorList.map((factor) => (
                        <div key={factor.label}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-white text-sm font-medium">{factor.label}</span>
                                <span className="text-white/40 text-xs">{Math.round(factor.value * 100)}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: factor.color }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${factor.value * 100}%` }}
                                    transition={{ duration: 0.5, delay: 0.1 }}
                                />
                            </div>
                            <p className="text-white/30 text-xs mt-0.5">{factor.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors"
                    >
                        Got it
                    </button>
                    <button
                        className="flex-1 py-2.5 rounded-xl bg-[#00D4FF]/20 text-[#00D4FF] text-sm font-medium hover:bg-[#00D4FF]/30 transition-colors"
                    >
                        Tune My Feed
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
