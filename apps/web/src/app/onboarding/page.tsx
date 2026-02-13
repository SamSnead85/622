'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL, apiFetch } from '@/lib/api';
import { TwoFactorSetup } from '@/components/TwoFactorSetup';

// ============================================
// TYPES
// ============================================
interface Topic {
    id: string;
    slug: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    postCount?: number;
}

interface SuggestedUser {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    followerCount?: number;
    _count?: { followers: number };
}

// ============================================
// CONSTANTS
// ============================================
const STEPS = ['interests', 'import', 'people', 'shield', 'ready'] as const;
type Step = (typeof STEPS)[number];

const STEP_GRADIENTS: Record<Step, string> = {
    interests: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,212,255,0.12) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 100%, rgba(139,92,246,0.08) 0%, transparent 70%)',
    import: 'radial-gradient(ellipse 80% 60% at 70% 0%, rgba(59,130,246,0.12) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 20% 80%, rgba(139,92,246,0.08) 0%, transparent 70%)',
    people: 'radial-gradient(ellipse 80% 60% at 20% 0%, rgba(139,92,246,0.12) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 90% 80%, rgba(0,212,255,0.08) 0%, transparent 70%)',
    shield: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(16,185,129,0.10) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 20% 80%, rgba(0,212,255,0.08) 0%, transparent 70%)',
    ready: 'radial-gradient(ellipse 80% 70% at 50% 40%, rgba(0,212,255,0.15) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 30% 80%, rgba(139,92,246,0.12) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 20%, rgba(236,72,153,0.08) 0%, transparent 60%)',
};

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };
const smoothEase = [0.16, 1, 0.3, 1] as const;

// ============================================
// CONFETTI PARTICLE SYSTEM
// ============================================
function ConfettiCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const colors = ['#7C8FFF', '#6070EE', '#EC4899', '#10B981', '#F59E0B', '#FFFFFF'];
        const particles: Array<{
            x: number; y: number; vx: number; vy: number;
            size: number; color: string; rotation: number; rotSpeed: number;
            opacity: number; shape: 'rect' | 'circle';
        }> = [];

        // Burst particles from multiple points
        for (let i = 0; i < 150; i++) {
            const originX = canvas.width * (0.3 + Math.random() * 0.4);
            const originY = canvas.height * 0.3;
            particles.push({
                x: originX,
                y: originY,
                vx: (Math.random() - 0.5) * 12,
                vy: -Math.random() * 14 - 2,
                size: Math.random() * 6 + 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 10,
                opacity: 1,
                shape: Math.random() > 0.5 ? 'rect' : 'circle',
            });
        }

        let frame: number;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let alive = false;

            for (const p of particles) {
                if (p.opacity <= 0) continue;
                alive = true;
                p.vy += 0.15; // gravity
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.rotSpeed;
                p.vx *= 0.99;
                p.opacity -= 0.004;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.globalAlpha = Math.max(0, p.opacity);
                ctx.fillStyle = p.color;

                if (p.shape === 'rect') {
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                } else {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }

            if (alive) {
                frame = requestAnimationFrame(animate);
            }
        };

        // Small delay for dramatic effect
        const timer = setTimeout(() => {
            frame = requestAnimationFrame(animate);
        }, 300);

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);

        return () => {
            clearTimeout(timer);
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-50"
            style={{ width: '100vw', height: '100vh' }}
        />
    );
}

// ============================================
// ANIMATED SHIELD SVG
// ============================================
function AnimatedShield({ score }: { score: number }) {
    const progress = score / 100;

    return (
        <div className="relative w-32 h-32 mx-auto">
            {/* Glow */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                    background: `radial-gradient(circle, rgba(16,185,129,${0.2 + progress * 0.3}) 0%, transparent 70%)`,
                }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <svg viewBox="0 0 100 100" className="w-full h-full relative z-10">
                {/* Shield body */}
                <motion.path
                    d="M50 8 L85 25 L85 55 Q85 80 50 95 Q15 80 15 55 L15 25 Z"
                    fill="none"
                    stroke="url(#shieldGradient)"
                    strokeWidth="2.5"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, ease: 'easeInOut' }}
                />
                {/* Shield fill */}
                <motion.path
                    d="M50 8 L85 25 L85 55 Q85 80 50 95 Q15 80 15 55 L15 25 Z"
                    fill="url(#shieldFill)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.15 + progress * 0.2 }}
                    transition={{ delay: 1, duration: 0.8 }}
                />
                {/* Checkmark */}
                <motion.path
                    d="M35 52 L45 62 L65 38"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: score >= 60 ? 1 : 0, opacity: score >= 60 ? 1 : 0 }}
                    transition={{ delay: 1.5, duration: 0.6, ease: 'easeOut' }}
                />
                <defs>
                    <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#7C8FFF" />
                    </linearGradient>
                    <linearGradient id="shieldFill" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#7C8FFF" />
                    </linearGradient>
                </defs>
            </svg>
            {/* Score number */}
            <motion.div
                className="absolute inset-0 flex items-center justify-center z-20"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: score < 60 ? 1 : 0, scale: score < 60 ? 1 : 0.5 }}
            >
                <span className="text-2xl font-bold text-emerald-400">{score}</span>
            </motion.div>
        </div>
    );
}

// ============================================
// PRIVACY TOGGLE CARD
// ============================================
function PrivacyCard({
    icon,
    title,
    description,
    enabled,
    onToggle,
    points,
    accent = '#10B981',
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
    points: number;
    accent?: string;
}) {
    return (
        <motion.button
            onClick={onToggle}
            className="w-full text-left"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <div
                className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-500 border ${
                    enabled
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.05]'
                }`}
                style={enabled ? { boxShadow: `0 0 30px ${accent}15` } : undefined}
            >
                <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-500 ${
                            enabled ? 'bg-emerald-500/20' : 'bg-white/5'
                        }`}
                    >
                        {icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white text-[15px]">{title}</h3>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40'
                            }`}>
                                +{points} pts
                            </span>
                        </div>
                        <p className="text-sm text-white/50 leading-relaxed">{description}</p>
                    </div>

                    {/* Toggle */}
                    <div
                        className={`w-12 h-7 rounded-full shrink-0 relative transition-colors duration-300 ${
                            enabled ? 'bg-emerald-500' : 'bg-white/10'
                        }`}
                    >
                        <motion.div
                            className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-lg"
                            animate={{ left: enabled ? 22 : 2 }}
                            transition={spring}
                        />
                    </div>
                </div>

                {/* Progress bar */}
                <motion.div
                    className="mt-4 h-1 rounded-full bg-white/5 overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <motion.div
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${accent}, #7C8FFF)` }}
                        initial={{ width: '0%' }}
                        animate={{ width: enabled ? '100%' : '0%' }}
                        transition={{ duration: 0.8, ease: smoothEase }}
                    />
                </motion.div>
            </div>
        </motion.button>
    );
}

// ============================================
// FLOATING PARTICLES BACKGROUND (reduced for mobile perf)
// ============================================
function FloatingParticles() {
    const particles = useMemo(() =>
        Array.from({ length: 12 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 2.5 + 0.5,
            duration: Math.random() * 25 + 20,
            delay: Math.random() * -20,
            color: ['#7C8FFF', '#6070EE', '#EC4899'][Math.floor(Math.random() * 3)],
        })),
    []);

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full will-change-transform"
                    style={{
                        width: p.size,
                        height: p.size,
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        background: p.color,
                        opacity: 0.15,
                    }}
                    animate={{
                        y: [0, -40, 0],
                        opacity: [0.08, 0.2, 0.08],
                    }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: p.delay,
                    }}
                />
            ))}
        </div>
    );
}

// ============================================
// TOPIC ICON MAPPER — Clean SVG icons by topic name
// ============================================
function TopicIcon({ name, size = 26 }: { name: string; size?: number }) {
    const slug = name.toLowerCase();
    const s = size;
    const props = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

    if (slug.includes('art') || slug.includes('design') || slug.includes('creative'))
        return <svg {...props}><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>;

    if (slug.includes('photo') || slug.includes('camera'))
        return <svg {...props}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>;

    if (slug.includes('music') || slug.includes('audio'))
        return <svg {...props}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;

    if (slug.includes('business') || slug.includes('finance') || slug.includes('entrepreneur'))
        return <svg {...props}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>;

    if (slug.includes('islam') || slug.includes('muslim'))
        return <svg {...props}><path d="M12 3a9 9 0 109 9c0-4.97-4.03-9-9-9z"/><path d="M12 3c2.21 0 4 4.03 4 9s-1.79 9-4 9"/><path d="M15 8l-1.5 2L15 12l-1.5 2L15 16"/></svg>;

    if (slug.includes('christian'))
        return <svg {...props}><line x1="12" y1="2" x2="12" y2="22"/><line x1="6" y1="8" x2="18" y2="8"/></svg>;

    if (slug.includes('spiritual') || slug.includes('mindful') || slug.includes('meditat'))
        return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="3"/></svg>;

    if (slug.includes('culture') || slug.includes('heritage') || slug.includes('world'))
        return <svg {...props}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>;

    if (slug.includes('arabic') || slug.includes('mosque') || slug.includes('middle east'))
        return <svg {...props}><path d="M12 2c-3 3-5 6-5 9a5 5 0 0010 0c0-3-2-6-5-9z"/><line x1="12" y1="15" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>;

    if (slug.includes('tech') || slug.includes('coding') || slug.includes('programming') || slug.includes('software'))
        return <svg {...props}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;

    if (slug.includes('gaming') || slug.includes('game'))
        return <svg {...props}><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><path d="M17.32 5H6.68a4 4 0 00-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 003 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 019.828 16h4.344a2 2 0 011.414.586L17 18c.5.5 1 1 2 1a3 3 0 003-3c0-1.544-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0017.32 5z"/></svg>;

    if (slug.includes('food') || slug.includes('cook') || slug.includes('cuisine'))
        return <svg {...props}><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>;

    if (slug.includes('travel') || slug.includes('adventure'))
        return <svg {...props}><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 10-16 0c0 3 2.7 6.9 8 11.7z"/></svg>;

    if (slug.includes('fitness') || slug.includes('health') || slug.includes('workout') || slug.includes('gym'))
        return <svg {...props}><path d="M18 20V10M6 20V10M2 15h4M18 15h4M10 5v2.5M14 5v2.5"/><rect x="6" y="7" width="12" height="6" rx="1"/></svg>;

    if (slug.includes('education') || slug.includes('learn') || slug.includes('study') || slug.includes('book'))
        return <svg {...props}><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>;

    if (slug.includes('science') || slug.includes('research'))
        return <svg {...props}><path d="M9 3h6M10 9V3M14 9V3"/><path d="M6.4 18h11.2A2 2 0 0019 15.5L15 9H9L5 15.5A2 2 0 006.4 18z"/><path d="M6.4 18a2 2 0 00-1.4 2v1h14v-1a2 2 0 00-1.4-2"/></svg>;

    if (slug.includes('sport'))
        return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20"/><path d="M2 12h20"/></svg>;

    if (slug.includes('fashion') || slug.includes('style'))
        return <svg {...props}><path d="M20.38 3.46L16 2 12 5.5 8 2l-4.38 1.46a2 2 0 00-1.32 2.21l.92 5.52A2 2 0 005.2 13h13.6a2 2 0 001.98-1.81l.92-5.52a2 2 0 00-1.32-2.21z"/><path d="M3.8 13L6 22h12l2.2-9"/></svg>;

    if (slug.includes('nature') || slug.includes('environment') || slug.includes('outdoor'))
        return <svg {...props}><path d="M17 8c.7-1 1-2.2 1-3.5A5.5 5.5 0 0012.5 0 5.5 5.5 0 007 4.5c0 1.3.3 2.5 1 3.5"/><path d="M12 22V10"/><path d="M7 15h10"/><path d="M9 18h6"/></svg>;

    if (slug.includes('film') || slug.includes('movie') || slug.includes('cinema'))
        return <svg {...props}><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/></svg>;

    if (slug.includes('politic') || slug.includes('civic') || slug.includes('justice'))
        return <svg {...props}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;

    if (slug.includes('family') || slug.includes('parent'))
        return <svg {...props}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;

    if (slug.includes('volunteer') || slug.includes('charity') || slug.includes('humanit'))
        return <svg {...props}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>;

    if (slug.includes('palestine') || slug.includes('activism') || slug.includes('resist'))
        return <svg {...props}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;

    if (slug.includes('podcast') || slug.includes('radio'))
        return <svg {...props}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;

    if (slug.includes('writ') || slug.includes('journal') || slug.includes('blog'))
        return <svg {...props}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;

    // Fallback: first letter in a clean circle
    return (
        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-white/70">{name.charAt(0)}</span>
        </div>
    );
}

// ============================================
// MAIN ONBOARDING PAGE
// ============================================
export default function OnboardingPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();

    // Step state
    const [currentStep, setCurrentStep] = useState(0);
    const step = STEPS[currentStep];

    // Step 1: Interests
    const [topics, setTopics] = useState<Topic[]>([]);
    const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
    const [topicsLoading, setTopicsLoading] = useState(true);

    // Step 2: People
    const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
    const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
    const [usersLoading, setUsersLoading] = useState(false);

    // Step 3: Shield
    const [twoFAEnabled, setTwoFAEnabled] = useState(false);
    const [show2FASetup, setShow2FASetup] = useState(false);
    const [e2eEnabled, setE2eEnabled] = useState(false);
    const [e2eGenerating, setE2eGenerating] = useState(false);
    const [transparencyViewed, setTransparencyViewed] = useState(false);

    // General
    const [saving, setSaving] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Privacy score calculation
    const privacyScore = useMemo(() => {
        let score = 30; // base
        if (twoFAEnabled) score += 25;
        if (e2eEnabled) score += 30;
        if (transparencyViewed) score += 15;
        return score;
    }, [twoFAEnabled, e2eEnabled, transparencyViewed]);

    // ============================================
    // EFFECTS
    // ============================================
    useEffect(() => { setMounted(true); }, []);

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    // Fetch topics
    useEffect(() => {
        const fetchTopics = async () => {
            try {
                const res = await apiFetch(`${API_URL}/api/v1/topics`);
                if (res.ok) {
                    const data = await res.json();
                    setTopics(data.topics || []);
                }
            } catch (err) {
                console.error('Failed to fetch topics:', err);
            } finally {
                setTopicsLoading(false);
            }
        };
        fetchTopics();
    }, []);

    // Fetch suggested users when entering step 2
    useEffect(() => {
        if (step !== 'people' || suggestedUsers.length > 0) return;
        const fetchUsers = async () => {
            setUsersLoading(true);
            try {
                const res = await apiFetch(`${API_URL}/api/v1/users?limit=15`);
                if (res.ok) {
                    const data = await res.json();
                    const users = data.users || data || [];
                    // Filter out self
                    setSuggestedUsers(
                        users.filter((u: SuggestedUser) => u.id !== user?.id).slice(0, 15)
                    );
                }
            } catch (err) {
                console.error('Failed to fetch users:', err);
            } finally {
                setUsersLoading(false);
            }
        };
        fetchUsers();
    }, [step, suggestedUsers.length, user?.id]);

    // ============================================
    // HANDLERS
    // ============================================
    const toggleTopic = useCallback((topicId: string) => {
        setSelectedTopics((prev) => {
            const next = new Set(prev);
            if (next.has(topicId)) {
                next.delete(topicId);
            } else {
                next.add(topicId);
            }
            return next;
        });
    }, []);

    const toggleFollow = useCallback(async (userId: string) => {
        const isFollowing = followedUsers.has(userId);
        // Optimistic update
        setFollowedUsers((prev) => {
            const next = new Set(prev);
            if (isFollowing) next.delete(userId);
            else next.add(userId);
            return next;
        });
        try {
            await apiFetch(`${API_URL}/api/v1/users/${userId}/follow`, {
                method: 'POST',
            });
        } catch (err) {
            // Revert on error
            setFollowedUsers((prev) => {
                const next = new Set(prev);
                if (isFollowing) next.add(userId);
                else next.delete(userId);
                return next;
            });
        }
    }, [followedUsers]);

    const saveInterests = useCallback(async () => {
        if (selectedTopics.size === 0) return;
        setSaving(true);
        try {
            await apiFetch(`${API_URL}/api/v1/topics/user/interests`, {
                method: 'POST',
                body: JSON.stringify({
                    topicIds: Array.from(selectedTopics),
                    level: 'INTERESTED',
                }),
            });
        } catch (err) {
            console.error('Failed to save interests:', err);
        } finally {
            setSaving(false);
        }
    }, [selectedTopics]);

    // 2FA: open the real setup modal when toggling on
    const handle2FAToggle = useCallback(() => {
        if (!twoFAEnabled) {
            // Opening 2FA setup
            setShow2FASetup(true);
        } else {
            // Toggling off (can re-enable later from settings)
            setTwoFAEnabled(false);
        }
    }, [twoFAEnabled]);

    const handle2FAComplete = useCallback(() => {
        setTwoFAEnabled(true);
        setShow2FASetup(false);
    }, []);

    const handle2FAClose = useCallback(() => {
        setShow2FASetup(false);
        // Don't mark as enabled if setup was cancelled
    }, []);

    // E2E: generate real encryption keys when toggling on
    const handleE2EToggle = useCallback(async () => {
        if (!e2eEnabled && !e2eGenerating) {
            setE2eGenerating(true);
            try {
                // Dynamically import to avoid SSR issues with Web Crypto / IndexedDB
                const { generateKeyBundle } = await import('@/lib/encryption/keys');
                const bundle = await generateKeyBundle();
                // Optionally upload public keys to server for key exchange
                try {
                    await apiFetch(`${API_URL}/api/v1/users/me/keys`, {
                        method: 'PUT',
                        body: JSON.stringify({
                            identityKey: bundle.identityKey,
                            signedPreKey: bundle.signedPreKey,
                            preKeySignature: bundle.preKeySignature,
                            oneTimePreKeys: bundle.oneTimePreKeys,
                        }),
                    });
                } catch {
                    // Key upload failure is non-fatal during onboarding
                    // Keys are stored locally in IndexedDB regardless
                }
                setE2eEnabled(true);
            } catch (err) {
                console.error('E2E key generation failed:', err);
                // Still mark as attempted so user can retry from settings
            } finally {
                setE2eGenerating(false);
            }
        } else if (e2eEnabled) {
            setE2eEnabled(false);
        }
    }, [e2eEnabled, e2eGenerating]);

    // Transparency: open the transparency page and mark as viewed
    const handleTransparencyToggle = useCallback(() => {
        if (!transparencyViewed) {
            setTransparencyViewed(true);
            // Open transparency page in a new tab so user can actually review it
            window.open('/transparency', '_blank');
        } else {
            setTransparencyViewed(false);
        }
    }, [transparencyViewed]);

    const handleNext = useCallback(async () => {
        if (step === 'interests' && selectedTopics.size >= 3) {
            await saveInterests();
        }
        if (currentStep < STEPS.length - 1) {
            setCurrentStep((s) => s + 1);
        }
    }, [step, selectedTopics.size, saveInterests, currentStep]);

    const handleSkip = useCallback(() => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep((s) => s + 1);
        } else {
            router.push('/dashboard');
        }
    }, [currentStep, router]);

    const handleFinish = useCallback((destination: string) => {
        localStorage.setItem('0g_onboarding_complete', 'true');
        router.push(destination);
    }, [router]);

    const canProceed = useMemo(() => {
        switch (step) {
            case 'interests': return selectedTopics.size >= 3;
            case 'import': return true;
            case 'people': return true;
            case 'shield': return true;
            case 'ready': return true;
            default: return true;
        }
    }, [step, selectedTopics.size]);

    // ============================================
    // LOADING / AUTH GUARD
    // ============================================
    if (!mounted || authLoading) {
        return (
            <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
                <motion.div
                    className="w-10 h-10 border-2 border-[#7C8FFF]/30 border-t-[#7C8FFF] rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
            </div>
        );
    }

    if (!isAuthenticated) return null;

    // ============================================
    // PAGE TRANSITION VARIANTS
    // ============================================
    const pageVariants = {
        enter: { opacity: 0, x: 60, filter: 'blur(4px)' },
        center: { opacity: 1, x: 0, filter: 'blur(0px)' },
        exit: { opacity: 0, x: -60, filter: 'blur(4px)' },
    };

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="fixed inset-0 bg-[#0A0A0F] overflow-hidden">
            {/* Animated gradient background */}
            <motion.div
                className="fixed inset-0"
                animate={{ background: STEP_GRADIENTS[step] }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
                style={{ background: STEP_GRADIENTS[step] }}
            />

            <FloatingParticles />

            {/* Confetti on final step */}
            {step === 'ready' && <ConfettiCanvas />}

            {/* Main container */}
            <div className="relative z-10 h-full flex flex-col">
                {/* Top bar: progress + skip */}
                <div className="shrink-0 px-6 pt-6 pb-4 safe-area-pt">
                    <div className="max-w-2xl mx-auto">
                        {/* Progress dots */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                {STEPS.map((s, i) => (
                                    <motion.div
                                        key={s}
                                        className="relative"
                                        animate={{
                                            width: i === currentStep ? 32 : 8,
                                        }}
                                        transition={spring}
                                    >
                                        <div
                                            className={`h-2 rounded-full transition-colors duration-500 ${
                                                i < currentStep
                                                    ? 'bg-[#7C8FFF]'
                                                    : i === currentStep
                                                      ? 'bg-gradient-to-r from-[#7C8FFF] to-[#6070EE]'
                                                      : 'bg-white/10'
                                            }`}
                                            style={{
                                                width: '100%',
                                                height: 8,
                                                borderRadius: 4,
                                            }}
                                        />
                                    </motion.div>
                                ))}
                            </div>

                            {/* Skip */}
                            {step !== 'ready' && (
                                <motion.button
                                    onClick={handleSkip}
                                    className="text-sm text-white/30 hover:text-white/60 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    Skip
                                </motion.button>
                            )}
                        </div>

                        {/* Step counter */}
                        <motion.p
                            className="text-xs text-white/25 font-medium tracking-widest uppercase"
                            key={step}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            Step {currentStep + 1} of {STEPS.length}
                        </motion.p>
                    </div>
                </div>

                {/* Content area */}
                <div className="flex-1 overflow-hidden">
                    <AnimatePresence mode="wait">
                        {/* ============================================
                            STEP 1: YOUR INTERESTS
                            ============================================ */}
                        {step === 'interests' && (
                            <motion.div
                                key="interests"
                                variants={pageVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.5, ease: smoothEase }}
                                className="h-full flex flex-col"
                            >
                                <div className="flex-1 overflow-y-auto scrollbar-hide px-6">
                                    <div className="max-w-2xl mx-auto pb-32">
                                        {/* Header */}
                                        <motion.div
                                            className="text-center mb-10"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 }}
                                        >
                                            <motion.div
                                                className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#7C8FFF]/20 to-[#6070EE]/20 border border-white/[0.06] flex items-center justify-center backdrop-blur-sm"
                                                animate={{ scale: [1, 1.05, 1] }}
                                                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                            >
                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#interestGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10" />
                                                    <path d="M2 12h20" />
                                                    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                                                    <defs>
                                                        <linearGradient id="interestGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                            <stop offset="0%" stopColor="#7C8FFF" />
                                                            <stop offset="100%" stopColor="#6070EE" />
                                                        </linearGradient>
                                                    </defs>
                                                </svg>
                                            </motion.div>
                                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
                                                Your Interests
                                            </h1>
                                            <p className="text-white/45 text-base md:text-lg max-w-md mx-auto leading-relaxed">
                                                Choose what excites you. We&apos;ll curate your world around it.
                                            </p>

                                            {/* Selection badge */}
                                            <motion.div
                                                className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03]"
                                                animate={selectedTopics.size >= 3 ? { borderColor: 'rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.05)' } : {}}
                                            >
                                                <span className={`text-sm font-medium ${selectedTopics.size >= 3 ? 'text-[#7C8FFF]' : 'text-white/40'}`}>
                                                    {selectedTopics.size === 0
                                                        ? 'Select at least 3'
                                                        : `${selectedTopics.size} selected`}
                                                </span>
                                                {selectedTopics.size >= 3 && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="w-5 h-5 rounded-full bg-[#7C8FFF] flex items-center justify-center"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M20 6L9 17l-5-5" />
                                                        </svg>
                                                    </motion.div>
                                                )}
                                            </motion.div>
                                        </motion.div>

                                        {/* Topics grid */}
                                        {topicsLoading ? (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                {Array.from({ length: 9 }).map((_, i) => (
                                                    <div key={i} className="h-32 rounded-2xl bg-white/[0.03] animate-pulse" />
                                                ))}
                                            </div>
                                        ) : (
                                            <motion.div
                                                className="grid grid-cols-2 md:grid-cols-3 gap-4"
                                                initial="hidden"
                                                animate="show"
                                                variants={{
                                                    hidden: { opacity: 0 },
                                                    show: {
                                                        opacity: 1,
                                                        transition: { staggerChildren: 0.04 },
                                                    },
                                                }}
                                            >
                                                {topics.map((topic) => {
                                                    const isSelected = selectedTopics.has(topic.id);
                                                    return (
                                                        <motion.button
                                                            key={topic.id}
                                                            onClick={() => toggleTopic(topic.id)}
                                                            variants={{
                                                                hidden: { opacity: 0, y: 20, scale: 0.95 },
                                                                show: { opacity: 1, y: 0, scale: 1 },
                                                            }}
                                                            whileHover={{ scale: 1.04, y: -2 }}
                                                            whileTap={{ scale: 0.96 }}
                                                            className="relative group text-left"
                                                        >
                                                            <div
                                                                className={`relative overflow-hidden rounded-2xl p-5 h-full transition-all duration-500 border backdrop-blur-sm ${
                                                                    isSelected
                                                                        ? 'border-[#7C8FFF]/40 bg-[#7C8FFF]/[0.06]'
                                                                        : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10'
                                                                }`}
                                                                style={isSelected ? {
                                                                    boxShadow: `0 0 40px ${topic.color || '#7C8FFF'}20, inset 0 1px 0 rgba(255,255,255,0.06)`,
                                                                } : {
                                                                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                                                                }}
                                                            >
                                                                {/* Icon */}
                                                                <motion.div
                                                                    className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-colors duration-500 ${
                                                                        isSelected
                                                                            ? 'bg-[#7C8FFF]/15 text-[#7C8FFF]'
                                                                            : 'bg-white/[0.04] text-white/50 group-hover:text-white/70'
                                                                    }`}
                                                                    animate={isSelected ? { scale: [1, 1.1, 1] } : {}}
                                                                    transition={{ duration: 0.3 }}
                                                                >
                                                                    <TopicIcon name={topic.name} size={22} />
                                                                </motion.div>

                                                                {/* Name */}
                                                                <h3 className="font-semibold text-sm text-white/90 mb-1">{topic.name}</h3>

                                                                {/* Description on select */}
                                                                <AnimatePresence>
                                                                    {isSelected && topic.description && (
                                                                        <motion.p
                                                                            initial={{ opacity: 0, height: 0 }}
                                                                            animate={{ opacity: 1, height: 'auto' }}
                                                                            exit={{ opacity: 0, height: 0 }}
                                                                            className="text-xs text-white/40 line-clamp-2"
                                                                        >
                                                                            {topic.description}
                                                                        </motion.p>
                                                                    )}
                                                                </AnimatePresence>

                                                                {/* Check indicator */}
                                                                <AnimatePresence>
                                                                    {isSelected && (
                                                                        <motion.div
                                                                            initial={{ scale: 0 }}
                                                                            animate={{ scale: 1 }}
                                                                            exit={{ scale: 0 }}
                                                                            transition={spring}
                                                                            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#7C8FFF] flex items-center justify-center"
                                                                        >
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                                <path d="M20 6L9 17l-5-5" />
                                                                            </svg>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>

                                                                {/* Shimmer on hover */}
                                                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden rounded-2xl">
                                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                                                </div>
                                                            </div>
                                                        </motion.button>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ============================================
                            STEP 2: IMPORT YOUR DATA (optional)
                            ============================================ */}
                        {step === 'import' && (
                            <motion.div
                                key="import"
                                variants={pageVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.4, ease: smoothEase }}
                                className="flex flex-col items-center"
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-center max-w-lg"
                                >
                                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
                                        Bring Your World With You
                                    </h2>
                                    <p className="text-white/50 mb-10 leading-relaxed">
                                        Import your content, photos, and connections from other platforms. You can always do this later from your settings.
                                    </p>
                                </motion.div>

                                <div className="w-full max-w-md space-y-3 mb-10">
                                    {[
                                        { name: 'Instagram', desc: 'Posts, stories, followers' },
                                        { name: 'TikTok', desc: 'Videos, likes, connections' },
                                        { name: 'WhatsApp', desc: 'Chat history & media' },
                                    ].map((platform, i) => (
                                        <motion.a
                                            key={platform.name}
                                            href="/migrate"
                                            target="_blank"
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 + i * 0.1 }}
                                            className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.06] hover:border-white/[0.12] transition-all group"
                                        >
                                            <div>
                                                <p className="font-medium text-white">{platform.name}</p>
                                                <p className="text-xs text-white/40">{platform.desc}</p>
                                            </div>
                                            <svg className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </motion.a>
                                    ))}
                                </div>

                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.7 }}
                                    className="text-xs text-white/25 text-center"
                                >
                                    You can skip this and import your data later from Settings
                                </motion.p>
                            </motion.div>
                        )}

                        {/* ============================================
                            STEP 3: PEOPLE TO FOLLOW
                            ============================================ */}
                        {step === 'people' && (
                            <motion.div
                                key="people"
                                variants={pageVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.5, ease: smoothEase }}
                                className="h-full flex flex-col"
                            >
                                <div className="flex-1 overflow-y-auto scrollbar-hide px-6">
                                    <div className="max-w-3xl mx-auto pb-32">
                                        {/* Header */}
                                        <motion.div
                                            className="text-center mb-10"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 }}
                                        >
                                            <motion.div
                                                className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#6070EE]/20 to-[#EC4899]/20 border border-white/[0.06] flex items-center justify-center backdrop-blur-sm"
                                                animate={{ scale: [1, 1.05, 1] }}
                                                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                            >
                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#peopleGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                                    <circle cx="9" cy="7" r="4" />
                                                    <path d="M23 21v-2a4 4 0 00-3-3.87" />
                                                    <path d="M16 3.13a4 4 0 010 7.75" />
                                                    <defs>
                                                        <linearGradient id="peopleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                            <stop offset="0%" stopColor="#6070EE" />
                                                            <stop offset="100%" stopColor="#EC4899" />
                                                        </linearGradient>
                                                    </defs>
                                                </svg>
                                            </motion.div>
                                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
                                                People to Follow
                                            </h1>
                                            <p className="text-white/50 text-lg max-w-md mx-auto">
                                                Connect with interesting people. Your feed is only as good as who you follow.
                                            </p>
                                            {followedUsers.size > 0 && (
                                                <motion.p
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="text-[#6070EE] text-sm font-medium mt-4"
                                                >
                                                    Following {followedUsers.size} {followedUsers.size === 1 ? 'person' : 'people'}
                                                </motion.p>
                                            )}
                                        </motion.div>

                                        {/* Users grid */}
                                        {usersLoading ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {Array.from({ length: 6 }).map((_, i) => (
                                                    <div key={i} className="h-44 rounded-2xl bg-white/[0.03] animate-pulse" />
                                                ))}
                                            </div>
                                        ) : (
                                            <motion.div
                                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                                                initial="hidden"
                                                animate="show"
                                                variants={{
                                                    hidden: { opacity: 0 },
                                                    show: {
                                                        opacity: 1,
                                                        transition: { staggerChildren: 0.06 },
                                                    },
                                                }}
                                            >
                                                {suggestedUsers.map((u) => {
                                                    const isFollowing = followedUsers.has(u.id);
                                                    const followers = u.followerCount ?? u._count?.followers ?? 0;

                                                    return (
                                                        <motion.div
                                                            key={u.id}
                                                            variants={{
                                                                hidden: { opacity: 0, y: 20 },
                                                                show: { opacity: 1, y: 0 },
                                                            }}
                                                            whileHover={{ y: -4 }}
                                                            className="group"
                                                        >
                                                            <div className={`relative overflow-hidden rounded-2xl p-5 border transition-all duration-500 ${
                                                                isFollowing
                                                                    ? 'border-[#6070EE]/30 bg-[#6070EE]/[0.04]'
                                                                    : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                                                            }`}
                                                            style={{ boxShadow: isFollowing ? '0 0 30px rgba(139,92,246,0.1)' : 'inset 0 1px 0 rgba(255,255,255,0.03)' }}
                                                            >
                                                                {/* Gradient border glow */}
                                                                {isFollowing && (
                                                                    <div className="absolute inset-0 rounded-2xl" style={{
                                                                        background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(0,212,255,0.05))',
                                                                    }} />
                                                                )}

                                                                <div className="relative z-10">
                                                                    {/* Avatar + info */}
                                                                    <div className="flex items-start gap-3 mb-3">
                                                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6070EE] to-[#7C8FFF] shrink-0 flex items-center justify-center overflow-hidden">
                                                                            {u.avatarUrl ? (
                                                                                <img
                                                                                    src={u.avatarUrl}
                                                                                    alt={u.displayName}
                                                                                    className="w-full h-full object-cover"
                                                                                />
                                                                            ) : (
                                                                                <span className="text-lg font-bold text-white">
                                                                                    {(u.displayName || u.username || '?').charAt(0).toUpperCase()}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <h3 className="font-semibold text-white text-[15px] truncate">
                                                                                {u.displayName || u.username}
                                                                            </h3>
                                                                            <p className="text-sm text-white/40 truncate">@{u.username}</p>
                                                                        </div>
                                                                    </div>

                                                                    {/* Bio */}
                                                                    {u.bio && (
                                                                        <p className="text-sm text-white/40 line-clamp-2 mb-3 leading-relaxed">
                                                                            {u.bio}
                                                                        </p>
                                                                    )}

                                                                    {/* Footer */}
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-xs text-white/25">
                                                                            {followers > 0 ? `${followers.toLocaleString()} followers` : 'New member'}
                                                                        </span>
                                                                        <motion.button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                toggleFollow(u.id);
                                                                            }}
                                                                            whileHover={{ scale: 1.05 }}
                                                                            whileTap={{ scale: 0.92 }}
                                                                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                                                                                isFollowing
                                                                                    ? 'bg-[#6070EE]/20 text-[#6070EE] border border-[#6070EE]/30'
                                                                                    : 'bg-white/10 text-white hover:bg-white/15'
                                                                            }`}
                                                                        >
                                                                            {isFollowing ? 'Following' : 'Follow'}
                                                                        </motion.button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </motion.div>
                                        )}

                                        {!usersLoading && suggestedUsers.length === 0 && (
                                            <div className="text-center py-12">
                                                <p className="text-white/30 text-lg">No suggestions yet — you&apos;re among the first!</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ============================================
                            STEP 3: YOUR SHIELD
                            ============================================ */}
                        {step === 'shield' && (
                            <motion.div
                                key="shield"
                                variants={pageVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.5, ease: smoothEase }}
                                className="h-full flex flex-col"
                            >
                                <div className="flex-1 overflow-y-auto scrollbar-hide px-6">
                                    <div className="max-w-lg mx-auto pb-32">
                                        {/* Header */}
                                        <motion.div
                                            className="text-center mb-8"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 }}
                                        >
                                            <AnimatedShield score={privacyScore} />
                                            <motion.h1
                                                className="text-3xl md:text-4xl font-bold text-white mt-6 mb-3"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.6 }}
                                            >
                                                Your Shield
                                            </motion.h1>
                                            <motion.p
                                                className="text-white/50 text-lg max-w-sm mx-auto"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.8 }}
                                            >
                                                Your privacy is non-negotiable.
                                            </motion.p>

                                            {/* Privacy Score */}
                                            <motion.div
                                                className="mt-6 inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.04]"
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 1 }}
                                            >
                                                <span className="text-sm text-white/60">Privacy Score</span>
                                                <motion.span
                                                    className="text-lg font-bold text-emerald-400"
                                                    key={privacyScore}
                                                    initial={{ scale: 1.3 }}
                                                    animate={{ scale: 1 }}
                                                    transition={spring}
                                                >
                                                    {privacyScore}
                                                </motion.span>
                                                <span className="text-sm text-white/30">/ 100</span>
                                            </motion.div>
                                        </motion.div>

                                        {/* Privacy Cards */}
                                        <motion.div
                                            className="space-y-4"
                                            initial="hidden"
                                            animate="show"
                                            variants={{
                                                hidden: { opacity: 0 },
                                                show: {
                                                    opacity: 1,
                                                    transition: { staggerChildren: 0.15, delayChildren: 1.2 },
                                                },
                                            }}
                                        >
                                            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                                                <PrivacyCard
                                                    icon={
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                        </svg>
                                                    }
                                                    title="Two-Factor Authentication"
                                                    description="Add an extra layer of security. Even if someone gets your password, they can't get in."
                                                    enabled={twoFAEnabled}
                                                    onToggle={handle2FAToggle}
                                                    points={25}
                                                    accent="#10B981"
                                                />
                                            </motion.div>

                                            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                                                <PrivacyCard
                                                    icon={
                                                        e2eGenerating ? (
                                                            <motion.div
                                                                className="w-6 h-6 border-2 border-[#7C8FFF]/30 border-t-[#7C8FFF] rounded-full"
                                                                animate={{ rotate: 360 }}
                                                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                            />
                                                        ) : (
                                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C8FFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                                            </svg>
                                                        )
                                                    }
                                                    title={e2eGenerating ? 'Generating Keys...' : 'End-to-End Encryption'}
                                                    description={e2eGenerating
                                                        ? 'Creating your private encryption keys. These never leave your device.'
                                                        : 'Your messages are encrypted so only you and the recipient can read them. Not even we can.'
                                                    }
                                                    enabled={e2eEnabled}
                                                    onToggle={handleE2EToggle}
                                                    points={30}
                                                    accent="#7C8FFF"
                                                />
                                            </motion.div>

                                            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                                                <PrivacyCard
                                                    icon={
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6070EE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                            <circle cx="12" cy="12" r="3" />
                                                        </svg>
                                                    }
                                                    title="Review What We Don't Track"
                                                    description="See our transparency report. We believe you deserve to know exactly what data exists."
                                                    enabled={transparencyViewed}
                                                    onToggle={handleTransparencyToggle}
                                                    points={15}
                                                    accent="#6070EE"
                                                />
                                            </motion.div>
                                        </motion.div>

                                        {/* Info note */}
                                        <motion.p
                                            className="text-center text-xs text-white/20 mt-8"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 2 }}
                                        >
                                            {e2eEnabled && 'Your encryption keys are stored on this device only. '}
                                            {twoFAEnabled && '2FA is active on your account. '}
                                            You can manage these anytime in Settings &rarr; Privacy & Security
                                        </motion.p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ============================================
                            STEP 4: YOU'RE READY
                            ============================================ */}
                        {step === 'ready' && (
                            <motion.div
                                key="ready"
                                variants={pageVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.5, ease: smoothEase }}
                                className="h-full flex flex-col items-center justify-center px-6"
                            >
                                <div className="max-w-md mx-auto text-center">
                                    {/* Avatar */}
                                    <motion.div
                                        className="w-24 h-24 rounded-full bg-gradient-to-br from-[#7C8FFF] to-[#6070EE] mx-auto mb-6 flex items-center justify-center overflow-hidden"
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
                                    >
                                        {user?.avatarUrl ? (
                                            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-3xl font-bold text-white">
                                                {(user?.displayName || user?.username || '0G').charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                    </motion.div>

                                    {/* Name */}
                                    <motion.h1
                                        className="text-4xl md:text-5xl font-bold text-white mb-3"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 }}
                                    >
                                        You&apos;re Ready!
                                    </motion.h1>

                                    <motion.p
                                        className="text-white/50 text-lg mb-2"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.7 }}
                                    >
                                        Welcome, <span className="text-[#7C8FFF] font-medium">{user?.displayName || user?.username}</span>
                                    </motion.p>

                                    {/* Summary stats */}
                                    <motion.div
                                        className="flex items-center justify-center gap-4 text-sm text-white/35 mb-10 flex-wrap"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.9 }}
                                    >
                                        {selectedTopics.size > 0 && (
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#7C8FFF]" />
                                                {selectedTopics.size} interests
                                            </span>
                                        )}
                                        {followedUsers.size > 0 && (
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#6070EE]" />
                                                Following {followedUsers.size}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            Privacy: {privacyScore}/100
                                        </span>
                                    </motion.div>

                                    {/* CTAs */}
                                    <motion.div
                                        className="space-y-3"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 1.1 }}
                                    >
                                        <motion.button
                                            onClick={() => handleFinish('/dashboard')}
                                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#7C8FFF] to-[#6070EE] text-white font-semibold text-lg relative overflow-hidden group"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <span className="relative z-10">Start Exploring</span>
                                            <div className="absolute inset-0 bg-gradient-to-r from-[#6070EE] to-[#7C8FFF] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        </motion.button>

                                        <motion.button
                                            onClick={() => handleFinish('/create')}
                                            className="w-full py-4 rounded-2xl border border-white/10 bg-white/[0.03] text-white font-medium text-lg hover:bg-white/[0.06] hover:border-white/15 transition-all"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            Create Your First Post
                                        </motion.button>
                                    </motion.div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Bottom CTA (not shown on ready step) */}
                {step !== 'ready' && (
                    <motion.div
                        className="shrink-0 px-6 pb-6 safe-area-pb"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="max-w-lg mx-auto">
                            <motion.button
                                onClick={handleNext}
                                disabled={!canProceed || saving}
                                className={`w-full py-4 rounded-2xl font-semibold text-lg relative overflow-hidden transition-all duration-500 ${
                                    canProceed
                                        ? 'bg-gradient-to-r from-[#7C8FFF] to-[#6070EE] text-white'
                                        : 'bg-white/5 text-white/25 cursor-not-allowed'
                                }`}
                                whileHover={canProceed ? { scale: 1.02 } : {}}
                                whileTap={canProceed ? { scale: 0.98 } : {}}
                            >
                                {saving ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                            className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full"
                                        />
                                        Saving...
                                    </span>
                                ) : (
                                    'Continue'
                                )}
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* 2FA Setup Modal - real TOTP flow */}
            <TwoFactorSetup
                isOpen={show2FASetup}
                onClose={handle2FAClose}
                onComplete={handle2FAComplete}
            />
        </div>
    );
}
