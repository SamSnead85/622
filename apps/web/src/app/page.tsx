'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { GlobeIcon, VoteIcon, HeartIcon, VideoIcon, UnlockIcon, ShieldIcon, CpuIcon } from '@/components/icons';
// ImpactHub moved to dedicated /impact page — removed from landing for cleaner design

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
                    {[
                        { label: 'Vision', href: '#vision' },
                        { label: 'Platform', href: '#platform' },
                        { label: 'Security', href: '#security' },
                        { label: 'About', href: '/about' },
                        { label: 'Developers', href: '/developers' },
                    ].map((item) => (
                        <a
                            key={item.label}
                            href={item.href}
                            className="text-white/40 hover:text-white transition-colors text-sm font-light tracking-wide"
                        >
                            {item.label}
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
                        href="/early-access"
                        className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-all hover:scale-[1.02]"
                    >
                        Request Early Access
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
    // Desert landscape - Opening theme (authentic documentary-style)
    { id: 'journey', src: 'https://images.unsplash.com/photo-1548111395-36c5857f89c5?w=2000&h=1200&fit=crop&q=90' },
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
                                The Global Community Operating System
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
                        Not social media.
                        <br />
                        <span className="bg-gradient-to-r from-white via-white/80 to-white/60 bg-clip-text text-transparent">
                            A community OS.
                        </span>
                    </motion.h1>

                    {/* Sub-headline */}
                    <motion.p
                        className="mt-8 text-lg md:text-xl text-white/40 max-w-xl font-light leading-relaxed"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 1 }}
                    >
                        Build across borders. Organize movements. Connect with purpose. Broadcast truth.
                        0G is the operating system for global communities who refuse to scroll their lives away.
                    </motion.p>

                    {/* CTAs */}
                    <motion.div
                        className="mt-12 flex flex-col sm:flex-row items-start gap-4"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 1.2 }}
                    >
                        <Link
                            href="/early-access"
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
        { value: '4', label: 'Core Intents' },
        { value: 'Global', label: 'Cross-Border' },
        { value: '0', label: 'Ads, Forever' },
        { value: '100%', label: 'Signal, No Noise' },
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
                        You set your{' '}
                        <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">intent</span>.
                        <br className="hidden md:block" />
                        We show only{' '}
                        <span className="bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent">what matters</span>.
                    </h2>

                    <div className="mt-20 pt-16 border-t border-white/5 grid md:grid-cols-3 gap-12 md:gap-16 text-left">
                        {[
                            {
                                Icon: GlobeIcon,
                                color: 'from-violet-400 to-cyan-400',
                                title: 'Organize & Build',
                                description: 'Coordinate campaigns across 20 cities. Hire developers from Pakistan. Fund creators from Palestine. Build your business across borders.',
                            },
                            {
                                Icon: VoteIcon,
                                color: 'from-emerald-400 to-teal-400',
                                title: 'Connect & Broadcast',
                                description: 'Purpose-driven messaging. Live streaming with sub-1s latency. Regional broadcast hubs. No noise — only signal from people you choose.',
                            },
                            {
                                Icon: HeartIcon,
                                color: 'from-rose-400 to-pink-400',
                                title: 'Goals, Not Scrolling',
                                description: 'Set your intent. Accomplish it. Leave satisfied. Our success metric is goals achieved, not time wasted. The opposite of social media.',
                            },
                        ].map((item, i) => (
                            <motion.div
                                key={item.title}
                                initial={{ opacity: 0, y: 30 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.6, delay: 0.4 + i * 0.15 }}
                            >
                                <div className="mb-4 text-white/60">
                                    <item.Icon className="" size={28} />
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
                            <div className="w-10 h-10 rounded-lg border border-white/10 flex items-center justify-center text-white/50 flex-shrink-0">
                                <VideoIcon className="" size={20} />
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
                            <div className="w-10 h-10 rounded-lg border border-white/10 flex items-center justify-center text-white/50 flex-shrink-0">
                                <VoteIcon className="" size={20} />
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
                        { Icon: UnlockIcon, label: 'No Lock-In', desc: 'Export all, anytime' },
                        { Icon: HeartIcon, label: 'Community First', desc: 'No Ads. No Tracking.' },
                        { Icon: ShieldIcon, label: 'Privacy First', desc: 'Your data is yours' },
                        { Icon: CpuIcon, label: 'AI Co-Director', desc: 'Pro tools for all' },
                    ].map((item) => (
                        <div key={item.label} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                            <div className="flex justify-center mb-2 text-white/40">
                                <item.Icon size={22} />
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
// FULL PLATFORM CAPABILITIES
// Deep-dive marketing of every feature
// ============================================
function FullCapabilitiesSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    const capabilities = [
        {
            icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
            title: 'Private Groups & Communities',
            desc: 'Create branded spaces for family, organizations, clubs, or movements. Full admin controls, role management, custom branding, and contained environments where members exist only within their circle.',
        },
        {
            icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
            title: 'Real-Time Group Chat',
            desc: 'Integrated messaging within every community. Typing indicators, read receipts, media sharing, and persistent chat history. Move your family WhatsApp group here in seconds.',
        },
        {
            icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15.05 5A5 5 0 0119 8.95M15.05 1A9 9 0 0123 8.94M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
            title: 'Voice & Video Calling',
            desc: 'Crystal-clear peer-to-peer calls with WebRTC. Voice calls, video calls, screen sharing, and group calling. No third-party app needed. Your conversations stay on the platform.',
        },
        {
            icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>,
            title: 'Check-In Status Updates',
            desc: 'Lightweight status signals for group members. Let your family know you arrived safely, share your mood, or signal availability. Quick, contextual, and ephemeral.',
        },
        {
            icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3zM21 9H3M21 15H3M12 3v18"/></svg>,
            title: 'Community Polls',
            desc: 'Democratic decision-making built into every group. Create polls, vote anonymously, and see real-time results. Perfect for planning events, making group decisions, or gauging sentiment.',
        },
        {
            icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>,
            title: 'Shared Photo Albums',
            desc: 'Collaborative photo collections within your groups. Organize memories by event, date, or theme. Everyone in the group can contribute. No cloud storage limits on privacy.',
        },
        {
            icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
            title: 'WhatsApp Migration Tool',
            desc: 'One-click import of your WhatsApp chat history. Paste your exported chat and we preserve every message, every memory. Switching platforms has never been easier.',
        },
        {
            icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polygon points="23,7 16,12 23,17 23,7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
            title: 'Live Streaming',
            desc: 'Go live to your community with sub-second latency. Multi-platform simulcast support. The audience is your community, not an algorithm-driven recommendation.',
        },
        {
            icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>,
            title: 'Bulletin Board',
            desc: 'A dedicated space for events, jobs, collaborations, and announcements. Not buried in a feed. Organized, searchable, and community-curated for maximum visibility.',
        },
    ];

    return (
        <section id="platform" ref={ref} className="relative py-32 md:py-48">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full bg-[#00D4FF]/[0.02] blur-[150px]" />
            </div>
            <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                <motion.div
                    className="mb-20 max-w-3xl"
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8 }}
                >
                    <p className="text-[#00D4FF]/60 text-xs tracking-[0.4em] uppercase mb-4 font-light">Complete Platform</p>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-6">
                        Everything you need.
                        <br />
                        <span className="text-white/50">Nothing you don&apos;t.</span>
                    </h2>
                    <p className="text-lg text-white/40 font-light leading-relaxed">
                        Every feature on 0G was designed with one question: does this serve the member? If it doesn&apos;t protect privacy,
                        strengthen community, or empower connection, it doesn&apos;t ship.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-5">
                    {capabilities.map((cap, i) => (
                        <motion.div
                            key={cap.title}
                            className="group bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 hover:border-white/15 transition-all duration-300 hover:bg-white/[0.04]"
                            initial={{ opacity: 0, y: 30 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                        >
                            <div className="w-10 h-10 rounded-lg border border-white/[0.08] flex items-center justify-center text-white/40 mb-4">
                                {cap.icon}
                            </div>
                            <h3 className="text-white font-medium text-lg mb-2 group-hover:text-[#00D4FF] transition-colors">{cap.title}</h3>
                            <p className="text-white/40 text-sm leading-relaxed">{cap.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============================================
// TRAVEL SHIELD SECTION
// Unique security differentiator
// ============================================
function TravelShieldSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <section ref={ref} className="relative py-32 md:py-40 border-y border-white/5">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/2 right-0 w-[600px] h-[600px] rounded-full bg-amber-500/[0.03] blur-[120px]" />
            </div>
            <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                <div className="grid md:grid-cols-2 gap-16 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-6">
                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            Industry First
                        </div>
                        <h2 className="text-3xl md:text-5xl font-light text-white mb-6 leading-tight">
                            Travel Shield
                            <br />
                            <span className="text-white/40">Your privacy, even at the border</span>
                        </h2>
                        <p className="text-white/50 leading-relaxed mb-6">
                            When you&apos;re at an airport, a checkpoint, or any situation where your device might be inspected, activate Travel Shield.
                            Your real profile, conversations, groups, and content instantly disappear behind a convincing decoy identity.
                        </p>
                        <p className="text-white/50 leading-relaxed mb-6">
                            A generic profile loads with innocent content — casual photos, everyday conversations, mundane group chats.
                            There is <em className="text-white/70 not-italic font-medium">no forensic evidence</em> that a second profile exists.
                            The only way to return to your real identity is a passphrase that only you know.
                        </p>
                        <div className="space-y-3">
                            {[
                                'Cryptographically secured with SHA-256 hashed passphrases',
                                'Plausible deniability — no hidden menus or suspicious UI',
                                'Instant activation and deactivation',
                                'Decoy content that looks authentically lived-in',
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                    <span className="text-white/60 text-sm">{item}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Visual mockup */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <div className="relative">
                            {/* Phone mockup */}
                            <div className="bg-[#0A0A0F] rounded-3xl border border-white/10 p-6 shadow-2xl max-w-sm mx-auto">
                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-amber-400 text-xs font-medium flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                        Travel Shield Active
                                    </span>
                                    <span className="text-white/20 text-xs">9:41 AM</span>
                                </div>
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-14 h-14 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/50 font-medium text-lg">
                                        AT
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">Alex Thompson</p>
                                        <p className="text-white/30 text-xs">Cat lover | Gardening enthusiast</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                                        <p className="text-white/40 text-xs font-medium mb-1">Sewing Circle</p>
                                        <p className="text-white/30 text-[11px]">Does anyone have a pattern for a tote bag?</p>
                                    </div>
                                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                                        <p className="text-white/40 text-xs font-medium mb-1">Mom</p>
                                        <p className="text-white/30 text-[11px]">Don&apos;t forget to water the plants this weekend!</p>
                                    </div>
                                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                                        <p className="text-white/40 text-xs font-medium mb-1">Recipe Exchange</p>
                                        <p className="text-white/30 text-[11px]">New cookie recipe posted</p>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -bottom-3 -left-3 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-medium backdrop-blur-sm">
                                Real identity cryptographically hidden
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

// ============================================
// DEVELOPER PLATFORM SECTION
// API & Integration marketing
// ============================================
function DeveloperPlatformSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <section ref={ref} className="relative py-32 md:py-40">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="grid md:grid-cols-2 gap-16 items-center">
                    {/* Code block visual */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.8 }}
                        className="md:order-1"
                    >
                        <div className="bg-[#0A1628] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                                <span className="text-xs text-white/30 ml-2 font-mono">integration.js</span>
                            </div>
                            <pre className="p-5 text-xs sm:text-sm text-white/70 font-mono overflow-x-auto leading-relaxed">
{`// Create a community via API
const community = await fetch(
  '/api/v1/developer/public/communities',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer 0gat_...',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'My Organization',
      description: 'Built with the 0G API',
      isPublic: false,
      brandColor: '#00D4FF'
    })
  }
);`}
                            </pre>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="md:order-2"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] text-xs font-medium mb-6">
                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>
                            Developer Platform
                        </div>
                        <h2 className="text-3xl md:text-5xl font-light text-white mb-6 leading-tight">
                            Build on 0G
                            <br />
                            <span className="text-white/40">with full API access</span>
                        </h2>
                        <p className="text-white/50 leading-relaxed mb-6">
                            A comprehensive RESTful API with OAuth 2.0 authentication, granular permission scopes, and real-time webhooks.
                            Build integrations, automate workflows, or create entirely new experiences on top of the 0G platform.
                        </p>
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {[
                                { label: 'OAuth 2.0', desc: 'Secure auth flow' },
                                { label: 'Webhooks', desc: 'Real-time events' },
                                { label: 'API Keys', desc: 'Server-to-server' },
                                { label: 'Scoped Access', desc: '6 permission levels' },
                            ].map(item => (
                                <div key={item.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                                    <p className="text-white font-medium text-sm">{item.label}</p>
                                    <p className="text-white/30 text-xs">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-white/40 text-sm leading-relaxed mb-6">
                            Designed for AI agents, no-code app builders, agentic dev tools, streaming platforms, podcast tools,
                            and any third-party wanting to programmatically create communities and content on 0G.
                        </p>
                        <Link href="/developers" className="inline-flex items-center gap-2 text-[#00D4FF] text-sm font-medium hover:underline">
                            Explore Developer Portal
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                        </Link>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

// ============================================
// BUILT BY PALESTINIANS SECTION
// Origin story and identity
// ============================================
function OriginSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <section ref={ref} className="relative py-32 md:py-40 border-t border-white/5">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-emerald-500/[0.03] blur-[120px]" />
            </div>
            <div className="max-w-5xl mx-auto px-6 lg:px-8 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 1 }}
                >
                    <p className="text-white/30 text-xs tracking-[0.4em] uppercase mb-6 font-light">Our Story</p>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-light text-white leading-[1.15] mb-8">
                        100%{' '}
                        <span className="bg-gradient-to-r from-emerald-400 via-white to-red-400 bg-clip-text text-transparent">
                            Palestinian
                        </span>
                        {' '}built.
                    </h2>
                    <p className="text-lg md:text-xl text-white/40 font-light leading-relaxed max-w-3xl mx-auto mb-8">
                        0G was conceived, designed, architected, and built entirely by Palestinian engineers and creators.
                        We didn&apos;t ask for permission. We didn&apos;t wait for a seat at the table.
                        We built our own table.
                    </p>
                    <p className="text-lg text-white/40 font-light leading-relaxed max-w-3xl mx-auto mb-12">
                        Born from the lived experience of communities whose voices have been suppressed, shadow-banned,
                        and algorithmically silenced on mainstream platforms, 0G exists because we know firsthand what it means
                        to have your story erased. This platform is proof that the people whose stories are most at risk
                        are also the ones most capable of building the tools to protect them.
                    </p>
                </motion.div>

                <motion.div
                    className="grid md:grid-cols-3 gap-6 text-left"
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8, delay: 0.3 }}
                >
                    {[
                        {
                            title: 'By the community',
                            desc: 'Every design decision is informed by the needs of communities who have been underserved, surveilled, or silenced by existing platforms. We don\'t hypothesize about oppression. We\'ve lived it.',
                            iconPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
                        },
                        {
                            title: 'For the community',
                            desc: 'We will never sell your data. We will never run ads. We will never build features that exploit attention or manufacture outrage. Our only stakeholder is the person using this platform.',
                            iconPath: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
                        },
                        {
                            title: 'Open to the world',
                            desc: 'Built by Palestinians, but built for everyone. From Lagos to Lahore, from Detroit to Dhaka. For every community that deserves a platform that respects them.',
                            iconPath: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z',
                        },
                    ].map((item, i) => (
                        <motion.div
                            key={item.title}
                            className="bg-white/[0.02] border border-white/5 rounded-2xl p-6"
                            initial={{ opacity: 0, y: 20 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                        >
                            <div className="mb-4 text-white/30">
                                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d={item.iconPath}/></svg>
                            </div>
                            <h3 className="text-white font-medium mb-2">{item.title}</h3>
                            <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
                        </motion.div>
                    ))}
                </motion.div>

                <motion.div
                    className="mt-12"
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.8, delay: 0.8 }}
                >
                    <Link
                        href="/about"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white/60 hover:text-white rounded-xl text-sm font-medium hover:bg-white/10 transition-all"
                    >
                        Read our full story, architecture &amp; security principles
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}

// ============================================
// CONTAINED COMMUNITIES SECTION
// Group-Only mode explanation
// ============================================
function ContainedCommunitiesSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    const benefits = [
        {
            icon: (
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            title: 'Invisible to the outside',
            description: 'Group-only members don\'t appear in search, explore, or suggestions. As far as the platform is concerned, they don\'t exist outside their group.',
        },
        {
            icon: (
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            title: 'Only see your people',
            description: 'No global feed, no strangers\' posts, no algorithm pushing content from outside your circle. Just your group and nothing else.',
        },
        {
            icon: (
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            title: 'Safe for kids & families',
            description: 'Parents can add children to a family group without exposing them to the wider internet. No discoverability, no contact from strangers.',
        },
        {
            icon: (
                <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14 2v6h6M12 18v-6M9 15h6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            title: 'Upgrade anytime',
            description: 'A group-only account can unlock the full platform whenever they\'re ready. No data loss, no new account needed — just flip a switch.',
        },
    ];

    return (
        <section ref={ref} className="relative py-32 md:py-48">
            {/* Subtle green accent background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-emerald-500/5 blur-[150px]" />
            </div>

            <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                <motion.div
                    className="mb-20"
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8 }}
                >
                    <p className="text-emerald-400/60 text-xs tracking-[0.4em] uppercase mb-4 font-light">Contained Communities</p>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-light text-white max-w-4xl">
                        Not everyone wants to join
                        <br />
                        <span className="text-white/50">a social media platform</span>
                    </h2>
                    <p className="text-lg md:text-xl text-white/40 font-light mt-6 max-w-2xl leading-relaxed">
                        Some people just want to be in their family group. Their book club. Their friend circle.
                        0G lets them do exactly that — with zero exposure to the broader platform.
                    </p>
                </motion.div>

                {/* Hero visual */}
                <motion.div
                    className="mb-20 relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-500/10 to-emerald-900/10 border border-emerald-500/10 p-8 md:p-12"
                    initial={{ opacity: 0, y: 40 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <div className="grid md:grid-cols-2 gap-10 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-6">
                                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                                Group-Only Mode
                            </div>
                            <h3 className="text-2xl md:text-3xl font-light text-white mb-4 leading-tight">
                                A walled garden for people who don&apos;t want the noise
                            </h3>
                            <p className="text-white/40 leading-relaxed mb-6">
                                When someone receives an invite link, they choose: join the full platform, or join <em className="text-white/60 not-italic">only that group</em>.
                                Group-only members exist in a completely contained environment. They see nothing outside their group, and nobody outside sees them.
                            </p>
                            <p className="text-white/40 leading-relaxed">
                                This is a fundamentally different equation for parents worried about exposure, elders who don&apos;t want to be on &ldquo;social media,&rdquo; or anyone who just wants a private space without the toxicity of a public platform.
                            </p>
                        </div>

                        {/* Visual mockup */}
                        <div className="relative">
                            <div className="bg-[#0A0A0F] rounded-2xl border border-white/10 p-6 shadow-2xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white/50 font-medium text-sm">F</div>
                                    <div>
                                        <p className="text-white font-medium text-sm">Family Circle</p>
                                        <p className="text-white/40 text-xs">12 members</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-6 h-6 rounded-full bg-violet-500/30" />
                                            <span className="text-white/70 text-xs font-medium">Mom</span>
                                        </div>
                                        <p className="text-white/50 text-xs">Just made your favorite cookies! Come over this weekend</p>
                                    </div>
                                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-6 h-6 rounded-full bg-cyan-500/30" />
                                            <span className="text-white/70 text-xs font-medium">Uncle Ahmad</span>
                                        </div>
                                        <p className="text-white/50 text-xs">Eid dinner at our house this year. Who&apos;s bringing dessert?</p>
                                    </div>
                                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-6 h-6 rounded-full bg-rose-500/30" />
                                            <span className="text-white/70 text-xs font-medium">Cousin Layla</span>
                                        </div>
                                        <p className="text-white/50 text-xs">Photos from the graduation ceremony</p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
                                    <div className="flex-1 bg-white/5 rounded-full px-3 py-2 text-white/30 text-xs">Write something...</div>
                                </div>
                            </div>
                            {/* "No outside content" overlay hint */}
                            <div className="absolute -bottom-3 -right-3 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-medium backdrop-blur-sm">
                                No outside content visible
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Benefits grid */}
                <div className="grid md:grid-cols-2 gap-6">
                    {benefits.map((benefit, index) => (
                        <motion.div
                            key={benefit.title}
                            className="group bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 hover:border-emerald-500/20 hover:bg-emerald-500/[0.02] transition-all duration-300"
                            initial={{ opacity: 0, y: 20 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                        >
                            <div className="w-10 h-10 rounded-lg border border-white/[0.08] flex items-center justify-center text-white/40 mb-4">
                                {benefit.icon}
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">{benefit.title}</h3>
                            <p className="text-white/40 text-sm leading-relaxed">{benefit.description}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Use cases strip */}
                <motion.div
                    className="mt-16 flex flex-wrap justify-center gap-3"
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.8, delay: 0.8 }}
                >
                    {[
                        'Family groups', 'Book clubs', 'Parent committees', 'Faith communities',
                        'Study groups', 'Sports teams', 'Neighborhood watch', 'Elder care circles',
                    ].map((useCase) => (
                        <span
                            key={useCase}
                            className="px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-white/40 text-xs font-medium"
                        >
                            {useCase}
                        </span>
                    ))}
                </motion.div>
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
        },
        {
            quote: "0G has become our family's digital home. It's exactly what social media should have been from the start.",
            author: "Marcus Williams",
            role: "Community Builder",
        },
        {
            quote: "The transparency around the algorithm is refreshing. I finally understand why I see what I see.",
            author: "Aisha Rahman",
            role: "Privacy Advocate",
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
                                <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/50 font-medium text-sm">
                                    {testimonial.author[0]}
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
// PRESS & MEDIA SECTION
// Social proof and credibility
// ============================================
function PressSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    const pressItems = [
        {
            outlet: 'VibeCIO',
            title: 'ZeroG: The Digital Sovereignty Revolution',
            quote: 'A bold new platform challenging the surveillance economy with community-driven governance and true data ownership.',
            url: 'https://vibecio.com/article/zerog-digital-sovereignty-revolution',
            gradient: 'from-[#00D4FF] to-[#8B5CF6]',
        },
    ];

    return (
        <section ref={ref} className="relative py-32 border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8 }}
                >
                    <p className="text-white/30 text-xs tracking-[0.4em] uppercase mb-4 font-light">In the Press</p>
                    <h2 className="text-3xl md:text-4xl font-light text-white">
                        The world is taking notice
                    </h2>
                </motion.div>

                <div className="max-w-3xl mx-auto space-y-6">
                    {pressItems.map((item, i) => (
                        <motion.a
                            key={item.outlet}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block group"
                            initial={{ opacity: 0, y: 30 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: i * 0.15 }}
                        >
                            <div className="relative p-8 md:p-10 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-sm hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 overflow-hidden">
                                {/* Gradient accent line */}
                                <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${item.gradient} opacity-50`} />

                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div>
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${item.gradient} text-black`}>
                                            {item.outlet}
                                        </span>
                                    </div>
                                    <svg className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </div>

                                <h3 className="text-xl md:text-2xl font-light text-white mb-3 group-hover:text-[#00D4FF] transition-colors">
                                    {item.title}
                                </h3>

                                <p className="text-white/40 font-light leading-relaxed">
                                    &ldquo;{item.quote}&rdquo;
                                </p>

                                <p className="mt-4 text-[#00D4FF] text-sm font-medium group-hover:underline">
                                    Read the full article →
                                </p>
                            </div>
                        </motion.a>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============================================
// MANIFESTO / MISSION SECTION
// Bold brand statement
// ============================================
function ManifestoSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    const principles = [
        {
            number: '01',
            title: 'You Own Your Identity',
            description: 'Your profile, your posts, your data — it all belongs to you. Export it anytime. Delete it permanently. No hostage-taking.',
        },
        {
            number: '02',
            title: 'Communities Set the Rules',
            description: 'No Silicon Valley algorithm decides what you see. Your community curates its own feed, moderates its own space, governs its own future.',
        },
        {
            number: '03',
            title: 'Privacy Is Not Optional',
            description: 'End-to-end encrypted messaging. Zero data selling. No behavioral profiling. Travel Shield mode for when your device may be inspected.',
        },
        {
            number: '04',
            title: 'No Ads. No Manipulation.',
            description: 'We will never sell advertising. Our revenue comes from optional premium features, not from auctioning your attention to the highest bidder.',
        },
        {
            number: '05',
            title: 'Built for the Global Majority',
            description: 'From Lagos to Lahore, from Detroit to Dhaka — designed for communities the mainstream platforms forgot.',
        },
    ];

    return (
        <section ref={ref} className="relative py-32 md:py-40">
            {/* Subtle gradient accent */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[1px] bg-gradient-to-r from-transparent via-[#00D4FF]/20 to-transparent" />
            </div>

            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <motion.div
                    className="max-w-3xl mb-20"
                    initial={{ opacity: 0, y: 40 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 1 }}
                >
                    <p className="text-white/30 text-xs tracking-[0.4em] uppercase mb-6 font-light">Our Manifesto</p>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-light text-white leading-[1.15] mb-8">
                        Social media was a{' '}
                        <span className="bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] bg-clip-text text-transparent">
                            revolution
                        </span>{' '}
                        that got{' '}
                        <span className="text-white/40">
                            hijacked.
                        </span>
                    </h2>
                    <p className="text-lg md:text-xl text-white/40 font-light leading-relaxed">
                        It was supposed to connect us. Instead, it surveils us. It was supposed to empower communities.
                        Instead, it extracts from them. 0G exists to finish what social media started —
                        a platform where the people who use it are the people who own it.
                    </p>
                </motion.div>

                <div className="space-y-0 border-t border-white/5">
                    {principles.map((p, i) => (
                        <motion.div
                            key={p.number}
                            className="grid md:grid-cols-12 gap-4 md:gap-8 py-8 md:py-10 border-b border-white/5 group"
                            initial={{ opacity: 0, y: 20 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                        >
                            <div className="md:col-span-1">
                                <span className="text-[#00D4FF]/40 text-sm font-mono">{p.number}</span>
                            </div>
                            <div className="md:col-span-3">
                                <h3 className="text-white font-medium text-lg group-hover:text-[#00D4FF] transition-colors">
                                    {p.title}
                                </h3>
                            </div>
                            <div className="md:col-span-8">
                                <p className="text-white/40 font-light leading-relaxed">
                                    {p.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Digital Sovereignty callout */}
                <motion.div
                    className="mt-16 p-8 md:p-12 rounded-3xl bg-gradient-to-br from-[#00D4FF]/5 to-[#8B5CF6]/5 border border-[#00D4FF]/10 relative overflow-hidden"
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8, delay: 0.6 }}
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#00D4FF]/5 rounded-full blur-[100px]" />
                    <div className="relative">
                        <p className="text-[#00D4FF] text-xs tracking-[0.3em] uppercase font-medium mb-4">Digital Sovereignty</p>
                        <h3 className="text-2xl md:text-3xl font-light text-white mb-4 leading-snug max-w-2xl">
                            In the age of AI and mass surveillance, owning your digital identity isn&apos;t a luxury — it&apos;s a right.
                        </h3>
                        <p className="text-white/40 font-light max-w-2xl mb-6">
                            0G is built on the principle that your digital life should be as sovereign as your physical one.
                            Your conversations, your communities, your creative work — protected by architecture, not just policy.
                        </p>
                        <a
                            href="https://vibecio.com/article/zerog-digital-sovereignty-revolution"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-[#00D4FF] text-sm font-medium hover:underline"
                        >
                            Read about the Digital Sovereignty Revolution
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>
                </motion.div>
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
                        Build something.
                        <br />
                        <span className="bg-gradient-to-r from-white via-white/80 to-white/60 bg-clip-text text-transparent">
                            Don&apos;t just scroll.
                        </span>
                    </h2>

                    <p className="text-lg text-white/40 font-light max-w-2xl mx-auto mb-12">
                        If you&apos;re here to scroll, you&apos;re in the wrong place. If you&apos;re here to organize,
                        build, connect, or broadcast truth — welcome home. Success = goals accomplished, not time wasted.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/early-access"
                            className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-white/10"
                        >
                            Request Early Access
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
    const platformLinks = [
        { label: 'Features', href: '#platform' },
        { label: 'Developer API', href: '/developers' },
        { label: 'Security', href: '/transparency' },
    ];

    const companyLinks = [
        { label: 'About & Architecture', href: '/about' },
        { label: 'Help', href: 'mailto:support@0g.social' },
        { label: 'Contact', href: 'mailto:support@0g.social' },
    ];

    const pressLinks = [
        { label: 'VibeCIO Feature', href: 'https://vibecio.com/article/zerog-digital-sovereignty-revolution', external: true },
        { label: 'Press Kit', href: 'mailto:press@0g.social', external: true },
        { label: 'Brand Guidelines', href: '/about', external: false },
    ];

    return (
        <footer className="border-t border-white/5 py-16 bg-black/50">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="grid md:grid-cols-5 gap-12 mb-12">
                    <div className="md:col-span-2">
                        <Wordmark />
                        <p className="mt-6 text-white/30 text-sm font-light max-w-sm leading-relaxed">
                            The Global Community Operating System. Build, organize, connect, and broadcast
                            with purpose. No ads. No tracking. No noise. Just signal.
                        </p>
                        {/* Social links placeholder */}
                        <div className="flex items-center gap-4 mt-6">
                            <a href="https://twitter.com/ZeroG_Social" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-all text-sm">
                                𝕏
                            </a>
                            <a href="https://instagram.com/0gsocial" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-all">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                            </a>
                            <a href="https://tiktok.com/@0gsocial" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-all">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13a8.27 8.27 0 005.58 2.16V11.7a4.83 4.83 0 01-3.77-1.69V6.69h3.77z"/></svg>
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-white/50 text-xs tracking-widest uppercase mb-4">Platform</h4>
                        <ul className="space-y-3">
                            {platformLinks.map((item) => (
                                <li key={item.label}>
                                    <Link href={item.href} className="text-white/40 hover:text-white transition-colors text-sm font-light">
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white/50 text-xs tracking-widest uppercase mb-4">Company</h4>
                        <ul className="space-y-3">
                            {companyLinks.map((item) => (
                                <li key={item.label}>
                                    {item.href.startsWith('mailto:') ? (
                                        <a href={item.href} className="text-white/40 hover:text-white transition-colors text-sm font-light">
                                            {item.label}
                                        </a>
                                    ) : (
                                        <Link href={item.href} className="text-white/40 hover:text-white transition-colors text-sm font-light">
                                            {item.label}
                                        </Link>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white/50 text-xs tracking-widest uppercase mb-4">Press</h4>
                        <ul className="space-y-3">
                            {pressLinks.map((item) => (
                                <li key={item.label}>
                                    {item.external ? (
                                        <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors text-sm font-light flex items-center gap-1">
                                            {item.label}
                                            <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                        </a>
                                    ) : (
                                        <Link href={item.href} className="text-white/40 hover:text-white transition-colors text-sm font-light">
                                            {item.label}
                                        </Link>
                                    )}
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
                        <Link href="/transparency" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
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
            <FullCapabilitiesSection />
            <TravelShieldSection />
            <ContainedCommunitiesSection />
            <DeveloperPlatformSection />
            <ManifestoSection />
            <OriginSection />
            <PressSection />
            <CTASection />
            <Footer />
        </main>
    );
}
