import { GameHandler, GameState } from '../gameEngine.js';
import { logger } from '../../utils/logger.js';

// ============================================
// Would You Rather — Prompt Bank
// ============================================

interface WYRPrompt {
    optionA: string;
    optionB: string;
    category: 'funny' | 'philosophical' | 'social' | 'wild';
}

const WYR_PROMPTS: WYRPrompt[] = [
    // ---- Funny ----
    { optionA: 'Always have to sing instead of speak', optionB: 'Always have to dance instead of walk', category: 'funny' },
    { optionA: 'Have a permanent clown nose', optionB: 'Have permanent clown shoes', category: 'funny' },
    { optionA: 'Only be able to whisper', optionB: 'Only be able to shout', category: 'funny' },
    { optionA: 'Have fingers as long as your legs', optionB: 'Have legs as long as your fingers', category: 'funny' },
    { optionA: 'Smell like onions forever', optionB: 'Sweat maple syrup', category: 'funny' },
    { optionA: 'Have a rewind button for your life', optionB: 'Have a pause button for your life', category: 'funny' },
    { optionA: 'Accidentally "reply all" to every email', optionB: 'Accidentally like every social media post you see', category: 'funny' },
    { optionA: 'Have hiccups for the rest of your life', optionB: 'Feel like you need to sneeze but can\'t for the rest of your life', category: 'funny' },
    { optionA: 'Speak every language fluently but never read', optionB: 'Read every language fluently but never speak', category: 'funny' },
    { optionA: 'Have a personal theme song that plays everywhere', optionB: 'Have a laugh track that plays after everything you say', category: 'funny' },

    // ---- Philosophical ----
    { optionA: 'Know when you\'re going to die', optionB: 'Know how you\'re going to die', category: 'philosophical' },
    { optionA: 'Be able to change the past', optionB: 'Be able to see the future', category: 'philosophical' },
    { optionA: 'Live forever but alone', optionB: 'Live a normal lifespan surrounded by loved ones', category: 'philosophical' },
    { optionA: 'Know the absolute truth to every question', optionB: 'Always make the right decision', category: 'philosophical' },
    { optionA: 'Be the smartest person alive', optionB: 'Be the happiest person alive', category: 'philosophical' },
    { optionA: 'Experience everything once', optionB: 'Experience one perfect thing forever', category: 'philosophical' },
    { optionA: 'Have the power to read minds', optionB: 'Have the power to be invisible', category: 'philosophical' },
    { optionA: 'Relive your best day on repeat', optionB: 'Never have a bad day again', category: 'philosophical' },
    { optionA: 'Be remembered for something you didn\'t do', optionB: 'Be forgotten for something great you did', category: 'philosophical' },
    { optionA: 'Have all the money in the world but no friends', optionB: 'Have the best friends but always be broke', category: 'philosophical' },

    // ---- Social ----
    { optionA: 'Be the funniest person in the room', optionB: 'Be the most attractive person in the room', category: 'social' },
    { optionA: 'Have 1 million followers but no close friends', optionB: 'Have 5 close friends but zero followers', category: 'social' },
    { optionA: 'Always be 10 minutes late', optionB: 'Always be 20 minutes early', category: 'social' },
    { optionA: 'Only communicate through memes', optionB: 'Only communicate through song lyrics', category: 'social' },
    { optionA: 'Have your browser history made public', optionB: 'Have your text messages made public', category: 'social' },
    { optionA: 'Be famous on TikTok', optionB: 'Be famous on Wikipedia', category: 'social' },
    { optionA: 'Always have to tell the truth', optionB: 'Always have to lie', category: 'social' },
    { optionA: 'Give up your phone for a month', optionB: 'Give up your bed for a month', category: 'social' },
    { optionA: 'Have dinner with your future self', optionB: 'Have dinner with your past self', category: 'social' },
    { optionA: 'Be the host of every party', optionB: 'Be the life of every party', category: 'social' },

    // ---- Wild ----
    { optionA: 'Fight 100 duck-sized horses', optionB: 'Fight 1 horse-sized duck', category: 'wild' },
    { optionA: 'Live in a treehouse', optionB: 'Live in a houseboat', category: 'wild' },
    { optionA: 'Have a pet dragon the size of a cat', optionB: 'Have a pet cat the size of a dragon', category: 'wild' },
    { optionA: 'Be able to fly but only 2 feet off the ground', optionB: 'Be able to teleport but only 10 feet at a time', category: 'wild' },
    { optionA: 'Live in the Harry Potter universe', optionB: 'Live in the Marvel universe', category: 'wild' },
    { optionA: 'Have unlimited pizza for life', optionB: 'Have unlimited sushi for life', category: 'wild' },
    { optionA: 'Be a time traveler stuck in the past', optionB: 'Be a space traveler stuck on another planet', category: 'wild' },
    { optionA: 'Have the ability to talk to animals', optionB: 'Have the ability to speak every human language', category: 'wild' },
    { optionA: 'Live without music', optionB: 'Live without movies', category: 'wild' },
    { optionA: 'Only eat one meal a day but it\'s the best meal ever', optionB: 'Eat unlimited meals but they\'re all mediocre', category: 'wild' },
    { optionA: 'Wake up in a new random country every morning', optionB: 'Wake up 10 years in the future tomorrow', category: 'wild' },
    { optionA: 'Have a photographic memory', optionB: 'Have the ability to forget anything on command', category: 'wild' },
    { optionA: 'Be able to breathe underwater', optionB: 'Be able to survive in space', category: 'wild' },
];

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ============================================
// Would You Rather Handler
// ============================================

export const wouldYouRatherHandler: GameHandler = {
    type: 'would-you-rather',
    minPlayers: 2,
    maxPlayers: 12,
    defaultRounds: 8,

    createInitialState(settings: Record<string, unknown>): Record<string, unknown> {
        return {
            prompts: shuffleArray([...WYR_PROMPTS]),
            promptIndex: 0,
            currentPrompt: null as WYRPrompt | null,
            votes: {} as Record<string, 'A' | 'B'>,
            phase: 'waiting' as 'voting' | 'results' | 'debate' | 'waiting',
            timerDuration: settings.timerSeconds || 15,
            debateDuration: settings.debateSeconds || 20,
            enableDebate: settings.enableDebate !== false,
            roundResults: null as {
                optionA: string;
                optionB: string;
                votesA: string[];
                votesB: string[];
                percentA: number;
                percentB: number;
                majority: 'A' | 'B' | 'tie';
            } | null,
        };
    },

    onRoundStart(state: GameState): GameState {
        const prompts = state.gameData.prompts as WYRPrompt[];
        const promptIndex = state.gameData.promptIndex as number;
        const prompt = prompts[promptIndex % prompts.length];

        state.gameData.currentPrompt = prompt;
        state.gameData.votes = {};
        state.gameData.phase = 'voting';
        state.gameData.promptIndex = promptIndex + 1;
        state.gameData.roundResults = null;
        state.timerDuration = state.gameData.timerDuration as number;

        return state;
    },

    handleAction(state: GameState, playerId: string, action: string, payload: Record<string, unknown>): GameState {
        if (action === 'vote') {
            // Only allow voting during voting phase
            if (state.gameData.phase !== 'voting') return state;
            // Don't allow changing votes
            if ((state.gameData.votes as Record<string, string>)[playerId] !== undefined) return state;
            // Validate vote
            if (payload.choice !== 'A' && payload.choice !== 'B') return state;

            (state.gameData.votes as Record<string, string>)[playerId] = payload.choice as string;
        } else if (action === 'end_debate') {
            // Host can end debate early
            const player = state.players.find(p => p.id === playerId);
            if (player?.isHost && state.gameData.phase === 'debate') {
                state.gameData.phase = 'results';
            }
        }

        return state;
    },

    isRoundOver(state: GameState): boolean {
        // Round is over when all connected players have voted
        const connectedPlayers = state.players.filter(p => p.isConnected);
        const allVoted = connectedPlayers.every(p => (state.gameData.votes as Record<string, string>)[p.id] !== undefined);
        return allVoted;
    },

    getRoundResults(state: GameState): { scores: Record<string, number>; summary: Record<string, unknown> } {
        const votes = state.gameData.votes as Record<string, 'A' | 'B'>;
        const prompt = state.gameData.currentPrompt as WYRPrompt;
        const scores: Record<string, number> = {};

        // Tally votes
        const votesA: string[] = [];
        const votesB: string[] = [];

        for (const [pid, choice] of Object.entries(votes)) {
            if (choice === 'A') votesA.push(pid);
            else votesB.push(pid);
        }

        const totalVotes = votesA.length + votesB.length;
        const percentA = totalVotes > 0 ? Math.round((votesA.length / totalVotes) * 100) : 0;
        const percentB = totalVotes > 0 ? 100 - percentA : 0;

        // Determine majority
        let majority: 'A' | 'B' | 'tie' = 'tie';
        if (votesA.length > votesB.length) majority = 'A';
        else if (votesB.length > votesA.length) majority = 'B';

        // Score: +10 for majority, +5 for minority, +7 each on tie
        for (const player of state.players) {
            const vote = votes[player.id];
            if (!vote) {
                scores[player.id] = 0;
                continue;
            }

            if (majority === 'tie') {
                scores[player.id] = 7;
            } else if (vote === majority) {
                scores[player.id] = 10;
            } else {
                scores[player.id] = 5;
            }
        }

        // Build player name map for results
        const playerNameMap: Record<string, string> = {};
        const playerAvatarMap: Record<string, string | undefined> = {};
        for (const p of state.players) {
            playerNameMap[p.id] = p.name;
            playerAvatarMap[p.id] = p.avatarUrl;
        }

        const summary = {
            optionA: prompt.optionA,
            optionB: prompt.optionB,
            category: prompt.category,
            votesA: votesA.map(id => ({ id, name: playerNameMap[id], avatarUrl: playerAvatarMap[id] })),
            votesB: votesB.map(id => ({ id, name: playerNameMap[id], avatarUrl: playerAvatarMap[id] })),
            percentA,
            percentB,
            majority,
            scores,
        };

        // Store results in gameData for the client to read
        state.gameData.roundResults = summary;
        state.gameData.phase = 'results';

        return { scores, summary };
    },

    isGameOver(state: GameState): boolean {
        return state.round >= state.totalRounds;
    },
};
