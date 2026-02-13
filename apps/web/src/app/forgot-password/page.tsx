'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { API_URL } from '@/lib/api';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setStatus('submitting');

        try {
            const res = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            // Always show success message to prevent email enumeration
            setStatus('sent');
            setMessage('If an account exists with that email, you will receive a password reset link shortly.');
        } catch {
            setStatus('sent');
            setMessage('If an account exists with that email, you will receive a password reset link shortly.');
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-6">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.1) 0%, transparent 70%)' }} />
            </div>

            <motion.div
                className="w-full max-w-sm relative z-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Link href="/" className="inline-flex items-center gap-3 mb-12">
                    <div className="text-3xl font-bold">
                        <span className="text-[#7C8FFF]">0</span>
                        <span className="text-white">G</span>
                    </div>
                    <span className="font-semibold text-xl text-white/70">ZeroG</span>
                </Link>

                {status === 'sent' ? (
                    <div>
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-3 text-center">Check Your Email</h1>
                        <p className="text-white/50 text-sm text-center mb-8">{message}</p>
                        <Link href="/login" className="block text-center text-sm text-white/40 hover:text-white transition-colors">
                            Back to Sign In
                        </Link>
                    </div>
                ) : (
                    <>
                        <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
                        <p className="text-white/50 text-sm mb-8">Enter your email and we will send you a password reset link.</p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-white/60 mb-2">Email address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all"
                                    placeholder="you@example.com"
                                    required
                                    autoFocus
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={status === 'submitting'}
                                className="w-full py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all disabled:opacity-50"
                            >
                                {status === 'submitting' ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </form>

                        <p className="text-center mt-6 text-sm text-white/30">
                            Remember your password?{' '}
                            <Link href="/login" className="text-white/60 hover:text-white underline underline-offset-2">Sign in</Link>
                        </p>
                    </>
                )}
            </motion.div>
        </div>
    );
}
