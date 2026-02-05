'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

// ============================================
// TYPES
// ============================================

export interface FundraiserCampaign {
    id: string;
    creatorId: string;
    creatorName: string;
    creatorAvatar?: string;
    title: string;
    story: string;
    category: 'medical' | 'education' | 'emergency' | 'community' | 'nonprofit' | 'creative' | 'memorial';
    goalAmount: number;
    raisedAmount: number;
    donorCount: number;
    coverImage?: string;
    endDate?: Date;
    isVerified: boolean;
    isFeatured: boolean;
    status: 'active' | 'completed' | 'expired';
    updates: { date: Date; text: string }[];
    createdAt: Date;
}

export interface Donation {
    id: string;
    campaignId: string;
    donorId?: string;
    donorName: string;
    amount: number;
    message?: string;
    isAnonymous: boolean;
    createdAt: Date;
}

// ============================================
// FUNDRAISER CARD
// ============================================

interface FundraiserCardProps {
    campaign: FundraiserCampaign;
    onView: (id: string) => void;
    onDonate: (id: string) => void;
}

export function FundraiserCard({ campaign, onView, onDonate }: FundraiserCardProps) {
    const progress = Math.min((campaign.raisedAmount / campaign.goalAmount) * 100, 100);
    const daysLeft = campaign.endDate ? Math.max(0, Math.ceil((campaign.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
    const categoryIcons = { medical: '🏥', education: '📚', emergency: '🚨', community: '🏘️', nonprofit: '💚', creative: '🎨', memorial: '🕯️' };

    return (
        <motion.div whileHover={{ scale: 1.02 }} onClick={() => onView(campaign.id)}
            className="group overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 cursor-pointer">
            <div className="relative h-40 bg-gradient-to-br from-pink-500/20 to-rose-500/20">
                {campaign.coverImage && <Image src={campaign.coverImage} alt="" fill className="object-cover" />}
                <span className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/50 text-white text-xs">{categoryIcons[campaign.category]} {campaign.category}</span>
                {campaign.isVerified && <span className="absolute top-2 right-2 px-2 py-1 rounded-full bg-green-500 text-white text-xs">✓ Verified</span>}
            </div>
            <div className="p-4">
                <h3 className="font-semibold text-white group-hover:text-pink-300 line-clamp-2">{campaign.title}</h3>
                <p className="text-sm text-white/50 mt-1">by {campaign.creatorName}</p>

                <div className="mt-4">
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                            className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full" />
                    </div>
                    <div className="flex justify-between items-center mt-2 text-sm">
                        <span className="text-white font-medium">${campaign.raisedAmount.toLocaleString()}</span>
                        <span className="text-white/40">of ${campaign.goalAmount.toLocaleString()}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                    <div className="text-xs text-white/40">
                        <span>{campaign.donorCount} donors</span>
                        {daysLeft !== null && <span> • {daysLeft} days left</span>}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onDonate(campaign.id); }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-medium">Donate</button>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// DONATION MODAL
// ============================================

interface DonationModalProps {
    campaign: FundraiserCampaign;
    onDonate: (amount: number, message: string, isAnonymous: boolean) => Promise<void>;
    onClose: () => void;
}

const PRESET_AMOUNTS = [10, 25, 50, 100, 250, 500];

export function DonationModal({ campaign, onDonate, onClose }: DonationModalProps) {
    const [amount, setAmount] = useState<number | null>(50);
    const [customAmount, setCustomAmount] = useState('');
    const [message, setMessage] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const finalAmount = amount || parseFloat(customAmount) || 0;

    const handleDonate = async () => {
        if (finalAmount <= 0) return;
        setIsProcessing(true);
        try { await onDonate(finalAmount, message, isAnonymous); onClose(); }
        finally { setIsProcessing(false); }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-md bg-[#0A0A0F] border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-6">
                    <h2 className="text-xl font-semibold text-white mb-2">Donate to {campaign.title}</h2>
                    <p className="text-white/50 text-sm mb-6">Your support helps make a difference</p>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {PRESET_AMOUNTS.map(a => (
                            <button key={a} onClick={() => { setAmount(a); setCustomAmount(''); }}
                                className={`py-3 rounded-xl font-semibold ${amount === a ? 'bg-pink-500/20 text-pink-400 border border-pink-500/50' : 'bg-white/5 text-white/60 border border-white/10'}`}>${a}</button>
                        ))}
                    </div>
                    <input type="number" value={customAmount} onChange={(e) => { setCustomAmount(e.target.value); setAmount(null); }} placeholder="Custom amount"
                        className="w-full px-4 py-3 mb-4 rounded-xl bg-white/5 border border-white/10 text-white" />
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Add an encouraging message (optional)" rows={2}
                        className="w-full px-4 py-3 mb-4 rounded-xl bg-white/5 border border-white/10 text-white resize-none" />
                    <label className="flex items-center gap-2 mb-6 cursor-pointer">
                        <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
                        <span className="text-sm text-white/60">Donate anonymously</span>
                    </label>
                    <button onClick={handleDonate} disabled={finalAmount <= 0 || isProcessing}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold disabled:opacity-50">
                        {isProcessing ? 'Processing...' : `Donate $${finalAmount.toFixed(2)}`}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================
// FUNDRAISER DISCOVERY
// ============================================

interface FundraiserDiscoveryProps {
    campaigns: FundraiserCampaign[];
    onView: (id: string) => void;
    onDonate: (id: string) => void;
    onCreate?: () => void;
}

export function FundraiserDiscovery({ campaigns, onView, onDonate, onCreate }: FundraiserDiscoveryProps) {
    const [category, setCategory] = useState<FundraiserCampaign['category'] | 'all'>('all');
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        return campaigns.filter(c => {
            if (category !== 'all' && c.category !== category) return false;
            if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
            return c.status === 'active';
        }).sort((a, b) => b.raisedAmount - a.raisedAmount);
    }, [campaigns, category, search]);

    const categories = ['all', 'medical', 'education', 'emergency', 'community', 'nonprofit', 'creative', 'memorial'] as const;

    return (
        <div className="space-y-6">
            <div className="flex gap-4">
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search fundraisers..."
                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" />
                {onCreate && <button onClick={onCreate} className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-medium">Start Fundraiser</button>}
            </div>
            <div className="flex gap-2 overflow-x-auto">
                {categories.map(c => (
                    <button key={c} onClick={() => setCategory(c)}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm capitalize ${category === c ? 'bg-pink-500/20 text-pink-400' : 'bg-white/5 text-white/60'}`}>{c}</button>
                ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(c => <FundraiserCard key={c.id} campaign={c} onView={onView} onDonate={onDonate} />)}
            </div>
        </div>
    );
}

export default FundraiserDiscovery;
