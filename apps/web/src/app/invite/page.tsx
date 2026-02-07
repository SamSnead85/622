'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth, ProtectedRoute } from '@/contexts/AuthContext';
import { apiFetch, API_URL } from '@/lib/api';
import QRCode from 'qrcode';
import {
    MessageIcon,
    SmartphoneIcon,
    MailIcon,
    XIcon,
    PlaneIcon,
    LinkIcon,
    HomeIcon,
    SearchIcon,
    PlusIcon,
    SendIcon,
    UserIcon,
    QRCodeIcon,
    TentIcon
} from '@/components/icons';

// ============================================
// GAMIFICATION TIERS
// ============================================
const TIERS = [
    { name: 'Newcomer', minJoined: 0, icon: '🌱', color: 'text-white/50', bg: 'from-white/5 to-white/5', border: 'border-white/10' },
    { name: 'Spark', minJoined: 1, icon: '✨', color: 'text-amber-400', bg: 'from-amber-500/10 to-amber-600/5', border: 'border-amber-500/20' },
    { name: 'Catalyst', minJoined: 5, icon: '🔥', color: 'text-orange-400', bg: 'from-orange-500/10 to-red-500/5', border: 'border-orange-500/20' },
    { name: 'Torchbearer', minJoined: 15, icon: '🏆', color: 'text-[#00D4FF]', bg: 'from-[#00D4FF]/10 to-[#8B5CF6]/5', border: 'border-[#00D4FF]/30' },
    { name: 'Pioneer', minJoined: 50, icon: '🚀', color: 'text-violet-400', bg: 'from-violet-500/15 to-fuchsia-500/10', border: 'border-violet-500/30' },
];

function getCurrentTier(joined: number) {
    let tier = TIERS[0];
    for (const t of TIERS) {
        if (joined >= t.minJoined) tier = t;
    }
    return tier;
}

function getNextTier(joined: number) {
    for (const t of TIERS) {
        if (joined < t.minJoined) return t;
    }
    return null;
}

// ============================================
// SHARE PLATFORMS
// ============================================
const SHARE_PLATFORMS = [
    {
        id: 'whatsapp',
        name: 'WhatsApp',
        Icon: MessageIcon,
        color: 'from-green-500 to-green-600',
        getUrl: (link: string, message: string) =>
            `https://wa.me/?text=${encodeURIComponent(message + ' ' + link)}`,
    },
    {
        id: 'sms',
        name: 'SMS',
        Icon: SmartphoneIcon,
        color: 'from-blue-500 to-blue-600',
        getUrl: (link: string, message: string) =>
            `sms:?body=${encodeURIComponent(message + ' ' + link)}`,
    },
    {
        id: 'email',
        name: 'Email',
        Icon: MailIcon,
        color: 'from-purple-500 to-purple-600',
        getUrl: (link: string, message: string) =>
            `mailto:?subject=${encodeURIComponent('Join me on Zero Gravity!')}&body=${encodeURIComponent(message + '\n\n' + link)}`,
    },
    {
        id: 'twitter',
        name: 'X / Twitter',
        Icon: XIcon,
        color: 'from-gray-700 to-gray-800',
        getUrl: (link: string, message: string) =>
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(link)}`,
    },
    {
        id: 'telegram',
        name: 'Telegram',
        Icon: PlaneIcon,
        color: 'from-sky-500 to-sky-600',
        getUrl: (link: string, message: string) =>
            `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`,
    },
    {
        id: 'copy',
        name: 'Copy Link',
        Icon: LinkIcon,
        color: 'from-gray-600 to-gray-700',
        getUrl: () => '',
    },
];

// ============================================
// INVITE PAGE
// ============================================
function InvitePageContent() {
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [inviteLink, setInviteLink] = useState('');
    const [inviteStats, setInviteStats] = useState({ sent: 0, pending: 0, joined: 0 });
    const displayName = user?.displayName || user?.username || 'Someone';
    const [customMessage, setCustomMessage] = useState('');

    // Set personalized message once user data is available
    useEffect(() => {
        if (user?.displayName) {
            setCustomMessage(
                `${user.displayName} invited you to join their community on ZeroG — the social platform built for real people. No algorithms, no ads, you own your data.`
            );
        }
    }, [user?.displayName]);
    const [isEditingMessage, setIsEditingMessage] = useState(false);

    // Fetch real invite data from server
    const fetchInviteData = useCallback(async () => {
        try {
            const data = await apiFetch(`${API_URL}/api/v1/invite`);
            const invites = data.invites || [];
            const sent = invites.length;
            const pending = invites.filter((inv: any) => ['SENT', 'OPENED', 'REMINDED'].includes(inv.status)).length;
            const joined = invites.filter((inv: any) => inv.status === 'JOINED').length;
            setInviteStats({ sent, pending, joined });
        } catch {
            // API unavailable
        }
    }, []);

    // Generate real invite link from server — now uses /join/ format
    const fetchInviteLink = useCallback(async () => {
        try {
            const data = await apiFetch(`${API_URL}/api/v1/invite/link`, { method: 'POST' });
            if (data.code) {
                // Use the new branded join page format
                setInviteLink(`https://0gravity.ai/join/${data.code}`);
                return;
            }
            if (data.url) {
                // Convert old /r/ URLs to /join/ format
                const oldCode = data.url.split('/').pop() || '';
                setInviteLink(`https://0gravity.ai/join/${oldCode}`);
                return;
            }
        } catch {
            // Fallback
        }
        const code = user?.id ? btoa(user.id).slice(0, 8) : 'INVITE';
        setInviteLink(`https://0gravity.ai/join/${code}`);
    }, [user?.id]);

    // Generate real QR code when link changes or QR is shown
    useEffect(() => {
        if (showQR && inviteLink) {
            QRCode.toDataURL(inviteLink, {
                width: 200,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' },
                errorCorrectionLevel: 'M',
            }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
        }
    }, [showQR, inviteLink]);

    useEffect(() => {
        setMounted(true);
        fetchInviteData();
        fetchInviteLink();
    }, [fetchInviteData, fetchInviteLink]);

    if (!mounted) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-[#00D4FF]/20 border-t-[#00D4FF] animate-spin" />
            </div>
        );
    }

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleShare = async (platform: typeof SHARE_PLATFORMS[0]) => {
        if (platform.id === 'copy') {
            handleCopyLink();
            return;
        }
        const url = platform.getUrl(inviteLink, customMessage);
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join ZeroG',
                    text: customMessage,
                    url: inviteLink,
                });
            } catch {
                // cancelled
            }
        }
    };

    // Gamification
    const currentTier = getCurrentTier(inviteStats.joined);
    const nextTier = getNextTier(inviteStats.joined);
    const progress = nextTier
        ? ((inviteStats.joined - (TIERS[TIERS.indexOf(currentTier)]?.minJoined || 0)) /
           (nextTier.minJoined - (TIERS[TIERS.indexOf(currentTier)]?.minJoined || 0))) * 100
        : 100;

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0A1628] via-black to-black" />
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[#00D4FF]/5 blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[#8B5CF6]/5 blur-[100px]" />
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-white/5 bg-black/50 backdrop-blur-xl">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                        <span>←</span>
                        <span className="text-sm">Back</span>
                    </Link>
                    <div className="font-bold">
                        <span className="text-[#00D4FF]">0</span>
                        <span className="text-white">G</span>
                    </div>
                    <div className="w-16" />
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-2xl mx-auto px-4 py-8 pb-24">
                {/* Hero Section */}
                <motion.div
                    className="text-center mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center shadow-[0_0_30px_rgba(0,212,255,0.2)]">
                        <SendIcon className="text-white" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3">
                        Grow Your Tribe
                    </h1>
                    <p className="text-white/60 max-w-md mx-auto">
                        Every person you bring makes this space stronger. Share your link and watch your community grow.
                    </p>
                </motion.div>

                {/* Gamification Tier Card */}
                <motion.div
                    className={`rounded-2xl p-5 mb-8 border bg-gradient-to-br ${currentTier.bg} ${currentTier.border}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{currentTier.icon}</span>
                            <div>
                                <p className={`font-bold ${currentTier.color}`}>{currentTier.name}</p>
                                <p className="text-xs text-white/40">{inviteStats.joined} people joined via your link</p>
                            </div>
                        </div>
                        {nextTier && (
                            <div className="text-right">
                                <p className="text-xs text-white/40">Next: {nextTier.icon} {nextTier.name}</p>
                                <p className="text-xs text-white/30">{nextTier.minJoined - inviteStats.joined} more needed</p>
                            </div>
                        )}
                    </div>
                    {nextTier && (
                        <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6]"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(progress, 100)}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                            />
                        </div>
                    )}
                    {!nextTier && (
                        <p className="text-xs text-white/50 mt-1">You&apos;ve reached the highest tier! You&apos;re a true pioneer.</p>
                    )}
                </motion.div>

                {/* Invite Stats */}
                <motion.div
                    className="grid grid-cols-3 gap-3 mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                        <p className="text-2xl font-bold text-[#00D4FF]">{inviteStats.sent}</p>
                        <p className="text-xs text-white/50">Links Created</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                        <p className="text-2xl font-bold text-yellow-400">{inviteStats.pending}</p>
                        <p className="text-xs text-white/50">Pending</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                        <p className="text-2xl font-bold text-green-400">{inviteStats.joined}</p>
                        <p className="text-xs text-white/50">Joined</p>
                    </div>
                </motion.div>

                {/* Your Invite Link */}
                <motion.div
                    className="bg-gradient-to-br from-[#00D4FF]/10 to-[#8B5CF6]/10 rounded-2xl p-6 border border-[#00D4FF]/20 mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    <p className="text-sm text-white/60 mb-3">Your Personal Invite Link</p>
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            value={inviteLink}
                            readOnly
                            className="flex-1 bg-black/50 rounded-xl px-4 py-3 text-white text-sm border border-white/10 focus:outline-none"
                        />
                        <button
                            onClick={handleCopyLink}
                            className={`px-5 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${copied
                                ? 'bg-green-500 text-white'
                                : 'bg-[#00D4FF] text-black hover:opacity-90'
                                }`}
                        >
                            {copied ? '✓ Copied!' : 'Copy'}
                        </button>
                    </div>
                </motion.div>

                {/* Branded Share Preview */}
                <motion.div
                    className="mb-6 rounded-2xl overflow-hidden border border-white/[0.06]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 }}
                >
                    <div className="relative h-28 bg-gradient-to-br from-violet-900/50 to-[#00D4FF]/20 overflow-hidden">
                        {user?.coverUrl && (
                            <img src={user.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0f]/90" />
                        <div className="absolute bottom-3 left-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/20 bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                                {user?.avatarUrl && !user.avatarUrl.startsWith('preset:') ? (
                                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-white font-bold text-sm">{displayName.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">{displayName}</p>
                                <p className="text-[10px] text-white/50">invites you to join ZeroG</p>
                            </div>
                        </div>
                        <div className="absolute top-2.5 right-2.5">
                            <div className="w-6 h-6 rounded-md bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                <span className="text-[7px] font-bold text-[#00D4FF]">0G</span>
                            </div>
                        </div>
                    </div>
                    <div className="px-4 py-3 bg-white/[0.02]">
                        <p className="text-[10px] text-white/25">This is how your invite will appear when shared. Your background and avatar make it personal.</p>
                    </div>
                </motion.div>

                {/* Native Share Button (Mobile) */}
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <motion.button
                        onClick={handleNativeShare}
                        className="w-full mb-6 py-4 rounded-2xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white font-bold text-lg flex items-center justify-center gap-3 hover:opacity-90 transition-opacity active:scale-[0.98]"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <SendIcon size={20} />
                        Share Invite
                    </motion.button>
                )}

                {/* Editable Invite Message */}
                <motion.div
                    className="mb-8 bg-white/[0.03] rounded-2xl p-5 border border-white/[0.06]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                >
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-white/70">Your Invite Message</p>
                        <button
                            onClick={() => setIsEditingMessage(!isEditingMessage)}
                            className="text-xs text-[#00D4FF] hover:text-[#00D4FF]/80 transition-colors"
                        >
                            {isEditingMessage ? 'Done' : 'Edit'}
                        </button>
                    </div>
                    {isEditingMessage ? (
                        <textarea
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            maxLength={280}
                            rows={3}
                            className="w-full bg-black/50 rounded-xl px-4 py-3 text-white text-sm border border-white/10 focus:outline-none focus:border-[#00D4FF]/30 resize-none transition-colors"
                            placeholder="Write your invite message..."
                        />
                    ) : (
                        <p className="text-white/60 text-sm leading-relaxed">{customMessage}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                        <p className="text-[10px] text-white/30">This message is sent along with your invite link</p>
                        {isEditingMessage && (
                            <p className="text-[10px] text-white/30">{customMessage.length}/280</p>
                        )}
                    </div>
                </motion.div>

                {/* Share Platforms Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <p className="text-sm text-white/60 mb-4">Share via:</p>
                    <div className="grid grid-cols-3 gap-3">
                        {SHARE_PLATFORMS.map((platform) => (
                            <button
                                key={platform.id}
                                onClick={() => handleShare(platform)}
                                className={`p-4 rounded-2xl bg-gradient-to-br ${platform.color} hover:opacity-90 active:scale-95 transition-all flex flex-col items-center gap-2`}
                            >
                                <platform.Icon className="text-white" size={24} />
                                <span className="text-xs font-medium text-white">{platform.name}</span>
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* QR Code Section */}
                <motion.div
                    className="mt-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                >
                    <button
                        onClick={() => setShowQR(!showQR)}
                        className="w-full py-4 rounded-2xl border border-white/10 text-white/70 hover:bg-white/5 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <QRCodeIcon size={20} />
                        {showQR ? 'Hide QR Code' : 'Show QR Code'}
                    </button>

                    <AnimatePresence>
                        {showQR && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 flex flex-col items-center overflow-hidden"
                            >
                                <div className="bg-white p-4 rounded-2xl shadow-[0_0_40px_rgba(0,212,255,0.15)]">
                                    {qrDataUrl ? (
                                        <img src={qrDataUrl} alt="Invite QR Code" width={200} height={200} />
                                    ) : (
                                        <div className="w-[200px] h-[200px] flex items-center justify-center">
                                            <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-white/40 mt-3">Scan to join ZeroG</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* CTA to Create Tribe */}
                <motion.div
                    className="mt-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Link
                        href="/communities/create"
                        className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-center text-white font-medium hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <TentIcon size={20} />
                        Create a Tribe for Your Community
                    </Link>
                </motion.div>

                {/* Growth Partner Program CTA — only visible to tagged partners & admins */}
                {(user?.isGrowthPartner || user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && (
                    <motion.div
                        className="mt-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <Link
                            href="/dashboard/growth-partner"
                            className="block w-full p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-[#00D4FF]/10 border border-emerald-500/20 hover:border-emerald-500/40 active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                    <span className="text-lg">💰</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-white text-sm">Your Growth Dashboard</h3>
                                    <p className="text-white/50 text-xs mt-1 leading-relaxed">
                                        Track referrals, earnings, and your leaderboard rank.
                                    </p>
                                    <span className="inline-flex items-center gap-1 mt-2 text-emerald-400 text-xs font-medium">
                                        View dashboard &rarr;
                                    </span>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                )}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10 z-50 safe-area-pb">
                <div className="flex items-center justify-around py-3">
                    <Link href="/dashboard" className="flex flex-col items-center gap-1 p-2 text-white/50 hover:text-white transition-colors">
                        <HomeIcon size={22} />
                        <span className="text-[10px]">Home</span>
                    </Link>
                    <Link href="/search" className="flex flex-col items-center gap-1 p-2 text-white/50 hover:text-white transition-colors">
                        <SearchIcon size={22} />
                        <span className="text-[10px]">Explore</span>
                    </Link>
                    <Link href="/create" className="flex flex-col items-center gap-1 p-2 text-white/50 hover:text-white transition-colors">
                        <PlusIcon size={22} />
                        <span className="text-[10px]">Create</span>
                    </Link>
                    <Link href="/invite" className="flex flex-col items-center gap-1 p-2 text-[#00D4FF]">
                        <SendIcon size={22} />
                        <span className="text-[10px]">Invite</span>
                    </Link>
                    <Link href="/profile" className="flex flex-col items-center gap-1 p-2 text-white/50 hover:text-white transition-colors">
                        <UserIcon size={22} />
                        <span className="text-[10px]">Profile</span>
                    </Link>
                </div>
            </nav>
        </div>
    );
}

export default function InvitePage() {
    return (
        <ProtectedRoute>
            <InvitePageContent />
        </ProtectedRoute>
    );
}
