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
    TextInput,
    Alert,
    Share,
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
    withSequence,
    withRepeat,
    interpolate,
    Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    const ringProgress = useSharedValue(0);

    useEffect(() => {
        if (count <= 0) {
            onComplete();
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        // Animate ring from 0 to 1 over 1 second for each count
        ringProgress.value = 0;
        ringProgress.value = withTiming(1, { duration: 900, easing: Easing.linear });

        const timer = setTimeout(() => {
            setCount((prev) => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [count, onComplete, ringProgress]);

    const ringStyle = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(ringProgress.value, [0, 1], [0.8, 1.2]) }],
        opacity: interpolate(ringProgress.value, [0, 0.8, 1], [0.8, 0.6, 0]),
    }));

    if (count <= 0) return null;

    return (
        <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={styles.countdownOverlay}
        >
            {/* Expanding ring */}
            <Animated.View style={[styles.countdownRing, ringStyle]} />

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
// Lobby Chat
// ============================================

interface ChatMessage {
    id: string;
    playerName: string;
    text: string;
    color: string;
}

const CHAT_COLORS = [
    colors.gold[400],
    colors.azure[400],
    colors.emerald[400],
    colors.coral[400],
    colors.amber[400],
];

function LobbyChat({ players, roomCode }: { players: { id: string; name: string }[]; roomCode: string }) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const chatScrollRef = useRef<ScrollView>(null);
    const playerColorMap = useRef<Record<string, string>>({});

    const getPlayerColor = useCallback((playerId: string) => {
        if (!playerColorMap.current[playerId]) {
            const idx = Object.keys(playerColorMap.current).length % CHAT_COLORS.length;
            playerColorMap.current[playerId] = CHAT_COLORS[idx];
        }
        return playerColorMap.current[playerId];
    }, []);

    // Listen for chat messages from socket
    useEffect(() => {
        const unsub = socketManager.on('game:update' as any, (data: any) => {
            if (data?.type === 'lobby-chat' && data.message) {
                setMessages(prev => {
                    const next = [...prev, data.message as ChatMessage].slice(-20);
                    return next;
                });
            }
        });
        return () => unsub();
    }, []);

    // Auto-scroll on new messages
    useEffect(() => {
        if (messages.length > 0) {
            const timer = setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 50);
            return () => clearTimeout(timer);
        }
    }, [messages.length]);

    const handleSend = useCallback(() => {
        const text = inputText.trim();
        if (!text) return;

        const currentPlayer = players[0]; // local player is typically first
        const msg: ChatMessage = {
            id: Date.now().toString(),
            playerName: currentPlayer?.name || 'You',
            text,
            color: getPlayerColor(currentPlayer?.id || 'self'),
        };

        setMessages(prev => [...prev, msg].slice(-20));
        setInputText('');

        // Try to broadcast via socket (best-effort)
        try {
            socketManager.sendGameAction(roomCode, 'lobby-chat', { message: msg });
        } catch { /* local-only fallback */ }
    }, [inputText, players, getPlayerColor, roomCode]);

    return (
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.chatSection}>
            <GlassCard style={styles.chatCard} padding="sm">
                <View style={styles.chatHeader}>
                    <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.text.muted} />
                    <Text style={styles.chatHeaderText}>Lobby Chat</Text>
                </View>
                <ScrollView
                    ref={chatScrollRef}
                    style={styles.chatMessages}
                    showsVerticalScrollIndicator={false}
                >
                    {messages.length === 0 && (
                        <Text style={styles.chatEmpty}>Say hi while you wait...</Text>
                    )}
                    {messages.map(msg => (
                        <View key={msg.id} style={styles.chatMsg}>
                            <Text style={[styles.chatMsgName, { color: msg.color }]}>{msg.playerName}</Text>
                            <Text style={styles.chatMsgText}>{msg.text}</Text>
                        </View>
                    ))}
                </ScrollView>
                <View style={styles.chatInputRow}>
                    <TextInput
                        style={styles.chatInput}
                        placeholder="Type a message..."
                        placeholderTextColor={colors.text.muted}
                        value={inputText}
                        onChangeText={setInputText}
                        maxLength={100}
                        returnKeyType="send"
                        onSubmitEditing={handleSend}
                        blurOnSubmit={false}
                    />
                    <TouchableOpacity
                        onPress={handleSend}
                        disabled={!inputText.trim()}
                        style={[styles.chatSendBtn, !inputText.trim() && { opacity: 0.4 }]}
                        accessibilityRole="button"
                        accessibilityLabel="Send message"
                    >
                        <Ionicons name="send" size={16} color={colors.gold[400]} />
                    </TouchableOpacity>
                </View>
            </GlassCard>
        </Animated.View>
    );
}

// ============================================
// Waiting for Players (pulsing animation)
// ============================================

function WaitingForPlayers() {
    const pulse = useSharedValue(0);

    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
        );
    }, [pulse]);

    const pulseStyle = useAnimatedStyle(() => ({
        opacity: interpolate(pulse.value, [0, 1], [0.4, 1]),
        transform: [{ scale: interpolate(pulse.value, [0, 1], [0.95, 1.05]) }],
    }));

    return (
        <Animated.View entering={FadeIn.delay(300).duration(400)} style={styles.waitingContainer}>
            <Animated.View style={pulseStyle}>
                <Ionicons name="hourglass-outline" size={32} color={colors.text.muted} />
            </Animated.View>
            <Text style={styles.waitingText}>Waiting for players to join...</Text>
            <Text style={styles.waitingHint}>Share the room code with friends</Text>
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
    const [socketConnected, setSocketConnected] = useState(socketManager.isConnected);
    const socketCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const roomCode = (code || '').toUpperCase();
    const { players, isHost, status, gameType, error } = gameStore;
    const minPlayers = MIN_PLAYERS[gameType || 'trivia'] || 2;
    const canStart = players.filter((p) => p.isConnected).length >= minPlayers;

    // ---- Join game on mount (supports guest players) ----
    useEffect(() => {
        if (!roomCode) return;

        // If we're already in this game (host), don't re-join
        if (gameStore.gameCode === roomCode && isHost) return;

        const joinWithName = async () => {
            setIsJoining(true);
            try {
                // Resolve player name: authenticated user > guest name > fallback
                const guestName = await AsyncStorage.getItem('@guest-name');
                const playerName = authStore.user?.displayName || guestName || 'Player';
                await gameStore.joinGame(roomCode, playerName);
            } finally {
                setIsJoining(false);
            }
        };

        joinWithName();
    }, [roomCode]);

    // ---- Socket connection status ----
    useEffect(() => {
        socketCheckRef.current = setInterval(() => {
            setSocketConnected(socketManager.isConnected);
        }, 3000);
        return () => {
            if (socketCheckRef.current) clearInterval(socketCheckRef.current);
        };
    }, []);

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

    // ---- Copy room code to clipboard ----
    const [codeCopied, setCodeCopied] = useState(false);
    const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleCopyCode = useCallback(async () => {
        try {
            await Clipboard.setStringAsync(roomCode);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setCodeCopied(true);
            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
            copyTimeoutRef.current = setTimeout(() => setCodeCopied(false), 2000);
        } catch {
            // Fallback to Share API if clipboard fails
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await Share.share({ message: `Join my game on 0G! Room code: ${roomCode}\nhttps://0gravity.ai/game/${roomCode}` });
        }
    }, [roomCode]);

    // Cleanup copy timeout
    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        };
    }, []);

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
                {/* ---- Connection Status ---- */}
                {!socketConnected && (
                    <Animated.View entering={FadeInDown.duration(300)} style={styles.connectionBanner}>
                        <Ionicons name="cloud-offline-outline" size={16} color={colors.coral[400]} />
                        <Text style={styles.connectionBannerText}>Reconnecting to server...</Text>
                    </Animated.View>
                )}

                {/* ---- Room Code Display ---- */}
                <Animated.View entering={FadeInDown.delay(50).duration(500)}>
                    <TouchableOpacity
                        onPress={handleCopyCode}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={`Room code: ${roomCode}. Tap to copy`}
                    >
                        <GlassCard gold style={styles.codeCard} padding="lg">
                            <View style={styles.codeHeaderRow}>
                                <Text style={styles.codeLabel}>ROOM CODE</Text>
                                <View style={[styles.connectionDot, { backgroundColor: socketConnected ? colors.emerald[500] : colors.coral[500] }]} />
                            </View>
                            <View style={styles.codeRow}>
                                <Text style={styles.codeText}>{roomCode}</Text>
                                <View style={[styles.copyIcon, codeCopied && styles.copyIconActive]}>
                                    <Ionicons
                                        name={codeCopied ? 'checkmark' : 'copy-outline'}
                                        size={18}
                                        color={codeCopied ? colors.emerald[500] : colors.gold[500]}
                                    />
                                </View>
                            </View>
                            <Text style={[styles.codeTapHint, codeCopied && { color: colors.emerald[400] }]}>
                                {codeCopied ? 'Copied to clipboard!' : 'Tap to copy'}
                            </Text>
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

                {/* ---- Player Avatar Grid (visual summary) ---- */}
                {players.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.avatarGrid}>
                        {players.map((player, i) => (
                            <Animated.View
                                key={player.id}
                                entering={ZoomIn.delay(80 + i * 60).duration(300).springify()}
                                style={styles.avatarGridItem}
                            >
                                <Avatar
                                    uri={player.avatarUrl}
                                    name={player.name}
                                    size="lg"
                                    glow={player.isHost}
                                />
                                <Text style={styles.avatarGridName} numberOfLines={1}>
                                    {player.name.split(' ')[0]}
                                </Text>
                                {player.isHost && (
                                    <View style={styles.avatarHostStar}>
                                        <Ionicons name="star" size={10} color={colors.gold[500]} />
                                    </View>
                                )}
                                {!player.isConnected && (
                                    <View style={styles.avatarDisconnected}>
                                        <Ionicons name="cloud-offline" size={10} color={colors.coral[400]} />
                                    </View>
                                )}
                            </Animated.View>
                        ))}
                    </Animated.View>
                )}

                {players.length === 0 && (
                    <WaitingForPlayers />
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
                                            socketManager.updateGameSettings(roomCode, { rounds });
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

                {/* ---- Lobby Chat ---- */}
                <LobbyChat players={players} roomCode={roomCode} />

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
    connectionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.coral[500] + '15',
        borderRadius: 12,
        paddingVertical: spacing.sm,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.coral[500] + '30',
    },
    connectionBannerText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.coral[400],
    },
    codeHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    connectionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    codeLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 2,
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

    // ---- Avatar Grid ----
    avatarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.lg,
        marginBottom: spacing.xl,
        paddingVertical: spacing.md,
    },
    avatarGridItem: {
        alignItems: 'center',
        gap: spacing.xs,
        position: 'relative',
    },
    avatarGridName: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.secondary,
        maxWidth: 64,
        textAlign: 'center',
    },
    avatarHostStar: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: colors.gold[500] + '25',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.gold[500] + '40',
    },
    avatarDisconnected: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: colors.coral[500] + '25',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ---- Copy Icon Active ----
    copyIconActive: {
        backgroundColor: colors.emerald[500] + '15',
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
    waitingHint: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        textAlign: 'center',
        opacity: 0.7,
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

    // ---- Lobby Chat ----
    chatSection: {
        marginBottom: spacing.md,
    },
    chatCard: {
        gap: spacing.xs,
    },
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.xs,
    },
    chatHeaderText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    chatMessages: {
        maxHeight: 140,
        marginBottom: spacing.xs,
    },
    chatEmpty: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: spacing.md,
    },
    chatMsg: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.xs,
        paddingVertical: 2,
    },
    chatMsgName: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
    },
    chatMsgText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        flex: 1,
    },
    chatInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        borderTopWidth: 1,
        borderTopColor: colors.border.subtle,
        paddingTop: spacing.xs,
    },
    chatInput: {
        flex: 1,
        fontSize: typography.fontSize.sm,
        color: colors.text.primary,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        backgroundColor: colors.obsidian[800],
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    chatSendBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: colors.gold[500] + '15',
        alignItems: 'center',
        justifyContent: 'center',
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
        backgroundColor: colors.surface.overlayHeavy,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    countdownRing: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 3,
        borderColor: colors.gold[500] + '40',
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
