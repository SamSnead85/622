import { GameHandler, GameState } from '../gameEngine.js';

// ============================================
// Survey Question Packs
// ============================================

interface SurveyAnswer {
    answer: string;
    points: number;
}

interface SurveyQuestion {
    question: string;
    answers: SurveyAnswer[]; // Ranked by points (highest first)
    category: string;
}

const SURVEY_PACKS: Record<string, SurveyQuestion[]> = {
    general: [
        {
            question: 'Name something people do first thing in the morning',
            answers: [
                { answer: 'Check phone', points: 35 },
                { answer: 'Brush teeth', points: 25 },
                { answer: 'Use the bathroom', points: 15 },
                { answer: 'Make coffee/tea', points: 12 },
                { answer: 'Shower', points: 8 },
                { answer: 'Pray', points: 5 },
            ],
            category: 'Daily Life',
        },
        {
            question: 'Name a reason someone might be late to work',
            answers: [
                { answer: 'Traffic', points: 40 },
                { answer: 'Overslept', points: 30 },
                { answer: 'Car trouble', points: 12 },
                { answer: 'Kids', points: 10 },
                { answer: 'Weather', points: 5 },
                { answer: 'Lost keys', points: 3 },
            ],
            category: 'Work Life',
        },
        {
            question: 'Name something you bring to the beach',
            answers: [
                { answer: 'Towel', points: 30 },
                { answer: 'Sunscreen', points: 25 },
                { answer: 'Umbrella/Chair', points: 18 },
                { answer: 'Snacks/Drinks', points: 12 },
                { answer: 'Phone', points: 10 },
                { answer: 'Sunglasses', points: 5 },
            ],
            category: 'Fun & Leisure',
        },
        {
            question: 'Name a popular social media platform',
            answers: [
                { answer: 'Instagram', points: 30 },
                { answer: 'TikTok', points: 25 },
                { answer: 'Facebook', points: 15 },
                { answer: 'X/Twitter', points: 12 },
                { answer: 'YouTube', points: 10 },
                { answer: 'Snapchat', points: 8 },
            ],
            category: 'Technology',
        },
        {
            question: 'Name something people collect',
            answers: [
                { answer: 'Stamps', points: 25 },
                { answer: 'Coins', points: 22 },
                { answer: 'Cards (sports/trading)', points: 18 },
                { answer: 'Shoes/Sneakers', points: 15 },
                { answer: 'Books', points: 12 },
                { answer: 'Art', points: 8 },
            ],
            category: 'Hobbies',
        },
        {
            question: 'Name a food people eat at a barbecue',
            answers: [
                { answer: 'Burgers', points: 35 },
                { answer: 'Hot dogs', points: 25 },
                { answer: 'Steak/Ribs', points: 18 },
                { answer: 'Chicken', points: 12 },
                { answer: 'Corn on the cob', points: 7 },
                { answer: 'Salad', points: 3 },
            ],
            category: 'Food',
        },
        {
            question: 'Name something kids are afraid of',
            answers: [
                { answer: 'The dark', points: 35 },
                { answer: 'Monsters', points: 25 },
                { answer: 'Spiders/Bugs', points: 15 },
                { answer: 'Thunder/Lightning', points: 12 },
                { answer: 'Being alone', points: 8 },
                { answer: 'Dogs', points: 5 },
            ],
            category: 'Family',
        },
        {
            question: 'Name a job that requires a uniform',
            answers: [
                { answer: 'Police officer', points: 30 },
                { answer: 'Doctor/Nurse', points: 25 },
                { answer: 'Firefighter', points: 18 },
                { answer: 'Military', points: 12 },
                { answer: 'Chef', points: 10 },
                { answer: 'Pilot', points: 5 },
            ],
            category: 'Careers',
        },
    ],
    islamic: [
        {
            question: 'Name something Muslims do during Ramadan',
            answers: [
                { answer: 'Fast', points: 40 },
                { answer: 'Pray extra (Taraweeh)', points: 25 },
                { answer: 'Read Quran', points: 15 },
                { answer: 'Give charity', points: 10 },
                { answer: 'Eat Iftar together', points: 7 },
                { answer: 'Go to the mosque', points: 3 },
            ],
            category: 'Faith',
        },
        {
            question: 'Name a famous Islamic city',
            answers: [
                { answer: 'Mecca', points: 35 },
                { answer: 'Medina', points: 25 },
                { answer: 'Jerusalem', points: 15 },
                { answer: 'Istanbul', points: 12 },
                { answer: 'Cairo', points: 8 },
                { answer: 'Cordoba', points: 5 },
            ],
            category: 'Geography',
        },
        {
            question: 'Name something you see at a mosque',
            answers: [
                { answer: 'Minaret', points: 30 },
                { answer: 'Prayer rugs', points: 22 },
                { answer: 'Dome', points: 18 },
                { answer: 'Quran/Mushaf', points: 15 },
                { answer: 'Mihrab (prayer niche)', points: 10 },
                { answer: 'Shoes at the entrance', points: 5 },
            ],
            category: 'Culture',
        },
        {
            question: 'Name a quality valued in Islam',
            answers: [
                { answer: 'Honesty/Truthfulness', points: 30 },
                { answer: 'Patience (Sabr)', points: 25 },
                { answer: 'Generosity', points: 18 },
                { answer: 'Kindness', points: 12 },
                { answer: 'Humility', points: 10 },
                { answer: 'Justice', points: 5 },
            ],
            category: 'Values',
        },
    ],
};

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export const familyFeudHandler: GameHandler = {
    type: 'family-feud',
    minPlayers: 4,
    maxPlayers: 16,
    defaultRounds: 5,

    createInitialState(settings: Record<string, unknown>): Record<string, unknown> {
        const pack = (settings.pack as string) || 'general';
        let allQuestions: SurveyQuestion[] = [];
        if (pack === 'all') {
            for (const questions of Object.values(SURVEY_PACKS)) {
                allQuestions.push(...questions);
            }
        } else {
            allQuestions = SURVEY_PACKS[pack] || SURVEY_PACKS.general;
        }

        const questions = shuffleArray(allQuestions).slice(0, (settings.rounds as number) || 5);

        return {
            questions,
            currentQuestion: null as SurveyQuestion | null,
            revealedAnswers: [] as boolean[], // Which answers on the board are revealed
            teams: {
                team1: { name: 'Team 1', playerIds: [] as string[], score: 0 },
                team2: { name: 'Team 2', playerIds: [] as string[], score: 0 },
            },
            controllingTeam: null as string | null, // 'team1' or 'team2'
            strikes: 0,
            maxStrikes: 3,
            phase: 'team_setup', // 'team_setup' | 'faceoff' | 'faceoff_buzz' | 'play' | 'steal' | 'round_result'
            faceoffBuzzes: {} as Record<string, { answer: string; timestamp: number }>,
            roundPoints: 0, // Points accumulated this round
            guessedAnswers: [] as string[], // Answers already guessed (normalized)
            hostMode: true,
            timerDuration: 20,
        };
    },

    onRoundStart(state: GameState): GameState {
        const questions = state.gameData.questions as SurveyQuestion[];
        const idx = state.round - 1;

        if (idx >= questions.length) {
            state.status = 'finished';
            return state;
        }

        const question = questions[idx];
        state.gameData.currentQuestion = question;
        state.gameData.revealedAnswers = new Array(question.answers.length).fill(false);
        state.gameData.strikes = 0;
        state.gameData.controllingTeam = null;
        state.gameData.phase = 'faceoff';
        state.gameData.faceoffBuzzes = {};
        state.gameData.roundPoints = 0;
        state.gameData.guessedAnswers = [];
        state.timerDuration = 20;

        return state;
    },

    handleAction(state: GameState, playerId: string, action: string, payload: Record<string, unknown>): GameState {
        const phase = state.gameData.phase as string;
        const teams = state.gameData.teams as { team1: { name: string; playerIds: string[]; score: number }; team2: { name: string; playerIds: string[]; score: number } };

        switch (action) {
            case 'join_team': {
                if (phase !== 'team_setup') return state;
                const team = payload.team as string;
                if (team !== 'team1' && team !== 'team2') return state;

                // Remove from other team first
                teams.team1.playerIds = teams.team1.playerIds.filter(id => id !== playerId);
                teams.team2.playerIds = teams.team2.playerIds.filter(id => id !== playerId);

                teams[team].playerIds.push(playerId);
                break;
            }

            case 'set_team_name': {
                if (playerId !== state.hostId) return state;
                const team = payload.team as string;
                const name = (payload.name as string)?.slice(0, 30) || '';
                if (team === 'team1') teams.team1.name = name;
                if (team === 'team2') teams.team2.name = name;
                break;
            }

            case 'start_round': {
                if (playerId !== state.hostId) return state;
                if (teams.team1.playerIds.length < 1 || teams.team2.playerIds.length < 1) return state;
                state.gameData.phase = 'faceoff';
                break;
            }

            case 'open_faceoff': {
                if (playerId !== state.hostId || phase !== 'faceoff') return state;
                state.gameData.phase = 'faceoff_buzz';
                state.gameData.faceoffBuzzes = {};
                break;
            }

            case 'faceoff_buzz': {
                if (phase !== 'faceoff_buzz') return state;
                const buzzes = state.gameData.faceoffBuzzes as Record<string, { answer: string; timestamp: number }>;
                if (buzzes[playerId]) return state; // Already buzzed

                buzzes[playerId] = {
                    answer: ((payload.answer as string) || '').toUpperCase().trim(),
                    timestamp: Date.now(),
                };
                break;
            }

            case 'judge_faceoff': {
                if (playerId !== state.hostId || phase !== 'faceoff_buzz') return state;
                const winnerId = payload.winnerId as string;
                
                // Determine which team gets control
                const isTeam1 = teams.team1.playerIds.includes(winnerId);
                state.gameData.controllingTeam = isTeam1 ? 'team1' : 'team2';

                // Check if the winning answer matches any board answer
                const buzzes = state.gameData.faceoffBuzzes as Record<string, { answer: string; timestamp: number }>;
                const winnerBuzz = buzzes[winnerId];
                if (winnerBuzz) {
                    this._tryRevealAnswer(state, winnerBuzz.answer);
                }

                state.gameData.phase = 'play';
                break;
            }

            case 'guess': {
                if (phase !== 'play' && phase !== 'steal') return state;
                
                const controlling = state.gameData.controllingTeam as string;
                const controllingTeam = controlling === 'team1' ? teams.team1 : teams.team2;
                
                // In play phase, only controlling team can guess
                // In steal phase, the other team guesses
                if (phase === 'play' && !controllingTeam.playerIds.includes(playerId)) return state;
                if (phase === 'steal' && controllingTeam.playerIds.includes(playerId)) return state;

                const guess = ((payload.answer as string) || '').toUpperCase().trim();
                if (!guess) return state;

                const matched = this._tryRevealAnswer(state, guess);

                if (!matched) {
                    if (phase === 'steal') {
                        // Steal failed — controlling team keeps points
                        state.gameData.phase = 'round_result';
                        this._awardRoundPoints(state);
                    } else {
                        state.gameData.strikes = (state.gameData.strikes as number) + 1;
                        if ((state.gameData.strikes as number) >= (state.gameData.maxStrikes as number)) {
                            // Three strikes — other team gets to steal
                            state.gameData.phase = 'steal';
                        }
                    }
                } else if (phase === 'steal') {
                    // Successful steal — stealing team gets the points
                    const stealingTeam = controlling === 'team1' ? 'team2' : 'team1';
                    state.gameData.controllingTeam = stealingTeam;
                    state.gameData.phase = 'round_result';
                    this._awardRoundPoints(state);
                }

                // Check if all answers revealed
                const revealed = state.gameData.revealedAnswers as boolean[];
                if (revealed.every(r => r)) {
                    state.gameData.phase = 'round_result';
                    this._awardRoundPoints(state);
                }
                break;
            }

            case 'next_round': {
                if (playerId !== state.hostId) return state;
                state.gameData.phase = 'team_setup';
                break;
            }

            case 'end_game': {
                if (playerId !== state.hostId) return state;
                state.status = 'finished';
                break;
            }
        }

        return state;
    },

    // Helper: try to match a guess to an unrevealed answer
    _tryRevealAnswer(state: GameState, guess: string): boolean {
        const question = state.gameData.currentQuestion as SurveyQuestion;
        const revealed = state.gameData.revealedAnswers as boolean[];
        const guessed = state.gameData.guessedAnswers as string[];
        const normalizedGuess = guess.toUpperCase().trim();

        if (guessed.includes(normalizedGuess)) return false;
        guessed.push(normalizedGuess);

        for (let i = 0; i < question.answers.length; i++) {
            if (revealed[i]) continue;
            const answer = question.answers[i].answer.toUpperCase();
            // Fuzzy match: check if guess contains the answer or vice versa
            if (answer.includes(normalizedGuess) || normalizedGuess.includes(answer) || normalizedGuess === answer) {
                revealed[i] = true;
                state.gameData.roundPoints = (state.gameData.roundPoints as number) + question.answers[i].points;
                return true;
            }
        }
        return false;
    },

    // Helper: award accumulated round points to controlling team
    _awardRoundPoints(state: GameState): void {
        const controlling = state.gameData.controllingTeam as string;
        const teams = state.gameData.teams as { team1: { score: number }; team2: { score: number } };
        const points = state.gameData.roundPoints as number;
        
        if (controlling === 'team1') teams.team1.score += points;
        else if (controlling === 'team2') teams.team2.score += points;

        // Also update individual player scores for the leaderboard
        const controllingTeamData = controlling === 'team1' 
            ? (state.gameData.teams as { team1: { playerIds: string[] } }).team1
            : (state.gameData.teams as { team2: { playerIds: string[] } }).team2;
        
        const perPlayer = Math.floor(points / Math.max(controllingTeamData.playerIds.length, 1));
        for (const pid of controllingTeamData.playerIds) {
            const player = state.players.find(p => p.id === pid);
            if (player) player.score += perPlayer;
        }
    },

    isRoundOver(state: GameState): boolean {
        return (state.gameData.phase as string) === 'round_result';
    },

    getRoundResults(state: GameState): { scores: Record<string, number>; summary: Record<string, unknown> } {
        const scores: Record<string, number> = {};
        for (const player of state.players) {
            scores[player.id] = 0; // Scores applied directly
        }
        const teams = state.gameData.teams as { team1: { name: string; score: number }; team2: { name: string; score: number } };
        return {
            scores,
            summary: {
                question: (state.gameData.currentQuestion as SurveyQuestion)?.question,
                answers: (state.gameData.currentQuestion as SurveyQuestion)?.answers,
                revealedAnswers: state.gameData.revealedAnswers,
                team1Score: teams.team1.score,
                team2Score: teams.team2.score,
                team1Name: teams.team1.name,
                team2Name: teams.team2.name,
                roundPoints: state.gameData.roundPoints,
            },
        };
    },

    isGameOver(state: GameState): boolean {
        return state.round >= state.totalRounds || state.status === 'finished';
    },
} as GameHandler & { _tryRevealAnswer: (state: GameState, guess: string) => boolean; _awardRoundPoints: (state: GameState) => void };
