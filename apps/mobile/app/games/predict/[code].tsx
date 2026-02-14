// ============================================
// Predict — "How would [player] answer this?"
// Social prediction game with animated reveals
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
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
    Easing,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@zerog/ui';
import { ScreenHeader, GlassCard, LoadingView } from '../../../components';
import { useGameStore } from '../../../stores';
import { socketManager } from '../../../lib/socket';

// ============================================
// Constants
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCALE_ITEMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const CIRCLE_SIZE = (SCREEN_WIDTH - spacing.lg * 2 - spacing.xs * 9) / 10;

// ============================================
// Subject Spotlight Component
// ============================================

function SubjectSpotlight({
    player,
    phase,
}: {
    player: { id: string; name: string; avatarUrl?: string };
    phase: string;
}) {
    const glowOpacity = useSharedValue(0.3);

    useEffect(() => {
        glowOpacity.value = withTiming(0.6, { duration: 1500 });
    }, [glowOpacity]);

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    return (
        <Animated.View entering={FadeInDown.duration(500)} style={styles.spotlightContainer}>
            {/* Glow effect behind avatar */}
            <Animated.View style={[styles.spotlightGlow, glowStyle]} />

            {/* Avatar */}
            <View style={styles.spotlightAvatar}>
                {player.avatarUrl ? (
                    <Image
                        source={{ uri: player.avatarUrl }}
                        style={styles.spotlightAvatarImage}
                        placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                        transition={200}
                        cachePolicy="memory-disk"
                    />
                ) : (
                    <Text style={styles.spotlightAvatarText}>
                        {player.name?.charAt(0)?.toUpperCase() ?? '?'}
                    </Text>
                )}
            </View>

            {/* Name */}
            <Text style={styles.spotlightName}>{player.name}</Text>

            {/* Phase hint */}
            <View style={styles.spotlightPhaseChip}>
                <View style={[
                    styles.spotlightPhaseDot,
                    { backgroundColor: phase === 'reveal' ? colors.gold[500] : colors.emerald[500] },
                ]} />
                <Text style={styles.spotlightPhaseText}>
                    {phase === 'answering' ? 'Answering...' : phase === 'predicting' ? 'Predict now!' : 'Revealing!'}
                </Text>
            </View>
        </Animated.View>
    );
}

// ============================================
// Scale Selector Component (1-10)
// ============================================

function ScaleSelector({
    selected,
    onSelect,
    disabled,
    revealValue,
}: {
    selected: number | null;
    onSelect: (value: number) => void;
    disabled: boolean;
    revealValue?: number | null;
}) {
    return (
        <View style={styles.scaleContainer} accessibilityRole="radiogroup" accessibilityLabel="Select a number from 1 to 10">
            <View style={styles.scaleRow}>
                {SCALE_ITEMS.map((num) => {
                    const isSelected = selected === num;
                    const isReveal = revealValue === num;

                    return (
                        <ScaleCircle
                            key={num}
                            num={num}
                            isSelected={isSelected}
                            isReveal={isReveal}
                            disabled={disabled}
                            onSelect={onSelect}
                        />
                    );
                })}
            </View>

            {/* Scale label */}
            <View style={styles.scaleLabels}>
                <Text style={styles.scaleLabelText}>Not at all</Text>
                <Text style={styles.scaleLabelText}>Extremely</Text>
            </View>
        </View>
    );
}

// ============================================
// Scale Circle (individual number)
// ============================================

function ScaleCircle({
    num,
    isSelected,
    isReveal,
    disabled,
    onSelect,
}: {
    num: number;
    isSelected: boolean;
    isReveal: boolean;
    disabled: boolean;
    onSelect: (value: number) => void;
}) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePress = useCallback(() => {
        if (disabled) return;
        scale.value = withSequence(
            withSpring(1.25, { damping: 12 }),
            withSpring(1.08, { damping: 10 }),
        );
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect(num);
    }, [disabled, num, onSelect, scale]);

    return (
        <Animated.View style={animatedStyle}>
            <TouchableOpacity
                style={[
                    styles.scaleCircle,
                    isSelected && styles.scaleCircleSelected,
                    isReveal && styles.scaleCircleReveal,
                ]}
                onPress={handlePress}
                disabled={disabled}
                activeOpacity={0.7}
                accessibilityRole="radio"
                accessibilityLabel={`${num}`}
                accessibilityState={{ selected: isSelected, disabled }}
            >
                <Text
                    style={[
                        styles.scaleCircleText,
                        isSelected && styles.scaleCircleTextSelected,
                        isReveal && styles.scaleCircleTextReveal,
                    ]}
                >
                    {num}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ============================================
// Choice Selector (A/B)
// ============================================

function ChoiceSelector({
    choices,
    selected,
    onSelect,
    disabled,
    revealIndex,
}: {
    choices: string[];
    selected: number | null;
    onSelect: (index: number) => void;
    disabled: boolean;
    revealIndex?: number | null;
}) {
    return (
        <View style={styles.choiceContainer} accessibilityRole="radiogroup" accessibilityLabel="Select an option">
            {choices.map((choice, index) => {
                const isSelected = selected === index;
                const isReveal = revealIndex === index;

                return (
                    <ChoiceCard
                        key={index}
                        choice={choice}
                        index={index}
                        isSelected={isSelected}
                        isReveal={isReveal}
                        disabled={disabled}
                        onSelect={onSelect}
                    />
                );
            })}
        </View>
    );
}

// ============================================
// Choice Card (individual A/B option)
// ============================================

function ChoiceCard({
    choice,
    index,
    isSelected,
    isReveal,
    disabled,
    onSelect,
}: {
    choice: string;
    index: number;
    isSelected: boolean;
    isReveal: boolean;
    disabled: boolean;
    onSelect: (index: number) => void;
}) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePress = useCallback(() => {
        if (disabled) return;
        scale.value = withSequence(
            withSpring(0.96, { damping: 15 }),
            withSpring(1, { damping: 10 }),
        );
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSelect(index);
    }, [disabled, index, onSelect, scale]);

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 100).duration(400)}
            style={[{ flex: 1 }, animatedStyle]}
        >
            <TouchableOpacity
                style={[
                    styles.choiceCard,
                    isSelected && styles.choiceCardSelected,
                    isReveal && styles.choiceCardReveal,
                ]}
                onPress={handlePress}
                disabled={disabled}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityLabel={`Option ${index === 0 ? 'A' : 'B'}: ${choice}`}
                accessibilityState={{ selected: isSelected, disabled }}
            >
                <Text style={styles.choiceLabel}>{index === 0 ? 'A' : 'B'}</Text>
                <Text
                    style={[
                        styles.choiceText,
                        isSelected && styles.choiceTextSelected,
                        isReveal && styles.choiceTextReveal,
                    ]}
                    numberOfLines={3}
                >
                    {choice}
                </Text>

                {isReveal && (
                    <View style={styles.choiceRevealIcon}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.gold[500]} />
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

// ============================================
// Prediction Result Card
// ============================================

function PredictionResultCard({
    playerName,
    prediction,
    actualAnswer,
    score,
    index,
    questionType,
}: {
    playerName: string;
    prediction: number | string;
    actualAnswer: number | string;
    score: number;
    index: number;
    questionType: 'scale' | 'choice';
}) {
    const isExact = prediction === actualAnswer;
    const displayPrediction =
        questionType === 'scale' ? `${prediction}` : `${prediction}`;

    return (
        <Animated.View entering={FadeInDown.delay(200 + index * 120).duration(400)}>
            <View style={[styles.predictionCard, isExact && styles.predictionCardExact]}>
                {/* Player info */}
                <View style={styles.predictionPlayerRow}>
                    <View style={styles.predictionAvatar}>
                        <Text style={styles.predictionAvatarText}>
                            {playerName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.predictionPlayerName} numberOfLines={1}>
                        {playerName}
                    </Text>
                </View>

                {/* Prediction vs actual */}
                <View style={styles.predictionValues}>
                    <View style={styles.predictionValueBox}>
                        <Text style={styles.predictionValueLabel}>Guessed</Text>
                        <Text style={styles.predictionValueText}>{displayPrediction}</Text>
                    </View>
                    <Ionicons
                        name={isExact ? 'checkmark-circle' : 'arrow-forward'}
                        size={18}
                        color={isExact ? colors.gold[500] : colors.text.muted}
                    />
                    <View style={styles.predictionValueBox}>
                        <Text style={styles.predictionValueLabel}>Actual</Text>
                        <Text style={[styles.predictionValueText, styles.predictionActualText]}>
                            {`${actualAnswer}`}
                        </Text>
                    </View>
                </View>

                {/* Score */}
                {score > 0 && (
                    <Animated.View
                        entering={FadeIn.delay(400 + index * 120).duration(300)}
                        style={[styles.predictionScoreBadge, isExact && styles.predictionScoreBadgeExact]}
                    >
                        <Text style={[styles.predictionScoreText, isExact && styles.predictionScoreTextExact]}>
                            +{score}
                        </Text>
                    </Animated.View>
                )}
            </View>
        </Animated.View>
    );
}

// ============================================
// Reveal Card Component
// ============================================

function RevealCard({ answer, questionType }: { answer: number | string; questionType: string }) {
    const flipProgress = useSharedValue(0);

    useEffect(() => {
        flipProgress.value = withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) });
    }, [flipProgress]);

    const frontStyle = useAnimatedStyle(() => ({
        opacity: flipProgress.value < 0.5 ? 1 : 0,
        transform: [{ scale: flipProgress.value < 0.5 ? 1 : 0.8 }],
    }));

    const backStyle = useAnimatedStyle(() => ({
        opacity: flipProgress.value >= 0.5 ? 1 : 0,
        transform: [{ scale: flipProgress.value >= 0.5 ? 1 : 0.8 }],
    }));

    return (
        <Animated.View entering={FadeIn.duration(400)} style={styles.revealCardContainer}>
            {/* Front (hidden) */}
            <Animated.View style={[styles.revealCard, frontStyle]}>
                <Ionicons name="help-circle" size={40} color={colors.text.muted} />
                <Text style={styles.revealCardHiddenText}>?</Text>
            </Animated.View>

            {/* Back (answer) */}
            <Animated.View style={[styles.revealCard, styles.revealCardBack, backStyle]}>
                <Ionicons name="star" size={20} color={colors.gold[500]} />
                <Text style={styles.revealCardAnswerText}>{`${answer}`}</Text>
                <Text style={styles.revealCardLabel}>
                    {questionType === 'scale' ? 'Their answer' : 'They chose'}
                </Text>
            </Animated.View>
        </Animated.View>
    );
}

// ============================================
// Main Predict Screen
// ============================================

export default function PredictScreen() {
    const router = useRouter();
    const { code } = useLocalSearchParams<{ code: string }>();
    const insets = useSafeAreaInsets();
    const gameStore = useGameStore();

    // Local state
    const [selectedValue, setSelectedValue] = useState<number | null>(null);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [phaseKey, setPhaseKey] = useState(0);

    // Derived data
    const { gameData, players, round, totalRounds } = gameStore;
    const phase = (gameData?.phase as 'answering' | 'predicting' | 'reveal') ?? 'answering';
    const subject = gameData?.subject as { id: string; name: string; avatarUrl?: string } | undefined;
    const question = gameData?.question as string | undefined;
    const questionType = (gameData?.questionType as 'scale' | 'choice') ?? 'scale';
    const choices = (gameData?.choices as string[]) ?? [];
    const revealedAnswer = gameData?.revealedAnswer as number | string | undefined;
    const predictions = (gameData?.predictions as Array<{
        playerId: string;
        playerName: string;
        prediction: number | string;
        score: number;
    }>) ?? [];

    // Am I the subject?
    const isSubject = subject?.id === gameStore.myPlayerId;

    // My score
    const myPlayer = players.find((p) => p.id === gameStore.myPlayerId);
    const myScore = myPlayer?.score ?? 0;

    // ============================================
    // Socket Listeners
    // ============================================

    useEffect(() => {
        const unsubs = [
            socketManager.on('game:update', (data: any) => {
                gameStore.updateFromDelta(data);
            }),
            socketManager.on('game:round-start', (_data: any) => {
                // New round — reset
                setSelectedValue(null);
                setHasSubmitted(false);
                setPhaseKey((k) => k + 1);
            }),
            socketManager.on('game:round-end', (data: any) => {
                gameStore.setRoundEnd(data);
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

    // Reset hasSubmitted when phase changes
    useEffect(() => {
        if (phase === 'predicting' || phase === 'answering') {
            setHasSubmitted(false);
            setSelectedValue(null);
        }
    }, [phase]);

    // ============================================
    // Submit Handlers
    // ============================================

    const handleSubjectAnswer = useCallback(
        (value: number) => {
            if (hasSubmitted) return;
            setSelectedValue(value);
            setHasSubmitted(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            gameStore.sendAction('private_answer', { answer: value });
        },
        [hasSubmitted, gameStore],
    );

    const handlePrediction = useCallback(
        (value: number) => {
            if (hasSubmitted) return;
            setSelectedValue(value);
            setHasSubmitted(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            gameStore.sendAction('predict', { answer: value });
        },
        [hasSubmitted, gameStore],
    );

    const handleLeave = useCallback(() => {
        gameStore.leaveGame();
        router.replace('/games');
    }, [gameStore, router]);

    // ============================================
    // Loading State
    // ============================================

    if (!subject || !question) {
        return (
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={styles.gradient}
            >
                <LoadingView message="Setting up round..." />
            </LinearGradient>
        );
    }

    // ============================================
    // Render Content Based on Phase
    // ============================================

    const renderPhaseContent = () => {
        // ---- PHASE: Answering ----
        if (phase === 'answering') {
            if (isSubject) {
                // I'm the subject — answer the question
                return (
                    <Animated.View key={`answering-subject-${phaseKey}`} entering={FadeIn.duration(400)} style={styles.phaseContent}>
                        <Text style={styles.phaseInstruction}>Answer honestly!</Text>

                        {questionType === 'scale' ? (
                            <ScaleSelector
                                selected={selectedValue}
                                onSelect={handleSubjectAnswer}
                                disabled={hasSubmitted}
                            />
                        ) : (
                            <ChoiceSelector
                                choices={choices}
                                selected={selectedValue}
                                onSelect={handleSubjectAnswer}
                                disabled={hasSubmitted}
                            />
                        )}

                        {hasSubmitted && (
                            <Animated.View entering={FadeIn.duration(300)} style={styles.submittedBadge}>
                                <Ionicons name="checkmark-circle" size={18} color={colors.emerald[500]} />
                                <Text style={styles.submittedText}>Answer locked in!</Text>
                            </Animated.View>
                        )}
                    </Animated.View>
                );
            }

            // Others are waiting
            return (
                <Animated.View key={`answering-waiting-${phaseKey}`} entering={FadeIn.duration(400)} style={styles.phaseContent}>
                    <View style={styles.waitingContainer}>
                        <Animated.View
                            entering={FadeInDown.delay(100).duration(400)}
                            style={styles.waitingIconContainer}
                        >
                            <Ionicons name="hourglass-outline" size={48} color={colors.gold[500]} />
                        </Animated.View>
                        <Text style={styles.waitingTitle}>
                            Waiting for {subject.name} to answer...
                        </Text>
                        <Text style={styles.waitingSubtitle}>
                            Get ready to predict!
                        </Text>
                    </View>
                </Animated.View>
            );
        }

        // ---- PHASE: Predicting ----
        if (phase === 'predicting') {
            if (isSubject) {
                // Subject waits while others predict
                return (
                    <Animated.View key={`predicting-subject-${phaseKey}`} entering={FadeIn.duration(400)} style={styles.phaseContent}>
                        <View style={styles.waitingContainer}>
                            <Animated.View
                                entering={FadeInDown.delay(100).duration(400)}
                                style={styles.waitingIconContainer}
                            >
                                <Ionicons name="people" size={48} color={colors.gold[500]} />
                            </Animated.View>
                            <Text style={styles.waitingTitle}>Others are guessing...</Text>
                            <Text style={styles.waitingSubtitle}>
                                Let's see who knows you best!
                            </Text>
                        </View>
                    </Animated.View>
                );
            }

            // Others predict
            return (
                <Animated.View key={`predicting-predict-${phaseKey}`} entering={FadeIn.duration(400)} style={styles.phaseContent}>
                    <Text style={styles.phaseInstruction}>
                        What do you think {subject.name} answered?
                    </Text>

                    {questionType === 'scale' ? (
                        <ScaleSelector
                            selected={selectedValue}
                            onSelect={handlePrediction}
                            disabled={hasSubmitted}
                        />
                    ) : (
                        <ChoiceSelector
                            choices={choices}
                            selected={selectedValue}
                            onSelect={handlePrediction}
                            disabled={hasSubmitted}
                        />
                    )}

                    {hasSubmitted && (
                        <Animated.View entering={FadeIn.duration(300)} style={styles.submittedBadge}>
                            <Ionicons name="checkmark-circle" size={18} color={colors.emerald[500]} />
                            <Text style={styles.submittedText}>Prediction locked!</Text>
                        </Animated.View>
                    )}
                </Animated.View>
            );
        }

        // ---- PHASE: Reveal ----
        if (phase === 'reveal') {
            return (
                <ScrollView
                    key={`reveal-${phaseKey}`}
                    style={styles.revealScroll}
                    contentContainerStyle={styles.revealScrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Reveal card */}
                    {revealedAnswer !== undefined && (
                        <RevealCard answer={revealedAnswer} questionType={questionType} />
                    )}

                    {/* Predictions list */}
                    {predictions.length > 0 && (
                        <View style={styles.predictionsSection}>
                            <Animated.Text
                                entering={FadeIn.delay(500).duration(300)}
                                style={styles.predictionsSectionTitle}
                            >
                                Predictions
                            </Animated.Text>

                            {predictions.map((pred, index) => (
                                <PredictionResultCard
                                    key={pred.playerId}
                                    playerName={pred.playerName}
                                    prediction={pred.prediction}
                                    actualAnswer={revealedAnswer ?? 0}
                                    score={pred.score}
                                    index={index}
                                    questionType={questionType}
                                />
                            ))}
                        </View>
                    )}
                </ScrollView>
            );
        }

        return null;
    };

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

                {/* Round indicator */}
                <View style={styles.roundBadge}>
                    <Text style={styles.roundText}>
                        Round {round}/{totalRounds}
                    </Text>
                </View>

                {/* Score */}
                <View style={styles.scoreContainer}>
                    <Ionicons name="star" size={14} color={colors.gold[500]} />
                    <Text style={styles.scoreText}>{myScore}</Text>
                </View>
            </View>

            {/* Subject Spotlight */}
            <SubjectSpotlight player={subject} phase={phase} />

            {/* Question */}
            <Animated.View
                key={`question-${phaseKey}`}
                entering={FadeInDown.delay(200).duration(500)}
                style={styles.questionContainer}
            >
                <Text style={styles.questionText}>{question}</Text>
            </Animated.View>

            {/* Phase Content */}
            <View style={styles.contentArea}>
                {renderPhaseContent()}
            </View>

            {/* Bottom status */}
            <View style={[styles.statusBar, { paddingBottom: insets.bottom + spacing.sm }]}>
                <View style={styles.playersIndicator}>
                    <Ionicons name="people-outline" size={14} color={colors.text.muted} />
                    <Text style={styles.playersCount}>
                        {players.filter((p) => p.isConnected).length} playing
                    </Text>
                </View>

                {phase === 'reveal' && (
                    <Animated.View entering={FadeIn.duration(300)} style={styles.nextRoundHint}>
                        <Text style={styles.nextRoundText}>Next round starting soon...</Text>
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

    // Top Bar
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

    // Subject Spotlight
    spotlightContainer: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
    },
    spotlightGlow: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.gold[500],
        top: spacing.md,
    },
    spotlightAvatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.obsidian[600],
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.gold[500],
    },
    spotlightAvatarImage: {
        width: 68,
        height: 68,
        borderRadius: 34,
    },
    spotlightAvatarText: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        color: colors.gold[500],
        fontFamily: 'Inter-Bold',
    },
    spotlightName: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
        marginTop: spacing.sm,
        fontFamily: 'Inter-Bold',
    },
    spotlightPhaseChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.xs,
        backgroundColor: colors.surface.glass,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 12,
    },
    spotlightPhaseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    spotlightPhaseText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.secondary,
    },

    // Question
    questionContainer: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
    },
    questionText: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text.primary,
        textAlign: 'center',
        lineHeight: 32,
        fontFamily: 'Inter-Bold',
    },

    // Phase Content
    contentArea: {
        flex: 1,
    },
    phaseContent: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
    },
    phaseInstruction: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },

    // Scale Selector
    scaleContainer: {
        width: '100%',
        paddingHorizontal: spacing.xs,
    },
    scaleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.xs,
    },
    scaleLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
        paddingHorizontal: spacing.xs,
    },
    scaleLabelText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
    scaleCircle: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_SIZE / 2,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scaleCircleSelected: {
        backgroundColor: colors.gold[500],
        borderColor: colors.gold[400],
    },
    scaleCircleReveal: {
        backgroundColor: colors.emerald[500],
        borderColor: colors.emerald[400],
    },
    scaleCircleText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.text.secondary,
        fontFamily: 'Inter-Bold',
    },
    scaleCircleTextSelected: {
        color: colors.text.inverse,
    },
    scaleCircleTextReveal: {
        color: colors.text.inverse,
    },

    // Choice Selector
    choiceContainer: {
        flexDirection: 'row',
        gap: spacing.md,
        width: '100%',
    },
    choiceCard: {
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 140,
    },
    choiceCardSelected: {
        borderColor: colors.gold[500],
        backgroundColor: colors.surface.goldSubtle,
    },
    choiceCardReveal: {
        borderColor: colors.gold[500],
        backgroundColor: colors.surface.goldLight,
    },
    choiceLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.text.muted,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: typography.letterSpacing.wider,
    },
    choiceText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
        textAlign: 'center',
        fontFamily: 'Inter-Bold',
    },
    choiceTextSelected: {
        color: colors.gold[500],
    },
    choiceTextReveal: {
        color: colors.gold[500],
    },
    choiceRevealIcon: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
    },

    // Submitted badge
    submittedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.xl,
        backgroundColor: colors.surface.glass,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 12,
    },
    submittedText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.emerald[500],
    },

    // Waiting state
    waitingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
    },
    waitingIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    waitingTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
        textAlign: 'center',
        fontFamily: 'Inter-Bold',
    },
    waitingSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
    },

    // Reveal
    revealScroll: {
        flex: 1,
    },
    revealScrollContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
    },
    revealCardContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    revealCard: {
        width: 120,
        height: 120,
        borderRadius: 20,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
    },
    revealCardBack: {
        backgroundColor: colors.surface.goldSubtle,
        borderColor: colors.gold[500],
        position: 'relative',
    },
    revealCardHiddenText: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: '700',
        color: colors.text.muted,
        fontFamily: 'Inter-Bold',
    },
    revealCardAnswerText: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: '700',
        color: colors.gold[500],
        fontFamily: 'Inter-Bold',
        marginTop: spacing.xs,
    },
    revealCardLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        marginTop: spacing.xs,
    },

    // Predictions Section
    predictionsSection: {
        gap: spacing.sm,
    },
    predictionsSectionTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
        marginBottom: spacing.sm,
    },
    predictionCard: {
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    predictionCardExact: {
        borderColor: colors.gold[500] + '60',
        backgroundColor: colors.surface.goldSubtle,
    },
    predictionPlayerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    predictionAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.obsidian[600],
        alignItems: 'center',
        justifyContent: 'center',
    },
    predictionAvatarText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.text.secondary,
        fontFamily: 'Inter-Bold',
    },
    predictionPlayerName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        flex: 1,
    },
    predictionValues: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    predictionValueBox: {
        alignItems: 'center',
    },
    predictionValueLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    predictionValueText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
    },
    predictionActualText: {
        color: colors.gold[500],
    },
    predictionScoreBadge: {
        backgroundColor: colors.surface.glass,
        borderRadius: 10,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    predictionScoreBadgeExact: {
        backgroundColor: colors.surface.goldSubtle,
    },
    predictionScoreText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.text.secondary,
        fontFamily: 'Inter-Bold',
    },
    predictionScoreTextExact: {
        color: colors.gold[500],
    },

    // Status Bar
    statusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
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
    nextRoundHint: {
        backgroundColor: colors.surface.glass,
        borderRadius: 10,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    nextRoundText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        fontWeight: '500',
    },
});
