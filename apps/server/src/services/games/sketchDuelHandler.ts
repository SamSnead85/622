import { GameHandler, GameState } from '../gameEngine.js';
import { logger } from '../../utils/logger.js';

// ============================================
// Sketch Duel — Pictionary-style Drawing Game
// ============================================

// ============================================
// Word Bank (100+ words across categories)
// ============================================

interface DrawWord {
    word: string;
    category: string;
    difficulty: 'easy' | 'medium';
}

const WORD_BANK: DrawWord[] = [
    // ---- Animals (20) ----
    { word: 'cat', category: 'animals', difficulty: 'easy' },
    { word: 'dog', category: 'animals', difficulty: 'easy' },
    { word: 'elephant', category: 'animals', difficulty: 'easy' },
    { word: 'giraffe', category: 'animals', difficulty: 'easy' },
    { word: 'penguin', category: 'animals', difficulty: 'easy' },
    { word: 'butterfly', category: 'animals', difficulty: 'easy' },
    { word: 'dolphin', category: 'animals', difficulty: 'easy' },
    { word: 'snake', category: 'animals', difficulty: 'easy' },
    { word: 'octopus', category: 'animals', difficulty: 'medium' },
    { word: 'kangaroo', category: 'animals', difficulty: 'medium' },
    { word: 'flamingo', category: 'animals', difficulty: 'medium' },
    { word: 'chameleon', category: 'animals', difficulty: 'medium' },
    { word: 'jellyfish', category: 'animals', difficulty: 'medium' },
    { word: 'peacock', category: 'animals', difficulty: 'medium' },
    { word: 'lobster', category: 'animals', difficulty: 'medium' },
    { word: 'parrot', category: 'animals', difficulty: 'easy' },
    { word: 'turtle', category: 'animals', difficulty: 'easy' },
    { word: 'spider', category: 'animals', difficulty: 'easy' },
    { word: 'whale', category: 'animals', difficulty: 'easy' },
    { word: 'unicorn', category: 'animals', difficulty: 'medium' },

    // ---- Food (20) ----
    { word: 'pizza', category: 'food', difficulty: 'easy' },
    { word: 'hamburger', category: 'food', difficulty: 'easy' },
    { word: 'ice cream', category: 'food', difficulty: 'easy' },
    { word: 'sushi', category: 'food', difficulty: 'easy' },
    { word: 'taco', category: 'food', difficulty: 'easy' },
    { word: 'pancake', category: 'food', difficulty: 'easy' },
    { word: 'watermelon', category: 'food', difficulty: 'easy' },
    { word: 'cupcake', category: 'food', difficulty: 'easy' },
    { word: 'popcorn', category: 'food', difficulty: 'easy' },
    { word: 'banana', category: 'food', difficulty: 'easy' },
    { word: 'spaghetti', category: 'food', difficulty: 'medium' },
    { word: 'avocado', category: 'food', difficulty: 'medium' },
    { word: 'donut', category: 'food', difficulty: 'easy' },
    { word: 'french fries', category: 'food', difficulty: 'easy' },
    { word: 'sandwich', category: 'food', difficulty: 'easy' },
    { word: 'broccoli', category: 'food', difficulty: 'medium' },
    { word: 'chocolate', category: 'food', difficulty: 'easy' },
    { word: 'cookie', category: 'food', difficulty: 'easy' },
    { word: 'pineapple', category: 'food', difficulty: 'easy' },
    { word: 'burrito', category: 'food', difficulty: 'medium' },

    // ---- Objects (25) ----
    { word: 'umbrella', category: 'objects', difficulty: 'easy' },
    { word: 'guitar', category: 'objects', difficulty: 'easy' },
    { word: 'telescope', category: 'objects', difficulty: 'medium' },
    { word: 'headphones', category: 'objects', difficulty: 'easy' },
    { word: 'bicycle', category: 'objects', difficulty: 'easy' },
    { word: 'camera', category: 'objects', difficulty: 'easy' },
    { word: 'scissors', category: 'objects', difficulty: 'easy' },
    { word: 'candle', category: 'objects', difficulty: 'easy' },
    { word: 'trophy', category: 'objects', difficulty: 'easy' },
    { word: 'rocket', category: 'objects', difficulty: 'easy' },
    { word: 'diamond', category: 'objects', difficulty: 'easy' },
    { word: 'compass', category: 'objects', difficulty: 'medium' },
    { word: 'hourglass', category: 'objects', difficulty: 'medium' },
    { word: 'lighthouse', category: 'objects', difficulty: 'medium' },
    { word: 'parachute', category: 'objects', difficulty: 'medium' },
    { word: 'backpack', category: 'objects', difficulty: 'easy' },
    { word: 'balloon', category: 'objects', difficulty: 'easy' },
    { word: 'crown', category: 'objects', difficulty: 'easy' },
    { word: 'sword', category: 'objects', difficulty: 'easy' },
    { word: 'treasure chest', category: 'objects', difficulty: 'medium' },
    { word: 'microphone', category: 'objects', difficulty: 'easy' },
    { word: 'sunglasses', category: 'objects', difficulty: 'easy' },
    { word: 'ladder', category: 'objects', difficulty: 'easy' },
    { word: 'anchor', category: 'objects', difficulty: 'medium' },
    { word: 'bowtie', category: 'objects', difficulty: 'medium' },

    // ---- Actions (20) ----
    { word: 'dancing', category: 'actions', difficulty: 'easy' },
    { word: 'swimming', category: 'actions', difficulty: 'easy' },
    { word: 'cooking', category: 'actions', difficulty: 'easy' },
    { word: 'sleeping', category: 'actions', difficulty: 'easy' },
    { word: 'fishing', category: 'actions', difficulty: 'easy' },
    { word: 'surfing', category: 'actions', difficulty: 'medium' },
    { word: 'juggling', category: 'actions', difficulty: 'medium' },
    { word: 'skydiving', category: 'actions', difficulty: 'medium' },
    { word: 'painting', category: 'actions', difficulty: 'easy' },
    { word: 'running', category: 'actions', difficulty: 'easy' },
    { word: 'sneezing', category: 'actions', difficulty: 'medium' },
    { word: 'yawning', category: 'actions', difficulty: 'medium' },
    { word: 'climbing', category: 'actions', difficulty: 'easy' },
    { word: 'singing', category: 'actions', difficulty: 'easy' },
    { word: 'flying', category: 'actions', difficulty: 'easy' },
    { word: 'bowling', category: 'actions', difficulty: 'easy' },
    { word: 'skateboarding', category: 'actions', difficulty: 'medium' },
    { word: 'wrestling', category: 'actions', difficulty: 'medium' },
    { word: 'laughing', category: 'actions', difficulty: 'easy' },
    { word: 'waving', category: 'actions', difficulty: 'easy' },

    // ---- Places (20) ----
    { word: 'beach', category: 'places', difficulty: 'easy' },
    { word: 'castle', category: 'places', difficulty: 'easy' },
    { word: 'volcano', category: 'places', difficulty: 'medium' },
    { word: 'hospital', category: 'places', difficulty: 'easy' },
    { word: 'library', category: 'places', difficulty: 'easy' },
    { word: 'airport', category: 'places', difficulty: 'medium' },
    { word: 'museum', category: 'places', difficulty: 'medium' },
    { word: 'pyramid', category: 'places', difficulty: 'easy' },
    { word: 'igloo', category: 'places', difficulty: 'easy' },
    { word: 'haunted house', category: 'places', difficulty: 'medium' },
    { word: 'circus', category: 'places', difficulty: 'medium' },
    { word: 'playground', category: 'places', difficulty: 'easy' },
    { word: 'farm', category: 'places', difficulty: 'easy' },
    { word: 'jungle', category: 'places', difficulty: 'easy' },
    { word: 'space station', category: 'places', difficulty: 'medium' },
    { word: 'waterfall', category: 'places', difficulty: 'easy' },
    { word: 'desert', category: 'places', difficulty: 'easy' },
    { word: 'island', category: 'places', difficulty: 'easy' },
    { word: 'cave', category: 'places', difficulty: 'easy' },
    { word: 'roller coaster', category: 'places', difficulty: 'medium' },
];

// ============================================
// Helpers
// ============================================

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function normalizeGuess(text: string): string {
    return text.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '');
}

// ============================================
// Sketch Duel Handler
// ============================================

export const sketchDuelHandler: GameHandler = {
    type: 'sketch-duel',
    minPlayers: 3,
    maxPlayers: 8,
    defaultRounds: 0, // Will be set based on player count

    createInitialState(settings: Record<string, unknown>): Record<string, unknown> {
        return {
            words: shuffleArray([...WORD_BANK]),
            wordIndex: 0,
            artistIndex: 0,
            artistId: null,
            _private_currentWord: null,
            currentWordHint: null, // e.g. "_ _ _ _ _" letter count hint
            currentCategory: null,
            strokes: [] as Array<{ points: Array<{ x: number; y: number }>; color: string; width: number }>,
            guesses: [] as Array<{ playerId: string; playerName: string; text: string; isCorrect: boolean; timestamp: number }>,
            correctGuessers: [] as Array<{ playerId: string; playerName: string; order: number; timestamp: number }>,
            phase: 'waiting' as 'waiting' | 'drawing' | 'reveal',
            timerDuration: settings.timerSeconds || 60,
            roundScores: {} as Record<string, number>,
        };
    },

    onRoundStart(state: GameState): GameState {
        // Set total rounds: each player draws once (or twice if few players)
        if (state.totalRounds === 0 || state.round === 1) {
            const playerCount = state.players.length;
            // Each player draws at least once; if 3 players, each draws twice (6 rounds)
            state.totalRounds = playerCount <= 4 ? playerCount * 2 : playerCount;
        }

        const artistIndex = (state.round - 1) % state.players.length;
        const artist = state.players[artistIndex];

        // Pick a word
        const words = state.gameData.words as DrawWord[];
        const wordIndex = state.gameData.wordIndex as number;
        const wordEntry = words[wordIndex % words.length];

        // Generate hint (letter count with spaces preserved)
        const hint = wordEntry.word
            .split('')
            .map((ch: string) => (ch === ' ' ? '  ' : '_'))
            .join(' ');

        state.gameData.artistIndex = artistIndex;
        state.gameData.artistId = artist.id;
        state.gameData._private_currentWord = wordEntry.word;
        state.gameData.currentWordHint = hint;
        state.gameData.currentCategory = wordEntry.category;
        state.gameData.strokes = [];
        state.gameData.guesses = [];
        state.gameData.correctGuessers = [];
        state.gameData.phase = 'drawing';
        state.gameData.roundScores = {};
        state.gameData.wordIndex = wordIndex + 1;
        state.timerDuration = state.gameData.timerDuration as number;

        // Store artist-specific data (the word to draw)
        state.gameData[`_player_${artist.id}`] = {
            isArtist: true,
            word: wordEntry.word,
            category: wordEntry.category,
        };

        logger.info(`Sketch Duel [${state.code}] round ${state.round}: artist=${artist.name}, word="${wordEntry.word}"`);

        return state;
    },

    handleAction(state: GameState, playerId: string, action: string, payload: Record<string, unknown>): GameState {
        const artistId = state.gameData.artistId as string;
        const _private_currentWord = state.gameData._private_currentWord as string;

        if (action === 'sketch:draw') {
            // Only the artist can draw
            if (playerId !== artistId) return state;
            if (state.gameData.phase !== 'drawing') return state;

            // Validate stroke data
            const stroke = payload?.stroke as Record<string, unknown> | undefined;
            if (!stroke) return state;
            const strokePoints = stroke.points;
            if (!Array.isArray(strokePoints) || strokePoints.length === 0) return state;

            // Sanitize stroke data
            const sanitizedStroke = {
                points: (strokePoints as Array<Record<string, unknown>>).slice(0, 500).map((p) => ({
                    x: typeof p.x === 'number' ? p.x : 0,
                    y: typeof p.y === 'number' ? p.y : 0,
                })),
                color: typeof stroke.color === 'string' ? stroke.color : '#FFFFFF',
                width: typeof stroke.width === 'number' ? Math.min(Math.max(stroke.width, 1), 20) : 3,
            };

            state.gameData.strokes = [...(state.gameData.strokes as Array<unknown>), sanitizedStroke];
            return state;

        } else if (action === 'sketch:clear') {
            // Only the artist can clear
            if (playerId !== artistId) return state;
            if (state.gameData.phase !== 'drawing') return state;

            state.gameData.strokes = [];
            return state;

        } else if (action === 'sketch:guess') {
            // Artist cannot guess
            if (playerId === artistId) return state;
            if (state.gameData.phase !== 'drawing') return state;

            const guessText = typeof payload?.text === 'string' ? payload.text.trim() : '';
            if (!guessText || guessText.length > 100) return state;

            // Check if player already guessed correctly
            const alreadyCorrect = (state.gameData.correctGuessers as Array<{ playerId: string }>).some(
                (g) => g.playerId === playerId,
            );
            if (alreadyCorrect) return state;

            const player = state.players.find(p => p.id === playerId);
            const playerName = player?.name || 'Player';

            // Check if guess is correct
            const isCorrect = normalizeGuess(guessText) === normalizeGuess(_private_currentWord as string);

            // Add to guesses feed (for chat display)
            const guess = {
                playerId,
                playerName,
                text: isCorrect ? '✓ Guessed correctly!' : guessText,
                isCorrect,
                timestamp: Date.now(),
            };
            state.gameData.guesses = [...(state.gameData.guesses as Array<unknown>), guess];

            if (isCorrect) {
                const order = (state.gameData.correctGuessers as Array<unknown>).length + 1;
                state.gameData.correctGuessers = [
                    ...(state.gameData.correctGuessers as Array<unknown>),
                    { playerId, playerName, order, timestamp: Date.now() },
                ];

                // Calculate guesser score based on order
                let guesserScore: number;
                switch (order) {
                    case 1: guesserScore = 25; break;
                    case 2: guesserScore = 20; break;
                    case 3: guesserScore = 15; break;
                    default: guesserScore = 10; break;
                }

                // Artist gets +5 per correct guesser
                const artistScore = 5;

                const roundScores = state.gameData.roundScores as Record<string, number>;
                roundScores[playerId] = (roundScores[playerId] || 0) + guesserScore;
                roundScores[artistId] = (roundScores[artistId] || 0) + artistScore;

                logger.info(`Sketch Duel [${state.code}]: ${playerName} guessed correctly (order: ${order}, +${guesserScore}pts)`);
            }

            return state;

        } else if (action === 'sketch:timeout') {
            // Timer expired — force round end
            if (state.gameData.phase !== 'drawing') return state;
            state.gameData.phase = 'reveal';
            return state;
        }

        return state;
    },

    isRoundOver(state: GameState): boolean {
        if (state.gameData.phase === 'reveal') return true;

        // Round is over if all non-artist players have guessed correctly
        const nonArtistPlayers = state.players.filter(
            p => p.id !== state.gameData.artistId && p.isConnected,
        );
        const allGuessed = nonArtistPlayers.length > 0 && nonArtistPlayers.every(
            p => (state.gameData.correctGuessers as Array<{ playerId: string }>).some(
                (g) => g.playerId === p.id,
            ),
        );

        return allGuessed;
    },

    getRoundResults(state: GameState): { scores: Record<string, number>; summary: Record<string, unknown> } {
        const scores: Record<string, number> = { ...(state.gameData.roundScores as Record<string, number>) };

        // Ensure all players have a score entry
        for (const player of state.players) {
            if (scores[player.id] === undefined) {
                scores[player.id] = 0;
            }
        }

        const artist = state.players.find(p => p.id === state.gameData.artistId);

        return {
            scores,
            summary: {
                word: state.gameData._private_currentWord,
                category: state.gameData.currentCategory,
                artist: artist ? { id: artist.id, name: artist.name } : null,
                correctGuessers: state.gameData.correctGuessers,
                totalGuesses: (state.gameData.guesses as Array<unknown>).length,
            },
        };
    },

    isGameOver(state: GameState): boolean {
        return state.round >= state.totalRounds;
    },
};
