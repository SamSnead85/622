'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL, apiFetch } from '@/lib/api';

export default function SignupPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { signup, isAuthenticated, isLoading: authLoading } = useAuth();
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);
    const [referralCode, setReferralCode] = useState<string | null>(null);
    const [referrerName, setReferrerName] = useState<string | null>(null);
    const [accessCode, setAccessCode] = useState(searchParams.get('code') || '');

    // Auto-generate username from name
    const generatedUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    useEffect(() => { setMounted(true); }, []);

    // Load referral code from URL or localStorage
    useEffect(() => {
        const ref = searchParams.get('ref') || localStorage.getItem('0g_referral_code');
        if (ref) {
            setReferralCode(ref);
            localStorage.setItem('0g_referral_code', ref);
            // Validate & get referrer info
            fetch(`${API_URL}/api/v1/invite/validate/${ref}`, { method: 'POST' })
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                    if (data?.sender?.displayName) {
                        setReferrerName(data.sender.displayName);
                    }
                })
                .catch(() => {});
        }
    }, [searchParams]);

    // Redirect if already authenticated
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.push('/onboarding');
        }
    }, [authLoading, isAuthenticated, router]);

    const handleStep1 = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        setError('');
        setStep(2);
    };

    const handleStep2 = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || name.length < 2) return;
        setIsLoading(true);
        setError('');

        try {
            const result = await signup(email, password, generatedUsername, name, { accessCode: accessCode || undefined });
            if (result.success) {
                // Post-signup: complete referral and auto-join pending community
                const ref = localStorage.getItem('0g_referral_code');
                const pendingCommunity = localStorage.getItem('0g_pending_community');

                // Complete referral attribution (non-blocking)
                if (ref) {
                    fetch(`${API_URL}/api/v1/invite/complete/${ref}`, { method: 'POST' }).catch(() => {});
                    localStorage.removeItem('0g_referral_code');
                }

                // Auto-join pending community (non-blocking)
                if (pendingCommunity) {
                    (async () => {
                        try {
                            const res = await fetch(`${API_URL}/api/v1/communities/${pendingCommunity}`);
                            if (res.ok) {
                                const data = await res.json();
                                if (data.id) {
                                    await apiFetch(`${API_URL}/api/v1/communities/${data.id}/join`, { method: 'POST' });
                                }
                            }
                        } catch { /* non-critical */ }
                        localStorage.removeItem('0g_pending_community');
                    })();
                }

                router.push('/onboarding');
            } else {
                setError(result.error || 'Signup failed. Please try again.');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!mounted) {
        return <div className="min-h-screen bg-black" />;
    }

    return (
        <div className="min-h-screen bg-black relative overflow-hidden">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none">
                {/* Electric blue orb - 0G signature */}
                <motion.div
                    className="absolute -top-20 -left-20 w-96 h-96 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.15) 0%, rgba(139,92,246,0.08) 50%, transparent 70%)' }}
                    animate={{ scale: [1, 1.2, 1], x: [0, 30, 0] }}
                    transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-violet-500/10 blur-[120px]"
                    animate={{ scale: [1, 1.3, 1], y: [0, 30, 0] }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute bottom-1/3 left-0 w-80 h-80 rounded-full bg-rose-500/8 blur-[100px]"
                    animate={{ scale: [1.2, 1, 1.2], x: [0, 20, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute top-1/2 right-0 w-64 h-64 rounded-full bg-rose-500/10 blur-[80px]"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                />
            </div>

            <div className="relative z-10 min-h-screen flex">
                {/* Left side - Form */}
                <div className="flex-1 flex items-center justify-center px-6 py-12">
                    <motion.div
                        className="w-full max-w-sm"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {/* Logo */}
                        <Link href="/" className="inline-flex items-center gap-3 mb-12">
                            <div className="text-3xl font-bold">
                                <span className="text-[#00D4FF]">0</span>
                                <span className="text-white">G</span>
                            </div>
                            <span className="font-semibold text-xl text-white/70">ZeroG</span>
                        </Link>

                        {/* Progress indicator */}
                        <div className="flex items-center gap-2 mb-8">
                            <motion.div
                                className="h-1 flex-1 rounded-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6]"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: step >= 1 ? 1 : 0 }}
                                style={{ originX: 0 }}
                            />
                            <motion.div
                                className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-gradient-to-r from-[#8B5CF6] to-[#00D4FF]' : 'bg-white/10'}`}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: step >= 2 ? 1 : 1 }}
                                style={{ originX: 0 }}
                            />
                        </div>

                        <AnimatePresence mode="wait">
                            {step === 1 ? (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {/* Referral Banner */}
                                    {referrerName && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mb-4 px-4 py-3 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/20"
                                        >
                                            <p className="text-[#00D4FF] text-sm font-medium">
                                                {referrerName} invited you to join 0G
                                            </p>
                                            <p className="text-white/40 text-xs mt-0.5">
                                                Create your account to connect
                                            </p>
                                        </motion.div>
                                    )}

                                    <h1 className="text-3xl font-bold text-white mb-2">Join ZeroG</h1>
                                    <p className="text-white/50 mb-8">
                                        Early access. Enter your invite code to create an account.
                                    </p>

                                    <form onSubmit={handleStep1} className="space-y-4">
                                        <div>
                                            <label className="block text-sm text-white/60 mb-2">Access Code *</label>
                                            <input
                                                type="text"
                                                value={accessCode}
                                                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all font-mono tracking-widest text-center text-lg"
                                                placeholder="ENTER CODE"
                                                required
                                                maxLength={20}
                                            />
                                            <p className="text-xs text-white/30 mt-1.5">
                                                Don&apos;t have a code?{' '}
                                                <Link href="/early-access" className="text-[#00D4FF]/70 hover:text-[#00D4FF] underline underline-offset-2">
                                                    Request early access
                                                </Link>
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm text-white/60 mb-2">Email address</label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all"
                                                placeholder="you@example.com"
                                                required
                                                autoFocus
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm text-white/60 mb-2">Password</label>
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all"
                                                placeholder="At least 8 characters"
                                                minLength={8}
                                                required
                                            />
                                        </div>

                                        <motion.button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-black font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {isLoading ? 'Creating account...' : 'Continue'}
                                        </motion.button>
                                    </form>

                                    <div className="mt-6 pt-6 border-t border-white/[0.06] text-center">
                                        <p className="text-xs text-white/30">
                                            Don&apos;t have a code?{' '}
                                            <Link href="/early-access" className="text-[#00D4FF]/60 hover:text-[#00D4FF] underline underline-offset-2">Request early access</Link>
                                        </p>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <button
                                        onClick={() => setStep(1)}
                                        className="flex items-center gap-2 text-sm text-white/50 hover:text-white/70 mb-8 transition-colors"
                                    >
                                        ← Back
                                    </button>

                                    <h1 className="text-3xl font-bold text-white mb-2">What should we call you?</h1>
                                    <p className="text-white/50 mb-8">
                                        Pick any name - no real name required
                                    </p>

                                    <form onSubmit={handleStep2} className="space-y-4">
                                        <div>
                                            <label className="block text-sm text-white/60 mb-2">Your Name</label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white text-lg placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all"
                                                placeholder="e.g. AbuJawad, Desert Eagle, etc."
                                                minLength={2}
                                                maxLength={50}
                                                required
                                                autoFocus
                                            />
                                            {name.length >= 2 && (
                                                <p className="text-xs text-white/40 mt-2">
                                                    Your @handle will be: <span className="text-[#00D4FF] font-medium">@{generatedUsername}</span>
                                                </p>
                                            )}
                                        </div>

                                        <motion.button
                                            type="submit"
                                            disabled={isLoading || name.trim().length < 2}
                                            className="w-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-black font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {isLoading ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                    Creating your account...
                                                </span>
                                            ) : (
                                                'Complete signup'
                                            )}
                                        </motion.button>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <p className="text-sm text-white/40 mt-8 text-center">
                            Already have an account?{' '}
                            <Link href="/login" className="text-[#00D4FF] hover:text-[#33DDFF] transition-colors">
                                Sign in
                            </Link>
                        </p>

                        <p className="text-xs text-white/30 mt-6 text-center">
                            By creating an account, you agree to our{' '}
                            <Link href="/terms" className="underline hover:text-white/50">Terms</Link> and{' '}
                            <Link href="/privacy" className="underline hover:text-white/50">Privacy Policy</Link>.
                        </p>
                    </motion.div>
                </div>

                {/* Right side - Visual */}
                <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-rose-900/20 to-orange-900/30" />
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=800&fit=crop')] bg-cover bg-center opacity-20" />

                    <motion.div
                        className="relative text-center px-12"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        {/* Floating elements */}
                        <div className="absolute -top-20 -left-10 flex gap-3">
                            {['🌄', '🎨', '📷'].map((emoji, i) => (
                                <motion.div
                                    key={i}
                                    className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur"
                                    animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
                                    transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
                                >
                                    <span className="text-xl">{emoji}</span>
                                </motion.div>
                            ))}
                        </div>

                        <motion.div
                            className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500/20 to-rose-500/20 border border-white/10 mx-auto mb-8 flex items-center justify-center backdrop-blur-xl"
                            animate={{ rotate: [0, -5, 0, 5, 0] }}
                            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <span className="text-5xl">🚀</span>
                        </motion.div>
                        <h2 className="text-3xl font-bold text-white mb-4">Break Free</h2>
                        <p className="text-lg text-white/50 max-w-md">
                            No algorithms weighing you down. No corporate control. Just you and your community.
                        </p>

                        {/* Floating elements right */}
                        <div className="absolute -bottom-16 -right-10 flex gap-3">
                            {['✨', '🎬', '💫'].map((emoji, i) => (
                                <motion.div
                                    key={i}
                                    className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur"
                                    animate={{ y: [0, 10, 0], rotate: [0, -5, 0] }}
                                    transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
                                >
                                    <span className="text-xl">{emoji}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
