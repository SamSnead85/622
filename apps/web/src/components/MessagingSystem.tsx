'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageIcon,
    SearchIcon,
    SendIcon,
    CloseIcon,
    CheckCircleIcon,
    BellIcon,
    SettingsIcon,
    MicrophoneIcon,
} from '@/components/icons';

// ============================================
// TYPES
// ============================================

export interface Message {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    content: string;
    type: 'text' | 'image' | 'voice' | 'video' | 'file';
    mediaUrl?: string;
    replyTo?: string;
    reactions: { emoji: string; userId: string }[];
    readBy: string[];
    createdAt: Date;
    editedAt?: Date;
    isDeleted?: boolean;
}

export interface Conversation {
    id: string;
    participants: { id: string; name: string; avatar?: string }[];
    isGroup: boolean;
    groupName?: string;
    groupAvatar?: string;
    lastMessage?: Message;
    unreadCount: number;
    isPinned: boolean;
    isMuted: boolean;
    isArchived: boolean;
}

export interface TypingUser {
    userId: string;
    userName: string;
}

// ============================================
// MESSAGE REACTIONS
// ============================================

const MESSAGE_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

interface MessageReactionsProps {
    reactions: { emoji: string; userId: string }[];
    onReact: (emoji: string) => void;
    currentUserId: string;
}

export function MessageReactions({ reactions, onReact, currentUserId }: MessageReactionsProps) {
    const [showPicker, setShowPicker] = useState(false);

    const groupedReactions = reactions.reduce((acc, r) => {
        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="relative">
            {Object.keys(groupedReactions).length > 0 && (
                <div className="flex gap-1 mt-1">
                    {Object.entries(groupedReactions).map(([emoji, count]) => (
                        <button
                            key={emoji}
                            onClick={() => onReact(emoji)}
                            className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 transition-all ${reactions.some(r => r.emoji === emoji && r.userId === currentUserId)
                                    ? 'bg-cyan-500/20 border border-cyan-500/30'
                                    : 'bg-white/10 hover:bg-white/20'
                                }`}
                        >
                            <span>{emoji}</span>
                            <span className="text-white/60">{count}</span>
                        </button>
                    ))}
                </div>
            )}

            <button
                onClick={() => setShowPicker(!showPicker)}
                className="absolute -right-6 top-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 transition-all"
            >
                <span className="text-xs">+</span>
            </button>

            <AnimatePresence>
                {showPicker && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute bottom-full mb-1 left-0 flex gap-1 p-2 bg-[#1A1A1F] rounded-xl border border-white/10 shadow-xl z-10"
                    >
                        {MESSAGE_REACTIONS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => { onReact(emoji); setShowPicker(false); }}
                                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                            >
                                {emoji}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// MESSAGE BUBBLE
// ============================================

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    showAvatar: boolean;
    onReact: (emoji: string) => void;
    onReply: () => void;
    onForward: () => void;
    currentUserId: string;
}

export function MessageBubble({
    message,
    isOwn,
    showAvatar,
    onReact,
    onReply,
    onForward,
    currentUserId
}: MessageBubbleProps) {
    const [showActions, setShowActions] = useState(false);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

    if (message.isDeleted) {
        return (
            <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
                <div className="px-4 py-2 rounded-2xl bg-white/5 text-white/40 italic text-sm">
                    This message was deleted
                </div>
            </div>
        );
    }

    return (
        <div
            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 group`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {!isOwn && showAvatar && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium mr-2 flex-shrink-0">
                    {message.senderAvatar ? (
                        <img src={message.senderAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                        message.senderName[0]
                    )}
                </div>
            )}
            {!isOwn && !showAvatar && <div className="w-8 mr-2" />}

            <div className={`max-w-[70%] relative ${isOwn ? 'order-1' : ''}`}>
                {/* Message Actions */}
                <AnimatePresence>
                    {showActions && (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className={`absolute ${isOwn ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'} top-0 flex gap-1`}
                        >
                            <button
                                onClick={onReply}
                                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 text-xs"
                                title="Reply"
                            >
                                ↩
                            </button>
                            <button
                                onClick={onForward}
                                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 text-xs"
                                title="Forward"
                            >
                                ↪
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Message Content */}
                <div
                    className={`px-4 py-2 rounded-2xl ${isOwn
                            ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                            : 'bg-white/10 text-white'
                        }`}
                >
                    {message.type === 'text' && <p className="text-sm">{message.content}</p>}
                    {message.type === 'image' && message.mediaUrl && (
                        <img src={message.mediaUrl} alt="" className="rounded-lg max-w-full" />
                    )}
                    {message.type === 'voice' && (
                        <div className="flex items-center gap-2">
                            <button className="p-2 rounded-full bg-white/20">▶</button>
                            <div className="h-1 w-32 bg-white/30 rounded-full" />
                            <span className="text-xs">0:15</span>
                        </div>
                    )}
                </div>

                {/* Time & Read Status */}
                <div className={`flex items-center gap-1 mt-0.5 text-[10px] text-white/40 ${isOwn ? 'justify-end' : ''}`}>
                    <span>{formatTime(message.createdAt)}</span>
                    {message.editedAt && <span>(edited)</span>}
                    {isOwn && message.readBy.length > 0 && (
                        <CheckCircleIcon size={10} className="text-cyan-400" />
                    )}
                </div>

                {/* Reactions */}
                <MessageReactions
                    reactions={message.reactions}
                    onReact={onReact}
                    currentUserId={currentUserId}
                />
            </div>
        </div>
    );
}

// ============================================
// VOICE MESSAGE RECORDER
// ============================================

interface VoiceRecorderProps {
    onRecordComplete: (blob: Blob, duration: number) => void;
    onCancel: () => void;
}

export function VoiceRecorder({ onRecordComplete, onCancel }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                onRecordComplete(blob, duration);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        } catch (err) {
            console.error('Failed to start recording:', err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRecording(false);
        setDuration(0);
        onCancel();
    };

    useEffect(() => {
        startRecording();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 px-4 py-3 bg-red-500/20 rounded-xl border border-red-500/30"
        >
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white font-mono">{formatDuration(duration)}</span>
            <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-red-500"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 60, ease: 'linear' }}
                />
            </div>
            <button
                onClick={cancelRecording}
                className="p-2 rounded-full hover:bg-white/10 text-white/60"
            >
                <CloseIcon size={18} />
            </button>
            <button
                onClick={stopRecording}
                className="p-2 rounded-full bg-cyan-500 text-white"
            >
                <SendIcon size={18} />
            </button>
        </motion.div>
    );
}

// ============================================
// MESSAGE COMPOSER
// ============================================

interface MessageComposerProps {
    onSend: (content: string, type: Message['type'], mediaUrl?: string) => void;
    replyTo?: Message;
    onCancelReply?: () => void;
}

export function MessageComposer({ onSend, replyTo, onCancelReply }: MessageComposerProps) {
    const [content, setContent] = useState('');
    const [isRecordingVoice, setIsRecordingVoice] = useState(false);

    const handleSend = () => {
        if (content.trim()) {
            onSend(content.trim(), 'text');
            setContent('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleVoiceComplete = (blob: Blob, duration: number) => {
        const url = URL.createObjectURL(blob);
        onSend(`Voice message (${duration}s)`, 'voice', url);
        setIsRecordingVoice(false);
    };

    return (
        <div className="border-t border-white/10 p-4">
            {/* Reply Preview */}
            {replyTo && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-white/5 rounded-lg">
                    <div className="w-1 h-8 bg-cyan-500 rounded-full" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-cyan-400">{replyTo.senderName}</p>
                        <p className="text-sm text-white/60 truncate">{replyTo.content}</p>
                    </div>
                    <button onClick={onCancelReply} className="p-1 hover:bg-white/10 rounded">
                        <CloseIcon size={14} className="text-white/40" />
                    </button>
                </div>
            )}

            {/* Voice Recording */}
            {isRecordingVoice ? (
                <VoiceRecorder
                    onRecordComplete={handleVoiceComplete}
                    onCancel={() => setIsRecordingVoice(false)}
                />
            ) : (
                <div className="flex items-end gap-2">
                    <button className="p-2 rounded-xl hover:bg-white/10 text-white/60">
                        📎
                    </button>
                    <div className="flex-1 relative">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            rows={1}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-500/50 resize-none"
                        />
                    </div>
                    {content.trim() ? (
                        <button
                            onClick={handleSend}
                            className="p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white"
                        >
                            <SendIcon size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsRecordingVoice(true)}
                            className="p-3 rounded-xl bg-white/10 text-white/60 hover:bg-white/20"
                        >
                            <MicrophoneIcon size={18} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================
// CONVERSATION LIST
// ============================================

interface ConversationListProps {
    conversations: Conversation[];
    selectedId?: string;
    onSelect: (id: string) => void;
    onArchive: (id: string) => void;
    onPin: (id: string) => void;
    onMute: (id: string) => void;
}

export function ConversationList({
    conversations,
    selectedId,
    onSelect,
    onArchive,
    onPin,
    onMute
}: ConversationListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'unread' | 'archived'>('all');

    const filteredConversations = conversations
        .filter(c => {
            if (filter === 'unread') return c.unreadCount > 0;
            if (filter === 'archived') return c.isArchived;
            return !c.isArchived;
        })
        .filter(c => {
            if (!searchQuery) return true;
            const name = c.isGroup ? c.groupName : c.participants[0]?.name;
            return name?.toLowerCase().includes(searchQuery.toLowerCase());
        })
        .sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            const aTime = a.lastMessage?.createdAt.getTime() || 0;
            const bTime = b.lastMessage?.createdAt.getTime() || 0;
            return bTime - aTime;
        });

    const formatTime = (date?: Date) => {
        if (!date) return '';
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        if (diff < 86400000) {
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        }
        if (diff < 604800000) {
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white mb-3">Messages</h2>
                <div className="relative">
                    <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search conversations..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-cyan-500/50"
                    />
                </div>
                <div className="flex gap-2 mt-3">
                    {(['all', 'unread', 'archived'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filter === f
                                    ? 'bg-cyan-500/20 text-cyan-400'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {filteredConversations.map(conv => {
                    const displayName = conv.isGroup ? conv.groupName : conv.participants[0]?.name;
                    const avatar = conv.isGroup ? conv.groupAvatar : conv.participants[0]?.avatar;

                    return (
                        <button
                            key={conv.id}
                            onClick={() => onSelect(conv.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${selectedId === conv.id
                                    ? 'bg-white/10'
                                    : 'hover:bg-white/5'
                                }`}
                        >
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-medium">
                                    {avatar ? (
                                        <img src={avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        displayName?.[0] || '?'
                                    )}
                                </div>
                                {conv.isPinned && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center text-[8px]">
                                        📌
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h3 className={`font-medium truncate ${conv.unreadCount > 0 ? 'text-white' : 'text-white/80'}`}>
                                        {displayName}
                                    </h3>
                                    <span className="text-xs text-white/40">
                                        {formatTime(conv.lastMessage?.createdAt)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-white/70' : 'text-white/40'}`}>
                                        {conv.lastMessage?.content || 'No messages yet'}
                                    </p>
                                    {conv.unreadCount > 0 && (
                                        <span className="ml-2 w-5 h-5 rounded-full bg-cyan-500 text-white text-xs flex items-center justify-center">
                                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {conv.isMuted && (
                                <BellIcon size={14} className="text-white/30" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ============================================
// CHAT VIEW
// ============================================

interface ChatViewProps {
    conversation: Conversation;
    messages: Message[];
    currentUserId: string;
    typingUsers: TypingUser[];
    onSend: (content: string, type: Message['type'], mediaUrl?: string) => void;
    onReact: (messageId: string, emoji: string) => void;
    onBack: () => void;
}

export function ChatView({
    conversation,
    messages,
    currentUserId,
    typingUsers,
    onSend,
    onReact,
    onBack
}: ChatViewProps) {
    const [replyTo, setReplyTo] = useState<Message | undefined>();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const displayName = conversation.isGroup
        ? conversation.groupName
        : conversation.participants.find(p => p.id !== currentUserId)?.name;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/10 lg:hidden">
                    ←
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-medium">
                    {displayName?.[0] || '?'}
                </div>
                <div className="flex-1">
                    <h3 className="font-medium text-white">{displayName}</h3>
                    {typingUsers.length > 0 ? (
                        <p className="text-xs text-cyan-400">
                            {typingUsers.map(u => u.userName).join(', ')} typing...
                        </p>
                    ) : (
                        <p className="text-xs text-white/40">Online</p>
                    )}
                </div>
                <button className="p-2 rounded-lg hover:bg-white/10 text-white/60">
                    <SettingsIcon size={18} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
                {messages.map((msg, index) => {
                    const isOwn = msg.senderId === currentUserId;
                    const prevMsg = messages[index - 1];
                    const showAvatar = !isOwn && (!prevMsg || prevMsg.senderId !== msg.senderId);

                    return (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            isOwn={isOwn}
                            showAvatar={showAvatar}
                            onReact={(emoji) => onReact(msg.id, emoji)}
                            onReply={() => setReplyTo(msg)}
                            onForward={() => { }}
                            currentUserId={currentUserId}
                        />
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <MessageComposer
                onSend={onSend}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(undefined)}
            />
        </div>
    );
}

export default ChatView;
