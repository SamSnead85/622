import { GameHandler, GameState } from '../gameEngine.js';
import { logger } from '../../utils/logger.js';

// ============================================
// Prediction Questions Bank
// ============================================

interface PredictionQuestion {
    type: 'scale' | 'choice';
    template: string;
    options?: string[]; // for choice type
    scaleMin?: number; // for scale type
    scaleMax?: number;
    scaleLabel?: [string, string]; // [minLabel, maxLabel]
}

const PREDICTION_QUESTIONS: PredictionQuestion[] = [
    // Scale questions (1-10)
    { type: 'scale', template: 'How much does {player} enjoy cooking?', scaleMin: 1, scaleMax: 10, scaleLabel: ['Not at all', 'Loves it'] },
    { type: 'scale', template: 'How adventurous is {player} with food?', scaleMin: 1, scaleMax: 10, scaleLabel: ['Very picky', 'Will try anything'] },
    { type: 'scale', template: 'How much does {player} enjoy exercise?', scaleMin: 1, scaleMax: 10, scaleLabel: ['Couch potato', 'Gym addict'] },
    { type: 'scale', template: 'How much does {player} enjoy socializing?', scaleMin: 1, scaleMax: 10, scaleLabel: ['Introvert', 'Extreme extrovert'] },
    { type: 'scale', template: 'How organized is {player}?', scaleMin: 1, scaleMax: 10, scaleLabel: ['Chaotic', 'Perfectly organized'] },
    { type: 'scale', template: 'How competitive is {player}?', scaleMin: 1, scaleMax: 10, scaleLabel: ['Chill', 'Ultra competitive'] },
    { type: 'scale', template: 'How much does {player} care about fashion?', scaleMin: 1, scaleMax: 10, scaleLabel: ['Not at all', 'Fashionista'] },
    { type: 'scale', template: 'How early does {player} wake up?', scaleMin: 1, scaleMax: 10, scaleLabel: ['Night owl', 'Dawn patrol'] },
    { type: 'scale', template: 'How much does {player} like surprises?', scaleMin: 1, scaleMax: 10, scaleLabel: ['Hates them', 'Loves them'] },
    { type: 'scale', template: 'How patient is {player}?', scaleMin: 1, scaleMax: 10, scaleLabel: ['Zero patience', 'Infinite patience'] },
    { type: 'scale', template: 'How addicted is {player} to their phone?', scaleMin: 1, scaleMax: 10, scaleLabel: ['Digital detox', 'Phone glued'] },
    { type: 'scale', template: 'How much does {player} enjoy road trips?', scaleMin: 1, scaleMax: 10, scaleLabel: ['Dreads them', 'Lives for them'] },

    // Choice questions
    { type: 'choice', template: 'Would {player} rather have breakfast or dinner as their last meal?', options: ['Breakfast', 'Dinner'] },
    { type: 'choice', template: 'Would {player} rather live in the mountains or by the beach?', options: ['Mountains', 'Beach'] },
    { type: 'choice', template: 'Would {player} rather travel to the past or the future?', options: ['Past', 'Future'] },
    { type: 'choice', template: 'Would {player} rather be famous or rich (but not both)?', options: ['Famous', 'Rich'] },
    { type: 'choice', template: 'Would {player} rather have a cat or a dog?', options: ['Cat', 'Dog'] },
    { type: 'choice', template: 'Would {player} rather read a book or watch a movie?', options: ['Book', 'Movie'] },
    { type: 'choice', template: 'Would {player} rather cook at home or eat out?', options: ['Cook', 'Eat out'] },
    { type: 'choice', template: 'Would {player} rather visit space or the deep ocean?', options: ['Space', 'Deep ocean'] },
    { type: 'choice', template: 'Would {player} rather have super strength or super speed?', options: ['Strength', 'Speed'] },
    { type: 'choice', template: 'Would {player} rather always be hot or always be cold?', options: ['Hot', 'Cold'] },
    { type: 'choice', template: 'Would {player} rather give up social media or music?', options: ['Social media', 'Music'] },
    { type: 'choice', template: 'Would {player} rather be invisible or fly?', options: ['Invisible', 'Fly'] },
];

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export const predictHandler: GameHandler = {
    type: 'predict',
    minPlayers: 3,
    maxPlayers: 12,
    defaultRounds: 0, // Will be set to number of players

    createInitialState(settings: Record<string, unknown>): Record<string, unknown> {
        return {
            questions: shuffleArray([...PREDICTION_QUESTIONS]),
            questionIndex: 0,
            currentSubjectIndex: 0,
            currentSubjectId: null,
            currentQuestion: null,
            _private_subjectAnswer: null,
            predictions: {} as Record<string, unknown>,
            phase: 'waiting', // 'subject_answering' | 'predicting' | 'reveal'
            timerDuration: settings.timerSeconds || 20,
        };
    },

    onRoundStart(state: GameState): GameState {
        // Set total rounds to number of players if not set
        if (state.totalRounds === 0 || state.round === 1) {
            state.totalRounds = state.players.length;
        }

        const subjectIndex = (state.round - 1) % state.players.length;
        const subject = state.players[subjectIndex];

        // Pick a question
        const questions = state.gameData.questions as PredictionQuestion[];
        const questionIndex = state.gameData.questionIndex as number;
        const question = questions[questionIndex % questions.length];

        // Fill in player name in template
        const filledQuestion = {
            ...question,
            template: question.template.replace('{player}', subject.name),
        };

        state.gameData.currentSubjectIndex = subjectIndex;
        state.gameData.currentSubjectId = subject.id;
        state.gameData.currentQuestion = filledQuestion;
        state.gameData._private_subjectAnswer = null;
        state.gameData.predictions = {};
        state.gameData.phase = 'subject_answering';
        state.gameData.questionIndex = questionIndex + 1;
        state.timerDuration = state.gameData.timerDuration as number;

        // Store subject-specific data privately
        state.gameData[`_player_${subject.id}`] = {
            isSubject: true,
            question: filledQuestion,
        };

        return state;
    },

    handleAction(state: GameState, playerId: string, action: string, payload: Record<string, unknown>): GameState {
        const { currentSubjectId } = state.gameData;

        if (action === 'subject_answer') {
            // Only the subject can answer
            if (playerId !== currentSubjectId) return state;
            if (state.gameData._private_subjectAnswer !== null) return state;

            state.gameData._private_subjectAnswer = payload.answer;
            state.gameData.phase = 'predicting';
        } else if (action === 'predict') {
            // Subject cannot predict
            if (playerId === currentSubjectId) return state;
            // Don't allow changing predictions
            if ((state.gameData.predictions as Record<string, unknown>)[playerId] !== undefined) return state;

            (state.gameData.predictions as Record<string, unknown>)[playerId] = payload.prediction;
        }

        return state;
    },

    isRoundOver(state: GameState): boolean {
        if (state.gameData._private_subjectAnswer === null) return false;

        const predictors = state.players.filter(p => p.id !== state.gameData.currentSubjectId && p.isConnected);
        const allPredicted = predictors.every(p => (state.gameData.predictions as Record<string, unknown>)[p.id] !== undefined);

        return allPredicted;
    },

    getRoundResults(state: GameState): { scores: Record<string, number>; summary: Record<string, unknown> } {
        const subjectAnswer = state.gameData._private_subjectAnswer;
        const predictions = state.gameData.predictions as Record<string, unknown>;
        const question = state.gameData.currentQuestion as PredictionQuestion & { template: string };
        const scores: Record<string, number> = {};

        for (const player of state.players) {
            if (player.id === state.gameData.currentSubjectId) {
                scores[player.id] = 0; // Subject doesn't score
                continue;
            }

            const prediction = predictions[player.id];
            if (prediction === undefined) {
                scores[player.id] = 0;
                continue;
            }

            if (question && question.type === 'scale') {
                const diff = Math.abs(Number(prediction) - Number(subjectAnswer));
                if (diff === 0) {
                    scores[player.id] = 100; // Exact match
                } else if (diff <= 1) {
                    scores[player.id] = 50; // Close
                } else if (diff <= 2) {
                    scores[player.id] = 25; // Somewhat close
                } else {
                    scores[player.id] = 0;
                }
            } else {
                // Choice type: exact match only
                scores[player.id] = prediction === subjectAnswer ? 100 : 0;
            }
        }

        const subject = state.players.find(p => p.id === state.gameData.currentSubjectId);

        return {
            scores,
            summary: {
                subject: subject ? { id: subject.id, name: subject.name } : null,
                question: question.template,
                subjectAnswer,
                predictions,
            },
        };
    },

    isGameOver(state: GameState): boolean {
        return state.round >= state.totalRounds;
    },
};
