'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleAuth, useAppleAuth } from '@/hooks/useOAuth';


// ============================================
// PREMIUM LAYERED MESH BACKGROUND
// Modern aesthetic with depth and color layers
// ============================================
function PremiumMeshBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden">
            {/* Base dark */}
            <div className="absolute inset-0 bg-[#030305]" />

            {/* Large gradient orb - top left - electric blue */}
            <motion.div
                className="absolute -top-32 -left-32 w-[800px] h-[800px]"
                style={{
                    background: 'radial-gradient(circle at center, rgba(0, 212, 255, 0.15) 0%, rgba(139, 92, 246, 0.08) 30%, transparent 60%)',
                }}
                animate={{
                    scale: [1, 1.1, 1],
                    x: [0, 30, 0],
                    y: [0, 20, 0],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Medium gradient orb - bottom right - rose/violet */}
            <motion.div
                className="absolute -bottom-40 -right-40 w-[700px] h-[700px]"
                style={{
                    background: 'radial-gradient(circle at center, rgba(244, 63, 94, 0.12) 0%, rgba(139, 92, 246, 0.06) 40%, transparent 65%)',
                }}
                animate={{
                    scale: [1.1, 1, 1.1],
                    x: [0, -40, 0],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Accent orb - mid left - teal/cyan */}
            <motion.div
                className="absolute top-1/2 -left-20 w-[400px] h-[400px]"
                style={{
                    background: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.08) 0%, transparent 50%)',
                }}
                animate={{
                    y: [-50, 50, -50],
                    opacity: [0.5, 0.8, 0.5],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Mesh grid overlay - very subtle */}
            <div
                className="absolute inset-0 opacity-[0.02]"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(212, 175, 55, 0.3) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(212, 175, 55, 0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: '60px 60px',
                }}
            />

            {/* Noise texture for premium feel */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />

            {/* Bottom gradient fade */}
            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#030305] to-transparent" />

            {/* Left side accent line */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#00D4FF]/20 to-transparent" />
        </div>
    );
}

// ============================================
// SIX22 HEXAGONAL LOGO
// ============================================
function HexLogo({ size = 48 }: { size?: number }) {
    return (
        <motion.svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        >
            <defs>
                <linearGradient id="login-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#D4AF37" />
                    <stop offset="35%" stopColor="#F59E0B" />
                    <stop offset="65%" stopColor="#F43F5E" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
                <filter id="login-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Outer hex frame */}
            <polygon
                points="50,5 90,27 90,73 50,95 10,73 10,27"
                fill="none"
                stroke="url(#login-logo-grad)"
                strokeWidth="2"
                filter="url(#login-glow)"
            />

            {/* Inner hex fill */}
            <polygon
                points="50,15 80,32 80,68 50,85 20,68 20,32"
                fill="url(#login-logo-grad)"
            />

            {/* The "6" */}
            <text
                x="50"
                y="58"
                textAnchor="middle"
                fill="white"
                fontSize="36"
                fontWeight="800"
                fontFamily="'Outfit', sans-serif"
            >
                6
            </text>
        </motion.svg>
    );
}

// SVG Icons
const Icons = {
    eye: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    eyeOff: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>
    ),
    mail: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
    ),
    lock: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
    ),
    arrow: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
    ),
    google: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
    ),
};

// Loading fallback for Suspense
function LoginLoading() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-[#00D4FF]/20 border-t-[#00D4FF] animate-spin" />
        </div>
    );
}

// Main login content
function LoginContent() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const router = useRouter();
    const searchParams = useSearchParams();
    const { login, isAuthenticated } = useAuth();

    const handleOAuthSuccess = useCallback((user: { id: string; email: string; displayName: string; avatarUrl?: string }, token: string) => {
        // Store token and redirect
        localStorage.setItem('0g_token', token);
        router.push(searchParams.get('redirect') || '/dashboard');
    }, [router, searchParams]);

    const handleOAuthError = useCallback((error: string) => {
        setError(error);
    }, []);

    const { triggerGoogleLogin, renderGoogleButton, isConfigured: googleConfigured, isLibraryLoaded: googleLoaded, isLoading: googleLoading } = useGoogleAuth(handleOAuthSuccess, handleOAuthError);
    const { triggerAppleLogin, isConfigured: appleConfigured } = useAppleAuth(handleOAuthSuccess, handleOAuthError);

    // Render Google button when library loads
    useEffect(() => {
        if (googleLoaded && googleConfigured) {
            renderGoogleButton('google-signin-button');
        }
    }, [googleLoaded, googleConfigured, renderGoogleButton]);

    const redirect = searchParams.get('redirect') || '/dashboard';

    useEffect(() => {
        if (isAuthenticated) {
            router.push(redirect);
        }
    }, [isAuthenticated, router, redirect]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await login(email, password);
            if (result.success) {
                router.push(redirect);
            } else {
                setError(result.error || 'Login failed. Please try again.');
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Login failed. Please try again.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [email, password, login, router, redirect]);

    return (
        <div className="min-h-screen flex">
            {/* Left side - Premium visual */}
            <div className="hidden lg:flex lg:w-1/2 relative">
                <PremiumMeshBackground />

                <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-center"
                    >
                        {/* 0G Logo */}
                        <div className="text-6xl font-bold">
                            <span className="text-[#00D4FF]">0</span>
                            <span className="text-white">G</span>
                        </div>
                        <h2 className="mt-8 text-3xl font-bold text-white">
                            Welcome Back
                        </h2>
                        <p className="mt-4 text-lg text-white/50 max-w-md">
                            The weightless social network. No algorithms weighing you down.
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Right side - Login form */}
            <div className="w-full lg:w-1/2 flex flex-col bg-black">
                {/* Back to home */}
                <div className="p-6">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        Home
                    </Link>
                </div>

                {/* Form container */}
                <div className="flex-1 flex items-center justify-center px-6 py-12">
                    <motion.div
                        className="w-full max-w-md"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        {/* Mobile logo */}
                        <div className="lg:hidden flex justify-center mb-8">
                            <div className="text-4xl font-bold">
                                <span className="text-[#00D4FF]">0</span>
                                <span className="text-white">G</span>
                            </div>
                        </div>

                        <h1 className="text-3xl font-bold text-white text-center mb-2">
                            Log in to 0G
                        </h1>
                        <p className="text-white/50 text-center mb-8">
                            Continue your journey
                        </p>

                        {/* OAuth buttons */}
                        <div className="space-y-3 mb-6">
                            {/* Google Sign-In - rendered by Google's library for maximum compatibility */}
                            <div className="flex flex-col items-center">
                                <div
                                    id="google-signin-button"
                                    className="w-full flex justify-center min-h-[44px]"
                                />
                                {/* Fallback if button doesn't render */}
                                {googleConfigured && !googleLoaded && (
                                    <button
                                        onClick={triggerGoogleLogin}
                                        disabled={googleLoading}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all text-white text-sm font-medium disabled:opacity-50"
                                    >
                                        {googleLoading ? (
                                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            Icons.google
                                        )}
                                        {googleLoading ? 'Signing in...' : 'Continue with Google'}
                                    </button>
                                )}
                            </div>

                            {/* Apple Sign-In */}
                            <button
                                onClick={triggerAppleLogin}
                                disabled={!appleConfigured}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all text-white text-sm font-medium disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                                </svg>
                                Apple
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="flex-1 h-px bg-white/10" />
                            <span className="text-white/30 text-sm">Or continue with</span>
                            <div className="flex-1 h-px bg-white/10" />
                        </div>

                        {/* Error message */}
                        {error && (
                            <motion.div
                                className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                {error}
                            </motion.div>
                        )}

                        {/* Login form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">
                                    Email
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your email address"
                                        required
                                        className="w-full px-4 py-3 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#00D4FF]/50 focus:ring-1 focus:ring-[#00D4FF]/50 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-white/70">
                                        Password
                                    </label>
                                    <Link
                                        href="/forgot-password"
                                        className="text-sm text-[#00D4FF] hover:text-[#33DDFF] transition-colors"
                                    >
                                        Forgot Password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter a unique password"
                                        required
                                        className="w-full px-4 py-3 pr-12 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#00D4FF]/50 focus:ring-1 focus:ring-[#00D4FF]/50 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                                    >
                                        {showPassword ? Icons.eyeOff : Icons.eye}
                                    </button>
                                </div>
                            </div>

                            {/* Submit button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 rounded-lg bg-white/[0.05] border border-white/10 text-white font-medium hover:bg-white/[0.08] hover:border-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                        Signing in...
                                    </div>
                                ) : (
                                    'Log in'
                                )}
                            </button>
                        </form>

                        {/* Sign up link */}
                        <p className="mt-8 text-center text-white/50">
                            New to 0G?{' '}
                            <Link
                                href="/signup"
                                className="text-[#00D4FF] hover:text-[#33DDFF] font-medium transition-colors"
                            >
                                Join Zero Gravity
                            </Link>
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

// Export with Suspense wrapper
export default function LoginPage() {
    return (
        <Suspense fallback={<LoginLoading />}>
            <LoginContent />
        </Suspense>
    );
}
