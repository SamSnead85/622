// ============================================
// Game Results — Post-game podium & rankings
// Shows winner celebration, full leaderboard
// ============================================

import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Share,
    Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    FadeInDown,
    FadeInUp,
    FadeIn,
    ZoomIn,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
    withSpring,
    withSequence,
    Easing,
    interpolate,
    SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';
import { ScreenHeader, GlassCard, Avatar } from '../../../components';
import { useGameStore } from '../../../stores';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// Confetti Particle
// ============================================

const CONFETTI_COLORS = [
    colors.gold[400],
    colors.gold[500],
    colors.amber[400],
    colors.emerald[400],
    colors.azure[400],
    colors.coral[400],
];

function ConfettiParticle({ index }: { index: number }) {
    const translateY = useSharedValue(-20);
    const translateX = useSharedValue(0);
    const rotate = useSharedValue(0);
    const opacity = useSharedValue(1);

    const startX = useMemo(() => Math.random() * SCREEN_WIDTH, []);
    const size = useMemo(() => 4 + Math.random() * 6, []);
    const colorIndex = useMemo(() => index % CONFETTI_COLORS.length, [index]);
    const delay = useMemo(() => Math.random() * 2000, []);

    useEffect(() => {
        translateY.value = withDelay(
            delay,
            withRepeat(
                withTiming(SCREEN_WIDTH * 1.5, {
                    duration: 3000 + Math.random() * 2000,
                    easing: Easing.linear,
                }),
                -1,
                false,
            ),
        );
        translateX.value = withDelay(
            delay,
            withRepeat(
                withSequence(
                    withTiming(30, { duration: 800, easing: Easing.inOut(Easing.sin) }),
                    withTiming(-30, { duration: 800, easing: Easing.inOut(Easing.sin) }),
                ),
                -1,
                true,
            ),
        );
        rotate.value = withDelay(
            delay,
            withRepeat(
                withTiming(360, { duration: 2000, easing: Easing.linear }),
                -1,
                false,
            ),
        );
        opacity.value = withDelay(delay, withTiming(0.7, { duration: 500 }));
    }, []);

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
                    left: startX,
                    top: -20,
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: CONFETTI_COLORS[colorIndex],
                },
                animatedStyle,
            ]}
            pointerEvents="none"
        />
    );
}

// ============================================
// Podium Place Card
// ============================================

interface PodiumCardProps {
    player: {
        id: string;
        name: string;
        avatarUrl?: string;
        score: number;
    };
    rank: number;
}

const PODIUM_CONFIG = {
    1: {
        height: 140,
        color: colors.gold[500],
        borderColor: colors.gold[500],
        bgColor: colors.gold[500] + '12',
        icon: 'trophy' as const,
        iconColor: colors.gold[400],
        label: '1st',
        avatarSize: 'xl' as const,
        delay: 300,
    },
    2: {
        height: 110,
        color: colors.text.muted,
        borderColor: colors.text.muted,
        bgColor: colors.text.muted + '14',
        icon: 'medal-outline' as const,
        iconColor: colors.text.muted,
        label: '2nd',
        avatarSize: 'lg' as const,
        delay: 450,
    },
    3: {
        height: 90,
        color: colors.amber[600],
        borderColor: colors.amber[600],
        bgColor: colors.amber[600] + '14',
        icon: 'medal-outline' as const,
        iconColor: colors.amber[600],
        label: '3rd',
        avatarSize: 'lg' as const,
        delay: 600,
    },
} as const;

function PodiumCard({ player, rank }: PodiumCardProps) {
    const config = PODIUM_CONFIG[rank as keyof typeof PODIUM_CONFIG];
    if (!config) return null;

    const isFirst = rank === 1;

    return (
        <Animated.View
            entering={FadeInUp.delay(config.delay).duration(600).springify()}
            style={[
                styles.podiumCard,
                {
                    minHeight: config.height,
                    borderColor: config.borderColor + '30',
                    backgroundColor: config.bgColor,
                },
                isFirst && styles.podiumCardFirst,
            ]}
        >
            {isFirst && (
                <View style={styles.crownContainer}>
                    <Ionicons name="trophy" size={24} color={colors.gold[400]} />
                </View>
            )}

            <Avatar
                uri={player.avatarUrl}
                name={player.name}
                size={config.avatarSize}
                glow={isFirst}
                borderColor={config.color}
                borderWidth={2}
            />

            <Text style={[styles.podiumName, { color: config.color }]} numberOfLines={1}>
                {player.name}
            </Text>

            <View style={styles.podiumScoreContainer}>
                <Text style={[styles.podiumScore, { color: config.color }]}>
                    {player.score.toLocaleString()}
                </Text>
                <Text style={styles.podiumScoreLabel}>pts</Text>
            </View>

            <View style={[styles.rankBadge, { backgroundColor: config.color + '20' }]}>
                <Text style={[styles.rankBadgeText, { color: config.color }]}>{config.label}</Text>
            </View>
        </Animated.View>
    );
}

// ============================================
// Ranking Row
// ============================================

interface RankingRowProps {
    player: {
        id: string;
        name: string;
        avatarUrl?: string;
        score: number;
    };
    rank: number;
    index: number;
}

function RankingRow({ player, rank, index }: RankingRowProps) {
    return (
        <Animated.View entering={FadeInDown.delay(700 + index * 60).duration(400)}>
            <GlassCard style={styles.rankingRow} padding="sm">
                <View style={styles.rankingLeft}>
                    <View style={styles.rankCircle}>
                        <Text style={styles.rankText}>{rank}</Text>
                    </View>
                    <Avatar
                        uri={player.avatarUrl}
                        name={player.name}
                        size="sm"
                    />
                    <Text style={styles.rankingName} numberOfLines={1}>{player.name}</Text>
                </View>
                <Text style={styles.rankingScore}>{player.score.toLocaleString()}</Text>
            </GlassCard>
        </Animated.View>
    );
}

// ============================================
// Results Screen
// ============================================

export default function ResultsScreen() {
    const router = useRouter();
    const { code } = useLocalSearchParams<{ code: string }>();
    const gameStore = useGameStore();

    const { players, gameType } = gameStore;

    // Sort players by score descending
    const sortedPlayers = useMemo(
        () => [...players].sort((a, b) => b.score - a.score),
        [players],
    );

    const podiumPlayers = sortedPlayers.slice(0, 3);
    const remainingPlayers = sortedPlayers.slice(3);

    // Trigger haptic on mount
    useEffect(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, []);

    // ---- Play Again ----
    const handlePlayAgain = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const type = gameType || 'trivia';
        const newCode = await gameStore.createGame(type);
        if (newCode) {
            router.replace(`/games/lobby/${newCode}` as any);
        }
    }, [gameType, gameStore, router]);

    // ---- New Game (back to hub) ----
    const handleNewGame = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        gameStore.reset();
        router.replace('/games' as any);
    }, [gameStore, router]);

    // ---- Share Results ----
    const handleShareResults = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const lines = sortedPlayers
            .slice(0, 5)
            .map((p, i) => `${i + 1}. ${p.name}: ${p.score} pts`);
        const text = `0G Arena Results\n\n${lines.join('\n')}\n\nPlay on 0G!`;
        try {
            await Share.share({ message: text });
        } catch {
            // User cancelled
        }
    }, [sortedPlayers]);

    // Podium layout: 2nd, 1st, 3rd
    const podiumOrder = useMemo(() => {
        const ordered: { player: typeof podiumPlayers[number]; rank: number }[] = [];
        if (podiumPlayers[1]) ordered.push({ player: podiumPlayers[1], rank: 2 });
        if (podiumPlayers[0]) ordered.push({ player: podiumPlayers[0], rank: 1 });
        if (podiumPlayers[2]) ordered.push({ player: podiumPlayers[2], rank: 3 });
        return ordered;
    }, [podiumPlayers]);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
                style={StyleSheet.absoluteFill}
            />

            {/* Confetti */}
            <View style={styles.confettiContainer} pointerEvents="none">
                {Array.from({ length: 30 }).map((_, i) => (
                    <ConfettiParticle key={i} index={i} />
                ))}
            </View>

            <ScreenHeader title="Results" showBack={false} noBorder />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ---- Winner Announcement ---- */}
                {sortedPlayers[0] && (
                    <Animated.View
                        entering={FadeIn.delay(100).duration(600)}
                        style={styles.winnerAnnouncement}
                    >
                        <Ionicons name="star" size={16} color={colors.gold[400]} />
                        <Text style={styles.winnerText}>
                            {sortedPlayers[0].name} wins!
                        </Text>
                        <Ionicons name="star" size={16} color={colors.gold[400]} />
                    </Animated.View>
                )}

                {/* ---- Podium ---- */}
                <View style={styles.podiumContainer}>
                    {podiumOrder.map(({ player, rank }) => (
                        <PodiumCard key={player.id} player={player} rank={rank} />
                    ))}
                </View>

                {/* ---- Full Rankings ---- */}
                {remainingPlayers.length > 0 && (
                    <>
                        <Animated.View entering={FadeInDown.delay(700).duration(400)}>
                            <Text style={styles.rankingsTitle}>Full Rankings</Text>
                        </Animated.View>
                        <View style={styles.rankingsList}>
                            {remainingPlayers.map((player, index) => (
                                <RankingRow
                                    key={player.id}
                                    player={player}
                                    rank={index + 4}
                                    index={index}
                                />
                            ))}
                        </View>
                    </>
                )}

                {/* ---- Action Buttons ---- */}
                <Animated.View entering={FadeInDown.delay(900).duration(500)} style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.playAgainButton}
                        onPress={handlePlayAgain}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Play again"
                    >
                        <LinearGradient
                            colors={[colors.gold[500], colors.gold[400]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.playAgainGradient}
                        >
                            <Ionicons name="refresh" size={20} color={colors.obsidian[900]} />
                            <Text style={styles.playAgainText}>Play Again</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.secondaryActions}>
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={handleNewGame}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="New game"
                        >
                            <Ionicons name="game-controller-outline" size={18} color={colors.text.primary} />
                            <Text style={styles.secondaryButtonText}>New Game</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={handleShareResults}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Share results"
                        >
                            <Ionicons name="share-outline" size={18} color={colors.text.primary} />
                            <Text style={styles.secondaryButtonText}>Share</Text>
                        </TouchableOpacity>
                    </View>
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

    // ---- Confetti ----
    confettiContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
        overflow: 'hidden',
    },

    // ---- Winner ----
    winnerAnnouncement: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    winnerText: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.gold[400],
    },

    // ---- Podium ----
    podiumContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing['2xl'],
        paddingHorizontal: spacing.xs,
    },
    podiumCard: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.sm,
        borderRadius: 16,
        borderWidth: 1,
        gap: spacing.xs,
    },
    podiumCardFirst: {
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        marginTop: -spacing.lg,
    },
    crownContainer: {
        position: 'absolute',
        top: -12,
        alignSelf: 'center',
        backgroundColor: colors.obsidian[900],
        borderRadius: 12,
        padding: 4,
    },
    podiumName: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        textAlign: 'center',
    },
    podiumScoreContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 2,
    },
    podiumScore: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },
    podiumScoreLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
    rankBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 8,
    },
    rankBadgeText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },

    // ---- Rankings ----
    rankingsTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    rankingsList: {
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    rankingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    rankingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        flex: 1,
    },
    rankCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.obsidian[700],
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.text.secondary,
    },
    rankingName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        flex: 1,
    },
    rankingScore: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.secondary,
    },

    // ---- Actions ----
    actionsContainer: {
        gap: spacing.md,
    },
    playAgainButton: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    playAgainGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        borderRadius: 16,
    },
    playAgainText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.obsidian[900],
    },
    secondaryActions: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    secondaryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    secondaryButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
});
