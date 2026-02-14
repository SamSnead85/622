import { GameHandler, GameState } from '../gameEngine.js';
import { logger } from '../../utils/logger.js';

// ============================================
// Spectrum Pairs (30+)
// ============================================

interface SpectrumPair {
    left: string;
    right: string;
}

const SPECTRUM_PAIRS: SpectrumPair[] = [
    { left: 'Hot', right: 'Cold' },
    { left: 'Overrated', right: 'Underrated' },
    { left: 'Good', right: 'Evil' },
    { left: 'Mainstream', right: 'Niche' },
    { left: 'Boring', right: 'Exciting' },
    { left: 'Quiet', right: 'Loud' },
    { left: 'Old School', right: 'Modern' },
    { left: 'Easy', right: 'Hard' },
    { left: 'Useless', right: 'Essential' },
    { left: 'Terrible Gift', right: 'Perfect Gift' },
    { left: 'Scary', right: 'Cute' },
    { left: 'Round', right: 'Pointy' },
    { left: 'Healthy', right: 'Unhealthy' },
    { left: 'Cheap', right: 'Expensive' },
    { left: 'Weird', right: 'Normal' },
    { left: 'Smells Bad', right: 'Smells Good' },
    { left: 'Tastes Bad', right: 'Tastes Good' },
    { left: 'Ugly', right: 'Beautiful' },
    { left: 'Slow', right: 'Fast' },
    { left: 'Simple', right: 'Complex' },
    { left: 'Relaxing', right: 'Stressful' },
    { left: 'Forgettable', right: 'Unforgettable' },
    { left: 'Needs No Skill', right: 'Needs Lots of Skill' },
    { left: 'Temporary', right: 'Permanent' },
    { left: 'Bad Habit', right: 'Good Habit' },
    { left: 'Underpaid', right: 'Overpaid' },
    { left: 'Unpopular', right: 'Popular' },
    { left: 'Brain', right: 'Brawn' },
    { left: 'Art', right: 'Science' },
    { left: 'Individual', right: 'Team' },
    { left: 'Introverted', right: 'Extroverted' },
    { left: 'Serious', right: 'Silly' },
    { left: 'Logical', right: 'Creative' },
    { left: 'Guilty Pleasure', right: 'Genuinely Great' },
    { left: 'Undercooked', right: 'Overcooked' },
];

// Clue words/topics that the psychic gives a clue for
const CLUE_TOPICS: string[] = [
    'Pizza', 'Homework', 'Dancing', 'Swimming', 'Cats', 'Dogs', 'Coffee', 'Tea',
    'Sleeping', 'Jogging', 'Chess', 'Karaoke', 'Surfing', 'Yoga', 'Meditation',
    'Video Games', 'Reading', 'Cooking', 'Road Trips', 'Social Media',
    'Broccoli', 'Chocolate', 'Sushi', 'Fast Food', 'Salad',
    'Monday Mornings', 'Weekends', 'Vacations', 'Birthdays', 'Holidays',
    'Spiders', 'Snakes', 'Puppies', 'Kittens', 'Dolphins',
];

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export const wavelengthHandler: GameHandler = {
    type: 'wavelength',
    minPlayers: 3,
    maxPlayers: 12,
    defaultRounds: 10,

    createInitialState(settings: Record<string, unknown>): Record<string, unknown> {
        return {
            spectrums: shuffleArray([...SPECTRUM_PAIRS]),
            topics: shuffleArray([...CLUE_TOPICS]),
            spectrumIndex: 0,
            topicIndex: 0,
            currentSpectrum: null,
            currentTopic: null,
            _secret_targetPosition: 0,
            psychicId: null,
            psychicIndex: 0,
            clue: null,
            guesses: {} as Record<string, number>,
            phase: 'psychic_clue', // 'psychic_clue' | 'guessing' | 'reveal'
            timerDuration: settings.timerSeconds || 30,
        };
    },

    onRoundStart(state: GameState): GameState {
        const spectrums = state.gameData.spectrums as SpectrumPair[];
        const topics = state.gameData.topics as string[];
        const spectrumIndex = state.gameData.spectrumIndex as number;
        const topicIndex = state.gameData.topicIndex as number;
        const psychicIndex = state.gameData.psychicIndex as number;

        // Pick spectrum and topic
        const spectrum = spectrums[spectrumIndex % spectrums.length];
        const topic = topics[topicIndex % topics.length];

        // Rotate psychic
        const psychic = state.players[psychicIndex % state.players.length];

        // Generate random target position (0-100)
        const targetPosition = Math.floor(Math.random() * 101);

        state.gameData.currentSpectrum = spectrum;
        state.gameData.currentTopic = topic;
        state.gameData._secret_targetPosition = targetPosition;
        state.gameData.psychicId = psychic.id;
        state.gameData.clue = null;
        state.gameData.guesses = {};
        state.gameData.phase = 'psychic_clue';
        state.gameData.spectrumIndex = spectrumIndex + 1;
        state.gameData.topicIndex = topicIndex + 1;
        state.gameData.psychicIndex = psychicIndex + 1;
        state.timerDuration = state.gameData.timerDuration as number;

        // Give psychic the target position privately
        state.gameData[`_player_${psychic.id}`] = {
            isPsychic: true,
            targetPosition,
            spectrum,
            topic,
        };

        return state;
    },

    handleAction(state: GameState, playerId: string, action: string, payload: Record<string, unknown>): GameState {
        if (action === 'give_clue') {
            // Only psychic can give clue
            if (playerId !== state.gameData.psychicId) return state;
            if (state.gameData.clue !== null) return state;

            const { clue } = payload;
            if (typeof clue !== 'string' || clue.length === 0 || clue.length > 50) return state;

            state.gameData.clue = clue;
            state.gameData.phase = 'guessing';
        } else if (action === 'guess') {
            // Psychic cannot guess
            if (playerId === state.gameData.psychicId) return state;
            // Must have a clue first
            if (state.gameData.clue === null) return state;
            // Don't allow changing guesses
            if ((state.gameData.guesses as Record<string, number>)[playerId] !== undefined) return state;

            const position = payload.position;
            if (typeof position !== 'number' || position < 0 || position > 100) return state;

            (state.gameData.guesses as Record<string, number>)[playerId] = position;
        }

        return state;
    },

    isRoundOver(state: GameState): boolean {
        // Need clue first
        if (state.gameData.clue === null) return false;

        const guessers = state.players.filter(p => p.id !== state.gameData.psychicId && p.isConnected);
        const allGuessed = guessers.every(p => (state.gameData.guesses as Record<string, number>)[p.id] !== undefined);

        return allGuessed;
    },

    getRoundResults(state: GameState): { scores: Record<string, number>; summary: Record<string, unknown> } {
        const targetPosition = state.gameData._secret_targetPosition as number;
        const guesses = state.gameData.guesses as Record<string, number>;
        const scores: Record<string, number> = {};

        let totalCloseness = 0;

        for (const player of state.players) {
            if (player.id === state.gameData.psychicId) {
                continue; // Psychic scored based on others' performance
            }

            const guess = guesses[player.id];
            if (guess === undefined) {
                scores[player.id] = 0;
                continue;
            }

            const diff = Math.abs(guess - targetPosition);

            if (diff <= 5) {
                scores[player.id] = 100;
                totalCloseness += 100;
            } else if (diff <= 15) {
                scores[player.id] = 75;
                totalCloseness += 75;
            } else if (diff <= 25) {
                scores[player.id] = 50;
                totalCloseness += 50;
            } else if (diff <= 40) {
                scores[player.id] = 25;
                totalCloseness += 25;
            } else {
                scores[player.id] = 0;
            }
        }

        // Psychic gets average of others' scores
        const guesserCount = Object.keys(guesses).length;
        scores[state.gameData.psychicId as string] = guesserCount > 0 ? Math.round(totalCloseness / guesserCount) : 0;

        const psychic = state.players.find(p => p.id === state.gameData.psychicId);

        return {
            scores,
            summary: {
                spectrum: state.gameData.currentSpectrum,
                topic: state.gameData.currentTopic,
                targetPosition,
                clue: state.gameData.clue,
                guesses,
                psychic: psychic ? { id: psychic.id, name: psychic.name } : null,
            },
        };
    },

    isGameOver(state: GameState): boolean {
        return state.round >= state.totalRounds;
    },
};
