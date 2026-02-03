'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCommunities } from '@/hooks/useCommunities';

// ============================================
// STEP TYPES
// ============================================
type WizardStep = 'basics' | 'privacy' | 'cover' | 'invite' | 'complete';

interface TribeData {
    name: string;
    description: string;
    category: string;
    privacy: 'public' | 'private';
    approvalRequired: boolean;
    coverImage: string | null;
}

// ============================================
// CATEGORY OPTIONS
// ============================================
const CATEGORIES = [
    { id: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
    { id: 'friends', label: 'Friends', icon: '👯' },
    { id: 'faith', label: 'Faith & Spirituality', icon: '🕌' },
    { id: 'business', label: 'Business & Networking', icon: '💼' },
    { id: 'hobby', label: 'Hobbies & Interests', icon: '🎨' },
    { id: 'local', label: 'Local Community', icon: '🏘️' },
    { id: 'education', label: 'Education & Learning', icon: '📚' },
    { id: 'other', label: 'Other', icon: '✨' },
];

// ============================================
// COVER PRESETS
// ============================================
const COVER_PRESETS = [
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&h=400&fit=crop',
];

// ============================================
// MAIN COMPONENT
// ============================================
export default function CreateTribePage() {
    const router = useRouter();
    const { user } = useAuth();
    const { createCommunity } = useCommunities();
    const [step, setStep] = useState<WizardStep>('basics');
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [tribeData, setTribeData] = useState<TribeData>({
        name: '',
        description: '',
        category: '',
        privacy: 'private',
        approvalRequired: true,
        coverImage: null,
    });

    const steps: WizardStep[] = ['basics', 'privacy', 'cover', 'invite'];
    const currentStepIndex = steps.indexOf(step);

    const canProceed = () => {
        switch (step) {
            case 'basics':
                return tribeData.name.trim().length >= 3 && tribeData.category;
            case 'privacy':
                return true;
            case 'cover':
                return true;
            case 'invite':
                return true;
            default:
                return false;
        }
    };

    const nextStep = () => {
        const idx = steps.indexOf(step);
        if (idx < steps.length - 1) {
            setStep(steps[idx + 1]);
        } else {
            handleCreate();
        }
    };

    const prevStep = () => {
        const idx = steps.indexOf(step);
        if (idx > 0) {
            setStep(steps[idx - 1]);
        }
    };

    const handleCreate = async () => {
        setIsCreating(true);
        setCreateError(null);

        const result = await createCommunity({
            name: tribeData.name,
            description: tribeData.description,
            category: tribeData.category,
            privacy: tribeData.privacy,
            approvalRequired: tribeData.approvalRequired,
            coverImage: tribeData.coverImage,
        });

        if (result.success) {
            setStep('complete');
        } else {
            setCreateError(result.error || 'Failed to create tribe');
        }
        setIsCreating(false);
    };

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0A1628] via-black to-black" />
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[#00D4FF]/5 blur-[120px]" />
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-white/5 bg-black/50 backdrop-blur-xl">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/communities" className="flex items-center gap-2 text-white/60 hover:text-white">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Back</span>
                    </Link>
                    <h1 className="font-semibold">Create a Tribe</h1>
                    <div className="w-16" />
                </div>
            </header>

            {/* Progress bar */}
            {step !== 'complete' && (
                <div className="relative z-10 max-w-2xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-2">
                        {steps.map((s, i) => (
                            <div
                                key={s}
                                className={`flex-1 h-1 rounded-full transition-colors ${i <= currentStepIndex ? 'bg-[#00D4FF]' : 'bg-white/10'
                                    }`}
                            />
                        ))}
                    </div>
                    <p className="text-sm text-white/40 mt-2">
                        Step {currentStepIndex + 1} of {steps.length}
                    </p>
                </div>
            )}

            {/* Content */}
            <main className="relative z-10 max-w-2xl mx-auto px-4 py-8">
                <AnimatePresence mode="wait">
                    {/* Step 1: Basics */}
                    {step === 'basics' && (
                        <motion.div
                            key="basics"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <h2 className="text-2xl font-bold mb-2">Name your Tribe</h2>
                            <p className="text-white/50 mb-8">Choose a name and category for your community</p>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-2">
                                        Tribe Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={tribeData.name}
                                        onChange={(e) => setTribeData({ ...tribeData, name: e.target.value })}
                                        placeholder="e.g., Hassan Family, Tech Founders Circle"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#00D4FF]/50"
                                        maxLength={50}
                                    />
                                    <p className="text-xs text-white/40 mt-1">{tribeData.name.length}/50 characters</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-2">
                                        Description (optional)
                                    </label>
                                    <textarea
                                        value={tribeData.description}
                                        onChange={(e) => setTribeData({ ...tribeData, description: e.target.value })}
                                        placeholder="What is this tribe about?"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#00D4FF]/50 h-24 resize-none"
                                        maxLength={200}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-3">
                                        Category *
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {CATEGORIES.map((cat) => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setTribeData({ ...tribeData, category: cat.id })}
                                                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${tribeData.category === cat.id
                                                    ? 'border-[#00D4FF] bg-[#00D4FF]/10'
                                                    : 'border-white/10 hover:border-white/20'
                                                    }`}
                                            >
                                                <span className="text-2xl">{cat.icon}</span>
                                                <span className="font-medium">{cat.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2: Privacy */}
                    {step === 'privacy' && (
                        <motion.div
                            key="privacy"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <h2 className="text-2xl font-bold mb-2">Privacy Settings</h2>
                            <p className="text-white/50 mb-8">Control who can find and join your tribe</p>

                            <div className="space-y-4">
                                <button
                                    onClick={() => setTribeData({ ...tribeData, privacy: 'public' })}
                                    className={`w-full p-5 rounded-2xl border text-left transition-all ${tribeData.privacy === 'public'
                                        ? 'border-[#00D4FF] bg-[#00D4FF]/10'
                                        : 'border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-2xl">
                                            🌍
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg">Public Tribe</h3>
                                            <p className="text-white/50 text-sm mt-1">
                                                Anyone can find and join. Posts are visible to all members.
                                            </p>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${tribeData.privacy === 'public' ? 'border-[#00D4FF]' : 'border-white/30'
                                            }`}>
                                            {tribeData.privacy === 'public' && (
                                                <div className="w-3 h-3 rounded-full bg-[#00D4FF]" />
                                            )}
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setTribeData({ ...tribeData, privacy: 'private' })}
                                    className={`w-full p-5 rounded-2xl border text-left transition-all ${tribeData.privacy === 'private'
                                        ? 'border-[#00D4FF] bg-[#00D4FF]/10'
                                        : 'border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center text-2xl">
                                            🔒
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg">Private Tribe</h3>
                                            <p className="text-white/50 text-sm mt-1">
                                                Only invited members can join. Hidden from search.
                                            </p>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${tribeData.privacy === 'private' ? 'border-[#00D4FF]' : 'border-white/30'
                                            }`}>
                                            {tribeData.privacy === 'private' && (
                                                <div className="w-3 h-3 rounded-full bg-[#00D4FF]" />
                                            )}
                                        </div>
                                    </div>
                                </button>
                            </div>

                            {tribeData.privacy === 'public' && (
                                <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={tribeData.approvalRequired}
                                            onChange={(e) => setTribeData({ ...tribeData, approvalRequired: e.target.checked })}
                                            className="w-5 h-5 rounded border-white/30 bg-white/5 text-[#00D4FF] focus:ring-[#00D4FF]/50"
                                        />
                                        <div>
                                            <p className="font-medium">Require approval to join</p>
                                            <p className="text-sm text-white/50">Review and approve new member requests</p>
                                        </div>
                                    </label>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Step 3: Cover Image */}
                    {step === 'cover' && (
                        <motion.div
                            key="cover"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <h2 className="text-2xl font-bold mb-2">Choose a Cover</h2>
                            <p className="text-white/50 mb-8">Select a cover image for your tribe (optional)</p>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {COVER_PRESETS.map((url, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setTribeData({ ...tribeData, coverImage: url })}
                                        className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${tribeData.coverImage === url
                                            ? 'border-[#00D4FF] ring-2 ring-[#00D4FF]/30'
                                            : 'border-transparent hover:border-white/30'
                                            }`}
                                    >
                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                        {tribeData.coverImage === url && (
                                            <div className="absolute inset-0 bg-[#00D4FF]/20 flex items-center justify-center">
                                                <div className="w-8 h-8 rounded-full bg-[#00D4FF] flex items-center justify-center">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
                                                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setTribeData({ ...tribeData, coverImage: null })}
                                className="mt-4 text-sm text-white/50 hover:text-white"
                            >
                                Skip for now
                            </button>
                        </motion.div>
                    )}

                    {/* Step 4: Invite */}
                    {step === 'invite' && (
                        <motion.div
                            key="invite"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <h2 className="text-2xl font-bold mb-2">Invite Members</h2>
                            <p className="text-white/50 mb-8">Share your tribe with friends and family</p>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-3xl mb-4">
                                        🔗
                                    </div>
                                    <h3 className="font-semibold text-lg mb-1">Invite Link</h3>
                                    <p className="text-sm text-white/50">Share this link to invite people</p>
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={`0g.social/tribe/${tribeData.name.toLowerCase().replace(/\s+/g, '-') || 'new-tribe'}`}
                                        className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white/70 text-sm"
                                    />
                                    <button className="px-4 py-3 rounded-lg bg-[#00D4FF] text-black font-semibold hover:opacity-90 transition-opacity">
                                        Copy
                                    </button>
                                </div>

                                <div className="flex justify-center gap-3 mt-6">
                                    {['WhatsApp', 'SMS', 'Email'].map((platform) => (
                                        <button
                                            key={platform}
                                            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors"
                                        >
                                            {platform}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <p className="text-center text-sm text-white/40 mt-6">
                                You can invite more members anytime from tribe settings
                            </p>
                        </motion.div>
                    )}

                    {/* Complete */}
                    {step === 'complete' && (
                        <motion.div
                            key="complete"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-12"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 10 }}
                                className="text-8xl mb-6"
                            >
                                🎉
                            </motion.div>
                            <h2 className="text-3xl font-bold mb-3">Tribe Created!</h2>
                            <p className="text-white/50 mb-8 max-w-md mx-auto">
                                <span className="text-[#00D4FF] font-semibold">{tribeData.name}</span> is ready.
                                Start posting and invite your people!
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Link
                                    href="/communities"
                                    className="px-8 py-3 rounded-xl bg-[#00D4FF] text-black font-semibold hover:opacity-90 transition-opacity"
                                >
                                    Go to My Tribes
                                </Link>
                                <button
                                    onClick={() => {
                                        setStep('basics');
                                        setTribeData({
                                            name: '',
                                            description: '',
                                            category: '',
                                            privacy: 'private',
                                            approvalRequired: true,
                                            coverImage: null,
                                        });
                                    }}
                                    className="px-8 py-3 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/5 transition-colors"
                                >
                                    Create Another
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Footer nav */}
            {step !== 'complete' && (
                <footer className="fixed bottom-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-xl border-t border-white/5">
                    <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                        <button
                            onClick={prevStep}
                            disabled={currentStepIndex === 0}
                            className="px-6 py-3 rounded-xl border border-white/20 text-white font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
                        >
                            Back
                        </button>
                        <button
                            onClick={nextStep}
                            disabled={!canProceed() || isCreating}
                            className="px-8 py-3 rounded-xl bg-[#00D4FF] text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center gap-2"
                        >
                            {isCreating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    Creating...
                                </>
                            ) : step === 'invite' ? (
                                'Create Tribe'
                            ) : (
                                'Continue'
                            )}
                        </button>
                    </div>
                </footer>
            )}
        </div>
    );
}
