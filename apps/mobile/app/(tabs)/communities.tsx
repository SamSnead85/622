import { useState, useRef, useEffect, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Animated,
    Easing,
    FlatList,
    Dimensions,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, Avatar, Button } from '@zerog/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mock communities data
const MY_COMMUNITIES = [
    {
        id: 'c1',
        name: 'Photography Enthusiasts',
        description: 'Share your best shots and learn from fellow photographers',
        avatarUrl: 'https://picsum.photos/200?random=100',
        coverUrl: 'https://picsum.photos/800/400?random=100',
        membersCount: 45200,
        postsCount: 12400,
        isPublic: true,
        role: 'member' as const,
    },
    {
        id: 'c2',
        name: 'Fitness Warriors',
        description: 'Daily motivation and workout tips',
        avatarUrl: 'https://picsum.photos/200?random=101',
        coverUrl: 'https://picsum.photos/800/400?random=101',
        membersCount: 128000,
        postsCount: 34500,
        isPublic: true,
        role: 'member' as const,
    },
    {
        id: 'c3',
        name: 'Tech Innovators',
        description: 'Discuss the latest in technology and innovation',
        avatarUrl: 'https://picsum.photos/200?random=102',
        coverUrl: 'https://picsum.photos/800/400?random=102',
        membersCount: 89000,
        postsCount: 23100,
        isPublic: true,
        role: 'admin' as const,
    },
];

const SUGGESTED_COMMUNITIES = [
    {
        id: 's1',
        name: 'Art & Design',
        avatarUrl: 'https://picsum.photos/200?random=200',
        membersCount: 67000,
        category: 'Creative',
    },
    {
        id: 's2',
        name: 'Food Lovers',
        avatarUrl: 'https://picsum.photos/200?random=201',
        membersCount: 234000,
        category: 'Lifestyle',
    },
    {
        id: 's3',
        name: 'Travel Adventures',
        avatarUrl: 'https://picsum.photos/200?random=202',
        membersCount: 456000,
        category: 'Travel',
    },
    {
        id: 's4',
        name: 'Music Production',
        avatarUrl: 'https://picsum.photos/200?random=203',
        membersCount: 89000,
        category: 'Music',
    },
];

const formatCount = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
};

// Premium community card
const CommunityCard = memo(({ community, index }: { community: typeof MY_COMMUNITIES[0]; index: number }) => {
    const router = useRouter();
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 80,
                friction: 8,
                delay: index * 100,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 400,
                delay: index * 100,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.communityCard,
                { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
            ]}
        >
            <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/community/${community.id}`);
                }}
            >
                {/* Cover image */}
                <View style={styles.cardCover}>
                    <Image source={{ uri: community.coverUrl }} style={styles.coverImage} />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.coverGradient}
                    />

                    {/* Role badge */}
                    {community.role === 'admin' && (
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleBadgeText}>Admin</Text>
                        </View>
                    )}
                </View>

                {/* Content */}
                <View style={styles.cardContent}>
                    {/* Avatar */}
                    <View style={styles.cardAvatarContainer}>
                        <LinearGradient
                            colors={[colors.gold[400], colors.gold[600]]}
                            style={styles.cardAvatarBorder}
                        >
                            <View style={styles.cardAvatarInner}>
                                <Image source={{ uri: community.avatarUrl }} style={styles.cardAvatar} />
                            </View>
                        </LinearGradient>
                    </View>

                    <Text style={styles.cardName} numberOfLines={1}>{community.name}</Text>
                    <Text style={styles.cardDescription} numberOfLines={2}>{community.description}</Text>

                    {/* Stats */}
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
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

// Suggested community chip
const SuggestedChip = memo(({ community }: { community: typeof SUGGESTED_COMMUNITIES[0] }) => {
    const [joined, setJoined] = useState(false);

    return (
        <View style={styles.suggestedChip}>
            <Image source={{ uri: community.avatarUrl }} style={styles.suggestedAvatar} />
            <View style={styles.suggestedInfo}>
                <Text style={styles.suggestedName} numberOfLines={1}>{community.name}</Text>
                <Text style={styles.suggestedMeta}>{formatCount(community.membersCount)} members</Text>
            </View>
            <TouchableOpacity
                style={[styles.joinButton, joined && styles.joinedButton]}
                onPress={() => {
                    setJoined(!joined);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
            >
                <Text style={[styles.joinButtonText, joined && styles.joinedButtonText]}>
                    {joined ? '✓' : 'Join'}
                </Text>
            </TouchableOpacity>
        </View>
    );
});

export default function CommunitiesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<'my' | 'discover'>('my');

    // Floating action button animation
    const fabScale = useRef(new Animated.Value(1)).current;
    const fabRotate = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(fabScale, {
                    toValue: 1.05,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(fabScale, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const handleCreateCommunity = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Animated.sequence([
            Animated.timing(fabRotate, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(fabRotate, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
        // Navigate to create community
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
                <Text style={styles.headerSubtitle}>Connect with your tribes</Text>

                {/* Tab switcher */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'my' && styles.tabActive]}
                        onPress={() => {
                            setActiveTab('my');
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                    >
                        <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
                            My Communities
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'discover' && styles.tabActive]}
                        onPress={() => {
                            setActiveTab('discover');
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                    >
                        <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>
                            Discover
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 120 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === 'my' ? (
                    <>
                        {/* My communities */}
                        {MY_COMMUNITIES.map((community, index) => (
                            <CommunityCard key={community.id} community={community} index={index} />
                        ))}

                        {/* Suggestions */}
                        <View style={styles.suggestionsSection}>
                            <Text style={styles.sectionTitle}>Communities you might like</Text>
                            {SUGGESTED_COMMUNITIES.map((community) => (
                                <SuggestedChip key={community.id} community={community} />
                            ))}
                        </View>
                    </>
                ) : (
                    <>
                        {/* Categories */}
                        <View style={styles.categoriesSection}>
                            <Text style={styles.sectionTitle}>Browse by Category</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.categoriesScroll}
                            >
                                {['🎨 Creative', '💪 Fitness', '🎮 Gaming', '🍳 Food', '✈️ Travel', '📚 Education'].map((cat) => (
                                    <TouchableOpacity key={cat} style={styles.categoryChip}>
                                        <Text style={styles.categoryText}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Popular communities */}
                        <View style={styles.popularSection}>
                            <Text style={styles.sectionTitle}>Popular Communities</Text>
                            {[...SUGGESTED_COMMUNITIES, ...SUGGESTED_COMMUNITIES].map((community, idx) => (
                                <SuggestedChip key={`${community.id}-${idx}`} community={community} />
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Create FAB */}
            <Animated.View
                style={[
                    styles.fab,
                    {
                        bottom: insets.bottom + 100,
                        transform: [
                            { scale: fabScale },
                            {
                                rotate: fabRotate.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0deg', '90deg'],
                                })
                            },
                        ],
                    },
                ]}
            >
                <TouchableOpacity onPress={handleCreateCommunity} activeOpacity={0.9}>
                    <LinearGradient
                        colors={[colors.gold[400], colors.gold[600]]}
                        style={styles.fabGradient}
                    >
                        <Text style={styles.fabIcon}>+</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },
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
        fontFamily: typography.fontFamily.sans,
        letterSpacing: -1,
    },
    headerSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        fontFamily: typography.fontFamily.sans,
        marginTop: spacing.xs,
        marginBottom: spacing.lg,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: 10,
        alignItems: 'center',
    },
    tabActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    tabText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.muted,
        fontFamily: typography.fontFamily.sans,
    },
    tabTextActive: {
        color: colors.text.primary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
    },
    communityCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 20,
        marginBottom: spacing.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    cardCover: {
        height: 120,
        position: 'relative',
    },
    coverImage: {
        ...StyleSheet.absoluteFillObject,
        resizeMode: 'cover',
    },
    coverGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    roleBadge: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        backgroundColor: colors.gold[500],
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 8,
    },
    roleBadgeText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.obsidian[900],
        fontFamily: typography.fontFamily.sans,
    },
    cardContent: {
        padding: spacing.lg,
        alignItems: 'center',
        marginTop: -40,
    },
    cardAvatarContainer: {
        marginBottom: spacing.md,
    },
    cardAvatarBorder: {
        padding: 3,
        borderRadius: 32,
    },
    cardAvatarInner: {
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 3,
        borderColor: colors.obsidian[900],
    },
    cardAvatar: {
        width: 56,
        height: 56,
    },
    cardName: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    cardDescription: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        fontFamily: typography.fontFamily.sans,
        textAlign: 'center',
        marginTop: spacing.xs,
        lineHeight: 20,
    },
    cardStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    stat: {
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    statValue: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
    },
    statLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        fontFamily: typography.fontFamily.sans,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    suggestionsSection: {
        marginTop: spacing.xl,
    },
    sectionTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
        marginBottom: spacing.lg,
        letterSpacing: -0.3,
    },
    suggestedChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 14,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    suggestedAvatar: {
        width: 48,
        height: 48,
        borderRadius: 12,
    },
    suggestedInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    suggestedName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
    },
    suggestedMeta: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        fontFamily: typography.fontFamily.sans,
        marginTop: 2,
    },
    joinButton: {
        backgroundColor: colors.gold[500],
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 20,
    },
    joinedButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.text.muted,
    },
    joinButtonText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.obsidian[900],
        fontFamily: typography.fontFamily.sans,
    },
    joinedButtonText: {
        color: colors.text.secondary,
    },
    categoriesSection: {
        marginBottom: spacing.xl,
    },
    categoriesScroll: {
        gap: spacing.md,
    },
    categoryChip: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    categoryText: {
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
    },
    popularSection: {},
    fab: {
        position: 'absolute',
        right: spacing.xl,
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    fabGradient: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fabIcon: {
        fontSize: 32,
        fontWeight: '300',
        color: colors.obsidian[900],
    },
});
