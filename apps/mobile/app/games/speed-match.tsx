// ============================================
// Speed Match — Fast-paced reaction/memory game
// Three modes: Color Rush, Pattern Memory, Math Blitz
// Solo & multiplayer (head-to-head) support
// ============================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    Dimensions,
    Share,
    ScrollView,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeIn,
    FadeOut,
    ZoomIn,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withSequence,
    withDelay,
    withRepeat,
    Easing,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '@zerog/ui';
import { ScreenHeader, GlassCard, ErrorBoundary } from '../../components';
import { useTheme } from '../../contexts/ThemeContext';
import { socketManager } from '../../lib/socket';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================
// Constants
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ROUND_DURATION = 30; // seconds
const PATTERN_INITIAL_LENGTH = 3;
const PATTERN_GRID_SIZE = 3; // 3x3

type GameMode = 'color' | 'pattern' | 'math';
type Phase = 'menu' | 'playing' | 'results';

// ============================================
// Color Rush Data
// ============================================

const COLOR_OPTIONS = [
    { name: 'Red', color: colors.coral[500] },
    { name: 'Blue', color: colors.azure[500] },
    { name: 'Green', color: colors.emerald[500] },
    { name: 'Yellow', color: colors.amber[500] },
] as const;

type ColorName = (typeof COLOR_OPTIONS)[number]['name'];

function generateColorChallenge(): { word: ColorName; displayColor: string; answer: ColorName } {
    const wordIdx = Math.floor(Math.random() * COLOR_OPTIONS.length);
    let displayIdx = Math.floor(Math.random() * COLOR_OPTIONS.length);
    while (displayIdx === wordIdx) {
        displayIdx = Math.floor(Math.random() * COLOR_OPTIONS.length);
    }
    return {
        word: COLOR_OPTIONS[wordIdx].name,
        displayColor: COLOR_OPTIONS[displayIdx].color,
        answer: COLOR_OPTIONS[wordIdx].name,
    };
}

// ============================================
// Math Blitz Data
// ============================================

interface MathChallenge {
    equation: string;
    correctAnswer: number;
    options: number[];
}

function generateMathChallenge(difficulty: number): MathChallenge {
    const ops = ['+', '-', '×'] as const;
    const op = ops[Math.floor(Math.random() * ops.length)];

    let maxNum: number;
    if (difficulty < 5) maxNum = 10;
    else if (difficulty < 15) maxNum = 50;
    else maxNum = 100;

    let a: number, b: number, answer: number;

    switch (op) {
        case '+':
            a = Math.floor(Math.random() * maxNum) + 1;
            b = Math.floor(Math.random() * maxNum) + 1;
            answer = a + b;
            break;
        case '-':
            a = Math.floor(Math.random() * maxNum) + 1;
            b = Math.floor(Math.random() * a) + 1;
            answer = a - b;
            break;
        case '×':
            a = Math.floor(Math.random() * Math.min(maxNum, 12)) + 1;
            b = Math.floor(Math.random() * Math.min(maxNum, 12)) + 1;
            answer = a * b;
            break;
        default:
            a = 1;
            b = 1;
            answer = 2;
    }

    const equation = `${a} ${op} ${b} = ?`;

    // Generate 3 close decoys + the correct answer
    const optionsSet = new Set<number>();
    optionsSet.add(answer);

    while (optionsSet.size < 4) {
        const offset = Math.floor(Math.random() * 10) - 5;
        const decoy = answer + (offset === 0 ? 1 : offset);
        if (decoy >= 0 && decoy !== answer) {
            optionsSet.add(decoy);
        }
    }

    const options = Array.from(optionsSet).sort(() => Math.random() - 0.5);

    return { equation, correctAnswer: answer, options };
}

// ============================================
// Pattern Memory Data
// ============================================

function generatePattern(length: number): number[] {
    const pattern: number[] = [];
    for (let i = 0; i < length; i++) {
        pattern.push(Math.floor(Math.random() * (PATTERN_GRID_SIZE * PATTERN_GRID_SIZE)));
    }
    return pattern;
}

// ============================================
// Storage Keys
// ============================================

function getStorageKey(mode: GameMode): string {
    return `@speed-match-${mode}`;
}

// ============================================
// Mode Config
// ============================================

const MODE_CONFIG = {
    color: {
        title: 'Color Rush',
        icon: '🎨',
        description: "Don't trust your eyes!",
        accentColor: colors.coral[500],
        accentGradient: [colors.coral[500], colors.coral[400]] as [string, string],
    },
    pattern: {
        title: 'Pattern Memory',
        icon: '🧠',
        description: 'How far can you go?',
        accentColor: colors.azure[500],
        accentGradient: [colors.azure[500], colors.azure[400]] as [string, string],
    },
    math: {
        title: 'Math Blitz',
        icon: '⚡',
        description: 'Think fast!',
        accentColor: colors.emerald[500],
        accentGradient: [colors.emerald[500], colors.emerald[400]] as [string, string],
    },
} as const;

// ============================================
// Animated Score Counter
// ============================================

function AnimatedScore({ score, accentColor }: { score: number; accentColor: string }) {
    const displayScore = useSharedValue(0);
    const scaleAnim = useSharedValue(1);

    useEffect(() => {
        const prev = displayScore.value;
        if (score !== prev) {
            scaleAnim.value = withSequence(
                withSpring(1.2, { damping: 8, stiffness: 400 }),
                withSpring(1, { damping: 12 }),
            );
        }
        displayScore.value = withTiming(score, { duration: 300, easing: Easing.out(Easing.ease) });
    }, [score, displayScore, scaleAnim]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scaleAnim.value }],
    }));

    return (
        <Animated.View style={[styles.scoreContainer, animatedStyle]}>
            <Ionicons name="star" size={14} color={accentColor} />
            <Text style={[styles.scoreText, { color: accentColor }]}>{score}</Text>
        </Animated.View>
    );
}

// ============================================
// Score Popup (floating +10 / +20 / -5)
// ============================================

function ScorePopup({ points, visible }: { points: number; visible: boolean }) {
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(0);
    const popScale = useSharedValue(0.5);

    useEffect(() => {
        if (visible && points !== 0) {
            translateY.value = 0;
            opacity.value = 0;
            popScale.value = 0.5;

            opacity.value = withSequence(
                withTiming(1, { duration: 150 }),
                withDelay(600, withTiming(0, { duration: 400 })),
            );
            translateY.value = withTiming(-50, { duration: 1200, easing: Easing.out(Easing.ease) });
            popScale.value = withSequence(
                withSpring(1.3, { damping: 8 }),
                withSpring(1, { damping: 12 }),
            );
        }
    }, [visible, points, translateY, opacity, popScale]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }, { scale: popScale.value }],
        opacity: opacity.value,
    }));

    if (!visible) return null;

    const isPositive = points > 0;
    const bgColors: [string, string] = isPositive
        ? [colors.emerald[500], colors.emerald[400]]
        : [colors.coral[500], colors.coral[400]];

    return (
        <Animated.View style={[styles.scorePopup, animatedStyle]} pointerEvents="none">
            <LinearGradient colors={bgColors} style={styles.scorePopupBg}>
                <Text style={styles.scorePopupText}>
                    {isPositive ? '+' : ''}{points}
                </Text>
            </LinearGradient>
        </Animated.View>
    );
}

// ============================================
// Countdown Timer Bar
// ============================================

function CountdownBar({ timeLeft, total, accentColor }: { timeLeft: number; total: number; accentColor: string }) {
    const progress = useSharedValue(1);

    useEffect(() => {
        progress.value = withTiming(timeLeft / total, {
            duration: 1000,
            easing: Easing.linear,
        });
    }, [timeLeft, total, progress]);

    const animatedStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%` as any,
    }));

    const isUrgent = timeLeft <= 5;

    return (
        <View style={styles.timerBarContainer}>
            <Animated.View
                style={[
                    styles.timerBarFill,
                    { backgroundColor: isUrgent ? colors.coral[500] : accentColor },
                    animatedStyle,
                ]}
            />
            <Text style={[styles.timerBarText, isUrgent && { color: colors.coral[500] }]}>
                {timeLeft}s
            </Text>
        </View>
    );
}

// ============================================
// Mode Selection Card
// ============================================

function ModeCard({
    mode,
    highScore,
    onPlay,
    index,
}: {
    mode: GameMode;
    highScore: number;
    onPlay: (mode: GameMode) => void;
    index: number;
}) {
    const config = MODE_CONFIG[mode];
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View
            entering={FadeInDown.delay(100 + index * 120).duration(400).springify()}
            style={animatedStyle}
        >
            <Pressable
                onPressIn={() => {
                    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
                }}
                onPressOut={() => {
                    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
                }}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPlay(mode);
                }}
            >
                <GlassCard style={styles.modeCard} padding="lg" radius="xl">
                    <View style={styles.modeCardContent}>
                        <View style={[styles.modeIconBg, { backgroundColor: config.accentColor + '15' }]}>
                            <Text style={styles.modeIcon}>{config.icon}</Text>
                        </View>
                        <View style={styles.modeInfo}>
                            <Text style={styles.modeTitle}>{config.title}</Text>
                            <Text style={styles.modeDescription}>{config.description}</Text>
                            {highScore > 0 && (
                                <View style={styles.highScoreRow}>
                                    <Ionicons name="trophy" size={12} color={colors.gold[500]} />
                                    <Text style={styles.highScoreText}>Best: {highScore}</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.modePlayButton}>
                            <LinearGradient
                                colors={config.accentGradient}
                                style={styles.playButtonGradient}
                            >
                                <Ionicons name="play" size={20} color={colors.text.primary} />
                            </LinearGradient>
                        </View>
                    </View>
                </GlassCard>
            </Pressable>
        </Animated.View>
    );
}

// ============================================
// Color Rush Game
// ============================================

function ColorRushGame({
    onScore,
    onWrong,
    isActive,
}: {
    onScore: (points: number) => void;
    onWrong: () => void;
    isActive: boolean;
}) {
    const [challenge, setChallenge] = useState(generateColorChallenge);
    const [flashColor, setFlashColor] = useState<string | null>(null);
    const shakeX = useSharedValue(0);
    const wordScale = useSharedValue(1);
    const flashTimerRef = useRef<ReturnType<typeof setTimeout>>();

    // Cleanup flash timer on unmount
    useEffect(() => {
        return () => {
            if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        };
    }, []);

    const nextChallenge = useCallback(() => {
        setChallenge(generateColorChallenge());
        wordScale.value = 0.5;
        wordScale.value = withSpring(1, { damping: 10, stiffness: 200 });
    }, [wordScale]);

    const handleTap = useCallback(
        (name: ColorName) => {
            if (!isActive) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            if (name === challenge.answer) {
                // Correct
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setFlashColor(colors.emerald[500]);
                const speedBonus = 10; // base 10, fast bonus in parent
                onScore(speedBonus);
                if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
                flashTimerRef.current = setTimeout(() => setFlashColor(null), 200);
                nextChallenge();
            } else {
                // Wrong
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                setFlashColor(colors.coral[500]);
                shakeX.value = withSequence(
                    withTiming(-8, { duration: 40 }),
                    withTiming(8, { duration: 40 }),
                    withTiming(-6, { duration: 40 }),
                    withTiming(6, { duration: 40 }),
                    withTiming(0, { duration: 40 }),
                );
                onWrong();
                if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
                flashTimerRef.current = setTimeout(() => setFlashColor(null), 200);
                nextChallenge();
            }
        },
        [isActive, challenge.answer, onScore, onWrong, nextChallenge, shakeX],
    );

    const shakeStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shakeX.value }],
    }));

    const wordAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: wordScale.value }],
    }));

    return (
        <Animated.View style={[styles.gameArea, shakeStyle]}>
            {/* Flash overlay */}
            {flashColor && (
                <Animated.View
                    entering={FadeIn.duration(100)}
                    exiting={FadeOut.duration(200)}
                    style={[styles.flashOverlay, { backgroundColor: flashColor + '15' }]}
                />
            )}

            {/* Target word */}
            <Animated.View style={[styles.colorTargetContainer, wordAnimStyle]}>
                <Text style={[styles.colorTargetWord, { color: challenge.displayColor }]}>
                    {challenge.word.toUpperCase()}
                </Text>
                <Text style={styles.colorHint}>Tap the matching color</Text>
            </Animated.View>

            {/* Color circles */}
            <View style={styles.colorCirclesRow}>
                {COLOR_OPTIONS.map((c, i) => (
                    <Animated.View
                        key={c.name}
                        entering={FadeInDown.delay(i * 80).duration(300).springify()}
                    >
                        <TouchableOpacity
                            onPress={() => handleTap(c.name)}
                            activeOpacity={0.7}
                            style={[styles.colorCircle, { backgroundColor: c.color }]}
                        >
                            <Text style={styles.colorCircleLabel}>{c.name}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                ))}
            </View>
        </Animated.View>
    );
}

// ============================================
// Pattern Memory Game
// ============================================

function PatternMemoryGame({
    onGameOver,
    isActive,
}: {
    onGameOver: (score: number) => void;
    isActive: boolean;
}) {
    const [patternLength, setPatternLength] = useState(PATTERN_INITIAL_LENGTH);
    const [pattern, setPattern] = useState<number[]>(() => generatePattern(PATTERN_INITIAL_LENGTH));
    const [phase, setPhase] = useState<'showing' | 'input' | 'success' | 'fail'>('showing');
    const [inputIndex, setInputIndex] = useState(0);
    const [activeTile, setActiveTile] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const nextRoundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tileFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup all timeouts on unmount
    useEffect(() => {
        return () => {
            if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
            if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
            if (tileFlashTimeoutRef.current) clearTimeout(tileFlashTimeoutRef.current);
        };
    }, []);

    // Show pattern sequence
    useEffect(() => {
        if (phase !== 'showing' || !isActive) return;

        let i = 0;
        setActiveTile(null);

        const showNext = () => {
            if (i < pattern.length) {
                setActiveTile(pattern[i]);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                showTimeoutRef.current = setTimeout(() => {
                    setActiveTile(null);
                    i++;
                    showTimeoutRef.current = setTimeout(showNext, 300);
                }, 600);
            } else {
                setPhase('input');
                setInputIndex(0);
            }
        };

        // Brief pause before showing
        showTimeoutRef.current = setTimeout(showNext, 800);

        return () => {
            if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
        };
    }, [phase, pattern, isActive]);

    const handleTileTap = useCallback(
        (tileIdx: number) => {
            if (phase !== 'input' || !isActive) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            setActiveTile(tileIdx);
            tileFlashTimeoutRef.current = setTimeout(() => setActiveTile(null), 200);

            if (tileIdx === pattern[inputIndex]) {
                // Correct tap
                if (inputIndex === pattern.length - 1) {
                    // Completed the sequence!
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    const newScore = patternLength;
                    setScore(newScore);
                    setPhase('success');

                    // Next round — longer pattern
                    nextRoundTimeoutRef.current = setTimeout(() => {
                        const newLen = patternLength + 1;
                        setPatternLength(newLen);
                        setPattern(generatePattern(newLen));
                        setInputIndex(0);
                        setPhase('showing');
                    }, 1000);
                } else {
                    setInputIndex((prev) => prev + 1);
                }
            } else {
                // Wrong tile — game over
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                setPhase('fail');
                onGameOver(patternLength - 1);
            }
        },
        [phase, isActive, pattern, inputIndex, patternLength, onGameOver],
    );

    const tiles = useMemo(() => Array.from({ length: PATTERN_GRID_SIZE * PATTERN_GRID_SIZE }), []);

    return (
        <View style={styles.gameArea}>
            {/* Status */}
            <View style={styles.patternStatus}>
                <Text style={styles.patternStatusText}>
                    {phase === 'showing'
                        ? 'Watch carefully...'
                        : phase === 'input'
                          ? `Your turn! (${inputIndex}/${pattern.length})`
                          : phase === 'success'
                            ? 'Nice! Next round...'
                            : 'Game Over!'}
                </Text>
                <View style={styles.patternLevelBadge}>
                    <Ionicons name="layers" size={14} color={colors.azure[400]} />
                    <Text style={styles.patternLevelText}>Level {patternLength - PATTERN_INITIAL_LENGTH + 1}</Text>
                </View>
            </View>

            {/* 3x3 Grid */}
            <View style={styles.patternGrid}>
                {tiles.map((_, idx) => {
                    const isActive = activeTile === idx;
                    const isShowingPhase = phase === 'showing';

                    return (
                        <TouchableOpacity
                            key={idx}
                            onPress={() => handleTileTap(idx)}
                            disabled={phase !== 'input'}
                            activeOpacity={0.7}
                            style={[
                                styles.patternTile,
                                isActive && {
                                    backgroundColor: isShowingPhase
                                        ? colors.gold[400]
                                        : colors.azure[500],
                                    borderColor: isShowingPhase
                                        ? colors.gold[400] + '60'
                                        : colors.azure[500] + '60',
                                    shadowColor: isShowingPhase ? colors.gold[400] : colors.azure[500],
                                    shadowOpacity: 0.6,
                                    shadowRadius: 12,
                                    elevation: 6,
                                },
                                phase === 'fail' && {
                                    opacity: 0.4,
                                },
                            ]}
                        >
                            {isActive && (
                                <Animated.View
                                    entering={ZoomIn.duration(150)}
                                    style={styles.patternTileGlow}
                                />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Sequence progress dots */}
            {phase === 'input' && (
                <Animated.View entering={FadeIn.duration(300)} style={styles.patternDots}>
                    {pattern.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.patternDot,
                                {
                                    backgroundColor:
                                        i < inputIndex
                                            ? colors.emerald[500]
                                            : i === inputIndex
                                              ? colors.azure[400]
                                              : colors.obsidian[600],
                                },
                            ]}
                        />
                    ))}
                </Animated.View>
            )}
        </View>
    );
}

// ============================================
// Math Blitz Game
// ============================================

function MathBlitzGame({
    onScore,
    onWrong,
    isActive,
    questionsAnswered,
}: {
    onScore: (points: number) => void;
    onWrong: () => void;
    isActive: boolean;
    questionsAnswered: number;
}) {
    const [challenge, setChallenge] = useState<MathChallenge>(() => generateMathChallenge(0));
    const [flashColor, setFlashColor] = useState<string | null>(null);
    const shakeX = useSharedValue(0);
    const equationScale = useSharedValue(1);
    const flashTimerRef = useRef<ReturnType<typeof setTimeout>>();

    // Cleanup flash timer on unmount
    useEffect(() => {
        return () => {
            if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        };
    }, []);

    const nextChallenge = useCallback(() => {
        setChallenge(generateMathChallenge(questionsAnswered));
        equationScale.value = 0;
        equationScale.value = withSpring(1, { damping: 10, stiffness: 200 });
    }, [questionsAnswered, equationScale]);

    const handleAnswer = useCallback(
        (answer: number) => {
            if (!isActive) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            if (answer === challenge.correctAnswer) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setFlashColor(colors.emerald[500]);
                onScore(10);
                if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
                flashTimerRef.current = setTimeout(() => setFlashColor(null), 200);
                nextChallenge();
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                setFlashColor(colors.coral[500]);
                shakeX.value = withSequence(
                    withTiming(-8, { duration: 40 }),
                    withTiming(8, { duration: 40 }),
                    withTiming(-6, { duration: 40 }),
                    withTiming(6, { duration: 40 }),
                    withTiming(0, { duration: 40 }),
                );
                onWrong();
                if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
                flashTimerRef.current = setTimeout(() => setFlashColor(null), 200);
                nextChallenge();
            }
        },
        [isActive, challenge.correctAnswer, onScore, onWrong, nextChallenge, shakeX],
    );

    const shakeStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shakeX.value }],
    }));

    const eqAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: equationScale.value }],
    }));

    return (
        <Animated.View style={[styles.gameArea, shakeStyle]}>
            {flashColor && (
                <Animated.View
                    entering={FadeIn.duration(100)}
                    exiting={FadeOut.duration(200)}
                    style={[styles.flashOverlay, { backgroundColor: flashColor + '15' }]}
                />
            )}

            {/* Equation */}
            <Animated.View style={[styles.mathEquationContainer, eqAnimStyle]}>
                <Text style={styles.mathEquation}>{challenge.equation}</Text>
            </Animated.View>

            {/* Options grid (2x2) */}
            <View style={styles.mathOptionsGrid}>
                {challenge.options.map((opt, i) => (
                    <Animated.View
                        key={`${challenge.equation}-${i}`}
                        entering={FadeInDown.delay(i * 60).duration(250).springify()}
                    >
                        <TouchableOpacity
                            onPress={() => handleAnswer(opt)}
                            activeOpacity={0.7}
                            style={styles.mathOption}
                        >
                            <Text style={styles.mathOptionText}>{opt}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                ))}
            </View>
        </Animated.View>
    );
}

// ============================================
// Results Screen
// ============================================

function ResultsView({
    mode,
    score,
    highScore,
    isNewHigh,
    onPlayAgain,
    onChangeMode,
    onBack,
}: {
    mode: GameMode;
    score: number;
    highScore: number;
    isNewHigh: boolean;
    onPlayAgain: () => void;
    onChangeMode: () => void;
    onBack: () => void;
}) {
    const insets = useSafeAreaInsets();
    const config = MODE_CONFIG[mode];

    const handleShare = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await Share.share({
                message: `Speed Match — ${config.title}\nScore: ${score}${isNewHigh ? ' 🏆 NEW HIGH SCORE!' : ''}\nCan you beat me? #SpeedMatch #0GArena`,
            });
        } catch {
            // User cancelled
        }
    }, [config.title, score, isNewHigh]);

    return (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.resultsContainer, { paddingBottom: insets.bottom + spacing.xl }]}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.resultsHeader}>
                <View style={[styles.resultsTrophyBg, { backgroundColor: config.accentColor + '15', borderColor: config.accentColor + '25' }]}>
                    <Text style={{ fontSize: 40 }}>{config.icon}</Text>
                </View>
                <Text style={[styles.resultsTitleText, { color: config.accentColor }]}>
                    {isNewHigh ? 'New High Score!' : 'Game Over'}
                </Text>
                <Text style={styles.resultsSubtitle}>{config.title}</Text>
            </Animated.View>

            {/* Score Card */}
            <Animated.View entering={FadeInDown.delay(250).duration(500)}>
                <GlassCard gold={isNewHigh} style={styles.resultsScoreCard} padding="lg">
                    <Text style={styles.resultsScoreLabel}>
                        {mode === 'pattern' ? 'Longest Sequence' : 'Final Score'}
                    </Text>
                    <Text style={[styles.resultsScoreValue, { color: config.accentColor }]}>
                        {score}
                    </Text>

                    <View style={styles.resultsDivider} />

                    <View style={styles.resultsStatsRow}>
                        <View style={styles.resultsStat}>
                            <View style={[styles.resultsStatIcon, { backgroundColor: colors.gold[500] + '15' }]}>
                                <Ionicons name="trophy" size={18} color={colors.gold[500]} />
                            </View>
                            <Text style={styles.resultsStatValue}>{highScore}</Text>
                            <Text style={styles.resultsStatLabel}>Best</Text>
                        </View>
                        <View style={styles.resultsStat}>
                            <View style={[styles.resultsStatIcon, { backgroundColor: colors.azure[500] + '15' }]}>
                                <Ionicons name="podium" size={18} color={colors.azure[500]} />
                            </View>
                            <Text style={styles.resultsStatValue}>
                                {score >= highScore ? '🏆' : `#${Math.min(score > 0 ? Math.max(1, Math.ceil(100 / Math.max(1, score))) : 99, 99)}`}
                            </Text>
                            <Text style={styles.resultsStatLabel}>Rank</Text>
                        </View>
                    </View>
                </GlassCard>
            </Animated.View>

            {/* Actions */}
            <Animated.View entering={FadeInDown.delay(450).duration(400)} style={styles.resultsActions}>
                <TouchableOpacity onPress={onPlayAgain} activeOpacity={0.8}>
                    <LinearGradient
                        colors={config.accentGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.actionButton}
                    >
                        <Ionicons name="reload" size={20} color={colors.text.primary} />
                        <Text style={styles.actionButtonText}>Play Again</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleShare} activeOpacity={0.8} style={styles.secondaryActionButton}>
                    <Ionicons name="share-outline" size={20} color={config.accentColor} />
                    <Text style={[styles.secondaryActionText, { color: config.accentColor }]}>Share Score</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={onChangeMode} activeOpacity={0.8} style={styles.secondaryActionButton}>
                    <Ionicons name="grid-outline" size={20} color={colors.text.secondary} />
                    <Text style={styles.secondaryActionText}>Change Mode</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.secondaryActionButton}>
                    <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
                    <Text style={styles.secondaryActionText}>Back to Arena</Text>
                </TouchableOpacity>
            </Animated.View>
        </ScrollView>
    );
}

// ============================================
// Main Speed Match Screen
// ============================================

export default function SpeedMatchScreen() {
    const { colors: c } = useTheme();
    const router = useRouter();
    const params = useLocalSearchParams<{ mode?: 'color' | 'pattern' | 'math'; code?: string }>();
    const insets = useSafeAreaInsets();

    // Phase & mode
    const [phase, setPhase] = useState<Phase>(params.mode ? 'playing' : 'menu');
    const [gameMode, setGameMode] = useState<GameMode>(params.mode || 'color');
    const isMultiplayer = !!params.code;

    // High scores
    const [highScores, setHighScores] = useState<Record<GameMode, number>>({
        color: 0,
        pattern: 0,
        math: 0,
    });

    // Game state
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
    const [isActive, setIsActive] = useState(false);
    const [questionsAnswered, setQuestionsAnswered] = useState(0);
    const [lastPoints, setLastPoints] = useState(0);
    const [showPopup, setShowPopup] = useState(false);
    const [patternScore, setPatternScore] = useState(0);
    const [isNewHigh, setIsNewHigh] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Refs to avoid stale closures in timer callbacks
    const scoreRef = useRef(score);
    const questionsRef = useRef(questionsAnswered);
    const endGameRef = useRef<(finalScore: number) => void>();
    useEffect(() => { scoreRef.current = score; }, [score]);
    useEffect(() => { questionsRef.current = questionsAnswered; }, [questionsAnswered]);

    // Load high scores
    useEffect(() => {
        async function loadScores() {
            try {
                const [c, p, m] = await Promise.all([
                    AsyncStorage.getItem(getStorageKey('color')),
                    AsyncStorage.getItem(getStorageKey('pattern')),
                    AsyncStorage.getItem(getStorageKey('math')),
                ]);
                setHighScores({
                    color: c ? parseInt(c, 10) : 0,
                    pattern: p ? parseInt(p, 10) : 0,
                    math: m ? parseInt(m, 10) : 0,
                });
            } catch {
                // ignore
            }
        }
        loadScores();
    }, []);

    // Cleanup all timers on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
        };
    }, []);

    // Countdown state for game start
    const [countdown, setCountdown] = useState<number | null>(null);

    // Timer for Color Rush and Math Blitz — with 3-2-1 countdown
    useEffect(() => {
        if (phase !== 'playing' || gameMode === 'pattern') return;

        // Start 3-2-1 countdown
        setCountdown(3);
        let count = 3;
        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                setCountdown(count);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } else {
                setCountdown(null);
                setIsActive(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                clearInterval(countdownInterval);
            }
        }, 800);

        return () => clearInterval(countdownInterval);
    }, [phase, gameMode]);

    useEffect(() => {
        if (!isActive || gameMode === 'pattern') return;

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                    setIsActive(false);
                    // Use refs to avoid stale closure — scoreRef always has the latest score
                    endGameRef.current?.(scoreRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [isActive, gameMode]);

    // Pattern Memory starts immediately
    useEffect(() => {
        if (phase === 'playing' && gameMode === 'pattern') {
            setIsActive(true);
        }
    }, [phase, gameMode]);

    // ---- End Game ----
    const endGame = useCallback(
        async (finalScore: number) => {
            setIsActive(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            const currentHigh = highScores[gameMode];
            const newHigh = finalScore > currentHigh;

            if (newHigh) {
                setIsNewHigh(true);
                try {
                    await AsyncStorage.setItem(getStorageKey(gameMode), String(finalScore));
                    setHighScores((prev) => ({ ...prev, [gameMode]: finalScore }));
                } catch {
                    // ignore
                }
            } else {
                setIsNewHigh(false);
            }

            // Multiplayer: send final score
            if (isMultiplayer && params.code) {
                socketManager.sendGameAction(params.code, 'score_update', {
                    type: 'score_update',
                    score: finalScore,
                    correct: questionsRef.current,
                });
            }

            setPhase('results');
        },
        [highScores, gameMode, isMultiplayer, params.code],
    );

    // Keep endGame ref current so timer callback always calls the latest version
    useEffect(() => { endGameRef.current = endGame; }, [endGame]);

    // ---- Score handlers ----
    const handleScore = useCallback(
        (points: number) => {
            const newScore = score + points;
            setScore(newScore);
            setQuestionsAnswered((q) => q + 1);
            setLastPoints(points);
            setShowPopup(true);

            if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
            popupTimerRef.current = setTimeout(() => setShowPopup(false), 1200);

            // Multiplayer: send score update
            if (isMultiplayer && params.code) {
                socketManager.sendGameAction(params.code, 'score_update', {
                    type: 'score_update',
                    score: newScore,
                    correct: true,
                });
            }
        },
        [score, isMultiplayer, params.code],
    );

    const handleWrong = useCallback(() => {
        const penalty = -5;
        const newScore = Math.max(0, score + penalty);
        setScore(newScore);
        setLastPoints(penalty);
        setShowPopup(true);

        if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
        popupTimerRef.current = setTimeout(() => setShowPopup(false), 1200);

        if (isMultiplayer && params.code) {
            socketManager.sendGameAction(params.code, 'score_update', {
                type: 'score_update',
                score: newScore,
                correct: false,
            });
        }
    }, [score, isMultiplayer, params.code]);

    const handlePatternGameOver = useCallback(
        (finalScore: number) => {
            setPatternScore(finalScore);
            setScore(finalScore);
            endGame(finalScore);
        },
        [endGame],
    );

    // ---- Navigation ----
    const handleBack = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    }, [router]);

    const handlePlayMode = useCallback(
        (mode: GameMode) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setGameMode(mode);
            setScore(0);
            setTimeLeft(ROUND_DURATION);
            setQuestionsAnswered(0);
            setIsActive(false);
            setPatternScore(0);
            setIsNewHigh(false);
            setPhase('playing');
        },
        [],
    );

    const handlePlayAgain = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setScore(0);
        setTimeLeft(ROUND_DURATION);
        setQuestionsAnswered(0);
        setIsActive(false);
        setPatternScore(0);
        setIsNewHigh(false);
        setPhase('playing');
    }, []);

    const handleChangeMode = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPhase('menu');
    }, []);

    const config = MODE_CONFIG[gameMode];

    // ============================================
    // Render: Mode Selection Menu
    // ============================================

    if (phase === 'menu') {
        return (
            <ErrorBoundary>
            <LinearGradient colors={[c.obsidian[900], c.obsidian[800]]} style={styles.gradient}>
                <ScreenHeader title="Speed Match" showBack noBorder />
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={[styles.menuContainer, { paddingBottom: insets.bottom + spacing.xl }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.menuHeader}>
                        <Text style={{ fontSize: 48 }}>⚡</Text>
                        <Text style={styles.menuTitle}>Speed Match</Text>
                        <Text style={styles.menuSubtitle}>Test your reflexes and memory</Text>
                    </Animated.View>

                    {/* Mode Cards */}
                    <View style={styles.modesList}>
                        {(['color', 'pattern', 'math'] as GameMode[]).map((mode, i) => (
                            <ModeCard
                                key={mode}
                                mode={mode}
                                highScore={highScores[mode]}
                                onPlay={handlePlayMode}
                                index={i}
                            />
                        ))}
                    </View>
                </ScrollView>
            </LinearGradient>
            </ErrorBoundary>
        );
    }

    // ============================================
    // Render: Results
    // ============================================

    if (phase === 'results') {
        return (
            <ErrorBoundary>
            <LinearGradient colors={[c.obsidian[900], c.obsidian[800]]} style={styles.gradient}>
                <ScreenHeader title={config.title} showBack noBorder />
                <ResultsView
                    mode={gameMode}
                    score={gameMode === 'pattern' ? patternScore : score}
                    highScore={highScores[gameMode]}
                    isNewHigh={isNewHigh}
                    onPlayAgain={handlePlayAgain}
                    onChangeMode={handleChangeMode}
                    onBack={handleBack}
                />
            </LinearGradient>
            </ErrorBoundary>
        );
    }

    // ============================================
    // Render: Playing
    // ============================================

    return (
        <ErrorBoundary>
        <LinearGradient
            colors={[c.obsidian[900], c.obsidian[800], c.obsidian[900]]}
            style={styles.gradient}
        >
            {/* Top Bar */}
            <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
                <TouchableOpacity onPress={handleBack} style={styles.leaveButton}>
                    <Ionicons name="close" size={24} color={colors.text.secondary} />
                </TouchableOpacity>

                <View style={styles.topBarCenter}>
                    <Text style={styles.topBarModeIcon}>{config.icon}</Text>
                    <Text style={[styles.topBarModeTitle, { color: config.accentColor }]}>
                        {config.title}
                    </Text>
                </View>

                <AnimatedScore score={score} accentColor={config.accentColor} />
            </View>

            {/* Timer Bar (not for pattern) */}
            {gameMode !== 'pattern' && (
                <CountdownBar timeLeft={timeLeft} total={ROUND_DURATION} accentColor={config.accentColor} />
            )}

            {/* Start Countdown Overlay */}
            {countdown !== null && (
                <Animated.View
                    entering={FadeIn.duration(150)}
                    exiting={FadeOut.duration(150)}
                    style={styles.startCountdownOverlay}
                >
                    <Animated.Text
                        key={countdown}
                        entering={ZoomIn.duration(300).springify()}
                        style={[styles.startCountdownText, { color: config.accentColor }]}
                    >
                        {countdown}
                    </Animated.Text>
                    <Text style={styles.startCountdownLabel}>Get Ready!</Text>
                </Animated.View>
            )}

            {/* Score Popup */}
            <ScorePopup points={lastPoints} visible={showPopup} />

            {/* Game Content */}
            {gameMode === 'color' && (
                <ColorRushGame onScore={handleScore} onWrong={handleWrong} isActive={isActive} />
            )}
            {gameMode === 'pattern' && (
                <PatternMemoryGame onGameOver={handlePatternGameOver} isActive={isActive} />
            )}
            {gameMode === 'math' && (
                <MathBlitzGame
                    onScore={handleScore}
                    onWrong={handleWrong}
                    isActive={isActive}
                    questionsAnswered={questionsAnswered}
                />
            )}

            {/* Multiplayer opponent score */}
            {isMultiplayer && (
                <Animated.View entering={FadeIn.duration(300)} style={styles.opponentBar}>
                    <Ionicons name="person" size={14} color={colors.text.muted} />
                    <Text style={styles.opponentText}>Opponent</Text>
                    <Text style={styles.opponentScore}>—</Text>
                </Animated.View>
            )}
        </LinearGradient>
        </ErrorBoundary>
    );
}

// ============================================
// Styles
// ============================================

const TILE_SIZE = (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 2) / PATTERN_GRID_SIZE;

const styles = StyleSheet.create({
    gradient: { flex: 1 },

    // ---- Menu ----
    menuContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    menuHeader: { alignItems: 'center', marginBottom: spacing.xl },
    menuTitle: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        marginTop: spacing.md,
    },
    menuSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
        marginTop: spacing.xs,
    },
    modesList: { gap: spacing.md },

    // ---- Mode Card ----
    modeCard: { overflow: 'hidden' },
    modeCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    modeIconBg: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeIcon: { fontSize: 28 },
    modeInfo: { flex: 1 },
    modeTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
    },
    modeDescription: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        marginTop: 2,
    },
    highScoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.xs,
    },
    highScoreText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.gold[500],
    },
    modePlayButton: {},
    playButtonGradient: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ---- Top Bar ----
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
    },
    leaveButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface.glass,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    topBarCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    topBarModeIcon: { fontSize: 20 },
    topBarModeTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.surface.glass,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: spacing.xs + 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    scoreText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },

    // ---- Timer Bar ----
    timerBarContainer: {
        height: 28,
        marginHorizontal: spacing.lg,
        marginTop: spacing.xs,
        marginBottom: spacing.sm,
        backgroundColor: colors.obsidian[700],
        borderRadius: 14,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    timerBarFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        borderRadius: 14,
        opacity: 0.8,
    },
    timerBarText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        textAlign: 'center',
    },

    // ---- Score Popup ----
    scorePopup: {
        position: 'absolute',
        top: '40%',
        alignSelf: 'center',
        zIndex: 100,
    },
    scorePopupBg: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 20,
    },
    scorePopupText: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
    },

    // ---- Start Countdown ----
    startCountdownOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.surface.overlayHeavy,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    startCountdownText: {
        fontSize: 96,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },
    startCountdownLabel: {
        fontSize: typography.fontSize.lg,
        fontWeight: '600',
        color: colors.text.secondary,
        marginTop: spacing.md,
    },

    // ---- Game Area ----
    gameArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    flashOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 20,
    },

    // ---- Color Rush ----
    colorTargetContainer: {
        alignItems: 'center',
        marginBottom: spacing['3xl'],
    },
    colorTargetWord: {
        fontSize: 56,
        fontWeight: '900',
        fontFamily: 'Inter-Bold',
        letterSpacing: 4,
    },
    colorHint: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginTop: spacing.sm,
    },
    colorCirclesRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.lg,
    },
    colorCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.obsidian[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    colorCircleLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.text.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // ---- Pattern Memory ----
    patternStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.xs,
    },
    patternStatusText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.secondary,
    },
    patternLevelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.azure[500] + '15',
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: spacing.xs + 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.azure[500] + '25',
    },
    patternLevelText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.azure[400],
    },
    patternGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: TILE_SIZE * PATTERN_GRID_SIZE + spacing.sm * (PATTERN_GRID_SIZE - 1),
        gap: spacing.sm,
    },
    patternTile: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        borderRadius: 16,
        backgroundColor: colors.obsidian[600],
        borderWidth: 1.5,
        borderColor: colors.border.subtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    patternTileGlow: {
        width: '60%',
        height: '60%',
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    patternDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.xs,
        marginTop: spacing.xl,
    },
    patternDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },

    // ---- Math Blitz ----
    mathEquationContainer: {
        alignItems: 'center',
        marginBottom: spacing['3xl'],
    },
    mathEquation: {
        fontSize: 48,
        fontWeight: '900',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        letterSpacing: 2,
    },
    mathOptionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.md,
        width: '100%',
    },
    mathOption: {
        width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.md) / 2,
        height: 64,
        borderRadius: 16,
        backgroundColor: colors.surface.glass,
        borderWidth: 1.5,
        borderColor: colors.border.subtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mathOptionText: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
    },

    // ---- Opponent Bar (Multiplayer) ----
    opponentBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.surface.glass,
        borderTopWidth: 1,
        borderTopColor: colors.border.subtle,
    },
    opponentText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
    },
    opponentScore: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.secondary,
    },

    // ---- Results ----
    resultsContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
    resultsHeader: { alignItems: 'center', marginBottom: spacing.xl },
    resultsTrophyBg: {
        width: 88,
        height: 88,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        marginBottom: spacing.md,
    },
    resultsTitleText: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },
    resultsSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        marginTop: spacing.xs,
    },
    resultsScoreCard: { alignItems: 'center', marginBottom: spacing.lg },
    resultsScoreLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    resultsScoreValue: {
        fontSize: 64,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        marginVertical: spacing.sm,
    },
    resultsDivider: {
        width: '60%',
        height: 1,
        backgroundColor: colors.border.subtle,
        marginVertical: spacing.lg,
    },
    resultsStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    resultsStat: { alignItems: 'center', gap: 6 },
    resultsStatIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resultsStatValue: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
    },
    resultsStatLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
    resultsActions: { gap: spacing.md, marginTop: spacing.md },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md + 2,
        borderRadius: 14,
    },
    actionButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
    },
    secondaryActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        borderRadius: 14,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    secondaryActionText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.secondary,
    },
});
