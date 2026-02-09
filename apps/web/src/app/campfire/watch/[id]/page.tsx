'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch, API_URL } from '@/lib/api';
import { useStreamChat, type StreamChatMessage } from '@/hooks/useStreamChat';
import MuxPlayer from '@mux/mux-player-react';

// ============================================
// TYPES
// ============================================

interface StreamData {
    id: string;
    title: string;
    description: string | null;
    status: string;
    viewerCount: number;
    peakViewerCount: number;
    totalViews: number;
    startedAt: string | null;
    category: string | null;
    tags: string[];
    muxPlaybackId: string | null;
    playbackUrl: string | null;
    thumbnailUrl: string | null;
    user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        isVerified: boolean;
        followersCount: number;
    };
}

// ============================================
// GIFT DEFINITIONS
// ============================================

const GIFTS = [
    { type: 'star', emoji: '⭐', label: 'Star', amount: 0, color: 'text-yellow-400' },
    { type: 'fire', emoji: '🔥', label: 'Fire', amount: 100, color: 'text-orange-400' },
    { type: 'diamond', emoji: '💎', label: 'Diamond', amount: 500, color: 'text-cyan-400' },
    { type: 'crown', emoji: '👑', label: 'Crown', amount: 2500, color: 'text-purple-400' },
] as const;

// ============================================
// CHAT MESSAGE COMPONENT
// ============================================

function ChatMessage({ msg }: { msg: StreamChatMessage }) {
    if (msg.type === 'JOIN') {
        return (
            <div className="px-3 py-1">
                <span className="text-white/30 text-xs">{msg.user.displayName} joined</span>
            </div>
        );
    }

    if (msg.type === 'GIFT') {
        const gift = GIFTS.find(g => g.type === msg.giftType);
        return (
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="px-3 py-2 mx-2 mb-1 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/20"
            >
                <div className="flex items-center gap-2">
                    {msg.user.avatarUrl ? (
                        <Image src={msg.user.avatarUrl} alt="" width={20} height={20} className="w-5 h-5 rounded-full" />
                    ) : (
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[8px] font-bold text-white">
                            {msg.user.displayName[0]}
                        </div>
                    )}
                    <span className="text-xs font-semibold text-purple-300">{msg.user.displayName}</span>
                    <span className="text-lg">{gift?.emoji || '🎁'}</span>
                    <span className="text-xs text-white/50">{msg.content}</span>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-3 py-1 flex gap-2 group hover:bg-white/[0.03] rounded-lg mx-1"
        >
            {msg.user.avatarUrl ? (
                <Image src={msg.user.avatarUrl} alt="" width={24} height={24} className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5" />
            ) : (
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-white/60 flex-shrink-0 mt-0.5">
                    {msg.user.displayName[0]}
                </div>
            )}
            <div className="min-w-0">
                <span className="text-xs font-semibold text-[#D4AF37] mr-1.5">
                    {msg.user.displayName}
                    {msg.user.isVerified && <span className="ml-0.5 text-[#D4AF37]">✓</span>}
                </span>
                <span className="text-sm text-white/80 break-words">{msg.content}</span>
            </div>
        </motion.div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function WatchStreamPage() {
    const params = useParams();
    const router = useRouter();
    const streamId = params.id as string;
    const { user } = useAuth();

    const [stream, setStream] = useState<StreamData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [showGiftPanel, setShowGiftPanel] = useState(false);
    const [chatExpanded, setChatExpanded] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [streamEnded, setStreamEnded] = useState(false);

    const chatRef = useRef<HTMLDivElement>(null);
    const {
        messages,
        reactions,
        viewerCount,
        isConnected,
        sendMessage,
        sendReaction,
        sendGift,
    } = useStreamChat(streamId);

    // Fetch stream data
    useEffect(() => {
        const fetchStream = async () => {
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
                const res = await fetch(`${API_URL}/api/v1/livestream/${streamId}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                });
                if (res.ok) {
                    const data = await res.json();
                    setStream(data.stream);
                    if (data.stream.status === 'ENDED') setStreamEnded(true);
                }
            } catch (err) {
                console.error('Failed to fetch stream:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStream();
    }, [streamId]);

    // Auto-scroll chat
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [messages]);

    // Listen for stream end
    useEffect(() => {
        // Check if stream ended via socket
        const checkEnded = messages.find(m => m.type === 'LEAVE' && m.content === 'Stream ended');
        if (checkEnded) setStreamEnded(true);
    }, [messages]);

    const handleSendMessage = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        sendMessage(newMessage);
        setNewMessage('');
    }, [newMessage, sendMessage]);

    const handleFollow = async () => {
        if (!stream) return;
        try {
            await apiFetch(`/users/${stream.user.id}/follow`, { method: 'POST' });
            setIsFollowing(!isFollowing);
        } catch { /* ignore */ }
    };

    const handleGift = (giftType: string, amount: number) => {
        sendGift(giftType, amount);
        setShowGiftPanel(false);
    };

    const formatDuration = () => {
        if (!stream?.startedAt) return '';
        const diff = Date.now() - new Date(stream.startedAt).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        return `${hours}h ${mins % 60}m`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050508] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
            </div>
        );
    }

    if (!stream) {
        return (
            <div className="min-h-screen bg-[#050508] flex items-center justify-center text-white">
                <div className="text-center">
                    <p className="text-white/50 mb-4">Stream not found</p>
                    <Link href="/campfire" className="text-[#D4AF37] hover:underline">Browse streams</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050508] text-white flex flex-col lg:flex-row">
            {/* Main Video Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Video Player */}
                <div className="relative w-full bg-black aspect-video lg:aspect-auto lg:flex-1 lg:min-h-0">
                    {stream.muxPlaybackId && !streamEnded ? (
                        <MuxPlayer
                            playbackId={stream.muxPlaybackId}
                            streamType="live"
                            autoPlay="muted"
                            accentColor="#D4AF37"
                            primaryColor="#ffffff"
                            secondaryColor="#050508"
                            className="w-full h-full [aspect-ratio:unset]"
                            metadata={{
                                video_title: stream.title,
                                viewer_user_id: user?.id || 'anonymous',
                            }}
                        />
                    ) : streamEnded && stream.muxPlaybackId ? (
                        // VOD playback for ended streams
                        <MuxPlayer
                            playbackId={stream.muxPlaybackId}
                            streamType="on-demand"
                            autoPlay={false}
                            accentColor="#D4AF37"
                            primaryColor="#ffffff"
                            secondaryColor="#050508"
                            className="w-full h-full [aspect-ratio:unset]"
                            metadata={{
                                video_title: `${stream.title} (VOD)`,
                                viewer_user_id: user?.id || 'anonymous',
                            }}
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0A0A0F] to-[#050508]">
                            <div className="text-center">
                                <div className="text-5xl mb-4 opacity-30">{streamEnded ? '📺' : '⏳'}</div>
                                <p className="text-white/40 text-sm">
                                    {streamEnded ? 'Stream has ended' : 'Waiting for stream to start...'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Live badge overlay */}
                    {!streamEnded && stream.status === 'LIVE' && (
                        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                            <div className="flex items-center gap-1.5 bg-rose-500/90 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                <span className="text-[10px] font-bold text-white tracking-wider">LIVE</span>
                            </div>
                            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                <span className="text-xs font-semibold text-white">{(viewerCount || stream.viewerCount).toLocaleString()}</span>
                            </div>
                            {stream.startedAt && (
                                <div className="bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                                    <span className="text-xs text-white/70 font-mono">{formatDuration()}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Floating reactions */}
                    <AnimatePresence>
                        {reactions.map((reaction) => (
                            <motion.div
                                key={reaction.id}
                                initial={{ y: 0, opacity: 1, scale: 1 }}
                                animate={{ y: -200, opacity: 0, scale: 1.4 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 2, ease: 'easeOut' }}
                                className="absolute bottom-20 pointer-events-none z-20"
                                style={{ right: `${10 + Math.random() * 15}%` }}
                            >
                                <span className="text-3xl drop-shadow-lg">{reaction.emoji}</span>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Mobile chat overlay toggle */}
                    <button
                        onClick={() => setChatExpanded(!chatExpanded)}
                        className="lg:hidden absolute bottom-3 right-3 z-10 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-xl text-xs text-white/70 border border-white/10"
                    >
                        {chatExpanded ? 'Hide Chat' : 'Show Chat'}
                    </button>
                </div>

                {/* Stream Info Bar */}
                <div className="bg-[#0A0A0F] border-t border-white/[0.06] p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3 min-w-0">
                            <Link href={`/profile/${stream.user.username}`} className="flex-shrink-0">
                                {stream.user.avatarUrl ? (
                                    <Image
                                        src={stream.user.avatarUrl}
                                        alt={stream.user.displayName}
                                        width={44}
                                        height={44}
                                        className="w-11 h-11 rounded-full ring-2 ring-rose-500/50 object-cover"
                                    />
                                ) : (
                                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white font-bold ring-2 ring-rose-500/50">
                                        {stream.user.displayName[0]}
                                    </div>
                                )}
                            </Link>
                            <div className="min-w-0">
                                <h1 className="font-bold text-base text-white truncate">{stream.title}</h1>
                                <div className="flex items-center gap-2 text-sm text-white/50 mt-0.5">
                                    <Link href={`/profile/${stream.user.username}`} className="hover:text-[#D4AF37] transition-colors">
                                        @{stream.user.username}
                                        {stream.user.isVerified && <span className="text-[#D4AF37] ml-0.5">✓</span>}
                                    </Link>
                                    <span className="text-white/20">·</span>
                                    <span>{stream.user.followersCount?.toLocaleString() || 0} followers</span>
                                    {stream.category && (
                                        <>
                                            <span className="text-white/20">·</span>
                                            <span className="bg-white/[0.06] px-2 py-0.5 rounded text-xs capitalize">{stream.category}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={() => setShowGiftPanel(!showGiftPanel)}
                                className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl text-sm font-semibold text-purple-300 hover:border-purple-400/50 transition-all active:scale-95"
                            >
                                🎁 Gift
                            </button>
                            <button
                                onClick={handleFollow}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                                    isFollowing
                                        ? 'bg-white/[0.06] text-white/70 border border-white/[0.08]'
                                        : 'bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90'
                                }`}
                            >
                                {isFollowing ? 'Following' : 'Follow'}
                            </button>
                        </div>
                    </div>

                    {/* Reaction row */}
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
                        {['❤️', '🔥', '👏', '😂', '😮', '💯', '🎉', '💀'].map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => sendReaction(emoji)}
                                className="w-10 h-10 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl flex items-center justify-center text-lg transition-all active:scale-90 flex-shrink-0"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>

                    {/* Gift panel */}
                    <AnimatePresence>
                        {showGiftPanel && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/[0.06]">
                                    {GIFTS.map((gift) => (
                                        <button
                                            key={gift.type}
                                            onClick={() => handleGift(gift.type, gift.amount)}
                                            className="flex flex-col items-center gap-1.5 p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-xl transition-all active:scale-95"
                                        >
                                            <span className="text-2xl">{gift.emoji}</span>
                                            <span className="text-[10px] font-semibold text-white/70">{gift.label}</span>
                                            <span className="text-[9px] text-white/40">
                                                {gift.amount === 0 ? 'Free' : `${gift.amount} pts`}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Chat Sidebar - Desktop always visible, mobile collapsible */}
            <div className={`${chatExpanded ? 'flex' : 'hidden'} lg:flex w-full lg:w-80 xl:w-96 bg-[#0A0A0F] border-t lg:border-t-0 lg:border-l border-white/[0.06] flex-col max-h-[50vh] lg:max-h-none lg:h-screen`}>
                {/* Chat header */}
                <div className="p-3 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-sm text-white">Live Chat</h2>
                        {isConnected && (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                Connected
                            </span>
                        )}
                    </div>
                    <span className="text-[11px] text-white/30">{messages.filter(m => m.type === 'MESSAGE').length} messages</span>
                </div>

                {/* Messages */}
                <div
                    ref={chatRef}
                    className="flex-1 overflow-y-auto py-2 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                >
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center px-6">
                            <span className="text-3xl mb-3 opacity-20">💬</span>
                            <p className="text-xs text-white/30">
                                {stream.status === 'LIVE' ? 'Be the first to chat!' : 'No chat messages yet'}
                            </p>
                        </div>
                    ) : (
                        messages.map((msg) => <ChatMessage key={msg.id} msg={msg} />)
                    )}
                </div>

                {/* Chat input */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-white/[0.06] flex-shrink-0 safe-area-pb">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={user ? 'Send a message...' : 'Log in to chat'}
                            disabled={!user}
                            maxLength={500}
                            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/40 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all disabled:opacity-40"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || !user}
                            className="bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] p-2.5 rounded-xl transition-all disabled:opacity-30 active:scale-95"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
