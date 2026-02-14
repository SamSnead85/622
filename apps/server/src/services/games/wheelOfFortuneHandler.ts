import { GameHandler, GameState } from '../gameEngine.js';

// ============================================
// Puzzle Packs
// ============================================

interface Puzzle {
    phrase: string;
    category: string;
}

const PUZZLE_PACKS: Record<string, Puzzle[]> = {
    phrases: [
        { phrase: 'ACTIONS SPEAK LOUDER THAN WORDS', category: 'Phrase' },
        { phrase: 'EVERY CLOUD HAS A SILVER LINING', category: 'Phrase' },
        { phrase: 'THE EARLY BIRD CATCHES THE WORM', category: 'Phrase' },
        { phrase: 'PRACTICE MAKES PERFECT', category: 'Phrase' },
        { phrase: 'KNOWLEDGE IS POWER', category: 'Phrase' },
        { phrase: 'TIME HEALS ALL WOUNDS', category: 'Phrase' },
        { phrase: 'BETTER LATE THAN NEVER', category: 'Phrase' },
        { phrase: 'TWO HEADS ARE BETTER THAN ONE', category: 'Phrase' },
    ],
    places: [
        { phrase: 'THE GRAND CANYON', category: 'Place' },
        { phrase: 'STATUE OF LIBERTY', category: 'Place' },
        { phrase: 'GREAT BARRIER REEF', category: 'Place' },
        { phrase: 'MACHU PICCHU PERU', category: 'Place' },
        { phrase: 'NIAGARA FALLS', category: 'Place' },
        { phrase: 'MOUNT EVEREST BASE CAMP', category: 'Place' },
        { phrase: 'THE COLOSSEUM IN ROME', category: 'Place' },
        { phrase: 'GOLDEN GATE BRIDGE', category: 'Place' },
    ],
    people: [
        { phrase: 'ALBERT EINSTEIN', category: 'Person' },
        { phrase: 'LEONARDO DA VINCI', category: 'Person' },
        { phrase: 'NELSON MANDELA', category: 'Person' },
        { phrase: 'MARIE CURIE', category: 'Person' },
        { phrase: 'MUHAMMAD ALI', category: 'Person' },
        { phrase: 'MALALA YOUSAFZAI', category: 'Person' },
        { phrase: 'NIKOLA TESLA', category: 'Person' },
        { phrase: 'ROSA PARKS', category: 'Person' },
    ],
    things: [
        { phrase: 'CHOCOLATE CHIP COOKIES', category: 'Thing' },
        { phrase: 'NORTHERN LIGHTS', category: 'Thing' },
        { phrase: 'ARTIFICIAL INTELLIGENCE', category: 'Thing' },
        { phrase: 'SOLAR ECLIPSE', category: 'Thing' },
        { phrase: 'ELECTRIC GUITAR', category: 'Thing' },
        { phrase: 'DIAMOND RING', category: 'Thing' },
        { phrase: 'SHOOTING STAR', category: 'Thing' },
        { phrase: 'ROLLER COASTER', category: 'Thing' },
    ],
    islamic: [
        { phrase: 'BISMILLAH AL RAHMAN AL RAHEEM', category: 'Islamic Term' },
        { phrase: 'MASJID AL HARAM', category: 'Islamic Place' },
        { phrase: 'LAYLAT AL QADR', category: 'Islamic Term' },
        { phrase: 'SALADIN THE GREAT', category: 'Islamic Figure' },
        { phrase: 'THE DOME OF THE ROCK', category: 'Islamic Place' },
        { phrase: 'RAMADAN MUBARAK', category: 'Islamic Term' },
        { phrase: 'HAJJ PILGRIMAGE', category: 'Islamic Term' },
        { phrase: 'AL AQSA MOSQUE', category: 'Islamic Place' },
    ],
};

// Wheel segments
const WHEEL_SEGMENTS = [
    100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
    150, 250, 350, 450, 550, 650, 750, 850, 950,
    2500, // Jackpot
    -1,   // Bankrupt
    -2,   // Lose a Turn
    500, 300, 400, 600, 200, 800,
];

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export const wheelOfFortuneHandler: GameHandler = {
    type: 'wheel-of-fortune',
    minPlayers: 2,
    maxPlayers: 8,
    defaultRounds: 4, // 4 puzzles

    createInitialState(settings: Record<string, unknown>): Record<string, unknown> {
        // Gather puzzles from all packs or selected pack
        const pack = (settings.pack as string) || 'all';
        let allPuzzles: Puzzle[] = [];
        if (pack === 'all') {
            for (const puzzles of Object.values(PUZZLE_PACKS)) {
                allPuzzles.push(...puzzles);
            }
        } else {
            allPuzzles = PUZZLE_PACKS[pack] || PUZZLE_PACKS.phrases;
        }
        
        const puzzles = shuffleArray(allPuzzles).slice(0, (settings.rounds as number) || 4);

        return {
            puzzles,
            currentPuzzleIndex: 0,
            revealedLetters: [] as string[],
            currentPhrase: '',
            currentCategory: '',
            currentPlayerIndex: 0,
            lastSpinValue: 0,
            roundScores: {} as Record<string, number>, // Per-round bank (resets each puzzle)
            phase: 'spinning', // 'spinning' | 'choosing_letter' | 'solving' | 'round_result'
            wheelSegments: WHEEL_SEGMENTS,
            consonantsLeft: 'BCDFGHJKLMNPQRSTVWXYZ'.split(''),
            vowelsLeft: 'AEIOU'.split(''),
            hostMode: true,
            timerDuration: 15,
        };
    },

    onRoundStart(state: GameState): GameState {
        const puzzles = state.gameData.puzzles as Puzzle[];
        const idx = state.round - 1;
        
        if (idx >= puzzles.length) {
            state.status = 'finished';
            return state;
        }

        const puzzle = puzzles[idx];
        state.gameData.currentPhrase = puzzle.phrase;
        state.gameData.currentCategory = puzzle.category;
        state.gameData.revealedLetters = [];
        state.gameData.roundScores = {};
        state.gameData.phase = 'spinning';
        state.gameData.currentPlayerIndex = 0;
        state.gameData.consonantsLeft = 'BCDFGHJKLMNPQRSTVWXYZ'.split('');
        state.gameData.vowelsLeft = 'AEIOU'.split('');
        state.timerDuration = 15;

        // Initialize round scores for all players
        for (const player of state.players) {
            (state.gameData.roundScores as Record<string, number>)[player.id] = 0;
        }

        return state;
    },

    handleAction(state: GameState, playerId: string, action: string, payload: Record<string, unknown>): GameState {
        const activePlayers = state.players.filter(p => p.isConnected);
        const currentPlayer = activePlayers[state.gameData.currentPlayerIndex as number];
        const phase = state.gameData.phase as string;

        switch (action) {
            case 'spin': {
                if (playerId !== currentPlayer?.id || phase !== 'spinning') return state;
                
                // Random wheel result
                const segments = state.gameData.wheelSegments as number[];
                const spinResult = segments[Math.floor(Math.random() * segments.length)];
                state.gameData.lastSpinValue = spinResult;

                if (spinResult === -1) {
                    // Bankrupt
                    (state.gameData.roundScores as Record<string, number>)[playerId] = 0;
                    state.gameData.currentPlayerIndex = ((state.gameData.currentPlayerIndex as number) + 1) % activePlayers.length;
                    state.gameData.phase = 'spinning';
                } else if (spinResult === -2) {
                    // Lose a Turn
                    state.gameData.currentPlayerIndex = ((state.gameData.currentPlayerIndex as number) + 1) % activePlayers.length;
                    state.gameData.phase = 'spinning';
                } else {
                    state.gameData.phase = 'choosing_letter';
                }
                break;
            }

            case 'guess_letter': {
                if (playerId !== currentPlayer?.id || phase !== 'choosing_letter') return state;
                
                const letter = ((payload.letter as string) || '').toUpperCase();
                if (!letter || letter.length !== 1) return state;

                const phrase = state.gameData.currentPhrase as string;
                const revealed = state.gameData.revealedLetters as string[];
                const consonants = state.gameData.consonantsLeft as string[];
                const vowels = state.gameData.vowelsLeft as string[];

                if (revealed.includes(letter)) return state;

                const isVowel = 'AEIOU'.includes(letter);
                
                if (isVowel) {
                    // Vowels cost $250
                    const idx = vowels.indexOf(letter);
                    if (idx === -1) return state;
                    vowels.splice(idx, 1);
                    const roundScore = (state.gameData.roundScores as Record<string, number>)[playerId] || 0;
                    if (roundScore < 250) return state; // Can't afford
                    (state.gameData.roundScores as Record<string, number>)[playerId] = roundScore - 250;
                } else {
                    const idx = consonants.indexOf(letter);
                    if (idx === -1) return state;
                    consonants.splice(idx, 1);
                }

                revealed.push(letter);

                // Count occurrences
                const count = phrase.split('').filter(c => c === letter).length;

                if (count > 0 && !isVowel) {
                    // Award points for consonants
                    const spinValue = state.gameData.lastSpinValue as number;
                    (state.gameData.roundScores as Record<string, number>)[playerId] = 
                        ((state.gameData.roundScores as Record<string, number>)[playerId] || 0) + (spinValue * count);
                    state.gameData.phase = 'spinning'; // Same player continues
                } else if (count > 0 && isVowel) {
                    state.gameData.phase = 'spinning'; // Same player continues
                } else {
                    // Wrong letter — next player
                    state.gameData.currentPlayerIndex = ((state.gameData.currentPlayerIndex as number) + 1) % activePlayers.length;
                    state.gameData.phase = 'spinning';
                }
                break;
            }

            case 'solve': {
                if (playerId !== currentPlayer?.id) return state;
                
                const guess = ((payload.guess as string) || '').toUpperCase().trim();
                const phrase = (state.gameData.currentPhrase as string).toUpperCase().trim();

                if (guess === phrase) {
                    // Correct! Award round score to solver, reveal all letters
                    const allLetters = phrase.split('').filter(c => c !== ' ');
                    state.gameData.revealedLetters = [...new Set(allLetters)];
                    
                    // Add round score to total
                    const roundScore = (state.gameData.roundScores as Record<string, number>)[playerId] || 0;
                    const player = state.players.find(p => p.id === playerId);
                    if (player) player.score += Math.max(roundScore, 1000); // Minimum $1000 for solving
                    
                    state.gameData.phase = 'round_result';
                } else {
                    // Wrong solve — next player
                    state.gameData.currentPlayerIndex = ((state.gameData.currentPlayerIndex as number) + 1) % activePlayers.length;
                    state.gameData.phase = 'spinning';
                }
                break;
            }

            case 'buy_vowel': {
                if (playerId !== currentPlayer?.id || phase !== 'spinning') return state;
                const roundScore = (state.gameData.roundScores as Record<string, number>)[playerId] || 0;
                if (roundScore < 250) return state;
                if ((state.gameData.vowelsLeft as string[]).length === 0) return state;
                state.gameData.phase = 'choosing_letter'; // They'll pick a vowel
                break;
            }

            case 'next_round': {
                if (playerId !== state.hostId) return state;
                // Advance to next puzzle
                break;
            }
        }

        return state;
    },

    isRoundOver(state: GameState): boolean {
        const phase = state.gameData.phase as string;
        return phase === 'round_result';
    },

    getRoundResults(state: GameState): { scores: Record<string, number>; summary: Record<string, unknown> } {
        const scores: Record<string, number> = {};
        for (const player of state.players) {
            scores[player.id] = 0; // Scores applied directly during gameplay
        }
        return {
            scores,
            summary: {
                phrase: state.gameData.currentPhrase,
                category: state.gameData.currentCategory,
                roundScores: state.gameData.roundScores,
            },
        };
    },

    isGameOver(state: GameState): boolean {
        return state.round >= state.totalRounds;
    },
};
