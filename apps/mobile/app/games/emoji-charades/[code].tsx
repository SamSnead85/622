// ============================================
// Emoji Charades — Hilarious Multiplayer Party Game
// Describer uses ONLY emojis to describe a phrase,
// other players race to guess it!
// ============================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Dimensions,
    ScrollView,
    Pressable,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeIn,
    FadeOut,
    ZoomIn,
    SlideInRight,
    SlideOutLeft,
    useSharedValue,
    useAnimatedStyle,
    useAnimatedProps,
    withTiming,
    withSpring,
    withSequence,
    withRepeat,
    runOnJS,
    Easing,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { colors, typography, spacing } from '@zerog/ui';
import { ScreenHeader, GlassCard, LoadingView } from '../../../components';
import { useGameStore, useAuthStore } from '../../../stores';
import { socketManager } from '../../../lib/socket';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// Constants
// ============================================

const TIMER_DURATION = 60;
const TOTAL_ROUNDS = 10;
const TIMER_SIZE = 64;
const TIMER_STROKE_WIDTH = 5;
const TIMER_RADIUS = (TIMER_SIZE - TIMER_STROKE_WIDTH) / 2;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;
const EMOJI_SIZE = 48;
const EMOJI_PICKER_SIZE = 42;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ============================================
// Phrase Types & Data
// ============================================

interface Phrase {
    text: string;
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
}

const PHRASES: Phrase[] = [
    // ---- Movies (20) ----
    { text: 'Star Wars', category: 'Movies', difficulty: 'easy' },
    { text: 'Titanic', category: 'Movies', difficulty: 'easy' },
    { text: 'Finding Nemo', category: 'Movies', difficulty: 'easy' },
    { text: 'The Lion King', category: 'Movies', difficulty: 'easy' },
    { text: 'Frozen', category: 'Movies', difficulty: 'easy' },
    { text: 'Jurassic Park', category: 'Movies', difficulty: 'medium' },
    { text: 'Harry Potter', category: 'Movies', difficulty: 'easy' },
    { text: 'Spider-Man', category: 'Movies', difficulty: 'easy' },
    { text: 'The Little Mermaid', category: 'Movies', difficulty: 'medium' },
    { text: 'Beauty and the Beast', category: 'Movies', difficulty: 'medium' },
    { text: 'Ghostbusters', category: 'Movies', difficulty: 'medium' },
    { text: 'Toy Story', category: 'Movies', difficulty: 'easy' },
    { text: 'The Wizard of Oz', category: 'Movies', difficulty: 'medium' },
    { text: 'Pirates of the Caribbean', category: 'Movies', difficulty: 'medium' },
    { text: 'Batman', category: 'Movies', difficulty: 'easy' },
    { text: 'The Avengers', category: 'Movies', difficulty: 'easy' },
    { text: 'Jaws', category: 'Movies', difficulty: 'easy' },
    { text: 'Indiana Jones', category: 'Movies', difficulty: 'medium' },
    { text: 'Shrek', category: 'Movies', difficulty: 'easy' },
    { text: 'The Matrix', category: 'Movies', difficulty: 'hard' },

    // ---- Food (18) ----
    { text: 'Pizza delivery', category: 'Food', difficulty: 'easy' },
    { text: 'Ice cream sundae', category: 'Food', difficulty: 'easy' },
    { text: 'Sushi roll', category: 'Food', difficulty: 'easy' },
    { text: 'Grilled cheese', category: 'Food', difficulty: 'medium' },
    { text: 'Birthday cake', category: 'Food', difficulty: 'easy' },
    { text: 'Taco Tuesday', category: 'Food', difficulty: 'easy' },
    { text: 'Hot dog eating contest', category: 'Food', difficulty: 'medium' },
    { text: 'Breakfast in bed', category: 'Food', difficulty: 'medium' },
    { text: 'Popcorn at the movies', category: 'Food', difficulty: 'easy' },
    { text: 'Banana split', category: 'Food', difficulty: 'easy' },
    { text: 'Pumpkin spice latte', category: 'Food', difficulty: 'medium' },
    { text: 'Chocolate factory', category: 'Food', difficulty: 'medium' },
    { text: 'Candy store', category: 'Food', difficulty: 'easy' },
    { text: 'Fish and chips', category: 'Food', difficulty: 'easy' },
    { text: 'Cooking show', category: 'Food', difficulty: 'medium' },
    { text: 'Food fight', category: 'Food', difficulty: 'easy' },
    { text: 'Farmers market', category: 'Food', difficulty: 'medium' },
    { text: 'Barbecue party', category: 'Food', difficulty: 'easy' },

    // ---- Activities (18) ----
    { text: 'Swimming pool', category: 'Activities', difficulty: 'easy' },
    { text: 'Rock climbing', category: 'Activities', difficulty: 'medium' },
    { text: 'Dance party', category: 'Activities', difficulty: 'easy' },
    { text: 'Road trip', category: 'Activities', difficulty: 'easy' },
    { text: 'Camping', category: 'Activities', difficulty: 'easy' },
    { text: 'Karaoke night', category: 'Activities', difficulty: 'easy' },
    { text: 'Treasure hunt', category: 'Activities', difficulty: 'medium' },
    { text: 'Pillow fight', category: 'Activities', difficulty: 'easy' },
    { text: 'Hide and seek', category: 'Activities', difficulty: 'easy' },
    { text: 'Snowball fight', category: 'Activities', difficulty: 'easy' },
    { text: 'Skydiving', category: 'Activities', difficulty: 'medium' },
    { text: 'Roller coaster ride', category: 'Activities', difficulty: 'medium' },
    { text: 'Yoga class', category: 'Activities', difficulty: 'easy' },
    { text: 'Marathon running', category: 'Activities', difficulty: 'medium' },
    { text: 'Board game night', category: 'Activities', difficulty: 'easy' },
    { text: 'Movie marathon', category: 'Activities', difficulty: 'easy' },
    { text: 'Photo booth', category: 'Activities', difficulty: 'medium' },
    { text: 'Magic show', category: 'Activities', difficulty: 'medium' },

    // ---- Animals (16) ----
    { text: 'Polar bear', category: 'Animals', difficulty: 'easy' },
    { text: 'Butterfly garden', category: 'Animals', difficulty: 'medium' },
    { text: 'Shark attack', category: 'Animals', difficulty: 'easy' },
    { text: 'Dog walking', category: 'Animals', difficulty: 'easy' },
    { text: 'Cat nap', category: 'Animals', difficulty: 'easy' },
    { text: 'Horse racing', category: 'Animals', difficulty: 'easy' },
    { text: 'Elephant parade', category: 'Animals', difficulty: 'medium' },
    { text: 'Dinosaur bones', category: 'Animals', difficulty: 'medium' },
    { text: 'Penguin waddle', category: 'Animals', difficulty: 'medium' },
    { text: 'Snake charmer', category: 'Animals', difficulty: 'hard' },
    { text: 'Bird watching', category: 'Animals', difficulty: 'easy' },
    { text: 'Frog prince', category: 'Animals', difficulty: 'medium' },
    { text: 'Monkey business', category: 'Animals', difficulty: 'medium' },
    { text: 'Fish tank', category: 'Animals', difficulty: 'easy' },
    { text: 'Lion tamer', category: 'Animals', difficulty: 'medium' },
    { text: 'Whale watching', category: 'Animals', difficulty: 'easy' },

    // ---- Places (16) ----
    { text: 'Beach vacation', category: 'Places', difficulty: 'easy' },
    { text: 'Space station', category: 'Places', difficulty: 'medium' },
    { text: 'Haunted house', category: 'Places', difficulty: 'easy' },
    { text: 'Theme park', category: 'Places', difficulty: 'easy' },
    { text: 'Desert island', category: 'Places', difficulty: 'medium' },
    { text: 'North Pole', category: 'Places', difficulty: 'easy' },
    { text: 'Underwater cave', category: 'Places', difficulty: 'hard' },
    { text: 'Hollywood', category: 'Places', difficulty: 'easy' },
    { text: 'Las Vegas', category: 'Places', difficulty: 'easy' },
    { text: 'Tropical rainforest', category: 'Places', difficulty: 'medium' },
    { text: 'Volcano island', category: 'Places', difficulty: 'medium' },
    { text: 'Ancient pyramid', category: 'Places', difficulty: 'medium' },
    { text: 'Secret garden', category: 'Places', difficulty: 'medium' },
    { text: 'Airport terminal', category: 'Places', difficulty: 'easy' },
    { text: 'Castle tower', category: 'Places', difficulty: 'medium' },
    { text: 'Movie theater', category: 'Places', difficulty: 'easy' },

    // ---- Random (16) ----
    { text: 'Morning coffee', category: 'Random', difficulty: 'easy' },
    { text: 'Thunderstorm', category: 'Random', difficulty: 'easy' },
    { text: 'Fire truck', category: 'Random', difficulty: 'easy' },
    { text: 'Love letter', category: 'Random', difficulty: 'easy' },
    { text: 'Time travel', category: 'Random', difficulty: 'hard' },
    { text: 'Bad hair day', category: 'Random', difficulty: 'medium' },
    { text: 'Alarm clock', category: 'Random', difficulty: 'easy' },
    { text: 'Wedding day', category: 'Random', difficulty: 'easy' },
    { text: 'Broken heart', category: 'Random', difficulty: 'easy' },
    { text: 'Sunburn', category: 'Random', difficulty: 'medium' },
    { text: 'Nightmare', category: 'Random', difficulty: 'medium' },
    { text: 'Traffic jam', category: 'Random', difficulty: 'easy' },
    { text: 'Power outage', category: 'Random', difficulty: 'medium' },
    { text: 'Rainbow after rain', category: 'Random', difficulty: 'easy' },
    { text: 'Shooting star', category: 'Random', difficulty: 'easy' },
    { text: 'Brain freeze', category: 'Random', difficulty: 'medium' },
];

// ============================================
// Emoji Picker Data
// ============================================

const EMOJI_GROUPS: Record<string, string[]> = {
    faces: ['😀', '😂', '😍', '🤔', '😱', '😴', '🤮', '😎', '🥳', '😈', '👻', '💀'],
    people: ['👋', '👍', '👎', '🙏', '💪', '👀', '👂', '🫶', '🤝', '🏃', '💃', '🧑‍🍳'],
    animals: ['🐶', '🐱', '🐻', '🦁', '🐟', '🦅', '🐍', '🦋', '🐸', '🦈', '🐘', '🦖'],
    food: ['🍕', '🍔', '🍦', '🍣', '🍎', '🌮', '🍩', '☕', '🍺', '🎂', '🍿', '🌽'],
    activities: ['⚽', '🏀', '🎮', '🎬', '🎵', '🏊', '🚗', '✈️', '🚀', '🎯', '🎪', '🏔️'],
    objects: ['💡', '🔥', '💎', '🗡️', '🛡️', '🎁', '💰', '📱', '🔑', '⏰', '🌙', '⭐'],
    nature: ['🌊', '🌲', '🌺', '☀️', '❄️', '⛈️', '🌈', '🏖️', '🌋', '🏠', '🏰', '🌃'],
    symbols: ['❤️', '💔', '✅', '❌', '⬆️', '⬇️', '➡️', '⬅️', '🔄', '💯', '🆘', '🎶'],
};

const EMOJI_GROUP_ICONS: Record<string, string> = {
    faces: 'happy-outline',
    people: 'people-outline',
    animals: 'paw-outline',
    food: 'fast-food-outline',
    activities: 'football-outline',
    objects: 'bulb-outline',
    nature: 'leaf-outline',
    symbols: 'heart-outline',
};

// ============================================
// Scoring Constants
// ============================================

const SCORE_FIRST_GUESS = 300;
const SCORE_SECOND_GUESS = 200;
const SCORE_THIRD_GUESS = 100;
const SCORE_DESCRIBER_PER_GUESS = 100;
const SCORE_DESCRIBER_ALL_BONUS = 200;

function getGuessScore(rank: number): number {
    if (rank === 1) return SCORE_FIRST_GUESS;
    if (rank === 2) return SCORE_SECOND_GUESS;
    if (rank === 3) return SCORE_THIRD_GUESS;
    return 0;
}

// ============================================
// Types
// ============================================

type Phase = 'waiting' | 'describing' | 'reveal' | 'transition';

interface CorrectGuess {
    playerId: string;
    playerName: string;
    rank: number;
    score: number;
    timestamp: number;
}

interface RoundState {
    phrase: Phrase | null;
    describerId: string | null;
    emojis: string[];
    correctGuesses: CorrectGuess[];
    timeLeft: number;
}

// ============================================
// Utility: Shuffle Array
// ============================================

function shuffleArray<T>(arr: T[]): T[] {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Fuzzy match: normalize & compare
function normalizeGuess(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function isGuessCorrect(guess: string, answer: string): boolean {
    const g = normalizeGuess(guess);
    const a = normalizeGuess(answer);
    if (!g || !a) return false;
    // Exact match
    if (g === a) return true;
    // Close enough: allow missing "the", "a", etc.
    const stripArticles = (s: string) => s.replace(/^(the|a|an)\s+/i, '').trim();
    if (stripArticles(g) === stripArticles(a)) return true;
    // Levenshtein-ish: allow 1-2 char difference for longer phrases
    if (a.length > 6) {
        let diff = 0;
        const longer = g.length > a.length ? g : a;
        const shorter = g.length > a.length ? a : g;
        if (Math.abs(longer.length - shorter.length) <= 2) {
            for (let i = 0; i < longer.length; i++) {
                if (longer[i] !== shorter[i]) diff++;
            }
            if (diff <= 2) return true;
        }
    }
    return false;
}

// ============================================
// Timer Ring Component
// ============================================

function TimerRing({ timeLeft, total }: { timeLeft: number; total: number }) {
    const progress = useSharedValue(1);

    useEffect(() => {
        progress.value = withTiming(timeLeft / total, {
            duration: 900,
            easing: Easing.linear,
        });
    }, [timeLeft, total, progress]);

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: TIMER_CIRCUMFERENCE * (1 - progress.value),
    }));

    const isUrgent = timeLeft <= 10;
    const isCritical = timeLeft <= 5;

    return (
        <View
            style={styles.timerContainer}
            accessibilityRole="timer"
            accessibilityLabel={`${timeLeft} seconds remaining`}
        >
            <Svg width={TIMER_SIZE} height={TIMER_SIZE} style={styles.timerSvg}>
                <Circle
                    cx={TIMER_SIZE / 2}
                    cy={TIMER_SIZE / 2}
                    r={TIMER_RADIUS}
                    stroke={colors.obsidian[600]}
                    strokeWidth={TIMER_STROKE_WIDTH}
                    fill="transparent"
                />
                <AnimatedCircle
                    cx={TIMER_SIZE / 2}
                    cy={TIMER_SIZE / 2}
                    r={TIMER_RADIUS}
                    stroke={isCritical ? colors.coral[500] : isUrgent ? colors.amber[500] : colors.gold[500]}
                    strokeWidth={TIMER_STROKE_WIDTH}
                    fill="transparent"
                    strokeDasharray={TIMER_CIRCUMFERENCE}
                    animatedProps={animatedProps}
                    strokeLinecap="round"
                    rotation="-90"
                    origin={`${TIMER_SIZE / 2}, ${TIMER_SIZE / 2}`}
                />
            </Svg>
            <Text
                style={[
                    styles.timerText,
                    isUrgent && styles.timerTextUrgent,
                    isCritical && styles.timerTextCritical,
                ]}
            >
                {timeLeft}
            </Text>
        </View>
    );
}

// ============================================
// Score Popup Component
// ============================================

function ScorePopup({ points, visible }: { points: number; visible: boolean }) {
    if (!visible || points === 0) return null;

    return (
        <Animated.View
            entering={ZoomIn.duration(300).springify()}
            exiting={FadeOut.duration(500)}
            style={styles.scorePopup}
        >
            <Text style={styles.scorePopupText}>+{points}</Text>
        </Animated.View>
    );
}

// ============================================
// Correct Guess Banner
// ============================================

function CorrectGuessBanner({ guess }: { guess: CorrectGuess }) {
    return (
        <Animated.View
            entering={SlideInRight.duration(400).springify()}
            exiting={FadeOut.delay(2000).duration(500)}
            style={styles.correctBanner}
        >
            <LinearGradient
                colors={[colors.emerald[500] + '30', colors.emerald[500] + '05']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.correctBannerGradient}
            >
                <View style={styles.correctBannerRank}>
                    <Text style={styles.correctBannerRankText}>
                        {guess.rank === 1 ? '🥇' : guess.rank === 2 ? '🥈' : '🥉'}
                    </Text>
                </View>
                <View style={styles.correctBannerInfo}>
                    <Text style={styles.correctBannerName}>{guess.playerName}</Text>
                    <Text style={styles.correctBannerScore}>+{guess.score}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={24} color={colors.emerald[400]} />
            </LinearGradient>
        </Animated.View>
    );
}

// ============================================
// Emoji Display (bouncy emojis in the display area)
// ============================================

function EmojiDisplay({ emojis }: { emojis: string[] }) {
    return (
        <View style={styles.emojiDisplayArea}>
            {emojis.length === 0 ? (
                <Animated.View entering={FadeIn.duration(300)} style={styles.emojiPlaceholder}>
                    <Text style={styles.emojiPlaceholderText}>
                        Emojis will appear here...
                    </Text>
                    <Text style={styles.emojiPlaceholderSubtext}>
                        👆 Waiting for the describer
                    </Text>
                </Animated.View>
            ) : (
                <View style={styles.emojiGrid}>
                    {emojis.map((emoji, idx) => (
                        <Animated.Text
                            key={`${idx}-${emoji}`}
                            entering={ZoomIn.delay(idx * 60)
                                .duration(300)
                                .springify()
                                .damping(10)}
                            style={styles.emojiDisplayChar}
                        >
                            {emoji}
                        </Animated.Text>
                    ))}
                </View>
            )}
        </View>
    );
}

// ============================================
// Emoji Picker Component
// ============================================

function EmojiPicker({
    onSelect,
    onClear,
    currentEmojis,
}: {
    onSelect: (emoji: string) => void;
    onClear: () => void;
    currentEmojis: string[];
}) {
    const [activeGroup, setActiveGroup] = useState<string>('faces');
    const groupKeys = Object.keys(EMOJI_GROUPS);

    const handleEmojiPress = useCallback(
        (emoji: string) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(emoji);
        },
        [onSelect],
    );

    const handleLongPress = useCallback(() => {
        if (currentEmojis.length > 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onClear();
        }
    }, [currentEmojis.length, onClear]);

    return (
        <View style={styles.emojiPicker}>
            {/* Category tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.emojiTabRow}
                contentContainerStyle={styles.emojiTabContent}
            >
                {groupKeys.map((group) => (
                    <TouchableOpacity
                        key={group}
                        style={[
                            styles.emojiTab,
                            activeGroup === group && styles.emojiTabActive,
                        ]}
                        onPress={() => setActiveGroup(group)}
                        accessibilityLabel={`${group} emojis`}
                    >
                        <Ionicons
                            name={EMOJI_GROUP_ICONS[group] as any}
                            size={18}
                            color={
                                activeGroup === group
                                    ? colors.gold[400]
                                    : colors.text.muted
                            }
                        />
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Emoji grid */}
            <Pressable onLongPress={handleLongPress}>
                <View style={styles.emojiGridPicker}>
                    {EMOJI_GROUPS[activeGroup].map((emoji) => (
                        <TouchableOpacity
                            key={emoji}
                            style={styles.emojiPickerCell}
                            onPress={() => handleEmojiPress(emoji)}
                            activeOpacity={0.6}
                            accessibilityLabel={`Select ${emoji} emoji`}
                        >
                            <Text style={styles.emojiPickerChar}>{emoji}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </Pressable>
        </View>
    );
}

// ============================================
// Main Game Screen
// ============================================

export default function EmojiCharadesScreen() {
    const router = useRouter();
    const { code } = useLocalSearchParams<{ code: string }>();
    const gameStore = useGameStore();
    const authStore = useAuthStore();
    const myUserId = authStore.user?.id;

    // ---- Game State ----
    const [phase, setPhase] = useState<Phase>('waiting');
    const [round, setRound] = useState(1);
    const [roundState, setRoundState] = useState<RoundState>({
        phrase: null,
        describerId: null,
        emojis: [],
        correctGuesses: [],
        timeLeft: TIMER_DURATION,
    });
    const [guessText, setGuessText] = useState('');
    const [hasGuessedCorrectly, setHasGuessedCorrectly] = useState(false);
    const [scorePopupData, setScorePopupData] = useState({ points: 0, visible: false });
    const [showCorrectFlash, setShowCorrectFlash] = useState(false);
    const [latestCorrectGuess, setLatestCorrectGuess] = useState<CorrectGuess | null>(null);
    const [usedPhraseIndices, setUsedPhraseIndices] = useState<Set<number>>(new Set());
    const [localScores, setLocalScores] = useState<Record<string, number>>({});

    // For local simulation (host generates phrases)
    const shuffledPhrases = useRef<Phrase[]>(shuffleArray(PHRASES));

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ---- Animation Values ----
    const correctFlashOpacity = useSharedValue(0);
    const emojiAreaGlow = useSharedValue(0);

    const isDescriber = roundState.describerId === myUserId;
    const players = gameStore.players;
    const totalRounds = gameStore.totalRounds || TOTAL_ROUNDS;

    const describerPlayer = useMemo(
        () => players.find((p) => p.userId === roundState.describerId || p.id === roundState.describerId),
        [players, roundState.describerId],
    );

    // Sorted leaderboard
    const leaderboard = useMemo(() => {
        return [...players]
            .map((p) => ({
                ...p,
                score: p.score + (localScores[p.id] || 0),
            }))
            .sort((a, b) => b.score - a.score);
    }, [players, localScores]);

    // ---- Correct flash animation ----
    const correctFlashStyle = useAnimatedStyle(() => ({
        opacity: correctFlashOpacity.value,
    }));

    // ---- Socket Listeners ----
    useEffect(() => {
        const unsubs = [
            socketManager.on('game:update', (data) => {
                gameStore.updateFromDelta(data);

                const gd = data.gameData;
                if (gd) {
                    // Emoji update from describer
                    if (gd.emojis !== undefined) {
                        setRoundState((prev) => ({ ...prev, emojis: gd.emojis }));
                    }
                    if (gd.phase) setPhase(gd.phase);
                    if (gd.describerId) {
                        setRoundState((prev) => ({ ...prev, describerId: gd.describerId }));
                    }
                    // Correct guess notification
                    if (gd.correctGuess) {
                        const cg: CorrectGuess = gd.correctGuess;
                        setRoundState((prev) => ({
                            ...prev,
                            correctGuesses: [...prev.correctGuesses, cg],
                        }));
                        setLatestCorrectGuess(cg);
                        if (cg.playerId === myUserId) {
                            handleMyCorrectGuess(cg.score);
                        }
                        setTimeout(() => setLatestCorrectGuess(null), 3000);
                    }
                    // Phrase for describer
                    if (gd.phrase && gd.describerId === myUserId) {
                        setRoundState((prev) => ({
                            ...prev,
                            phrase: gd.phrase,
                        }));
                    }
                }
            }),
            socketManager.on('game:round-start', (data) => {
                setPhase('describing');
                setGuessText('');
                setHasGuessedCorrectly(false);
                setShowCorrectFlash(false);
                setLatestCorrectGuess(null);
                setRound(data.round || round + 1);
                setRoundState({
                    phrase: data.gameData?.phrase || null,
                    describerId: data.gameData?.describerId || null,
                    emojis: [],
                    correctGuesses: [],
                    timeLeft: TIMER_DURATION,
                });
            }),
            socketManager.on('game:round-end', (data) => {
                gameStore.setRoundEnd(data);
                setPhase('reveal');
                clearTimer();
            }),
            socketManager.on('game:ended', (data) => {
                gameStore.setGameEnded(data);
                router.replace(`/games/results/${code}`);
            }),
        ];
        return () => unsubs.forEach((fn) => fn());
    }, []);

    // ---- Timer ----
    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (phase !== 'describing') {
            clearTimer();
            return;
        }

        setRoundState((prev) => ({ ...prev, timeLeft: TIMER_DURATION }));

        timerRef.current = setInterval(() => {
            setRoundState((prev) => {
                const newTime = prev.timeLeft - 1;
                if (newTime <= 0) {
                    clearTimer();
                    // Time's up — auto-advance to reveal
                    handleRoundEnd();
                    return { ...prev, timeLeft: 0 };
                }
                // Haptic tick when urgent
                if (newTime <= 5 && newTime > 0) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                return { ...prev, timeLeft: newTime };
            });
        }, 1000);

        return clearTimer;
    }, [phase, round]);

    // ---- Local Simulation Functions ----
    // If server doesn't fully support this game, host can simulate locally

    const getNextPhrase = useCallback((): Phrase => {
        const available = shuffledPhrases.current.filter(
            (_, i) => !usedPhraseIndices.has(i),
        );
        if (available.length === 0) {
            shuffledPhrases.current = shuffleArray(PHRASES);
            setUsedPhraseIndices(new Set());
            return shuffledPhrases.current[0];
        }
        const idx = shuffledPhrases.current.indexOf(available[0]);
        setUsedPhraseIndices((prev) => new Set([...prev, idx]));
        return available[0];
    }, [usedPhraseIndices]);

    const getNextDescriber = useCallback((): string | null => {
        if (players.length === 0) return myUserId || null;
        const idx = (round - 1) % players.length;
        return players[idx]?.userId || players[idx]?.id || null;
    }, [players, round, myUserId]);

    // ---- Start round (host initiates) ----
    const startNextRound = useCallback(() => {
        const nextRound = round;
        const describerId = getNextDescriber();
        const phrase = getNextPhrase();

        setPhase('describing');
        setGuessText('');
        setHasGuessedCorrectly(false);
        setShowCorrectFlash(false);
        setLatestCorrectGuess(null);
        setRoundState({
            phrase: describerId === myUserId ? phrase : null,
            describerId,
            emojis: [],
            correctGuesses: [],
            timeLeft: TIMER_DURATION,
        });

        // Broadcast round start via socket
        socketManager.sendGameAction(code!, 'round_start', {
            round: nextRound,
            describerId,
            phrase,
        });
    }, [round, getNextDescriber, getNextPhrase, myUserId, code]);

    // Auto-start first round for host
    useEffect(() => {
        if (gameStore.status === 'playing' && phase === 'waiting' && gameStore.isHost) {
            const timeout = setTimeout(() => {
                startNextRound();
            }, 1500);
            return () => clearTimeout(timeout);
        }
    }, [gameStore.status, phase, gameStore.isHost]);

    // ---- Describer Actions ----
    const handleAddEmoji = useCallback(
        (emoji: string) => {
            if (!isDescriber || phase !== 'describing') return;

            setRoundState((prev) => {
                const newEmojis = [...prev.emojis, emoji];
                // Broadcast emoji update
                socketManager.sendGameAction(code!, 'emoji_update', {
                    emojis: newEmojis,
                });
                return { ...prev, emojis: newEmojis };
            });
        },
        [isDescriber, phase, code],
    );

    const handleRemoveLastEmoji = useCallback(() => {
        if (!isDescriber || phase !== 'describing') return;

        setRoundState((prev) => {
            const newEmojis = prev.emojis.slice(0, -1);
            socketManager.sendGameAction(code!, 'emoji_update', {
                emojis: newEmojis,
            });
            return { ...prev, emojis: newEmojis };
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, [isDescriber, phase, code]);

    const handleClearEmojis = useCallback(() => {
        if (!isDescriber || phase !== 'describing') return;

        setRoundState((prev) => {
            socketManager.sendGameAction(code!, 'emoji_update', { emojis: [] });
            return { ...prev, emojis: [] };
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, [isDescriber, phase, code]);

    // ---- Guesser Actions ----
    const handleMyCorrectGuess = useCallback(
        (score: number) => {
            setHasGuessedCorrectly(true);
            setShowCorrectFlash(true);
            setScorePopupData({ points: score, visible: true });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Flash animation
            correctFlashOpacity.value = withSequence(
                withTiming(0.6, { duration: 150 }),
                withTiming(0, { duration: 600 }),
            );

            setTimeout(() => {
                setShowCorrectFlash(false);
                setScorePopupData({ points: 0, visible: false });
            }, 2000);
        },
        [correctFlashOpacity],
    );

    const handleSubmitGuess = useCallback(() => {
        const trimmed = guessText.trim();
        if (!trimmed || hasGuessedCorrectly || isDescriber || phase !== 'describing') return;

        // Send guess to server
        socketManager.sendGameAction(code!, 'guess', { text: trimmed });

        // Local check for immediate feedback (host simulation)
        if (roundState.phrase && isGuessCorrect(trimmed, roundState.phrase.text)) {
            // This shouldn't happen for guessers (they don't know the phrase)
            // But if host is also guesser or for local testing:
        }

        // For local simulation: check if guess matches (host validates)
        if (gameStore.isHost && roundState.phrase) {
            const phraseText = roundState.phrase.text;
            // Check all guesses — broadcast from host
            if (isGuessCorrect(trimmed, phraseText)) {
                const rank = roundState.correctGuesses.length + 1;
                const score = getGuessScore(rank);
                const guesserId = myUserId || 'unknown';
                const guesserName = authStore.user?.displayName || 'You';

                const cg: CorrectGuess = {
                    playerId: guesserId,
                    playerName: guesserName,
                    rank,
                    score,
                    timestamp: Date.now(),
                };

                setRoundState((prev) => ({
                    ...prev,
                    correctGuesses: [...prev.correctGuesses, cg],
                }));
                handleMyCorrectGuess(score);
                setLatestCorrectGuess(cg);
                setTimeout(() => setLatestCorrectGuess(null), 3000);

                // Update local scores
                setLocalScores((prev) => ({
                    ...prev,
                    [guesserId]: (prev[guesserId] || 0) + score,
                }));
            }
        }

        setGuessText('');
    }, [guessText, hasGuessedCorrectly, isDescriber, phase, code, roundState.phrase, gameStore.isHost, myUserId, roundState.correctGuesses.length, handleMyCorrectGuess, authStore.user?.displayName]);

    // ---- Round End ----
    const handleRoundEnd = useCallback(() => {
        setPhase('reveal');
        clearTimer();

        // If describer, give bonus scores
        if (isDescriber && roundState.correctGuesses.length > 0) {
            const describerBonus =
                roundState.correctGuesses.length * SCORE_DESCRIBER_PER_GUESS +
                (roundState.correctGuesses.length >= players.length - 1
                    ? SCORE_DESCRIBER_ALL_BONUS
                    : 0);
            setScorePopupData({ points: describerBonus, visible: true });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            setLocalScores((prev) => ({
                ...prev,
                [myUserId || '']: (prev[myUserId || ''] || 0) + describerBonus,
            }));

            setTimeout(() => {
                setScorePopupData({ points: 0, visible: false });
            }, 2500);
        }

        // Auto-advance to next round after delay
        if (gameStore.isHost) {
            setTimeout(() => {
                if (round < totalRounds) {
                    setRound((r) => r + 1);
                    setPhase('waiting');
                    setTimeout(() => startNextRound(), 800);
                } else {
                    // Game ended
                    gameStore.setGameEnded({
                        finalScores: leaderboard.map((p) => ({
                            id: p.id,
                            name: p.name,
                            score: p.score,
                        })),
                        winner: leaderboard[0] || { id: '', name: '', score: 0 },
                    });
                    router.replace(`/games/results/${code}`);
                }
            }, 4000);
        }
    }, [isDescriber, roundState.correctGuesses, players.length, myUserId, gameStore, round, totalRounds, leaderboard, code, router, clearTimer, startNextRound]);

    // ---- Handle "Done" from describer (early end) ----
    const handleDescriberDone = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        handleRoundEnd();
    }, [handleRoundEnd]);

    // ---- Loading State ----
    if (gameStore.status === 'idle') {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
                    style={StyleSheet.absoluteFill}
                />
                <ScreenHeader title="Emoji Charades" showBack noBorder />
                <LoadingView message="Connecting to game..." />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
                style={StyleSheet.absoluteFill}
            />
            <ScreenHeader title="Emoji Charades" showBack noBorder />

            {/* ---- Correct Guess Green Flash Overlay ---- */}
            <Animated.View
                style={[styles.correctFlashOverlay, correctFlashStyle]}
                pointerEvents="none"
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ---- Top Bar: Round, Timer, Role ---- */}
                <Animated.View entering={FadeInDown.delay(100).duration(500)}>
                    <View style={styles.topBar}>
                        <GlassCard style={styles.roundBadge} padding="sm">
                            <Text style={styles.roundText}>
                                Round {round}/{totalRounds}
                            </Text>
                        </GlassCard>

                        <TimerRing
                            timeLeft={roundState.timeLeft}
                            total={TIMER_DURATION}
                        />

                        <GlassCard
                            style={[
                                styles.roleBadge,
                                isDescriber && styles.roleBadgeDescriber,
                            ]}
                            padding="sm"
                        >
                            <Ionicons
                                name={isDescriber ? 'pencil' : 'eye'}
                                size={14}
                                color={isDescriber ? colors.gold[500] : colors.azure[400]}
                            />
                            <Text
                                style={[
                                    styles.roleText,
                                    isDescriber && styles.roleTextDescriber,
                                ]}
                                numberOfLines={1}
                            >
                                {isDescriber
                                    ? 'You Describe!'
                                    : `${describerPlayer?.name || 'Someone'} is describing`}
                            </Text>
                        </GlassCard>
                    </View>
                </Animated.View>

                {/* ---- Phrase Card (Describer only) ---- */}
                {isDescriber && roundState.phrase && phase === 'describing' && (
                    <Animated.View entering={FadeInDown.delay(150).duration(400)}>
                        <LinearGradient
                            colors={[colors.gold[700] + 'DD', colors.gold[600] + 'AA']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.phraseCard}
                        >
                            <View style={styles.phraseCardHeader}>
                                <View style={styles.phraseCategoryBadge}>
                                    <Text style={styles.phraseCategoryText}>
                                        {roundState.phrase.category}
                                    </Text>
                                </View>
                                <View
                                    style={[
                                        styles.phraseDifficultyBadge,
                                        roundState.phrase.difficulty === 'easy' && styles.difficultyEasy,
                                        roundState.phrase.difficulty === 'medium' && styles.difficultyMedium,
                                        roundState.phrase.difficulty === 'hard' && styles.difficultyHard,
                                    ]}
                                >
                                    <Text style={styles.phraseDifficultyText}>
                                        {roundState.phrase.difficulty.toUpperCase()}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.phraseText}>
                                {roundState.phrase.text}
                            </Text>
                            <Text style={styles.phraseHint}>
                                Describe this using ONLY emojis!
                            </Text>
                        </LinearGradient>
                    </Animated.View>
                )}

                {/* ---- Emoji Display Area ---- */}
                <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                    <GlassCard style={styles.emojiDisplayCard} padding="md">
                        <View style={styles.emojiDisplayHeader}>
                            <Text style={styles.emojiDisplayTitle}>
                                {phase === 'describing'
                                    ? isDescriber
                                        ? '🎨 Your Emoji Canvas'
                                        : '👀 Watch the Emojis!'
                                    : '🎭 Round Complete!'}
                            </Text>
                            {roundState.emojis.length > 0 && (
                                <Text style={styles.emojiCount}>
                                    {roundState.emojis.length} emoji{roundState.emojis.length !== 1 ? 's' : ''}
                                </Text>
                            )}
                        </View>

                        <EmojiDisplay emojis={roundState.emojis} />

                        {/* Correct guesses during the round */}
                        {roundState.correctGuesses.length > 0 && (
                            <View style={styles.guessCountBar}>
                                <Ionicons name="checkmark-circle" size={16} color={colors.emerald[400]} />
                                <Text style={styles.guessCountText}>
                                    {roundState.correctGuesses.length} correct guess{roundState.correctGuesses.length !== 1 ? 'es' : ''}
                                </Text>
                            </View>
                        )}
                    </GlassCard>
                </Animated.View>

                {/* ---- Latest Correct Guess Banner ---- */}
                {latestCorrectGuess && (
                    <CorrectGuessBanner guess={latestCorrectGuess} />
                )}

                {/* ---- Score Popup ---- */}
                <ScorePopup points={scorePopupData.points} visible={scorePopupData.visible} />

                {/* ---- Describer: Emoji Picker ---- */}
                {isDescriber && phase === 'describing' && (
                    <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                        <GlassCard style={styles.pickerCard} padding="md">
                            <EmojiPicker
                                onSelect={handleAddEmoji}
                                onClear={handleRemoveLastEmoji}
                                currentEmojis={roundState.emojis}
                            />
                            <View style={styles.describerActions}>
                                <TouchableOpacity
                                    style={styles.clearButton}
                                    onPress={handleClearEmojis}
                                    disabled={roundState.emojis.length === 0}
                                    accessibilityLabel="Clear all emojis"
                                >
                                    <Ionicons
                                        name="trash-outline"
                                        size={18}
                                        color={
                                            roundState.emojis.length === 0
                                                ? colors.text.muted
                                                : colors.coral[400]
                                        }
                                    />
                                    <Text
                                        style={[
                                            styles.clearButtonText,
                                            roundState.emojis.length === 0 && styles.clearButtonTextDisabled,
                                        ]}
                                    >
                                        Clear
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.backspaceButton}
                                    onPress={handleRemoveLastEmoji}
                                    disabled={roundState.emojis.length === 0}
                                    accessibilityLabel="Remove last emoji"
                                >
                                    <Ionicons
                                        name="backspace-outline"
                                        size={20}
                                        color={
                                            roundState.emojis.length === 0
                                                ? colors.text.muted
                                                : colors.amber[400]
                                        }
                                    />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.doneButton,
                                        roundState.correctGuesses.length === 0 && styles.doneButtonInactive,
                                    ]}
                                    onPress={handleDescriberDone}
                                    accessibilityLabel="End round"
                                >
                                    <Ionicons name="checkmark-done" size={18} color={colors.text.primary} />
                                    <Text style={styles.doneButtonText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        </GlassCard>
                    </Animated.View>
                )}

                {/* ---- Guesser: Input Area ---- */}
                {!isDescriber && phase === 'describing' && (
                    <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                        <GlassCard style={styles.guessCard} padding="md">
                            {hasGuessedCorrectly ? (
                                <Animated.View entering={ZoomIn.duration(400).springify()} style={styles.correctConfirmation}>
                                    <Text style={styles.correctEmoji}>🎉</Text>
                                    <Text style={styles.correctTitle}>CORRECT!</Text>
                                    <Text style={styles.correctSubtitle}>
                                        Great job! Wait for the round to end.
                                    </Text>
                                </Animated.View>
                            ) : (
                                <>
                                    <View style={styles.guessHeader}>
                                        <Ionicons name="chatbubble-ellipses" size={20} color={colors.azure[400]} />
                                        <Text style={styles.guessTitle}>What's the phrase?</Text>
                                    </View>
                                    <View style={styles.guessInputRow}>
                                        <TextInput
                                            style={styles.guessInput}
                                            placeholder="Type your guess..."
                                            placeholderTextColor={colors.text.muted}
                                            value={guessText}
                                            onChangeText={setGuessText}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            returnKeyType="send"
                                            onSubmitEditing={handleSubmitGuess}
                                            accessibilityLabel="Guess input"
                                        />
                                        <TouchableOpacity
                                            style={[
                                                styles.submitButton,
                                                !guessText.trim() && styles.submitButtonDisabled,
                                            ]}
                                            onPress={handleSubmitGuess}
                                            disabled={!guessText.trim()}
                                            accessibilityLabel="Submit guess"
                                        >
                                            <Ionicons
                                                name="send"
                                                size={20}
                                                color={
                                                    guessText.trim()
                                                        ? colors.text.primary
                                                        : colors.text.muted
                                                }
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </GlassCard>
                    </Animated.View>
                )}

                {/* ---- Waiting Phase ---- */}
                {phase === 'waiting' && (
                    <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                        <GlassCard style={styles.waitingCard} padding="md">
                            <Text style={styles.waitingEmoji}>🎭</Text>
                            <Text style={styles.waitingText}>
                                Get ready for Round {round}...
                            </Text>
                            <Text style={styles.waitingSubtext}>
                                The next describer is about to start!
                            </Text>
                        </GlassCard>
                    </Animated.View>
                )}

                {/* ---- Reveal Phase ---- */}
                {phase === 'reveal' && (
                    <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                        <GlassCard style={styles.revealCard} padding="md">
                            <Text style={styles.revealTitle}>⏰ Time's Up!</Text>
                            {roundState.phrase && (
                                <View style={styles.revealPhraseBox}>
                                    <Text style={styles.revealPhraseLabel}>The phrase was:</Text>
                                    <Text style={styles.revealPhrase}>{roundState.phrase.text}</Text>
                                </View>
                            )}

                            {roundState.correctGuesses.length > 0 ? (
                                <View style={styles.revealGuesses}>
                                    <Text style={styles.revealGuessesTitle}>Correct Guesses</Text>
                                    {roundState.correctGuesses.map((guess) => (
                                        <Animated.View
                                            key={guess.playerId}
                                            entering={FadeInDown.delay(guess.rank * 100).duration(300)}
                                            style={styles.revealGuessRow}
                                        >
                                            <Text style={styles.revealGuessRank}>
                                                {guess.rank === 1 ? '🥇' : guess.rank === 2 ? '🥈' : '🥉'}
                                            </Text>
                                            <Text style={styles.revealGuessName}>{guess.playerName}</Text>
                                            <Text style={styles.revealGuessScore}>+{guess.score}</Text>
                                        </Animated.View>
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.revealNoGuesses}>
                                    <Text style={styles.revealNoGuessesEmoji}>😅</Text>
                                    <Text style={styles.revealNoGuessesText}>
                                        Nobody guessed it!
                                    </Text>
                                </View>
                            )}

                            {round < totalRounds && (
                                <Text style={styles.revealNextRound}>
                                    Next round starting soon...
                                </Text>
                            )}
                        </GlassCard>
                    </Animated.View>
                )}

                {/* ---- Scoreboard ---- */}
                <Animated.View entering={FadeInDown.delay(400).duration(500)}>
                    <GlassCard style={styles.scoreboardCard} padding="md">
                        <View style={styles.scoreboardHeader}>
                            <Ionicons name="trophy" size={18} color={colors.gold[400]} />
                            <Text style={styles.scoreboardTitle}>Scoreboard</Text>
                        </View>
                        {leaderboard.map((player, index) => (
                            <View key={player.id} style={styles.scoreboardRow}>
                                <Text style={styles.scoreboardRank}>
                                    {index === 0
                                        ? '👑'
                                        : index === 1
                                            ? '🥈'
                                            : index === 2
                                                ? '🥉'
                                                : `#${index + 1}`}
                                </Text>
                                <View style={styles.scoreboardNameRow}>
                                    <Text
                                        style={[
                                            styles.scoreboardName,
                                            (player.userId === myUserId || player.id === myUserId) &&
                                                styles.scoreboardNameMe,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {player.name}
                                        {(player.userId === myUserId || player.id === myUserId)
                                            ? ' (You)'
                                            : ''}
                                    </Text>
                                    {(player.userId === roundState.describerId ||
                                        player.id === roundState.describerId) && (
                                        <View style={styles.describerTag}>
                                            <Text style={styles.describerTagText}>🎨</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.scoreboardPoints}>{player.score}</Text>
                            </View>
                        ))}
                    </GlassCard>
                </Animated.View>

                <View style={{ height: spacing['3xl'] }} />
            </ScrollView>
        </View>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },

    // ---- Correct Flash Overlay ----
    correctFlashOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.emerald[500],
        zIndex: 100,
        pointerEvents: 'none',
    },

    // ---- Top Bar ----
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    roundBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    roundText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
    },
    roleBadge: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    roleBadgeDescriber: {
        borderColor: colors.gold[500] + '30',
        backgroundColor: colors.surface.goldSubtle,
    },
    roleText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.muted,
        flex: 1,
    },
    roleTextDescriber: {
        color: colors.gold[400],
    },

    // ---- Timer ----
    timerContainer: {
        width: TIMER_SIZE,
        height: TIMER_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerSvg: {
        position: 'absolute',
    },
    timerText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.gold[400],
    },
    timerTextUrgent: {
        color: colors.amber[400],
    },
    timerTextCritical: {
        color: colors.coral[500],
    },

    // ---- Phrase Card (Describer) ----
    phraseCard: {
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    phraseCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    phraseCategoryBadge: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: 8,
    },
    phraseCategoryText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: '#FAFAFA',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    phraseDifficultyBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: 8,
    },
    difficultyEasy: {
        backgroundColor: colors.emerald[500] + '40',
    },
    difficultyMedium: {
        backgroundColor: colors.amber[500] + '40',
    },
    difficultyHard: {
        backgroundColor: colors.coral[500] + '40',
    },
    phraseDifficultyText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: '#FAFAFA',
        letterSpacing: 1,
    },
    phraseText: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: '#FAFAFA',
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    phraseHint: {
        fontSize: typography.fontSize.sm,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        fontStyle: 'italic',
    },

    // ---- Emoji Display Card ----
    emojiDisplayCard: {
        marginBottom: spacing.lg,
        minHeight: 160,
    },
    emojiDisplayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    emojiDisplayTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
    emojiCount: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        fontWeight: '600',
    },
    emojiDisplayArea: {
        minHeight: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emojiPlaceholder: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    emojiPlaceholderText: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
        marginBottom: spacing.xs,
    },
    emojiPlaceholderSubtext: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
    },
    emojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
    },
    emojiDisplayChar: {
        fontSize: EMOJI_SIZE,
        lineHeight: EMOJI_SIZE + 8,
    },
    guessCountBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        marginTop: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border.subtle,
    },
    guessCountText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.emerald[400],
    },

    // ---- Correct Guess Banner ----
    correctBanner: {
        marginBottom: spacing.md,
        borderRadius: 12,
        overflow: 'hidden',
    },
    correctBannerGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: spacing.sm,
    },
    correctBannerRank: {
        width: 32,
        alignItems: 'center',
    },
    correctBannerRankText: {
        fontSize: 20,
    },
    correctBannerInfo: {
        flex: 1,
    },
    correctBannerName: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.emerald[300],
    },
    correctBannerScore: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.emerald[400],
    },

    // ---- Score Popup ----
    scorePopup: {
        alignSelf: 'center',
        backgroundColor: colors.gold[500],
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: 20,
        marginBottom: spacing.md,
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
    },
    scorePopupText: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.obsidian[900],
    },

    // ---- Emoji Picker ----
    pickerCard: {
        marginBottom: spacing.lg,
    },
    emojiPicker: {},
    emojiTabRow: {
        marginBottom: spacing.sm,
    },
    emojiTabContent: {
        gap: spacing.xs,
        paddingHorizontal: spacing.xxs,
    },
    emojiTab: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.obsidian[700],
    },
    emojiTabActive: {
        backgroundColor: colors.surface.goldSubtle,
        borderWidth: 1,
        borderColor: colors.gold[500] + '40',
    },
    emojiGridPicker: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
        justifyContent: 'center',
    },
    emojiPickerCell: {
        width: EMOJI_PICKER_SIZE,
        height: EMOJI_PICKER_SIZE,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.obsidian[700],
    },
    emojiPickerChar: {
        fontSize: 24,
    },
    describerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border.subtle,
        gap: spacing.sm,
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 10,
        backgroundColor: colors.obsidian[700],
    },
    clearButtonText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.coral[400],
    },
    clearButtonTextDisabled: {
        color: colors.text.muted,
    },
    backspaceButton: {
        width: 44,
        height: 38,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.obsidian[700],
    },
    doneButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: 10,
        backgroundColor: colors.emerald[500],
    },
    doneButtonInactive: {
        backgroundColor: colors.obsidian[600],
    },
    doneButtonText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
    },

    // ---- Guesser Card ----
    guessCard: {
        marginBottom: spacing.lg,
    },
    guessHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    guessTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
    },
    guessInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    guessInput: {
        flex: 1,
        backgroundColor: colors.obsidian[800],
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    submitButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.azure[500],
    },
    submitButtonDisabled: {
        backgroundColor: colors.obsidian[600],
    },

    // ---- Correct Confirmation ----
    correctConfirmation: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    correctEmoji: {
        fontSize: 56,
        marginBottom: spacing.sm,
    },
    correctTitle: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.emerald[400],
        letterSpacing: 2,
        marginBottom: spacing.xs,
    },
    correctSubtitle: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
    },

    // ---- Waiting Card ----
    waitingCard: {
        alignItems: 'center',
        paddingVertical: spacing['2xl'],
        marginBottom: spacing.lg,
    },
    waitingEmoji: {
        fontSize: 48,
        marginBottom: spacing.md,
    },
    waitingText: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    waitingSubtext: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
    },

    // ---- Reveal Card ----
    revealCard: {
        marginBottom: spacing.lg,
    },
    revealTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    revealPhraseBox: {
        backgroundColor: colors.surface.goldSubtle,
        borderRadius: 12,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
    },
    revealPhraseLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.xs,
    },
    revealPhrase: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.gold[400],
    },
    revealGuesses: {
        marginBottom: spacing.md,
    },
    revealGuessesTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.sm,
    },
    revealGuessRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
        gap: spacing.sm,
    },
    revealGuessRank: {
        fontSize: 20,
        width: 30,
    },
    revealGuessName: {
        flex: 1,
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
    revealGuessScore: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.emerald[400],
    },
    revealNoGuesses: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    revealNoGuessesEmoji: {
        fontSize: 40,
        marginBottom: spacing.sm,
    },
    revealNoGuessesText: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
    },
    revealNextRound: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: spacing.md,
    },

    // ---- Scoreboard ----
    scoreboardCard: {
        marginBottom: spacing.lg,
    },
    scoreboardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    scoreboardTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    scoreboardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    scoreboardRank: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.text.muted,
        width: 36,
        textAlign: 'center',
    },
    scoreboardNameRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    scoreboardName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
    scoreboardNameMe: {
        color: colors.gold[400],
    },
    describerTag: {
        paddingHorizontal: spacing.xxs,
    },
    describerTagText: {
        fontSize: 12,
    },
    scoreboardPoints: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.gold[400],
    },
});
