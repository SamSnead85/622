'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { GlobeIcon, VoteIcon, HeartIcon, VideoIcon, UnlockIcon, DollarIcon, ShieldIcon, CpuIcon } from '@/components/icons';
import { ImpactSection } from '@/components/ImpactHub';

// ============================================
// ULTRA-PREMIUM DESIGN SYSTEM
// Institutional-grade aesthetics
// ============================================

// ============================================
// ANIMATED GRADIENT ORB BACKGROUND
// Cinematic, layered depth
// ============================================
function AmbientBackground() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {/* Base gradient */}
            <div className="absolute inset-0 bg-[#030305]" />

            {/* Animated gradient orbs */}
            <motion.div
                className="absolute -top-1/4 -left-1/4 w-[800px] h-[800px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
                }}
                animate={{
                    x: [0, 100, 0],
                    y: [0, 50, 0],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute -bottom-1/4 -right-1/4 w-[900px] h-[900px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)',
                }}
                animate={{
                    x: [0, -80, 0],
                    y: [0, -60, 0],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute top-1/3 right-1/4 w-[600px] h-[600px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)',
                }}
                animate={{
                    x: [0, 60, 0],
                    y: [0, -40, 0],
                }}
                transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Subtle noise texture overlay */}
            <div
                className="absolute inset-0 opacity-[0.015]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
            />
        </div>
    );
}

// ============================================
// PREMIUM WORDMARK
// Sophisticated typographic identity
// ============================================
function Wordmark() {
    return (
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/90 to-white/70 flex items-center justify-center">
                <span className="text-black font-bold text-lg tracking-tight">0G</span>
            </div>
            <span className="text-white/80 font-light tracking-[0.2em] text-sm uppercase hidden sm:block">
                ZeroG
            </span>
        </div>
    );
}

// ============================================
// PREMIUM NAVIGATION
// Glassmorphic, minimal
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
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
                ? 'bg-black/70 backdrop-blur-2xl border-b border-white/5 py-4'
                : 'bg-transparent py-6'
                }`}
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
        >
            <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
                <Link href="/">
                    <Wordmark />
                </Link>

                <div className="hidden md:flex items-center gap-10">
                    {['Vision', 'Platform', 'Community'].map((item) => (
                        <a
                            key={item}
                            href={`#${item.toLowerCase()}`}
                            className="text-white/40 hover:text-white transition-colors text-sm font-light tracking-wide"
                        >
                            {item}
                        </a>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <Link
                        href="/login"
                        className="text-white/50 hover:text-white transition-colors text-sm font-light"
                    >
                        Sign In
                    </Link>
                    <Link
                        href="/signup"
                        className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-all hover:scale-[1.02]"
                    >
                        Get Started
                    </Link>
                </div>
            </div>
        </motion.nav>
    );
}

// ============================================
// CINEMATIC HERO SECTION
// Full-screen with layered depth
// "Around the World" cultural journey carousel
// ============================================

const heroImages = [
    // Desert Caravan - Opening theme (authentic documentary-style)
    { id: 'caravan', src: 'https://images.unsplash.com/photo-1548111395-36c5857f89c5?w=2000&h=1200&fit=crop&q=90' },
    // Modern African life - Contemporary community scene
    { id: 'african-modern', src: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=2000&h=1200&fit=crop&q=90' },
    // Black family/community - Modern, natural, warm family moment
    { id: 'black-community', src: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=2000&h=1200&fit=crop&q=90' },
    // Japanese modern life - Tokyo street life, contemporary culture
    { id: 'japanese-modern', src: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=2000&h=1200&fit=crop&q=90' },
    // Indian celebration - Holi festival/modern Diwali celebration
    { id: 'indian-festival', src: 'https://images.unsplash.com/photo-1514222134-b57cbb8ce073?w=2000&h=1200&fit=crop&q=90' },
    // Latin American community - Modern street scene/family
    { id: 'latin-community', src: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=2000&h=1200&fit=crop&q=90' },
    // Middle Eastern culture - Modern city/authentic moment
    { id: 'middle-eastern', src: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=2000&h=1200&fit=crop&q=90' },
    // Asian American family - Contemporary, natural moment
    { id: 'asian-american', src: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=2000&h=1200&fit=crop&q=90' },
    // Pacific Islander - Modern Polynesian culture
    { id: 'pacific-islander', src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000&h=1200&fit=crop&q=90' },
    // Jerusalem Skyline - Historic significance
    { id: 'jerusalem', src: 'https://images.unsplash.com/photo-1547483238-f400e65ccd56?w=2000&h=1200&fit=crop&q=90' },
    // Mountain Horizon - Universal aspiration
    { id: 'horizon', src: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=2000&h=1200&fit=crop&q=90' },
];

function HeroSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeHeroImage, setActiveHeroImage] = useState(0);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ['start start', 'end start'],
    });

    const y = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
    const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
    const scale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);

    // Auto-rotate hero images every 4 seconds for flowing world tour effect
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveHeroImage((prev) => (prev + 1) % heroImages.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);


    return (
        <section ref={containerRef} className="relative h-screen overflow-hidden">
            {/* Background Image with Parallax */}
            <motion.div className="absolute inset-0" style={{ y, scale }}>
                {/* Multi-layer gradient overlays for depth */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#030305] via-transparent to-[#030305] z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#030305]/90 via-transparent to-[#030305]/90 z-10" />
                <div className="absolute inset-0 bg-black/30 z-10" />

                {/* Rotating Hero Images - Smooth 2s crossfade to eliminate black gaps */}
                {heroImages.map((img, index) => (
                    <Image
                        key={img.id}
                        src={img.src}
                        alt=""
                        fill
                        className={`object-cover transition-opacity duration-[2000ms] ease-in-out ${index === activeHeroImage ? 'opacity-100' : 'opacity-0'
                            }`}
                        priority={index <= 2}
                    />
                ))}
            </motion.div>

            {/* Hero Content */}
            <motion.div
                className="relative z-20 h-full flex flex-col justify-center"
                style={{ opacity }}
            >
                <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full">
                    {/* Eyebrow */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className="mb-8"
                    >
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-white/60 text-xs tracking-widest uppercase font-light">
                                Now Accepting Early Members
                            </span>
                        </span>
                    </motion.div>

                    {/* Main Headline */}
                    <motion.h1
                        className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light text-white leading-[1.05] tracking-tight max-w-5xl"
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.7 }}
                    >
                        Social media
                        <br />
                        <span className="bg-gradient-to-r from-white via-white/80 to-white/60 bg-clip-text text-transparent">
                            without the weight
                        </span>
                    </motion.h1>

                    {/* Sub-headline */}
                    <motion.p
                        className="mt-8 text-lg md:text-xl text-white/40 max-w-xl font-light leading-relaxed"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 1 }}
                    >
                        A platform where truth-tellers share their stories, communities decide what matters,
                        and you own everything you create. No lock-in. No exploitation.
                    </motion.p>

                    {/* CTAs */}
                    <motion.div
                        className="mt-12 flex flex-col sm:flex-row items-start gap-4"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 1.2 }}
                    >
                        <Link
                            href="/signup"
                            className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-white/10"
                        >
                            Request Early Access
                            <svg
                                className="w-4 h-4 transition-transform group-hover:translate-x-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </Link>
                        <a
                            href="#vision"
                            className="inline-flex items-center gap-2 px-6 py-4 text-white/50 hover:text-white transition-colors text-sm font-light"
                        >
                            <span className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                                </svg>
                            </span>
                            Learn more
                        </a>
                    </motion.div>
                </div>
            </motion.div>

            {/* Scroll Indicator */}
            <motion.div
                className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
            >
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-px h-16 bg-gradient-to-b from-white/30 to-transparent"
                />
            </motion.div>
        </section>
    );
}

// ============================================
// SOCIAL PROOF / STATS SECTION
// Premium metrics display
// ============================================
function StatsSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    const stats = [
        { value: '50K+', label: 'Early Members' },
        { value: '180+', label: 'Countries' },
        { value: '4.9', label: 'App Store Rating' },
        { value: '0', label: 'Ads, Forever' },
    ];

    return (
        <section ref={ref} className="relative py-20 border-y border-white/5 bg-black/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            className="text-center"
                            initial={{ opacity: 0, y: 30 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: i * 0.1 }}
                        >
                            <p className="text-4xl md:text-5xl font-light text-white mb-2">{stat.value}</p>
                            <p className="text-sm text-white/40 tracking-wide">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============================================
// VISION SECTION
// Editorial typography
// ============================================
function VisionSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <section id="vision" ref={ref} className="relative py-32 md:py-48">
            <div className="max-w-5xl mx-auto px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 1 }}
                    className="text-center"
                >
                    <p className="text-white/30 text-xs tracking-[0.4em] uppercase mb-8 font-light">Our Belief</p>

                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-light text-white leading-tight">
                        The truth should reach{' '}
                        <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">every corner</span> of the world.
                        <br className="hidden md:block" />
                        And the{' '}
                        <span className="bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent">community</span> should decide what matters.
                    </h2>

                    <div className="mt-20 pt-16 border-t border-white/5 grid md:grid-cols-3 gap-12 md:gap-16 text-left">
                        {[
                            {
                                Icon: GlobeIcon,
                                color: 'from-violet-400 to-cyan-400',
                                title: 'Global Truth-Tellers',
                                description: 'From journalists in conflict zones to activists documenting change—voices that matter reach the world without gatekeepers.',
                            },
                            {
                                Icon: VoteIcon,
                                color: 'from-emerald-400 to-teal-400',
                                title: 'Community-Driven Feed',
                                description: 'Vote on what you want to see. Rank what matters. The algorithm serves you, not advertisers. Transparent. Always.',
                            },
                            {
                                Icon: HeartIcon,
                                color: 'from-rose-400 to-pink-400',
                                title: 'Collective Sponsorship',
                                description: 'Rally your community to sponsor a storyteller. Fund a live stream from anywhere in the world. Together.',
                            },
                        ].map((item, i) => (
                            <motion.div
                                key={item.title}
                                initial={{ opacity: 0, y: 30 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.6, delay: 0.4 + i * 0.15 }}
                            >
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4`}>
                                    <item.Icon className="text-white" size={24} />
                                </div>
                                <h3 className="text-white font-medium mb-3">{item.title}</h3>
                                <p className="text-white/50 font-light leading-relaxed text-sm">
                                    {item.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

// ============================================
// STORY-TELLERS SECTION
// The heart of what 0G is for
// ============================================
function StoryTellersSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <section ref={ref} className="relative py-24 border-y border-white/5 bg-gradient-to-b from-black/50 to-transparent">
            <div className="max-w-6xl mx-auto px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-16"
                >
                    <p className="text-white/30 text-xs tracking-[0.4em] uppercase mb-4 font-light">Why We Built This</p>
                    <h2 className="text-3xl md:text-4xl font-light text-white leading-tight max-w-3xl mx-auto">
                        Every story deserves to be heard.
                        <br />
                        <span className="text-white/50">Every voice deserves a platform.</span>
                    </h2>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Story Card 1 */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                    >
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                                <VideoIcon className="text-white" size={22} />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-white">Live from the Ground</h3>
                                <p className="text-white/40 text-sm">Sub-1-second latency</p>
                            </div>
                        </div>
                        <p className="text-white/60 font-light leading-relaxed">
                            While other platforms have 3-5 second delays, our &lt;1s latency means real-time
                            interaction. Ask questions. Get answers. Be there.
                        </p>
                        <div className="mt-6 flex items-center gap-2 text-emerald-400 text-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Real-time streaming
                        </div>
                    </motion.div>

                    {/* Story Card 2 */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                    >
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
                                <VoteIcon className="text-white" size={22} />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-white">Community Decides</h3>
                                <p className="text-white/40 text-sm">Transparent algorithm</p>
                            </div>
                        </div>
                        <p className="text-white/60 font-light leading-relaxed">
                            Vote on what stories matter. Collectively sponsor journalists and creators to go
                            share truth with the world. The community is the curator.
                        </p>
                        <div className="mt-6 flex items-center gap-2 text-violet-400 text-sm">
                            <span className="w-2 h-2 rounded-full bg-violet-400" />
                            Collective action
                        </div>
                    </motion.div>
                </div>

                {/* Differentiators Strip */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                    {[
                        { Icon: UnlockIcon, label: 'No Lock-In', desc: 'Export all, anytime', color: 'text-emerald-400' },
                        { Icon: DollarIcon, label: 'Creators Keep 90%', desc: 'Not 50% like others', color: 'text-amber-400' },
                        { Icon: ShieldIcon, label: 'Privacy First', desc: 'Your data is yours', color: 'text-violet-400' },
                        { Icon: CpuIcon, label: 'AI Co-Director', desc: 'Pro tools for all', color: 'text-cyan-400' },
                    ].map((item) => (
                        <div key={item.label} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                            <div className="flex justify-center mb-2">
                                <item.Icon className={item.color} size={28} />
                            </div>
                            <p className="text-white text-sm font-medium mt-2">{item.label}</p>
                            <p className="text-white/40 text-xs mt-1">{item.desc}</p>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}

// ============================================
// FEATURES SECTION
// Premium feature cards
// ============================================
function FeaturesSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    const features = [
        {
            title: 'Your Circle, Your Rules',
            description: 'Create private spaces for family, friends, or communities. You decide who joins, what gets shared, and how moderation works.',
            image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=900&h=600&fit=crop&q=90',
            gradient: 'from-violet-500/20 to-indigo-500/20',
        },
        {
            title: 'Go Live, Stay Connected',
            description: 'Stream moments in real-time to the people who matter. No follower counts, no performance metrics—just presence.',
            image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&h=600&fit=crop&q=90',
            gradient: 'from-rose-500/20 to-orange-500/20',
        },
        {
            title: 'Stories That Matter',
            description: 'Share short-form moments with your tribe. Not to go viral, but to document the journey you are on together.',
            image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=900&h=600&fit=crop&q=90',
            gradient: 'from-cyan-500/20 to-emerald-500/20',
        },
    ];

    return (
        <section id="platform" ref={ref} className="relative py-32 md:py-48">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <motion.div
                    className="mb-20"
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8 }}
                >
                    <p className="text-white/30 text-xs tracking-[0.4em] uppercase mb-4 font-light">Platform</p>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-light text-white">
                        Built for meaningful
                        <br />
                        <span className="text-white/50">connection</span>
                    </h2>
                </motion.div>

                <div className="space-y-24 md:space-y-32">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            className={`grid md:grid-cols-2 gap-12 md:gap-20 items-center ${index % 2 === 1 ? 'md:flex-row-reverse' : ''
                                }`}
                            initial={{ opacity: 0, y: 60 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.8, delay: index * 0.2 }}
                        >
                            <div className={index % 2 === 1 ? 'md:order-2' : ''}>
                                <h3 className="text-3xl md:text-4xl font-light text-white mb-6 leading-tight">
                                    {feature.title}
                                </h3>
                                <p className="text-lg text-white/40 font-light leading-relaxed mb-8">
                                    {feature.description}
                                </p>
                                <Link
                                    href="/signup"
                                    className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
                                >
                                    Learn more
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </Link>
                            </div>
                            <div className={`relative aspect-[4/3] rounded-2xl overflow-hidden group ${index % 2 === 1 ? 'md:order-1' : ''}`}>
                                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} z-10 mix-blend-overlay`} />
                                <Image
                                    src={feature.image}
                                    alt={feature.title}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 border border-white/10 rounded-2xl z-20" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============================================
// TESTIMONIALS SECTION
// Premium social proof
// ============================================
function TestimonialsSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    const testimonials = [
        {
            quote: "Finally, a platform where I can share family moments without worrying about privacy or algorithms.",
            author: "Sarah Chen",
            role: "Mother of 3",
            avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
        },
        {
            quote: "0G has become our family's digital home. It's exactly what social media should have been from the start.",
            author: "Marcus Williams",
            role: "Community Builder",
            avatar: "https://ui-avatars.com/api/?name=User&background=random",
        },
        {
            quote: "The transparency around the algorithm is refreshing. I finally understand why I see what I see.",
            author: "Aisha Rahman",
            role: "Privacy Advocate",
            avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
        },
    ];

    return (
        <section ref={ref} className="relative py-32 border-y border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8 }}
                >
                    <p className="text-white/30 text-xs tracking-[0.4em] uppercase mb-4 font-light">Testimonials</p>
                    <h2 className="text-3xl md:text-4xl font-light text-white">
                        Loved by early members
                    </h2>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, i) => (
                        <motion.div
                            key={testimonial.author}
                            className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm"
                            initial={{ opacity: 0, y: 30 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: i * 0.15 }}
                        >
                            <p className="text-white/70 font-light leading-relaxed mb-8 text-lg">
                                &ldquo;{testimonial.quote}&rdquo;
                            </p>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full overflow-hidden relative">
                                    <Image
                                        src={testimonial.avatar}
                                        alt={testimonial.author}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div>
                                    <p className="text-white font-medium">{testimonial.author}</p>
                                    <p className="text-white/40 text-sm">{testimonial.role}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============================================
// CTA SECTION
// Final conversion section
// ============================================
function CTASection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <section id="community" ref={ref} className="relative py-32 md:py-48">
            <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 1 }}
                >
                    <p className="text-white/30 text-xs tracking-[0.4em] uppercase mb-8 font-light">Join Us</p>

                    <h2 className="text-4xl md:text-6xl lg:text-7xl font-light text-white leading-tight mb-8">
                        Ready to experience
                        <br />
                        <span className="bg-gradient-to-r from-white via-white/80 to-white/60 bg-clip-text text-transparent">
                            social, reimagined?
                        </span>
                    </h2>

                    <p className="text-lg text-white/40 font-light max-w-2xl mx-auto mb-12">
                        Join thousands who are building a better social future.
                        No ads. No algorithms. Just genuine connection.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/signup"
                            className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-white/10"
                        >
                            Get Early Access
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </Link>
                        <span className="text-white/30 text-sm">
                            Limited spots available
                        </span>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

// ============================================
// PREMIUM FOOTER
// Sophisticated, comprehensive
// ============================================
function Footer() {
    return (
        <footer className="border-t border-white/5 py-16 bg-black/50">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="grid md:grid-cols-4 gap-12 mb-12">
                    <div className="md:col-span-2">
                        <Wordmark />
                        <p className="mt-6 text-white/30 text-sm font-light max-w-sm leading-relaxed">
                            Social media without the weight. A platform built on transparency,
                            privacy, and genuine human connection.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-white/50 text-xs tracking-widest uppercase mb-4">Platform</h4>
                        <ul className="space-y-3">
                            {['Features', 'Security', 'Roadmap', 'Download'].map((item) => (
                                <li key={item}>
                                    <a href="#" className="text-white/40 hover:text-white transition-colors text-sm font-light">
                                        {item}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white/50 text-xs tracking-widest uppercase mb-4">Company</h4>
                        <ul className="space-y-3">
                            {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                                <li key={item}>
                                    <a href="#" className="text-white/40 hover:text-white transition-colors text-sm font-light">
                                        {item}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-white/20 text-xs">
                        © 2026 ZeroG. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6 text-xs text-white/30">
                        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                        <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function HomePage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="min-h-screen bg-[#030305] flex items-center justify-center">
                <div className="w-10 h-10 border border-white/20 border-t-white/80 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#030305] text-white overflow-x-hidden">
            <AmbientBackground />
            <Navigation />
            <HeroSection />
            <VisionSection />
            <StoryTellersSection />
            <ImpactSection />
            <FeaturesSection />
            <CTASection />
            <Footer />
        </main>
    );
}
