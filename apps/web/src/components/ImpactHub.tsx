'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// ============================================
// IMPACT HUB - Verified Causes & Collective Action
// A platform for education, coordination, and participation
// "Returning to our humanity, together"
// ============================================

// ============================================
// VERIFIED ORGANIZATION DATA
// ============================================
export interface VerifiedOrganization {
    id: string;
    name: string;
    shortName: string;
    logo: string;
    description: string;
    mission: string;
    website: string;
    category: 'humanitarian' | 'medical' | 'education' | 'press-freedom' | 'environment';
    region?: string;
    verified: boolean;
    impactStats?: {
        label: string;
        value: string;
    }[];
}

export const VERIFIED_CAUSES: VerifiedOrganization[] = [
    {
        id: 'wck',
        name: 'World Central Kitchen',
        shortName: 'WCK',
        logo: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=200&h=200&fit=crop',
        description: 'Chefs serving meals in response to humanitarian crises around the world.',
        mission: 'Using the power of food to nourish communities and strengthen economies in times of crisis and beyond.',
        website: 'https://wck.org/relief/chefs-for-gaza/',
        category: 'humanitarian',
        region: 'Global',
        verified: true,
        impactStats: [
            { label: 'Meals Served', value: '350M+' },
            { label: 'Countries', value: '30+' },
        ]
    },
    {
        id: 'heal-palestine',
        name: 'HEAL Palestine',
        shortName: 'HEAL',
        logo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200&h=200&fit=crop',
        description: 'Providing essential medical care and healthcare access to Palestinians.',
        mission: 'Healing communities through sustainable healthcare solutions and medical aid.',
        website: 'https://www.healpalestine.org/',
        category: 'medical',
        region: 'Palestine',
        verified: true,
        impactStats: [
            { label: 'Patients Helped', value: '100K+' },
            { label: 'Medical Missions', value: '50+' },
        ]
    },
    {
        id: 'pcrf',
        name: 'Palestine Children\'s Relief Fund',
        shortName: 'PCRF',
        logo: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=200&h=200&fit=crop',
        description: 'Providing free medical care to sick and injured children in the Middle East.',
        mission: 'Healing children. Building futures. Transforming lives.',
        website: 'https://www.pcrf.net/',
        category: 'medical',
        region: 'Middle East',
        verified: true,
        impactStats: [
            { label: 'Children Treated', value: '2M+' },
            { label: 'Surgeries', value: '25K+' },
        ]
    },
    {
        id: 'rsf',
        name: 'Reporters Without Borders',
        shortName: 'RSF',
        logo: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&h=200&fit=crop',
        description: 'Defending press freedom and protecting journalists worldwide.',
        mission: 'Promoting and defending quality journalism around the world.',
        website: 'https://rsf.org/',
        category: 'press-freedom',
        region: 'Global',
        verified: true,
        impactStats: [
            { label: 'Journalists Protected', value: '10K+' },
            { label: 'Countries Active', value: '130+' },
        ]
    },
    {
        id: 'unrwa',
        name: 'UNRWA',
        shortName: 'UNRWA',
        logo: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=200&h=200&fit=crop',
        description: 'Providing assistance and protection to Palestine refugees.',
        mission: 'Human development and humanitarian assistance for Palestine refugees.',
        website: 'https://www.unrwa.org/',
        category: 'humanitarian',
        region: 'Middle East',
        verified: true,
        impactStats: [
            { label: 'Refugees Served', value: '5.9M' },
            { label: 'Schools Run', value: '700+' },
        ]
    },
    {
        id: 'map',
        name: 'Medical Aid for Palestinians',
        shortName: 'MAP',
        logo: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=200&h=200&fit=crop',
        description: 'Delivering health and medical care to those affected by conflict.',
        mission: 'Working for the health and dignity of Palestinians living under occupation.',
        website: 'https://www.map.org.uk/',
        category: 'medical',
        region: 'Palestine',
        verified: true,
        impactStats: [
            { label: 'Medical Projects', value: '100+' },
            { label: 'Healthcare Workers Trained', value: '5K+' },
        ]
    },
];

// ============================================
// VERIFIED BADGE
// ============================================
export function VerifiedBadge({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
    const sizes = {
        sm: 'w-4 h-4 text-[8px]',
        md: 'w-5 h-5 text-[10px]',
        lg: 'w-6 h-6 text-xs',
    };

    return (
        <div className={`${sizes[size]} rounded-full bg-emerald-500 flex items-center justify-center`} title="Verified Organization">
            <span className="text-white font-bold">✓</span>
        </div>
    );
}

// ============================================
// ORGANIZATION CARD
// ============================================
export function OrganizationCard({
    org,
    variant = 'default',
    onLearnMore
}: {
    org: VerifiedOrganization;
    variant?: 'default' | 'compact' | 'featured';
    onLearnMore?: (org: VerifiedOrganization) => void;
}) {
    const categoryColors: Record<string, string> = {
        humanitarian: 'from-amber-400 to-orange-500',
        medical: 'from-rose-400 to-red-500',
        education: 'from-blue-400 to-indigo-500',
        'press-freedom': 'from-violet-400 to-purple-500',
        environment: 'from-emerald-400 to-green-500',
    };

    if (variant === 'compact') {
        return (
            <motion.a
                href={org.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group"
                whileHover={{ scale: 1.02 }}
            >
                <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                    <Image src={org.logo} alt={org.name} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-white text-sm truncate">{org.shortName}</span>
                        {org.verified && <VerifiedBadge size="sm" />}
                    </div>
                    <p className="text-xs text-white/40 truncate">{org.region}</p>
                </div>
                <span className="text-white/30 group-hover:text-white/60 transition-colors">→</span>
            </motion.a>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.02] rounded-3xl border border-white/5 overflow-hidden hover:border-white/10 transition-all group"
        >
            {/* Header with gradient */}
            <div className={`h-2 bg-gradient-to-r ${categoryColors[org.category]}`} />

            <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
                        <Image src={org.logo} alt={org.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white">{org.name}</h3>
                            {org.verified && <VerifiedBadge size="md" />}
                        </div>
                        <p className="text-sm text-white/50">{org.region}</p>
                    </div>
                </div>

                <p className="text-sm text-white/60 mb-4 line-clamp-2">{org.description}</p>

                {/* Impact stats */}
                {org.impactStats && (
                    <div className="flex gap-4 mb-4">
                        {org.impactStats.map((stat, i) => (
                            <div key={i} className="text-center">
                                <p className="text-lg font-bold text-white">{stat.value}</p>
                                <p className="text-xs text-white/40">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex gap-2">
                    <a
                        href={org.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-sm font-medium text-center hover:opacity-90 transition-opacity"
                    >
                        Support Directly
                    </a>
                    <button
                        onClick={() => onLearnMore?.(org)}
                        className="px-4 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors"
                    >
                        Learn More
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// IMPACT COUNTER - Shows collective community impact
// ============================================
export function ImpactCounter() {
    // These would come from real data
    const stats = [
        { icon: '👥', value: '12,847', label: 'Community Members' },
        { icon: '💜', value: '$47,230', label: 'Raised This Month', highlight: true },
        { icon: '🌍', value: '6', label: 'Organizations Supported' },
        { icon: '📢', value: '1.2M', label: 'Stories Shared' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-violet-500/10 to-cyan-500/10 rounded-3xl p-6 border border-violet-500/20"
        >
            <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">🌱</span>
                <div>
                    <h3 className="font-semibold text-white">Our Collective Impact</h3>
                    <p className="text-sm text-white/50">Together, we&apos;re making a difference</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className={`text-center p-4 rounded-2xl ${stat.highlight ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-white/[0.02]'
                            }`}
                    >
                        <span className="text-2xl">{stat.icon}</span>
                        <p className={`text-xl font-bold ${stat.highlight ? 'text-emerald-400' : 'text-white'} mt-2`}>
                            {stat.value}
                        </p>
                        <p className="text-xs text-white/40">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            <p className="text-xs text-white/30 text-center mt-4">
                0G is free forever. Built for community, not data.
            </p>
        </motion.div>
    );
}

// ============================================
// HOW IT WORKS - The 0G Impact Model
// ============================================
export function HowItWorks() {
    const steps = [
        {
            icon: '🆓',
            title: 'Always Free',
            description: 'No subscriptions. No premium. Everyone participates equally.',
        },
        {
            icon: '🛡️',
            title: 'Verified Only',
            description: 'We only partner with vetted, transparent humanitarian organizations.',
        },
        {
            icon: '🚫',
            title: 'No Begging',
            description: 'Individual fundraising is prohibited. We prevent fraud and exploitation.',
        },
        {
            icon: '📈',
            title: 'Growth = Giving',
            description: 'As our community grows, so does our collective contribution.',
        },
    ];

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>⚡</span> How 0G Impact Works
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
                {steps.map((step, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5"
                    >
                        <span className="text-2xl">{step.icon}</span>
                        <div>
                            <h4 className="font-medium text-white text-sm">{step.title}</h4>
                            <p className="text-xs text-white/50">{step.description}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// ============================================
// MISSION STATEMENT BANNER
// ============================================
export function MissionBanner() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] p-8 border border-white/5"
        >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <pattern id="mission-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                        <circle cx="20" cy="20" r="1" fill="white" />
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#mission-pattern)" />
                </svg>
            </div>

            <div className="relative z-10 text-center max-w-2xl mx-auto">
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl md:text-4xl font-light text-white leading-tight mb-4"
                >
                    Not for debate.
                    <br />
                    <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent font-medium">
                        For humanity.
                    </span>
                </motion.p>
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-white/50"
                >
                    A platform to educate, coordinate, and participate in returning to our shared humanity.
                </motion.p>
            </div>
        </motion.div>
    );
}

// ============================================
// CAUSES GRID - Full display of organizations
// ============================================
export function CausesGrid({
    causes = VERIFIED_CAUSES,
    maxItems,
    showViewAll = true
}: {
    causes?: VerifiedOrganization[];
    maxItems?: number;
    showViewAll?: boolean;
}) {
    const displayedCauses = maxItems ? causes.slice(0, maxItems) : causes;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                        <span>🤝</span> Verified Causes
                    </h3>
                    <p className="text-sm text-white/50">Organizations aligned with our mission</p>
                </div>
                {showViewAll && maxItems && causes.length > maxItems && (
                    <Link
                        href="/impact"
                        className="px-4 py-2 rounded-xl bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors"
                    >
                        View All ({causes.length})
                    </Link>
                )}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedCauses.map((org, i) => (
                    <motion.div
                        key={org.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <OrganizationCard org={org} />
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// ============================================
// LANDING PAGE SECTION - For homepage
// ============================================
export function ImpactSection() {
    return (
        <section className="py-24 px-6">
            <div className="max-w-6xl mx-auto space-y-12">
                <MissionBanner />

                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <CausesGrid maxItems={4} />
                    </div>
                    <div className="space-y-6">
                        <ImpactCounter />
                        <HowItWorks />
                    </div>
                </div>
            </div>
        </section>
    );
}

// All components are individually named-exported above.
