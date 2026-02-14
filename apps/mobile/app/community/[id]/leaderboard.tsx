import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { useTheme } from '../../../contexts/ThemeContext';
import { ScreenHeader } from '../../../components';
import { apiFetch, API } from '../../../lib/api';
import { useAuthStore } from '../../../stores';
import { AVATAR_PLACEHOLDER } from '../../../lib/imagePlaceholder';

// ============================================
// Types
// ============================================

type Period = 'week' | 'month' | 'all';

interface LeaderboardUser {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
}

interface LeaderboardEntry {
    userId: string;
    points: number;
    level: number;
    role: string;
    user: LeaderboardUser;
}

interface LeaderboardResponse {
    leaderboard: LeaderboardEntry[];
    levelNames: string[];
}

// ============================================
// Constants
// ============================================

const PERIODS: { key: Period; label: string }[] = [
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'all', label: 'All Time' },
];

const MEDAL_COLORS = {
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',
} as const;

// ============================================
// Level Badge Component
// ============================================

function LevelBadge({ level, levelName, size = 'default' }: { level: number; levelName: string; size?: 'default' | 'small' }) {
    const isSmall = size === 'small';
    return (
        <View style={[styles.levelBadge, isSmall && styles.levelBadgeSmall]}>
            <Text style={[styles.levelBadgeText, isSmall && styles.levelBadgeTextSmall]}>
                Lv.{level} {levelName}
            </Text>
        </View>
    );
}

// ============================================
// Podium Member Component
// ============================================

function PodiumMember({
    entry,
    rank,
    levelName,
    isCenter,
}: {
    entry: LeaderboardEntry;
    rank: number;
    levelName: string;
    isCenter: boolean;
}) {
    const { colors: c } = useTheme();
    const ringColor = rank === 1 ? MEDAL_COLORS.gold : rank === 2 ? MEDAL_COLORS.silver : MEDAL_COLORS.bronze;
    const avatarSize = isCenter ? 80 : 64;
    const ringSize = avatarSize + 8;
    const crownSize = isCenter ? 28 : 0;

    return (
        <Animated.View
            entering={FadeInDown.duration(500).delay(rank === 1 ? 0 : rank === 2 ? 150 : 300)}
            style={[styles.podiumMember, isCenter && styles.podiumMemberCenter]}
        >
            {/* Crown for #1 */}
            {rank === 1 && (
                <View style={styles.crownContainer}>
                    <Ionicons name="trophy" size={crownSize} color={MEDAL_COLORS.gold} />
                </View>
            )}

            {/* Avatar with ring */}
            <View
                style={[
                    styles.avatarRing,
                    {
                        width: ringSize,
                        height: ringSize,
                        borderRadius: ringSize / 2,
                        borderColor: ringColor,
                        shadowColor: ringColor,
                        shadowOpacity: 0.5,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 0 },
                    },
                ]}
            >
                <Image
                    source={{ uri: entry.user?.avatarUrl }}
                    style={[
                        styles.podiumAvatar,
                        { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
                    ]}
                    placeholder={AVATAR_PLACEHOLDER.blurhash}
                    transition={AVATAR_PLACEHOLDER.transition}
                    cachePolicy="memory-disk"
                />
            </View>

            {/* Rank badge */}
            <View style={[styles.rankBadge, { backgroundColor: ringColor }]}>
                <Text style={[styles.rankBadgeText, { color: c.text.inverse }]}>{rank}</Text>
            </View>

            {/* Name */}
            <Text style={[styles.podiumName, isCenter && styles.podiumNameCenter]} numberOfLines={1}>
                {entry.user?.displayName || 'Unknown'}
            </Text>

            {/* Level badge */}
            <LevelBadge level={entry.level} levelName={levelName} size="small" />

            {/* Points */}
            <View style={styles.podiumPointsRow}>
                <Ionicons name="star" size={12} color={colors.gold[400]} />
                <Text style={styles.podiumPoints}>{entry.points.toLocaleString()}</Text>
            </View>
        </Animated.View>
    );
}

// ============================================
// Leaderboard Row Component
// ============================================

function LeaderboardRow({
    entry,
    rank,
    levelName,
    isCurrentUser,
    index,
}: {
    entry: LeaderboardEntry;
    rank: number;
    levelName: string;
    isCurrentUser: boolean;
    index: number;
}) {
    return (
        <Animated.View entering={FadeInDown.duration(300).delay(index * 50)}>
            <View
                style={[
                    styles.rowContainer,
                    isCurrentUser && styles.rowContainerHighlighted,
                ]}
            >
                {/* Rank */}
                <Text style={[styles.rowRank, isCurrentUser && styles.rowRankHighlighted]}>
                    {rank}
                </Text>

                {/* Avatar */}
                <Image
                    source={{ uri: entry.user?.avatarUrl }}
                    style={styles.rowAvatar}
                    placeholder={AVATAR_PLACEHOLDER.blurhash}
                    transition={AVATAR_PLACEHOLDER.transition}
                    cachePolicy="memory-disk"
                />

                {/* Name + Level */}
                <View style={styles.rowInfo}>
                    <Text style={styles.rowName} numberOfLines={1}>
                        {entry.user?.displayName || 'Unknown'}
                        {isCurrentUser && (
                            <Text style={styles.rowYouTag}> (You)</Text>
                        )}
                    </Text>
                    <LevelBadge level={entry.level} levelName={levelName} size="small" />
                </View>

                {/* Points */}
                <View style={styles.rowPointsContainer}>
                    <Ionicons name="star" size={14} color={colors.gold[400]} />
                    <Text style={styles.rowPoints}>{entry.points.toLocaleString()}</Text>
                </View>
            </View>
        </Animated.View>
    );
}

// ============================================
// Main Screen
// ============================================

export default function LeaderboardScreen() {
    const { id: communityId } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const { colors: c } = useTheme();
    const currentUser = useAuthStore((s) => s.user);

    const [period, setPeriod] = useState<Period>('week');
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [levelNames, setLevelNames] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const getLevelName = useCallback(
        (level: number): string => {
            if (levelNames.length === 0) return '';
            return levelNames[Math.min(level, levelNames.length - 1)] ?? '';
        },
        [levelNames],
    );

    const fetchLeaderboard = useCallback(async (selectedPeriod: Period, isRefresh = false) => {
        if (!communityId) return;
        if (!isRefresh) setLoading(true);
        try {
            const data = await apiFetch<LeaderboardResponse>(
                `${API.communities}/${communityId}/leaderboard?period=${selectedPeriod}`,
                { cache: false },
            );
            setLeaderboard(data.leaderboard ?? []);
            setLevelNames(data.levelNames ?? []);
        } catch {
            // Silently fail — keep existing data visible
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [communityId]);

    useEffect(() => {
        fetchLeaderboard(period);
    }, [period, fetchLeaderboard]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        fetchLeaderboard(period, true);
    }, [period, fetchLeaderboard]);

    const handlePeriodChange = useCallback((newPeriod: Period) => {
        if (newPeriod === period) return;
        setPeriod(newPeriod);
    }, [period]);

    // Split data: top 3 for podium, rest for list
    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    // Reorder top 3 for podium layout: [#2, #1, #3]
    const podiumOrder = top3.length >= 3
        ? [top3[1]!, top3[0]!, top3[2]!]
        : top3;
    const podiumRanks = top3.length >= 3 ? [2, 1, 3] : top3.map((_, i) => i + 1);

    // ============================================
    // Period Selector
    // ============================================

    const renderPeriodSelector = () => (
        <View style={styles.periodContainer}>
            {PERIODS.map(({ key, label }) => {
                const isActive = period === key;
                return (
                    <TouchableOpacity
                        key={key}
                        style={[styles.periodPill, isActive && styles.periodPillActive]}
                        onPress={() => handlePeriodChange(key)}
                        activeOpacity={0.7}
                    >
                        {isActive ? (
                            <LinearGradient
                                colors={[colors.gold[500], colors.gold[700]]}
                                style={styles.periodPillGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={[styles.periodPillTextActive, { color: c.text.inverse }]}>{label}</Text>
                            </LinearGradient>
                        ) : (
                            <Text style={styles.periodPillText}>{label}</Text>
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    // ============================================
    // Podium Section
    // ============================================

    const renderPodium = () => {
        if (top3.length === 0) return null;

        return (
            <View style={styles.podiumSection}>
                {/* Decorative glow behind podium */}
                <LinearGradient
                    colors={[colors.gold[500] + '14', 'transparent']}
                    style={styles.podiumGlow}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                />

                <View style={styles.podiumRow}>
                    {podiumOrder.map((entry, idx) => (
                        <PodiumMember
                            key={entry.userId}
                            entry={entry}
                            rank={podiumRanks[idx]!}
                            levelName={getLevelName(entry.level)}
                            isCenter={podiumRanks[idx] === 1}
                        />
                    ))}
                </View>

                {/* Podium base */}
                <View style={styles.podiumBase}>
                    <View style={[styles.podiumBlock, styles.podiumBlockSecond]}>
                        <Text style={styles.podiumBlockText}>2</Text>
                    </View>
                    <View style={[styles.podiumBlock, styles.podiumBlockFirst]}>
                        <Text style={styles.podiumBlockText}>1</Text>
                    </View>
                    <View style={[styles.podiumBlock, styles.podiumBlockThird]}>
                        <Text style={styles.podiumBlockText}>3</Text>
                    </View>
                </View>
            </View>
        );
    };

    // ============================================
    // List Header (Period + Podium combined)
    // ============================================

    const renderListHeader = () => (
        <View>
            {renderPeriodSelector()}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.gold[500]} />
                </View>
            ) : leaderboard.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="trophy-outline" size={56} color={c.text.muted} />
                    <Text style={[styles.emptyTitle, { color: c.text.primary }]}>No rankings yet</Text>
                    <Text style={[styles.emptyText, { color: c.text.muted }]}>
                        Be the first to earn points and climb the leaderboard!
                    </Text>
                </View>
            ) : (
                <>
                    {renderPodium()}

                    {/* Divider before list */}
                    {rest.length > 0 && (
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                        </View>
                    )}
                </>
            )}
        </View>
    );

    // ============================================
    // Row Renderer
    // ============================================

    const renderRow = useCallback(
        ({ item, index }: { item: LeaderboardEntry; index: number }) => (
            <LeaderboardRow
                entry={item}
                rank={index + 4}
                levelName={getLevelName(item.level)}
                isCurrentUser={item.userId === currentUser?.id}
                index={index}
            />
        ),
        [getLevelName, currentUser?.id],
    );

    const keyExtractor = useCallback((item: LeaderboardEntry) => item.userId, []);

    // ============================================
    // Render
    // ============================================

    return (
        <View style={[styles.container, { backgroundColor: c.obsidian[900] }]}>
            <LinearGradient
                colors={[c.obsidian[900], c.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            <ScreenHeader title="Leaderboard" noBorder />

            <FlatList
                data={rest}
                keyExtractor={keyExtractor}
                renderItem={renderRow}
                ListHeaderComponent={renderListHeader}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + 40 },
                ]}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews
                maxToRenderPerBatch={15}
                windowSize={7}
                initialNumToRender={15}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.gold[500]}
                    />
                }
            />
        </View>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    listContent: {
        paddingHorizontal: spacing.lg,
    },

    // ---- Period Selector ----
    periodContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
        justifyContent: 'center',
    },
    periodPill: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border.subtle,
        backgroundColor: colors.surface.glass,
    },
    periodPillActive: {
        borderColor: colors.gold[500],
    },
    periodPillGradient: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    periodPillText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    periodPillTextActive: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
    },

    // ---- Loading ----
    loadingContainer: {
        paddingTop: 80,
        alignItems: 'center',
    },

    // ---- Empty State ----
    emptyState: {
        alignItems: 'center',
        paddingTop: 80,
        paddingHorizontal: spacing['2xl'],
    },
    emptyTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        marginTop: spacing.lg,
    },
    emptyText: {
        fontSize: typography.fontSize.base,
        textAlign: 'center',
        marginTop: spacing.sm,
        lineHeight: 22,
    },

    // ---- Podium Section ----
    podiumSection: {
        alignItems: 'center',
        paddingTop: spacing.sm,
        paddingBottom: spacing.lg,
    },
    podiumGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 200,
    },
    podiumRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.md,
    },
    podiumMember: {
        alignItems: 'center',
        width: 100,
    },
    podiumMemberCenter: {
        marginBottom: 16,
    },
    crownContainer: {
        marginBottom: spacing.xs,
    },
    avatarRing: {
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
    },
    podiumAvatar: {
        backgroundColor: colors.obsidian[600],
    },
    rankBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -12,
        borderWidth: 2,
        borderColor: colors.obsidian[900],
    },
    rankBadgeText: {
        fontSize: 12,
        fontWeight: '800',
    },
    podiumName: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.primary,
        marginTop: spacing.sm,
        textAlign: 'center',
        maxWidth: 90,
    },
    podiumNameCenter: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
    },
    podiumPointsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: spacing.xs,
    },
    podiumPoints: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.gold[400],
    },

    // ---- Podium Base ----
    podiumBase: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        marginTop: spacing.lg,
        gap: 4,
    },
    podiumBlock: {
        width: 100,
        alignItems: 'center',
        justifyContent: 'flex-end',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        paddingBottom: spacing.sm,
    },
    podiumBlockFirst: {
        height: 60,
        backgroundColor: MEDAL_COLORS.gold + '26',
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: MEDAL_COLORS.gold + '40',
    },
    podiumBlockSecond: {
        height: 44,
        backgroundColor: MEDAL_COLORS.silver + '1A',
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: MEDAL_COLORS.silver + '33',
    },
    podiumBlockThird: {
        height: 32,
        backgroundColor: MEDAL_COLORS.bronze + '1A',
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: MEDAL_COLORS.bronze + '33',
    },
    podiumBlockText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '800',
        color: colors.text.muted,
    },

    // ---- Divider ----
    divider: {
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    dividerLine: {
        height: 1,
        width: '100%',
        backgroundColor: colors.border.subtle,
    },

    // ---- Level Badge ----
    levelBadge: {
        backgroundColor: colors.surface.goldSubtle,
        borderRadius: 10,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: colors.gold[500] + '26',
        marginTop: spacing.xs,
    },
    levelBadgeSmall: {
        paddingHorizontal: 6,
        paddingVertical: 1,
    },
    levelBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.gold[400],
    },
    levelBadgeTextSmall: {
        fontSize: 10,
    },

    // ---- Leaderboard Row ----
    rowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    rowContainerHighlighted: {
        borderColor: colors.gold[500],
        backgroundColor: colors.surface.goldFaded,
    },
    rowRank: {
        width: 32,
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.text.muted,
        textAlign: 'center',
    },
    rowRankHighlighted: {
        color: colors.gold[400],
    },
    rowAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.obsidian[600],
        marginLeft: spacing.sm,
    },
    rowInfo: {
        flex: 1,
        marginLeft: spacing.md,
        gap: 2,
    },
    rowName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
    rowYouTag: {
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
        color: colors.gold[400],
    },
    rowPointsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginLeft: spacing.sm,
    },
    rowPoints: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.gold[400],
    },
});
