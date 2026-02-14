// ============================================
// Campfire — Go Live Screen
// Create a new livestream with title, category,
// and optional recording toggle
// ============================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    FadeInDown,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    interpolate,
    Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { colors, typography, spacing } from '@zerog/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { ScreenHeader } from '../../components';
import { GlassCard } from '../../components';
import { apiFetch, API } from '../../lib/api';
import { useAuthStore } from '../../stores';

// ============================================
// Categories
// ============================================

const CATEGORIES = [
    { key: 'general', label: 'General', icon: 'chatbubbles' as const },
    { key: 'gaming', label: 'Gaming', icon: 'game-controller' as const },
    { key: 'music', label: 'Music', icon: 'musical-notes' as const },
    { key: 'education', label: 'Education', icon: 'school' as const },
    { key: 'sports', label: 'Sports', icon: 'football' as const },
    { key: 'creative', label: 'Creative', icon: 'color-palette' as const },
    { key: 'talk', label: 'Talk Show', icon: 'mic' as const },
    { key: 'cooking', label: 'Cooking', icon: 'restaurant' as const },
];

// ============================================
// Stream Created Result
// ============================================

interface StreamResult {
    id: string;
    streamKey: string;
    rtmpUrl: string;
    playbackUrl?: string;
}

// ============================================
// Copyable Field
// ============================================

function CopyableField({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false);
    const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
        };
    }, []);

    const handleCopy = useCallback(async () => {
        await Clipboard.setStringAsync(value);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCopied(true);
        if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }, [value]);

    return (
        <View style={styles.copyField}>
            <Text style={styles.copyFieldLabel}>{label}</Text>
            <TouchableOpacity
                style={styles.copyFieldRow}
                onPress={handleCopy}
                activeOpacity={0.7}
            >
                <Text style={styles.copyFieldValue} numberOfLines={1}>
                    {value}
                </Text>
                <View style={[styles.copyBtn, copied && styles.copyBtnCopied]}>
                    <Ionicons
                        name={copied ? 'checkmark' : 'copy-outline'}
                        size={16}
                        color={copied ? colors.emerald[400] : colors.text.muted}
                    />
                </View>
            </TouchableOpacity>
        </View>
    );
}

// ============================================
// Main Screen
// ============================================

export default function GoLiveScreen() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);

    // ---- Form state ----
    const [title, setTitle] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('general');
    const [enableRecording, setEnableRecording] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [streamResult, setStreamResult] = useState<StreamResult | null>(null);

    // ---- Animated pulse for the go-live button ----
    const pulse = useSharedValue(0);

    React.useEffect(() => {
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
        opacity: interpolate(pulse.value, [0, 1], [0.7, 1]),
        transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.02]) }],
    }));

    // ---- Create stream ----
    const handleGoLive = useCallback(async () => {
        if (!title.trim()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Missing Title', 'Please enter a title for your stream.');
            return;
        }

        setIsCreating(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        try {
            const data = await apiFetch<any>(API.livestreamCreate, {
                method: 'POST',
                body: JSON.stringify({
                    title: title.trim(),
                    category: selectedCategory,
                    record: enableRecording,
                }),
            });

            const result: StreamResult = {
                id: data.id || data.stream?.id,
                streamKey: data.streamKey || data.stream?.streamKey || '',
                rtmpUrl: data.rtmpUrl || data.stream?.rtmpUrl || 'rtmp://global-live.mux.com:5222/app',
                playbackUrl: data.playbackUrl || data.stream?.playbackUrl,
            };

            setStreamResult(result);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err: unknown) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Stream Creation Failed', err instanceof Error ? err.message : 'Unable to create stream. Please try again.');
        } finally {
            setIsCreating(false);
        }
    }, [title, selectedCategory, enableRecording]);

    // ---- If stream was created, show the RTMP info ----
    if (streamResult) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
                    style={StyleSheet.absoluteFill}
                />
                <ScreenHeader title="Stream Created" showBack noBorder />

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Success hero */}
                    <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.successHero}>
                        <LinearGradient
                            colors={[colors.emerald[500] + '20', colors.emerald[500] + '05']}
                            style={styles.successIconCircle}
                        >
                            <Ionicons name="checkmark-circle" size={56} color={colors.emerald[400]} />
                        </LinearGradient>
                        <Text style={styles.successTitle}>Stream Ready</Text>
                        <Text style={styles.successSubtitle}>
                            Use the details below to connect your streaming software (OBS, Streamlabs, etc.)
                        </Text>
                    </Animated.View>

                    {/* RTMP Details */}
                    <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                        <GlassCard style={styles.rtmpCard} padding="lg">
                            <View style={styles.rtmpHeader}>
                                <Ionicons name="server-outline" size={18} color={colors.gold[500]} />
                                <Text style={styles.rtmpHeaderText}>Stream Settings</Text>
                            </View>

                            <CopyableField label="RTMP URL" value={streamResult.rtmpUrl} />
                            <CopyableField label="Stream Key" value={streamResult.streamKey} />
                        </GlassCard>
                    </Animated.View>

                    {/* Instructions */}
                    <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                        <GlassCard style={styles.instructionsCard} padding="md">
                            <View style={styles.instructionRow}>
                                <View style={styles.instructionStep}>
                                    <Text style={styles.instructionStepNum}>1</Text>
                                </View>
                                <Text style={styles.instructionText}>
                                    Open OBS or your streaming app
                                </Text>
                            </View>
                            <View style={styles.instructionRow}>
                                <View style={styles.instructionStep}>
                                    <Text style={styles.instructionStepNum}>2</Text>
                                </View>
                                <Text style={styles.instructionText}>
                                    Go to Settings → Stream → Custom RTMP
                                </Text>
                            </View>
                            <View style={styles.instructionRow}>
                                <View style={styles.instructionStep}>
                                    <Text style={styles.instructionStepNum}>3</Text>
                                </View>
                                <Text style={styles.instructionText}>
                                    Paste the RTMP URL and Stream Key above
                                </Text>
                            </View>
                            <View style={styles.instructionRow}>
                                <View style={styles.instructionStep}>
                                    <Text style={styles.instructionStepNum}>4</Text>
                                </View>
                                <Text style={styles.instructionText}>
                                    Click "Start Streaming" — you're live!
                                </Text>
                            </View>
                        </GlassCard>
                    </Animated.View>

                    {/* View stream button */}
                    <Animated.View entering={FadeInDown.delay(400).duration(500)}>
                        <TouchableOpacity
                            style={styles.viewStreamBtn}
                            onPress={() => router.replace(`/campfire/watch/${streamResult.id}`)}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[colors.coral[500], colors.amber[500]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.viewStreamGradient}
                            >
                                <Ionicons name="eye" size={20} color={colors.text.inverse} />
                                <Text style={styles.viewStreamText}>View Your Stream</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    <View style={{ height: spacing['3xl'] }} />
                </ScrollView>
            </View>
        );
    }

    // ---- Creation form ----
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
                style={StyleSheet.absoluteFill}
            />
            <ScreenHeader title="Go Live" showBack noBorder />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Hero */}
                <Animated.View entering={FadeInDown.delay(60).duration(600)} style={styles.formHero}>
                    <LinearGradient
                        colors={[colors.coral[500] + '15', colors.amber[500] + '08']}
                        style={styles.formHeroIconCircle}
                    >
                        <Ionicons name="radio" size={36} color={colors.coral[400]} />
                    </LinearGradient>
                    <Text style={styles.formHeroTitle}>Start Your Stream</Text>
                    <Text style={styles.formHeroSubtitle}>
                        Set up your stream details and go live
                    </Text>
                </Animated.View>

                {/* Title input */}
                <Animated.View entering={FadeInDown.delay(120).duration(500)}>
                    <GlassCard style={styles.formCard} padding="md">
                        <Text style={styles.formLabel}>Stream Title</Text>
                        <TextInput
                            style={styles.titleInput}
                            placeholder="What are you streaming?"
                            placeholderTextColor={colors.text.muted}
                            value={title}
                            onChangeText={setTitle}
                            maxLength={100}
                            autoFocus
                        />
                        <Text style={styles.charCount}>{title.length}/100</Text>
                    </GlassCard>
                </Animated.View>

                {/* Category picker */}
                <Animated.View entering={FadeInDown.delay(180).duration(500)}>
                    <GlassCard style={styles.formCard} padding="md">
                        <Text style={styles.formLabel}>Category</Text>
                        <View style={styles.categoryGrid}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.key}
                                    style={[
                                        styles.categoryOption,
                                        selectedCategory === cat.key && styles.categoryOptionActive,
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSelectedCategory(cat.key);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={cat.icon}
                                        size={18}
                                        color={
                                            selectedCategory === cat.key
                                                ? colors.coral[400]
                                                : colors.text.muted
                                        }
                                    />
                                    <Text
                                        style={[
                                            styles.categoryOptionText,
                                            selectedCategory === cat.key && styles.categoryOptionTextActive,
                                        ]}
                                    >
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </GlassCard>
                </Animated.View>

                {/* Recording toggle */}
                <Animated.View entering={FadeInDown.delay(240).duration(500)}>
                    <GlassCard style={styles.formCard} padding="md">
                        <TouchableOpacity
                            style={styles.toggleRow}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setEnableRecording((prev) => !prev);
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.toggleInfo}>
                                <Ionicons
                                    name="recording-outline"
                                    size={20}
                                    color={enableRecording ? colors.coral[400] : colors.text.muted}
                                />
                                <View>
                                    <Text style={styles.toggleLabel}>Save Recording</Text>
                                    <Text style={styles.toggleDesc}>
                                        Save a VOD after your stream ends
                                    </Text>
                                </View>
                            </View>
                            <View
                                style={[
                                    styles.toggleSwitch,
                                    enableRecording && styles.toggleSwitchActive,
                                ]}
                            >
                                <View
                                    style={[
                                        styles.toggleKnob,
                                        enableRecording && styles.toggleKnobActive,
                                    ]}
                                />
                            </View>
                        </TouchableOpacity>
                    </GlassCard>
                </Animated.View>

                {/* Go Live button */}
                <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                    <TouchableOpacity
                        onPress={handleGoLive}
                        disabled={isCreating}
                        activeOpacity={0.8}
                    >
                        <Animated.View style={pulseStyle}>
                            <LinearGradient
                                colors={
                                    isCreating
                                        ? [colors.obsidian[600], colors.obsidian[500]]
                                        : [colors.coral[500], colors.amber[500]]
                                }
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.goLiveBtn}
                            >
                                {isCreating ? (
                                    <ActivityIndicator size="small" color={colors.text.primary} />
                                ) : (
                                    <>
                                        <Ionicons name="radio" size={22} color={colors.text.inverse} />
                                        <Text style={styles.goLiveBtnText}>Go Live</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </Animated.View>
                    </TouchableOpacity>
                </Animated.View>

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
        paddingTop: spacing.sm,
    },

    // ---- Form Hero ----
    formHero: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    formHeroIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    formHeroTitle: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    formHeroSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
    },

    // ---- Form Cards ----
    formCard: {
        marginBottom: spacing.lg,
    },
    formLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.md,
    },
    titleInput: {
        backgroundColor: colors.obsidian[700],
        borderRadius: 12,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    charCount: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        textAlign: 'right',
        marginTop: spacing.xs,
    },

    // ---- Category Grid ----
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    categoryOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 10,
        backgroundColor: colors.obsidian[700],
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    categoryOptionActive: {
        backgroundColor: colors.coral[500] + '1A',
        borderColor: colors.coral[500] + '40',
    },
    categoryOptionText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.muted,
    },
    categoryOptionTextActive: {
        color: colors.coral[400],
    },

    // ---- Toggle ----
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    toggleInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        flex: 1,
    },
    toggleLabel: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
    toggleDesc: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: 2,
    },
    toggleSwitch: {
        width: 48,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.obsidian[600],
        padding: 3,
        justifyContent: 'center',
    },
    toggleSwitchActive: {
        backgroundColor: colors.coral[500],
    },
    toggleKnob: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.text.muted,
    },
    toggleKnobActive: {
        backgroundColor: colors.text.primary,
        alignSelf: 'flex-end',
    },

    // ---- Go Live Button ----
    goLiveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        borderRadius: 16,
        marginTop: spacing.sm,
    },
    goLiveBtnText: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.inverse,
    },

    // ---- Success State ----
    successHero: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    successIconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    successTitle: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    successSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        paddingHorizontal: spacing.lg,
        lineHeight: 22,
    },

    // ---- RTMP Card ----
    rtmpCard: {
        marginBottom: spacing.lg,
    },
    rtmpHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    rtmpHeaderText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.text.primary,
    },

    // ---- Copy Field ----
    copyField: {
        marginBottom: spacing.md,
    },
    copyFieldLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: spacing.xs,
    },
    copyFieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.obsidian[700],
        borderRadius: 10,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    copyFieldValue: {
        flex: 1,
        fontSize: typography.fontSize.sm,
        fontFamily: 'Inter-Medium',
        color: colors.text.primary,
        marginRight: spacing.sm,
    },
    copyBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.surface.glass,
        alignItems: 'center',
        justifyContent: 'center',
    },
    copyBtnCopied: {
        backgroundColor: colors.emerald[500] + '20',
    },

    // ---- Instructions ----
    instructionsCard: {
        marginBottom: spacing.lg,
    },
    instructionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    instructionStep: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.coral[500] + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    instructionStepNum: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.coral[400],
    },
    instructionText: {
        flex: 1,
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        lineHeight: 20,
    },

    // ---- View Stream Button ----
    viewStreamBtn: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    viewStreamGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        borderRadius: 16,
    },
    viewStreamText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        color: colors.text.inverse,
    },
});
