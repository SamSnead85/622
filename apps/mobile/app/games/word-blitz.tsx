// ============================================
// Word Blitz — Wordle-style daily word puzzle + multiplayer race mode
// Addictive 5-letter word guessing game with streak tracking
// ============================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Share,
    ScrollView,
    Modal,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeIn,
    FadeInUp,
    ZoomIn,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    withSpring,
    withDelay,
    Easing,
    runOnJS,
    interpolate,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '@zerog/ui';
import { ScreenHeader } from '../../components';
import { useAuthStore } from '../../stores';
import { showSuccess, showError } from '../../stores/toastStore';
import { socketManager } from '../../lib/socket';

// ============================================
// Constants
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
const TILE_SIZE = Math.min(Math.floor((SCREEN_WIDTH - spacing.lg * 2 - spacing.xs * 4) / WORD_LENGTH), 64);
const TILE_GAP = spacing.xs;
const FLIP_DURATION = 300;
const FLIP_STAGGER = 100;

const STORAGE_KEY_STATS = '@word-blitz-stats';
const getCompletionKey = (dateKey: string) => `@word-blitz-${dateKey}`;

// ============================================
// Word List (200+ common 5-letter English words)
// ============================================

const WORDS: string[] = [
    'BRAIN', 'CROWN', 'DANCE', 'EAGLE', 'FLAME',
    'GRACE', 'HEART', 'IVORY', 'JEWEL', 'KNEEL',
    'LEMON', 'MARCH', 'NIGHT', 'OCEAN', 'PEACE',
    'QUEEN', 'RIDER', 'SHINE', 'TOWER', 'UNION',
    'VOICE', 'WATCH', 'XENON', 'YIELD', 'ZEBRA',
    'APPLE', 'BEACH', 'CHAIR', 'DREAM', 'EARTH',
    'FRESH', 'GHOST', 'HOUSE', 'IMAGE', 'JUDGE',
    'KNIFE', 'LIGHT', 'MUSIC', 'NOBLE', 'OLIVE',
    'PIANO', 'QUEST', 'RIVER', 'STORM', 'TIGER',
    'ULTRA', 'VIVID', 'WORLD', 'YOUTH', 'ZESTY',
    'ANGEL', 'BRAVE', 'CANDY', 'DRIFT', 'EVENT',
    'FROST', 'GREEN', 'HONEY', 'INPUT', 'JOLLY',
    'KARMA', 'LUCKY', 'MAPLE', 'NERVE', 'ORBIT',
    'PRIDE', 'QUIET', 'ROBOT', 'SPACE', 'TRAIN',
    'UNITY', 'VALUE', 'WHEAT', 'OZONE', 'PLAZA',
    'ABOUT', 'BELOW', 'CHAIN', 'DOZEN', 'ENJOY',
    'FIELD', 'GRAIN', 'HELLO', 'INNER', 'JELLY',
    'KNOCK', 'LATCH', 'METAL', 'NOVEL', 'ORDER',
    'POWER', 'QUICK', 'ROUND', 'SHINE', 'TOUCH',
    'UPPER', 'VOCAL', 'WASTE', 'YEARS', 'ZONES',
    'ACORN', 'BLEND', 'CLOUD', 'DOUGH', 'ELITE',
    'FLUTE', 'GLARE', 'HUMID', 'IRONY', 'JUMPY',
    'KAYAK', 'LEMON', 'MINOR', 'NICHE', 'OXIDE',
    'PATCH', 'QUILT', 'RESIN', 'SHALE', 'THEFT',
    'USHER', 'VENOM', 'WINDY', 'EXTRA', 'YIELD',
    'BLAZE', 'CRISP', 'DWARF', 'FAIRY', 'GLOAT',
    'HASTE', 'IVORY', 'JOKER', 'KNACK', 'LEVER',
    'MIRTH', 'NINJA', 'OMEGA', 'PLUMB', 'QUIRK',
    'REIGN', 'SWIRL', 'THORN', 'UDDER', 'VIGOR',
    'WEAVE', 'YACHT', 'ZILCH', 'AMBER', 'BRISK',
    'CEDAR', 'DIODE', 'EMBER', 'FORGE', 'GRIND',
    'HAVEN', 'INDEX', 'JAZZY', 'KIOSK', 'LUNAR',
    'MOOSE', 'NYLON', 'ONSET', 'PEARL', 'QUOTA',
    'RAVEN', 'SIREN', 'TRIBE', 'USURP', 'VAULT',
    'WHISK', 'EXPAT', 'YACHT', 'ZIPPY', 'ADORN',
    'BISON', 'CIDER', 'DELTA', 'ERUPT', 'FLASK',
    'GOUGE', 'HYPER', 'INGOT', 'JOUST', 'KEBAB',
    'LLAMA', 'MANGO', 'NOTCH', 'OUTDO', 'PRISM',
    'QUALM', 'RUSTY', 'SPICE', 'TROUT', 'ULCER',
    'VINYL', 'WRATH', 'EXUDE', 'YEARN', 'ZEALOT',
    'ALOOF', 'BRAWL', 'CLOAK', 'DENSE', 'EPOCH',
    'FIERY', 'GUISE', 'HOVER', 'IDEAL', 'JUMBO',
    'KHAKI', 'LOTUS', 'MURAL', 'NEXUS', 'OPTIC',
    'PIXIE', 'REGAL', 'SAUNA', 'TOPAZ', 'UMBRA',
    'VERGE', 'WEDGE', 'TOXIN', 'YOUTH', 'STOIC',
    'ABYSS', 'BLOAT', 'COMET', 'DOUSE', 'EASEL',
    'FABLE', 'GRIEF', 'HEIST', 'IDIOM', 'JUROR',
].filter((w) => w.length === 5);

// Deduplicate
const UNIQUE_WORDS = [...new Set(WORDS)];

// ============================================
// Daily Word Selection (deterministic from date)
// ============================================

function getDateKey(): string {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
}

function getDailyWord(): string {
    const dateKey = getDateKey();
    let hash = 0;
    for (let i = 0; i < dateKey.length; i++) {
        hash = ((hash << 5) - hash + dateKey.charCodeAt(i)) | 0;
    }
    return UNIQUE_WORDS[Math.abs(hash) % UNIQUE_WORDS.length].toUpperCase();
}

// ============================================
// Types
// ============================================

type LetterStatus = 'empty' | 'filled' | 'correct' | 'present' | 'absent';
type KeyStatus = 'unused' | 'correct' | 'present' | 'absent';
type GameStatus = 'playing' | 'won' | 'lost';

interface TileData {
    letter: string;
    status: LetterStatus;
}

interface GameStats {
    played: number;
    wins: number;
    currentStreak: number;
    maxStreak: number;
    guessDistribution: number[]; // index 0 = solved in 1, etc.
}

interface SavedCompletion {
    word: string;
    guesses: string[];
    won: boolean;
    attempts: number;
    timeMs: number;
}

const DEFAULT_STATS: GameStats = {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: [0, 0, 0, 0, 0, 0],
};

// ============================================
// Keyboard Layout
// ============================================

const KEYBOARD_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
];

// ============================================
// Helper: Evaluate guess against target
// ============================================

function evaluateGuess(guess: string, target: string): LetterStatus[] {
    const result: LetterStatus[] = Array(WORD_LENGTH).fill('absent');
    const targetLetters = target.split('');
    const guessLetters = guess.split('');
    const used = Array(WORD_LENGTH).fill(false);

    // First pass: mark correct positions (green)
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guessLetters[i] === targetLetters[i]) {
            result[i] = 'correct';
            used[i] = true;
        }
    }

    // Second pass: mark present letters (yellow)
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (result[i] === 'correct') continue;
        for (let j = 0; j < WORD_LENGTH; j++) {
            if (!used[j] && guessLetters[i] === targetLetters[j]) {
                result[i] = 'present';
                used[j] = true;
                break;
            }
        }
    }

    return result;
}

// ============================================
// Helper: Format time
// ============================================

function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ============================================
// Confetti Particle Component
// ============================================

function ConfettiParticle({ delay, index }: { delay: number; index: number }) {
    const translateY = useSharedValue(0);
    const translateX = useSharedValue(0);
    const opacity = useSharedValue(1);
    const rotate = useSharedValue(0);

    const startX = useMemo(
        () => Math.random() * SCREEN_WIDTH - SCREEN_WIDTH / 2,
        [],
    );

    useEffect(() => {
        translateY.value = withDelay(
            delay,
            withTiming(-400 - Math.random() * 200, { duration: 2000, easing: Easing.out(Easing.quad) }),
        );
        translateX.value = withDelay(
            delay,
            withTiming(startX + (Math.random() - 0.5) * 100, { duration: 2000 }),
        );
        opacity.value = withDelay(delay + 1200, withTiming(0, { duration: 800 }));
        rotate.value = withDelay(
            delay,
            withTiming(Math.random() * 720 - 360, { duration: 2000 }),
        );
    }, [delay, startX, translateY, translateX, opacity, rotate]);

    const particleColors = [colors.gold[500], colors.gold[400], colors.emerald[500], colors.amber[500], colors.gold[300]];
    const color = particleColors[index % particleColors.length];
    const size = 6 + Math.random() * 6;

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: translateY.value },
            { translateX: translateX.value },
            { rotate: `${rotate.value}deg` },
        ],
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    bottom: 0,
                    left: SCREEN_WIDTH / 2,
                    width: size,
                    height: size,
                    borderRadius: Math.random() > 0.5 ? size / 2 : 2,
                    backgroundColor: color,
                },
                animatedStyle,
            ]}
        />
    );
}

// ============================================
// Confetti Container
// ============================================

function ConfettiCelebration({ visible }: { visible: boolean }) {
    if (!visible) return null;

    const particles = Array.from({ length: 40 }, (_, i) => i);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {particles.map((i) => (
                <ConfettiParticle key={i} index={i} delay={i * 40} />
            ))}
        </View>
    );
}

// ============================================
// Tile Component with Flip Animation
// ============================================

interface TileProps {
    data: TileData;
    rowIndex: number;
    colIndex: number;
    isCurrentRow: boolean;
    isRevealing: boolean;
}

function Tile({ data, rowIndex, colIndex, isCurrentRow, isRevealing }: TileProps) {
    const flipProgress = useSharedValue(0);
    const bounceScale = useSharedValue(1);
    const hasFlipped = useRef(false);

    // Bounce animation when letter is entered
    useEffect(() => {
        if (data.letter && isCurrentRow && !hasFlipped.current) {
            bounceScale.value = withSequence(
                withSpring(1.15, { damping: 8, stiffness: 400 }),
                withSpring(1, { damping: 12, stiffness: 300 }),
            );
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [data.letter, isCurrentRow, bounceScale]);

    // Flip animation on reveal
    useEffect(() => {
        if (isRevealing && !hasFlipped.current) {
            hasFlipped.current = true;
            flipProgress.value = withDelay(
                colIndex * FLIP_STAGGER,
                withTiming(1, { duration: FLIP_DURATION, easing: Easing.inOut(Easing.ease) }),
            );
        }
    }, [isRevealing, colIndex, flipProgress]);

    const frontStyle = useAnimatedStyle(() => {
        const rotateX = interpolate(flipProgress.value, [0, 0.5, 1], [0, 90, 90]);
        return {
            transform: [{ perspective: 800 }, { rotateX: `${rotateX}deg` }, { scale: bounceScale.value }],
            opacity: flipProgress.value < 0.5 ? 1 : 0,
            backfaceVisibility: 'hidden' as const,
        };
    });

    const backStyle = useAnimatedStyle(() => {
        const rotateX = interpolate(flipProgress.value, [0, 0.5, 1], [-90, -90, 0]);
        return {
            transform: [{ perspective: 800 }, { rotateX: `${rotateX}deg` }],
            opacity: flipProgress.value >= 0.5 ? 1 : 0,
            backfaceVisibility: 'hidden' as const,
        };
    });

    const getStatusColor = (status: LetterStatus): string => {
        switch (status) {
            case 'correct':
                return colors.emerald[500];
            case 'present':
                return colors.amber[500];
            case 'absent':
                return colors.obsidian[600];
            default:
                return 'transparent';
        }
    };

    const getBorderColor = (): string => {
        if (data.letter && (data.status === 'empty' || data.status === 'filled')) {
            return colors.obsidian[400];
        }
        return colors.obsidian[600];
    };

    return (
        <View style={styles.tileContainer}>
            {/* Front face (before flip) */}
            <Animated.View
                style={[
                    styles.tile,
                    {
                        borderColor: getBorderColor(),
                        borderWidth: 2,
                        backgroundColor: colors.obsidian[800],
                    },
                    frontStyle,
                ]}
            >
                <Text style={styles.tileText}>{data.letter}</Text>
            </Animated.View>

            {/* Back face (after flip, shows color) */}
            <Animated.View
                style={[
                    styles.tile,
                    styles.tileAbsolute,
                    {
                        backgroundColor: getStatusColor(data.status),
                        borderWidth: 0,
                    },
                    backStyle,
                ]}
            >
                <Text style={[styles.tileText, styles.tileTextRevealed]}>{data.letter}</Text>
            </Animated.View>
        </View>
    );
}

// ============================================
// Keyboard Key Component
// ============================================

interface KeyProps {
    label: string;
    status: KeyStatus;
    onPress: (key: string) => void;
    wide?: boolean;
}

function Key({ label, status, onPress, wide }: KeyProps) {
    const scale = useSharedValue(1);

    const handlePress = useCallback(() => {
        scale.value = withSequence(
            withSpring(0.9, { damping: 15, stiffness: 500 }),
            withSpring(1, { damping: 12, stiffness: 300 }),
        );
        onPress(label);
    }, [label, onPress, scale]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const getKeyColor = (): string => {
        switch (status) {
            case 'correct':
                return colors.emerald[500];
            case 'present':
                return colors.amber[500];
            case 'absent':
                return colors.obsidian[700];
            default:
                return colors.obsidian[500];
        }
    };

    const isIcon = label === 'ENTER' || label === 'BACK';
    const keyWidth = wide ? TILE_SIZE * 1.4 : isIcon ? TILE_SIZE * 1.2 : Math.floor((SCREEN_WIDTH - spacing.lg * 2 - 9 * spacing.xs) / 10);

    return (
        <Animated.View style={animatedStyle}>
            <TouchableOpacity
                style={[
                    styles.key,
                    { backgroundColor: getKeyColor(), width: keyWidth },
                ]}
                onPress={handlePress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={label === 'BACK' ? 'Delete' : label === 'ENTER' ? 'Submit' : label}
            >
                {label === 'BACK' ? (
                    <Ionicons name="backspace-outline" size={20} color={colors.text.primary} />
                ) : label === 'ENTER' ? (
                    <Ionicons name="return-down-back-outline" size={20} color={colors.text.primary} />
                ) : (
                    <Text
                        style={[
                            styles.keyText,
                            status !== 'unused' && status !== 'absent' && styles.keyTextActive,
                        ]}
                    >
                        {label}
                    </Text>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

// ============================================
// Stats Bar Chart Component
// ============================================

function GuessDistribution({ distribution, lastGuess }: { distribution: number[]; lastGuess: number }) {
    const maxVal = Math.max(...distribution, 1);

    return (
        <View style={styles.distributionContainer}>
            <Text style={styles.distributionTitle}>Guess Distribution</Text>
            {distribution.map((count, index) => {
                const widthPercent = Math.max((count / maxVal) * 100, 8);
                const isHighlighted = index === lastGuess - 1;
                return (
                    <View key={index} style={styles.distributionRow}>
                        <Text style={styles.distributionLabel}>{index + 1}</Text>
                        <View style={styles.distributionBarContainer}>
                            <View
                                style={[
                                    styles.distributionBar,
                                    {
                                        width: `${widthPercent}%`,
                                        backgroundColor: isHighlighted ? colors.emerald[500] : colors.obsidian[500],
                                    },
                                ]}
                            >
                                <Text style={styles.distributionBarText}>{count}</Text>
                            </View>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

// ============================================
// Stats Modal Component
// ============================================

interface StatsModalProps {
    visible: boolean;
    onClose: () => void;
    stats: GameStats;
    gameStatus: GameStatus;
    targetWord: string;
    guesses: string[];
    currentAttempt: number;
    timeMs: number;
    onShare: () => void;
}

function StatsModal({
    visible,
    onClose,
    stats,
    gameStatus,
    targetWord,
    guesses,
    currentAttempt,
    timeMs,
    onShare,
}: StatsModalProps) {
    const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <Animated.View
                    entering={ZoomIn.duration(300).springify()}
                    style={styles.modalContent}
                >
                    <TouchableOpacity style={styles.modalClose} onPress={onClose}>
                        <Ionicons name="close" size={24} color={colors.text.secondary} />
                    </TouchableOpacity>

                    {/* Game Result */}
                    {gameStatus === 'won' && (
                        <View style={styles.modalResult}>
                            <Ionicons name="trophy" size={48} color={colors.gold[500]} />
                            <Text style={styles.modalResultTitle}>Brilliant!</Text>
                            <Text style={styles.modalResultSubtitle}>
                                Solved in {currentAttempt} {currentAttempt === 1 ? 'guess' : 'guesses'} ({formatTime(timeMs)})
                            </Text>
                        </View>
                    )}

                    {gameStatus === 'lost' && (
                        <View style={styles.modalResult}>
                            <Ionicons name="sad-outline" size={48} color={colors.coral[500]} />
                            <Text style={styles.modalResultTitle}>Better luck tomorrow!</Text>
                            <Text style={styles.modalResultSubtitle}>
                                The word was{' '}
                                <Text style={{ color: colors.emerald[500], fontWeight: '700' }}>{targetWord}</Text>
                            </Text>
                        </View>
                    )}

                    {gameStatus === 'playing' && (
                        <Text style={styles.modalSectionTitle}>Statistics</Text>
                    )}

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats.played}</Text>
                            <Text style={styles.statLabel}>Played</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{winRate}</Text>
                            <Text style={styles.statLabel}>Win %</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, stats.currentStreak > 0 && { color: colors.gold[500] }]}>
                                {stats.currentStreak}
                            </Text>
                            <Text style={styles.statLabel}>Streak</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats.maxStreak}</Text>
                            <Text style={styles.statLabel}>Max Streak</Text>
                        </View>
                    </View>

                    {/* Guess Distribution */}
                    <GuessDistribution
                        distribution={stats.guessDistribution}
                        lastGuess={gameStatus === 'won' ? currentAttempt : -1}
                    />

                    {/* Share Button */}
                    {gameStatus !== 'playing' && (
                        <TouchableOpacity style={styles.shareButton} onPress={onShare} activeOpacity={0.8}>
                            <LinearGradient
                                colors={[colors.gold[500], colors.gold[600]]}
                                style={styles.shareButtonGradient}
                            >
                                <Ionicons name="share-outline" size={20} color={colors.obsidian[900]} />
                                <Text style={styles.shareButtonText}>Share Results</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
}

// ============================================
// Opponent Progress (Race Mode)
// ============================================

function OpponentProgress({ row, solved }: { row: number; solved: boolean }) {
    return (
        <Animated.View entering={FadeIn.duration(300)} style={styles.opponentBar}>
            <Ionicons
                name={solved ? 'checkmark-circle' : 'person-outline'}
                size={16}
                color={solved ? colors.emerald[500] : colors.text.muted}
            />
            <Text style={[styles.opponentText, solved && { color: colors.emerald[500] }]}>
                {solved ? 'Opponent solved it!' : `Opponent: Row ${row + 1}/${MAX_ATTEMPTS}`}
            </Text>
            {!solved && (
                <View style={styles.opponentDots}>
                    {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.opponentDot,
                                i <= row && { backgroundColor: colors.amber[500] },
                            ]}
                        />
                    ))}
                </View>
            )}
        </Animated.View>
    );
}

// ============================================
// Main Word Blitz Screen
// ============================================

export default function WordBlitzScreen() {
    const router = useRouter();
    const { mode = 'daily', code } = useLocalSearchParams<{ mode?: 'daily' | 'race'; code?: string }>();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);

    // ============================================
    // Game State
    // ============================================

    const [targetWord, setTargetWord] = useState('');
    const [grid, setGrid] = useState<TileData[][]>(() =>
        Array.from({ length: MAX_ATTEMPTS }, () =>
            Array.from({ length: WORD_LENGTH }, () => ({ letter: '', status: 'empty' as LetterStatus })),
        ),
    );
    const [currentRow, setCurrentRow] = useState(0);
    const [currentCol, setCurrentCol] = useState(0);
    const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
    const [keyStatuses, setKeyStatuses] = useState<Record<string, KeyStatus>>({});
    const [revealingRow, setRevealingRow] = useState<number | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [stats, setStats] = useState<GameStats>(DEFAULT_STATS);
    const [showStats, setShowStats] = useState(false);
    const [startTime] = useState(Date.now());
    const [elapsedMs, setElapsedMs] = useState(0);
    const [shakeRow, setShakeRow] = useState<number | null>(null);
    const [alreadyCompleted, setAlreadyCompleted] = useState(false);

    // Multiplayer race state
    const [opponentRow, setOpponentRow] = useState(0);
    const [opponentSolved, setOpponentSolved] = useState(false);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isRaceMode = mode === 'race' && !!code;

    // ============================================
    // Initialize Game
    // ============================================

    useEffect(() => {
        const initGame = async () => {
            const word = getDailyWord();
            setTargetWord(word);

            // Load stats
            try {
                const savedStats = await AsyncStorage.getItem(STORAGE_KEY_STATS);
                if (savedStats) {
                    setStats(JSON.parse(savedStats));
                }
            } catch {
                // Use defaults
            }

            // Check if already completed today (solo mode)
            if (!isRaceMode) {
                try {
                    const dateKey = getDateKey();
                    const saved = await AsyncStorage.getItem(getCompletionKey(dateKey));
                    if (saved) {
                        const completion: SavedCompletion = JSON.parse(saved);
                        setAlreadyCompleted(true);

                        // Restore the grid from saved guesses
                        const newGrid = Array.from({ length: MAX_ATTEMPTS }, () =>
                            Array.from({ length: WORD_LENGTH }, () => ({ letter: '', status: 'empty' as LetterStatus })),
                        );
                        const newKeyStatuses: Record<string, KeyStatus> = {};

                        completion.guesses.forEach((guess, rowIdx) => {
                            const statuses = evaluateGuess(guess, completion.word);
                            for (let c = 0; c < WORD_LENGTH; c++) {
                                newGrid[rowIdx][c] = { letter: guess[c], status: statuses[c] };
                                // Update key statuses
                                const key = guess[c];
                                const current = newKeyStatuses[key];
                                if (statuses[c] === 'correct') {
                                    newKeyStatuses[key] = 'correct';
                                } else if (statuses[c] === 'present' && current !== 'correct') {
                                    newKeyStatuses[key] = 'present';
                                } else if (statuses[c] === 'absent' && !current) {
                                    newKeyStatuses[key] = 'absent';
                                }
                            }
                        });

                        setGrid(newGrid);
                        setKeyStatuses(newKeyStatuses);
                        setCurrentRow(completion.guesses.length);
                        setGameStatus(completion.won ? 'won' : 'lost');
                        setElapsedMs(completion.timeMs);

                        // Show stats after a brief delay
                        setTimeout(() => setShowStats(true), 500);
                    }
                } catch {
                    // Fresh game
                }
            }
        };

        initGame();
    }, [isRaceMode]);

    // ============================================
    // Timer
    // ============================================

    useEffect(() => {
        if (gameStatus !== 'playing' || alreadyCompleted) return;

        timerRef.current = setInterval(() => {
            setElapsedMs(Date.now() - startTime);
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gameStatus, startTime, alreadyCompleted]);

    // ============================================
    // Multiplayer Socket Listeners
    // ============================================

    useEffect(() => {
        if (!isRaceMode || !code) return;

        const unsubs = [
            socketManager.on('game:update', (data: any) => {
                if (data?.type === 'progress' && data.playerId !== user?.id) {
                    setOpponentRow(data.row ?? 0);
                }
                if (data?.type === 'solved' && data.playerId !== user?.id) {
                    setOpponentSolved(true);
                    if (gameStatus === 'playing') {
                        showError('Opponent solved it first!');
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    }
                }
            }),
        ];

        return () => unsubs.forEach((fn) => fn());
    }, [isRaceMode, code, user?.id, gameStatus]);

    // ============================================
    // Save Stats & Completion
    // ============================================

    const saveGameResult = useCallback(
        async (won: boolean, attempts: number, timeTaken: number, guessWords: string[]) => {
            try {
                // Update stats
                const newStats: GameStats = {
                    played: stats.played + 1,
                    wins: won ? stats.wins + 1 : stats.wins,
                    currentStreak: won ? stats.currentStreak + 1 : 0,
                    maxStreak: won
                        ? Math.max(stats.maxStreak, stats.currentStreak + 1)
                        : stats.maxStreak,
                    guessDistribution: [...stats.guessDistribution],
                };
                if (won) {
                    newStats.guessDistribution[attempts - 1] += 1;
                }
                setStats(newStats);
                await AsyncStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(newStats));

                // Save completion for today
                if (!isRaceMode) {
                    const dateKey = getDateKey();
                    const completion: SavedCompletion = {
                        word: targetWord,
                        guesses: guessWords,
                        won,
                        attempts,
                        timeMs: timeTaken,
                    };
                    await AsyncStorage.setItem(getCompletionKey(dateKey), JSON.stringify(completion));
                }
            } catch {
                // Silently fail
            }
        },
        [stats, targetWord, isRaceMode],
    );

    // ============================================
    // Share Results
    // ============================================

    const shareResults = useCallback(async () => {
        const dateKey = getDateKey();
        const emojiGrid = grid
            .slice(0, gameStatus === 'won' ? currentRow : MAX_ATTEMPTS)
            .filter((row) => row[0].status !== 'empty' && row[0].status !== 'filled')
            .map((row) =>
                row
                    .map((tile) => {
                        switch (tile.status) {
                            case 'correct':
                                return '🟩';
                            case 'present':
                                return '🟨';
                            case 'absent':
                                return '⬛';
                            default:
                                return '⬜';
                        }
                    })
                    .join(''),
            )
            .join('\n');

        const resultText = gameStatus === 'won' ? `${currentRow}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`;
        const message = `Word Blitz ${dateKey} ${resultText}\n\n${emojiGrid}\n\n🔥 ${stats.currentStreak} streak`;

        try {
            await Share.share({ message });
            showSuccess('Results copied!');
        } catch {
            // User cancelled
        }
    }, [grid, gameStatus, currentRow, stats.currentStreak]);

    // ============================================
    // Handle Key Press
    // ============================================

    const handleKeyPress = useCallback(
        (key: string) => {
            if (gameStatus !== 'playing' || revealingRow !== null || alreadyCompleted) return;

            if (key === 'BACK') {
                // Delete last letter
                if (currentCol > 0) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setGrid((prev) => {
                        const newGrid = prev.map((row) => row.map((tile) => ({ ...tile })));
                        newGrid[currentRow][currentCol - 1] = { letter: '', status: 'empty' };
                        return newGrid;
                    });
                    setCurrentCol((prev) => prev - 1);
                }
                return;
            }

            if (key === 'ENTER') {
                // Submit guess
                if (currentCol < WORD_LENGTH) {
                    // Not enough letters — shake
                    setShakeRow(currentRow);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    setTimeout(() => setShakeRow(null), 500);
                    showError('Not enough letters');
                    return;
                }

                const guess = grid[currentRow].map((t) => t.letter).join('');

                // Evaluate guess
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                const statuses = evaluateGuess(guess, targetWord);

                // Update grid with statuses
                setGrid((prev) => {
                    const newGrid = prev.map((row) => row.map((tile) => ({ ...tile })));
                    for (let c = 0; c < WORD_LENGTH; c++) {
                        newGrid[currentRow][c] = { letter: guess[c], status: statuses[c] };
                    }
                    return newGrid;
                });

                // Start flip reveal
                setRevealingRow(currentRow);

                // After flip animation completes, update keyboard and check win/loss
                const flipComplete = FLIP_STAGGER * WORD_LENGTH + FLIP_DURATION + 50;
                setTimeout(() => {
                    // Update keyboard statuses
                    setKeyStatuses((prev) => {
                        const updated = { ...prev };
                        for (let c = 0; c < WORD_LENGTH; c++) {
                            const letter = guess[c];
                            const newStatus = statuses[c] === 'correct'
                                ? 'correct'
                                : statuses[c] === 'present'
                                    ? 'present'
                                    : 'absent';

                            const existing = updated[letter];
                            // Don't downgrade: correct > present > absent
                            if (newStatus === 'correct') {
                                updated[letter] = 'correct';
                            } else if (newStatus === 'present' && existing !== 'correct') {
                                updated[letter] = 'present';
                            } else if (newStatus === 'absent' && !existing) {
                                updated[letter] = 'absent';
                            }
                        }
                        return updated;
                    });

                    setRevealingRow(null);

                    const won = guess === targetWord;
                    const isLastRow = currentRow === MAX_ATTEMPTS - 1;
                    const timeTaken = Date.now() - startTime;

                    // Collect all guesses including current
                    const allGuesses = grid
                        .slice(0, currentRow)
                        .map((row) => row.map((t) => t.letter).join(''))
                        .filter((g) => g.length === WORD_LENGTH);
                    allGuesses.push(guess);

                    if (won) {
                        setGameStatus('won');
                        setElapsedMs(timeTaken);
                        if (timerRef.current) clearInterval(timerRef.current);
                        setShowConfetti(true);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        saveGameResult(true, currentRow + 1, timeTaken, allGuesses);

                        // Send multiplayer update
                        if (isRaceMode && code) {
                            socketManager.sendGameAction(code, 'solved', { attempts: currentRow + 1 });
                        }

                        setTimeout(() => setShowStats(true), 1500);
                    } else if (isLastRow) {
                        setGameStatus('lost');
                        setElapsedMs(timeTaken);
                        if (timerRef.current) clearInterval(timerRef.current);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                        saveGameResult(false, MAX_ATTEMPTS, timeTaken, allGuesses);

                        setTimeout(() => setShowStats(true), 1000);
                    } else {
                        // Move to next row
                        setCurrentRow((prev) => prev + 1);
                        setCurrentCol(0);

                        // Send multiplayer progress
                        if (isRaceMode && code) {
                            socketManager.sendGameAction(code, 'progress', { row: currentRow + 1 });
                        }
                    }
                }, flipComplete);
                return;
            }

            // Regular letter input
            if (currentCol < WORD_LENGTH) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setGrid((prev) => {
                    const newGrid = prev.map((row) => row.map((tile) => ({ ...tile })));
                    newGrid[currentRow][currentCol] = { letter: key, status: 'filled' };
                    return newGrid;
                });
                setCurrentCol((prev) => prev + 1);
            }
        },
        [
            gameStatus,
            revealingRow,
            alreadyCompleted,
            currentCol,
            currentRow,
            grid,
            targetWord,
            startTime,
            saveGameResult,
            isRaceMode,
            code,
        ],
    );

    // ============================================
    // Shake Animation for Invalid Guess
    // ============================================

    const shakeValue = useSharedValue(0);

    useEffect(() => {
        if (shakeRow !== null) {
            shakeValue.value = withSequence(
                withTiming(-8, { duration: 50 }),
                withTiming(8, { duration: 50 }),
                withTiming(-6, { duration: 50 }),
                withTiming(6, { duration: 50 }),
                withTiming(-3, { duration: 50 }),
                withTiming(0, { duration: 50 }),
            );
        }
    }, [shakeRow, shakeValue]);

    const shakeStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shakeValue.value }],
    }));

    // ============================================
    // Render
    // ============================================

    return (
        <LinearGradient
            colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
            style={styles.gradient}
        >
            {/* Header */}
            <ScreenHeader
                title="Word Blitz"
                rightElement={
                    <View style={styles.headerRight}>
                        {stats.currentStreak > 0 && (
                            <View style={styles.streakBadge}>
                                <Ionicons name="flame" size={14} color={colors.gold[500]} />
                                <Text style={styles.streakText}>{stats.currentStreak}</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            onPress={() => setShowStats(true)}
                            accessibilityLabel="Statistics"
                        >
                            <Ionicons name="stats-chart" size={22} color={colors.text.secondary} />
                        </TouchableOpacity>
                    </View>
                }
            />

            {/* Timer + Mode Badge */}
            <View style={styles.infoBar}>
                {isRaceMode && (
                    <View style={styles.modeBadge}>
                        <Ionicons name="flash" size={12} color={colors.gold[500]} />
                        <Text style={styles.modeBadgeText}>RACE</Text>
                    </View>
                )}
                <View style={styles.timerBadge}>
                    <Ionicons name="time-outline" size={14} color={colors.text.muted} />
                    <Text style={styles.timerText}>{formatTime(elapsedMs)}</Text>
                </View>
            </View>

            {/* Opponent Progress (Race Mode) */}
            {isRaceMode && (
                <OpponentProgress row={opponentRow} solved={opponentSolved} />
            )}

            {/* Grid */}
            <View style={styles.gridContainer}>
                {grid.map((row, rowIndex) => {
                    const isShaking = shakeRow === rowIndex;
                    const RowWrapper = isShaking ? Animated.View : View;

                    return (
                        <RowWrapper
                            key={rowIndex}
                            style={[styles.row, isShaking ? shakeStyle : undefined]}
                        >
                            {row.map((tile, colIndex) => (
                                <Tile
                                    key={`${rowIndex}-${colIndex}`}
                                    data={tile}
                                    rowIndex={rowIndex}
                                    colIndex={colIndex}
                                    isCurrentRow={rowIndex === currentRow && gameStatus === 'playing'}
                                    isRevealing={revealingRow === rowIndex}
                                />
                            ))}
                        </RowWrapper>
                    );
                })}
            </View>

            {/* Keyboard */}
            <View style={[styles.keyboard, { paddingBottom: insets.bottom + spacing.sm }]}>
                {KEYBOARD_ROWS.map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.keyboardRow}>
                        {row.map((key) => (
                            <Key
                                key={key}
                                label={key}
                                status={keyStatuses[key] || 'unused'}
                                onPress={handleKeyPress}
                                wide={key === 'ENTER' || key === 'BACK'}
                            />
                        ))}
                    </View>
                ))}
            </View>

            {/* Confetti */}
            <ConfettiCelebration visible={showConfetti} />

            {/* Stats Modal */}
            <StatsModal
                visible={showStats}
                onClose={() => setShowStats(false)}
                stats={stats}
                gameStatus={gameStatus}
                targetWord={targetWord}
                guesses={grid
                    .slice(0, currentRow)
                    .map((row) => row.map((t) => t.letter).join(''))
                    .filter((g) => g.length === WORD_LENGTH)}
                currentAttempt={currentRow}
                timeMs={elapsedMs}
                onShare={shareResults}
            />
        </LinearGradient>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },

    // Header
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: colors.surface.goldSubtle,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs + 1,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
    },
    streakText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.gold[500],
        fontFamily: 'Inter-Bold',
    },

    // Info Bar
    infoBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    timerText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        fontFamily: 'Inter-Bold',
        fontWeight: '600',
    },
    modeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: colors.surface.goldSubtle,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
    },
    modeBadgeText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.gold[500],
        letterSpacing: typography.letterSpacing.wider,
    },

    // Opponent
    opponentBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs,
    },
    opponentText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
    opponentDots: {
        flexDirection: 'row',
        gap: 3,
    },
    opponentDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.obsidian[600],
    },

    // Grid
    gridContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: TILE_GAP,
        paddingHorizontal: spacing.lg,
    },
    row: {
        flexDirection: 'row',
        gap: TILE_GAP,
    },
    tileContainer: {
        width: TILE_SIZE,
        height: TILE_SIZE,
    },
    tile: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tileAbsolute: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    tileText: {
        fontSize: TILE_SIZE * 0.48,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
    },
    tileTextRevealed: {
        color: colors.text.primary,
    },

    // Keyboard
    keyboard: {
        paddingHorizontal: spacing.sm,
        gap: spacing.xs,
    },
    keyboardRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.xs,
    },
    key: {
        height: 48,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 28,
    },
    keyText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
    },
    keyTextActive: {
        color: colors.text.primary,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.surface.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    modalContent: {
        backgroundColor: colors.obsidian[800],
        borderRadius: 20,
        padding: spacing.xl,
        width: '100%',
        maxWidth: 380,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    modalClose: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        zIndex: 10,
        padding: spacing.xs,
    },
    modalResult: {
        alignItems: 'center',
        marginBottom: spacing.xl,
        marginTop: spacing.sm,
    },
    modalResultTitle: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
        marginTop: spacing.md,
    },
    modalResultSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    modalSectionTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
        textAlign: 'center',
        marginBottom: spacing.lg,
    },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: spacing.xl,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
    },
    statLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: 2,
    },

    // Distribution
    distributionContainer: {
        marginBottom: spacing.xl,
    },
    distributionTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
        marginBottom: spacing.md,
        textTransform: 'uppercase',
        letterSpacing: typography.letterSpacing.wide,
    },
    distributionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    distributionLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.text.secondary,
        width: 16,
        textAlign: 'center',
        marginRight: spacing.sm,
    },
    distributionBarContainer: {
        flex: 1,
    },
    distributionBar: {
        minWidth: 24,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: 4,
        alignItems: 'flex-end',
    },
    distributionBarText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
    },

    // Share Button
    shareButton: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    shareButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md + 2,
    },
    shareButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.obsidian[900],
        fontFamily: 'Inter-Bold',
    },
});
