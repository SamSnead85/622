import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API } from '../lib/api';
import { useAuthStore } from '../stores';
import { ScreenHeader, LoadingView, GlassCard } from '../components';

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
    sports: { icon: 'football-outline', color: colors.coral[400] },
    business: { icon: 'briefcase-outline', color: colors.azure[500] },
    art: { icon: 'color-palette-outline', color: colors.coral[400] },
    health: { icon: 'fitness-outline', color: colors.emerald[400] },
    education: { icon: 'school-outline', color: colors.azure[400] },
    food: { icon: 'restaurant-outline', color: colors.gold[500] },
    travel: { icon: 'airplane-outline', color: colors.azure[400] },
    politics: { icon: 'megaphone-outline', color: colors.coral[400] },
    science: { icon: 'flask-outline', color: colors.azure[300] },
    entertainment: { icon: 'film-outline', color: colors.coral[300] },
    gaming: { icon: 'game-controller-outline', color: colors.emerald[500] },
};

// ─── Suggested Communities for Onboarding ───────────────────────
interface SuggestedCommunity {
    id: string;
    name: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    members: string;
}

const SUGGESTED_COMMUNITIES: SuggestedCommunity[] = [
    {
        id: 'mosque',
        name: 'Local Mosque',
        description: 'Connect with your local masjid community',
        icon: 'moon-outline',
        color: colors.gold[500],
        members: 'New',
    },
    {
        id: 'family',
        name: 'Family Circle',
        description: 'A private space for family updates and photos',
        icon: 'people-outline',
        color: colors.coral[500],
        members: 'New',
    },
    {
        id: 'study',
        name: 'Study Circle',
        description: 'Learn together — Islamic studies, book clubs, and more',
        icon: 'book-outline',
        color: colors.azure[500],
        members: 'New',
    },
    {
        id: 'wellness',
        name: 'Wellness & Fitness',
        description: 'Health tips, workout partners, and halal nutrition',
        icon: 'fitness-outline',
        color: colors.emerald[500],
        members: 'New',
    },
];

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
    const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(new Set());
    const [communities, setCommunities] = useState<SuggestedCommunity[]>(SUGGESTED_COMMUNITIES);

    const handleJoinCommunity = (communityId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setJoinedCommunities((prev) => {
            const next = new Set(prev);
            if (next.has(communityId)) next.delete(communityId);
            else next.add(communityId);
            return next;
        });
    };

    const handleShareInvite = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await Share.share({
                message: 'Join me on 0G — a private, secure social platform. https://0gravity.ai/invite',
            });
        } catch {
            // User cancelled or share failed
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [topicsRes, interestsRes, communitiesRes] = await Promise.allSettled([
                apiFetch<any>(API.topics),
                apiFetch<any>(API.userInterests),
                apiFetch<any>(API.communities),
            ]);

            if (topicsRes.status === 'fulfilled') {
                const list = topicsRes.value?.topics || topicsRes.value || [];
                setTopics(Array.isArray(list) ? list : []);
            }

            if (interestsRes.status === 'fulfilled') {
                const interests = interestsRes.value?.interests || [];
                setSelectedIds(new Set(interests.map((i: any) => i.topicId || i.topic?.id)));
            }

            if (communitiesRes.status === 'fulfilled') {
                const raw = communitiesRes.value?.communities || communitiesRes.value || [];
                if (Array.isArray(raw) && raw.length > 0) {
                    const mapped: SuggestedCommunity[] = raw.slice(0, 6).map((c: any) => {
                        const fallback = SUGGESTED_COMMUNITIES.find((sc) => sc.id === c.id);
                        const memberCount = c.memberCount ?? c._count?.members ?? 0;
                        return {
                            id: c.id,
                            name: c.name || fallback?.name || 'Community',
                            description: c.description || fallback?.description || '',
                            icon: (c.icon || fallback?.icon || 'people-outline') as keyof typeof Ionicons.glyphMap,
                            color: c.color || fallback?.color || colors.gold[500],
                            members: memberCount > 0
                                ? memberCount >= 1000
                                    ? `${(memberCount / 1000).toFixed(1)}K members`
                                    : `${memberCount} members`
                                : 'New',
                        };
                    });
                    setCommunities(mapped);
                }
                // If empty array or no data, keep the fallback SUGGESTED_COMMUNITIES
            }
        } catch {
            // Silently handle — fallback communities already set
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

    const refreshUser = useAuthStore((s) => s.refreshUser);

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiFetch(API.userInterests, {
                method: 'POST',
                body: JSON.stringify({ topicIds: Array.from(selectedIds) }),
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (isOnboarding) {
                // Mark onboarding as complete on the server
                await apiFetch(API.onboardingComplete, { method: 'POST' }).catch(() => {});
                // Refresh user so the store has onboardingComplete = true
                await refreshUser().catch(() => {});
                router.replace('/(tabs)');
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

            <ScreenHeader title={isOnboarding ? 'Almost There' : 'Your Interests'} />

            {loading ? (
                <LoadingView message="Loading topics..." />
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

                        {/* Ramadan suggestion */}
                        {(() => {
                            const now = new Date();
                            const ramadanStart = new Date(2026, 1, 18);
                            const ramadanEnd = new Date(2026, 2, 23);
                            const isRamadanSeason = now >= new Date(2026, 0, 19) && now <= ramadanEnd;
                            const faithTopic = topics.find((t) => t.slug === 'faith');
                            if (isRamadanSeason && faithTopic && !selectedIds.has(faithTopic.id)) {
                                return (
                                    <Animated.View entering={FadeInDown.duration(400)} style={styles.ramadanSuggestion}>
                                        <Text style={styles.ramadanSuggestionIcon}>☪️</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.ramadanSuggestionTitle}>Recommended for Ramadan</Text>
                                            <Text style={styles.ramadanSuggestionText}>
                                                Add "Faith & Spirituality" to get Ramadan content in your feed
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.ramadanSuggestionBtn}
                                            onPress={() => toggleTopic(faithTopic.id)}
                                            accessibilityRole="button"
                                            accessibilityLabel="Add Faith and Spirituality topic"
                                        >
                                            <Text style={styles.ramadanSuggestionBtnText}>Add</Text>
                                        </TouchableOpacity>
                                    </Animated.View>
                                );
                            }
                            return null;
                        })()}

                        <View style={styles.grid}>
                            {topics.map((topic, i) => {
                                const { icon, color } = getTopicVisuals(topic);
                                const isSelected = selectedIds.has(topic.id);
                                const isRamadanHighlight = topic.slug === 'faith' && (() => {
                                    const now = new Date();
                                    return now >= new Date(2026, 0, 19) && now <= new Date(2026, 2, 23);
                                })();
                                return (
                                    <Animated.View key={topic.id} entering={FadeInDown.duration(300).delay(i * 40)}>
                                        <TouchableOpacity
                                            style={[
                                                styles.topicCard,
                                                isSelected && { borderColor: color + '80' },
                                                isRamadanHighlight && !isSelected && styles.ramadanTopicHighlight,
                                            ]}
                                            onPress={() => toggleTopic(topic.id)}
                                            activeOpacity={0.7}
                                            accessibilityRole="button"
                                            accessibilityLabel={`${topic.name}${topic.postCount > 0 ? `, ${topic.postCount} posts` : ''}`}
                                            accessibilityState={{ selected: isSelected }}
                                            accessibilityHint={isSelected ? 'Double tap to deselect' : 'Double tap to select'}
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
                                                    <Ionicons name="checkmark" size={12} color={colors.text.primary} />
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

                        {/* ── Suggested Communities ── */}
                        {isOnboarding && (
                            <Animated.View entering={FadeInDown.duration(400).delay(400)}>
                                <Text style={styles.communitySectionTitle}>Suggested Communities</Text>
                                <Text style={styles.communitySectionSubtitle}>
                                    Join a community to start connecting with people who share your interests
                                </Text>
                                <View style={styles.communityCards}>
                                    {communities.map((community, i) => {
                                        const isJoined = joinedCommunities.has(community.id);
                                        return (
                                            <Animated.View key={community.id} entering={FadeInDown.duration(300).delay(450 + i * 70)}>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.communityCard,
                                                        isJoined && { borderColor: community.color + '60' },
                                                    ]}
                                                    onPress={() => handleJoinCommunity(community.id)}
                                                    activeOpacity={0.7}
                                                    accessibilityRole="button"
                                                    accessibilityLabel={`${isJoined ? 'Leave' : 'Join'} ${community.name}`}
                                                    accessibilityState={{ selected: isJoined }}
                                                >
                                                    {isJoined && (
                                                        <View
                                                            style={[
                                                                StyleSheet.absoluteFill,
                                                                { backgroundColor: community.color + '08', borderRadius: 14 },
                                                            ]}
                                                        />
                                                    )}
                                                    <View style={[styles.communityCardIcon, { backgroundColor: community.color + '15' }]}>
                                                        <Ionicons name={community.icon} size={22} color={community.color} />
                                                    </View>
                                                    <View style={styles.communityCardInfo}>
                                                        <Text style={styles.communityCardName}>{community.name}</Text>
                                                        <Text style={styles.communityCardDesc} numberOfLines={2}>
                                                            {community.description}
                                                        </Text>
                                                    </View>
                                                    <View
                                                        style={[
                                                            styles.communityJoinBtn,
                                                            isJoined && { backgroundColor: community.color, borderColor: community.color },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.communityJoinBtnText,
                                                                isJoined && { color: colors.text.primary },
                                                            ]}
                                                        >
                                                            {isJoined ? 'Joined' : 'Join'}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            </Animated.View>
                                        );
                                    })}
                                </View>
                            </Animated.View>
                        )}

                        {/* ── Invite Friends ── */}
                        {isOnboarding && (
                            <Animated.View entering={FadeInDown.duration(400).delay(700)} style={styles.inviteSection}>
                                <View style={styles.inviteIconContainer}>
                                    <Ionicons name="people-circle-outline" size={36} color={colors.gold[400]} />
                                </View>
                                <Text style={styles.inviteTitle}>Bring Your People</Text>
                                <Text style={styles.inviteText}>
                                    0G is better with your community. Invite friends, family, and your circle to join you.
                                </Text>
                                <TouchableOpacity
                                    style={styles.inviteButton}
                                    onPress={handleShareInvite}
                                    activeOpacity={0.8}
                                    accessibilityRole="button"
                                    accessibilityLabel="Share invite link"
                                >
                                    <Ionicons name="share-outline" size={18} color={colors.gold[400]} />
                                    <Text style={styles.inviteButtonText}>Share Invite Link</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        )}
                    </ScrollView>

                    {/* Save / Get Started button */}
                    <View style={[styles.saveBar, { paddingBottom: insets.bottom + spacing.md }]}>
                        {isOnboarding ? (
                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={handleSave}
                                disabled={saving}
                                activeOpacity={0.9}
                                accessibilityRole="button"
                                accessibilityLabel="Get started"
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
                                        <View style={styles.getStartedRow}>
                                            <Text style={styles.saveBtnText}>Get Started</Text>
                                            <Ionicons name="arrow-forward" size={20} color={colors.obsidian[900]} style={{ marginStart: spacing.sm }} />
                                        </View>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={[styles.saveBtn, selectedIds.size < 3 && styles.saveBtnDisabled]}
                                onPress={handleSave}
                                disabled={saving || selectedIds.size < 3}
                                activeOpacity={0.9}
                                accessibilityRole="button"
                                accessibilityLabel={selectedIds.size < 3 ? `Pick ${3 - selectedIds.size} more topics` : 'Save interests'}
                                accessibilityState={{ disabled: saving || selectedIds.size < 3 }}
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
                        )}
                    </View>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
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
    ramadanSuggestion: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        backgroundColor: colors.surface.goldSubtle, borderRadius: 14,
        padding: spacing.md, marginBottom: spacing.lg,
        borderWidth: 1, borderColor: colors.gold[500] + '30',
    },
    ramadanSuggestionIcon: { fontSize: 24 },
    ramadanSuggestionTitle: {
        fontSize: typography.fontSize.sm, fontWeight: '700', color: colors.gold[400],
    },
    ramadanSuggestionText: {
        fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 2,
    },
    ramadanSuggestionBtn: {
        backgroundColor: colors.gold[500], borderRadius: 10,
        paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    },
    ramadanSuggestionBtnText: {
        fontSize: typography.fontSize.sm, fontWeight: '700', color: colors.obsidian[900],
    },
    ramadanTopicHighlight: {
        borderColor: colors.gold[500] + '40',
        shadowColor: colors.gold[500], shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15, shadowRadius: 8,
    },
    emptyState: {
        alignItems: 'center', paddingTop: 80,
    },
    emptyText: {
        fontSize: typography.fontSize.base, color: colors.text.muted,
        marginTop: spacing.lg, textAlign: 'center',
    },
    // ── Suggested Communities ──
    communitySectionTitle: {
        fontSize: typography.fontSize.lg, fontWeight: '700',
        color: colors.text.primary, fontFamily: 'Inter-Bold',
        marginTop: spacing['2xl'], marginBottom: spacing.xs,
    },
    communitySectionSubtitle: {
        fontSize: typography.fontSize.sm, color: colors.text.secondary,
        marginBottom: spacing.md, lineHeight: 20,
    },
    communityCards: { gap: spacing.sm },
    communityCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface.glass, borderRadius: 14,
        padding: spacing.md, borderWidth: 1.5, borderColor: colors.border.subtle,
        position: 'relative', overflow: 'hidden',
    },
    communityCardIcon: {
        width: 44, height: 44, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },
    communityCardInfo: {
        flex: 1, marginStart: spacing.md, marginEnd: spacing.sm,
    },
    communityCardName: {
        fontSize: typography.fontSize.base, fontWeight: '600',
        color: colors.text.primary,
    },
    communityCardDesc: {
        fontSize: typography.fontSize.xs, color: colors.text.muted,
        marginTop: 2, lineHeight: 16,
    },
    communityJoinBtn: {
        paddingHorizontal: spacing.md, paddingVertical: 6,
        borderRadius: 16, borderWidth: 1.5, borderColor: colors.gold[500],
    },
    communityJoinBtnText: {
        fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.gold[500],
    },

    // ── Invite Friends ──
    inviteSection: {
        marginTop: spacing['2xl'],
        backgroundColor: colors.surface.glass, borderRadius: 16,
        padding: spacing.xl, borderWidth: 1, borderColor: colors.border.subtle,
        alignItems: 'center',
    },
    inviteIconContainer: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: spacing.md,
    },
    inviteTitle: {
        fontSize: typography.fontSize.lg, fontWeight: '700',
        color: colors.text.primary, marginBottom: spacing.xs,
    },
    inviteText: {
        fontSize: typography.fontSize.sm, color: colors.text.secondary,
        textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg,
    },
    inviteButton: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        backgroundColor: colors.surface.goldSubtle,
        paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
        borderRadius: 14, borderWidth: 1, borderColor: colors.gold[500] + '30',
    },
    inviteButtonText: {
        fontSize: typography.fontSize.base, fontWeight: '600', color: colors.gold[400],
    },

    // ── Save / Get Started ──
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
    getStartedRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    },
});
