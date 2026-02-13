import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Switch,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API } from '../../lib/api';
import { ScreenHeader, LoadingView } from '../../components';
import { showError } from '../../stores/toastStore';

interface FeedPreferences {
    recencyWeight: number;
    engagementWeight: number;
    followingRatio: number;
    contentTypes: Record<string, number>;
}

const DEFAULTS: FeedPreferences = {
    recencyWeight: 50,
    engagementWeight: 50,
    followingRatio: 70,
    contentTypes: { VIDEO: 1.0, IMAGE: 1.0, TEXT: 0.8, AUDIO: 0.8 },
};

function getSliderLabel(value: number, type: 'recency' | 'engagement' | 'following'): string {
    if (type === 'recency') {
        if (value >= 80) return 'Mostly chronological';
        if (value >= 60) return 'Prefer newer posts';
        if (value >= 40) return 'Balanced';
        if (value >= 20) return 'Prefer popular posts';
        return 'Trending focused';
    }
    if (type === 'engagement') {
        if (value >= 80) return 'Show viral content';
        if (value >= 60) return 'Prefer popular';
        if (value >= 40) return 'Balanced';
        if (value >= 20) return 'Prefer niche content';
        return 'Hidden gems only';
    }
    if (type === 'following') {
        if (value >= 80) return 'Mostly people I follow';
        if (value >= 60) return 'Prefer followed';
        if (value >= 40) return 'Mix of both';
        if (value >= 20) return 'More discovery';
        return 'Explore new content';
    }
    return '';
}

function getSliderIcon(value: number, type: 'recency' | 'engagement' | 'following'): keyof typeof Ionicons.glyphMap {
    if (type === 'recency') return value >= 60 ? 'time-outline' : 'trending-up-outline';
    if (type === 'engagement') return value >= 60 ? 'stats-chart-outline' : 'diamond-outline';
    return value >= 60 ? 'people-outline' : 'search-outline';
}

const SLIDER_HELP: Record<string, { title: string; message: string }> = {
    recency: {
        title: 'Recency',
        message: 'Shows posts in the order they were created, newest first. Higher values mean your feed is more chronological; lower values let older but popular posts surface.',
    },
    engagement: {
        title: 'Engagement',
        message: 'Prioritizes posts with more likes and comments. Higher values boost viral content; lower values surface hidden gems with fewer interactions.',
    },
    following: {
        title: 'Following',
        message: 'Boosts posts from people you interact with most. Higher values keep your feed focused on people you follow; lower values introduce more discovery.',
    },
};

function SliderControl({
    label,
    description,
    value,
    onChange,
    icon,
    type,
}: {
    label: string;
    description: string;
    value: number;
    onChange: (v: number) => void;
    icon: keyof typeof Ionicons.glyphMap;
    type: 'recency' | 'engagement' | 'following';
}) {
    const steps = [0, 25, 50, 75, 100];
    const activeIndex = steps.reduce((closest, step, i) =>
        Math.abs(step - value) < Math.abs(steps[closest]! - value) ? i : closest, 0);

    const helpInfo = SLIDER_HELP[type];
    const isDefault = value === DEFAULTS[type === 'recency' ? 'recencyWeight' : type === 'engagement' ? 'engagementWeight' : 'followingRatio'];

    return (
        <View style={styles.sliderCard}>
            <View style={styles.sliderHeader}>
                <View style={styles.sliderIconWrap}>
                    <Ionicons name={icon} size={18} color={colors.gold[400]} />
                </View>
                <View style={styles.sliderHeaderText}>
                    <Text style={styles.sliderLabel}>{label}</Text>
                    {!isDefault && (
                        <View style={styles.modifiedBadge}>
                            <Text style={styles.modifiedBadgeText}>Modified</Text>
                        </View>
                    )}
                </View>
                {helpInfo && (
                    <TouchableOpacity
                        onPress={() => Alert.alert(helpInfo.title, helpInfo.message)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={`Learn more about ${label}`}
                        accessibilityRole="button"
                        style={styles.helpIcon}
                    >
                        <Ionicons name="help-circle-outline" size={16} color={colors.text.muted} />
                    </TouchableOpacity>
                )}
            </View>
            <Text style={styles.sliderDescription}>{description}</Text>
            <View style={styles.sliderTrack}>
                {steps.map((step, i) => (
                    <TouchableOpacity
                        key={step}
                        style={[styles.sliderStep, i <= activeIndex && styles.sliderStepActive]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onChange(step);
                        }}
                        accessibilityLabel={`${label} weight, set to ${step}%`}
                        accessibilityRole="adjustable"
                    >
                        <View style={[styles.sliderDot, i <= activeIndex && styles.sliderDotActive]} />
                    </TouchableOpacity>
                ))}
            </View>
            <View style={styles.sliderValueRow}>
                <Ionicons name={getSliderIcon(value, type)} size={14} color={colors.text.muted} />
                <Text style={styles.sliderValue}>{getSliderLabel(value, type)}</Text>
                <Text style={styles.sliderPercent}>{value}%</Text>
            </View>
        </View>
    );
}

export default function AlgorithmMixerScreen() {
    const insets = useSafeAreaInsets();
    const [prefs, setPrefs] = useState<FeedPreferences>(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            const data = await apiFetch<any>(API.feedPreferences);
            setPrefs({
                recencyWeight: data.recencyWeight ?? DEFAULTS.recencyWeight,
                engagementWeight: data.engagementWeight ?? DEFAULTS.engagementWeight,
                followingRatio: data.followingRatio ?? DEFAULTS.followingRatio,
                contentTypes: data.contentTypes && typeof data.contentTypes === 'object'
                    ? data.contentTypes
                    : DEFAULTS.contentTypes,
            });
        } catch {
            showError("Couldn't load algorithm settings");
        } finally {
            setLoading(false);
        }
    };

    const updatePref = useCallback((key: keyof FeedPreferences, value: number | Record<string, number>) => {
        setPrefs((prev) => ({ ...prev, [key]: value }));
        setHasChanges(true);
    }, []);

    const toggleContentType = useCallback((type: string) => {
        setPrefs((prev) => {
            const current = prev.contentTypes[type] ?? 1.0;
            return {
                ...prev,
                contentTypes: { ...prev.contentTypes, [type]: current > 0 ? 0 : 1.0 },
            };
        });
        setHasChanges(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiFetch(API.feedPreferences, {
                method: 'PUT',
                body: JSON.stringify(prefs),
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setHasChanges(false);
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showError('Failed to save algorithm settings');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            'Reset to Default',
            'This will restore all algorithm settings to their original values. Your feed will return to the default balanced mix.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: () => {
                        setPrefs(DEFAULTS);
                        setHasChanges(true);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    },
                },
            ]
        );
    };

    const contentTypes = [
        { key: 'VIDEO', icon: 'videocam' as const, label: 'Videos', description: 'Video posts and reels', help: 'Controls whether video posts appear in your feed. Disable to hide all video content.' },
        { key: 'IMAGE', icon: 'image' as const, label: 'Images', description: 'Photos and graphics', help: 'Controls whether image posts appear in your feed. Disable to hide photo-based content.' },
        { key: 'TEXT', icon: 'document-text' as const, label: 'Text Posts', description: 'Written posts and threads', help: 'Controls whether text-only posts appear in your feed. Disable to focus on media content.' },
        { key: 'AUDIO', icon: 'musical-note' as const, label: 'Audio', description: 'Music and voice notes', help: 'Controls whether audio posts appear in your feed. Disable to hide audio-based content.' },
    ];

    if (loading) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />
                <LoadingView />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            <ScreenHeader
                title="Your Algorithm"
                rightElement={
                    <TouchableOpacity
                        onPress={handleReset}
                        style={styles.resetBtnWrap}
                        accessibilityLabel="Reset algorithm settings to default"
                        accessibilityRole="button"
                    >
                        <Ionicons name="refresh-outline" size={14} color={colors.text.muted} />
                        <Text style={styles.resetBtn}>Reset</Text>
                    </TouchableOpacity>
                }
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingHorizontal: spacing.lg }}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero explanation */}
                <Animated.View entering={FadeIn.duration(400)} style={styles.heroCard}>
                    <LinearGradient
                        colors={[colors.surface.goldSubtle, 'transparent']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    <View style={styles.heroIconWrap}>
                        <Ionicons name="options" size={24} color={colors.gold[400]} />
                    </View>
                    <Text style={styles.heroTitle}>You control your feed</Text>
                    <Text style={styles.heroText}>
                        Unlike other apps, you decide exactly how your feed works. No hidden algorithms. Adjust the sliders below and save.
                    </Text>
                </Animated.View>

                {/* Sliders */}
                <Animated.View entering={FadeInDown.duration(400).delay(100)}>
                    <SliderControl
                        label="Recency"
                        description="How much to prioritize newer posts vs older popular ones"
                        value={prefs.recencyWeight}
                        onChange={(v) => updatePref('recencyWeight', v)}
                        icon="time-outline"
                        type="recency"
                    />
                </Animated.View>

                <Animated.View entering={FadeInDown.duration(400).delay(200)}>
                    <SliderControl
                        label="Engagement"
                        description="How much to boost posts with lots of likes and comments"
                        value={prefs.engagementWeight}
                        onChange={(v) => updatePref('engagementWeight', v)}
                        icon="trending-up"
                        type="engagement"
                    />
                </Animated.View>

                <Animated.View entering={FadeInDown.duration(400).delay(300)}>
                    <SliderControl
                        label="Following"
                        description="Balance between people you follow and new content discovery"
                        value={prefs.followingRatio}
                        onChange={(v) => updatePref('followingRatio', v)}
                        icon="people"
                        type="following"
                    />
                </Animated.View>

                {/* Content Types */}
                <Animated.View entering={FadeInDown.duration(400).delay(400)}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="apps-outline" size={14} color={colors.gold[500]} />
                        <Text style={styles.sectionTitle}>Content Types</Text>
                    </View>
                    <Text style={styles.sectionDesc}>Choose what types of content appear in your feed</Text>
                    <View style={styles.contentTypesGrid}>
                        {contentTypes.map((ct) => {
                            const isActive = (prefs.contentTypes[ct.key] ?? 1) > 0;
                            return (
                                <View key={ct.key} style={[styles.contentTypeCard, isActive && styles.contentTypeCardActive]}>
                                    <View style={[styles.contentTypeIcon, isActive && styles.contentTypeIconActive]}>
                                        <Ionicons
                                            name={ct.icon}
                                            size={20}
                                            color={isActive ? colors.gold[400] : colors.text.muted}
                                        />
                                    </View>
                                    <View style={styles.contentTypeInfo}>
                                        <Text style={[styles.contentTypeLabel, isActive && styles.contentTypeLabelActive]}>
                                            {ct.label}
                                        </Text>
                                        <Text style={styles.contentTypeDesc}>{ct.description}</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => Alert.alert(ct.label, ct.help)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        accessibilityLabel={`Learn more about ${ct.label}`}
                                        accessibilityRole="button"
                                    >
                                        <Ionicons name="help-circle-outline" size={16} color={colors.text.muted} />
                                    </TouchableOpacity>
                                    <Switch
                                        value={isActive}
                                        onValueChange={() => toggleContentType(ct.key)}
                                        trackColor={{ false: colors.obsidian[600], true: colors.gold[500] + '60' }}
                                        thumbColor={isActive ? colors.gold[500] : colors.text.muted}
                                        accessibilityLabel={`Toggle ${ct.label.toLowerCase()} content`}
                                    />
                                </View>
                            );
                        })}
                    </View>
                </Animated.View>

                {/* Reset to Default Card */}
                <Animated.View entering={FadeInDown.duration(400).delay(500)}>
                    <TouchableOpacity
                        style={styles.resetCard}
                        onPress={handleReset}
                        activeOpacity={0.7}
                        accessibilityLabel="Reset all settings to default"
                        accessibilityRole="button"
                    >
                        <View style={styles.resetCardIcon}>
                            <Ionicons name="refresh-outline" size={20} color={colors.text.muted} />
                        </View>
                        <View style={styles.resetCardContent}>
                            <Text style={styles.resetCardLabel}>Reset to Default</Text>
                            <Text style={styles.resetCardDesc}>Restore all algorithm settings to their original values</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
                    </TouchableOpacity>
                </Animated.View>

                {/* Transparency note */}
                <Animated.View entering={FadeInDown.duration(400).delay(600)} style={styles.transparencyNote}>
                    <Ionicons name="eye-outline" size={16} color={colors.emerald[500]} />
                    <Text style={styles.transparencyText}>
                        Full transparency: these settings directly control how your feed is ranked. No hidden factors.
                    </Text>
                </Animated.View>
            </ScrollView>

            {/* Save button */}
            {hasChanges && (
                <Animated.View entering={FadeInDown.duration(300)} style={[styles.saveBar, { paddingBottom: insets.bottom + spacing.md }]}>
                    <TouchableOpacity
                        style={styles.saveBtn}
                        onPress={handleSave}
                        disabled={saving}
                        activeOpacity={0.9}
                        accessibilityLabel="Save preferences"
                        accessibilityRole="button"
                    >
                        <LinearGradient
                            colors={[colors.gold[400], colors.gold[600]]}
                            style={styles.saveBtnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                                    <Text style={styles.saveBtnText}>Save Preferences</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    scroll: { flex: 1 },

    // Reset button
    resetBtnWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    resetBtn: {
        fontSize: typography.fontSize.sm, color: colors.text.muted, fontWeight: '600',
    },

    // Hero
    heroCard: {
        borderRadius: 16, overflow: 'hidden', padding: spacing.xl,
        marginTop: spacing.lg, marginBottom: spacing.xl,
        borderWidth: 1, borderColor: colors.gold[500] + '20',
        alignItems: 'center',
    },
    heroIconWrap: {
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    heroTitle: {
        fontSize: typography.fontSize.xl, fontWeight: '700',
        color: colors.text.primary, fontFamily: 'Inter-Bold',
        marginBottom: spacing.xs,
    },
    heroText: {
        fontSize: typography.fontSize.sm, color: colors.text.secondary,
        textAlign: 'center', lineHeight: 20,
    },

    // Sliders
    sliderCard: {
        backgroundColor: colors.surface.glass, borderRadius: 16,
        padding: spacing.lg, marginBottom: spacing.md,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    sliderHeader: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        marginBottom: 4,
    },
    sliderIconWrap: {
        width: 32, height: 32, borderRadius: 8,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center', justifyContent: 'center',
    },
    sliderHeaderText: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    },
    sliderLabel: {
        fontSize: typography.fontSize.base, fontWeight: '600',
        color: colors.text.primary,
    },
    modifiedBadge: {
        backgroundColor: colors.gold[500] + '20',
        paddingHorizontal: 6, paddingVertical: 1,
        borderRadius: 4,
    },
    modifiedBadgeText: {
        fontSize: 9, fontWeight: '700',
        color: colors.gold[400], textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    helpIcon: {
        width: 24, height: 24, borderRadius: 12,
        alignItems: 'center' as const, justifyContent: 'center' as const,
    },
    sliderDescription: {
        fontSize: typography.fontSize.xs, color: colors.text.muted,
        marginBottom: spacing.md, lineHeight: 16,
        marginStart: 32 + spacing.sm,
    },
    sliderTrack: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', height: 32,
        marginBottom: spacing.xs,
    },
    sliderStep: {
        flex: 1, height: 4, backgroundColor: colors.obsidian[600],
        marginHorizontal: 2, borderRadius: 2,
        alignItems: 'center', justifyContent: 'center',
    },
    sliderStepActive: {
        backgroundColor: colors.gold[500],
    },
    sliderDot: {
        width: 16, height: 16, borderRadius: 8,
        backgroundColor: colors.obsidian[600], borderWidth: 2,
        borderColor: colors.obsidian[500],
    },
    sliderDotActive: {
        backgroundColor: colors.gold[500], borderColor: colors.gold[400],
    },
    sliderValueRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: spacing.xs,
    },
    sliderIcon: {
        marginRight: 2,
    },
    sliderValue: {
        fontSize: typography.fontSize.sm, color: colors.gold[400],
        fontWeight: '600',
    },
    sliderPercent: {
        fontSize: typography.fontSize.xs, color: colors.text.muted,
        fontWeight: '500',
    },

    // Section header
    sectionHeader: {
        flexDirection: 'row', alignItems: 'center',
        gap: 6, marginTop: spacing.lg, marginBottom: 4,
    },
    sectionTitle: {
        fontSize: typography.fontSize.xs, fontWeight: '700',
        color: colors.text.muted, textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    sectionDesc: {
        fontSize: typography.fontSize.xs, color: colors.text.muted,
        marginBottom: spacing.md,
    },

    // Content Types
    contentTypesGrid: {
        gap: spacing.sm,
    },
    contentTypeCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface.glass, borderRadius: 14,
        padding: spacing.md, borderWidth: 1, borderColor: colors.border.subtle,
        gap: spacing.sm,
    },
    contentTypeCardActive: {
        borderColor: colors.gold[500] + '40',
    },
    contentTypeIcon: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center', justifyContent: 'center',
    },
    contentTypeIconActive: {
        backgroundColor: colors.surface.goldSubtle,
    },
    contentTypeInfo: {
        flex: 1,
    },
    contentTypeLabel: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted, fontWeight: '600',
    },
    contentTypeLabelActive: {
        color: colors.text.primary,
    },
    contentTypeDesc: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted, marginTop: 1,
    },

    // Reset Card
    resetCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface.glass, borderRadius: 14,
        padding: spacing.md, marginTop: spacing.xl,
        borderWidth: 1, borderColor: colors.border.subtle,
        gap: spacing.md,
    },
    resetCardIcon: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center', justifyContent: 'center',
    },
    resetCardContent: {
        flex: 1,
    },
    resetCardLabel: {
        fontSize: typography.fontSize.base, fontWeight: '600',
        color: colors.text.secondary,
    },
    resetCardDesc: {
        fontSize: typography.fontSize.xs, color: colors.text.muted,
        marginTop: 1,
    },

    // Transparency
    transparencyNote: {
        flexDirection: 'row', alignItems: 'center',
        gap: spacing.sm, marginTop: spacing.xl,
        paddingVertical: spacing.md,
    },
    transparencyText: {
        flex: 1, fontSize: typography.fontSize.xs, color: colors.text.muted,
        lineHeight: 16,
    },

    // Save
    saveBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: spacing.xl, paddingTop: spacing.md,
        backgroundColor: colors.obsidian[900] + 'F0',
    },
    saveBtn: {
        borderRadius: 16, overflow: 'hidden',
        shadowColor: colors.gold[500], shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
    },
    saveBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center',
        paddingVertical: 16, gap: spacing.sm,
    },
    saveBtnText: {
        fontSize: typography.fontSize.lg, fontWeight: '600',
        color: '#FFFFFF', fontFamily: 'Inter-SemiBold',
    },
});
