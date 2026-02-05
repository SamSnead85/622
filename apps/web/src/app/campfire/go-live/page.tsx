'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { ShareIcon, SendIcon } from '@/components/icons';
import { CampfireInvite } from '@/components/CampfireInvite';

interface ChatMessage {
    id: string;
    username: string;
    content: string;
    type: 'message' | 'gift' | 'join';
    giftEmoji?: string;
    userId: string;
    avatarUrl: string;
}

// Mock message for testing interactions
const INITIAL_MESSAGES: ChatMessage[] = [
    {
        id: '1',
        username: 'ZeroGFoundry',
        userId: 'mock-zerog', // In real app, this would be a real ID
        content: 'Cant wait to see this! 🔥',
        type: 'message',
        avatarUrl: 'https://ui-avatars.com/api/?name=ZeroG&background=random'
    }
];

export default function CampfireGoLive() {
    const { user } = useAuth();
    // ... refs
    const [selectedViewer, setSelectedViewer] = useState<ChatMessage | null>(null);
    // ... existing state

    // ... (keep existing useEffects)

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        const msg: ChatMessage = {
            id: Date.now().toString(),
            username: user?.username || 'you',
            userId: user?.id || 'me',
            content: newMessage,
            type: 'message',
            avatarUrl: userAvatar,
        };
        setMessages(prev => [...prev, msg]);
        setNewMessage('');
    };

    const handleInviteToStage = async () => {
        if (!selectedViewer) return;

        // In a real app, this would send a WebSocket event or Push Notification
        // For MVP, we reuse the 'wave' endpoint with a specific message
        alert(`Invited @${selectedViewer.username} to co-host! 🎤`);

        // Close modal
        setSelectedViewer(null);
    };

    const addReaction = (emoji: string) => {
        const id = Date.now().toString();
        const x = 20 + Math.random() * 60;
        setReactions(prev => [...prev, { id, emoji, x }]);
        setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== id));
        }, 2000);
    };

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return h > 0
            ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
            : `${m}:${s.toString().padStart(2, '0')}`;
    };

    const shareStream = async () => {
        const streamUrl = `${window.location.origin}/campfire/watch/${user?.id || 'live'}`;
        const shareText = `🔥 I'm LIVE on 0G! Join me: ${title || 'Live Stream'}`;

        // Try native share first (mobile)
        if (navigator.share) {
            try {
                await navigator.share({
                    title: '0G Live Stream',
                    text: shareText,
                    url: streamUrl,
                });
                return;
            } catch (err) {
                console.log('Share cancelled');
            }
        }

        // Fallback: copy link
        try {
            await navigator.clipboard.writeText(streamUrl);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy link');
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-20 bg-gray-950/80 backdrop-blur-lg border-b border-gray-900">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Back</span>
                    </Link>

                    <div className="flex items-center gap-3">
                        {isLive && (
                            <>
                                <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1.5 rounded-full">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                    <span className="text-red-400 text-sm font-semibold">LIVE</span>
                                </div>
                                <div className="text-sm text-gray-400">
                                    <span className="text-white font-semibold">{viewerCount.toLocaleString()}</span> watching
                                </div>
                                <div className="text-sm text-gray-400">{formatDuration(duration)}</div>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {isLive && (
                            <button
                                onClick={() => setShowInvite(true)}
                                className="flex items-center gap-2 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] hover:opacity-90 px-4 py-2 rounded-lg font-semibold text-sm transition-opacity"
                            >
                                <SendIcon size={16} />
                                Tape In Friends
                            </button>
                        )}
                        {isLive ? (
                            <button
                                onClick={endStream}
                                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                            >
                                End Stream
                            </button>
                        ) : (
                            <button
                                onClick={goLive}
                                disabled={!hasCamera || !title.trim()}
                                className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-semibold text-sm transition-all"
                            >
                                🔥 Go Live
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className="pt-16 flex h-screen">
                {/* Main Video */}
                <div className="flex-1 relative bg-black">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover"
                    />

                    {/* Pre-live overlay */}
                    {!isLive && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="text-center max-w-md px-6">
                                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-rose-500 to-orange-500 rounded-full flex items-center justify-center">
                                    <span className="text-4xl">🔥</span>
                                </div>
                                <h1 className="text-2xl font-bold mb-2">Start a Campfire</h1>
                                <p className="text-gray-400 mb-6">Add a title and go live to connect with your community</p>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="What's your stream about?"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-center focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                    maxLength={100}
                                />
                            </div>
                        </div>
                    )}

                    {/* Live reactions overlay */}
                    <AnimatePresence>
                        {reactions.map((reaction) => (
                            <motion.div
                                key={reaction.id}
                                initial={{ y: 0, opacity: 1, scale: 1 }}
                                animate={{ y: -300, opacity: 0, scale: 1.5 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 2, ease: 'easeOut' }}
                                className="absolute bottom-24 pointer-events-none"
                                style={{ left: `${reaction.x}%` }}
                            >
                                <span className="text-4xl">{reaction.emoji}</span>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Reaction buttons */}
                    {isLive && (
                        <div className="absolute bottom-4 left-4 flex gap-2">
                            {['❤️', '🔥', '👏', '😂', '😮', '💯'].map((emoji) => (
                                <button
                                    key={emoji}
                                    onClick={() => addReaction(emoji)}
                                    className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors text-xl"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Chat Sidebar */}
                <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col hidden md:flex">
                    <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                        <h2 className="font-semibold">Live Chat</h2>
                        <span className="text-xs text-green-500 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Online
                        </span>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                <span className="text-4xl mb-3">💬</span>
                                <p className="text-sm text-gray-400">
                                    {isLive ? 'No messages yet. Ping your friends to join!' : 'Go live to start chatting'}
                                </p>
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <button
                                    key={msg.id}
                                    onClick={() => setSelectedViewer(msg)}
                                    className="flex gap-2 text-left hover:bg-white/5 p-1 rounded-lg w-full transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-transparent group-hover:border-white/20">
                                        <Image
                                            src={msg.avatarUrl}
                                            alt={msg.username}
                                            width={32}
                                            height={32}
                                            className="object-cover"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-sm font-semibold text-rose-400">@{msg.username}</span>
                                        <p className="text-sm text-gray-200">{msg.content}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Input */}
                    <form onSubmit={sendMessage} className="p-4 border-t border-gray-800">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Say something..."
                                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                            />
                            <button
                                type="submit"
                                className="bg-rose-500 hover:bg-rose-600 px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                            >
                                Send
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Viewer Action Modal */}
            <AnimatePresence>
                {selectedViewer && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1A1A1F] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                        >
                            <div className="flex flex-col items-center mb-6">
                                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white/10 mb-4">
                                    <Image
                                        src={selectedViewer.avatarUrl}
                                        alt={selectedViewer.username}
                                        width={80}
                                        height={80}
                                        className="object-cover"
                                    />
                                </div>
                                <h3 className="text-xl font-bold text-white">@{selectedViewer.username}</h3>
                                <p className="text-white/50 text-sm">Viewer</p>
                            </div>

                            <div className="grid gap-3">
                                <button
                                    onClick={handleInviteToStage}
                                    className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-90 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                                >
                                    <span>🎤</span> Invite to Stage
                                </button>
                                <button
                                    onClick={() => setSelectedViewer(null)} // Placeholder profile view
                                    className="w-full bg-white/5 hover:bg-white/10 py-3 rounded-xl font-semibold text-white/70"
                                >
                                    View Profile
                                </button>
                                <button
                                    onClick={() => setSelectedViewer(null)}
                                    className="w-full py-3 text-white/40 hover:text-white"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <CampfireInvite
                isOpen={showInvite}
                onClose={() => setShowInvite(false)}
                streamTitle={title}
            />
        </div>
    );
}
