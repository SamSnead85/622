import { useState, useEffect } from 'react';
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

interface NotificationPrefs {
    pushEnabled: boolean;
    emailDigest: 'daily' | 'weekly' | 'none';
    quietHoursFrom: string;
    quietHoursTo: string;
    quietTimezone: string;
    channels: {
        social: boolean;
        communities: boolean;
        messages: boolean;
        system: boolean;
    };
}

const DEFAULTS: NotificationPrefs = {
    pushEnabled: true,
    emailDigest: 'weekly',
    quietHoursFrom: '22:00',
    quietHoursTo: '07:00',
    quietTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    channels: { social: true, communities: true, messages: true, system: true },
};

const CHANNELS = [
    { key: 'social' as const, icon: 'heart-outline' as const, label: 'Social', description: 'Likes, comments, follows, and mentions' },
    { key: 'communities' as const, icon: 'people-outline' as const, label: 'Communities', description: 'New posts, membership, and announcements' },
    { key: 'messages' as const, icon: 'chatbubble-outline' as const, label: 'Messages', description: 'Direct and group messages' },
    { key: 'system' as const, icon: 'settings-outline' as const, label: 'System', description: 'Security alerts, updates, and account activity' },
];

const QUIET_PRESETS = [
    { from: '22:00', to: '07:00', label: '10 PM – 7 AM' },
    { from: '23:00', to: '08:00', label: '11 PM – 8 AM' },
    { from: '00:00', to: '06:00', label: 'Midnight – 6 AM' },
];

const DIGEST_OPTIONS: Array<{ value: NotificationPrefs['emailDigest']; label: string; description: string }> = [
    { value: 'daily', label: 'Daily', description: 'Get a digest every morning' },
    { value: 'weekly', label: 'Weekly', description: 'Get a digest every Monday' },
    { value: 'none', label: 'Off', description: 'No email digests' },
];

export default function NotificationPrefsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [showQuietPicker, setShowQuietPicker] = useState(false);

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            const data = await apiFetch<any>(API.pushPreferences);
            setPrefs({
                pushEnabled: data.pushEnabled ?? DEFAULTS.pushEnabled,
                emailDigest: data.emailDigest ?? DEFAULTS.emailDigest,
                quietHoursFrom: data.quietHoursFrom ?? DEFAULTS.quietHoursFrom,
                quietHoursTo: data.quietHoursTo ?? DEFAULTS.quietHoursTo,
                quietTimezone: data.quietTimezone ?? DEFAULTS.quietTimezone,
                channels: {
                    social: data.channels?.social ?? true,
                    communities: data.channels?.communities ?? true,
                    messages: data.channels?.messages ?? true,
                    system: data.channels?.system ?? true,
                },
            });
        } catch {
            // Use defaults
        } finally {
            setLoading(false);
        }
    };

    const update = (partial: Partial<NotificationPrefs>) => {
        setPrefs((prev) => ({ ...prev, ...partial }));
        setHasChanges(true);
    };

    const toggleChannel = (key: keyof NotificationPrefs['channels']) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPrefs((prev) => ({
            ...prev,
            channels: { ...prev.channels, [key]: !prev.channels[key] },
        }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiFetch(API.pushPreferences, { method: 'PUT', body: JSON.stringify(prefs) });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setHasChanges(false);
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setSaving(false);
        }
    };

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
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingHorizontal: spacing.lg }}
                showsVerticalScrollIndicator={false}
            >
                {/* Master toggle */}
                <Animated.View entering={FadeIn.duration(400)} style={styles.masterRow}>
                    <View style={styles.masterInfo}>
                        <Ionicons name="notifications" size={24} color={prefs.pushEnabled ? colors.gold[400] : colors.text.muted} />
                        <View style={{ flex: 1, marginLeft: spacing.md }}>
                            <Text style={styles.masterLabel}>Push Notifications</Text>
                            <Text style={styles.masterDesc}>{prefs.pushEnabled ? 'Enabled' : 'Disabled'}</Text>
                        </View>
                    </View>
                    <Switch
                        value={prefs.pushEnabled}
                        onValueChange={(val) => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            update({ pushEnabled: val });
                        }}
                        trackColor={{ false: colors.obsidian[600], true: colors.gold[500] + '60' }}
                        thumbColor={prefs.pushEnabled ? colors.gold[500] : colors.text.muted}
                    />
                </Animated.View>

                {/* Channels */}
                {prefs.pushEnabled && (
                    <Animated.View entering={FadeInDown.duration(300)}>
                        <Text style={styles.sectionTitle}>Channels</Text>
                        {CHANNELS.map((ch) => (
                            <TouchableOpacity
                                key={ch.key}
                                style={styles.channelRow}
                                onPress={() => toggleChannel(ch.key)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.channelIcon}>
                                    <Ionicons name={ch.icon} size={20} color={prefs.channels[ch.key] ? colors.gold[400] : colors.text.muted} />
                                </View>
                                <View style={{ flex: 1, marginLeft: spacing.md }}>
                                    <Text style={styles.channelLabel}>{ch.label}</Text>
                                    <Text style={styles.channelDesc}>{ch.description}</Text>
                                </View>
                                <Switch
                                    value={prefs.channels[ch.key]}
                                    onValueChange={() => toggleChannel(ch.key)}
                                    trackColor={{ false: colors.obsidian[600], true: colors.gold[500] + '60' }}
                                    thumbColor={prefs.channels[ch.key] ? colors.gold[500] : colors.text.muted}
                                />
                            </TouchableOpacity>
                        ))}
                    </Animated.View>
                )}

                {/* Quiet Hours */}
                {prefs.pushEnabled && (
                    <Animated.View entering={FadeInDown.duration(300).delay(100)}>
                        <Text style={styles.sectionTitle}>Quiet Hours</Text>
                        <Text style={styles.sectionDesc}>Silence notifications during rest time</Text>
                        <View style={styles.presetGrid}>
                            {QUIET_PRESETS.map((preset) => {
                                const isActive = prefs.quietHoursFrom === preset.from && prefs.quietHoursTo === preset.to;
                                return (
                                    <TouchableOpacity
                                        key={preset.label}
                                        style={[styles.presetChip, isActive && styles.presetChipActive]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            update({ quietHoursFrom: preset.from, quietHoursTo: preset.to });
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="moon-outline" size={14} color={isActive ? colors.gold[400] : colors.text.muted} />
                                        <Text style={[styles.presetLabel, isActive && styles.presetLabelActive]}>{preset.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Animated.View>
                )}

                {/* Email Digest */}
                <Animated.View entering={FadeInDown.duration(300).delay(200)}>
                    <Text style={styles.sectionTitle}>Email Digest</Text>
                    <View style={styles.digestGrid}>
                        {DIGEST_OPTIONS.map((opt) => {
                            const isActive = prefs.emailDigest === opt.value;
                            return (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[styles.digestCard, isActive && styles.digestCardActive]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        update({ emailDigest: opt.value });
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.digestLabel, isActive && styles.digestLabelActive]}>{opt.label}</Text>
                                    <Text style={styles.digestDesc}>{opt.description}</Text>
                                    {isActive && (
                                        <View style={styles.digestCheck}>
                                            <Ionicons name="checkmark-circle" size={18} color={colors.gold[400]} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Animated.View>

                {/* Transparency note */}
                <View style={styles.transparencyNote}>
                    <Ionicons name="shield-checkmark-outline" size={16} color={colors.emerald[500]} />
                    <Text style={styles.transparencyText}>
                        We never send promotional notifications. You control exactly what you receive.
                    </Text>
                </View>
            </ScrollView>

            {/* Save button */}
            {hasChanges && (
                <Animated.View entering={FadeInDown.duration(300)} style={[styles.saveBar, { paddingBottom: insets.bottom + spacing.md }]}>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.9}>
                        <LinearGradient colors={[colors.gold[400], colors.gold[600]]} style={styles.saveBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
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
    scroll: { flex: 1 },

    // Master toggle
    masterRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: colors.surface.glass, borderRadius: 16,
        padding: spacing.lg, marginTop: spacing.lg,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    masterInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    masterLabel: {
        fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary,
    },
    masterDesc: {
        fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 2,
    },

    // Sections
    sectionTitle: {
        fontSize: typography.fontSize.xs, fontWeight: '700',
        color: colors.text.muted, textTransform: 'uppercase',
        letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.sm,
    },
    sectionDesc: {
        fontSize: typography.fontSize.xs, color: colors.text.muted,
        marginBottom: spacing.md, marginTop: -spacing.xs,
    },

    // Channels
    channelRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface.glass, borderRadius: 14,
        padding: spacing.md, marginBottom: spacing.xs,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    channelIcon: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center', justifyContent: 'center',
    },
    channelLabel: {
        fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary,
    },
    channelDesc: {
        fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 1,
    },

    // Quiet hours
    presetGrid: {
        flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap',
    },
    presetChip: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
        backgroundColor: colors.surface.glass, borderRadius: 12,
        paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    presetChipActive: {
        borderColor: colors.gold[500] + '60',
        backgroundColor: colors.surface.goldSubtle,
    },
    presetLabel: {
        fontSize: typography.fontSize.sm, color: colors.text.muted, fontWeight: '500',
    },
    presetLabelActive: {
        color: colors.gold[400],
    },

    // Digest
    digestGrid: { gap: spacing.sm },
    digestCard: {
        backgroundColor: colors.surface.glass, borderRadius: 14,
        padding: spacing.md, borderWidth: 1, borderColor: colors.border.subtle,
        position: 'relative',
    },
    digestCardActive: {
        borderColor: colors.gold[500] + '40',
    },
    digestLabel: {
        fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.secondary,
    },
    digestLabelActive: { color: colors.text.primary },
    digestDesc: {
        fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 2,
    },
    digestCheck: {
        position: 'absolute', top: spacing.md, right: spacing.md,
    },

    // Transparency
    transparencyNote: {
        flexDirection: 'row', alignItems: 'center',
        gap: spacing.sm, marginTop: spacing.xl, paddingVertical: spacing.md,
    },
    transparencyText: {
        flex: 1, fontSize: typography.fontSize.xs, color: colors.text.muted, lineHeight: 16,
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
        alignItems: 'center', justifyContent: 'center', paddingVertical: 16,
    },
    saveBtnText: {
        fontSize: typography.fontSize.lg, fontWeight: '600',
        color: colors.obsidian[900], fontFamily: 'Inter-SemiBold',
    },
});
