import { useState, useEffect, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';
import { useCommunitiesStore, Community } from '../../stores';

const formatCount = (num: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
};

const CommunityCard = memo(({ community }: { community: Community }) => {
    const router = useRouter();

    return (
        <TouchableOpacity
            style={styles.communityCard}
            activeOpacity={0.95}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
        >
            {/* Cover image */}
            {community.coverUrl && (
                <View style={styles.cardCover}>
                    <Image source={{ uri: community.coverUrl }} style={styles.coverImage} />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.coverGradient}
                    />
                </View>
            )}

            {/* Content */}
            <View style={styles.cardContent}>
                {community.avatarUrl && (
                    <Image source={{ uri: community.avatarUrl }} style={styles.cardAvatar} />
                )}

                <Text style={styles.cardName} numberOfLines={1}>{community.name}</Text>
                <Text style={styles.cardDescription} numberOfLines={2}>{community.description}</Text>

                <View style={styles.cardStats}>
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>{formatCount(community.membersCount)}</Text>
                        <Text style={styles.statLabel}>members</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>{formatCount(community.postsCount)}</Text>
                        <Text style={styles.statLabel}>posts</Text>
                    </View>
                </View>

                {community.role && (
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>
                            {community.role.charAt(0).toUpperCase() + community.role.slice(1)}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
});

export default function CommunitiesScreen() {
    const insets = useSafeAreaInsets();
    const { communities, isLoading, fetchCommunities } = useCommunitiesStore();
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        fetchCommunities();
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchCommunities();
        setIsRefreshing(false);
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <Text style={styles.headerTitle}>Communities</Text>
                <Text style={styles.headerSubtitle}>Your private groups and tribes</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 120 },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.gold[500]}
                    />
                }
            >
                {isLoading && communities.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.gold[500]} />
                        <Text style={styles.loadingText}>Loading communities...</Text>
                    </View>
                ) : communities.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>👥</Text>
                        <Text style={styles.emptyTitle}>No communities yet</Text>
                        <Text style={styles.emptyText}>
                            Create a private group or join an existing community to get started
                        </Text>
                        <TouchableOpacity style={styles.createBtn}>
                            <LinearGradient
                                colors={[colors.gold[400], colors.gold[600]]}
                                style={styles.createBtnGradient}
                            >
                                <Text style={styles.createBtnText}>Create Community</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {communities.map((community) => (
                            <CommunityCard key={community.id} community={community} />
                        ))}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    header: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: -1,
    },
    headerSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        marginTop: spacing.xs,
    },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },

    // Loading
    loadingContainer: { alignItems: 'center', paddingTop: 80 },
    loadingText: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
        marginTop: spacing.lg,
    },

    // Empty
    emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: spacing.xl },
    emptyIcon: { fontSize: 56, marginBottom: spacing.lg },
    emptyTitle: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing['2xl'],
    },
    createBtn: { borderRadius: 16, overflow: 'hidden' },
    createBtnGradient: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
    },
    createBtnText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.obsidian[900],
    },

    // Community card
    communityCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 20,
        marginBottom: spacing.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    cardCover: { height: 120, position: 'relative' },
    coverImage: { ...StyleSheet.absoluteFillObject, resizeMode: 'cover' as any },
    coverGradient: { ...StyleSheet.absoluteFillObject },
    cardContent: {
        padding: spacing.lg,
        alignItems: 'center',
    },
    cardAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginTop: -40,
        borderWidth: 3,
        borderColor: colors.obsidian[900],
        marginBottom: spacing.md,
    },
    cardName: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    cardDescription: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        marginTop: spacing.xs,
        lineHeight: 20,
    },
    cardStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    stat: { alignItems: 'center', paddingHorizontal: spacing.xl },
    statValue: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
    },
    statLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    roleBadge: {
        marginTop: spacing.md,
        backgroundColor: 'rgba(212, 175, 55, 0.15)',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 8,
    },
    roleBadgeText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.gold[500],
    },
});
