'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfile } from '@/components/ProfileEditor';

// ============================================
// WELCOME ONBOARDING FLOW
// ============================================

interface OnboardingProps {
    onComplete: () => void;
}

const INTERESTS = [
    { id: 'photography', label: 'Photography', icon: '📷' },
    { id: 'travel', label: 'Travel', icon: '✈️' },
    { id: 'food', label: 'Food & Cooking', icon: '🍳' },
    { id: 'fitness', label: 'Fitness', icon: '💪' },
    { id: 'music', label: 'Music', icon: '🎵' },
    { id: 'art', label: 'Art & Design', icon: '🎨' },
    { id: 'tech', label: 'Technology', icon: '💻' },
    { id: 'fashion', label: 'Fashion', icon: '👗' },
    { id: 'gaming', label: 'Gaming', icon: '🎮' },
    { id: 'reading', label: 'Reading', icon: '📚' },
    { id: 'nature', label: 'Nature', icon: '🌿' },
    { id: 'movies', label: 'Movies & TV', icon: '🎬' },
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
    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const { updateProfile } = useProfile();

    const totalSteps = 4;

    const toggleInterest = useCallback((id: string) => {
        setSelectedInterests(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }, []);

    const handleComplete = useCallback(() => {
        // Save profile
        updateProfile({
            displayName,
            username,
            avatarType: 'preset',
            avatarPreset: selectedAvatar || 'gradient-1',
        });
        // Mark onboarding complete
        localStorage.setItem('caravan_onboarding_complete', 'true');
        onComplete();
    }, [displayName, username, selectedAvatar, updateProfile, onComplete]);

    const canProceed = () => {
        switch (step) {
            case 0: return true; // Welcome
            case 1: return displayName.trim().length >= 2 && username.trim().length >= 3;
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
                                🏕️
                            </motion.div>
                            <h1 className="text-3xl font-bold text-white mb-4">Welcome to Caravan</h1>
                            <p className="text-white/60 text-lg mb-8">
                                Your private space for connecting with the people who matter most.
                            </p>
                            <div className="space-y-4 text-left bg-white/5 rounded-2xl p-6">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🔒</span>
                                    <p className="text-white/80">Your data stays private</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">💬</span>
                                    <p className="text-white/80">Connect with family & friends</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🎮</span>
                                    <p className="text-white/80">Play games together</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 1: Name & Username */}
                    {step === 1 && (
                        <motion.div
                            key="name"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full max-w-md"
                        >
                            <h2 className="text-2xl font-bold text-white mb-2 text-center">What should we call you?</h2>
                            <p className="text-white/50 text-center mb-8">This is how you&apos;ll appear to others</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Display Name</label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={e => setDisplayName(e.target.value)}
                                        placeholder="Your name"
                                        className="w-full px-4 py-3 bg-white/5 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Username</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">@</span>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                            placeholder="username"
                                            className="w-full pl-8 pr-4 py-3 bg-white/5 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        />
                                    </div>
                                </div>
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
                                        {avatar.type === 'gradient' && displayName.charAt(0).toUpperCase()}
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
