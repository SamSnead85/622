'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        await new Promise((r) => setTimeout(r, 1200));
        router.push('/dashboard');
    };

    return (
        <div className="min-h-screen bg-gray-950 flex">
            {/* Left side - Form */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <motion.div
                    className="w-full max-w-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                    {/* Logo */}
                    <Link href="/" className="inline-flex items-center gap-2 mb-12">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                            <span className="text-gray-950 font-semibold text-sm">C</span>
                        </div>
                        <span className="font-semibold text-[15px]">Caravan</span>
                    </Link>

                    <h1 className="text-title-lg mb-2">Welcome back</h1>
                    <p className="text-body text-tertiary mb-8">
                        Sign in to your account to continue.
                    </p>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 text-caption">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-caption text-secondary mb-2">Email address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-body text-primary placeholder:text-muted focus:outline-none focus:border-gray-600 transition-colors duration-200"
                                placeholder="you@example.com"
                                required
                                autoFocus
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-caption text-secondary">Password</label>
                                <Link href="/forgot-password" className="text-caption text-tertiary hover:text-secondary transition-colors duration-200">
                                    Forgot password?
                                </Link>
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-body text-primary placeholder:text-muted focus:outline-none focus:border-gray-600 transition-colors duration-200"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-white text-gray-950 font-medium py-3 rounded-lg hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
                                    Signing in...
                                </span>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>

                    <div className="flex items-center gap-4 my-8">
                        <div className="flex-1 h-px bg-gray-800" />
                        <span className="text-micro text-muted">or</span>
                        <div className="flex-1 h-px bg-gray-800" />
                    </div>

                    <div className="space-y-3">
                        <button className="w-full flex items-center justify-center gap-3 bg-gray-900 border border-gray-800 py-3 rounded-lg hover:bg-gray-850 transition-colors duration-200">
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span className="text-caption">Continue with Google</span>
                        </button>
                        <button className="w-full flex items-center justify-center gap-3 bg-gray-900 border border-gray-800 py-3 rounded-lg hover:bg-gray-850 transition-colors duration-200">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                            </svg>
                            <span className="text-caption">Continue with Apple</span>
                        </button>
                    </div>

                    <p className="text-caption text-muted mt-8">
                        Don&apos;t have an account?{' '}
                        <Link href="/signup" className="text-secondary hover:text-primary transition-colors duration-200">
                            Create one
                        </Link>
                    </p>
                </motion.div>
            </div>

            {/* Right side - Visual */}
            <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-925 border-l border-gray-900 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-950" />
                <div className="relative text-center px-12">
                    <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 mx-auto mb-6 flex items-center justify-center">
                        <span className="text-4xl">👋</span>
                    </div>
                    <h2 className="text-title mb-3">Good to see you</h2>
                    <p className="text-body text-tertiary max-w-sm">
                        Your communities and conversations are waiting for you.
                    </p>
                </div>
            </div>
        </div>
    );
}
