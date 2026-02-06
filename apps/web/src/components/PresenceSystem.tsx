'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

// ============================================
// TYPES
// ============================================

export interface PresenceUser {
    id: string;
    displayName: string;
    avatarUrl?: string;
    status: 'online' | 'away' | 'busy' | 'offline';
    lastSeen?: Date;
    currentActivity?: string;
}

interface PresenceState {
    isConnected: boolean;
    onlineUsers: Map<string, PresenceUser>;
    typingUsers: Map<string, Set<string>>; // roomId -> Set of userIds
}

interface PresenceContextType extends PresenceState {
    setStatus: (status: PresenceUser['status']) => void;
    setTyping: (roomId: string, isTyping: boolean) => void;
    getOnlineCount: () => number;
    isUserOnline: (userId: string) => boolean;
    getTypingUsers: (roomId: string) => string[];
}

// ============================================
// CONTEXT
// ============================================

const PresenceContext = createContext<PresenceContextType | null>(null);

export function usePresence() {
    const ctx = useContext(PresenceContext);
    if (!ctx) throw new Error('usePresence must be used within PresenceProvider');
    return ctx;
}

// ============================================
// PRESENCE PROVIDER
// ============================================

interface PresenceProviderProps {
    children: ReactNode;
    userId?: string;
}

export function PresenceProvider({ children, userId }: PresenceProviderProps) {
    const [state, setState] = useState<PresenceState>({
        isConnected: false,
        onlineUsers: new Map(),
        typingUsers: new Map(),
    });

    // Simulate WebSocket connection
    useEffect(() => {
        if (!userId) return;

        // Connect
        setState(prev => ({ ...prev, isConnected: true }));

        // In a real implementation, we would connect to a WebSocket server here
        // and listen for 'presence_update' events.

        // Cleanup on unmount
        return () => {
            setState(prev => ({ ...prev, isConnected: false }));
        };
    }, [userId]);

    const setStatus = useCallback((status: PresenceUser['status']) => {
        // TODO: Send status update to server
        // socket.emit('status_update', { status });
    }, []);

    const setTyping = useCallback((roomId: string, isTyping: boolean) => {
        setState(prev => {
            const newTyping = new Map(prev.typingUsers);
            const roomTyping = new Set(newTyping.get(roomId) || []);

            if (isTyping && userId) {
                roomTyping.add(userId);
            } else if (userId) {
                roomTyping.delete(userId);
            }

            if (roomTyping.size > 0) {
                newTyping.set(roomId, roomTyping);
            } else {
                newTyping.delete(roomId);
            }

            return { ...prev, typingUsers: newTyping };
        });
    }, [userId]);
    // ... (keeping implementation)
    // ...
    export function OnlineUsersBar({ maxShow = 5 }: OnlineUsersBarProps) {
        // Use real presence context
        let contextUsers: PresenceUser[] = [];
        try {
            const { onlineUsers } = usePresence();
            contextUsers = Array.from(onlineUsers.values());
        } catch {
            // Fallback or empty if used outside provider
        }

        const onlineUsers = contextUsers.filter(u => u.status === 'online');
        const displayUsers = onlineUsers.slice(0, maxShow);
        const remaining = onlineUsers.length - maxShow;

        if (onlineUsers.length === 0) return null; // Hide if no one is online

        return (
            <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-green-400">{onlineUsers.length}</span>
                    <span className="text-sm text-white/50">online</span>
                </div>

                <div className="flex -space-x-2">
                    {displayUsers.map((user) => (
                        <div
                            key={user.id}
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium border-2 border-[#0A0A0F]"
                            title={user.displayName}
                        >
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                user.displayName[0]
                            )}
                        </div>
                    ))}
                    {remaining > 0 && (
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-xs font-medium border-2 border-[#0A0A0F]">
                            +{remaining}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ============================================
    // ACTIVITY STATUS COMPONENT
    // ============================================

    interface ActivityStatusProps {
        activity?: string;
        lastSeen?: Date;
    }

    export function ActivityStatus({ activity, lastSeen }: ActivityStatusProps) {
        if (activity) {
            return <span className="text-xs text-cyan-400">{activity}</span>;
        }

        if (lastSeen) {
            const diff = Date.now() - lastSeen.getTime();
            const minutes = Math.floor(diff / 60000);

            let timeText;
            if (minutes < 1) {
                timeText = 'just now';
            } else if (minutes < 60) {
                timeText = `${minutes}m ago`;
            } else {
                const hours = Math.floor(minutes / 60);
                if (hours < 24) {
                    timeText = `${hours}h ago`;
                } else {
                    timeText = lastSeen.toLocaleDateString();
                }
            }

            return <span className="text-xs text-white/40">Last seen {timeText}</span>;
        }

        return null;
    }

    export default PresenceProvider;
