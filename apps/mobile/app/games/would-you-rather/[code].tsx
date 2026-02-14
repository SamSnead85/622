// ============================================
// Would You Rather — Multiplayer Party Game
// Pick a side, see who agrees, debate it out!
// ============================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    FadeInUp,
    FadeIn,
    FadeOut,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withSequence,
    withDelay,
    Easing,
    interpolate,
    runOnJS,
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
const VOTE_TIMER = 15; // seconds

// ============================================
// Countdown Timer Component
// ============================================

function CountdownTimer({ seconds, isActive }: { seconds: number; isActive: boolean }) {
    const [timeLeft, setTimeLeft] = useState(seconds);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const progress = useSharedValue(1);

    useEffect(() => {
        setTimeLeft(seconds);
        progress.value = 1;

        if (isActive) {
            progress.value = withTiming(0, { duration: seconds * 1000, easing: Easing.linear });

            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [seconds, isActive, progress]);

    const barStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
    }));

    const isUrgent = timeLeft <= 5;

    return (
        <Animated.View entering={FadeIn.duration(300)} style={styles.timerContainer}>
            <View style={styles.timerBarBg}>
                <Animated.View
                    style={[
                        styles.timerBarFill,
                        { backgroundColor: isUrgent ? colors.coral[500] : colors.gold[500] },
                        barStyle,
                    ]}
                />
            </View>
            <View style={styles.timerTextRow}>
                <Ionicons
                    name="timer-outline"
                    size={14}
                    color={isUrgent ? colors.coral[500] : colors.text.muted}
                />
                <Text
                    style={[
                        styles.timerText,
                        isUrgent && { color: colors.coral[500], fontWeight: '700' },
                    ]}
                >
                    {timeLeft}s
                </Text>
            </View>
        </Animated.View>
    );
}

// ============================================
// Option Card Component (A or B)
// ============================================

function OptionCard({
    label,
    optionText,
    isSelected,
    isRevealed,
    percent,
    voterCount,
    isMajority,
    disabled,
    onPress,
    index,
    voters,
}: {
    label: 'A' | 'B';
    optionText: string;
    isSelected: boolean;
    isRevealed: boolean;
    percent?: number;
    voterCount?: number;
    isMajority?: boolean;
    disabled: boolean;
    onPress: () => void;
    index: number;
    voters?: Array<{ id: string; name: string; avatarUrl?: string }>;
}) {
    const scale = useSharedValue(1);
    const fillWidth = useSharedValue(0);

    useEffect(() => {
        if (isRevealed && percent !== undefined) {
            fillWidth.value = withDelay(
                300,
                withTiming(percent, { duration: 800, easing: Easing.out(Easing.cubic) })
            );
        }
    }, [isRevealed, percent, fillWidth]);

    const animatedScale = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const fillStyle = useAnimatedStyle(() => ({
        width: `${fillWidth.value}%`,
    }));

    const handlePress = useCallback(() => {
        if (disabled) return;
        scale.value = withSequence(
            withSpring(0.95, { damping: 15 }),
            withSpring(1.02, { damping: 10 }),
            withSpring(1, { damping: 12 }),
        );
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
    }, [disabled, onPress, scale]);

    const gradientColors = label === 'A'
        ? [colors.azure[600] + '30', colors.azure[500] + '10']
        : [colors.coral[600] + '30', colors.coral[500] + '10'];

    const accentColor = label === 'A' ? colors.azure[500] : colors.coral[500];
    const selectedBorderColor = label === 'A' ? colors.azure[400] : colors.coral[400];

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 150 + 200).duration(500).springify()}
            style={[{ flex: 1 }, animatedScale]}
        >
            <TouchableOpacity
                style={[
                    styles.optionCard,
                    isSelected && { borderColor: selectedBorderColor, borderWidth: 2 },
                    isRevealed && isMajority && styles.optionCardMajority,
                ]}
                onPress={handlePress}
                disabled={disabled}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityLabel={`Option ${label}: ${optionText}`}
                accessibilityState={{ selected: isSelected, disabled }}
            >
                <LinearGradient
                    colors={isSelected ? [accentColor + '25', accentColor + '08'] : gradientColors as [string, string]}
                    style={styles.optionGradient}
                >
                    {/* Result fill bar (behind content) */}
                    {isRevealed && (
                        <Animated.View
                            style={[
                                styles.resultFill,
                                { backgroundColor: accentColor + '20' },
                                fillStyle,
                            ]}
                        />
                    )}

                    {/* Label badge */}
                    <View style={[styles.optionLabelBadge, { backgroundColor: accentColor + '30' }]}>
                        <Text style={[styles.optionLabel, { color: accentColor }]}>{label}</Text>
                    </View>

                    {/* Option text */}
                    <Text
                        style={[
                            styles.optionText,
                            isSelected && { color: accentColor },
                        ]}
                        numberOfLines={4}
                    >
                        {optionText}
                    </Text>

                    {/* Selected indicator */}
                    {isSelected && !isRevealed && (
                        <Animated.View entering={FadeIn.duration(200)} style={styles.selectedCheck}>
                            <Ionicons name="checkmark-circle" size={22} color={accentColor} />
                        </Animated.View>
                    )}

                    {/* Results overlay */}
                    {isRevealed && percent !== undefined && (
                        <Animated.View entering={FadeIn.delay(500).duration(400)} style={styles.resultOverlay}>
                            <Text style={[styles.resultPercent, { color: accentColor }]}>
                                {percent}%
                            </Text>
                            <Text style={styles.resultVoterCount}>
                                {voterCount} {voterCount === 1 ? 'vote' : 'votes'}
                            </Text>
                            {isMajority && (
                                <View style={[styles.majorityBadge, { backgroundColor: accentColor + '25' }]}>
                                    <Ionicons name="trophy" size={10} color={colors.gold[500]} />
                                    <Text style={styles.majorityText}>Majority</Text>
                                </View>
                            )}
                        </Animated.View>
                    )}
                </LinearGradient>
            </TouchableOpacity>

            {/* Voter avatars */}
            {isRevealed && voters && voters.length > 0 && (
                <Animated.View entering={FadeInUp.delay(800).duration(400)} style={styles.voterRow}>
                    {voters.slice(0, 6).map((voter, i) => (
                        <View key={voter.id} style={[styles.voterAvatar, { marginLeft: i > 0 ? -8 : 0 }]}>
                            {voter.avatarUrl ? (
                                <Image
                                    source={{ uri: voter.avatarUrl }}
                                    style={styles.voterAvatarImage}
                                    placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                                    transition={200}
                                    cachePolicy="memory-disk"
                                />
                            ) : (
                                <Text style={styles.voterAvatarText}>
                                    {voter.name?.charAt(0)?.toUpperCase() ?? '?'}
                                </Text>
                            )}
                        </View>
                    ))}
                    {voters.length > 6 && (
                        <View style={[styles.voterAvatar, { marginLeft: -8, backgroundColor: colors.obsidian[500] }]}>
                            <Text style={styles.voterAvatarText}>+{voters.length - 6}</Text>
                        </View>
                    )}
                </Animated.View>
            )}
        </Animated.View>
    );
}

// ============================================
// Score Popup Component
// ============================================

function ScorePopup({ points }: { points: number }) {
    if (points <= 0) return null;

    return (
        <Animated.View entering={FadeInUp.duration(500).springify()} style={styles.scorePopup}>
            <LinearGradient
                colors={[colors.gold[500] + '30', colors.gold[600] + '15']}
                style={styles.scorePopupGradient}
            >
                <Ionicons name="star" size={16} color={colors.gold[500]} />
                <Text style={styles.scorePopupText}>+{points}</Text>
            </LinearGradient>
        </Animated.View>
    );
}

// ============================================
// Main Would You Rather Screen
// ============================================

export default function WouldYouRatherScreen() {
    const router = useRouter();
    const { code } = useLocalSearchParams<{ code: string }>();
    const insets = useSafeAreaInsets();
    const gameStore = useGameStore();

    // Local state
    const [selectedOption, setSelectedOption] = useState<'A' | 'B' | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [roundKey, setRoundKey] = useState(0);
    const [roundPoints, setRoundPoints] = useState(0);

    // Derived data from game store
    const { gameData, players, round, totalRounds } = gameStore;
    const phase = (gameData?.phase as 'voting' | 'results' | 'debate' | 'waiting') ?? 'waiting';
    const currentPrompt = gameData?.currentPrompt as { optionA: string; optionB: string; category: string } | undefined;
    const roundResults = gameData?.roundResults as {
        optionA: string;
        optionB: string;
        votesA: Array<{ id: string; name: string; avatarUrl?: string }>;
        votesB: Array<{ id: string; name: string; avatarUrl?: string }>;
        percentA: number;
        percentB: number;
        majority: 'A' | 'B' | 'tie';
        scores: Record<string, number>;
    } | undefined;

    // My score
    const myPlayer = players.find((p) => p.id === gameStore.myPlayerId);
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
                setSelectedOption(null);
                setHasVoted(false);
                setRoundPoints(0);
                setRoundKey((k) => k + 1);
            }),
            socketManager.on('game:round-end', (data: Record<string, unknown>) => {
                gameStore.setRoundEnd(data);

                // Calculate my points for this round
                const myId = gameStore.myPlayerId;
                if (myId && data.scores?.[myId]) {
                    setRoundPoints(data.scores[myId]);
                }
            }),
            socketManager.on('game:ended', (data: Record<string, unknown>) => {
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

    // Reset when phase changes to voting
    useEffect(() => {
        if (phase === 'voting') {
            setSelectedOption(null);
            setHasVoted(false);
            setRoundPoints(0);
        }
    }, [phase]);

    // ============================================
    // Handlers
    // ============================================

    const handleVote = useCallback(
        (choice: 'A' | 'B') => {
            if (hasVoted) return;
            setSelectedOption(choice);
            setHasVoted(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            gameStore.sendAction('vote', { choice });
        },
        [hasVoted, gameStore],
    );

    const handleLeave = useCallback(() => {
        gameStore.leaveGame();
        router.replace('/games');
    }, [gameStore, router]);

    // ============================================
    // Loading State
    // ============================================

    if (!currentPrompt && phase === 'waiting') {
        return (
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={styles.gradient}
            >
                <LoadingView message="Getting ready..." />
            </LinearGradient>
        );
    }

    // ============================================
    // Category Badge
    // ============================================

    const categoryConfig: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
        funny: { icon: 'happy', color: colors.amber[500] },
        philosophical: { icon: 'bulb', color: colors.azure[400] },
        social: { icon: 'people', color: colors.emerald[500] },
        wild: { icon: 'flame', color: colors.coral[500] },
    };

    const category = (currentPrompt?.category as string) || 'wild';
    const catConfig = categoryConfig[category] || categoryConfig.wild;

    // ============================================
    // Determine display prompt (use results data if in results phase)
    // ============================================

    const displayOptionA = roundResults?.optionA ?? currentPrompt?.optionA ?? '';
    const displayOptionB = roundResults?.optionB ?? currentPrompt?.optionB ?? '';

    // ============================================
    // Render
    // ============================================

    return (
        <LinearGradient
            colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
            style={styles.gradient}
        >
            {/* ---- Top Bar ---- */}
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

            {/* ---- Title & Category ---- */}
            <Animated.View
                key={`header-${roundKey}`}
                entering={FadeInDown.delay(50).duration(400)}
                style={styles.headerSection}
            >
                <Text style={styles.gameTitle}>Would You Rather...</Text>
                <View style={[styles.categoryBadge, { backgroundColor: catConfig.color + '20' }]}>
                    <Ionicons name={catConfig.icon} size={12} color={catConfig.color} />
                    <Text style={[styles.categoryText, { color: catConfig.color }]}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                </View>
            </Animated.View>

            {/* ---- Timer (voting phase only) ---- */}
            {phase === 'voting' && (
                <CountdownTimer seconds={VOTE_TIMER} isActive={!hasVoted} />
            )}

            {/* ---- Option Cards ---- */}
            <View style={styles.optionsContainer} key={`options-${roundKey}`}>
                <OptionCard
                    label="A"
                    optionText={displayOptionA}
                    isSelected={selectedOption === 'A'}
                    isRevealed={phase === 'results'}
                    percent={roundResults?.percentA}
                    voterCount={roundResults?.votesA?.length}
                    isMajority={roundResults?.majority === 'A'}
                    disabled={hasVoted || phase !== 'voting'}
                    onPress={() => handleVote('A')}
                    index={0}
                    voters={roundResults?.votesA}
                />

                {/* VS Divider */}
                <Animated.View
                    entering={FadeIn.delay(400).duration(300)}
                    style={styles.vsDivider}
                >
                    <View style={styles.vsCircle}>
                        <Text style={styles.vsText}>VS</Text>
                    </View>
                </Animated.View>

                <OptionCard
                    label="B"
                    optionText={displayOptionB}
                    isSelected={selectedOption === 'B'}
                    isRevealed={phase === 'results'}
                    percent={roundResults?.percentB}
                    voterCount={roundResults?.votesB?.length}
                    isMajority={roundResults?.majority === 'B'}
                    disabled={hasVoted || phase !== 'voting'}
                    onPress={() => handleVote('B')}
                    index={1}
                    voters={roundResults?.votesB}
                />
            </View>

            {/* ---- Voted Confirmation ---- */}
            {hasVoted && phase === 'voting' && (
                <Animated.View entering={FadeInUp.duration(400)} style={styles.votedBanner}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.emerald[500]} />
                    <Text style={styles.votedText}>Vote locked in! Waiting for others...</Text>
                </Animated.View>
            )}

            {/* ---- Round Points Popup ---- */}
            {phase === 'results' && roundPoints > 0 && (
                <ScorePopup points={roundPoints} />
            )}

            {/* ---- Bottom Status ---- */}
            <View style={[styles.statusBar, { paddingBottom: insets.bottom + spacing.sm }]}>
                <View style={styles.playersIndicator}>
                    <Ionicons name="people-outline" size={14} color={colors.text.muted} />
                    <Text style={styles.playersCount}>
                        {players.filter((p) => p.isConnected).length} playing
                    </Text>
                </View>

                {phase === 'results' && (
                    <Animated.View entering={FadeIn.duration(300)} style={styles.nextRoundHint}>
                        <Text style={styles.nextRoundText}>Next round starting soon...</Text>
                    </Animated.View>
                )}

                {phase === 'voting' && !hasVoted && (
                    <Animated.View entering={FadeIn.duration(300)} style={styles.tapHint}>
                        <Text style={styles.tapHintText}>Tap to choose!</Text>
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

    // Header Section
    headerSection: {
        alignItems: 'center',
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
        gap: spacing.sm,
    },
    gameTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
        letterSpacing: -0.5,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 10,
    },
    categoryText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Timer
    timerContainer: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        gap: spacing.xs,
    },
    timerBarBg: {
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.surface.glass,
        overflow: 'hidden',
    },
    timerBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    timerTextRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    timerText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        fontWeight: '600',
    },

    // Options
    optionsContainer: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
        justifyContent: 'center',
    },
    optionCard: {
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
    },
    optionCardMajority: {
        borderColor: colors.gold[500] + '60',
    },
    optionGradient: {
        padding: spacing.xl,
        minHeight: 140,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    resultFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        borderRadius: 20,
    },
    optionLabelBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    optionLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '800',
        fontFamily: 'Inter-Bold',
    },
    optionText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
        textAlign: 'center',
        fontFamily: 'Inter-Bold',
        lineHeight: 26,
    },
    selectedCheck: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
    },

    // Results overlay
    resultOverlay: {
        marginTop: spacing.md,
        alignItems: 'center',
        gap: 4,
    },
    resultPercent: {
        fontSize: 28,
        fontWeight: '800',
        fontFamily: 'Inter-Bold',
    },
    resultVoterCount: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        fontWeight: '500',
    },
    majorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: 8,
        marginTop: 4,
    },
    majorityText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.gold[500],
        textTransform: 'uppercase',
    },

    // VS Divider
    vsDivider: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: -spacing.sm,
        zIndex: 10,
    },
    vsCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.obsidian[700],
        borderWidth: 2,
        borderColor: colors.border.subtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    vsText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '800',
        color: colors.text.secondary,
        fontFamily: 'Inter-Bold',
        letterSpacing: 1,
    },

    // Voter avatars
    voterRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    voterAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.obsidian[600],
        borderWidth: 2,
        borderColor: colors.obsidian[800],
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    voterAvatarImage: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    voterAvatarText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.text.secondary,
        fontFamily: 'Inter-Bold',
    },

    // Voted banner
    votedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        marginHorizontal: spacing.lg,
        backgroundColor: colors.surface.glass,
        borderRadius: 12,
    },
    votedText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.emerald[500],
    },

    // Score popup
    scorePopup: {
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    scorePopupGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 14,
    },
    scorePopupText: {
        fontSize: typography.fontSize.xl,
        fontWeight: '800',
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
    tapHint: {
        backgroundColor: colors.gold[500] + '15',
        borderRadius: 10,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    tapHintText: {
        fontSize: typography.fontSize.xs,
        color: colors.gold[500],
        fontWeight: '600',
    },
});
