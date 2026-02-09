// ============================================
// Daily Challenge — Solo daily trivia mode
// 7 date-seeded questions, streak tracking, no Socket.io
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
    Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '@zerog/ui';
import { ScreenHeader, GlassCard, Button } from '../../components';

// ============================================
// Constants
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TIMER_DURATION = 20;
const TIMER_SIZE = 56;
const TIMER_STROKE_WIDTH = 4;
const TIMER_RADIUS = (TIMER_SIZE - TIMER_STROKE_WIDTH) / 2;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS;
const TOTAL_QUESTIONS = 7;
const MAX_SCORE_PER_QUESTION = 100;

const STORAGE_KEY_STREAK = 'daily_challenge_streak';
const STORAGE_KEY_LAST_DATE = 'daily_challenge_last_date';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ============================================
// Category Colors
// ============================================

const CATEGORY_COLORS: Record<string, string> = {
    geography: colors.emerald[500],
    art: '#A855F7',
    science: colors.azure[500],
    history: colors.amber[500],
    literature: '#A855F7',
    nature: colors.emerald[500],
    culture: colors.coral[500],
    default: colors.gold[500],
};

// ============================================
// Question Pool (20 questions)
// ============================================

const dailyQuestions = [
    { text: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Pacific', 'Indian', 'Arctic'], correct: 1, category: 'Geography' },
    { text: 'Who painted the Mona Lisa?', options: ['Michelangelo', 'Raphael', 'Leonardo da Vinci', 'Donatello'], correct: 2, category: 'Art' },
    { text: 'What is the chemical symbol for gold?', options: ['Go', 'Gd', 'Au', 'Ag'], correct: 2, category: 'Science' },
    { text: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correct: 1, category: 'Science' },
    { text: 'What year did the Berlin Wall fall?', options: ['1987', '1989', '1991', '1993'], correct: 1, category: 'History' },
    { text: 'What is the smallest country in the world?', options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'], correct: 1, category: 'Geography' },
    { text: 'Who wrote "Romeo and Juliet"?', options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'], correct: 1, category: 'Literature' },
    { text: 'What is the speed of light in km/s?', options: ['150,000', '300,000', '450,000', '600,000'], correct: 1, category: 'Science' },
    { text: 'Which element has the atomic number 1?', options: ['Helium', 'Hydrogen', 'Lithium', 'Carbon'], correct: 1, category: 'Science' },
    { text: 'What is the capital of Japan?', options: ['Osaka', 'Kyoto', 'Tokyo', 'Nagoya'], correct: 2, category: 'Geography' },
    { text: 'Who discovered penicillin?', options: ['Louis Pasteur', 'Alexander Fleming', 'Joseph Lister', 'Robert Koch'], correct: 1, category: 'Science' },
    { text: 'What is the largest mammal?', options: ['African Elephant', 'Blue Whale', 'Giraffe', 'Hippopotamus'], correct: 1, category: 'Nature' },
    { text: 'In what year did World War I begin?', options: ['1912', '1914', '1916', '1918'], correct: 1, category: 'History' },
    { text: 'What is the hardest natural substance?', options: ['Gold', 'Iron', 'Diamond', 'Titanium'], correct: 2, category: 'Science' },
    { text: 'Which country has the most pyramids?', options: ['Egypt', 'Mexico', 'Sudan', 'Peru'], correct: 2, category: 'Geography' },
    { text: 'What is the most spoken language in the world?', options: ['English', 'Spanish', 'Mandarin Chinese', 'Hindi'], correct: 2, category: 'Culture' },
    { text: 'How many bones are in the adult human body?', options: ['186', '196', '206', '216'], correct: 2, category: 'Science' },
    { text: 'Who was the first person to walk on the moon?', options: ['Buzz Aldrin', 'Neil Armstrong', 'Michael Collins', 'Yuri Gagarin'], correct: 1, category: 'History' },
    { text: 'What is the deepest ocean trench?', options: ['Tonga Trench', 'Mariana Trench', 'Java Trench', 'Puerto Rico Trench'], correct: 1, category: 'Geography' },
    { text: 'What is the longest river in Africa?', options: ['Congo', 'Niger', 'Nile', 'Zambezi'], correct: 2, category: 'Geography' },
];

// ============================================
// Date-seeded random selection
// ============================================

function getDailyQuestions(): typeof dailyQuestions {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const shuffled = [...dailyQuestions].sort((a, b) => {
        const hashA = (seed * 31 + dailyQuestions.indexOf(a)) % 1000;
        const hashB = (seed * 31 + dailyQuestions.indexOf(b)) % 1000;
        return hashA - hashB;
    });
    return shuffled.slice(0, TOTAL_QUESTIONS);
}

function getTodayDateString(): string {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

// ============================================
// Option Labels
// ============================================

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

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
// Progress Dots Component
// ============================================

function ProgressDots({ current, total, answers }: { current: number; total: number; answers: (boolean | null)[] }) {
    return (
        <View style={styles.progressDots}>
            {Array.from({ length: total }).map((_, i) => {
                const isActive = i === current;
                const isCompleted = i < current;
                const wasCorrect = answers[i];

                let dotColor = colors.obsidian[600]; // empty
                if (isActive) dotColor = colors.gold[500];
                else if (isCompleted && wasCorrect === true) dotColor = colors.gold[500];
                else if (isCompleted && wasCorrect === false) dotColor = colors.coral[500];

                return (
                    <View
                        key={i}
                        style={[
                            styles.progressDot,
                            { backgroundColor: dotColor },
                            isActive && styles.progressDotActive,
                        ]}
                    />
                );
            })}
        </View>
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
}

function OptionButton({
    text,
    index,
    selected,
    correctIndex,
    hasAnswered,
    showResult,
    onPress,
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

                {showResult && isCorrect && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.gold[500]} />
                )}
                {showResult && isWrong && (
                    <Ionicons name="close-circle" size={22} color={colors.coral[500]} />
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

// ============================================
// Results Screen Component
// ============================================

interface ResultsViewProps {
    score: number;
    correctCount: number;
    streak: number;
    onShare: () => void;
    onBack: () => void;
}

function ResultsView({ score, correctCount, streak, onShare, onBack }: ResultsViewProps) {
    const insets = useSafeAreaInsets();
    const isHighStreak = streak >= 7;

    return (
        <ScrollView
            style={styles.resultsScroll}
            contentContainerStyle={[styles.resultsContainer, { paddingBottom: insets.bottom + spacing.xl }]}
            showsVerticalScrollIndicator={false}
        >
            {/* Trophy / completion header */}
            <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.resultsHeader}>
                <Ionicons name="trophy" size={48} color={colors.gold[500]} />
                <Text style={styles.resultsTitleText}>Challenge Complete!</Text>
            </Animated.View>

            {/* Score card */}
            <Animated.View entering={FadeInDown.delay(250).duration(500)}>
                <GlassCard gold style={styles.resultsScoreCard} padding="lg">
                    <Text style={styles.resultsScoreLabel}>Your Score</Text>
                    <Text style={styles.resultsScoreValue}>{score}</Text>
                    <Text style={styles.resultsScoreMax}>out of {TOTAL_QUESTIONS * MAX_SCORE_PER_QUESTION}</Text>

                    <View style={styles.resultsDivider} />

                    <View style={styles.resultsStatsRow}>
                        <View style={styles.resultsStat}>
                            <Ionicons name="checkmark-circle" size={20} color={colors.emerald[500]} />
                            <Text style={styles.resultsStatValue}>{correctCount}</Text>
                            <Text style={styles.resultsStatLabel}>Correct</Text>
                        </View>
                        <View style={styles.resultsStat}>
                            <Ionicons name="close-circle" size={20} color={colors.coral[500]} />
                            <Text style={styles.resultsStatValue}>{TOTAL_QUESTIONS - correctCount}</Text>
                            <Text style={styles.resultsStatLabel}>Wrong</Text>
                        </View>
                        <View style={styles.resultsStat}>
                            <Ionicons name="speedometer" size={20} color={colors.azure[500]} />
                            <Text style={styles.resultsStatValue}>{Math.round(score / TOTAL_QUESTIONS)}</Text>
                            <Text style={styles.resultsStatLabel}>Avg Pts</Text>
                        </View>
                    </View>
                </GlassCard>
            </Animated.View>

            {/* Streak card */}
            <Animated.View entering={FadeInDown.delay(400).duration(500)}>
                <GlassCard style={[styles.resultsStreakCard, isHighStreak && styles.resultsStreakCardGlow]} padding="lg">
                    <View style={styles.resultsStreakRow}>
                        <Ionicons name="flame" size={28} color={isHighStreak ? colors.gold[400] : colors.gold[500]} />
                        <View style={styles.resultsStreakInfo}>
                            <Text style={[styles.resultsStreakValue, isHighStreak && styles.resultsStreakValueGlow]}>
                                {streak} Day Streak
                            </Text>
                            <Text style={styles.resultsStreakHint}>
                                {isHighStreak ? 'Incredible! Keep it going!' : 'Come back tomorrow to continue!'}
                            </Text>
                        </View>
                    </View>
                </GlassCard>
            </Animated.View>

            {/* Action buttons */}
            <Animated.View entering={FadeInDown.delay(550).duration(400)} style={styles.resultsActions}>
                <Button
                    title="Share Score"
                    icon="share-outline"
                    onPress={onShare}
                    variant="primary"
                    fullWidth
                />
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
// Already Completed View
// ============================================

function AlreadyCompletedView({ streak, onBack }: { streak: number; onBack: () => void }) {
    const insets = useSafeAreaInsets();
    const isHighStreak = streak >= 7;

    return (
        <View style={[styles.alreadyContainer, { paddingBottom: insets.bottom + spacing.xl }]}>
            <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.alreadyContent}>
                <Ionicons name="checkmark-circle" size={64} color={colors.emerald[500]} />
                <Text style={styles.alreadyTitle}>Challenge Complete!</Text>
                <Text style={styles.alreadySubtext}>
                    You've already completed today's daily challenge. Come back tomorrow for a new one!
                </Text>

                <View style={[styles.alreadyStreakBadge, isHighStreak && styles.alreadyStreakBadgeGlow]}>
                    <Ionicons name="flame" size={24} color={colors.gold[500]} />
                    <Text style={[styles.alreadyStreakText, isHighStreak && styles.alreadyStreakTextGlow]}>
                        {streak} Day Streak
                    </Text>
                </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.alreadyActions}>
                <Button
                    title="Back to Arena"
                    icon="arrow-back"
                    onPress={onBack}
                    variant="secondary"
                    fullWidth
                />
            </Animated.View>
        </View>
    );
}

// ============================================
// Main Daily Challenge Screen
// ============================================

export default function DailyChallengeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Game state
    const [gamePhase, setGamePhase] = useState<'loading' | 'already_completed' | 'playing' | 'results'>('loading');
    const [questionIndex, setQuestionIndex] = useState(0);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [answers, setAnswers] = useState<(boolean | null)[]>(Array(TOTAL_QUESTIONS).fill(null));
    const [streak, setStreak] = useState(0);
    const [questionKey, setQuestionKey] = useState(0);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Get today's questions
    const questions = useMemo(() => getDailyQuestions(), []);
    const currentQuestion = questions[questionIndex];
    const category = currentQuestion?.category?.toLowerCase() ?? 'default';
    const categoryColor = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.default;

    // ============================================
    // Initialize — check streak & completion
    // ============================================

    useEffect(() => {
        async function init() {
            try {
                const [lastDate, storedStreak] = await Promise.all([
                    AsyncStorage.getItem(STORAGE_KEY_LAST_DATE),
                    AsyncStorage.getItem(STORAGE_KEY_STREAK),
                ]);

                const currentStreak = storedStreak ? parseInt(storedStreak, 10) : 0;
                const todayStr = getTodayDateString();

                setStreak(currentStreak);

                if (lastDate === todayStr) {
                    setGamePhase('already_completed');
                } else {
                    setGamePhase('playing');
                }
            } catch {
                setGamePhase('playing');
            }
        }
        init();
    }, []);

    // ============================================
    // Timer Logic
    // ============================================

    useEffect(() => {
        if (gamePhase !== 'playing' || showResult || !currentQuestion) return;

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    // Time's up — auto answer incorrect
                    if (!hasAnswered) {
                        setHasAnswered(true);
                        setShowResult(true);
                        setAnswers((prev) => {
                            const next = [...prev];
                            next[questionIndex] = false;
                            return next;
                        });
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gamePhase, currentQuestion, showResult, hasAnswered, questionIndex]);

    // ============================================
    // Answer Handler
    // ============================================

    const handleAnswer = useCallback(
        (index: number) => {
            if (hasAnswered || !currentQuestion) return;

            setHasAnswered(true);
            setSelectedAnswer(index);
            if (timerRef.current) clearInterval(timerRef.current);

            const isCorrect = index === currentQuestion.correct;

            // Calculate time bonus: faster answers get more points
            const timeBonus = Math.round((timeLeft / TIMER_DURATION) * 50);
            const points = isCorrect ? 50 + timeBonus : 0;

            setScore((prev) => prev + points);
            if (isCorrect) setCorrectCount((prev) => prev + 1);

            setAnswers((prev) => {
                const next = [...prev];
                next[questionIndex] = isCorrect;
                return next;
            });

            if (isCorrect) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }

            // Show result briefly
            setShowResult(true);
        },
        [hasAnswered, currentQuestion, timeLeft, questionIndex],
    );

    // ============================================
    // Advance to next question or end
    // ============================================

    useEffect(() => {
        if (!showResult) return;

        const timer = setTimeout(() => {
            if (questionIndex < TOTAL_QUESTIONS - 1) {
                // Next question
                setQuestionIndex((prev) => prev + 1);
                setHasAnswered(false);
                setSelectedAnswer(null);
                setShowResult(false);
                setTimeLeft(TIMER_DURATION);
                setQuestionKey((k) => k + 1);
            } else {
                // Challenge complete
                completeChallenge();
            }
        }, 1500);

        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showResult, questionIndex]);

    // ============================================
    // Complete Challenge — update streak
    // ============================================

    const completeChallenge = useCallback(async () => {
        try {
            const todayStr = getTodayDateString();
            const [lastDate, storedStreak] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEY_LAST_DATE),
                AsyncStorage.getItem(STORAGE_KEY_STREAK),
            ]);

            let currentStreak = storedStreak ? parseInt(storedStreak, 10) : 0;

            // Check if yesterday was completed for streak continuity
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

            if (lastDate === yesterdayStr) {
                currentStreak += 1;
            } else if (lastDate !== todayStr) {
                // Streak broken
                currentStreak = 1;
            }

            await Promise.all([
                AsyncStorage.setItem(STORAGE_KEY_LAST_DATE, todayStr),
                AsyncStorage.setItem(STORAGE_KEY_STREAK, String(currentStreak)),
            ]);

            setStreak(currentStreak);
            setGamePhase('results');
        } catch {
            setGamePhase('results');
        }
    }, []);

    // ============================================
    // Share Score
    // ============================================

    const handleShare = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await Share.share({
                message: `🔥 Daily Challenge — ${score}/${TOTAL_QUESTIONS * MAX_SCORE_PER_QUESTION} pts | ${correctCount}/${TOTAL_QUESTIONS} correct | ${streak} day streak! #0GArena`,
            });
        } catch {
            // User cancelled
        }
    }, [score, correctCount, streak]);

    // ============================================
    // Navigation
    // ============================================

    const handleBack = useCallback(() => {
        router.back();
    }, [router]);

    // ============================================
    // Render — Loading
    // ============================================

    if (gamePhase === 'loading') {
        return (
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={styles.gradient}
            >
                <ScreenHeader title="Daily Challenge" showBack noBorder />
            </LinearGradient>
        );
    }

    // ============================================
    // Render — Already Completed
    // ============================================

    if (gamePhase === 'already_completed') {
        return (
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={styles.gradient}
            >
                <ScreenHeader title="Daily Challenge" showBack noBorder />
                <AlreadyCompletedView streak={streak} onBack={handleBack} />
            </LinearGradient>
        );
    }

    // ============================================
    // Render — Results
    // ============================================

    if (gamePhase === 'results') {
        return (
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={styles.gradient}
            >
                <ScreenHeader title="Daily Challenge" showBack noBorder />
                <ResultsView
                    score={score}
                    correctCount={correctCount}
                    streak={streak}
                    onShare={handleShare}
                    onBack={handleBack}
                />
            </LinearGradient>
        );
    }

    // ============================================
    // Render — Playing
    // ============================================

    return (
        <LinearGradient
            colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
            style={styles.gradient}
        >
            {/* Header Bar */}
            <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
                <TouchableOpacity
                    onPress={handleBack}
                    style={styles.leaveButton}
                    accessibilityRole="button"
                    accessibilityLabel="Leave challenge"
                >
                    <Ionicons name="close" size={24} color={colors.text.secondary} />
                </TouchableOpacity>

                {/* Streak Badge */}
                <View style={[styles.streakBadge, streak >= 7 && styles.streakBadgeGlow]}>
                    <Ionicons name="flame" size={16} color={colors.gold[500]} />
                    <Text style={styles.streakText}>{streak}</Text>
                </View>

                {/* Timer */}
                <TimerRing timeLeft={timeLeft} />

                {/* Score */}
                <View style={styles.scoreContainer}>
                    <Ionicons name="star" size={14} color={colors.gold[500]} />
                    <Text style={styles.scoreText}>{score}</Text>
                </View>
            </View>

            {/* Progress Dots */}
            <ProgressDots current={questionIndex} total={TOTAL_QUESTIONS} answers={answers} />

            {/* Question Counter */}
            <Animated.View entering={FadeIn.duration(300)} style={styles.roundBadgeContainer}>
                <View style={styles.roundBadge}>
                    <Text style={styles.roundText}>
                        Q {questionIndex + 1}/{TOTAL_QUESTIONS}
                    </Text>
                </View>
            </Animated.View>

            {/* Question Area */}
            <Animated.View
                key={`question-${questionKey}`}
                entering={FadeIn.duration(400)}
                style={styles.questionArea}
            >
                {/* Category Badge */}
                {currentQuestion?.category && (
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
                    {currentQuestion?.text}
                </Animated.Text>
            </Animated.View>

            {/* Answer Options */}
            <View style={styles.optionsContainer}>
                {currentQuestion?.options?.map((option: string, index: number) => (
                    <OptionButton
                        key={`${questionKey}-option-${index}`}
                        text={option}
                        index={index}
                        selected={selectedAnswer === index}
                        correctIndex={showResult ? currentQuestion.correct : null}
                        hasAnswered={hasAnswered}
                        showResult={showResult}
                        onPress={handleAnswer}
                    />
                ))}
            </View>

            {/* Status Bar */}
            <View style={[styles.statusBar, { paddingBottom: insets.bottom + spacing.sm }]}>
                {showResult && (
                    <Animated.View entering={FadeInDown.duration(300)} style={styles.resultBadge}>
                        {selectedAnswer === currentQuestion?.correct ? (
                            <>
                                <Ionicons name="checkmark-circle" size={18} color={colors.emerald[500]} />
                                <Text style={[styles.resultText, { color: colors.emerald[500] }]}>Correct!</Text>
                                <Text style={styles.bonusText}>+{50 + Math.round((timeLeft / TIMER_DURATION) * 50)} pts</Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="close-circle" size={18} color={colors.coral[500]} />
                                <Text style={[styles.resultText, { color: colors.coral[500] }]}>
                                    {selectedAnswer === null ? "Time's up!" : 'Wrong!'}
                                </Text>
                            </>
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
    gradient: {
        flex: 1,
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
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface.glass,
        alignItems: 'center',
        justifyContent: 'center',
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.surface.glass,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    streakBadgeGlow: {
        borderColor: colors.gold[500] + '40',
        backgroundColor: colors.surface.goldSubtle,
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    streakText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.gold[500],
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
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
    },
    timerTextUrgent: {
        color: colors.coral[500],
    },

    // ---- Progress Dots ----
    progressDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
    },
    progressDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    progressDotActive: {
        width: 12,
        height: 12,
        borderRadius: 6,
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 3,
    },

    // ---- Round Badge ----
    roundBadgeContainer: {
        alignItems: 'center',
        paddingBottom: spacing.xs,
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

    // ---- Question Area ----
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
        letterSpacing: 1,
    },
    questionText: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text.primary,
        textAlign: 'center',
        lineHeight: 32,
        fontFamily: 'Inter-Bold',
    },

    // ---- Options ----
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

    // ---- Status Bar ----
    statusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        minHeight: 44,
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
    bonusText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.gold[400],
        marginLeft: spacing.xs,
    },

    // ============================================
    // Results View Styles
    // ============================================
    resultsScroll: {
        flex: 1,
    },
    resultsContainer: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
    },
    resultsHeader: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    resultsTitleText: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.gold[400],
        marginTop: spacing.md,
    },
    resultsScoreCard: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    resultsScoreLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    resultsScoreValue: {
        fontSize: 56,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.gold[400],
        marginVertical: spacing.xs,
    },
    resultsScoreMax: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
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
    resultsStat: {
        alignItems: 'center',
        gap: 4,
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
    resultsStreakCard: {
        marginBottom: spacing.xl,
    },
    resultsStreakCardGlow: {
        borderColor: colors.gold[500] + '30',
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
    },
    resultsStreakRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    resultsStreakInfo: {
        flex: 1,
    },
    resultsStreakValue: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
    },
    resultsStreakValueGlow: {
        color: colors.gold[400],
    },
    resultsStreakHint: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        marginTop: 2,
    },
    resultsActions: {
        gap: spacing.md,
    },

    // ============================================
    // Already Completed Styles
    // ============================================
    alreadyContainer: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
    },
    alreadyContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
    },
    alreadyTitle: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.emerald[500],
        marginTop: spacing.md,
    },
    alreadySubtext: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 280,
    },
    alreadyStreakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface.glass,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        marginTop: spacing.lg,
    },
    alreadyStreakBadgeGlow: {
        borderColor: colors.gold[500] + '30',
        backgroundColor: colors.surface.goldSubtle,
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 4,
    },
    alreadyStreakText: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
    },
    alreadyStreakTextGlow: {
        color: colors.gold[400],
    },
    alreadyActions: {
        paddingTop: spacing.lg,
    },
});
