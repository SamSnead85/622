'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/lib/api';

// ============================================
// SOCKET.IO CLIENT HOOK
// Manages WebSocket connection with authentication
// ============================================

interface UseSocketOptions {
    autoConnect?: boolean;
}

export function useSocket(options: UseSocketOptions = {}) {
    const { autoConnect = true } = options;
    const socketRef = useRef<Socket | null>(null);
    const connectedRef = useRef(false);

    // Initialize socket connection
    useEffect(() => {
        if (!autoConnect) return;

        const token = localStorage.getItem('six22_token');
        if (!token) return;

        // Create socket connection with auth
        const socket = io(API_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
            console.log('🔌 Socket connected');
            connectedRef.current = true;
        });

        socket.on('disconnect', (reason) => {
            console.log('🔌 Socket disconnected:', reason);
            connectedRef.current = false;
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
        });

        socketRef.current = socket;

        return () => {
            socket.disconnect();
            socketRef.current = null;
            connectedRef.current = false;
        };
    }, [autoConnect]);

    // Emit event
    const emit = useCallback((event: string, data?: unknown) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit(event, data);
        }
    }, []);

    // Subscribe to event
    const on = useCallback(<T = unknown>(event: string, callback: (data: T) => void) => {
        socketRef.current?.on(event, callback as (...args: unknown[]) => void);
        return () => {
            socketRef.current?.off(event, callback as (...args: unknown[]) => void);
        };
    }, []);

    // Join a room (conversation)
    const joinRoom = useCallback((roomId: string) => {
        emit('conversation:join', roomId);
    }, [emit]);

    // Leave a room
    const leaveRoom = useCallback((roomId: string) => {
        emit('conversation:leave', roomId);
    }, [emit]);

    return {
        socket: socketRef.current,
        isConnected: connectedRef.current,
        emit,
        on,
        joinRoom,
        leaveRoom,
    };
}
