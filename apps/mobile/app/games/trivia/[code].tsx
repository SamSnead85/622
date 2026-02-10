// ============================================
// Rapid Fire Trivia — Real-time trivia game screen
// Timed questions with animated feedback
// ============================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeIn,
    FadeOut,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withSequence,
    runOnJS,
    useAnimatedProps,
    Easing,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { colors, typography, spacing } from '@zerog/ui';
import { ScreenHeader, GlassCard, LoadingView } from '../../../components';
import { useGameStore } from '../../../stores';
import { socketManager } from '../../../lib/socket';

// ============================================
// Constants
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TIMER_DURATION = 15;
const TIMER_SIZE = 56;
const TIMER_STROKE_WIDTH = 4;
const TIMER_RADIUS = (TIMER_SIZE - TIMER_STROKE_WIDTH) / 2;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Category color mapping
const CATEGORY_COLORS: Record<string, string> = {
    science: colors.azure[500],
    history: colors.amber[500],
    geography: colors.emerald[500],
    entertainment: colors.coral[500],
    sports: colors.gold[500],
    art: colors.azure[400],
    technology: colors.azure[400],
    default: colors.gold[500],
};

// ============================================
// Timer Ring Component
// ============================================

function TimerRing({ timeLeft }: { timeLeft: number }) {
    const progress = useSharedValue(1);

    useEffect(() => {
        progress.value = withTiming(timeLeft / TIMER_DURATION, {
            duration: 900,
            easing: Easing.linear,
        });
    }, [timeLeft, progress]);

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: TIMER_CIRCUMFERENCE * (1 - progress.value),
    }));

    const isUrgent = timeLeft <= 5;

    return (
        <View style={styles.timerContainer} accessibilityRole="timer" accessibilityLabel={`${timeLeft} seconds remaining`}>
            <Svg width={TIMER_SIZE} height={TIMER_SIZE} style={styles.timerSvg}>
                {/* Background ring */}
                <Circle
                    cx={TIMER_SIZE / 2}
                    cy={TIMER_SIZE / 2}
                    r={TIMER_RADIUS}
                    stroke={colors.obsidian[600]}
                    strokeWidth={TIMER_STROKE_WIDTH}
                    fill="transparent"
                />
                {/* Progress ring */}
                <AnimatedCircle
                    cx={TIMER_SIZE / 2}
                    cy={TIMER_SIZE / 2}
                    r={TIMER_RADIUS}
                    stroke={isUrgent ? colors.coral[500] : colors.gold[500]}
                    strokeWidth={TIMER_STROKE_WIDTH}
                    fill="transparent"
                    strokeDasharray={TIMER_CIRCUMFERENCE}
                    animatedProps={animatedProps}
                    strokeLinecap="round"
                    rotation="-90"
                    origin={`${TIMER_SIZE / 2}, ${TIMER_SIZE / 2}`}
                />
            </Svg>
            <Text style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>
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
            entering={FadeInDown.duration(200).springify()}
            exiting={FadeOut.duration(400)}
            style={styles.scorePopup}
        >
            <Text style={styles.scorePopupText}>+{points}</Text>
        </Animated.View>
    );
}

// ============================================
// Option Button Component
// ============================================

interface OptionButtonProps {
    text: string;
    index: number;
    selected: boolean;
    correctIndex: number | null;
    hasAnswered: boolean;
    showResult: boolean;
    onPress: (index: number) => void;
    playerDots?: string[];
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function OptionButton({
    text,
    index,
    selected,
    correctIndex,
    hasAnswered,
    showResult,
    onPress,
    playerDots = [],
}: OptionButtonProps) {
    const scale = useSharedValue(1);

    const isCorrect = showResult && correctIndex === index;
    const isWrong = showResult && selected && correctIndex !== index;

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePress = useCallback(() => {
        if (hasAnswered) return;
        scale.value = withSequence(
            withSpring(0.95, { damping: 15 }),
            withSpring(1, { damping: 10 }),
        );
        onPress(index);
    }, [hasAnswered, index, onPress, scale]);

    const getBorderColor = () => {
        if (isCorrect) return colors.gold[500];
        if (isWrong) return colors.coral[500];
        if (selected) return colors.gold[500];
        return colors.border.subtle;
    };

    const getBackgroundColor = () => {
        if (isCorrect) return colors.surface.goldSubtle;
        if (isWrong) return colors.surface.coralSubtle;
        if (selected) return colors.surface.goldSubtle;
        return colors.surface.glass;
    };

    return (
        <Animated.View
            entering={FadeInDown.delay(100 + index * 80).duration(300)}
            style={animatedStyle}
        >
            <TouchableOpacity
                style={[
                    styles.optionButton,
                    {
                        borderColor: getBorderColor(),
                        backgroundColor: getBackgroundColor(),
                    },
                ]}
                onPress={handlePress}
                disabled={hasAnswered}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Option ${OPTION_LABELS[index]}: ${text}`}
                accessibilityState={{ selected, disabled: hasAnswered }}
            >
                <View style={[styles.optionLabel, isCorrect && styles.optionLabelCorrect, isWrong && styles.optionLabelWrong]}>
                    <Text style={[styles.optionLabelText, (isCorrect || isWrong) && styles.optionLabelTextActive]}>
                        {OPTION_LABELS[index]}
                    </Text>
                </View>

                <Text
                    style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                        isCorrect && styles.optionTextCorrect,
                        isWrong && styles.optionTextWrong,
                    ]}
                    numberOfLines={2}
                >
                    {text}
                </Text>

                {/* Result icon */}
                {showResult && isCorrect && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.gold[500]} />
                )}
                {showResult && isWrong && (
                    <Ionicons name="close-circle" size={22} color={colors.coral[500]} />
                )}

                {/* Player dots showing who picked this answer */}
                {hasAnswered && playerDots.length > 0 && (
                    <View style={styles.playerDots}>
                        {playerDots.slice(0, 4).map((avatarLetter, i) => (
                            <View key={i} style={styles.playerDot}>
                                <Text style={styles.playerDotText}>{avatarLetter}</Text>
                            </View>
                        ))}
                        {playerDots.length > 4 && (
                            <View style={[styles.playerDot, styles.playerDotMore]}>
                                <Text style={styles.playerDotText}>+{playerDots.length - 4}</Text>
                            </View>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

// ============================================
// Main Trivia Screen
// ============================================

export default function TriviaScreen() {
    const router = useRouter();
    const { code } = useLocalSearchParams<{ code: string }>();
    const insets = useSafeAreaInsets();
    const gameStore = useGameStore();

    // Local state
    const [hasAnswered, setHasAnswered] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
    const [scorePopup, setScorePopup] = useState<{ points: number; visible: boolean }>({ points: 0, visible: false });
    const [questionKey, setQuestionKey] = useState(0); // for re-triggering entrance animations

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const previousScore = useRef(0);

    // Derived data
    const { gameData, players, round, totalRounds } = gameStore;
    const currentQuestion = gameData?.currentQuestion;
    const questionIndex = gameData?.questionIndex ?? 0;
    const totalQuestions = gameData?.totalQuestions ?? totalRounds;
    const correctIndex = gameData?.correctAnswer ?? null;
    const answeredPlayers = gameData?.answeredPlayers ?? {};

    // Calculate current player's score
    const myPlayer = players.find((p) => p.id === gameStore.myPlayerId);
    const myScore = myPlayer?.score ?? 0;

    // ============================================
    // Timer Logic
    // ============================================

    useEffect(() => {
        if (showResult || !currentQuestion) return;

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    // Auto-submit no answer when timer runs out
                    if (!hasAnswered) {
                        setHasAnswered(true);
                        gameStore.sendAction('answer', { answer: -1 });
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [currentQuestion, showResult, hasAnswered, gameStore]);

    // ============================================
    // Score Popup Detection
    // ============================================

    useEffect(() => {
        if (myScore > previousScore.current && showResult) {
            const gained = myScore - previousScore.current;
            setScorePopup({ points: gained, visible: true });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            const timer = setTimeout(() => {
                setScorePopup({ points: 0, visible: false });
            }, 1500);

            return () => clearTimeout(timer);
        }
        previousScore.current = myScore;
    }, [myScore, showResult]);

    // ============================================
    // Socket Listeners
    // ============================================

    useEffect(() => {
        const unsubs = [
            socketManager.on('game:update', (data: any) => {
                gameStore.updateFromDelta(data);
            }),
            socketManager.on('game:round-start', (_data: any) => {
                // New question — reset state
                setHasAnswered(false);
                setSelectedAnswer(null);
                setShowResult(false);
                setTimeLeft(TIMER_DURATION);
                setQuestionKey((k) => k + 1);
            }),
            socketManager.on('game:round-end', (data: any) => {
                gameStore.setRoundEnd(data);
                setShowResult(true);
                if (timerRef.current) clearInterval(timerRef.current);
            }),
            socketManager.on('game:ended', (data: any) => {
                gameStore.setGameEnded(data);
                router.replace(`/games/results/${code}`);
            }),
            socketManager.on('game:error', (data: { message: string }) => {
                gameStore.setError(data.message);
            }),
        ];

        return () => unsubs.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code]);

    // ============================================
    // Answer Handler
    // ============================================

    const handleAnswer = useCallback(
        (index: number) => {
            if (hasAnswered) return;
            setHasAnswered(true);
            setSelectedAnswer(index);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            gameStore.sendAction('answer', { answer: index });
        },
        [hasAnswered, gameStore],
    );

    // ============================================
    // Leave Handler
    // ============================================

    const handleLeave = useCallback(() => {
        gameStore.leaveGame();
        router.replace('/games');
    }, [gameStore, router]);

    // ============================================
    // Build player dots per option
    // ============================================

    const getPlayerDotsForOption = useCallback(
        (optionIndex: number): string[] => {
            if (!answeredPlayers || typeof answeredPlayers !== 'object') return [];
            return Object.entries(answeredPlayers)
                .filter(([, answer]) => answer === optionIndex)
                .map(([playerId]) => {
                    const player = players.find((p) => p.id === playerId);
                    return player?.name?.charAt(0)?.toUpperCase() ?? '?';
                });
        },
        [answeredPlayers, players],
    );

    // ============================================
    // Loading State
    // ============================================

    if (!currentQuestion) {
        return (
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={styles.gradient}
            >
                <LoadingView message="Waiting for question..." />
            </LinearGradient>
        );
    }

    // ============================================
    // Category
    // ============================================

    const category = currentQuestion.category?.toLowerCase() ?? 'default';
    const categoryColor = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.default;

    return (
        <LinearGradient
            colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
            style={styles.gradient}
        >
            {/* Header Bar */}
            <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
                <TouchableOpacity
                    onPress={handleLeave}
                    style={styles.leaveButton}
                    accessibilityRole="button"
                    accessibilityLabel="Leave game"
                >
                    <Ionicons name="close" size={24} color={colors.text.secondary} />
                </TouchableOpacity>

                {/* Round Counter */}
                <Animated.View entering={FadeIn.duration(300)} style={styles.roundBadge}>
                    <Text style={styles.roundText}>
                        Q {questionIndex + 1}/{totalQuestions}
                    </Text>
                </Animated.View>

                {/* Timer */}
                <TimerRing timeLeft={timeLeft} />

                {/* Score */}
                <View style={styles.scoreContainer}>
                    <Ionicons name="star" size={14} color={colors.gold[500]} />
                    <Text style={styles.scoreText}>{myScore}</Text>
                    <ScorePopup points={scorePopup.points} visible={scorePopup.visible} />
                </View>
            </View>

            {/* Question Area */}
            <Animated.View
                key={`question-${questionKey}`}
                entering={FadeIn.duration(400)}
                style={styles.questionArea}
            >
                {/* Category Badge */}
                {currentQuestion.category && (
                    <Animated.View
                        entering={FadeInDown.delay(50).duration(300)}
                        style={[styles.categoryBadge, { backgroundColor: categoryColor + '20', borderColor: categoryColor + '40' }]}
                    >
                        <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
                        <Text style={[styles.categoryText, { color: categoryColor }]}>
                            {currentQuestion.category}
                        </Text>
                    </Animated.View>
                )}

                {/* Question Text */}
                <Animated.Text
                    entering={FadeInDown.delay(100).duration(400)}
                    style={styles.questionText}
                    accessibilityRole="text"
                >
                    {currentQuestion.text}
                </Animated.Text>
            </Animated.View>

            {/* Answer Options */}
            <View style={styles.optionsContainer}>
                {currentQuestion.options?.map((option: string, index: number) => (
                    <OptionButton
                        key={`${questionKey}-option-${index}`}
                        text={option}
                        index={index}
                        selected={selectedAnswer === index}
                        correctIndex={showResult ? correctIndex : null}
                        hasAnswered={hasAnswered}
                        showResult={showResult}
                        onPress={handleAnswer}
                        playerDots={hasAnswered ? getPlayerDotsForOption(index) : []}
                    />
                ))}
            </View>

            {/* Status Bar */}
            <View style={[styles.statusBar, { paddingBottom: insets.bottom + spacing.sm }]}>
                {hasAnswered && !showResult && (
                    <Animated.View entering={FadeIn.duration(300)} style={styles.waitingBadge}>
                        <Ionicons name="time-outline" size={16} color={colors.text.muted} />
                        <Text style={styles.waitingText}>Waiting for others...</Text>
                    </Animated.View>
                )}

                {showResult && (
                    <Animated.View entering={FadeInDown.duration(300)} style={styles.resultBadge}>
                        {selectedAnswer === correctIndex ? (
                            <>
                                <Ionicons name="checkmark-circle" size={18} color={colors.emerald[500]} />
                                <Text style={[styles.resultText, { color: colors.emerald[500] }]}>Correct!</Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="close-circle" size={18} color={colors.coral[500]} />
                                <Text style={[styles.resultText, { color: colors.coral[500] }]}>
                                    {selectedAnswer === null || selectedAnswer === -1 ? "Time's up!" : 'Wrong!'}
                                </Text>
                            </>
                        )}
                    </Animated.View>
                )}

                {/* Player count indicator */}
                <View style={styles.playersIndicator}>
                    <Ionicons name="people-outline" size={14} color={colors.text.muted} />
                    <Text style={styles.playersCount}>
                        {players.filter((p) => p.isConnected).length} playing
                    </Text>
                </View>
            </View>
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

    // Top Bar
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
    },
    leaveButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface.glass,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roundBadge: {
        backgroundColor: colors.surface.glass,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    roundText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    scoreText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.gold[500],
        fontFamily: 'Inter-Bold',
    },

    // Timer
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
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
    },
    timerTextUrgent: {
        color: colors.coral[500],
    },

    // Question Area
    questionArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 1,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: spacing.lg,
    },
    categoryDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    categoryText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: typography.letterSpacing.wide,
    },
    questionText: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text.primary,
        textAlign: 'center',
        lineHeight: 32,
        fontFamily: 'Inter-Bold',
    },

    // Options
    optionsContainer: {
        paddingHorizontal: spacing.lg,
        gap: spacing.sm + 2,
        paddingBottom: spacing.lg,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        borderRadius: 14,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        gap: spacing.md,
    },
    optionLabel: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: colors.obsidian[600],
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionLabelCorrect: {
        backgroundColor: colors.gold[500],
    },
    optionLabelWrong: {
        backgroundColor: colors.coral[500],
    },
    optionLabelText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.text.secondary,
        fontFamily: 'Inter-Bold',
    },
    optionLabelTextActive: {
        color: colors.obsidian[900],
    },
    optionText: {
        flex: 1,
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
    optionTextSelected: {
        color: colors.gold[400],
    },
    optionTextCorrect: {
        color: colors.gold[500],
    },
    optionTextWrong: {
        color: colors.coral[400],
    },

    // Player Dots
    playerDots: {
        flexDirection: 'row',
        gap: -4,
    },
    playerDot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.obsidian[500],
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: colors.obsidian[800],
    },
    playerDotMore: {
        backgroundColor: colors.obsidian[400],
    },
    playerDotText: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.text.secondary,
    },

    // Score Popup
    scorePopup: {
        position: 'absolute',
        top: -24,
        right: 0,
    },
    scorePopupText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.gold[400],
        fontFamily: 'Inter-Bold',
    },

    // Status Bar
    statusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
    },
    waitingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    waitingText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
    },
    resultBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    resultText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },
    playersIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    playersCount: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
});
