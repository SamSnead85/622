'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { SendIcon } from '@/components/icons';
import { CampfireInvite } from '@/components/CampfireInvite';
import { useToast } from '@/components/Toast';

interface ChatMessage {
    id: string;
    username: string;
    content: string;
    type: 'message' | 'gift' | 'join';
    giftEmoji?: string;
    userId: string;
    avatarUrl: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [];

export default function CampfireGoLive() {
    const { user } = useAuth();
    const router = useRouter();
    const { success, error, warning } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);

    const [isLive, setIsLive] = useState(false);
    const [title, setTitle] = useState('');
    const [viewerCount, setViewerCount] = useState(0);
    const [duration, setDuration] = useState(0);
    const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
    const [newMessage, setNewMessage] = useState('');
    const [hasCamera, setHasCamera] = useState(false);
    const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);
    const [showInvite, setShowInvite] = useState(false);
    const [selectedViewer, setSelectedViewer] = useState<ChatMessage | null>(null);

    const userAvatar = user?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face';

    // Camera Init
    useEffect(() => {
        const videoElement = videoRef.current;
        async function startCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: 1280, height: 720 },
                    audio: true,
                });
                if (videoElement) {
                    videoElement.srcObject = stream;
                    setHasCamera(true);
                }
            } catch (err) {
                console.error('Camera access denied:', err);
                error('Camera access denied');
            }
        }
        startCamera();

        return () => {
            if (videoElement?.srcObject) {
                const tracks = (videoElement.srcObject as MediaStream).getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, [error]);

    // Timer
    useEffect(() => {
        if (!isLive) return;
        const interval = setInterval(() => {
            setDuration(d => d + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [isLive]);

    const goLive = () => {
        if (!title.trim()) return warning('Please add a title for your stream');
        setIsLive(true);
        setViewerCount(0);
        success('You are now LIVE!');
    };

    const endStream = () => {
        setIsLive(false);
        setDuration(0);
        setViewerCount(0);
        router.push('/dashboard');
    };

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
        try {
            const res = await apiFetch(`/campfire/invite`, {
                method: 'POST',
                body: JSON.stringify({ username: selectedViewer.username })
            });

            if (res.ok) {
                success(`Invited @${selectedViewer.username} to stage!`);
            } else {
                error('Failed to send invite');
            }
        } catch (e) {
            error('Invitation Failed');
        }
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

    return (
        <div className="min-h-screen bg-[#050508] text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-20 bg-[#050508]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Back</span>
                    </Link>

                    <div className="flex items-center gap-3">
                        {isLive && (
                            <>
                                <div className="flex items-center gap-2 bg-rose-500/20 px-3 py-1.5 rounded-full border border-rose-500/20">
                                    <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_10px_#f43f5e]" />
                                    <span className="text-rose-400 text-sm font-bold tracking-wide">LIVE</span>
                                </div>
                                <div className="text-sm text-white/50 font-medium">
                                    <span className="text-white font-bold">{viewerCount.toLocaleString()}</span> watching
                                </div>
                                <div className="text-sm text-white/50 font-mono">{formatDuration(duration)}</div>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {isLive && (
                            <button
                                onClick={() => setShowInvite(true)}
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl font-bold text-sm transition-all border border-white/5 backdrop-blur-lg"
                            >
                                <SendIcon size={16} />
                                Tape In Friends
                            </button>
                        )}
                        {isLive ? (
                            <button
                                onClick={endStream}
                                className="bg-rose-500 hover:bg-rose-600 px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-rose-900/20"
                            >
                                End Stream
                            </button>
                        ) : (
                            <button
                                onClick={goLive}
                                disabled={!hasCamera || !title.trim()}
                                className="bg-gradient-to-r from-rose-500 to-orange-500 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 rounded-xl font-bold text-sm transition-all shadow-lg shadow-rose-500/20"
                            >
                                🔥 Go Live
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className="pt-16 flex h-screen">
                {/* Main Video */}
                <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover"
                    />

                    {/* Pre-live overlay */}
                    {!isLive && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
                            <div className="text-center max-w-md px-6 w-full">
                                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-rose-500/30">
                                    <span className="text-5xl">🔥</span>
                                </div>
                                <h1 className="text-3xl font-bold mb-3 text-white">Start a Campfire</h1>
                                <p className="text-white/50 mb-8">Add a title and go live to connect with your community</p>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="What's your stream about?"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-center text-lg text-white placeholder-white/20 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all"
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
                                <span className="text-4xl filter drop-shadow-lg">{reaction.emoji}</span>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Reaction buttons */}
                    {isLive && (
                        <div className="absolute bottom-6 left-6 flex gap-3 z-10">
                            {['❤️', '🔥', '👏', '😂', '😮', '💯'].map((emoji) => (
                                <button
                                    key={emoji}
                                    onClick={() => addReaction(emoji)}
                                    className="w-12 h-12 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 text-2xl"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Chat Sidebar */}
                <div className="w-80 bg-[#050508] border-l border-white/5 flex flex-col hidden md:flex relative z-20">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#050508]/50 backdrop-blur-md">
                        <h2 className="font-bold text-white">Live Chat</h2>
                        <span className="text-xs text-emerald-500 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Synced
                        </span>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                <span className="text-4xl mb-4 opacity-20 grayscale">💬</span>
                                <p className="text-sm text-white/30 font-medium">
                                    {isLive ? 'No messages yet. Signal the void!' : 'Go live to activate connection'}
                                </p>
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <button
                                    key={msg.id}
                                    onClick={() => setSelectedViewer(msg)}
                                    className="flex gap-3 text-left hover:bg-white/5 p-2 rounded-xl w-full transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white/10 group-hover:border-white/30 transition-colors">
                                        <Image
                                            src={msg.avatarUrl}
                                            alt={msg.username}
                                            width={32}
                                            height={32}
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-xs font-bold text-rose-400 block mb-0.5">@{msg.username}</span>
                                        <p className="text-sm text-white/80 break-words leading-snug">{msg.content}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Input */}
                    <form onSubmit={sendMessage} className="p-4 border-t border-white/5 bg-[#050508]">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Transmit..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="bg-white/10 hover:bg-rose-500 text-white p-2.5 rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-white/10"
                            >
                                <SendIcon size={18} />
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Viewer Action Modal */}
            <AnimatePresence>
                {selectedViewer && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#0A0A0F] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl shadow-rose-900/10"
                        >
                            <div className="flex flex-col items-center mb-8">
                                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/5 mb-4 shadow-inner bg-black">
                                    <Image
                                        src={selectedViewer.avatarUrl}
                                        alt={selectedViewer.username}
                                        width={96}
                                        height={96}
                                        className="object-cover"
                                    />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-1">@{selectedViewer.username}</h3>
                                <p className="text-rose-500/80 text-xs font-bold uppercase tracking-widest border border-rose-500/20 px-2 py-0.5 rounded-full">Viewer</p>
                            </div>

                            <div className="grid gap-3">
                                <button
                                    onClick={handleInviteToStage}
                                    className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-violet-900/20 transition-all"
                                >
                                    <span>🎤</span> Invite to Stage
                                </button>
                                <button
                                    onClick={() => setSelectedViewer(null)}
                                    className="w-full bg-white/5 hover:bg-white/10 py-3.5 rounded-xl font-semibold text-white/70 transition-colors border border-white/5"
                                >
                                    View Profile
                                </button>
                                <button
                                    onClick={() => setSelectedViewer(null)}
                                    className="w-full py-3 text-white/30 hover:text-white transition-colors text-sm font-medium"
                                >
                                    Dismiss
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
