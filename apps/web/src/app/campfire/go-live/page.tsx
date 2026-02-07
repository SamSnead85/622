'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/lib/api';
import { useStreamChat, type StreamChatMessage } from '@/hooks/useStreamChat';
import { SendIcon } from '@/components/icons';
import { CampfireInvite } from '@/components/CampfireInvite';
import { useToast } from '@/components/Toast';
import { ProtectedRoute } from '@/contexts/AuthContext';

// ============================================
// TYPES & CONSTANTS
// ============================================

type StreamMode = 'browser' | 'obs';
type StreamPhase = 'setup' | 'waiting' | 'live' | 'ended';

const CATEGORIES = [
    { id: 'gaming', label: 'Gaming', icon: '🎮' },
    { id: 'music', label: 'Music', icon: '🎵' },
    { id: 'creative', label: 'Creative', icon: '🎨' },
    { id: 'irl', label: 'IRL', icon: '📹' },
    { id: 'sports', label: 'Sports', icon: '⚽' },
    { id: 'tech', label: 'Tech', icon: '💻' },
    { id: 'education', label: 'Education', icon: '📚' },
    { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
    { id: 'other', label: 'Other', icon: '✨' },
] as const;

// ============================================
// CHAT MESSAGE (INLINE)
// ============================================

function ChatMsg({ msg }: { msg: StreamChatMessage }) {
    if (msg.type === 'JOIN') {
        return <div className="px-3 py-0.5"><span className="text-white/25 text-[11px]">{msg.user.displayName} joined</span></div>;
    }
    if (msg.type === 'GIFT') {
        return (
            <div className="px-3 py-1 mx-1 mb-0.5 rounded-lg bg-purple-500/10 border border-purple-500/15">
                <span className="text-[11px] text-purple-300 font-semibold">{msg.user.displayName}</span>
                <span className="text-[11px] text-white/50 ml-1">{msg.content}</span>
            </div>
        );
    }
    return (
        <div className="px-3 py-0.5 flex gap-1.5">
            <span className="text-[11px] font-semibold text-[#00D4FF] flex-shrink-0">{msg.user.displayName}</span>
            <span className="text-[11px] text-white/70 break-words">{msg.content}</span>
        </div>
    );
}

// ============================================
// MAIN GO LIVE PAGE
// ============================================

function GoLiveContent() {
    const { user } = useAuth();
    const router = useRouter();
    const { success, error: showError, warning } = useToast();

    // Stream setup state
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [tags, setTags] = useState('');
    const [isRecorded, setIsRecorded] = useState(true);
    const [mode, setMode] = useState<StreamMode>('obs');

    // Stream state
    const [phase, setPhase] = useState<StreamPhase>('setup');
    const [streamId, setStreamId] = useState<string | null>(null);
    const [streamKey, setStreamKey] = useState('');
    const [rtmpUrl, setRtmpUrl] = useState('');
    const [muxPlaybackId, setMuxPlaybackId] = useState<string | null>(null);
    const [showStreamKey, setShowStreamKey] = useState(false);
    const [duration, setDuration] = useState(0);
    const [showInvite, setShowInvite] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [endSummary, setEndSummary] = useState<{ duration: number; peakViewers: number; totalViews: number } | null>(null);

    // Camera refs (browser mode)
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasCamera, setHasCamera] = useState(false);

    // Stream chat
    const {
        messages,
        viewerCount,
        isConnected,
        sendMessage,
    } = useStreamChat(phase === 'live' || phase === 'waiting' ? streamId : null);

    const chatRef = useRef<HTMLDivElement>(null);

    // Camera init (browser mode)
    useEffect(() => {
        if (mode !== 'browser' || phase !== 'setup') return;

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
            } catch {
                showError('Camera access denied');
            }
        }
        startCamera();

        return () => {
            if (videoElement?.srcObject) {
                (videoElement.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            }
        };
    }, [mode, phase, showError]);

    // Duration timer
    useEffect(() => {
        if (phase !== 'live') return;
        const interval = setInterval(() => setDuration(d => d + 1), 1000);
        return () => clearInterval(interval);
    }, [phase]);

    // Auto-scroll chat
    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [messages]);

    // Poll for stream to become active (OBS mode waiting phase)
    useEffect(() => {
        if (phase !== 'waiting' || !streamId) return;

        const poll = setInterval(async () => {
            try {
                const token = localStorage.getItem('0g_token');
                const res = await fetch(`${API_URL}/api/v1/livestream/${streamId}`, {
                    headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
                    credentials: 'include',
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.stream?.status === 'LIVE') {
                        setPhase('live');
                        success('You are now LIVE!');
                        clearInterval(poll);
                    }
                }
            } catch { /* ignore */ }
        }, 3000);

        return () => clearInterval(poll);
    }, [phase, streamId, success]);

    // Create stream
    const handleGoLive = async () => {
        if (!title.trim()) { warning('Please add a stream title'); return; }

        try {
            const token = localStorage.getItem('0g_token');
            const res = await fetch(`${API_URL}/api/v1/livestream/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({
                    title: title.trim(),
                    category: category || undefined,
                    tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                    isRecorded,
                }),
            });

            if (!res.ok) { showError('Failed to create stream'); return; }

            const data = await res.json();
            setStreamId(data.stream.id);
            setStreamKey(data.streamKey || '');
            setRtmpUrl(data.rtmpsUrl || data.rtmpUrl || '');
            setMuxPlaybackId(data.stream.muxPlaybackId || null);

            if (mode === 'obs') {
                setPhase('waiting');
                success('Stream created! Connect OBS to go live.');
            } else {
                // Browser mode -- mark as live immediately (no actual RTMP)
                setPhase('live');
                success('You are now LIVE!');
            }
        } catch {
            showError('Failed to start stream');
        }
    };

    // End stream
    const handleEndStream = async () => {
        if (!streamId) return;

        try {
            const token = localStorage.getItem('0g_token');
            const res = await fetch(`${API_URL}/api/v1/livestream/${streamId}/end`, {
                method: 'POST',
                headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
                credentials: 'include',
            });
            if (res.ok) {
                const data = await res.json();
                setEndSummary(data.summary);
            }
        } catch { /* ignore */ }

        setPhase('ended');
        // Stop camera
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        sendMessage(newMessage);
        setNewMessage('');
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        success(`${label} copied to clipboard`);
    };

    const formatDuration = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return h > 0
            ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
            : `${m}:${sec.toString().padStart(2, '0')}`;
    };

    // ========================================
    // SETUP PHASE
    // ========================================
    if (phase === 'setup') {
        return (
            <div className="min-h-screen bg-[#050508] text-white">
                {/* Header */}
                <header className="sticky top-0 z-20 bg-[#050508]/90 backdrop-blur-xl border-b border-white/[0.06]">
                    <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                        <Link href="/campfire" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            <span className="text-sm">Back</span>
                        </Link>
                        <h1 className="font-bold text-sm">Go Live</h1>
                        <div className="w-16" />
                    </div>
                </header>

                <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                    {/* Mode selector */}
                    <div>
                        <label className="block text-white/50 text-xs uppercase tracking-wider mb-2 font-semibold">Stream Mode</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setMode('obs')}
                                className={`p-4 rounded-xl border text-left transition-all ${mode === 'obs' ? 'bg-[#00D4FF]/10 border-[#00D4FF]/30' : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]'}`}
                            >
                                <div className="text-2xl mb-2">🖥️</div>
                                <div className="font-semibold text-sm">OBS / External</div>
                                <div className="text-[11px] text-white/40 mt-1">Use OBS, Streamlabs, or any RTMP software. Best quality.</div>
                            </button>
                            <button
                                onClick={() => setMode('browser')}
                                className={`p-4 rounded-xl border text-left transition-all ${mode === 'browser' ? 'bg-[#00D4FF]/10 border-[#00D4FF]/30' : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]'}`}
                            >
                                <div className="text-2xl mb-2">📱</div>
                                <div className="font-semibold text-sm">Browser Camera</div>
                                <div className="text-[11px] text-white/40 mt-1">Quick start using your webcam. Good for casual streams.</div>
                            </button>
                        </div>
                    </div>

                    {/* Camera preview (browser mode) */}
                    {mode === 'browser' && (
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/[0.06]">
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                            {!hasCamera && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                                    <p className="text-white/40 text-sm">Requesting camera access...</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="block text-white/50 text-xs uppercase tracking-wider mb-2 font-semibold">Stream Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What are you streaming?"
                            maxLength={200}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#00D4FF]/40 focus:ring-1 focus:ring-[#00D4FF]/20 transition-all"
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-white/50 text-xs uppercase tracking-wider mb-2 font-semibold">Category</label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategory(category === cat.id ? '' : cat.id)}
                                    className={`px-3 py-2 rounded-xl text-sm transition-all active:scale-95 ${
                                        category === cat.id
                                            ? 'bg-[#00D4FF]/20 border border-[#00D4FF]/30 text-[#00D4FF]'
                                            : 'bg-white/[0.04] border border-white/[0.06] text-white/60 hover:text-white/80 hover:border-white/[0.12]'
                                    }`}
                                >
                                    <span className="mr-1">{cat.icon}</span> {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-white/50 text-xs uppercase tracking-wider mb-2 font-semibold">Tags (comma separated)</label>
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="e.g. competitive, tutorial, chill"
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#00D4FF]/40 focus:ring-1 focus:ring-[#00D4FF]/20 transition-all"
                        />
                    </div>

                    {/* Record toggle */}
                    <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
                        <div>
                            <div className="text-sm font-semibold text-white">Save as VOD</div>
                            <div className="text-[11px] text-white/40 mt-0.5">Automatically record and save for replay</div>
                        </div>
                        <button
                            onClick={() => setIsRecorded(!isRecorded)}
                            className={`w-12 h-7 rounded-full transition-all relative ${isRecorded ? 'bg-[#00D4FF]' : 'bg-white/20'}`}
                        >
                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow ${isRecorded ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>

                    {/* Go Live button */}
                    <button
                        onClick={handleGoLive}
                        disabled={!title.trim() || (mode === 'browser' && !hasCamera)}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-white text-lg transition-all active:scale-[0.98] shadow-lg shadow-rose-500/20"
                    >
                        🔥 Go Live
                    </button>
                </div>
            </div>
        );
    }

    // ========================================
    // WAITING PHASE (OBS connecting)
    // ========================================
    if (phase === 'waiting') {
        return (
            <div className="min-h-screen bg-[#050508] text-white">
                <header className="sticky top-0 z-20 bg-[#050508]/90 backdrop-blur-xl border-b border-white/[0.06]">
                    <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                        <button onClick={() => { setPhase('setup'); }} className="text-white/50 hover:text-white text-sm">Cancel</button>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                            <span className="text-sm font-semibold text-amber-400">Waiting for connection</span>
                        </div>
                        <div className="w-12" />
                    </div>
                </header>

                <div className="max-w-xl mx-auto px-4 py-10 space-y-8">
                    <div className="text-center">
                        <div className="w-20 h-20 mx-auto mb-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center">
                            <span className="text-4xl">📡</span>
                        </div>
                        <h2 className="text-xl font-bold mb-2">Connect Your Streaming Software</h2>
                        <p className="text-white/40 text-sm">Open OBS, Streamlabs, or any RTMP broadcaster and enter these settings.</p>
                    </div>

                    {/* RTMP URL */}
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
                        <div>
                            <label className="block text-white/50 text-[10px] uppercase tracking-wider mb-1.5 font-semibold">Server URL</label>
                            <div className="flex gap-2">
                                <input
                                    readOnly
                                    value={rtmpUrl}
                                    className="flex-1 bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white font-mono select-all"
                                />
                                <button
                                    onClick={() => copyToClipboard(rtmpUrl, 'Server URL')}
                                    className="px-3 py-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg text-xs font-semibold transition-all active:scale-95"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-white/50 text-[10px] uppercase tracking-wider mb-1.5 font-semibold">Stream Key</label>
                            <div className="flex gap-2">
                                <input
                                    readOnly
                                    value={showStreamKey ? streamKey : '••••••••••••••••••••••'}
                                    className="flex-1 bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white font-mono select-all"
                                />
                                <button
                                    onClick={() => setShowStreamKey(!showStreamKey)}
                                    className="px-3 py-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg text-xs font-semibold transition-all active:scale-95"
                                >
                                    {showStreamKey ? 'Hide' : 'Show'}
                                </button>
                                <button
                                    onClick={() => copyToClipboard(streamKey, 'Stream Key')}
                                    className="px-3 py-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg text-xs font-semibold transition-all active:scale-95"
                                >
                                    Copy
                                </button>
                            </div>
                            <p className="text-[10px] text-rose-400/60 mt-1.5">Never share your stream key with anyone.</p>
                        </div>
                    </div>

                    {/* Connection status */}
                    <div className="flex items-center justify-center gap-3 py-6">
                        <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                        <span className="text-sm text-white/50">Waiting for your broadcast software to connect...</span>
                    </div>

                    <p className="text-center text-[11px] text-white/30">
                        Once OBS starts streaming, this page will automatically transition to your live dashboard.
                    </p>
                </div>
            </div>
        );
    }

    // ========================================
    // ENDED PHASE
    // ========================================
    if (phase === 'ended') {
        return (
            <div className="min-h-screen bg-[#050508] text-white flex items-center justify-center p-4">
                <div className="max-w-sm w-full text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
                        <span className="text-4xl">🎬</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Stream Ended</h2>
                    <p className="text-white/40 text-sm mb-8">Great stream! Here&apos;s your summary.</p>

                    {endSummary && (
                        <div className="grid grid-cols-3 gap-3 mb-8">
                            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                                <div className="text-lg font-bold text-white">{formatDuration(endSummary.duration)}</div>
                                <div className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Duration</div>
                            </div>
                            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                                <div className="text-lg font-bold text-white">{endSummary.peakViewers.toLocaleString()}</div>
                                <div className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Peak Viewers</div>
                            </div>
                            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                                <div className="text-lg font-bold text-white">{endSummary.totalViews.toLocaleString()}</div>
                                <div className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Total Views</div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        {streamId && isRecorded && (
                            <Link
                                href={`/campfire/watch/${streamId}`}
                                className="block w-full py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white font-semibold text-sm hover:bg-white/[0.1] transition-all"
                            >
                                Watch VOD
                            </Link>
                        )}
                        <Link
                            href="/dashboard"
                            className="block w-full py-3 rounded-xl bg-[#00D4FF] text-black font-semibold text-sm hover:bg-[#00D4FF]/90 transition-all"
                        >
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ========================================
    // LIVE PHASE -- Stream Dashboard
    // ========================================
    return (
        <div className="min-h-screen bg-[#050508] text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-20 bg-[#050508]/90 backdrop-blur-xl border-b border-white/[0.06]">
                <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-rose-500/20 px-2.5 py-1 rounded-lg border border-rose-500/20">
                            <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_#f43f5e]" />
                            <span className="text-rose-400 text-xs font-bold tracking-wide">LIVE</span>
                        </div>
                        <div className="hidden sm:flex items-center gap-3 text-xs text-white/50">
                            <span><span className="text-white font-bold">{viewerCount.toLocaleString()}</span> watching</span>
                            <span className="font-mono">{formatDuration(duration)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isConnected && (
                            <span className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                Connected
                            </span>
                        )}
                        <button
                            onClick={() => setShowInvite(true)}
                            className="flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.1] px-3 py-2 rounded-xl text-xs font-semibold transition-all border border-white/[0.06]"
                        >
                            <SendIcon size={14} />
                            <span className="hidden sm:inline">Invite</span>
                        </button>
                        <button
                            onClick={handleEndStream}
                            className="bg-rose-500 hover:bg-rose-600 px-4 py-2 rounded-xl font-bold text-xs transition-colors shadow-lg shadow-rose-900/20 active:scale-95"
                        >
                            End Stream
                        </button>
                    </div>
                </div>
            </header>

            <div className="pt-14 flex flex-col lg:flex-row h-screen">
                {/* Main area */}
                <div className="flex-1 flex items-center justify-center bg-black relative overflow-hidden">
                    {mode === 'browser' ? (
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    ) : muxPlaybackId ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0A0A0F] to-[#050508]">
                            <div className="text-center">
                                <div className="text-5xl mb-4">📡</div>
                                <p className="text-white/50 text-sm font-semibold">Broadcasting via OBS</p>
                                <p className="text-white/30 text-xs mt-1">Your viewers see the full quality stream</p>
                                <div className="mt-4 flex items-center justify-center gap-3">
                                    <div className="flex items-center gap-1.5 bg-rose-500/20 px-3 py-1.5 rounded-lg">
                                        <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                                        <span className="text-rose-400 text-sm font-bold">LIVE</span>
                                    </div>
                                    <span className="text-white/40 text-sm">{viewerCount} viewers</span>
                                    <span className="text-white/40 text-sm font-mono">{formatDuration(duration)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-white/30">
                            <p>Stream preview unavailable</p>
                        </div>
                    )}
                </div>

                {/* Chat sidebar */}
                <div className="w-full lg:w-80 xl:w-96 bg-[#0A0A0F] border-t lg:border-t-0 lg:border-l border-white/[0.06] flex flex-col max-h-[40vh] lg:max-h-none">
                    <div className="p-3 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
                        <h2 className="font-semibold text-sm text-white">Stream Chat</h2>
                        <span className="text-[10px] text-white/30">{messages.filter(m => m.type === 'MESSAGE').length}</span>
                    </div>

                    <div ref={chatRef} className="flex-1 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {messages.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-xs text-white/20">Waiting for messages...</p>
                            </div>
                        ) : (
                            messages.map((msg) => <ChatMsg key={msg.id} msg={msg} />)
                        )}
                    </div>

                    <form onSubmit={handleSendMessage} className="p-3 border-t border-white/[0.06] flex-shrink-0 safe-area-pb">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Chat with your viewers..."
                                maxLength={500}
                                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00D4FF]/40 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="bg-[#00D4FF]/20 hover:bg-[#00D4FF]/30 text-[#00D4FF] p-2.5 rounded-xl transition-all disabled:opacity-30 active:scale-95"
                            >
                                <SendIcon size={18} />
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <CampfireInvite isOpen={showInvite} onClose={() => setShowInvite(false)} streamTitle={title} />
        </div>
    );
}

export default function CampfireGoLive() {
    return (
        <ProtectedRoute>
            <GoLiveContent />
        </ProtectedRoute>
    );
}
