import { Server as SocketServer, Socket } from 'socket.io';
import { createGame, joinGame, startGame, handleGameAction, getGame, removeGame, playerDisconnect, GameState } from '../services/gameEngine.js';
import { logger } from '../utils/logger.js';

interface AuthenticatedSocket extends Socket {
    userId?: string;
    username?: string;
}

// Track which game room each socket is in
const socketGameMap = new Map<string, string>(); // socketId -> gameCode

// Clean up abandoned games every 5 minutes
setInterval(() => {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    const seen = new Set<string>();

    for (const [socketId, code] of socketGameMap.entries()) {
        seen.add(code);
    }

    let cleaned = 0;
    for (const code of seen) {
        const game = getGame(code);
        if (!game) {
            // Game already removed from engine — prune stale socketGameMap entries
            for (const [socketId, c] of socketGameMap.entries()) {
                if (c === code) socketGameMap.delete(socketId);
            }
            cleaned++;
            continue;
        }
        // Use roundStartedAt as last-activity proxy; fall back to 0 (treat as stale)
        const lastActivity = game.roundStartedAt || 0;
        if (now - lastActivity > ONE_HOUR && game.status !== 'playing') {
            removeGame(code);
            for (const [socketId, c] of socketGameMap.entries()) {
                if (c === code) socketGameMap.delete(socketId);
            }
            cleaned++;
        }
    }
    if (cleaned > 0) {
        logger.info(`Game cleanup: removed ${cleaned} abandoned game(s)`);
    }
}, 5 * 60 * 1000);

function sanitizeStateForPlayer(state: GameState, playerId: string): any {
    // Remove private game data that shouldn't be visible to all players
    const { gameData, ...publicState } = state;
    const safeGameData: Record<string, any> = { ...gameData };
    // Remove fields that start with '_private_' or '_secret_'
    for (const key of Object.keys(safeGameData)) {
        if (key.startsWith('_private_') || key.startsWith('_secret_')) {
            delete safeGameData[key];
        }
    }
    // Include player-specific private data
    const playerPrivateKey = `_player_${playerId}`;
    if (gameData[playerPrivateKey]) {
        safeGameData.myData = gameData[playerPrivateKey];
    }
    return { ...publicState, gameData: safeGameData };
}

export function setupGameSocketHandlers(io: SocketServer, socket: AuthenticatedSocket, userId: string, username: string) {
    // Create a new game
    socket.on('game:create', (data: { gameType: string; settings?: Record<string, any> }, callback?: (result: any) => void) => {
        try {
            const state = createGame(data.gameType, {
                userId,
                name: username || 'Host',
            }, data.settings || {});

            socket.join(`game:${state.code}`);
            socketGameMap.set(socket.id, state.code);

            if (typeof callback === 'function') {
                callback({ success: true, code: state.code, state: sanitizeStateForPlayer(state, userId) });
            }
        } catch (error: any) {
            logger.error('game:create error:', error);
            if (typeof callback === 'function') {
                callback({ success: false, error: error.message });
            }
        }
    });

    // Invite a user to a game (sends real-time notification)
    socket.on('game:invite', (data: { code: string; targetUserId: string; gameType?: string }, callback?: (result: any) => void) => {
        try {
            const game = getGame(data.code);
            if (!game) {
                if (typeof callback === 'function') callback({ success: false, error: 'Game not found' });
                return;
            }
            // Send invite to the target user's personal room
            io.to(`user:${data.targetUserId}`).emit('game:invite', {
                code: data.code,
                gameType: game.type || data.gameType || 'game',
                hostName: username || 'Someone',
            });
            if (typeof callback === 'function') callback({ success: true });
        } catch (error: any) {
            logger.error('game:invite error:', error);
            if (typeof callback === 'function') callback({ success: false, error: error.message });
        }
    });

    // Join an existing game
    socket.on('game:join', (data: { code: string; playerName?: string }, callback?: (result: any) => void) => {
        try {
            const code = data.code.toUpperCase().trim();
            const state = joinGame(code, {
                userId,
                name: data.playerName || username || 'Player',
            });

            socket.join(`game:${code}`);
            socketGameMap.set(socket.id, code);

            // Notify all players
            io.to(`game:${code}`).emit('game:player-joined', {
                player: state.players[state.players.length - 1],
                playerCount: state.players.length,
            });

            // Send full state to the joining player
            if (typeof callback === 'function') {
                callback({ success: true, state: sanitizeStateForPlayer(state, userId) });
            }

            // Broadcast updated state to all
            for (const player of state.players) {
                const pid = player.id;
                io.to(`game:${code}`).emit('game:state', sanitizeStateForPlayer(state, pid));
            }
        } catch (error: any) {
            logger.error('game:join error:', error);
            if (typeof callback === 'function') {
                callback({ success: false, error: error.message });
            }
        }
    });

    // Start the game (host only)
    socket.on('game:start', (data: { code: string }, callback?: (result: any) => void) => {
        try {
            const state = startGame(data.code, userId);

            // Send round start to all players
            io.to(`game:${data.code}`).emit('game:round-start', {
                round: state.round,
                totalRounds: state.totalRounds,
                gameData: state.gameData,
            });

            // Send personalized state to each player
            for (const player of state.players) {
                const sState = sanitizeStateForPlayer(state, player.id);
                io.to(`game:${data.code}`).emit('game:state', sState);
            }

            if (typeof callback === 'function') {
                callback({ success: true });
            }
        } catch (error: any) {
            logger.error('game:start error:', error);
            if (typeof callback === 'function') {
                callback({ success: false, error: error.message });
            }
        }
    });

    // Send a game action
    socket.on('game:action', (data: { code: string; action: string; payload: any }) => {
        try {
            const playerId = userId;
            const { state, roundEnded, gameEnded, roundResults } = handleGameAction(
                data.code, playerId, data.action, data.payload
            );

            // Broadcast state update
            io.to(`game:${data.code}`).emit('game:update', {
                gameData: state.gameData,
                players: state.players,
                round: state.round,
            });

            if (roundEnded) {
                io.to(`game:${data.code}`).emit('game:round-end', {
                    round: state.round - (gameEnded ? 0 : 1),
                    scores: roundResults.scores,
                    summary: roundResults.summary,
                    players: state.players,
                });

                if (gameEnded) {
                    const finalScores = state.players
                        .map(p => ({ id: p.id, name: p.name, score: p.score, avatarUrl: p.avatarUrl }))
                        .sort((a, b) => b.score - a.score);

                    io.to(`game:${data.code}`).emit('game:ended', {
                        finalScores,
                        winner: finalScores[0],
                    });

                    // Clean up after 5 minutes
                    setTimeout(() => removeGame(data.code), 5 * 60 * 1000);
                } else {
                    // Next round auto-starts
                    io.to(`game:${data.code}`).emit('game:round-start', {
                        round: state.round,
                        totalRounds: state.totalRounds,
                        gameData: state.gameData,
                    });
                }
            }
        } catch (error: any) {
            logger.error('game:action error:', error);
            socket.emit('game:error', { message: error.message });
        }
    });

    // Leave a game
    socket.on('game:leave', (data: { code: string }) => {
        try {
            socket.leave(`game:${data.code}`);
            socketGameMap.delete(socket.id);
            const state = playerDisconnect(data.code, userId);
            if (state) {
                io.to(`game:${data.code}`).emit('game:player-left', {
                    playerId: userId,
                    playerCount: state.players.filter(p => p.isConnected).length,
                });
            }
        } catch (error: any) {
            logger.error('game:leave error:', error);
        }
    });

    // Handle disconnect - clean up game rooms
    socket.on('disconnect', () => {
        const gameCode = socketGameMap.get(socket.id);
        if (gameCode) {
            socketGameMap.delete(socket.id);
            const state = playerDisconnect(gameCode, userId);
            if (state) {
                io.to(`game:${gameCode}`).emit('game:player-left', {
                    playerId: userId,
                    playerCount: state.players.filter(p => p.isConnected).length,
                });
            }
        }
    });
}
