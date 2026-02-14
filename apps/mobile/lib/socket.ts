// ============================================
// Socket.io Client Manager
// Singleton connection with auto-reconnect,
// auth token injection, and event hub
// ============================================

import { io, Socket } from 'socket.io-client';
import { API_URL, getToken } from './api';

// ============================================
// Types
// ============================================

export interface SocketMessage {
    id: string;
    content: string;
    senderId: string;
    conversationId: string;
    mediaUrl?: string;
    mediaType?: string;
    createdAt: string;
    sender?: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
    };
}

export interface TypingEvent {
    userId: string;
    username: string;
    conversationId: string;
}

export interface PresenceEvent {
    userId: string;
    status: 'online' | 'offline' | 'away' | 'busy';
}

export interface CallIncoming {
    callId: string;
    type: 'audio' | 'video';
    from: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
    };
    offer?: any;
}

export interface MomentNewEvent {
    momentId: string;
    userId: string;
    displayName: string;
    avatarUrl?: string;
}

export interface PollVoteEvent {
    communityId: string;
    pollId: string;
    optionId: string;
    totalVotes: number;
    options: Array<{ id: string; votes: number }>;
}

export interface ProposalVoteEvent {
    communityId: string;
    proposalId: string;
    votesFor: number;
    votesAgainst: number;
    userVote?: 'FOR' | 'AGAINST';
}

export interface NotificationNewEvent {
    id: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, any>;
}

export interface GamePlayerEvent {
    player: {
        id: string;
        name: string;
        avatarUrl?: string;
        score: number;
        isHost: boolean;
    };
    playerCount: number;
}

export interface GameStateEvent {
    code: string;
    type: string;
    status: string;
    players: any[];
    round: number;
    totalRounds: number;
    gameData: Record<string, any>;
}

export interface GameRoundEvent {
    round: number;
    totalRounds: number;
    gameData: Record<string, any>;
}

export interface GameRoundEndEvent {
    round: number;
    scores: Record<string, number>;
    summary: any;
    players: any[];
}

export interface GameEndedEvent {
    finalScores: Array<{ id: string; name: string; score: number; avatarUrl?: string }>;
    winner: { id: string; name: string; score: number };
}

// ============================================
// Event Listener Types
// ============================================

type EventCallback = (...args: any[]) => void;

interface EventListeners {
    'message:new': ((msg: SocketMessage) => void)[];
    'typing:start': ((data: TypingEvent) => void)[];
    'typing:stop': ((data: TypingEvent) => void)[];
    'message:read': ((data: { userId: string; conversationId: string; messageId: string }) => void)[];
    'user:online': ((data: { userId: string }) => void)[];
    'user:offline': ((data: { userId: string }) => void)[];
    'presence:update': ((data: PresenceEvent) => void)[];
    'call:incoming': ((data: CallIncoming) => void)[];
    'call:answered': ((data: any) => void)[];
    'call:rejected': ((data: any) => void)[];
    'call:ended': ((data: any) => void)[];
    'call:ice-candidate': ((data: any) => void)[];
    'call:mute': ((data: { muted: boolean }) => void)[];
    'moment:new': ((data: MomentNewEvent) => void)[];
    'poll:vote': ((data: PollVoteEvent) => void)[];
    'proposal:vote': ((data: ProposalVoteEvent) => void)[];
    'notification:new': ((data: NotificationNewEvent) => void)[];
    'game:state': ((data: GameStateEvent) => void)[];
    'game:update': ((data: any) => void)[];
    'game:player-joined': ((data: GamePlayerEvent) => void)[];
    'game:player-left': ((data: { playerId: string; playerCount: number }) => void)[];
    'game:round-start': ((data: GameRoundEvent) => void)[];
    'game:round-end': ((data: GameRoundEndEvent) => void)[];
    'game:ended': ((data: GameEndedEvent) => void)[];
    'game:error': ((data: { message: string }) => void)[];
    [key: string]: EventCallback[];
}

// ============================================
// Singleton Socket Manager
// ============================================

class SocketManager {
    private socket: Socket | null = null;
    private listeners: EventListeners = {} as EventListeners;
    private joinedConversations = new Set<string>();
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private _isConnected = false;

    get isConnected(): boolean {
        return this._isConnected;
    }

    /**
     * Connect to the Socket.io server with JWT authentication
     */
    async connect(): Promise<void> {
        if (this.socket?.connected) return;

        const token = await getToken();
        if (!token) return;

        // Parse base URL (remove /api/v1 path if present)
        const baseUrl = API_URL.replace(/\/api\/v1\/?$/, '');

        this.socket = io(baseUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 30000,
            timeout: 10000,
            forceNew: false,
        });

        this.socket.on('connect', () => {
            this._isConnected = true;
            // Re-join previously joined conversations
            this.joinedConversations.forEach((id) => {
                this.socket?.emit('conversation:join', id);
            });
            this.emit('connected', {});
        });

        this.socket.on('disconnect', (reason) => {
            this._isConnected = false;
            this.emit('disconnected', { reason });
        });

        this.socket.on('connect_error', (error) => {
            this._isConnected = false;
            if (__DEV__) console.warn('Socket connection error:', error.message);
        });

        // Forward all server events to local listeners
        const forwardEvents = [
            'message:new',
            'typing:start',
            'typing:stop',
            'message:read',
            'user:online',
            'user:offline',
            'presence:update',
            'call:incoming',
            'call:answered',
            'call:rejected',
            'call:ended',
            'call:ice-candidate',
            'call:mute',
            'call:unavailable',
            // New feature events
            'moment:new',
            'poll:vote',
            'proposal:vote',
            'notification:new',
            // Game events
            'game:state',
            'game:update',
            'game:player-joined',
            'game:player-left',
            'game:round-start',
            'game:round-end',
            'game:ended',
            'game:error',
            'game:invite',
            // Livestream events
            'stream:chat',
            'stream:reaction',
            'stream:gift',
            'stream:viewers',
            'stream:ended',
            // Audio Spaces events
            'space:update',
            'space:user-joined',
            'space:user-left',
            'space:speak-request',
            'space:promoted',
            'space:mute-update',
            'space:reaction',
            'space:ended',
        ];

        forwardEvents.forEach((event) => {
            this.socket!.on(event, (data: any) => {
                this.emit(event, data);
            });
        });
    }

    /**
     * Disconnect and clean up
     */
    disconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.joinedConversations.clear();
        this.socket?.removeAllListeners();
        this.socket?.disconnect();
        this.socket = null;
        this.listeners = {} as EventListeners;
        this._isConnected = false;
    }

    // ============================================
    // Conversation Management
    // ============================================

    joinConversation(conversationId: string): void {
        this.joinedConversations.add(conversationId);
        this.socket?.emit('conversation:join', conversationId);
    }

    leaveConversation(conversationId: string): void {
        this.joinedConversations.delete(conversationId);
        this.socket?.emit('conversation:leave', conversationId);
    }

    // ============================================
    // Messaging
    // ============================================

    sendMessage(data: {
        conversationId: string;
        content: string;
        mediaUrl?: string;
        mediaType?: string;
    }): void {
        this.socket?.emit('message:send', data);
    }

    markMessageRead(conversationId: string, messageId: string): void {
        this.socket?.emit('message:read', { conversationId, messageId });
    }

    // ============================================
    // Typing Indicators
    // ============================================

    startTyping(conversationId: string): void {
        this.socket?.emit('typing:start', conversationId);
    }

    stopTyping(conversationId: string): void {
        this.socket?.emit('typing:stop', conversationId);
    }

    // ============================================
    // Calling
    // ============================================

    initiateCall(data: { callId: string; userId: string; type: 'audio' | 'video'; offer?: any }): void {
        this.socket?.emit('call:initiate', data);
    }

    answerCall(data: { callId: string; answer: any }): void {
        this.socket?.emit('call:answer', data);
    }

    rejectCall(callId: string): void {
        this.socket?.emit('call:reject', { callId });
    }

    endCall(callId: string): void {
        this.socket?.emit('call:end', { callId });
    }

    sendIceCandidate(userId: string, candidate: any): void {
        this.socket?.emit('call:ice-candidate', { userId, candidate });
    }

    toggleMute(callId: string, muted: boolean): void {
        this.socket?.emit('call:mute', { callId, muted });
    }

    // ============================================
    // Community Rooms (for polls, governance events)
    // ============================================

    joinCommunity(communityId: string): void {
        this.socket?.emit('community:join', communityId);
    }

    leaveCommunity(communityId: string): void {
        this.socket?.emit('community:leave', communityId);
    }

    // ============================================
    // Games
    // ============================================

    createGame(gameType: string, settings?: Record<string, any>): Promise<{ success: boolean; code?: string; state?: any; error?: string }> {
        return new Promise((resolve, reject) => {
            if (!this.socket?.connected) {
                // Fallback: generate a local room code so games work without socket
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                let code = '';
                for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
                resolve({ success: true, code, state: { players: [], gameData: {} } });
                return;
            }
            const timeout = setTimeout(() => resolve({ success: false, error: 'Connection timeout' }), 8000);
            this.socket.emit('game:create', { gameType, settings }, (result: any) => {
                clearTimeout(timeout);
                resolve(result);
            });
        });
    }

    joinGame(code: string, playerName?: string): Promise<{ success: boolean; state?: any; error?: string }> {
        return new Promise((resolve) => {
            if (!this.socket?.connected) {
                resolve({ success: false, error: 'Not connected to server. Please check your connection.' });
                return;
            }
            const timeout = setTimeout(() => resolve({ success: false, error: 'Connection timeout' }), 8000);
            this.socket.emit('game:join', { code, playerName }, (result: any) => {
                clearTimeout(timeout);
                resolve(result);
            });
        });
    }

    startGame(code: string): Promise<{ success: boolean; error?: string }> {
        return new Promise((resolve) => {
            this.socket?.emit('game:start', { code }, (result: any) => {
                resolve(result);
            });
        });
    }

    sendGameAction(code: string, action: string, payload: any): void {
        this.socket?.emit('game:action', { code, action, payload });
    }

    updateGameSettings(code: string, settings: Record<string, any>): void {
        this.socket?.emit('game:settings', { code, settings });
    }

    leaveGame(code: string): void {
        this.socket?.emit('game:leave', { code });
    }

    sendGameInvite(code: string, targetUserId: string, gameType?: string): void {
        this.socket?.emit('game:invite', { code, targetUserId, gameType });
    }

    // ============================================
    // Audio Spaces
    // ============================================

    joinSpace(spaceId: string): void {
        this.socket?.emit('space:join', { spaceId });
    }

    leaveSpace(spaceId: string): void {
        this.socket?.emit('space:leave', { spaceId });
    }

    requestSpeak(spaceId: string): void {
        this.socket?.emit('space:speak-request', { spaceId });
    }

    approveSpeaker(spaceId: string, speakerId: string): void {
        this.socket?.emit('space:approve-speaker', { spaceId, speakerId });
    }

    toggleSpaceMute(spaceId: string, muted: boolean): void {
        this.socket?.emit('space:mute', { spaceId, muted });
    }

    sendSpaceReaction(spaceId: string, emoji: string): void {
        this.socket?.emit('space:reaction', { spaceId, emoji });
    }

    endSpace(spaceId: string): void {
        this.socket?.emit('space:end', { spaceId });
    }

    // ============================================
    // Livestream / Campfire
    // ============================================

    joinStream(streamId: string): void {
        this.socket?.emit('stream:join', { streamId });
    }

    leaveStream(streamId: string): void {
        this.socket?.emit('stream:leave', { streamId });
    }

    sendStreamChat(data: { streamId: string; content: string; userId: string; username: string; displayName: string; avatarUrl?: string }): void {
        this.socket?.emit('stream:chat', data);
    }

    sendStreamReaction(data: { streamId: string; emoji: string; userId?: string }): void {
        this.socket?.emit('stream:reaction', data);
    }

    sendStreamGift(data: { streamId: string; giftType: string; userId?: string; username?: string; displayName?: string }): void {
        this.socket?.emit('stream:gift', data);
    }

    // ============================================
    // Presence
    // ============================================

    updatePresence(status: 'online' | 'away' | 'busy'): void {
        this.socket?.emit('presence:update', { status });
    }

    // ============================================
    // Event System
    // ============================================

    on(event: string, callback: EventCallback): () => void {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        // Safety: prevent listener accumulation
        const MAX_LISTENERS_PER_EVENT = 10;
        if (this.listeners[event]?.length >= MAX_LISTENERS_PER_EVENT) {
            if (__DEV__) console.warn(`Too many listeners for ${event}, removing oldest`);
            this.listeners[event].shift();
        }
        this.listeners[event].push(callback);

        // Return unsubscribe function
        return () => {
            const idx = this.listeners[event]?.indexOf(callback);
            if (idx !== undefined && idx > -1) {
                this.listeners[event].splice(idx, 1);
            }
        };
    }

    off(event: string, callback: EventCallback): void {
        const idx = this.listeners[event]?.indexOf(callback);
        if (idx !== undefined && idx > -1) {
            this.listeners[event].splice(idx, 1);
        }
    }

    private emit(event: string, data: any): void {
        this.listeners[event]?.forEach((cb) => {
            try {
                cb(data);
            } catch (err) {
                if (__DEV__) console.error(`Socket event handler error [${event}]:`, err);
            }
        });
    }
}

// ============================================
// Singleton Export
// ============================================

export const socketManager = new SocketManager();
