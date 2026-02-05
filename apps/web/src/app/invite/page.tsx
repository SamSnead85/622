'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth, ProtectedRoute } from '@/contexts/AuthContext';
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
    LightbulbIcon,
    TentIcon
} from '@/components/icons';

// Platform share configurations
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

// Generate a simple QR code as SVG
function generateQRCodeSVG(data: string, size: number = 200): string {
    // This is a placeholder - in production use a proper QR library
    // For now, we'll create a visual placeholder
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" fill="white"/>
        <rect x="10" y="10" width="60" height="60" fill="black"/>
        <rect x="20" y="20" width="40" height="40" fill="white"/>
        <rect x="30" y="30" width="20" height="20" fill="black"/>
        <rect x="${size - 70}" y="10" width="60" height="60" fill="black"/>
        <rect x="${size - 60}" y="20" width="40" height="40" fill="white"/>
        <rect x="${size - 50}" y="30" width="20" height="20" fill="black"/>
        <rect x="10" y="${size - 70}" width="60" height="60" fill="black"/>
        <rect x="20" y="${size - 60}" width="40" height="40" fill="white"/>
        <rect x="30" y="${size - 50}" width="20" height="20" fill="black"/>
        <text x="${size / 2}" y="${size / 2}" text-anchor="middle" font-size="12" fill="black">QR Code</text>
        <text x="${size / 2}" y="${size / 2 + 15}" text-anchor="middle" font-size="10" fill="gray">(Scan to join)</text>
    </svg>`;
}

function InvitePageContent() {
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [inviteStats, setInviteStats] = useState({
        sent: 0,
        pending: 0,
        joined: 0,
    });

    useEffect(() => {
        setMounted(true);
        // Load invite stats from localStorage for now
        const storedStats = localStorage.getItem('0g_invite_stats');
        if (storedStats) {
            setInviteStats(JSON.parse(storedStats));
        }
    }, []);

    if (!mounted) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-[#00D4FF]/20 border-t-[#00D4FF] animate-spin" />
            </div>
        );
    }

    // Generate unique invite link
    const inviteCode = user?.id ? btoa(user.id).slice(0, 8) : 'INVITE';
    const inviteLink = typeof window !== 'undefined'
        ? `${window.location.origin}/signup?ref=${inviteCode}`
        : `https://zerogravity.app/signup?ref=${inviteCode}`;

    const inviteMessage = `Join me on 0G (ZeroG) - the Sovereign Social Network. No agendas, no algorithms, just pure human connection.`;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            // Track invite sent
            const newStats = { ...inviteStats, sent: inviteStats.sent + 1 };
            setInviteStats(newStats);
            localStorage.setItem('0g_invite_stats', JSON.stringify(newStats));
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

        // Track invite sent
        const newStats = { ...inviteStats, sent: inviteStats.sent + 1 };
        setInviteStats(newStats);
        localStorage.setItem('0g_invite_stats', JSON.stringify(newStats));

        // Try native share first on mobile
        if (navigator.share && platform.id === 'native') {
            try {
                await navigator.share({
                    title: 'Join ZeroG',
                    text: inviteMessage,
                    url: inviteLink,
                });
                return;
            } catch (err) {
                console.log('Native share cancelled');
            }
        }

        // Open share URL
        const url = platform.getUrl(inviteLink, inviteMessage);
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join ZeroG',
                    text: inviteMessage,
                    url: inviteLink,
                });
                const newStats = { ...inviteStats, sent: inviteStats.sent + 1 };
                setInviteStats(newStats);
                localStorage.setItem('0g_invite_stats', JSON.stringify(newStats));
            } catch (err) {
                console.log('Share cancelled');
            }
        }
    };

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
                    <div className="w-16" /> {/* Spacer */}
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-2xl mx-auto px-4 py-8 pb-24">
                {/* Hero Section */}
                <motion.div
                    className="text-center mb-10"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center">
                        <SendIcon className="text-white" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3">
                        Ignite the Migration
                    </h1>
                    <p className="text-white/60 max-w-md mx-auto">
                        Lead your tribe away from the noise. Invite your people to a space built for sovereignty, not profit.
                    </p>
                </motion.div>

                {/* Invite Stats */}
                <motion.div
                    className="grid grid-cols-3 gap-4 mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                        <p className="text-2xl font-bold text-[#00D4FF]">{inviteStats.sent}</p>
                        <p className="text-xs text-white/50">Invites Sent</p>
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
                    transition={{ delay: 0.2 }}
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
                            className={`px-5 py-3 rounded-xl font-semibold text-sm transition-all ${copied
                                ? 'bg-green-500 text-white'
                                : 'bg-[#00D4FF] text-black hover:opacity-90'
                                }`}
                        >
                            {copied ? '✓ Copied!' : 'Copy'}
                        </button>
                    </div>
                </motion.div>

                {/* Native Share Button (Mobile) */}
                {'share' in navigator && (
                    <motion.button
                        onClick={handleNativeShare}
                        className="w-full mb-6 py-4 rounded-2xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white font-bold text-lg flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <SendIcon size={20} />
                        Share Invite
                    </motion.button>
                )}

                {/* Share Platforms Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <p className="text-sm text-white/60 mb-4">Or share via:</p>
                    <div className="grid grid-cols-3 gap-3">
                        {SHARE_PLATFORMS.map((platform) => (
                            <button
                                key={platform.id}
                                onClick={() => handleShare(platform)}
                                className={`p-4 rounded-2xl bg-gradient-to-br ${platform.color} hover:opacity-90 transition-opacity flex flex-col items-center gap-2`}
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
                    transition={{ delay: 0.5 }}
                >
                    <button
                        onClick={() => setShowQR(!showQR)}
                        className="w-full py-4 rounded-2xl border border-white/10 text-white/70 hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
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
                                className="mt-4 flex flex-col items-center"
                            >
                                <div className="bg-white p-4 rounded-2xl">
                                    <div
                                        dangerouslySetInnerHTML={{ __html: generateQRCodeSVG(inviteLink, 180) }}
                                    />
                                </div>
                                <p className="text-xs text-white/40 mt-3">Scan to join ZeroG</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Invite Message Preview */}
                <motion.div
                    className="mt-8 bg-white/5 rounded-2xl p-5 border border-white/5"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <p className="text-sm text-white/60 mb-3">Message Preview:</p>
                    <p className="text-white/80 text-sm leading-relaxed">
                        {inviteMessage}
                    </p>
                    <p className="text-[#00D4FF] text-sm mt-2 break-all">
                        {inviteLink}
                    </p>
                </motion.div>

                {/* Tips Section */}
                <motion.div
                    className="mt-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                >
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <LightbulbIcon className="text-amber-400" size={20} />
                        Tips for Growing Your Tribe
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3 text-sm">
                            <span className="text-[#00D4FF]">1.</span>
                            <p className="text-white/60">Share to your WhatsApp groups and family chats</p>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                            <span className="text-[#00D4FF]">2.</span>
                            <p className="text-white/60">Post your invite link on Instagram/TikTok stories</p>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                            <span className="text-[#00D4FF]">3.</span>
                            <p className="text-white/60">Create a tribe and invite your community to join</p>
                        </div>
                    </div>
                </motion.div>

                {/* CTA to Create Tribe */}
                <motion.div
                    className="mt-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                >
                    <Link
                        href="/communities/create"
                        className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-center text-white font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                    >
                        <TentIcon size={20} />
                        Create a Tribe for Your Community
                    </Link>
                </motion.div>
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10 z-50 safe-area-pb">
                <div className="flex items-center justify-around py-3">
                    <Link href="/dashboard" className="flex flex-col items-center gap-1 p-2 text-white/50 hover:text-white transition-colors">
                        <HomeIcon size={22} />
                        <span className="text-[10px]">Home</span>
                    </Link>
                    <Link href="/explore" className="flex flex-col items-center gap-1 p-2 text-white/50 hover:text-white transition-colors">
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
