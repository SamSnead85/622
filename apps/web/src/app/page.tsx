'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// ============================================
// GEOMETRIC PATTERN - Subtle Islamic-inspired 8-pointed star
// Inspired by Year 622 CE, the Hijra
// ============================================
function GeometricPattern() {
    return (
        <svg className="absolute inset-0 w-full h-full opacity-[0.015]" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="six22-pattern-landing" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
                    <g fill="none" stroke="#D4AF37" strokeWidth="0.5">
                        {/* 8-Pointed Star - Classic Islamic motif */}
                        <polygon points="60,10 70,30 90,30 75,45 80,65 60,55 40,65 45,45 30,30 50,30" />
                        <polygon points="60,10 70,30 90,30 75,45 80,65 60,55 40,65 45,45 30,30 50,30" transform="rotate(45 60 60)" />
                        {/* Circle - Unity symbol */}
                        <circle cx="60" cy="60" r="25" />
                        <circle cx="60" cy="60" r="12" />
                        {/* Connecting lines */}
                        <line x1="0" y1="60" x2="35" y2="60" />
                        <line x1="85" y1="60" x2="120" y2="60" />
                        <line x1="60" y1="0" x2="60" y2="35" />
                        <line x1="60" y1="85" x2="60" y2="120" />
                    </g>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#six22-pattern-landing)" />
        </svg>
    );
}

// ============================================
// AMBIENT BACKGROUND
// Premium atmospheric depth
// ============================================
function AmbientBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-[#030305]" />

            {/* Geometric pattern overlay */}
            <GeometricPattern />

            {/* Gradient meshes - Six22 signature colors with gold emphasis */}
            <motion.div
                className="absolute -top-40 -left-20 w-[700px] h-[700px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, rgba(245,158,11,0.08) 40%, transparent 60%)' }}
                animate={{ scale: [1, 1.15, 1], x: [0, 40, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(244,63,94,0.08) 0%, transparent 60%)' }}
                animate={{ scale: [1.1, 1, 1.1], x: [0, -30, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 60%)' }}
                animate={{ y: [0, -40, 0] }}
                transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Horizon line - golden */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
        </div>
    );
}

// ============================================
// HEXAGONAL LOGO
// Six22 brand mark - Year 622 CE reference
// ============================================
function HexLogo({ size = 40, className = '' }: { size?: number; className?: string }) {
    return (
        <svg className={className} width={size} height={size} viewBox="0 0 40 40">
            <defs>
                <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#D4AF37" />
                    <stop offset="25%" stopColor="#F59E0B" />
                    <stop offset="60%" stopColor="#F43F5E" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
            </defs>
            <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="url(#logo-grad)" />
            <text x="20" y="24" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">6</text>
        </svg>
    );
}

// ============================================
// NAVIGATION
// ============================================
function Navigation({ mounted }: { mounted: boolean }) {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!mounted) return null;

    return (
        <motion.nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#030305]/90 backdrop-blur-2xl border-b border-white/5' : ''}`}
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 group">
                    <HexLogo size={38} />
                    <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-[#D4AF37] via-amber-400 to-rose-400 bg-clip-text text-transparent">Six22</span>
                </Link>

                <div className="hidden md:flex items-center gap-10">
                    {['Mission', 'Features', 'Community'].map((item) => (
                        <Link
                            key={item}
                            href={`#${item.toLowerCase()}`}
                            className="text-sm text-white/60 hover:text-white transition-colors duration-300"
                        >
                            {item}
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <Link
                        href="/login"
                        className="text-sm text-white/60 hover:text-white transition-colors duration-300 px-4 py-2"
                    >
                        Log in
                    </Link>
                    <Link href="/signup">
                        <motion.button
                            className="text-sm font-semibold bg-gradient-to-r from-amber-400 via-rose-500 to-violet-500 text-white px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Join the Movement
                        </motion.button>
                    </Link>
                </div>
            </div>
        </motion.nav>
    );
}

// ============================================
// HERO SECTION
// Strong, mission-driven messaging
// ============================================
function HeroSection({ mounted }: { mounted: boolean }) {
    if (!mounted) return <div className="min-h-screen" />;

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            <AmbientBackground />

            <motion.div
                className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-20"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
                {/* 622 Reference - The Year of the Hijra */}
                <motion.div
                    className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-medium text-white/70">A new chapter begins</span>
                </motion.div>

                {/* Headline - Strong, Clear, Unambiguous */}
                <motion.h1
                    className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.05]"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                    Move Together.
                    <br />
                    <span className="bg-gradient-to-r from-amber-400 via-rose-400 to-violet-400 bg-clip-text text-transparent">Build Something Real.</span>
                </motion.h1>

                {/* Subheadline - Community & Values */}
                <motion.p
                    className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                    A sanctuary for those who stand for justice, support the displaced, and
                    build communities rooted in shared values. Your tribe is waiting.
                </motion.p>

                {/* CTAs */}
                <motion.div
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    <Link href="/signup">
                        <motion.button
                            className="flex items-center gap-2 bg-gradient-to-r from-amber-400 via-rose-500 to-violet-500 text-white font-semibold px-8 py-4 rounded-full text-base shadow-lg shadow-rose-500/20"
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Start Your Journey
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M3 8h10m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </motion.button>
                    </Link>
                    <Link href="#mission">
                        <motion.button
                            className="flex items-center gap-2 px-8 py-4 text-white/70 hover:text-white transition-colors text-base"
                            whileHover={{ x: 4 }}
                        >
                            Our Mission
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-60">
                                <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </motion.button>
                    </Link>
                </motion.div>

                {/* Value Pills */}
                <motion.div
                    className="flex flex-wrap justify-center gap-3 mt-16"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                >
                    {['🌍 Global Solidarity', '🤝 Mutual Aid', '🏕️ Find Your Tribe', '✊ Stand for Truth'].map((value, i) => (
                        <motion.div
                            key={value}
                            className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/60"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.9 + i * 0.1 }}
                        >
                            {value}
                        </motion.div>
                    ))}
                </motion.div>
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
            >
                <motion.div
                    className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2"
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <div className="w-1 h-2 rounded-full bg-white/40" />
                </motion.div>
            </motion.div>
        </section>
    );
}

// ============================================
// MISSION SECTION
// Clear values, strong stance
// ============================================
function MissionSection({ mounted }: { mounted: boolean }) {
    if (!mounted) return null;

    return (
        <section id="mission" className="py-32 px-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-950/10 to-transparent" />

            <div className="relative max-w-4xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-8">
                        <span>🕌</span> Our Purpose
                    </div>

                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight leading-tight">
                        A platform for those who<br />
                        <span className="bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent">know where they stand</span>
                    </h2>

                    <p className="text-lg text-white/50 max-w-2xl mx-auto mb-12 leading-relaxed">
                        Six22 is built for communities united by shared values. We support immigrants,
                        refugees, and the displaced. We stand with the oppressed in Palestine, Sudan,
                        and everywhere justice is needed. The line between right and wrong is clear —
                        and we know which side we&apos;re on.
                    </p>

                    {/* Value pillars */}
                    <div className="grid md:grid-cols-3 gap-6 mt-12">
                        {[
                            { icon: '🌙', title: 'Rooted in Values', desc: 'Built on principles that transcend trends' },
                            { icon: '🛡️', title: 'Sanctuary', desc: 'A safe space for those on the journey' },
                            { icon: '🔥', title: 'Unwavering', desc: 'Clear stance on justice, no compromise' },
                        ].map((pillar, i) => (
                            <motion.div
                                key={pillar.title}
                                className="p-6 rounded-2xl bg-white/[0.03] border border-white/10"
                                style={{
                                    clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px)',
                                }}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <span className="text-3xl mb-4 block">{pillar.icon}</span>
                                <h3 className="text-lg font-semibold text-white mb-2">{pillar.title}</h3>
                                <p className="text-sm text-white/50">{pillar.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

// ============================================
// FEATURES SECTION
// ============================================
function FeaturesSection({ mounted }: { mounted: boolean }) {
    const features = [
        {
            icon: '🏕️',
            title: 'Tribes',
            description: 'Find your people. Join communities built around shared values, not algorithms trying to divide you.',
            color: 'from-amber-500/20 to-orange-500/20',
        },
        {
            icon: '🔥',
            title: 'Campfire',
            description: 'Go live with your inner circle. Real conversations, not performances for strangers.',
            color: 'from-rose-500/20 to-amber-500/20',
        },
        {
            icon: '🗺️',
            title: 'Journeys',
            description: 'Document your path. Your story of growth, beautifully preserved and shared.',
            color: 'from-violet-500/20 to-rose-500/20',
        },
    ];

    if (!mounted) return null;

    return (
        <section id="features" className="py-32 px-6 relative bg-[#060608]">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="text-center mb-20"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                        Built for the journey
                    </h2>
                    <p className="text-lg text-white/40 max-w-xl mx-auto">
                        Tools that strengthen bonds, not exploit attention.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8">
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            className="group relative overflow-hidden bg-white/[0.02] border border-white/10"
                            style={{
                                clipPath: 'polygon(16px 0, calc(100% - 16px) 0, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0 calc(100% - 16px), 0 16px)',
                            }}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: i * 0.1 }}
                            whileHover={{ y: -8 }}
                        >
                            <div className={`relative h-40 overflow-hidden bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                                <motion.span
                                    className="text-6xl"
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                >
                                    {feature.icon}
                                </motion.span>
                            </div>

                            <div className="p-8">
                                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                                <p className="text-white/50">{feature.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============================================
// COMMUNITY SECTION
// ============================================
function CommunitySection({ mounted }: { mounted: boolean }) {
    if (!mounted) return null;

    return (
        <section id="community" className="py-32 px-6 relative">
            <div className="max-w-4xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <div className="text-5xl mb-8">🌍</div>
                    <blockquote className="text-2xl md:text-3xl font-medium text-white mb-8 leading-relaxed">
                        &ldquo;After being displaced, finding a community that understood our journey
                        was everything. Six22 gave my family a tribe again.&rdquo;
                    </blockquote>
                    <div className="flex items-center justify-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center">
                            <span className="text-white font-semibold">A</span>
                        </div>
                        <div className="text-left">
                            <div className="font-medium text-white">Amira, Mother of Three</div>
                            <div className="text-sm text-white/40">Refugee Support Network</div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

// ============================================
// CTA SECTION
// ============================================
function CTASection({ mounted }: { mounted: boolean }) {
    if (!mounted) return null;

    return (
        <section className="relative py-32 px-6 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-950/20 via-rose-950/20 to-violet-950/20" />
            <GeometricPattern />

            <div className="relative max-w-3xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                        Your tribe is waiting
                    </h2>
                    <p className="text-lg text-white/50 mb-10 max-w-lg mx-auto">
                        Join a movement of people who choose substance over noise,
                        community over isolation, and justice over convenience.
                    </p>
                    <Link href="/signup">
                        <motion.button
                            className="bg-gradient-to-r from-amber-400 via-rose-500 to-violet-500 text-white font-semibold px-10 py-4 rounded-full text-lg shadow-lg shadow-rose-500/20"
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Join the Movement
                        </motion.button>
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}

// ============================================
// FOOTER
// ============================================
function Footer() {
    return (
        <footer className="bg-[#030305] border-t border-white/5 py-16 px-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-3">
                        <HexLogo size={36} />
                        <span className="font-semibold bg-gradient-to-r from-amber-400 via-rose-400 to-violet-400 bg-clip-text text-transparent">Six22</span>
                    </div>

                    <div className="flex items-center gap-8 text-sm text-white/40">
                        <Link href="/about" className="hover:text-white transition-colors">About</Link>
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                        <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                        <Link href="/support" className="hover:text-white transition-colors">Support</Link>
                    </div>

                    <p className="text-sm text-white/20">© 2026 Six22. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}

// ============================================
// MAIN PAGE
// ============================================
export default function LandingPage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    return (
        <div className="min-h-screen bg-[#030305]">
            <Navigation mounted={mounted} />
            <HeroSection mounted={mounted} />
            <MissionSection mounted={mounted} />
            <FeaturesSection mounted={mounted} />
            <CommunitySection mounted={mounted} />
            <CTASection mounted={mounted} />
            <Footer />
        </div>
    );
}
