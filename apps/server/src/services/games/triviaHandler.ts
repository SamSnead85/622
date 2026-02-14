import { GameHandler, GameState } from '../gameEngine.js';
import { logger } from '../../utils/logger.js';

// ============================================
// Question Bank (30+ diverse questions)
// ============================================

interface TriviaQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    category: string;
}

const QUESTION_BANK: TriviaQuestion[] = [
    // General Knowledge
    { question: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], correctIndex: 2, category: 'general' },
    { question: 'How many continents are there?', options: ['5', '6', '7', '8'], correctIndex: 2, category: 'general' },
    { question: 'What is the hardest natural substance on Earth?', options: ['Gold', 'Iron', 'Diamond', 'Platinum'], correctIndex: 2, category: 'general' },
    { question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correctIndex: 1, category: 'general' },
    { question: 'What is the smallest country in the world?', options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'], correctIndex: 1, category: 'general' },

    // Faith & Religion
    { question: 'How many pillars of Islam are there?', options: ['3', '4', '5', '6'], correctIndex: 2, category: 'faith' },
    { question: 'Which city is considered holy by Islam, Christianity, and Judaism?', options: ['Mecca', 'Jerusalem', 'Medina', 'Rome'], correctIndex: 1, category: 'faith' },
    { question: 'What is the longest chapter (surah) in the Quran?', options: ['Al-Fatiha', 'Al-Baqarah', 'Al-Imran', 'An-Nisa'], correctIndex: 1, category: 'faith' },
    { question: 'How many books are in the Christian Bible (Protestant)?', options: ['56', '66', '72', '73'], correctIndex: 1, category: 'faith' },
    { question: 'What is the holy book of Hinduism?', options: ['Torah', 'Tripitaka', 'Vedas', 'Avesta'], correctIndex: 2, category: 'faith' },

    // Science
    { question: 'What is the chemical symbol for water?', options: ['H2O', 'CO2', 'NaCl', 'O2'], correctIndex: 0, category: 'science' },
    { question: 'How many bones are in the adult human body?', options: ['186', '196', '206', '216'], correctIndex: 2, category: 'science' },
    { question: 'What is the speed of light approximately?', options: ['300,000 km/s', '150,000 km/s', '500,000 km/s', '1,000,000 km/s'], correctIndex: 0, category: 'science' },
    { question: 'What planet has the most moons?', options: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'], correctIndex: 1, category: 'science' },
    { question: 'What is the powerhouse of the cell?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi apparatus'], correctIndex: 2, category: 'science' },
    { question: 'What gas do plants absorb from the atmosphere?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], correctIndex: 2, category: 'science' },

    // Pop Culture
    { question: 'Who directed the movie "Inception"?', options: ['Steven Spielberg', 'Christopher Nolan', 'Martin Scorsese', 'James Cameron'], correctIndex: 1, category: 'pop_culture' },
    { question: 'What year was the first iPhone released?', options: ['2005', '2006', '2007', '2008'], correctIndex: 2, category: 'pop_culture' },
    { question: 'Which band performed "Bohemian Rhapsody"?', options: ['The Beatles', 'Led Zeppelin', 'Queen', 'Pink Floyd'], correctIndex: 2, category: 'pop_culture' },
    { question: 'What is the best-selling video game of all time?', options: ['Tetris', 'Minecraft', 'GTA V', 'Wii Sports'], correctIndex: 1, category: 'pop_culture' },
    { question: 'Who painted the Mona Lisa?', options: ['Michelangelo', 'Leonardo da Vinci', 'Raphael', 'Donatello'], correctIndex: 1, category: 'pop_culture' },

    // Sports
    { question: 'How many players are on a soccer team on the field?', options: ['9', '10', '11', '12'], correctIndex: 2, category: 'sports' },
    { question: 'In which sport is a "slam dunk" performed?', options: ['Football', 'Tennis', 'Basketball', 'Volleyball'], correctIndex: 2, category: 'sports' },
    { question: 'Which country won the 2022 FIFA World Cup?', options: ['France', 'Brazil', 'Argentina', 'Germany'], correctIndex: 2, category: 'sports' },
    { question: 'How long is a marathon in miles (approximately)?', options: ['20.2', '24.2', '26.2', '28.2'], correctIndex: 2, category: 'sports' },
    { question: 'What sport is played at Wimbledon?', options: ['Golf', 'Cricket', 'Tennis', 'Polo'], correctIndex: 2, category: 'sports' },

    // History
    { question: 'In what year did World War II end?', options: ['1943', '1944', '1945', '1946'], correctIndex: 2, category: 'history' },
    { question: 'Who was the first President of the United States?', options: ['Thomas Jefferson', 'George Washington', 'John Adams', 'Benjamin Franklin'], correctIndex: 1, category: 'history' },
    { question: 'The ancient city of Rome was built on how many hills?', options: ['5', '6', '7', '8'], correctIndex: 2, category: 'history' },
    { question: 'Which empire built Machu Picchu?', options: ['Aztec', 'Maya', 'Inca', 'Olmec'], correctIndex: 2, category: 'history' },
    { question: 'What wall was built to protect the northern borders of China?', options: ['Berlin Wall', 'Great Wall', 'Hadrian\'s Wall', 'Western Wall'], correctIndex: 1, category: 'history' },
    { question: 'Who discovered penicillin?', options: ['Louis Pasteur', 'Alexander Fleming', 'Marie Curie', 'Joseph Lister'], correctIndex: 1, category: 'history' },
    { question: 'What year did the Titanic sink?', options: ['1910', '1912', '1914', '1916'], correctIndex: 1, category: 'history' },
    { question: 'Which ancient civilization built the pyramids at Giza?', options: ['Roman', 'Greek', 'Egyptian', 'Persian'], correctIndex: 2, category: 'history' },
];

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export const triviaHandler: GameHandler = {
    type: 'trivia',
    minPlayers: 2,
    maxPlayers: 20,
    defaultRounds: 10,

    createInitialState(settings: Record<string, unknown>): Record<string, unknown> {
        const category = settings.category || 'all';
        let questions = category === 'all'
            ? [...QUESTION_BANK]
            : QUESTION_BANK.filter(q => q.category === category);

        questions = shuffleArray(questions);
        const numQuestions = (settings.rounds as number) || 10;
        questions = questions.slice(0, numQuestions);

        return {
            questions,
            currentQuestionIndex: 0,
            currentQuestion: null,
            answers: {} as Record<string, { answerIndex: number; timestamp: number }>,
            questionStartedAt: 0,
            timerDuration: settings.timerSeconds || 15,
        };
    },

    onRoundStart(state: GameState): GameState {
        const questions = state.gameData.questions as TriviaQuestion[];
        const questionIndex = state.round - 1;

        if (questionIndex >= questions.length) {
            state.status = 'finished';
            return state;
        }

        const question = questions[questionIndex] as TriviaQuestion;
        state.gameData.currentQuestionIndex = questionIndex;
        state.gameData.currentQuestion = {
            question: question.question,
            options: question.options,
            category: question.category,
        };
        // Store correct answer privately
        state.gameData._private_correctIndex = question.correctIndex;
        state.gameData.answers = {};
        state.gameData.questionStartedAt = Date.now();
        state.timerDuration = state.gameData.timerDuration as number;

        return state;
    },

    handleAction(state: GameState, playerId: string, action: string, payload: Record<string, unknown>): GameState {
        if (action === 'answer') {
            const answerIndex = payload.answerIndex;
            if (typeof answerIndex !== 'number' || answerIndex < 0 || answerIndex > 3) return state;

            // Don't allow changing answers
            if ((state.gameData.answers as Record<string, unknown>)[playerId]) return state;

            (state.gameData.answers as Record<string, { answerIndex: number; timestamp: number }>)[playerId] = {
                answerIndex,
                timestamp: Date.now(),
            };
        }
        return state;
    },

    isRoundOver(state: GameState): boolean {
        const connectedPlayers = state.players.filter(p => p.isConnected);
        const allAnswered = connectedPlayers.every(p => (state.gameData.answers as Record<string, unknown>)[p.id]);
        const timedOut = Date.now() - (state.gameData.questionStartedAt as number) > ((state.gameData.timerDuration as number) * 1000 + 1000);
        return allAnswered || timedOut;
    },

    getRoundResults(state: GameState): { scores: Record<string, number>; summary: Record<string, unknown> } {
        const correctIndex = state.gameData._private_correctIndex;
        const answers = state.gameData.answers as Record<string, { answerIndex: number; timestamp: number }>;
        const scores: Record<string, number> = {};

        let fastestCorrectTime = Infinity;
        let fastestPlayerId: string | null = null;

        // First pass: find fastest correct answer
        for (const [playerId, answer] of Object.entries(answers)) {
            if (answer.answerIndex === correctIndex) {
                const responseTime = answer.timestamp - (state.gameData.questionStartedAt as number);
                if (responseTime < fastestCorrectTime) {
                    fastestCorrectTime = responseTime;
                    fastestPlayerId = playerId;
                }
            }
        }

        // Second pass: assign scores
        for (const player of state.players) {
            const answer = answers[player.id];
            if (!answer) {
                scores[player.id] = 0;
                continue;
            }

            if (answer.answerIndex === correctIndex) {
                scores[player.id] = 100;
                // Fastest correct answer bonus
                if (player.id === fastestPlayerId) {
                    scores[player.id] += 50;
                }
            } else {
                scores[player.id] = 0;
            }
        }

        const question = (state.gameData.questions as TriviaQuestion[])[state.gameData.currentQuestionIndex as number];

        return {
            scores,
            summary: {
                correctIndex,
                correctAnswer: question.options[correctIndex as number],
                question: question.question,
                answers,
                fastestPlayer: fastestPlayerId,
            },
        };
    },

    isGameOver(state: GameState): boolean {
        return state.round >= state.totalRounds || state.round >= (state.gameData.questions as TriviaQuestion[]).length;
    },
};
