'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { API_URL as API } from '@/lib/api';

const TIERS = [
    {
        id: 'ambassador',
        title: 'Ambassador',
        subtitle: 'Community builders with 500+ followers',
        perks: [
            'Early Access to ZeroG',
            '10 invite codes for your followers',
            'Verified creator badge',
            'Priority support channel',
            'Ambassador community access',
        ],
    },
    {
        id: 'creator',
        title: 'Creator',
        subtitle: 'Content creators with 5,000+ followers',
        perks: [
            'Everything in Ambassador, plus:',
            '50 invite codes for your audience',
            'Featured on Discover page',
            'Custom referral landing page',
            'Analytics dashboard',
            'Co-marketing opportunities',
        ],
        featured: true,
    },
    {
        id: 'partner',
        title: 'Partner',
        subtitle: 'Established creators with 50,000+ followers',
        perks: [
            'Everything in Creator, plus:',
            'Unlimited invite codes',
            'Revenue share program',
            'Dedicated account manager',
            'Platform input & roadmap access',
            'Sponsorship opportunities',
            'Event collaboration',
        ],
    },
];

const PLATFORMS = [
    { id: 'instagram', label: 'Instagram' },
    { id: 'tiktok', label: 'TikTok' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'twitter', label: 'X / Twitter' },
    { id: 'podcast', label: 'Podcast' },
    { id: 'twitch', label: 'Twitch' },
    { id: 'other', label: 'Other' },
];

const NICHES = [
    'Food & Cooking', 'Fashion & Beauty', 'Faith & Spirituality', 'Travel',
    'Education', 'Comedy & Entertainment', 'Fitness & Health', 'Tech & Gaming',
    'Art & Design', 'Photography', 'Music', 'Business & Entrepreneurship',
    'Social Justice & Activism', 'Parenting & Family', 'Lifestyle', 'Other',
];

export default function CreatorsPage() {
    const [step, setStep] = useState<'landing' | 'apply'>('landing');
    const [form, setForm] = useState({
        platform: '',
        platformHandle: '',
        followerCount: '',
        contentNiche: '',
        bio: '',
        applicationNote: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                // Not logged in — redirect to login then back
                localStorage.setItem('0g_creator_application', JSON.stringify(form));
                window.location.href = '/login?redirect=/creators';
                return;
            }

            const res = await fetch(`${API}/api/v1/creators/apply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                setResult({ success: true, message: 'Application submitted! We\'ll review and get back to you within 48 hours.' });
            } else {
                setResult({ success: false, message: data.error || 'Unable to submit application.' });
            }
        } catch {
            setResult({ success: false, message: 'Unable to submit. Please try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A0C] text-white">
            {/* Navigation */}
            <header className="sticky top-0 z-50 bg-[#0A0A0C]/90 backdrop-blur-lg border-b border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#7C8FFF]/10 border border-[#7C8FFF]/20 flex items-center justify-center">
                            <span className="text-xs font-bold text-[#7C8FFF]">0G</span>
                        </div>
                        <span className="text-sm font-medium text-white/50">Creators</span>
                    </Link>
                    {step === 'landing' && (
                        <button
                            onClick={() => setStep('apply')}
                            className="px-5 py-2 rounded-xl bg-[#7C8FFF] text-sm font-medium text-white hover:bg-[#7C8FFF]/90 transition-all"
                        >
                            Apply Now
                        </button>
                    )}
                </div>
            </header>

            <AnimatePresence mode="wait">
                {step === 'landing' && !result ? (
                    <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {/* Hero */}
                        <section className="relative overflow-hidden">
                            <div className="absolute inset-0">
                                <div className="absolute top-20 left-1/4 w-[500px] h-[300px] rounded-full blur-[150px] opacity-8 bg-[#7C8FFF]" />
                                <div className="absolute bottom-10 right-1/4 w-[400px] h-[250px] rounded-full blur-[120px] opacity-6 bg-[#6070EE]" />
                            </div>
                            <div className="relative max-w-4xl mx-auto px-4 pt-16 sm:pt-24 pb-16 text-center">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] mb-8"
                                >
                                    <span className="text-xs text-[#7C8FFF] font-medium">Creator Program</span>
                                    <span className="text-xs text-white/30">Now Accepting Applications</span>
                                </motion.div>

                                <motion.h1
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]"
                                >
                                    Your Audience.{' '}
                                    <span className="bg-gradient-to-r from-[#7C8FFF] to-[#6070EE] bg-clip-text text-transparent">
                                        Your Platform.
                                    </span>
                                    <br />Your Insurance Policy.
                                </motion.h1>

                                <motion.p
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-base sm:text-lg text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed"
                                >
                                    TikTok gets banned. Instagram changes its algorithm. Your audience disappears overnight.
                                    ZeroG is the hedge. Build your community on a platform that can&apos;t be taken away.
                                </motion.p>

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="flex flex-col sm:flex-row gap-3 justify-center"
                                >
                                    <button
                                        onClick={() => setStep('apply')}
                                        className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#7C8FFF] to-[#7C8FFF]/80 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                                    >
                                        Apply to Creator Program
                                    </button>
                                    <a
                                        href="#tiers"
                                        className="px-8 py-3.5 rounded-xl bg-white/5 border border-white/[0.08] text-sm font-medium text-white/70 hover:bg-white/10 transition-colors"
                                    >
                                        See Tier Benefits
                                    </a>
                                </motion.div>
                            </div>
                        </section>

                        {/* The Problem */}
                        <section className="py-16 border-t border-white/[0.04]">
                            <div className="max-w-4xl mx-auto px-4">
                                <h2 className="text-xl sm:text-2xl font-bold text-white mb-8 text-center">The Risk You&apos;re Already Taking</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        {
                                            stat: '170M+',
                                            label: 'TikTok users faced a ban in the US',
                                            detail: 'One executive order. Millions of creators left scrambling.',
                                        },
                                        {
                                            stat: '50%',
                                            label: 'Drop in organic reach on Instagram',
                                            detail: 'Algorithm changes wiped out years of audience building overnight.',
                                        },
                                        {
                                            stat: '0%',
                                            label: 'Of your followers you actually own',
                                            detail: 'On every major platform, your audience belongs to them, not you.',
                                        },
                                    ].map((item, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: i * 0.1 }}
                                            className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
                                        >
                                            <p className="text-2xl font-bold text-[#F87171] mb-1">{item.stat}</p>
                                            <p className="text-sm font-medium text-white mb-2">{item.label}</p>
                                            <p className="text-xs text-white/40 leading-relaxed">{item.detail}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* The Solution */}
                        <section className="py-16 border-t border-white/[0.04]">
                            <div className="max-w-4xl mx-auto px-4">
                                <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 text-center">Why Creators Choose ZeroG</h2>
                                <p className="text-sm text-white/40 text-center mb-10 max-w-xl mx-auto">
                                    This isn&apos;t about leaving other platforms. It&apos;s about not having all your eggs in one basket.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {[
                                        {
                                            title: 'You Own Your Audience',
                                            desc: 'Your followers are your contacts. Export them anytime. No algorithm decides who sees your content.',
                                            icon: (
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
                                            ),
                                        },
                                        {
                                            title: 'No Shadowbans. Ever.',
                                            desc: 'Your content reaches your community. No suppression. No pay-to-play. Your voice is your voice.',
                                            icon: (
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                            ),
                                        },
                                        {
                                            title: 'Platform-Proof Your Brand',
                                            desc: 'Ban-proof, algorithm-proof, acquisition-proof. Your community lives here regardless of what happens to other apps.',
                                            icon: (
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                                            ),
                                        },
                                        {
                                            title: 'Built-In Monetization',
                                            desc: 'Revenue share for active creators. No middleman taking 30%. Your community, your income.',
                                            icon: (
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
                                            ),
                                        },
                                    ].map((item, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 16 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: i * 0.08 }}
                                            className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-[#7C8FFF]/10 border border-[#7C8FFF]/20 flex items-center justify-center text-[#7C8FFF] mb-4">
                                                {item.icon}
                                            </div>
                                            <h3 className="text-sm font-semibold text-white mb-2">{item.title}</h3>
                                            <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Tiers */}
                        <section id="tiers" className="py-16 border-t border-white/[0.04]">
                            <div className="max-w-5xl mx-auto px-4">
                                <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 text-center">Creator Tiers</h2>
                                <p className="text-sm text-white/40 text-center mb-10">The more you grow, the more you earn.</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {TIERS.map((tier, i) => (
                                        <motion.div
                                            key={tier.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: i * 0.1 }}
                                            className={`p-6 rounded-2xl border ${tier.featured
                                                ? 'bg-[#7C8FFF]/[0.04] border-[#7C8FFF]/20'
                                                : 'bg-white/[0.02] border-white/[0.06]'
                                                }`}
                                        >
                                            {tier.featured && (
                                                <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#7C8FFF]/15 text-[10px] font-semibold text-[#7C8FFF] uppercase tracking-wider mb-3">
                                                    Most Popular
                                                </span>
                                            )}
                                            <h3 className="text-lg font-semibold text-white mb-1">{tier.title}</h3>
                                            <p className="text-xs text-white/40 mb-5">{tier.subtitle}</p>
                                            <div className="space-y-2.5">
                                                {tier.perks.map((perk, j) => (
                                                    <div key={j} className="flex items-start gap-2">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C8FFF" strokeWidth="2" className="mt-0.5 shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
                                                        <span className="text-xs text-white/55">{perk}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => setStep('apply')}
                                                className={`w-full mt-6 py-2.5 rounded-xl text-sm font-medium transition-all ${tier.featured
                                                    ? 'bg-[#7C8FFF] text-white hover:bg-[#7C8FFF]/90'
                                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                                    }`}
                                            >
                                                Apply Now
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* De-risking pitch */}
                        <section className="py-16 border-t border-white/[0.04]">
                            <div className="max-w-3xl mx-auto px-4 text-center">
                                <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Think of It This Way</h2>
                                <p className="text-sm text-white/50 leading-relaxed max-w-xl mx-auto mb-8">
                                    You wouldn&apos;t put all your money in one bank account. So why put all your followers on one platform?
                                    ZeroG is your diversification strategy. Keep creating everywhere — but build your permanent
                                    home here, where no one can take it from you.
                                </p>
                                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] max-w-lg mx-auto">
                                    <p className="text-xs text-white/30 uppercase tracking-wider mb-2">The math is simple</p>
                                    <div className="space-y-3">
                                        {[
                                            { time: '5 minutes', action: 'Sign up and set up your ZeroG profile' },
                                            { time: '1 post', action: 'Tell your audience "I\'m also on ZeroG"' },
                                            { time: 'Forever', action: 'A community that no one can take from you' },
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center gap-4 text-left">
                                                <span className="text-xs font-mono text-[#7C8FFF] w-20 shrink-0">{item.time}</span>
                                                <span className="text-xs text-white/50">{item.action}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setStep('apply')}
                                    className="mt-8 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#7C8FFF] to-[#6070EE] text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                                >
                                    Protect Your Audience — Apply Now
                                </button>
                            </div>
                        </section>
                    </motion.div>
                ) : result ? (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-lg mx-auto px-4 pt-24 text-center"
                    >
                        <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${result.success ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                            {result.success ? (
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                            ) : (
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                            )}
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">
                            {result.success ? 'Application Submitted' : 'Submission Failed'}
                        </h2>
                        <p className="text-sm text-white/50 mb-8">{result.message}</p>
                        <Link href="/" className="text-sm text-[#7C8FFF] hover:underline">Back to ZeroG</Link>
                    </motion.div>
                ) : (
                    <motion.div
                        key="apply"
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        className="max-w-2xl mx-auto px-4 py-10 sm:py-16"
                    >
                        <button onClick={() => setStep('landing')} className="flex items-center gap-2 text-sm text-white/40 hover:text-white/60 mb-8 transition-colors">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                            Back
                        </button>

                        <h2 className="text-2xl font-bold text-white mb-2">Apply to the Creator Program</h2>
                        <p className="text-sm text-white/40 mb-8">Tell us about yourself and your audience. We review applications within 48 hours.</p>

                        <form onSubmit={handleApply} className="space-y-6">
                            {/* Platform */}
                            <div>
                                <label className="block text-xs text-white/50 mb-2">Primary Platform</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {PLATFORMS.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, platform: p.id }))}
                                            className={`py-2.5 rounded-xl text-xs font-medium transition-all ${form.platform === p.id
                                                ? 'bg-[#7C8FFF]/15 border border-[#7C8FFF]/30 text-[#7C8FFF]'
                                                : 'bg-white/[0.03] border border-white/[0.06] text-white/50 hover:bg-white/[0.06]'
                                                }`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Handle */}
                            <div>
                                <label className="block text-xs text-white/50 mb-1.5">Your Handle / Username</label>
                                <input
                                    type="text"
                                    value={form.platformHandle}
                                    onChange={e => setForm(f => ({ ...f, platformHandle: e.target.value }))}
                                    placeholder="@yourhandle"
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                                />
                            </div>

                            {/* Follower count */}
                            <div>
                                <label className="block text-xs text-white/50 mb-1.5">Approximate Follower Count</label>
                                <input
                                    type="text"
                                    value={form.followerCount}
                                    onChange={e => setForm(f => ({ ...f, followerCount: e.target.value }))}
                                    placeholder="e.g. 10000"
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                                />
                            </div>

                            {/* Content niche */}
                            <div>
                                <label className="block text-xs text-white/50 mb-2">Content Niche</label>
                                <div className="flex flex-wrap gap-2">
                                    {NICHES.map(n => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, contentNiche: n }))}
                                            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${form.contentNiche === n
                                                ? 'bg-[#7C8FFF]/15 border border-[#7C8FFF]/30 text-[#7C8FFF]'
                                                : 'bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/60'
                                                }`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Bio */}
                            <div>
                                <label className="block text-xs text-white/50 mb-1.5">Tell us about your content</label>
                                <textarea
                                    value={form.bio}
                                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                                    placeholder="What do you create? Who is your audience?"
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none"
                                />
                            </div>

                            {/* Why ZeroG */}
                            <div>
                                <label className="block text-xs text-white/50 mb-1.5">Why do you want to join ZeroG?</label>
                                <textarea
                                    value={form.applicationNote}
                                    onChange={e => setForm(f => ({ ...f, applicationNote: e.target.value }))}
                                    placeholder="What excites you about this platform?"
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || !form.platform || !form.platformHandle}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#7C8FFF] to-[#7C8FFF]/80 text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-40"
                            >
                                {submitting ? 'Submitting...' : 'Submit Application'}
                            </button>

                            <p className="text-[10px] text-white/20 text-center leading-relaxed">
                                By applying you agree to ZeroG&apos;s <Link href="/terms" className="underline">Terms</Link> and{' '}
                                <Link href="/privacy" className="underline">Privacy Policy</Link>.
                            </p>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer */}
            <div className="border-t border-white/[0.04] py-8 text-center">
                <Link href="/" className="text-xs text-white/20 hover:text-white/40 transition-colors">
                    ZeroG — Social Media, Reimagined. 100% Palestinian-built.
                </Link>
            </div>
        </div>
    );
}
