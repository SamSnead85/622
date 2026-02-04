'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CloseIcon, CheckCircleIcon } from '@/components/icons';

// ============================================
// TYPES
// ============================================

export type SubscriptionTier = 'free' | 'supporter' | 'patron' | 'champion';

export interface TierConfig {
    tier: SubscriptionTier;
    name: string;
    price: number;
    benefits: string[];
    color: string;
    icon: string;
}

const DEFAULT_TIERS: TierConfig[] = [
    { tier: 'free', name: 'Free', price: 0, benefits: ['Public content', 'Community participation'], color: 'white', icon: '👋' },
    { tier: 'supporter', name: 'Supporter', price: 5, benefits: ['Supporter badge', 'Early access', 'Direct messaging'], color: 'cyan', icon: '⭐' },
    { tier: 'patron', name: 'Patron', price: 15, benefits: ['Patron badge', 'Exclusive content', 'Monthly Q&A'], color: 'purple', icon: '💎' },
    { tier: 'champion', name: 'Champion', price: 50, benefits: ['Champion badge', 'Priority support', 'Custom perks'], color: 'amber', icon: '🏆' },
];

// ============================================
// SUBSCRIPTION MODAL
// ============================================

interface SubscriptionModalProps {
    isOpen: boolean;
    creatorName: string;
    tiers?: TierConfig[];
    currentTier?: SubscriptionTier;
    onClose: () => void;
    onSubscribe: (tier: SubscriptionTier) => Promise<void>;
}

export function SubscriptionModal({ isOpen, creatorName, tiers = DEFAULT_TIERS, currentTier = 'free', onClose, onSubscribe }: SubscriptionModalProps) {
    const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(currentTier);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubscribe = async () => {
        if (selectedTier === currentTier) return;
        setIsProcessing(true);
        try { await onSubscribe(selectedTier); onClose(); }
        finally { setIsProcessing(false); }
    };

    if (!isOpen) return null;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                className="w-full max-w-4xl bg-[#0A0A0F] border border-white/10 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-white">Support {creatorName}</h2>
                    <button onClick={onClose}><CloseIcon size={20} className="text-white/60" /></button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    {tiers.map(tier => (
                        <button key={tier.tier} onClick={() => setSelectedTier(tier.tier)}
                            className={`p-5 rounded-2xl border text-left ${selectedTier === tier.tier ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-white/5 border-white/10'}`}>
                            <div className="text-2xl mb-2">{tier.icon}</div>
                            <h3 className="font-semibold text-white">{tier.name}</h3>
                            <p className="text-xl font-bold text-white">{tier.price === 0 ? 'Free' : `$${tier.price}/mo`}</p>
                            <ul className="mt-3 space-y-1">{tier.benefits.map((b, i) => (
                                <li key={i} className="flex items-center gap-2 text-xs text-white/60"><CheckCircleIcon size={12} />{b}</li>
                            ))}</ul>
                        </button>
                    ))}
                </div>
                <div className="px-6 py-4 border-t border-white/10 flex justify-end">
                    <button onClick={handleSubscribe} disabled={selectedTier === currentTier || isProcessing}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium disabled:opacity-50">
                        {isProcessing ? 'Processing...' : 'Subscribe'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================
// TIP JAR
// ============================================

interface TipJarProps {
    recipientName: string;
    onTip: (amount: number, message: string, isAnonymous: boolean) => Promise<void>;
}

const TIP_AMOUNTS = [1, 5, 10, 25, 50, 100];

export function TipJar({ recipientName, onTip }: TipJarProps) {
    const [amount, setAmount] = useState<number | null>(5);
    const [customAmount, setCustomAmount] = useState('');
    const [message, setMessage] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const finalAmount = amount || parseFloat(customAmount) || 0;

    const handleTip = async () => {
        if (finalAmount <= 0) return;
        setIsProcessing(true);
        try { await onTip(finalAmount, message, isAnonymous); setAmount(5); setCustomAmount(''); setMessage(''); }
        finally { setIsProcessing(false); }
    };

    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="font-semibold text-white mb-4">☕ Send a tip to {recipientName}</h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
                {TIP_AMOUNTS.map(t => (
                    <button key={t} onClick={() => { setAmount(t); setCustomAmount(''); }}
                        className={`py-3 rounded-xl font-semibold ${amount === t ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 'bg-white/5 text-white/60 border border-white/10'}`}>
                        ${t}
                    </button>
                ))}
            </div>
            <input type="number" value={customAmount} onChange={(e) => { setCustomAmount(e.target.value); setAmount(null); }} placeholder="Custom $"
                className="w-full px-4 py-3 mb-3 rounded-xl bg-white/5 border border-white/10 text-white" />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Add a message..." rows={2}
                className="w-full px-4 py-3 mb-3 rounded-xl bg-white/5 border border-white/10 text-white resize-none" />
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
                <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
                <span className="text-sm text-white/60">Send anonymously</span>
            </label>
            <button onClick={handleTip} disabled={finalAmount <= 0 || isProcessing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold disabled:opacity-50">
                {isProcessing ? 'Processing...' : `Send $${finalAmount.toFixed(2)} Tip`}
            </button>
        </div>
    );
}

// ============================================
// DONATION GOAL
// ============================================

interface DonationGoalProps {
    title: string;
    targetAmount: number;
    currentAmount: number;
    contributorCount: number;
    onDonate: () => void;
}

export function DonationGoal({ title, targetAmount, currentAmount, contributorCount, onDonate }: DonationGoalProps) {
    const progress = Math.min((currentAmount / targetAmount) * 100, 100);
    const isComplete = currentAmount >= targetAmount;

    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="font-semibold text-white mb-4">{title}</h3>
            <div className="relative h-4 rounded-full bg-white/10 overflow-hidden mb-3">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                    className={`absolute h-full rounded-full ${isComplete ? 'bg-green-500' : 'bg-cyan-500'}`} />
            </div>
            <div className="flex justify-between mb-4">
                <span className="text-xl font-bold text-white">${currentAmount.toLocaleString()} / ${targetAmount.toLocaleString()}</span>
                <span className="text-white/50">{contributorCount} contributors</span>
            </div>
            <button onClick={onDonate} disabled={isComplete}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold disabled:opacity-50">
                {isComplete ? 'Goal Reached!' : 'Contribute'}
            </button>
        </div>
    );
}

export default SubscriptionModal;
