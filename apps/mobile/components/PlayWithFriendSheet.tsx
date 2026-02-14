// ============================================
// PlayWithFriendSheet — Pick a friend, then pick a game
// Reverse flow: friend first → game → auto-create & invite → lobby
// ============================================

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Pressable,
    Dimensions,
    FlatList,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { showSuccess, showError } from '../stores/toastStore';
import { apiFetch, API } from '../lib/api';
import { socketManager } from '../lib/socket';
import { useGameStore } from '../stores';
import { AVATAR_PLACEHOLDER } from '../lib/imagePlaceholder';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAME_CARD_GAP = spacing.sm;
const GAME_CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - GAME_CARD_GAP) / 2;

// ============================================
// Multiplayer Games Definition
// ============================================

interface MultiplayerGame {
    type: string;
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    players: string;
    color: string;
}

const MULTIPLAYER_GAMES: MultiplayerGame[] = [
    { type: 'would-you-rather', name: 'Would You Rather', icon: 'swap-horizontal', players: '2-8', color: colors.amber[400] },
    { type: 'two-truths', name: 'Two Truths & a Lie', icon: 'finger-print', players: '3-8', color: colors.coral[400] },
    { type: 'sketch-duel', name: 'Sketch Duel', icon: 'brush', players: '3-8', color: colors.emerald[400] },
    { type: 'emoji-charades', name: 'Emoji Charades', icon: 'happy', players: '3-8', color: colors.amber[500] },
    { type: 'predict', name: 'Predict', icon: 'people', players: '3-8', color: colors.azure[500] },
    { type: 'wavelength', name: 'Wavelength', icon: 'radio', players: '2-8', color: colors.emerald[500] },
    { type: 'infiltrator', name: 'Infiltrator', icon: 'eye-off', players: '4-8', color: colors.coral[500] },
    { type: 'trivia', name: 'Rapid Fire', icon: 'flash', players: '2-8', color: colors.amber[500] },
    { type: 'speed-match', name: 'Speed Match', icon: 'speedometer', players: '1-2', color: colors.coral[500] },
    { type: 'word-blitz', name: 'Word Blitz', icon: 'text', players: '1-2', color: colors.emerald[500] },
    { type: 'cipher', name: 'Cipher', icon: 'grid', players: '4-8', color: colors.gold[500] },
];

// ============================================
// Types
// ============================================

interface Connection {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    isOnline?: boolean;
}

interface PlayWithFriendSheetProps {
    visible: boolean;
    onClose: () => void;
    targetUser?: { id: string; displayName: string; username: string; avatarUrl?: string };
}

// ============================================
// Friend Picker Step
// ============================================

function FriendPickerStep({
    onSelectFriend,
}: {
    onSelectFriend: (friend: Connection) => void;
}) {
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setLoading(true);
        apiFetch<{ connections?: Connection[]; users?: Connection[]; data?: Connection[] }>(API.connections)
            .then((data) => {
                const list = data.connections || data.users || data.data || [];
                setConnections(Array.isArray(list) ? list : []);
            })
            .catch(() => setConnections([]))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        let list = connections;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(
                (c) =>
                    c.displayName.toLowerCase().includes(q) ||
                    c.username.toLowerCase().includes(q)
            );
        }
        // Online first, then alphabetical
        return [...list].sort((a, b) => {
            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;
            return a.displayName.localeCompare(b.displayName);
        });
    }, [connections, searchQuery]);

    const renderFriend = useCallback(({ item, index }: { item: Connection; index: number }) => (
        <Animated.View entering={FadeInDown.delay(Math.min(index * 40, 250)).duration(350).springify()}>
            <TouchableOpacity
                style={styles.friendRow}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onSelectFriend(item);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Play with ${item.displayName}`}
            >
                <View style={styles.friendAvatarWrap}>
                    <Image
                        source={{ uri: item.avatarUrl || undefined }}
                        style={styles.friendAvatar}
                        placeholder={AVATAR_PLACEHOLDER.blurhash}
                        transition={150}
                        cachePolicy="memory-disk"
                    />
                    {item.isOnline && <View style={styles.friendOnlineDot} />}
                </View>
                <View style={styles.friendInfo}>
                    <Text style={styles.friendName} numberOfLines={1}>{item.displayName}</Text>
                    <View style={styles.friendMetaRow}>
                        <Text style={styles.friendUsername} numberOfLines={1}>@{item.username}</Text>
                        {item.isOnline && (
                            <View style={styles.friendOnlineLabel}>
                                <View style={styles.friendOnlineDotSmall} />
                                <Text style={styles.friendOnlineText}>Online</Text>
                            </View>
                        )}
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
            </TouchableOpacity>
        </Animated.View>
    ), [onSelectFriend]);

    return (
        <>
            <Animated.View entering={FadeIn.delay(100).duration(300)}>
                <Text style={styles.stepTitle}>Who do you want to play with?</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(120).duration(400)}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={16} color={colors.text.muted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search connections..."
                        placeholderTextColor={colors.text.muted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="search"
                        accessibilityLabel="Search connections"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearchQuery('')}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="close-circle" size={16} color={colors.text.muted} />
                        </TouchableOpacity>
                    )}
                </View>
            </Animated.View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.gold[400]} />
                </View>
            ) : filtered.length > 0 ? (
                <FlatList
                    data={filtered}
                    renderItem={renderFriend}
                    keyExtractor={(item) => item.id}
                    style={styles.friendList}
                    contentContainerStyle={styles.friendListContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={32} color={colors.text.muted} />
                    <Text style={styles.emptyText}>
                        {searchQuery.trim() ? 'No connections match your search' : 'No connections yet'}
                    </Text>
                </View>
            )}
        </>
    );
}

// ============================================
// Game Picker Step
// ============================================

function GamePickerStep({
    friend,
    onSelectGame,
    isCreating,
}: {
    friend: { id: string; displayName: string; avatarUrl?: string };
    onSelectGame: (gameType: string) => void;
    isCreating: boolean;
}) {
    const renderGame = useCallback(({ item, index }: { item: MultiplayerGame; index: number }) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const delay = 100 + row * 80 + col * 40;

        return (
            <Animated.View
                entering={FadeInDown.delay(delay).duration(400).springify()}
                style={styles.gameCardWrapper}
            >
                <TouchableOpacity
                    style={styles.gameCard}
                    onPress={() => {
                        if (!isCreating) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onSelectGame(item.type);
                        }
                    }}
                    activeOpacity={isCreating ? 1 : 0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${item.name} with ${friend.displayName}`}
                >
                    <LinearGradient
                        colors={[item.color + '20', item.color + '08']}
                        style={StyleSheet.absoluteFill}
                    />
                    {/* Accent strip */}
                    <LinearGradient
                        colors={[item.color, item.color + '00']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gameCardAccent}
                    />
                    <View style={[styles.gameIconBg, { backgroundColor: item.color + '20' }]}>
                        <Ionicons name={item.icon} size={24} color={item.color} />
                    </View>
                    <Text style={styles.gameCardName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.gameCardMeta}>
                        <Ionicons name="people-outline" size={11} color={colors.text.muted} />
                        <Text style={styles.gameCardPlayers}>{item.players}</Text>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    }, [friend.displayName, isCreating, onSelectGame]);

    return (
        <>
            {/* Friend header */}
            <Animated.View entering={FadeIn.delay(80).duration(300)} style={styles.friendHeader}>
                <Image
                    source={{ uri: friend.avatarUrl || undefined }}
                    style={styles.friendHeaderAvatar}
                    placeholder={AVATAR_PLACEHOLDER.blurhash}
                    transition={150}
                    cachePolicy="memory-disk"
                />
                <View>
                    <Text style={styles.friendHeaderLabel}>Play with</Text>
                    <Text style={styles.friendHeaderName}>{friend.displayName}</Text>
                </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                <Text style={styles.sectionLabel}>CHOOSE A GAME</Text>
            </Animated.View>

            {isCreating && (
                <Animated.View entering={FadeIn.duration(200)} style={styles.creatingOverlay}>
                    <ActivityIndicator size="small" color={colors.gold[400]} />
                    <Text style={styles.creatingText}>Creating game...</Text>
                </Animated.View>
            )}

            <FlatList
                data={MULTIPLAYER_GAMES}
                renderItem={renderGame}
                keyExtractor={(item) => item.type}
                numColumns={2}
                columnWrapperStyle={styles.gameGridRow}
                style={styles.gameGrid}
                contentContainerStyle={styles.gameGridContent}
                showsVerticalScrollIndicator={false}
            />
        </>
    );
}

// ============================================
// Main Component
// ============================================

export function PlayWithFriendSheet({ visible, onClose, targetUser }: PlayWithFriendSheetProps) {
    const router = useRouter();
    const gameStore = useGameStore();

    const [step, setStep] = useState<'friend' | 'game'>('friend');
    const [selectedFriend, setSelectedFriend] = useState<Connection | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // If targetUser is provided, skip to game selection
    useEffect(() => {
        if (visible && targetUser) {
            setSelectedFriend({
                id: targetUser.id,
                displayName: targetUser.displayName,
                username: targetUser.username,
                avatarUrl: targetUser.avatarUrl,
            });
            setStep('game');
        }
    }, [visible, targetUser]);

    // Reset state when sheet closes
    useEffect(() => {
        if (!visible) {
            setStep(targetUser ? 'game' : 'friend');
            setSelectedFriend(targetUser ? {
                id: targetUser.id,
                displayName: targetUser.displayName,
                username: targetUser.username,
                avatarUrl: targetUser.avatarUrl,
            } : null);
            setIsCreating(false);
        }
    }, [visible, targetUser]);

    const handleSelectFriend = useCallback((friend: Connection) => {
        setSelectedFriend(friend);
        setStep('game');
    }, []);

    const handleSelectGame = useCallback(async (gameType: string) => {
        if (!selectedFriend || isCreating) return;
        setIsCreating(true);

        try {
            const code = await gameStore.createGame(gameType);
            if (code) {
                // Auto-invite the friend
                socketManager.sendGameInvite(code, selectedFriend.id, gameType);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showSuccess(`Game created! Invited ${selectedFriend.displayName}`);
                onClose();
                router.push(`/games/lobby/${code}`);
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Game Creation Failed', gameStore.error || 'Unable to create game. Please try again.');
            }
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showError('Could not create game');
        } finally {
            setIsCreating(false);
        }
    }, [selectedFriend, isCreating, gameStore, onClose, router]);

    const handleBack = useCallback(() => {
        if (step === 'game' && !targetUser) {
            setStep('friend');
            setSelectedFriend(null);
        } else {
            onClose();
        }
    }, [step, targetUser, onClose]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={handleBack}
        >
            <Pressable
                style={styles.overlay}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close sheet"
            >
                <Pressable
                    style={styles.sheet}
                    onPress={(e) => e.stopPropagation()}
                >
                    <Animated.View entering={FadeInDown.duration(400).springify()}>
                        {/* ---- Drag Handle ---- */}
                        <View style={styles.handleContainer}>
                            <View style={styles.handle} />
                        </View>

                        {/* ---- Header with back button ---- */}
                        <View style={styles.headerRow}>
                            {(step === 'game' && !targetUser) && (
                                <TouchableOpacity
                                    onPress={handleBack}
                                    style={styles.backBtn}
                                    activeOpacity={0.7}
                                    accessibilityLabel="Go back"
                                >
                                    <Ionicons name="chevron-back" size={20} color={colors.text.secondary} />
                                </TouchableOpacity>
                            )}
                            <Text style={styles.title}>
                                {step === 'friend' ? 'Play with a Friend' : 'Pick a Game'}
                            </Text>
                            <View style={styles.headerSpacer} />
                        </View>

                        {/* ---- Content ---- */}
                        {step === 'friend' ? (
                            <FriendPickerStep onSelectFriend={handleSelectFriend} />
                        ) : selectedFriend ? (
                            <GamePickerStep
                                friend={selectedFriend}
                                onSelectGame={handleSelectGame}
                                isCreating={isCreating}
                            />
                        ) : null}
                    </Animated.View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.surface.overlayMedium,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.obsidian[800],
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing['3xl'],
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: colors.border.subtle,
        maxHeight: '88%',
    },

    // ---- Handle ----
    handleContainer: {
        alignItems: 'center',
        paddingTop: spacing.sm,
        paddingBottom: spacing.xs,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.text.muted + '40',
    },

    // ---- Header ----
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: colors.surface.glass,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border.subtle,
        marginRight: spacing.sm,
    },
    title: {
        flex: 1,
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        textAlign: 'center',
    },
    headerSpacer: {
        width: 36,
    },

    // ---- Step Title ----
    stepTitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },

    // ---- Search ----
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.obsidian[700],
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        marginBottom: spacing.md,
    },
    searchInput: {
        flex: 1,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        paddingVertical: 0,
    },

    // ---- Section Label ----
    sectionLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: spacing.sm,
    },

    // ---- Loading ----
    loadingContainer: {
        paddingVertical: spacing['2xl'],
        alignItems: 'center',
    },

    // ---- Friend List ----
    friendList: {
        maxHeight: 380,
    },
    friendListContent: {
        gap: spacing.xs,
        paddingBottom: spacing.md,
    },
    friendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        gap: spacing.md,
    },
    friendAvatarWrap: {
        position: 'relative',
    },
    friendAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: colors.border.subtle,
    },
    friendOnlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: colors.emerald[500],
        borderWidth: 2.5,
        borderColor: colors.obsidian[800],
    },
    friendInfo: {
        flex: 1,
    },
    friendName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 2,
    },
    friendMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    friendUsername: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
    friendOnlineLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    friendOnlineDotSmall: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.emerald[500],
    },
    friendOnlineText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.emerald[500],
    },

    // ---- Empty ----
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: spacing['2xl'],
        gap: spacing.sm,
    },
    emptyText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        textAlign: 'center',
    },

    // ---- Friend Header (game step) ----
    friendHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.lg,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.gold[500] + '25',
    },
    friendHeaderAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: colors.gold[500] + '40',
    },
    friendHeaderLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
    friendHeaderName: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.gold[400],
    },

    // ---- Creating Overlay ----
    creatingOverlay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        marginBottom: spacing.sm,
    },
    creatingText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.gold[400],
    },

    // ---- Game Grid ----
    gameGrid: {
        maxHeight: 380,
    },
    gameGridContent: {
        gap: GAME_CARD_GAP,
        paddingBottom: spacing.md,
    },
    gameGridRow: {
        gap: GAME_CARD_GAP,
    },
    gameCardWrapper: {
        width: GAME_CARD_WIDTH,
    },
    gameCard: {
        borderRadius: 16,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border.subtle,
        backgroundColor: colors.surface.glass,
        overflow: 'hidden',
        position: 'relative',
        minHeight: 130,
    },
    gameCardAccent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    gameIconBg: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    gameCardName: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    gameCardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    gameCardPlayers: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
});
