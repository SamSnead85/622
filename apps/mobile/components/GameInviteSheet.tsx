// ============================================
// GameInviteSheet — Bottom sheet for inviting players
// 1. Shows 1st-degree connections with online status
// 2. Search/filter connections by name
// 3. One-tap invite with invited state
// 4. External sharing for non-app friends
// ============================================

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Share,
    Pressable,
    Dimensions,
    Linking,
    FlatList,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, FadeInRight } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { showSuccess } from '../stores/toastStore';
import { apiFetch, API } from '../lib/api';
import { socketManager } from '../lib/socket';
import { AVATAR_PLACEHOLDER } from '../lib/imagePlaceholder';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEEP_LINK_BASE = 'https://0gravity.ai/game';

interface Connection {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    isOnline?: boolean;
}

interface GameInviteSheetProps {
    code: string;
    gameType?: string;
    visible: boolean;
    onClose: () => void;
}

export function GameInviteSheet({ code, gameType, visible, onClose }: GameInviteSheetProps) {
    const gameUrl = `${DEEP_LINK_BASE}/${code}`;
    const shareMessage = `Join my game on 0G! Tap to play — no account needed, just pick a username:\n\n${gameUrl}`;

    const [connections, setConnections] = useState<Connection[]>([]);
    const [loadingConnections, setLoadingConnections] = useState(false);
    const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    // ---- Load 1st-degree connections when sheet opens ----
    useEffect(() => {
        if (!visible) {
            setInvitedIds(new Set());
            setSearchQuery('');
            return;
        }
        setLoadingConnections(true);
        apiFetch<{ connections?: Connection[]; users?: Connection[]; data?: Connection[] }>(API.connections)
            .then((data) => {
                const list = data.connections || data.users || data.data || [];
                setConnections(Array.isArray(list) ? list : []);
            })
            .catch(() => {
                setConnections([]);
            })
            .finally(() => setLoadingConnections(false));
    }, [visible]);

    // ---- Filter and sort: online first, then alphabetical, filtered by search ----
    const filteredConnections = useMemo(() => {
        let list = connections;

        // Filter by search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(
                (c) =>
                    c.displayName.toLowerCase().includes(q) ||
                    c.username.toLowerCase().includes(q)
            );
        }

        // Sort: online first, then alphabetical
        return [...list].sort((a, b) => {
            if (a.isOnline && !b.isOnline) return -1;
            if (!a.isOnline && b.isOnline) return 1;
            return a.displayName.localeCompare(b.displayName);
        });
    }, [connections, searchQuery]);

    // ---- Invite a connection directly ----
    const handleInvite = useCallback((connection: Connection) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        socketManager.sendGameInvite(code, connection.id, gameType);
        setInvitedIds((prev) => new Set(prev).add(connection.id));
        showSuccess(`Invited ${connection.displayName}!`);
    }, [code, gameType]);

    // ---- Share via native sheet ----
    const handleShare = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await Share.share({ message: shareMessage });
        } catch {
            // User cancelled
        }
    }, [shareMessage]);

    // ---- Render a single connection row ----
    const renderConnection = useCallback(({ item, index }: { item: Connection; index: number }) => {
        const isInvited = invitedIds.has(item.id);
        return (
            <Animated.View entering={FadeInDown.delay(Math.min(index * 40, 300)).duration(350).springify()}>
                <View style={styles.connectionRow}>
                    {/* Avatar with online indicator */}
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: item.avatarUrl || undefined }}
                            style={styles.avatar}
                            placeholder={AVATAR_PLACEHOLDER.blurhash}
                            transition={150}
                            cachePolicy="memory-disk"
                        />
                        {item.isOnline && <View style={styles.onlineDot} />}
                    </View>

                    {/* Name & username */}
                    <View style={styles.connectionInfo}>
                        <Text style={styles.connectionName} numberOfLines={1}>
                            {item.displayName}
                        </Text>
                        <View style={styles.connectionMeta}>
                            <Text style={styles.connectionUsername} numberOfLines={1}>
                                @{item.username}
                            </Text>
                            {item.isOnline && (
                                <View style={styles.onlineLabel}>
                                    <View style={styles.onlineDotSmall} />
                                    <Text style={styles.onlineText}>Online</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Invite / Invited button */}
                    {isInvited ? (
                        <View style={styles.invitedBadge}>
                            <Ionicons name="checkmark-circle" size={16} color={colors.emerald[500]} />
                            <Text style={styles.invitedText}>Invited</Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.inviteBtn}
                            onPress={() => handleInvite(item)}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={`Invite ${item.displayName}`}
                        >
                            <Text style={styles.inviteBtnText}>Invite</Text>
                            <Ionicons name="arrow-forward" size={14} color={colors.gold[500]} />
                        </TouchableOpacity>
                    )}
                </View>
            </Animated.View>
        );
    }, [invitedIds, handleInvite]);

    const keyExtractor = useCallback((item: Connection) => item.id, []);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <Pressable
                style={styles.overlay}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close invite sheet"
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

                        {/* ---- Title & Room Code ---- */}
                        <Animated.View entering={FadeIn.delay(100).duration(300)}>
                            <Text style={styles.title}>Invite Players</Text>
                            <View style={styles.roomCodeRow}>
                                <Ionicons name="keypad-outline" size={12} color={colors.text.muted} />
                                <Text style={styles.roomCodeText}>Room: {code}</Text>
                            </View>
                        </Animated.View>

                        {/* ---- Search Bar ---- */}
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

                        {/* ---- Connections List ---- */}
                        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
                            <Text style={styles.sectionLabel}>YOUR CONNECTIONS</Text>
                        </Animated.View>

                        {loadingConnections ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color={colors.gold[400]} />
                            </View>
                        ) : filteredConnections.length > 0 ? (
                            <FlatList
                                data={filteredConnections}
                                renderItem={renderConnection}
                                keyExtractor={keyExtractor}
                                style={styles.connectionsList}
                                contentContainerStyle={styles.connectionsListContent}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                            />
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="people-outline" size={28} color={colors.text.muted} />
                                <Text style={styles.emptyText}>
                                    {searchQuery.trim()
                                        ? 'No connections match your search'
                                        : 'No connections yet — share a link instead'}
                                </Text>
                            </View>
                        )}

                        {/* ---- External Sharing Section ---- */}
                        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                            <View style={styles.divider}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>invite friends outside 0G</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            <Text style={styles.externalNote}>
                                They can play instantly as a guest — just a username
                            </Text>

                            <View style={styles.quickShareRow}>
                                <TouchableOpacity
                                    onPress={() => Linking.openURL(`whatsapp://send?text=${encodeURIComponent(shareMessage)}`)}
                                    activeOpacity={0.7}
                                    accessibilityLabel="Share via WhatsApp"
                                >
                                    <View style={styles.quickShareBtn}>
                                        <Ionicons name="logo-whatsapp" size={22} color={colors.emerald[500]} />
                                        <Text style={styles.quickShareLabel}>WhatsApp</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => Linking.openURL(`sms:&body=${encodeURIComponent(shareMessage)}`)}
                                    activeOpacity={0.7}
                                    accessibilityLabel="Share via iMessage"
                                >
                                    <View style={styles.quickShareBtn}>
                                        <Ionicons name="chatbubble-outline" size={22} color={colors.azure[500]} />
                                        <Text style={styles.quickShareLabel}>iMessage</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleShare}
                                    activeOpacity={0.7}
                                    accessibilityLabel="More sharing options"
                                >
                                    <View style={styles.quickShareBtn}>
                                        <Ionicons name="share-outline" size={22} color={colors.gold[500]} />
                                        <Text style={styles.quickShareLabel}>More</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>

                        {/* ---- Share Invite Link Button ---- */}
                        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                            <TouchableOpacity
                                onPress={handleShare}
                                activeOpacity={0.8}
                                style={styles.shareButton}
                                accessibilityLabel="Share game invite link"
                            >
                                <Ionicons name="share-social" size={18} color={colors.text.inverse} />
                                <Text style={styles.shareButtonText}>Share Invite Link</Text>
                            </TouchableOpacity>
                        </Animated.View>
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
        maxHeight: '85%',
    },

    // ---- Handle ----
    handleContainer: {
        alignItems: 'center',
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.text.muted + '40',
    },

    // ---- Title & Room Code ----
    title: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    roomCodeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        marginBottom: spacing.md,
    },
    roomCodeText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
        letterSpacing: 1,
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

    // ---- Connections List ----
    loadingContainer: {
        paddingVertical: spacing.xl,
        alignItems: 'center',
    },
    connectionsList: {
        maxHeight: 260,
    },
    connectionsListContent: {
        gap: spacing.xs,
        paddingBottom: spacing.sm,
    },
    connectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        gap: spacing.md,
    },

    // ---- Avatar ----
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: colors.border.subtle,
    },
    onlineDot: {
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

    // ---- Connection Info ----
    connectionInfo: {
        flex: 1,
    },
    connectionName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 2,
    },
    connectionMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    connectionUsername: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
    onlineLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    onlineDotSmall: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.emerald[500],
    },
    onlineText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.emerald[500],
    },

    // ---- Invite Button ----
    inviteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 10,
        backgroundColor: colors.gold[500] + '15',
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
    },
    inviteBtnText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.gold[500],
    },

    // ---- Invited Badge ----
    invitedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 10,
        backgroundColor: colors.emerald[500] + '15',
        borderWidth: 1,
        borderColor: colors.emerald[500] + '30',
    },
    invitedText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.emerald[500],
    },

    // ---- Empty State ----
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        gap: spacing.sm,
    },
    emptyText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        textAlign: 'center',
    },

    // ---- Divider ----
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border.subtle,
    },
    dividerText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginHorizontal: spacing.md,
    },

    // ---- External Note ----
    externalNote: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        textAlign: 'center',
        marginBottom: spacing.md,
    },

    // ---- Quick Share ----
    quickShareRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.xl,
        marginBottom: spacing.lg,
    },
    quickShareBtn: {
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 14,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        minWidth: 80,
    },
    quickShareLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.secondary,
    },

    // ---- Share Button ----
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.gold[500],
        paddingVertical: spacing.md + 2,
        borderRadius: 14,
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    shareButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.inverse,
    },
});
