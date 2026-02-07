'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfile } from '@/components/ProfileEditor';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// WELCOME ONBOARDING FLOW
// ============================================

interface OnboardingProps {
    onComplete: () => void;
}

const INTERESTS = [
    { id: 'photography', label: 'Photography', icon: 'Ph' },
    { id: 'travel', label: 'Travel', icon: 'Tr' },
    { id: 'food', label: 'Food & Cooking', icon: 'Fd' },
    { id: 'fitness', label: 'Fitness', icon: 'Ft' },
    { id: 'music', label: 'Music', icon: 'Mu' },
    { id: 'art', label: 'Art & Design', icon: 'Ar' },
    { id: 'tech', label: 'Technology', icon: 'Te' },
    { id: 'fashion', label: 'Fashion', icon: 'Fa' },
    { id: 'gaming', label: 'Gaming', icon: 'Gm' },
    { id: 'reading', label: 'Reading', icon: 'Rd' },
    { id: 'nature', label: 'Nature', icon: 'Na' },
    { id: 'movies', label: 'Movies & TV', icon: 'Mv' },
];

const PRESET_AVATARS = [
    { id: 'gradient-1', type: 'gradient', colors: ['#f97316', '#ec4899'] },
    { id: 'gradient-2', type: 'gradient', colors: ['#8b5cf6', '#3b82f6'] },
    { id: 'gradient-3', type: 'gradient', colors: ['#10b981', '#06b6d4'] },
    { id: 'gradient-4', type: 'gradient', colors: ['#f59e0b', '#f97316'] },
    { id: 'emoji-1', type: 'emoji', emoji: '😊' },
    { id: 'emoji-2', type: 'emoji', emoji: '🌟' },
    { id: 'emoji-3', type: 'emoji', emoji: '🦋' },
    { id: 'emoji-4', type: 'emoji', emoji: '🌙' },
];

export function WelcomeOnboarding({ onComplete }: OnboardingProps) {
    const [step, setStep] = useState(0);
    const [name, setName] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const { updateProfile } = useProfile();
    const { user } = useAuth();

    // Pre-fill name from auth
    useEffect(() => {
        if (user?.displayName && !name) {
            setName(user.displayName);
        }
    }, [user?.displayName]);

    const totalSteps = 4;

    // Auto-generate username from name (lowercase, no spaces, alphanumeric only)
    const generatedUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    const toggleInterest = useCallback((id: string) => {
        setSelectedInterests(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }, []);

    const handleComplete = useCallback(() => {
        // Save profile - use name for both displayName and username
        updateProfile({
            displayName: name,
            username: generatedUsername,
            avatarType: 'preset',
            avatarPreset: selectedAvatar || 'gradient-1',
        });
        // Mark onboarding complete
        localStorage.setItem('og_onboarding_complete', 'true');
        onComplete();
    }, [name, generatedUsername, selectedAvatar, updateProfile, onComplete]);

    const canProceed = () => {
        switch (step) {
            case 0: return true; // Welcome
            case 1: return name.trim().length >= 2; // Just need a name with 2+ characters
            case 2: return selectedAvatar !== null;
            case 3: return selectedInterests.length >= 3;
            default: return true;
        }
    };

    const nextStep = () => {
        if (step < totalSteps - 1) {
            setStep(s => s + 1);
        } else {
            handleComplete();
        }
    };

    return (
        <div className="fixed inset-0 bg-[#050508] z-50 flex flex-col">
            {/* Progress bar */}
            <div className="h-1 bg-white/10">
                <motion.div
                    className="h-full bg-gradient-to-r from-orange-400 to-rose-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
                />
            </div>

            <div className="flex-1 flex items-center justify-center p-6">
                <AnimatePresence mode="wait">
                    {/* Step 0: Welcome */}
                    {step === 0 && (
                        <motion.div
                            key="welcome"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="text-center max-w-md"
                        >
                            <motion.div
                                className="text-7xl mb-6"
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                            >
                                🌙
                            </motion.div>
                            <h1 className="text-3xl font-bold text-white mb-4">Welcome to ZeroG</h1>
                            <p className="text-white/60 text-lg mb-8">
                                Your sovereign space for family, friends, and communities who matter.
                            </p>
                            <div className="space-y-4 text-left bg-white/5 rounded-2xl p-6">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">👨‍👩‍👧‍👦</span>
                                    <p className="text-white/80">Invite your family & close friends</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 shrink-0">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                                    </div>
                                    <p className="text-white/80">Create private tribes & circles</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 shrink-0">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                                    </div>
                                    <p className="text-white/80">You own your data, always</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 1: Name */}
                    {step === 1 && (
                        <motion.div
                            key="name"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full max-w-md"
                        >
                            <h2 className="text-2xl font-bold text-white mb-2 text-center">What should we call you?</h2>
                            <p className="text-white/50 text-center mb-8">Pick any name you&apos;d like - no real name required</p>

                            <div>
                                <label className="block text-sm text-white/60 mb-2">Your Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. AbuJawad, Desert Eagle, etc."
                                    className="w-full px-4 py-4 bg-white/5 rounded-xl text-white text-lg placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    autoFocus
                                />
                                {name.length >= 2 && (
                                    <p className="text-xs text-white/40 mt-2 text-center">
                                        Your @handle will be: <span className="text-amber-400">@{generatedUsername}</span>
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2: Avatar */}
                    {step === 2 && (
                        <motion.div
                            key="avatar"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full max-w-md text-center"
                        >
                            <h2 className="text-2xl font-bold text-white mb-2">Choose your look</h2>
                            <p className="text-white/50 mb-8">Pick a style that represents you</p>

                            <div className="grid grid-cols-4 gap-4">
                                {PRESET_AVATARS.map(avatar => (
                                    <button
                                        key={avatar.id}
                                        onClick={() => setSelectedAvatar(avatar.id)}
                                        className={`aspect-square rounded-full flex items-center justify-center text-3xl transition-all ${selectedAvatar === avatar.id ? 'ring-4 ring-orange-500 scale-110' : 'hover:scale-105'
                                            } ${avatar.type === 'gradient' ? `bg-gradient-to-br` : 'bg-white/10'}`}
                                        style={avatar.type === 'gradient' && avatar.colors ? {
                                            background: `linear-gradient(135deg, ${avatar.colors[0]}, ${avatar.colors[1]})`
                                        } : undefined}
                                    >
                                        {avatar.type === 'emoji' && avatar.emoji}
                                        {avatar.type === 'gradient' && name.charAt(0).toUpperCase()}
                                    </button>
                                ))}
                            </div>

                            <p className="text-sm text-white/40 mt-6">You can upload a photo later in settings</p>
                        </motion.div>
                    )}

                    {/* Step 3: Interests */}
                    {step === 3 && (
                        <motion.div
                            key="interests"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full max-w-lg text-center"
                        >
                            <h2 className="text-2xl font-bold text-white mb-2">What interests you?</h2>
                            <p className="text-white/50 mb-8">Pick at least 3 to personalize your experience</p>

                            <div className="flex flex-wrap justify-center gap-3">
                                {INTERESTS.map(interest => (
                                    <button
                                        key={interest.id}
                                        onClick={() => toggleInterest(interest.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${selectedInterests.includes(interest.id)
                                            ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white'
                                            : 'bg-white/10 text-white/70 hover:bg-white/15'
                                            }`}
                                    >
                                        <span>{interest.icon}</span>
                                        <span>{interest.label}</span>
                                    </button>
                                ))}
                            </div>

                            <p className="text-sm text-white/40 mt-6">
                                {selectedInterests.length}/3 selected
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="p-6">
                <div className="max-w-md mx-auto flex gap-4">
                    {step > 0 && (
                        <button
                            onClick={() => setStep(s => s - 1)}
                            className="px-6 py-3 rounded-full bg-white/10 text-white font-medium hover:bg-white/15 transition-colors"
                        >
                            Back
                        </button>
                    )}
                    <motion.button
                        onClick={nextStep}
                        disabled={!canProceed()}
                        className="flex-1 py-3 rounded-full bg-gradient-to-r from-orange-400 to-rose-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        whileTap={{ scale: 0.98 }}
                    >
                        {step === totalSteps - 1 ? 'Get Started' : 'Continue'}
                    </motion.button>
                </div>
            </div>
        </div>
    );
}

export default WelcomeOnboarding;
