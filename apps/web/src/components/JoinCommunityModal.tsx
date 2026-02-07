'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useFeedView } from '@/contexts/FeedViewContext';

/**
 * JoinCommunityModal — One-time opt-in to the larger community.
 *
 * Two choices:
 * 1. Use your existing identity (same username/name/avatar)
 * 2. Create a separate public persona (different name, username, avatar, bio)
 *
 * This is a privacy-first platform. The modal explains clearly what opting in means.
 */
export function JoinCommunityModal() {
    const { user } = useAuth();
    const { joinCommunity, setShowJoinModal } = useFeedView();

    const [step, setStep] = useState<'intro' | 'choose' | 'setup'>('intro');
    const [identityChoice, setIdentityChoice] = useState<'same' | 'separate' | null>(null);
    const [saving, setSaving] = useState(false);

    // Public profile fields (for "separate" identity)
    const [publicDisplayName, setPublicDisplayName] = useState('');
    const [publicUsername, setPublicUsername] = useState('');
    const [publicBio, setPublicBio] = useState('');

    const handleJoinWithSameIdentity = useCallback(async () => {
        setSaving(true);
        await joinCommunity({ usePublicProfile: false });
        setSaving(false);
    }, [joinCommunity]);

    const handleJoinWithPublicProfile = useCallback(async () => {
        if (!publicDisplayName.trim() || !publicUsername.trim()) return;
        setSaving(true);
        const success = await joinCommunity({
            usePublicProfile: true,
            publicDisplayName: publicDisplayName.trim(),
            publicUsername: publicUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
            publicBio: publicBio.trim() || undefined,
        });
        if (!success) {
            setSaving(false);
            // TODO: show error
        }
    }, [joinCommunity, publicDisplayName, publicUsername, publicBio]);

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowJoinModal(false)}
            >
                <motion.div
                    className="bg-[#0A0A0F] border border-white/10 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* ── Step 1: Intro — explain what joining means ── */}
                    {step === 'intro' && (
                        <div className="p-6 space-y-5">
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#00D4FF]/20 to-[#8B5CF6]/20 border border-[#00D4FF]/20 flex items-center justify-center">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2">Join the Community</h2>
                                <p className="text-white/50 text-sm leading-relaxed">
                                    Right now, you&apos;re in your private world — only your groups, family, and friends can see you.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">See the community feed</p>
                                        <p className="text-xs text-white/40 mt-0.5">Discover content, people, and conversations from the broader community</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Choose your identity</p>
                                        <p className="text-xs text-white/40 mt-0.5">Use your real name or create a separate public persona — it&apos;s your choice</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">Switch back anytime</p>
                                        <p className="text-xs text-white/40 mt-0.5">Toggle between your private circle and community feed with one tap from your dashboard, or leave the community entirely in Settings</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <p className="text-xs text-amber-300 leading-relaxed">
                                    <strong>Your private groups stay private.</strong> Community members will never see your private posts, group conversations, or even know your groups exist. Your private world remains completely separate. <strong>This is fully reversible</strong> — you can leave the community and return to private-only mode anytime from Settings.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowJoinModal(false)}
                                    className="flex-1 py-3 rounded-xl bg-white/[0.06] text-white/60 font-medium text-sm hover:bg-white/10 transition-colors"
                                >
                                    Stay Private
                                </button>
                                <button
                                    onClick={() => setStep('choose')}
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Step 2: Choose identity ── */}
                    {step === 'choose' && (
                        <div className="p-6 space-y-5">
                            <div className="text-center">
                                <h2 className="text-xl font-bold text-white mb-2">Choose Your Identity</h2>
                                <p className="text-white/50 text-sm">
                                    How do you want to appear in the community?
                                </p>
                            </div>

                            <div className="space-y-3">
                                {/* Option A: Same identity */}
                                <button
                                    onClick={() => setIdentityChoice('same')}
                                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                                        identityChoice === 'same'
                                            ? 'border-[#00D4FF]/50 bg-[#00D4FF]/10'
                                            : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.15]'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                                            {user?.avatarUrl ? (
                                                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold">
                                                    {user?.displayName?.[0] || 'U'}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white">{user?.displayName}</p>
                                            <p className="text-xs text-white/50">@{user?.username}</p>
                                        </div>
                                        <div className="ml-auto">
                                            <div className={`w-5 h-5 rounded-full border-2 ${
                                                identityChoice === 'same' ? 'border-[#00D4FF] bg-[#00D4FF]' : 'border-white/30'
                                            } flex items-center justify-center`}>
                                                {identityChoice === 'same' && (
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-white/40 mt-2">Use the same name, username, and avatar everywhere</p>
                                </button>

                                {/* Option B: Separate public persona */}
                                <button
                                    onClick={() => setIdentityChoice('separate')}
                                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                                        identityChoice === 'separate'
                                            ? 'border-[#8B5CF6]/50 bg-[#8B5CF6]/10'
                                            : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.15]'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/30 to-purple-500/30 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white">Create a Public Persona</p>
                                            <p className="text-xs text-white/50">Separate identity for the community</p>
                                        </div>
                                        <div className="ml-auto">
                                            <div className={`w-5 h-5 rounded-full border-2 ${
                                                identityChoice === 'separate' ? 'border-[#8B5CF6] bg-[#8B5CF6]' : 'border-white/30'
                                            } flex items-center justify-center`}>
                                                {identityChoice === 'separate' && (
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-white/40 mt-2">Your real identity stays hidden from the broader community</p>
                                </button>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('intro')}
                                    className="py-3 px-6 rounded-xl bg-white/[0.06] text-white/60 font-medium text-sm hover:bg-white/10 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => {
                                        if (identityChoice === 'same') {
                                            handleJoinWithSameIdentity();
                                        } else if (identityChoice === 'separate') {
                                            setStep('setup');
                                        }
                                    }}
                                    disabled={!identityChoice || saving}
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
                                >
                                    {saving ? 'Joining...' : identityChoice === 'same' ? 'Join Community' : 'Set Up Profile'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Step 3: Set up public profile ── */}
                    {step === 'setup' && (
                        <div className="p-6 space-y-5">
                            <div className="text-center">
                                <h2 className="text-xl font-bold text-white mb-2">Your Public Persona</h2>
                                <p className="text-white/50 text-sm">
                                    This is how you&apos;ll appear in the community feed. Your real identity stays private.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-white/50 mb-1.5 font-medium">Public Display Name *</label>
                                    <input
                                        type="text"
                                        value={publicDisplayName}
                                        onChange={(e) => setPublicDisplayName(e.target.value)}
                                        placeholder="e.g. Night Owl, Desert Rose"
                                        className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-white/30 focus:border-[#00D4FF]/50 focus:outline-none transition-colors"
                                        maxLength={50}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-white/50 mb-1.5 font-medium">Public Username *</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">@</span>
                                        <input
                                            type="text"
                                            value={publicUsername}
                                            onChange={(e) => setPublicUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                            placeholder="public_username"
                                            className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-white/30 focus:border-[#00D4FF]/50 focus:outline-none transition-colors"
                                            maxLength={30}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-white/50 mb-1.5 font-medium">Public Bio (optional)</label>
                                    <textarea
                                        value={publicBio}
                                        onChange={(e) => setPublicBio(e.target.value)}
                                        placeholder="A short bio for the community..."
                                        rows={2}
                                        className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-white/30 focus:border-[#00D4FF]/50 focus:outline-none transition-colors resize-none"
                                        maxLength={300}
                                    />
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                                <p className="text-xs text-violet-300 leading-relaxed">
                                    You can change your public persona anytime in Settings. Your private groups will always see your real identity.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('choose')}
                                    className="py-3 px-6 rounded-xl bg-white/[0.06] text-white/60 font-medium text-sm hover:bg-white/10 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleJoinWithPublicProfile}
                                    disabled={!publicDisplayName.trim() || !publicUsername.trim() || saving}
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
                                >
                                    {saving ? 'Setting up...' : 'Join Community'}
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
