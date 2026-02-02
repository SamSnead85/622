'use client';

import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { Six22Logo, GatewayHero } from '@/components/Six22Logo';

// ============================================
// PREMIUM LAYERED BACKGROUND
// Twilight journey atmosphere
// ============================================
function TwilightBackground() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
            {/* Deep void base */}
            <div className="absolute inset-0 bg-[#050508]" />

            {/* Gradient meshes */}
            <motion.div
                className="absolute -top-40 -left-40 w-[800px] h-[800px]"
                style={{
                    background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, rgba(124,58,237,0.05) 40%, transparent 70%)',
                }}
                animate={{ scale: [1, 1.1, 1], x: [0, 30, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
            />

            <motion.div
                className="absolute top-1/3 -right-40 w-[700px] h-[700px]"
                style={{
                    background: 'radial-gradient(circle, rgba(244,63,94,0.12) 0%, rgba(244,63,94,0.04) 40%, transparent 65%)',
                }}
                animate={{ scale: [1.1, 1, 1.1], x: [0, -40, 0] }}
                transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
            />

            <motion.div
                className="absolute bottom-0 left-1/3 w-[600px] h-[600px]"
                style={{
                    background: 'radial-gradient(circle, rgba(212,175,55,0.1) 0%, rgba(245,158,11,0.05) 40%, transparent 60%)',
                }}
                animate={{ y: [-20, 20, -20] }}
                transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Subtle grid */}
            <div
                className="absolute inset-0 opacity-[0.02]"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(212,175,55,0.5) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(212,175,55,0.5) 1px, transparent 1px)
                    `,
                    backgroundSize: '80px 80px',
                }}
            />

            {/* Noise texture */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                }}
            />
        </div>
    );
}

// ============================================
// NAVIGATION
// ============================================
function Navigation() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <motion.nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#050508]/90 backdrop-blur-xl border-b border-white/5' : ''
                }`}
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6 }}
        >
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <Six22Logo size="md" variant="full" />

                <div className="hidden md:flex items-center gap-8">
                    <a href="#hierarchy" className="text-white/60 hover:text-white transition-colors text-sm">
                        The Hierarchy
                    </a>
                    <a href="#algorithm" className="text-white/60 hover:text-white transition-colors text-sm">
                        Own Your Algorithm
                    </a>
                    <a href="#features" className="text-white/60 hover:text-white transition-colors text-sm">
                        Features
                    </a>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/login"
                        className="px-4 py-2 text-white/70 hover:text-white transition-colors text-sm"
                    >
                        Sign In
                    </Link>
                    <Link
                        href="/signup"
                        className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#7C3AED] via-[#F43F5E] to-[#D4AF37] text-white font-medium text-sm hover:opacity-90 transition-opacity"
                    >
                        Enter Your Territory
                    </Link>
                </div>
            </div>
        </motion.nav>
    );
}

// ============================================
// HERO SECTION
// ============================================
function HeroSection() {
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [0, 500], [0, 150]);
    const opacity = useTransform(scrollY, [0, 400], [1, 0]);

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
            {/* Gateway visual behind */}
            <motion.div
                className="absolute inset-0 flex items-center justify-center opacity-20"
                style={{ y }}
            >
                <GatewayHero className="w-[600px] h-[700px]" />
            </motion.div>

            <motion.div
                className="relative z-10 max-w-5xl mx-auto px-6 text-center"
                style={{ opacity }}
            >
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    {/* Main headline */}
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
                        <span className="bg-gradient-to-r from-[#7C3AED] via-[#F43F5E] via-[#F59E0B] to-[#D4AF37] bg-clip-text text-transparent">
                            Your Algorithm.
                        </span>
                        <br />
                        <span className="text-white">
                            Your Rules.
                        </span>
                        <br />
                        <span className="text-white/80">
                            Your Territory.
                        </span>
                    </h1>

                    <motion.p
                        className="text-xl md:text-2xl text-white/50 max-w-3xl mx-auto mb-8 leading-relaxed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        Finally, a social network where <span className="text-white">YOU</span> decide what your family sees,
                        how your community interacts, and what content gets highlighted.
                    </motion.p>

                    {/* Key differentiators */}
                    <motion.div
                        className="flex flex-wrap justify-center gap-6 mb-12"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <div className="flex items-center gap-2 text-white/70">
                            <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                            <span>Create your own Instagram for your family</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/70">
                            <div className="w-2 h-2 rounded-full bg-[#F43F5E]" />
                            <span>Build your own TikTok for your tribe</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/70">
                            <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                            <span>Set your own rules for your nation</span>
                        </div>
                    </motion.div>

                    {/* CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Link
                            href="/signup"
                            className="group relative px-8 py-4 rounded-xl overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-[#7C3AED] via-[#F43F5E] to-[#D4AF37] opacity-90 group-hover:opacity-100 transition-opacity" />
                            <span className="relative flex items-center gap-2 text-white font-semibold text-lg">
                                Enter Your Territory
                                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </span>
                        </Link>

                        <a
                            href="#hierarchy"
                            className="px-8 py-4 rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-all"
                        >
                            See How It Works
                        </a>
                    </motion.div>
                </motion.div>
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
                className="absolute bottom-8 left-1/2 -translate-x-1/2"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
                    <motion.div
                        className="w-1 h-2 rounded-full bg-white/40"
                        animate={{ y: [0, 12, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                </div>
            </motion.div>
        </section>
    );
}

// ============================================
// HIERARCHY SECTION
// ============================================
function HierarchySection() {
    const levels = [
        {
            name: 'Circle',
            size: '2-10',
            icon: '👨‍👩‍👧‍👦',
            color: '#D4AF37',
            description: 'Your Inner Sanctum',
            detail: 'Immediate family, best friends. No algorithm—just you deciding what they see.',
        },
        {
            name: 'Clan',
            size: '10-50',
            icon: '🏠',
            color: '#F59E0B',
            description: 'Extended, Not Exposed',
            detail: 'Connect cousin groups without merging. Each family keeps their privacy.',
        },
        {
            name: 'Tribe',
            size: '50-500',
            icon: '⚔️',
            color: '#F43F5E',
            description: 'Your Community, Your Constitution',
            detail: 'A larger community with elected elders. You write the moderation rules.',
        },
        {
            name: 'Nation',
            size: '500+',
            icon: '🏰',
            color: '#7C3AED',
            description: 'Movement Without Oversight',
            detail: 'Build a movement around shared purpose. Own the algorithm entirely.',
        },
    ];

    return (
        <section id="hierarchy" className="relative py-32 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                <motion.div
                    className="text-center mb-20"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        The Hierarchy of <span className="bg-gradient-to-r from-[#D4AF37] to-[#F43F5E] bg-clip-text text-transparent">Sovereignty</span>
                    </h2>
                    <p className="text-xl text-white/50 max-w-2xl mx-auto">
                        From your closest circle to a nation of thousands—each level has its own rules, its own algorithm, its own governance.
                    </p>
                </motion.div>

                {/* Hierarchy visualization */}
                <div className="relative">
                    {/* Connecting lines */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#D4AF37] via-[#F43F5E] to-[#7C3AED] opacity-30" />

                    <div className="space-y-12">
                        {levels.map((level, index) => (
                            <motion.div
                                key={level.name}
                                className={`flex items-center gap-8 ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
                                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className={`flex-1 ${index % 2 === 0 ? 'text-right' : 'text-left'}`}>
                                    <div
                                        className="inline-block px-4 py-1 rounded-full text-sm mb-2"
                                        style={{ backgroundColor: `${level.color}20`, color: level.color }}
                                    >
                                        {level.size} members
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-1">{level.name}</h3>
                                    <p className="text-lg text-white/70 mb-2">{level.description}</p>
                                    <p className="text-white/40">{level.detail}</p>
                                </div>

                                <div
                                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
                                    style={{
                                        backgroundColor: `${level.color}15`,
                                        border: `2px solid ${level.color}40`,
                                        boxShadow: `0 0 40px ${level.color}20`,
                                    }}
                                >
                                    {level.icon}
                                </div>

                                <div className="flex-1" />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

// ============================================
// ALGORITHM OWNERSHIP SECTION
// ============================================
function AlgorithmSection() {
    const comparisons = [
        {
            them: 'Algorithm decides what you see',
            us: 'YOU configure your feed formula',
        },
        {
            them: 'Faceless moderators ban your content',
            us: 'Your tribe elder reviews—someone you know',
        },
        {
            them: 'One global policy for 2 billion people',
            us: 'Each circle sets their own guidelines',
        },
        {
            them: 'Your data fuels their ads',
            us: 'Your data stays in your territory',
        },
    ];

    return (
        <section id="algorithm" className="relative py-32 overflow-hidden bg-gradient-to-b from-transparent via-[#7C3AED]/5 to-transparent">
            <div className="max-w-6xl mx-auto px-6">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        Own Your <span className="bg-gradient-to-r from-[#F43F5E] to-[#7C3AED] bg-clip-text text-transparent">Algorithm</span>
                    </h2>
                    <p className="text-xl text-white/50 max-w-2xl mx-auto">
                        No more wondering why you see what you see. You control the formula.
                    </p>
                </motion.div>

                {/* Comparison table */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Them column */}
                    <motion.div
                        className="p-8 rounded-2xl border border-red-500/20 bg-red-500/5"
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                                ✕
                            </div>
                            <h3 className="text-xl font-bold text-red-400">Other Platforms</h3>
                        </div>
                        <ul className="space-y-4">
                            {comparisons.map((c, i) => (
                                <li key={i} className="flex items-start gap-3 text-white/50">
                                    <span className="text-red-400 mt-1">•</span>
                                    {c.them}
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Us column */}
                    <motion.div
                        className="p-8 rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/5"
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]">
                                ✓
                            </div>
                            <h3 className="text-xl font-bold text-[#D4AF37]">Six22</h3>
                        </div>
                        <ul className="space-y-4">
                            {comparisons.map((c, i) => (
                                <li key={i} className="flex items-start gap-3 text-white/70">
                                    <span className="text-[#D4AF37] mt-1">•</span>
                                    {c.us}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                </div>

                {/* Algorithm controls preview */}
                <motion.div
                    className="mt-16 p-8 rounded-2xl border border-white/10 bg-white/[0.02]"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h3 className="text-xl font-bold text-white mb-6">Your Algorithm Settings</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'Recency Weight', value: 70, color: '#D4AF37' },
                            { label: 'Engagement Weight', value: 40, color: '#F59E0B' },
                            { label: 'Familiarity Weight', value: 90, color: '#F43F5E' },
                            { label: 'Novelty Weight', value: 30, color: '#7C3AED' },
                        ].map((setting) => (
                            <div key={setting.label}>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-white/70">{setting.label}</span>
                                    <span style={{ color: setting.color }}>{setting.value}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                    <motion.div
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: setting.color }}
                                        initial={{ width: 0 }}
                                        whileInView={{ width: `${setting.value}%` }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                    />
                                </div>
                            </div>
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
function FeaturesSection() {
    const features = [
        {
            icon: '🔐',
            title: 'Moderation You Control',
            description: 'Set content ratings, banned keywords, and strike thresholds for your community.',
        },
        {
            icon: '🔗',
            title: 'Federated Connections',
            description: 'Link circles to clans, clans to tribes—each maintaining independence.',
        },
        {
            icon: '📊',
            title: 'Transparent Feed',
            description: 'See exactly why each post appears. Adjust weights in real-time.',
        },
        {
            icon: '👑',
            title: 'Governance Tiers',
            description: 'Elders, councils, admins—structured leadership for organized communities.',
        },
        {
            icon: '🛡️',
            title: 'Strike System',
            description: 'Configure warnings, strikes, and bans. Your rules, your enforcement.',
        },
        {
            icon: '🌐',
            title: 'Cross-Group Sharing',
            description: 'Share between connected groups with granular permission controls.',
        },
    ];

    return (
        <section id="features" className="relative py-32">
            <div className="max-w-7xl mx-auto px-6">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        Built for <span className="bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] bg-clip-text text-transparent">Sovereignty</span>
                    </h2>
                    <p className="text-xl text-white/50 max-w-2xl mx-auto">
                        Every feature designed to put power in your hands.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 transition-all"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className="text-4xl mb-4">{feature.icon}</div>
                            <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                            <p className="text-white/50">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============================================
// CTA SECTION
// ============================================
function CTASection() {
    return (
        <section className="relative py-32">
            <div className="max-w-4xl mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <Six22Logo size="xl" variant="mark" className="justify-center mb-8" />

                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        Ready to claim your territory?
                    </h2>
                    <p className="text-xl text-white/50 mb-10 max-w-2xl mx-auto">
                        Join the movement of families, tribes, and nations building their own sovereign digital spaces.
                    </p>

                    <Link
                        href="/signup"
                        className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-gradient-to-r from-[#7C3AED] via-[#F43F5E] to-[#D4AF37] text-white font-semibold text-lg hover:opacity-90 transition-opacity"
                    >
                        Enter Your Territory
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
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
        <footer className="border-t border-white/5 py-12">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <Six22Logo size="sm" variant="full" />

                    <div className="flex items-center gap-6 text-sm text-white/40">
                        <a href="#" className="hover:text-white transition-colors">Privacy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms</a>
                        <a href="#" className="hover:text-white transition-colors">Contact</a>
                    </div>

                    <p className="text-sm text-white/30">
                        © 2026 Six22. Your Territory.
                    </p>
                </div>
            </div>
        </footer>
    );
}

// ============================================
// MAIN PAGE
// ============================================
export default function HomePage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="min-h-screen bg-[#050508] flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#050508] text-white overflow-x-hidden">
            <TwilightBackground />
            <Navigation />
            <HeroSection />
            <HierarchySection />
            <AlgorithmSection />
            <FeaturesSection />
            <CTASection />
            <Footer />
        </main>
    );
}
