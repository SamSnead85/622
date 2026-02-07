'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface InviteData {
    valid: boolean;
    sender: {
        id: string;
        displayName: string;
        username: string;
        avatarUrl?: string;
        coverUrl?: string;
    };
    community?: {
        id: string;
        name: string;
        slug: string;
        avatarUrl?: string;
        coverUrl?: string;
        description?: string;
        memberCount: number;
    };
}

export default function JoinPage() {
    const { code } = useParams();
    const router = useRouter();
    const [invite, setInvite] = useState<InviteData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [username, setUsername] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [checkingUsername, setCheckingUsername] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [step, setStep] = useState<'welcome' | 'username' | 'success'>('welcome');

    // Validate invite code
    useEffect(() => {
        if (!code) return;
        (async () => {
            try {
                const res = await fetch(`${API}/api/v1/auth/validate-invite`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code }),
                });
                const data = await res.json();
                if (data.valid) {
                    setInvite(data);
                } else {
                    setError(data.error || 'This invite link is no longer valid.');
                }
            } catch {
                setError('Unable to validate invite. Please try again.');
            } finally {
                setLoading(false);
            }
        })();
    }, [code]);

    // Check username availability with debounce
    useEffect(() => {
        if (username.length < 3) {
            setUsernameError(username.length > 0 ? 'At least 3 characters' : '');
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setUsernameError('Letters, numbers, and underscores only');
            return;
        }
        setCheckingUsername(true);
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`${API}/api/v1/auth/check-username`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username }),
                });
                const data = await res.json();
                setUsernameError(data.available ? '' : 'Username taken');
            } catch {
                setUsernameError('');
            } finally {
                setCheckingUsername(false);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [username]);

    const handleJoin = async () => {
        if (!username || username.length < 3 || usernameError) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${API}/api/v1/auth/provisional-signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    displayName: username,
                    inviteCode: code,
                    communityId: invite?.community?.id,
                }),
            });
            const data = await res.json();
            if (data.token) {
                // Store the token and user info
                localStorage.setItem('token', data.token);
                localStorage.setItem('0g_token', data.token);
                localStorage.setItem('0g_user', JSON.stringify(data.user));
                localStorage.setItem('0g_referral_code', code as string);
                setStep('success');
            } else {
                setUsernameError(data.error || 'Could not create account.');
            }
        } catch {
            setUsernameError('Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // Background image: prefer community cover, then sender cover, then default
    const bgImage = invite?.community?.coverUrl
        || invite?.sender?.coverUrl
        || 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&h=800&fit=crop&q=80';

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center px-4">
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/30">
                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-white mb-2">Invite Not Found</h2>
                    <p className="text-sm text-white/40 mb-6">{error}</p>
                    <Link href="/" className="text-sm text-[#00D4FF] hover:underline">Visit ZeroG</Link>
                </div>
            </div>
        );
    }

    if (!invite) return null;

    return (
        <div className="min-h-screen bg-[#0A0A0C] text-white relative overflow-hidden">
            {/* Full-bleed background */}
            <div className="absolute inset-0">
                <img
                    src={bgImage}
                    alt=""
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-[#0A0A0C]" />
            </div>

            {/* ZeroG branding — subtle top-left */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-[#00D4FF]">0G</span>
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
                <AnimatePresence mode="wait">
                    {step === 'welcome' && (
                        <motion.div
                            key="welcome"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="max-w-sm w-full text-center"
                        >
                            {/* Inviter avatar */}
                            <div className="mb-6">
                                <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl">
                                    {invite.sender.avatarUrl && !invite.sender.avatarUrl.startsWith('preset:') ? (
                                        <img src={invite.sender.avatarUrl} alt={invite.sender.displayName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                                            {invite.sender.displayName.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
                                {invite.sender.displayName}
                            </h1>
                            <p className="text-sm text-white/50 mb-1">@{invite.sender.username}</p>

                            {invite.community ? (
                                <p className="text-sm text-white/60 mt-4 leading-relaxed">
                                    invited you to join <span className="text-white font-medium">{invite.community.name}</span> on ZeroG
                                </p>
                            ) : (
                                <p className="text-sm text-white/60 mt-4 leading-relaxed">
                                    invited you to join them on ZeroG
                                </p>
                            )}

                            {/* Community preview */}
                            {invite.community && (
                                <div className="mt-6 p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 overflow-hidden shrink-0">
                                            {invite.community.avatarUrl ? (
                                                <img src={invite.community.avatarUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white/40 text-sm font-bold">
                                                    {invite.community.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-semibold text-white">{invite.community.name}</p>
                                            <p className="text-[10px] text-white/40">{invite.community.memberCount} members</p>
                                        </div>
                                    </div>
                                    {invite.community.description && (
                                        <p className="text-xs text-white/40 mt-3 line-clamp-2 text-left">{invite.community.description}</p>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={() => setStep('username')}
                                className="w-full mt-8 py-3.5 rounded-2xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all"
                            >
                                Accept Invite
                            </button>

                            <p className="text-[10px] text-white/20 mt-4">
                                Already on ZeroG? <Link href="/login" className="text-white/40 underline">Sign in</Link>
                            </p>
                        </motion.div>
                    )}

                    {step === 'username' && (
                        <motion.div
                            key="username"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="max-w-sm w-full"
                        >
                            <button
                                onClick={() => setStep('welcome')}
                                className="flex items-center gap-2 text-sm text-white/40 hover:text-white/60 mb-6 transition-colors"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                                Back
                            </button>

                            <div className="p-6 sm:p-8 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10">
                                <h2 className="text-xl font-bold text-white mb-1">Pick a username</h2>
                                <p className="text-sm text-white/40 mb-6">
                                    This is how people will find you. You can change it later.
                                </p>

                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                        placeholder="your_username"
                                        autoFocus
                                        maxLength={30}
                                        className="w-full pl-9 pr-10 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-white/20 focus:outline-none focus:border-white/25 transition-colors"
                                    />
                                    {/* Status indicator */}
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {checkingUsername ? (
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
                                        ) : username.length >= 3 && !usernameError ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                                        ) : usernameError ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                        ) : null}
                                    </div>
                                </div>

                                {usernameError && (
                                    <p className="text-xs text-red-400/80 mt-2">{usernameError}</p>
                                )}

                                <button
                                    onClick={handleJoin}
                                    disabled={submitting || !username || username.length < 3 || !!usernameError || checkingUsername}
                                    className="w-full mt-5 py-3.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Joining...' : 'Join'}
                                </button>

                                <p className="text-[10px] text-white/15 text-center mt-4 leading-relaxed">
                                    You'll be able to browse and message right away.
                                    Full features unlock when you complete your profile.
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {step === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-sm w-full text-center"
                        >
                            <div className="p-8 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2">You're In</h2>
                                <p className="text-sm text-white/50 mb-1">Welcome, @{username}</p>
                                {invite.community && (
                                    <p className="text-xs text-white/30 mb-6">
                                        You've joined {invite.community.name}
                                    </p>
                                )}

                                <div className="space-y-2.5">
                                    {invite.community ? (
                                        <button
                                            onClick={() => router.push(`/communities/${invite.community!.slug || invite.community!.id}`)}
                                            className="w-full py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all"
                                        >
                                            Go to {invite.community.name}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => router.push('/dashboard')}
                                            className="w-full py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all"
                                        >
                                            Explore ZeroG
                                        </button>
                                    )}
                                    <button
                                        onClick={() => router.push('/complete-signup')}
                                        className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white/60 hover:bg-white/10 transition-all"
                                    >
                                        Complete Your Profile
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="absolute bottom-4 left-0 right-0 z-20 text-center">
                <p className="text-[10px] text-white/10">
                    ZeroG — Social Media, Reimagined
                </p>
            </div>
        </div>
    );
}
