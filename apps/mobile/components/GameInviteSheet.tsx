// ============================================
// GameInviteSheet — Bottom sheet with all 4 invite methods
// Room code, QR placeholder, native share, manual code entry
// ============================================

import React, { useCallback } from 'react';
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
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { showSuccess } from '../stores/toastStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEEP_LINK_BASE = 'https://0gravity.ai/game';

interface GameInviteSheetProps {
    code: string;
    visible: boolean;
    onClose: () => void;
}

export function GameInviteSheet({ code, visible, onClose }: GameInviteSheetProps) {
    const gameUrl = `${DEEP_LINK_BASE}/${code}`;
    const shareMessage = `🎮 Join my game on 0G!\n\nRoom Code: ${code}\n\nTap to join: ${gameUrl}\n\nDon't have the app? No worries — you can play as a guest!`;

    // ---- Copy link via share sheet ----
    const handleCopy = useCallback(async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            await Share.share({ message: gameUrl });
        } catch {
            // User cancelled
        }
        showSuccess('Link shared!');
    }, [gameUrl]);

    // ---- Share via native sheet ----
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
                            Invite Players
                        </Animated.Text>

                        {/* ---- Room Code Section ---- */}
                        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                            <TouchableOpacity
                                onPress={handleCopy}
                                activeOpacity={0.8}
                                style={styles.codeSection}
                                accessibilityRole="button"
                                accessibilityLabel={`Room code: ${code}. Tap to copy`}
                            >
                                <Text style={styles.codeSectionLabel}>ROOM CODE</Text>
                                <View style={styles.codeRow}>
                                    <Text style={styles.codeText}>{code}</Text>
                                    <View style={styles.copyBadge}>
                                        <Ionicons name="copy-outline" size={16} color={colors.gold[500]} />
                                        <Text style={styles.copyBadgeText}>Copy</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* ---- QR / In-Person Share Section ---- */}
                        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                            <View style={styles.qrSection}>
                                <View style={styles.qrBox}>
                                    <Ionicons name="qr-code-outline" size={40} color={colors.gold[400]} />
                                    <Text style={styles.qrCodeText}>{code}</Text>
                                </View>
                                <Text style={styles.qrHint}>Show this code to others nearby</Text>
                            </View>
                        </Animated.View>

                        {/* ---- Quick Share Buttons ---- */}
                        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                            <View style={styles.quickShareRow}>
                                <TouchableOpacity
                                    onPress={() => Linking.openURL(`whatsapp://send?text=${encodeURIComponent(shareMessage)}`)}
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
                                    onPress={() => Linking.openURL(`sms:&body=${encodeURIComponent(shareMessage)}`)}
                                    activeOpacity={0.7}
                                    accessibilityRole="button"
                                    accessibilityLabel="Share via Messages"
                                >
                                    <View style={styles.quickShareBtn}>
                                        <Ionicons name="chatbubble-outline" size={24} color={colors.azure[500]} />
                                        <Text style={styles.quickShareLabel}>Message</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleCopy}
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
                                accessibilityLabel="Share game invite"
                            >
                                <Ionicons name="share-social" size={20} color={colors.obsidian[900]} />
                                <Text style={styles.shareButtonText}>Share Invite Link</Text>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* ---- Manual Code Note ---- */}
                        <Animated.View entering={FadeInDown.delay(500).duration(400)}>
                            <View style={styles.noteContainer}>
                                <Ionicons name="keypad-outline" size={16} color={colors.text.muted} />
                                <Text style={styles.noteText}>
                                    Or have them type the code in the 0G Arena hub
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

    // ---- Room Code ----
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

    // ---- QR / In-Person Share ----
    qrSection: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    qrBox: {
        width: SCREEN_WIDTH * 0.45,
        aspectRatio: 1,
        backgroundColor: colors.surface.glass,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
    },
    qrCodeText: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        letterSpacing: 6,
    },
    qrHint: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: spacing.sm,
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
        color: colors.obsidian[900],
    },

    // ---- Manual Code Note ----
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
