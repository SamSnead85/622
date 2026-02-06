'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL, apiFetch } from '@/lib/api';

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
const STEPS = ['interests', 'people', 'shield', 'ready'] as const;
type Step = (typeof STEPS)[number];

const STEP_GRADIENTS: Record<Step, string> = {
    interests: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,212,255,0.12) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 100%, rgba(139,92,246,0.08) 0%, transparent 70%)',
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

        const colors = ['#00D4FF', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#FFFFFF'];
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
                        <stop offset="100%" stopColor="#00D4FF" />
                    </linearGradient>
                    <linearGradient id="shieldFill" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#00D4FF" />
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
                        style={{ background: `linear-gradient(90deg, ${accent}, #00D4FF)` }}
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
// FLOATING PARTICLES BACKGROUND
// ============================================
function FloatingParticles() {
    const particles = useMemo(() =>
        Array.from({ length: 20 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 3 + 1,
            duration: Math.random() * 20 + 15,
            delay: Math.random() * -20,
            color: ['#00D4FF', '#8B5CF6', '#EC4899'][Math.floor(Math.random() * 3)],
        })),
    []);

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                        width: p.size,
                        height: p.size,
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        background: p.color,
                        opacity: 0.2,
                    }}
                    animate={{
                        y: [0, -60, 0],
                        x: [0, Math.random() * 30 - 15, 0],
                        opacity: [0.1, 0.3, 0.1],
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
    const [e2eEnabled, setE2eEnabled] = useState(false);
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
                    className="w-10 h-10 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full"
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
                                                    ? 'bg-[#00D4FF]'
                                                    : i === currentStep
                                                      ? 'bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6]'
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
                                                className="text-5xl mb-4"
                                                animate={{ rotate: [0, -5, 5, 0] }}
                                                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                            >
                                                ✨
                                            </motion.div>
                                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                                                Your Interests
                                            </h1>
                                            <p className="text-white/50 text-lg max-w-md mx-auto">
                                                Choose what excites you. We&apos;ll curate your world around it.
                                            </p>

                                            {/* Selection badge */}
                                            <motion.div
                                                className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03]"
                                                animate={selectedTopics.size >= 3 ? { borderColor: 'rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.05)' } : {}}
                                            >
                                                <span className={`text-sm font-medium ${selectedTopics.size >= 3 ? 'text-[#00D4FF]' : 'text-white/40'}`}>
                                                    {selectedTopics.size === 0
                                                        ? 'Select at least 3'
                                                        : `${selectedTopics.size} selected`}
                                                </span>
                                                {selectedTopics.size >= 3 && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="w-5 h-5 rounded-full bg-[#00D4FF] flex items-center justify-center"
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
                                                                        ? 'border-[#00D4FF]/40 bg-[#00D4FF]/[0.06]'
                                                                        : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10'
                                                                }`}
                                                                style={isSelected ? {
                                                                    boxShadow: `0 0 40px ${topic.color || '#00D4FF'}20, inset 0 1px 0 rgba(255,255,255,0.06)`,
                                                                } : {
                                                                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
                                                                }}
                                                            >
                                                                {/* Icon */}
                                                                <motion.div
                                                                    className="text-4xl mb-3"
                                                                    animate={isSelected ? { scale: [1, 1.2, 1], rotate: [0, -8, 8, 0] } : {}}
                                                                    transition={{ duration: 0.4 }}
                                                                >
                                                                    {topic.icon}
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
                                                                            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#00D4FF] flex items-center justify-center"
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
                            STEP 2: PEOPLE TO FOLLOW
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
                                                className="text-5xl mb-4"
                                                animate={{ y: [0, -8, 0] }}
                                                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                            >
                                                🤝
                                            </motion.div>
                                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                                                People to Follow
                                            </h1>
                                            <p className="text-white/50 text-lg max-w-md mx-auto">
                                                Connect with interesting people. Your feed is only as good as who you follow.
                                            </p>
                                            {followedUsers.size > 0 && (
                                                <motion.p
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="text-[#8B5CF6] text-sm font-medium mt-4"
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
                                                                    ? 'border-[#8B5CF6]/30 bg-[#8B5CF6]/[0.04]'
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
                                                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#00D4FF] shrink-0 flex items-center justify-center overflow-hidden">
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
                                                                                    ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30'
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
                                                    onToggle={() => setTwoFAEnabled((p) => !p)}
                                                    points={25}
                                                    accent="#10B981"
                                                />
                                            </motion.div>

                                            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                                                <PrivacyCard
                                                    icon={
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                                        </svg>
                                                    }
                                                    title="End-to-End Encryption"
                                                    description="Your messages are encrypted so only you and the recipient can read them. Not even we can."
                                                    enabled={e2eEnabled}
                                                    onToggle={() => setE2eEnabled((p) => !p)}
                                                    points={30}
                                                    accent="#00D4FF"
                                                />
                                            </motion.div>

                                            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                                                <PrivacyCard
                                                    icon={
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                            <circle cx="12" cy="12" r="3" />
                                                        </svg>
                                                    }
                                                    title="Review What We Don't Track"
                                                    description="See our transparency report. We believe you deserve to know exactly what data exists."
                                                    enabled={transparencyViewed}
                                                    onToggle={() => setTransparencyViewed((p) => !p)}
                                                    points={15}
                                                    accent="#8B5CF6"
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
                                            You can configure these anytime in Settings → Privacy & Security
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
                                        className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] mx-auto mb-6 flex items-center justify-center overflow-hidden"
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
                                        Welcome, <span className="text-[#00D4FF] font-medium">{user?.displayName || user?.username}</span>
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
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]" />
                                                {selectedTopics.size} interests
                                            </span>
                                        )}
                                        {followedUsers.size > 0 && (
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
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
                                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-black font-semibold text-lg relative overflow-hidden group"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <span className="relative z-10">Start Exploring</span>
                                            <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6] to-[#00D4FF] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
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
                                        ? 'bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-black'
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
        </div>
    );
}
