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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { useTranslation } from 'react-i18next';
import { apiFetch, API } from '../../lib/api';
import { ScreenHeader, LoadingView } from '../../components';
import { showError } from '../../stores/toastStore';

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

const getChannels = (t: (key: string) => string) => [
    {
        key: 'social' as const,
        icon: 'heart-outline' as const,
        activeIcon: 'heart' as const,
        label: t('notifications.social'),
        description: t('notifications.socialDesc'),
        examples: 'Likes, comments, mentions, follows',
    },
    {
        key: 'communities' as const,
        icon: 'people-outline' as const,
        activeIcon: 'people' as const,
        label: t('nav.communities'),
        description: t('notifications.communitiesDesc'),
        examples: 'New posts, invites, member activity',
    },
    {
        key: 'messages' as const,
        icon: 'chatbubble-outline' as const,
        activeIcon: 'chatbubble' as const,
        label: t('notifications.messagesNotif'),
        description: t('notifications.messagesDesc'),
        examples: 'Direct messages, group chats',
    },
    {
        key: 'system' as const,
        icon: 'settings-outline' as const,
        activeIcon: 'settings' as const,
        label: t('notifications.system'),
        description: t('notifications.systemDesc'),
        examples: 'Security alerts, updates, announcements',
    },
];

const QUIET_PRESETS = [
    { from: '22:00', to: '07:00', label: '10 PM – 7 AM', icon: 'moon-outline' as const },
    { from: '23:00', to: '08:00', label: '11 PM – 8 AM', icon: 'moon-outline' as const },
    { from: '00:00', to: '06:00', label: 'Midnight – 6 AM', icon: 'cloudy-night-outline' as const },
];

const DIGEST_OPTIONS: Array<{ value: NotificationPrefs['emailDigest']; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { value: 'daily', label: 'Daily', description: 'Get a digest every morning', icon: 'sunny-outline' },
    { value: 'weekly', label: 'Weekly', description: 'Get a digest every Monday', icon: 'calendar-outline' },
    { value: 'none', label: 'Off', description: 'No email digests', icon: 'notifications-off-outline' },
];

export default function NotificationPrefsScreen() {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const CHANNELS = getChannels(t);
    const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

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
            showError("Couldn't load notification settings");
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
            showError('Failed to save notification settings');
        } finally {
            setSaving(false);
        }
    };

    const enabledCount = Object.values(prefs.channels).filter(Boolean).length;
    const totalCount = Object.keys(prefs.channels).length;

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

            <ScreenHeader title="Notifications" />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingHorizontal: spacing.lg }}
                showsVerticalScrollIndicator={false}
            >
                {/* Master toggle */}
                <Animated.View entering={FadeIn.duration(400)} style={styles.masterCard}>
                    <View style={styles.masterRow}>
                        <View style={[styles.masterIconWrap, prefs.pushEnabled && styles.masterIconWrapActive]}>
                            <Ionicons
                                name={prefs.pushEnabled ? 'notifications' : 'notifications-off-outline'}
                                size={24}
                                color={prefs.pushEnabled ? colors.gold[400] : colors.text.muted}
                            />
                        </View>
                        <View style={styles.masterInfo}>
                            <Text style={styles.masterLabel}>Push Notifications</Text>
                            <Text style={styles.masterDesc}>
                                {prefs.pushEnabled
                                    ? `${enabledCount}/${totalCount} channels active`
                                    : 'All notifications are disabled'}
                            </Text>
                        </View>
                        <Switch
                            value={prefs.pushEnabled}
                            onValueChange={(val) => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                update({ pushEnabled: val });
                            }}
                            trackColor={{ false: colors.obsidian[600], true: colors.gold[500] + '60' }}
                            thumbColor={prefs.pushEnabled ? colors.gold[500] : colors.text.muted}
                            accessibilityLabel="Toggle push notifications"
                        />
                    </View>
                    {!prefs.pushEnabled && (
                        <View style={styles.disabledBanner}>
                            <Ionicons name="information-circle-outline" size={14} color={colors.amber[500]} />
                            <Text style={styles.disabledBannerText}>
                                You won't receive any push notifications while this is off. Email digests still work.
                            </Text>
                        </View>
                    )}
                </Animated.View>

                {/* Channels */}
                {prefs.pushEnabled && (
                    <Animated.View entering={FadeInDown.duration(300)}>
                        <View style={styles.sectionTitleRow}>
                            <Ionicons name="radio-outline" size={14} color={colors.gold[500]} />
                            <Text style={styles.sectionTitle}>Notification Channels</Text>
                        </View>
                        <Text style={styles.sectionDesc}>Choose which types of notifications you want to receive</Text>
                        {CHANNELS.map((ch) => {
                            const isActive = prefs.channels[ch.key];
                            return (
                                <View key={ch.key} style={[styles.channelCard, isActive && styles.channelCardActive]}>
                                    <View style={styles.channelRow}>
                                        <View style={[styles.channelIcon, isActive && styles.channelIconActive]}>
                                            <Ionicons
                                                name={isActive ? ch.activeIcon : ch.icon}
                                                size={20}
                                                color={isActive ? colors.gold[400] : colors.text.muted}
                                            />
                                        </View>
                                        <View style={styles.channelContent}>
                                            <Text style={[styles.channelLabel, isActive && styles.channelLabelActive]}>{ch.label}</Text>
                                            <Text style={styles.channelDesc}>{ch.description}</Text>
                                        </View>
                                        <Switch
                                            value={isActive}
                                            onValueChange={() => toggleChannel(ch.key)}
                                            trackColor={{ false: colors.obsidian[600], true: colors.gold[500] + '60' }}
                                            thumbColor={isActive ? colors.gold[500] : colors.text.muted}
                                            accessibilityLabel={`Toggle ${ch.label.toLowerCase()} notifications`}
                                        />
                                    </View>
                                    {isActive && (
                                        <View style={styles.channelExamples}>
                                            <Ionicons name="ellipsis-horizontal" size={12} color={colors.text.muted} />
                                            <Text style={styles.channelExamplesText}>{ch.examples}</Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </Animated.View>
                )}

                {/* Quiet Hours */}
                {prefs.pushEnabled && (
                    <Animated.View entering={FadeInDown.duration(300).delay(100)}>
                        <View style={styles.sectionTitleRow}>
                            <Ionicons name="moon-outline" size={14} color={colors.gold[500]} />
                            <Text style={styles.sectionTitle}>Quiet Hours</Text>
                        </View>
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
                                        accessibilityLabel={`Set quiet hours to ${preset.label}`}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: isActive }}
                                    >
                                        <Ionicons name={preset.icon} size={14} color={isActive ? colors.gold[400] : colors.text.muted} />
                                        <Text style={[styles.presetLabel, isActive && styles.presetLabelActive]}>{preset.label}</Text>
                                        {isActive && <Ionicons name="checkmark-circle" size={14} color={colors.gold[400]} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <View style={styles.quietInfo}>
                            <Ionicons name="time-outline" size={13} color={colors.text.muted} />
                            <Text style={styles.quietInfoText}>
                                Current: {prefs.quietHoursFrom} – {prefs.quietHoursTo} ({prefs.quietTimezone.split('/').pop()?.replace('_', ' ')})
                            </Text>
                        </View>
                    </Animated.View>
                )}

                {/* Email Digest */}
                <Animated.View entering={FadeInDown.duration(300).delay(200)}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="mail-outline" size={14} color={colors.gold[500]} />
                        <Text style={styles.sectionTitle}>Email Digest</Text>
                    </View>
                    <Text style={styles.sectionDesc}>Get a summary of activity delivered to your inbox</Text>
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
                                    accessibilityLabel={`Set email digest to ${opt.label}`}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected: isActive }}
                                >
                                    <View style={styles.digestCardRow}>
                                        <View style={[styles.digestIcon, isActive && styles.digestIconActive]}>
                                            <Ionicons
                                                name={opt.icon}
                                                size={18}
                                                color={isActive ? colors.gold[400] : colors.text.muted}
                                            />
                                        </View>
                                        <View style={styles.digestContent}>
                                            <Text style={[styles.digestLabel, isActive && styles.digestLabelActive]}>{opt.label}</Text>
                                            <Text style={styles.digestDesc}>{opt.description}</Text>
                                        </View>
                                        {isActive && (
                                            <Ionicons name="checkmark-circle" size={18} color={colors.gold[400]} />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Animated.View>

                {/* Transparency note */}
                <Animated.View entering={FadeInDown.duration(300).delay(300)} style={styles.transparencyNote}>
                    <Ionicons name="shield-checkmark-outline" size={16} color={colors.emerald[500]} />
                    <Text style={styles.transparencyText}>
                        We never send promotional notifications. You control exactly what you receive.
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
                                <ActivityIndicator size="small" color={colors.obsidian[900]} />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={18} color={colors.obsidian[900]} />
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

    // Master toggle
    masterCard: {
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        marginTop: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
    },
    masterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
    },
    masterIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center',
        justifyContent: 'center',
    },
    masterIconWrapActive: {
        backgroundColor: colors.surface.goldSubtle,
    },
    masterInfo: {
        flex: 1,
        marginStart: spacing.md,
    },
    masterLabel: {
        fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary,
    },
    masterDesc: {
        fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 2,
    },
    disabledBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: colors.amber[500] + '0A',
        borderTopWidth: 1,
        borderTopColor: colors.amber[500] + '14',
    },
    disabledBannerText: {
        flex: 1,
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        lineHeight: 16,
    },

    // Sections
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
    },
    sectionTitle: {
        fontSize: typography.fontSize.xs, fontWeight: '700',
        color: colors.text.muted, textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sectionDesc: {
        fontSize: typography.fontSize.xs, color: colors.text.muted,
        marginBottom: spacing.md, marginTop: -spacing.xs,
    },

    // Channels
    channelCard: {
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
    },
    channelCardActive: {
        borderColor: colors.gold[500] + '30',
    },
    channelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
    },
    channelIcon: {
        width: 38, height: 38, borderRadius: 10,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center', justifyContent: 'center',
    },
    channelIconActive: {
        backgroundColor: colors.surface.goldSubtle,
    },
    channelContent: {
        flex: 1,
        marginStart: spacing.md,
    },
    channelLabel: {
        fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.secondary,
    },
    channelLabelActive: {
        color: colors.text.primary,
    },
    channelDesc: {
        fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 1,
    },
    channelExamples: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
        paddingTop: 0,
    },
    channelExamplesText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        fontStyle: 'italic',
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
    quietInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.sm,
        paddingStart: spacing.xs,
    },
    quietInfoText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },

    // Digest
    digestGrid: { gap: spacing.sm },
    digestCard: {
        backgroundColor: colors.surface.glass, borderRadius: 14,
        borderWidth: 1, borderColor: colors.border.subtle,
        overflow: 'hidden',
    },
    digestCardActive: {
        borderColor: colors.gold[500] + '40',
    },
    digestCardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        gap: spacing.md,
    },
    digestIcon: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center', justifyContent: 'center',
    },
    digestIconActive: {
        backgroundColor: colors.surface.goldSubtle,
    },
    digestContent: {
        flex: 1,
    },
    digestLabel: {
        fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.secondary,
    },
    digestLabelActive: { color: colors.text.primary },
    digestDesc: {
        fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 2,
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
        flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center',
        paddingVertical: 16, gap: spacing.sm,
    },
    saveBtnText: {
        fontSize: typography.fontSize.lg, fontWeight: '600',
        color: colors.obsidian[900], fontFamily: 'Inter-SemiBold',
    },
});
