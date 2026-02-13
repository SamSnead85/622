import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Switch,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Keyboard,
    TouchableWithoutFeedback,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { useTranslation } from 'react-i18next';
import { apiFetch, API } from '../../../lib/api';
import { ScreenHeader } from '../../../components';

const DURATIONS = [
    { label: '1 hour', hours: 1 },
    { label: '6 hours', hours: 6 },
    { label: '24 hours', hours: 24 },
    { label: '3 days', hours: 72 },
    { label: '7 days', hours: 168 },
    { label: 'No limit', hours: 0 },
];

export default function PollCreateScreen() {
    const router = useRouter();
    const { id: communityId } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();

    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [durationHours, setDurationHours] = useState(24);
    const [creating, setCreating] = useState(false);

    const addOption = () => {
        if (options.length >= 6) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setOptions([...options, '']);
    };

    const removeOption = (index: number) => {
        if (options.length <= 2) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setOptions(options.filter((_, i) => i !== index));
    };

    const updateOption = (index: number, text: string) => {
        setOptions(options.map((o, i) => (i === index ? text : o)));
    };

    const isValid = question.trim().length >= 3 && options.filter((o) => o.trim()).length >= 2;

    const handleCreate = async () => {
        if (!isValid || !communityId) return;
        setCreating(true);
        try {
            const body: any = {
                question: question.trim(),
                options: options.filter((o) => o.trim()).map((text) => ({ text: text.trim() })),
                isAnonymous,
            };
            if (durationHours > 0) {
                body.expiresAt = new Date(Date.now() + durationHours * 3600000).toISOString();
            }
            await apiFetch(API.communityPolls(communityId), {
                method: 'POST',
                body: JSON.stringify(body),
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
        } catch (e: unknown) {
            Alert.alert('Poll Creation Failed', e instanceof Error ? e.message : 'Unable to create poll');
        } finally {
            setCreating(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            <ScreenHeader title="Create Poll" />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 120 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Question */}
                    <Animated.View entering={FadeInDown.duration(300)}>
                        <Text style={styles.label}>Question</Text>
                        <TextInput
                            style={styles.questionInput}
                            placeholder={t('communities.askQuestion')}
                            placeholderTextColor={colors.text.muted}
                            value={question}
                            onChangeText={setQuestion}
                            multiline
                            maxLength={280}
                        />
                    </Animated.View>

                    {/* Options */}
                    <Animated.View entering={FadeInDown.duration(300).delay(100)}>
                        <Text style={[styles.label, { marginTop: spacing.xl }]}>Options</Text>
                        {options.map((opt, i) => (
                            <View key={i} style={styles.optionInputRow}>
                                <View style={styles.optionIndex}>
                                    <Text style={styles.optionIndexText}>{i + 1}</Text>
                                </View>
                                <TextInput
                                    style={styles.optionInput}
                                    placeholder={`Option ${i + 1}`}
                                    placeholderTextColor={colors.text.muted}
                                    value={opt}
                                    onChangeText={(text) => updateOption(i, text)}
                                    maxLength={100}
                                />
                                {options.length > 2 && (
                                    <TouchableOpacity onPress={() => removeOption(i)}>
                                        <Ionicons name="close-circle" size={20} color={colors.text.muted} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                        {options.length < 6 && (
                            <TouchableOpacity style={styles.addOptionBtn} onPress={addOption}>
                                <Ionicons name="add-circle-outline" size={18} color={colors.gold[400]} />
                                <Text style={styles.addOptionText}>Add option</Text>
                            </TouchableOpacity>
                        )}
                    </Animated.View>

                    {/* Settings */}
                    <Animated.View entering={FadeInDown.duration(300).delay(200)}>
                        <Text style={[styles.label, { marginTop: spacing.xl }]}>Settings</Text>

                        <View style={styles.settingRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>Anonymous voting</Text>
                                <Text style={styles.settingDesc}>Voters' identities are hidden from everyone</Text>
                            </View>
                            <Switch
                                value={isAnonymous}
                                onValueChange={(val) => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setIsAnonymous(val);
                                }}
                                trackColor={{ false: colors.obsidian[600], true: colors.gold[500] + '60' }}
                                thumbColor={isAnonymous ? colors.gold[500] : colors.text.muted}
                            />
                        </View>

                        <Text style={styles.durationLabel}>Duration</Text>
                        <View style={styles.durationGrid}>
                            {DURATIONS.map((d) => {
                                const isActive = durationHours === d.hours;
                                return (
                                    <TouchableOpacity
                                        key={d.hours}
                                        style={[styles.durationChip, isActive && styles.durationChipActive]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setDurationHours(d.hours);
                                        }}
                                    >
                                        <Text style={[styles.durationText, isActive && styles.durationTextActive]}>
                                            {d.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Animated.View>
                </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>

            {/* Create button */}
            <View style={[styles.saveBar, { paddingBottom: insets.bottom + spacing.md }]}>
                <TouchableOpacity
                    style={[styles.saveBtn, !isValid && styles.saveBtnDisabled]}
                    onPress={handleCreate}
                    disabled={creating || !isValid}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={isValid ? [colors.gold[400], colors.gold[600]] : [colors.obsidian[500], colors.obsidian[600]]}
                        style={styles.saveBtnGradient}
                    >
                        {creating ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={[styles.saveBtnText, !isValid && { color: colors.text.muted }]}>
                                Create Poll
                            </Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    scroll: { flex: 1 },
    label: {
        fontSize: typography.fontSize.xs, fontWeight: '700',
        color: colors.text.muted, textTransform: 'uppercase',
        letterSpacing: 1, marginBottom: spacing.sm,
    },
    questionInput: {
        backgroundColor: colors.surface.glass, borderRadius: 14,
        padding: spacing.md, fontSize: typography.fontSize.lg,
        color: colors.text.primary, borderWidth: 1,
        borderColor: colors.border.subtle, minHeight: 80,
        textAlignVertical: 'top',
    },
    optionInputRow: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    optionIndex: {
        width: 28, height: 28, borderRadius: 8,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center', justifyContent: 'center',
    },
    optionIndexText: {
        fontSize: typography.fontSize.sm, fontWeight: '700', color: colors.gold[500],
    },
    optionInput: {
        flex: 1, backgroundColor: colors.surface.glass,
        borderRadius: 12, padding: spacing.md,
        fontSize: typography.fontSize.base, color: colors.text.primary,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    addOptionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        paddingVertical: spacing.sm,
    },
    addOptionText: {
        fontSize: typography.fontSize.sm, color: colors.gold[400], fontWeight: '600',
    },
    settingRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface.glass, borderRadius: 14,
        padding: spacing.md, borderWidth: 1, borderColor: colors.border.subtle,
        marginBottom: spacing.md,
    },
    settingLabel: {
        fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary,
    },
    settingDesc: {
        fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 2,
    },
    durationLabel: {
        fontSize: typography.fontSize.sm, fontWeight: '600',
        color: colors.text.secondary, marginBottom: spacing.sm,
    },
    durationGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
    },
    durationChip: {
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderRadius: 10, backgroundColor: colors.surface.glass,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    durationChipActive: {
        borderColor: colors.gold[500] + '60',
        backgroundColor: colors.surface.goldSubtle,
    },
    durationText: {
        fontSize: typography.fontSize.sm, color: colors.text.muted, fontWeight: '500',
    },
    durationTextActive: { color: colors.gold[400] },

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
    saveBtnDisabled: { shadowOpacity: 0 },
    saveBtnGradient: {
        alignItems: 'center', justifyContent: 'center', paddingVertical: 16,
    },
    saveBtnText: {
        fontSize: typography.fontSize.lg, fontWeight: '600',
        color: '#FFFFFF', fontFamily: 'Inter-SemiBold',
    },
});
