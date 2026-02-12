// ============================================
// Create Space — Setup screen for new audio space
// ============================================

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    FadeInDown,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';
import { ScreenHeader } from '../../components';
import { apiFetch, API } from '../../lib/api';

// ============================================
// Topic Options
// ============================================

const TOPIC_OPTIONS = [
    { key: 'General', label: 'General', icon: 'chatbubbles' as const },
    { key: 'Tech', label: 'Tech', icon: 'code-slash' as const },
    { key: 'Music', label: 'Music', icon: 'musical-notes' as const },
    { key: 'Sports', label: 'Sports', icon: 'football' as const },
    { key: 'Culture', label: 'Culture', icon: 'earth' as const },
    { key: 'Gaming', label: 'Gaming', icon: 'game-controller' as const },
    { key: 'News', label: 'News', icon: 'newspaper' as const },
    { key: 'Comedy', label: 'Comedy', icon: 'happy' as const },
    { key: 'Education', label: 'Education', icon: 'school' as const },
    { key: 'Business', label: 'Business', icon: 'briefcase' as const },
    { key: 'Health', label: 'Health', icon: 'fitness' as const },
    { key: 'Art', label: 'Art', icon: 'color-palette' as const },
];

// ============================================
// Speaker Count Options
// ============================================

const SPEAKER_COUNTS = [2, 3, 4, 6, 8, 10, 12];

// ============================================
// Main Screen
// ============================================

export default function CreateSpaceScreen() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('General');
    const [maxSpeakers, setMaxSpeakers] = useState(6);
    const [isCreating, setIsCreating] = useState(false);

    const buttonScale = useSharedValue(1);
    const buttonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    const canCreate = title.trim().length >= 3 && title.trim().length <= 100;

    const handleCreate = useCallback(async () => {
        if (!canCreate || isCreating) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setIsCreating(true);

        try {
            const data = await apiFetch<{ space: { id: string } }>(API.spacesCreate, {
                method: 'POST',
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim(),
                    topic: selectedTopic,
                    maxSpeakers,
                }),
            });

            if (data?.space?.id) {
                router.replace(`/spaces/${data.space.id}`);
            }
        } catch (err: any) {
            Alert.alert('Space Creation Failed', err.message || 'Unable to create space');
        } finally {
            setIsCreating(false);
        }
    }, [canCreate, isCreating, title, description, selectedTopic, maxSpeakers, router]);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800], colors.obsidian[900]]}
                style={StyleSheet.absoluteFill}
            />

            <ScreenHeader title="Create Space" showBack noBorder />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ---- Title Input ---- */}
                    <Animated.View entering={FadeInDown.delay(60).duration(500)}>
                        <Text style={styles.label}>Space Name</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="mic" size={18} color={colors.amber[400]} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="What's the conversation about?"
                                placeholderTextColor={colors.text.muted}
                                value={title}
                                onChangeText={setTitle}
                                maxLength={100}
                                returnKeyType="next"
                                autoFocus
                            />
                        </View>
                        <Text style={styles.charCount}>
                            {title.length}/100
                        </Text>
                    </Animated.View>

                    {/* ---- Description Input ---- */}
                    <Animated.View entering={FadeInDown.delay(120).duration(500)}>
                        <Text style={styles.label}>Description (optional)</Text>
                        <View style={[styles.inputContainer, styles.textAreaContainer]}>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Add more details about your space..."
                                placeholderTextColor={colors.text.muted}
                                value={description}
                                onChangeText={setDescription}
                                maxLength={500}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />
                        </View>
                    </Animated.View>

                    {/* ---- Topic Picker ---- */}
                    <Animated.View entering={FadeInDown.delay(180).duration(500)}>
                        <Text style={styles.label}>Topic</Text>
                        <View style={styles.topicGrid}>
                            {TOPIC_OPTIONS.map((topic) => (
                                <TouchableOpacity
                                    key={topic.key}
                                    style={[
                                        styles.topicChip,
                                        selectedTopic === topic.key && styles.topicChipActive,
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSelectedTopic(topic.key);
                                    }}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected: selectedTopic === topic.key }}
                                >
                                    <Ionicons
                                        name={topic.icon}
                                        size={16}
                                        color={selectedTopic === topic.key ? colors.amber[400] : colors.text.muted}
                                    />
                                    <Text
                                        style={[
                                            styles.topicChipText,
                                            selectedTopic === topic.key && styles.topicChipTextActive,
                                        ]}
                                    >
                                        {topic.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>

                    {/* ---- Max Speakers ---- */}
                    <Animated.View entering={FadeInDown.delay(240).duration(500)}>
                        <Text style={styles.label}>Max Speakers</Text>
                        <Text style={styles.sublabel}>
                            How many people can speak at once (including you)
                        </Text>
                        <View style={styles.speakerCountRow}>
                            {SPEAKER_COUNTS.map((count) => (
                                <TouchableOpacity
                                    key={count}
                                    style={[
                                        styles.countChip,
                                        maxSpeakers === count && styles.countChipActive,
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setMaxSpeakers(count);
                                    }}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected: maxSpeakers === count }}
                                >
                                    <Text
                                        style={[
                                            styles.countChipText,
                                            maxSpeakers === count && styles.countChipTextActive,
                                        ]}
                                    >
                                        {count}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>

                    {/* ---- Info Card ---- */}
                    <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                        <View style={styles.infoCard}>
                            <Ionicons name="information-circle-outline" size={20} color={colors.amber[400]} />
                            <Text style={styles.infoText}>
                                You'll be the host and automatically join as a speaker. Others will join as listeners and can request to speak.
                            </Text>
                        </View>
                    </Animated.View>

                    <View style={{ height: spacing['2xl'] }} />
                </ScrollView>

                {/* ---- Create Button ---- */}
                <Animated.View
                    entering={FadeInDown.delay(360).duration(500)}
                    style={styles.bottomBar}
                >
                    <Animated.View style={buttonAnimatedStyle}>
                        <TouchableOpacity
                            onPress={handleCreate}
                            onPressIn={() => { buttonScale.value = withSpring(0.96); }}
                            onPressOut={() => { buttonScale.value = withSpring(1); }}
                            disabled={!canCreate || isCreating}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Start Space"
                        >
                            <LinearGradient
                                colors={
                                    canCreate
                                        ? [colors.amber[500], colors.gold[500]]
                                        : [colors.obsidian[600], colors.obsidian[500]]
                                }
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.createButton}
                            >
                                {isCreating ? (
                                    <ActivityIndicator size="small" color={colors.obsidian[900]} />
                                ) : (
                                    <>
                                        <Ionicons
                                            name="mic"
                                            size={20}
                                            color={canCreate ? colors.obsidian[900] : colors.text.muted}
                                        />
                                        <Text
                                            style={[
                                                styles.createButtonText,
                                                !canCreate && styles.createButtonTextDisabled,
                                            ]}
                                        >
                                            Start Space
                                        </Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    flex: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },

    label: {
        fontSize: typography.fontSize.base, fontWeight: '700', fontFamily: 'Inter-Bold',
        color: colors.text.primary, marginBottom: spacing.sm,
    },
    sublabel: {
        fontSize: typography.fontSize.sm, color: colors.text.muted, marginBottom: spacing.md,
    },

    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface.glass, borderRadius: 14,
        borderWidth: 1, borderColor: colors.border.subtle,
        paddingHorizontal: spacing.md,
    },
    inputIcon: { marginRight: spacing.sm },
    input: {
        flex: 1, color: colors.text.primary, fontSize: typography.fontSize.base,
        paddingVertical: spacing.md + 2, fontFamily: 'Inter',
    },
    textAreaContainer: { alignItems: 'flex-start', paddingVertical: spacing.sm },
    textArea: { minHeight: 80, paddingTop: spacing.sm },
    charCount: {
        fontSize: typography.fontSize.xs, color: colors.text.muted,
        textAlign: 'right', marginTop: spacing.xs, marginBottom: spacing.xl,
    },

    topicGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl,
    },
    topicChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: 12,
        backgroundColor: colors.surface.glass, borderWidth: 1, borderColor: colors.border.subtle,
    },
    topicChipActive: {
        backgroundColor: 'rgba(244, 163, 0, 0.12)', borderColor: colors.amber[500] + '40',
    },
    topicChipText: { fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.text.muted },
    topicChipTextActive: { color: colors.amber[400] },

    speakerCountRow: {
        flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl,
    },
    countChip: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: colors.surface.glass, borderWidth: 1, borderColor: colors.border.subtle,
        alignItems: 'center', justifyContent: 'center',
    },
    countChipActive: {
        backgroundColor: 'rgba(244, 163, 0, 0.12)', borderColor: colors.amber[500] + '40',
    },
    countChipText: { fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.text.muted },
    countChipTextActive: { color: colors.amber[400] },

    infoCard: {
        flexDirection: 'row', gap: spacing.md,
        backgroundColor: colors.surface.glass, borderRadius: 14,
        borderWidth: 1, borderColor: colors.border.subtle,
        padding: spacing.lg,
    },
    infoText: {
        flex: 1, fontSize: typography.fontSize.sm, color: colors.text.secondary,
        lineHeight: 20,
    },

    bottomBar: {
        paddingHorizontal: spacing.lg, paddingVertical: spacing.lg,
        backgroundColor: colors.obsidian[900],
        borderTopWidth: 1, borderTopColor: colors.border.subtle,
    },
    createButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.sm, paddingVertical: spacing.lg, borderRadius: 16,
    },
    createButtonText: {
        fontSize: typography.fontSize.lg, fontWeight: '700', fontFamily: 'Inter-Bold',
        color: colors.obsidian[900],
    },
    createButtonTextDisabled: { color: colors.text.muted },
});
