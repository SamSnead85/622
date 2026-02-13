'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { PrivacyScore } from '@/components/security/PrivacyScore';

const COMPETITORS_TRACK = [
    { item: 'Your precise GPS location', icon: '📍', severity: 'high' },
    { item: 'Every app on your phone', icon: '📱', severity: 'high' },
    { item: 'Your browsing history', icon: '🌐', severity: 'high' },
    { item: 'Your contacts list', icon: '👥', severity: 'high' },
    { item: 'Your private messages for ad targeting', icon: '💬', severity: 'high' },
    { item: 'Your face biometrics', icon: '🔍', severity: 'high' },
    { item: 'How long you look at each post', icon: '👁', severity: 'medium' },
    { item: 'Your purchase history', icon: '💳', severity: 'medium' },
    { item: 'Your political views (inferred)', icon: '🏛', severity: 'medium' },
    { item: 'Your emotional state (inferred)', icon: '😢', severity: 'medium' },
    { item: 'Shadow profiles of non-users', icon: '👻', severity: 'high' },
    { item: 'Cross-app tracking via pixels', icon: '🔗', severity: 'high' },
    { item: 'Your microphone audio for ads', icon: '🎙', severity: 'high' },
    { item: 'WiFi networks you connect to', icon: '📶', severity: 'medium' },
    { item: 'Keyboard typing patterns', icon: '⌨️', severity: 'medium' },
];

const WE_COLLECT = [
    { item: 'Your email (for account recovery)', necessary: true },
    { item: 'Your posts (that you choose to share)', necessary: true },
    { item: 'Your connections (who you follow)', necessary: true },
    { item: 'Basic usage analytics (anonymized)', necessary: true },
];

const WE_NEVER = [
    'Sell your data to advertisers',
    'Read your encrypted messages',
    'Track you across other apps',
    'Build a psychological profile of you',
    'Share data with governments without a warrant',
    'Use your content to train AI without consent',
    'Manipulate your feed to maximize addiction',
    'Show you content designed to make you angry',
];

export default function TransparencyPage() {
    const [showComparison, setShowComparison] = useState(false);
    const [revealedItems, setRevealedItems] = useState<number>(0);
    const [privacyReviewed, setPrivacyReviewed] = useState(false);

    useEffect(() => {
        if (showComparison && revealedItems < COMPETITORS_TRACK.length) {
            const timer = setTimeout(() => setRevealedItems(r => r + 1), 150);
            return () => clearTimeout(timer);
        }
    }, [showComparison, revealedItems]);

    const handleReviewed = () => {
        localStorage.setItem('0g_privacy_reviewed', 'true');
        setPrivacyReviewed(true);
    };

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Hero */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />
                <div className="max-w-4xl mx-auto px-4 pt-16 pb-12 relative">
                    <motion.div
                        className="text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                            <svg width={40} height={40} viewBox="0 0 24 24" fill="#10B981">
                                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                            </svg>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                            What We <span className="text-emerald-400">Don&apos;t</span> Track
                        </h1>
                        <p className="text-white/50 text-lg max-w-2xl mx-auto">
                            Most social platforms know more about you than you know about yourself.
                            Here&apos;s the difference with ZeroG.
                        </p>
                    </motion.div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 pb-20">
                {/* The reveal */}
                {!showComparison ? (
                    <motion.div className="text-center py-12">
                        <button
                            onClick={() => { setShowComparison(true); setRevealedItems(0); }}
                            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 text-white font-semibold text-lg hover:from-red-500/30 hover:to-orange-500/30 transition-all"
                        >
                            See What Other Platforms Track About You
                        </button>
                    </motion.div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-8 mb-16">
                        {/* Left: What they track */}
                        <div>
                            <h2 className="text-red-400 font-semibold text-lg mb-4 flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-red-400" />
                                What They Track
                            </h2>
                            <div className="space-y-2">
                                {COMPETITORS_TRACK.map((item, i) => (
                                    <AnimatePresence key={i}>
                                        {i < revealedItems && (
                                            <motion.div
                                                initial={{ opacity: 0, x: -20, height: 0 }}
                                                animate={{ opacity: 1, x: 0, height: 'auto' }}
                                                className={`flex items-center gap-3 p-3 rounded-xl ${
                                                    item.severity === 'high' ? 'bg-red-500/10 border border-red-500/20' : 'bg-orange-500/10 border border-orange-500/10'
                                                }`}
                                            >
                                                <span className="text-lg">{item.icon}</span>
                                                <span className="text-white/80 text-sm">{item.item}</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                ))}
                            </div>
                        </div>

                        {/* Right: What WE collect */}
                        <div>
                            <h2 className="text-emerald-400 font-semibold text-lg mb-4 flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                                What ZeroG Collects
                            </h2>
                            <div className="space-y-2 mb-8">
                                {WE_COLLECT.map((item, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: revealedItems > 3 ? 1 : 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10"
                                    >
                                        <svg width={16} height={16} viewBox="0 0 24 24" fill="#10B981">
                                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                        </svg>
                                        <span className="text-white/80 text-sm">{item.item}</span>
                                    </motion.div>
                                ))}
                            </div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: revealedItems >= COMPETITORS_TRACK.length ? 1 : 0 }}
                                className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20"
                            >
                                <p className="text-emerald-400 font-bold text-3xl text-center mb-2">
                                    {COMPETITORS_TRACK.length - WE_COLLECT.length}
                                </p>
                                <p className="text-white/50 text-sm text-center">
                                    fewer data points collected than the average social platform
                                </p>
                            </motion.div>
                        </div>
                    </div>
                )}

                {/* Our Promises */}
                <motion.div
                    className="mb-16"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: showComparison && revealedItems >= COMPETITORS_TRACK.length ? 1 : 0 }}
                >
                    <h2 className="text-white font-bold text-2xl mb-6 text-center">Our Promises to You</h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                        {WE_NEVER.map((promise, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10"
                            >
                                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={3}>
                                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                                    </svg>
                                </div>
                                <span className="text-white/70 text-sm">We will <strong className="text-white">never</strong> {promise.toLowerCase()}</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Privacy Score + CTA */}
                {showComparison && revealedItems >= COMPETITORS_TRACK.length && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-md mx-auto"
                    >
                        <PrivacyScore />

                        {!privacyReviewed && (
                            <button
                                onClick={handleReviewed}
                                className="w-full mt-4 py-3 rounded-2xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors"
                            >
                                I&apos;ve Reviewed the Privacy Practices (+10 points)
                            </button>
                        )}

                        <div className="flex gap-3 mt-4">
                            <Link
                                href="/dashboard"
                                className="flex-1 py-3 rounded-2xl bg-white/10 text-white text-center text-sm font-medium hover:bg-white/15 transition-colors"
                            >
                                Back to Feed
                            </Link>
                            <Link
                                href="/settings"
                                className="flex-1 py-3 rounded-2xl bg-[#7C8FFF]/20 text-[#7C8FFF] text-center text-sm font-medium hover:bg-[#7C8FFF]/30 transition-colors"
                            >
                                Improve My Score
                            </Link>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
