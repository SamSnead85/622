import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API } from '../lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OverviewData {
    totalPosts: number;
    totalFollowers: number;
    totalViews: number;
    engagementRate: number;
    followerGrowth: number;
    viewGrowth: number;
}

interface TopPost {
    id: string;
    content?: string;
    mediaUrl?: string;
    likesCount: number;
    commentsCount: number;
    viewsCount: number;
    createdAt: string;
}

interface AudienceDay {
    date: string;
    followers: number;
    views: number;
}

function formatCount(num: number): string {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
}

function StatCard({
    icon,
    label,
    value,
    change,
    delay,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    change?: number;
    delay: number;
}) {
    return (
        <Animated.View entering={FadeInDown.duration(300).delay(delay)} style={styles.statCard}>
            <Ionicons name={icon} size={20} color={colors.gold[400]} />
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
            {change !== undefined && change !== 0 && (
                <View style={[styles.changeBadge, change > 0 ? styles.changePositive : styles.changeNegative]}>
                    <Ionicons
                        name={change > 0 ? 'trending-up' : 'trending-down'}
                        size={12}
                        color={change > 0 ? colors.emerald[500] : colors.coral[500]}
                    />
                    <Text style={[styles.changeText, { color: change > 0 ? colors.emerald[500] : colors.coral[500] }]}>
                        {Math.abs(change)}%
                    </Text>
                </View>
            )}
        </Animated.View>
    );
}

function MiniChart({ data, maxHeight = 60 }: { data: number[]; maxHeight?: number }) {
    if (data.length === 0) return null;
    const max = Math.max(...data, 1);
    const barWidth = Math.max(2, (SCREEN_WIDTH - 80) / data.length - 2);

    return (
        <View style={[styles.chart, { height: maxHeight }]}>
            {data.map((val, i) => (
                <View
                    key={i}
                    style={[
                        styles.chartBar,
                        {
                            height: Math.max(2, (val / max) * maxHeight),
                            width: barWidth,
                            backgroundColor: i === data.length - 1 ? colors.gold[400] : colors.gold[500] + '40',
                        },
                    ]}
                />
            ))}
        </View>
    );
}

export default function AnalyticsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [topPosts, setTopPosts] = useState<TopPost[]>([]);
    const [audienceData, setAudienceData] = useState<AudienceDay[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [overviewRes, postsRes, audienceRes] = await Promise.allSettled([
                apiFetch<any>(API.analyticsOverview),
                apiFetch<any>(API.analyticsPosts),
                apiFetch<any>(API.analyticsAudience),
            ]);

            if (overviewRes.status === 'fulfilled') {
                setOverview(overviewRes.value);
            }
            if (postsRes.status === 'fulfilled') {
                const list = postsRes.value?.posts || postsRes.value || [];
                setTopPosts(Array.isArray(list) ? list.slice(0, 5) : []);
            }
            if (audienceRes.status === 'fulfilled') {
                const days = audienceRes.value?.days || audienceRes.value || [];
                setAudienceData(Array.isArray(days) ? days : []);
            }
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Your Analytics</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.gold[500]} />
                </View>
            ) : (
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Overview Stats */}
                    <View style={styles.statsGrid}>
                        <StatCard
                            icon="document-text"
                            label="Posts"
                            value={formatCount(overview?.totalPosts || 0)}
                            delay={0}
                        />
                        <StatCard
                            icon="people"
                            label="Followers"
                            value={formatCount(overview?.totalFollowers || 0)}
                            change={overview?.followerGrowth}
                            delay={60}
                        />
                        <StatCard
                            icon="eye"
                            label="Views"
                            value={formatCount(overview?.totalViews || 0)}
                            change={overview?.viewGrowth}
                            delay={120}
                        />
                        <StatCard
                            icon="heart"
                            label="Engagement"
                            value={`${(overview?.engagementRate || 0).toFixed(1)}%`}
                            delay={180}
                        />
                    </View>

                    {/* Audience Growth Chart */}
                    {audienceData.length > 0 && (
                        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.section}>
                            <Text style={styles.sectionTitle}>Follower Growth (30 days)</Text>
                            <View style={styles.chartCard}>
                                <MiniChart data={audienceData.map((d) => d.followers)} />
                            </View>
                        </Animated.View>
                    )}

                    {/* View Trends */}
                    {audienceData.length > 0 && (
                        <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.section}>
                            <Text style={styles.sectionTitle}>Views (30 days)</Text>
                            <View style={styles.chartCard}>
                                <MiniChart data={audienceData.map((d) => d.views)} />
                            </View>
                        </Animated.View>
                    )}

                    {/* Top Performing Content */}
                    {topPosts.length > 0 && (
                        <Animated.View entering={FadeInDown.duration(400).delay(500)} style={styles.section}>
                            <Text style={styles.sectionTitle}>Top Performing Content</Text>
                            {topPosts.map((post, i) => (
                                <TouchableOpacity
                                    key={post.id}
                                    style={styles.topPostCard}
                                    onPress={() => router.push(`/post/${post.id}`)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.topPostRank}>
                                        <Text style={styles.topPostRankText}>{i + 1}</Text>
                                    </View>
                                    <View style={styles.topPostInfo}>
                                        <Text style={styles.topPostContent} numberOfLines={2}>
                                            {post.content || 'Media post'}
                                        </Text>
                                        <View style={styles.topPostStats}>
                                            <View style={styles.topPostStat}>
                                                <Ionicons name="heart" size={12} color={colors.coral[400]} />
                                                <Text style={styles.topPostStatText}>{formatCount(post.likesCount)}</Text>
                                            </View>
                                            <View style={styles.topPostStat}>
                                                <Ionicons name="chatbubble" size={12} color={colors.azure[400]} />
                                                <Text style={styles.topPostStatText}>{formatCount(post.commentsCount)}</Text>
                                            </View>
                                            <View style={styles.topPostStat}>
                                                <Ionicons name="eye" size={12} color={colors.text.muted} />
                                                <Text style={styles.topPostStatText}>{formatCount(post.viewsCount)}</Text>
                                            </View>
                                        </View>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
                                </TouchableOpacity>
                            ))}
                        </Animated.View>
                    )}

                    {/* Transparency */}
                    <View style={styles.transparencyNote}>
                        <Ionicons name="analytics-outline" size={16} color={colors.emerald[500]} />
                        <Text style={styles.transparencyText}>
                            Your analytics are private and only visible to you. We never share your data with advertisers.
                        </Text>
                    </View>
                </ScrollView>
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

    // Stats grid
    statsGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
        paddingHorizontal: spacing.lg, paddingTop: spacing.lg,
    },
    statCard: {
        flex: 1, minWidth: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm) / 2 - 1,
        backgroundColor: colors.surface.glass, borderRadius: 16,
        padding: spacing.md, borderWidth: 1, borderColor: colors.border.subtle,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 28, fontWeight: '700', color: colors.text.primary,
        fontFamily: 'Inter-Bold', marginTop: spacing.sm,
    },
    statLabel: {
        fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 2,
    },
    changeBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 2,
        marginTop: spacing.xs, paddingHorizontal: spacing.sm,
        paddingVertical: 2, borderRadius: 6,
    },
    changePositive: { backgroundColor: colors.emerald[500] + '15' },
    changeNegative: { backgroundColor: colors.coral[500] + '15' },
    changeText: { fontSize: 11, fontWeight: '700' },

    // Sections
    section: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
    sectionTitle: {
        fontSize: typography.fontSize.base, fontWeight: '700',
        color: colors.text.primary, fontFamily: 'Inter-Bold',
        marginBottom: spacing.md,
    },
    chartCard: {
        backgroundColor: colors.surface.glass, borderRadius: 16,
        padding: spacing.md, borderWidth: 1, borderColor: colors.border.subtle,
    },
    chart: {
        flexDirection: 'row', alignItems: 'flex-end', gap: 2,
    },
    chartBar: {
        borderRadius: 2,
    },

    // Top posts
    topPostCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface.glass, borderRadius: 14,
        padding: spacing.md, marginBottom: spacing.xs,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    topPostRank: {
        width: 28, height: 28, borderRadius: 8,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center', justifyContent: 'center',
        marginRight: spacing.md,
    },
    topPostRankText: {
        fontSize: typography.fontSize.sm, fontWeight: '700', color: colors.gold[500],
    },
    topPostInfo: { flex: 1, marginRight: spacing.sm },
    topPostContent: {
        fontSize: typography.fontSize.sm, color: colors.text.primary,
        fontWeight: '500', lineHeight: 18,
    },
    topPostStats: {
        flexDirection: 'row', gap: spacing.md, marginTop: 4,
    },
    topPostStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    topPostStatText: { fontSize: 11, color: colors.text.muted, fontWeight: '600' },

    // Transparency
    transparencyNote: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        paddingHorizontal: spacing.lg, marginTop: spacing.xl, paddingVertical: spacing.md,
    },
    transparencyText: {
        flex: 1, fontSize: typography.fontSize.xs, color: colors.text.muted, lineHeight: 16,
    },
});
