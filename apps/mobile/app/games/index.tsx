// ============================================
// 0G Arena — Games Hub (Enhanced)
// Animated hero, better cards, stats, quick play
// ============================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Pressable,
    Dimensions,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    FadeInDown,
    FadeInUp,
    FadeIn,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    withSpring,
    withDelay,
    Easing,
    interpolateColor,
    interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';
import { ScreenHeader } from '../../components';
import { GlassCard } from '../../components';
import { useGameStore, useAuthStore } from '../../stores';
import { showError } from '../../stores/toastStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP) / 2;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// ============================================
// Game Definitions
// ============================================

const games = [
    { type: 'trivia', name: 'Rapid Fire', icon: 'flash' as const, desc: 'Fast-paced trivia blitz', players: '2-8', color: colors.amber[500], isNew: false },
    { type: 'predict', name: 'Predict', icon: 'people' as const, desc: 'Guess what others think', players: '3-8', color: colors.azure[500], isNew: true },
    { type: 'wavelength', name: 'Wavelength', icon: 'radio' as const, desc: 'Read minds on a spectrum', players: '2-8', color: colors.emerald[500], isNew: false },
    { type: 'infiltrator', name: 'Infiltrator', icon: 'eye-off' as const, desc: 'Find the hidden spy', players: '4-8', color: colors.coral[500], isNew: true },
    { type: 'cipher', name: 'Cipher', icon: 'grid' as const, desc: 'Strategic word deduction', players: '4-8', color: colors.gold[500], isNew: false },
];

// ============================================
// Animated NEW Badge
// ============================================

function NewBadge() {
    const pulse = useSharedValue(0);

    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
        );
    }, [pulse]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(pulse.value, [0, 1], [0.85, 1]),
        transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.08]) }],
    }));

    return (
        <Animated.View style={[styles.newBadge, animatedStyle]}>
            <LinearGradient
                colors={[colors.coral[500], colors.coral[400]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.newBadgeGradient}
            >
                <Text style={styles.newBadgeText}>NEW</Text>
            </LinearGradient>
        </Animated.View>
    );
}

// ============================================
// Animated Input Border
// ============================================

function AnimatedCodeInput({
    value,
    onChangeText,
    onSubmitEditing,
    inputRef,
}: {
    value: string;
    onChangeText: (text: string) => void;
    onSubmitEditing: () => void;
    inputRef: React.RefObject<TextInput | null>;
}) {
    const borderProgress = useSharedValue(0);
    const isFocused = useSharedValue(0);

    useEffect(() => {
        borderProgress.value = withRepeat(
            withTiming(1, { duration: 3000, easing: Easing.linear }),
            -1,
            false,
        );
    }, [borderProgress]);

    const handleFocus = useCallback(() => {
        isFocused.value = withTiming(1, { duration: 300 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [isFocused]);

    const handleBlur = useCallback(() => {
        isFocused.value = withTiming(0, { duration: 300 });
    }, [isFocused]);

    const animatedBorderStyle = useAnimatedStyle(() => {
        const borderColor = interpolateColor(
            isFocused.value,
            [0, 1],
            [colors.border.subtle, colors.gold[500] + '80'],
        );
        return {
            borderColor,
            borderWidth: interpolate(isFocused.value, [0, 1], [1, 1.5]),
        };
    });

    return (
        <Animated.View style={[styles.codeInputContainer, animatedBorderStyle]}>
            <Ionicons name="keypad-outline" size={18} color={colors.text.muted} />
            <TextInput
                ref={inputRef}
                style={styles.codeInput}
                placeholder="ROOM CODE"
                placeholderTextColor={colors.text.muted}
                value={value}
                onChangeText={(text) => onChangeText(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={onSubmitEditing}
                onFocus={handleFocus}
                onBlur={handleBlur}
                accessibilityLabel="Room code input"
            />
            {value.length > 0 && (
                <View style={styles.codeCountBadge}>
                    <Text style={styles.codeCountText}>{value.length}/6</Text>
                </View>
            )}
        </Animated.View>
    );
}

// ============================================
// Enhanced Game Card
// ============================================

interface GameCardProps {
    game: typeof games[number];
    index: number;
    onPlay: (type: string) => void;
}

function GameCard({ game, index, onPlay }: GameCardProps) {
    const scale = useSharedValue(1);

    const handlePressIn = useCallback(() => {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    }, [scale]);

    const handlePressOut = useCallback(() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    }, [scale]);

    const handlePlay = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPlay(game.type);
    }, [game.type, onPlay]);

    const animatedCardStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View
            entering={FadeInDown.delay(200 + index * 100).duration(500).springify()}
            style={styles.cardWrapper}
        >
            <AnimatedPressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handlePlay}
                style={animatedCardStyle}
                accessibilityRole="button"
                accessibilityLabel={`Play ${game.name}`}
            >
                <GlassCard style={styles.gameCard} padding="md">
                    {/* Gradient accent strip */}
                    <LinearGradient
                        colors={[game.color, game.color + '00']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cardAccentStrip}
                    />

                    {/* Corner glow */}
                    <View style={[styles.cardCornerGlow, { backgroundColor: game.color + '10' }]} />

                    {/* NEW badge */}
                    {game.isNew && <NewBadge />}

                    {/* Large icon */}
                    <View style={styles.cardIconContainer}>
                        <LinearGradient
                            colors={[game.color + '25', game.color + '08']}
                            style={styles.iconCircle}
                        >
                            <Ionicons name={game.icon} size={28} color={game.color} />
                        </LinearGradient>
                    </View>

                    <Text style={styles.cardName} numberOfLines={1}>{game.name}</Text>
                    <Text style={styles.cardDesc} numberOfLines={2}>{game.desc}</Text>

                    <View style={styles.cardFooter}>
                        <View style={styles.playerBadge}>
                            <Ionicons name="people-outline" size={12} color={colors.text.muted} />
                            <Text style={styles.playerText}>{game.players}</Text>
                        </View>

                        <View style={[styles.playButton, { backgroundColor: game.color + '20' }]}>
                            <Text style={[styles.playButtonText, { color: game.color }]}>Play</Text>
                            <Ionicons name="arrow-forward" size={14} color={game.color} />
                        </View>
                    </View>
                </GlassCard>
            </AnimatedPressable>
        </Animated.View>
    );
}

// ============================================
// Stats Section
// ============================================

function StatsSection() {
    const stats = [
        { label: 'Games Played', value: '24', icon: 'game-controller' as const, color: colors.azure[500] },
        { label: 'Win Rate', value: '68%', icon: 'trophy' as const, color: colors.gold[500] },
        { label: 'Streak', value: '5', icon: 'flame' as const, color: colors.coral[500] },
    ];

    return (
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.statsSection}>
            <View style={styles.statsRow}>
                {stats.map((stat, index) => (
                    <Animated.View
                        key={stat.label}
                        entering={FadeInDown.delay(120 + index * 80).duration(400).springify()}
                        style={styles.statItem}
                    >
                        <GlassCard style={styles.statCard} padding="sm">
                            <View style={[styles.statIconBg, { backgroundColor: stat.color + '15' }]}>
                                <Ionicons name={stat.icon} size={16} color={stat.color} />
                            </View>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </GlassCard>
                    </Animated.View>
                ))}
            </View>
        </Animated.View>
    );
}

// ============================================
// Quick Play Button
// ============================================

function QuickPlayButton({ onPress }: { onPress: () => void }) {
    const shimmer = useSharedValue(0);

    useEffect(() => {
        shimmer.value = withRepeat(
            withTiming(1, { duration: 2500, easing: Easing.linear }),
            -1,
            false,
        );
    }, [shimmer]);

    const animatedShimmer = useAnimatedStyle(() => ({
        opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.7, 1, 0.7]),
    }));

    return (
        <Animated.View entering={FadeInDown.delay(80).duration(500)}>
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Quick Play — join a random game"
            >
                <Animated.View style={animatedShimmer}>
                    <LinearGradient
                        colors={[colors.gold[600], colors.gold[500], colors.gold[400]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.quickPlayGradient}
                    >
                        <View style={styles.quickPlayContent}>
                            <View style={styles.quickPlayLeft}>
                                <View style={styles.quickPlayIconCircle}>
                                    <Ionicons name="shuffle" size={22} color={colors.obsidian[900]} />
                                </View>
                                <View>
                                    <Text style={styles.quickPlayTitle}>Quick Play</Text>
                                    <Text style={styles.quickPlaySubtitle}>Jump into a random game</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.obsidian[900]} />
                        </View>
                    </LinearGradient>
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ============================================
// Hero Section
// ============================================

function HeroSection() {
    const float = useSharedValue(0);

    useEffect(() => {
        float.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
        );
    }, [float]);

    const animatedFloat = useAnimatedStyle(() => ({
        transform: [{ translateY: interpolate(float.value, [0, 1], [0, -6]) }],
    }));

    return (
        <Animated.View
            entering={FadeInDown.delay(60).duration(600)}
            style={styles.heroSection}
        >
            {/* Background pattern dots */}
            <View style={styles.heroPatternContainer}>
                {Array.from({ length: 15 }).map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.heroDot,
                            {
                                left: `${(i % 5) * 25 + 5}%` as any,
                                top: `${Math.floor(i / 5) * 35 + 10}%` as any,
                                opacity: 0.03 + (i % 3) * 0.02,
                                width: 4 + (i % 3) * 2,
                                height: 4 + (i % 3) * 2,
                                borderRadius: 2 + (i % 3),
                            },
                        ]}
                    />
                ))}
            </View>

            <Animated.View style={[styles.heroTextContainer, animatedFloat]}>
                <View style={styles.heroIconRow}>
                    <LinearGradient
                        colors={[colors.gold[500], colors.gold[400]]}
                        style={styles.heroIconBg}
                    >
                        <Ionicons name="game-controller" size={20} color={colors.obsidian[900]} />
                    </LinearGradient>
                    <View style={styles.heroLiveBadge}>
                        <View style={styles.heroLiveDot} />
                        <Text style={styles.heroLiveText}>LIVE</Text>
                    </View>
                </View>
                <Text style={styles.heroTitle}>0G Arena</Text>
                <Text style={styles.heroSubtitle}>Challenge friends in real-time</Text>
            </Animated.View>
        </Animated.View>
    );
}

// ============================================
// Games Hub Screen
// ============================================

export default function GamesHubScreen() {
    const router = useRouter();
    const gameStore = useGameStore();
    const [roomCode, setRoomCode] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const inputRef = useRef<TextInput>(null);

    // ---- Join Game by Code ----
    const handleJoin = useCallback(() => {
        const code = roomCode.trim().toUpperCase();
        if (code.length !== 6) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Invalid Code', 'Please enter a 6-character room code.');
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/games/lobby/${code}`);
    }, [roomCode, router]);

    // ---- Create & Play a Game ----
    const handlePlay = useCallback(async (type: string) => {
        if (isCreating) return;
        setIsCreating(true);
        try {
            const code = await gameStore.createGame(type);
            if (code) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.push(`/games/lobby/${code}`);
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Error', gameStore.error || 'Failed to create game. Please try again.');
            }
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Something went wrong. Please try again.');
            showError('Could not start game');
        } finally {
            setIsCreating(false);
        }
    }, [isCreating, gameStore, router]);

    // ---- Quick Play — pick random game ----
    const handleQuickPlay = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        const randomGame = games[Math.floor(Math.random() * games.length)];
        handlePlay(randomGame.type);
    }, [handlePlay]);

    // ---- Daily Challenge ----
    const handleDaily = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/games/daily');
    }, [router]);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
                style={StyleSheet.absoluteFill}
            />

            <ScreenHeader title="0G Arena" showBack noBorder />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ---- Hero Section ---- */}
                <HeroSection />

                {/* ---- Quick Play ---- */}
                <QuickPlayButton onPress={handleQuickPlay} />

                {/* ---- Stats Section ---- */}
                <StatsSection />

                {/* ---- Join Game Section ---- */}
                <Animated.View entering={FadeInDown.delay(150).duration(500)}>
                    <GlassCard style={styles.joinCard} padding="md">
                        <View style={styles.joinHeader}>
                            <Ionicons name="enter-outline" size={18} color={colors.gold[500]} />
                            <Text style={styles.joinTitle}>Join Game</Text>
                        </View>
                        <View style={styles.joinRow}>
                            <AnimatedCodeInput
                                value={roomCode}
                                onChangeText={setRoomCode}
                                onSubmitEditing={handleJoin}
                                inputRef={inputRef}
                            />
                            <TouchableOpacity
                                style={[
                                    styles.joinButton,
                                    roomCode.length < 6 && styles.joinButtonDisabled,
                                ]}
                                onPress={handleJoin}
                                disabled={roomCode.length < 6}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                                accessibilityLabel="Join game"
                            >
                                <LinearGradient
                                    colors={roomCode.length >= 6 ? [colors.gold[500], colors.gold[400]] : [colors.obsidian[600], colors.obsidian[500]]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.joinButtonGradient}
                                >
                                    <Text style={[styles.joinButtonText, roomCode.length < 6 && styles.joinButtonTextDisabled]}>Go</Text>
                                    <Ionicons name="arrow-forward" size={16} color={roomCode.length >= 6 ? colors.obsidian[900] : colors.text.muted} />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                </Animated.View>

                {/* ---- Section Header ---- */}
                <Animated.View entering={FadeInDown.delay(180).duration(500)} style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Choose Your Game</Text>
                    <Text style={styles.sectionBadge}>{games.length} Games</Text>
                </Animated.View>

                {/* ---- Game Cards Grid ---- */}
                <View style={styles.gamesGrid}>
                    {games.map((game, index) => (
                        <GameCard
                            key={game.type}
                            game={game}
                            index={index}
                            onPlay={handlePlay}
                        />
                    ))}
                </View>

                {/* ---- Daily Challenge Banner ---- */}
                <Animated.View entering={FadeInUp.delay(700).duration(500)}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleDaily}
                        accessibilityRole="button"
                        accessibilityLabel="Daily Challenge"
                    >
                        <GlassCard gold style={styles.dailyCard} padding="md">
                            <View style={styles.dailyContent}>
                                <View style={styles.dailyLeft}>
                                    <View style={styles.dailyIconRow}>
                                        <View style={styles.dailyFireBg}>
                                            <Ionicons name="flame" size={20} color={colors.gold[400]} />
                                        </View>
                                        <View>
                                            <Text style={styles.dailyTitle}>Daily Challenge</Text>
                                            <Text style={styles.dailyDesc}>
                                                Build your streak — compete today!
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.dailyStreakBadge}>
                                    <Ionicons name="flame" size={16} color={colors.gold[400]} />
                                    <Text style={styles.dailyStreakText}>0</Text>
                                </View>
                            </View>
                            <View style={styles.dailyArrowRow}>
                                <Text style={styles.dailyArrowText}>Play Now</Text>
                                <Ionicons name="chevron-forward" size={16} color={colors.gold[500]} />
                            </View>
                        </GlassCard>
                    </TouchableOpacity>
                </Animated.View>

                {/* Bottom spacing */}
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
        paddingTop: spacing.sm,
    },

    // ---- Hero Section ----
    heroSection: {
        marginBottom: spacing.lg,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 20,
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.obsidian[800],
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    heroPatternContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    heroDot: {
        position: 'absolute',
        backgroundColor: colors.gold[500],
    },
    heroTextContainer: {
        alignItems: 'center',
    },
    heroIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    heroIconBg: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroLiveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.emerald[500] + '20',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.emerald[500] + '40',
    },
    heroLiveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.emerald[500],
    },
    heroLiveText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.emerald[400],
        letterSpacing: 1,
    },
    heroTitle: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    heroSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
    },

    // ---- Quick Play ----
    quickPlayGradient: {
        borderRadius: 16,
        marginBottom: spacing.lg,
        overflow: 'hidden',
    },
    quickPlayContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md + 2,
        paddingHorizontal: spacing.lg,
    },
    quickPlayLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    quickPlayIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickPlayTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.obsidian[900],
    },
    quickPlaySubtitle: {
        fontSize: typography.fontSize.xs,
        color: colors.obsidian[900],
        opacity: 0.7,
    },

    // ---- Stats Section ----
    statsSection: {
        marginBottom: spacing.lg,
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    statItem: {
        flex: 1,
    },
    statCard: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    statIconBg: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    statValue: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // ---- Join Card ----
    joinCard: {
        marginBottom: spacing.xl,
    },
    joinHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    joinTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    joinRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    codeInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.obsidian[800],
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    codeInput: {
        flex: 1,
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        letterSpacing: 4,
        paddingVertical: spacing.md,
    },
    codeCountBadge: {
        backgroundColor: colors.gold[500] + '15',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 6,
    },
    codeCountText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.gold[500],
    },
    joinButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    joinButtonDisabled: {
        opacity: 0.5,
    },
    joinButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: 12,
    },
    joinButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.obsidian[900],
    },
    joinButtonTextDisabled: {
        color: colors.text.muted,
    },

    // ---- Section Header ----
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
    },
    sectionBadge: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
        backgroundColor: colors.surface.glass,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 8,
        overflow: 'hidden',
    },

    // ---- Game Cards Grid ----
    gamesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: CARD_GAP,
        marginBottom: spacing.xl,
    },
    cardWrapper: {
        width: CARD_WIDTH,
    },
    gameCard: {
        position: 'relative',
        overflow: 'hidden',
        minHeight: 195,
    },
    cardAccentStrip: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
    },
    cardCornerGlow: {
        position: 'absolute',
        top: -30,
        right: -30,
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    cardIconContainer: {
        marginBottom: spacing.sm,
        marginTop: spacing.xs,
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardName: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        marginBottom: spacing.xxs,
    },
    cardDesc: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        lineHeight: 16,
        marginBottom: spacing.sm,
        flex: 1,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    playerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    playerText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
    playButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: 10,
    },
    playButtonText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },

    // ---- NEW Badge ----
    newBadge: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        zIndex: 10,
    },
    newBadgeGradient: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 6,
    },
    newBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.text.primary,
        letterSpacing: 1,
    },

    // ---- Daily Challenge ----
    dailyCard: {
        marginBottom: spacing.lg,
    },
    dailyContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    dailyLeft: {
        flex: 1,
        marginRight: spacing.md,
    },
    dailyIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    dailyFireBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.gold[500] + '15',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.gold[500] + '25',
    },
    dailyTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.gold[400],
    },
    dailyDesc: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        marginTop: 2,
    },
    dailyStreakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.gold[500] + '15',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
    },
    dailyStreakText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.gold[400],
    },
    dailyArrowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    dailyArrowText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.gold[500],
    },
});
