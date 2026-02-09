'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { API_URL as API } from '@/lib/api';

export default function CompleteSignupPage() {
    const router = useRouter();
    const [user, setUser] = useState<{ username: string; displayName: string } | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Load current user info
    useEffect(() => {
        const stored = localStorage.getItem('0g_user');
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch {
                // No user data
            }
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('0g_token');
            const res = await fetch(`${API}/api/v1/auth/complete-signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();

            if (data.success) {
                // Update stored token and user
                localStorage.setItem('token', data.token);
                localStorage.setItem('0g_token', data.token);
                localStorage.setItem('0g_user', JSON.stringify(data.user));
                setSuccess(true);
            } else {
                setError(data.error || data.message || 'Could not complete signup.');
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-sm w-full text-center"
                >
                    <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Account Complete</h2>
                        <p className="text-sm text-white/50 mb-6">
                            You now have full access to ZeroG. Welcome aboard, @{user?.username}.
                        </p>
                        <div className="space-y-2.5">
                            <button
                                onClick={() => router.push('/onboarding')}
                                className="w-full py-3 rounded-xl bg-[#D4AF37] text-sm font-semibold text-white hover:bg-[#D4AF37]/90 transition-all"
                            >
                                Set Up Your Profile
                            </button>
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="w-full py-3 rounded-xl bg-white/5 border border-white/[0.08] text-sm text-white/60 hover:bg-white/10 transition-all"
                            >
                                Go to Dashboard
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0C] text-white">
            {/* Subtle background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full blur-[150px] opacity-5 bg-[#D4AF37]" />
                <div className="absolute bottom-1/4 right-1/3 w-64 h-64 rounded-full blur-[120px] opacity-5 bg-[#B8942D]" />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-[#D4AF37]">0G</span>
                    </div>
                </Link>
            </header>

            {/* Form */}
            <main className="relative z-10 max-w-sm mx-auto px-4 pt-8 sm:pt-16 pb-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {user && (
                        <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                {user.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">{user.displayName}</p>
                                <p className="text-xs text-white/40">@{user.username}</p>
                            </div>
                        </div>
                    )}

                    <h1 className="text-2xl font-bold tracking-tight mb-2">Complete Your Account</h1>
                    <p className="text-sm text-white/40 mb-8">
                        Add your email and create a password to unlock all features — post, comment, join communities, and more.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                autoFocus
                                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="At least 8 characters"
                                required
                                minLength={8}
                                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-white/50 mb-1.5">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Confirm your password"
                                required
                                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                            />
                        </div>

                        {error && (
                            <p className="text-xs text-red-400/80">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={submitting || !email || !password}
                            className="w-full py-3.5 rounded-xl bg-[#D4AF37] text-sm font-semibold text-white hover:bg-[#D4AF37]/90 transition-all disabled:opacity-40"
                        >
                            {submitting ? 'Setting up...' : 'Complete Signup'}
                        </button>
                    </form>

                    <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <p className="text-[10px] text-white/25 leading-relaxed">
                            By completing your account you agree to our{' '}
                            <Link href="/terms" className="underline">Terms</Link> and{' '}
                            <Link href="/privacy" className="underline">Privacy Policy</Link>.
                            You own your data. We will never sell it.
                        </p>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
