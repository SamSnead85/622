import { useState, useEffect, memo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
    Alert,
    TextInput,
    Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
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
        <Animated.View entering={FadeInDown.duration(300)}>
            <TouchableOpacity
                style={styles.communityCard}
                activeOpacity={0.95}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/community/${community.id}`);
                }}
            >
                {community.coverUrl && (
                    <View style={styles.cardCover}>
                        <Image source={{ uri: community.coverUrl }} style={styles.coverImage} transition={200} cachePolicy="memory-disk" contentFit="cover" />
                        <LinearGradient colors={['transparent', colors.surface.overlayHeavy]} style={styles.coverGradient} />
                    </View>
                )}
                <View style={styles.cardContent}>
                    {community.avatarUrl && (
                        <Image source={{ uri: community.avatarUrl }} style={styles.cardAvatar} transition={150} cachePolicy="memory-disk" />
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
                            <Ionicons name="shield-checkmark" size={12} color={colors.gold[500]} />
                            <Text style={styles.roleBadgeText}>
                                {community.role.charAt(0).toUpperCase() + community.role.slice(1)}
                            </Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

export default function CommunitiesScreen() {
    const insets = useSafeAreaInsets();
    const { communities, isLoading, fetchCommunities } = useCommunitiesStore();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchCommunities();
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchCommunities();
        setIsRefreshing(false);
    };

    const filteredCommunities = searchQuery.trim()
        ? communities.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : communities;

    const renderCommunity = useCallback(({ item }: { item: Community }) => (
        <CommunityCard community={item} />
    ), []);

    const renderEmpty = () => {
        if (isLoading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.gold[500]} />
                    <Text style={styles.loadingText}>Loading communities...</Text>
                </View>
            );
        }
        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                    <Ionicons name="people-outline" size={56} color={colors.text.muted} />
                </View>
                <Text style={styles.emptyTitle}>No communities yet</Text>
                <Text style={styles.emptyText}>
                    Create a private group or join an existing community to get started
                </Text>
                <TouchableOpacity
                    style={styles.createBtn}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        Alert.alert('Create Community', 'Community creation is coming soon! For now, you can create communities from the web app.', [{ text: 'OK' }]);
                    }}
                >
                    <LinearGradient colors={[colors.gold[400], colors.gold[600]]} style={styles.createBtnGradient}>
                        <Ionicons name="add" size={20} color={colors.obsidian[900]} />
                        <Text style={styles.createBtnText}>Create Community</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <Text style={styles.headerTitle}>Communities</Text>
                <Text style={styles.headerSubtitle}>Your private groups and tribes</Text>

                {/* Search bar */}
                {communities.length > 0 && (
                    <View style={styles.searchContainer}>
                        <Ionicons name="search-outline" size={16} color={colors.text.muted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search communities..."
                            placeholderTextColor={colors.text.muted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                        />
                    </View>
                )}
            </View>

            <FlatList
                data={filteredCommunities}
                renderItem={renderCommunity}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
                showsVerticalScrollIndicator={false}
                onRefresh={handleRefresh}
                refreshing={isRefreshing}
                ListEmptyComponent={renderEmpty}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    header: {
        paddingHorizontal: spacing.xl, paddingBottom: spacing.lg,
        borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
    },
    headerTitle: { fontSize: 34, fontWeight: '700', color: colors.text.primary, letterSpacing: -1, fontFamily: 'Inter-Bold' },
    headerSubtitle: { fontSize: typography.fontSize.base, color: colors.text.secondary, marginTop: spacing.xs },
    searchContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface.glassHover, borderRadius: 12,
        paddingHorizontal: spacing.md, marginTop: spacing.md,
        borderWidth: 1, borderColor: colors.border.subtle, gap: spacing.sm,
    },
    searchInput: { flex: 1, fontSize: typography.fontSize.sm, color: colors.text.primary, paddingVertical: spacing.sm },
    listContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },

    // Loading
    loadingContainer: { alignItems: 'center', paddingTop: 80 },
    loadingText: { fontSize: typography.fontSize.base, color: colors.text.muted, marginTop: spacing.lg },

    // Empty
    emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: spacing.xl },
    emptyIconContainer: { marginBottom: spacing.lg },
    emptyTitle: { fontSize: typography.fontSize['2xl'], fontWeight: '700', color: colors.text.primary, marginBottom: spacing.sm },
    emptyText: { fontSize: typography.fontSize.base, color: colors.text.secondary, textAlign: 'center', lineHeight: 22, marginBottom: spacing['2xl'] },
    createBtn: { borderRadius: 16, overflow: 'hidden' },
    createBtnGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.sm },
    createBtnText: { fontSize: typography.fontSize.base, fontWeight: '700', color: colors.obsidian[900] },

    // Community card
    communityCard: {
        backgroundColor: colors.surface.glass, borderRadius: 20, marginBottom: spacing.lg,
        overflow: 'hidden', borderWidth: 1, borderColor: colors.border.subtle,
    },
    cardCover: { height: 120, position: 'relative' },
    coverImage: { ...StyleSheet.absoluteFillObject, resizeMode: 'cover' as any },
    coverGradient: { ...StyleSheet.absoluteFillObject },
    cardContent: { padding: spacing.lg, alignItems: 'center' },
    cardAvatar: {
        width: 56, height: 56, borderRadius: 28, marginTop: -40,
        borderWidth: 3, borderColor: colors.obsidian[900], marginBottom: spacing.md,
    },
    cardName: { fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text.primary, textAlign: 'center', letterSpacing: -0.5 },
    cardDescription: { fontSize: typography.fontSize.sm, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.xs, lineHeight: 20 },
    cardStats: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
    stat: { alignItems: 'center', paddingHorizontal: spacing.xl },
    statValue: { fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.text.primary },
    statLabel: { fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 2 },
    statDivider: { width: 1, height: 24, backgroundColor: colors.border.subtle },
    roleBadge: {
        marginTop: spacing.md, backgroundColor: colors.surface.goldMedium,
        paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8,
        flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    },
    roleBadgeText: { fontSize: typography.fontSize.xs, fontWeight: '700', color: colors.gold[500] },
});
