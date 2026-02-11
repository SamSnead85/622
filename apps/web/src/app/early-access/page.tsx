'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { API_URL } from '@/lib/api';

function EarlyAccessPageContent() {
    const searchParams = useSearchParams();
    const [form, setForm] = useState({ name: '', email: '', reason: '', role: '', socialUrl: '' });
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Pre-fill email from URL params
    useEffect(() => {
        const email = searchParams.get('email');
        if (email) setForm(f => ({ ...f, email }));
    }, [searchParams]);

    const validate = () => {
        const errors: Record<string, string> = {};
        if (!form.name.trim()) errors.name = 'Name is required';
        if (!form.email.trim()) errors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email';
        if (!form.reason.trim()) errors.reason = 'This field is required';
        else if (form.reason.trim().length < 20) errors.reason = `${20 - form.reason.trim().length} more characters needed`;
        if (form.socialUrl && form.socialUrl.trim() && !/^https?:\/\/.+/.test(form.socialUrl)) errors.socialUrl = 'Enter a valid URL starting with http';
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setStatus('submitting');
        try {
            const res = await fetch(`${API_URL}/api/v1/auth/early-access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    socialUrl: form.socialUrl.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setStatus('success');
                setMessage(data.message);
            } else {
                setStatus('error');
                setMessage(data.message || 'Something went wrong. Please try again.');
            }
        } catch {
            setStatus('error');
            setMessage('Network error. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)' }} />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)' }} />
            </div>

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-2xl border-b border-white/[0.04]">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10">
                            <span className="font-bold text-sm text-white tracking-tight">0G</span>
                        </div>
                        <span className="font-semibold text-white/90 tracking-tight">ZeroG</span>
                    </Link>
                    <Link href="/login" className="text-white/50 hover:text-white transition-colors text-sm font-light">
                        Already have a code? Sign In
                    </Link>
                </div>
            </nav>

            <main className="relative z-10 pt-32 pb-24 px-6">
                <div className="max-w-2xl mx-auto">
                    {status === 'success' ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center"
                        >
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h1 className="text-3xl font-bold mb-4">Application Received</h1>
                            <p className="text-white/60 text-lg leading-relaxed max-w-md mx-auto mb-3">{message}</p>
                            <p className="text-white/40 text-sm max-w-sm mx-auto mb-10">
                                We review applications within 48 hours. Approved members receive a unique access code via email to create their account.
                            </p>

                            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 max-w-sm mx-auto mb-10">
                                <h3 className="text-sm font-medium text-white/70 mb-3">What happens next</h3>
                                <div className="space-y-3 text-left">
                                    {[
                                        'Our team reviews your application',
                                        'If approved, you receive a unique access code via email',
                                        'Use your code to create your account at the sign-up page',
                                        'Complete onboarding and start building your community',
                                    ].map((step, i) => (
                                        <div key={i} className="flex gap-3 items-start">
                                            <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                                                <span className="text-[10px] text-white/40">{i + 1}</span>
                                            </div>
                                            <p className="text-sm text-white/50">{step}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                                </svg>
                                Back to home
                            </Link>
                        </motion.div>
                    ) : (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            {/* Header */}
                            <div className="text-center mb-12">
                                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-white/60 text-xs tracking-widest uppercase font-light">Limited Early Access</span>
                                </span>
                                <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Join the Founding Community</h1>
                                <p className="text-white/50 text-lg leading-relaxed max-w-lg mx-auto">
                                    We are hand-selecting our first members. Tell us about yourself and why you would be a valuable 
                                    early adopter and community builder.
                                </p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-2">Full Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={form.name}
                                            onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFieldErrors(fe => ({ ...fe, name: '' })); }}
                                            placeholder="Your name"
                                            className={`w-full px-4 py-3 bg-white/[0.04] border rounded-xl text-white placeholder-white/30 focus:outline-none focus:bg-white/[0.06] transition-all ${fieldErrors.name ? 'border-red-500/40 focus:border-red-500/60' : 'border-white/[0.08] focus:border-white/20'}`}
                                        />
                                        {fieldErrors.name && <p className="text-xs text-red-400 mt-1.5">{fieldErrors.name}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-2">Email *</label>
                                        <input
                                            type="email"
                                            required
                                            value={form.email}
                                            onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setFieldErrors(fe => ({ ...fe, email: '' })); }}
                                            placeholder="you@email.com"
                                            className={`w-full px-4 py-3 bg-white/[0.04] border rounded-xl text-white placeholder-white/30 focus:outline-none focus:bg-white/[0.06] transition-all ${fieldErrors.email ? 'border-red-500/40 focus:border-red-500/60' : 'border-white/[0.08] focus:border-white/20'}`}
                                        />
                                        {fieldErrors.email && <p className="text-xs text-red-400 mt-1.5">{fieldErrors.email}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-2">What describes you best?</label>
                                    <select
                                        value={form.role}
                                        onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all appearance-none"
                                    >
                                        <option value="" className="bg-black">Select a role...</option>
                                        <option value="community_builder" className="bg-black">Community Builder / Organizer</option>
                                        <option value="developer" className="bg-black">Developer / Technical</option>
                                        <option value="creator" className="bg-black">Content Creator / Streamer</option>
                                        <option value="activist" className="bg-black">Activist / Advocate</option>
                                        <option value="diaspora" className="bg-black">Diaspora Community Member</option>
                                        <option value="ngo" className="bg-black">NGO / Nonprofit</option>
                                        <option value="journalist" className="bg-black">Journalist / Media</option>
                                        <option value="other" className="bg-black">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-white/70">
                                            Why would you make a great early adopter? *
                                        </label>
                                        <span className={`text-xs ${form.reason.length >= 20 ? 'text-white/20' : 'text-white/40'}`}>
                                            {form.reason.length}/20 min
                                        </span>
                                    </div>
                                    <textarea
                                        required
                                        minLength={20}
                                        rows={5}
                                        value={form.reason}
                                        onChange={e => { setForm(f => ({ ...f, reason: e.target.value })); setFieldErrors(fe => ({ ...fe, reason: '' })); }}
                                        placeholder="Share your story, your community, and how you would use ZeroG..."
                                        className={`w-full px-4 py-3 bg-white/[0.04] border rounded-xl text-white placeholder-white/30 focus:outline-none focus:bg-white/[0.06] transition-all resize-none ${fieldErrors.reason ? 'border-red-500/40 focus:border-red-500/60' : 'border-white/[0.08] focus:border-white/20'}`}
                                    />
                                    {fieldErrors.reason && <p className="text-xs text-red-400 mt-1.5">{fieldErrors.reason}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-2">Social / Website (optional)</label>
                                    <input
                                        type="url"
                                        value={form.socialUrl}
                                        onChange={e => { setForm(f => ({ ...f, socialUrl: e.target.value })); setFieldErrors(fe => ({ ...fe, socialUrl: '' })); }}
                                        placeholder="https://..."
                                        className={`w-full px-4 py-3 bg-white/[0.04] border rounded-xl text-white placeholder-white/30 focus:outline-none focus:bg-white/[0.06] transition-all ${fieldErrors.socialUrl ? 'border-red-500/40 focus:border-red-500/60' : 'border-white/[0.08] focus:border-white/20'}`}
                                    />
                                    {fieldErrors.socialUrl && <p className="text-xs text-red-400 mt-1.5">{fieldErrors.socialUrl}</p>}
                                </div>

                                {status === 'error' && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                        {message}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={status === 'submitting'}
                                    className="w-full py-4 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {status === 'submitting' ? 'Submitting...' : 'Submit Application'}
                                </button>
                            </form>

                            {/* Bottom info */}
                            <div className="mt-12 pt-8 border-t border-white/[0.06]">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <p className="text-white/30 text-sm">
                                        Already have an access code?{' '}
                                        <Link href="/signup" className="text-white/60 hover:text-white underline underline-offset-4 transition-colors">
                                            Sign up here
                                        </Link>
                                    </p>
                                    <div className="flex items-center gap-2 text-white/20 text-xs">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        Your data is encrypted and never shared
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function EarlyAccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black" />}>
            <EarlyAccessPageContent />
        </Suspense>
    );
}
