'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';

// ============================================
// 0G DIFFERENTIATORS - Core Platform Features
// These make 0G unique vs TikTok/Instagram/Facebook
// ============================================

// ============================================
// DATA OWNERSHIP PANEL
// No platform lock-in - You own your data
// ============================================

interface DataOwnershipProps {
    totalPosts?: number;
    totalPhotos?: number;
    totalConnections?: number;
}

export function DataOwnershipPanel({
    totalPosts = 47,
    totalPhotos = 234,
    totalConnections = 89
}: DataOwnershipProps) {
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        // Simulate export - in production this would call the API
        setTimeout(() => {
            setExporting(false);
            alert('Your data export has been prepared. Check your email!');
        }, 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl border border-emerald-500/20 p-6"
        >
            <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <span className="text-2xl">🔓</span>
                </div>
                <div>
                    <h3 className="font-semibold text-white mb-1">Your Data, Your Rules</h3>
                    <p className="text-sm text-white/50">
                        No platform lock-in. Export everything, anytime.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-white">{totalPosts}</div>
                    <div className="text-xs text-white/40">Posts</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-white">{totalPhotos}</div>
                    <div className="text-xs text-white/40">Photos</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-white">{totalConnections}</div>
                    <div className="text-xs text-white/40">Connections</div>
                </div>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex-1 py-2 px-4 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                >
                    {exporting ? 'Preparing...' : '📦 Export All Data'}
                </button>
                <Link
                    href="/settings/data"
                    className="py-2 px-4 rounded-xl bg-white/5 text-white/60 text-sm font-medium hover:bg-white/10 transition-colors"
                >
                    Manage
                </Link>
            </div>
        </motion.div>
    );
}

// ============================================
// AI CO-DIRECTOR
// Makes everyone a pro creator
// ============================================

interface AICoDirectorProps {
    onApplySuggestion?: (suggestion: string) => void;
}

export function AICoDirector({ onApplySuggestion }: AICoDirectorProps) {
    const [isActive, setIsActive] = useState(false);
    const [suggestion, setSuggestion] = useState<string | null>(null);

    const suggestions = [
        { id: 'lighting', icon: '💡', label: 'Enhance lighting', desc: 'AI-powered brightness' },
        { id: 'framing', icon: '📐', label: 'Auto-frame', desc: 'Perfect composition' },
        { id: 'caption', icon: '✍️', label: 'Write caption', desc: 'AI-crafted text' },
        { id: 'music', icon: '🎵', label: 'Add music', desc: 'Mood-matched audio' },
        { id: 'effects', icon: '✨', label: 'Smart effects', desc: 'Pro transitions' },
        { id: 'timing', icon: '⏱️', label: 'Best timing', desc: 'Optimal post time' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[#7C8FFF]/10 to-[#6070EE]/10 rounded-2xl border border-[#7C8FFF]/20 p-6"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7C8FFF] to-[#6070EE] flex items-center justify-center">
                        <span className="text-2xl">🤖</span>
                    </div>
                    <div>
                        <h3 className="font-semibold text-white mb-1">AI Co-Director</h3>
                        <p className="text-sm text-white/50">
                            Pro-level content creation for everyone
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setIsActive(!isActive)}
                    className={`
                        px-3 py-1 rounded-full text-xs font-medium transition-colors
                        ${isActive
                            ? 'bg-[#7C8FFF] text-white'
                            : 'bg-white/10 text-white/60 hover:bg-white/20'
                        }
                    `}
                >
                    {isActive ? 'Active' : 'Enable'}
                </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {suggestions.map(s => (
                    <motion.button
                        key={s.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onApplySuggestion?.(s.id)}
                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left group"
                    >
                        <span className="text-lg block mb-1">{s.icon}</span>
                        <span className="text-xs font-medium text-white block">{s.label}</span>
                        <span className="text-[10px] text-white/40">{s.desc}</span>
                    </motion.button>
                ))}
            </div>

            <p className="text-xs text-white/30 mt-4 text-center">
                Unlike TikTok&apos;s complex tools — create pro content with one tap
            </p>
        </motion.div>
    );
}

// ============================================
// CREATOR EARNINGS DISPLAY
// Creators earn more (TikTok takes ~50%)
// ============================================

interface CreatorEarningsProps {
    earnings?: number;
    platformFee?: number; // 0G takes only 10%
    nextPayout?: string;
}

export function CreatorEarnings({
    earnings = 1247.50,
    platformFee = 0, // 0G takes 0%
    nextPayout = 'Instant'
}: CreatorEarningsProps) {
    const netEarnings = earnings;
    const tiktokComparison = earnings * 0.5; // TikTok would give you this

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/20 p-6"
        >
            <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <span className="text-2xl">💰</span>
                </div>
                <div>
                    <h3 className="font-semibold text-white mb-1">Direct Support</h3>
                    <p className="text-sm text-white/50">
                        Supporters back you directly.
                    </p>
                </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 mb-4">
                <div className="flex items-end justify-between mb-2">
                    <div className="text-3xl font-bold text-white">
                        ${netEarnings.toFixed(2)}
                    </div>
                    <div className="text-xs text-white/40">
                        Status: Direct
                    </div>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                        style={{ width: '100%' }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-xs text-white/40">
                    <span>Your share: 100%</span>
                </div>
            </div>

            <div className="bg-white/[0.02] rounded-xl p-3 flex items-center gap-3">
                <span className="text-lg">✨</span>
                <div className="flex-1">
                    <p className="text-xs text-white/60">
                        Direct support from your community. No intermediaries.
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// CROSS-PLATFORM PUBLISHER
// Post everywhere at once
// ============================================

interface Platform {
    id: string;
    name: string;
    icon: string;
    connected: boolean;
    followers?: number;
}

interface CrossPlatformPublisherProps {
    platforms?: Platform[];
    onTogglePlatform?: (platformId: string) => void;
}

export function CrossPlatformPublisher({
    platforms = [
        { id: 'instagram', name: 'Instagram', icon: '📷', connected: true, followers: 12400 },
        { id: 'tiktok', name: 'TikTok', icon: '🎵', connected: true, followers: 8700 },
        { id: 'youtube', name: 'YouTube', icon: '▶️', connected: false },
        { id: 'twitter', name: 'X/Twitter', icon: '𝕏', connected: true, followers: 5200 },
        { id: 'linkedin', name: 'LinkedIn', icon: '💼', connected: false },
    ],
    onTogglePlatform
}: CrossPlatformPublisherProps) {
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
        platforms.filter(p => p.connected).map(p => p.id)
    );

    const togglePlatform = (id: string) => {
        setSelectedPlatforms(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
        onTogglePlatform?.(id);
    };

    const totalReach = platforms
        .filter(p => selectedPlatforms.includes(p.id) && p.followers)
        .reduce((sum, p) => sum + (p.followers || 0), 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-2xl border border-violet-500/20 p-6"
        >
            <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                    <span className="text-2xl">🌐</span>
                </div>
                <div>
                    <h3 className="font-semibold text-white mb-1">Cross-Platform</h3>
                    <p className="text-sm text-white/50">
                        Post everywhere at once — no silos
                    </p>
                </div>
            </div>

            <div className="space-y-2 mb-4">
                {platforms.map(platform => (
                    <button
                        key={platform.id}
                        onClick={() => platform.connected && togglePlatform(platform.id)}
                        className={`
                            w-full flex items-center justify-between p-3 rounded-xl transition-colors
                            ${platform.connected
                                ? selectedPlatforms.includes(platform.id)
                                    ? 'bg-violet-500/20 border border-violet-500/30'
                                    : 'bg-white/5 border border-transparent hover:bg-white/10'
                                : 'bg-white/[0.02] border border-dashed border-white/10 opacity-50'
                            }
                        `}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-lg">{platform.icon}</span>
                            <span className="text-sm text-white">{platform.name}</span>
                            {platform.followers && (
                                <span className="text-xs text-white/40">
                                    {(platform.followers / 1000).toFixed(1)}k
                                </span>
                            )}
                        </div>
                        {platform.connected ? (
                            <div className={`
                                w-5 h-5 rounded-full border-2 flex items-center justify-center
                                ${selectedPlatforms.includes(platform.id)
                                    ? 'bg-violet-500 border-violet-500'
                                    : 'border-white/30'
                                }
                            `}>
                                {selectedPlatforms.includes(platform.id) && (
                                    <span className="text-[10px] text-white">✓</span>
                                )}
                            </div>
                        ) : (
                            <span className="text-xs text-white/40">Connect</span>
                        )}
                    </button>
                ))}
            </div>

            <div className="bg-white/5 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs text-white/60">Total reach</span>
                <span className="text-sm font-bold text-white">
                    {(totalReach / 1000).toFixed(1)}k followers
                </span>
            </div>
        </motion.div>
    );
}

// ============================================
// PRIVACY-FIRST INDICATOR
// Users feel safe
// ============================================

export function PrivacyFirstBadge() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
        >
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-emerald-400">Privacy Protected</span>
        </motion.div>
    );
}

// ============================================
// LIVE LATENCY INDICATOR
// <1s Live Latency vs 3-5s on TikTok/IG
// ============================================

interface LiveLatencyProps {
    latencyMs?: number;
}

export function LiveLatencyIndicator({ latencyMs = 380 }: LiveLatencyProps) {
    const isLowLatency = latencyMs < 1000;

    return (
        <div className="flex items-center gap-2">
            <div className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs
                ${isLowLatency ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}
            `}>
                ⚡
            </div>
            <div>
                <div className={`text-xs font-medium ${isLowLatency ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {latencyMs}ms latency
                </div>
                <div className="text-[10px] text-white/40">
                    {isLowLatency ? 'Real-time' : 'Standard'} • Others: 3-5s delay
                </div>
            </div>
        </div>
    );
}

export default DataOwnershipPanel;
