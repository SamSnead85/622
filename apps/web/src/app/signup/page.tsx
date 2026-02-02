'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const checkUsername = async (value: string) => {
        if (value.length < 3) {
            setUsernameStatus('idle');
            return;
        }
        setUsernameStatus('checking');
        await new Promise((r) => setTimeout(r, 600));
        setUsernameStatus(value === 'taken' ? 'taken' : 'available');
    };

    const handleStep1 = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        setIsLoading(true);
        await new Promise((r) => setTimeout(r, 800));
        setIsLoading(false);
        setStep(2);
    };

    const handleStep2 = async (e: React.FormEvent) => {
        e.preventDefault();
        if (usernameStatus !== 'available') return;
        setIsLoading(true);
        await new Promise((r) => setTimeout(r, 1200));
        router.push('/dashboard');
    };

    if (!mounted) {
        return <div className="min-h-screen bg-[#050508]" />;
    }

    return (
        <div className="min-h-screen bg-[#050508] relative overflow-hidden">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none">
                <motion.div
                    className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-violet-500/10 blur-[120px]"
                    animate={{ scale: [1, 1.3, 1], y: [0, 30, 0] }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute bottom-1/3 left-0 w-80 h-80 rounded-full bg-cyan-500/10 blur-[100px]"
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
                            <svg width="40" height="40" viewBox="0 0 40 40">
                                <defs>
                                    <linearGradient id="signup-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#F59E0B" />
                                        <stop offset="50%" stopColor="#F43F5E" />
                                        <stop offset="100%" stopColor="#8B5CF6" />
                                    </linearGradient>
                                </defs>
                                <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="url(#signup-logo-grad)" />
                                <text x="20" y="24" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">6</text>
                            </svg>
                            <span className="font-semibold text-xl bg-gradient-to-r from-amber-400 via-rose-400 to-violet-400 bg-clip-text text-transparent">Six22</span>
                        </Link>

                        {/* Progress indicator */}
                        <div className="flex items-center gap-2 mb-8">
                            <motion.div
                                className="h-1 flex-1 rounded-full bg-gradient-to-r from-orange-400 to-rose-500"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: step >= 1 ? 1 : 0 }}
                                style={{ originX: 0 }}
                            />
                            <motion.div
                                className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-gradient-to-r from-rose-500 to-violet-500' : 'bg-white/10'}`}
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
                                    <h1 className="text-3xl font-bold text-white mb-2">Join the Movement</h1>
                                    <p className="text-white/50 mb-8">
                                        Find your tribe. Stand for what matters.
                                    </p>

                                    <form onSubmit={handleStep1} className="space-y-4">
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
                                            className="w-full bg-gradient-to-r from-orange-400 via-rose-500 to-violet-500 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {isLoading ? 'Creating account...' : 'Continue'}
                                        </motion.button>
                                    </form>

                                    <div className="flex items-center gap-4 my-8">
                                        <div className="flex-1 h-px bg-white/10" />
                                        <span className="text-xs text-white/30">or continue with</span>
                                        <div className="flex-1 h-px bg-white/10" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 py-3 rounded-xl hover:bg-white/10 transition-colors">
                                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                            </svg>
                                            <span className="text-sm text-white">Google</span>
                                        </button>
                                        <button className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 py-3 rounded-xl hover:bg-white/10 transition-colors">
                                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                                            </svg>
                                            <span className="text-sm text-white">Apple</span>
                                        </button>
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

                                    <h1 className="text-3xl font-bold text-white mb-2">Choose your username</h1>
                                    <p className="text-white/50 mb-8">
                                        This is how others will find and mention you.
                                    </p>

                                    <form onSubmit={handleStep2} className="space-y-4">
                                        <div>
                                            <label className="block text-sm text-white/60 mb-2">Username</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">@</span>
                                                <input
                                                    type="text"
                                                    value={username}
                                                    onChange={(e) => {
                                                        const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                                                        setUsername(value);
                                                        checkUsername(value);
                                                    }}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-10 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all"
                                                    placeholder="username"
                                                    minLength={3}
                                                    maxLength={30}
                                                    required
                                                    autoFocus
                                                />
                                                {usernameStatus !== 'idle' && (
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2">
                                                        {usernameStatus === 'checking' && (
                                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        )}
                                                        {usernameStatus === 'available' && (
                                                            <span className="text-emerald-400">✓</span>
                                                        )}
                                                        {usernameStatus === 'taken' && (
                                                            <span className="text-red-400">✗</span>
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-white/40 mt-2">
                                                Letters, numbers, and underscores only
                                            </p>
                                        </div>

                                        <motion.button
                                            type="submit"
                                            disabled={isLoading || usernameStatus !== 'available'}
                                            className="w-full bg-gradient-to-r from-orange-400 via-rose-500 to-violet-500 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {isLoading ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                            <Link href="/login" className="text-white/70 hover:text-white transition-colors">
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
                        <h2 className="text-3xl font-bold text-white mb-4">Your Tribe Awaits</h2>
                        <p className="text-lg text-white/50 max-w-md">
                            Connect with value-aligned communities who stand for justice and support one another.
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
