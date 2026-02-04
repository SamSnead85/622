'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import Link from 'next/link';
import { ProtectedRoute } from '@/contexts/AuthContext';

// ============================================
// NEURAL LENS™ - Your AI-Powered Feed Intelligence
// "Own Your Algorithm. Shape Your Reality."
// ============================================

// ============================================
// ANIMATED NEURAL NETWORK BACKGROUND
// ============================================
function NeuralNetworkBackground() {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
            {/* Base */}
            <div className="absolute inset-0 bg-[#030305]" />

            {/* Neural network visualization */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="neural-grid" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                        <circle cx="50" cy="50" r="1" fill="white" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#neural-grid)" />
            </svg>

            {/* Gradient orbs */}
            <motion.div
                className="absolute -top-1/4 -left-1/4 w-[800px] h-[800px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
                }}
                animate={{
                    x: [0, 50, 0],
                    y: [0, 30, 0],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute -bottom-1/4 -right-1/4 w-[900px] h-[900px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)',
                }}
                animate={{
                    x: [0, -40, 0],
                    y: [0, -30, 0],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
            />
        </div>
    );
}

// ============================================
// AI NEURAL INDICATOR - Animated brain pulse
// ============================================
function AIIndicator({ active = true }: { active?: boolean }) {
    return (
        <div className="flex items-center gap-2">
            <div className="relative">
                <motion.div
                    className="w-3 h-3 rounded-full bg-violet-500"
                    animate={active ? {
                        boxShadow: ['0 0 0px rgba(139,92,246,0.5)', '0 0 20px rgba(139,92,246,0.8)', '0 0 0px rgba(139,92,246,0.5)']
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                />
                {active && (
                    <motion.div
                        className="absolute inset-0 rounded-full bg-violet-500"
                        initial={{ scale: 1, opacity: 0.5 }}
                        animate={{ scale: 2.5, opacity: 0 }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                )}
            </div>
            <span className="text-xs font-medium text-violet-400">
                {active ? 'AI Learning' : 'AI Paused'}
            </span>
        </div>
    );
}

// ============================================
// NEURAL WEIGHT DIAL - Advanced circular controls
// ============================================
interface NeuralWeight {
    id: string;
    name: string;
    icon: string;
    value: number;
    description: string;
    aiSuggestion?: number;
}

function NeuralDial({ weight, onChange, showAI = true }: {
    weight: NeuralWeight;
    onChange: (value: number) => void;
    showAI?: boolean;
}) {
    const [isHovered, setIsHovered] = useState(false);
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (weight.value / 100) * circumference;

    return (
        <motion.div
            className="relative group"
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            whileHover={{ scale: 1.02 }}
        >
            <div className="bg-white/[0.02] rounded-3xl p-6 border border-white/5 hover:border-violet-500/30 transition-all">
                <div className="flex items-center gap-4">
                    {/* Circular dial */}
                    <div className="relative w-24 h-24 flex-shrink-0">
                        <svg className="w-full h-full -rotate-90">
                            {/* Background circle */}
                            <circle
                                cx="48"
                                cy="48"
                                r="45"
                                stroke="rgba(255,255,255,0.05)"
                                strokeWidth="6"
                                fill="none"
                            />
                            {/* AI suggestion ring */}
                            {showAI && weight.aiSuggestion && (
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="45"
                                    stroke="rgba(139,92,246,0.2)"
                                    strokeWidth="6"
                                    fill="none"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={circumference - (weight.aiSuggestion / 100) * circumference}
                                    strokeLinecap="round"
                                />
                            )}
                            {/* User value ring */}
                            <motion.circle
                                cx="48"
                                cy="48"
                                r="45"
                                stroke="url(#dial-gradient)"
                                strokeWidth="6"
                                fill="none"
                                strokeDasharray={circumference}
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                strokeLinecap="round"
                            />
                            <defs>
                                <linearGradient id="dial-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#8B5CF6" />
                                    <stop offset="100%" stopColor="#06B6D4" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Center content */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl">{weight.icon}</span>
                            <span className="text-lg font-bold text-white">{weight.value}%</span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-white">{weight.name}</h4>
                            {showAI && weight.aiSuggestion && weight.aiSuggestion !== weight.value && (
                                <button
                                    onClick={() => onChange(weight.aiSuggestion!)}
                                    className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-medium hover:bg-violet-500/30 transition-colors"
                                >
                                    AI: {weight.aiSuggestion}%
                                </button>
                            )}
                        </div>
                        <p className="text-sm text-white/50 mb-3">{weight.description}</p>

                        {/* Slider */}
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={weight.value}
                            onChange={(e) => onChange(parseInt(e.target.value))}
                            className="w-full h-1.5 appearance-none rounded-full bg-white/10 cursor-pointer
                                [&::-webkit-slider-thumb]:appearance-none 
                                [&::-webkit-slider-thumb]:w-4 
                                [&::-webkit-slider-thumb]:h-4 
                                [&::-webkit-slider-thumb]:rounded-full 
                                [&::-webkit-slider-thumb]:bg-gradient-to-r
                                [&::-webkit-slider-thumb]:from-violet-500
                                [&::-webkit-slider-thumb]:to-cyan-500
                                [&::-webkit-slider-thumb]:shadow-lg
                                [&::-webkit-slider-thumb]:cursor-grab
                                [&::-webkit-slider-thumb]:active:cursor-grabbing"
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// COMMUNITY VOTE BANNER
// ============================================
function CommunityVoteBanner() {
    const [hasVoted, setHasVoted] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-2xl p-5 border border-violet-500/20 mb-8"
        >
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center text-2xl">
                        🗳️
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Community Vote Active</h3>
                        <p className="text-sm text-white/50">Should we prioritize local news sources?</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-white/40">2,847 votes • Ends in 18h</span>
                    {hasVoted ? (
                        <span className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                            ✓ Voted
                        </span>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setHasVoted(true)}
                                className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-colors"
                            >
                                Yes
                            </button>
                            <button
                                onClick={() => setHasVoted(true)}
                                className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-400 text-sm font-medium hover:bg-rose-500/30 transition-colors"
                            >
                                No
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// AI INSIGHTS CARD
// ============================================
function AIInsightsCard() {
    const insights = [
        { icon: '👨‍👩‍👧‍👦', text: 'You engage 3x more with family content', action: 'Boost family' },
        { icon: '📹', text: 'Live streams keep you connected', action: 'Enable alerts' },
        { icon: '🌅', text: 'Most active 7-9am and 8-10pm', action: 'Optimize timing' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/[0.02] rounded-3xl p-6 border border-white/5"
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                    <span className="text-lg">🧠</span>
                </div>
                <div>
                    <h3 className="font-semibold text-white">AI Insights</h3>
                    <p className="text-xs text-white/40">Based on your activity</p>
                </div>
            </div>

            <div className="space-y-4">
                {insights.map((insight, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5"
                    >
                        <span className="text-xl">{insight.icon}</span>
                        <p className="text-sm text-white/70 flex-1">{insight.text}</p>
                        <button className="px-3 py-1 rounded-lg bg-violet-500/20 text-violet-400 text-xs font-medium hover:bg-violet-500/30 transition-colors">
                            {insight.action}
                        </button>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}

// ============================================
// PRIVACY PROMISES
// ============================================
function PrivacyPromises() {
    const promises = [
        { icon: '🔐', title: 'You Own It', desc: 'Export or delete your Neural Lens anytime' },
        { icon: '👁️', title: 'Full Transparency', desc: 'See exactly how every decision is made' },
        { icon: '🚫', title: 'Never Sold', desc: 'Your preferences are never monetized' },
        { icon: '🌐', title: 'Portable', desc: 'Take your algorithm to any 0G instance' },
    ];

    return (
        <div className="grid grid-cols-2 gap-3">
            {promises.map((promise, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center"
                >
                    <span className="text-2xl">{promise.icon}</span>
                    <h4 className="text-sm font-semibold text-white mt-2">{promise.title}</h4>
                    <p className="text-xs text-white/40 mt-1">{promise.desc}</p>
                </motion.div>
            ))}
        </div>
    );
}

// ============================================
// DATA SOVEREIGNTY SECTION
// ============================================
function DataSovereigntySection() {
    const [storage, setStorage] = useState<'local' | 'cloud' | 'hybrid'>('hybrid');

    const options = [
        { id: 'local' as const, icon: '📱', title: 'Device Only', desc: 'Maximum privacy', color: 'emerald' },
        { id: 'cloud' as const, icon: '☁️', title: 'Encrypted Cloud', desc: 'Access anywhere', color: 'blue' },
        { id: 'hybrid' as const, icon: '🔄', title: 'Smart Hybrid', desc: 'Best of both', color: 'violet' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.02] rounded-3xl p-6 border border-white/5"
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                    <span className="text-lg">🔒</span>
                </div>
                <div>
                    <h3 className="font-semibold text-white">Data Sovereignty</h3>
                    <p className="text-xs text-white/40">Your data, your rules</p>
                </div>
            </div>

            <div className="space-y-2">
                {options.map((option) => (
                    <button
                        key={option.id}
                        onClick={() => setStorage(option.id)}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${storage === option.id
                                ? 'bg-white/5 border-white/20'
                                : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03]'
                            }`}
                    >
                        <span className="text-xl">{option.icon}</span>
                        <div className="flex-1">
                            <h4 className="text-sm font-medium text-white">{option.title}</h4>
                            <p className="text-xs text-white/40">{option.desc}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${storage === option.id ? 'border-white bg-white' : 'border-white/30'
                            }`}>
                            {storage === option.id && <div className="w-1.5 h-1.5 rounded-full bg-[#050508]" />}
                        </div>
                    </button>
                ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5">
                <button className="w-full py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors">
                    📦 Export All My Data
                </button>
            </div>
        </motion.div>
    );
}

// ============================================
// NAVIGATION
// ============================================
function Navigation() {
    const navItems = [
        { id: 'home', icon: '🏠', label: 'Home', href: '/dashboard' },
        { id: 'explore', icon: '🔍', label: 'Explore', href: '/explore' },
        { id: 'tribes', icon: '👥', label: 'Tribes', href: '/communities' },
        { id: 'neural', icon: '🧠', label: 'Neural Lens', href: '/algorithm', active: true },
        { id: 'profile', icon: '👤', label: 'Profile', href: '/profile' },
    ];

    return (
        <>
            {/* Desktop sidebar */}
            <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 xl:w-64 bg-[#0A0A0F]/95 backdrop-blur-xl border-r border-white/5 flex-col p-4 z-40">
                <Link href="/" className="flex items-center gap-3 px-3 py-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                        <span className="text-white font-bold">0G</span>
                    </div>
                    <span className="text-white/60 text-sm font-medium hidden xl:block">Zero Gravity</span>
                </Link>
                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${item.active
                                    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                                    : 'text-white/60 hover:bg-white/5'
                                }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="font-medium hidden xl:block">{item.label}</span>
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* Mobile bottom nav */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 z-50">
                <div className="flex items-center justify-around py-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 p-2 ${item.active ? 'text-violet-400' : 'text-white/50'
                                }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="text-[10px]">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </nav>
        </>
    );
}

// ============================================
// MAIN NEURAL LENS PAGE
// ============================================
function NeuralLensPageContent() {
    const [mounted, setMounted] = useState(false);
    const [activeMode, setActiveMode] = useState<'personal' | 'community'>('personal');
    const [aiEnabled, setAiEnabled] = useState(true);
    const [chronological, setChronological] = useState(false);
    const [showSaved, setShowSaved] = useState(false);

    // Neural weights with AI suggestions
    const [weights, setWeights] = useState<NeuralWeight[]>([
        { id: 'family', name: 'Family & Close Ones', icon: '👨‍👩‍👧‍👦', value: 85, description: 'Content from your inner circle', aiSuggestion: 90 },
        { id: 'friends', name: 'Friends Network', icon: '💜', value: 70, description: 'Posts from friends and connections', aiSuggestion: 65 },
        { id: 'communities', name: 'My Tribes', icon: '👥', value: 60, description: 'Groups and communities you belong to', aiSuggestion: 55 },
        { id: 'truthtellers', name: 'Truth-Tellers', icon: '🌍', value: 75, description: 'Journalists and citizen reporters', aiSuggestion: 80 },
        { id: 'live', name: 'Live Streams', icon: '📡', value: 50, description: 'Real-time broadcasts and campfires', aiSuggestion: 45 },
        { id: 'discovery', name: 'Discovery Mode', icon: '✨', value: 30, description: 'New voices and perspectives', aiSuggestion: 40 },
    ]);

    useEffect(() => {
        setMounted(true);
        // Load saved settings
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('0g_neural_lens');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed.weights) setWeights(parsed.weights);
                    if (parsed.chronological !== undefined) setChronological(parsed.chronological);
                    if (parsed.aiEnabled !== undefined) setAiEnabled(parsed.aiEnabled);
                } catch (e) {
                    console.error('Failed to load Neural Lens:', e);
                }
            }
        }
    }, []);

    const updateWeight = useCallback((id: string, value: number) => {
        setWeights(prev => prev.map(w => w.id === id ? { ...w, value } : w));
    }, []);

    const handleSave = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('0g_neural_lens', JSON.stringify({
                weights,
                chronological,
                aiEnabled,
                savedAt: new Date().toISOString()
            }));
        }
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
    }, [weights, chronological, aiEnabled]);

    const applyAISuggestions = useCallback(() => {
        setWeights(prev => prev.map(w => ({ ...w, value: w.aiSuggestion || w.value })));
    }, []);

    if (!mounted) {
        return <div className="min-h-screen bg-[#030305]" />;
    }

    return (
        <div className="min-h-screen bg-[#030305] text-white pb-20 lg:pb-0">
            <NeuralNetworkBackground />
            <Navigation />

            <main className="relative z-10 lg:ml-20 xl:ml-64 min-h-screen">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-2xl">
                                🧠
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-light text-white">
                                    Neural <span className="font-semibold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Lens</span>™
                                </h1>
                                <p className="text-white/50">Own your algorithm. Shape your reality.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 flex-wrap">
                            <AIIndicator active={aiEnabled} />
                            <button
                                onClick={() => setAiEnabled(!aiEnabled)}
                                className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 text-xs hover:bg-white/10 transition-colors"
                            >
                                {aiEnabled ? 'Disable AI' : 'Enable AI'}
                            </button>
                            <button
                                onClick={applyAISuggestions}
                                disabled={!aiEnabled}
                                className="px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-400 text-xs hover:bg-violet-500/30 transition-colors disabled:opacity-50"
                            >
                                Apply AI Suggestions
                            </button>
                        </div>
                    </motion.div>

                    {/* Community Vote Banner */}
                    <CommunityVoteBanner />

                    {/* Mode Toggle */}
                    <div className="flex items-center gap-2 mb-8 p-1 bg-white/5 rounded-2xl w-fit">
                        {(['personal', 'community'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setActiveMode(mode)}
                                className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${activeMode === mode
                                        ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white'
                                        : 'text-white/50 hover:text-white'
                                    }`}
                            >
                                {mode === 'personal' ? '🎯 My Neural Lens' : '🌐 Community Lens'}
                            </button>
                        ))}
                    </div>

                    {/* Chronological toggle */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 mb-8"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xl">⏱️</span>
                            <div>
                                <h4 className="font-medium text-white">Chronological Mode</h4>
                                <p className="text-sm text-white/40">Disable all recommendations, show posts by time</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setChronological(!chronological)}
                            className={`w-14 h-8 rounded-full p-1 transition-colors ${chronological ? 'bg-violet-500' : 'bg-white/20'
                                }`}
                        >
                            <motion.div
                                className="w-6 h-6 rounded-full bg-white shadow-lg"
                                animate={{ x: chronological ? 24 : 0 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                        </button>
                    </motion.div>

                    {/* Main Grid */}
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Left: Neural Weights */}
                        <div className="lg:col-span-2 space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">
                                {activeMode === 'personal' ? 'Your Feed Priorities' : 'Community Priorities'}
                            </h2>

                            {weights.map((weight, i) => (
                                <motion.div
                                    key={weight.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <NeuralDial
                                        weight={weight}
                                        onChange={(value) => updateWeight(weight.id, value)}
                                        showAI={aiEnabled}
                                    />
                                </motion.div>
                            ))}

                            {/* Save Button */}
                            <motion.button
                                onClick={handleSave}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold text-lg hover:opacity-90 transition-opacity mt-6"
                                whileTap={{ scale: 0.98 }}
                            >
                                {showSaved ? '✓ Saved!' : 'Save Neural Lens'}
                            </motion.button>
                        </div>

                        {/* Right: Sidebar */}
                        <div className="space-y-6">
                            <AIInsightsCard />
                            <DataSovereigntySection />
                            <PrivacyPromises />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Wrap with ProtectedRoute
export default function NeuralLensPage() {
    return (
        <ProtectedRoute>
            <NeuralLensPageContent />
        </ProtectedRoute>
    );
}
