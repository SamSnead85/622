import { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
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
    ActivityIndicator,
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
    FadeOut,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    interpolate,
    withSpring,
    SlideInRight,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing } from '@zerog/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { Avatar } from '../../components';
import { apiFetch, API, isNetworkError } from '../../lib/api';
import { AVATAR_PLACEHOLDER, IMAGE_PLACEHOLDER } from '../../lib/imagePlaceholder';
import { useNetworkQuality } from '../../hooks/useNetworkQuality';
import { formatCount } from '../../lib/utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// Constants
// ============================================

const SEARCH_HISTORY_KEY = '@search_history';
const MAX_HISTORY_ITEMS = 15;
const DEBOUNCE_DELAY = 300;
const SUGGESTION_DEBOUNCE = 200;
const MIN_SEARCH_LENGTH = 2;

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
    isFollowing?: boolean;
    isOwnProfile?: boolean;
}

type FilterTab = 'all' | 'people' | 'communities' | 'posts' | 'hashtags';

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

interface FeaturedPost {
    id: string;
    content: string;
    authorName: string;
    authorAvatar?: string;
    authorUsername?: string;
    likesCount: number;
    commentsCount: number;
    mediaUrl?: string;
}

interface ResultCounts {
    all: number;
    people: number;
    communities: number;
    posts: number;
    hashtags: number;
}

// ============================================
// Static Data (fallbacks)
// ============================================

const FILTER_TABS: { key: FilterTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'all', label: 'All', icon: 'apps-outline' },
    { key: 'people', label: 'People', icon: 'people-outline' },
    { key: 'communities', label: 'Groups', icon: 'globe-outline' },
    { key: 'posts', label: 'Posts', icon: 'document-text-outline' },
    { key: 'hashtags', label: 'Tags', icon: 'pricetag-outline' },
];

const TRENDING_TOPICS_FALLBACK: TrendingTopic[] = [
    { id: '1', name: 'Ramadan Prep', postsCount: 342, icon: 'moon-outline', color: colors.gold[500] },
    { id: '2', name: 'Community Builds', postsCount: 218, icon: 'people-outline', color: colors.azure[500] },
    { id: '3', name: 'Privacy Tips', postsCount: 189, icon: 'shield-checkmark-outline', color: colors.emerald[500] },
    { id: '4', name: 'Faith & Wellness', postsCount: 156, icon: 'heart-outline', color: colors.coral[500] },
    { id: '5', name: 'Book Club', postsCount: 134, icon: 'book-outline', color: colors.azure[300] },
    { id: '6', name: 'Tech Halal', postsCount: 98, icon: 'code-slash-outline', color: colors.azure[400] },
];

const SUGGESTED_ITEMS_FALLBACK: SuggestedItem[] = [
    { id: 's1', type: 'community', name: 'Muslim Professionals', subtitle: '2.4K members', avatarUrl: undefined },
    { id: 's2', type: 'user', name: 'Amira Hassan', subtitle: '@amirahassan', avatarUrl: undefined, isVerified: true },
    { id: 's3', type: 'community', name: 'Sisters Circle', subtitle: '1.8K members', avatarUrl: undefined },
    { id: 's4', type: 'user', name: 'Omar Suleiman', subtitle: '@omarsuleiman', avatarUrl: undefined, isVerified: true },
    { id: 's5', type: 'community', name: 'Halal Foodies', subtitle: '3.1K members', avatarUrl: undefined },
    { id: 's6', type: 'user', name: 'Yasmin Mogahed', subtitle: '@yasminmogahed', avatarUrl: undefined, isVerified: true },
];

const QUICK_ACCESS_CARDS = [
    { id: 'communities', icon: 'people' as const, label: 'Communities', color: colors.azure[500], route: '/(tabs)/communities' },
    { id: 'games', icon: 'game-controller' as const, label: 'Games', color: colors.emerald[500], route: '/games' },
    { id: 'tools', icon: 'construct' as const, label: 'Tools', color: colors.gold[500], route: '/tools' },
    { id: 'campfire', icon: 'radio' as const, label: 'Campfire', color: colors.coral[500], route: '/campfire' },
];

const DISCOVERY_CATEGORIES = [
    { id: 'technology', icon: 'code-slash' as const, label: 'Technology', color: colors.azure[500], gradient: [colors.azure[600], colors.azure[400]] },
    { id: 'faith', icon: 'moon' as const, label: 'Faith', color: colors.gold[500], gradient: [colors.gold[600], colors.gold[400]] },
    { id: 'sports', icon: 'football' as const, label: 'Sports', color: colors.emerald[500], gradient: [colors.emerald[600], colors.emerald[400]] },
    { id: 'business', icon: 'briefcase' as const, label: 'Business', color: colors.coral[500], gradient: [colors.coral[600], colors.coral[400]] },
    { id: 'education', icon: 'school' as const, label: 'Education', color: colors.azure[300], gradient: [colors.azure[400], colors.azure[200]] },
    { id: 'lifestyle', icon: 'leaf' as const, label: 'Lifestyle', color: colors.emerald[400], gradient: [colors.emerald[500], colors.emerald[300]] },
    { id: 'food', icon: 'restaurant' as const, label: 'Food', color: colors.gold[400], gradient: [colors.gold[500], colors.gold[300]] },
    { id: 'tools', icon: 'compass' as const, label: 'Tools', color: colors.gold[500], gradient: [colors.gold[600], colors.gold[400]], route: '/tools' },
];

const TOPIC_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
    'moon-outline': 'moon-outline',
    'people-outline': 'people-outline',
    'shield-checkmark-outline': 'shield-checkmark-outline',
    'heart-outline': 'heart-outline',
    'book-outline': 'book-outline',
    'code-slash-outline': 'code-slash-outline',
};

const TOPIC_COLOR_MAP: Record<number, string> = {
    0: colors.gold[500],
    1: colors.azure[500],
    2: colors.emerald[500],
    3: colors.coral[500],
    4: colors.azure[300],
    5: colors.azure[400],
};

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
    }, [shimmerAnim]);

    const animStyle = useAnimatedStyle(() => ({
        opacity: interpolate(shimmerAnim.value, [0, 0.5, 1], [0.3, 0.7, 0.3]),
    }));

    return (
        <Animated.View
            style={[
                {
                    width: width as number,
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
                <Animated.View key={`skel-${i}`} entering={FadeInDown.duration(300).delay(i * 60)}>
                    <SearchResultSkeleton />
                </Animated.View>
            ))}
        </Animated.View>
    );
}

function SuggestionSkeleton() {
    return (
        <View style={styles.suggestionSkeletonRow}>
            <SkeletonShimmer width={16} height={16} borderRadius={8} />
            <SkeletonShimmer width={160} height={14} borderRadius={7} style={{ marginStart: 10 }} />
        </View>
    );
}

// ============================================
// Search Suggestion Item (memoized)
// ============================================

const SuggestionItem = memo(({ text, onPress, index }: {
    text: string;
    onPress: (text: string) => void;
    index: number;
}) => (
    <Animated.View entering={FadeInDown.duration(200).delay(index * 30)}>
        <TouchableOpacity
            style={styles.suggestionRow}
            onPress={() => onPress(text)}
            activeOpacity={0.7}
        >
            <View style={styles.suggestionIcon}>
                <Ionicons name="search-outline" size={14} color={colors.text.muted} />
            </View>
            <Text style={styles.suggestionText} numberOfLines={1}>
                {text}
            </Text>
            <Ionicons name="arrow-up-outline" size={14} color={colors.text.muted} style={{ transform: [{ rotate: '-45deg' }] }} />
        </TouchableOpacity>
    </Animated.View>
));

// ============================================
// Search Result Row (memoized)
// ============================================

const SearchResultRow = memo(({ item, index, onPress, onFollow }: {
    item: SearchResult;
    index: number;
    onPress: (item: SearchResult) => void;
    onFollow?: (item: SearchResult) => void;
}) => {
    const typeIcon = getTypeIcon(item.type);
    const typeColor = getTypeColor(item.type);
    const isUser = item.type === 'user';
    const showFollowBtn = isUser && !item.isOwnProfile && onFollow;
    const followTappedRef = useRef(false);

    return (
        <Animated.View entering={FadeInDown.duration(250).delay(Math.min(index * 40, 400))}>
            <Pressable
                style={({ pressed }) => [
                    styles.resultRow,
                    pressed && styles.resultRowPressed,
                ]}
                onPress={() => {
                    if (followTappedRef.current) {
                        followTappedRef.current = false;
                        return;
                    }
                    onPress(item);
                }}
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
                                name={typeIcon}
                                size={20}
                                color={typeColor}
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
                    {item.subtitle ? (
                        <Text style={styles.resultSubtitle} numberOfLines={1}>
                            {item.subtitle}
                        </Text>
                    ) : null}
                    {item.description ? (
                        <Text style={styles.resultDescription} numberOfLines={1}>
                            {item.description}
                        </Text>
                    ) : null}
                </View>

                {/* Follow button for users, type badge for others */}
                {showFollowBtn ? (
                    <TouchableOpacity
                        style={[
                            styles.followBtn,
                            item.isFollowing && styles.followBtnFollowing,
                        ]}
                        onPress={() => {
                            followTappedRef.current = true;
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onFollow(item);
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Text style={[
                            styles.followBtnText,
                            item.isFollowing && styles.followBtnTextFollowing,
                        ]}>
                            {item.isFollowing ? 'Following' : 'Follow'}
                        </Text>
                    </TouchableOpacity>
                ) : !isUser ? (
                    <View style={[styles.resultTypeBadge, { backgroundColor: typeColor + '15' }]}>
                        <Ionicons name={typeIcon} size={12} color={typeColor} />
                        <Text style={[styles.resultTypeText, { color: typeColor }]}>
                            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                        </Text>
                    </View>
                ) : null}
            </Pressable>
        </Animated.View>
    );
}, (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.type === next.item.type &&
    prev.item.isFollowing === next.item.isFollowing &&
    prev.index === next.index
);

// ============================================
// Helpers
// ============================================

function getTypeIcon(type: string): keyof typeof Ionicons.glyphMap {
    switch (type) {
        case 'user': return 'person-outline';
        case 'community': return 'people-outline';
        case 'post': return 'document-text-outline';
        case 'hashtag': return 'pricetag-outline';
        default: return 'search-outline';
    }
}

function getTypeColor(type: string): string {
    switch (type) {
        case 'user': return colors.azure[500];
        case 'community': return colors.emerald[500];
        case 'post': return colors.gold[500];
        case 'hashtag': return colors.coral[500];
        default: return colors.text.secondary;
    }
}

// ============================================
// Main Screen
// ============================================

export default function SearchScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: c } = useTheme();
    const { isOffline } = useNetworkQuality();

    // Search state
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
    const [searchError, setSearchError] = useState<string | null>(null);

    // Discovery state
    const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
    const [trendingData, setTrendingData] = useState<TrendingTopic[]>(TRENDING_TOPICS_FALLBACK);
    const [suggestedData, setSuggestedData] = useState<SuggestedItem[]>(SUGGESTED_ITEMS_FALLBACK);
    const [featuredPosts, setFeaturedPosts] = useState<FeaturedPost[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isDiscoveryLoading, setIsDiscoveryLoading] = useState(true);

    // Refs for debounce + abort
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const suggestionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const inputRef = useRef<TextInput>(null);
    const flatListRef = useRef<FlatList>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    // Search bar focus state
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // Animation values
    const searchBarScale = useSharedValue(1);

    // ============================================
    // Result Counts (per tab)
    // ============================================

    const resultCounts = useMemo((): ResultCounts => {
        const counts: ResultCounts = { all: 0, people: 0, communities: 0, posts: 0, hashtags: 0 };
        for (const r of results) {
            counts.all++;
            if (r.type === 'user') counts.people++;
            else if (r.type === 'community') counts.communities++;
            else if (r.type === 'post') counts.posts++;
            else if (r.type === 'hashtag') counts.hashtags++;
        }
        return counts;
    }, [results]);

    // ============================================
    // AsyncStorage: Load search history on mount
    // ============================================

    useEffect(() => {
        AsyncStorage.getItem(SEARCH_HISTORY_KEY).then((raw) => {
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        setRecentSearches(parsed.slice(0, MAX_HISTORY_ITEMS));
                    }
                } catch {
                    // Corrupt data — ignore
                }
            }
        }).catch(() => {
            // Storage read failed — ignore
        });
    }, []);

    // Persist search history to AsyncStorage
    const persistHistory = useCallback((history: RecentSearch[]) => {
        AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS))).catch(() => {
            // Storage write failed — non-critical
        });
    }, []);

    // ============================================
    // Fetch trending + suggested + featured data
    // ============================================

    const loadDiscoveryData = useCallback(async () => {
        setIsDiscoveryLoading(true);
        const settled = await Promise.allSettled([
            apiFetch<any>(API.trending).then((data) => {
                if (data?.topics && Array.isArray(data.topics)) {
                    setTrendingData(data.topics.slice(0, 6).map((t: any, i: number) => ({
                        id: t.id || `t${i}`,
                        name: t.name || t.tag || '',
                        postsCount: t.postsCount || t.count || 0,
                        icon: TOPIC_ICON_MAP[TRENDING_TOPICS_FALLBACK[i]?.icon ?? ''] || 'trending-up',
                        color: TOPIC_COLOR_MAP[i] || colors.gold[500],
                    })));
                }
            }),

            apiFetch<any>(`${API.search}?q=&suggested=true&limit=6`).then((data) => {
                const items: SuggestedItem[] = [];
                if (Array.isArray(data?.users)) {
                    data.users.slice(0, 3).forEach((u: any) => {
                        items.push({
                            id: u.id,
                            type: 'user',
                            name: u.displayName || u.username || 'Unknown',
                            subtitle: `@${u.username || 'unknown'}`,
                            avatarUrl: u.avatarUrl,
                            isVerified: u.isVerified,
                        });
                    });
                }
                if (Array.isArray(data?.communities)) {
                    data.communities.slice(0, 3).forEach((c: any) => {
                        items.push({
                            id: c.id,
                            type: 'community',
                            name: c.name || 'Community',
                            subtitle: `${formatCount(c.membersCount || 0)} members`,
                            avatarUrl: c.avatarUrl,
                        });
                    });
                }
                if (items.length > 0) setSuggestedData(items);
            }),

            // Fetch featured/viral posts
            apiFetch<any>(`${API.feed}?type=foryou&limit=5&sort=trending`).then((data) => {
                const rawPosts = data?.posts || data?.data || [];
                if (Array.isArray(rawPosts) && rawPosts.length > 0) {
                    setFeaturedPosts(rawPosts.slice(0, 5).map((p: any) => ({
                        id: p.id,
                        content: (p.caption || p.content || '').substring(0, 100),
                        authorName: p.user?.displayName || p.author?.displayName || 'Unknown',
                        authorAvatar: p.user?.avatarUrl || p.author?.avatarUrl,
                        authorUsername: p.user?.username || p.author?.username,
                        likesCount: p.likesCount ?? p._count?.likes ?? 0,
                        commentsCount: p.commentsCount ?? p._count?.comments ?? 0,
                        mediaUrl: p.mediaUrl,
                    })));
                }
            }),
        ]);

        // Log failures silently in dev
        for (const result of settled) {
            if (result.status === 'rejected') {
                // Non-critical — fallback data already in place
            }
        }
        setIsDiscoveryLoading(false);
    }, []);

    // Fetch discovery data on mount
    useEffect(() => {
        loadDiscoveryData();
    }, [loadDiscoveryData]);

    // Pull-to-refresh handler
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await loadDiscoveryData();
        setIsRefreshing(false);
    }, [loadDiscoveryData]);

    // ============================================
    // Cleanup
    // ============================================

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (suggestionDebounceRef.current) clearTimeout(suggestionDebounceRef.current);
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, []);

    // ============================================
    // Search Suggestions (lightweight, fast)
    // ============================================

    const fetchSuggestions = useCallback((text: string) => {
        if (text.trim().length < MIN_SEARCH_LENGTH) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // Quick local suggestions from recent searches
        const localSuggestions = recentSearches
            .filter(r => r.query.toLowerCase().includes(text.toLowerCase()))
            .map(r => r.query)
            .slice(0, 3);

        // Also generate autocomplete-style suggestions
        const autoSuggestions = [
            text,
            `${text} community`,
            `${text} posts`,
        ].filter(s => !localSuggestions.includes(s));

        setSuggestions([...localSuggestions, ...autoSuggestions].slice(0, 5));
        setShowSuggestions(true);
    }, [recentSearches]);

    // ============================================
    // Search Logic — 300ms debounce + AbortController
    // ============================================

    const doSearch = useCallback(async (text: string, signal?: AbortSignal) => {
        if (text.trim().length < MIN_SEARCH_LENGTH) {
            setResults([]);
            setHasSearched(false);
            setSearchError(null);
            return;
        }

        setIsSearching(true);
        setHasSearched(true);
        setSearchError(null);
        setShowSuggestions(false);

        try {
            const data = await apiFetch<any>(
                `${API.search}?q=${encodeURIComponent(text.trim())}`,
                { signal, cache: false }
            );

            // Check abort after await
            if (signal?.aborted) return;

            const formatted: SearchResult[] = [];

            if (data?.users && Array.isArray(data.users)) {
                data.users.forEach((u: any) => {
                    if (!u?.id) return;
                    formatted.push({
                        id: u.id,
                        type: 'user',
                        title: u.displayName || u.username || 'Unknown',
                        subtitle: `@${u.username || 'unknown'}`,
                        avatarUrl: u.avatarUrl,
                        description: u.bio,
                        followersCount: u.followersCount ?? u._count?.followers ?? 0,
                        isVerified: u.isVerified,
                        isFollowing: u.isFollowing ?? false,
                        isOwnProfile: u.isOwnProfile ?? false,
                    });
                });
            }
            if (data?.communities && Array.isArray(data.communities)) {
                data.communities.forEach((c: any) => {
                    if (!c?.id) return;
                    formatted.push({
                        id: c.id,
                        type: 'community',
                        title: c.name || 'Community',
                        subtitle: `${formatCount(c.membersCount || 0)} members`,
                        avatarUrl: c.avatarUrl,
                        description: c.description,
                        membersCount: c.membersCount || 0,
                    });
                });
            }
            if (data?.posts && Array.isArray(data.posts)) {
                data.posts.forEach((p: any) => {
                    if (!p?.id) return;
                    formatted.push({
                        id: p.id,
                        type: 'post',
                        title: (p.caption || p.content || '').substring(0, 120) || 'Post',
                        subtitle: `by ${p.user?.displayName || p.author?.displayName || 'Unknown'}`,
                        avatarUrl: p.user?.avatarUrl || p.author?.avatarUrl,
                    });
                });
            }
            if (data?.hashtags && Array.isArray(data.hashtags)) {
                data.hashtags.forEach((h: any) => {
                    if (!h?.id && !h?.tag) return;
                    formatted.push({
                        id: h.id || h.tag,
                        type: 'hashtag',
                        title: `#${h.tag || h.name || ''}`,
                        subtitle: `${formatCount(h.postsCount || h.count || 0)} posts`,
                    });
                });
            }

            if (!signal?.aborted) {
                setResults(formatted);
            }

            // Save to recent searches
            if (text.trim().length >= MIN_SEARCH_LENGTH) {
                setRecentSearches((prev) => {
                    const filtered = prev.filter((r) => r.query.toLowerCase() !== text.trim().toLowerCase());
                    const updated = [
                        { id: Date.now().toString(), query: text.trim(), timestamp: Date.now() },
                        ...filtered,
                    ].slice(0, MAX_HISTORY_ITEMS);
                    persistHistory(updated);
                    return updated;
                });
            }
        } catch (error: unknown) {
            if (signal?.aborted) return;
            if (error instanceof Error && error.name === 'AbortError') return;

            const isNetwork = isNetworkError(error);
            setSearchError(
                isNetwork
                    ? 'No internet connection. Check your network and try again.'
                    : 'Search failed. Please try again.'
            );
            setResults([]);
        } finally {
            if (!signal?.aborted) {
                setIsSearching(false);
            }
        }
    }, [persistHistory]);

    const handleSearch = useCallback((text: string) => {
        setQuery(text);

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (suggestionDebounceRef.current) clearTimeout(suggestionDebounceRef.current);

        if (text.trim().length < MIN_SEARCH_LENGTH) {
            setResults([]);
            setHasSearched(false);
            setSearchError(null);
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // Show suggestions faster than full search
        suggestionDebounceRef.current = setTimeout(() => fetchSuggestions(text), SUGGESTION_DEBOUNCE);

        // Full search with debounce
        debounceRef.current = setTimeout(() => {
            const controller = new AbortController();
            abortControllerRef.current = controller;
            doSearch(text, controller.signal);
        }, DEBOUNCE_DELAY);
    }, [doSearch, fetchSuggestions]);

    const handleSuggestionTap = useCallback((text: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setQuery(text);
        setShowSuggestions(false);

        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;
        doSearch(text, controller.signal);
    }, [doSearch]);

    const handleRecentSearchTap = useCallback((searchQuery: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setQuery(searchQuery);

        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;
        doSearch(searchQuery, controller.signal);
    }, [doSearch]);

    const removeRecentSearch = useCallback((searchId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRecentSearches((prev) => {
            const updated = prev.filter((r) => r.id !== searchId);
            persistHistory(updated);
            return updated;
        });
    }, [persistHistory]);

    const clearRecentSearches = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRecentSearches([]);
        AsyncStorage.removeItem(SEARCH_HISTORY_KEY).catch(() => {
            // Storage delete failed — non-critical
        });
    }, []);

    const clearSearch = useCallback(() => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        setQuery('');
        setResults([]);
        setHasSearched(false);
        setActiveFilter('all');
        setSearchError(null);
        setSuggestions([]);
        setShowSuggestions(false);
        inputRef.current?.focus();
    }, []);

    const retrySearch = useCallback(() => {
        if (query.trim().length >= MIN_SEARCH_LENGTH) {
            if (abortControllerRef.current) abortControllerRef.current.abort();
            const controller = new AbortController();
            abortControllerRef.current = controller;
            doSearch(query, controller.signal);
        }
    }, [query, doSearch]);

    const handleFilterTap = useCallback((tab: FilterTab) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveFilter(tab);
    }, []);

    // ============================================
    // Navigation Handlers
    // ============================================

    const handleResultPress = useCallback((item: SearchResult) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (item.type === 'user') {
            const username = item.subtitle?.replace('@', '') || item.id;
            router.push(`/profile/${username}`);
        } else if (item.type === 'post') {
            router.push(`/post/${item.id}`);
        } else if (item.type === 'community') {
            router.push(`/community/${item.id}` as any);
        } else if (item.type === 'hashtag') {
            // Search for the hashtag
            const tag = item.title.replace('#', '');
            setQuery(tag);
            if (abortControllerRef.current) abortControllerRef.current.abort();
            const controller = new AbortController();
            abortControllerRef.current = controller;
            doSearch(tag, controller.signal);
        }
    }, [router, doSearch]);

    const handleFollowFromSearch = useCallback(async (item: SearchResult) => {
        if (item.type !== 'user') return;
        const wasFollowing = item.isFollowing;
        // Optimistic update
        setResults((prev) =>
            prev.map((r) =>
                r.id === item.id ? { ...r, isFollowing: !wasFollowing } : r
            )
        );
        try {
            if (wasFollowing) {
                await apiFetch(`/api/v1/users/${item.id}/follow`, { method: 'DELETE' });
            } else {
                await apiFetch(`/api/v1/users/${item.id}/follow`, { method: 'POST' });
            }
        } catch {
            // Revert on failure
            setResults((prev) =>
                prev.map((r) =>
                    r.id === item.id ? { ...r, isFollowing: wasFollowing } : r
                )
            );
        }
    }, []);

    const handleSuggestedPress = useCallback((item: SuggestedItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (item.type === 'user') {
            const username = item.subtitle?.replace('@', '') || item.id;
            router.push(`/profile/${username}`);
        } else {
            router.push(`/community/${item.id}` as any);
        }
    }, [router]);

    const handleTrendingPress = useCallback((topic: TrendingTopic) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setQuery(topic.name);

        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;
        doSearch(topic.name, controller.signal);
    }, [doSearch]);

    const handleCategoryPress = useCallback((cat: typeof DISCOVERY_CATEGORIES[0]) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if ('route' in cat && cat.route) {
            router.push(cat.route as any);
            return;
        }
        setQuery(cat.label);
        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;
        doSearch(cat.label, controller.signal);
    }, [router, doSearch]);

    const handleFeaturedPress = useCallback((post: FeaturedPost) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/post/${post.id}`);
    }, [router]);

    // ============================================
    // Filter results
    // ============================================

    const filteredResults = useMemo(() => {
        if (activeFilter === 'all') return results;
        return results.filter((r) => {
            if (activeFilter === 'people') return r.type === 'user';
            if (activeFilter === 'posts') return r.type === 'post';
            if (activeFilter === 'communities') return r.type === 'community';
            if (activeFilter === 'hashtags') return r.type === 'hashtag';
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
        setIsSearchFocused(true);
        searchBarScale.value = withSpring(1.02, { damping: 15, stiffness: 300 });
    }, [searchBarScale]);

    const handleSearchBarBlur = useCallback(() => {
        setIsSearchFocused(false);
        searchBarScale.value = withSpring(1, { damping: 15, stiffness: 300 });
        // Delay hiding suggestions so tap events can fire
        setTimeout(() => setShowSuggestions(false), 200);
    }, [searchBarScale]);

    // ============================================
    // Render: Search Result (via FlatList)
    // ============================================

    const renderResult = useCallback(({ item, index }: { item: SearchResult; index: number }) => (
        <SearchResultRow item={item} index={index} onPress={handleResultPress} onFollow={handleFollowFromSearch} />
    ), [handleResultPress, handleFollowFromSearch]);

    const resultKeyExtractor = useCallback((item: SearchResult) => `${item.type}-${item.id}`, []);

    // ============================================
    // Render: Search Suggestions Overlay
    // ============================================

    const renderSuggestions = () => {
        if (!showSuggestions || suggestions.length === 0 || hasSearched) return null;

        return (
            <Animated.View
                entering={FadeIn.duration(150)}
                exiting={FadeOut.duration(100)}
                style={styles.suggestionsOverlay}
            >
                {suggestions.map((s, i) => (
                    <SuggestionItem
                        key={`sug-${i}-${s}`}
                        text={s}
                        onPress={handleSuggestionTap}
                        index={i}
                    />
                ))}
            </Animated.View>
        );
    };

    // ============================================
    // Render: Recent Searches
    // ============================================

    const renderRecentSearches = () => {
        if (recentSearches.length === 0 || hasSearched) return null;

        return (
            <Animated.View entering={FadeInDown.duration(300).delay(50)} style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="time-outline" size={16} color={colors.text.muted} />
                    <Text style={styles.sectionTitle}>Recent Searches</Text>
                    <TouchableOpacity onPress={clearRecentSearches} hitSlop={8}>
                        <Text style={styles.clearText}>Clear All</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.recentList}>
                    {recentSearches.slice(0, 8).map((search, i) => (
                        <Animated.View
                            key={search.id}
                            entering={FadeInDown.duration(200).delay(i * 35)}
                        >
                            <TouchableOpacity
                                style={styles.recentRow}
                                onPress={() => handleRecentSearchTap(search.query)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.recentIcon}>
                                    <Ionicons name="time-outline" size={14} color={colors.text.muted} />
                                </View>
                                <Text style={styles.recentText} numberOfLines={1}>
                                    {search.query}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => removeRecentSearch(search.id)}
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
                        entering={FadeInDown.duration(300).delay(150 + i * 50)}
                    >
                        <TouchableOpacity
                            style={[styles.trendingCard, { borderLeftWidth: 3, borderLeftColor: topic.color }]}
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
                                <View style={styles.trendingCountRow}>
                                    <Ionicons name="trending-up" size={11} color={topic.color} />
                                    <Text style={[styles.trendingCount, { color: topic.color }]}>
                                        {formatCount(topic.postsCount)} posts
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={14} color={colors.text.muted} />
                        </TouchableOpacity>
                    </Animated.View>
                ))}
            </View>
        </Animated.View>
    );

    // ============================================
    // Render: Category Grid (Browse by Topic)
    // ============================================

    const renderCategoryGrid = () => (
        <Animated.View entering={FadeInDown.duration(350).delay(200)} style={styles.section}>
            <View style={styles.sectionHeader}>
                <Ionicons name="grid-outline" size={16} color={colors.azure[400]} />
                <Text style={styles.sectionTitle}>Browse Categories</Text>
            </View>
            <View style={styles.categoryGrid}>
                {DISCOVERY_CATEGORIES.map((cat, i) => (
                    <Animated.View
                        key={cat.id}
                        entering={FadeInDown.duration(300).delay(250 + i * 40)}
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
    // Render: Featured / Viral Posts
    // ============================================

    const renderFeaturedPosts = () => {
        if (featuredPosts.length === 0) return null;

        return (
            <Animated.View entering={FadeInDown.duration(350).delay(300)} style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="flame-outline" size={18} color={colors.coral[500]} />
                    <Text style={styles.sectionTitle}>Trending Posts</Text>
                </View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.featuredScroll}
                >
                    {featuredPosts.map((post, i) => (
                        <Animated.View
                            key={post.id}
                            entering={SlideInRight.duration(300).delay(350 + i * 60)}
                        >
                            <TouchableOpacity
                                style={styles.featuredCard}
                                activeOpacity={0.8}
                                onPress={() => handleFeaturedPress(post)}
                            >
                                {post.mediaUrl ? (
                                    <Image
                                        source={{ uri: post.mediaUrl }}
                                        style={styles.featuredMedia}
                                        contentFit="cover"
                                        placeholder={IMAGE_PLACEHOLDER.blurhash}
                                        transition={IMAGE_PLACEHOLDER.transition}
                                        cachePolicy="memory-disk"
                                    />
                                ) : null}
                                <View style={styles.featuredContent}>
                                    <Text style={styles.featuredText} numberOfLines={3}>
                                        {post.content || 'View post'}
                                    </Text>
                                    <View style={styles.featuredFooter}>
                                        <View style={styles.featuredAuthor}>
                                            {post.authorAvatar ? (
                                                <Image
                                                    source={{ uri: post.authorAvatar }}
                                                    style={styles.featuredAuthorAvatar}
                                                    placeholder={AVATAR_PLACEHOLDER.blurhash}
                                                    transition={AVATAR_PLACEHOLDER.transition}
                                                    cachePolicy="memory-disk"
                                                />
                                            ) : (
                                                <View style={[styles.featuredAuthorAvatar, styles.featuredAuthorPlaceholder]}>
                                                    <Text style={{ fontSize: 8, fontWeight: '700', color: colors.text.primary }}>
                                                        {post.authorName?.[0]?.toUpperCase() || '?'}
                                                    </Text>
                                                </View>
                                            )}
                                            <Text style={styles.featuredAuthorName} numberOfLines={1}>
                                                {post.authorName || 'Unknown'}
                                            </Text>
                                        </View>
                                        <View style={styles.featuredStats}>
                                            <Ionicons name="heart" size={11} color={colors.coral[400]} />
                                            <Text style={styles.featuredStatText}>
                                                {formatCount(post.likesCount)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </ScrollView>
            </Animated.View>
        );
    };

    // ============================================
    // Render: Suggested Users & Communities
    // ============================================

    const renderSuggested = () => (
        <Animated.View entering={FadeInDown.duration(350).delay(350)} style={styles.section}>
            <View style={styles.sectionHeader}>
                <Ionicons name="sparkles" size={18} color={colors.gold[500]} />
                <Text style={styles.sectionTitle}>Suggested For You</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
                Communities and people you might like
            </Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestedScroll}
            >
                {suggestedData.map((item, i) => (
                    <Animated.View
                        key={item.id}
                        entering={FadeInDown.duration(300).delay(400 + i * 50)}
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
                                    {item.type === 'community' ? 'Community' : 'Follow'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                ))}
            </ScrollView>
        </Animated.View>
    );

    // ============================================
    // Render: Explore / Discovery (no search active)
    // ============================================

    const renderExploreState = () => (
        <ScrollView
            ref={scrollViewRef}
            style={styles.discoveryScroll}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            refreshControl={
                <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    tintColor={colors.gold[500]}
                />
            }
        >
            {/* Offline Banner */}
            {isOffline && (
                <Animated.View entering={FadeIn.duration(200)} style={styles.offlineBanner}>
                    <Ionicons name="cloud-offline-outline" size={16} color={colors.coral[400]} />
                    <Text style={styles.offlineBannerText}>
                        You&apos;re offline. Showing cached content.
                    </Text>
                </Animated.View>
            )}

            {/* Quick Access Hub — 2x2 grid */}
            <View style={[styles.quickAccessGrid, { paddingHorizontal: spacing.xl, marginTop: spacing.md }]}>
                {QUICK_ACCESS_CARDS.map((card, i) => (
                    <Animated.View key={card.id} entering={FadeInDown.duration(300).delay(i * 60)} style={styles.quickAccessCardWrap}>
                        <TouchableOpacity
                            style={[styles.quickAccessCard, { borderColor: card.color + '30' }]}
                            onPress={() => router.push(card.route as any)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.quickAccessIcon, { backgroundColor: card.color + '18' }]}>
                                <Ionicons name={card.icon} size={24} color={card.color} />
                            </View>
                            <Text style={[styles.quickAccessLabel, { color: c.text.primary }]}>{card.label}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                ))}
            </View>

            {renderRecentSearches()}
            {renderTrending()}
            {renderFeaturedPosts()}
            {renderSuggested()}
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
            <TouchableOpacity
                style={styles.noResultsBtn}
                onPress={clearSearch}
            >
                <Ionicons name="compass-outline" size={16} color={colors.gold[500]} />
                <Text style={styles.noResultsBtnText}>Browse Explore</Text>
            </TouchableOpacity>
        </Animated.View>
    );

    // ============================================
    // Render: Error State
    // ============================================

    const renderErrorState = () => (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.errorContainer}>
            <View style={styles.errorIconWrap}>
                <Ionicons
                    name={isOffline ? 'cloud-offline-outline' : 'alert-circle-outline'}
                    size={40}
                    color={isOffline ? colors.coral[400] : colors.amber[400]}
                />
            </View>
            <Text style={styles.errorTitle}>
                {isOffline ? 'You\'re offline' : 'Search unavailable'}
            </Text>
            <Text style={styles.errorSubtitle}>
                {searchError}
            </Text>
            <TouchableOpacity
                style={styles.retryBtn}
                onPress={retrySearch}
            >
                <Ionicons name="refresh" size={16} color="#FFFFFF" />
                <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
        </Animated.View>
    );

    // ============================================
    // Main Render
    // ============================================

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.container, { backgroundColor: c.obsidian[900] }]}>
            <LinearGradient
                colors={[c.obsidian[900], c.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
                {/* Title */}
                <Animated.View entering={FadeInDown.duration(400)}>
                    <Text style={styles.headerTitle}>Discover</Text>
                </Animated.View>

                {/* Glass Search Bar */}
                <Animated.View
                    entering={FadeInDown.duration(400).delay(50)}
                    style={searchBarAnimStyle}
                >
                    <View style={[styles.searchContainer, isSearchFocused && styles.searchContainerFocused]}>
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
                            <Ionicons name="search" size={18} color={isSearchFocused ? colors.gold[500] : colors.text.muted} />
                        </View>
                        <TextInput
                            ref={inputRef}
                            style={styles.searchInput}
                            placeholder="Search people, communities, topics..."
                            placeholderTextColor={colors.text.muted}
                            value={query}
                            onChangeText={handleSearch}
                            onFocus={handleSearchBarFocus}
                            onBlur={handleSearchBarBlur}
                            returnKeyType="search"
                            autoCapitalize="none"
                            autoCorrect={false}
                            onSubmitEditing={() => {
                                if (query.trim().length >= MIN_SEARCH_LENGTH) {
                                    setShowSuggestions(false);
                                    if (abortControllerRef.current) abortControllerRef.current.abort();
                                    const controller = new AbortController();
                                    abortControllerRef.current = controller;
                                    doSearch(query, controller.signal);
                                }
                            }}
                        />
                        {isSearching && (
                            <ActivityIndicator
                                size="small"
                                color={colors.gold[500]}
                                style={{ marginEnd: 6 }}
                            />
                        )}
                        {query.length > 0 && !isSearching && (
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

                {/* Filter Pills — only show when we have search results */}
                {hasSearched && (
                    <Animated.View entering={FadeInDown.duration(300).delay(50)}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.filterScroll}
                            style={styles.filterContainer}
                        >
                            {FILTER_TABS.map((tab) => {
                                const isActive = activeFilter === tab.key;
                                const count = resultCounts[tab.key];
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
                                        {count > 0 && (
                                            <View style={[
                                                styles.filterCount,
                                                isActive && styles.filterCountActive,
                                            ]}>
                                                <Text style={[
                                                    styles.filterCountText,
                                                    isActive && styles.filterCountTextActive,
                                                ]}>
                                                    {count}
                                                </Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </Animated.View>
                )}
            </View>

            {/* Search Suggestions Dropdown */}
            {renderSuggestions()}

            {/* Content */}
            {isSearching && !hasSearched ? (
                <SearchSkeletonList />
            ) : searchError && hasSearched ? (
                renderErrorState()
            ) : hasSearched && filteredResults.length === 0 && !isSearching ? (
                renderNoResults()
            ) : !hasSearched ? (
                renderExploreState()
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={filteredResults}
                    renderItem={renderResult}
                    keyExtractor={resultKeyExtractor}
                    contentContainerStyle={{
                        paddingHorizontal: spacing.lg,
                        paddingBottom: 120,
                        paddingTop: spacing.sm,
                    }}
                    showsVerticalScrollIndicator={false}
                    keyboardDismissMode="on-drag"
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    initialNumToRender={8}
                    updateCellsBatchingPeriod={50}
                    ListHeaderComponent={
                        filteredResults.length > 0 ? (
                            <Animated.View entering={FadeIn.duration(200)} style={styles.resultsHeader}>
                                <Text style={styles.resultsCountText}>
                                    {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
                                </Text>
                            </Animated.View>
                        ) : null
                    }
                    ListFooterComponent={
                        isSearching ? (
                            <View style={styles.loadingMore}>
                                <ActivityIndicator size="small" color={colors.gold[500]} />
                            </View>
                        ) : null
                    }
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
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: -0.3,
        marginBottom: spacing.md,
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
    searchContainerFocused: {
        borderColor: colors.gold[500] + '50',
    },
    searchIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: colors.surface.glassHover,
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
        backgroundColor: colors.obsidian[600],
        borderRadius: 8,
        paddingHorizontal: 5,
        paddingVertical: 1,
        marginStart: 4,
    },
    filterCountActive: {
        backgroundColor: colors.gold[500] + '20',
    },
    filterCountText: {
        fontSize: 10,
        color: colors.text.muted,
        fontWeight: '700',
    },
    filterCountTextActive: {
        color: colors.gold[500],
    },

    // Results header
    resultsHeader: {
        paddingBottom: spacing.xs,
    },
    resultsCountText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        fontFamily: 'Inter-Medium',
    },
    loadingMore: {
        paddingVertical: spacing.lg,
        alignItems: 'center',
    },

    // Suggestions overlay
    suggestionsOverlay: {
        position: 'absolute',
        top: 0,
        left: spacing.xl,
        right: spacing.xl,
        backgroundColor: colors.obsidian[800],
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        paddingVertical: spacing.xs,
        zIndex: 20,
        marginTop: -2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    suggestionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.md,
    },
    suggestionIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.surface.glass,
        alignItems: 'center',
        justifyContent: 'center',
        marginEnd: spacing.sm,
    },
    suggestionText: {
        flex: 1,
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        fontFamily: 'Inter-Medium',
    },
    suggestionSkeletonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
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
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    sectionTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '800',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
        flex: 1,
        letterSpacing: -0.3,
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
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 1,
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
    trendingCountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 2,
    },
    trendingCount: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },

    // Quick Access Hub (2x2 grid)
    quickAccessGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.xs,
        marginTop: spacing.md,
    },
    quickAccessCardWrap: {
        width: (SCREEN_WIDTH - spacing.xl * 2 - spacing.sm) / 2,
    },
    quickAccessCard: {
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        borderWidth: 1,
        padding: spacing.md,
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: 100,
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    quickAccessIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickAccessLabel: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',
    },

    // Category Grid
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    categoryCard: {
        width: (SCREEN_WIDTH - spacing.xl * 2 - spacing.sm * 3) / 4,
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xs,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border.subtle,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    categoryIcon: {
        width: 44,
        height: 44,
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
        fontFamily: 'Inter-SemiBold',
    },

    // Featured Posts (horizontal scroll)
    featuredScroll: {
        gap: spacing.sm,
        paddingEnd: spacing.xl,
    },
    featuredCard: {
        width: 220,
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    featuredMedia: {
        width: '100%',
        height: 120,
        backgroundColor: colors.obsidian[700],
    },
    featuredContent: {
        padding: spacing.md,
    },
    featuredText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        lineHeight: 18,
        marginBottom: spacing.sm,
    },
    featuredFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    featuredAuthor: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    featuredAuthorAvatar: {
        width: 18,
        height: 18,
        borderRadius: 9,
        marginEnd: 5,
    },
    featuredAuthorPlaceholder: {
        backgroundColor: colors.obsidian[500],
        alignItems: 'center',
        justifyContent: 'center',
    },
    featuredAuthorName: {
        fontSize: 11,
        color: colors.text.muted,
        fontWeight: '600',
        flex: 1,
    },
    featuredStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    featuredStatText: {
        fontSize: 10,
        color: colors.text.muted,
        fontWeight: '600',
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

    // Follow button in search results
    followBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: colors.gold[500],
        minWidth: 76,
        alignItems: 'center',
    },
    followBtnFollowing: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.border.default,
    },
    followBtnText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.text.inverse,
    },
    followBtnTextFollowing: {
        color: colors.text.secondary,
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
        marginBottom: spacing.lg,
    },
    noResultsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface.goldSubtle,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
    },
    noResultsBtnText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.gold[500],
    },

    // Error state
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: spacing.xl,
    },
    errorIconWrap: {
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
    errorTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
        marginBottom: spacing.xs,
        fontFamily: 'Inter-Bold',
    },
    errorSubtitle: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: spacing.lg,
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        backgroundColor: colors.gold[500],
        borderRadius: 20,
    },
    retryBtnText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // Offline Banner
    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        marginHorizontal: spacing.xl,
        marginTop: spacing.sm,
        backgroundColor: colors.coral[500] + '15',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.coral[500] + '30',
    },
    offlineBannerText: {
        fontSize: typography.fontSize.xs,
        color: colors.coral[400],
        fontWeight: '500',
    },

    // Discover Header
    discoverHeader: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xs,
    },
    discoverTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: -0.6,
        fontFamily: 'Inter-Bold',
    },
    discoverSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
        marginTop: spacing.xs,
        lineHeight: 20,
    },
});

