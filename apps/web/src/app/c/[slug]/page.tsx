'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface CampaignData {
    id: string;
    slug: string;
    title: string;
    description: string;
    type: string;
    status: string;
    coverUrl?: string;
    logoUrl?: string;
    brandColor?: string;
    eventDate?: string;
    eventLocation?: string;
    eventCity?: string;
    incentiveType?: string;
    incentiveValue?: string;
    incentiveRules?: string;
    raffleDrawDate?: string;
    signupGoal: number;
    signupCount: number;
    partnerName?: string;
    partnerLogo?: string;
    partnerUrl?: string;
}

export default function CampaignPage() {
    const { slug } = useParams();
    const [campaign, setCampaign] = useState<CampaignData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [signupForm, setSignupForm] = useState({ name: '', email: '', phone: '' });
    const [signupResult, setSignupResult] = useState<{ message: string; accessCode?: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!slug) return;
        fetch(`${API}/api/v1/campaigns/${slug}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) setError(data.error);
                else setCampaign(data);
            })
            .catch(() => setError('Unable to load campaign'))
            .finally(() => setLoading(false));
    }, [slug]);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!signupForm.name || !signupForm.email) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${API}/api/v1/campaigns/${slug}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...signupForm, source: 'link' }),
            });
            const data = await res.json();
            if (data.success) {
                setSignupResult({ message: data.message, accessCode: data.accessCode });
            } else {
                setError(data.error || 'Signup failed');
            }
        } catch {
            setError('Unable to sign up. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full animate-spin" />
            </div>
        );
    }

    if (error && !campaign) {
        return (
            <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center px-4">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/30">
                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>
                    <p className="text-white/50 mb-4">Campaign not found</p>
                    <Link href="/" className="text-[#00D4FF] text-sm hover:underline">Go to ZeroG</Link>
                </div>
            </div>
        );
    }

    if (!campaign) return null;

    const progress = Math.min((campaign.signupCount / campaign.signupGoal) * 100, 100);
    const brandColor = campaign.brandColor || '#00D4FF';

    return (
        <div className="min-h-screen bg-[#0A0A0C] text-white">
            {/* Hero */}
            <div className="relative overflow-hidden">
                {campaign.coverUrl ? (
                    <div className="absolute inset-0">
                        <img src={campaign.coverUrl} alt="" className="w-full h-full object-cover opacity-30" />
                        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0C]/60 via-[#0A0A0C]/80 to-[#0A0A0C]" />
                    </div>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0C] via-[#111] to-[#0A0A0C]">
                        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-15" style={{ background: brandColor }} />
                        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-[100px] opacity-10" style={{ background: brandColor }} />
                    </div>
                )}

                <div className="relative max-w-3xl mx-auto px-4 pt-12 sm:pt-20 pb-12">
                    {/* ZeroG branding */}
                    <div className="flex items-center gap-2 mb-8">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${brandColor}15`, border: `1px solid ${brandColor}30` }}>
                            <span className="text-xs font-bold" style={{ color: brandColor }}>0G</span>
                        </div>
                        <span className="text-xs text-white/40 tracking-wider uppercase">Powered by ZeroG</span>
                    </div>

                    {/* Partner info */}
                    {campaign.partnerName && (
                        <div className="flex items-center gap-3 mb-6">
                            {campaign.partnerLogo ? (
                                <img src={campaign.partnerLogo} alt={campaign.partnerName} className="w-10 h-10 rounded-xl object-cover" />
                            ) : (
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                    <span className="text-sm font-semibold text-white/60">{campaign.partnerName.charAt(0)}</span>
                                </div>
                            )}
                            <div>
                                <span className="text-sm text-white/70">{campaign.partnerName}</span>
                                {campaign.eventCity && (
                                    <p className="text-xs text-white/40">{campaign.eventCity}</p>
                                )}
                            </div>
                        </div>
                    )}

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl sm:text-5xl font-bold tracking-tight mb-4 leading-tight"
                    >
                        {campaign.title}
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-base sm:text-lg text-white/60 leading-relaxed max-w-2xl"
                    >
                        {campaign.description}
                    </motion.p>

                    {/* Event details */}
                    {(campaign.eventDate || campaign.eventLocation) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-wrap gap-4 mt-6"
                        >
                            {campaign.eventDate && (
                                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/40">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                    <span className="text-sm text-white/70">{new Date(campaign.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                            )}
                            {campaign.eventLocation && (
                                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/40">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                                    </svg>
                                    <span className="text-sm text-white/70">{campaign.eventLocation}</span>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Signup section */}
            <div className="max-w-3xl mx-auto px-4 pb-20">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Incentive card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="lg:col-span-2"
                    >
                        {campaign.incentiveType && (
                            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                                <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center" style={{ background: `${brandColor}15`, border: `1px solid ${brandColor}25` }}>
                                    {campaign.incentiveType === 'raffle' ? (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                                    ) : campaign.incentiveType === 'gift_card' ? (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="1.5"><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M12 8V21" /><path d="M3 12h18" /><path d="M12 8c-2-3-6-3-6 0s4 3 6 0" /><path d="M12 8c2-3 6-3 6 0s-4 3-6 0" /></svg>
                                    ) : (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                    )}
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-1">
                                    {campaign.incentiveType === 'raffle' ? 'Enter the Drawing' :
                                        campaign.incentiveType === 'gift_card' ? 'Signup Reward' : 'Get Early Access'}
                                </h3>
                                {campaign.incentiveValue && (
                                    <p className="text-sm font-medium mb-2" style={{ color: brandColor }}>{campaign.incentiveValue}</p>
                                )}
                                {campaign.incentiveRules && (
                                    <p className="text-xs text-white/40 leading-relaxed">{campaign.incentiveRules}</p>
                                )}
                                {campaign.raffleDrawDate && (
                                    <p className="text-xs text-white/30 mt-3">Drawing: {new Date(campaign.raffleDrawDate).toLocaleDateString()}</p>
                                )}
                            </div>
                        )}

                        {/* Progress */}
                        <div className="mt-4 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs text-white/40 uppercase tracking-wider">Community Goal</span>
                                <span className="text-sm font-medium" style={{ color: brandColor }}>{campaign.signupCount} / {campaign.signupGoal}</span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{ background: `linear-gradient(90deg, ${brandColor}, ${brandColor}80)` }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 1.5, ease: 'easeOut' }}
                                />
                            </div>
                        </div>

                        {/* What is ZeroG */}
                        <div className="mt-4 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                            <h4 className="text-sm font-semibold text-white mb-3">What is ZeroG?</h4>
                            <div className="space-y-2.5">
                                {[
                                    'A social platform where you own your data',
                                    'Private communities with real people',
                                    'No algorithms. No ads. No bots.',
                                    '100% Palestinian-built. Community-first.',
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="2" className="mt-0.5 shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
                                        <span className="text-xs text-white/50">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Signup form */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="lg:col-span-3"
                    >
                        <AnimatePresence mode="wait">
                            {signupResult ? (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center"
                                >
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: `${brandColor}15` }}>
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-2">You're In</h3>
                                    <p className="text-sm text-white/50 mb-6">{signupResult.message}</p>
                                    {signupResult.accessCode && (
                                        <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] mb-6">
                                            <p className="text-xs text-white/40 mb-1">Your Access Code</p>
                                            <p className="text-xl font-mono font-bold tracking-wider" style={{ color: brandColor }}>{signupResult.accessCode}</p>
                                        </div>
                                    )}
                                    <div className="flex gap-3 justify-center">
                                        <Link
                                            href="/signup"
                                            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
                                            style={{ background: brandColor }}
                                        >
                                            Join ZeroG Now
                                        </Link>
                                        <Link
                                            href="/"
                                            className="px-6 py-2.5 rounded-xl bg-white/5 text-sm font-medium text-white/70 hover:bg-white/10 transition-all"
                                        >
                                            Learn More
                                        </Link>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.form
                                    key="form"
                                    onSubmit={handleSignup}
                                    className="p-6 sm:p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
                                >
                                    <h3 className="text-xl font-semibold text-white mb-1">
                                        {campaign.type === 'raffle' ? 'Enter the Drawing' :
                                            campaign.type === 'event' ? 'RSVP to This Event' : 'Sign Up'}
                                    </h3>
                                    <p className="text-sm text-white/40 mb-6">
                                        {campaign.incentiveValue
                                            ? `Sign up for a chance to win ${campaign.incentiveValue}`
                                            : 'Join the community and get early access to ZeroG'}
                                    </p>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs text-white/40 mb-1.5">Full Name</label>
                                            <input
                                                type="text"
                                                value={signupForm.name}
                                                onChange={e => setSignupForm(p => ({ ...p, name: e.target.value }))}
                                                placeholder="Your name"
                                                required
                                                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-white/40 mb-1.5">Email</label>
                                            <input
                                                type="email"
                                                value={signupForm.email}
                                                onChange={e => setSignupForm(p => ({ ...p, email: e.target.value }))}
                                                placeholder="you@example.com"
                                                required
                                                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-white/40 mb-1.5">Phone <span className="text-white/20">(optional)</span></label>
                                            <input
                                                type="tel"
                                                value={signupForm.phone}
                                                onChange={e => setSignupForm(p => ({ ...p, phone: e.target.value }))}
                                                placeholder="+1 (555) 000-0000"
                                                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <p className="text-red-400/80 text-xs mt-3">{error}</p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full mt-6 py-3.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                                        style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}90)` }}
                                    >
                                        {submitting ? 'Signing Up...' :
                                            campaign.incentiveType === 'raffle' ? 'Enter Drawing' :
                                                campaign.type === 'event' ? 'RSVP Now' : 'Get Early Access'}
                                    </button>

                                    <p className="text-[10px] text-white/20 text-center mt-4 leading-relaxed">
                                        By signing up you agree to ZeroG's{' '}
                                        <Link href="/terms" className="underline hover:text-white/40">Terms of Service</Link>{' '}
                                        and{' '}
                                        <Link href="/privacy" className="underline hover:text-white/40">Privacy Policy</Link>.
                                        We'll never sell your data.
                                    </p>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.04] py-8 text-center">
                <Link href="/" className="text-xs text-white/20 hover:text-white/40 transition-colors">
                    ZeroG — Social Media, Reimagined
                </Link>
            </div>
        </div>
    );
}
