// ============================================
// 0G Arena — Games Hub
// Browse games, join by code, daily challenge
// ============================================

import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Dimensions,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';
import { ScreenHeader } from '../../components';
import { GlassCard } from '../../components';
import { useGameStore, useAuthStore } from '../../stores';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP) / 2;

// ============================================
// Game Definitions
// ============================================

const games = [
    { type: 'trivia', name: 'Rapid Fire', icon: 'flash' as const, desc: 'Fast-paced trivia blitz', players: '2-8', color: colors.amber[500] },
    { type: 'predict', name: 'Predict', icon: 'people' as const, desc: 'Guess what others think', players: '3-8', color: colors.azure[500] },
    { type: 'wavelength', name: 'Wavelength', icon: 'radio' as const, desc: 'Read minds on a spectrum', players: '2-8', color: colors.emerald[500] },
    { type: 'infiltrator', name: 'Infiltrator', icon: 'eye-off' as const, desc: 'Find the hidden spy', players: '4-8', color: colors.coral[500] },
    { type: 'cipher', name: 'Cipher', icon: 'grid' as const, desc: 'Strategic word deduction', players: '4-8', color: colors.gold[500] },
];

// ============================================
// Game Card Component
// ============================================

interface GameCardProps {
    game: typeof games[number];
    index: number;
    onPlay: (type: string) => void;
}

function GameCard({ game, index, onPlay }: GameCardProps) {
    const handlePlay = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPlay(game.type);
    }, [game.type, onPlay]);

    return (
        <Animated.View
            entering={FadeInDown.delay(150 + index * 80).duration(500).springify()}
            style={styles.cardWrapper}
        >
            <GlassCard style={styles.gameCard} padding="md">
                {/* Accent glow */}
                <View style={[styles.accentDot, { backgroundColor: game.color }]} />

                <View style={styles.cardIconContainer}>
                    <View style={[styles.iconCircle, { backgroundColor: game.color + '18' }]}>
                        <Ionicons name={game.icon} size={24} color={game.color} />
                    </View>
                </View>

                <Text style={styles.cardName} numberOfLines={1}>{game.name}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{game.desc}</Text>

                <View style={styles.cardFooter}>
                    <View style={styles.playerBadge}>
                        <Ionicons name="people-outline" size={12} color={colors.text.muted} />
                        <Text style={styles.playerText}>{game.players}</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.playButton, { backgroundColor: game.color + '20' }]}
                        onPress={handlePlay}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Play ${game.name}`}
                    >
                        <Text style={[styles.playButtonText, { color: game.color }]}>Play</Text>
                        <Ionicons name="arrow-forward" size={14} color={game.color} />
                    </TouchableOpacity>
                </View>
            </GlassCard>
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
                router.push(`/games/lobby/${code}`);
            } else {
                Alert.alert('Error', gameStore.error || 'Failed to create game. Please try again.');
            }
        } catch {
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setIsCreating(false);
        }
    }, [isCreating, gameStore, router]);

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
                {/* ---- Join Game Section ---- */}
                <Animated.View entering={FadeInDown.delay(50).duration(500)}>
                    <GlassCard style={styles.joinCard} padding="md">
                        <Text style={styles.joinTitle}>Join Game</Text>
                        <View style={styles.joinRow}>
                            <View style={styles.codeInputContainer}>
                                <Ionicons name="keypad-outline" size={18} color={colors.text.muted} />
                                <TextInput
                                    ref={inputRef}
                                    style={styles.codeInput}
                                    placeholder="ROOM CODE"
                                    placeholderTextColor={colors.text.muted}
                                    value={roomCode}
                                    onChangeText={(text) => setRoomCode(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                                    maxLength={6}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    returnKeyType="go"
                                    onSubmitEditing={handleJoin}
                                    accessibilityLabel="Room code input"
                                />
                            </View>
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
                                <Text style={styles.joinButtonText}>Join</Text>
                                <Ionicons name="arrow-forward" size={16} color={colors.obsidian[900]} />
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                </Animated.View>

                {/* ---- Hero Title ---- */}
                <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.heroSection}>
                    <Text style={styles.heroTitle}>Choose Your Game</Text>
                    <Text style={styles.heroSubtitle}>Challenge friends in real-time</Text>
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
                <Animated.View entering={FadeInUp.delay(600).duration(500)}>
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
                                        <Ionicons name="flame" size={22} color={colors.gold[500]} />
                                        <Text style={styles.dailyTitle}>Daily Challenge</Text>
                                    </View>
                                    <Text style={styles.dailyDesc}>
                                        Compete in today's challenge and build your streak
                                    </Text>
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
        paddingTop: spacing.md,
    },

    // ---- Join Card ----
    joinCard: {
        marginBottom: spacing.xl,
    },
    joinTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.sm,
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
    joinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        backgroundColor: colors.gold[500],
        borderRadius: 12,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    joinButtonDisabled: {
        opacity: 0.4,
    },
    joinButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.obsidian[900],
    },

    // ---- Hero ----
    heroSection: {
        marginBottom: spacing.lg,
    },
    heroTitle: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    heroSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
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
        minHeight: 180,
    },
    accentDot: {
        position: 'absolute',
        top: -10,
        right: -10,
        width: 40,
        height: 40,
        borderRadius: 20,
        opacity: 0.15,
    },
    cardIconContainer: {
        marginBottom: spacing.sm,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 14,
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
        gap: spacing.sm,
        marginBottom: spacing.xs,
    },
    dailyTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.gold[400],
    },
    dailyDesc: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        lineHeight: 20,
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
