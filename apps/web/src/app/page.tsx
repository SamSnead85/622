'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { Six22Logo, Six22PatternBg, JourneyPath } from '@/components/Six22Logo';

// ============================================
// SIX22 - THE REVOLUTIONARY SOCIAL PLATFORM
// Year 622 CE - The Journey Begins
// "Not just another social app. This is YOUR journey."
// ============================================

// Animated Stars Background
function StarField() {
    const stars = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 5,
        duration: Math.random() * 3 + 2,
    }));

    return (
        <div className="absolute inset-0 overflow-hidden">
            {stars.map(star => (
                <motion.div
                    key={star.id}
                    className="absolute rounded-full bg-white"
                    style={{
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        width: star.size,
                        height: star.size,
                    }}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: star.duration, delay: star.delay, repeat: Infinity }}
                />
            ))}
        </div>
    );
}

// Navigation
function Navigation() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <motion.nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/5' : ''
                }`}
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
        >
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <Six22Logo size="sm" animated={false} />

                <div className="hidden md:flex items-center gap-8">
                    <Link href="#features" className="text-white/60 hover:text-white transition-colors text-sm">Features</Link>
                    <Link href="#journey" className="text-white/60 hover:text-white transition-colors text-sm">The Journey</Link>
                    <Link href="#tribes" className="text-white/60 hover:text-white transition-colors text-sm">Tribes</Link>
                </div>

                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-white/70 hover:text-white transition-colors text-sm font-medium">
                        Sign In
                    </Link>
                    <Link
                        href="/signup"
                        className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#D4AF37] via-[#F59E0B] to-[#F43F5E] text-white font-semibold text-sm hover:shadow-lg hover:shadow-amber-500/25 transition-all"
                    >
                        Join the Journey
                    </Link>
                </div>
            </div>
        </motion.nav>
    );
}

// Hero Section - The wow factor
function HeroSection() {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
    const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    return (
        <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Background layers */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#030305] via-[#0a0a15] to-[#050510]" />
            <StarField />
            <Six22PatternBg opacity={0.02} />

            {/* Ambient glows */}
            <motion.div
                className="absolute top-1/4 left-1/4 w-[800px] h-[800px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 60%)',
                    y
                }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 10, repeat: Infinity }}
            />
            <motion.div
                className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 60%)',
                }}
                animate={{ scale: [1.1, 1, 1.1] }}
                transition={{ duration: 12, repeat: Infinity }}
            />

            {/* Main content */}
            <motion.div
                className="relative z-10 max-w-5xl mx-auto px-6 text-center"
                style={{ opacity }}
            >
                {/* Logo */}
                <motion.div
                    className="flex justify-center mb-8"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
                >
                    <Six22Logo size="hero" variant="mark" />
                </motion.div>

                {/* Main headline */}
                <motion.h1
                    className="text-5xl md:text-7xl lg:text-8xl font-extrabold mb-6 tracking-tight"
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                >
                    <span className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">
                        Not Just Social.
                    </span>
                    <br />
                    <span className="bg-gradient-to-r from-[#D4AF37] via-[#F59E0B] to-[#F43F5E] bg-clip-text text-transparent">
                        Sovereign.
                    </span>
                </motion.h1>

                {/* Subheadline */}
                <motion.p
                    className="text-xl md:text-2xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                >
                    Own your data. Choose your algorithm. Build your tribe.
                    <br />
                    <span className="text-white/40">Year 622 - The journey that changed everything.</span>
                </motion.p>

                {/* CTAs */}
                <motion.div
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.7 }}
                >
                    <Link
                        href="/signup"
                        className="group relative px-8 py-4 rounded-full bg-gradient-to-r from-[#D4AF37] via-[#F59E0B] to-[#F43F5E] text-white font-bold text-lg overflow-hidden"
                    >
                        <span className="relative z-10">Start Your Journey</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-[#F43F5E] via-[#8B5CF6] to-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </Link>
                    <Link
                        href="#features"
                        className="px-8 py-4 rounded-full border border-white/20 text-white/80 font-medium hover:bg-white/5 hover:border-white/30 transition-all"
                    >
                        Explore Features
                    </Link>
                </motion.div>

                {/* Stats */}
                <motion.div
                    className="flex items-center justify-center gap-12 mt-16"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 1 }}
                >
                    {[
                        { value: '100%', label: 'Data Ownership' },
                        { value: 'Your', label: 'Algorithm' },
                        { value: '∞', label: 'Connections' },
                    ].map((stat, i) => (
                        <div key={i} className="text-center">
                            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] bg-clip-text text-transparent">
                                {stat.value}
                            </div>
                            <div className="text-sm text-white/40 mt-1">{stat.label}</div>
                        </div>
                    ))}
                </motion.div>
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
                className="absolute bottom-10 left-1/2 -translate-x-1/2"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                <div className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2">
                    <div className="w-1.5 h-3 rounded-full bg-gradient-to-b from-[#D4AF37] to-[#F43F5E]" />
                </div>
            </motion.div>
        </section>
    );
}

// Features Section - What makes Six22 unique
function FeaturesSection() {
    const features = [
        {
            icon: '🔐',
            title: 'Data Sovereignty',
            description: 'Your data stays yours. Export anytime. No selling to advertisers. Ever.',
            gradient: 'from-[#D4AF37] to-[#F59E0B]',
        },
        {
            icon: '🎛️',
            title: 'Algorithm Control',
            description: 'You decide what you see. Tune your feed. No black-box manipulation.',
            gradient: 'from-[#F59E0B] to-[#F43F5E]',
        },
        {
            icon: '⭐',
            title: 'Tribes, Not Followers',
            description: 'Build meaningful communities. Quality connections over vanity metrics.',
            gradient: 'from-[#F43F5E] to-[#8B5CF6]',
        },
        {
            icon: '🏕️',
            title: 'Caravans',
            description: 'Temporary group journeys. Explore topics together, then part ways gracefully.',
            gradient: 'from-[#8B5CF6] to-[#D4AF37]',
        },
        {
            icon: '🌴',
            title: 'Oasis Spaces',
            description: 'Private gathering spots for your inner circle. Share moments that matter.',
            gradient: 'from-[#D4AF37] to-[#F43F5E]',
        },
        {
            icon: '🧭',
            title: 'Compass Discovery',
            description: 'Find content based on your values, not engagement tricks.',
            gradient: 'from-[#F59E0B] to-[#8B5CF6]',
        },
    ];

    return (
        <section id="features" className="relative py-32 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#050510] via-[#0a0a15] to-[#030305]" />
            <Six22PatternBg opacity={0.015} />

            <div className="relative z-10 max-w-7xl mx-auto px-6">
                <motion.div
                    className="text-center mb-20"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                        <span className="text-white">Beyond Social.</span>{' '}
                        <span className="bg-gradient-to-r from-[#D4AF37] to-[#F43F5E] bg-clip-text text-transparent">
                            Revolutionary.
                        </span>
                    </h2>
                    <p className="text-xl text-white/50 max-w-2xl mx-auto">
                        Features that put you first. Not advertisers. Not algorithms. You.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, i) => (
                        <motion.div
                            key={i}
                            className="group relative p-8 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all duration-500"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ y: -5 }}
                        >
                            {/* Glow on hover */}
                            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                            <div className="relative z-10">
                                <div className="text-4xl mb-4">{feature.icon}</div>
                                <h3 className={`text-xl font-bold mb-3 bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                                    {feature.title}
                                </h3>
                                <p className="text-white/50 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// Journey Section - The story
function JourneySection() {
    return (
        <section id="journey" className="relative py-32 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#030305] to-[#0a0a15]" />

            {/* Journey path decoration */}
            <JourneyPath className="left-0 right-0 top-1/3 mx-auto" />

            <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <span className="inline-block px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-sm font-medium mb-8">
                        Year 622 CE
                    </span>

                    <h2 className="text-4xl md:text-6xl font-bold mb-8">
                        <span className="text-white">The Journey That</span>
                        <br />
                        <span className="bg-gradient-to-r from-[#D4AF37] via-[#F59E0B] to-[#F43F5E] bg-clip-text text-transparent">
                            Changed Everything
                        </span>
                    </h2>

                    <p className="text-xl text-white/50 leading-relaxed mb-12">
                        In the year 622, a community was born from a journey. People left behind what was
                        familiar to build something meaningful—together.
                        <br /><br />
                        <span className="text-white/70">Six22 is that same spirit, reimagined for the digital age.</span>
                    </p>

                    <Link
                        href="/about"
                        className="inline-flex items-center gap-2 text-[#D4AF37] hover:text-[#F59E0B] transition-colors font-medium"
                    >
                        Learn Our Story
                        <span className="text-lg">→</span>
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}

// CTA Section
function CTASection() {
    return (
        <section className="relative py-32">
            <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/10 via-[#F43F5E]/5 to-[#8B5CF6]/10" />

            <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                >
                    <Six22Logo size="lg" variant="mark" className="justify-center mb-8" />

                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        Ready to Own Your Journey?
                    </h2>

                    <p className="text-xl text-white/50 mb-10">
                        Join thousands who have chosen sovereignty over surveillance.
                    </p>

                    <Link
                        href="/signup"
                        className="inline-flex px-10 py-5 rounded-full bg-gradient-to-r from-[#D4AF37] via-[#F59E0B] to-[#F43F5E] text-white font-bold text-lg hover:shadow-xl hover:shadow-amber-500/20 transition-all transform hover:scale-105"
                    >
                        Join Six22 — It&apos;s Free
                    </Link>
                </motion.div>
            </div>
        </section>
    );
}

// Footer
function Footer() {
    return (
        <footer className="relative py-16 border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <Six22Logo size="sm" animated={false} />

                    <div className="flex items-center gap-8 text-sm text-white/40">
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                        <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                        <Link href="/about" className="hover:text-white transition-colors">About</Link>
                        <Link href="/careers" className="hover:text-white transition-colors">Careers</Link>
                    </div>

                    <div className="text-sm text-white/30">
                        © 2026 Six22. Your data. Your algorithm. Your journey.
                    </div>
                </div>
            </div>
        </footer>
    );
}

// Main Page
export default function HomePage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="min-h-screen bg-[#030305] flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#030305] text-white overflow-x-hidden">
            <Navigation />
            <HeroSection />
            <FeaturesSection />
            <JourneySection />
            <CTASection />
            <Footer />
        </main>
    );
}
