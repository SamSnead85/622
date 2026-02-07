'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_ENDPOINTS, apiFetch } from '@/lib/api';
import { useSocket } from './useSocket';
import { encryptMessage as e2eEncrypt, decryptMessage as e2eDecrypt, type EncryptedPayload } from '@/lib/encryption/messages';
import { getSessionKey } from '@/lib/encryption/session';

// ============================================
// TYPES
// ============================================
export interface User {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    lastActiveAt?: string;
}

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    sender: User;
    content: string;
    mediaUrl?: string;
    mediaType?: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
    createdAt: string;
    reactions?: string[];
    read?: boolean;
    isEncrypted?: boolean;
}

export interface Conversation {
    id: string;
    isGroup: boolean;
    groupName?: string;
    groupAvatar?: string;
    participants: User[];
    lastMessage?: {
        id: string;
        content: string;
        senderId: string;
        senderUsername: string;
        createdAt: string;
    };
    unreadCount: number;
    isMuted: boolean;
    updatedAt: string;
    isEncrypted?: boolean;
}

interface TypingUser {
    userId: string;
    username: string;
    conversationId: string;
}

// ============================================
// MESSAGES HOOK
// Real-time messaging with Socket.IO integration
// ============================================
export function useMessages() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeConversation, setActiveConversation] = useState<string | null>(null);
    const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { emit, on, joinRoom, leaveRoom } = useSocket();
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch conversations list
    const fetchConversations = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await apiFetch(API_ENDPOINTS.conversations);
            if (response.ok) {
                const data = await response.json();
                setConversations(data.conversations || []);
            } else {
                setError('Failed to load conversations');
            }
        } catch (err) {
            console.error('Error fetching conversations:', err);
            setError('Network error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch messages for a conversation
    const fetchMessages = useCallback(async (conversationId: string) => {
        try {
            const response = await apiFetch(API_ENDPOINTS.messages(conversationId));
            if (response.ok) {
                const data = await response.json();
                setMessages(data.messages || []);
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
        }
    }, []);

    // Select a conversation
    const selectConversation = useCallback((conversationId: string) => {
        // Leave previous room
        if (activeConversation) {
            leaveRoom(activeConversation);
        }

        // Join new room
        setActiveConversation(conversationId);
        joinRoom(conversationId);
        fetchMessages(conversationId);

        // Mark as read
        apiFetch(`${API_ENDPOINTS.messages(conversationId)}/read`, { method: 'PUT' }).catch(console.error);
    }, [activeConversation, joinRoom, leaveRoom, fetchMessages]);

    // E2E encryption session keys stored per conversation
    const sessionKeysRef = useRef<Map<string, CryptoKey>>(new Map());

    // Get or retrieve session key for a conversation
    const getConversationKey = useCallback(async (conversationId: string): Promise<CryptoKey | null> => {
        const cached = sessionKeysRef.current.get(conversationId);
        if (cached) return cached;
        try {
            const sessionKey = await getSessionKey(conversationId);
            if (sessionKey) {
                sessionKeysRef.current.set(conversationId, sessionKey);
                return sessionKey;
            }
        } catch {
            // Session key not available
        }
        return null;
    }, []);

    // Try to encrypt a message for a conversation
    const tryEncrypt = useCallback(async (conversationId: string, plaintext: string): Promise<{ encrypted: boolean; content: string }> => {
        try {
            const sessionKey = await getConversationKey(conversationId);
            if (sessionKey) {
                const payload = await e2eEncrypt(plaintext, sessionKey);
                // Serialize the encrypted payload as JSON string for transport
                return { encrypted: true, content: JSON.stringify(payload) };
            }
        } catch {
            // Encryption not available, send plaintext
        }
        return { encrypted: false, content: plaintext };
    }, [getConversationKey]);

    // Try to decrypt a message
    const tryDecrypt = useCallback(async (conversationId: string, content: string, isEncrypted?: boolean): Promise<string> => {
        if (!isEncrypted) return content;
        try {
            const sessionKey = await getConversationKey(conversationId);
            if (sessionKey) {
                const payload: EncryptedPayload = JSON.parse(content);
                return await e2eDecrypt(payload, sessionKey);
            }
        } catch {
            // Decryption failed
        }
        return '[Encrypted message]';
    }, [getConversationKey]);

    // Send a message (with HTTP fallback + E2E encryption)
    const sendMessage = useCallback(async (content: string, mediaUrl?: string, mediaType?: Message['mediaType']) => {
        if (!activeConversation || !content.trim()) return { success: false, error: 'No active conversation' };

        try {
            // Attempt E2E encryption
            const { encrypted, content: messageContent } = await tryEncrypt(activeConversation, content);

            // First try HTTP to ensure message is persisted
            const response = await apiFetch(`${API_ENDPOINTS.messages(activeConversation)}/messages`, {
                method: 'POST',
                body: JSON.stringify({
                    content: messageContent,
                    mediaUrl,
                    mediaType,
                    isEncrypted: encrypted,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                // Add message to local state (show decrypted content locally)
                setMessages(prev => [...prev, { ...data.message, content, isEncrypted: encrypted }]);
                // Also emit via socket for real-time updates to others
                emit('message:send', {
                    conversationId: activeConversation,
                    content: messageContent,
                    mediaUrl,
                    mediaType,
                    isEncrypted: encrypted,
                });
                return { success: true };
            } else {
                const errorData = await response.json().catch(() => ({}));
                return { success: false, error: errorData.error || 'Failed to send message' };
            }
        } catch (err) {
            console.error('Error sending message:', err);
            return { success: false, error: 'Network error' };
        }
    }, [activeConversation, emit, tryEncrypt]);

    // Typing indicators
    const startTyping = useCallback(() => {
        if (!activeConversation) return;
        emit('typing:start', activeConversation);

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Auto-stop typing after 3 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            emit('typing:stop', activeConversation);
        }, 3000);
    }, [activeConversation, emit]);

    const stopTyping = useCallback(() => {
        if (!activeConversation) return;
        emit('typing:stop', activeConversation);
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
    }, [activeConversation, emit]);

    // Mark message as read
    const markAsRead = useCallback((messageId: string) => {
        if (!activeConversation) return;
        emit('message:read', { conversationId: activeConversation, messageId });
    }, [activeConversation, emit]);

    // Socket event listeners
    useEffect(() => {
        // New message received - decrypt if encrypted
        const unsubMessage = on<Message>('message:new', async (message) => {
            let decryptedContent = message.content;
            if (message.isEncrypted) {
                decryptedContent = await tryDecrypt(message.conversationId, message.content, true);
            }
            const processedMessage = { ...message, content: decryptedContent };

            if (message.conversationId === activeConversation) {
                setMessages(prev => {
                    if (prev.some(m => m.id === message.id)) return prev;
                    return [...prev, processedMessage];
                });
            }
            // Update conversation list
            setConversations(prev => prev.map(c =>
                c.id === message.conversationId
                    ? {
                        ...c,
                        lastMessage: {
                            id: message.id,
                            content: message.content,
                            senderId: message.senderId,
                            senderUsername: message.sender.username,
                            createdAt: message.createdAt,
                        },
                        unreadCount: message.conversationId === activeConversation
                            ? c.unreadCount
                            : c.unreadCount + 1,
                    }
                    : c
            ));
        });

        // Typing started
        const unsubTypingStart = on<TypingUser>('typing:start', (data) => {
            setTypingUsers(prev => new Map(prev).set(data.userId, data));
        });

        // Typing stopped
        const unsubTypingStop = on<{ userId: string }>('typing:stop', (data) => {
            setTypingUsers(prev => {
                const next = new Map(prev);
                next.delete(data.userId);
                return next;
            });
        });

        // Message read receipt
        const unsubRead = on<{ userId: string; messageId: string }>('message:read', (data) => {
            setMessages(prev => prev.map(m =>
                m.id === data.messageId ? { ...m, read: true } : m
            ));
        });

        return () => {
            unsubMessage?.();
            unsubTypingStart?.();
            unsubTypingStop?.();
            unsubRead?.();
        };
    }, [on, activeConversation]);

    // Initial fetch
    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    // Start a new conversation with a user
    const startConversation = useCallback(async (userId: string): Promise<{ success: boolean; conversationId?: string; error?: string }> => {
        try {
            const response = await apiFetch(API_ENDPOINTS.conversations, {
                method: 'POST',
                body: JSON.stringify({
                    participantIds: [userId],
                    isGroup: false,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                // Add new conversation to list
                setConversations(prev => [data.conversation, ...prev]);
                // Select the new conversation
                selectConversation(data.conversation.id);
                return { success: true, conversationId: data.conversation.id };
            } else {
                const errorData = await response.json().catch(() => ({}));
                return { success: false, error: errorData.error || 'Failed to start conversation' };
            }
        } catch (err) {
            console.error('Error starting conversation:', err);
            return { success: false, error: 'Network error' };
        }
    }, [selectConversation]);

    // Get typing users for active conversation
    const activeTypingUsers = Array.from(typingUsers.values())
        .filter(u => u.conversationId === activeConversation);

    return {
        conversations,
        messages,
        activeConversation,
        typingUsers: activeTypingUsers,
        isLoading,
        error,
        selectConversation,
        sendMessage,
        startConversation,
        startTyping,
        stopTyping,
        markAsRead,
        refetch: fetchConversations,
    };
}
