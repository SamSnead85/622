'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';

// ============================================
// 0G LOGO COMPONENT
// Minimal, premium Zero Gravity mark
// ============================================
function ZeroGLogo({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
    const sizes = {
        sm: 'text-xl',
        md: 'text-2xl',
        lg: 'text-4xl',
        xl: 'text-6xl',
    };

    return (
        <div className={`font-bold tracking-tight ${sizes[size]} ${className}`}>
            <span className="text-[#00D4FF]">0</span>
            <span className="text-white">G</span>
        </div>
    );
}

// ============================================
// ANIMATED SPACE BACKGROUND
// Premium floating particles and nebula effects
// ============================================
function SpaceBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Stars
        const stars: { x: number; y: number; size: number; opacity: number; speed: number }[] = [];
        for (let i = 0; i < 150; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 1.5 + 0.5,
                opacity: Math.random() * 0.5 + 0.2,
                speed: Math.random() * 0.3 + 0.1,
            });
        }

        // Floating particles (electric blue)
        const particles: { x: number; y: number; size: number; opacity: number; vx: number; vy: number }[] = [];
        for (let i = 0; i < 30; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 3 + 1,
                opacity: Math.random() * 0.4 + 0.1,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.3 - 0.2,
            });
        }

        const animate = () => {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw nebula gradients
            const gradient1 = ctx.createRadialGradient(
                canvas.width * 0.2, canvas.height * 0.3, 0,
                canvas.width * 0.2, canvas.height * 0.3, canvas.width * 0.4
            );
            gradient1.addColorStop(0, 'rgba(0, 212, 255, 0.08)');
            gradient1.addColorStop(0.5, 'rgba(139, 92, 246, 0.04)');
            gradient1.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient1;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const gradient2 = ctx.createRadialGradient(
                canvas.width * 0.8, canvas.height * 0.7, 0,
                canvas.width * 0.8, canvas.height * 0.7, canvas.width * 0.3
            );
            gradient2.addColorStop(0, 'rgba(139, 92, 246, 0.06)');
            gradient2.addColorStop(0.5, 'rgba(0, 212, 255, 0.03)');
            gradient2.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient2;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw stars
            stars.forEach((star) => {
                star.y += star.speed;
                if (star.y > canvas.height) {
                    star.y = 0;
                    star.x = Math.random() * canvas.width;
                }

                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
                ctx.fill();
            });

            // Draw floating particles
            particles.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                const particleGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                particleGradient.addColorStop(0, `rgba(0, 212, 255, ${p.opacity})`);
                particleGradient.addColorStop(1, 'transparent');
                ctx.fillStyle = particleGradient;
                ctx.fill();
            });

            requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
        };
    }, []);

    return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" />;
}

// ============================================
// NAVIGATION
// Premium minimal navigation
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
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/5' : ''
                }`}
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6 }}
        >
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <ZeroGLogo size="md" />

                <div className="hidden md:flex items-center gap-8">
                    <a href="#features" className="text-white/60 hover:text-[#00D4FF] transition-colors text-sm">
                        Features
                    </a>
                    <a href="#orbits" className="text-white/60 hover:text-[#00D4FF] transition-colors text-sm">
                        Orbits
                    </a>
                    <a href="#creators" className="text-white/60 hover:text-[#00D4FF] transition-colors text-sm">
                        For Creators
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
                        className="px-5 py-2.5 rounded-lg bg-[#00D4FF] text-black font-semibold text-sm hover:bg-[#33DDFF] transition-colors"
                    >
                        Join 0G
                    </Link>
                </div>
            </div>
        </motion.nav>
    );
}

// ============================================
// HERO SECTION
// Stunning zero-gravity intro
// ============================================
function HeroSection() {
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [0, 500], [0, 150]);
    const opacity = useTransform(scrollY, [0, 400], [1, 0]);

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
            {/* Floating 0G Logo */}
            <motion.div
                className="absolute inset-0 flex items-center justify-center opacity-5"
                style={{ y }}
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            >
                <span className="text-[40vw] font-black text-[#00D4FF] select-none">0G</span>
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
                    {/* Badge */}
                    <motion.div
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00D4FF]/10 border border-[#00D4FF]/20 mb-8"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <span className="w-2 h-2 rounded-full bg-[#00D4FF] animate-pulse" />
                        <span className="text-[#00D4FF] text-sm font-medium">The Next Generation of Social</span>
                    </motion.div>

                    {/* Main headline */}
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
                        <span className="text-white">Join</span>
                        <br />
                        <span className="bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#00D4FF] bg-clip-text text-transparent">
                            Zero Gravity
                        </span>
                    </h1>

                    <motion.p
                        className="text-xl md:text-2xl text-white/50 max-w-3xl mx-auto mb-8 leading-relaxed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        No algorithms weighing you down. No corporate control.
                        <br />
                        <span className="text-white">Just you.</span>
                    </motion.p>

                    {/* Tagline */}
                    <motion.div
                        className="flex flex-wrap justify-center gap-6 mb-12"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <div className="flex items-center gap-2 text-white/70">
                            <div className="w-2 h-2 rounded-full bg-[#00D4FF]" />
                            <span>Weightless</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/70">
                            <div className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
                            <span>Authentic</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/70">
                            <div className="w-2 h-2 rounded-full bg-white" />
                            <span>Yours</span>
                        </div>
                    </motion.div>

                    {/* CTA Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Link
                            href="/signup"
                            className="group relative px-10 py-4 rounded-xl overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6]" />
                            <span className="relative flex items-center gap-2 text-black font-bold text-lg">
                                Join 0G
                                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </span>
                        </Link>

                        <a
                            href="#features"
                            className="px-8 py-4 rounded-xl border border-[#00D4FF]/30 text-[#00D4FF] hover:bg-[#00D4FF]/10 transition-all"
                        >
                            Explore Features
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
                <div className="w-6 h-10 rounded-full border-2 border-[#00D4FF]/30 flex items-start justify-center p-2">
                    <motion.div
                        className="w-1 h-2 rounded-full bg-[#00D4FF]"
                        animate={{ y: [0, 12, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                </div>
            </motion.div>
        </section>
    );
}

// ============================================
// FEATURES SECTION
// Why 0G is different
// ============================================
function FeaturesSection() {
    const features = [
        {
            icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            ),
            title: 'AI-Powered Creation',
            description: 'Create like a pro with AI co-direction. One-tap editing, smart suggestions, instant translations.',
            color: '#00D4FF',
        },
        {
            icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            ),
            title: 'Transparent Discovery',
            description: 'See exactly why you see what you see. Configure your own algorithm weights.',
            color: '#8B5CF6',
        },
        {
            icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            title: 'Own Your Community',
            description: 'Build your space, your rules. From inner circle to global movement.',
            color: '#00D4FF',
        },
        {
            icon: (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            title: 'Creator-First Economy',
            description: 'Keep what you earn. We take 5%, not 30%. Direct-to-fan monetization.',
            color: '#8B5CF6',
        },
    ];

    return (
        <section id="features" className="relative py-32">
            <div className="max-w-7xl mx-auto px-6">
                <motion.div
                    className="text-center mb-20"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        Why <span className="text-[#00D4FF]">0G</span> is Different
                    </h2>
                    <p className="text-xl text-white/50 max-w-2xl mx-auto">
                        The first truly weightless social network. No manipulation, full transparency.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            className="p-8 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-[#00D4FF]/30 transition-all group"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div
                                className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-all group-hover:scale-110"
                                style={{ backgroundColor: `${feature.color}15`, color: feature.color }}
                            >
                                {feature.icon}
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                            <p className="text-white/50 text-lg leading-relaxed">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============================================
// ORBITS SECTION (Community Hierarchy)
// Space-themed community tiers
// ============================================
function OrbitsSection() {
    const orbits = [
        {
            name: 'Inner Orbit',
            size: '2-10',
            description: 'Your closest circle. Immediate family and best friends.',
            color: '#00D4FF',
        },
        {
            name: 'Family Orbit',
            size: '10-50',
            description: 'Extended family and close friends. Each group keeps their privacy.',
            color: '#8B5CF6',
        },
        {
            name: 'Community Orbit',
            size: '50-500',
            description: 'Your tribe with elected leaders. You write the moderation rules.',
            color: '#00D4FF',
        },
        {
            name: 'Movement Orbit',
            size: '500+',
            description: 'Build a global movement around shared purpose. Own the algorithm entirely.',
            color: '#8B5CF6',
        },
    ];

    return (
        <section id="orbits" className="relative py-32 overflow-hidden">
            {/* Orbital rings visual */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                {[1, 2, 3, 4].map((i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full border border-[#00D4FF]"
                        style={{
                            width: `${i * 200}px`,
                            height: `${i * 200}px`,
                        }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 30 + i * 10, repeat: Infinity, ease: 'linear' }}
                    />
                ))}
            </div>

            <div className="max-w-6xl mx-auto px-6 relative z-10">
                <motion.div
                    className="text-center mb-20"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        Your <span className="text-[#00D4FF]">Orbits</span> of Freedom
                    </h2>
                    <p className="text-xl text-white/50 max-w-2xl mx-auto">
                        From your closest circle to a global movement—each level has its own rules, its own algorithm.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {orbits.map((orbit, index) => (
                        <motion.div
                            key={orbit.name}
                            className="text-center p-6 rounded-2xl border border-white/10 bg-white/[0.02]"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div
                                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold"
                                style={{
                                    backgroundColor: `${orbit.color}15`,
                                    border: `2px solid ${orbit.color}40`,
                                    color: orbit.color,
                                }}
                            >
                                {orbit.size}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{orbit.name}</h3>
                            <p className="text-white/50 text-sm">{orbit.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ============================================
// CREATOR STATS SECTION
// ============================================
function CreatorSection() {
    const stats = [
        { value: '70%', label: 'Revenue Share', description: 'vs. 50% on other platforms' },
        { value: '0%', label: 'Platform Lock-in', description: 'Export your content anytime' },
        { value: '100%', label: 'Transparency', description: 'See exactly how your content performs' },
    ];

    return (
        <section id="creators" className="relative py-32 bg-gradient-to-b from-transparent via-[#00D4FF]/5 to-transparent">
            <div className="max-w-6xl mx-auto px-6">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        Built for <span className="text-[#00D4FF]">Creators</span>
                    </h2>
                    <p className="text-xl text-white/50 max-w-2xl mx-auto">
                        Fair monetization. No exploitation. Direct connection to your audience.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            className="text-center p-8 rounded-2xl border border-[#00D4FF]/20 bg-[#00D4FF]/5"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className="text-5xl font-black text-[#00D4FF] mb-2">{stat.value}</div>
                            <div className="text-xl font-bold text-white mb-1">{stat.label}</div>
                            <div className="text-white/50">{stat.description}</div>
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
                    <ZeroGLogo size="xl" className="justify-center mb-8" />

                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        Ready to break free?
                    </h2>
                    <p className="text-xl text-white/50 mb-10 max-w-2xl mx-auto">
                        Join the next generation of social media. Weightless. Authentic. Yours.
                    </p>

                    <Link
                        href="/signup"
                        className="inline-flex items-center gap-3 px-12 py-5 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-black font-bold text-lg hover:opacity-90 transition-opacity"
                    >
                        Join 0G Now
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
                    <ZeroGLogo size="sm" />

                    <div className="flex items-center gap-6 text-sm text-white/40">
                        <a href="#" className="hover:text-[#00D4FF] transition-colors">Privacy</a>
                        <a href="#" className="hover:text-[#00D4FF] transition-colors">Terms</a>
                        <a href="#" className="hover:text-[#00D4FF] transition-colors">Contact</a>
                        <a href="#" className="hover:text-[#00D4FF] transition-colors">Careers</a>
                    </div>

                    <p className="text-sm text-white/30">
                        © 2026 0G — The Weightless Social Network
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
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-[#00D4FF]/20 border-t-[#00D4FF] animate-spin" />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-black text-white overflow-x-hidden">
            <SpaceBackground />
            <Navigation />
            <HeroSection />
            <FeaturesSection />
            <OrbitsSection />
            <CreatorSection />
            <CTASection />
            <Footer />
        </main>
    );
}
