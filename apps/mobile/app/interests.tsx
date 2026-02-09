import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API } from '../lib/api';

interface Topic {
    id: string;
    slug: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    postCount: number;
}

// Fallback icons/colors for topics without them
const TOPIC_DEFAULTS: Record<string, { icon: string; color: string }> = {
    technology: { icon: 'hardware-chip-outline', color: colors.azure[500] },
    faith: { icon: 'heart-outline', color: colors.gold[500] },
    family: { icon: 'people-outline', color: colors.coral[500] },
    news: { icon: 'newspaper-outline', color: colors.emerald[500] },
    sports: { icon: 'football-outline', color: '#FF6B35' },
    business: { icon: 'briefcase-outline', color: '#8B5CF6' },
    art: { icon: 'color-palette-outline', color: '#EC4899' },
    health: { icon: 'fitness-outline', color: colors.emerald[400] },
    education: { icon: 'school-outline', color: colors.azure[400] },
    food: { icon: 'restaurant-outline', color: '#F59E0B' },
    travel: { icon: 'airplane-outline', color: '#06B6D4' },
    politics: { icon: 'megaphone-outline', color: colors.coral[400] },
    science: { icon: 'flask-outline', color: '#A78BFA' },
    entertainment: { icon: 'film-outline', color: '#F472B6' },
    gaming: { icon: 'game-controller-outline', color: '#34D399' },
};

function getTopicVisuals(topic: Topic) {
    const defaults = TOPIC_DEFAULTS[topic.slug] || { icon: 'pricetag-outline', color: colors.gold[500] };
    return {
        icon: (topic.icon || defaults.icon) as keyof typeof Ionicons.glyphMap,
        color: topic.color || defaults.color,
    };
}

export default function InterestsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ onboarding?: string }>();
    const isOnboarding = params.onboarding === 'true';

    const [topics, setTopics] = useState<Topic[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [topicsRes, interestsRes] = await Promise.allSettled([
                apiFetch<any>(API.topics),
                apiFetch<any>(API.userInterests),
            ]);

            if (topicsRes.status === 'fulfilled') {
                const list = topicsRes.value?.topics || topicsRes.value || [];
                setTopics(Array.isArray(list) ? list : []);
            }

            if (interestsRes.status === 'fulfilled') {
                const interests = interestsRes.value?.interests || [];
                setSelectedIds(new Set(interests.map((i: any) => i.topicId || i.topic?.id)));
            }
        } catch {
            // Silently handle
        } finally {
            setLoading(false);
        }
    };

    const toggleTopic = (topicId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(topicId)) next.delete(topicId);
            else next.add(topicId);
            return next;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiFetch(API.userInterests, {
                method: 'POST',
                body: JSON.stringify({ topicIds: Array.from(selectedIds) }),
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (isOnboarding) {
                router.back();
            } else {
                router.back();
            }
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Your Interests</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.gold[500]} />
                    <Text style={styles.loadingText}>Loading topics...</Text>
                </View>
            ) : (
                <>
                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingHorizontal: spacing.lg }}
                        showsVerticalScrollIndicator={false}
                    >
                        <Animated.View entering={FadeIn.duration(400)} style={styles.intro}>
                            <Text style={styles.introTitle}>What are you interested in?</Text>
                            <Text style={styles.introText}>
                                Pick at least 3 topics to personalize your feed. You can change these anytime in Settings.
                            </Text>
                            <View style={styles.progressRow}>
                                <View style={styles.progressBar}>
                                    <View style={[styles.progressFill, { width: `${Math.min(100, (selectedIds.size / 3) * 100)}%` }]} />
                                </View>
                                <Text style={styles.progressText}>
                                    {selectedIds.size < 3 ? `${selectedIds.size}/3 selected` : `${selectedIds.size} selected`}
                                </Text>
                            </View>
                        </Animated.View>

                        <View style={styles.grid}>
                            {topics.map((topic, i) => {
                                const { icon, color } = getTopicVisuals(topic);
                                const isSelected = selectedIds.has(topic.id);
                                return (
                                    <Animated.View key={topic.id} entering={FadeInDown.duration(300).delay(i * 40)}>
                                        <TouchableOpacity
                                            style={[styles.topicCard, isSelected && { borderColor: color + '80' }]}
                                            onPress={() => toggleTopic(topic.id)}
                                            activeOpacity={0.7}
                                        >
                                            {isSelected && (
                                                <View style={[StyleSheet.absoluteFill, { backgroundColor: color + '10', borderRadius: 14 }]} />
                                            )}
                                            <View style={[styles.topicIcon, { backgroundColor: color + '18' }]}>
                                                <Ionicons name={icon} size={22} color={color} />
                                            </View>
                                            <Text style={[styles.topicName, isSelected && { color: colors.text.primary }]}>
                                                {topic.name}
                                            </Text>
                                            {topic.postCount > 0 && (
                                                <Text style={styles.topicCount}>
                                                    {topic.postCount > 1000 ? `${(topic.postCount / 1000).toFixed(1)}K` : topic.postCount} posts
                                                </Text>
                                            )}
                                            {isSelected && (
                                                <View style={[styles.checkBadge, { backgroundColor: color }]}>
                                                    <Ionicons name="checkmark" size={12} color="#fff" />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    </Animated.View>
                                );
                            })}
                        </View>

                        {topics.length === 0 && (
                            <View style={styles.emptyState}>
                                <Ionicons name="pricetags-outline" size={48} color={colors.text.muted} />
                                <Text style={styles.emptyText}>No topics available yet. Check back soon!</Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Save button */}
                    <View style={[styles.saveBar, { paddingBottom: insets.bottom + spacing.md }]}>
                        <TouchableOpacity
                            style={[styles.saveBtn, selectedIds.size < 3 && styles.saveBtnDisabled]}
                            onPress={handleSave}
                            disabled={saving || selectedIds.size < 3}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={selectedIds.size >= 3 ? [colors.gold[400], colors.gold[600]] : [colors.obsidian[500], colors.obsidian[600]]}
                                style={styles.saveBtnGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color={colors.obsidian[900]} />
                                ) : (
                                    <Text style={[styles.saveBtnText, selectedIds.size < 3 && { color: colors.text.muted }]}>
                                        {selectedIds.size < 3 ? `Pick ${3 - selectedIds.size} more` : 'Save Interests'}
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { fontSize: typography.fontSize.base, color: colors.text.muted, marginTop: spacing.lg },
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
    intro: {
        paddingTop: spacing.xl, paddingBottom: spacing.lg,
    },
    introTitle: {
        fontSize: 24, fontWeight: '700', color: colors.text.primary,
        fontFamily: 'Inter-Bold', letterSpacing: -0.5,
    },
    introText: {
        fontSize: typography.fontSize.base, color: colors.text.secondary,
        marginTop: spacing.sm, lineHeight: 22,
    },
    progressRow: { marginTop: spacing.md },
    progressBar: {
        height: 4, borderRadius: 2, backgroundColor: colors.obsidian[600],
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%', borderRadius: 2, backgroundColor: colors.gold[500],
    },
    progressText: {
        fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs,
    },
    grid: {
        flexDirection: 'row', flexWrap: 'wrap',
        gap: spacing.sm,
    },
    topicCard: {
        width: '47%' as any, minWidth: 150, flexGrow: 1,
        backgroundColor: colors.surface.glass, borderRadius: 14,
        padding: spacing.md, borderWidth: 1.5, borderColor: colors.border.subtle,
        position: 'relative',
    },
    topicIcon: {
        width: 40, height: 40, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    topicName: {
        fontSize: typography.fontSize.base, fontWeight: '600',
        color: colors.text.secondary, marginBottom: 2,
    },
    topicCount: {
        fontSize: typography.fontSize.xs, color: colors.text.muted,
    },
    checkBadge: {
        position: 'absolute', top: spacing.sm, right: spacing.sm,
        width: 22, height: 22, borderRadius: 11,
        alignItems: 'center', justifyContent: 'center',
    },
    emptyState: {
        alignItems: 'center', paddingTop: 80,
    },
    emptyText: {
        fontSize: typography.fontSize.base, color: colors.text.muted,
        marginTop: spacing.lg, textAlign: 'center',
    },
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
        color: colors.obsidian[900], fontFamily: 'Inter-SemiBold',
    },
});
