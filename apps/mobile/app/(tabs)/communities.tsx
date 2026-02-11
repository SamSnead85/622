import { useState, useEffect, memo, useCallback, useRef, useMemo } from 'react';
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
    Modal,
    KeyboardAvoidingView,
    Switch,
    ScrollView,
    RefreshControl,
    Dimensions,
    Pressable,
    Share,
    Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeInDown,
    FadeIn,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withTiming,
    interpolate,
} from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { Avatar, GlassCard, LoadingView } from '../../components';
import { useCommunitiesStore, useAuthStore, Community } from '../../stores';
import { apiFetch, API } from '../../lib/api';
import { RetryView } from '../../components/RetryView';
import { showError } from '../../stores/toastStore';
import { IMAGE_PLACEHOLDER } from '../../lib/imagePlaceholder';
import { useDebounce } from '../../hooks/useDebounce';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// Types & Constants
// ============================================

type CategoryFilter = 'all' | 'faith' | 'family' | 'education' | 'tech' | 'business' | 'health' | 'culture';

const CATEGORY_FILTERS: { key: CategoryFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'all', label: 'All', icon: 'apps-outline' },
    { key: 'faith', label: 'Faith', icon: 'moon-outline' },
    { key: 'family', label: 'Family', icon: 'people-outline' },
    { key: 'education', label: 'Education', icon: 'school-outline' },
    { key: 'tech', label: 'Tech', icon: 'code-slash-outline' },
    { key: 'business', label: 'Business', icon: 'briefcase-outline' },
    { key: 'health', label: 'Health', icon: 'heart-outline' },
    { key: 'culture', label: 'Culture', icon: 'globe-outline' },
];

// ============================================
// Community Templates
// ============================================

type CommunityTemplate = {
    id: string;
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    description: string;
    channels: string[];
};

const COMMUNITY_TEMPLATES: CommunityTemplate[] = [
    {
        id: 'mosque',
        name: 'Mosque Community',
        icon: 'moon-outline',
        color: colors.gold[500],
        description: 'For masjids and Islamic centers',
        channels: ['Announcements', 'General', 'Youth', 'Events', 'Sisters'],
    },
    {
        id: 'family',
        name: 'Family Circle',
        icon: 'heart-outline',
        color: colors.coral[500],
        description: 'Stay connected with family',
        channels: ['Photos & Updates', 'Group Chat', 'Planning'],
    },
    {
        id: 'study',
        name: 'Study Circle',
        icon: 'book-outline',
        color: colors.azure[500],
        description: 'Learning and discussion groups',
        channels: ['Resources', 'Discussion', 'Schedule'],
    },
    {
        id: 'custom',
        name: 'Custom Community',
        icon: 'add-outline',
        color: colors.emerald[500],
        description: 'Start from scratch',
        channels: ['General'],
    },
];

// ============================================
// Featured Seed Groups
// ============================================

type FeaturedGroup = {
    id: string;
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    description: string;
    memberCount: number;
    tags: string[];
    gradient: [string, string];
    nextEvent?: { title: string; date: string };
    logoUrl?: string;
    isDemo?: boolean;
    websiteUrl?: string;
};

const FEATURED_GROUPS: FeaturedGroup[] = [
    {
        id: 'seed-miraj-collective',
        name: 'Miraj Collective',
        icon: 'diamond-outline',
        color: '#B8A44C',
        description: 'A premier coaching program for professional Muslim men uniting faith, leadership, and success. Coaching, community, and clarity.',
        memberCount: 0,
        tags: ['Coaching', 'Leadership', 'Faith'],
        gradient: ['#8A7A3A', '#B8A44C'],
        nextEvent: { title: 'Group Coaching Session', date: 'Weekly' },
        logoUrl: 'https://res.cloudinary.com/drsxgxzhb/image/upload/v1770826468/0g-communities/miraj-collective-logo.jpg',
        isDemo: true,
        websiteUrl: 'https://www.mirajcollective.com/',
    },
    {
        id: 'seed-muslim-entrepreneurs',
        name: 'Muslim Entrepreneurs',
        icon: 'rocket-outline',
        color: colors.gold[500],
        description: 'Connect with Muslim business owners, founders, and aspiring entrepreneurs. Share wins, get advice, find partners.',
        memberCount: 0,
        tags: ['Business', 'Networking', 'Startups'],
        gradient: [colors.gold[600], colors.gold[400]],
    },
    {
        id: 'seed-halal-investing',
        name: 'Halal Stock Investing',
        icon: 'trending-up-outline',
        color: colors.emerald[500],
        description: 'Halal stock picks, live trading discussions, Shariah-compliant portfolio strategies. Trade together, grow together.',
        memberCount: 0,
        tags: ['Stocks', 'Halal Finance', 'Trading'],
        gradient: [colors.emerald[600], colors.emerald[400]],
        nextEvent: { title: 'Weekly Market Review', date: 'Every Friday' },
    },
    {
        id: 'seed-tampa-ai-builders',
        name: 'Tampa AI Builders',
        icon: 'hardware-chip-outline',
        color: colors.azure[500],
        description: 'Tampa Bay\'s AI & ML community. Monthly meetups, hackathons, demos, and knowledge sharing. Build the future together.',
        memberCount: 0,
        tags: ['AI', 'Machine Learning', 'Tampa'],
        gradient: [colors.azure[600], colors.azure[400]],
        nextEvent: { title: 'Monthly Meetup', date: 'First Saturday' },
    },
    {
        id: 'seed-tampa-muslim-ai',
        name: 'Tampa Muslim AI Builders',
        icon: 'code-slash-outline',
        color: colors.coral[500],
        description: 'Muslim technologists in Tampa Bay building with AI. Monthly meetups, hackathons with cash prizes, and speaker events.',
        memberCount: 0,
        tags: ['AI', 'Muslim Tech', 'Hackathons'],
        gradient: [colors.coral[500], colors.gold[500]],
        nextEvent: { title: 'Hackathon — $500 Prize', date: 'Coming Soon' },
    },
];

// ============================================
// Utilities
// ============================================

const formatCount = (num: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
};

// ============================================
// Skeleton Shimmer (for loading states)
// ============================================

function SkeletonShimmer({ width, height, borderRadius = 4, style }: {
    width: number | string;
    height: number;
    borderRadius?: number;
    style?: any;
}) {
    const shimmerAnim = useSharedValue(0);

    useEffect(() => {
        shimmerAnim.value = withRepeat(
            withTiming(1, { duration: 1200 }),
            -1,
            false
        );
    }, []);

    const animStyle = useAnimatedStyle(() => ({
        opacity: interpolate(shimmerAnim.value, [0, 0.5, 1], [0.3, 0.7, 0.3]),
    }));

    return (
        <Animated.View
            style={[
                {
                    width: width as any,
                    height,
                    borderRadius,
                    backgroundColor: colors.obsidian[700],
                },
                animStyle,
                style,
            ]}
        />
    );
}

// ============================================
// Your Communities — Horizontal Scroll Card
// ============================================

const YourCommunityChip = memo(({ community, index }: { community: Community; index: number }) => {
    const router = useRouter();
    const scale = useSharedValue(1);
    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View
            entering={FadeIn.duration(300).delay(index * 60)}
            style={animStyle}
        >
            <Pressable
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    scale.value = withSpring(0.93, { damping: 15 });
                    setTimeout(() => { scale.value = withSpring(1); }, 100);
                    router.push(`/community/${community.id}`);
                }}
                style={styles.yourCommunityChip}
                accessibilityRole="button"
                accessibilityLabel={`${community.name}, ${formatCount(community.membersCount)} members`}
            >
                {community.coverUrl ? (
                    <Image
                        source={{ uri: community.coverUrl }}
                        style={styles.yourChipCover}
                        contentFit="cover"
                        placeholder={IMAGE_PLACEHOLDER.blurhash}
                        transition={IMAGE_PLACEHOLDER.transition}
                        cachePolicy="memory-disk"
                    />
                ) : (
                    <LinearGradient
                        colors={[colors.obsidian[600], colors.obsidian[700]]}
                        style={styles.yourChipCover}
                    />
                )}
                <LinearGradient
                    colors={['transparent', colors.surface.overlayHeavy]}
                    style={styles.yourChipOverlay}
                />
                <View style={styles.yourChipContent}>
                    <Avatar
                        uri={community.avatarUrl}
                        name={community.name}
                        size="sm"
                        borderColor={colors.gold[500]}
                        borderWidth={2}
                    />
                    <Text style={styles.yourChipName} numberOfLines={1}>
                        {community.name}
                    </Text>
                    <View style={styles.yourChipMeta}>
                        <Ionicons name="people" size={10} color={colors.text.muted} />
                        <Text style={styles.yourChipCount}>
                            {formatCount(community.membersCount)}
                        </Text>
                    </View>
                </View>
                {community.role === 'admin' && (
                    <View style={styles.yourChipBadge}>
                        <Ionicons name="shield-checkmark" size={10} color={colors.gold[500]} />
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
});

// ============================================
// Discovery Community Card — Full Featured
// ============================================

const DiscoveryCommunityCard = memo(({ community, index, onJoin }: {
    community: Community;
    index: number;
    onJoin: (id: string) => void;
}) => {
    const router = useRouter();
    const [isJoining, setIsJoining] = useState(false);

    const handleJoin = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsJoining(true);
        try {
            await onJoin(community.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            showError('Failed to join community');
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <Animated.View entering={FadeInDown.duration(350).delay(80 + index * 70)}>
            <TouchableOpacity
                style={styles.discoveryCard}
                activeOpacity={0.92}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/community/${community.id}`);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${community.name}, ${formatCount(community.membersCount)} members`}
                accessibilityHint="Double tap to open community"
            >
                {/* Cover Image */}
                <View style={styles.discoveryCover}>
                    {community.coverUrl ? (
                        <Image
                            source={{ uri: community.coverUrl }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                            placeholder={IMAGE_PLACEHOLDER.blurhash}
                            transition={IMAGE_PLACEHOLDER.transition}
                            cachePolicy="memory-disk"
                        />
                    ) : (
                        <LinearGradient
                            colors={[colors.obsidian[600], colors.obsidian[700]]}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                    )}
                    <LinearGradient
                        colors={['transparent', colors.surface.overlayHeavy]}
                        style={StyleSheet.absoluteFill}
                    />
                    {/* Privacy badge */}
                    <View style={styles.privacyBadge}>
                        <Ionicons
                            name={community.isPublic ? 'globe-outline' : 'lock-closed'}
                            size={10}
                            color={colors.text.secondary}
                        />
                        <Text style={styles.privacyBadgeText}>
                            {community.isPublic ? 'Public' : 'Private'}
                        </Text>
                    </View>
                </View>

                {/* Card Body */}
                <View style={styles.discoveryBody}>
                    {/* Avatar overlapping cover */}
                    <View style={styles.discoveryAvatarRow}>
                        <View style={styles.discoveryAvatarWrap}>
                            <Avatar
                                uri={community.avatarUrl}
                                name={community.name}
                                customSize={52}
                                borderColor={colors.obsidian[900]}
                                borderWidth={3}
                            />
                        </View>

                        {/* Join button or role badge */}
                        {community.role ? (
                            <View style={styles.memberBadge}>
                                <Ionicons
                                    name={community.role === 'admin' ? 'shield-checkmark' : community.role === 'moderator' ? 'shield-half' : 'checkmark-circle'}
                                    size={14}
                                    color={colors.gold[500]}
                                />
                                <Text style={styles.memberBadgeText}>
                                    {community.role.charAt(0).toUpperCase() + community.role.slice(1)}
                                </Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.joinBtn}
                                onPress={handleJoin}
                                disabled={isJoining}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                                accessibilityLabel={`Join ${community.name}`}
                            >
                                <LinearGradient
                                    colors={[colors.gold[400], colors.gold[600]]}
                                    style={styles.joinBtnGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    {isJoining ? (
                                        <ActivityIndicator size="small" color={colors.obsidian[900]} />
                                    ) : (
                                        <>
                                            <Ionicons name="add" size={16} color={colors.obsidian[900]} />
                                            <Text style={styles.joinBtnText}>Join</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Name & Description */}
                    <Text style={styles.discoveryName} numberOfLines={1}>
                        {community.name}
                    </Text>
                    {community.description ? (
                        <Text style={styles.discoveryDescription} numberOfLines={2}>
                            {community.description}
                        </Text>
                    ) : null}

                    {/* Stats Row */}
                    <View style={styles.discoveryStats}>
                        <View style={styles.discoveryStat}>
                            <Ionicons name="people" size={14} color={colors.gold[500]} />
                            <Text style={styles.discoveryStatValue}>
                                {formatCount(community.membersCount)}
                            </Text>
                            <Text style={styles.discoveryStatLabel}>members</Text>
                        </View>
                        <View style={styles.discoveryStatDot} />
                        <View style={styles.discoveryStat}>
                            <Ionicons name="chatbubbles-outline" size={14} color={colors.text.muted} />
                            <Text style={styles.discoveryStatValue}>
                                {formatCount(community.postsCount)}
                            </Text>
                            <Text style={styles.discoveryStatLabel}>posts</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

// ============================================
// Category Filter Pills
// ============================================

function CategoryPills({
    active,
    onSelect,
}: {
    active: CategoryFilter;
    onSelect: (cat: CategoryFilter) => void;
}) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsScroll}
            style={styles.pillsContainer}
        >
            {CATEGORY_FILTERS.map((cat) => {
                const isActive = active === cat.key;
                return (
                    <TouchableOpacity
                        key={cat.key}
                        style={[styles.pill, isActive && styles.pillActive]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onSelect(cat.key);
                        }}
                        activeOpacity={0.7}
                        accessibilityRole="tab"
                        accessibilityLabel={cat.label}
                        accessibilityState={{ selected: isActive }}
                    >
                        <Ionicons
                            name={cat.icon}
                            size={14}
                            color={isActive ? colors.gold[500] : colors.text.muted}
                            style={styles.pillIconMargin}
                        />
                        <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                            {cat.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}

// ============================================
// Empty State Components
// ============================================

function EmptyYourCommunities({ onCreatePress }: { onCreatePress: () => void }) {
    return (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.emptyYours}>
            <View style={styles.emptyYoursIcon}>
                <Ionicons name="heart-outline" size={24} color={colors.gold[500]} />
            </View>
            <View style={styles.emptyYoursText}>
                <Text style={styles.emptyYoursTitle}>No communities yet</Text>
                <Text style={styles.emptyYoursSubtitle}>
                    Join or create one to get started
                </Text>
            </View>
            <TouchableOpacity
                style={styles.emptyYoursBtn}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onCreatePress();
                }}
                accessibilityRole="button"
                accessibilityLabel="Create community"
            >
                <Ionicons name="add" size={18} color={colors.gold[500]} />
            </TouchableOpacity>
        </Animated.View>
    );
}

function EmptyDiscovery() {
    return (
        <Animated.View entering={FadeInDown.duration(350).delay(100)} style={styles.emptyDiscovery}>
            <View style={styles.emptyDiscoveryIconWrap}>
                <LinearGradient
                    colors={[colors.surface.goldSubtle, colors.surface.goldMedium]}
                    style={StyleSheet.absoluteFill}
                />
                <Ionicons name="compass-outline" size={36} color={colors.gold[500]} />
            </View>
            <Text style={styles.emptyDiscoveryTitle}>Nothing here yet</Text>
            <Text style={styles.emptyDiscoverySubtitle}>
                New communities are being created every day.{'\n'}Check back soon or create your own!
            </Text>
        </Animated.View>
    );
}

// ============================================
// Featured Group Card (Seed Groups)
// ============================================

const FeaturedGroupCard = memo(({ group, index, onJoin, onShare }: {
    group: FeaturedGroup;
    index: number;
    onJoin: (group: FeaturedGroup) => void;
    onShare: (group: FeaturedGroup) => void;
}) => {
    const [isJoining, setIsJoining] = useState(false);

    const handleJoin = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsJoining(true);
        try {
            await onJoin(group);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            showError('Failed to join group');
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <Animated.View entering={FadeInDown.duration(350).delay(80 + index * 90)}>
            <View style={featuredStyles.card}>
                {/* Gradient Header */}
                <LinearGradient
                    colors={group.gradient}
                    style={featuredStyles.header}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={featuredStyles.headerContent}>
                        {group.logoUrl ? (
                            <Image
                                source={{ uri: group.logoUrl }}
                                style={featuredStyles.logoImage}
                                contentFit="contain"
                                cachePolicy="memory-disk"
                            />
                        ) : (
                            <View style={featuredStyles.iconCircle}>
                                <Ionicons name={group.icon} size={22} color={colors.obsidian[900]} />
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={featuredStyles.groupName}>{group.name}</Text>
                                {group.isDemo && (
                                    <View style={featuredStyles.demoBadge}>
                                        <Text style={featuredStyles.demoBadgeText}>DEMO</Text>
                                    </View>
                                )}
                            </View>
                            <View style={featuredStyles.tagsRow}>
                                {group.tags.map((tag) => (
                                    <View key={tag} style={featuredStyles.tag}>
                                        <Text style={featuredStyles.tagText}>{tag}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                </LinearGradient>

                {/* Body */}
                <View style={featuredStyles.body}>
                    <Text style={featuredStyles.description} numberOfLines={2}>
                        {group.description}
                    </Text>

                    {group.websiteUrl && (
                        <TouchableOpacity
                            onPress={() => Linking.openURL(group.websiteUrl!)}
                            style={featuredStyles.websiteLink}
                            accessibilityRole="link"
                        >
                            <Ionicons name="globe-outline" size={13} color={colors.azure[400]} />
                            <Text style={featuredStyles.websiteLinkText}>{group.websiteUrl.replace('https://', '').replace('www.', '').replace(/\/$/, '')}</Text>
                        </TouchableOpacity>
                    )}

                    {/* Next Event */}
                    {group.nextEvent && (
                        <View style={featuredStyles.eventRow}>
                            <Ionicons name="calendar-outline" size={14} color={colors.gold[500]} />
                            <Text style={featuredStyles.eventTitle}>{group.nextEvent.title}</Text>
                            <Text style={featuredStyles.eventDate}>{group.nextEvent.date}</Text>
                        </View>
                    )}

                    {/* Action Row */}
                    <View style={featuredStyles.actionRow}>
                        <TouchableOpacity
                            style={featuredStyles.joinBtn}
                            onPress={handleJoin}
                            disabled={isJoining}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel={`Join ${group.name}`}
                        >
                            <LinearGradient
                                colors={[colors.gold[400], colors.gold[600]]}
                                style={featuredStyles.joinGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                {isJoining ? (
                                    <ActivityIndicator size="small" color={colors.obsidian[900]} />
                                ) : (
                                    <>
                                        <Ionicons name="add" size={16} color={colors.obsidian[900]} />
                                        <Text style={featuredStyles.joinText}>Join Group</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={featuredStyles.shareBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onShare(group);
                            }}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={`Share ${group.name}`}
                        >
                            <Ionicons name="share-outline" size={18} color={colors.gold[500]} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
});

const featuredStyles = StyleSheet.create({
    sectionContainer: {
        marginBottom: spacing.lg,
    },
    card: {
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
    },
    header: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface.overlayLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupName: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.obsidian[900],
        fontFamily: 'Inter-Bold',
    },
    tagsRow: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 4,
        flexWrap: 'wrap',
    },
    tag: {
        backgroundColor: colors.surface.overlayLight,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    tagText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.obsidian[900],
    },
    body: {
        padding: spacing.md,
    },
    description: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        lineHeight: 20,
        marginBottom: spacing.sm,
    },
    eventRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.surface.goldSubtle,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: spacing.sm,
    },
    eventTitle: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.gold[500],
        flex: 1,
    },
    eventDate: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    joinBtn: {
        flex: 1,
        borderRadius: 10,
        overflow: 'hidden',
    },
    joinGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 4,
    },
    joinText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.obsidian[900],
    },
    shareBtn: {
        width: 42,
        height: 42,
        borderRadius: 10,
        backgroundColor: colors.surface.goldSubtle,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    logoImage: {
        width: 40,
        height: 40,
        borderRadius: 12,
        marginEnd: spacing.sm,
        backgroundColor: colors.obsidian[900],
    },
    demoBadge: {
        backgroundColor: colors.gold[500] + '25',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginStart: 6,
        alignSelf: 'center',
    },
    demoBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.gold[400],
        letterSpacing: 0.8,
    },
    websiteLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: spacing.xs,
    },
    websiteLinkText: {
        fontSize: typography.fontSize.xs,
        color: colors.azure[400],
        fontFamily: 'Inter-Medium',
    },
});

// ============================================
// Template Selection Modal
// ============================================

function TemplateSelectionModal({ visible, onClose, onSelect }: {
    visible: boolean;
    onClose: () => void;
    onSelect: (template: CommunityTemplate) => void;
}) {
    const insets = useSafeAreaInsets();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[templateStyles.container, { paddingTop: insets.top }]}>
                <LinearGradient
                    colors={[colors.obsidian[900], colors.obsidian[800]]}
                    style={StyleSheet.absoluteFill}
                />

                {/* Header */}
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancel">
                        <Text style={styles.modalCancel}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle} accessibilityRole="header">Choose Template</Text>
                    <View style={styles.modalHeaderSpacer} />
                </View>

                <ScrollView
                    contentContainerStyle={templateStyles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View entering={FadeInDown.duration(350).delay(50)}>
                        <Text style={templateStyles.subtitle}>
                            Pick a starting point for your community
                        </Text>
                    </Animated.View>

                    {COMMUNITY_TEMPLATES.map((template, index) => (
                        <Animated.View
                            key={template.id}
                            entering={FadeInDown.duration(350).delay(100 + index * 70)}
                        >
                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    onSelect(template);
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={`${template.name}: ${template.description}`}
                            >
                                <GlassCard style={templateStyles.card} padding="none">
                                    <View style={templateStyles.cardInner}>
                                        {/* Icon */}
                                        <View style={[templateStyles.iconWrap, { backgroundColor: template.color + '18' }]}>
                                            <Ionicons name={template.icon} size={28} color={template.color} />
                                        </View>

                                        {/* Text content */}
                                        <View style={templateStyles.cardText}>
                                            <Text style={templateStyles.cardTitle}>{template.name}</Text>
                                            <Text style={templateStyles.cardDescription}>{template.description}</Text>

                                            {/* Channel pills */}
                                            <View style={templateStyles.channelsRow}>
                                                {template.channels.map((ch) => (
                                                    <View key={ch} style={[templateStyles.channelPill, { borderColor: template.color + '30' }]}>
                                                        <Ionicons name="chatbubble-outline" size={10} color={template.color} />
                                                        <Text style={[templateStyles.channelText, { color: template.color }]}>{ch}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>

                                        {/* Chevron */}
                                        <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
                                    </View>
                                </GlassCard>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </ScrollView>
            </View>
        </Modal>
    );
}

// ============================================
// Create Community Modal
// ============================================

function CreateCommunityModal({ visible, onClose, onCreate, initialName = '' }: {
    visible: boolean;
    onClose: () => void;
    onCreate: () => void;
    initialName?: string;
}) {
    const [name, setName] = useState(initialName);
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const insets = useSafeAreaInsets();
    const { createCommunity } = useCommunitiesStore();

    // Sync initialName when modal opens with a new template
    useEffect(() => {
        if (visible) {
            setName(initialName);
        }
    }, [visible, initialName]);

    const handleCreate = async () => {
        if (!name.trim() || name.trim().length < 3) {
            Alert.alert('Name Required', 'Community name must be at least 3 characters.');
            return;
        }
        setIsCreating(true);
        try {
            await createCommunity(name.trim(), description.trim(), isPrivate);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setName('');
            setDescription('');
            setIsPrivate(true);
            onClose();
            onCreate();
        } catch {
            Alert.alert('Error', 'Failed to create community. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={[styles.modalContainer, { paddingTop: insets.top }]}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancel">
                        <Text style={styles.modalCancel}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle} accessibilityRole="header">New Community</Text>
                    <TouchableOpacity
                        onPress={handleCreate}
                        disabled={isCreating || !name.trim()}
                        accessibilityRole="button"
                        accessibilityLabel="Create community"
                        accessibilityState={{ disabled: isCreating || !name.trim() }}
                    >
                        {isCreating ? (
                            <ActivityIndicator size="small" color={colors.gold[500]} />
                        ) : (
                            <Text style={[styles.modalDone, (!name.trim()) && styles.modalDoneDisabled]}>Create</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                    <Text style={styles.inputLabel}>Name</Text>
                    <TextInput
                        style={styles.modalInput}
                        value={name}
                        onChangeText={setName}
                        placeholder="Community name"
                        placeholderTextColor={colors.text.muted}
                        maxLength={50}
                        autoFocus
                        accessibilityLabel="Community name"
                    />

                    <Text style={styles.inputLabel}>Description</Text>
                    <TextInput
                        style={[styles.modalInput, styles.modalTextArea]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="What is this community about?"
                        placeholderTextColor={colors.text.muted}
                        maxLength={500}
                        multiline
                        accessibilityLabel="Community description"
                    />

                    <View style={styles.switchRow}>
                        <View style={styles.flex1}>
                            <Text style={styles.switchLabel}>Private Community</Text>
                            <Text style={styles.switchDescription}>Only invited members can join and see content</Text>
                        </View>
                        <Switch
                            value={isPrivate}
                            onValueChange={setIsPrivate}
                            trackColor={{ false: colors.surface.glassHover, true: colors.gold[500] }}
                            thumbColor={colors.text.primary}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ============================================
// FAB — Floating Action Button
// ============================================

function CreateFAB({ onPress }: { onPress: () => void }) {
    const scale = useSharedValue(1);
    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View style={[styles.fabContainer, animStyle]}>
            <TouchableOpacity
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    scale.value = withSpring(0.88, { damping: 12 });
                    setTimeout(() => { scale.value = withSpring(1, { damping: 12 }); }, 120);
                    onPress();
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Create community"
                style={styles.fabTouchable}
            >
                <LinearGradient
                    colors={[colors.gold[400], colors.gold[600]]}
                    style={styles.fabGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Ionicons name="add" size={28} color={colors.obsidian[900]} />
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ============================================
// Main Screen
// ============================================

export default function CommunitiesScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const {
        communities,
        isLoading,
        error: commError,
        fetchCommunities,
        joinCommunity,
    } = useCommunitiesStore();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedQuery = useDebounce(searchQuery, 300);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<CommunityTemplate | null>(null);
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
    const [discoverCommunities, setDiscoverCommunities] = useState<Community[]>([]);
    const [isLoadingDiscover, setIsLoadingDiscover] = useState(false);
    const [joinedFeatured, setJoinedFeatured] = useState<Set<string>>(new Set());

    const searchInputRef = useRef<TextInput>(null);
    const searchBarScale = useSharedValue(1);

    // ============================================
    // Data Fetching
    // ============================================

    useEffect(() => {
        fetchCommunities();
        fetchDiscover();
    }, []);

    const fetchDiscover = async () => {
        setIsLoadingDiscover(true);
        try {
            const data = await apiFetch<any>(`${API.communities}?discover=true&limit=20`);
            const list = data.communities || data.data || data || [];
            setDiscoverCommunities(Array.isArray(list) ? list : []);
        } catch (error) {
            console.warn('Failed to fetch discover communities:', error);
        } finally {
            setIsLoadingDiscover(false);
        }
    };

    const handleRefresh = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsRefreshing(true);
        await Promise.all([fetchCommunities(), fetchDiscover()]);
        setIsRefreshing(false);
    };

    const handleTemplateSelect = useCallback((template: CommunityTemplate) => {
        setSelectedTemplate(template);
        setShowTemplateModal(false);
        // Small delay so the template modal dismiss animation finishes
        setTimeout(() => {
            setShowCreateModal(true);
        }, 300);
    }, []);

    const handleJoin = useCallback(async (communityId: string) => {
        await joinCommunity(communityId);
        // Move to "your communities" optimistically
        setDiscoverCommunities((prev) =>
            prev.map((c) => c.id === communityId ? { ...c, role: 'member' as const } : c)
        );
    }, [joinCommunity]);

    // ============================================
    // Featured Group Handlers
    // ============================================

    const handleJoinFeaturedGroup = useCallback(async (group: FeaturedGroup) => {
        try {
            // Create the community on the server and auto-join
            const data = await apiFetch<any>(API.communities, {
                method: 'POST',
                body: JSON.stringify({
                    name: group.name,
                    description: group.description,
                    isPublic: true,
                }),
            });
            const newCommunity = data.community || data;
            // Refresh communities list
            fetchCommunities();
            setJoinedFeatured((prev) => new Set(prev).add(group.id));
            // Navigate to the new community
            if (newCommunity?.id) {
                router.push(`/community/${newCommunity.id}` as any);
            }
        } catch (err: any) {
            // If community already exists, try to find and join it
            if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
                showError('This group already exists — check your communities!');
            } else {
                throw err;
            }
        }
    }, [fetchCommunities, router]);

    const handleShareFeaturedGroup = useCallback(async (group: FeaturedGroup) => {
        const inviteLink = `https://0gravity.ai/group/${group.id}`;
        const message = `🔗 Join ${group.name} on 0G!\n\n${group.description}\n\nTap to join: ${inviteLink}\n\nNo account needed — join in seconds!`;
        try {
            await Share.share({
                message,
                url: inviteLink,
            });
        } catch { /* user cancelled share sheet */ }
    }, []);

    // ============================================
    // Search with useDebounce hook (300ms)
    // ============================================

    const handleSearchChange = useCallback((text: string) => {
        setSearchQuery(text);
    }, []);

    const clearSearch = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSearchQuery('');
        searchInputRef.current?.blur();
    }, []);

    // ============================================
    // Search bar animation
    // ============================================

    const searchBarAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: searchBarScale.value }],
    }));

    const handleSearchFocus = useCallback(() => {
        searchBarScale.value = withSpring(1.02, { damping: 15, stiffness: 300 });
    }, []);

    const handleSearchBlur = useCallback(() => {
        searchBarScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }, []);

    // ============================================
    // Derived Data
    // ============================================

    // Communities the user has joined
    const yourCommunities = useMemo(() =>
        communities.filter((c) => c.role !== null),
    [communities]);

    // Discover communities (filter out already joined)
    const joinedIds = useMemo(() => new Set(yourCommunities.map((c) => c.id)), [yourCommunities]);

    const filteredDiscover = useMemo(() => {
        let pool = discoverCommunities.filter((c) => !joinedIds.has(c.id));
        // Also include communities from the main store that the user hasn't joined
        const discoverIds = new Set(pool.map((c) => c.id));
        communities.forEach((c) => {
            if (!c.role && !discoverIds.has(c.id)) {
                pool.push(c);
            }
        });

        // Apply search
        if (debouncedQuery.trim()) {
            const q = debouncedQuery.trim().toLowerCase();
            pool = pool.filter(
                (c) =>
                    c.name.toLowerCase().includes(q) ||
                    c.description?.toLowerCase().includes(q)
            );
        }

        // Apply category filter (basic keyword matching)
        if (activeCategory !== 'all') {
            const catKeywords: Record<CategoryFilter, string[]> = {
                all: [],
                faith: ['faith', 'islam', 'deen', 'prayer', 'quran', 'muslim', 'spiritual', 'mosque', 'ramadan'],
                family: ['family', 'parent', 'kids', 'children', 'marriage', 'sisters', 'brothers'],
                education: ['education', 'learn', 'study', 'school', 'university', 'course', 'book'],
                tech: ['tech', 'code', 'programming', 'developer', 'software', 'ai', 'data', 'engineering'],
                business: ['business', 'entrepreneur', 'startup', 'finance', 'invest', 'career', 'professional'],
                health: ['health', 'fitness', 'wellness', 'mental', 'nutrition', 'exercise', 'yoga'],
                culture: ['culture', 'art', 'food', 'travel', 'music', 'history', 'language', 'halal'],
            };
            const keywords = catKeywords[activeCategory];
            pool = pool.filter((c) => {
                const text = `${c.name} ${c.description || ''}`.toLowerCase();
                return keywords.some((kw) => text.includes(kw));
            });
        }

        return pool;
    }, [discoverCommunities, communities, joinedIds, debouncedQuery, activeCategory]);

    // Also filter "Your Communities" by search
    const filteredYourCommunities = useMemo(() => {
        if (!debouncedQuery.trim()) return yourCommunities;
        const q = debouncedQuery.trim().toLowerCase();
        return yourCommunities.filter((c) =>
            c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
        );
    }, [yourCommunities, debouncedQuery]);

    // ============================================
    // Render: Section Header
    // ============================================

    const renderSectionHeader = (title: string, icon: keyof typeof Ionicons.glyphMap, count?: number) => (
        <View style={styles.sectionHeader}>
            <Ionicons name={icon} size={18} color={colors.gold[500]} />
            <Text style={styles.sectionTitle}>{title}</Text>
            {count !== undefined && count > 0 && (
                <View style={styles.sectionCount}>
                    <Text style={styles.sectionCountText}>{count}</Text>
                </View>
            )}
        </View>
    );

    // ============================================
    // Render: List Header (search + yours + discover header)
    // ============================================

    const renderListHeader = () => (
        <View>
            {/* Your Communities Section */}
            <Animated.View entering={FadeInDown.duration(350).delay(50)}>
                {renderSectionHeader('Your Communities', 'heart', filteredYourCommunities.length)}
                {filteredYourCommunities.length > 0 ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.yourCommunitiesScroll}
                        style={styles.yourCommunitiesContainer}
                    >
                        {filteredYourCommunities.map((c, i) => (
                            <YourCommunityChip key={c.id} community={c} index={i} />
                        ))}
                    </ScrollView>
                ) : (
                    <EmptyYourCommunities onCreatePress={() => setShowTemplateModal(true)} />
                )}
            </Animated.View>

            {/* Featured Groups Section */}
            <Animated.View entering={FadeInDown.duration(350).delay(100)}>
                <View style={featuredStyles.sectionContainer}>
                    {renderSectionHeader('Featured Groups', 'star', FEATURED_GROUPS.length)}
                    <Text style={styles.featuredSubtitle}>
                        Join a group — invite friends via text or WhatsApp. No signup required.
                    </Text>
                    {FEATURED_GROUPS.filter((g) => !joinedFeatured.has(g.id)).map((group, index) => (
                        <FeaturedGroupCard
                            key={group.id}
                            group={group}
                            index={index}
                            onJoin={handleJoinFeaturedGroup}
                            onShare={handleShareFeaturedGroup}
                        />
                    ))}
                </View>
            </Animated.View>

            {/* Discover Section Header */}
            <Animated.View entering={FadeInDown.duration(350).delay(200)}>
                <View style={styles.discoverHeaderRow}>
                    {renderSectionHeader('Discover', 'compass', filteredDiscover.length)}
                </View>
            </Animated.View>
        </View>
    );

    // ============================================
    // Render: Discover Card
    // ============================================

    const renderDiscoverItem = useCallback(({ item, index }: { item: Community; index: number }) => (
        <DiscoveryCommunityCard
            community={item}
            index={index}
            onJoin={handleJoin}
        />
    ), [handleJoin]);

    // ============================================
    // Render: Empty Discover
    // ============================================

    const renderEmptyDiscover = () => {
        if (isLoading || isLoadingDiscover) {
            return (
                <View style={styles.skeletonDiscoverList}>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Animated.View key={i} entering={FadeInDown.duration(300).delay(i * 80)}>
                            <View style={styles.skeletonCard}>
                                <SkeletonShimmer width="100%" height={100} borderRadius={16} />
                                <View style={{ padding: spacing.md, gap: spacing.sm }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                                        <SkeletonShimmer width={48} height={48} borderRadius={24} />
                                        <View style={{ flex: 1, gap: 6 }}>
                                            <SkeletonShimmer width={140} height={14} borderRadius={7} />
                                            <SkeletonShimmer width={100} height={10} borderRadius={5} />
                                        </View>
                                        <SkeletonShimmer width={64} height={28} borderRadius={14} />
                                    </View>
                                </View>
                            </View>
                        </Animated.View>
                    ))}
                </View>
            );
        }
        if (commError && communities.length === 0) {
            return (
                <RetryView
                    message="Couldn't load communities. Tap to try again."
                    onRetry={() => { fetchCommunities(); fetchDiscover(); }}
                />
            );
        }
        // Show "No groups found" when search is active
        if (debouncedQuery.trim() && filteredYourCommunities.length === 0) {
            return (
                <Animated.View entering={FadeInDown.duration(300)} style={styles.noResultsContainer}>
                    <View style={styles.noResultsIconWrap}>
                        <Ionicons name="search-outline" size={32} color={colors.text.muted} />
                    </View>
                    <Text style={styles.noResultsTitle}>No groups found</Text>
                    <Text style={styles.noResultsSubtitle}>
                        Try a different search term or create a new community
                    </Text>
                </Animated.View>
            );
        }
        return <EmptyDiscovery />;
    };

    // ============================================
    // Main Render
    // ============================================

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <Animated.View entering={FadeInDown.duration(400)}>
                    <View style={styles.headerRow}>
                        <View style={styles.flex1}>
                            <Text style={styles.headerTitle} accessibilityRole="header">
                                Communities
                            </Text>
                            <Text style={styles.headerSubtitle}>
                                Your private groups and tribes
                            </Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Glass Search Bar */}
                <Animated.View
                    entering={FadeInDown.duration(400).delay(50)}
                    style={searchBarAnimStyle}
                >
                    <View style={styles.searchContainer}>
                        <LinearGradient
                            colors={[
                                colors.surface.glassHover,
                                colors.surface.glass,
                            ]}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                        <View style={styles.searchIconWrap}>
                            <Ionicons name="search" size={16} color={colors.gold[500]} />
                        </View>
                        <TextInput
                            ref={searchInputRef}
                            style={styles.searchInput}
                            placeholder="Search communities..."
                            placeholderTextColor={colors.text.muted}
                            value={searchQuery}
                            onChangeText={handleSearchChange}
                            onFocus={handleSearchFocus}
                            onBlur={handleSearchBlur}
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="search"
                            accessibilityLabel="Search communities"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                onPress={clearSearch}
                                style={styles.clearBtn}
                                hitSlop={8}
                            >
                                <Ionicons name="close-circle" size={18} color={colors.text.muted} />
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>

                {/* Category Filter Pills */}
                <Animated.View entering={FadeInDown.duration(400).delay(100)}>
                    <CategoryPills active={activeCategory} onSelect={setActiveCategory} />
                </Animated.View>
            </View>

            {/* Main Scrollable Content */}
            <FlatList
                data={filteredDiscover}
                renderItem={renderDiscoverItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderListHeader}
                ListEmptyComponent={renderEmptyDiscover}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: 100 },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.gold[500]}
                        colors={[colors.gold[500]]}
                    />
                }
                removeClippedSubviews
                maxToRenderPerBatch={6}
                windowSize={7}
                initialNumToRender={4}
            />

            {/* Floating Action Button */}
            <CreateFAB onPress={() => setShowTemplateModal(true)} />

            {/* Template Selection Modal */}
            <TemplateSelectionModal
                visible={showTemplateModal}
                onClose={() => setShowTemplateModal(false)}
                onSelect={handleTemplateSelect}
            />

            {/* Create Modal */}
            <CreateCommunityModal
                visible={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    setSelectedTemplate(null);
                }}
                onCreate={() => {
                    setSelectedTemplate(null);
                    fetchCommunities();
                    fetchDiscover();
                }}
                initialName={selectedTemplate?.name ?? ''}
            />
        </View>
    );
}

// ============================================
// Styles
// ============================================

const CARD_CHIP_WIDTH = 140;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },

    // Header
    header: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: -1,
        fontFamily: 'Inter-Bold',
    },
    headerSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        marginTop: spacing.xs,
    },

    // Glass Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: spacing.md,
        marginTop: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
        backgroundColor: colors.surface.glass,
    },
    searchIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: colors.gold[500] + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginEnd: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        paddingVertical: spacing.sm + 2,
        fontFamily: 'Inter-Medium',
    },
    clearBtn: {
        padding: 4,
    },

    // Category Pills
    pillsContainer: {
        marginTop: spacing.sm,
    },
    pillsScroll: {
        gap: spacing.xs,
        paddingEnd: spacing.md,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    pillActive: {
        backgroundColor: colors.surface.goldSubtle,
        borderColor: colors.gold[500] + '40',
    },
    pillText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        fontWeight: '500',
        fontFamily: 'Inter-Medium',
    },
    pillTextActive: {
        color: colors.gold[500],
        fontWeight: '600',
    },

    // List content
    listContent: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
    },

    // Section headers
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.md,
        marginTop: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
        flex: 1,
    },
    sectionCount: {
        backgroundColor: colors.surface.goldSubtle,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    sectionCountText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.gold[500],
    },

    // Your Communities — horizontal scroll
    yourCommunitiesContainer: {
        marginBottom: spacing.md,
    },
    yourCommunitiesScroll: {
        gap: spacing.sm,
        paddingEnd: spacing.xl,
    },
    yourCommunityChip: {
        width: CARD_CHIP_WIDTH,
        height: 160,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        position: 'relative',
    },
    yourChipCover: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 16,
    },
    yourChipOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    yourChipContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: spacing.md,
        alignItems: 'center',
        gap: spacing.xs,
    },
    yourChipName: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.text.primary,
        textAlign: 'center',
        fontFamily: 'Inter-Bold',
    },
    yourChipMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    yourChipCount: {
        fontSize: 10,
        color: colors.text.muted,
        fontWeight: '600',
    },
    yourChipBadge: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
    },

    // Featured subtitle
    featuredSubtitle: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginBottom: spacing.md,
        lineHeight: 18,
    },

    // Discover header
    discoverHeaderRow: {
        marginTop: spacing.sm,
    },

    // Discovery Card
    discoveryCard: {
        backgroundColor: colors.surface.glass,
        borderRadius: 20,
        marginBottom: spacing.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    discoveryCover: {
        height: 110,
        position: 'relative',
        overflow: 'hidden',
    },
    privacyBadge: {
        position: 'absolute',
        top: spacing.sm,
        left: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.surface.overlayMedium,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    privacyBadgeText: {
        fontSize: 10,
        color: colors.text.secondary,
        fontWeight: '600',
    },
    discoveryBody: {
        padding: spacing.lg,
    },
    discoveryAvatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: -42,
        marginBottom: spacing.md,
    },
    discoveryAvatarWrap: {
        shadowColor: colors.obsidian[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
    },
    memberBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.surface.goldSubtle,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
    },
    memberBadgeText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.gold[500],
    },
    joinBtn: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    },
    joinBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        gap: 4,
    },
    joinBtnText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.obsidian[900],
        fontFamily: 'Inter-Bold',
    },
    discoveryName: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: -0.5,
        fontFamily: 'Inter-Bold',
    },
    discoveryDescription: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        marginTop: spacing.xs,
        lineHeight: 20,
    },
    discoveryStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.lg,
        gap: spacing.md,
    },
    discoveryStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    discoveryStatValue: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.text.primary,
    },
    discoveryStatLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
    discoveryStatDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: colors.obsidian[400],
    },

    // Empty states
    emptyYours: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        gap: spacing.md,
    },
    emptyYoursIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyYoursText: {
        flex: 1,
    },
    emptyYoursTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
    emptyYoursSubtitle: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: 2,
    },
    emptyYoursBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
    },

    emptyDiscovery: {
        alignItems: 'center',
        paddingTop: 40,
        paddingHorizontal: spacing.xl,
    },
    emptyDiscoveryIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        marginBottom: spacing.lg,
    },
    emptyDiscoveryTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
        marginBottom: spacing.sm,
        fontFamily: 'Inter-Bold',
    },
    emptyDiscoverySubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
    },

    // No results
    noResultsContainer: {
        alignItems: 'center',
        paddingTop: 40,
        paddingHorizontal: spacing.xl,
    },
    noResultsIconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.surface.glass,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    noResultsTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    noResultsSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
        textAlign: 'center',
        lineHeight: 22,
    },

    // Skeleton cards
    skeletonDiscoverList: {
        gap: spacing.lg,
    },
    skeletonCard: {
        backgroundColor: colors.surface.glass,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },

    // FAB
    fabContainer: {
        position: 'absolute',
        bottom: 100,
        right: spacing.xl,
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    fabTouchable: {
        borderRadius: 30,
        overflow: 'hidden',
    },
    fabGradient: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Modal
    modalContainer: { flex: 1, backgroundColor: colors.obsidian[900] },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    modalCancel: { fontSize: typography.fontSize.base, color: colors.text.secondary },
    modalTitle: { fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.text.primary },
    modalDone: { fontSize: typography.fontSize.base, fontWeight: '700', color: colors.gold[500] },
    modalBody: { padding: spacing.xl },
    inputLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: spacing.xs,
        marginTop: spacing.lg,
    },
    modalInput: {
        backgroundColor: colors.surface.glass,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xl,
        backgroundColor: colors.surface.glass,
        borderRadius: 12,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    switchLabel: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary },
    switchDescription: { fontSize: typography.fontSize.sm, color: colors.text.muted, marginTop: 2 },

    // Extracted inline styles
    flex1: { flex: 1 },
    pillIconMargin: { marginEnd: 4 },
    modalHeaderSpacer: { width: 50 },
    modalDoneDisabled: { opacity: 0.4 },
    modalTextArea: { minHeight: 80, textAlignVertical: 'top' },
});

// ============================================
// Template Selection Modal Styles
// ============================================

const templateStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },
    scrollContent: {
        padding: spacing.xl,
        paddingBottom: 60,
        gap: spacing.md,
    },
    subtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
        lineHeight: 22,
    },
    card: {
        overflow: 'hidden',
    },
    cardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        gap: spacing.md,
    },
    iconWrap: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardText: {
        flex: 1,
        gap: spacing.xs,
    },
    cardTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
    },
    cardDescription: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        lineHeight: 18,
    },
    channelsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: spacing.xs,
    },
    channelPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
    },
    channelText: {
        fontSize: 10,
        fontWeight: '600',
    },
});
