'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// THE CARAVAN - ELITE SECTION
// Phases 751-1000: Elite founder network with exclusive features
// "No more minimum viable Muslims. We're the elite who carry the heavy load."
// ============================================================================

export type CaravanTier = 'navigator' | 'trailblazer' | 'pioneer' | 'architect';
export type MeetingType = 'mastermind' | 'deal-flow' | 'strategy' | 'workshop' | 'social';

export interface CaravanMember {
    id: string;
    name: string;
    avatar: string;
    title: string;
    company?: string;
    tier: CaravanTier;
    bio: string;
    achievements: string[];
    portfolio: {
        totalRaised?: number;
        totalRevenue?: number;
        exitValue?: number;
        employeesHired?: number;
        communitiesImpacted?: number;
    };
    expertise: string[];
    location: string;
    joinedAt: Date;
    introductions: number;
    dealsSourced: number;
    mentorshipHours: number;
    contributionScore: number;
    isFoundingMember: boolean;
}

export interface CaravanMeeting {
    id: string;
    title: string;
    type: MeetingType;
    description: string;
    host: CaravanMember;
    attendees: CaravanMember[];
    maxAttendees: number;
    date: Date;
    duration: number;
    isVirtual: boolean;
    location?: string;
    agenda: string[];
    requiredTier?: CaravanTier;
}

export interface CaravanDeal {
    id: string;
    title: string;
    company: string;
    stage: string;
    seeking: number;
    valuation?: number;
    description: string;
    founder: CaravanMember;
    backers: CaravanMember[];
    minimumCheck: number;
    deadline?: Date;
    documents: string[];
    isExclusive: boolean;
}

export interface CaravanResource {
    id: string;
    title: string;
    type: 'playbook' | 'template' | 'recording' | 'network' | 'tool';
    description: string;
    author: CaravanMember;
    accessTier: CaravanTier;
    downloads: number;
    rating: number;
}

// ============================================================================
// CONFIG
// ============================================================================

const tierConfig: Record<CaravanTier, {
    label: string;
    icon: string;
    color: string;
    bgColor: string;
    requirements: string;
}> = {
    navigator: {
        label: 'Navigator',
        icon: '🧭',
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/20',
        requirements: 'Active contribution to the community'
    },
    trailblazer: {
        label: 'Trailblazer',
        icon: '🔥',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20',
        requirements: '$500K+ raised or revenue'
    },
    pioneer: {
        label: 'Pioneer',
        icon: '⚡',
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/20',
        requirements: '$5M+ raised or revenue'
    },
    architect: {
        label: 'Architect',
        icon: '👑',
        color: 'text-amber-400',
        bgColor: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20',
        requirements: '$50M+ value created or major exit'
    },
};

const meetingTypeConfig: Record<MeetingType, { label: string; icon: string; color: string }> = {
    mastermind: { label: 'Mastermind', icon: '🧠', color: 'bg-violet-500/20 text-violet-400' },
    'deal-flow': { label: 'Deal Flow', icon: '💰', color: 'bg-emerald-500/20 text-emerald-400' },
    strategy: { label: 'Strategy', icon: '♟️', color: 'bg-cyan-500/20 text-cyan-400' },
    workshop: { label: 'Workshop', icon: '🛠️', color: 'bg-amber-500/20 text-amber-400' },
    social: { label: 'Social', icon: '🤝', color: 'bg-fuchsia-500/20 text-fuchsia-400' },
};

// ============================================================================
// CARAVAN MEMBER CARD
// ============================================================================

interface CaravanMemberCardProps {
    member: CaravanMember;
    onClick?: () => void;
    showStats?: boolean;
}

export function CaravanMemberCard({ member, onClick, showStats = true }: CaravanMemberCardProps) {
    const tier = tierConfig[member.tier];

    return (
        <motion.div
            whileHover={{ y: -4 }}
            onClick={onClick}
            className="bg-white/5 rounded-2xl p-6 border border-white/10 cursor-pointer hover:border-amber-500/30 transition-colors relative overflow-hidden"
        >
            {/* Founding Member Badge */}
            {member.isFoundingMember && (
                <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 rounded-full bg-gradient-to-r from-amber-500/30 to-yellow-500/30 text-amber-400 text-xs font-bold border border-amber-500/30">
                        👑 Founding Member
                    </span>
                </div>
            )}

            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-2xl">
                        {member.avatar}
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full ${tier.bgColor} flex items-center justify-center text-sm border-2 border-gray-900`}>
                        {tier.icon}
                    </span>
                </div>
                <div>
                    <h3 className="font-bold text-white text-lg">{member.name}</h3>
                    <p className="text-sm text-white/60">{member.title}</p>
                    {member.company && <p className="text-sm text-amber-400">{member.company}</p>}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${tier.bgColor} ${tier.color} mt-1`}>
                        {tier.icon} {tier.label}
                    </span>
                </div>
            </div>

            {/* Expertise */}
            <div className="flex flex-wrap gap-1 mb-4">
                {member.expertise.slice(0, 3).map((skill) => (
                    <span key={skill} className="px-2 py-0.5 rounded-lg bg-white/5 text-white/50 text-xs">
                        {skill}
                    </span>
                ))}
            </div>

            {/* Stats */}
            {showStats && (
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="text-center">
                        <p className="text-lg font-bold text-white">{member.introductions}</p>
                        <p className="text-[10px] text-white/40">Intros</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-bold text-emerald-400">{member.dealsSourced}</p>
                        <p className="text-[10px] text-white/40">Deals</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-bold text-violet-400">{member.mentorshipHours}h</p>
                        <p className="text-[10px] text-white/40">Mentoring</p>
                    </div>
                </div>
            )}

            {/* Achievements */}
            {member.achievements.length > 0 && (
                <div className="mt-4">
                    <div className="flex gap-1">
                        {member.achievements.slice(0, 3).map((achievement, idx) => (
                            <span key={idx} className="text-lg" title={achievement}>
                                🏆
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
}

// ============================================================================
// EXCLUSIVE MEETING CARD
// ============================================================================

interface ExclusiveMeetingCardProps {
    meeting: CaravanMeeting;
    currentMemberTier: CaravanTier;
    onRSVP?: () => void;
}

export function ExclusiveMeetingCard({ meeting, currentMemberTier, onRSVP }: ExclusiveMeetingCardProps) {
    const typeConfig = meetingTypeConfig[meeting.type];
    const tierOrder: CaravanTier[] = ['navigator', 'trailblazer', 'pioneer', 'architect'];
    const hasAccess = !meeting.requiredTier ||
        tierOrder.indexOf(currentMemberTier) >= tierOrder.indexOf(meeting.requiredTier);

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }).format(new Date(date));
    };

    return (
        <motion.div
            whileHover={{ y: -2 }}
            className={`bg-white/5 rounded-xl p-5 border ${hasAccess ? 'border-white/10' : 'border-white/5 opacity-60'}`}
        >
            <div className="flex items-start justify-between mb-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeConfig.color}`}>
                    {typeConfig.icon} {typeConfig.label}
                </span>
                {meeting.requiredTier && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${tierConfig[meeting.requiredTier].bgColor} ${tierConfig[meeting.requiredTier].color}`}>
                        {tierConfig[meeting.requiredTier].icon} {tierConfig[meeting.requiredTier].label}+ Only
                    </span>
                )}
            </div>

            <h3 className="font-bold text-white text-lg mb-1">{meeting.title}</h3>
            <p className="text-sm text-white/50 mb-3">{meeting.description}</p>

            {/* Host */}
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-sm">
                    {meeting.host.avatar}
                </div>
                <div>
                    <p className="text-sm text-white/80">Hosted by <span className="text-amber-400">{meeting.host.name}</span></p>
                </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="flex items-center gap-2 text-white/60">
                    <span>📅</span> {formatDate(meeting.date)}
                </div>
                <div className="flex items-center gap-2 text-white/60">
                    <span>⏱️</span> {meeting.duration} min
                </div>
                <div className="flex items-center gap-2 text-white/60">
                    <span>{meeting.isVirtual ? '💻' : '📍'}</span>
                    {meeting.isVirtual ? 'Virtual' : meeting.location}
                </div>
                <div className="flex items-center gap-2 text-white/60">
                    <span>👥</span> {meeting.attendees.length}/{meeting.maxAttendees}
                </div>
            </div>

            {/* Attendees */}
            <div className="flex items-center gap-2 mb-4">
                <div className="flex -space-x-2">
                    {meeting.attendees.slice(0, 5).map((attendee, idx) => (
                        <div
                            key={attendee.id}
                            className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 border-2 border-gray-900 flex items-center justify-center text-xs"
                            style={{ zIndex: 10 - idx }}
                        >
                            {attendee.avatar}
                        </div>
                    ))}
                </div>
                {meeting.attendees.length > 5 && (
                    <span className="text-xs text-white/40">+{meeting.attendees.length - 5} more</span>
                )}
            </div>

            {/* RSVP Button */}
            {hasAccess ? (
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onRSVP}
                    disabled={meeting.attendees.length >= meeting.maxAttendees}
                    className={`w-full py-2.5 rounded-xl font-medium ${meeting.attendees.length >= meeting.maxAttendees
                        ? 'bg-white/10 text-white/40 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900'
                        }`}
                >
                    {meeting.attendees.length >= meeting.maxAttendees ? 'Full' : 'RSVP'}
                </motion.button>
            ) : (
                <div className="text-center py-2 text-white/40 text-sm">
                    🔒 Upgrade to {tierConfig[meeting.requiredTier!].label} to join
                </div>
            )}
        </motion.div>
    );
}

// ============================================================================
// EXCLUSIVE DEAL CARD
// ============================================================================

interface ExclusiveDealCardProps {
    deal: CaravanDeal;
    onViewDeal?: () => void;
}

export function ExclusiveDealCard({ deal, onViewDeal }: ExclusiveDealCardProps) {
    const formatCurrency = (n: number) => {
        if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
        return `$${(n / 1000).toFixed(0)}K`;
    };

    return (
        <motion.div
            whileHover={{ y: -4 }}
            className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 rounded-2xl p-6 border border-amber-500/20"
        >
            {deal.isExclusive && (
                <div className="flex justify-end mb-2">
                    <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">
                        ⭐ Exclusive
                    </span>
                </div>
            )}

            <h3 className="font-bold text-white text-xl mb-1">{deal.title}</h3>
            <p className="text-amber-400 font-medium mb-2">{deal.company}</p>
            <p className="text-sm text-white/60 mb-4">{deal.description}</p>

            {/* Deal Terms */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-white/5 mb-4">
                <div>
                    <p className="text-xs text-white/50">Seeking</p>
                    <p className="text-xl font-bold text-emerald-400">{formatCurrency(deal.seeking)}</p>
                </div>
                {deal.valuation && (
                    <div>
                        <p className="text-xs text-white/50">Valuation</p>
                        <p className="text-xl font-bold text-white">{formatCurrency(deal.valuation)}</p>
                    </div>
                )}
                <div>
                    <p className="text-xs text-white/50">Min Check</p>
                    <p className="text-lg font-bold text-white">{formatCurrency(deal.minimumCheck)}</p>
                </div>
                <div>
                    <p className="text-xs text-white/50">Stage</p>
                    <p className="text-lg font-bold text-violet-400">{deal.stage}</p>
                </div>
            </div>

            {/* Founder */}
            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
                    {deal.founder.avatar}
                </div>
                <div>
                    <p className="text-sm text-white font-medium">{deal.founder.name}</p>
                    <p className="text-xs text-white/50">{deal.founder.title}</p>
                </div>
                <span className={`ml-auto ${tierConfig[deal.founder.tier].bgColor} ${tierConfig[deal.founder.tier].color} px-2 py-0.5 rounded-full text-xs`}>
                    {tierConfig[deal.founder.tier].icon}
                </span>
            </div>

            {/* Backers */}
            {deal.backers.length > 0 && (
                <div className="mb-4">
                    <p className="text-xs text-white/50 mb-2">Already committed:</p>
                    <div className="flex -space-x-2">
                        {deal.backers.map((backer, idx) => (
                            <div
                                key={backer.id}
                                className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 border-2 border-gray-900 flex items-center justify-center text-sm"
                                style={{ zIndex: 10 - idx }}
                                title={backer.name}
                            >
                                {backer.avatar}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* View Deal */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onViewDeal}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 font-bold"
            >
                View Deal Details
            </motion.button>
        </motion.div>
    );
}

// ============================================================================
// CARAVAN DASHBOARD
// ============================================================================

type CaravanTab = 'members' | 'meetings' | 'deals' | 'resources';

interface CaravanDashboardProps {
    currentMember: CaravanMember;
    members: CaravanMember[];
    meetings: CaravanMeeting[];
    deals: CaravanDeal[];
    resources: CaravanResource[];
}

export function CaravanDashboard({ currentMember, members, meetings, deals }: CaravanDashboardProps) {
    const [activeTab, setActiveTab] = useState<CaravanTab>('members');
    const tier = tierConfig[currentMember.tier];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 mb-4"
                >
                    <span className="text-2xl">🐪</span>
                    <span className="text-amber-400 font-bold">THE CARAVAN</span>
                </motion.div>
                <h1 className="text-4xl font-bold text-white mb-2">
                    Elite Founder Network
                </h1>
                <p className="text-white/60 text-lg">
                    No more minimum viable Muslims. We're the elite who carry the heavy load.
                </p>
            </div>

            {/* Member Status */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-2xl">
                            {currentMember.avatar}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">{currentMember.name}</h3>
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${tier.bgColor} ${tier.color} font-medium`}>
                                {tier.icon} {tier.label}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-bold text-amber-400">{currentMember.contributionScore}</p>
                        <p className="text-sm text-white/50">Contribution Score</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-4">
                {[
                    { id: 'members' as const, label: 'Members', icon: '👥', count: members.length },
                    { id: 'meetings' as const, label: 'Meetings', icon: '📅', count: meetings.length },
                    { id: 'deals' as const, label: 'Deal Flow', icon: '💰', count: deals.length },
                    { id: 'resources' as const, label: 'Resources', icon: '📚' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${activeTab === tab.id
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                    >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                        {tab.count !== undefined && (
                            <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-gray-900/20 text-gray-900' : 'bg-white/10'
                                }`}>
                                {tab.count}
                            </span>
                        )}
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
                    {activeTab === 'members' && (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {members.map((member) => (
                                <CaravanMemberCard key={member.id} member={member} />
                            ))}
                        </div>
                    )}

                    {activeTab === 'meetings' && (
                        <div className="grid md:grid-cols-2 gap-6">
                            {meetings.map((meeting) => (
                                <ExclusiveMeetingCard
                                    key={meeting.id}
                                    meeting={meeting}
                                    currentMemberTier={currentMember.tier}
                                />
                            ))}
                        </div>
                    )}

                    {activeTab === 'deals' && (
                        <div className="grid md:grid-cols-2 gap-6">
                            {deals.map((deal) => (
                                <ExclusiveDealCard key={deal.id} deal={deal} />
                            ))}
                        </div>
                    )}

                    {activeTab === 'resources' && (
                        <div className="text-center py-12 text-white/40">
                            <p className="text-5xl mb-4">📚</p>
                            <p>Coming soon: Exclusive playbooks, templates, and recordings</p>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Quranic Foundation */}
            <div className="mt-12 p-8 rounded-2xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 text-center">
                <p className="text-white/50 text-sm mb-2">Our Foundation</p>
                <p className="text-xl text-white italic">
                    "You are the best nation ever raised up for humanity—you enjoin what is right,
                    forbid what is wrong, and believe in Allah."
                </p>
                <p className="text-amber-400 mt-2">— Quran 3:110</p>
            </div>
        </div>
    );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default CaravanDashboard;
