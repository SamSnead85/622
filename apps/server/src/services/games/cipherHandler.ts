import { GameHandler, GameState } from '../gameEngine.js';
import { logger } from '../../utils/logger.js';

// ============================================
// Word Bank (200+ words)
// ============================================

const WORD_BANK: string[] = [
    // Nature
    'Mountain', 'River', 'Forest', 'Ocean', 'Desert', 'Valley', 'Volcano', 'Island',
    'Glacier', 'Canyon', 'Meadow', 'Reef', 'Jungle', 'Prairie', 'Swamp', 'Tundra',
    // Animals
    'Eagle', 'Wolf', 'Tiger', 'Dolphin', 'Elephant', 'Falcon', 'Shark', 'Penguin',
    'Lion', 'Bear', 'Hawk', 'Whale', 'Fox', 'Cobra', 'Panther', 'Owl',
    // Food & Drink
    'Pizza', 'Chocolate', 'Coffee', 'Sushi', 'Honey', 'Pepper', 'Lemon', 'Olive',
    'Bread', 'Cheese', 'Apple', 'Mango', 'Rice', 'Ginger', 'Vanilla', 'Cinnamon',
    // Objects
    'Diamond', 'Crown', 'Shield', 'Sword', 'Mirror', 'Clock', 'Telescope', 'Compass',
    'Lantern', 'Anchor', 'Bell', 'Chain', 'Drum', 'Flag', 'Globe', 'Hammer',
    'Key', 'Ladder', 'Needle', 'Pearl', 'Ring', 'Rope', 'Scale', 'Torch',
    // Places & Buildings
    'Castle', 'Temple', 'Bridge', 'Tower', 'Palace', 'Garden', 'Harbor', 'Market',
    'Theater', 'Stadium', 'Library', 'Museum', 'Hospital', 'Factory', 'Prison', 'Vault',
    // People & Roles
    'Knight', 'Pirate', 'Doctor', 'Pilot', 'Spy', 'Chef', 'Artist', 'Captain',
    'Guard', 'Judge', 'King', 'Queen', 'Monk', 'Nurse', 'Scout', 'Thief',
    // Science & Tech
    'Robot', 'Laser', 'Rocket', 'Atom', 'Plasma', 'Circuit', 'Radar', 'Virus',
    'Code', 'Data', 'Pixel', 'Signal', 'Drone', 'Engine', 'Filter', 'Lens',
    // Abstract & Concepts
    'Shadow', 'Ghost', 'Spirit', 'Dream', 'Storm', 'Fire', 'Thunder', 'Eclipse',
    'Dawn', 'Dusk', 'Frost', 'Wave', 'Flame', 'Spark', 'Smoke', 'Ash',
    // Actions & Verbs (as nouns)
    'Strike', 'Launch', 'Charge', 'Rush', 'Blast', 'Crash', 'Drift', 'March',
    'Leap', 'Dive', 'Slide', 'Twist', 'Spin', 'Chase', 'Hunt', 'Race',
    // Colors & Materials
    'Gold', 'Silver', 'Iron', 'Steel', 'Copper', 'Bronze', 'Crystal', 'Marble',
    'Silk', 'Velvet', 'Cotton', 'Leather', 'Stone', 'Amber', 'Ruby', 'Jade',
    // Music & Arts
    'Jazz', 'Blues', 'Opera', 'Ballet', 'Piano', 'Guitar', 'Violin', 'Trumpet',
    'Canvas', 'Sketch', 'Mural', 'Statue', 'Poem', 'Novel', 'Drama', 'Comedy',
    // Sports & Games
    'Goal', 'Match', 'Round', 'Score', 'Tackle', 'Sprint', 'Rally', 'Serve',
    'Pitch', 'Court', 'Arena', 'Track', 'Pool', 'Ring', 'Field', 'Net',
    // Weather & Space
    'Comet', 'Star', 'Moon', 'Planet', 'Nebula', 'Orbit', 'Meteor', 'Aurora',
    'Cloud', 'Rain', 'Snow', 'Wind', 'Fog', 'Ice', 'Hail', 'Breeze',
];

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

interface GridWord {
    word: string;
    team: 'A' | 'B' | 'neutral' | 'trap';
    revealed: boolean;
}

export const cipherHandler: GameHandler = {
    type: 'cipher',
    minPlayers: 4,
    maxPlayers: 10,
    defaultRounds: 1, // One full game per round

    createInitialState(settings: Record<string, any>): Record<string, any> {
        return {
            gridSize: 25,
            teamAWordsCount: 9,
            teamBWordsCount: 8,
            trapCount: 1,
            timerDuration: settings.timerSeconds || 60,
        };
    },

    onRoundStart(state: GameState): GameState {
        // Divide players into teams
        const players = shuffleArray([...state.players.filter(p => p.isConnected)]);
        const midpoint = Math.ceil(players.length / 2);
        const teamA = players.slice(0, midpoint).map(p => p.id);
        const teamB = players.slice(midpoint).map(p => p.id);

        // Assign spymasters (first player of each team)
        const spymasterA = teamA[0];
        const spymasterB = teamB[0];

        // Generate grid
        const words = shuffleArray([...WORD_BANK]).slice(0, 25);
        const assignments = shuffleArray([
            ...Array(9).fill('A'),
            ...Array(8).fill('B'),
            ...Array(1).fill('trap'),
            ...Array(7).fill('neutral'),
        ]) as ('A' | 'B' | 'neutral' | 'trap')[];

        const grid: GridWord[] = words.map((word, i) => ({
            word,
            team: assignments[i],
            revealed: false,
        }));

        // Create the public grid (words only, no team assignments)
        const publicGrid = grid.map(g => ({
            word: g.word,
            revealed: false,
            team: null as string | null,
        }));

        state.gameData.grid = grid;
        state.gameData.publicGrid = publicGrid;
        state.gameData.teamA = teamA;
        state.gameData.teamB = teamB;
        state.gameData.spymasterA = spymasterA;
        state.gameData.spymasterB = spymasterB;
        state.gameData.currentTeam = 'A'; // Team A goes first (has 9 words)
        state.gameData.clue = null;
        state.gameData.clueNumber = 0;
        state.gameData.guessesRemaining = 0;
        state.gameData.teamARevealed = 0;
        state.gameData.teamBRevealed = 0;
        state.gameData.gameOver = false;
        state.gameData.winner = null;
        state.gameData.trapHit = false;
        state.gameData.phase = 'spymaster_clue'; // 'spymaster_clue' | 'team_guess'
        state.timerDuration = state.gameData.timerDuration;

        // Give spymasters the full grid
        state.gameData[`_player_${spymasterA}`] = {
            role: 'spymaster',
            team: 'A',
            fullGrid: grid.map(g => ({ word: g.word, team: g.team })),
        };
        state.gameData[`_player_${spymasterB}`] = {
            role: 'spymaster',
            team: 'B',
            fullGrid: grid.map(g => ({ word: g.word, team: g.team })),
        };

        // Tell other players their team
        for (const pid of teamA) {
            if (pid !== spymasterA) {
                state.gameData[`_player_${pid}`] = { role: 'guesser', team: 'A' };
            }
        }
        for (const pid of teamB) {
            if (pid !== spymasterB) {
                state.gameData[`_player_${pid}`] = { role: 'guesser', team: 'B' };
            }
        }

        return state;
    },

    handleAction(state: GameState, playerId: string, action: string, payload: any): GameState {
        if (state.gameData.gameOver) return state;

        const { currentTeam, teamA, teamB, spymasterA, spymasterB, grid, publicGrid } = state.gameData;
        const currentSpymaster = currentTeam === 'A' ? spymasterA : spymasterB;
        const currentTeamMembers = currentTeam === 'A' ? teamA : teamB;

        if (action === 'give_clue' && state.gameData.phase === 'spymaster_clue') {
            // Only current team's spymaster can give clue
            if (playerId !== currentSpymaster) return state;

            const { clue, number } = payload;
            if (typeof clue !== 'string' || clue.length === 0 || clue.length > 50) return state;
            if (typeof number !== 'number' || number < 1 || number > 9) return state;

            state.gameData.clue = clue;
            state.gameData.clueNumber = number;
            state.gameData.guessesRemaining = number + 1; // Can guess one extra
            state.gameData.phase = 'team_guess';
        } else if (action === 'guess_word' && state.gameData.phase === 'team_guess') {
            // Only current team guessers (not spymaster) can guess
            if (!currentTeamMembers.includes(playerId)) return state;
            if (playerId === currentSpymaster) return state;
            if (state.gameData.guessesRemaining <= 0) return state;

            const { wordIndex } = payload;
            if (typeof wordIndex !== 'number' || wordIndex < 0 || wordIndex >= 25) return state;

            const gridWord = grid[wordIndex] as GridWord;
            if (gridWord.revealed) return state; // Already revealed

            // Reveal the word
            gridWord.revealed = true;
            publicGrid[wordIndex].revealed = true;
            publicGrid[wordIndex].team = gridWord.team;
            state.gameData.guessesRemaining--;

            if (gridWord.team === 'trap') {
                // Hit the trap! Instant loss
                state.gameData.gameOver = true;
                state.gameData.trapHit = true;
                state.gameData.winner = currentTeam === 'A' ? 'B' : 'A';
                state.gameData.phase = 'spymaster_clue'; // End
            } else if (gridWord.team === currentTeam) {
                // Correct guess!
                if (currentTeam === 'A') {
                    state.gameData.teamARevealed++;
                } else {
                    state.gameData.teamBRevealed++;
                }

                // Check win condition
                if (state.gameData.teamARevealed >= state.gameData.teamAWordsCount) {
                    state.gameData.gameOver = true;
                    state.gameData.winner = 'A';
                } else if (state.gameData.teamBRevealed >= state.gameData.teamBWordsCount) {
                    state.gameData.gameOver = true;
                    state.gameData.winner = 'B';
                } else if (state.gameData.guessesRemaining <= 0) {
                    // No more guesses, switch team
                    state.gameData.currentTeam = currentTeam === 'A' ? 'B' : 'A';
                    state.gameData.clue = null;
                    state.gameData.clueNumber = 0;
                    state.gameData.phase = 'spymaster_clue';
                }
                // Otherwise, continue guessing
            } else if (gridWord.team === 'neutral') {
                // Neutral word, end turn
                state.gameData.currentTeam = currentTeam === 'A' ? 'B' : 'A';
                state.gameData.clue = null;
                state.gameData.clueNumber = 0;
                state.gameData.guessesRemaining = 0;
                state.gameData.phase = 'spymaster_clue';
            } else {
                // Opponent's word! Gives them a reveal + end turn
                if (gridWord.team === 'A') {
                    state.gameData.teamARevealed++;
                } else {
                    state.gameData.teamBRevealed++;
                }

                // Check if this accidentally completed the opponent's set
                if (state.gameData.teamARevealed >= state.gameData.teamAWordsCount) {
                    state.gameData.gameOver = true;
                    state.gameData.winner = 'A';
                } else if (state.gameData.teamBRevealed >= state.gameData.teamBWordsCount) {
                    state.gameData.gameOver = true;
                    state.gameData.winner = 'B';
                } else {
                    state.gameData.currentTeam = currentTeam === 'A' ? 'B' : 'A';
                    state.gameData.clue = null;
                    state.gameData.clueNumber = 0;
                    state.gameData.guessesRemaining = 0;
                    state.gameData.phase = 'spymaster_clue';
                }
            }
        } else if (action === 'end_turn' && state.gameData.phase === 'team_guess') {
            // Current team ends their turn voluntarily
            if (!currentTeamMembers.includes(playerId)) return state;

            state.gameData.currentTeam = currentTeam === 'A' ? 'B' : 'A';
            state.gameData.clue = null;
            state.gameData.clueNumber = 0;
            state.gameData.guessesRemaining = 0;
            state.gameData.phase = 'spymaster_clue';
        }

        return state;
    },

    isRoundOver(state: GameState): boolean {
        return state.gameData.gameOver === true;
    },

    getRoundResults(state: GameState): { scores: Record<string, number>; summary: any } {
        const { winner, teamA, teamB, grid, trapHit } = state.gameData;
        const scores: Record<string, number> = {};

        const winningTeam = winner === 'A' ? teamA : teamB;
        const losingTeam = winner === 'A' ? teamB : teamA;

        for (const pid of winningTeam) {
            scores[pid] = 100;
        }
        for (const pid of losingTeam) {
            scores[pid] = 0;
        }

        // Ensure all players have a score entry
        for (const player of state.players) {
            if (scores[player.id] === undefined) {
                scores[player.id] = 0;
            }
        }

        return {
            scores,
            summary: {
                winner,
                teamA,
                teamB,
                trapHit,
                fullGrid: grid.map((g: GridWord) => ({ word: g.word, team: g.team, revealed: g.revealed })),
                teamARevealed: state.gameData.teamARevealed,
                teamBRevealed: state.gameData.teamBRevealed,
            },
        };
    },

    isGameOver(state: GameState): boolean {
        return state.round >= state.totalRounds;
    },
};
