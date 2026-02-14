import { logger } from '../utils/logger.js';

// ============================================
// Types
// ============================================

export interface GamePlayer {
    id: string;
    userId?: string;
    name: string;
    avatarUrl?: string;
    score: number;
    isHost: boolean;
    isConnected: boolean;
}

export interface GameState {
    code: string;
    type: string;
    status: 'lobby' | 'playing' | 'round_end' | 'finished';
    players: GamePlayer[];
    hostId: string;
    round: number;
    totalRounds: number;
    settings: Record<string, unknown>;
    gameData: Record<string, unknown>; // game-specific state
    roundStartedAt?: number;
    timerDuration?: number; // seconds
}

export interface GameHandler {
    type: string;
    minPlayers: number;
    maxPlayers: number;
    defaultRounds: number;
    createInitialState(settings: Record<string, unknown>): Record<string, unknown>;
    onRoundStart(state: GameState): GameState;
    handleAction(state: GameState, playerId: string, action: string, payload: Record<string, unknown>): GameState;
    isRoundOver(state: GameState): boolean;
    getRoundResults(state: GameState): { scores: Record<string, number>; summary: Record<string, unknown> };
    isGameOver(state: GameState): boolean;
}

// ============================================
// Game Registry
// ============================================

const gameHandlers = new Map<string, GameHandler>();
const activeGames = new Map<string, GameState>();

export function registerGameHandler(handler: GameHandler): void {
    gameHandlers.set(handler.type, handler);
    logger.info(`Game handler registered: ${handler.type}`);
}

// ============================================
// Code Generation
// ============================================

function generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, 1, I)
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure unique
    if (activeGames.has(code)) return generateCode();
    return code;
}

// ============================================
// Game Lifecycle
// ============================================

export function createGame(type: string, hostPlayer: { userId?: string; name: string; avatarUrl?: string }, settings: Record<string, unknown> = {}): GameState {
    const handler = gameHandlers.get(type);
    if (!handler) throw new Error(`Unknown game type: ${type}`);

    const code = generateCode();
    const hostId = hostPlayer.userId || `guest_${Date.now()}`;

    const state: GameState = {
        code,
        type,
        status: 'lobby',
        players: [{
            id: hostId,
            userId: hostPlayer.userId,
            name: hostPlayer.name,
            avatarUrl: hostPlayer.avatarUrl,
            score: 0,
            isHost: true,
            isConnected: true,
        }],
        hostId,
        round: 0,
        totalRounds: (settings.rounds as number) || handler.defaultRounds,
        settings,
        gameData: handler.createInitialState(settings),
    };

    activeGames.set(code, state);
    logger.info(`Game created: ${type} [${code}] by ${hostPlayer.name}`);
    return state;
}

export function joinGame(code: string, player: { userId?: string; name: string; avatarUrl?: string }): GameState {
    const state = activeGames.get(code);
    if (!state) throw new Error('Game not found');
    if (state.status !== 'lobby') throw new Error('Game already started');

    const handler = gameHandlers.get(state.type);
    if (!handler) throw new Error('Invalid game type');
    if (state.players.length >= handler.maxPlayers) throw new Error('Game is full');

    const playerId = player.userId || `guest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Check if already joined
    const existing = state.players.find(p => p.id === playerId || (player.userId && p.userId === player.userId));
    if (existing) {
        existing.isConnected = true;
        existing.name = player.name;
        return state;
    }

    state.players.push({
        id: playerId,
        userId: player.userId,
        name: player.name,
        avatarUrl: player.avatarUrl,
        score: 0,
        isHost: false,
        isConnected: true,
    });

    logger.info(`Player ${player.name} joined game [${code}]`);
    return state;
}

export function startGame(code: string, requesterId: string): GameState {
    const state = activeGames.get(code);
    if (!state) throw new Error('Game not found');
    if (state.hostId !== requesterId) throw new Error('Only the host can start the game');

    const handler = gameHandlers.get(state.type);
    if (!handler) throw new Error('Invalid game type');
    if (state.players.length < handler.minPlayers) throw new Error(`Need at least ${handler.minPlayers} players`);

    state.status = 'playing';
    state.round = 1;
    const newState = handler.onRoundStart(state);
    newState.roundStartedAt = Date.now();

    activeGames.set(code, newState);
    logger.info(`Game started: [${code}] round 1`);
    return newState;
}

export function handleGameAction(code: string, playerId: string, action: string, payload: Record<string, unknown>): { state: GameState; roundEnded: boolean; gameEnded: boolean; roundResults?: { scores: Record<string, number>; summary: Record<string, unknown> } } {
    const state = activeGames.get(code);
    if (!state) throw new Error('Game not found');
    if (state.status !== 'playing') throw new Error('Game is not in progress');

    const handler = gameHandlers.get(state.type);
    if (!handler) throw new Error('Invalid game type');

    const newState = handler.handleAction(state, playerId, action, payload);

    let roundEnded = false;
    let gameEnded = false;
    let roundResults: { scores: Record<string, number>; summary: Record<string, unknown> } | undefined = undefined;

    if (handler.isRoundOver(newState)) {
        roundEnded = true;
        roundResults = handler.getRoundResults(newState);

        // Apply scores
        for (const [pid, score] of Object.entries(roundResults.scores)) {
            const player = newState.players.find(p => p.id === pid);
            if (player) player.score += score as number;
        }

        if (handler.isGameOver(newState)) {
            gameEnded = true;
            newState.status = 'finished';
        } else {
            newState.round++;
            newState.status = 'playing';
            const nextState = handler.onRoundStart(newState);
            nextState.roundStartedAt = Date.now();
            activeGames.set(code, nextState);
            return { state: nextState, roundEnded, gameEnded, roundResults };
        }
    }

    activeGames.set(code, newState);
    return { state: newState, roundEnded, gameEnded, roundResults };
}

export function getGame(code: string): GameState | undefined {
    return activeGames.get(code);
}

export function removeGame(code: string): void {
    activeGames.delete(code);
    logger.info(`Game removed: [${code}]`);
}

export function playerDisconnect(code: string, playerId: string): GameState | undefined {
    const state = activeGames.get(code);
    if (!state) return undefined;

    const player = state.players.find(p => p.id === playerId);
    if (player) player.isConnected = false;

    // If all players disconnected, schedule cleanup
    if (state.players.every(p => !p.isConnected)) {
        setTimeout(() => {
            const current = activeGames.get(code);
            if (current && current.players.every(p => !p.isConnected)) {
                removeGame(code);
            }
        }, 60000); // Remove after 1 minute of no players
    }

    return state;
}

// ============================================
// Cleanup stale games every 10 minutes
// ============================================
setInterval(() => {
    const now = Date.now();
    const staleThreshold = 2 * 60 * 60 * 1000; // 2 hours
    for (const [code, state] of activeGames.entries()) {
        const age = now - (state.roundStartedAt || now);
        if (age > staleThreshold || (state.status === 'finished' && age > 300000)) {
            removeGame(code);
        }
    }
}, 10 * 60 * 1000);
