'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL, apiFetch } from '@/lib/api';

// ============================================
// BRANDED COMMUNITY JOIN PAGE
// The group's identity is DOMINANT.
// 0G branding is subtle, secondary.
// Isolation messaging is crystal clear.
// ============================================

interface CommunityPreview {
    id: string;
    name: string;
    slug: string;
    description?: string;
    avatarUrl?: string;
    coverUrl?: string;
    logoUrl?: string;
    brandColor?: string;
    tagline?: string;
    category?: string;
    memberCount: number;
    isPrivate: boolean;
    isPublic?: boolean;
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
    const slug = params.id as string;
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();

    const [community, setCommunity] = useState<CommunityPreview | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [joined, setJoined] = useState(false);
    const [error, setError] = useState('');
    const [alreadyMember, setAlreadyMember] = useState(false);

    // Join mode — default to group-only for family/friends
    const [joinMode, setJoinMode] = useState<'full' | 'group-only'>('full');

    // Inline signup
    const [showSignup, setShowSignup] = useState(false);
    const [signupStep, setSignupStep] = useState(1);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [signupError, setSignupError] = useState('');
    const [signupLoading, setSignupLoading] = useState(false);
    const { signup } = useAuth();

    // Fetch community
    useEffect(() => {
        const fetchCommunity = async () => {
            try {
                const res = await fetch(`${API_URL}/api/v1/communities/${slug}`);
                if (!res.ok) throw new Error('Community not found');
                const data = await res.json();
                setCommunity(data);
                if (data.isMember) setAlreadyMember(true);
                // Default to group-only for family/friends categories
                if (['family', 'friends'].includes(data.category)) {
                    setJoinMode('group-only');
                }
            } catch {
                setError('This group could not be found.');
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
            if (urlRef) localStorage.setItem('0g_referral_code', urlRef);
            if (slug) localStorage.setItem('0g_pending_community', slug);
        }
    }, [slug]);

    // Handle join
    const handleJoin = useCallback(async () => {
        if (!community || !isAuthenticated) return;
        setJoining(true);
        try {
            await apiFetch(`${API_URL}/api/v1/communities/${community.id}/join`, { method: 'POST' });
            setJoined(true);
            setTimeout(() => router.push(`/communities/${community.slug || community.id}`), 1200);
        } catch {
            setError('Failed to join. Please try again.');
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
        if (!displayName.trim() || displayName.length < 2) {
            setSignupError('Name must be at least 2 characters');
            return;
        }
        setSignupLoading(true);
        setSignupError('');
        const username = displayName.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 100);
        try {
            const isGroupOnly = joinMode === 'group-only';
            const result = await signup(email, password, username, displayName, isGroupOnly && community ? {
                groupOnly: true,
                primaryCommunityId: community.id,
            } : undefined);
            if (result.success) {
                setTimeout(async () => {
                    if (community) {
                        try {
                            await apiFetch(`${API_URL}/api/v1/communities/${community.id}/join`, { method: 'POST' });
                        } catch { /* auto-join on next visit */ }
                    }
                    const refCode = localStorage.getItem('0g_referral_code');
                    if (refCode) {
                        try { await fetch(`${API_URL}/api/v1/invite/complete/${refCode}`, { method: 'POST' }); } catch { }
                        localStorage.removeItem('0g_referral_code');
                    }
                    localStorage.removeItem('0g_pending_community');
                    if (isGroupOnly && community) {
                        router.push(`/communities/${community.slug || community.id}`);
                    } else {
                        router.push('/onboarding');
                    }
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

    // ---- Derived values ----
    const brandColor = community?.brandColor || '#D4AF37';
    const isContained = community?.category ? ['family', 'friends'].includes(community.category) : false;
    const categoryLabel: Record<string, string> = {
        family: 'Family Group', friends: 'Friends Circle', business: 'Organization',
        faith: 'Community', hobby: 'Club', local: 'Local Group',
    };

    // ---- LOADING ----
    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    // ---- ERROR ----
    if (error && !community) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center px-4">
                <div className="text-center">
                    <p className="text-white/50 text-lg mb-4">{error}</p>
                    <Link href="/signup" className="text-[#D4AF37] hover:underline">Join 0G instead →</Link>
                </div>
            </div>
        );
    }

    if (!community) return null;

    return (
        <div className="min-h-screen bg-black relative overflow-hidden">
            {/* Ambient background — tinted with brand color */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-30" style={{ background: `radial-gradient(circle, ${brandColor}22, transparent 60%)` }} />
                <div className="absolute bottom-0 -left-20 w-[400px] h-[400px] rounded-full opacity-20" style={{ background: `radial-gradient(circle, ${brandColor}15, transparent 60%)` }} />
            </div>

            <div className="relative z-10 min-h-screen flex flex-col items-center px-4 py-8 sm:py-12">
                {/* Main Card */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-md"
                >
                    {/* ===== COVER / HERO ===== */}
                    <div className="relative h-36 sm:h-44 rounded-t-3xl overflow-hidden" style={{ background: community.coverUrl ? undefined : `linear-gradient(135deg, ${brandColor}55, ${brandColor}22, transparent)` }}>
                        {community.coverUrl && (
                            <Image src={community.coverUrl} alt="" fill className="object-cover" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-transparent to-transparent" />

                        {/* Category Badge */}
                        {community.category && categoryLabel[community.category] && (
                            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[11px] text-white/80">
                                {categoryLabel[community.category]}
                            </div>
                        )}

                        {/* Private badge */}
                        {(community.isPrivate || !community.isPublic) && (
                            <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[10px] text-white/60 flex items-center gap-1">
                                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                                </svg>
                                Private
                            </div>
                        )}
                    </div>

                    {/* ===== MAIN CARD BODY ===== */}
                    <div className="bg-[#0A0A0F] border border-white/[0.08] border-t-0 rounded-b-3xl px-6 pb-7">
                        {/* Group Logo/Avatar */}
                        <div className="-mt-8 mb-4">
                            <div
                                className="w-16 h-16 rounded-2xl overflow-hidden border-[3px] flex-shrink-0 flex items-center justify-center"
                                style={{
                                    borderColor: brandColor,
                                    background: (community.logoUrl || community.avatarUrl) ? '#000' : `${brandColor}15`,
                                }}
                            >
                                {(community.logoUrl || community.avatarUrl) ? (
                                    <Image src={community.logoUrl || community.avatarUrl!} alt="" width={64} height={64} className="object-cover w-full h-full" />
                                ) : (
                                    <span className="text-2xl font-bold" style={{ color: brandColor }}>
                                        {community.name[0]?.toUpperCase()}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Group Name */}
                        <h1 className="text-2xl font-bold text-white leading-tight">{community.name}</h1>

                        {/* Tagline or description */}
                        {(community.tagline || community.description) && (
                            <p className="text-white/50 text-sm mt-1.5 leading-relaxed line-clamp-3">
                                {community.tagline || community.description}
                            </p>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-3 mt-3.5">
                            <div className="flex items-center gap-1.5">
                                <div className="flex -space-x-1">
                                    {[...Array(Math.min(3, community.memberCount || 1))].map((_, i) => (
                                        <div key={i} className="w-5 h-5 rounded-full border border-[#0A0A0F]" style={{ backgroundColor: `${brandColor}33` }} />
                                    ))}
                                </div>
                                <span className="text-white/50 text-xs">
                                    {community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}
                                </span>
                            </div>
                            <span className="text-white/20">·</span>
                            <span className="text-white/40 text-xs">
                                by @{community.creator?.username}
                            </span>
                        </div>

                        {/* ===== ISOLATION GUARANTEE (for family/friends) ===== */}
                        {isContained && !joined && !alreadyMember && (
                            <div className="mt-5 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                                <div className="flex items-start gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth={2}>
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-emerald-400 text-sm font-semibold">Private &amp; Contained</p>
                                        <p className="text-white/40 text-xs mt-1 leading-relaxed">
                                            This is a <strong className="text-white/60">closed group</strong>. When you join:
                                        </p>
                                        <ul className="text-white/40 text-xs mt-1.5 space-y-1 leading-relaxed">
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-emerald-400 mt-0.5">✓</span>
                                                <span>You <strong className="text-white/60">only see content from this group</strong></span>
                                            </li>
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-emerald-400 mt-0.5">✓</span>
                                                <span>Your profile is <strong className="text-white/60">invisible</strong> to anyone outside</span>
                                            </li>
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-emerald-400 mt-0.5">✓</span>
                                                <span>No ads, no algorithms, no data selling</span>
                                            </li>
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-emerald-400 mt-0.5">✓</span>
                                                <span>You can upgrade to the full platform anytime</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ===== JOIN MODE SELECTOR (for non-contained groups) ===== */}
                        {!isContained && !isAuthenticated && !authLoading && !joined && !alreadyMember && (
                            <div className="mt-5">
                                <p className="text-white/40 text-[11px] font-medium mb-2 uppercase tracking-wider">How would you like to join?</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setJoinMode('full')}
                                        className={`rounded-xl p-3 text-left transition-all border ${joinMode === 'full' ? `bg-opacity-10 ring-1` : 'bg-white/[0.02] border-white/10 hover:border-white/20'}`}
                                        style={joinMode === 'full' ? { backgroundColor: `${brandColor}11`, borderColor: `${brandColor}44`, boxShadow: `0 0 0 1px ${brandColor}22` } : {}}
                                    >
                                        <span className={`text-xs font-semibold ${joinMode === 'full' ? '' : 'text-white/60'}`} style={joinMode === 'full' ? { color: brandColor } : {}}>Full Platform</span>
                                        <p className="text-[10px] text-white/35 mt-0.5">Group + explore 0G</p>
                                    </button>
                                    <button
                                        onClick={() => setJoinMode('group-only')}
                                        className={`rounded-xl p-3 text-left transition-all border ${joinMode === 'group-only' ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20' : 'bg-white/[0.02] border-white/10 hover:border-white/20'}`}
                                    >
                                        <span className={`text-xs font-semibold ${joinMode === 'group-only' ? 'text-emerald-400' : 'text-white/60'}`}>Group Only</span>
                                        <p className="text-[10px] text-white/35 mt-0.5">Private &amp; contained</p>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ===== ACTION AREA ===== */}
                        <div className="mt-5">
                            <AnimatePresence mode="wait">
                                {/* Already joined */}
                                {(joined || alreadyMember) && (
                                    <motion.div key="joined" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                                        <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${brandColor}22` }}>
                                            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth={2.5}><path d="M20 6L9 17l-5-5" /></svg>
                                        </div>
                                        <p className="font-semibold" style={{ color: brandColor }}>
                                            {alreadyMember ? 'You\'re already a member!' : 'Welcome to ' + community.name + '!'}
                                        </p>
                                        <Link href={`/communities/${community.slug || community.id}`} className="text-sm mt-2 inline-block hover:underline" style={{ color: brandColor }}>
                                            Enter {community.name} →
                                        </Link>
                                    </motion.div>
                                )}

                                {/* Authenticated — join button */}
                                {isAuthenticated && !joined && !alreadyMember && (
                                    <motion.div key="auth-join" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <button
                                            onClick={handleJoin}
                                            disabled={joining}
                                            className="w-full py-3.5 rounded-xl text-black font-bold hover:opacity-90 transition-all disabled:opacity-50 text-sm"
                                            style={{ backgroundColor: brandColor }}
                                        >
                                            {joining ? 'Joining...' : `Join ${community.name}`}
                                        </button>
                                    </motion.div>
                                )}

                                {/* Guest — sign up options */}
                                {!isAuthenticated && !authLoading && !showSignup && !joined && !alreadyMember && (
                                    <motion.div key="guest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                                        {/* Main CTA */}
                                        <button
                                            onClick={() => setShowSignup(true)}
                                            className="w-full py-3.5 rounded-xl text-black font-bold hover:opacity-90 transition-all text-sm"
                                            style={{ backgroundColor: isContained || joinMode === 'group-only' ? '#34d399' : brandColor }}
                                        >
                                            {isContained || joinMode === 'group-only'
                                                ? `Join ${community.name}`
                                                : `Create Account & Join`
                                            }
                                        </button>

                                        {/* Login with Google — redirect approach */}
                                        {!isContained && joinMode === 'full' && (
                                            <button
                                                onClick={() => {
                                                    localStorage.setItem('0g_pending_community', slug);
                                                    router.push(`/login?redirect=${encodeURIComponent(`/communities/${slug}/join`)}`);
                                                }}
                                                className="group w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-white hover:bg-white/95 transition-all text-[#1f1f1f] font-medium text-sm shadow-sm"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                                </svg>
                                                Continue with Google
                                            </button>
                                        )}

                                        {/* Already have account */}
                                        <div className="text-center">
                                            <Link
                                                href={`/login?redirect=/communities/${slug}/join`}
                                                className="text-white/40 text-xs hover:text-white/60 transition-colors"
                                            >
                                                Already have an account? <span style={{ color: brandColor }}>Log in</span>
                                            </Link>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Inline Signup Form */}
                                {!isAuthenticated && showSignup && !joined && !alreadyMember && (
                                    <motion.div key="signup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                        {/* Group-only badge */}
                                        {(isContained || joinMode === 'group-only') && (
                                            <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth={2}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                                                <span className="text-emerald-400 text-[11px] font-medium">
                                                    Private account — only visible inside {community.name}
                                                </span>
                                            </div>
                                        )}

                                        <form onSubmit={handleSignup} className="space-y-3">
                                            <AnimatePresence mode="wait">
                                                {signupStep === 1 ? (
                                                    <motion.div key="s1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
                                                        <input
                                                            type="email"
                                                            value={email}
                                                            onChange={(e) => setEmail(e.target.value)}
                                                            placeholder="Email address"
                                                            required
                                                            autoFocus
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/20"
                                                        />
                                                        <input
                                                            type="password"
                                                            value={password}
                                                            onChange={(e) => setPassword(e.target.value)}
                                                            placeholder="Create password (8+ characters)"
                                                            minLength={8}
                                                            required
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/20"
                                                        />
                                                    </motion.div>
                                                ) : (
                                                    <motion.div key="s2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
                                                        <button type="button" onClick={() => setSignupStep(1)} className="text-xs text-white/40 hover:text-white/60">← Back</button>
                                                        <input
                                                            type="text"
                                                            value={displayName}
                                                            onChange={(e) => setDisplayName(e.target.value)}
                                                            placeholder={isContained ? 'Your name (visible to group only)' : 'What should we call you?'}
                                                            maxLength={50}
                                                            autoFocus
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/20"
                                                        />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {signupError && <p className="text-red-400 text-xs">{signupError}</p>}

                                            <button
                                                type="submit"
                                                disabled={signupLoading}
                                                className="w-full py-3 rounded-xl text-black font-bold hover:opacity-90 transition-all disabled:opacity-50 text-sm"
                                                style={{ backgroundColor: isContained || joinMode === 'group-only' ? '#34d399' : brandColor }}
                                            >
                                                {signupLoading ? 'Creating account...' : signupStep === 1 ? 'Continue' : `Join ${community.name}`}
                                            </button>
                                        </form>

                                        <div className="text-center mt-3">
                                            <button onClick={() => { setShowSignup(false); setSignupStep(1); }} className="text-white/30 text-xs hover:text-white/50">← Other options</button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {error && !joined && !alreadyMember && (
                                <p className="text-red-400 text-xs text-center mt-3">{error}</p>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Footer — Subtle 0G branding */}
                <div className="mt-8 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <span className="text-white/15 text-[10px]">Powered by</span>
                        <Link href="/" className="flex items-center gap-1 text-white/25 hover:text-white/40 transition-colors">
                            <span className="font-bold text-xs">0G</span>
                        </Link>
                    </div>
                    <p className="text-white/15 text-[10px] max-w-xs mx-auto leading-relaxed">
                        {isContained || joinMode === 'group-only'
                            ? 'Your account exists only within this group. No social media exposure. You control your data.'
                            : 'Private by default. No ads. No tracking. You own your data.'
                        }
                    </p>
                </div>
            </div>
        </div>
    );
}
