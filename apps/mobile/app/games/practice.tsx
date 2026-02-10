// ============================================
// Solo Practice — Unlimited trivia with topic selection
// Play as many rounds as you want, choose your topics
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
    FlatList,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeIn,
    FadeOut,
    useSharedValue,
    useAnimatedStyle,
    useAnimatedProps,
    withTiming,
    withSpring,
    withSequence,
    withDelay,
    withRepeat,
    Easing,
    interpolate,
    runOnJS,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '@zerog/ui';
import { ScreenHeader, GlassCard, Button } from '../../components';
import {
    getQuestions,
    CATEGORY_INFO,
    ALL_CATEGORIES,
    type TriviaQuestion,
    type TriviaCategory,
    getTotalQuestionCount,
} from '../../lib/triviaEngine';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TIMER_DURATION = 15;
const TIMER_SIZE = 58;
const TIMER_STROKE_WIDTH = 4;
const TIMER_RADIUS = (TIMER_SIZE - TIMER_STROKE_WIDTH) / 2;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;
const QUESTIONS_PER_ROUND = 10;
const MAX_SCORE_PER_QUESTION = 100;
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// ============================================
// Topic Selector Screen
// ============================================

function TopicSelector({
    onStart,
}: {
    onStart: (categories: TriviaCategory[], difficulty: ('easy' | 'medium' | 'hard')[]) => void;
}) {
    const insets = useSafeAreaInsets();
    const [selectedCategories, setSelectedCategories] = useState<Set<TriviaCategory>>(new Set());
    const [selectedDifficulty, setSelectedDifficulty] = useState<('easy' | 'medium' | 'hard')[]>(['easy', 'medium', 'hard']);
    const totalQuestions = getTotalQuestionCount();

    const toggleCategory = useCallback((cat: TriviaCategory) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedCategories(prev => {
            const next = new Set(prev);
            if (next.has(cat)) {
                next.delete(cat);
            } else {
                next.add(cat);
            }
            return next;
        });
    }, []);

    const toggleDifficulty = useCallback((d: 'easy' | 'medium' | 'hard') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedDifficulty(prev => {
            if (prev.includes(d)) {
                if (prev.length <= 1) return prev; // Must keep at least one
                return prev.filter(x => x !== d);
            }
            return [...prev, d];
        });
    }, []);

    const handleStart = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const cats = selectedCategories.size > 0 ? Array.from(selectedCategories) : undefined;
        onStart(cats as TriviaCategory[], selectedDifficulty);
    }, [selectedCategories, selectedDifficulty, onStart]);

    const DIFFICULTY_OPTIONS = [
        { key: 'easy' as const, label: 'Easy', color: colors.emerald[500], icon: 'leaf-outline' as const },
        { key: 'medium' as const, label: 'Medium', color: colors.amber[500], icon: 'flame-outline' as const },
        { key: 'hard' as const, label: 'Hard', color: colors.coral[500], icon: 'skull-outline' as const },
    ];

    const getCategoryColor = (colorKey: string) => {
        const colorMap: Record<string, string> = {
            gold: colors.gold[500],
            azure: colors.azure[500],
            emerald: colors.emerald[500],
            coral: colors.coral[500],
        };
        return colorMap[colorKey] || colors.gold[500];
    };

    return (
        <ScrollView
            style={styles.topicScrollView}
            contentContainerStyle={[styles.topicContainer, { paddingBottom: insets.bottom + spacing.xl }]}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.topicHeader}>
                <LinearGradient
                    colors={[colors.gold[500], colors.gold[400]]}
                    style={styles.topicIconBg}
                >
                    <Ionicons name="school" size={24} color={colors.obsidian[900]} />
                </LinearGradient>
                <Text style={styles.topicTitle}>Solo Practice</Text>
                <Text style={styles.topicSubtitle}>
                    {totalQuestions} questions available
                </Text>
            </Animated.View>

            {/* Difficulty Selection */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                <Text style={styles.topicSectionTitle}>Difficulty</Text>
                <View style={styles.difficultyRow}>
                    {DIFFICULTY_OPTIONS.map(d => (
                        <TouchableOpacity
                            key={d.key}
                            style={[
                                styles.difficultyChip,
                                selectedDifficulty.includes(d.key) && {
                                    borderColor: d.color + '60',
                                    backgroundColor: d.color + '15',
                                },
                            ]}
                            onPress={() => toggleDifficulty(d.key)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={d.icon}
                                size={16}
                                color={selectedDifficulty.includes(d.key) ? d.color : colors.text.muted}
                            />
                            <Text style={[
                                styles.difficultyChipText,
                                selectedDifficulty.includes(d.key) && { color: d.color },
                            ]}>
                                {d.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </Animated.View>

            {/* Category Selection */}
            <Animated.View entering={FadeInDown.delay(150).duration(400)}>
                <View style={styles.categorySectionHeader}>
                    <Text style={styles.topicSectionTitle}>Topics</Text>
                    <Text style={styles.topicSectionHint}>
                        {selectedCategories.size === 0 ? 'All topics' : `${selectedCategories.size} selected`}
                    </Text>
                </View>
                <View style={styles.categoryGrid}>
                    {ALL_CATEGORIES.map((cat, i) => {
                        const info = CATEGORY_INFO[cat];
                        const catColor = getCategoryColor(info.color);
                        const isSelected = selectedCategories.has(cat);

                        return (
                            <Animated.View
                                key={cat}
                                entering={FadeInDown.delay(180 + i * 40).duration(300)}
                            >
                                <TouchableOpacity
                                    style={[
                                        styles.categoryChip,
                                        isSelected && {
                                            borderColor: catColor + '60',
                                            backgroundColor: catColor + '12',
                                        },
                                    ]}
                                    onPress={() => toggleCategory(cat)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[
                                        styles.categoryChipIcon,
                                        { backgroundColor: catColor + (isSelected ? '25' : '10') },
                                    ]}>
                                        <Ionicons
                                            name={info.icon as any}
                                            size={18}
                                            color={isSelected ? catColor : colors.text.muted}
                                        />
                                    </View>
                                    <Text style={[
                                        styles.categoryChipText,
                                        isSelected && { color: catColor },
                                    ]}>
                                        {info.label}
                                    </Text>
                                    {isSelected && (
                                        <Ionicons name="checkmark-circle" size={18} color={catColor} />
                                    )}
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}
                </View>
            </Animated.View>

            {/* Start Button */}
            <Animated.View entering={FadeInDown.delay(600).duration(400)} style={styles.topicStartContainer}>
                <TouchableOpacity
                    onPress={handleStart}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Start practice round"
                >
                    <LinearGradient
                        colors={[colors.gold[500], colors.gold[400]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.startButton}
                    >
                        <Ionicons name="play" size={20} color={colors.obsidian[900]} />
                        <Text style={styles.startButtonText}>Start Practice</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </ScrollView>
    );
}

// ============================================
// Timer Ring
// ============================================

function TimerRing({ timeLeft }: { timeLeft: number }) {
    const progress = useSharedValue(1);
    const pulseScale = useSharedValue(1);

    useEffect(() => {
        progress.value = withTiming(timeLeft / TIMER_DURATION, {
            duration: 1000,
            easing: Easing.linear,
        });
        if (timeLeft <= 5 && timeLeft > 0) {
            pulseScale.value = withSequence(
                withSpring(1.08, { damping: 8, stiffness: 300 }),
                withSpring(1, { damping: 10, stiffness: 200 }),
            );
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [timeLeft, progress, pulseScale]);

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: TIMER_CIRCUMFERENCE * (1 - progress.value),
    }));

    const animatedContainerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    const isUrgent = timeLeft <= 5;
    const strokeColor = isUrgent ? colors.coral[500] : colors.gold[500];

    return (
        <Animated.View style={[styles.timerContainer, animatedContainerStyle]}>
            {isUrgent && <View style={styles.timerGlow} />}
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
                    stroke={strokeColor}
                    strokeWidth={TIMER_STROKE_WIDTH}
                    fill="transparent"
                    strokeDasharray={TIMER_CIRCUMFERENCE}
                    animatedProps={animatedProps}
                    strokeLinecap="round"
                    rotation="-90"
                    origin={`${TIMER_SIZE / 2}, ${TIMER_SIZE / 2}`}
                />
            </Svg>
            <Text style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>{timeLeft}</Text>
        </Animated.View>
    );
}

// ============================================
// Option Button
// ============================================

function OptionButton({
    text, index, selected, correctIndex, hasAnswered, showResult, onPress,
}: {
    text: string; index: number; selected: boolean; correctIndex: number | null;
    hasAnswered: boolean; showResult: boolean; onPress: (i: number) => void;
}) {
    const scale = useSharedValue(1);
    const shake = useSharedValue(0);
    const isCorrect = showResult && correctIndex === index;
    const isWrong = showResult && selected && correctIndex !== index;

    useEffect(() => {
        if (isWrong) {
            shake.value = withSequence(
                withTiming(-6, { duration: 50 }), withTiming(6, { duration: 50 }),
                withTiming(-4, { duration: 50 }), withTiming(4, { duration: 50 }),
                withTiming(0, { duration: 50 }),
            );
        }
        if (isCorrect) {
            scale.value = withSequence(
                withSpring(1.03, { damping: 8 }), withSpring(1, { damping: 12 }),
            );
        }
    }, [isCorrect, isWrong, scale, shake]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }, { translateX: shake.value }],
    }));

    const getBorderColor = () => {
        if (isCorrect) return colors.emerald[500];
        if (isWrong) return colors.coral[500];
        if (selected) return colors.gold[500];
        return colors.border.subtle;
    };

    const getBackgroundColor = () => {
        if (isCorrect) return colors.emerald[500] + '15';
        if (isWrong) return colors.coral[500] + '12';
        if (selected) return colors.surface.goldSubtle;
        return colors.surface.glass;
    };

    return (
        <Animated.View
            entering={FadeInDown.delay(100 + index * 80).duration(300).springify()}
            style={animatedStyle}
        >
            <Pressable
                onPressIn={() => { if (!hasAnswered) scale.value = withSpring(0.96, { damping: 15, stiffness: 300 }); }}
                onPressOut={() => { if (!hasAnswered) scale.value = withSpring(1, { damping: 10, stiffness: 200 }); }}
                onPress={() => { if (!hasAnswered) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(index); } }}
                disabled={hasAnswered}
                style={[styles.optionButton, { borderColor: getBorderColor(), backgroundColor: getBackgroundColor() }]}
            >
                <View style={[styles.optionLabel, {
                    backgroundColor: isCorrect ? colors.emerald[500] : isWrong ? colors.coral[500] : colors.obsidian[600],
                }]}>
                    <Text style={[styles.optionLabelText, (isCorrect || isWrong) && { color: colors.obsidian[900] }]}>
                        {OPTION_LABELS[index]}
                    </Text>
                </View>
                <Text style={[
                    styles.optionText,
                    selected && !showResult && { color: colors.gold[400] },
                    isCorrect && { color: colors.emerald[400] },
                    isWrong && { color: colors.coral[400] },
                ]} numberOfLines={2}>
                    {text}
                </Text>
                {showResult && isCorrect && (
                    <Animated.View entering={FadeIn.duration(200)}>
                        <Ionicons name="checkmark-circle" size={22} color={colors.emerald[500]} />
                    </Animated.View>
                )}
                {showResult && isWrong && (
                    <Animated.View entering={FadeIn.duration(200)}>
                        <Ionicons name="close-circle" size={22} color={colors.coral[500]} />
                    </Animated.View>
                )}
            </Pressable>
        </Animated.View>
    );
}

// ============================================
// Practice Results
// ============================================

function PracticeResults({
    score, correctCount, totalQuestions: total, answers, onPlayAgain, onChangeTopic, onBack,
}: {
    score: number; correctCount: number; totalQuestions: number;
    answers: (boolean | null)[]; onPlayAgain: () => void;
    onChangeTopic: () => void; onBack: () => void;
}) {
    const insets = useSafeAreaInsets();
    const percentage = Math.round((correctCount / total) * 100);

    const getPerformance = () => {
        if (percentage >= 90) return { text: 'Incredible!', icon: 'star' as const, color: colors.gold[400] };
        if (percentage >= 70) return { text: 'Great Job!', icon: 'trophy' as const, color: colors.gold[500] };
        if (percentage >= 50) return { text: 'Good Try!', icon: 'thumbs-up' as const, color: colors.azure[400] };
        return { text: 'Keep Practicing!', icon: 'fitness' as const, color: colors.coral[400] };
    };
    const perf = getPerformance();

    return (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.resultsContainer, { paddingBottom: insets.bottom + spacing.xl }]}
            showsVerticalScrollIndicator={false}
        >
            <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.resultsHeader}>
                <View style={styles.resultsTrophyBg}>
                    <Ionicons name={perf.icon} size={40} color={perf.color} />
                </View>
                <Text style={[styles.resultsTitleText, { color: perf.color }]}>{perf.text}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(250).duration(500)}>
                <GlassCard gold style={styles.resultsScoreCard} padding="lg">
                    <Text style={styles.resultsScoreLabel}>Score</Text>
                    <Text style={styles.resultsScoreValue}>{score}</Text>
                    <Text style={styles.resultsScoreMax}>out of {total * MAX_SCORE_PER_QUESTION}</Text>
                    <View style={styles.resultsDivider} />
                    <View style={styles.resultsStatsRow}>
                        <View style={styles.resultsStat}>
                            <Ionicons name="checkmark-circle" size={18} color={colors.emerald[500]} />
                            <Text style={styles.resultsStatValue}>{correctCount}</Text>
                            <Text style={styles.resultsStatLabel}>Correct</Text>
                        </View>
                        <View style={styles.resultsStat}>
                            <Ionicons name="close-circle" size={18} color={colors.coral[500]} />
                            <Text style={styles.resultsStatValue}>{total - correctCount}</Text>
                            <Text style={styles.resultsStatLabel}>Wrong</Text>
                        </View>
                        <View style={styles.resultsStat}>
                            <Ionicons name="analytics" size={18} color={colors.azure[500]} />
                            <Text style={styles.resultsStatValue}>{percentage}%</Text>
                            <Text style={styles.resultsStatLabel}>Accuracy</Text>
                        </View>
                    </View>
                </GlassCard>
            </Animated.View>

            {/* Answer breakdown */}
            <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.answerBreakdown}>
                <View style={styles.answerBreakdownRow}>
                    {answers.map((a, i) => (
                        <View
                            key={i}
                            style={[styles.answerDot, {
                                backgroundColor: a === true ? colors.emerald[500] : a === false ? colors.coral[500] : colors.obsidian[600],
                            }]}
                        >
                            <Text style={styles.answerDotText}>{i + 1}</Text>
                        </View>
                    ))}
                </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(450).duration(400)} style={styles.resultsActions}>
                <TouchableOpacity onPress={onPlayAgain} activeOpacity={0.8}>
                    <LinearGradient
                        colors={[colors.gold[500], colors.gold[400]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.actionButton}
                    >
                        <Ionicons name="reload" size={20} color={colors.obsidian[900]} />
                        <Text style={styles.actionButtonText}>Play Again</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onChangeTopic}
                    activeOpacity={0.8}
                    style={styles.secondaryActionButton}
                >
                    <Ionicons name="options" size={20} color={colors.gold[500]} />
                    <Text style={styles.secondaryActionText}>Change Topics</Text>
                </TouchableOpacity>

                <Button
                    title="Back to Arena"
                    icon="arrow-back"
                    onPress={onBack}
                    variant="secondary"
                    fullWidth
                />
            </Animated.View>
        </ScrollView>
    );
}

// ============================================
// Main Practice Screen
// ============================================

export default function PracticeScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ category?: string }>();
    const insets = useSafeAreaInsets();

    // Game state
    const [phase, setPhase] = useState<'topic_select' | 'playing' | 'results'>(
        params.category ? 'playing' : 'topic_select'
    );
    const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [answers, setAnswers] = useState<(boolean | null)[]>(Array(QUESTIONS_PER_ROUND).fill(null));
    const [questionKey, setQuestionKey] = useState(0);
    const [selectedCategories, setSelectedCategories] = useState<TriviaCategory[] | undefined>(
        params.category ? [params.category as TriviaCategory] : undefined
    );
    const [selectedDifficulty, setSelectedDifficulty] = useState<('easy' | 'medium' | 'hard')[]>(['easy', 'medium', 'hard']);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const currentQuestion = questions[questionIndex];
    const categoryInfo = currentQuestion ? CATEGORY_INFO[currentQuestion.category] : null;

    // ---- Start game with topics ----
    const startGame = useCallback((categories?: TriviaCategory[], difficulty?: ('easy' | 'medium' | 'hard')[]) => {
        const qs = getQuestions({
            categories,
            difficulty,
            count: QUESTIONS_PER_ROUND,
        });
        setSelectedCategories(categories);
        setSelectedDifficulty(difficulty || ['easy', 'medium', 'hard']);
        setQuestions(qs);
        setQuestionIndex(0);
        setHasAnswered(false);
        setSelectedAnswer(null);
        setShowResult(false);
        setTimeLeft(TIMER_DURATION);
        setScore(0);
        setCorrectCount(0);
        setAnswers(Array(QUESTIONS_PER_ROUND).fill(null));
        setQuestionKey(0);
        setPhase('playing');
    }, []);

    // Auto-start if category passed as param
    useEffect(() => {
        if (params.category && questions.length === 0) {
            startGame([params.category as TriviaCategory]);
        }
    }, [params.category, questions.length, startGame]);

    // ---- Timer ----
    useEffect(() => {
        if (phase !== 'playing' || showResult || !currentQuestion) return;
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    if (!hasAnswered) {
                        setHasAnswered(true);
                        setShowResult(true);
                        setAnswers(prev2 => { const n = [...prev2]; n[questionIndex] = false; return n; });
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [phase, currentQuestion, showResult, hasAnswered, questionIndex]);

    // ---- Answer handler ----
    const handleAnswer = useCallback((index: number) => {
        if (hasAnswered || !currentQuestion) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setHasAnswered(true);
        setSelectedAnswer(index);
        if (timerRef.current) clearInterval(timerRef.current);

        const isCorrect = index === currentQuestion.correctIndex;
        const timeBonus = Math.round((timeLeft / TIMER_DURATION) * 50);
        const points = isCorrect ? 50 + timeBonus : 0;
        setScore(prev => prev + points);
        if (isCorrect) setCorrectCount(prev => prev + 1);

        setAnswers(prev => { const n = [...prev]; n[questionIndex] = isCorrect; return n; });
        Haptics.notificationAsync(isCorrect
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Error);
        setShowResult(true);
    }, [hasAnswered, currentQuestion, timeLeft, questionIndex]);

    // ---- Advance ----
    useEffect(() => {
        if (!showResult) return;
        const timer = setTimeout(() => {
            if (questionIndex < questions.length - 1) {
                setQuestionIndex(prev => prev + 1);
                setHasAnswered(false);
                setSelectedAnswer(null);
                setShowResult(false);
                setTimeLeft(TIMER_DURATION);
                setQuestionKey(k => k + 1);
            } else {
                setPhase('results');
            }
        }, 1500);
        return () => clearTimeout(timer);
    }, [showResult, questionIndex, questions.length]);

    // ---- Replay ----
    const handlePlayAgain = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        startGame(selectedCategories, selectedDifficulty);
    }, [startGame, selectedCategories, selectedDifficulty]);

    const handleChangeTopic = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPhase('topic_select');
    }, []);

    const handleBack = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    }, [router]);

    // ---- Render: Topic Selection ----
    if (phase === 'topic_select') {
        return (
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={styles.gradient}>
                <ScreenHeader title="Solo Practice" showBack noBorder />
                <TopicSelector onStart={startGame} />
            </LinearGradient>
        );
    }

    // ---- Render: Results ----
    if (phase === 'results') {
        return (
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={styles.gradient}>
                <ScreenHeader title="Results" showBack noBorder />
                <PracticeResults
                    score={score}
                    correctCount={correctCount}
                    totalQuestions={questions.length}
                    answers={answers}
                    onPlayAgain={handlePlayAgain}
                    onChangeTopic={handleChangeTopic}
                    onBack={handleBack}
                />
            </LinearGradient>
        );
    }

    // ---- Render: Playing ----
    const getCategoryColor = (colorKey: string) => {
        const colorMap: Record<string, string> = {
            gold: colors.gold[500], azure: colors.azure[500],
            emerald: colors.emerald[500], coral: colors.coral[500],
        };
        return colorMap[colorKey] || colors.gold[500];
    };

    return (
        <LinearGradient
            colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
            style={styles.gradient}
        >
            {/* Top Bar */}
            <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
                <TouchableOpacity onPress={handleBack} style={styles.leaveButton}>
                    <Ionicons name="close" size={24} color={colors.text.secondary} />
                </TouchableOpacity>

                <TimerRing timeLeft={timeLeft} />

                <View style={styles.scoreContainer}>
                    <Ionicons name="star" size={14} color={colors.gold[500]} />
                    <Text style={styles.scoreText}>{score}</Text>
                </View>
            </View>

            {/* Progress */}
            <View style={styles.progressDots}>
                {questions.map((_, i) => (
                    <View key={i} style={[
                        styles.progressDot,
                        {
                            backgroundColor: i === questionIndex ? colors.gold[500]
                                : answers[i] === true ? colors.emerald[500]
                                : answers[i] === false ? colors.coral[500]
                                : colors.obsidian[600],
                        },
                        i === questionIndex && styles.progressDotActive,
                    ]} />
                ))}
            </View>

            {/* Question Counter */}
            <View style={styles.roundBadgeContainer}>
                <View style={styles.roundBadge}>
                    <Text style={styles.roundText}>Q {questionIndex + 1}/{questions.length}</Text>
                </View>
            </View>

            {/* Question */}
            <Animated.View key={`q-${questionKey}`} entering={FadeIn.duration(400)} style={styles.questionArea}>
                {categoryInfo && (
                    <Animated.View entering={FadeInDown.delay(50).duration(300)} style={[
                        styles.categoryBadge,
                        {
                            backgroundColor: getCategoryColor(categoryInfo.color) + '15',
                            borderColor: getCategoryColor(categoryInfo.color) + '30',
                        },
                    ]}>
                        <Ionicons name={categoryInfo.icon as any} size={14} color={getCategoryColor(categoryInfo.color)} />
                        <Text style={[styles.categoryText, { color: getCategoryColor(categoryInfo.color) }]}>
                            {categoryInfo.label}
                        </Text>
                    </Animated.View>
                )}
                <Animated.Text entering={FadeInDown.delay(100).duration(400)} style={styles.questionText}>
                    {currentQuestion?.question}
                </Animated.Text>
            </Animated.View>

            {/* Options */}
            <View style={styles.optionsContainer}>
                {currentQuestion?.options?.map((option, index) => (
                    <OptionButton
                        key={`${questionKey}-opt-${index}`}
                        text={option}
                        index={index}
                        selected={selectedAnswer === index}
                        correctIndex={showResult ? currentQuestion.correctIndex : null}
                        hasAnswered={hasAnswered}
                        showResult={showResult}
                        onPress={handleAnswer}
                    />
                ))}
            </View>

            {/* Result Badge */}
            <View style={[styles.statusBar, { paddingBottom: insets.bottom + spacing.sm }]}>
                {showResult && (
                    <Animated.View entering={FadeInDown.duration(300)} style={styles.resultBadge}>
                        {selectedAnswer === currentQuestion?.correctIndex ? (
                            <LinearGradient colors={[colors.emerald[500] + '20', colors.emerald[500] + '08']} style={styles.resultBadgeBg}>
                                <Ionicons name="checkmark-circle" size={20} color={colors.emerald[500]} />
                                <Text style={[styles.resultText, { color: colors.emerald[400] }]}>Correct!</Text>
                            </LinearGradient>
                        ) : (
                            <LinearGradient colors={[colors.coral[500] + '20', colors.coral[500] + '08']} style={styles.resultBadgeBg}>
                                <Ionicons name="close-circle" size={20} color={colors.coral[500]} />
                                <Text style={[styles.resultText, { color: colors.coral[400] }]}>
                                    {selectedAnswer === null ? "Time's up!" : 'Wrong!'}
                                </Text>
                            </LinearGradient>
                        )}
                    </Animated.View>
                )}
            </View>
        </LinearGradient>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    gradient: { flex: 1 },

    // ---- Topic Selector ----
    topicScrollView: { flex: 1 },
    topicContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
    topicHeader: { alignItems: 'center', marginBottom: spacing.xl },
    topicIconBg: {
        width: 56, height: 56, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
    },
    topicTitle: {
        fontSize: typography.fontSize['2xl'], fontWeight: '700',
        fontFamily: 'Inter-Bold', color: colors.text.primary, marginBottom: spacing.xs,
    },
    topicSubtitle: { fontSize: typography.fontSize.sm, color: colors.text.muted },
    topicSectionTitle: {
        fontSize: typography.fontSize.lg, fontWeight: '700', fontFamily: 'Inter-Bold',
        color: colors.text.primary, marginBottom: spacing.md,
    },
    topicSectionHint: { fontSize: typography.fontSize.sm, color: colors.text.muted },
    categorySectionHeader: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: spacing.md, marginTop: spacing.lg,
    },

    // ---- Difficulty ----
    difficultyRow: { flexDirection: 'row', gap: spacing.sm },
    difficultyChip: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.xs, paddingVertical: spacing.md, borderRadius: 14,
        backgroundColor: colors.surface.glass, borderWidth: 1, borderColor: colors.border.subtle,
    },
    difficultyChipText: {
        fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.text.secondary,
    },

    // ---- Category Grid ----
    categoryGrid: { gap: spacing.sm },
    categoryChip: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        paddingVertical: spacing.md, paddingHorizontal: spacing.md,
        borderRadius: 14, backgroundColor: colors.surface.glass,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    categoryChipIcon: {
        width: 40, height: 40, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },
    categoryChipText: {
        flex: 1, fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.secondary,
    },

    // ---- Start Button ----
    topicStartContainer: { marginTop: spacing.xl },
    startButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.sm, paddingVertical: spacing.md + 2, borderRadius: 14,
    },
    startButtonText: {
        fontSize: typography.fontSize.lg, fontWeight: '700',
        fontFamily: 'Inter-Bold', color: colors.obsidian[900],
    },

    // ---- Playing ----
    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
    },
    leaveButton: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface.glass,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border.subtle,
    },
    timerContainer: {
        width: TIMER_SIZE, height: TIMER_SIZE, alignItems: 'center', justifyContent: 'center',
    },
    timerSvg: { position: 'absolute' },
    timerGlow: {
        position: 'absolute', width: TIMER_SIZE + 12, height: TIMER_SIZE + 12,
        borderRadius: (TIMER_SIZE + 12) / 2, backgroundColor: colors.coral[500] + '10',
    },
    timerText: {
        fontSize: typography.fontSize.xl, fontWeight: '700',
        color: colors.text.primary, fontFamily: 'Inter-Bold',
    },
    timerTextUrgent: { color: colors.coral[500] },
    scoreContainer: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
        backgroundColor: colors.surface.glass, paddingHorizontal: spacing.sm + 2,
        paddingVertical: spacing.xs + 2, borderRadius: 12, borderWidth: 1, borderColor: colors.border.subtle,
    },
    scoreText: {
        fontSize: typography.fontSize.lg, fontWeight: '700',
        color: colors.gold[500], fontFamily: 'Inter-Bold',
    },

    progressDots: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        gap: spacing.xs, paddingVertical: spacing.sm,
    },
    progressDot: { width: 8, height: 8, borderRadius: 4 },
    progressDotActive: {
        width: 10, height: 10, borderRadius: 5,
        shadowColor: colors.gold[500], shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5, shadowRadius: 4, elevation: 3,
    },

    roundBadgeContainer: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.sm, paddingBottom: spacing.xs,
    },
    roundBadge: {
        backgroundColor: colors.surface.glass, borderRadius: 12,
        paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    roundText: {
        fontSize: typography.fontSize.sm, fontWeight: '700',
        color: colors.text.primary, fontFamily: 'Inter-Bold',
    },

    questionArea: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: spacing.xl, paddingBottom: spacing.lg,
    },
    categoryBadge: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2,
        paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
        borderRadius: 20, borderWidth: 1, marginBottom: spacing.lg,
    },
    categoryText: {
        fontSize: typography.fontSize.xs, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 1,
    },
    questionText: {
        fontSize: 22, fontWeight: '700', color: colors.text.primary,
        textAlign: 'center', lineHeight: 32, fontFamily: 'Inter-Bold',
    },

    optionsContainer: {
        paddingHorizontal: spacing.lg, gap: spacing.sm + 2, paddingBottom: spacing.lg,
    },
    optionButton: {
        flexDirection: 'row', alignItems: 'center', height: 58,
        borderRadius: 14, paddingHorizontal: spacing.md, borderWidth: 1.5, gap: spacing.md,
    },
    optionLabel: {
        width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    },
    optionLabelText: {
        fontSize: typography.fontSize.sm, fontWeight: '700',
        color: colors.text.secondary, fontFamily: 'Inter-Bold',
    },
    optionText: {
        flex: 1, fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary,
    },

    statusBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: spacing.lg, paddingTop: spacing.sm, minHeight: 48,
    },
    resultBadge: { borderRadius: 16, overflow: 'hidden' },
    resultBadgeBg: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2, borderRadius: 16,
    },
    resultText: {
        fontSize: typography.fontSize.base, fontWeight: '700', fontFamily: 'Inter-Bold',
    },

    // ---- Results ----
    resultsContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
    resultsHeader: { alignItems: 'center', marginBottom: spacing.xl },
    resultsTrophyBg: {
        width: 80, height: 80, borderRadius: 24, backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1,
        borderColor: colors.gold[500] + '20', marginBottom: spacing.md,
    },
    resultsTitleText: {
        fontSize: typography.fontSize['2xl'], fontWeight: '700', fontFamily: 'Inter-Bold',
    },
    resultsScoreCard: { alignItems: 'center', marginBottom: spacing.lg },
    resultsScoreLabel: {
        fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.text.secondary,
        textTransform: 'uppercase', letterSpacing: 1,
    },
    resultsScoreValue: {
        fontSize: 56, fontWeight: '700', fontFamily: 'Inter-Bold',
        color: colors.gold[400], marginVertical: spacing.xs,
    },
    resultsScoreMax: { fontSize: typography.fontSize.base, color: colors.text.muted },
    resultsDivider: {
        width: '60%', height: 1, backgroundColor: colors.border.subtle, marginVertical: spacing.lg,
    },
    resultsStatsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
    resultsStat: { alignItems: 'center', gap: 6 },
    resultsStatValue: {
        fontSize: typography.fontSize.xl, fontWeight: '700',
        fontFamily: 'Inter-Bold', color: colors.text.primary,
    },
    resultsStatLabel: { fontSize: typography.fontSize.xs, color: colors.text.muted },

    answerBreakdown: { alignItems: 'center', marginBottom: spacing.lg },
    answerBreakdownRow: { flexDirection: 'row', gap: spacing.xs },
    answerDot: {
        width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    },
    answerDotText: {
        fontSize: typography.fontSize.xs, fontWeight: '700',
        fontFamily: 'Inter-Bold', color: colors.text.primary,
    },

    resultsActions: { gap: spacing.md },
    actionButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.sm, paddingVertical: spacing.md + 2, borderRadius: 14, marginBottom: spacing.sm,
    },
    actionButtonText: {
        fontSize: typography.fontSize.base, fontWeight: '700',
        fontFamily: 'Inter-Bold', color: colors.obsidian[900],
    },
    secondaryActionButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.sm, paddingVertical: spacing.md, borderRadius: 14,
        backgroundColor: colors.surface.glass, borderWidth: 1, borderColor: colors.border.subtle,
        marginBottom: spacing.sm,
    },
    secondaryActionText: {
        fontSize: typography.fontSize.base, fontWeight: '600', color: colors.gold[500],
    },
});
