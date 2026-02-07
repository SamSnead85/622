'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import { apiFetch } from '@/lib/api';

// ============================================
// TYPES
// ============================================

export interface StreamChatMessage {
    id: string;
    streamId: string;
    userId: string;
    content: string;
    type: 'MESSAGE' | 'GIFT' | 'REACTION' | 'JOIN' | 'LEAVE';
    giftType?: string | null;
    giftAmount?: number | null;
    createdAt: string;
    user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        isVerified: boolean;
    };
}

export interface StreamReaction {
    id: string;
    userId: string;
    username: string;
    emoji: string;
}

export interface StreamGift extends StreamChatMessage {
    giftType: string;
    giftAmount: number;
}

// ============================================
// HOOK
// ============================================

export function useStreamChat(streamId: string | null) {
    const { emit, on, isConnected } = useSocket();
    const [messages, setMessages] = useState<StreamChatMessage[]>([]);
    const [reactions, setReactions] = useState<StreamReaction[]>([]);
    const [viewerCount, setViewerCount] = useState(0);
    const [isJoined, setIsJoined] = useState(false);
    const joinedStreamRef = useRef<string | null>(null);
    const reactionIdRef = useRef(0);

    // Load initial chat history from API
    useEffect(() => {
        if (!streamId) return;

        const loadHistory = async () => {
            try {
                const res = await apiFetch(`/livestream/${streamId}/chat?limit=50`);
                if (res.ok) {
                    const data = await res.json();
                    setMessages(data.messages || []);
                }
            } catch {
                // Non-critical, start with empty chat
            }
        };

        loadHistory();
    }, [streamId]);

    // Join/leave stream room via Socket.IO
    useEffect(() => {
        if (!streamId || !isConnected) return;

        // Join the stream room
        emit('stream:join', streamId);
        joinedStreamRef.current = streamId;
        setIsJoined(true);

        return () => {
            // Leave on cleanup
            if (joinedStreamRef.current) {
                emit('stream:leave', joinedStreamRef.current);
                joinedStreamRef.current = null;
                setIsJoined(false);
            }
        };
    }, [streamId, isConnected, emit]);

    // Subscribe to stream events
    useEffect(() => {
        if (!streamId) return;

        // Chat messages
        const unsubChat = on<StreamChatMessage>('stream:chat-message', (msg) => {
            if (msg.streamId === streamId) {
                setMessages(prev => {
                    if (prev.some(m => m.id === msg.id)) return prev;
                    // Keep last 200 messages in memory
                    const next = [...prev, msg];
                    return next.length > 200 ? next.slice(-200) : next;
                });
            }
        });

        // Viewer count updates
        const unsubViewers = on<{ streamId: string; viewerCount: number }>('stream:viewers', (data) => {
            if (data.streamId === streamId) {
                setViewerCount(data.viewerCount);
            }
        });

        // Reactions (ephemeral)
        const unsubReaction = on<{ userId: string; username: string; emoji: string }>('stream:reaction', (data) => {
            const id = `reaction-${++reactionIdRef.current}`;
            const reaction = { ...data, id };
            setReactions(prev => [...prev, reaction]);

            // Auto-remove after 2 seconds
            setTimeout(() => {
                setReactions(prev => prev.filter(r => r.id !== id));
            }, 2000);
        });

        // Gift received
        const unsubGift = on<StreamChatMessage>('stream:gift-received', (msg) => {
            if (msg.streamId === streamId) {
                setMessages(prev => {
                    if (prev.some(m => m.id === msg.id)) return prev;
                    const next = [...prev, msg];
                    return next.length > 200 ? next.slice(-200) : next;
                });
            }
        });

        // User joined notification
        const unsubJoin = on<{ userId: string; username: string }>('stream:user-joined', () => {
            // Could show a toast or notification
        });

        // Stream ended
        const unsubEnded = on<{ streamId: string }>('stream:ended', (data) => {
            if (data.streamId === streamId) {
                setIsJoined(false);
            }
        });

        return () => {
            unsubChat();
            unsubViewers();
            unsubReaction();
            unsubGift();
            unsubJoin();
            unsubEnded();
        };
    }, [streamId, on]);

    // Send a chat message
    const sendMessage = useCallback((content: string) => {
        if (!streamId || !content.trim()) return;
        emit('stream:chat', { streamId, content: content.trim() });
    }, [streamId, emit]);

    // Send a reaction emoji
    const sendReaction = useCallback((emoji: string) => {
        if (!streamId) return;
        emit('stream:reaction', { streamId, emoji });
    }, [streamId, emit]);

    // Send a gift
    const sendGift = useCallback((giftType: string, giftAmount: number, message?: string) => {
        if (!streamId) return;
        emit('stream:gift', { streamId, giftType, giftAmount, message });
    }, [streamId, emit]);

    return {
        messages,
        reactions,
        viewerCount,
        isJoined,
        isConnected,
        sendMessage,
        sendReaction,
        sendGift,
    };
}
