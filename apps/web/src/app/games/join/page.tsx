'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/lib/api';

// ============================================
// Game Join Page — Web lobby for joining games via shared link
// URL: /games/join?code=ABCDEF
// ============================================

interface Player {
    id: string;
    name: string;
    avatarUrl?: string;
    score: number;
    isHost: boolean;
    isConnected: boolean;
}

interface GameState {
    code: string;
    type: string;
    status: 'lobby' | 'playing' | 'ended';
    players: Player[];
    round: number;
    totalRounds: number;
}

export default function GameJoinPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const code = (searchParams.get('code') || '').toUpperCase();

    const [gameState, setGameState] = useState<GameState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [joining, setJoining] = useState(false);
    const [joined, setJoined] = useState(false);
    const [playerName, setPlayerName] = useState('');
    const [nameSubmitted, setNameSubmitted] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    // Check if user is authenticated
    const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
    const isAuthenticated = !!token;

    // Auto-detect display name from token
    useEffect(() => {
        if (isAuthenticated && !playerName) {
            try {
                // Try to get username from stored user data
                const userData = localStorage.getItem('0g_user');
                if (userData) {
                    const user = JSON.parse(userData);
                    setPlayerName(user.displayName || user.username || '');
                    setNameSubmitted(true);
                }
            } catch {
                // Ignore parse errors
            }
        }
    }, [isAuthenticated, playerName]);

    // Connect socket and join game
    const joinGame = useCallback(() => {
        if (!code || !playerName.trim()) return;

        setJoining(true);
        setError(null);

        const socket = io(API_URL, {
            auth: token ? { token } : {},
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 3,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            // Join the game
            socket.emit('game:join', { code, playerName: playerName.trim() }, (result: any) => {
                setJoining(false);
                if (result.success) {
                    setJoined(true);
                    setGameState(result.state);
                } else {
                    setError(result.error || 'Failed to join game. The room may no longer exist.');
                }
            });
        });

        socket.on('connect_error', () => {
            setJoining(false);
            setError('Unable to connect to game server. Please check your connection.');
        });

        // Listen for game state updates
        socket.on('game:state', (state: GameState) => {
            setGameState(state);
        });

        socket.on('game:player-joined', (data: { player: Player }) => {
            setGameState(prev => {
                if (!prev) return prev;
                const existing = prev.players.filter(p => p.id !== data.player.id);
                return { ...prev, players: [...existing, data.player] };
            });
        });

        socket.on('game:player-left', (data: { playerId: string }) => {
            setGameState(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    players: prev.players.map(p =>
                        p.id === data.playerId ? { ...p, isConnected: false } : p
                    ),
                };
            });
        });

        socket.on('game:round-start', () => {
            // Game started — show message
            setGameState(prev => prev ? { ...prev, status: 'playing' } : prev);
        });

        socket.on('game:ended', () => {
            setGameState(prev => prev ? { ...prev, status: 'ended' } : prev);
        });

        socket.on('game:error', (data: { message: string }) => {
            setError(data.message);
        });
    }, [code, playerName, token]);

    // Auto-join if authenticated user with name
    useEffect(() => {
        if (nameSubmitted && playerName && code && !joined && !joining) {
            joinGame();
        }
    }, [nameSubmitted, playerName, code, joined, joining, joinGame]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.emit('game:leave', { code });
                socketRef.current.disconnect();
            }
        };
    }, [code]);

    // No code provided
    if (!code) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="text-6xl mb-4">🎮</div>
                    <h1 className="text-2xl font-bold text-white mb-2">Join a Game</h1>
                    <p className="text-gray-400 mb-6">
                        Enter a room code to join a game, or download the 0G app for the full experience.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => router.push('/games')}
                            className="px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition font-semibold"
                        >
                            Browse Games
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Name entry for guests
    if (!nameSubmitted) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-8">
                        <div className="text-5xl mb-3">🎮</div>
                        <h1 className="text-2xl font-bold text-white mb-1">Join Game</h1>
                        <p className="text-gray-400">
                            Room: <span className="text-amber-400 font-mono font-bold tracking-widest">{code}</span>
                        </p>
                    </div>

                    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Your Display Name
                        </label>
                        <input
                            type="text"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            placeholder="Enter your name"
                            maxLength={20}
                            className="w-full px-4 py-3 bg-gray-800 text-white rounded-xl border border-gray-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition placeholder-gray-500"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && playerName.trim()) {
                                    setNameSubmitted(true);
                                }
                            }}
                        />
                        <button
                            onClick={() => {
                                if (playerName.trim()) setNameSubmitted(true);
                            }}
                            disabled={!playerName.trim()}
                            className="w-full mt-4 py-3 bg-gradient-to-r from-amber-500 to-amber-400 text-gray-900 font-bold rounded-xl hover:from-amber-400 hover:to-amber-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Join Game
                        </button>
                    </div>

                    {!isAuthenticated && (
                        <p className="text-center text-gray-500 text-sm mt-4">
                            Have an account?{' '}
                            <button
                                onClick={() => router.push(`/login?redirect=/games/join?code=${code}`)}
                                className="text-amber-400 hover:underline"
                            >
                                Sign in
                            </button>
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // Joining state
    if (joining) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-400">Joining game...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error && !joined) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="text-5xl mb-4">😕</div>
                    <h2 className="text-xl font-bold text-white mb-2">Couldn&apos;t Join</h2>
                    <p className="text-gray-400 mb-6">{error}</p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => {
                                setError(null);
                                setNameSubmitted(false);
                            }}
                            className="px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition font-semibold"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => router.push('/games')}
                            className="px-6 py-3 bg-amber-500 text-gray-900 rounded-xl hover:bg-amber-400 transition font-bold"
                        >
                            Browse Games
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Lobby view
    const connectedPlayers = gameState?.players.filter(p => p.isConnected) || [];

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                {/* Room Code Header */}
                <div className="text-center mb-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Room Code</p>
                    <p className="text-4xl font-bold text-amber-400 font-mono tracking-[0.3em]">{code}</p>
                    <p className="text-sm text-gray-500 mt-1 capitalize">
                        {gameState?.type || 'Game'} • {gameState?.status === 'playing' ? 'In Progress' : 'Waiting for players'}
                    </p>
                </div>

                {/* Game Status */}
                {gameState?.status === 'playing' && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 text-center">
                        <p className="text-amber-400 font-semibold">Game in progress!</p>
                        <p className="text-gray-400 text-sm mt-1">
                            The full game experience is available in the 0G mobile app.
                        </p>
                    </div>
                )}

                {gameState?.status === 'ended' && (
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6 text-center">
                        <p className="text-white font-semibold">Game Over!</p>
                        <p className="text-gray-400 text-sm mt-1">Thanks for playing.</p>
                    </div>
                )}

                {/* Players */}
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-300">Players</h3>
                        <span className="text-xs text-gray-500">{connectedPlayers.length} connected</span>
                    </div>
                    <div className="space-y-2">
                        {gameState?.players.map((player) => (
                            <div
                                key={player.id}
                                className={`flex items-center gap-3 p-3 rounded-xl ${
                                    player.isConnected ? 'bg-gray-800' : 'bg-gray-800/50 opacity-50'
                                }`}
                            >
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-sm font-bold text-gray-900">
                                    {player.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium text-sm truncate">{player.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {player.isHost ? '⭐ Host' : player.isConnected ? 'Ready' : 'Disconnected'}
                                    </p>
                                </div>
                                {player.isConnected && (
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                )}
                            </div>
                        ))}
                        {(!gameState?.players || gameState.players.length === 0) && (
                            <p className="text-gray-500 text-sm text-center py-4">Waiting for players...</p>
                        )}
                    </div>
                </div>

                {/* Error banner */}
                {error && joined && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Info */}
                <div className="text-center">
                    <p className="text-gray-500 text-sm">
                        For the best experience, play on the{' '}
                        <span className="text-amber-400 font-semibold">0G mobile app</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
