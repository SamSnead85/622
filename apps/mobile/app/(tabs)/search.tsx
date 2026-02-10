import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    FlatList,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
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
    withRepeat,
    withTiming,
    interpolate,
    withSpring,
} from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { useTranslation } from 'react-i18next';
import { Avatar, GlassCard } from '../../components';
import { apiFetch, API } from '../../lib/api';
import { useAuthStore } from '../../stores';
import { showError } from '../../stores/toastStore';
import { AVATAR_PLACEHOLDER } from '../../lib/imagePlaceholder';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// Types
// ============================================

interface SearchResult {
    id: string;
    type: 'user' | 'post' | 'community' | 'hashtag';
    title: string;
    subtitle?: string;
    avatarUrl?: string;
    description?: string;
    membersCount?: number;
    followersCount?: number;
    isVerified?: boolean;
}

type FilterTab = 'all' | 'people' | 'communities' | 'posts' | 'tools';

interface RecentSearch {
    id: string;
    query: string;
    timestamp: number;
}

interface TrendingTopic {
    id: string;
    name: string;
    postsCount: number;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
}

interface SuggestedItem {
    id: string;
    type: 'user' | 'community';
    name: string;
    subtitle: string;
    avatarUrl?: string;
    isVerified?: boolean;
}

// ============================================
// Constants
// ============================================

const FILTER_TABS: { key: FilterTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'all', label: 'All', icon: 'apps-outline' },
    { key: 'people', label: 'People', icon: 'people-outline' },
    { key: 'communities', label: 'Communities', icon: 'globe-outline' },
    { key: 'posts', label: 'Posts', icon: 'document-text-outline' },
    { key: 'tools', label: 'Tools', icon: 'compass-outline' },
];

const TRENDING_TOPICS: TrendingTopic[] = [
    { id: '1', name: 'Ramadan Prep', postsCount: 342, icon: 'moon-outline', color: colors.gold[500] },
    { id: '2', name: 'Community Builds', postsCount: 218, icon: 'people-outline', color: colors.azure[500] },
    { id: '3', name: 'Privacy Tips', postsCount: 189, icon: 'shield-checkmark-outline', color: colors.emerald[500] },
    { id: '4', name: 'Faith & Wellness', postsCount: 156, icon: 'heart-outline', color: colors.coral[500] },
    { id: '5', name: 'Book Club', postsCount: 134, icon: 'book-outline', color: colors.azure[300] },
    { id: '6', name: 'Tech Halal', postsCount: 98, icon: 'code-slash-outline', color: colors.azure[400] },
];

const SUGGESTED_ITEMS: SuggestedItem[] = [
    { id: 's1', type: 'community', name: 'Muslim Professionals', subtitle: '2.4K members', avatarUrl: undefined },
    { id: 's2', type: 'user', name: 'Amira Hassan', subtitle: '@amirahassan', avatarUrl: undefined, isVerified: true },
    { id: 's3', type: 'community', name: 'Sisters Circle', subtitle: '1.8K members', avatarUrl: undefined },
    { id: 's4', type: 'user', name: 'Omar Suleiman', subtitle: '@omarsuleiman', avatarUrl: undefined, isVerified: true },
    { id: 's5', type: 'community', name: 'Halal Foodies', subtitle: '3.1K members', avatarUrl: undefined },
    { id: 's6', type: 'user', name: 'Yasmin Mogahed', subtitle: '@yasminmogahed', avatarUrl: undefined, isVerified: true },
];

const DISCOVERY_CATEGORIES = [
    { id: 'trending', icon: 'trending-up' as const, label: 'Trending', color: colors.coral[500] },
    { id: 'people', icon: 'people' as const, label: 'People', color: colors.azure[500] },
    { id: 'communities', icon: 'globe-outline' as const, label: 'Communities', color: colors.emerald[500] },
    { id: 'new', icon: 'sparkles' as const, label: 'New Content', color: colors.gold[500] },
    { id: 'tools', icon: 'compass' as const, label: 'Tools', color: colors.gold[500], route: '/tools' },
    { id: 'privacy', icon: 'shield-checkmark' as const, label: 'Privacy First', color: colors.emerald[400], route: '/settings' },
];

// ============================================
// Skeleton Components
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

function SearchResultSkeleton() {
    return (
        <View style={styles.skeletonRow}>
            <SkeletonShimmer width={48} height={48} borderRadius={24} />
            <View style={styles.skeletonInfo}>
                <SkeletonShimmer width={140} height={14} borderRadius={7} />
                <SkeletonShimmer width={100} height={11} borderRadius={6} style={{ marginTop: 6 }} />
            </View>
            <SkeletonShimmer width={56} height={24} borderRadius={12} />
        </View>
    );
}

function SearchSkeletonList() {
    return (
        <Animated.View entering={FadeIn.duration(200)} style={styles.skeletonContainer}>
            {Array.from({ length: 6 }).map((_, i) => (
                <Animated.View key={i} entering={FadeInDown.duration(300).delay(i * 60)}>
                    <SearchResultSkeleton />
                </Animated.View>
            ))}
        </Animated.View>
    );
}

// ============================================
// Main Screen
// ============================================

export default function SearchScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const user = useAuthStore((s) => s.user);

    // Search state
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
    const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
    const [trendingData, setTrendingData] = useState<TrendingTopic[]>(TRENDING_TOPICS);
    const [suggestedData, setSuggestedData] = useState<SuggestedItem[]>(SUGGESTED_ITEMS);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<TextInput>(null);
    const flatListRef = useRef<FlatList>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    // Animation values
    const searchBarScale = useSharedValue(1);

    // Fetch trending + suggested data
    const loadDiscoveryData = useCallback(async () => {
        await Promise.all([
            apiFetch<any>(API.trending).then((data) => {
                if (data?.topics && Array.isArray(data.topics)) {
                    setTrendingData(data.topics.slice(0, 6).map((t: any, i: number) => ({
                        id: t.id || `t${i}`,
                        name: t.name || t.tag,
                        postsCount: t.postsCount || t.count || 0,
                        icon: TRENDING_TOPICS[i]?.icon || 'trending-up',
                        color: TRENDING_TOPICS[i]?.color || colors.gold[500],
                    })));
                }
            }).catch(() => { showError("Couldn't load trending topics"); }),

            apiFetch<any>(`${API.search}?q=&suggested=true&limit=6`).then((data) => {
                const items: SuggestedItem[] = [];
                if (data?.users) {
                    data.users.slice(0, 3).forEach((u: any) => {
                        items.push({
                            id: u.id,
                            type: 'user',
                            name: u.displayName || u.username,
                            subtitle: `@${u.username}`,
                            avatarUrl: u.avatarUrl,
                            isVerified: u.isVerified,
                        });
                    });
                }
                if (data?.communities) {
                    data.communities.slice(0, 3).forEach((c: any) => {
                        items.push({
                            id: c.id,
                            type: 'community',
                            name: c.name,
                            subtitle: `${c.membersCount || 0} members`,
                            avatarUrl: c.avatarUrl,
                        });
                    });
                }
                if (items.length > 0) setSuggestedData(items);
            }).catch(() => { showError("Couldn't load suggestions"); }),
        ]);
    }, []);

    // Fetch trending data on mount
    useEffect(() => {
        loadDiscoveryData();
    }, [loadDiscoveryData]);

    // Pull-to-refresh handler
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await loadDiscoveryData();
        setIsRefreshing(false);
    }, [loadDiscoveryData]);

    // Cleanup debounce
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    // ============================================
    // Search Logic — 300ms debounce
    // ============================================

    const doSearch = useCallback(async (text: string) => {
        if (text.trim().length < 2) {
            setResults([]);
            setHasSearched(false);
            return;
        }

        setIsSearching(true);
        setHasSearched(true);

        try {
            const data = await apiFetch<any>(`${API.search}?q=${encodeURIComponent(text.trim())}`);
            const formatted: SearchResult[] = [];

            if (data.users) {
                data.users.forEach((u: any) => {
                    formatted.push({
                        id: u.id,
                        type: 'user',
                        title: u.displayName || u.username,
                        subtitle: `@${u.username}`,
                        avatarUrl: u.avatarUrl,
                        description: u.bio,
                        followersCount: u.followersCount ?? u._count?.followers ?? 0,
                        isVerified: u.isVerified,
                    });
                });
            }
            if (data.communities) {
                data.communities.forEach((c: any) => {
                    formatted.push({
                        id: c.id,
                        type: 'community',
                        title: c.name,
                        subtitle: `${c.membersCount || 0} members`,
                        avatarUrl: c.avatarUrl,
                        description: c.description,
                        membersCount: c.membersCount || 0,
                    });
                });
            }
            if (data.posts) {
                data.posts.forEach((p: any) => {
                    formatted.push({
                        id: p.id,
                        type: 'post',
                        title: (p.caption || p.content || '').substring(0, 120) || 'Post',
                        subtitle: `by ${p.user?.displayName || p.author?.displayName || 'Unknown'}`,
                        avatarUrl: p.user?.avatarUrl || p.author?.avatarUrl,
                    });
                });
            }

            setResults(formatted);

            // Save to recent searches
            if (text.trim().length >= 2) {
                setRecentSearches((prev) => {
                    const filtered = prev.filter((r) => r.query.toLowerCase() !== text.trim().toLowerCase());
                    return [
                        { id: Date.now().toString(), query: text.trim(), timestamp: Date.now() },
                        ...filtered,
                    ].slice(0, 10);
                });
            }
        } catch {
            setResults([]);
            showError('Search failed, please try again');
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handleSearch = useCallback((text: string) => {
        setQuery(text);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (text.trim().length < 2) {
            setResults([]);
            setHasSearched(false);
            return;
        }
        debounceRef.current = setTimeout(() => doSearch(text), 300);
    }, [doSearch]);

    const handleRecentSearchTap = useCallback((searchQuery: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setQuery(searchQuery);
        doSearch(searchQuery);
    }, [doSearch]);

    const clearRecentSearches = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRecentSearches([]);
    }, []);

    const clearSearch = useCallback(() => {
        setQuery('');
        setResults([]);
        setHasSearched(false);
        setActiveFilter('all');
        inputRef.current?.focus();
    }, []);

    const handleFilterTap = useCallback((tab: FilterTab) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (tab === 'tools') {
            router.push('/tools' as any);
            return;
        }
        setActiveFilter(tab);
    }, [router]);

    // ============================================
    // Navigation Handlers
    // ============================================

    const getTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
        switch (type) {
            case 'user': return 'person-outline';
            case 'community': return 'people-outline';
            case 'post': return 'document-text-outline';
            case 'hashtag': return 'pricetag-outline';
            default: return 'search-outline';
        }
    };

    const getTypeColor = (type: string): string => {
        switch (type) {
            case 'user': return colors.azure[500];
            case 'community': return colors.emerald[500];
            case 'post': return colors.gold[500];
            case 'hashtag': return colors.coral[500];
            default: return colors.text.secondary;
        }
    };

    const handleResultPress = useCallback((item: SearchResult) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (item.type === 'user') {
            router.push(`/profile/${item.subtitle?.replace('@', '') || item.id}`);
        } else if (item.type === 'post') {
            router.push(`/post/${item.id}`);
        } else if (item.type === 'community') {
            router.push(`/community/${item.id}`);
        }
    }, [router]);

    const handleSuggestedPress = useCallback((item: SuggestedItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (item.type === 'user') {
            router.push(`/profile/${item.subtitle?.replace('@', '') || item.id}`);
        } else {
            router.push(`/community/${item.id}`);
        }
    }, [router]);

    const handleTrendingPress = useCallback((topic: TrendingTopic) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setQuery(topic.name);
        doSearch(topic.name);
    }, [doSearch]);

    const handleCategoryPress = useCallback((cat: typeof DISCOVERY_CATEGORIES[0]) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if ((cat as any).route) {
            router.push((cat as any).route as any);
            return;
        }
        const filterMap: Record<string, FilterTab> = {
            people: 'people',
            communities: 'communities',
            trending: 'all',
            new: 'all',
        };
        setActiveFilter(filterMap[cat.id] || 'all');
        handleSearch(cat.id === 'new' ? 'new' : cat.id === 'trending' ? 'trending' : cat.id);
    }, [router, handleSearch]);

    // ============================================
    // Filter results
    // ============================================

    const filteredResults = useMemo(() => {
        if (activeFilter === 'all') return results;
        return results.filter((r) => {
            if (activeFilter === 'people') return r.type === 'user';
            if (activeFilter === 'posts') return r.type === 'post';
            if (activeFilter === 'communities') return r.type === 'community';
            return true;
        });
    }, [results, activeFilter]);

    // ============================================
    // Search bar animation
    // ============================================

    const searchBarAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: searchBarScale.value }],
    }));

    const handleSearchBarFocus = useCallback(() => {
        searchBarScale.value = withSpring(1.02, { damping: 15, stiffness: 300 });
    }, []);

    const handleSearchBarBlur = useCallback(() => {
        searchBarScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }, []);

    // ============================================
    // Render: Search Result Row
    // ============================================

    const renderResult = useCallback(({ item, index }: { item: SearchResult; index: number }) => (
        <Animated.View entering={FadeInDown.duration(250).delay(index * 50)}>
            <Pressable
                style={({ pressed }) => [
                    styles.resultRow,
                    pressed && styles.resultRowPressed,
                ]}
                onPress={() => handleResultPress(item)}
            >
                {/* Avatar */}
                <View style={styles.resultAvatarWrap}>
                    {item.avatarUrl ? (
                        <Image
                            source={{ uri: item.avatarUrl }}
                            style={styles.resultAvatar}
                            placeholder={AVATAR_PLACEHOLDER.blurhash}
                            transition={AVATAR_PLACEHOLDER.transition}
                            cachePolicy="memory-disk"
                        />
                    ) : (
                        <View style={[styles.resultAvatar, styles.resultAvatarPlaceholder]}>
                            <Ionicons
                                name={getTypeIcon(item.type)}
                                size={20}
                                color={getTypeColor(item.type)}
                            />
                        </View>
                    )}
                    {item.isVerified && (
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={14} color={colors.gold[500]} />
                        </View>
                    )}
                </View>

                {/* Info */}
                <View style={styles.resultInfo}>
                    <Text style={styles.resultTitle} numberOfLines={1}>
                        {item.title}
                    </Text>
                    {item.subtitle && (
                        <Text style={styles.resultSubtitle} numberOfLines={1}>
                            {item.subtitle}
                        </Text>
                    )}
                    {item.description && (
                        <Text style={styles.resultDescription} numberOfLines={1}>
                            {item.description}
                        </Text>
                    )}
                </View>

                {/* Type badge */}
                <View style={[styles.resultTypeBadge, { backgroundColor: getTypeColor(item.type) + '15' }]}>
                    <Ionicons name={getTypeIcon(item.type)} size={12} color={getTypeColor(item.type)} />
                    <Text style={[styles.resultTypeText, { color: getTypeColor(item.type) }]}>
                        {item.type === 'user' ? 'Person' : item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Text>
                </View>
            </Pressable>
        </Animated.View>
    ), [handleResultPress]);

    // ============================================
    // Render: Recent Searches
    // ============================================

    const renderRecentSearches = () => {
        if (recentSearches.length === 0 || hasSearched) return null;

        return (
            <Animated.View entering={FadeInDown.duration(300).delay(50)} style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Searches</Text>
                    <TouchableOpacity onPress={clearRecentSearches} hitSlop={8}>
                        <Text style={styles.clearText}>Clear All</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.recentList}>
                    {recentSearches.slice(0, 5).map((search, i) => (
                        <Animated.View
                            key={search.id}
                            entering={FadeInDown.duration(200).delay(i * 40)}
                        >
                            <TouchableOpacity
                                style={styles.recentRow}
                                onPress={() => handleRecentSearchTap(search.query)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.recentIcon}>
                                    <Ionicons name="time-outline" size={16} color={colors.text.muted} />
                                </View>
                                <Text style={styles.recentText} numberOfLines={1}>
                                    {search.query}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setRecentSearches((prev) =>
                                            prev.filter((r) => r.id !== search.id)
                                        );
                                    }}
                                    hitSlop={8}
                                    style={styles.recentRemove}
                                >
                                    <Ionicons name="close" size={14} color={colors.text.muted} />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </View>
            </Animated.View>
        );
    };

    // ============================================
    // Render: Trending Topics
    // ============================================

    const renderTrending = () => (
        <Animated.View entering={FadeInDown.duration(350).delay(100)} style={styles.section}>
            <View style={styles.sectionHeader}>
                <Ionicons name="trending-up" size={18} color={colors.gold[500]} />
                <Text style={styles.sectionTitle}>Trending Now</Text>
            </View>
            <View style={styles.trendingGrid}>
                {trendingData.map((topic, i) => (
                    <Animated.View
                        key={topic.id}
                        entering={FadeInDown.duration(300).delay(150 + i * 60)}
                    >
                        <TouchableOpacity
                            style={styles.trendingCard}
                            onPress={() => handleTrendingPress(topic)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.trendingIcon, { backgroundColor: topic.color + '15' }]}>
                                <Ionicons name={topic.icon} size={18} color={topic.color} />
                            </View>
                            <View style={styles.trendingInfo}>
                                <Text style={styles.trendingName} numberOfLines={1}>
                                    {topic.name}
                                </Text>
                                <Text style={styles.trendingCount}>
                                    {topic.postsCount} posts
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                ))}
            </View>
        </Animated.View>
    );

    // ============================================
    // Render: Discover Grid
    // ============================================

    const renderDiscoverGrid = () => (
        <Animated.View entering={FadeInDown.duration(350).delay(200)} style={styles.section}>
            <Text style={styles.sectionTitle}>Explore</Text>
            <View style={styles.categoryGrid}>
                {DISCOVERY_CATEGORIES.map((cat, i) => (
                    <Animated.View
                        key={cat.id}
                        entering={FadeInDown.duration(300).delay(250 + i * 50)}
                    >
                        <TouchableOpacity
                            style={styles.categoryCard}
                            activeOpacity={0.8}
                            onPress={() => handleCategoryPress(cat)}
                        >
                            <View style={[styles.categoryIcon, { backgroundColor: `${cat.color}15` }]}>
                                <Ionicons name={cat.icon} size={22} color={cat.color} />
                            </View>
                            <Text style={styles.categoryLabel}>{cat.label}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                ))}
            </View>
        </Animated.View>
    );

    // ============================================
    // Render: Discover Section (Suggested)
    // ============================================

    const renderDiscover = () => (
        <Animated.View entering={FadeInDown.duration(350).delay(350)} style={styles.section}>
            <View style={styles.sectionHeader}>
                <Ionicons name="sparkles" size={18} color={colors.gold[500]} />
                <Text style={styles.sectionTitle}>Discover</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
                Suggested communities and people you might like
            </Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestedScroll}
            >
                {suggestedData.map((item, i) => (
                    <Animated.View
                        key={item.id}
                        entering={FadeInDown.duration(300).delay(400 + i * 60)}
                    >
                        <TouchableOpacity
                            style={styles.suggestedCard}
                            activeOpacity={0.8}
                            onPress={() => handleSuggestedPress(item)}
                        >
                            <View style={styles.suggestedAvatarWrap}>
                                <Avatar
                                    uri={item.avatarUrl}
                                    name={item.name}
                                    size="lg"
                                />
                                {item.isVerified && (
                                    <View style={styles.suggestedVerified}>
                                        <Ionicons name="checkmark-circle" size={16} color={colors.gold[500]} />
                                    </View>
                                )}
                            </View>
                            <Text style={styles.suggestedName} numberOfLines={1}>
                                {item.name}
                            </Text>
                            <Text style={styles.suggestedSub} numberOfLines={1}>
                                {item.subtitle}
                            </Text>
                            <View style={[
                                styles.suggestedBadge,
                                item.type === 'community'
                                    ? { backgroundColor: colors.emerald[500] + '15' }
                                    : { backgroundColor: colors.azure[500] + '15' },
                            ]}>
                                <Ionicons
                                    name={item.type === 'community' ? 'globe-outline' : 'person-outline'}
                                    size={10}
                                    color={item.type === 'community' ? colors.emerald[500] : colors.azure[500]}
                                />
                                <Text style={[
                                    styles.suggestedBadgeText,
                                    { color: item.type === 'community' ? colors.emerald[500] : colors.azure[500] },
                                ]}>
                                    {item.type === 'community' ? 'Community' : 'Person'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                ))}
            </ScrollView>
        </Animated.View>
    );

    // ============================================
    // Render: Empty search view (discovery)
    // ============================================

    const renderEmptyState = () => (
        <ScrollView
            ref={scrollViewRef}
            style={styles.discoveryScroll}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.gold[500]} />}
        >
            {renderRecentSearches()}
            {renderTrending()}
            {renderDiscoverGrid()}
            {renderDiscover()}
        </ScrollView>
    );

    // ============================================
    // Render: No results
    // ============================================

    const renderNoResults = () => (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.noResultsContainer}>
            <View style={styles.noResultsIconWrap}>
                <Ionicons name="search-outline" size={40} color={colors.text.muted} />
            </View>
            <Text style={styles.noResultsTitle}>No results found</Text>
            <Text style={styles.noResultsSubtitle}>
                Try a different search term or browse the categories below
            </Text>
        </Animated.View>
    );

    // ============================================
    // Main Render
    // ============================================

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
                {/* Title */}
                <Animated.View entering={FadeInDown.duration(400)}>
                    <Text style={styles.headerTitle}>Search</Text>
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
                            <Ionicons name="search" size={18} color={colors.gold[500]} />
                        </View>
                        <TextInput
                            ref={inputRef}
                            style={styles.searchInput}
                            placeholder="Search people, posts, communities..."
                            placeholderTextColor={colors.text.muted}
                            value={query}
                            onChangeText={handleSearch}
                            onFocus={handleSearchBarFocus}
                            onBlur={handleSearchBarBlur}
                            returnKeyType="search"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {query.length > 0 && (
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

                {/* Filter Pills */}
                <Animated.View entering={FadeInDown.duration(400).delay(100)}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterScroll}
                        style={styles.filterContainer}
                    >
                        {FILTER_TABS.map((tab) => {
                            const isActive = activeFilter === tab.key;
                            return (
                                <TouchableOpacity
                                    key={tab.key}
                                    style={[
                                        styles.filterPill,
                                        isActive && styles.filterPillActive,
                                    ]}
                                    onPress={() => handleFilterTap(tab.key)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={tab.icon}
                                        size={14}
                                        color={isActive ? colors.gold[500] : colors.text.muted}
                                        style={{ marginEnd: 4 }}
                                    />
                                    <Text style={[
                                        styles.filterPillText,
                                        isActive && styles.filterPillTextActive,
                                    ]}>
                                        {tab.label}
                                    </Text>
                                    {isActive && hasSearched && (
                                        <View style={styles.filterCount}>
                                            <Text style={styles.filterCountText}>
                                                {filteredResults.length}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </Animated.View>
            </View>

            {/* Content */}
            {isSearching ? (
                <SearchSkeletonList />
            ) : hasSearched && filteredResults.length === 0 ? (
                renderNoResults()
            ) : !hasSearched ? (
                renderEmptyState()
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={filteredResults}
                    renderItem={renderResult}
                    keyExtractor={(item) => `${item.type}-${item.id}`}
                    contentContainerStyle={{
                        paddingHorizontal: spacing.lg,
                        paddingBottom: 100,
                        paddingTop: spacing.sm,
                    }}
                    showsVerticalScrollIndicator={false}
                    keyboardDismissMode="on-drag"
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={8}
                    windowSize={5}
                    initialNumToRender={6}
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.gold[500]} />}
                />
            )}
        </View>
        </KeyboardAvoidingView>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },

    // Header
    header: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: -0.8,
        marginBottom: spacing.md,
        fontFamily: 'Inter-Bold',
    },

    // Glass Search Bar
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
        backgroundColor: colors.surface.glass,
    },
    searchIconWrap: {
        width: 32,
        height: 32,
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
        paddingVertical: spacing.md,
        fontFamily: 'Inter-Medium',
    },
    clearBtn: {
        padding: 4,
    },

    // Filter Pills
    filterContainer: {
        marginTop: spacing.sm,
    },
    filterScroll: {
        gap: spacing.xs,
        paddingEnd: spacing.md,
    },
    filterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    filterPillActive: {
        backgroundColor: colors.surface.goldSubtle,
        borderColor: colors.gold[500] + '40',
    },
    filterPillText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        fontWeight: '500',
        fontFamily: 'Inter-Medium',
    },
    filterPillTextActive: {
        color: colors.gold[500],
        fontWeight: '600',
    },
    filterCount: {
        backgroundColor: colors.gold[500] + '20',
        borderRadius: 8,
        paddingHorizontal: 5,
        paddingVertical: 1,
        marginStart: 4,
    },
    filterCountText: {
        fontSize: 10,
        color: colors.gold[500],
        fontWeight: '700',
    },

    // Sections (discovery)
    discoveryScroll: {
        flex: 1,
    },
    section: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
        gap: spacing.xs,
    },
    sectionTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
        flex: 1,
    },
    sectionSubtitle: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginBottom: spacing.md,
        lineHeight: 18,
    },
    clearText: {
        fontSize: typography.fontSize.sm,
        color: colors.gold[500],
        fontWeight: '600',
    },

    // Recent Searches
    recentList: {
        gap: 2,
    },
    recentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.sm,
        borderRadius: 10,
    },
    recentIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.surface.glass,
        alignItems: 'center',
        justifyContent: 'center',
        marginEnd: spacing.sm,
    },
    recentText: {
        flex: 1,
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
    },
    recentRemove: {
        padding: 4,
    },

    // Trending Topics
    trendingGrid: {
        gap: spacing.xs,
    },
    trendingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    trendingIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginEnd: spacing.md,
    },
    trendingInfo: {
        flex: 1,
    },
    trendingName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: 'Inter-SemiBold',
    },
    trendingCount: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: 1,
    },

    // Discover / Category Grid
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    categoryCard: {
        width: (SCREEN_WIDTH - spacing.xl * 2 - spacing.sm * 2) / 3,
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    categoryIcon: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    categoryLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.primary,
        textAlign: 'center',
    },

    // Suggested (horizontal scroll)
    suggestedScroll: {
        gap: spacing.sm,
        paddingEnd: spacing.xl,
    },
    suggestedCard: {
        width: 130,
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        padding: spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    suggestedAvatarWrap: {
        position: 'relative',
        marginBottom: spacing.sm,
    },
    suggestedVerified: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: colors.obsidian[900],
        borderRadius: 8,
    },
    suggestedName: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: 2,
    },
    suggestedSub: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    suggestedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    suggestedBadgeText: {
        fontSize: 10,
        fontWeight: '600',
    },

    // Search Results
    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderRadius: 14,
        marginBottom: 2,
    },
    resultRowPressed: {
        backgroundColor: colors.surface.glass,
    },
    resultAvatarWrap: {
        position: 'relative',
    },
    resultAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    resultAvatarPlaceholder: {
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center',
        justifyContent: 'center',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: -1,
        right: -1,
        backgroundColor: colors.obsidian[900],
        borderRadius: 7,
    },
    resultInfo: {
        flex: 1,
        marginStart: spacing.md,
        marginEnd: spacing.sm,
    },
    resultTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: 'Inter-SemiBold',
    },
    resultSubtitle: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginTop: 1,
    },
    resultDescription: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        marginTop: 2,
        lineHeight: 16,
    },
    resultTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: 8,
    },
    resultTypeText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
    },

    // Skeleton
    skeletonContainer: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    skeletonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
    },
    skeletonInfo: {
        flex: 1,
        marginStart: spacing.md,
    },

    // No results
    noResultsContainer: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: spacing.xl,
    },
    noResultsIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.surface.glass,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    noResultsTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
        marginBottom: spacing.xs,
        fontFamily: 'Inter-Bold',
    },
    noResultsSubtitle: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        textAlign: 'center',
        lineHeight: 20,
    },
});
