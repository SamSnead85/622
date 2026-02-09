'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';

// ============================================
// ANIMATED SECTION WRAPPER
// ============================================
function AnimatedSection({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-80px' });

    return (
        <motion.section
            id={id}
            ref={ref}
            className={className}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
        >
            {children}
        </motion.section>
    );
}

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-[#030305] text-white">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[#030305]" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#D4AF37]/[0.03] blur-[150px] rounded-full" />
                <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#B8942D]/[0.02] blur-[120px] rounded-full" />
            </div>

            {/* Nav */}
            <nav className="relative z-50 border-b border-white/5 bg-black/50 backdrop-blur-2xl">
                <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white/90 to-white/70 flex items-center justify-center">
                            <span className="text-black font-bold text-sm">0G</span>
                        </div>
                        <span className="text-white/60 text-sm font-light tracking-widest uppercase">ZeroG</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/developers" className="text-white/40 hover:text-white text-sm transition-colors">Developers</Link>
                        <Link href="/early-access" className="px-5 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-all">
                            Request Early Access
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="relative z-10">
                {/* ==================== HERO ==================== */}
                <section className="pt-24 pb-20 md:pt-32 md:pb-28">
                    <div className="max-w-5xl mx-auto px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <p className="text-[#D4AF37]/60 text-xs tracking-[0.4em] uppercase mb-6 font-light">About 0G</p>
                            <h1 className="text-4xl md:text-6xl lg:text-7xl font-light text-white leading-[1.1] mb-8">
                                We built the platform
                                <br />
                                <span className="text-white/40">we needed but didn&apos;t have.</span>
                            </h1>
                            <p className="text-lg md:text-xl text-white/40 font-light leading-relaxed max-w-3xl">
                                0G is a social platform built from the ground up by a team of Palestinian engineers and designers.
                                We built it because we watched our communities get silenced, shadow-banned, and erased from
                                platforms that were supposed to connect us. So we built something better.
                            </p>
                        </motion.div>
                    </div>
                </section>

                {/* ==================== ORIGIN / PALESTINIAN IDENTITY ==================== */}
                <AnimatedSection className="py-20 md:py-28 border-t border-white/5">
                    <div className="max-w-5xl mx-auto px-6">
                        <div className="grid md:grid-cols-5 gap-12 md:gap-16">
                            <div className="md:col-span-2">
                                <p className="text-white/30 text-xs tracking-[0.4em] uppercase mb-4 font-light sticky top-24">Our Origin</p>
                            </div>
                            <div className="md:col-span-3 space-y-8">
                                <div>
                                    <h2 className="text-3xl font-light text-white mb-6 leading-tight">
                                        100% Palestinian built.
                                        <br />
                                        <span className="text-white/40">100% for everyone.</span>
                                    </h2>
                                    <p className="text-white/50 font-light leading-relaxed mb-6">
                                        0G was not incubated in a Silicon Valley accelerator. It was not funded by venture capital firms
                                        looking for a 10x return. It was built by Palestinian engineers who understand, from lived experience,
                                        what it means to have your voice systematically erased from the digital public square.
                                    </p>
                                    <p className="text-white/50 font-light leading-relaxed mb-6">
                                        During the most critical moments — when truth needed to reach the world — we watched our posts
                                        get removed, our accounts get restricted, and our communities get algorithmically suppressed.
                                        The platforms we relied on to share our stories were the same ones silencing us.
                                    </p>
                                    <p className="text-white/50 font-light leading-relaxed">
                                        So we stopped asking for a seat at their table. We built our own.
                                        And we built it for every community on earth that has been failed by the platforms they trusted.
                                        For families who want private spaces without surveillance. For activists who need their voices heard
                                        without suppression. For communities who deserve technology that serves them, not exploits them.
                                    </p>
                                </div>

                                <div className="bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/10 rounded-2xl p-6">
                                    <p className="text-emerald-400 text-xs tracking-[0.3em] uppercase font-medium mb-3">What This Means</p>
                                    <p className="text-white/60 font-light leading-relaxed">
                                        Every line of code in this platform was written with the understanding that technology is not neutral.
                                        It reflects the values of the people who build it. Our values: truth, privacy, dignity, and
                                        community sovereignty. These aren&apos;t marketing slogans. They&apos;re architectural principles
                                        baked into every layer of the system.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </AnimatedSection>

                {/* ==================== MISSION & VISION ==================== */}
                <AnimatedSection className="py-20 md:py-28 border-t border-white/5">
                    <div className="max-w-5xl mx-auto px-6">
                        <div className="grid md:grid-cols-2 gap-12">
                            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 md:p-10">
                                <div className="mb-6 text-white/30">
                                    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                                </div>
                                <h3 className="text-2xl font-light text-white mb-4">Our Mission</h3>
                                <p className="text-white/50 font-light leading-relaxed">
                                    To build a social platform that treats every member as a sovereign individual — not a product.
                                    Where communities govern their own spaces, privacy is a right not a feature, and no algorithm
                                    decides whose truth gets heard. We exist to return the power of connection to the people who use it.
                                </p>
                            </div>
                            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 md:p-10">
                                <div className="mb-6 text-white/30">
                                    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                                </div>
                                <h3 className="text-2xl font-light text-white mb-4">Our Vision</h3>
                                <p className="text-white/50 font-light leading-relaxed">
                                    A world where your social connections, creative work, conversations, and memories belong to you.
                                    Where a family in Gaza and a family in Glasgow have the same access to private, secure, and dignified
                                    digital spaces. Where social media is a tool of liberation, not a mechanism of control.
                                </p>
                            </div>
                        </div>
                    </div>
                </AnimatedSection>

                {/* ==================== ARCHITECTURE OVERVIEW ==================== */}
                <AnimatedSection id="architecture" className="py-20 md:py-28 border-t border-white/5">
                    <div className="max-w-5xl mx-auto px-6">
                        <div className="mb-16">
                            <p className="text-[#D4AF37]/60 text-xs tracking-[0.4em] uppercase mb-4 font-light">Architecture</p>
                            <h2 className="text-3xl md:text-5xl font-light text-white leading-tight mb-6">
                                Designed for trust.
                                <br />
                                <span className="text-white/40">Engineered for resilience.</span>
                            </h2>
                            <p className="text-lg text-white/40 font-light leading-relaxed max-w-3xl">
                                0G&apos;s architecture was designed from the ground up with privacy, security, and community
                                sovereignty as first-class citizens — not afterthoughts bolted onto an advertising engine.
                            </p>
                        </div>

                        <div className="space-y-6">
                            {[
                                {
                                    title: 'Privacy-First Data Architecture',
                                    desc: 'User data flows through isolated, permission-scoped pathways. Community data is compartmentalized so that a breach in one area cannot cascade to another. Contained community members exist in fully isolated environments — invisible to the broader platform, with zero data leakage between contexts.',
                                    icon: <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
                                    color: 'text-emerald-400 bg-emerald-400/10',
                                },
                                {
                                    title: 'Cryptographic Identity Protection',
                                    desc: 'Travel Shield uses SHA-256 hashed passphrases with XOR cipher operations to create cryptographically separated identity layers. The decoy profile system is designed so there is zero forensic evidence of a second identity — no hidden UI elements, no suspicious storage keys, and no way to detect activation without the passphrase.',
                                    icon: <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
                                    color: 'text-amber-400 bg-amber-400/10',
                                },
                                {
                                    title: 'Real-Time Communication Layer',
                                    desc: 'WebSocket infrastructure powers real-time messaging, typing indicators, read receipts, presence updates, and live event streaming. Voice and video calls use WebRTC for true peer-to-peer connections — your call data routes directly between devices, never through our servers. ICE/STUN negotiation ensures connectivity across network topologies.',
                                    icon: <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
                                    color: 'text-blue-400 bg-blue-400/10',
                                },
                                {
                                    title: 'Community Sovereignty Engine',
                                    desc: 'Each community operates as a self-governing entity with its own moderation rules, content policies, member roles, and visibility settings. Administrators have granular control over posting permissions, approval workflows, announcement modes, and member management. Communities can choose to be fully public, private with invites, or completely contained with zero platform visibility.',
                                    icon: <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
                                    color: 'text-violet-400 bg-violet-400/10',
                                },
                                {
                                    title: 'Open Developer Platform',
                                    desc: 'A full RESTful API with OAuth 2.0 authentication, API key management, granular permission scopes, and event-driven webhooks. Third-party developers, AI agents, no-code tools, and automation platforms can programmatically create communities, manage members, post content, and subscribe to platform events — all within scoped, auditable access controls.',
                                    icon: <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>,
                                    color: 'text-[#D4AF37] bg-[#D4AF37]/10',
                                },
                                {
                                    title: 'Transparent Algorithm Design',
                                    desc: 'Content ranking on 0G is community-driven, not engagement-optimized. There are no dark patterns, no algorithmic amplification of outrage, and no hidden signals designed to maximize time-on-app. Members can choose chronological feeds, community-curated feeds, or topic-prioritized views. The algorithm serves you — and you can see exactly how.',
                                    icon: <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
                                    color: 'text-pink-400 bg-pink-400/10',
                                },
                            ].map((item, i) => (
                                <motion.div
                                    key={item.title}
                                    className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 md:p-8 hover:border-white/10 transition-all"
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: i * 0.05 }}
                                >
                                    <div className="flex items-start gap-5">
                                        <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0`}>
                                            {item.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-medium text-white mb-2">{item.title}</h3>
                                            <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </AnimatedSection>

                {/* ==================== SECURITY & COMPLIANCE ==================== */}
                <AnimatedSection id="security" className="py-20 md:py-28 border-t border-white/5">
                    <div className="max-w-5xl mx-auto px-6">
                        <div className="mb-16">
                            <p className="text-emerald-400/60 text-xs tracking-[0.4em] uppercase mb-4 font-light">Security & Compliance</p>
                            <h2 className="text-3xl md:text-5xl font-light text-white leading-tight mb-6">
                                Security is not a feature.
                                <br />
                                <span className="text-white/40">It&apos;s the foundation.</span>
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6 mb-12">
                            {[
                                {
                                    title: 'Session-Based Authentication',
                                    desc: 'JWT tokens tied to database-verified sessions with automatic expiration and cleanup. No persistent cookies. No fingerprinting. Every session is independently auditable.',
                                    iconPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
                                },
                                {
                                    title: 'Rate Limiting & Abuse Prevention',
                                    desc: 'Multi-layered rate limiting with per-IP, per-user, and per-endpoint controls. Configurable thresholds with automatic escalation for suspicious patterns. DDoS-resistant by design.',
                                    iconPath: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 01-.67-.01C7.5 20.5 4 18 4 13V6l8-4 8 4v7z',
                                },
                                {
                                    title: 'Data Minimization',
                                    desc: 'We collect only what we need to provide the service. No behavioral analytics. No ad profiling. No third-party trackers. Your usage patterns are not commoditized.',
                                    iconPath: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z',
                                },
                                {
                                    title: 'CSRF & Origin Protection',
                                    desc: 'Cross-site request forgery protection on every state-changing endpoint. Strict origin validation in production. API key requests bypass CSRF by design with separate authentication.',
                                    iconPath: 'M7 11V7a5 5 0 0110 0v4M3 11h18v11H3z',
                                },
                                {
                                    title: 'Scoped API Access',
                                    desc: 'Developer API keys are SHA-256 hashed (never stored in plaintext). OAuth tokens use separate access and refresh flows. Permission scopes enforce least-privilege access at every layer.',
                                    iconPath: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
                                },
                                {
                                    title: 'Data Portability',
                                    desc: 'Full data export capability at any time. Your posts, messages, connections, and media. We believe if you can\'t leave with your data, you don\'t really own it.',
                                    iconPath: 'M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13',
                                },
                                {
                                    title: 'Webhook Integrity',
                                    desc: 'All webhook deliveries are signed with HMAC secrets unique to each integration. Receiving servers can cryptographically verify that payloads originated from 0G and were not tampered with.',
                                    iconPath: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3',
                                },
                                {
                                    title: 'Zero-Knowledge Identity Layers',
                                    desc: 'Travel Shield creates a cryptographic barrier between your real identity and the decoy. The system has no knowledge of which profile is "real" — only the passphrase holder can disambiguate.',
                                    iconPath: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z',
                                },
                            ].map((item, i) => (
                                <motion.div
                                    key={item.title}
                                    className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all"
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: i * 0.05 }}
                                >
                                    <div className="mb-3 text-white/30">
                                        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d={item.iconPath}/></svg>
                                    </div>
                                    <h3 className="text-white font-medium mb-2">{item.title}</h3>
                                    <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>

                        {/* Compliance commitment */}
                        <div className="bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/10 rounded-2xl p-8 md:p-10">
                            <h3 className="text-xl font-light text-white mb-4">Our Compliance Commitment</h3>
                            <p className="text-white/50 font-light leading-relaxed mb-6">
                                We are committed to meeting and exceeding global privacy and security standards. Our architecture has been
                                designed with GDPR, CCPA, and international data protection principles as baseline requirements — not aspirational goals.
                                We believe compliance is the floor, not the ceiling.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {['GDPR Ready', 'CCPA Compliant', 'Data Portability', 'Right to Deletion', 'Minimal Data Collection', 'No Third-Party Trackers'].map(tag => (
                                    <span key={tag} className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </AnimatedSection>

                {/* ==================== DESIGN PHILOSOPHY ==================== */}
                <AnimatedSection className="py-20 md:py-28 border-t border-white/5">
                    <div className="max-w-5xl mx-auto px-6">
                        <div className="mb-16">
                            <p className="text-white/30 text-xs tracking-[0.4em] uppercase mb-4 font-light">Design Philosophy</p>
                            <h2 className="text-3xl md:text-5xl font-light text-white leading-tight">
                                Every decision serves the member.
                            </h2>
                        </div>

                        <div className="space-y-0 border-t border-white/5">
                            {[
                                {
                                    num: '01',
                                    title: 'Content-First Experience',
                                    desc: 'When you open 0G, you see content immediately. Not buttons. Not ads. Not engagement prompts. Your feed, your people, your communities — front and center. Every pixel is earned.',
                                },
                                {
                                    num: '02',
                                    title: 'No Dark Patterns',
                                    desc: 'We will never use infinite scroll designed to trap you. No notification badges engineered to create anxiety. No "you might miss out" pressure. If you want to close the app, we want you to feel good about it.',
                                },
                                {
                                    num: '03',
                                    title: 'Progressive Complexity',
                                    desc: 'A first-time user joining a family group sees a simple, clean interface. A community admin managing 10,000 members has access to powerful tools. Complexity is revealed as needed, never imposed.',
                                },
                                {
                                    num: '04',
                                    title: 'Accessible to All',
                                    desc: 'Designed for users with varying technical literacy. A grandmother joining a family group should have the same easy experience as a developer building an API integration. If it\'s not intuitive, it\'s a bug.',
                                },
                                {
                                    num: '05',
                                    title: 'Performance as Respect',
                                    desc: 'We treat your device resources and bandwidth with respect. Fast load times, efficient data usage, PWA support for mobile. Not everyone has the latest hardware or unlimited data. We design for the reality of our global community.',
                                },
                                {
                                    num: '06',
                                    title: 'Aesthetics with Purpose',
                                    desc: 'Our visual design language is intentionally calm, dark, and focused. No attention-grabbing red notification badges. No dopamine-triggering animations. Beauty in service of utility and peace of mind.',
                                },
                            ].map((item) => (
                                <div key={item.num} className="grid md:grid-cols-12 gap-4 md:gap-8 py-8 md:py-10 border-b border-white/5">
                                    <div className="md:col-span-1">
                                        <span className="text-[#D4AF37]/40 text-sm font-mono">{item.num}</span>
                                    </div>
                                    <div className="md:col-span-3">
                                        <h3 className="text-white font-medium">{item.title}</h3>
                                    </div>
                                    <div className="md:col-span-8">
                                        <p className="text-white/40 font-light leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </AnimatedSection>

                {/* ==================== WHAT WE'LL NEVER DO ==================== */}
                <AnimatedSection className="py-20 md:py-28 border-t border-white/5">
                    <div className="max-w-5xl mx-auto px-6">
                        <div className="mb-16 text-center">
                            <p className="text-red-400/60 text-xs tracking-[0.4em] uppercase mb-4 font-light">Our Pledge</p>
                            <h2 className="text-3xl md:text-5xl font-light text-white leading-tight mb-6">
                                What we will{' '}
                                <span className="text-red-400">never</span> do.
                            </h2>
                            <p className="text-lg text-white/40 font-light max-w-2xl mx-auto">
                                These are not guidelines. They are principles embedded in our architecture.
                                Violating them would require rebuilding the platform from scratch.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            {[
                                'Sell your data to advertisers or third parties',
                                'Display advertisements in any form',
                                'Use engagement-optimization algorithms that amplify outrage',
                                'Shadow-ban users based on political content or activism',
                                'Sell your behavioral data to AI training companies',
                                'Profile you across websites using tracking pixels',
                                'Manufacture artificial urgency through notification design',
                                'Lock your data inside the platform — full export, always',
                                'Suppress content based on geopolitical pressure',
                                'Build features that prioritize revenue over member safety',
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    className="flex items-start gap-3 bg-red-500/[0.03] border border-red-500/10 rounded-xl p-4"
                                    initial={{ opacity: 0, x: i % 2 === 0 ? -10 : 10 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: i * 0.03 }}
                                >
                                    <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                    <span className="text-white/60 text-sm">{item}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </AnimatedSection>

                {/* ==================== LOOKING FORWARD ==================== */}
                <AnimatedSection className="py-20 md:py-28 border-t border-white/5">
                    <div className="max-w-5xl mx-auto px-6 text-center">
                        <p className="text-[#B8942D]/60 text-xs tracking-[0.4em] uppercase mb-6 font-light">The Road Ahead</p>
                        <h2 className="text-3xl md:text-5xl font-light text-white leading-tight mb-8 max-w-3xl mx-auto">
                            We&apos;re building the infrastructure for
                            <br />
                            <span className="bg-gradient-to-r from-[#D4AF37] to-[#B8942D] bg-clip-text text-transparent">
                                digital sovereignty.
                            </span>
                        </h2>
                        <p className="text-lg text-white/40 font-light leading-relaxed max-w-2xl mx-auto mb-6">
                            The features you see today are just the foundation. We&apos;re building toward a world where communities
                            can run their own infrastructure, own their own data, and govern their own spaces without permission
                            from a corporate platform.
                        </p>
                        <p className="text-lg text-white/40 font-light leading-relaxed max-w-2xl mx-auto mb-12">
                            End-to-end encryption for all messaging. Federated community networks. Community-owned data infrastructure.
                            Self-sovereign identity verification. These aren&apos;t dreams — they&apos;re on the roadmap, and the
                            architecture to support them is already in place.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href="/early-access"
                                className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all hover:scale-[1.02]"
                            >
                                Join the Movement
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                                </svg>
                            </Link>
                            <Link
                                href="/developers"
                                className="inline-flex items-center gap-2 px-6 py-4 text-white/50 hover:text-white transition-colors text-sm"
                            >
                                Build with us
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                                </svg>
                            </Link>
                        </div>
                    </div>
                </AnimatedSection>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12">
                <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-white/20 text-xs">
                        &copy; 2026 ZeroG. 100% Palestinian Built. For everyone.
                    </p>
                    <div className="flex items-center gap-6 text-xs text-white/30">
                        <Link href="/" className="hover:text-white transition-colors">Home</Link>
                        <Link href="/developers" className="hover:text-white transition-colors">Developers</Link>
                        <Link href="/transparency" className="hover:text-white transition-colors">Privacy</Link>
                        <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
