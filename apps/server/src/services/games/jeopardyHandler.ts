import { GameHandler, GameState } from '../gameEngine.js';

// ============================================
// Question Packs by Category
// ============================================

interface JeopardyClue {
    clue: string;
    answer: string;
    value: number;
}

interface JeopardyCategory {
    name: string;
    clues: JeopardyClue[];
}

// Pre-built question packs
const QUESTION_PACKS: Record<string, JeopardyCategory[]> = {
    general: [
        {
            name: 'World Geography',
            clues: [
                { clue: 'This is the longest river in Africa', answer: 'The Nile', value: 200 },
                { clue: 'This country has the most natural lakes', answer: 'Canada', value: 400 },
                { clue: 'This desert is the largest hot desert in the world', answer: 'The Sahara', value: 600 },
                { clue: 'This mountain range separates Europe from Asia', answer: 'The Ural Mountains', value: 800 },
                { clue: 'This is the only continent with land in all four hemispheres', answer: 'Africa', value: 1000 },
            ],
        },
        {
            name: 'Science & Nature',
            clues: [
                { clue: 'This element has the chemical symbol Fe', answer: 'Iron', value: 200 },
                { clue: 'This planet has the shortest day in our solar system', answer: 'Jupiter', value: 400 },
                { clue: 'This is the only mammal capable of true flight', answer: 'A bat', value: 600 },
                { clue: 'This gas makes up about 78% of Earth\'s atmosphere', answer: 'Nitrogen', value: 800 },
                { clue: 'This scientist proposed the theory of general relativity', answer: 'Albert Einstein', value: 1000 },
            ],
        },
        {
            name: 'History',
            clues: [
                { clue: 'This empire was the largest contiguous land empire in history', answer: 'The Mongol Empire', value: 200 },
                { clue: 'This ancient wonder was located in Alexandria, Egypt', answer: 'The Lighthouse (Pharos)', value: 400 },
                { clue: 'This treaty ended World War I', answer: 'The Treaty of Versailles', value: 600 },
                { clue: 'This civilization invented the concept of zero', answer: 'The Maya (or ancient Indians)', value: 800 },
                { clue: 'This wall was built in 122 AD across northern England', answer: 'Hadrian\'s Wall', value: 1000 },
            ],
        },
        {
            name: 'Pop Culture',
            clues: [
                { clue: 'This streaming service released "Squid Game"', answer: 'Netflix', value: 200 },
                { clue: 'This artist painted "Starry Night"', answer: 'Vincent van Gogh', value: 400 },
                { clue: 'This video game franchise features a character named Master Chief', answer: 'Halo', value: 600 },
                { clue: 'This director is known for "Pulp Fiction" and "Kill Bill"', answer: 'Quentin Tarantino', value: 800 },
                { clue: 'This novel by George Orwell depicts a dystopian future with Big Brother', answer: '1984', value: 1000 },
            ],
        },
        {
            name: 'Food & Drink',
            clues: [
                { clue: 'This fruit is known as the "king of fruits" in Southeast Asia', answer: 'Durian', value: 200 },
                { clue: 'This Italian dish literally means "pick me up"', answer: 'Tiramisu', value: 400 },
                { clue: 'This spice comes from the crocus flower and is the most expensive by weight', answer: 'Saffron', value: 600 },
                { clue: 'This country is the world\'s largest producer of coffee', answer: 'Brazil', value: 800 },
                { clue: 'This Japanese spirit is distilled from sweet potatoes, barley, or rice', answer: 'Shochu', value: 1000 },
            ],
        },
        {
            name: 'Sports',
            clues: [
                { clue: 'This sport uses a shuttlecock', answer: 'Badminton', value: 200 },
                { clue: 'This country has won the most FIFA World Cup titles', answer: 'Brazil', value: 400 },
                { clue: 'This is the only Grand Slam tennis tournament played on clay', answer: 'The French Open (Roland Garros)', value: 600 },
                { clue: 'This boxer was known as "The Greatest" and "The Louisville Lip"', answer: 'Muhammad Ali', value: 800 },
                { clue: 'This ancient Greek event was the only competition in the first Olympic Games', answer: 'The stadion (foot race)', value: 1000 },
            ],
        },
    ],
    islamic: [
        {
            name: 'Prophets',
            clues: [
                { clue: 'This prophet built the Ark', answer: 'Prophet Nuh (Noah)', value: 200 },
                { clue: 'This prophet was given the Zabur (Psalms)', answer: 'Prophet Dawud (David)', value: 400 },
                { clue: 'This prophet was thrown into a fire that became cool', answer: 'Prophet Ibrahim (Abraham)', value: 600 },
                { clue: 'This prophet could speak to animals and control the wind', answer: 'Prophet Sulaiman (Solomon)', value: 800 },
                { clue: 'This prophet is mentioned the most times in the Quran', answer: 'Prophet Musa (Moses)', value: 1000 },
            ],
        },
        {
            name: 'Quran',
            clues: [
                { clue: 'This is the first surah revealed to Prophet Muhammad (PBUH)', answer: 'Surah Al-Alaq', value: 200 },
                { clue: 'This surah is known as the "Heart of the Quran"', answer: 'Surah Yasin', value: 400 },
                { clue: 'This is the total number of surahs in the Quran', answer: '114', value: 600 },
                { clue: 'This surah is equivalent to one-third of the Quran in reward', answer: 'Surah Al-Ikhlas', value: 800 },
                { clue: 'This is the longest ayah (verse) in the Quran', answer: 'Ayat al-Dayn (2:282)', value: 1000 },
            ],
        },
        {
            name: 'Islamic History',
            clues: [
                { clue: 'This year marks the Hijra (migration) from Mecca to Medina', answer: '622 CE', value: 200 },
                { clue: 'This was the first battle fought by Muslims', answer: 'The Battle of Badr', value: 400 },
                { clue: 'This caliph compiled the Quran into a single book', answer: 'Abu Bakr (compiled) / Uthman (standardized)', value: 600 },
                { clue: 'This dynasty built the Alhambra palace in Spain', answer: 'The Nasrid dynasty', value: 800 },
                { clue: 'This Muslim scholar is known as the "Father of Algebra"', answer: 'Al-Khwarizmi', value: 1000 },
            ],
        },
        {
            name: 'Pillars & Practices',
            clues: [
                { clue: 'This is the first pillar of Islam', answer: 'Shahada (declaration of faith)', value: 200 },
                { clue: 'This month is when Muslims fast from dawn to sunset', answer: 'Ramadan', value: 400 },
                { clue: 'This is the minimum percentage of wealth given as Zakat', answer: '2.5%', value: 600 },
                { clue: 'This is the name of the pilgrimage to Mecca', answer: 'Hajj', value: 800 },
                { clue: 'This is the number of daily obligatory prayers', answer: 'Five', value: 1000 },
            ],
        },
        {
            name: 'Islamic Culture',
            clues: [
                { clue: 'This greeting means "Peace be upon you"', answer: 'Assalamu Alaikum', value: 200 },
                { clue: 'This art form uses geometric patterns because of the emphasis on aniconism', answer: 'Islamic geometric art / Arabesque', value: 400 },
                { clue: 'This style of writing is considered the highest art form in Islamic culture', answer: 'Calligraphy', value: 600 },
                { clue: 'This city contains the Dome of the Rock', answer: 'Jerusalem', value: 800 },
                { clue: 'This scholar wrote "The Canon of Medicine" used in Europe for centuries', answer: 'Ibn Sina (Avicenna)', value: 1000 },
            ],
        },
        {
            name: 'Modern Muslim World',
            clues: [
                { clue: 'This country has the largest Muslim population', answer: 'Indonesia', value: 200 },
                { clue: 'This organization represents Muslim-majority countries internationally', answer: 'OIC (Organisation of Islamic Cooperation)', value: 400 },
                { clue: 'This Muslim-majority country was the first to have a female head of state', answer: 'Pakistan (Benazir Bhutto)', value: 600 },
                { clue: 'This mosque in Turkey was originally a Christian cathedral', answer: 'Hagia Sophia', value: 800 },
                { clue: 'This annual award is considered the "Nobel Prize of the Muslim world"', answer: 'King Faisal International Prize', value: 1000 },
            ],
        },
    ],
};

// Final Jeopardy clues
const FINAL_JEOPARDY_CLUES: { category: string; clue: string; answer: string }[] = [
    { category: 'World Leaders', clue: 'This leader united the Arabian Peninsula and established the Kingdom of Saudi Arabia in 1932', answer: 'Abdulaziz ibn Abdul Rahman Al Saud (Ibn Saud)' },
    { category: 'Ancient Wonders', clue: 'This is the only ancient wonder of the world still standing today', answer: 'The Great Pyramid of Giza' },
    { category: 'Space', clue: 'This is the most distant human-made object from Earth', answer: 'Voyager 1' },
    { category: 'Literature', clue: 'This 14th-century Muslim traveler wrote one of the most famous travel accounts in history', answer: 'Ibn Battuta' },
    { category: 'Mathematics', clue: 'This number system, which we use today, was transmitted to Europe through Arabic scholars', answer: 'Hindu-Arabic numeral system' },
];

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export const jeopardyHandler: GameHandler = {
    type: 'jeopardy',
    minPlayers: 2,
    maxPlayers: 12,
    defaultRounds: 30, // 6 categories x 5 clues = 30 clues

    createInitialState(settings: Record<string, unknown>): Record<string, unknown> {
        const pack = (settings.pack as string) || 'general';
        const categories = QUESTION_PACKS[pack] || QUESTION_PACKS.general;
        
        // Pick 6 categories, shuffle
        const selectedCategories = shuffleArray(categories).slice(0, 6);
        
        // Build the board: each cell tracks if it's been played
        const board: { categoryIndex: number; clueIndex: number; value: number; played: boolean }[][] = [];
        for (let ci = 0; ci < selectedCategories.length; ci++) {
            const col: { categoryIndex: number; clueIndex: number; value: number; played: boolean }[] = [];
            for (let ri = 0; ri < selectedCategories[ci].clues.length; ri++) {
                col.push({ categoryIndex: ci, clueIndex: ri, value: selectedCategories[ci].clues[ri].value, played: false });
            }
            board.push(col);
        }

        const finalClue = shuffleArray(FINAL_JEOPARDY_CLUES)[0];

        return {
            categories: selectedCategories,
            board,
            activeClue: null, // { categoryIndex, clueIndex, clue, value }
            buzzerOpen: false,
            buzzedPlayerId: null,
            buzzTimestamps: {} as Record<string, number>,
            cluesPlayed: 0,
            totalClues: selectedCategories.length * 5,
            phase: 'board', // 'board' | 'clue' | 'buzzer' | 'answer' | 'final_category' | 'final_wager' | 'final_answer' | 'final_reveal'
            lastCorrectPlayerId: null, // This player picks next
            finalJeopardy: finalClue,
            finalWagers: {} as Record<string, number>,
            finalAnswers: {} as Record<string, string>,
            hostMode: true, // Jeopardy is designed for host-as-display
            timerDuration: 30,
        };
    },

    onRoundStart(state: GameState): GameState {
        // Jeopardy doesn't use traditional rounds — the host selects clues
        // This is called once at game start
        state.gameData.phase = 'board';
        state.timerDuration = 30;
        return state;
    },

    handleAction(state: GameState, playerId: string, action: string, payload: Record<string, unknown>): GameState {
        const phase = state.gameData.phase as string;

        switch (action) {
            case 'select_clue': {
                // Only the last correct player (or host) can select
                const canSelect = playerId === state.hostId || playerId === state.gameData.lastCorrectPlayerId || !state.gameData.lastCorrectPlayerId;
                if (!canSelect || phase !== 'board') return state;

                const ci = payload.categoryIndex as number;
                const ri = payload.clueIndex as number;
                const board = state.gameData.board as { categoryIndex: number; clueIndex: number; value: number; played: boolean }[][];
                
                if (!board[ci] || !board[ci][ri] || board[ci][ri].played) return state;

                board[ci][ri].played = true;
                const categories = state.gameData.categories as JeopardyCategory[];
                const clue = categories[ci].clues[ri];

                state.gameData.activeClue = { categoryIndex: ci, clueIndex: ri, clue: clue.clue, value: clue.value };
                state.gameData._private_answer = clue.answer;
                state.gameData.phase = 'clue';
                state.gameData.buzzTimestamps = {};
                state.gameData.buzzedPlayerId = null;
                state.gameData.buzzerOpen = false;
                state.gameData.cluesPlayed = (state.gameData.cluesPlayed as number) + 1;
                break;
            }

            case 'open_buzzer': {
                // Host opens buzzer after reading the clue
                if (playerId !== state.hostId || phase !== 'clue') return state;
                state.gameData.buzzerOpen = true;
                state.gameData.phase = 'buzzer';
                state.gameData.buzzTimestamps = {};
                break;
            }

            case 'buzz': {
                if (phase !== 'buzzer' || !state.gameData.buzzerOpen) return state;
                const timestamps = state.gameData.buzzTimestamps as Record<string, number>;
                if (timestamps[playerId]) return state; // Already buzzed
                
                timestamps[playerId] = Date.now();
                
                // First buzz wins
                if (!state.gameData.buzzedPlayerId) {
                    state.gameData.buzzedPlayerId = playerId;
                    state.gameData.phase = 'answer';
                }
                break;
            }

            case 'judge_answer': {
                // Host judges if the answer was correct
                if (playerId !== state.hostId || phase !== 'answer') return state;
                const correct = payload.correct as boolean;
                const buzzedPlayer = state.gameData.buzzedPlayerId as string;
                const activeClue = state.gameData.activeClue as { value: number } | null;
                
                if (!buzzedPlayer || !activeClue) return state;

                const player = state.players.find(p => p.id === buzzedPlayer);
                if (player) {
                    if (correct) {
                        player.score += activeClue.value;
                        state.gameData.lastCorrectPlayerId = buzzedPlayer;
                        state.gameData.phase = 'board';
                        state.gameData.activeClue = null;
                    } else {
                        player.score -= activeClue.value;
                        // Reopen buzzer for others
                        state.gameData.buzzedPlayerId = null;
                        state.gameData.phase = 'buzzer';
                    }
                }
                break;
            }

            case 'skip_clue': {
                // Host skips (no one buzzed or time ran out)
                if (playerId !== state.hostId) return state;
                state.gameData.phase = 'board';
                state.gameData.activeClue = null;
                break;
            }

            case 'start_final': {
                if (playerId !== state.hostId) return state;
                state.gameData.phase = 'final_category';
                break;
            }

            case 'reveal_final_category': {
                if (playerId !== state.hostId) return state;
                state.gameData.phase = 'final_wager';
                break;
            }

            case 'final_wager': {
                if (phase !== 'final_wager') return state;
                const wager = Math.min(Math.max(0, payload.wager as number), Math.max(0, state.players.find(p => p.id === playerId)?.score || 0));
                (state.gameData.finalWagers as Record<string, number>)[playerId] = wager;
                
                // Check if all players wagered
                const activePlayers = state.players.filter(p => p.isConnected && !p.isHost);
                const allWagered = activePlayers.every(p => (state.gameData.finalWagers as Record<string, number>)[p.id] !== undefined);
                if (allWagered) {
                    state.gameData.phase = 'final_answer';
                }
                break;
            }

            case 'final_answer': {
                if (phase !== 'final_answer') return state;
                (state.gameData.finalAnswers as Record<string, string>)[playerId] = (payload.answer as string) || '';
                
                const activePlayers = state.players.filter(p => p.isConnected && !p.isHost);
                const allAnswered = activePlayers.every(p => (state.gameData.finalAnswers as Record<string, string>)[p.id] !== undefined);
                if (allAnswered) {
                    state.gameData.phase = 'final_reveal';
                }
                break;
            }

            case 'judge_final': {
                // Host judges each player's final answer
                if (playerId !== state.hostId || phase !== 'final_reveal') return state;
                const targetId = payload.targetPlayerId as string;
                const isCorrect = payload.correct as boolean;
                const player = state.players.find(p => p.id === targetId);
                const wager = (state.gameData.finalWagers as Record<string, number>)[targetId] || 0;
                
                if (player) {
                    player.score += isCorrect ? wager : -wager;
                }
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

    isRoundOver(state: GameState): boolean {
        return state.status === 'finished';
    },

    getRoundResults(state: GameState): { scores: Record<string, number>; summary: Record<string, unknown> } {
        const scores: Record<string, number> = {};
        for (const player of state.players) {
            scores[player.id] = 0; // Scores already applied directly
        }
        return {
            scores,
            summary: {
                finalScores: state.players.map(p => ({ name: p.name, score: p.score })).sort((a, b) => b.score - a.score),
                cluesPlayed: state.gameData.cluesPlayed,
                totalClues: state.gameData.totalClues,
            },
        };
    },

    isGameOver(state: GameState): boolean {
        return state.status === 'finished';
    },
};
