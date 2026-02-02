'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleAuth, useAppleAuth } from '@/hooks/useOAuth';

// ============================================
// ISLAMIC GEOMETRIC PATTERN - Subtle Background
// ============================================
function IslamicPattern() {
    return (
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="islamic-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                    {/* 8-Pointed Star */}
                    <g fill="none" stroke="#D4AF37" strokeWidth="0.5">
                        <polygon points="40,8 45,20 58,20 48,28 52,40 40,32 28,40 32,28 22,20 35,20" />
                        <polygon points="40,8 45,20 58,20 48,28 52,40 40,32 28,40 32,28 22,20 35,20" transform="rotate(45 40 40)" />
                        <circle cx="40" cy="40" r="18" />
                        <circle cx="40" cy="40" r="8" />
                    </g>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#islamic-pattern)" />
        </svg>
    );
}

// ============================================
// CRESCENT MOON - Subtle Islamic Motif
// ============================================
function CrescentMoon({ className = '' }: { className?: string }) {
    return (
        <motion.svg
            className={className}
            viewBox="0 0 24 24"
            fill="currentColor"
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
            <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a6.5 6.5 0 0 1-7.54-7.54A9.06 9.06 0 0 0 12 3z" />
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
};

// Loading fallback for Suspense
function LoginLoading() {
    return <div className="min-h-screen bg-[#050508]" />;
}

function LoginPageContent() {
    const [mounted, setMounted] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const { login, isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    // OAuth handlers
    const handleOAuthSuccess = useCallback((user: { id: string; email: string; displayName: string; avatarUrl?: string }, token: string) => {
        localStorage.setItem('six22_token', token);
        // Redirect to dashboard
        const redirectPath = sessionStorage.getItem('six22_redirect');
        if (redirectPath) {
            sessionStorage.removeItem('six22_redirect');
            router.push(redirectPath);
        } else {
            router.push('/dashboard');
        }
    }, [router]);

    const handleOAuthError = useCallback((errorMsg: string) => {
        setError(errorMsg);
        setIsLoading(false);
    }, []);

    const { triggerGoogleLogin, isConfigured: googleConfigured } = useGoogleAuth(handleOAuthSuccess, handleOAuthError);
    const { triggerAppleLogin, isConfigured: appleConfigured } = useAppleAuth(handleOAuthSuccess, handleOAuthError);

    useEffect(() => { setMounted(true); }, []);

    // Check for auth error message from URL
    useEffect(() => {
        const authError = searchParams.get('error');
        if (authError === 'session_expired') {
            setError('Your session has expired. Please sign in again.');
        } else if (authError === 'auth_required') {
            setError('Please sign in to access that page.');
        }
    }, [searchParams]);

    // Redirect if already authenticated
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            const redirectPath = typeof window !== 'undefined'
                ? sessionStorage.getItem('six22_redirect')
                : null;
            if (redirectPath) {
                sessionStorage.removeItem('six22_redirect');
                router.push(redirectPath);
            } else {
                router.push('/dashboard');
            }
        }
    }, [isAuthenticated, authLoading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const result = await login(email, password, rememberMe);

        if (result.success) {
            const redirectPath = typeof window !== 'undefined'
                ? sessionStorage.getItem('six22_redirect')
                : null;
            if (redirectPath) {
                sessionStorage.removeItem('six22_redirect');
                router.push(redirectPath);
            } else {
                router.push('/dashboard');
            }
        } else {
            setError(result.error || 'Login failed');
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        setError('');
        setIsLoading(true);
        triggerGoogleLogin();
    };

    const handleAppleLogin = () => {
        setError('');
        triggerAppleLogin();
    };

    if (!mounted || authLoading) {
        return <div className="min-h-screen bg-[#050508]" />;
    }

    return (
        <div className="min-h-screen bg-[#050508] flex relative overflow-hidden">
            {/* Subtle Islamic Pattern Background */}
            <IslamicPattern />

            {/* Left Side - Form */}
            <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
                <motion.div
                    className="w-full max-w-md"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Logo with Hexagon */}
                    <Link href="/" className="flex items-center gap-3 mb-10">
                        <svg width="44" height="44" viewBox="0 0 40 40">
                            <defs>
                                <linearGradient id="login-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#D4AF37" />
                                    <stop offset="30%" stopColor="#F59E0B" />
                                    <stop offset="70%" stopColor="#F43F5E" />
                                    <stop offset="100%" stopColor="#8B5CF6" />
                                </linearGradient>
                            </defs>
                            <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="url(#login-logo-grad)" />
                            <text x="20" y="24" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">6</text>
                        </svg>
                        <span className="font-semibold text-2xl bg-gradient-to-r from-[#D4AF37] via-amber-400 to-rose-400 bg-clip-text text-transparent">Six22</span>
                    </Link>

                    {/* Heading with subtle crescent */}
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
                        <CrescentMoon className="w-6 h-6 text-[#D4AF37]/60" />
                    </div>
                    <p className="text-white/50 mb-8">Continue your journey with your tribe</p>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {error}
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-2">Email</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                                    {Icons.mail}
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-[#D4AF37]/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50 focus:bg-white/[0.07] transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-2">Password</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                                    {Icons.lock}
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-[#D4AF37]/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50 focus:bg-white/[0.07] transition-all"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                                >
                                    {showPassword ? Icons.eyeOff : Icons.eye}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me & Forgot Password */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded border-[#D4AF37]/30 bg-white/5 text-[#D4AF37] focus:ring-[#D4AF37]/50"
                                />
                                <span className="text-sm text-white/60">Remember me</span>
                            </label>
                            <Link href="/forgot-password" className="text-sm text-[#D4AF37]/70 hover:text-[#D4AF37] transition-colors">
                                Forgot password?
                            </Link>
                        </div>

                        {/* Submit Button - Gold gradient */}
                        <motion.button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#D4AF37] via-amber-500 to-rose-500 text-white font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#D4AF37]/20"
                            whileHover={{ scale: isLoading ? 1 : 1.01 }}
                            whileTap={{ scale: isLoading ? 1 : 0.99 }}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Sign in
                                    {Icons.arrow}
                                </>
                            )}
                        </motion.button>
                    </form>

                    {/* Divider with decorative elements */}
                    <div className="flex items-center gap-4 my-8">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
                        <span className="text-sm text-white/30 flex items-center gap-2">
                            <span className="text-[#D4AF37]/40">✦</span>
                            or continue with
                            <span className="text-[#D4AF37]/40">✦</span>
                        </span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
                    </div>

                    {/* Social Login */}
                    <div className="grid grid-cols-2 gap-3">
                        <motion.button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-[#D4AF37]/20 text-white/70 hover:bg-white/10 hover:text-white hover:border-[#D4AF37]/40 transition-all disabled:opacity-50"
                            whileTap={{ scale: 0.98 }}
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Google
                        </motion.button>
                        <motion.button
                            type="button"
                            onClick={handleAppleLogin}
                            disabled={isLoading}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-[#D4AF37]/20 text-white/70 hover:bg-white/10 hover:text-white hover:border-[#D4AF37]/40 transition-all disabled:opacity-50"
                            whileTap={{ scale: 0.98 }}
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                            </svg>
                            Apple
                        </motion.button>
                    </div>

                    {/* Sign Up Link */}
                    <p className="mt-8 text-center text-white/50">
                        New to Six22?{' '}
                        <Link href="/signup" className="text-[#D4AF37] font-medium hover:underline">
                            Join the journey
                        </Link>
                    </p>
                </motion.div>
            </div>

            {/* Right Side - Visual with Islamic Aesthetic */}
            <div className="hidden lg:flex flex-1 relative overflow-hidden">
                {/* Night sky gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a40] via-[#0a0a20] to-[#050510]" />

                {/* Subtle star field */}
                <div className="absolute inset-0">
                    {[...Array(50)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-1 h-1 bg-white rounded-full"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                opacity: 0.3 + Math.random() * 0.5,
                            }}
                            animate={{ opacity: [0.3, 0.8, 0.3] }}
                            transition={{
                                duration: 2 + Math.random() * 2,
                                repeat: Infinity,
                                delay: Math.random() * 2,
                            }}
                        />
                    ))}
                </div>

                {/* Ambient golden glow */}
                <motion.div
                    className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#D4AF37]/10 blur-[100px]"
                    animate={{ scale: [1, 1.2, 1], x: [0, 30, 0] }}
                    transition={{ duration: 8, repeat: Infinity }}
                />
                <motion.div
                    className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-violet-500/10 blur-[100px]"
                    animate={{ scale: [1.2, 1, 1.2] }}
                    transition={{ duration: 10, repeat: Infinity }}
                />

                {/* Content */}
                <div className="relative z-10 flex items-center justify-center w-full p-12">
                    <div className="text-center max-w-md">
                        {/* Large Crescent */}
                        <motion.div
                            className="text-[#D4AF37] mb-6 flex justify-center"
                            animate={{ rotate: [-5, 5, -5] }}
                            transition={{ duration: 4, repeat: Infinity }}
                        >
                            <svg className="w-20 h-20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a6.5 6.5 0 0 1-7.54-7.54A9.06 9.06 0 0 0 12 3z" />
                            </svg>
                        </motion.div>
                        <h2 className="text-3xl font-bold text-white mb-4">Your Tribe Awaits</h2>
                        <p className="text-white/60 mb-6">
                            A sanctuary for value-aligned communities.
                            Stand with those who stand for justice.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-[#D4AF37]/60 text-sm">
                            <span>✦</span>
                            <span>Year 622 • The Journey Begins</span>
                            <span>✦</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Wrap with Suspense for useSearchParams
export default function LoginPage() {
    return (
        <Suspense fallback={<LoginLoading />}>
            <LoginPageContent />
        </Suspense>
    );
}
