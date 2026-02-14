// ============================================
// Two Truths & a Lie — Multiplayer Game Screen
// Storyteller writes 3 statements (2 truths, 1 lie)
// Other players guess which is the lie
// ============================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
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
    withDelay,
    withRepeat,
    runOnJS,
    Easing,
    interpolate,
    interpolateColor,
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
const GUESS_TIMER_SECONDS = 20;

// ============================================
// Timer Bar Component
// ============================================

function TimerBar({ durationMs, isActive }: { durationMs: number; isActive: boolean }) {
    const progress = useSharedValue(1);

    useEffect(() => {
        if (isActive) {
            progress.value = 1;
            progress.value = withTiming(0, {
                duration: durationMs,
                easing: Easing.linear,
            });
        } else {
            progress.value = 1;
        }
    }, [isActive, durationMs, progress]);

    const barStyle = useAnimatedStyle(() => {
        const bgColor = interpolateColor(
            progress.value,
            [0, 0.3, 1],
            [colors.coral[500], colors.amber[500], colors.emerald[500]],
        );
        return {
            width: `${progress.value * 100}%` as any,
            backgroundColor: bgColor,
        };
    });

    if (!isActive) return null;

    return (
        <Animated.View entering={FadeIn.duration(300)} style={styles.timerBarContainer}>
            <Animated.View style={[styles.timerBarFill, barStyle]} />
        </Animated.View>
    );
}

// ============================================
// Storyteller Spotlight Component
// ============================================

function StorytellerSpotlight({
    player,
    isMe,
    phase,
}: {
    player: { id: string; name: string; avatarUrl?: string };
    isMe: boolean;
    phase: string;
}) {
    const glowOpacity = useSharedValue(0.3);
    const pulseScale = useSharedValue(1);

    useEffect(() => {
        glowOpacity.value = withTiming(0.6, { duration: 1500 });
        pulseScale.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
        );
    }, [glowOpacity, pulseScale]);

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
        transform: [{ scale: pulseScale.value }],
    }));

    const phaseLabel =
        phase === 'storytelling'
            ? isMe
                ? 'Your turn to bluff!'
                : `${player.name} is writing...`
            : phase === 'guessing'
              ? 'Spot the lie!'
              : phase === 'reveal'
                ? 'The truth is out!'
                : 'Getting ready...';

    const phaseColor =
        phase === 'reveal'
            ? colors.gold[500]
            : phase === 'guessing'
              ? colors.coral[500]
              : colors.emerald[500];

    return (
        <Animated.View entering={FadeInDown.duration(500)} style={styles.spotlightContainer}>
            <Animated.View style={[styles.spotlightGlow, glowStyle]} />

            <View style={styles.spotlightAvatar}>
                <Text style={styles.spotlightAvatarText}>
                    {player.name?.charAt(0)?.toUpperCase() ?? '?'}
                </Text>
            </View>

            <Text style={styles.spotlightName}>
                {isMe ? 'You' : player.name}
            </Text>

            <View style={styles.spotlightPhaseChip}>
                <View style={[styles.spotlightPhaseDot, { backgroundColor: phaseColor }]} />
                <Text style={styles.spotlightPhaseText}>{phaseLabel}</Text>
            </View>
        </Animated.View>
    );
}

// ============================================
// Statement Input Card (Storyteller)
// ============================================

function StatementInput({
    index,
    value,
    onChangeText,
    isLie,
    onToggleLie,
    disabled,
}: {
    index: number;
    value: string;
    onChangeText: (text: string) => void;
    isLie: boolean;
    onToggleLie: () => void;
    disabled: boolean;
}) {
    const labels = ['Statement 1', 'Statement 2', 'Statement 3'];
    const borderColor = useSharedValue(0);

    useEffect(() => {
        borderColor.value = withTiming(isLie ? 1 : 0, { duration: 300 });
    }, [isLie, borderColor]);

    const animatedBorder = useAnimatedStyle(() => {
        const color = interpolateColor(
            borderColor.value,
            [0, 1],
            [colors.border.subtle, colors.coral[500]],
        );
        return { borderColor: color };
    });

    return (
        <Animated.View
            entering={FadeInDown.delay(100 + index * 100).duration(400)}
            style={styles.inputCardWrapper}
        >
            <Animated.View style={[styles.inputCard, animatedBorder]}>
                <View style={styles.inputHeader}>
                    <Text style={styles.inputLabel}>{labels[index]}</Text>
                    <TouchableOpacity
                        onPress={onToggleLie}
                        disabled={disabled}
                        style={[
                            styles.lieToggle,
                            isLie && styles.lieToggleActive,
                        ]}
                        accessibilityRole="checkbox"
                        accessibilityLabel={`Mark as lie`}
                        accessibilityState={{ checked: isLie }}
                    >
                        <Ionicons
                            name={isLie ? 'close-circle' : 'close-circle-outline'}
                            size={16}
                            color={isLie ? colors.coral[500] : colors.text.muted}
                        />
                        <Text
                            style={[
                                styles.lieToggleText,
                                isLie && styles.lieToggleTextActive,
                            ]}
                        >
                            {isLie ? 'THE LIE' : 'Lie?'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <TextInput
                    style={styles.statementInput}
                    placeholder="Write a statement..."
                    placeholderTextColor={colors.text.muted}
                    value={value}
                    onChangeText={onChangeText}
                    multiline
                    maxLength={200}
                    editable={!disabled}
                    accessibilityLabel={`${labels[index]} input`}
                />
            </Animated.View>
        </Animated.View>
    );
}

// ============================================
// Statement Card (Guessing Phase)
// ============================================

function StatementCard({
    statement,
    index,
    isSelected,
    isRevealed,
    isLie,
    correctGuess,
    onPress,
    disabled,
}: {
    statement: string;
    index: number;
    isSelected: boolean;
    isRevealed: boolean;
    isLie: boolean;
    correctGuess: boolean;
    onPress: () => void;
    disabled: boolean;
}) {
    const scale = useSharedValue(1);
    const revealProgress = useSharedValue(0);

    useEffect(() => {
        if (isRevealed) {
            revealProgress.value = withDelay(
                index * 200,
                withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
            );
        }
    }, [isRevealed, index, revealProgress]);

    const handlePress = useCallback(() => {
        if (disabled) return;
        scale.value = withSequence(
            withSpring(0.95, { damping: 15 }),
            withSpring(1, { damping: 10 }),
        );
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
    }, [disabled, onPress, scale]);

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const revealStyle = useAnimatedStyle(() => {
        if (!isRevealed) return {};
        const bgColor = isLie
            ? interpolateColor(revealProgress.value, [0, 1], ['transparent', colors.coral[500] + '15'])
            : interpolateColor(revealProgress.value, [0, 1], ['transparent', colors.emerald[500] + '10']);
        const bColor = isLie
            ? interpolateColor(revealProgress.value, [0, 1], [colors.border.subtle, colors.coral[500]])
            : interpolateColor(revealProgress.value, [0, 1], [colors.border.subtle, colors.emerald[500] + '60']);
        return {
            backgroundColor: bgColor,
            borderColor: bColor,
        };
    });

    const labels = ['A', 'B', 'C'];

    return (
        <Animated.View
            entering={FadeInDown.delay(100 + index * 120).duration(400)}
            style={cardStyle}
        >
            <TouchableOpacity
                onPress={handlePress}
                disabled={disabled}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityLabel={`Statement ${labels[index]}: ${statement}`}
                accessibilityState={{ selected: isSelected, disabled }}
            >
                <Animated.View
                    style={[
                        styles.guessCard,
                        isSelected && !isRevealed && styles.guessCardSelected,
                        revealStyle,
                    ]}
                >
                    {/* Label badge */}
                    <View style={styles.guessCardHeader}>
                        <View
                            style={[
                                styles.guessLabelBadge,
                                isSelected && !isRevealed && styles.guessLabelBadgeSelected,
                                isRevealed && isLie && styles.guessLabelBadgeLie,
                                isRevealed && !isLie && styles.guessLabelBadgeTruth,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.guessLabelText,
                                    isSelected && !isRevealed && styles.guessLabelTextSelected,
                                    isRevealed && isLie && styles.guessLabelTextLie,
                                    isRevealed && !isLie && styles.guessLabelTextTruth,
                                ]}
                            >
                                {labels[index]}
                            </Text>
                        </View>

                        {/* Reveal icons */}
                        {isRevealed && isLie && (
                            <Animated.View entering={FadeIn.delay(400 + index * 200).duration(300)}>
                                <View style={styles.revealBadgeLie}>
                                    <Ionicons name="close-circle" size={16} color={colors.coral[500]} />
                                    <Text style={styles.revealBadgeLieText}>LIE</Text>
                                </View>
                            </Animated.View>
                        )}
                        {isRevealed && !isLie && (
                            <Animated.View entering={FadeIn.delay(400 + index * 200).duration(300)}>
                                <View style={styles.revealBadgeTruth}>
                                    <Ionicons name="checkmark-circle" size={16} color={colors.emerald[500]} />
                                    <Text style={styles.revealBadgeTruthText}>TRUTH</Text>
                                </View>
                            </Animated.View>
                        )}
                    </View>

                    {/* Statement text */}
                    <Text style={styles.guessCardText}>{statement}</Text>

                    {/* Selection indicator */}
                    {isSelected && !isRevealed && (
                        <Animated.View entering={FadeIn.duration(200)} style={styles.selectedIndicator}>
                            <Ionicons name="hand-left" size={14} color={colors.gold[500]} />
                            <Text style={styles.selectedIndicatorText}>Your guess</Text>
                        </Animated.View>
                    )}

                    {/* Correct guess feedback */}
                    {isRevealed && isSelected && correctGuess && (
                        <Animated.View entering={FadeIn.delay(600).duration(300)} style={styles.correctGuessBadge}>
                            <Ionicons name="star" size={14} color={colors.gold[500]} />
                            <Text style={styles.correctGuessText}>+15 pts</Text>
                        </Animated.View>
                    )}
                    {isRevealed && isSelected && !correctGuess && (
                        <Animated.View entering={FadeIn.delay(600).duration(300)} style={styles.wrongGuessBadge}>
                            <Ionicons name="close" size={14} color={colors.coral[400]} />
                            <Text style={styles.wrongGuessText}>Wrong</Text>
                        </Animated.View>
                    )}
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ============================================
// Results Card (Reveal Phase)
// ============================================

function GuessResultCard({
    playerName,
    guessIndex,
    lieIndex,
    index,
}: {
    playerName: string;
    guessIndex: number;
    lieIndex: number;
    index: number;
}) {
    const isCorrect = guessIndex === lieIndex;
    const labels = ['A', 'B', 'C'];

    return (
        <Animated.View entering={FadeInDown.delay(600 + index * 100).duration(400)}>
            <View style={[styles.resultCard, isCorrect && styles.resultCardCorrect]}>
                <View style={styles.resultPlayerRow}>
                    <View style={styles.resultAvatar}>
                        <Text style={styles.resultAvatarText}>
                            {playerName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.resultPlayerName} numberOfLines={1}>
                        {playerName}
                    </Text>
                </View>

                <View style={styles.resultGuessRow}>
                    <Text style={styles.resultGuessLabel}>Guessed</Text>
                    <View
                        style={[
                            styles.resultGuessBadge,
                            isCorrect ? styles.resultGuessBadgeCorrect : styles.resultGuessBadgeWrong,
                        ]}
                    >
                        <Text
                            style={[
                                styles.resultGuessValue,
                                isCorrect ? styles.resultGuessValueCorrect : styles.resultGuessValueWrong,
                            ]}
                        >
                            {labels[guessIndex]}
                        </Text>
                    </View>
                    <Ionicons
                        name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                        size={18}
                        color={isCorrect ? colors.emerald[500] : colors.coral[400]}
                    />
                </View>

                {isCorrect && (
                    <View style={styles.resultScoreBadge}>
                        <Ionicons name="star" size={12} color={colors.gold[500]} />
                        <Text style={styles.resultScoreText}>+15</Text>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============================================
// Main Two Truths Screen
// ============================================

export default function TwoTruthsScreen() {
    const router = useRouter();
    const { code } = useLocalSearchParams<{ code: string }>();
    const insets = useSafeAreaInsets();
    const gameStore = useGameStore();

    // Storyteller input state
    const [statements, setStatements] = useState<[string, string, string]>(['', '', '']);
    const [lieIndex, setLieIndex] = useState<number | null>(null);
    const [hasSubmittedStatements, setHasSubmittedStatements] = useState(false);

    // Guesser state
    const [selectedGuess, setSelectedGuess] = useState<number | null>(null);
    const [hasGuessed, setHasGuessed] = useState(false);

    // Phase key for re-mounting animations on round change
    const [phaseKey, setPhaseKey] = useState(0);

    // Derived data from game store
    const { gameData, players, round, totalRounds } = gameStore;
    const phase = (gameData?.phase as 'waiting' | 'storytelling' | 'guessing' | 'reveal') ?? 'waiting';
    const storytellerId = gameData?.storytellerId as string | undefined;
    const serverStatements = gameData?.statements as [string, string, string] | null | undefined;
    const revealData = gameData?.revealData as {
        lieIndex: number;
        correctGuessers: string[];
        storytellerBonus: boolean;
    } | null | undefined;
    const guesses = (gameData?.guesses as Record<string, number>) ?? {};
    const myPrivateData = gameData?.myData as { isStoryteller?: boolean; suggestedSet?: { statements: [string, string, string]; lieIndex: number } } | undefined;

    // Am I the storyteller?
    const isStoryteller = storytellerId === gameStore.myPlayerId;

    // Storyteller player info
    const storytellerPlayer = players.find(p => p.id === storytellerId);

    // My score
    const myPlayer = players.find(p => p.id === gameStore.myPlayerId);
    const myScore = myPlayer?.score ?? 0;

    // ============================================
    // Socket Listeners
    // ============================================

    useEffect(() => {
        const unsubs = [
            socketManager.on('game:update', (data: Record<string, unknown>) => {
                gameStore.updateFromDelta(data);
            }),
            socketManager.on('game:round-start', (_data: Record<string, unknown>) => {
                // New round — reset local state
                setStatements(['', '', '']);
                setLieIndex(null);
                setHasSubmittedStatements(false);
                setSelectedGuess(null);
                setHasGuessed(false);
                setPhaseKey(k => k + 1);
            }),
            socketManager.on('game:round-end', (data: Record<string, unknown>) => {
                gameStore.setRoundEnd(data);
            }),
            socketManager.on('game:ended', (data: Record<string, unknown>) => {
                gameStore.setGameEnded(data);
                router.replace(`/games/results/${code}`);
            }),
            socketManager.on('game:error', (data: { message: string }) => {
                gameStore.setError(data.message);
            }),
        ];

        return () => unsubs.forEach(fn => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code]);

    // Reset local state when phase changes
    useEffect(() => {
        if (phase === 'storytelling') {
            setSelectedGuess(null);
            setHasGuessed(false);
        }
        if (phase === 'guessing') {
            setHasSubmittedStatements(true);
        }
    }, [phase]);

    // ============================================
    // Handlers
    // ============================================

    const updateStatement = useCallback((index: number, text: string) => {
        setStatements(prev => {
            const next = [...prev] as [string, string, string];
            next[index] = text;
            return next;
        });
    }, []);

    const toggleLie = useCallback((index: number) => {
        setLieIndex(prev => (prev === index ? null : index));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const handleSubmitStatements = useCallback(() => {
        if (lieIndex === null) return;
        if (statements.some(s => s.trim().length === 0)) return;
        if (hasSubmittedStatements) return;

        setHasSubmittedStatements(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        gameStore.sendAction('truths:submit', {
            statements: statements.map(s => s.trim()),
            lieIndex,
        });
    }, [statements, lieIndex, hasSubmittedStatements, gameStore]);

    const handleUseRandomPrompt = useCallback(() => {
        if (!myPrivateData?.suggestedSet) return;
        const set = myPrivateData.suggestedSet;
        setStatements([...set.statements]);
        setLieIndex(set.lieIndex);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [myPrivateData]);

    const handleGuess = useCallback((index: number) => {
        if (hasGuessed) return;
        setSelectedGuess(index);
        setHasGuessed(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        gameStore.sendAction('truths:guess', { guessIndex: index });
    }, [hasGuessed, gameStore]);

    const handleLeave = useCallback(() => {
        gameStore.leaveGame();
        router.replace('/games');
    }, [gameStore, router]);

    // ============================================
    // Derived: can submit?
    // ============================================

    const canSubmit =
        lieIndex !== null &&
        statements.every(s => s.trim().length > 0) &&
        !hasSubmittedStatements;

    // ============================================
    // Loading State
    // ============================================

    if (!storytellerPlayer) {
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
    // Render Phase Content
    // ============================================

    const renderPhaseContent = () => {
        // ---- STORYTELLING PHASE ----
        if (phase === 'storytelling') {
            if (isStoryteller) {
                return (
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.phaseContent}
                        keyboardVerticalOffset={120}
                    >
                        <ScrollView
                            style={styles.storytellerScroll}
                            contentContainerStyle={styles.storytellerScrollContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <Animated.View
                                key={`storytelling-me-${phaseKey}`}
                                entering={FadeIn.duration(400)}
                            >
                                <Text style={styles.phaseInstruction}>
                                    Write 2 truths and 1 lie
                                </Text>
                                <Text style={styles.phaseSubInstruction}>
                                    Mark which one is the lie, then submit
                                </Text>

                                {/* Statement inputs */}
                                {[0, 1, 2].map(i => (
                                    <StatementInput
                                        key={i}
                                        index={i}
                                        value={statements[i]}
                                        onChangeText={text => updateStatement(i, text)}
                                        isLie={lieIndex === i}
                                        onToggleLie={() => toggleLie(i)}
                                        disabled={hasSubmittedStatements}
                                    />
                                ))}

                                {/* Random prompt button */}
                                {myPrivateData?.suggestedSet && !hasSubmittedStatements && (
                                    <Animated.View entering={FadeInDown.delay(400).duration(400)}>
                                        <TouchableOpacity
                                            style={styles.randomPromptButton}
                                            onPress={handleUseRandomPrompt}
                                            activeOpacity={0.7}
                                            accessibilityRole="button"
                                            accessibilityLabel="Use random prompt"
                                        >
                                            <Ionicons name="shuffle" size={18} color={colors.gold[500]} />
                                            <Text style={styles.randomPromptText}>Use random prompt</Text>
                                        </TouchableOpacity>
                                    </Animated.View>
                                )}

                                {/* Submit button */}
                                <Animated.View entering={FadeInDown.delay(500).duration(400)}>
                                    <TouchableOpacity
                                        style={[
                                            styles.submitButton,
                                            !canSubmit && styles.submitButtonDisabled,
                                        ]}
                                        onPress={handleSubmitStatements}
                                        disabled={!canSubmit}
                                        activeOpacity={0.8}
                                        accessibilityRole="button"
                                        accessibilityLabel="Submit statements"
                                    >
                                        <LinearGradient
                                            colors={
                                                canSubmit
                                                    ? [colors.gold[500], colors.gold[400]]
                                                    : [colors.obsidian[600], colors.obsidian[500]]
                                            }
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.submitButtonGradient}
                                        >
                                            <Ionicons
                                                name="send"
                                                size={18}
                                                color={canSubmit ? colors.text.primary : colors.text.muted}
                                            />
                                            <Text
                                                style={[
                                                    styles.submitButtonText,
                                                    !canSubmit && styles.submitButtonTextDisabled,
                                                ]}
                                            >
                                                {hasSubmittedStatements ? 'Submitted!' : 'Submit'}
                                            </Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </Animated.View>

                                {hasSubmittedStatements && (
                                    <Animated.View entering={FadeIn.duration(300)} style={styles.submittedBadge}>
                                        <Ionicons name="checkmark-circle" size={18} color={colors.emerald[500]} />
                                        <Text style={styles.submittedText}>Statements locked in!</Text>
                                    </Animated.View>
                                )}

                                {/* Hint about lie selection */}
                                {lieIndex === null && !hasSubmittedStatements && (
                                    <Animated.View entering={FadeIn.delay(600).duration(300)} style={styles.hintBadge}>
                                        <Ionicons name="information-circle-outline" size={16} color={colors.amber[400]} />
                                        <Text style={styles.hintText}>
                                            Tap "Lie?" to mark which statement is the lie
                                        </Text>
                                    </Animated.View>
                                )}
                            </Animated.View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                );
            }

            // Others waiting for storyteller
            return (
                <Animated.View
                    key={`storytelling-waiting-${phaseKey}`}
                    entering={FadeIn.duration(400)}
                    style={styles.phaseContent}
                >
                    <View style={styles.waitingContainer}>
                        <Animated.View
                            entering={FadeInDown.delay(100).duration(400)}
                            style={styles.waitingIconContainer}
                        >
                            <Ionicons name="create-outline" size={48} color={colors.gold[500]} />
                        </Animated.View>
                        <Text style={styles.waitingTitle}>
                            {storytellerPlayer.name} is writing...
                        </Text>
                        <Text style={styles.waitingSubtitle}>
                            Get ready to spot the lie!
                        </Text>
                    </View>
                </Animated.View>
            );
        }

        // ---- GUESSING PHASE ----
        if (phase === 'guessing') {
            if (isStoryteller) {
                // Storyteller waits while others guess
                return (
                    <Animated.View
                        key={`guessing-storyteller-${phaseKey}`}
                        entering={FadeIn.duration(400)}
                        style={styles.phaseContent}
                    >
                        <View style={styles.waitingContainer}>
                            <Animated.View
                                entering={FadeInDown.delay(100).duration(400)}
                                style={styles.waitingIconContainer}
                            >
                                <Ionicons name="people" size={48} color={colors.gold[500]} />
                            </Animated.View>
                            <Text style={styles.waitingTitle}>Others are guessing...</Text>
                            <Text style={styles.waitingSubtitle}>
                                Will they spot your lie?
                            </Text>
                        </View>
                    </Animated.View>
                );
            }

            // Guessers see the 3 statement cards
            return (
                <ScrollView
                    key={`guessing-${phaseKey}`}
                    style={styles.guessingScroll}
                    contentContainerStyle={styles.guessingScrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View entering={FadeIn.duration(400)}>
                        <Text style={styles.phaseInstruction}>
                            Which one is the lie?
                        </Text>

                        {serverStatements?.map((statement, index) => (
                            <StatementCard
                                key={index}
                                statement={statement}
                                index={index}
                                isSelected={selectedGuess === index}
                                isRevealed={false}
                                isLie={false}
                                correctGuess={false}
                                onPress={() => handleGuess(index)}
                                disabled={hasGuessed}
                            />
                        ))}

                        {hasGuessed && (
                            <Animated.View entering={FadeIn.duration(300)} style={styles.submittedBadge}>
                                <Ionicons name="checkmark-circle" size={18} color={colors.emerald[500]} />
                                <Text style={styles.submittedText}>Guess locked in!</Text>
                            </Animated.View>
                        )}
                    </Animated.View>
                </ScrollView>
            );
        }

        // ---- REVEAL PHASE ----
        if (phase === 'reveal' && revealData && serverStatements) {
            const actualLieIndex = revealData.lieIndex;
            const myGuessCorrect = selectedGuess === actualLieIndex;

            return (
                <ScrollView
                    key={`reveal-${phaseKey}`}
                    style={styles.revealScroll}
                    contentContainerStyle={styles.revealScrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Reveal the statements with truth/lie labels */}
                    <Animated.View entering={FadeIn.duration(400)}>
                        <Text style={styles.phaseInstruction}>The lie was...</Text>

                        {serverStatements.map((statement, index) => (
                            <StatementCard
                                key={index}
                                statement={statement}
                                index={index}
                                isSelected={selectedGuess === index}
                                isRevealed={true}
                                isLie={index === actualLieIndex}
                                correctGuess={selectedGuess === index && index === actualLieIndex}
                                onPress={() => {}}
                                disabled={true}
                            />
                        ))}
                    </Animated.View>

                    {/* Storyteller bonus */}
                    {revealData.storytellerBonus && (
                        <Animated.View
                            entering={FadeInDown.delay(800).duration(400)}
                            style={styles.storytellerBonusCard}
                        >
                            <LinearGradient
                                colors={[colors.gold[500] + '15', colors.gold[500] + '05']}
                                style={styles.storytellerBonusGradient}
                            >
                                <Ionicons name="trophy" size={20} color={colors.gold[500]} />
                                <View>
                                    <Text style={styles.storytellerBonusTitle}>
                                        Great bluff, {storytellerPlayer?.name}!
                                    </Text>
                                    <Text style={styles.storytellerBonusSubtitle}>
                                        Most players guessed wrong — +10 bonus
                                    </Text>
                                </View>
                            </LinearGradient>
                        </Animated.View>
                    )}

                    {/* Guesses breakdown */}
                    <Animated.View
                        entering={FadeIn.delay(500).duration(300)}
                        style={styles.guessesSection}
                    >
                        <Text style={styles.guessesSectionTitle}>Guesses</Text>

                        {players
                            .filter(p => p.id !== storytellerId && guesses[p.id] !== undefined)
                            .map((player, index) => (
                                <GuessResultCard
                                    key={player.id}
                                    playerName={player.name}
                                    guessIndex={guesses[player.id]}
                                    lieIndex={actualLieIndex}
                                    index={index}
                                />
                            ))}
                    </Animated.View>
                </ScrollView>
            );
        }

        return null;
    };

    // ============================================
    // Main Render
    // ============================================

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

                <View style={styles.roundBadge}>
                    <Text style={styles.roundText}>
                        Round {round}/{totalRounds}
                    </Text>
                </View>

                <View style={styles.scoreContainer}>
                    <Ionicons name="star" size={14} color={colors.gold[500]} />
                    <Text style={styles.scoreText}>{myScore}</Text>
                </View>
            </View>

            {/* Timer bar for guessing phase */}
            <TimerBar
                durationMs={GUESS_TIMER_SECONDS * 1000}
                isActive={phase === 'guessing' && !isStoryteller && !hasGuessed}
            />

            {/* Storyteller Spotlight */}
            <StorytellerSpotlight
                player={storytellerPlayer}
                isMe={isStoryteller}
                phase={phase}
            />

            {/* Phase Content */}
            <View style={styles.contentArea}>
                {renderPhaseContent()}
            </View>

            {/* Bottom status */}
            <View style={[styles.statusBar, { paddingBottom: insets.bottom + spacing.sm }]}>
                <View style={styles.playersIndicator}>
                    <Ionicons name="people-outline" size={14} color={colors.text.muted} />
                    <Text style={styles.playersCount}>
                        {players.filter(p => p.isConnected).length} playing
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

    // Timer Bar
    timerBarContainer: {
        height: 3,
        backgroundColor: colors.obsidian[700],
        marginHorizontal: spacing.lg,
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: spacing.xs,
    },
    timerBarFill: {
        height: '100%',
        borderRadius: 2,
    },

    // Storyteller Spotlight
    spotlightContainer: {
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    spotlightGlow: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.coral[500],
        top: spacing.xs,
    },
    spotlightAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.obsidian[600],
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.coral[500],
    },
    spotlightAvatarText: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        color: colors.coral[400],
        fontFamily: 'Inter-Bold',
    },
    spotlightName: {
        fontSize: typography.fontSize.lg,
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

    // Phase Content
    contentArea: {
        flex: 1,
    },
    phaseContent: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },
    phaseInstruction: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.xs,
        fontFamily: 'Inter-Bold',
    },
    phaseSubInstruction: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },

    // Storyteller Scroll
    storytellerScroll: {
        flex: 1,
    },
    storytellerScrollContent: {
        paddingBottom: spacing.xl,
    },

    // Statement Input
    inputCardWrapper: {
        marginBottom: spacing.md,
    },
    inputCard: {
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        padding: spacing.md,
    },
    inputHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    inputLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.text.secondary,
        fontFamily: 'Inter-Bold',
    },
    lieToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 8,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    lieToggleActive: {
        backgroundColor: colors.coral[500] + '15',
        borderColor: colors.coral[500] + '40',
    },
    lieToggleText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
    },
    lieToggleTextActive: {
        color: colors.coral[500],
        fontWeight: '700',
    },
    statementInput: {
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        minHeight: 44,
        textAlignVertical: 'top',
    },

    // Random Prompt Button
    randomPromptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface.goldSubtle,
        borderRadius: 12,
        paddingVertical: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
    },
    randomPromptText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.gold[500],
    },

    // Submit Button
    submitButton: {
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md + 2,
        borderRadius: 14,
    },
    submitButtonText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
    },
    submitButtonTextDisabled: {
        color: colors.text.muted,
    },

    // Submitted badge
    submittedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        marginTop: spacing.md,
        backgroundColor: colors.surface.glass,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 12,
        alignSelf: 'center',
    },
    submittedText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.emerald[500],
    },

    // Hint badge
    hintBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        marginTop: spacing.sm,
        backgroundColor: colors.amber[500] + '10',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.amber[500] + '20',
        alignSelf: 'center',
    },
    hintText: {
        fontSize: typography.fontSize.xs,
        color: colors.amber[400],
        fontWeight: '500',
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

    // Guessing scroll
    guessingScroll: {
        flex: 1,
    },
    guessingScrollContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
    },

    // Guess Card
    guessCard: {
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: colors.border.subtle,
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    guessCardSelected: {
        borderColor: colors.gold[500],
        backgroundColor: colors.surface.goldSubtle,
    },
    guessCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    guessLabelBadge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: colors.obsidian[700],
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    guessLabelBadgeSelected: {
        backgroundColor: colors.gold[500] + '20',
        borderColor: colors.gold[500],
    },
    guessLabelBadgeLie: {
        backgroundColor: colors.coral[500] + '20',
        borderColor: colors.coral[500],
    },
    guessLabelBadgeTruth: {
        backgroundColor: colors.emerald[500] + '15',
        borderColor: colors.emerald[500] + '60',
    },
    guessLabelText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.text.muted,
        fontFamily: 'Inter-Bold',
    },
    guessLabelTextSelected: {
        color: colors.gold[500],
    },
    guessLabelTextLie: {
        color: colors.coral[500],
    },
    guessLabelTextTruth: {
        color: colors.emerald[500],
    },
    guessCardText: {
        fontSize: typography.fontSize.base,
        fontWeight: '500',
        color: colors.text.primary,
        lineHeight: 24,
    },

    // Reveal badges on cards
    revealBadgeLie: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.coral[500] + '15',
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: 8,
    },
    revealBadgeLieText: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.coral[500],
        letterSpacing: 1,
    },
    revealBadgeTruth: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.emerald[500] + '15',
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: 8,
    },
    revealBadgeTruthText: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.emerald[500],
        letterSpacing: 1,
    },

    // Selection indicator
    selectedIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.sm,
    },
    selectedIndicatorText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.gold[500],
    },

    // Correct/wrong guess badges
    correctGuessBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.sm,
        backgroundColor: colors.gold[500] + '15',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    correctGuessText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.gold[500],
    },
    wrongGuessBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.sm,
        backgroundColor: colors.coral[500] + '10',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    wrongGuessText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.coral[400],
    },

    // Reveal scroll
    revealScroll: {
        flex: 1,
    },
    revealScrollContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
    },

    // Storyteller bonus card
    storytellerBonusCard: {
        marginTop: spacing.lg,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
    },
    storytellerBonusGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
    },
    storytellerBonusTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.gold[500],
        fontFamily: 'Inter-Bold',
    },
    storytellerBonusSubtitle: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        marginTop: 2,
    },

    // Guesses section
    guessesSection: {
        marginTop: spacing.xl,
        gap: spacing.sm,
    },
    guessesSectionTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
        marginBottom: spacing.sm,
    },

    // Result card
    resultCard: {
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    resultCardCorrect: {
        borderColor: colors.emerald[500] + '40',
        backgroundColor: colors.emerald[500] + '08',
    },
    resultPlayerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    resultAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.obsidian[600],
        alignItems: 'center',
        justifyContent: 'center',
    },
    resultAvatarText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.text.secondary,
        fontFamily: 'Inter-Bold',
    },
    resultPlayerName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        flex: 1,
    },
    resultGuessRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    resultGuessLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
    },
    resultGuessBadge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resultGuessBadgeCorrect: {
        backgroundColor: colors.emerald[500] + '20',
    },
    resultGuessBadgeWrong: {
        backgroundColor: colors.coral[500] + '15',
    },
    resultGuessValue: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },
    resultGuessValueCorrect: {
        color: colors.emerald[500],
    },
    resultGuessValueWrong: {
        color: colors.coral[400],
    },
    resultScoreBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: colors.gold[500] + '15',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 8,
        marginLeft: spacing.sm,
    },
    resultScoreText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.gold[500],
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
