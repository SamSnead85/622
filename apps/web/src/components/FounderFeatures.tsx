'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

export type StartupStage = 'idea' | 'mvp' | 'seed' | 'series-a' | 'growth' | 'established';
export type IndustryVertical = 'fintech' | 'healthtech' | 'edtech' | 'ecommerce' | 'saas' | 'media' | 'nonprofit' | 'halal' | 'other';
export type FounderExpertise = 'technical' | 'business' | 'design' | 'marketing' | 'operations' | 'finance' | 'legal';

export interface FounderProfile {
    id: string;
    name: string;
    avatar: string;
    headline: string;
    bio: string;
    expertise: FounderExpertise[];
    location: string;
    linkedIn?: string;
    twitter?: string;
    isVerified: boolean;
    isMentor: boolean;
    mentorCapacity?: number;
    startups: StartupSummary[];
    investments: InvestmentSummary[];
    totalRaised?: number;
    totalInvested?: number;
    connectionStrength?: number;
    lookingFor?: ('cofounder' | 'investor' | 'mentor' | 'talent')[];
}

export interface StartupSummary {
    id: string;
    name: string;
    logo?: string;
    role: string;
    stage: StartupStage;
    status: 'active' | 'exited' | 'closed';
}

export interface InvestmentSummary {
    startupName: string;
    amount?: number;
    year: number;
}

export interface Startup {
    id: string;
    name: string;
    logo?: string;
    tagline: string;
    description: string;
    mission: string;
    website?: string;
    stage: StartupStage;
    industry: IndustryVertical;
    founded: Date;
    location: string;
    team: {
        member: FounderProfile;
        role: string;
    }[];
    metrics: {
        revenue?: number;
        mrr?: number;
        users?: number;
        growth?: number;
    };
    funding: {
        raised: number;
        seeking?: number;
        lastRound?: {
            type: string;
            amount: number;
            date: Date;
        };
    };
    communityImpact: string[];
    tags: string[];
    isHiring: boolean;
    openRoles?: string[];
}

export interface CoFounderMatch {
    founder: FounderProfile;
    matchScore: number;
    matchReasons: string[];
    complementarySkills: FounderExpertise[];
}

// ============================================================================
// CONFIG
// ============================================================================

const stageConfig: Record<StartupStage, { label: string; color: string }> = {
    idea: { label: 'Idea Stage', color: 'bg-gray-500/20 text-gray-400' },
    mvp: { label: 'MVP', color: 'bg-blue-500/20 text-blue-400' },
    seed: { label: 'Seed', color: 'bg-emerald-500/20 text-emerald-400' },
    'series-a': { label: 'Series A', color: 'bg-violet-500/20 text-violet-400' },
    growth: { label: 'Growth', color: 'bg-amber-500/20 text-amber-400' },
    established: { label: 'Established', color: 'bg-cyan-500/20 text-cyan-400' },
};

const industryConfig: Record<IndustryVertical, { label: string; icon: string }> = {
    fintech: { label: 'FinTech', icon: '💰' },
    healthtech: { label: 'HealthTech', icon: '🏥' },
    edtech: { label: 'EdTech', icon: '📚' },
    ecommerce: { label: 'E-Commerce', icon: '🛒' },
    saas: { label: 'SaaS', icon: '☁️' },
    media: { label: 'Media', icon: '📱' },
    nonprofit: { label: 'Nonprofit', icon: '💜' },
    halal: { label: 'Halal Economy', icon: '☪️' },
    other: { label: 'Other', icon: '🚀' },
};

const expertiseConfig: Record<FounderExpertise, { label: string; icon: string; color: string }> = {
    technical: { label: 'Technical', icon: '💻', color: 'bg-cyan-500/20 text-cyan-400' },
    business: { label: 'Business', icon: '📊', color: 'bg-violet-500/20 text-violet-400' },
    design: { label: 'Design', icon: '🎨', color: 'bg-fuchsia-500/20 text-fuchsia-400' },
    marketing: { label: 'Marketing', icon: '📢', color: 'bg-orange-500/20 text-orange-400' },
    operations: { label: 'Operations', icon: '⚙️', color: 'bg-emerald-500/20 text-emerald-400' },
    finance: { label: 'Finance', icon: '💵', color: 'bg-amber-500/20 text-amber-400' },
    legal: { label: 'Legal', icon: '⚖️', color: 'bg-gray-500/20 text-gray-400' },
};

// ============================================================================
// FOUNDER PROFILE CARD
// ============================================================================

interface FounderProfileCardProps {
    founder: FounderProfile;
    onClick?: () => void;
    showMatchScore?: number;
}

export function FounderProfileCard({ founder, onClick, showMatchScore }: FounderProfileCardProps) {
    return (
        <motion.div
            whileHover={{ y: -4 }}
            onClick={onClick}
            className="bg-white/5 rounded-2xl p-6 border border-white/10 cursor-pointer hover:border-violet-500/30 transition-colors"
        >
            {/* Match Score Badge */}
            {showMatchScore !== undefined && (
                <div className="flex justify-end mb-2">
                    <span className="px-3 py-1 rounded-full bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-400 text-sm font-bold">
                        {showMatchScore}% Match
                    </span>
                </div>
            )}

            <div className="flex items-start gap-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-2xl">
                        {founder.avatar}
                    </div>
                    {founder.isVerified && (
                        <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs">
                            ✓
                        </span>
                    )}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{founder.name}</h3>
                        {founder.isMentor && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">🎓 Mentor</span>
                        )}
                    </div>
                    <p className="text-sm text-white/60">{founder.headline}</p>
                    <p className="text-xs text-white/40 mt-1">📍 {founder.location}</p>
                </div>
            </div>

            {/* Expertise Tags */}
            <div className="flex flex-wrap gap-2 mt-4">
                {founder.expertise.map((exp) => (
                    <span key={exp} className={`px-2 py-1 rounded-lg text-xs font-medium ${expertiseConfig[exp].color}`}>
                        {expertiseConfig[exp].icon} {expertiseConfig[exp].label}
                    </span>
                ))}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                <div className="text-center flex-1">
                    <p className="text-lg font-bold text-white">{founder.startups.length}</p>
                    <p className="text-xs text-white/40">Startups</p>
                </div>
                {founder.totalRaised && (
                    <div className="text-center flex-1">
                        <p className="text-lg font-bold text-emerald-400">${(founder.totalRaised / 1000000).toFixed(1)}M</p>
                        <p className="text-xs text-white/40">Raised</p>
                    </div>
                )}
                {founder.investments.length > 0 && (
                    <div className="text-center flex-1">
                        <p className="text-lg font-bold text-violet-400">{founder.investments.length}</p>
                        <p className="text-xs text-white/40">Investments</p>
                    </div>
                )}
            </div>

            {/* Looking For */}
            {founder.lookingFor && founder.lookingFor.length > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20">
                    <span className="text-xs text-white/50">Looking for: </span>
                    <span className="text-sm text-violet-400">
                        {founder.lookingFor.map((l) => l.charAt(0).toUpperCase() + l.slice(1)).join(', ')}
                    </span>
                </div>
            )}
        </motion.div>
    );
}

// ============================================================================
// STARTUP CARD
// ============================================================================

interface StartupCardProps {
    startup: Startup;
    onClick?: () => void;
}

export function StartupCard({ startup, onClick }: StartupCardProps) {
    const industry = industryConfig[startup.industry];
    const stage = stageConfig[startup.stage];

    return (
        <motion.div
            whileHover={{ y: -4 }}
            onClick={onClick}
            className="bg-white/5 rounded-2xl overflow-hidden border border-white/10 cursor-pointer hover:border-violet-500/30 transition-colors"
        >
            {/* Header */}
            <div className="p-6">
                <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-2xl border border-white/10">
                        {industry.icon}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white">{startup.name}</h3>
                            {startup.isHiring && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">🔥 Hiring</span>
                            )}
                        </div>
                        <p className="text-sm text-white/60">{startup.tagline}</p>
                    </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${stage.color}`}>
                        {stage.label}
                    </span>
                    <span className="px-2 py-1 rounded-lg text-xs font-medium bg-white/10 text-white/60">
                        {industry.icon} {industry.label}
                    </span>
                </div>

                {/* Mission */}
                <p className="text-sm text-white/50 mt-3 line-clamp-2">{startup.mission}</p>

                {/* Metrics */}
                {(startup.metrics.users || startup.metrics.revenue) && (
                    <div className="flex gap-4 mt-4 pt-4 border-t border-white/10">
                        {startup.metrics.users && (
                            <div>
                                <p className="text-lg font-bold text-white">{startup.metrics.users.toLocaleString()}</p>
                                <p className="text-xs text-white/40">Users</p>
                            </div>
                        )}
                        {startup.metrics.mrr && (
                            <div>
                                <p className="text-lg font-bold text-emerald-400">${startup.metrics.mrr.toLocaleString()}</p>
                                <p className="text-xs text-white/40">MRR</p>
                            </div>
                        )}
                        {startup.metrics.growth && (
                            <div>
                                <p className="text-lg font-bold text-violet-400">+{startup.metrics.growth}%</p>
                                <p className="text-xs text-white/40">Growth</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Team Preview */}
                <div className="flex items-center gap-2 mt-4">
                    <div className="flex -space-x-2">
                        {startup.team.slice(0, 4).map((t, idx) => (
                            <div
                                key={t.member.id}
                                className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 border-2 border-gray-900 flex items-center justify-center text-sm"
                                style={{ zIndex: 10 - idx }}
                            >
                                {t.member.avatar}
                            </div>
                        ))}
                    </div>
                    <span className="text-xs text-white/40">{startup.team.length} team members</span>
                </div>
            </div>

            {/* Footer */}
            {startup.funding.seeking && (
                <div className="px-6 py-4 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border-t border-violet-500/20">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-white/60">Seeking Investment</span>
                        <span className="text-lg font-bold text-violet-400">
                            ${(startup.funding.seeking / 1000000).toFixed(1)}M
                        </span>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

// ============================================================================
// CO-FOUNDER MATCH CARD
// ============================================================================

interface CoFounderMatchCardProps {
    match: CoFounderMatch;
    onConnect?: () => void;
    onViewProfile?: () => void;
}

export function CoFounderMatchCard({ match, onConnect, onViewProfile }: CoFounderMatchCardProps) {
    return (
        <motion.div
            whileHover={{ scale: 1.01 }}
            className="bg-white/5 rounded-2xl p-6 border border-white/10"
        >
            {/* Match Score Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xl">
                            {match.founder.avatar}
                        </div>
                        {match.founder.isVerified && (
                            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-[10px]">
                                ✓
                            </span>
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">{match.founder.name}</h3>
                        <p className="text-sm text-white/50">{match.founder.headline}</p>
                    </div>
                </div>
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                        <span className="text-2xl font-bold text-violet-400">{match.matchScore}%</span>
                    </div>
                    <span className="text-xs text-white/40">Match</span>
                </div>
            </div>

            {/* Match Reasons */}
            <div className="mb-4">
                <h4 className="text-xs text-white/50 mb-2">Why you match:</h4>
                <ul className="space-y-1">
                    {match.matchReasons.map((reason, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-white/70">
                            <span className="text-emerald-400">✓</span>
                            {reason}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Complementary Skills */}
            <div className="mb-4">
                <h4 className="text-xs text-white/50 mb-2">Complementary skills:</h4>
                <div className="flex flex-wrap gap-2">
                    {match.complementarySkills.map((skill) => (
                        <span key={skill} className={`px-2 py-1 rounded-lg text-xs font-medium ${expertiseConfig[skill].color}`}>
                            {expertiseConfig[skill].icon} {expertiseConfig[skill].label}
                        </span>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onViewProfile}
                    className="flex-1 py-2 rounded-xl bg-white/5 text-white/60 font-medium hover:bg-white/10"
                >
                    View Profile
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onConnect}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium"
                >
                    Connect
                </motion.button>
            </div>
        </motion.div >
    );
}

// ============================================================================
// STARTUP SHOWCASE
// ============================================================================

interface StartupShowcaseProps {
    startups: Startup[];
    onStartupClick?: (startupId: string) => void;
}

export function StartupShowcase({ startups, onStartupClick }: StartupShowcaseProps) {
    const [filter, setFilter] = useState<IndustryVertical | 'all'>('all');
    const [stageFilter, setStageFilter] = useState<StartupStage | 'all'>('all');

    const filteredStartups = startups.filter((s) => {
        if (filter !== 'all' && s.industry !== filter) return false;
        if (stageFilter !== 'all' && s.stage !== stageFilter) return false;
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-4">
                <div>
                    <label className="text-sm text-white/50 block mb-2">Industry</label>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as IndustryVertical | 'all')}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500/50"
                    >
                        <option value="all">All Industries</option>
                        {Object.entries(industryConfig).map(([key, config]) => (
                            <option key={key} value={key}>
                                {config.icon} {config.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-sm text-white/50 block mb-2">Stage</label>
                    <select
                        value={stageFilter}
                        onChange={(e) => setStageFilter(e.target.value as StartupStage | 'all')}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500/50"
                    >
                        <option value="all">All Stages</option>
                        {Object.entries(stageConfig).map(([key, config]) => (
                            <option key={key} value={key}>
                                {config.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStartups.map((startup) => (
                    <StartupCard
                        key={startup.id}
                        startup={startup}
                        onClick={() => onStartupClick?.(startup.id)}
                    />
                ))}
            </div>

            {filteredStartups.length === 0 && (
                <div className="text-center py-12 text-white/40">
                    No startups match your filters
                </div>
            )}
        </div>
    );
}

// ============================================================================
// CO-FOUNDER MATCHING HUB
// ============================================================================

interface CoFounderMatchingProps {
    matches: CoFounderMatch[];
    onConnect?: (founderId: string) => void;
    onViewProfile?: (founderId: string) => void;
}

export function CoFounderMatching({ matches, onConnect, onViewProfile }: CoFounderMatchingProps) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Find Your Co-Founder</h2>
                <p className="text-white/50">AI-powered matching based on skills, values, and goals</p>
            </div>

            {/* Quote */}
            <div className="p-6 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 text-center">
                <p className="text-white/80 italic">
                    &ldquo;The believers are like a structure, each part strengthening the other&rdquo; — Hadith
                </p>
            </div>

            {/* Matches */}
            <div className="grid md:grid-cols-2 gap-6">
                {matches.map((match) => (
                    <CoFounderMatchCard
                        key={match.founder.id}
                        match={match}
                        onConnect={() => onConnect?.(match.founder.id)}
                        onViewProfile={() => onViewProfile?.(match.founder.id)}
                    />
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    FounderProfileCard,
    StartupCard,
    CoFounderMatchCard,
    StartupShowcase,
    CoFounderMatching,
};
