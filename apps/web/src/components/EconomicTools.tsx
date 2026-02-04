'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

export type ProductCategory = 'food' | 'clothing' | 'services' | 'crafts' | 'digital' | 'books' | 'home' | 'beauty' | 'other';
export type ListingType = 'product' | 'service';
export type JobType = 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship';
export type WorkLocation = 'remote' | 'hybrid' | 'onsite';

export interface MarketplaceListing {
    id: string;
    title: string;
    description: string;
    price: number;
    currency: string;
    category: ProductCategory;
    type: ListingType;
    seller: {
        id: string;
        name: string;
        avatar: string;
        isVerified: boolean;
        rating: number;
        reviewCount: number;
        location: string;
    };
    images: string[];
    badges: ('halal' | 'ethical' | 'muslim-owned' | 'local' | 'handmade')[];
    inStock: boolean;
    createdAt: Date;
}

export interface JobListing {
    id: string;
    title: string;
    company: {
        id: string;
        name: string;
        logo?: string;
        isVerified: boolean;
        industry: string;
    };
    location: string;
    workLocation: WorkLocation;
    type: JobType;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency: string;
    description: string;
    requirements: string[];
    benefits: string[];
    postedAt: Date;
    expiresAt: Date;
    applicants: number;
    isUrgent: boolean;
    referralBonus?: number;
}

export interface Investor {
    id: string;
    name: string;
    avatar: string;
    title: string;
    firm?: string;
    bio: string;
    checkSize: {
        min: number;
        max: number;
    };
    stages: string[];
    industries: string[];
    portfolio: {
        name: string;
        logo?: string;
    }[];
    dealCount: number;
    isActive: boolean;
    halalFocused: boolean;
    location: string;
    linkedIn?: string;
    warmIntroRequired: boolean;
}

// ============================================================================
// CONFIG
// ============================================================================

const categoryConfig: Record<ProductCategory, { label: string; icon: string }> = {
    food: { label: 'Food & Drink', icon: '🍽️' },
    clothing: { label: 'Clothing', icon: '👗' },
    services: { label: 'Services', icon: '🛠️' },
    crafts: { label: 'Crafts', icon: '✨' },
    digital: { label: 'Digital', icon: '💻' },
    books: { label: 'Books', icon: '📚' },
    home: { label: 'Home', icon: '🏠' },
    beauty: { label: 'Beauty', icon: '💄' },
    other: { label: 'Other', icon: '📦' },
};

const badgeConfig = {
    halal: { label: 'Halal', color: 'bg-emerald-500/20 text-emerald-400', icon: '☪️' },
    ethical: { label: 'Ethical', color: 'bg-blue-500/20 text-blue-400', icon: '✓' },
    'muslim-owned': { label: 'Muslim-Owned', color: 'bg-violet-500/20 text-violet-400', icon: '💜' },
    local: { label: 'Local', color: 'bg-amber-500/20 text-amber-400', icon: '📍' },
    handmade: { label: 'Handmade', color: 'bg-fuchsia-500/20 text-fuchsia-400', icon: '✋' },
};

const jobTypeConfig: Record<JobType, { label: string; color: string }> = {
    'full-time': { label: 'Full-time', color: 'bg-emerald-500/20 text-emerald-400' },
    'part-time': { label: 'Part-time', color: 'bg-blue-500/20 text-blue-400' },
    contract: { label: 'Contract', color: 'bg-amber-500/20 text-amber-400' },
    freelance: { label: 'Freelance', color: 'bg-violet-500/20 text-violet-400' },
    internship: { label: 'Internship', color: 'bg-cyan-500/20 text-cyan-400' },
};

// ============================================================================
// MARKETPLACE LISTING CARD
// ============================================================================

interface ListingCardProps {
    listing: MarketplaceListing;
    onClick?: () => void;
}

export function ListingCard({ listing, onClick }: ListingCardProps) {
    const category = categoryConfig[listing.category];

    return (
        <motion.div
            whileHover={{ y: -4 }}
            onClick={onClick}
            className="bg-white/5 rounded-2xl overflow-hidden border border-white/10 cursor-pointer hover:border-violet-500/30 transition-colors"
        >
            {/* Image */}
            <div className="h-48 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-5xl">
                {category.icon}
            </div>

            {/* Content */}
            <div className="p-5">
                {/* Badges */}
                <div className="flex flex-wrap gap-1 mb-2">
                    {listing.badges.map((badge) => (
                        <span key={badge} className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeConfig[badge].color}`}>
                            {badgeConfig[badge].icon} {badgeConfig[badge].label}
                        </span>
                    ))}
                </div>

                <h3 className="font-semibold text-white mb-1 line-clamp-1">{listing.title}</h3>
                <p className="text-sm text-white/50 line-clamp-2 mb-3">{listing.description}</p>

                {/* Price */}
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xl font-bold text-white">
                        {listing.currency}{listing.price.toLocaleString()}
                    </span>
                    {!listing.inStock && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">Out of Stock</span>
                    )}
                </div>

                {/* Seller */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-sm">
                        {listing.seller.avatar}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-white font-medium">
                            {listing.seller.name}
                            {listing.seller.isVerified && <span className="text-blue-400 ml-1">✓</span>}
                        </p>
                        <div className="flex items-center text-xs text-white/40">
                            <span className="text-amber-400">★ {listing.seller.rating.toFixed(1)}</span>
                            <span className="mx-1">·</span>
                            <span>{listing.seller.reviewCount} reviews</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================================================
// JOB LISTING CARD
// ============================================================================

interface JobCardProps {
    job: JobListing;
    onClick?: () => void;
    onApply?: () => void;
}

export function JobCard({ job, onClick, onApply }: JobCardProps) {
    const formatSalary = () => {
        if (!job.salaryMin && !job.salaryMax) return null;
        if (job.salaryMin && job.salaryMax) {
            return `${job.salaryCurrency}${(job.salaryMin / 1000).toFixed(0)}k - ${job.salaryCurrency}${(job.salaryMax / 1000).toFixed(0)}k`;
        }
        if (job.salaryMin) return `${job.salaryCurrency}${(job.salaryMin / 1000).toFixed(0)}k+`;
        return `Up to ${job.salaryCurrency}${(job.salaryMax! / 1000).toFixed(0)}k`;
    };

    const daysAgo = Math.floor((Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60 * 24));

    return (
        <motion.div
            whileHover={{ y: -2 }}
            onClick={onClick}
            className="bg-white/5 rounded-xl p-5 border border-white/10 cursor-pointer hover:border-violet-500/30 transition-colors"
        >
            <div className="flex items-start gap-4">
                {/* Company Logo */}
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-xl border border-white/10">
                    💼
                </div>

                <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-white">{job.title}</h3>
                                {job.isUrgent && (
                                    <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">🔥 Urgent</span>
                                )}
                            </div>
                            <p className="text-sm text-white/60 flex items-center gap-1">
                                {job.company.name}
                                {job.company.isVerified && <span className="text-blue-400">✓</span>}
                            </p>
                        </div>
                        {formatSalary() && (
                            <span className="text-emerald-400 font-bold">{formatSalary()}</span>
                        )}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mt-3">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${jobTypeConfig[job.type].color}`}>
                            {jobTypeConfig[job.type].label}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-white/10 text-white/60">
                            📍 {job.location}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-white/10 text-white/60">
                            {job.workLocation === 'remote' ? '🏠 Remote' : job.workLocation === 'hybrid' ? '🔄 Hybrid' : '🏢 Onsite'}
                        </span>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-3 text-xs text-white/40">
                            <span>{daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`}</span>
                            <span>·</span>
                            <span>{job.applicants} applicants</span>
                            {job.referralBonus && (
                                <>
                                    <span>·</span>
                                    <span className="text-amber-400">💰 ${job.referralBonus} referral</span>
                                </>
                            )}
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onApply?.();
                            }}
                            className="px-4 py-1.5 rounded-lg bg-violet-500/20 text-violet-400 text-sm font-medium hover:bg-violet-500/30"
                        >
                            Apply
                        </motion.button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================================================
// INVESTOR CARD
// ============================================================================

interface InvestorCardProps {
    investor: Investor;
    onClick?: () => void;
    onRequestIntro?: () => void;
}

export function InvestorCard({ investor, onClick, onRequestIntro }: InvestorCardProps) {
    const formatCheckSize = () => {
        const formatK = (n: number) => {
            if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
            return `$${(n / 1000).toFixed(0)}K`;
        };
        return `${formatK(investor.checkSize.min)} - ${formatK(investor.checkSize.max)}`;
    };

    return (
        <motion.div
            whileHover={{ y: -4 }}
            onClick={onClick}
            className="bg-white/5 rounded-2xl p-6 border border-white/10 cursor-pointer hover:border-violet-500/30 transition-colors"
        >
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-2xl">
                        {investor.avatar}
                    </div>
                    {investor.isActive && (
                        <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-gray-900" />
                    )}
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-white">{investor.name}</h3>
                    <p className="text-sm text-white/60">{investor.title}</p>
                    {investor.firm && <p className="text-sm text-violet-400">{investor.firm}</p>}
                </div>
                {investor.halalFocused && (
                    <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                        ☪️ Halal Focus
                    </span>
                )}
            </div>

            {/* Check Size */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 mb-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Check Size</span>
                    <span className="text-lg font-bold text-white">{formatCheckSize()}</span>
                </div>
            </div>

            {/* Stages */}
            <div className="mb-4">
                <span className="text-xs text-white/50 block mb-2">Investment Stages:</span>
                <div className="flex flex-wrap gap-1">
                    {investor.stages.map((stage) => (
                        <span key={stage} className="px-2 py-0.5 rounded-lg bg-white/10 text-white/70 text-xs">
                            {stage}
                        </span>
                    ))}
                </div>
            </div>

            {/* Portfolio Preview */}
            {investor.portfolio.length > 0 && (
                <div className="mb-4">
                    <span className="text-xs text-white/50 block mb-2">Portfolio ({investor.dealCount} deals):</span>
                    <div className="flex flex-wrap gap-2">
                        {investor.portfolio.slice(0, 3).map((company) => (
                            <span key={company.name} className="px-2 py-1 rounded-lg bg-white/5 text-white/60 text-xs">
                                {company.name}
                            </span>
                        ))}
                        {investor.portfolio.length > 3 && (
                            <span className="px-2 py-1 rounded-lg bg-white/5 text-white/40 text-xs">
                                +{investor.portfolio.length - 3} more
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Request Intro */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => {
                    e.stopPropagation();
                    onRequestIntro?.();
                }}
                className={`w-full py-2.5 rounded-xl font-medium text-sm ${investor.warmIntroRequired
                        ? 'bg-white/5 text-white/60 hover:bg-white/10'
                        : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white'
                    }`}
            >
                {investor.warmIntroRequired ? '🔒 Warm Intro Required' : 'Request Introduction'}
            </motion.button>
        </motion.div>
    );
}

// ============================================================================
// MARKETPLACE GRID
// ============================================================================

interface MarketplaceProps {
    listings: MarketplaceListing[];
    onListingClick?: (listingId: string) => void;
}

export function Marketplace({ listings, onListingClick }: MarketplaceProps) {
    const [category, setCategory] = useState<ProductCategory | 'all'>('all');
    const [showMuslimOwned, setShowMuslimOwned] = useState(false);

    const filteredListings = listings.filter((l) => {
        if (category !== 'all' && l.category !== category) return false;
        if (showMuslimOwned && !l.badges.includes('muslim-owned')) return false;
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Community Marketplace</h2>
                    <p className="text-white/50">Support Muslim-owned businesses</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium"
                >
                    + List Item
                </motion.button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProductCategory | 'all')}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                >
                    <option value="all">All Categories</option>
                    {Object.entries(categoryConfig).map(([key, config]) => (
                        <option key={key} value={key}>
                            {config.icon} {config.label}
                        </option>
                    ))}
                </select>

                <button
                    onClick={() => setShowMuslimOwned(!showMuslimOwned)}
                    className={`px-4 py-2 rounded-xl font-medium transition-colors ${showMuslimOwned
                            ? 'bg-violet-500/20 text-violet-400'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                >
                    💜 Muslim-Owned Only
                </button>
            </div>

            {/* Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredListings.map((listing) => (
                    <ListingCard
                        key={listing.id}
                        listing={listing}
                        onClick={() => onListingClick?.(listing.id)}
                    />
                ))}
            </div>

            {filteredListings.length === 0 && (
                <div className="text-center py-12 text-white/40">
                    No listings match your filters
                </div>
            )}
        </div>
    );
}

// ============================================================================
// JOB BOARD
// ============================================================================

interface JobBoardProps {
    jobs: JobListing[];
    onJobClick?: (jobId: string) => void;
    onApply?: (jobId: string) => void;
}

export function JobBoard({ jobs, onJobClick, onApply }: JobBoardProps) {
    const [workLocation, setWorkLocation] = useState<WorkLocation | 'all'>('all');
    const [jobType, setJobType] = useState<JobType | 'all'>('all');

    const filteredJobs = jobs.filter((j) => {
        if (workLocation !== 'all' && j.workLocation !== workLocation) return false;
        if (jobType !== 'all' && j.type !== jobType) return false;
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white">Community Job Board</h2>
                <p className="text-white/50">Find opportunities in Muslim-owned businesses</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
                <select
                    value={workLocation}
                    onChange={(e) => setWorkLocation(e.target.value as WorkLocation | 'all')}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                >
                    <option value="all">All Locations</option>
                    <option value="remote">🏠 Remote</option>
                    <option value="hybrid">🔄 Hybrid</option>
                    <option value="onsite">🏢 Onsite</option>
                </select>

                <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value as JobType | 'all')}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                >
                    <option value="all">All Types</option>
                    {Object.entries(jobTypeConfig).map(([key, config]) => (
                        <option key={key} value={key}>
                            {config.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Jobs List */}
            <div className="space-y-4">
                {filteredJobs.map((job) => (
                    <JobCard
                        key={job.id}
                        job={job}
                        onClick={() => onJobClick?.(job.id)}
                        onApply={() => onApply?.(job.id)}
                    />
                ))}
            </div>

            {filteredJobs.length === 0 && (
                <div className="text-center py-12 text-white/40">
                    No jobs match your filters
                </div>
            )}
        </div>
    );
}

// ============================================================================
// INVESTOR NETWORK
// ============================================================================

interface InvestorNetworkProps {
    investors: Investor[];
    onInvestorClick?: (investorId: string) => void;
    onRequestIntro?: (investorId: string) => void;
}

export function InvestorNetwork({ investors, onInvestorClick, onRequestIntro }: InvestorNetworkProps) {
    const [halalOnly, setHalalOnly] = useState(false);
    const [activeOnly, setActiveOnly] = useState(true);

    const filteredInvestors = investors.filter((i) => {
        if (halalOnly && !i.halalFocused) return false;
        if (activeOnly && !i.isActive) return false;
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white">Investor Network</h2>
                <p className="text-white/50">Connect with investors who share your values</p>
            </div>

            {/* Quote */}
            <div className="p-6 rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20">
                <p className="text-white/80 italic text-center">
                    "How excellent is the wealth of a righteous man" — Hadith
                </p>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <button
                    onClick={() => setHalalOnly(!halalOnly)}
                    className={`px-4 py-2 rounded-xl font-medium transition-colors ${halalOnly
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                >
                    ☪️ Halal Focus Only
                </button>
                <button
                    onClick={() => setActiveOnly(!activeOnly)}
                    className={`px-4 py-2 rounded-xl font-medium transition-colors ${activeOnly
                            ? 'bg-violet-500/20 text-violet-400'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                >
                    🟢 Actively Investing
                </button>
            </div>

            {/* Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInvestors.map((investor) => (
                    <InvestorCard
                        key={investor.id}
                        investor={investor}
                        onClick={() => onInvestorClick?.(investor.id)}
                        onRequestIntro={() => onRequestIntro?.(investor.id)}
                    />
                ))}
            </div>

            {filteredInvestors.length === 0 && (
                <div className="text-center py-12 text-white/40">
                    No investors match your filters
                </div>
            )}
        </div>
    );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    ListingCard,
    JobCard,
    InvestorCard,
    Marketplace,
    JobBoard,
    InvestorNetwork,
};
