import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Switch,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API } from '../../../lib/api';
import { ScreenHeader, GlassCard } from '../../../components';

// ─── Types ───────────────────────────────────────────────────────

interface ModerationToggles {
    membersCanPostMedia: boolean;
    requirePostApproval: boolean;
    allowAnonymousPosting: boolean;
    allowExternalLinks: boolean;
    membersCanInvite: boolean;
}

interface AutoModeration {
    keywordFilters: string;
    maxPostsPerDay: number; // 0 = unlimited
    minAccountAge: 'none' | '1day' | '7days' | '30days';
}

interface CommunityRulesData {
    customRules: string[];
    moderation: ModerationToggles;
    autoModeration: AutoModeration;
}

// ─── Defaults ────────────────────────────────────────────────────

const DEFAULT_RULES = [
    'Be respectful to all members',
    'No spam or self-promotion',
    'Keep content relevant to the community',
    'Protect member privacy',
];

const DEFAULT_MODERATION: ModerationToggles = {
    membersCanPostMedia: true,
    requirePostApproval: false,
    allowAnonymousPosting: false,
    allowExternalLinks: true,
    membersCanInvite: true,
};

const DEFAULT_AUTO_MODERATION: AutoModeration = {
    keywordFilters: '',
    maxPostsPerDay: 0,
    minAccountAge: 'none',
};

const DEFAULT_DATA: CommunityRulesData = {
    customRules: [],
    moderation: DEFAULT_MODERATION,
    autoModeration: DEFAULT_AUTO_MODERATION,
};

const ACCOUNT_AGE_OPTIONS: { value: AutoModeration['minAccountAge']; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: '1day', label: '1 day' },
    { value: '7days', label: '7 days' },
    { value: '30days', label: '30 days' },
];

const POST_LIMIT_OPTIONS = [
    { value: 0, label: 'Unlimited' },
    { value: 5, label: '5' },
    { value: 10, label: '10' },
    { value: 20, label: '20' },
    { value: 50, label: '50' },
];

const TOGGLE_ITEMS: { key: keyof ModerationToggles; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'membersCanPostMedia', label: 'Members can post media', icon: 'image-outline' },
    { key: 'requirePostApproval', label: 'Require post approval', icon: 'checkmark-circle-outline' },
    { key: 'allowAnonymousPosting', label: 'Allow anonymous posting', icon: 'eye-off-outline' },
    { key: 'allowExternalLinks', label: 'Allow external links', icon: 'link-outline' },
    { key: 'membersCanInvite', label: 'Members can invite others', icon: 'person-add-outline' },
];

// ─── Storage helpers ─────────────────────────────────────────────

const storageKey = (communityId: string) => `@community-rules-${communityId}`;

async function loadRulesFromStorage(communityId: string): Promise<CommunityRulesData> {
    try {
        const raw = await AsyncStorage.getItem(storageKey(communityId));
        if (raw) return { ...DEFAULT_DATA, ...JSON.parse(raw) };
    } catch {
        // ignore parse errors
    }
    return DEFAULT_DATA;
}

async function saveRulesToStorage(communityId: string, data: CommunityRulesData) {
    await AsyncStorage.setItem(storageKey(communityId), JSON.stringify(data));
}

// ─── Component ───────────────────────────────────────────────────

export default function CommunityRulesScreen() {
    const { id: communityId } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();

    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [data, setData] = useState<CommunityRulesData>(DEFAULT_DATA);

    // ── Load data ────────────────────────────────────────────────

    useEffect(() => {
        loadData();
    }, [communityId]);

    const loadData = async () => {
        if (!communityId) return;
        try {
            // Check role
            const communityData = await apiFetch<any>(API.community(communityId));
            const comm = communityData.community || communityData;
            const role = comm.role as string | null;
            setIsAdmin(role === 'admin' || role === 'moderator');
        } catch {
            // default to non-admin
        }
        // Load local rules
        const stored = await loadRulesFromStorage(communityId);
        setData(stored);
        setLoading(false);
    };

    // ── Update helpers ───────────────────────────────────────────

    const updateData = useCallback((partial: Partial<CommunityRulesData>) => {
        setData((prev) => ({ ...prev, ...partial }));
        setHasChanges(true);
    }, []);

    const toggleModeration = useCallback((key: keyof ModerationToggles) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setData((prev) => ({
            ...prev,
            moderation: { ...prev.moderation, [key]: !prev.moderation[key] },
        }));
        setHasChanges(true);
    }, []);

    const updateAutoMod = useCallback((partial: Partial<AutoModeration>) => {
        setData((prev) => ({
            ...prev,
            autoModeration: { ...prev.autoModeration, ...partial },
        }));
        setHasChanges(true);
    }, []);

    const addCustomRule = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setData((prev) => ({
            ...prev,
            customRules: [...prev.customRules, ''],
        }));
        setHasChanges(true);
    }, []);

    const updateCustomRule = useCallback((index: number, text: string) => {
        setData((prev) => {
            const updated = [...prev.customRules];
            updated[index] = text;
            return { ...prev, customRules: updated };
        });
        setHasChanges(true);
    }, []);

    const removeCustomRule = useCallback((index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setData((prev) => ({
            ...prev,
            customRules: prev.customRules.filter((_, i) => i !== index),
        }));
        setHasChanges(true);
    }, []);

    // ── Save ─────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!communityId) return;
        setSaving(true);
        try {
            await saveRulesToStorage(communityId, data);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setHasChanges(false);
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setSaving(false);
        }
    };

    // ── Derived ──────────────────────────────────────────────────

    const displayRules = data.customRules.length > 0
        ? data.customRules.filter((r) => r.trim().length > 0)
        : DEFAULT_RULES;

    // ── Render ───────────────────────────────────────────────────

    if (loading) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />
                <ScreenHeader title="Community Rules" showBack />
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={colors.gold[500]} />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            <ScreenHeader title="Community Rules" showBack />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 120 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Header ─────────────────────────────────── */}
                    <Animated.View entering={FadeInDown.duration(300)}>
                        <Text style={styles.subtitle}>Set the standards for your community</Text>
                    </Animated.View>

                    {/* ── Section 1: Rules Display ────────────────── */}
                    <Animated.View entering={FadeInDown.duration(300).delay(60)}>
                        <Text style={styles.sectionTitle}>
                            <Ionicons name="book-outline" size={14} color={colors.text.muted} />
                            {'  '}Rules
                        </Text>
                        {displayRules.map((rule, i) => (
                            <GlassCard key={`rule-${i}`} style={styles.ruleRow}>
                                <View style={styles.ruleNumber}>
                                    <Text style={styles.ruleNumberText}>{i + 1}</Text>
                                </View>
                                <Text style={styles.ruleText}>{rule}</Text>
                            </GlassCard>
                        ))}
                        {data.customRules.length === 0 && (
                            <Text style={styles.defaultNote}>
                                These are default rules. {isAdmin ? 'Add custom rules below to replace them.' : 'Admins can customize these.'}
                            </Text>
                        )}
                    </Animated.View>

                    {/* ── Section 2: Moderation Controls (Admin) ──── */}
                    {isAdmin && (
                        <Animated.View entering={FadeInDown.duration(300).delay(120)}>
                            <Text style={styles.sectionTitle}>
                                <Ionicons name="shield-outline" size={14} color={colors.text.muted} />
                                {'  '}Moderation Controls
                            </Text>
                            {TOGGLE_ITEMS.map((item) => (
                                <GlassCard key={item.key} style={styles.toggleRow}>
                                    <View style={styles.toggleInfo}>
                                        <View style={styles.toggleIcon}>
                                            <Ionicons
                                                name={item.icon}
                                                size={18}
                                                color={data.moderation[item.key] ? colors.gold[400] : colors.text.muted}
                                            />
                                        </View>
                                        <Text style={styles.toggleLabel}>{item.label}</Text>
                                    </View>
                                    <Switch
                                        value={data.moderation[item.key]}
                                        onValueChange={() => toggleModeration(item.key)}
                                        trackColor={{ false: colors.obsidian[600], true: colors.gold[500] + '60' }}
                                        thumbColor={data.moderation[item.key] ? colors.gold[500] : colors.text.muted}
                                        accessibilityLabel={`Toggle ${item.label}`}
                                    />
                                </GlassCard>
                            ))}
                        </Animated.View>
                    )}

                    {/* ── Section 3: Auto-Moderation (Admin) ──────── */}
                    {isAdmin && (
                        <Animated.View entering={FadeInDown.duration(300).delay(180)}>
                            <Text style={styles.sectionTitle}>
                                <Ionicons name="flash-outline" size={14} color={colors.text.muted} />
                                {'  '}Auto-Moderation
                            </Text>

                            {/* Keyword Filters */}
                            <GlassCard padding="lg" style={styles.autoModCard}>
                                <Text style={styles.autoModLabel}>Keyword Filters</Text>
                                <Text style={styles.autoModHint}>Comma-separated blocked words</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={data.autoModeration.keywordFilters}
                                    onChangeText={(text) => updateAutoMod({ keywordFilters: text })}
                                    placeholder="e.g. spam, scam, hate"
                                    placeholderTextColor={colors.text.muted}
                                    multiline
                                    accessibilityLabel="Keyword filters"
                                />
                            </GlassCard>

                            {/* Max posts per day */}
                            <GlassCard padding="lg" style={styles.autoModCard}>
                                <Text style={styles.autoModLabel}>Maximum posts per day</Text>
                                <View style={styles.chipRow}>
                                    {POST_LIMIT_OPTIONS.map((opt) => {
                                        const active = data.autoModeration.maxPostsPerDay === opt.value;
                                        return (
                                            <TouchableOpacity
                                                key={opt.value}
                                                style={[styles.chip, active && styles.chipActive]}
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    updateAutoMod({ maxPostsPerDay: opt.value });
                                                }}
                                                activeOpacity={0.7}
                                                accessibilityLabel={`Set max posts to ${opt.label}`}
                                            >
                                                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                                    {opt.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </GlassCard>

                            {/* Min account age */}
                            <GlassCard padding="lg" style={styles.autoModCard}>
                                <Text style={styles.autoModLabel}>Minimum account age to post</Text>
                                <View style={styles.chipRow}>
                                    {ACCOUNT_AGE_OPTIONS.map((opt) => {
                                        const active = data.autoModeration.minAccountAge === opt.value;
                                        return (
                                            <TouchableOpacity
                                                key={opt.value}
                                                style={[styles.chip, active && styles.chipActive]}
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    updateAutoMod({ minAccountAge: opt.value });
                                                }}
                                                activeOpacity={0.7}
                                                accessibilityLabel={`Set minimum account age to ${opt.label}`}
                                            >
                                                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                                    {opt.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </GlassCard>
                        </Animated.View>
                    )}

                    {/* ── Section 4: Custom Rules Editor (Admin) ──── */}
                    {isAdmin && (
                        <Animated.View entering={FadeInDown.duration(300).delay(240)}>
                            <Text style={styles.sectionTitle}>
                                <Ionicons name="create-outline" size={14} color={colors.text.muted} />
                                {'  '}Custom Rules Editor
                            </Text>
                            {data.customRules.map((rule, i) => (
                                <GlassCard key={`edit-${i}`} style={styles.customRuleRow}>
                                    <View style={styles.customRuleNumber}>
                                        <Text style={styles.customRuleNumberText}>{i + 1}</Text>
                                    </View>
                                    <TextInput
                                        style={styles.customRuleInput}
                                        value={rule}
                                        onChangeText={(text) => updateCustomRule(i, text)}
                                        placeholder="Enter rule..."
                                        placeholderTextColor={colors.text.muted}
                                        multiline
                                        accessibilityLabel={`Custom rule ${i + 1}`}
                                    />
                                    <TouchableOpacity
                                        onPress={() => removeCustomRule(i)}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        accessibilityLabel={`Remove rule ${i + 1}`}
                                    >
                                        <Ionicons name="close-circle" size={22} color={colors.coral[500]} />
                                    </TouchableOpacity>
                                </GlassCard>
                            ))}
                            <TouchableOpacity
                                style={styles.addRuleBtn}
                                onPress={addCustomRule}
                                activeOpacity={0.7}
                                accessibilityLabel="Add custom rule"
                                accessibilityRole="button"
                            >
                                <Ionicons name="add-circle-outline" size={20} color={colors.gold[400]} />
                                <Text style={styles.addRuleBtnText}>Add Rule</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {/* ── Transparency Note ───────────────────────── */}
                    <Animated.View entering={FadeInDown.duration(300).delay(300)} style={styles.transparencyNote}>
                        <Ionicons name="shield-checkmark-outline" size={16} color={colors.emerald[500]} />
                        <Text style={styles.transparencyText}>
                            All members can see these rules. Moderation is transparent — no hidden censorship.
                        </Text>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ── Save bar (Admin only) ────────────────────────── */}
            {isAdmin && hasChanges && (
                <Animated.View entering={FadeInDown.duration(300)} style={[styles.saveBar, { paddingBottom: insets.bottom + spacing.md }]}>
                    <TouchableOpacity
                        style={styles.saveBtn}
                        onPress={handleSave}
                        disabled={saving}
                        activeOpacity={0.9}
                        accessibilityLabel="Save rules"
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
                                <Text style={styles.saveBtnText}>Save Rules</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    scroll: { flex: 1 },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // Header
    subtitle: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginBottom: spacing.lg,
        fontWeight: '500',
    },

    // Section titles
    sectionTitle: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
    },

    // Rules display
    ruleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
    },
    ruleNumber: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    ruleNumberText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.gold[500],
    },
    ruleText: {
        flex: 1,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        lineHeight: 22,
    },
    defaultNote: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        fontStyle: 'italic',
        marginTop: spacing.xs,
    },

    // Toggle rows
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
    },
    toggleInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: spacing.md,
    },
    toggleIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    toggleLabel: {
        fontSize: typography.fontSize.base,
        fontWeight: '500',
        color: colors.text.primary,
        flex: 1,
    },

    // Auto-moderation
    autoModCard: {
        marginBottom: spacing.sm,
    },
    autoModLabel: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 2,
    },
    autoModHint: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginBottom: spacing.sm,
    },
    textInput: {
        backgroundColor: colors.obsidian[700],
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        minHeight: 44,
    },

    // Chips
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    chip: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 12,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    chipActive: {
        borderColor: colors.gold[500] + '60',
        backgroundColor: colors.surface.goldSubtle,
    },
    chipText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        fontWeight: '500',
    },
    chipTextActive: {
        color: colors.gold[400],
    },

    // Custom rules editor
    customRuleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    customRuleNumber: {
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    customRuleNumberText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.gold[500],
    },
    customRuleInput: {
        flex: 1,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        paddingVertical: spacing.xs,
        marginRight: spacing.sm,
        minHeight: 36,
    },
    addRuleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface.goldSubtle,
        borderRadius: 14,
        paddingVertical: spacing.md,
        marginTop: spacing.xs,
        borderWidth: 1,
        borderColor: colors.gold[500] + '20',
    },
    addRuleBtnText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.gold[400],
    },

    // Transparency
    transparencyNote: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.xl,
        paddingVertical: spacing.md,
    },
    transparencyText: {
        flex: 1,
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        lineHeight: 16,
    },

    // Save bar
    saveBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        backgroundColor: colors.obsidian[900] + 'F0',
    },
    saveBtn: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    saveBtnGradient: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    saveBtnText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '600',
        color: colors.obsidian[900],
        fontFamily: 'Inter-SemiBold',
    },
});
