// ============================================
// CommunityInviteSheet — Bottom sheet for sharing community invites
// Community info, invite code, quick share, native share
// ============================================

import React, { useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Share,
    Pressable,
    Linking,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { showSuccess } from '../stores/toastStore';

const DEEP_LINK_BASE = 'https://0gravity.ai/group';

// ============================================
// Types
// ============================================

interface CommunityInviteSheetProps {
    communityId: string;
    communityName: string;
    memberCount?: number;
    description?: string;
    visible: boolean;
    onClose: () => void;
}

// ============================================
// Helpers
// ============================================

function generateInviteCode(communityId: string): string {
    // Use first 6 chars of a hash-like code from the ID
    const hash = communityId.split('').reduce((acc, char) => {
        return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
    }, 0);
    const code = Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
    return code;
}

// ============================================
// Component
// ============================================

export function CommunityInviteSheet({
    communityId,
    communityName,
    memberCount,
    description,
    visible,
    onClose,
}: CommunityInviteSheetProps) {
    const code = useMemo(() => generateInviteCode(communityId), [communityId]);
    const groupUrl = `${DEEP_LINK_BASE}/${code}`;

    const shareMessage = useMemo(() => {
        const parts = [`🔗 Join ${communityName} on 0G!`];
        if (description) {
            parts.push(`\n${description}`);
        }
        if (memberCount != null && memberCount > 0) {
            parts.push(`\n👥 ${memberCount} members already here`);
        }
        parts.push(`\nTap to join: ${groupUrl}`);
        parts.push('\nNo account needed — join in seconds!');
        return parts.join('\n');
    }, [communityName, description, memberCount, groupUrl]);

    // ---- Copy invite code ----
    const handleCopyCode = useCallback(async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            await Share.share({ message: groupUrl });
        } catch {
            // User cancelled
        }
        showSuccess('Link copied!');
    }, [groupUrl]);

    // ---- Share via native sheet ----
    const handleShare = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await Share.share({ message: shareMessage });
        } catch {
            // User cancelled
        }
    }, [shareMessage]);

    // ---- WhatsApp ----
    const handleWhatsApp = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Linking.openURL(`whatsapp://send?text=${encodeURIComponent(shareMessage)}`);
    }, [shareMessage]);

    // ---- SMS ----
    const handleSMS = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Linking.openURL(`sms:&body=${encodeURIComponent(shareMessage)}`);
    }, [shareMessage]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            {/* ---- Overlay ---- */}
            <Pressable
                style={styles.overlay}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close invite sheet"
            >
                {/* ---- Bottom Sheet ---- */}
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
                            Invite to {communityName}
                        </Animated.Text>

                        {/* ---- Community Info ---- */}
                        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                            <View style={styles.communityInfo}>
                                <View style={styles.communityIconWrapper}>
                                    <Ionicons name="people" size={22} color={colors.gold[400]} />
                                </View>
                                <View style={styles.communityDetails}>
                                    <Text style={styles.communityName} numberOfLines={1}>
                                        {communityName}
                                    </Text>
                                    {memberCount != null && memberCount > 0 && (
                                        <Text style={styles.memberCount}>
                                            {memberCount} {memberCount === 1 ? 'member' : 'members'}
                                        </Text>
                                    )}
                                </View>
                            </View>
                            {description ? (
                                <Text style={styles.description} numberOfLines={2}>
                                    {description}
                                </Text>
                            ) : null}
                        </Animated.View>

                        {/* ---- Invite Code Section ---- */}
                        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                            <TouchableOpacity
                                onPress={handleCopyCode}
                                activeOpacity={0.8}
                                style={styles.codeSection}
                                accessibilityRole="button"
                                accessibilityLabel={`Invite code: ${code}. Tap to copy`}
                            >
                                <Text style={styles.codeSectionLabel}>INVITE CODE</Text>
                                <View style={styles.codeRow}>
                                    <Text style={styles.codeText}>{code}</Text>
                                    <View style={styles.copyBadge}>
                                        <Ionicons name="copy-outline" size={16} color={colors.gold[500]} />
                                        <Text style={styles.copyBadgeText}>Copy</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* ---- Quick Share Buttons ---- */}
                        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                            <View style={styles.quickShareRow}>
                                <TouchableOpacity
                                    onPress={handleWhatsApp}
                                    activeOpacity={0.7}
                                    accessibilityRole="button"
                                    accessibilityLabel="Share via WhatsApp"
                                >
                                    <View style={styles.quickShareBtn}>
                                        <Ionicons name="logo-whatsapp" size={24} color={colors.emerald[500]} />
                                        <Text style={styles.quickShareLabel}>WhatsApp</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSMS}
                                    activeOpacity={0.7}
                                    accessibilityRole="button"
                                    accessibilityLabel="Share via Messages"
                                >
                                    <View style={styles.quickShareBtn}>
                                        <Ionicons name="chatbubble-outline" size={24} color={colors.azure[500]} />
                                        <Text style={styles.quickShareLabel}>Messages</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleCopyCode}
                                    activeOpacity={0.7}
                                    accessibilityRole="button"
                                    accessibilityLabel="Copy invite link"
                                >
                                    <View style={styles.quickShareBtn}>
                                        <Ionicons name="copy-outline" size={24} color={colors.gold[500]} />
                                        <Text style={styles.quickShareLabel}>Copy Link</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>

                        {/* ---- Share Button ---- */}
                        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
                            <TouchableOpacity
                                onPress={handleShare}
                                activeOpacity={0.8}
                                style={styles.shareButton}
                                accessibilityRole="button"
                                accessibilityLabel="Share community invite"
                            >
                                <Ionicons name="share-social" size={20} color={colors.text.inverse} />
                                <Text style={styles.shareButtonText}>Share Invite Link</Text>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* ---- Guest Access Note ---- */}
                        <Animated.View entering={FadeInDown.delay(500).duration(400)}>
                            <View style={styles.noteContainer}>
                                <Ionicons name="person-add-outline" size={16} color={colors.text.muted} />
                                <Text style={styles.noteText}>
                                    Anyone with the link can join — no account needed
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
        marginBottom: spacing.lg,
    },

    // ---- Community Info ----
    communityInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.sm,
    },
    communityIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.gold[500] + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    communityDetails: {
        flex: 1,
    },
    communityName: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
    },
    memberCount: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginTop: 2,
    },
    description: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        lineHeight: 20,
        marginBottom: spacing.lg,
    },

    // ---- Invite Code ----
    codeSection: {
        backgroundColor: colors.surface.goldSubtle,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.gold[500] + '20',
        padding: spacing.lg,
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    codeSectionLabel: {
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
    copyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.gold[500] + '15',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: 10,
    },
    copyBadgeText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.gold[500],
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
        marginBottom: spacing.lg,
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

    // ---- Guest Access Note ----
    noteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    noteText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        textAlign: 'center',
    },
});
