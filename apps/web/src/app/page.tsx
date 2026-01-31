'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useRef } from 'react';

// Navigation
function Navigation() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-900">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                        <span className="text-gray-950 font-semibold text-sm">C</span>
                    </div>
                    <span className="font-semibold text-[15px] tracking-[-0.01em]">Caravan</span>
                </Link>

                <div className="hidden md:flex items-center gap-8">
                    <Link href="#features" className="text-[14px] text-gray-400 hover:text-white transition-colors duration-200">
                        Features
                    </Link>
                    <Link href="#communities" className="text-[14px] text-gray-400 hover:text-white transition-colors duration-200">
                        Communities
                    </Link>
                    <Link href="#security" className="text-[14px] text-gray-400 hover:text-white transition-colors duration-200">
                        Security
                    </Link>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/login"
                        className="text-[14px] text-gray-400 hover:text-white transition-colors duration-200 px-3 py-2"
                    >
                        Log in
                    </Link>
                    <Link
                        href="/signup"
                        className="text-[14px] font-medium bg-white text-gray-950 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                    >
                        Get Started
                    </Link>
                </div>
            </div>
        </nav>
    );
}

// Hero Section
function HeroSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ['start start', 'end start'],
    });

    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
    const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
    const y = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

    return (
        <section ref={containerRef} className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
            {/* Background - premium gradient */}
            <div className="absolute inset-0">
                {/* Subtle gradient orbs */}
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-radial from-violet-500/10 via-transparent to-transparent blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-radial from-cyan-500/8 via-transparent to-transparent blur-3xl" />
                {/* Bottom fade */}
                <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-gray-950 to-transparent" />
            </div>

            <motion.div
                className="relative z-10 max-w-4xl mx-auto px-6 text-center"
                style={{ opacity, scale, y }}
            >
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[12px] font-medium text-gray-400">Now available on iOS and Android</span>
                    </div>
                </motion.div>

                <motion.h1
                    className="text-[3.5rem] md:text-[4.5rem] font-semibold leading-[1] tracking-[-0.02em] mb-6"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                >
                    The social platform
                    <br />
                    <span className="text-gray-500">built for communities</span>
                </motion.h1>

                <motion.p
                    className="text-[1.125rem] text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                    Share moments, build communities, and connect with people who share your passions.
                    Private by design, safe for everyone.
                </motion.p>

                <motion.div
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                    <Link
                        href="/signup"
                        className="inline-flex items-center gap-2 bg-white text-gray-950 font-medium px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                    >
                        Start for free
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="opacity-60">
                            <path d="M1 7h12m0 0L8 2m5 5L8 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Link>
                    <Link
                        href="#features"
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-white font-medium px-6 py-3 transition-colors duration-200"
                    >
                        See how it works
                    </Link>
                </motion.div>
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
                className="absolute bottom-8 left-1/2 -translate-x-1/2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
            >
                <div className="w-5 h-8 rounded-full border border-gray-800 flex items-start justify-center p-1.5">
                    <motion.div
                        className="w-1 h-1.5 rounded-full bg-gray-600"
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </div>
            </motion.div>
        </section>
    );
}

// Stats Section
function StatsSection() {
    const stats = [
        { value: '10M+', label: 'Active users' },
        { value: '50K+', label: 'Communities' },
        { value: '99.9%', label: 'Uptime' },
        { value: '<10ms', label: 'Avg latency' },
    ];

    return (
        <section className="py-24 px-6">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            className="text-center"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                        >
                            <div className="text-[2rem] md:text-[3rem] font-semibold tracking-[-0.02em] mb-1">{stat.value}</div>
                            <div className="text-[14px] text-gray-500">{stat.label}</div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// Features Section
function FeaturesSection() {
    const features = [
        {
            title: 'Short-form video',
            description: 'Create and discover engaging content with a vertical feed designed for quick, impactful storytelling.',
        },
        {
            title: 'Communities',
            description: 'Join topic-based spaces where conversations go deeper. From hobbies to causes, find your people.',
        },
        {
            title: 'Secure messaging',
            description: 'End-to-end encrypted conversations that stay between you and the people you trust.',
        },
        {
            title: 'Content safety',
            description: 'AI-powered moderation keeps the platform safe for all ages while respecting free expression.',
        },
        {
            title: 'Cross-platform sync',
            description: 'Start on your phone, continue on the web. Your content and conversations follow you everywhere.',
        },
        {
            title: 'Creator tools',
            description: 'Professional-grade editing, filters, and effects that help your content stand out.',
        },
    ];

    return (
        <section id="features" className="py-32 px-6">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="max-w-2xl mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-[3rem] font-semibold tracking-[-0.02em] leading-[1.1] mb-4">
                        Everything you need.
                        <br />
                        <span className="text-gray-500">Nothing you don&apos;t.</span>
                    </h2>
                    <p className="text-[1.125rem] text-gray-500 leading-relaxed">
                        We took the best parts of the platforms you love and left behind what doesn&apos;t work.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                        >
                            <h3 className="text-[1.5rem] font-semibold tracking-[-0.01em] mb-2">{feature.title}</h3>
                            <p className="text-[16px] text-gray-500 leading-relaxed">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// App Preview Section
function AppPreviewSection() {
    return (
        <section className="py-32 px-6 overflow-hidden">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-[3rem] font-semibold tracking-[-0.02em] mb-4">Designed for how you create</h2>
                    <p className="text-[1.125rem] text-gray-500 max-w-xl mx-auto">
                        A clean, intuitive interface that puts your content first and gets out of the way.
                    </p>
                </motion.div>

                {/* Phone mockup */}
                <motion.div
                    className="relative mx-auto max-w-[280px]"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="relative bg-gray-900 rounded-[3rem] p-2 border border-gray-800">
                        {/* Phone frame */}
                        <div className="relative bg-gray-950 rounded-[2.5rem] overflow-hidden aspect-[9/19.5]">
                            {/* Dynamic Island */}
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-7 bg-black rounded-full z-10" />

                            {/* Screen content */}
                            <div className="absolute inset-0 bg-gray-950">
                                {/* Sample feed item */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center px-8">
                                        <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 mx-auto mb-4 flex items-center justify-center">
                                            <span className="text-2xl">📹</span>
                                        </div>
                                        <p className="text-[13px] text-gray-500">Your feed awaits</p>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom navigation */}
                            <div className="absolute bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-xl border-t border-gray-900">
                                <div className="flex items-center justify-around h-full px-6 pb-2">
                                    {['●', '○', '+', '○', '○'].map((item, i) => (
                                        <div
                                            key={i}
                                            className={`w-6 h-6 rounded-full ${i === 2 ? 'bg-white' : ''} flex items-center justify-center`}
                                        >
                                            {i === 2 ? (
                                                <span className="text-gray-950 text-xs font-bold">+</span>
                                            ) : (
                                                <span className={`text-[8px] ${i === 0 ? 'text-white' : 'text-gray-600'}`}>{item}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Subtle glow */}
                    <div className="absolute -inset-20 bg-gradient-radial from-gray-800/20 to-transparent rounded-full blur-3xl -z-10" />
                </motion.div>
            </div>
        </section>
    );
}

// CTA Section
function CTASection() {
    return (
        <section className="py-32 px-6">
            <div className="max-w-3xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-[3rem] font-semibold tracking-[-0.02em] mb-4">
                        Ready to get started?
                    </h2>
                    <p className="text-[1.125rem] text-gray-500 mb-10 max-w-lg mx-auto">
                        Join millions of creators and communities building something meaningful.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/signup"
                            className="inline-flex items-center gap-2 bg-white text-gray-950 font-medium px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                        >
                            Create your account
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="opacity-60">
                                <path d="M1 7h12m0 0L8 2m5 5L8 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </Link>
                        <Link
                            href="/login"
                            className="text-gray-400 hover:text-white font-medium px-4 py-4 transition-colors duration-200"
                        >
                            Sign in to existing account
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

// Footer
function Footer() {
    return (
        <footer className="border-t border-gray-900 py-12 px-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center">
                            <span className="text-gray-950 font-semibold text-xs">C</span>
                        </div>
                        <span className="font-medium text-[14px]">Caravan</span>
                    </div>

                    <div className="flex items-center gap-8 text-[14px] text-gray-500">
                        <Link href="/privacy" className="hover:text-white transition-colors duration-200">Privacy</Link>
                        <Link href="/terms" className="hover:text-white transition-colors duration-200">Terms</Link>
                        <Link href="/support" className="hover:text-white transition-colors duration-200">Support</Link>
                    </div>

                    <p className="text-[14px] text-gray-600">© 2024 Caravan Inc.</p>
                </div>
            </div>
        </footer>
    );
}

// Main Page
export default function LandingPage() {
    return (
        <div className="min-h-screen bg-gray-950">
            <Navigation />
            <HeroSection />
            <StatsSection />
            <FeaturesSection />
            <AppPreviewSection />
            <CTASection />
            <Footer />
        </div>
    );
}
