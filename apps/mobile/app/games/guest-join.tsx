// ============================================
// Guest Join — Lightweight screen for unregistered
// users joining a game via invite link
// Premium feel, minimal friction
// ============================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    FadeInDown,
    FadeInUp,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    interpolate,
    Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '@zerog/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { ScreenHeader, GlassCard } from '../../components';

const GUEST_NAME_KEY = '@guest-name';

// Game type display map
const GAME_NAMES: Record<string, { name: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
    trivia: { name: 'Rapid Fire', icon: 'flash', color: colors.amber[500] },
    predict: { name: 'Predict', icon: 'people', color: colors.azure[500] },
    wavelength: { name: 'Wavelength', icon: 'radio', color: colors.emerald[500] },
    infiltrator: { name: 'Infiltrator', icon: 'eye-off', color: colors.coral[500] },
    cipher: { name: 'Cipher', icon: 'grid', color: colors.gold[500] },
};

// ============================================
// Floating Orb Background Decoration
// ============================================

function FloatingOrbs() {
    const float = useSharedValue(0);

    useEffect(() => {
        float.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
        );
    }, [float]);

    const orbStyle1 = useAnimatedStyle(() => ({
        transform: [
            { translateY: interpolate(float.value, [0, 1], [0, -12]) },
            { translateX: interpolate(float.value, [0, 1], [0, 6]) },
        ],
        opacity: interpolate(float.value, [0, 0.5, 1], [0.15, 0.25, 0.15]),
    }));

    const orbStyle2 = useAnimatedStyle(() => ({
        transform: [
            { translateY: interpolate(float.value, [0, 1], [0, 8]) },
            { translateX: interpolate(float.value, [0, 1], [0, -8]) },
        ],
        opacity: interpolate(float.value, [0, 0.5, 1], [0.1, 0.2, 0.1]),
    }));

    return (
        <>
            <Animated.View style={[styles.orb, styles.orb1, orbStyle1]} />
            <Animated.View style={[styles.orb, styles.orb2, orbStyle2]} />
        </>
    );
}

// ============================================
// Guest Join Screen
// ============================================

export default function GuestJoinScreen() {
    const { colors: c } = useTheme();
    const router = useRouter();
    const { code, gameType } = useLocalSearchParams<{ code: string; gameType?: string }>();
    const [guestName, setGuestName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<TextInput>(null);

    const roomCode = (code || '').toUpperCase();
    const gameInfo = GAME_NAMES[gameType || ''] || { name: 'Game', icon: 'game-controller' as const, color: colors.gold[500] };

    // Load saved guest name on mount
    useEffect(() => {
        AsyncStorage.getItem(GUEST_NAME_KEY).then((savedName) => {
            if (savedName) {
                setGuestName(savedName);
            }
        });
    }, []);

    // Focus input immediately after mount animation
    useEffect(() => {
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    // ---- Proceed to lobby ----
    const proceedToLobby = useCallback(() => {
        router.replace(`/games/lobby/${roomCode}` as any);
    }, [roomCode, router]);

    // ---- Join Game as Guest (streamlined: name → lobby, no interstitials) ----
    const handleJoinGame = useCallback(async () => {
        const trimmedName = guestName.trim();
        if (!trimmedName) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        setIsLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Keyboard.dismiss();

        try {
            // Save guest name for future sessions
            await AsyncStorage.setItem(GUEST_NAME_KEY, trimmedName);
            // Go directly to lobby — no interstitial CTA
            proceedToLobby();
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsLoading(false);
        }
    }, [guestName, proceedToLobby]);

    // ---- Navigate to Sign In ----
    const handleSignIn = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/(auth)/login' as any);
    }, [router]);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
                style={StyleSheet.absoluteFill}
            />

            {/* Background decoration */}
            <FloatingOrbs />

            <ScreenHeader title="Join Game" showBack noBorder />

            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={100}
            >
                <View style={styles.inner}>
                    {/* ---- Game Badge ---- */}
                    <Animated.View entering={FadeInDown.delay(100).duration(500).springify()} style={styles.gameBadgeContainer}>
                        <GlassCard gold style={styles.gameBadge} padding="md">
                            <LinearGradient
                                colors={[gameInfo.color + '25', gameInfo.color + '08']}
                                style={styles.gameBadgeIcon}
                            >
                                <Ionicons name={gameInfo.icon} size={28} color={gameInfo.color} />
                            </LinearGradient>
                            <View style={styles.gameBadgeText}>
                                <Text style={styles.gameBadgeName}>{gameInfo.name}</Text>
                                <View style={styles.codeRow}>
                                    <Text style={styles.codeLabel}>Room </Text>
                                    <Text style={styles.codeValue}>{roomCode}</Text>
                                </View>
                            </View>
                        </GlassCard>
                    </Animated.View>

                    {/* ---- Welcome Message ---- */}
                    <Animated.View entering={FadeInDown.delay(200).duration(500).springify()} style={styles.welcomeContainer}>
                        <Text style={styles.welcomeTitle}>What should we call you?</Text>
                        <Text style={styles.welcomeSubtitle}>
                            Pick a name so other players know who you are
                        </Text>
                    </Animated.View>

                    {/* ---- Name Input ---- */}
                    <Animated.View entering={FadeInDown.delay(300).duration(500).springify()}>
                        <GlassCard style={styles.inputCard} padding="none">
                            <View style={styles.inputWrapper}>
                                <View style={styles.inputIconContainer}>
                                    <Ionicons name="person-outline" size={20} color={colors.gold[500]} />
                                </View>
                                <TextInput
                                    ref={inputRef}
                                    style={styles.nameInput}
                                    placeholder="Your display name"
                                    placeholderTextColor={colors.text.muted}
                                    value={guestName}
                                    onChangeText={(text) => setGuestName(text.slice(0, 20))}
                                    maxLength={20}
                                    autoCapitalize="words"
                                    autoCorrect={false}
                                    autoFocus
                                    returnKeyType="go"
                                    onSubmitEditing={handleJoinGame}
                                    selectionColor={colors.gold[500]}
                                    accessibilityLabel="Display name input"
                                />
                                {guestName.length > 0 && (
                                    <View style={styles.charCount}>
                                        <Text style={styles.charCountText}>{guestName.length}/20</Text>
                                    </View>
                                )}
                            </View>
                        </GlassCard>
                    </Animated.View>

                    {/* ---- Join Button ---- */}
                    <Animated.View entering={FadeInDown.delay(400).duration(500).springify()}>
                        <TouchableOpacity
                            onPress={handleJoinGame}
                            disabled={!guestName.trim() || isLoading}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Join game"
                            accessibilityState={{ disabled: !guestName.trim() || isLoading }}
                        >
                            <LinearGradient
                                colors={
                                    guestName.trim()
                                        ? [colors.gold[600], colors.gold[500], colors.gold[400]]
                                        : [colors.obsidian[600], colors.obsidian[500], colors.obsidian[600]]
                                }
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[
                                    styles.joinButton,
                                    !guestName.trim() && styles.joinButtonDisabled,
                                ]}
                            >
                                <Ionicons
                                    name="game-controller"
                                    size={22}
                                    color={guestName.trim() ? c.text.inverse : colors.text.muted}
                                />
                                <Text
                                    style={[
                                        styles.joinButtonText,
                                        guestName.trim() ? { color: c.text.inverse } : styles.joinButtonTextDisabled,
                                    ]}
                                >
                                    {isLoading ? 'Joining...' : 'Join Game'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* ---- Sign In Link ---- */}
                    <Animated.View entering={FadeInDown.delay(500).duration(500).springify()} style={styles.signInContainer}>
                        <TouchableOpacity
                            onPress={handleSignIn}
                            activeOpacity={0.7}
                            accessibilityRole="link"
                            accessibilityLabel="Sign in to your account"
                        >
                            <Text style={styles.signInText}>
                                Already have an account?{' '}
                                <Text style={styles.signInLink}>Sign in</Text>
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>

                {/* ---- Bottom CTA ---- */}
                <Animated.View entering={FadeInUp.delay(700).duration(500)} style={styles.bottomCta}>
                    <GlassCard style={styles.bottomCtaCard} padding="md">
                        <View style={styles.bottomCtaContent}>
                            <View style={styles.bottomCtaIconBg}>
                                <Ionicons name="shield-checkmark-outline" size={18} color={colors.gold[400]} />
                            </View>
                            <View style={styles.bottomCtaTextContainer}>
                                <Text style={styles.bottomCtaTitle}>Create a free account</Text>
                                <Text style={styles.bottomCtaDesc}>Save your scores, track stats & challenge friends</Text>
                            </View>
                        </View>
                    </GlassCard>
                </Animated.View>
            </KeyboardAvoidingView>

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
    content: {
        flex: 1,
    },
    inner: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        justifyContent: 'center',
        paddingBottom: spacing['2xl'],
    },

    // ---- Background Orbs ----
    orb: {
        position: 'absolute',
        borderRadius: 999,
    },
    orb1: {
        width: 200,
        height: 200,
        top: '15%',
        right: -60,
        backgroundColor: colors.gold[500],
    },
    orb2: {
        width: 160,
        height: 160,
        bottom: '20%',
        left: -40,
        backgroundColor: colors.azure[500],
    },

    // ---- Game Badge ----
    gameBadgeContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    gameBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        alignSelf: 'center',
    },
    gameBadgeIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gameBadgeText: {
        gap: spacing.xxs,
    },
    gameBadgeName: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
    },
    codeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    codeLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
    codeValue: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.gold[400],
        letterSpacing: 2,
    },

    // ---- Welcome ----
    welcomeContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    welcomeTitle: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    welcomeSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
    },

    // ---- Input ----
    inputCard: {
        marginBottom: spacing.lg,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    inputIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.gold[500] + '12',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    nameInput: {
        flex: 1,
        fontSize: typography.fontSize.lg,
        fontWeight: '600',
        color: colors.text.primary,
        paddingVertical: spacing.lg,
    },
    charCount: {
        backgroundColor: colors.gold[500] + '15',
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: 6,
    },
    charCountText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.gold[500],
    },

    // ---- Join Button ----
    joinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg + 4,
        borderRadius: 16,
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 8,
    },
    joinButtonDisabled: {
        shadowOpacity: 0,
    },
    joinButtonText: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },
    joinButtonTextDisabled: {
        color: colors.text.muted,
    },

    // ---- Sign In ----
    signInContainer: {
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    signInText: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
    },
    signInLink: {
        color: colors.gold[400],
        fontWeight: '600',
    },

    // ---- Bottom CTA ----
    bottomCta: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing['2xl'],
    },
    bottomCtaCard: {
        borderColor: colors.gold[500] + '15',
    },
    bottomCtaContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    bottomCtaIconBg: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.gold[500] + '12',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomCtaTextContainer: {
        flex: 1,
    },
    bottomCtaTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 2,
    },
    bottomCtaDesc: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        lineHeight: 16,
    },
});
