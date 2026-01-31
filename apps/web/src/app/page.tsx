'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// ============================================
// AMBIENT BACKGROUND
// Premium animated gradients
// ============================================
function AmbientBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-[#050508]" />

            {/* Aurora gradients */}
            <motion.div
                className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-violet-500/20 blur-[150px]"
                animate={{
                    scale: [1, 1.2, 1],
                    x: [0, 50, 0],
                    opacity: [0.3, 0.5, 0.3]
                }}
                transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-orange-500/15 blur-[120px]"
                animate={{
                    scale: [1.2, 1, 1.2],
                    y: [0, -50, 0],
                    opacity: [0.3, 0.5, 0.3]
                }}
                transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-[100px]"
                animate={{
                    x: [0, -30, 0],
                    opacity: [0.2, 0.4, 0.2]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute bottom-1/4 left-0 w-[350px] h-[350px] rounded-full bg-rose-500/10 blur-[100px]"
                animate={{
                    y: [0, 30, 0],
                    opacity: [0.2, 0.4, 0.2]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Subtle grid pattern */}
            <div
                className="absolute inset-0 opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px'
                }}
            />
        </div>
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
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#050508]/90 backdrop-blur-2xl border-b border-white/5' : ''}`}
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 group">
                    <motion.div
                        className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    >
                        <span className="text-white font-bold text-lg">C</span>
                    </motion.div>
                    <span className="font-semibold text-lg tracking-tight text-white">Six22</span>
                </Link>

                <div className="hidden md:flex items-center gap-10">
                    {['Features', 'Tribes', 'About'].map((item) => (
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
                            className="text-sm font-semibold bg-gradient-to-r from-orange-400 to-rose-500 text-white px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Get Started
                        </motion.button>
                    </Link>
                </div>
            </div>
        </motion.nav>
    );
}

// ============================================
// HERO SECTION
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
                {/* Eyebrow */}
                <motion.div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                >
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    <span className="text-xs font-medium text-white/70">The next generation of social</span>
                </motion.div>

                {/* Headline */}
                <motion.h1
                    className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.05]"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                    Share moments that
                    <br />
                    <span className="bg-gradient-to-r from-orange-400 via-rose-400 to-violet-400 bg-clip-text text-transparent">matter most</span>
                </motion.h1>

                {/* Subheadline */}
                <motion.p
                    className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                    The social platform where real connections thrive.
                    Bring your family and friends closer, no matter the distance.
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
                            className="flex items-center gap-2 bg-gradient-to-r from-orange-400 via-rose-500 to-violet-500 text-white font-semibold px-8 py-4 rounded-full text-base"
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Start your journey
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M3 8h10m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </motion.button>
                    </Link>
                    <Link href="#features">
                        <motion.button
                            className="flex items-center gap-2 px-8 py-4 text-white/70 hover:text-white transition-colors text-base"
                            whileHover={{ x: 4 }}
                        >
                            See how it works
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-60">
                                <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </motion.button>
                    </Link>
                </motion.div>

                {/* Floating feature pills */}
                <motion.div
                    className="flex flex-wrap justify-center gap-3 mt-16"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                >
                    {['🔥 Campfire Live', '📸 Moments', '🗺️ Journeys', '💬 Messages'].map((feature, i) => (
                        <motion.div
                            key={feature}
                            className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/60"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.9 + i * 0.1 }}
                        >
                            {feature}
                        </motion.div>
                    ))}
                </motion.div>
            </motion.div>

            {/* Scroll hint */}
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
// STATS SECTION
// ============================================
function StatsSection({ mounted }: { mounted: boolean }) {
    const stats = [
        { value: '10M+', label: 'Active members' },
        { value: '50K+', label: 'Tribes' },
        { value: '1B+', label: 'Moments shared' },
        { value: '180+', label: 'Countries' },
    ];

    if (!mounted) return null;

    return (
        <section className="py-24 px-6 bg-[#0a0a0f] border-y border-white/5">
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
                            <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent mb-2">{stat.value}</div>
                            <div className="text-sm text-white/40">{stat.label}</div>
                        </motion.div>
                    ))}
                </div>
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
            icon: '📸',
            title: 'Moments',
            description: '24-hour stories that capture life as it happens. Share your day with the people who matter.',
            color: 'from-orange-500/20 to-rose-500/20',
        },
        {
            icon: '🔥',
            title: 'Campfire Live',
            description: 'Go live with your inner circle. Intimate streams for real conversations, not performances.',
            color: 'from-rose-500/20 to-orange-500/20',
        },
        {
            icon: '🗺️',
            title: 'Journeys',
            description: 'Curate collections of your greatest adventures. Your story, beautifully told.',
            color: 'from-violet-500/20 to-cyan-500/20',
        },
    ];

    if (!mounted) return null;

    return (
        <section id="features" className="py-32 px-6 relative">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="text-center mb-20"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                        Built for real connection
                    </h2>
                    <p className="text-lg text-white/40 max-w-xl mx-auto">
                        Not another feed to scroll. A home for your most meaningful relationships.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8">
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            className="group relative rounded-3xl overflow-hidden bg-white/5 border border-white/10"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: i * 0.1 }}
                            whileHover={{ y: -8 }}
                        >
                            {/* Icon */}
                            <div className={`relative h-40 overflow-hidden bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                                <motion.span
                                    className="text-6xl"
                                    animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                >
                                    {feature.icon}
                                </motion.span>
                            </div>

                            {/* Content */}
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
// TESTIMONIAL SECTION
// ============================================
function TestimonialSection({ mounted }: { mounted: boolean }) {
    if (!mounted) return null;

    return (
        <section className="py-32 px-6 bg-[#0a0a0f]">
            <div className="max-w-4xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <div className="text-5xl mb-8">💬</div>
                    <blockquote className="text-2xl md:text-3xl font-medium text-white mb-8 leading-relaxed">
                        &ldquo;Caravan brought my scattered family back together.
                        We share moments across three time zones like we&apos;re all in the same room.&rdquo;
                    </blockquote>
                    <div className="flex items-center justify-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-rose-500" />
                        <div className="text-left">
                            <div className="font-medium text-white">Sarah Chen</div>
                            <div className="text-sm text-white/40">Mother of three, San Francisco</div>
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
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-rose-900/20 to-orange-900/30" />

            <div className="relative max-w-3xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                        Your adventure starts here
                    </h2>
                    <p className="text-lg text-white/50 mb-10 max-w-lg mx-auto">
                        Join millions of families and friends who chose meaningful connection over mindless scrolling.
                    </p>
                    <Link href="/signup">
                        <motion.button
                            className="bg-gradient-to-r from-orange-400 via-rose-500 to-violet-500 text-white font-semibold px-10 py-4 rounded-full text-lg"
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Create your account
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
        <footer className="bg-[#0a0a0f] border-t border-white/5 py-16 px-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
                            <span className="text-white font-bold">C</span>
                        </div>
                        <span className="font-semibold text-white">Six22</span>
                    </div>

                    <div className="flex items-center gap-8 text-sm text-white/40">
                        <Link href="/about" className="hover:text-white transition-colors">About</Link>
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                        <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                        <Link href="/support" className="hover:text-white transition-colors">Support</Link>
                    </div>

                    <p className="text-sm text-white/20">© 2026 Six22 Inc.</p>
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
        <div className="min-h-screen bg-[#050508]">
            <Navigation mounted={mounted} />
            <HeroSection mounted={mounted} />
            <StatsSection mounted={mounted} />
            <FeaturesSection mounted={mounted} />
            <TestimonialSection mounted={mounted} />
            <CTASection mounted={mounted} />
            <Footer />
        </div>
    );
}
