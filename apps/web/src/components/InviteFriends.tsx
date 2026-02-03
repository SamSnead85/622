'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInvite } from '@/hooks/useInvite';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// INVITE FRIENDS MODAL
// Revolutionary "Send a Caravan Invitation" UI
// ============================================

interface InviteFriendsProps {
    isOpen: boolean;
    onClose: () => void;
}

// Share platforms with Six22 branding
const SHARE_PLATFORMS = [
    { id: 'whatsapp', name: 'WhatsApp', icon: '💬', gradient: 'from-green-500 to-green-600' },
    { id: 'sms', name: 'Message', icon: '📱', gradient: 'from-blue-500 to-blue-600' },
    { id: 'telegram', name: 'Telegram', icon: '✈️', gradient: 'from-sky-400 to-sky-500' },
    { id: 'twitter', name: 'X', icon: '𝕏', gradient: 'from-neutral-600 to-neutral-700' },
    { id: 'email', name: 'Email', icon: '📧', gradient: 'from-rose-400 to-rose-500' },
] as const;

export function InviteFriends({ isOpen, onClose }: InviteFriendsProps) {
    const { user } = useAuth();
    const {
        isLoading,
        inviteLink,
        inviteCode,
        generateLink,
        copyLink,
        getShareUrl,
        remainingInvites
    } = useInvite();

    const [copied, setCopied] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Generate invite link when modal opens
    useEffect(() => {
        if (isOpen && !inviteLink) {
            generateLink();
        }
    }, [isOpen, inviteLink, generateLink]);

    const handleCopyLink = useCallback(async () => {
        const success = await copyLink();
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [copyLink]);

    const handleShare = useCallback((platform: typeof SHARE_PLATFORMS[number]['id']) => {
        const url = getShareUrl(platform as 'whatsapp' | 'twitter' | 'telegram' | 'sms' | 'email', user?.displayName);
        window.open(url, '_blank', 'width=600,height=500');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    }, [getShareUrl, user?.displayName]);

    if (!mounted) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop with blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-gradient-to-b from-[#0a0a0f] to-[#050508] rounded-3xl border border-white/10 shadow-2xl">
                            {/* Header with animated background */}
                            <div className="relative px-6 pt-8 pb-6 overflow-hidden">
                                {/* Animated gradient orbs */}
                                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                    <motion.div
                                        animate={{
                                            x: [0, 20, 0],
                                            y: [0, -10, 0],
                                        }}
                                        transition={{
                                            duration: 8,
                                            repeat: Infinity,
                                            ease: 'linear',
                                        }}
                                        className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-amber-500/20 blur-3xl"
                                    />
                                    <motion.div
                                        animate={{
                                            x: [0, -15, 0],
                                            y: [0, 15, 0],
                                        }}
                                        transition={{
                                            duration: 10,
                                            repeat: Infinity,
                                            ease: 'linear',
                                        }}
                                        className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-violet-500/20 blur-3xl"
                                    />
                                </div>

                                {/* Close button */}
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                                >
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>

                                {/* Hexagonal invite badge */}
                                <div className="relative mx-auto w-24 h-24 mb-6">
                                    <svg className="w-full h-full" viewBox="0 0 100 100">
                                        <defs>
                                            <linearGradient id="invite-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#F59E0B" />
                                                <stop offset="50%" stopColor="#F43F5E" />
                                                <stop offset="100%" stopColor="#8B5CF6" />
                                            </linearGradient>
                                        </defs>
                                        <motion.polygon
                                            initial={{ scale: 0, rotate: -30 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                                            points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
                                            fill="url(#invite-gradient)"
                                            className="drop-shadow-lg"
                                        />
                                        <text
                                            x="50"
                                            y="58"
                                            textAnchor="middle"
                                            fill="white"
                                            fontSize="32"
                                            fontWeight="bold"
                                        >
                                            🌙
                                        </text>
                                    </svg>
                                </div>

                                {/* Title */}
                                <motion.h2
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-2xl font-bold text-center text-white mb-2"
                                >
                                    Invite Friends
                                </motion.h2>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-sm text-center text-white/50"
                                >
                                    Bring your tribe to Six22
                                </motion.p>
                            </div>

                            {/* Content */}
                            <div className="px-6 pb-6 space-y-6">
                                {/* Invite Code Display */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="relative"
                                >
                                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                                        <div className="flex-1 min-w-0">
                                            {isLoading ? (
                                                <div className="h-5 w-48 bg-white/10 rounded animate-pulse" />
                                            ) : (
                                                <p className="text-sm text-white font-mono truncate">
                                                    {inviteLink || 'Generating link...'}
                                                </p>
                                            )}
                                            {inviteCode && (
                                                <p className="text-xs text-white/40 mt-1">
                                                    Code: <span className="font-semibold text-white/60">{inviteCode}</span>
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleCopyLink}
                                            disabled={isLoading}
                                            className="flex-shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-violet-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                                        >
                                            {copied ? '✓ Copied' : 'Copy'}
                                        </button>
                                    </div>
                                </motion.div>

                                {/* Share Platforms */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <p className="text-sm text-white/50 mb-3">Share via</p>
                                    <div className="grid grid-cols-5 gap-3">
                                        {SHARE_PLATFORMS.map((platform, index) => (
                                            <motion.button
                                                key={platform.id}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.5 + index * 0.05 }}
                                                onClick={() => handleShare(platform.id)}
                                                className="flex flex-col items-center gap-2 group"
                                            >
                                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${platform.gradient} flex items-center justify-center text-xl shadow-lg transition-transform group-hover:scale-110 group-active:scale-95`}>
                                                    {platform.icon}
                                                </div>
                                                <span className="text-[10px] text-white/60 group-hover:text-white/80 transition-colors">
                                                    {platform.name}
                                                </span>
                                            </motion.button>
                                        ))}
                                    </div>
                                </motion.div>

                                {/* Remaining Invites Badge */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.6 }}
                                    className="flex items-center justify-center gap-2 py-3"
                                >
                                    <span className="text-xs text-white/40">
                                        {remainingInvites} invites remaining today
                                    </span>
                                    <div className="flex gap-1">
                                        {[...Array(Math.min(remainingInvites, 5))].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 0.7 + i * 0.05 }}
                                                className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-400 to-rose-400"
                                            />
                                        ))}
                                    </div>
                                </motion.div>

                                {/* Success State */}
                                <AnimatePresence>
                                    {showSuccess && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30"
                                        >
                                            <span className="text-emerald-400">✓</span>
                                            <span className="text-sm text-emerald-400">Invite sent!</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Footer */}
                            <div className="px-6 pb-6">
                                <p className="text-xs text-center text-white/30">
                                    The more friends you bring, the stronger your tribe becomes 🌴
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default InviteFriends;
