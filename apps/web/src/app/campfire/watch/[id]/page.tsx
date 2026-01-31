'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';

interface ChatMessage {
    id: string;
    username: string;
    content: string;
    type: 'message' | 'gift' | 'join';
    giftEmoji?: string;
    avatarUrl: string;
}

// Mock stream data
const MOCK_STREAM = {
    id: '1',
    title: 'Late night coding session 💻',
    description: 'Building cool stuff with React and TypeScript',
    viewerCount: 1243,
    startedAt: new Date(Date.now() - 45 * 60 * 1000),
    user: {
        username: 'devguru',
        displayName: 'Dev Guru',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face',
        followers: 12500,
    },
};

const MOCK_MESSAGES: ChatMessage[] = [
    { id: '1', username: 'sarah_designs', content: 'Welcome everyone! 👋', type: 'message', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50' },
    { id: '2', username: 'techbro99', content: 'What IDE are you using?', type: 'message', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=50' },
    { id: '3', username: 'coder_jane', content: 'Love the vibe! 🔥', type: 'message', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50' },
];

export default function WatchStreamPage() {
    const params = useParams();
    const streamId = params.id as string;

    const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
    const [newMessage, setNewMessage] = useState('');
    const [viewerCount, setViewerCount] = useState(MOCK_STREAM.viewerCount);
    const [isFollowing, setIsFollowing] = useState(false);
    const [reactions, setReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);
    const chatRef = useRef<HTMLDivElement>(null);

    // Simulate chat messages
    useEffect(() => {
        const interval = setInterval(() => {
            const randomMessages = [
                'This is amazing! 🔥',
                'Can you explain that again?',
                'Love it!',
                'First time here, hi everyone!',
                '👏👏👏',
                'Great stream!',
            ];
            const msg: ChatMessage = {
                id: Date.now().toString(),
                username: `user_${Math.floor(Math.random() * 1000)}`,
                content: randomMessages[Math.floor(Math.random() * randomMessages.length)],
                type: 'message',
                avatarUrl: `https://i.pravatar.cc/50?u=${Date.now()}`,
            };
            setMessages(prev => [...prev.slice(-50), msg]);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    // Auto-scroll chat
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [messages]);

    // Viewer count fluctuation
    useEffect(() => {
        const interval = setInterval(() => {
            setViewerCount(v => v + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 5));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        const msg: ChatMessage = {
            id: Date.now().toString(),
            username: 'you',
            content: newMessage,
            type: 'message',
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50',
        };
        setMessages(prev => [...prev, msg]);
        setNewMessage('');
    };

    const addReaction = (emoji: string) => {
        const id = Date.now().toString() + Math.random();
        const x = 60 + Math.random() * 30;
        setReactions(prev => [...prev, { id, emoji, x }]);
        setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== id));
        }, 2000);
    };

    const formatDuration = () => {
        const diff = Date.now() - MOCK_STREAM.startedAt.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        return `${hours}h ${mins % 60}m`;
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white flex">
            {/* Main Video Area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <header className="bg-gray-900/80 backdrop-blur-lg border-b border-gray-800 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/campfire" className="text-gray-400 hover:text-white">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </Link>
                        <div className="flex items-center gap-1.5 bg-red-500/20 px-2 py-1 rounded-md">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-red-400 text-xs font-bold">LIVE</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>{viewerCount.toLocaleString()} watching</span>
                        <span>Started {formatDuration()} ago</span>
                    </div>
                </header>

                {/* Video */}
                <div className="flex-1 relative bg-black">
                    {/* Placeholder video - in production would be HLS player */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-950">
                        <div className="text-center">
                            <div className="animate-pulse text-6xl mb-4">📺</div>
                            <p className="text-gray-500">Live stream preview</p>
                            <p className="text-gray-600 text-sm mt-1">In production: HLS video player</p>
                        </div>
                    </div>

                    {/* Reaction overlay */}
                    <AnimatePresence>
                        {reactions.map((reaction) => (
                            <motion.div
                                key={reaction.id}
                                initial={{ y: 0, opacity: 1, scale: 1 }}
                                animate={{ y: -200, opacity: 0, scale: 1.3 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1.5, ease: 'easeOut' }}
                                className="absolute bottom-20 pointer-events-none"
                                style={{ left: `${reaction.x}%` }}
                            >
                                <span className="text-3xl">{reaction.emoji}</span>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Stream info & reactions */}
                <div className="bg-gray-900 border-t border-gray-800 p-4">
                    <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-red-500">
                                <Image
                                    src={MOCK_STREAM.user.avatarUrl}
                                    alt={MOCK_STREAM.user.displayName}
                                    width={48}
                                    height={48}
                                    className="object-cover"
                                />
                            </div>
                            <div>
                                <h1 className="font-bold text-lg">{MOCK_STREAM.title}</h1>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <span>@{MOCK_STREAM.user.username}</span>
                                    <span>•</span>
                                    <span>{MOCK_STREAM.user.followers.toLocaleString()} followers</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsFollowing(!isFollowing)}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${isFollowing
                                    ? 'bg-gray-700 text-white'
                                    : 'bg-rose-500 hover:bg-rose-600 text-white'
                                }`}
                        >
                            {isFollowing ? 'Following' : 'Follow'}
                        </button>
                    </div>

                    {/* Reaction row */}
                    <div className="flex gap-2 mt-4">
                        {['❤️', '🔥', '👏', '😂', '😮', '💯', '🎉'].map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => addReaction(emoji)}
                                className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center text-lg transition-colors"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chat Sidebar */}
            <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                    <h2 className="font-semibold">Live Chat</h2>
                    <span className="text-xs text-gray-500">{messages.length} messages</span>
                </div>

                {/* Messages */}
                <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-2"
                        >
                            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                                <Image
                                    src={msg.avatarUrl}
                                    alt={msg.username}
                                    width={28}
                                    height={28}
                                    className="object-cover"
                                />
                            </div>
                            <div className="bg-gray-800/50 rounded-lg px-2.5 py-1.5 max-w-[200px]">
                                <span className={`text-xs font-semibold ${msg.username === 'you' ? 'text-rose-400' : 'text-blue-400'}`}>
                                    {msg.username}
                                </span>
                                <p className="text-sm text-gray-200">{msg.content}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Input */}
                <form onSubmit={sendMessage} className="p-3 border-t border-gray-800">
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
                            className="bg-rose-500 hover:bg-rose-600 w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
