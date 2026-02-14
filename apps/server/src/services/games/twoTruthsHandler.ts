import { GameHandler, GameState } from '../gameEngine.js';

// ============================================
// Two Truths & a Lie — Game Handler
// ============================================
// Each round one player is the "storyteller" who submits
// 3 statements (2 truths + 1 lie). Other players guess
// which statement is the lie.
// ============================================

// ============================================
// Types
// ============================================

interface StatementSet {
    statements: [string, string, string];
    lieIndex: number; // 0, 1, or 2
}

// ============================================
// Pre-made Statement Sets (30+)
// Each has 2 truths and 1 lie — the lie is at lieIndex
// ============================================

const PREMADE_SETS: StatementSet[] = [
    // Animals & Nature
    { statements: ['Octopuses have three hearts', 'A group of flamingos is called a "flamboyance"', 'Dolphins sleep with both eyes closed'], lieIndex: 2 },
    { statements: ['Honey never spoils', 'Bananas are berries', 'Strawberries are a type of berry'], lieIndex: 2 },
    { statements: ['A snail can sleep for three years', 'Sharks are older than trees', 'Elephants are the only animals that can\'t jump'], lieIndex: 2 },
    { statements: ['Cows have best friends', 'Sloths can hold their breath longer than dolphins', 'Cats have fewer toes on their back paws'], lieIndex: 1 },
    { statements: ['Koalas have fingerprints nearly identical to humans', 'A shrimp\'s heart is in its head', 'Penguins can fly short distances when scared'], lieIndex: 2 },

    // History & Geography
    { statements: ['Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid', 'Oxford University is older than the Aztec Empire', 'The Great Wall of China is visible from space with the naked eye'], lieIndex: 2 },
    { statements: ['Russia has a larger surface area than Pluto', 'Canada has more lakes than the rest of the world combined', 'Australia is wider than the Moon'], lieIndex: 0 },
    { statements: ['The shortest war in history lasted 38 minutes', 'Ancient Romans used urine as mouthwash', 'Napoleon was unusually short for his time'], lieIndex: 2 },
    { statements: ['There are more stars in the universe than grains of sand on Earth', 'Alaska is simultaneously the most northern, western, and eastern state in the US', 'Mount Everest is the closest point on Earth to the Sun'], lieIndex: 2 },
    { statements: ['The inventor of the Pringles can is buried in one', 'The unicorn is Scotland\'s national animal', 'The Eiffel Tower was originally built for Barcelona'], lieIndex: 2 },

    // Science & Technology
    { statements: ['Hot water freezes faster than cold water', 'A teaspoon of a neutron star weighs about 6 billion tons', 'Lightning never strikes the same place twice'], lieIndex: 2 },
    { statements: ['Your stomach gets a new lining every 3-4 days', 'Humans share 60% of their DNA with bananas', 'The human body contains enough iron to make a 6-inch nail'], lieIndex: 2 },
    { statements: ['Venus is the only planet that spins clockwise', 'Sound travels faster in water than in air', 'There is no gravity in space'], lieIndex: 2 },
    { statements: ['Humans glow in the dark (just too faintly to see)', 'Babies are born with about 300 bones', 'Adults have more bones than babies'], lieIndex: 2 },
    { statements: ['WiFi was invented in Australia', 'The first computer virus was created in 1986', 'The first email was sent in 1995'], lieIndex: 2 },

    // Food & Culture
    { statements: ['Peanuts are not actually nuts', 'White chocolate isn\'t technically chocolate', 'Sushi means "raw fish" in Japanese'], lieIndex: 2 },
    { statements: ['Ketchup was once sold as medicine', 'Carrots were originally purple', 'Avocados are vegetables'], lieIndex: 2 },
    { statements: ['The most expensive pizza in the world costs over $12,000', 'Apples float in water because they are 25% air', 'Chocolate was once used as currency by the Aztecs'], lieIndex: 0 },
    { statements: ['Fortune cookies were invented in America, not China', 'Bubble wrap was originally intended as wallpaper', 'Cotton candy was invented by a dentist'], lieIndex: 0 },
    { statements: ['The hashtag symbol is technically called an octothorpe', 'The word "nerd" was first coined by Dr. Seuss', 'The word "robot" comes from a German word meaning "worker"'], lieIndex: 2 },

    // Human Body & Psychology
    { statements: ['You can\'t hum while holding your nose', 'Your nose can remember 50,000 different scents', 'Humans can only distinguish about 100 different smells'], lieIndex: 2 },
    { statements: ['It\'s impossible to lick your own elbow', 'The average person walks the equivalent of 5 times around the Earth in a lifetime', 'Humans use only 10% of their brain'], lieIndex: 2 },
    { statements: ['Crying makes you feel better because tears release stress hormones', 'The human brain is more active during sleep than during the day', 'Yawning is contagious even between humans and dogs'], lieIndex: 1 },
    { statements: ['Your cornea is one of only two parts of the body with no blood supply', 'Fingernails grow faster than toenails', 'Hair and nails continue to grow after death'], lieIndex: 2 },
    { statements: ['Laughing 100 times is equivalent to 15 minutes of exercise on a bike', 'The average person spends 6 months of their lifetime waiting for red lights', 'Humans can survive longer without food than without sleep'], lieIndex: 0 },

    // Pop Culture & Entertainment
    { statements: ['The "M" in M&Ms stands for Mars and Murrie', 'Monopoly was invented to teach about the dangers of capitalism', 'The board game Risk was invented during World War II'], lieIndex: 2 },
    { statements: ['Nintendo was founded in 1889', 'Mario was originally called "Jumpman"', 'Pac-Man was designed to look like a pizza with a slice missing'], lieIndex: 2 },
    { statements: ['The first YouTube video was uploaded on April 23, 2005', 'Google\'s first tweet was in binary', 'Facebook was originally called "TheFacebook"'], lieIndex: 0 },
    { statements: ['The Mona Lisa has no eyebrows', 'Vincent van Gogh only sold one painting during his lifetime', 'Picasso could draw before he could walk'], lieIndex: 2 },
    { statements: ['A "jiffy" is an actual unit of time (1/100th of a second)', 'The word "set" has the most definitions of any English word', 'The dot over the letter "i" is called a "tittle"'], lieIndex: 0 },

    // Space & Weird Facts
    { statements: ['There are more possible iterations of a game of chess than atoms in the observable universe', 'A day on Venus is longer than a year on Venus', 'The Sun makes up 99.86% of the mass of the solar system'], lieIndex: 0 },
    { statements: ['Astronauts grow up to 2 inches taller in space', 'It rains diamonds on Saturn and Jupiter', 'The Moon has its own time zone'], lieIndex: 2 },
    { statements: ['Wombat poop is cube-shaped', 'A group of pugs is called a "grumble"', 'Goldfish have a 3-second memory'], lieIndex: 2 },
    { statements: ['The inventor of the fire hydrant is unknown because the patent was destroyed in a fire', 'A bolt of lightning is 5 times hotter than the surface of the Sun', 'Thunder is caused by lightning heating the air to the temperature of the Sun'], lieIndex: 2 },
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
// Handler
// ============================================

export const twoTruthsHandler: GameHandler = {
    type: 'two-truths',
    minPlayers: 3,
    maxPlayers: 8,
    defaultRounds: 0, // Set dynamically based on player count

    createInitialState(settings: Record<string, unknown>): Record<string, unknown> {
        return {
            premadeSets: shuffleArray([...PREMADE_SETS]),
            premadeIndex: 0,
            storytellerId: null,
            storytellerIndex: 0,
            statements: null as [string, string, string] | null,
            _secret_lieIndex: null as number | null,
            guesses: {} as Record<string, number>,     // playerId -> guessedIndex
            phase: 'waiting' as 'waiting' | 'storytelling' | 'guessing' | 'reveal',
            timerDuration: settings.timerSeconds || 20,
            revealData: null as {
                lieIndex: number;
                correctGuessers: string[];
                storytellerBonus: boolean;
            } | null,
        };
    },

    onRoundStart(state: GameState): GameState {
        const playerCount = state.players.filter(p => p.isConnected).length;

        // Each player gets 1 turn if <= 4 players, otherwise 1 turn each
        if (state.totalRounds === 0 || state.round === 1) {
            state.totalRounds = Math.min(playerCount, 8);
        }

        const storytellerIndex = (state.round - 1) % state.players.length;
        const storyteller = state.players[storytellerIndex];

        state.gameData.storytellerIndex = storytellerIndex;
        state.gameData.storytellerId = storyteller.id;
        state.gameData.statements = null;
        state.gameData._secret_lieIndex = null;
        state.gameData.guesses = {};
        state.gameData.phase = 'storytelling';
        state.gameData.revealData = null;
        state.timerDuration = state.gameData.timerDuration as number;

        // Send the next premade set index so the storyteller can use "random prompt"
        const premadeSets = state.gameData.premadeSets as StatementSet[];
        const premadeIndex = state.gameData.premadeIndex as number;
        const nextPremade = premadeSets[premadeIndex % premadeSets.length];

        // Store storyteller-specific private data
        state.gameData[`_player_${storyteller.id}`] = {
            isStoryteller: true,
            suggestedSet: nextPremade,
        };

        // Clear other players' private data
        for (const player of state.players) {
            if (player.id !== storyteller.id) {
                state.gameData[`_player_${player.id}`] = {
                    isStoryteller: false,
                };
            }
        }

        return state;
    },

    handleAction(state: GameState, playerId: string, action: string, payload: Record<string, unknown>): GameState {
        const { storytellerId } = state.gameData;

        if (action === 'truths:submit') {
            // Only the storyteller can submit statements
            if (playerId !== storytellerId) return state;
            // Can't submit twice
            if (state.gameData.statements !== null) return state;

            const { statements, lieIndex } = payload as {
                statements: [string, string, string];
                lieIndex: number;
            };

            // Validate
            if (!Array.isArray(statements) || statements.length !== 3) return state;
            if (typeof lieIndex !== 'number' || lieIndex < 0 || lieIndex > 2) return state;
            if (statements.some((s: string) => typeof s !== 'string' || s.trim().length === 0)) return state;

            state.gameData.statements = statements.map((s: string) => s.trim()) as unknown as [string, string, string];
            state.gameData._secret_lieIndex = lieIndex;
            state.gameData.phase = 'guessing';

            // Advance premade index for next time
            state.gameData.premadeIndex = ((state.gameData.premadeIndex as number) || 0) + 1;

            return state;
        }

        if (action === 'truths:guess') {
            // Storyteller can't guess
            if (playerId === storytellerId) return state;
            // Can't guess before statements are submitted
            if (state.gameData.phase !== 'guessing') return state;
            // Can't change guess
            if ((state.gameData.guesses as Record<string, number>)[playerId] !== undefined) return state;

            const { guessIndex } = payload as { guessIndex: number };
            if (typeof guessIndex !== 'number' || guessIndex < 0 || guessIndex > 2) return state;

            (state.gameData.guesses as Record<string, number>)[playerId] = guessIndex;

            return state;
        }

        return state;
    },

    isRoundOver(state: GameState): boolean {
        // Need statements submitted first
        if (state.gameData.statements === null) return false;
        if (state.gameData._secret_lieIndex === null) return false;

        // All connected non-storyteller players must have guessed
        const guessers = state.players.filter(
            p => p.id !== state.gameData.storytellerId && p.isConnected
        );
        const allGuessed = guessers.every(
            p => (state.gameData.guesses as Record<string, number>)[p.id] !== undefined
        );

        return allGuessed;
    },

    getRoundResults(state: GameState): { scores: Record<string, number>; summary: Record<string, unknown> } {
        const lieIndex = state.gameData._secret_lieIndex as number;
        const guesses = state.gameData.guesses as Record<string, number>;
        const storytellerId = state.gameData.storytellerId as string;
        const scores: Record<string, number> = {};

        const correctGuessers: string[] = [];
        let totalGuessers = 0;
        let wrongGuessers = 0;

        for (const player of state.players) {
            if (player.id === storytellerId) continue;
            if (!player.isConnected) continue;

            totalGuessers++;
            const guess = guesses[player.id];

            if (guess === lieIndex) {
                // Correct guess: +15 points
                scores[player.id] = 15;
                correctGuessers.push(player.id);
            } else {
                // Wrong guess: 0 points
                scores[player.id] = 0;
                wrongGuessers++;
            }
        }

        // Storyteller bonus: +10 if majority guessed wrong
        const storytellerBonus = totalGuessers > 0 && wrongGuessers > totalGuessers / 2;
        scores[storytellerId] = storytellerBonus ? 10 : 0;

        // Build reveal data into gameData so clients can display it
        state.gameData.revealData = {
            lieIndex,
            correctGuessers,
            storytellerBonus,
        };
        state.gameData.phase = 'reveal';

        const storyteller = state.players.find(p => p.id === storytellerId);

        return {
            scores,
            summary: {
                storyteller: storyteller
                    ? { id: storyteller.id, name: storyteller.name }
                    : null,
                statements: state.gameData.statements,
                lieIndex,
                guesses,
                correctGuessers,
                storytellerBonus,
            },
        };
    },

    isGameOver(state: GameState): boolean {
        return state.round >= state.totalRounds;
    },
};
