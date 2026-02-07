'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL, apiFetch } from '@/lib/api';

// ============================================
// COMMUNITY JOIN PAGE
// Beautiful landing page for invite links shared
// via WhatsApp, SMS, Email, etc.
// ============================================

interface CommunityPreview {
    id: string;
    name: string;
    slug: string;
    description?: string;
    avatarUrl?: string;
    coverUrl?: string;
    category?: string;
    memberCount: number;
    isPrivate: boolean;
    creator: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
    };
}

export default function CommunityJoinPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.id as string; // 'id' matches the [id] route param, but works with slugs too
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();

    const [community, setCommunity] = useState<CommunityPreview | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [joined, setJoined] = useState(false);
    const [error, setError] = useState('');
    const [alreadyMember, setAlreadyMember] = useState(false);

    // Quick signup state (inline form)
    const [showSignup, setShowSignup] = useState(false);
    const [signupStep, setSignupStep] = useState(1);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [signupError, setSignupError] = useState('');
    const [signupLoading, setSignupLoading] = useState(false);

    const { signup } = useAuth();

    // Fetch community info (public endpoint)
    useEffect(() => {
        const fetchCommunity = async () => {
            try {
                const res = await fetch(`${API_URL}/api/v1/communities/${slug}`);
                if (!res.ok) throw new Error('Community not found');
                const data = await res.json();
                setCommunity(data);
                if (data.isMember) setAlreadyMember(true);
            } catch {
                setError('This community could not be found.');
            } finally {
                setLoading(false);
            }
        };
        if (slug) fetchCommunity();
    }, [slug]);

    // Store referral info
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlRef = new URLSearchParams(window.location.search).get('ref');
            if (urlRef) {
                localStorage.setItem('0g_referral_code', urlRef);
            }
            // Also store community to auto-join after signup
            if (slug) {
                localStorage.setItem('0g_pending_community', slug);
            }
        }
    }, [slug]);

    // Handle join for authenticated users
    const handleJoin = useCallback(async () => {
        if (!community || !isAuthenticated) return;
        setJoining(true);
        try {
            const res = await apiFetch(`${API_URL}/api/v1/communities/${community.id}/join`, {
                method: 'POST',
            });
            if (res.ok || res.status === 400) {
                setJoined(true);
                setTimeout(() => router.push(`/communities`), 1500);
            } else {
                setError('Failed to join. Please try again.');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setJoining(false);
        }
    }, [community, isAuthenticated, router]);

    // Handle inline signup
    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (signupStep === 1) {
            if (!email || !password || password.length < 8) {
                setSignupError('Password must be at least 8 characters');
                return;
            }
            setSignupError('');
            setSignupStep(2);
            return;
        }

        // Step 2: Complete signup
        if (!displayName.trim() || displayName.length < 2) {
            setSignupError('Name must be at least 2 characters');
            return;
        }

        setSignupLoading(true);
        setSignupError('');
        const username = displayName.toLowerCase().replace(/[^a-z0-9]/g, '');

        try {
            const result = await signup(email, password, username, displayName);
            if (result.success) {
                // After signup, auto-join the community
                setTimeout(async () => {
                    if (community) {
                        try {
                            await apiFetch(`${API_URL}/api/v1/communities/${community.id}/join`, {
                                method: 'POST',
                            });
                        } catch { /* community join will happen on next visit */ }
                    }
                    // Complete referral if present
                    const refCode = localStorage.getItem('0g_referral_code');
                    if (refCode) {
                        try {
                            await fetch(`${API_URL}/api/v1/invite/complete/${refCode}`, { method: 'POST' });
                        } catch { /* non-critical */ }
                        localStorage.removeItem('0g_referral_code');
                    }
                    localStorage.removeItem('0g_pending_community');
                    router.push('/onboarding');
                }, 500);
            } else {
                setSignupError(result.error || 'Signup failed');
            }
        } catch {
            setSignupError('Network error');
        } finally {
            setSignupLoading(false);
        }
    };

    // Category emoji mapping
    const categoryEmoji: Record<string, string> = {
        family: '🧬', friends: '⭕', business: '🤝',
        faith: '🕌', hobby: '⚔️', local: '🏘️',
    };

    // ---- RENDER ----

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 border-2 border-white/20 border-t-[#00D4FF] rounded-full"
                />
            </div>
        );
    }

    if (error && !community) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <p className="text-white/50 text-lg mb-4">{error}</p>
                    <Link href="/signup" className="text-[#00D4FF] hover:underline">
                        Join 0G instead →
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black relative overflow-hidden">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none">
                <motion.div
                    className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.12) 0%, rgba(139,92,246,0.06) 50%, transparent 70%)' }}
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-violet-500/8 blur-[120px]"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
                />
            </div>

            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
                {/* Logo */}
                <Link href="/" className="inline-flex items-center gap-2 mb-8">
                    <div className="text-2xl font-bold">
                        <span className="text-[#00D4FF]">0</span>
                        <span className="text-white">G</span>
                    </div>
                </Link>

                {/* Community Card */}
                {community && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full max-w-md"
                    >
                        {/* Cover Image */}
                        <div className="relative h-40 rounded-t-2xl overflow-hidden bg-gradient-to-br from-[#00D4FF]/20 to-[#8B5CF6]/20">
                            {community.coverUrl ? (
                                <Image src={community.coverUrl} alt="" fill className="object-cover" />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-[#00D4FF]/30 via-[#8B5CF6]/20 to-[#00D4FF]/10" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                            {/* Category Badge */}
                            {community.category && (
                                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs text-white/80 flex items-center gap-1">
                                    <span>{categoryEmoji[community.category] || '🌐'}</span>
                                    <span className="capitalize">{community.category}</span>
                                </div>
                            )}
                        </div>

                        {/* Community Info */}
                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 border-t-0 rounded-b-2xl px-6 pt-4 pb-6">
                            {/* Avatar */}
                            <div className="flex items-start gap-4 -mt-10">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-2xl font-bold text-black border-4 border-black overflow-hidden flex-shrink-0">
                                    {community.avatarUrl ? (
                                        <Image src={community.avatarUrl} alt="" width={64} height={64} className="object-cover" />
                                    ) : (
                                        <span>{community.name[0]?.toUpperCase()}</span>
                                    )}
                                </div>
                            </div>

                            <h1 className="text-2xl font-bold text-white mt-3">{community.name}</h1>

                            {community.description && (
                                <p className="text-white/50 text-sm mt-1 leading-relaxed line-clamp-3">
                                    {community.description}
                                </p>
                            )}

                            {/* Stats */}
                            <div className="flex items-center gap-4 mt-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="flex -space-x-1.5">
                                        {[...Array(Math.min(3, community.memberCount))].map((_, i) => (
                                            <div key={i} className="w-6 h-6 rounded-full bg-white/10 border border-black ring-1 ring-white/5" />
                                        ))}
                                    </div>
                                    <span className="text-white/60 text-sm ml-1">
                                        {community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}
                                    </span>
                                </div>
                                {community.isPrivate && (
                                    <span className="text-white/40 text-xs flex items-center gap-1">
                                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0110 0v4" />
                                        </svg>
                                        Private
                                    </span>
                                )}
                            </div>

                            {/* Created by */}
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                                <div className="w-5 h-5 rounded-full bg-white/10 overflow-hidden">
                                    {community.creator?.avatarUrl && (
                                        <Image src={community.creator.avatarUrl} alt="" width={20} height={20} className="object-cover" />
                                    )}
                                </div>
                                <span className="text-white/40 text-xs">
                                    Created by <span className="text-white/60">@{community.creator?.username}</span>
                                </span>
                            </div>

                            {/* Action Area */}
                            <div className="mt-6">
                                <AnimatePresence mode="wait">
                                    {/* Already joined */}
                                    {(joined || alreadyMember) && (
                                        <motion.div
                                            key="joined"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="text-center py-4"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                                                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth={2.5}>
                                                    <path d="M20 6L9 17l-5-5" />
                                                </svg>
                                            </div>
                                            <p className="text-emerald-400 font-medium">
                                                {alreadyMember ? 'You\'re already a member!' : 'Welcome aboard!'}
                                            </p>
                                            <Link href="/communities" className="text-[#00D4FF] text-sm mt-2 inline-block hover:underline">
                                                Go to Communities →
                                            </Link>
                                        </motion.div>
                                    )}

                                    {/* Authenticated but not yet joined */}
                                    {isAuthenticated && !joined && !alreadyMember && (
                                        <motion.div key="auth-join" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                            <button
                                                onClick={handleJoin}
                                                disabled={joining}
                                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-black font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                                            >
                                                {joining ? 'Joining...' : `Join ${community.name}`}
                                            </button>
                                        </motion.div>
                                    )}

                                    {/* Not authenticated -- show signup/login options */}
                                    {!isAuthenticated && !authLoading && !showSignup && (
                                        <motion.div
                                            key="guest-actions"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="space-y-3"
                                        >
                                            <p className="text-center text-white/40 text-xs mb-3">
                                                Join 0G to connect with this community
                                            </p>

                                            {/* Google Sign-in */}
                                            <button className="group w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-white hover:bg-white/95 transition-all text-[#1f1f1f] font-medium shadow-sm relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                                                <svg className="w-4 h-4 relative z-10" viewBox="0 0 24 24">
                                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                                </svg>
                                                <span className="relative z-10 text-sm">Continue with Google</span>
                                            </button>

                                            {/* Quick Signup */}
                                            <button
                                                onClick={() => setShowSignup(true)}
                                                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-black font-semibold hover:opacity-90 transition-opacity text-sm"
                                            >
                                                Create Account & Join
                                            </button>

                                            {/* Already have account */}
                                            <div className="text-center pt-1">
                                                <Link
                                                    href={`/login?redirect=/communities/${slug}/join`}
                                                    className="text-white/40 text-xs hover:text-white/60 transition-colors"
                                                >
                                                    Already on 0G? <span className="text-[#00D4FF]">Log in</span>
                                                </Link>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Inline Signup Form */}
                                    {!isAuthenticated && showSignup && (
                                        <motion.div
                                            key="signup-form"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            <form onSubmit={handleSignup} className="space-y-3">
                                                <AnimatePresence mode="wait">
                                                    {signupStep === 1 ? (
                                                        <motion.div
                                                            key="s1"
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, x: -10 }}
                                                            className="space-y-3"
                                                        >
                                                            <input
                                                                type="email"
                                                                value={email}
                                                                onChange={(e) => setEmail(e.target.value)}
                                                                placeholder="Email address"
                                                                required
                                                                autoFocus
                                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/20"
                                                            />
                                                            <input
                                                                type="password"
                                                                value={password}
                                                                onChange={(e) => setPassword(e.target.value)}
                                                                placeholder="Create password (8+ chars)"
                                                                minLength={8}
                                                                required
                                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/20"
                                                            />
                                                        </motion.div>
                                                    ) : (
                                                        <motion.div
                                                            key="s2"
                                                            initial={{ opacity: 0, x: 10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            className="space-y-3"
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => setSignupStep(1)}
                                                                className="text-xs text-white/40 hover:text-white/60"
                                                            >
                                                                ← Back
                                                            </button>
                                                            <input
                                                                type="text"
                                                                value={displayName}
                                                                onChange={(e) => setDisplayName(e.target.value)}
                                                                placeholder="What should we call you?"
                                                                maxLength={50}
                                                                autoFocus
                                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/20"
                                                            />
                                                            {displayName.length >= 2 && (
                                                                <p className="text-xs text-white/30">
                                                                    Your handle: @{displayName.toLowerCase().replace(/[^a-z0-9]/g, '')}
                                                                </p>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                {signupError && (
                                                    <p className="text-red-400 text-xs">{signupError}</p>
                                                )}

                                                <button
                                                    type="submit"
                                                    disabled={signupLoading}
                                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-black font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                                                >
                                                    {signupLoading ? 'Creating...' : signupStep === 1 ? 'Continue' : `Join ${community.name}`}
                                                </button>
                                            </form>

                                            <div className="text-center mt-3">
                                                <button
                                                    onClick={() => { setShowSignup(false); setSignupStep(1); }}
                                                    className="text-white/30 text-xs hover:text-white/50"
                                                >
                                                    ← Other options
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {error && !joined && (
                                    <p className="text-red-400 text-xs text-center mt-3">{error}</p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Footer */}
                <p className="text-white/20 text-xs mt-8 text-center">
                    0G — The next generation of social. Private. Authentic. Yours.
                </p>
            </div>
        </div>
    );
}
