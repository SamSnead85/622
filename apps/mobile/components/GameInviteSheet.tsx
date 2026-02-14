// ============================================
// GameInviteSheet — Bottom sheet for inviting players
// 1. Tap online friends to invite instantly (no code needed)
// 2. Share link to non-app friends (they just enter a username to play)
// ============================================

import React, { useCallback, useState, useEffect } from 'react';
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
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { showSuccess } from '../stores/toastStore';
import { apiFetch, API } from '../lib/api';
import { socketManager } from '../lib/socket';
import { AVATAR_PLACEHOLDER } from '../lib/imagePlaceholder';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEEP_LINK_BASE = 'https://0gravity.ai/game';

interface Friend {
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

    const [friends, setFriends] = useState<Friend[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());

    // ---- Load friends when sheet opens ----
    useEffect(() => {
        if (!visible) {
            setInvitedIds(new Set());
            return;
        }
        setLoadingFriends(true);
        apiFetch<{ users: Friend[] }>(`/api/v1/users/search?q=&limit=20`)
            .then((data) => {
                setFriends(data.users || []);
            })
            .catch(() => {
                setFriends([]);
            })
            .finally(() => setLoadingFriends(false));
    }, [visible]);

    // ---- Invite a friend directly (no code needed for them) ----
    const handleInviteFriend = useCallback((friend: Friend) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        socketManager.sendGameInvite(code, friend.id, gameType);
        setInvitedIds((prev) => new Set(prev).add(friend.id));
        showSuccess(`Invited ${friend.displayName}!`);
    }, [code, gameType]);

    // ---- Share via native sheet (for non-app friends) ----
    const handleShare = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await Share.share({ message: shareMessage });
        } catch {
            // User cancelled
        }
    }, [shareMessage]);

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

                        {/* ---- Title ---- */}
                        <Animated.Text
                            entering={FadeIn.delay(100).duration(300)}
                            style={styles.title}
                        >
                            Invite Players
                        </Animated.Text>

                        {/* ---- Friends Section (tap to invite instantly) ---- */}
                        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                            <Text style={styles.sectionLabel}>TAP TO INVITE</Text>
                            {loadingFriends ? (
                                <View style={styles.friendsLoading}>
                                    <ActivityIndicator size="small" color={colors.gold[400]} />
                                </View>
                            ) : friends.length > 0 ? (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.friendsScroll}
                                >
                                    {friends.map((friend) => {
                                        const isInvited = invitedIds.has(friend.id);
                                        return (
                                            <TouchableOpacity
                                                key={friend.id}
                                                onPress={() => !isInvited && handleInviteFriend(friend)}
                                                activeOpacity={isInvited ? 1 : 0.7}
                                                style={styles.friendItem}
                                            >
                                                <View style={styles.friendAvatarWrap}>
                                                    <Image
                                                        source={{ uri: friend.avatarUrl || undefined }}
                                                        style={styles.friendAvatar}
                                                        placeholder={AVATAR_PLACEHOLDER.blurhash}
                                                        transition={150}
                                                        cachePolicy="memory-disk"
                                                    />
                                                    {isInvited && (
                                                        <View style={styles.invitedBadge}>
                                                            <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                                                        </View>
                                                    )}
                                                </View>
                                                <Text
                                                    style={[
                                                        styles.friendName,
                                                        isInvited && styles.friendNameInvited,
                                                    ]}
                                                    numberOfLines={1}
                                                >
                                                    {friend.displayName.split(' ')[0]}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            ) : (
                                <Text style={styles.noFriendsText}>
                                    No friends found — share a link instead
                                </Text>
                            )}
                        </Animated.View>

                        {/* ---- Divider ---- */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or share with anyone</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* ---- Quick Share Buttons ---- */}
                        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                            <View style={styles.quickShareRow}>
                                <TouchableOpacity
                                    onPress={() => Linking.openURL(`whatsapp://send?text=${encodeURIComponent(shareMessage)}`)}
                                    activeOpacity={0.7}
                                    accessibilityLabel="Share via WhatsApp"
                                >
                                    <View style={styles.quickShareBtn}>
                                        <Ionicons name="logo-whatsapp" size={24} color={colors.emerald[500]} />
                                        <Text style={styles.quickShareLabel}>WhatsApp</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => Linking.openURL(`sms:&body=${encodeURIComponent(shareMessage)}`)}
                                    activeOpacity={0.7}
                                    accessibilityLabel="Share via iMessage"
                                >
                                    <View style={styles.quickShareBtn}>
                                        <Ionicons name="chatbubble-outline" size={24} color={colors.azure[500]} />
                                        <Text style={styles.quickShareLabel}>iMessage</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleShare}
                                    activeOpacity={0.7}
                                    accessibilityLabel="More sharing options"
                                >
                                    <View style={styles.quickShareBtn}>
                                        <Ionicons name="share-outline" size={24} color={colors.gold[500]} />
                                        <Text style={styles.quickShareLabel}>More</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>

                        {/* ---- Share Button ---- */}
                        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                            <TouchableOpacity
                                onPress={handleShare}
                                activeOpacity={0.8}
                                style={styles.shareButton}
                                accessibilityLabel="Share game invite link"
                            >
                                <Ionicons name="share-social" size={20} color="#FFFFFF" />
                                <Text style={styles.shareButtonText}>Share Invite Link</Text>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* ---- Guest Note ---- */}
                        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
                            <View style={styles.noteContainer}>
                                <Ionicons name="person-outline" size={14} color={colors.text.muted} />
                                <Text style={styles.noteText}>
                                    Friends without the app can play as a guest — just a username
                                </Text>
                            </View>
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
        maxHeight: '80%',
    },

    // ---- Handle ----
    handleContainer: {
        alignItems: 'center',
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.text.muted + '40',
    },

    // ---- Title ----
    title: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.md,
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

    // ---- Friends List ----
    friendsLoading: {
        paddingVertical: spacing.lg,
        alignItems: 'center',
    },
    friendsScroll: {
        paddingBottom: spacing.sm,
        gap: spacing.md,
    },
    friendItem: {
        alignItems: 'center',
        width: 64,
    },
    friendAvatarWrap: {
        position: 'relative',
        marginBottom: 4,
    },
    friendAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: colors.gold[500] + '30',
    },
    invitedBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: colors.emerald[500],
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.obsidian[800],
    },
    friendName: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.text.secondary,
        textAlign: 'center',
    },
    friendNameInvited: {
        color: colors.emerald[500],
    },
    noFriendsText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        textAlign: 'center',
        paddingVertical: spacing.md,
    },

    // ---- Divider ----
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.md,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border.subtle,
    },
    dividerText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginHorizontal: spacing.md,
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
        marginBottom: spacing.md,
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    shareButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: '#FFFFFF',
    },

    // ---- Guest Note ----
    noteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
    },
    noteText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        textAlign: 'center',
        flex: 1,
    },
});
