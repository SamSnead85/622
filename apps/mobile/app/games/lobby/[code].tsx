// ============================================
// Game Lobby — Waiting room before game starts
// Shows players, room code, host controls
// ============================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    FadeInDown,
    FadeIn,
    FadeOut,
    ZoomIn,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withSequence,
    runOnJS,
    Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { colors, typography, spacing } from '@zerog/ui';
import { ScreenHeader, GlassCard, Avatar, LoadingView, GameInviteSheet } from '../../../components';
import { useGameStore, useAuthStore } from '../../../stores';
import { socketManager } from '../../../lib/socket';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MIN_PLAYERS: Record<string, number> = {
    trivia: 2,
    predict: 3,
    wavelength: 2,
    infiltrator: 4,
    cipher: 4,
};

const ROUND_OPTIONS = [3, 5, 7, 10];

// ============================================
// Countdown Overlay
// ============================================

function CountdownOverlay({ onComplete }: { onComplete: () => void }) {
    const [count, setCount] = useState(3);

    useEffect(() => {
        if (count <= 0) {
            onComplete();
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        const timer = setTimeout(() => {
            setCount((prev) => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [count, onComplete]);

    if (count <= 0) return null;

    return (
        <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={styles.countdownOverlay}
        >
            <Animated.Text
                key={count}
                entering={ZoomIn.duration(400).springify()}
                style={styles.countdownNumber}
            >
                {count}
            </Animated.Text>
            <Text style={styles.countdownLabel}>Get Ready!</Text>
        </Animated.View>
    );
}

// ============================================
// Player Row Component
// ============================================

interface PlayerRowProps {
    player: {
        id: string;
        name: string;
        avatarUrl?: string;
        score: number;
        isHost: boolean;
        isConnected: boolean;
    };
    index: number;
}

function PlayerRow({ player, index }: PlayerRowProps) {
    return (
        <Animated.View entering={FadeInDown.delay(index * 80).duration(400).springify()}>
            <GlassCard style={styles.playerRow} padding="sm">
                <View style={styles.playerInfo}>
                    <Avatar
                        uri={player.avatarUrl}
                        name={player.name}
                        size="md"
                        glow={player.isHost}
                    />
                    <View style={styles.playerMeta}>
                        <View style={styles.playerNameRow}>
                            <Text
                                style={[
                                    styles.playerName,
                                    !player.isConnected && styles.playerDisconnected,
                                ]}
                                numberOfLines={1}
                            >
                                {player.name}
                            </Text>
                            {player.isHost && (
                                <View style={styles.hostBadge}>
                                    <Ionicons name="star" size={10} color={colors.gold[500]} />
                                    <Text style={styles.hostBadgeText}>Host</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.playerStatus}>
                            {player.isConnected ? 'Ready' : 'Disconnected'}
                        </Text>
                    </View>
                </View>
                {!player.isConnected && (
                    <Ionicons name="cloud-offline-outline" size={18} color={colors.text.muted} />
                )}
            </GlassCard>
        </Animated.View>
    );
}

// ============================================
// Lobby Screen
// ============================================

export default function LobbyScreen() {
    const router = useRouter();
    const { code } = useLocalSearchParams<{ code: string }>();
    const gameStore = useGameStore();
    const authStore = useAuthStore();

    const [showCountdown, setShowCountdown] = useState(false);
    const [selectedRounds, setSelectedRounds] = useState(5);
    const [isJoining, setIsJoining] = useState(false);
    const [showInvite, setShowInvite] = useState(false);

    const roomCode = (code || '').toUpperCase();
    const { players, isHost, status, gameType, error } = gameStore;
    const minPlayers = MIN_PLAYERS[gameType || 'trivia'] || 2;
    const canStart = players.filter((p) => p.isConnected).length >= minPlayers;

    // ---- Join game on mount ----
    useEffect(() => {
        if (!roomCode) return;

        // If we're already in this game (host), don't re-join
        if (gameStore.gameCode === roomCode && isHost) return;

        setIsJoining(true);
        gameStore.joinGame(roomCode, authStore.user?.displayName).finally(() => {
            setIsJoining(false);
        });
    }, [roomCode]);

    // ---- Socket event listeners ----
    useEffect(() => {
        const unsubs = [
            socketManager.on('game:state', (data) => gameStore.updateFromState(data)),
            socketManager.on('game:player-joined', (data) => {
                gameStore.addPlayer(data);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }),
            socketManager.on('game:player-left', (data) => gameStore.removePlayer(data.playerId)),
            socketManager.on('game:round-start', () => {
                setShowCountdown(true);
            }),
            socketManager.on('game:error', (data) => {
                Alert.alert('Game Error', data.message);
            }),
        ];
        return () => unsubs.forEach((fn) => fn());
    }, []);

    // ---- Watch for game status changes ----
    useEffect(() => {
        if (status === 'playing' && !showCountdown) {
            // Already playing, navigate directly
            navigateToGame();
        }
    }, [status]);

    // ---- Navigate to game screen ----
    const navigateToGame = useCallback(() => {
        const type = gameType || 'trivia';
        router.replace(`/games/${type}/${roomCode}` as any);
    }, [gameType, roomCode, router]);

    // ---- Countdown completion ----
    const handleCountdownComplete = useCallback(() => {
        setShowCountdown(false);
        navigateToGame();
    }, [navigateToGame]);

    // ---- Copy room code ----
    const handleCopyCode = useCallback(async () => {
        await Clipboard.setStringAsync(roomCode);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Copied!', 'Room code copied to clipboard.');
    }, [roomCode]);

    // ---- Open invite sheet ----
    const handleShare = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowInvite(true);
    }, []);

    // ---- Start game ----
    const handleStart = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        const success = await gameStore.startGame();
        if (!success) {
            Alert.alert('Error', gameStore.error || 'Failed to start game.');
        }
    }, [gameStore]);

    // ---- Leave game ----
    const handleLeave = useCallback(() => {
        gameStore.leaveGame();
        router.back();
    }, [gameStore, router]);

    // ---- Loading state ----
    if (isJoining) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.obsidian[900], colors.obsidian[800]]}
                    style={StyleSheet.absoluteFill}
                />
                <LoadingView message="Joining game..." />
            </View>
        );
    }

    // ---- Error state ----
    if (error && players.length === 0) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.obsidian[900], colors.obsidian[800]]}
                    style={StyleSheet.absoluteFill}
                />
                <ScreenHeader title="Lobby" showBack onBack={handleLeave} noBorder />
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.coral[500]} />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.errorButton}
                        onPress={handleLeave}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <Text style={styles.errorButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
                style={StyleSheet.absoluteFill}
            />

            <ScreenHeader
                title="Lobby"
                showBack
                onBack={handleLeave}
                noBorder
                rightElement={
                    <TouchableOpacity
                        onPress={handleShare}
                        accessibilityRole="button"
                        accessibilityLabel="Share room code"
                    >
                        <Ionicons name="share-outline" size={22} color={colors.text.primary} />
                    </TouchableOpacity>
                }
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ---- Room Code Display ---- */}
                <Animated.View entering={FadeInDown.delay(50).duration(500)}>
                    <TouchableOpacity
                        onPress={handleCopyCode}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={`Room code: ${roomCode}. Tap to copy`}
                    >
                        <GlassCard gold style={styles.codeCard} padding="lg">
                            <Text style={styles.codeLabel}>ROOM CODE</Text>
                            <View style={styles.codeRow}>
                                <Text style={styles.codeText}>{roomCode}</Text>
                                <View style={styles.copyIcon}>
                                    <Ionicons name="copy-outline" size={18} color={colors.gold[500]} />
                                </View>
                            </View>
                            <Text style={styles.codeTapHint}>Tap to copy</Text>
                        </GlassCard>
                    </TouchableOpacity>
                </Animated.View>

                {/* ---- Players Section ---- */}
                <Animated.View entering={FadeInDown.delay(150).duration(500)}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Players</Text>
                        <Text style={styles.sectionCount}>
                            {players.filter((p) => p.isConnected).length} / {minPlayers}+
                        </Text>
                    </View>
                </Animated.View>

                <View style={styles.playersList}>
                    {players.map((player, index) => (
                        <PlayerRow key={player.id} player={player} index={index} />
                    ))}
                </View>

                {players.length === 0 && (
                    <Animated.View entering={FadeIn.delay(300).duration(400)} style={styles.waitingContainer}>
                        <Ionicons name="hourglass-outline" size={32} color={colors.text.muted} />
                        <Text style={styles.waitingText}>Waiting for players to join...</Text>
                    </Animated.View>
                )}

                {/* ---- Host Settings ---- */}
                {isHost && (
                    <Animated.View entering={FadeInDown.delay(250).duration(500)}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Settings</Text>
                        </View>
                        <GlassCard style={styles.settingsCard} padding="md">
                            <Text style={styles.settingLabel}>Rounds</Text>
                            <View style={styles.roundsRow}>
                                {ROUND_OPTIONS.map((rounds) => (
                                    <TouchableOpacity
                                        key={rounds}
                                        style={[
                                            styles.roundOption,
                                            selectedRounds === rounds && styles.roundOptionActive,
                                        ]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setSelectedRounds(rounds);
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel={`${rounds} rounds`}
                                        accessibilityState={{ selected: selectedRounds === rounds }}
                                    >
                                        <Text
                                            style={[
                                                styles.roundOptionText,
                                                selectedRounds === rounds && styles.roundOptionTextActive,
                                            ]}
                                        >
                                            {rounds}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </GlassCard>
                    </Animated.View>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* ---- Bottom Action ---- */}
            {isHost && (
                <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.bottomBar}>
                    <TouchableOpacity
                        style={[styles.startButton, !canStart && styles.startButtonDisabled]}
                        onPress={handleStart}
                        disabled={!canStart}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Start game"
                        accessibilityState={{ disabled: !canStart }}
                    >
                        <LinearGradient
                            colors={canStart ? [colors.gold[500], colors.gold[400]] : [colors.obsidian[600], colors.obsidian[500]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.startButtonGradient}
                        >
                            <Ionicons
                                name="play"
                                size={20}
                                color={canStart ? colors.obsidian[900] : colors.text.muted}
                            />
                            <Text
                                style={[
                                    styles.startButtonText,
                                    !canStart && styles.startButtonTextDisabled,
                                ]}
                            >
                                {canStart ? 'Start Game' : `Need ${minPlayers}+ Players`}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* ---- Countdown Overlay ---- */}
            {showCountdown && <CountdownOverlay onComplete={handleCountdownComplete} />}

            {/* ---- Invite Sheet ---- */}
            <GameInviteSheet code={roomCode} visible={showInvite} onClose={() => setShowInvite(false)} />
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

    // ---- Error ----
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        gap: spacing.md,
    },
    errorText: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
    },
    errorButton: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface.glass,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        marginTop: spacing.md,
    },
    errorButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },

    // ---- Code Card ----
    codeCard: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    codeLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: spacing.sm,
    },
    codeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    codeText: {
        fontSize: typography.fontSize['4xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.gold[400],
        letterSpacing: 8,
    },
    copyIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: colors.gold[500] + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    codeTapHint: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: spacing.xs,
    },

    // ---- Sections ----
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
    },
    sectionCount: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
    },

    // ---- Players ----
    playersList: {
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    playerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    playerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        flex: 1,
    },
    playerMeta: {
        flex: 1,
    },
    playerNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    playerName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
    playerDisconnected: {
        opacity: 0.5,
    },
    hostBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: colors.gold[500] + '15',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 8,
    },
    hostBadgeText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.gold[500],
    },
    playerStatus: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: 2,
    },

    // ---- Waiting ----
    waitingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing['3xl'],
        gap: spacing.md,
    },
    waitingText: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
        textAlign: 'center',
    },

    // ---- Settings ----
    settingsCard: {
        marginBottom: spacing.xl,
    },
    settingLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    roundsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    roundOption: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: 10,
        backgroundColor: colors.obsidian[800],
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    roundOptionActive: {
        backgroundColor: colors.gold[500] + '18',
        borderColor: colors.gold[500] + '40',
    },
    roundOptionText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.muted,
    },
    roundOptionTextActive: {
        color: colors.gold[400],
    },

    // ---- Bottom Bar ----
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing['2xl'],
        paddingTop: spacing.md,
    },
    startButton: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    startButtonDisabled: {
        shadowOpacity: 0,
    },
    startButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        borderRadius: 16,
    },
    startButtonText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.obsidian[900],
    },
    startButtonTextDisabled: {
        color: colors.text.muted,
    },

    // ---- Countdown ----
    countdownOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    countdownNumber: {
        fontSize: 120,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.gold[400],
        textShadowColor: colors.gold[500],
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 30,
    },
    countdownLabel: {
        fontSize: typography.fontSize.xl,
        fontWeight: '600',
        color: colors.text.secondary,
        marginTop: spacing.lg,
    },
});
