'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

// ============================================
// TYPES
// ============================================

export interface WebSocketOptions {
    url: string;
    protocols?: string[];
    reconnect?: boolean;
    reconnectAttempts?: number;
    reconnectInterval?: number;
    heartbeatInterval?: number;
    onOpen?: () => void;
    onClose?: (event: CloseEvent) => void;
    onError?: (error: Event) => void;
    onMessage?: (data: unknown) => void;
    onReconnect?: (attempt: number) => void;
}

export interface WebSocketState {
    isConnected: boolean;
    isReconnecting: boolean;
    reconnectAttempt: number;
    lastError: Event | null;
}

// ============================================
// WEBSOCKET HOOK WITH RECONNECTION
// ============================================

export function useWebSocket(options: WebSocketOptions) {
    const {
        url,
        protocols,
        reconnect = true,
        reconnectAttempts = 5,
        reconnectInterval = 3000,
        heartbeatInterval = 30000,
        onOpen,
        onClose,
        onError,
        onMessage,
        onReconnect,
    } = options;

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
    const heartbeatTimeoutRef = useRef<NodeJS.Timeout>();
    const reconnectCountRef = useRef(0);

    const [state, setState] = useState<WebSocketState>({
        isConnected: false,
        isReconnecting: false,
        reconnectAttempt: 0,
        lastError: null,
    });

    // Clear all timeouts
    const clearTimeouts = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current);
        }
    }, []);

    // Start heartbeat
    const startHeartbeat = useCallback(() => {
        if (heartbeatInterval > 0) {
            heartbeatTimeoutRef.current = setInterval(() => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ type: 'ping' }));
                }
            }, heartbeatInterval);
        }
    }, [heartbeatInterval]);

    // Connect to WebSocket
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            // Add auth token to URL if available
            const token = typeof window !== 'undefined'
                ? localStorage.getItem('0g_token')
                : null;

            const wsUrl = token
                ? `${url}${url.includes('?') ? '&' : '?'}token=${token}`
                : url;

            wsRef.current = new WebSocket(wsUrl, protocols);

            wsRef.current.onopen = () => {
                setState((prev) => ({
                    ...prev,
                    isConnected: true,
                    isReconnecting: false,
                    reconnectAttempt: 0,
                }));
                reconnectCountRef.current = 0;
                startHeartbeat();
                onOpen?.();
            };

            wsRef.current.onclose = (event) => {
                setState((prev) => ({
                    ...prev,
                    isConnected: false,
                }));
                clearTimeouts();
                onClose?.(event);

                // Attempt reconnection if enabled and not a clean close
                if (reconnect && !event.wasClean && reconnectCountRef.current < reconnectAttempts) {
                    setState((prev) => ({
                        ...prev,
                        isReconnecting: true,
                        reconnectAttempt: reconnectCountRef.current + 1,
                    }));

                    // Exponential backoff
                    const delay = reconnectInterval * Math.pow(1.5, reconnectCountRef.current);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectCountRef.current++;
                        onReconnect?.(reconnectCountRef.current);
                        connect();
                    }, delay);
                }
            };

            wsRef.current.onerror = (error) => {
                setState((prev) => ({
                    ...prev,
                    lastError: error,
                }));
                onError?.(error);
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    // Ignore pong messages
                    if (data.type === 'pong') return;
                    onMessage?.(data);
                } catch {
                    // Handle non-JSON messages
                    onMessage?.(event.data);
                }
            };
        } catch (error) {
            console.error('[WebSocket] Connection error:', error);
        }
    }, [
        url,
        protocols,
        reconnect,
        reconnectAttempts,
        reconnectInterval,
        onOpen,
        onClose,
        onError,
        onMessage,
        onReconnect,
        startHeartbeat,
        clearTimeouts,
    ]);

    // Disconnect
    const disconnect = useCallback(() => {
        clearTimeouts();
        if (wsRef.current) {
            wsRef.current.close(1000, 'Manual disconnect');
            wsRef.current = null;
        }
        setState({
            isConnected: false,
            isReconnecting: false,
            reconnectAttempt: 0,
            lastError: null,
        });
    }, [clearTimeouts]);

    // Send message
    const send = useCallback((data: unknown) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
            return true;
        }
        return false;
    }, []);

    // Auto-connect on mount
    useEffect(() => {
        connect();
        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return {
        ...state,
        connect,
        disconnect,
        send,
    };
}

// ============================================
// PRESENCE HOOK
// ============================================

interface PresenceState {
    onlineUsers: Set<string>;
    typingUsers: Map<string, string>; // conversationId -> userId
}

export function usePresence(wsUrl: string) {
    const [presence, setPresence] = useState<PresenceState>({
        onlineUsers: new Set(),
        typingUsers: new Map(),
    });

    const { send, isConnected } = useWebSocket({
        url: wsUrl,
        onMessage: (data) => {
            if (typeof data !== 'object' || data === null) return;
            const message = data as Record<string, unknown>;

            switch (message.type) {
                case 'user_online':
                    setPresence((prev) => ({
                        ...prev,
                        onlineUsers: new Set([...Array.from(prev.onlineUsers), message.userId as string]),
                    }));
                    break;
                case 'user_offline':
                    setPresence((prev) => {
                        const next = new Set(prev.onlineUsers);
                        next.delete(message.userId as string);
                        return { ...prev, onlineUsers: next };
                    });
                    break;
                case 'typing_start':
                    setPresence((prev) => {
                        const next = new Map(prev.typingUsers);
                        next.set(message.conversationId as string, message.userId as string);
                        return { ...prev, typingUsers: next };
                    });
                    break;
                case 'typing_stop':
                    setPresence((prev) => {
                        const next = new Map(prev.typingUsers);
                        next.delete(message.conversationId as string);
                        return { ...prev, typingUsers: next };
                    });
                    break;
            }
        },
    });

    const setTyping = useCallback((conversationId: string, isTyping: boolean) => {
        send({
            type: isTyping ? 'typing_start' : 'typing_stop',
            conversationId,
        });
    }, [send]);

    const isUserOnline = useCallback((userId: string) => {
        return presence.onlineUsers.has(userId);
    }, [presence.onlineUsers]);

    const getTypingUser = useCallback((conversationId: string) => {
        return presence.typingUsers.get(conversationId);
    }, [presence.typingUsers]);

    return {
        isConnected,
        onlineUsers: Array.from(presence.onlineUsers),
        setTyping,
        isUserOnline,
        getTypingUser,
    };
}

// ============================================
// EXPORTS
// ============================================

const RealtimeHooks = {
    useWebSocket,
    usePresence,
};

export default RealtimeHooks;
