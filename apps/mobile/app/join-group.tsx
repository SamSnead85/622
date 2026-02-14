// ============================================
// Join Group — Lightweight screen for users
// arriving via an invite link. Join with just
// a username — no email, no password required.
// Premium feel, minimal friction (WhatsApp-like)
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
    ActivityIndicator,
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
import { ScreenHeader, GlassCard } from '../components';
import { useAuthStore } from '../stores';
import { useTheme } from '../contexts/ThemeContext';
import { apiFetch, API } from '../lib/api';

const GUEST_NAME_KEY = '@guest-name';

// UUID v4 regex — used to determine if code is a community ID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================
// Types
// ============================================

interface CommunityInfo {
    id: string;
    name: string;
    description?: string;
    avatarUrl?: string;
    membersCount: number;
    isPublic: boolean;
}

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
// Helper: format member count
// ============================================

function formatMemberCount(count: number): string {
    if (!count) return 'New group';
    if (count === 1) return '1 member';
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K members`;
    return `${count} members`;
}

// ============================================
// Join Group Screen
// ============================================

export default function JoinGroupScreen() {
    const router = useRouter();
    const { code, name } = useLocalSearchParams<{ code: string; name?: string }>();
    const { user, isAuthenticated } = useAuthStore();
    const { colors: c } = useTheme();

    // ---- State ----
    const [displayName, setDisplayName] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [isFetchingInfo, setIsFetchingInfo] = useState(true);
    const [communityInfo, setCommunityInfo] = useState<CommunityInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<TextInput>(null);
    const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Resolve the community ID from the code param
    const communityId = UUID_REGEX.test(code || '') ? code! : null;

    // ---- Load saved guest name on mount ----
    useEffect(() => {
        if (!isAuthenticated) {
            AsyncStorage.getItem(GUEST_NAME_KEY).then((savedName) => {
                if (savedName) setDisplayName(savedName);
            });
        }
    }, [isAuthenticated]);

    // ---- Fetch community info ----
    useEffect(() => {
        async function fetchCommunityInfo() {
            if (!code) {
                setIsFetchingInfo(false);
                setError('Invalid invite link');
                return;
            }

            try {
                // If it looks like a UUID, fetch directly as a community ID
                if (communityId) {
                    const data = await apiFetch<any>(`${API.communities}/${communityId}`);
                    const community = data.community || data;
                    setCommunityInfo({
                        id: community.id,
                        name: community.name || name || 'Community',
                        description: community.description,
                        avatarUrl: community.avatarUrl,
                        membersCount: community.membersCount ?? community._count?.members ?? 0,
                        isPublic: community.isPublic ?? true,
                    });
                } else {
                    // Treat as an invite code — try to resolve it
                    // For now, use the name param as fallback
                    try {
                        const data = await apiFetch<any>(`${API.communities}/invite/${code}`);
                        const community = data.community || data;
                        setCommunityInfo({
                            id: community.id,
                            name: community.name || name || 'Community',
                            description: community.description,
                            avatarUrl: community.avatarUrl,
                            membersCount: community.membersCount ?? community._count?.members ?? 0,
                            isPublic: community.isPublic ?? true,
                        });
                    } catch {
                        // Fallback: if we have a name param, show it anyway
                        if (name) {
                            setCommunityInfo({
                                id: code,
                                name,
                                membersCount: 0,
                                isPublic: true,
                            });
                        } else {
                            setError('Could not find this group. The invite link may have expired.');
                        }
                    }
                }
            } catch {
                // If fetch fails but we have a name, show it anyway for UX
                if (name) {
                    setCommunityInfo({
                        id: communityId || code!,
                        name,
                        membersCount: 0,
                        isPublic: true,
                    });
                } else {
                    setError('Could not load group info. Please check your connection.');
                }
            } finally {
                setIsFetchingInfo(false);
            }
        }

        fetchCommunityInfo();
    }, [code, communityId, name]);

    // ---- Focus input for guests after animation ----
    useEffect(() => {
        if (!isAuthenticated && !isFetchingInfo && communityInfo) {
            focusTimerRef.current = setTimeout(() => {
                inputRef.current?.focus();
            }, 800);
            return () => {
                if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
            };
        }
    }, [isAuthenticated, isFetchingInfo, communityInfo]);

    // ---- Auto-join for authenticated users ----
    useEffect(() => {
        if (isAuthenticated && communityInfo && !isJoining) {
            handleJoinGroup();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, communityInfo]);

    // ---- Join Group ----
    const handleJoinGroup = useCallback(async () => {
        const trimmedName = displayName.trim();
        const resolvedId = communityInfo?.id;

        // Guests must provide a name
        if (!isAuthenticated && !trimmedName) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        if (!resolvedId) {
            setError('Unable to join — group not found.');
            return;
        }

        setIsJoining(true);
        setError(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Keyboard.dismiss();

        try {
            // Save guest name for future sessions
            if (!isAuthenticated && trimmedName) {
                await AsyncStorage.setItem(GUEST_NAME_KEY, trimmedName);
            }

            // Join the community
            const joinUrl = `${API.communities}/${resolvedId}/join`;
            await apiFetch(joinUrl, { method: 'POST' });

            // Haptic success
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Navigate to the community
            router.replace(`/community/${resolvedId}` as any);
        } catch (err: unknown) {
            // If already a member, just navigate there
            if ((err as { status?: number })?.status === 409 || (err instanceof Error && err.message.toLowerCase().includes('already'))) {
                router.replace(`/community/${resolvedId}` as any);
                return;
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setError(err instanceof Error ? err.message : 'Failed to join group. Please try again.');
        } finally {
            setIsJoining(false);
        }
    }, [displayName, communityInfo, isAuthenticated, router]);

    // ---- Navigate to Sign In ----
    const handleSignIn = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/(auth)/login' as any);
    }, [router]);

    // ---- Navigate to Sign Up ----
    const handleCreateAccount = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/(auth)/signup' as any);
    }, [router]);

    // ---- Loading state ----
    if (isFetchingInfo) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
                    style={StyleSheet.absoluteFill}
                />
                <FloatingOrbs />
                <ScreenHeader title="" showBack noBorder />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.gold[500]} />
                    <Text style={styles.loadingText}>Loading group info...</Text>
                </View>
            </View>
        );
    }

    // ---- Error state (no community info) ----
    if (error && !communityInfo) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
                    style={StyleSheet.absoluteFill}
                />
                <FloatingOrbs />
                <ScreenHeader title="" showBack noBorder />
                <View style={styles.loadingContainer}>
                    <Animated.View entering={FadeInDown.duration(500)} style={styles.errorContainer}>
                        <View style={styles.errorIconBg}>
                            <Ionicons name="alert-circle-outline" size={32} color={colors.coral[500]} />
                        </View>
                        <Text style={styles.errorTitle}>Link not found</Text>
                        <Text style={styles.errorMessage}>{error}</Text>
                        <TouchableOpacity
                            style={styles.errorButton}
                            onPress={() => router.back()}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.errorButtonText}>Go Back</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>
        );
    }

    // ---- Authenticated user: show joining state ----
    if (isAuthenticated && isJoining) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
                    style={StyleSheet.absoluteFill}
                />
                <FloatingOrbs />
                <ScreenHeader title="" showBack noBorder />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.gold[500]} />
                    <Text style={styles.loadingText}>
                        Joining {communityInfo?.name || 'group'}...
                    </Text>
                </View>
            </View>
        );
    }

    // ---- Main screen for guests ----
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
                style={StyleSheet.absoluteFill}
            />

            {/* Background decoration */}
            <FloatingOrbs />

            <ScreenHeader title="Join Group" showBack noBorder />

            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={100}
            >
                <View style={styles.inner}>
                    {/* ---- Group Info Card ---- */}
                    <Animated.View entering={FadeInDown.delay(100).duration(500).springify()} style={styles.groupBadgeContainer}>
                        <GlassCard gold style={styles.groupBadge} padding="md">
                            <View style={styles.groupIconContainer}>
                                <LinearGradient
                                    colors={[colors.gold[500] + '25', colors.gold[500] + '08']}
                                    style={styles.groupIcon}
                                >
                                    <Ionicons name="people" size={28} color={colors.gold[500]} />
                                </LinearGradient>
                            </View>
                            <View style={styles.groupBadgeText}>
                                <Text style={styles.groupName} numberOfLines={1}>
                                    {communityInfo?.name || 'Community'}
                                </Text>
                                <View style={styles.memberRow}>
                                    <Ionicons name="people-outline" size={13} color={colors.text.muted} />
                                    <Text style={styles.memberCount}>
                                        {formatMemberCount(communityInfo?.membersCount || 0)}
                                    </Text>
                                </View>
                            </View>
                        </GlassCard>
                    </Animated.View>

                    {/* ---- Welcome Message ---- */}
                    <Animated.View entering={FadeInDown.delay(200).duration(500).springify()} style={styles.welcomeContainer}>
                        <Text style={styles.welcomeTitle}>You're invited!</Text>
                        <Text style={styles.welcomeSubtitle}>
                            Choose a display name to join the group
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
                                    value={displayName}
                                    onChangeText={(text) => setDisplayName(text.slice(0, 24))}
                                    maxLength={24}
                                    autoCapitalize="words"
                                    autoCorrect={false}
                                    returnKeyType="go"
                                    onSubmitEditing={handleJoinGroup}
                                    selectionColor={colors.gold[500]}
                                    accessibilityLabel="Display name input"
                                />
                                {displayName.length > 0 && (
                                    <View style={styles.charCount}>
                                        <Text style={styles.charCountText}>{displayName.length}/24</Text>
                                    </View>
                                )}
                            </View>
                        </GlassCard>
                    </Animated.View>

                    {/* ---- Inline Error ---- */}
                    {error && (
                        <Animated.View entering={FadeInDown.duration(300)}>
                            <Text style={styles.inlineError}>{error}</Text>
                        </Animated.View>
                    )}

                    {/* ---- Join Button ---- */}
                    <Animated.View entering={FadeInDown.delay(400).duration(500).springify()}>
                        <TouchableOpacity
                            onPress={handleJoinGroup}
                            disabled={!displayName.trim() || isJoining}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Join group"
                            accessibilityState={{ disabled: !displayName.trim() || isJoining }}
                        >
                            <LinearGradient
                                colors={
                                    displayName.trim()
                                        ? [colors.gold[600], colors.gold[500], colors.gold[400]]
                                        : [colors.obsidian[600], colors.obsidian[500], colors.obsidian[600]]
                                }
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[
                                    styles.joinButton,
                                    !displayName.trim() && styles.joinButtonDisabled,
                                ]}
                            >
                                {isJoining ? (
                                    <ActivityIndicator size="small" color={c.text.inverse} />
                                ) : (
                                    <Ionicons
                                        name="people"
                                        size={22}
                                        color={displayName.trim() ? c.text.inverse : colors.text.muted}
                                    />
                                )}
                                <Text
                                    style={[
                                        styles.joinButtonText,
                                        displayName.trim() ? { color: c.text.inverse } : styles.joinButtonTextDisabled,
                                    ]}
                                >
                                    {isJoining ? 'Joining...' : 'Join Group'}
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

                {/* ---- Bottom CTA: Create Account ---- */}
                <Animated.View entering={FadeInUp.delay(700).duration(500)} style={styles.bottomCta}>
                    <TouchableOpacity onPress={handleCreateAccount} activeOpacity={0.8}>
                        <GlassCard style={styles.bottomCtaCard} padding="md">
                            <View style={styles.bottomCtaContent}>
                                <View style={styles.bottomCtaIconBg}>
                                    <Ionicons name="shield-checkmark-outline" size={18} color={colors.gold[400]} />
                                </View>
                                <View style={styles.bottomCtaTextContainer}>
                                    <Text style={styles.bottomCtaTitle}>Create a free account</Text>
                                    <Text style={styles.bottomCtaDesc}>
                                        Keep your groups, save posts & more
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
                            </View>
                        </GlassCard>
                    </TouchableOpacity>
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

    // ---- Loading ----
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.lg,
    },
    loadingText: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
    },

    // ---- Error ----
    errorContainer: {
        alignItems: 'center',
        paddingHorizontal: spacing['2xl'],
        gap: spacing.md,
    },
    errorIconBg: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: colors.coral[500] + '12',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    errorTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        textAlign: 'center',
    },
    errorMessage: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    errorButton: {
        marginTop: spacing.md,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    errorButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
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

    // ---- Group Badge ----
    groupBadgeContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    groupBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        alignSelf: 'center',
    },
    groupIconContainer: {
        // Wrapper so icon stays centered
    },
    groupIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    groupBadgeText: {
        gap: spacing.xxs,
        flexShrink: 1,
    },
    groupName: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    memberCount: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
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

    // ---- Inline Error ----
    inlineError: {
        fontSize: typography.fontSize.sm,
        color: colors.coral[500],
        textAlign: 'center',
        marginBottom: spacing.md,
    },

    // ---- Join Button ----
    joinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        borderRadius: 16,
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    joinButtonDisabled: {
        shadowOpacity: 0,
    },
    joinButtonText: {
        fontSize: typography.fontSize.lg,
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
