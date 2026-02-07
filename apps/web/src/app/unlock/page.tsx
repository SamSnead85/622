'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { API_URL } from '@/lib/api';

const API = API_URL;

export default function UnlockAccountPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;

        setLoading(true);
        setResult(null);

        try {
            const res = await fetch(`${API}/api/v1/auth/unlock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setResult({ success: true, message: data.message || 'Account unlocked successfully.' });
            } else {
                setResult({ success: false, message: data.error || 'Failed to unlock account.' });
            }
        } catch {
            setResult({ success: false, message: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Unlock Your Account</h1>
                    <p className="text-sm text-white/40 max-w-xs mx-auto">
                        Your account was locked via the emergency Panic Button.
                        Enter your credentials to restore access.
                    </p>
                </div>

                {/* Result */}
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`rounded-xl border p-4 mb-6 ${
                            result.success
                                ? 'border-emerald-500/20 bg-emerald-500/[0.05]'
                                : 'border-red-500/20 bg-red-500/[0.05]'
                        }`}
                    >
                        <p className={`text-sm ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                            {result.message}
                        </p>
                        {result.success && (
                            <Link
                                href="/login"
                                className="inline-block mt-3 text-sm text-[#00D4FF] hover:underline"
                            >
                                Go to login
                            </Link>
                        )}
                    </motion.div>
                )}

                {/* Form */}
                {!result?.success && (
                    <form onSubmit={handleUnlock} className="space-y-4">
                        <div>
                            <label className="text-xs text-white/40 block mb-1.5">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                required
                                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00D4FF]/30 transition"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-white/40 block mb-1.5">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00D4FF]/30 transition"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email || !password}
                            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold rounded-xl text-sm hover:opacity-90 transition disabled:opacity-50"
                        >
                            {loading ? 'Unlocking...' : 'Unlock Account'}
                        </button>
                    </form>
                )}

                {/* Info */}
                <div className="mt-8 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <h3 className="text-xs font-semibold text-white/60 mb-2">What happened?</h3>
                    <p className="text-[10px] text-white/30 leading-relaxed">
                        The Panic Button locks your account instantly for emergency protection.
                        All sessions are terminated and your profile becomes inaccessible.
                        Unlocking with your email and password restores full access.
                        If you have 2FA enabled, you will need it on your next login.
                    </p>
                </div>

                {/* Links */}
                <div className="mt-6 text-center space-y-2">
                    <Link href="/login" className="text-xs text-white/30 hover:text-white/50 transition block">
                        Back to login
                    </Link>
                    <Link href="/forgot-password" className="text-xs text-white/30 hover:text-white/50 transition block">
                        Forgot your password?
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
