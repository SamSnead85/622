'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useMessages, type Message as ApiMessage, type Conversation } from '@/hooks';
import { ProtectedRoute, useAuth } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';
import { API_URL } from '@/lib/api';
import {
    HomeIcon,
    SearchIcon,
    UsersIcon,
    SendIcon,
    MessageIcon,
    WaveIcon,
    EditIcon,
    PhoneIcon,
    VideoIcon,
    InfoIcon,
    MicIcon,
    AttachIcon,
    SmileIcon,
    TrashIcon
} from '@/components/icons';

// ============================================
// TYPING INDICATOR
// ============================================
function TypingIndicator() {
    return (
        <div className="flex items-center gap-1 px-4 py-2 bg-white/10 rounded-2xl rounded-bl-md w-fit">
            <motion.span
                className="w-2 h-2 bg-white/60 rounded-full"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            />
            <motion.span
                className="w-2 h-2 bg-white/60 rounded-full"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
            />
            <motion.span
                className="w-2 h-2 bg-white/60 rounded-full"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
            />
        </div>
    );
}

// ============================================
// VOICE MESSAGE PLAYER
// ============================================
function VoiceMessage({ duration, sender }: { duration: number; sender: 'me' | 'them' }) {
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (playing) {
            const interval = setInterval(() => {
                setProgress(p => {
                    if (p >= 100) {
                        setPlaying(false);
                        return 0;
                    }
                    return p + (100 / (duration * 10));
                });
            }, 100);
            return () => clearInterval(interval);
        }
    }, [playing, duration]);

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={() => setPlaying(!playing)}
                className={`w-8 h-8 rounded-full flex items-center justify-center ${sender === 'me' ? 'bg-white/20' : 'bg-white/10'}`}
            >
                {playing ? '⏸' : '▶️'}
            </button>
            <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                    className={`h-full ${sender === 'me' ? 'bg-white' : 'bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6]'}`}
                    style={{ width: `${progress}%` }}
                />
            </div>
            <span className="text-xs text-white/60">{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}</span>
        </div>
    );
}

// ============================================
// REACTION PICKER
// ============================================
const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

function ReactionPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-full mb-2 left-0 flex gap-1 p-2 bg-[#1a1a1f] rounded-full border border-white/10 shadow-xl"
        >
            {REACTIONS.map(emoji => (
                <button
                    key={emoji}
                    onClick={() => { onSelect(emoji); onClose(); }}
                    className="w-10 h-10 flex items-center justify-center hover:scale-125 transition-transform active:scale-90 rounded-lg"
                >
                    {emoji}
                </button>
            ))}
        </motion.div>
    );
}

// ============================================
// FULL EMOJI PICKER (PREMIUM GRID)
// ============================================
const COMMON_EMOJIS = [
    "😂", "❤️", "🔥", "👍", "🙌", "🎉", "✨", "💀", "😊", "🤣",
    "😍", "🤔", "👀", "💯", "👋", "😭", "😤", "😡", "💩", "🤡",
    "👻", "👽", "🤖", "👾", "🎃", "💪", "🤙", "🤝", "🙏", "🧠",
    "💎", "🚀", "🪐", "🌍", "🌈", "☀️", "🌙", "⭐", "⚡", "❄️"
];

function EmojiGridPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-full mb-4 left-0 w-64 bg-[#1a1a1f]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden p-3"
        >
            <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Most Used</span>
                <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">✕</button>
            </div>
            <div className="grid grid-cols-5 gap-1">
                {COMMON_EMOJIS.map(emoji => (
                    <button
                        key={emoji}
                        onClick={() => { onSelect(emoji); }}
                        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-xl"
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </motion.div>
    );
}

// ============================================
// NEW CHAT MODAL - With Real User Search
// ============================================
function NewChatModal({
    isOpen,
    onClose,
    onConversationStarted,
}: {
    isOpen: boolean;
    onClose: () => void;
    onConversationStarted?: (convo: Conversation) => void;
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Array<{
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
    }>>([]);
    const [isSearching, setIsSearching] = useState(false);
    const { startConversation } = useMessages();

    // Search users from API
    useEffect(() => {
        const searchUsers = async () => {
            if (searchQuery.trim().length < 2) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
                const response = await fetch(
                    `${API_URL}/api/v1/users/search?q=${encodeURIComponent(searchQuery)}&limit=10`,
                    {
                        headers: {
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                        },
                        credentials: 'include',
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    setSearchResults(data.users || []);
                }
            } catch (err) {
                console.error('Error searching users:', err);
            } finally {
                setIsSearching(false);
            }
        };

        const debounce = setTimeout(searchUsers, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

    const handleStartConversation = async (user: { id: string; username: string; displayName: string; avatarUrl?: string }) => {
        try {
            const result = await startConversation(user.id);
            if (result.success && result.conversationId) {
                // Create a minimal conversation object to pass back
                const newConvo: Conversation = {
                    id: result.conversationId,
                    isGroup: false,
                    participants: [{
                        id: user.id,
                        username: user.username,
                        displayName: user.displayName,
                        avatarUrl: user.avatarUrl,
                    }],
                    unreadCount: 0,
                    isMuted: false,
                    updatedAt: new Date().toISOString(),
                };
                onConversationStarted?.(newConvo);
            }
            onClose();
        } catch (err) {
            console.error('Error starting conversation:', err);
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25 }}
                className="bg-[#0A0A0F] w-full max-w-lg rounded-t-3xl md:rounded-3xl max-h-[80vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-lg font-bold text-white">New Message</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Search */}
                <div className="p-4">
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                        <SearchIcon size={18} className="text-white/40" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name or username..."
                            className="flex-1 bg-transparent text-white placeholder:text-white/40 focus:outline-none"
                            autoFocus
                        />
                        {isSearching && (
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        )}
                    </div>
                </div>

                {/* Search Results */}
                <div className="px-4 max-h-[300px] overflow-y-auto space-y-2">
                    {searchQuery.trim().length < 2 ? (
                        <p className="text-center text-white/40 text-sm py-4">
                            Type at least 2 characters to search for users
                        </p>
                    ) : searchResults.length === 0 && !isSearching ? (
                        <p className="text-center text-white/40 text-sm py-4">
                            No users found for &quot;{searchQuery}&quot;
                        </p>
                    ) : (
                        searchResults.map((user) => (
                            <button
                                key={user.id}
                                onClick={() => handleStartConversation(user)}
                                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors"
                            >
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center">
                                    {user.avatarUrl ? (
                                        <Image src={user.avatarUrl} alt={user.displayName} fill className="object-cover" />
                                    ) : (
                                        <span className="text-white font-bold text-lg">{user.displayName?.[0] || 'U'}</span>
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-semibold text-white">{user.displayName}</p>
                                    <p className="text-sm text-white/50">@{user.username}</p>
                                </div>
                                <span className="text-[#00D4FF]">Message →</span>
                            </button>
                        ))
                    )}
                </div>

                {/* Invite CTA */}
                <div className="p-4 mt-4 border-t border-white/10">
                    <Link
                        href="/invite"
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white font-semibold hover:opacity-90 transition-opacity"
                        onClick={onClose}
                    >
                        <SendIcon size={18} />
                        Invite Friends to 0G
                    </Link>
                    <p className="text-center text-xs text-white/40 mt-2">
                        Your friends aren&apos;t here yet? Invite them!
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
}

// Local Navigation removed in favor of shared component

// ============================================
// MESSAGES PAGE - Connected to Real API
// ============================================
function MessagesPageContent() {
    const {
        conversations,
        messages,
        activeConversation,
        typingUsers,
        isLoading,
        selectConversation,
        sendMessage,
        startTyping,
        stopTyping,
    } = useMessages();
    const { user } = useAuth();

    const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [mounted, setMounted] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
    const [localReactions, setLocalReactions] = useState<Map<string, string[]>>(new Map());
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [showInputEmojiPicker, setShowInputEmojiPicker] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Voice recording timer
    useEffect(() => {
        if (isRecording) {
            const interval = setInterval(() => setRecordingTime(t => t + 1), 1000);
            return () => clearInterval(interval);
        } else {
            setRecordingTime(0);
        }
    }, [isRecording]);

    // Handle conversation selection
    const handleSelectConversation = useCallback((convo: Conversation) => {
        setSelectedConvo(convo);
        selectConversation(convo.id);
    }, [selectConversation]);

    // Handle message send
    const handleSendMessage = useCallback(() => {
        if (!messageInput.trim()) return;
        sendMessage(messageInput.trim());
        setMessageInput('');
        stopTyping();
    }, [messageInput, sendMessage, stopTyping]);

    // Handle typing
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setMessageInput(e.target.value);
        startTyping();
    }, [startTyping]);

    // Handle voice message
    const handleSendVoiceMessage = useCallback(() => {
        if (recordingTime < 1) return;
        sendMessage('[Voice Message]', undefined, 'AUDIO');
        setIsRecording(false);
    }, [recordingTime, sendMessage]);

    // Handle reactions (local only for now)
    const addReaction = useCallback((msgId: string, emoji: string) => {
        setLocalReactions(prev => {
            const next = new Map(prev);
            const existing = next.get(msgId) || [];
            next.set(msgId, [...existing, emoji]);
            return next;
        });
    }, []);

    // Get current user ID from localStorage
    const getCurrentUserId = () => {
        if (typeof window === 'undefined') return null;
        try {
            const token = localStorage.getItem('0g_token');
            if (!token) return null;
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.userId;
        } catch {
            return null;
        }
    };

    const currentUserId = getCurrentUserId();

    if (!mounted) return <div className="min-h-screen bg-[#050508]" />;

    return (
        <div className="min-h-screen bg-[#050508] relative">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 right-1/3 w-80 h-80 rounded-full bg-violet-500/5 blur-[100px]" />
            </div>

            <Navigation
                activeTab="messages"
                variant="messages"
                userAvatarUrl={user?.avatarUrl}
                displayName={user?.displayName}
                username={user?.username}
            />

            {/* New Chat Modal */}
            <AnimatePresence>
                {showNewChatModal && (
                    <NewChatModal
                        isOpen={showNewChatModal}
                        onClose={() => setShowNewChatModal(false)}
                        onConversationStarted={(convo) => {
                            setSelectedConvo(convo);
                            selectConversation(convo.id);
                        }}
                    />
                )}
            </AnimatePresence>

            <main className="relative z-10 lg:ml-20 xl:ml-64 h-screen flex">
                {/* Conversations List */}
                <div className={`w-full md:w-80 lg:w-96 border-r border-white/5 flex flex-col bg-black/20 ${selectedConvo ? 'hidden md:flex' : 'flex'}`}>
                    {/* Header */}
                    <div className="p-4 border-b border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-xl font-bold text-white">Messages</h1>
                            <button
                                onClick={() => setShowNewChatModal(true)}
                                className="w-10 h-10 rounded-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center hover:opacity-90 transition-opacity"
                            >
                                <EditIcon size={20} className="text-white" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3 focus-within:border-[#00D4FF]/30 focus-within:shadow-[0_0_20px_rgba(0,212,255,0.08)] transition-all duration-300">
                            <SearchIcon size={16} className="text-white/40" />
                            <input type="text" placeholder="Search messages..." className="flex-1 bg-transparent text-white placeholder:text-white/30 focus:outline-none text-sm" />
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-3 space-y-1">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                                        <div className="skeleton w-12 h-12 rounded-full flex-shrink-0" />
                                        <div className="flex-1 space-y-1.5">
                                            <div className="skeleton skeleton-text w-28" />
                                            <div className="skeleton skeleton-text-sm w-44" />
                                        </div>
                                        <div className="skeleton skeleton-text-sm w-8" />
                                    </div>
                                ))}
                            </div>
                        ) : conversations.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5}>
                                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <h3 className="text-white/60 font-medium mb-1">No messages yet</h3>
                                <p className="text-white/30 text-sm max-w-[200px]">Start a conversation with someone you follow</p>
                            </div>
                        ) : (
                            conversations.map((convo) => (
                                <motion.button
                                    key={convo.id}
                                    onClick={() => handleSelectConversation(convo)}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-all duration-200 cursor-pointer ${activeConversation === convo.id ? 'bg-[#00D4FF]/[0.06] border-l-2 border-[#00D4FF]' : ''}`}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full overflow-hidden relative bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center">
                                            {convo.participants[0]?.avatarUrl ? (
                                                <Image src={convo.participants[0].avatarUrl} alt={convo.participants[0].displayName} fill className="object-cover" />
                                            ) : (
                                                <span className="text-white font-semibold text-lg">
                                                    {(convo.groupName || convo.participants[0]?.displayName || '?').charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-white truncate">
                                                {convo.isGroup ? convo.groupName : convo.participants[0]?.displayName || 'Unknown'}
                                            </p>
                                            <span className="text-xs text-white/40">
                                                {convo.lastMessage ? new Date(convo.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                        </div>
                                        <p className={`text-sm truncate ${convo.unreadCount > 0 ? 'text-white font-medium' : 'text-white/50'}`}>
                                            {convo.lastMessage?.content || 'No messages yet'}
                                        </p>
                                    </div>
                                    {convo.unreadCount > 0 && (
                                        <span className="w-2 h-2 rounded-full bg-[#00D4FF]" />
                                    )}
                                </motion.button>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className={`flex-1 flex flex-col ${selectedConvo ? 'flex' : 'hidden md:flex'}`}>
                    {selectedConvo ? (
                        <>
                            {/* Chat Header */}
                            <div className="flex items-center gap-3 p-4 border-b border-white/5 bg-black/20">
                                <button onClick={() => setSelectedConvo(null)} className="md:hidden text-white/60 hover:text-white">
                                    ←
                                </button>
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full overflow-hidden relative bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center">
                                        {selectedConvo.participants[0]?.avatarUrl ? (
                                            <Image src={selectedConvo.participants[0].avatarUrl} alt="" fill className="object-cover" />
                                        ) : (
                                            <span className="text-white font-semibold">
                                                {(selectedConvo.groupName || selectedConvo.participants[0]?.displayName || '?').charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-white">
                                        {selectedConvo.isGroup ? selectedConvo.groupName : selectedConvo.participants[0]?.displayName}
                                    </p>
                                    <p className="text-xs text-white/50">
                                        {typingUsers.length > 0 ? `${typingUsers[0].username} is typing...` : 'Online'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/15"><PhoneIcon size={18} /></button>
                                    <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/15"><VideoIcon size={18} /></button>
                                    <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/15"><InfoIcon size={18} /></button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.map((msg) => {
                                    const isMe = msg.senderId === currentUserId;
                                    const reactions = localReactions.get(msg.id) || msg.reactions || [];

                                    return (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className="relative group">
                                                <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${isMe
                                                    ? 'bg-gradient-to-r from-[#00D4FF] to-[#00D4FF]/80 text-black rounded-br-md'
                                                    : 'bg-white/[0.06] text-white rounded-bl-md'
                                                    }`}>
                                                    {msg.mediaType === 'AUDIO' ? (
                                                        <VoiceMessage duration={15} sender={isMe ? 'me' : 'them'} />
                                                    ) : (
                                                        <p>{msg.content}</p>
                                                    )}
                                                    <div className="flex items-center justify-between mt-1 gap-2">
                                                        <p className={`text-xs ${isMe ? 'text-black/60' : 'text-white/40'}`}>
                                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        {isMe && (
                                                            <span className="text-xs">{msg.read ? '✓✓' : '✓'}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Reactions */}
                                                {reactions.length > 0 && (
                                                    <div className={`absolute -bottom-3 ${isMe ? 'right-2' : 'left-2'} flex gap-0.5 bg-[#1a1a1f] rounded-full px-1.5 py-0.5 border border-white/10`}>
                                                        {reactions.map((r, i) => (
                                                            <span key={i} className="text-sm">{r}</span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Reaction button */}
                                                <button
                                                    onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                                                    className={`absolute top-1/2 -translate-y-1/2 ${isMe ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-sm transition-opacity`}
                                                >
                                                    <SmileIcon size={14} className="text-white/60" />
                                                </button>

                                                {/* Reaction Picker */}
                                                <AnimatePresence>
                                                    {showReactionPicker === msg.id && (
                                                        <ReactionPicker
                                                            onSelect={(emoji) => addReaction(msg.id, emoji)}
                                                            onClose={() => setShowReactionPicker(null)}
                                                        />
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </motion.div>
                                    );
                                })}

                                {/* Typing Indicator */}
                                {typingUsers.length > 0 && (
                                    <div className="flex justify-start">
                                        <TypingIndicator />
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Premium Floating Input Bar */}
                            <div className="absolute bottom-6 left-4 right-4 z-20">
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="relative bg-white/[0.04] border border-white/[0.08] rounded-2xl shadow-2xl overflow-visible focus-within:border-[#00D4FF]/30 focus-within:shadow-[0_0_16px_rgba(0,212,255,0.06)] transition-all duration-300 backdrop-blur-xl"
                                >
                                    {/* Emoji Picker Popover */}
                                    <AnimatePresence>
                                        {showInputEmojiPicker && (
                                            <div className="absolute bottom-full left-0 mb-2 z-30">
                                                <EmojiGridPicker
                                                    onSelect={(emoji) => {
                                                        setMessageInput(prev => prev + emoji);
                                                        // Keep open or close? Usually keep open for multiple.
                                                        // But simplified: keep open.
                                                    }}
                                                    onClose={() => setShowInputEmojiPicker(false)}
                                                />
                                            </div>
                                        )}
                                    </AnimatePresence>

                                    <div className="p-2 flex items-end gap-2">
                                        {isRecording ? (
                                            <div className="flex-1 flex items-center gap-3 px-3 py-2">
                                                <div className="flex-1 flex items-center gap-3 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30">
                                                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                                    <span className="text-white font-mono text-sm">Recording... {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}</span>
                                                </div>
                                                <motion.button
                                                    onClick={() => setIsRecording(false)}
                                                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                                                    whileTap={{ scale: 0.9 }}
                                                >
                                                    <TrashIcon size={18} className="text-white/60" />
                                                </motion.button>
                                                <motion.button
                                                    onClick={handleSendVoiceMessage}
                                                    className="w-10 h-10 rounded-full bg-[#00D4FF] hover:bg-[#00C4EF] flex items-center justify-center shadow-[0_0_20px_rgba(0,212,255,0.3)] transition-colors"
                                                    whileTap={{ scale: 0.9 }}
                                                >
                                                    <SendIcon size={18} className="text-black" />
                                                </motion.button>
                                            </div>
                                        ) : (
                                            <>
                                                <button className="p-3 text-white/40 hover:text-[#00D4FF] transition-colors">
                                                    <AttachIcon size={20} />
                                                </button>
                                                <button
                                                    onClick={() => setShowInputEmojiPicker(!showInputEmojiPicker)}
                                                    className={`p-3 transition-colors ${showInputEmojiPicker ? 'text-[#00D4FF]' : 'text-white/40 hover:text-[#00D4FF]'}`}
                                                >
                                                    <SmileIcon size={20} />
                                                </button>
                                                <div className="flex-1 py-2">
                                                    <textarea
                                                        value={messageInput}
                                                        onChange={(e) => {
                                                            setMessageInput(e.target.value);
                                                            startTyping();
                                                            // Auto-resize?
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                                e.preventDefault();
                                                                handleSendMessage();
                                                            }
                                                        }}
                                                        onBlur={stopTyping}
                                                        placeholder="Type a message..."
                                                        className="w-full bg-transparent text-white placeholder:text-white/20 focus:outline-none resize-none max-h-32 min-h-[24px]"
                                                        rows={1}
                                                    />
                                                </div>
                                                {messageInput.trim() ? (
                                                    <motion.button
                                                        onClick={handleSendMessage}
                                                        className="bg-gradient-to-r from-[#00D4FF] to-[#7C3AED] text-white rounded-xl px-4 py-2.5 hover:shadow-[0_0_16px_rgba(0,212,255,0.3)] transition-all duration-200 flex items-center justify-center"
                                                        whileTap={{ scale: 0.95 }}
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                    >
                                                        <SendIcon size={18} className="text-white" />
                                                    </motion.button>
                                                ) : (
                                                    <motion.button
                                                        onClick={() => setIsRecording(true)}
                                                        className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <MicIcon size={20} />
                                                    </motion.button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#00D4FF]/20 to-[#8B5CF6]/20 flex items-center justify-center">
                                    <MessageIcon size={40} className="text-[#00D4FF]" />
                                </div>
                                <h2 className="text-xl font-semibold text-white mb-2">Your Messages</h2>
                                <p className="text-white/50">Select a conversation to start chatting</p>
                            </div>
                        </div>
                    )}
                </div>
            </main >
        </div >
    );
}

// Wrap with ProtectedRoute for authentication requirement
export default function MessagesPage() {
    return (
        <ProtectedRoute>
            <MessagesPageContent />
        </ProtectedRoute>
    );
}
