import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API } from '../../lib/api';

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

    return (
        <View style={styles.sliderCard}>
            <View style={styles.sliderHeader}>
                <Ionicons name={icon} size={18} color={colors.gold[400]} />
                <Text style={styles.sliderLabel}>{label}</Text>
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
                    >
                        <View style={[styles.sliderDot, i <= activeIndex && styles.sliderDotActive]} />
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={styles.sliderValue}>{getSliderLabel(value, type)}</Text>
        </View>
    );
}

export default function AlgorithmMixerScreen() {
    const router = useRouter();
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
            // Use defaults
        } finally {
            setLoading(false);
        }
    };

    const updatePref = useCallback((key: keyof FeedPreferences, value: any) => {
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
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setPrefs(DEFAULTS);
        setHasChanges(true);
    };

    const contentTypes = [
        { key: 'VIDEO', icon: 'videocam' as const, label: 'Videos' },
        { key: 'IMAGE', icon: 'image' as const, label: 'Images' },
        { key: 'TEXT', icon: 'document-text' as const, label: 'Text Posts' },
        { key: 'AUDIO', icon: 'musical-note' as const, label: 'Audio' },
    ];

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.gold[500]} />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Your Algorithm</Text>
                <TouchableOpacity onPress={handleReset}>
                    <Text style={styles.resetBtn}>Reset</Text>
                </TouchableOpacity>
            </View>

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
                    <Ionicons name="options" size={24} color={colors.gold[400]} />
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
                    <Text style={styles.sectionTitle}>Content Types</Text>
                    <Text style={styles.sectionDesc}>Choose what types of content appear in your feed</Text>
                    <View style={styles.contentTypesGrid}>
                        {contentTypes.map((ct) => {
                            const isActive = (prefs.contentTypes[ct.key] ?? 1) > 0;
                            return (
                                <TouchableOpacity
                                    key={ct.key}
                                    style={[styles.contentTypeCard, isActive && styles.contentTypeCardActive]}
                                    onPress={() => toggleContentType(ct.key)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={ct.icon}
                                        size={22}
                                        color={isActive ? colors.gold[400] : colors.text.muted}
                                    />
                                    <Text style={[styles.contentTypeLabel, isActive && styles.contentTypeLabelActive]}>
                                        {ct.label}
                                    </Text>
                                    <View style={[styles.contentTypeToggle, isActive && styles.contentTypeToggleActive]}>
                                        <View style={[styles.contentTypeToggleDot, isActive && styles.contentTypeToggleDotActive]} />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Animated.View>

                {/* Transparency note */}
                <Animated.View entering={FadeInDown.duration(400).delay(500)} style={styles.transparencyNote}>
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
                    >
                        <LinearGradient
                            colors={[colors.gold[400], colors.gold[600]]}
                            style={styles.saveBtnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color={colors.obsidian[900]} />
                            ) : (
                                <Text style={styles.saveBtnText}>Save Preferences</Text>
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
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20, fontWeight: '700', color: colors.text.primary, fontFamily: 'Inter-Bold',
    },
    resetBtn: {
        fontSize: typography.fontSize.sm, color: colors.text.muted, fontWeight: '600',
    },
    scroll: { flex: 1 },

    // Hero
    heroCard: {
        borderRadius: 16, overflow: 'hidden', padding: spacing.xl,
        marginTop: spacing.lg, marginBottom: spacing.xl,
        borderWidth: 1, borderColor: colors.gold[500] + '20',
        alignItems: 'center',
    },
    heroTitle: {
        fontSize: typography.fontSize.xl, fontWeight: '700',
        color: colors.text.primary, fontFamily: 'Inter-Bold',
        marginTop: spacing.sm, marginBottom: spacing.xs,
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
    sliderLabel: {
        fontSize: typography.fontSize.base, fontWeight: '600',
        color: colors.text.primary,
    },
    sliderDescription: {
        fontSize: typography.fontSize.xs, color: colors.text.muted,
        marginBottom: spacing.md, lineHeight: 16,
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
    sliderValue: {
        fontSize: typography.fontSize.sm, color: colors.gold[400],
        fontWeight: '600', textAlign: 'center',
    },

    // Content Types
    sectionTitle: {
        fontSize: typography.fontSize.lg, fontWeight: '700',
        color: colors.text.primary, fontFamily: 'Inter-Bold',
        marginTop: spacing.lg, marginBottom: 4,
    },
    sectionDesc: {
        fontSize: typography.fontSize.xs, color: colors.text.muted,
        marginBottom: spacing.md,
    },
    contentTypesGrid: {
        gap: spacing.sm,
    },
    contentTypeCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface.glass, borderRadius: 14,
        padding: spacing.md, borderWidth: 1, borderColor: colors.border.subtle,
        gap: spacing.md,
    },
    contentTypeCardActive: {
        borderColor: colors.gold[500] + '40',
    },
    contentTypeLabel: {
        flex: 1, fontSize: typography.fontSize.base,
        color: colors.text.muted, fontWeight: '500',
    },
    contentTypeLabelActive: {
        color: colors.text.primary,
    },
    contentTypeToggle: {
        width: 40, height: 22, borderRadius: 11,
        backgroundColor: colors.obsidian[600], padding: 2,
        justifyContent: 'center',
    },
    contentTypeToggleActive: {
        backgroundColor: colors.gold[500],
    },
    contentTypeToggleDot: {
        width: 18, height: 18, borderRadius: 9,
        backgroundColor: colors.obsidian[400],
    },
    contentTypeToggleDotActive: {
        backgroundColor: colors.obsidian[900],
        alignSelf: 'flex-end',
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
        alignItems: 'center', justifyContent: 'center',
        paddingVertical: 16,
    },
    saveBtnText: {
        fontSize: typography.fontSize.lg, fontWeight: '600',
        color: colors.obsidian[900], fontFamily: 'Inter-SemiBold',
    },
});
