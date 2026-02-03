'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { apiFetch, API_ENDPOINTS } from '@/lib/api';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await apiFetch('/api/v1/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email }),
            });

            if (response.ok) {
                setIsSubmitted(true);
            } else {
                const data = await response.json();
                setError(data.error || 'Something went wrong. Please try again.');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050508] flex items-center justify-center px-4">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-orange-500/10 via-rose-500/5 to-violet-500/10 blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex flex-col items-center gap-3">
                        <svg width="56" height="56" viewBox="0 0 40 40" className="flex-shrink-0">
                            <defs>
                                <linearGradient id="forgot-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#F59E0B" />
                                    <stop offset="50%" stopColor="#F43F5E" />
                                    <stop offset="100%" stopColor="#8B5CF6" />
                                </linearGradient>
                            </defs>
                            <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="url(#forgot-logo-grad)" />
                            <text x="20" y="24" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">6</text>
                        </svg>
                        <span className="text-2xl font-bold"><span className="text-[#00D4FF]">0</span><span className="text-white">G</span></span>
                    </Link>
                </div>

                {/* Card */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
                    {isSubmitted ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center"
                        >
                            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">✉️</span>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
                            <p className="text-white/60 mb-6">
                                If an account exists with <span className="text-white">{email}</span>, you&apos;ll receive a password reset link shortly.
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                                Back to login
                            </Link>
                        </motion.div>
                    ) : (
                        <>
                            <h1 className="text-2xl font-bold text-white mb-2">Forgot password?</h1>
                            <p className="text-white/60 mb-6">
                                No worries, we&apos;ll send you a reset link.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Email address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || !email}
                                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-violet-500 text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Sending...
                                        </span>
                                    ) : (
                                        'Send reset link'
                                    )}
                                </button>
                            </form>

                            <div className="mt-6 text-center">
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 12H5M12 19l-7-7 7-7" />
                                    </svg>
                                    Back to login
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
