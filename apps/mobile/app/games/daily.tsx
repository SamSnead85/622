// ============================================
// Daily Challenge — Solo daily trivia mode (Enhanced)
// Smooth timer ring, score popups, fire streak,
// answer color feedback, share results
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
    SlideInRight,
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '@zerog/ui';
import { ScreenHeader, GlassCard, Button } from '../../components';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================
// Constants
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TIMER_DURATION = 20;
const TIMER_SIZE = 64;
const TIMER_STROKE_WIDTH = 5;
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

const CATEGORY_ICONS: Record<string, string> = {
    geography: 'globe-outline',
    art: 'color-palette-outline',
    science: 'flask-outline',
    history: 'time-outline',
    literature: 'book-outline',
    nature: 'leaf-outline',
    culture: 'people-outline',
    default: 'help-circle-outline',
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
// Timer Ring Component (Smooth)
// ============================================

function TimerRing({ timeLeft }: { timeLeft: number }) {
    const progress = useSharedValue(1);
    const pulseScale = useSharedValue(1);

    useEffect(() => {
        // Smooth continuous animation for 1 second
        progress.value = withTiming(timeLeft / TIMER_DURATION, {
            duration: 1000,
            easing: Easing.linear,
        });

        // Pulse effect when urgent
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
        <Animated.View
            style={[styles.timerContainer, animatedContainerStyle]}
            accessibilityRole="timer"
            accessibilityLabel={`${timeLeft} seconds remaining`}
        >
            {/* Glow effect for urgent state */}
            {isUrgent && (
                <View style={styles.timerGlow} />
            )}
            <Svg width={TIMER_SIZE} height={TIMER_SIZE} style={styles.timerSvg}>
                {/* Background track */}
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
            <Text style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>
                {timeLeft}
            </Text>
        </Animated.View>
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
                else if (isCompleted && wasCorrect === true) dotColor = colors.emerald[500];
                else if (isCompleted && wasCorrect === false) dotColor = colors.coral[500];

                return (
                    <Animated.View
                        key={i}
                        entering={FadeIn.delay(i * 40).duration(300)}
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
// Score Popup Component
// ============================================

function ScorePopup({ points, visible }: { points: number; visible: boolean }) {
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(0);
    const popScale = useSharedValue(0.5);

    useEffect(() => {
        if (visible && points > 0) {
            translateY.value = 0;
            opacity.value = 0;
            popScale.value = 0.5;

            opacity.value = withSequence(
                withTiming(1, { duration: 200 }),
                withDelay(800, withTiming(0, { duration: 500 })),
            );
            translateY.value = withTiming(-60, { duration: 1500, easing: Easing.out(Easing.ease) });
            popScale.value = withSequence(
                withSpring(1.2, { damping: 8 }),
                withSpring(1, { damping: 12 }),
            );
        }
    }, [visible, points, translateY, opacity, popScale]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: translateY.value },
            { scale: popScale.value },
        ],
        opacity: opacity.value,
    }));

    if (!visible || points <= 0) return null;

    return (
        <Animated.View style={[styles.scorePopup, animatedStyle]} pointerEvents="none">
            <LinearGradient
                colors={[colors.gold[500], colors.gold[400]]}
                style={styles.scorePopupBg}
            >
                <Text style={styles.scorePopupText}>+{points}</Text>
            </LinearGradient>
        </Animated.View>
    );
}

// ============================================
// Streak Fire Animation
// ============================================

function StreakFire({ streak }: { streak: number }) {
    const fireScale = useSharedValue(1);
    const isHot = streak >= 3;

    useEffect(() => {
        if (isHot) {
            fireScale.value = withRepeat(
                withSequence(
                    withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
                ),
                -1,
                false,
            );
        }
    }, [isHot, fireScale]);

    const animatedFire = useAnimatedStyle(() => ({
        transform: [{ scale: fireScale.value }],
    }));

    return (
        <Animated.View style={[styles.streakBadge, streak >= 7 && styles.streakBadgeGlow, animatedFire]}>
            <Ionicons name="flame" size={18} color={isHot ? colors.gold[400] : colors.gold[500]} />
            <Text style={styles.streakText}>{streak}</Text>
        </Animated.View>
    );
}

// ============================================
// Option Button Component (Enhanced)
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
    const shake = useSharedValue(0);

    const isCorrect = showResult && correctIndex === index;
    const isWrong = showResult && selected && correctIndex !== index;

    useEffect(() => {
        if (isWrong) {
            // Shake animation for wrong answer
            shake.value = withSequence(
                withTiming(-6, { duration: 50 }),
                withTiming(6, { duration: 50 }),
                withTiming(-4, { duration: 50 }),
                withTiming(4, { duration: 50 }),
                withTiming(0, { duration: 50 }),
            );
        }
        if (isCorrect) {
            // Bounce for correct answer
            scale.value = withSequence(
                withSpring(1.03, { damping: 8 }),
                withSpring(1, { damping: 12 }),
            );
        }
    }, [isCorrect, isWrong, scale, shake]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { translateX: shake.value },
        ],
    }));

    const handlePressIn = useCallback(() => {
        if (hasAnswered) return;
        scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    }, [hasAnswered, scale]);

    const handlePressOut = useCallback(() => {
        if (hasAnswered) return;
        scale.value = withSpring(1, { damping: 10, stiffness: 200 });
    }, [hasAnswered, scale]);

    const handlePress = useCallback(() => {
        if (hasAnswered) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(index);
    }, [hasAnswered, index, onPress]);

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

    const getLabelBg = () => {
        if (isCorrect) return colors.emerald[500];
        if (isWrong) return colors.coral[500];
        return colors.obsidian[600];
    };

    return (
        <Animated.View
            entering={FadeInDown.delay(100 + index * 80).duration(300).springify()}
            style={animatedStyle}
        >
            <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handlePress}
                disabled={hasAnswered}
                style={[
                    styles.optionButton,
                    {
                        borderColor: getBorderColor(),
                        backgroundColor: getBackgroundColor(),
                    },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Option ${OPTION_LABELS[index]}: ${text}`}
                accessibilityState={{ selected, disabled: hasAnswered }}
            >
                <View style={[styles.optionLabel, { backgroundColor: getLabelBg() }]}>
                    <Text style={[styles.optionLabelText, (isCorrect || isWrong) && styles.optionLabelTextActive]}>
                        {OPTION_LABELS[index]}
                    </Text>
                </View>

                <Text
                    style={[
                        styles.optionText,
                        selected && !showResult && styles.optionTextSelected,
                        isCorrect && styles.optionTextCorrect,
                        isWrong && styles.optionTextWrong,
                    ]}
                    numberOfLines={2}
                >
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
// Results Screen Component (Enhanced)
// ============================================

interface ResultsViewProps {
    score: number;
    correctCount: number;
    streak: number;
    answers: (boolean | null)[];
    onShare: () => void;
    onBack: () => void;
}

function ResultsView({ score, correctCount, streak, answers, onShare, onBack }: ResultsViewProps) {
    const insets = useSafeAreaInsets();
    const isHighStreak = streak >= 7;
    const percentage = Math.round((correctCount / TOTAL_QUESTIONS) * 100);

    const getPerformanceLabel = () => {
        if (percentage >= 90) return { text: 'Perfect!', icon: 'star' as const, color: colors.gold[400] };
        if (percentage >= 70) return { text: 'Great Job!', icon: 'trophy' as const, color: colors.gold[500] };
        if (percentage >= 50) return { text: 'Good Try!', icon: 'thumbs-up' as const, color: colors.azure[400] };
        return { text: 'Keep Going!', icon: 'fitness' as const, color: colors.coral[400] };
    };

    const perf = getPerformanceLabel();

    return (
        <ScrollView
            style={styles.resultsScroll}
            contentContainerStyle={[styles.resultsContainer, { paddingBottom: insets.bottom + spacing.xl }]}
            showsVerticalScrollIndicator={false}
        >
            {/* Trophy / completion header */}
            <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.resultsHeader}>
                <View style={styles.resultsTrophyBg}>
                    <Ionicons name={perf.icon} size={40} color={perf.color} />
                </View>
                <Text style={[styles.resultsTitleText, { color: perf.color }]}>{perf.text}</Text>
                <Text style={styles.resultsSubtitleText}>Challenge Complete</Text>
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
                            <View style={[styles.resultsStatIcon, { backgroundColor: colors.emerald[500] + '15' }]}>
                                <Ionicons name="checkmark-circle" size={18} color={colors.emerald[500]} />
                            </View>
                            <Text style={styles.resultsStatValue}>{correctCount}</Text>
                            <Text style={styles.resultsStatLabel}>Correct</Text>
                        </View>
                        <View style={styles.resultsStat}>
                            <View style={[styles.resultsStatIcon, { backgroundColor: colors.coral[500] + '15' }]}>
                                <Ionicons name="close-circle" size={18} color={colors.coral[500]} />
                            </View>
                            <Text style={styles.resultsStatValue}>{TOTAL_QUESTIONS - correctCount}</Text>
                            <Text style={styles.resultsStatLabel}>Wrong</Text>
                        </View>
                        <View style={styles.resultsStat}>
                            <View style={[styles.resultsStatIcon, { backgroundColor: colors.azure[500] + '15' }]}>
                                <Ionicons name="speedometer" size={18} color={colors.azure[500]} />
                            </View>
                            <Text style={styles.resultsStatValue}>{Math.round(score / TOTAL_QUESTIONS)}</Text>
                            <Text style={styles.resultsStatLabel}>Avg Pts</Text>
                        </View>
                    </View>
                </GlassCard>
            </Animated.View>

            {/* Answer breakdown dots */}
            <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.answerBreakdown}>
                <Text style={styles.answerBreakdownTitle}>Answer Breakdown</Text>
                <View style={styles.answerBreakdownRow}>
                    {answers.map((a, i) => (
                        <View
                            key={i}
                            style={[
                                styles.answerDot,
                                {
                                    backgroundColor: a === true ? colors.emerald[500] : a === false ? colors.coral[500] : colors.obsidian[600],
                                },
                            ]}
                        >
                            <Text style={styles.answerDotText}>{i + 1}</Text>
                        </View>
                    ))}
                </View>
            </Animated.View>

            {/* Streak card */}
            <Animated.View entering={FadeInDown.delay(400).duration(500)}>
                <GlassCard style={[styles.resultsStreakCard, isHighStreak && styles.resultsStreakCardGlow]} padding="lg">
                    <View style={styles.resultsStreakRow}>
                        <View style={styles.resultsStreakFireBg}>
                            <Ionicons name="flame" size={28} color={isHighStreak ? colors.gold[400] : colors.gold[500]} />
                        </View>
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
                <TouchableOpacity
                    onPress={onShare}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Share your score"
                >
                    <LinearGradient
                        colors={[colors.gold[500], colors.gold[400]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.shareButton}
                    >
                        <Ionicons name="share-outline" size={20} color={colors.obsidian[900]} />
                        <Text style={styles.shareButtonText}>Share Score</Text>
                    </LinearGradient>
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
// Already Completed View
// ============================================

function AlreadyCompletedView({ streak, onBack }: { streak: number; onBack: () => void }) {
    const insets = useSafeAreaInsets();
    const isHighStreak = streak >= 7;

    return (
        <View style={[styles.alreadyContainer, { paddingBottom: insets.bottom + spacing.xl }]}>
            <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.alreadyContent}>
                <View style={styles.alreadyCheckBg}>
                    <Ionicons name="checkmark-circle" size={48} color={colors.emerald[500]} />
                </View>
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
    const [lastPoints, setLastPoints] = useState(0);
    const [showScorePopup, setShowScorePopup] = useState(false);
    const [correctStreak, setCorrectStreak] = useState(0);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Get today's questions
    const questions = useMemo(() => getDailyQuestions(), []);
    const currentQuestion = questions[questionIndex];
    const category = currentQuestion?.category?.toLowerCase() ?? 'default';
    const categoryColor = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.default;
    const categoryIcon = CATEGORY_ICONS[category] ?? CATEGORY_ICONS.default;

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
                        setCorrectStreak(0);
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

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setHasAnswered(true);
            setSelectedAnswer(index);
            if (timerRef.current) clearInterval(timerRef.current);

            const isCorrect = index === currentQuestion.correct;

            // Calculate time bonus: faster answers get more points
            const timeBonus = Math.round((timeLeft / TIMER_DURATION) * 50);
            const points = isCorrect ? 50 + timeBonus : 0;

            setScore((prev) => prev + points);
            if (isCorrect) {
                setCorrectCount((prev) => prev + 1);
                setCorrectStreak((prev) => prev + 1);
            } else {
                setCorrectStreak(0);
            }

            // Score popup
            setLastPoints(points);
            setShowScorePopup(true);
            setTimeout(() => setShowScorePopup(false), 1600);

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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        const emojiMap = answers.map((a) => a === true ? '\u2705' : a === false ? '\u274C' : '\u2B1C').join('');
        try {
            await Share.share({
                message: `Daily Challenge ${getTodayDateString()}\n${emojiMap}\nScore: ${score}/${TOTAL_QUESTIONS * MAX_SCORE_PER_QUESTION} | ${correctCount}/${TOTAL_QUESTIONS} correct\nStreak: ${streak} days \uD83D\uDD25\n#0GArena`,
            });
        } catch {
            // User cancelled
        }
    }, [score, correctCount, streak, answers]);

    // ============================================
    // Navigation
    // ============================================

    const handleBack = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                    answers={answers}
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
                <StreakFire streak={streak} />

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

            {/* Question Counter + Correct Streak */}
            <Animated.View entering={FadeIn.duration(300)} style={styles.roundBadgeContainer}>
                <View style={styles.roundBadge}>
                    <Text style={styles.roundText}>
                        Q {questionIndex + 1}/{TOTAL_QUESTIONS}
                    </Text>
                </View>
                {correctStreak >= 2 && (
                    <Animated.View entering={FadeIn.duration(300)} style={styles.correctStreakBadge}>
                        <Ionicons name="flame" size={12} color={colors.gold[400]} />
                        <Text style={styles.correctStreakText}>{correctStreak} in a row!</Text>
                    </Animated.View>
                )}
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
                        style={[styles.categoryBadge, { backgroundColor: categoryColor + '15', borderColor: categoryColor + '30' }]}
                    >
                        <Ionicons name={categoryIcon as any} size={14} color={categoryColor} />
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

            {/* Score Popup */}
            <ScorePopup points={lastPoints} visible={showScorePopup} />

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
                            <LinearGradient
                                colors={[colors.emerald[500] + '20', colors.emerald[500] + '08']}
                                style={styles.resultBadgeBg}
                            >
                                <Ionicons name="checkmark-circle" size={20} color={colors.emerald[500]} />
                                <Text style={[styles.resultText, { color: colors.emerald[400] }]}>Correct!</Text>
                                <Text style={styles.bonusText}>+{50 + Math.round((timeLeft / TIMER_DURATION) * 50)} pts</Text>
                            </LinearGradient>
                        ) : (
                            <LinearGradient
                                colors={[colors.coral[500] + '20', colors.coral[500] + '08']}
                                style={styles.resultBadgeBg}
                            >
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
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface.glass,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.surface.glass,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: spacing.xs + 2,
        borderRadius: 12,
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
    timerGlow: {
        position: 'absolute',
        width: TIMER_SIZE + 12,
        height: TIMER_SIZE + 12,
        borderRadius: (TIMER_SIZE + 12) / 2,
        backgroundColor: colors.coral[500] + '10',
    },
    timerText: {
        fontSize: typography.fontSize.xl,
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
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
    correctStreakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.gold[500] + '15',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs + 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
    },
    correctStreakText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.gold[400],
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
        gap: spacing.xs + 2,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: spacing.lg,
    },
    categoryText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
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

    // ---- Score Popup ----
    scorePopup: {
        position: 'absolute',
        top: '35%',
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
        color: colors.obsidian[900],
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
        height: 58,
        borderRadius: 14,
        paddingHorizontal: spacing.md,
        borderWidth: 1.5,
        gap: spacing.md,
    },
    optionLabel: {
        width: 30,
        height: 30,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionLabelTextActive: {
        color: colors.obsidian[900],
    },
    optionLabelText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.text.secondary,
        fontFamily: 'Inter-Bold',
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
        color: colors.emerald[400],
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
        minHeight: 48,
    },
    resultBadge: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    resultBadgeBg: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm + 2,
        borderRadius: 16,
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
    resultsTrophyBg: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.gold[500] + '20',
        marginBottom: spacing.md,
    },
    resultsTitleText: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },
    resultsSubtitleText: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        marginTop: spacing.xs,
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
        gap: 6,
    },
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

    // ---- Answer Breakdown ----
    answerBreakdown: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    answerBreakdownTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
        marginBottom: spacing.md,
    },
    answerBreakdownRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    answerDot: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    answerDotText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
    },

    // ---- Streak Card ----
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
    resultsStreakFireBg: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: colors.gold[500] + '15',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.gold[500] + '25',
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

    // ---- Share Button ----
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md + 2,
        borderRadius: 14,
        marginBottom: spacing.md,
    },
    shareButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.obsidian[900],
    },

    // ---- Actions ----
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
    alreadyCheckBg: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: colors.emerald[500] + '12',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.emerald[500] + '25',
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
