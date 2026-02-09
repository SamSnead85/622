import { GameHandler, GameState } from '../gameEngine.js';
import { logger } from '../../utils/logger.js';

// ============================================
// Secret Word/Location Bank (40+)
// ============================================

const SECRET_WORDS: string[] = [
    // Locations
    'Library', 'Hospital', 'Airport', 'Beach', 'Museum', 'Restaurant',
    'Gym', 'Movie Theater', 'School', 'Supermarket', 'Park', 'Zoo',
    'Mosque', 'Church', 'Stadium', 'Mall', 'Farm', 'Castle',
    'Train Station', 'Bank', 'Post Office', 'Bakery', 'Hair Salon',
    'Fire Station', 'Aquarium', 'Amusement Park', 'Campsite', 'Lighthouse',

    // Concepts/Things
    'Wedding', 'Funeral', 'Birthday Party', 'Graduation', 'Road Trip',
    'Camping Trip', 'Cooking Class', 'Concert', 'Football Game', 'Picnic',
    'Carnival', 'Science Fair', 'Art Gallery', 'Charity Event', 'Book Club',
    'Escape Room', 'Karaoke Night', 'Dance Class', 'Garden Party', 'BBQ',
    'Sleepover', 'Treasure Hunt', 'Game Night', 'Pool Party', 'Potluck',
];

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export const infiltratorHandler: GameHandler = {
    type: 'infiltrator',
    minPlayers: 4,
    maxPlayers: 10,
    defaultRounds: 3,

    createInitialState(settings: Record<string, any>): Record<string, any> {
        return {
            words: shuffleArray([...SECRET_WORDS]),
            wordIndex: 0,
            _secret_secretWord: null,
            _secret_infiltratorId: null,
            currentQuestionRound: 0,
            totalQuestionRounds: settings.questionRounds || 3,
            questions: [] as { askerId: string; targetId: string; question: string; answer: string }[],
            currentAskerId: null,
            currentTargetId: null,
            currentQuestion: null,
            currentAnswer: null,
            votes: {} as Record<string, string>, // voterId -> suspectedInfiltratorId
            infiltratorGuess: null as string | null,
            phase: 'questioning', // 'questioning' | 'answering' | 'voting' | 'infiltrator_guess' | 'reveal'
            askOrder: [] as string[],
            askIndex: 0,
            timerDuration: settings.timerSeconds || 30,
        };
    },

    onRoundStart(state: GameState): GameState {
        const { words, wordIndex } = state.gameData;
        const secretWord = words[wordIndex % words.length];

        // Pick random infiltrator
        const connectedPlayers = state.players.filter(p => p.isConnected);
        const infiltratorIndex = Math.floor(Math.random() * connectedPlayers.length);
        const infiltrator = connectedPlayers[infiltratorIndex];

        state.gameData._secret_secretWord = secretWord;
        state.gameData._secret_infiltratorId = infiltrator.id;
        state.gameData.wordIndex = wordIndex + 1;
        state.gameData.currentQuestionRound = 0;
        state.gameData.questions = [];
        state.gameData.votes = {};
        state.gameData.infiltratorGuess = null;
        state.gameData.phase = 'questioning';
        state.timerDuration = state.gameData.timerDuration;

        // Create ask order (cycle through players)
        const askOrder = shuffleArray(connectedPlayers.map(p => p.id));
        state.gameData.askOrder = askOrder;
        state.gameData.askIndex = 0;

        // Set first questioner
        state.gameData.currentAskerId = askOrder[0];
        state.gameData.currentQuestion = null;
        state.gameData.currentAnswer = null;

        // Tell each player the secret word (except infiltrator)
        for (const player of state.players) {
            if (player.id === infiltrator.id) {
                state.gameData[`_player_${player.id}`] = {
                    role: 'infiltrator',
                    secretWord: null,
                    message: 'You are the Infiltrator! Figure out the secret word without getting caught.',
                };
            } else {
                state.gameData[`_player_${player.id}`] = {
                    role: 'citizen',
                    secretWord,
                    message: `The secret word is "${secretWord}". Find the Infiltrator!`,
                };
            }
        }

        return state;
    },

    handleAction(state: GameState, playerId: string, action: string, payload: any): GameState {
        const { phase, _secret_infiltratorId } = state.gameData;

        if (action === 'ask_question' && phase === 'questioning') {
            if (playerId !== state.gameData.currentAskerId) return state;

            const { targetId, question } = payload;
            if (!targetId || !question || typeof question !== 'string') return state;
            if (question.length > 200) return state;

            // Can't ask yourself
            if (targetId === playerId) return state;

            state.gameData.currentTargetId = targetId;
            state.gameData.currentQuestion = question;
            state.gameData.phase = 'answering';
        } else if (action === 'answer_question' && phase === 'answering') {
            if (playerId !== state.gameData.currentTargetId) return state;

            const { answer } = payload;
            if (!answer || typeof answer !== 'string') return state;
            if (answer.length > 200) return state;

            state.gameData.currentAnswer = answer;

            // Record the Q&A
            state.gameData.questions.push({
                askerId: state.gameData.currentAskerId,
                targetId: state.gameData.currentTargetId,
                question: state.gameData.currentQuestion,
                answer,
            });

            // Move to next questioner
            state.gameData.askIndex++;
            const totalQuestionsPerRound = state.players.filter(p => p.isConnected).length;
            const totalQuestionsNeeded = totalQuestionsPerRound * state.gameData.totalQuestionRounds;

            if (state.gameData.questions.length >= totalQuestionsNeeded) {
                // All question rounds done, move to voting
                state.gameData.phase = 'voting';
                state.gameData.currentAskerId = null;
                state.gameData.currentTargetId = null;
                state.gameData.currentQuestion = null;
                state.gameData.currentAnswer = null;
            } else {
                // Next questioner
                const nextAskerId = state.gameData.askOrder[state.gameData.askIndex % state.gameData.askOrder.length];
                state.gameData.currentAskerId = nextAskerId;
                state.gameData.currentTargetId = null;
                state.gameData.currentQuestion = null;
                state.gameData.currentAnswer = null;
                state.gameData.phase = 'questioning';
            }
        } else if (action === 'vote' && phase === 'voting') {
            const { suspectedId } = payload;
            if (!suspectedId || typeof suspectedId !== 'string') return state;

            // Can't vote for yourself
            if (suspectedId === playerId) return state;

            // Allow changing votes during voting phase
            state.gameData.votes[playerId] = suspectedId;

            // Check if all connected players have voted
            const connectedPlayers = state.players.filter(p => p.isConnected);
            const allVoted = connectedPlayers.every(p => state.gameData.votes[p.id]);

            if (allVoted) {
                // Tally votes
                const voteCounts: Record<string, number> = {};
                for (const votedId of Object.values(state.gameData.votes) as string[]) {
                    voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
                }

                // Find the most voted player
                let maxVotes = 0;
                let mostVotedId = '';
                for (const [pid, count] of Object.entries(voteCounts)) {
                    if (count > maxVotes) {
                        maxVotes = count;
                        mostVotedId = pid;
                    }
                }

                // If infiltrator was caught, they get a chance to guess
                if (mostVotedId === _secret_infiltratorId) {
                    state.gameData.phase = 'infiltrator_guess';
                } else {
                    // Wrong person voted out - infiltrator wins!
                    state.gameData.phase = 'reveal';
                }
            }
        } else if (action === 'infiltrator_guess' && phase === 'infiltrator_guess') {
            if (playerId !== _secret_infiltratorId) return state;

            const { guess } = payload;
            state.gameData.infiltratorGuess = guess;
            state.gameData.phase = 'reveal';
        }

        return state;
    },

    isRoundOver(state: GameState): boolean {
        return state.gameData.phase === 'reveal';
    },

    getRoundResults(state: GameState): { scores: Record<string, number>; summary: any } {
        const secretWord = state.gameData._secret_secretWord;
        const infiltratorId = state.gameData._secret_infiltratorId;
        const votes = state.gameData.votes as Record<string, string>;
        const infiltratorGuess = state.gameData.infiltratorGuess;
        const scores: Record<string, number> = {};

        // Tally votes
        const voteCounts: Record<string, number> = {};
        for (const votedId of Object.values(votes)) {
            voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
        }

        let maxVotes = 0;
        let mostVotedId = '';
        for (const [pid, count] of Object.entries(voteCounts)) {
            if (count > maxVotes) {
                maxVotes = count;
                mostVotedId = pid;
            }
        }

        const infiltratorCaught = mostVotedId === infiltratorId;
        const infiltratorGuessedWord = infiltratorGuess &&
            infiltratorGuess.toLowerCase().trim() === secretWord.toLowerCase().trim();

        for (const player of state.players) {
            if (player.id === infiltratorId) {
                if (!infiltratorCaught) {
                    // Infiltrator wasn't caught
                    scores[player.id] = 100;
                } else if (infiltratorGuessedWord) {
                    // Caught but guessed the word
                    scores[player.id] = 50;
                } else {
                    scores[player.id] = 0;
                }
            } else {
                // Citizens
                if (votes[player.id] === infiltratorId) {
                    // Voted correctly
                    scores[player.id] = 100;
                } else {
                    scores[player.id] = 0;
                }
            }
        }

        const infiltrator = state.players.find(p => p.id === infiltratorId);

        return {
            scores,
            summary: {
                secretWord,
                infiltrator: infiltrator ? { id: infiltrator.id, name: infiltrator.name } : null,
                infiltratorCaught,
                infiltratorGuessedWord: infiltratorGuessedWord || false,
                infiltratorGuess,
                votes,
                voteCounts,
                questions: state.gameData.questions,
            },
        };
    },

    isGameOver(state: GameState): boolean {
        return state.round >= state.totalRounds;
    },
};
