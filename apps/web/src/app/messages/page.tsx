'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useMessages, type Message as ApiMessage, type Conversation } from '@/hooks';
import { ProtectedRoute } from '@/contexts/AuthContext';
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
                    className={`h-full ${sender === 'me' ? 'bg-white' : 'bg-gradient-to-r from-orange-400 to-rose-500'}`}
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
                    className="w-8 h-8 flex items-center justify-center hover:scale-125 transition-transform"
                >
                    {emoji}
                </button>
            ))}
        </motion.div>
    );
}

// ============================================
// NEW CHAT MODAL
// ============================================
function NewChatModal({
    isOpen,
    onClose
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const [searchQuery, setSearchQuery] = useState('');

    // Mock contacts - will be real API data
    const contacts = [
        { id: '1', name: 'Family Group', avatar: '👨‍👩‍👧‍👦', type: 'group', lastSeen: 'Create new group' },
        { id: '2', name: 'Start Group Chat', avatar: '➕', type: 'action', lastSeen: 'Add multiple people' },
    ];

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
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="px-4 space-y-2">
                    {contacts.map((contact) => (
                        <button
                            key={contact.id}
                            className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors"
                        >
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center">
                                <span className="text-xl">{contact.avatar}</span>
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-semibold text-white">{contact.name}</p>
                                <p className="text-sm text-white/50">{contact.lastSeen}</p>
                            </div>
                            <span className="text-white/40">→</span>
                        </button>
                    ))}
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

// Navigation
function Navigation({ activeTab }: { activeTab: string }) {
    const navItems = [
        { id: 'home', Icon: HomeIcon, label: 'Home', href: '/dashboard' },
        { id: 'explore', Icon: SearchIcon, label: 'Explore', href: '/explore' },
        { id: 'communities', Icon: UsersIcon, label: 'Tribes', href: '/communities' },
        { id: 'invite', Icon: SendIcon, label: 'Invite', href: '/invite' },
        { id: 'messages', Icon: MessageIcon, label: 'Messages', href: '/messages' },
    ];

    return (
        <>
            <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 xl:w-64 bg-[#0A0A0F]/95 backdrop-blur-xl border-r border-white/5 flex-col p-4 z-40">
                <Link href="/" className="flex items-center gap-3 px-3 py-4 mb-6">
                    <div className="font-bold text-2xl tracking-tight">
                        <span className="text-[#00D4FF]">0</span>
                        <span className="text-white">G</span>
                    </div>
                    <span className="text-white/60 text-sm font-medium hidden xl:block">Zero Gravity</span>
                </Link>
                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => (
                        <Link key={item.id} href={item.href} className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20' : 'text-white/60 hover:bg-white/5'}`}>
                            <item.Icon size={24} />
                            <span className="font-medium hidden xl:block">{item.label}</span>
                        </Link>
                    ))}
                </nav>
            </aside>
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 z-50">
                <div className="flex items-center justify-around py-2">
                    {navItems.map((item) => (
                        <Link key={item.id} href={item.href} className={`flex flex-col items-center gap-1 p-2 ${activeTab === item.id ? 'text-white' : 'text-white/50'}`}>
                            <item.Icon size={22} />
                            <span className="text-[10px]">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </nav>
        </>
    );
}

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

    const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [mounted, setMounted] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
    const [localReactions, setLocalReactions] = useState<Map<string, string[]>>(new Map());
    const [showNewChatModal, setShowNewChatModal] = useState(false);
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

            <Navigation activeTab="messages" />

            {/* New Chat Modal */}
            <AnimatePresence>
                {showNewChatModal && (
                    <NewChatModal
                        isOpen={showNewChatModal}
                        onClose={() => setShowNewChatModal(false)}
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
                                ✏️
                            </button>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                            <SearchIcon size={16} className="text-white/40" />
                            <input type="text" placeholder="Search messages..." className="flex-1 bg-transparent text-white placeholder:text-white/40 focus:outline-none text-sm" />
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center p-8">
                                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            </div>
                        ) : conversations.length === 0 ? (
                            <div className="text-center p-8">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#00D4FF]/20 to-[#8B5CF6]/20 flex items-center justify-center">
                                    <WaveIcon size={32} className="text-[#00D4FF]" />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">No Messages Yet</h3>
                                <p className="text-white/50 text-sm mb-6">Start chatting with your friends and tribe members</p>
                                <Link
                                    href="/invite"
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white font-semibold hover:opacity-90 transition-opacity"
                                >
                                    <SendIcon size={18} />
                                    Invite Friends to 0G
                                </Link>
                            </div>
                        ) : (
                            conversations.map((convo) => (
                                <motion.button
                                    key={convo.id}
                                    onClick={() => handleSelectConversation(convo)}
                                    className={`w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors ${activeConversation === convo.id ? 'bg-white/10' : ''}`}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full overflow-hidden relative bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
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
                                        <span className="w-5 h-5 rounded-full bg-gradient-to-r from-orange-400 to-rose-500 text-white text-xs flex items-center justify-center">
                                            {convo.unreadCount}
                                        </span>
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
                                    <div className="w-10 h-10 rounded-full overflow-hidden relative bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
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
                                                <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${isMe
                                                    ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-br-md'
                                                    : 'bg-white/10 text-white rounded-bl-md'
                                                    }`}>
                                                    {msg.mediaType === 'AUDIO' ? (
                                                        <VoiceMessage duration={15} sender={isMe ? 'me' : 'them'} />
                                                    ) : (
                                                        <p>{msg.content}</p>
                                                    )}
                                                    <div className="flex items-center justify-between mt-1 gap-2">
                                                        <p className={`text-xs ${isMe ? 'text-white/70' : 'text-white/40'}`}>
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

                            {/* Input */}
                            <div className="p-4 border-t border-white/5 bg-black/20 mb-16 md:mb-0">
                                {isRecording ? (
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-full bg-red-500/10 border border-red-500/30">
                                            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                            <span className="text-white">Recording... {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}</span>
                                        </div>
                                        <motion.button
                                            onClick={() => setIsRecording(false)}
                                            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                                            whileTap={{ scale: 0.9 }}
                                        >
                                            <TrashIcon size={18} className="text-white/60" />
                                        </motion.button>
                                        <motion.button
                                            onClick={handleSendVoiceMessage}
                                            className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-400 to-rose-500 flex items-center justify-center"
                                            whileTap={{ scale: 0.9 }}
                                        >
                                            ➤
                                        </motion.button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <button className="hover:scale-110 transition-transform"><AttachIcon size={20} className="text-white/60" /></button>
                                        <button className="hover:scale-110 transition-transform"><SmileIcon size={20} className="text-white/60" /></button>
                                        <input
                                            type="text"
                                            value={messageInput}
                                            onChange={handleInputChange}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            onBlur={stopTyping}
                                            placeholder="Type a message..."
                                            className="flex-1 bg-white/5 rounded-full px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:bg-white/10 transition-colors"
                                        />
                                        {messageInput.trim() ? (
                                            <motion.button
                                                onClick={handleSendMessage}
                                                className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-400 to-rose-500 flex items-center justify-center"
                                                whileTap={{ scale: 0.9 }}
                                            >
                                                <span className="text-white">➤</span>
                                            </motion.button>
                                        ) : (
                                            <motion.button
                                                onClick={() => setIsRecording(true)}
                                                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/15"
                                                whileTap={{ scale: 0.9 }}
                                            >
                                                <MicIcon size={18} className="text-white/60" />
                                            </motion.button>
                                        )}
                                    </div>
                                )}
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
