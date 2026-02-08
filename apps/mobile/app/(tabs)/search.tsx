import { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API } from '../../lib/api';

interface SearchResult {
    id: string;
    type: 'user' | 'post' | 'community' | 'hashtag';
    title: string;
    subtitle?: string;
    avatarUrl?: string;
}

type FilterTab = 'all' | 'people' | 'posts' | 'communities';

const DISCOVERY_CATEGORIES = [
    { icon: 'trending-up' as const, label: 'Trending', color: colors.coral[500] },
    { icon: 'people' as const, label: 'People', color: colors.azure[500] },
    { icon: 'globe-outline' as const, label: 'Communities', color: colors.emerald[500] },
    { icon: 'sparkles' as const, label: 'New', color: colors.gold[500] },
];

export default function SearchScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced search
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
                        id: u.id, type: 'user',
                        title: u.displayName || u.username,
                        subtitle: `@${u.username}`,
                        avatarUrl: u.avatarUrl,
                    });
                });
            }
            if (data.communities) {
                data.communities.forEach((c: any) => {
                    formatted.push({
                        id: c.id, type: 'community',
                        title: c.name,
                        subtitle: `${c.membersCount || 0} members`,
                        avatarUrl: c.avatarUrl,
                    });
                });
            }
            if (data.posts) {
                data.posts.forEach((p: any) => {
                    formatted.push({
                        id: p.id, type: 'post',
                        title: (p.caption || p.content || '').substring(0, 100) || 'Post',
                        subtitle: `by ${p.user?.displayName || p.author?.displayName || 'Unknown'}`,
                    });
                });
            }

            setResults(formatted);
        } catch {
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handleSearch = useCallback((text: string) => {
        setQuery(text);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(text), 500);
    }, [doSearch]);

    useEffect(() => {
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, []);

    const getTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
        switch (type) {
            case 'user': return 'person-outline';
            case 'community': return 'people-outline';
            case 'post': return 'document-text-outline';
            case 'hashtag': return 'pricetag-outline';
            default: return 'search-outline';
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

    // Filter results
    const filteredResults = activeFilter === 'all'
        ? results
        : results.filter((r) => {
            if (activeFilter === 'people') return r.type === 'user';
            if (activeFilter === 'posts') return r.type === 'post';
            if (activeFilter === 'communities') return r.type === 'community';
            return true;
        });

    const renderResult = ({ item }: { item: SearchResult }) => (
        <Animated.View entering={FadeInDown.duration(200)}>
            <TouchableOpacity style={styles.resultRow} onPress={() => handleResultPress(item)}>
                {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={styles.resultAvatar} />
                ) : (
                    <View style={[styles.resultAvatar, styles.resultAvatarPlaceholder]}>
                        <Ionicons name={getTypeIcon(item.type)} size={20} color={colors.text.secondary} />
                    </View>
                )}
                <View style={styles.resultInfo}>
                    <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                    {item.subtitle && <Text style={styles.resultSubtitle} numberOfLines={1}>{item.subtitle}</Text>}
                </View>
                <View style={styles.resultTypeBadge}>
                    <Text style={styles.resultTypeText}>
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );

    const renderDiscovery = () => (
        <View style={styles.discoveryContainer}>
            <Text style={styles.discoveryTitle}>Discover</Text>
            <View style={styles.categoryGrid}>
                {DISCOVERY_CATEGORIES.map((cat) => (
                    <TouchableOpacity key={cat.label} style={styles.categoryCard} activeOpacity={0.8}>
                        <View style={[styles.categoryIcon, { backgroundColor: `${cat.color}15` }]}>
                            <Ionicons name={cat.icon} size={24} color={cat.color} />
                        </View>
                        <Text style={styles.categoryLabel}>{cat.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.suggestedSection}>
                <Text style={styles.suggestedTitle}>Suggested for you</Text>
                <Text style={styles.suggestedSubtitle}>Follow people to fill your feed</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <Text style={styles.headerTitle}>Search</Text>

                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={18} color={colors.text.muted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search people, posts, communities..."
                        placeholderTextColor={colors.text.muted}
                        value={query}
                        onChangeText={handleSearch}
                        returnKeyType="search"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setHasSearched(false); }}>
                            <Ionicons name="close-circle" size={18} color={colors.text.muted} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filter tabs */}
                {hasSearched && (
                    <View style={styles.filterTabs}>
                        {(['all', 'people', 'posts', 'communities'] as FilterTab[]).map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.filterTab, activeFilter === tab && styles.filterTabActive]}
                                onPress={() => setActiveFilter(tab)}
                            >
                                <Text style={[styles.filterTabText, activeFilter === tab && styles.filterTabTextActive]}>
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {/* Results */}
            {isSearching ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.gold[500]} />
                </View>
            ) : hasSearched && filteredResults.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={48} color={colors.text.muted} />
                    <Text style={styles.emptyText}>No results found</Text>
                </View>
            ) : !hasSearched ? (
                renderDiscovery()
            ) : (
                <FlatList
                    data={filteredResults}
                    renderItem={renderResult}
                    keyExtractor={(item) => `${item.type}-${item.id}`}
                    contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 100 }}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    header: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    headerTitle: {
        fontSize: 34, fontWeight: '700', color: colors.text.primary,
        letterSpacing: -1, marginBottom: spacing.md, fontFamily: 'Inter-Bold',
    },
    searchContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface.glassHover, borderRadius: 14,
        paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border.subtle,
        gap: spacing.sm,
    },
    searchInput: { flex: 1, fontSize: typography.fontSize.base, color: colors.text.primary, paddingVertical: spacing.md },
    filterTabs: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm },
    filterTab: {
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderRadius: 20, backgroundColor: colors.surface.glass,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    filterTabActive: { backgroundColor: 'rgba(212, 175, 55, 0.15)', borderColor: colors.gold[500] },
    filterTabText: { fontSize: typography.fontSize.sm, color: colors.text.muted, fontWeight: '500' },
    filterTabTextActive: { color: colors.gold[500] },
    loadingContainer: { flex: 1, alignItems: 'center', paddingTop: 40 },
    emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 80 },
    emptyText: { fontSize: typography.fontSize.base, color: colors.text.secondary, marginTop: spacing.lg },

    // Discovery
    discoveryContainer: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
    discoveryTitle: { fontSize: typography.fontSize.xl, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.lg, fontFamily: 'Inter-Bold' },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    categoryCard: {
        width: '47%', backgroundColor: colors.surface.glass,
        borderRadius: 16, padding: spacing.lg,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    categoryIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
    categoryLabel: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary },
    suggestedSection: { marginTop: spacing['2xl'] },
    suggestedTitle: { fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.text.primary, fontFamily: 'Inter-Bold' },
    suggestedSubtitle: { fontSize: typography.fontSize.sm, color: colors.text.muted, marginTop: spacing.xs },

    // Results
    resultRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.surface.glass,
    },
    resultAvatar: { width: 44, height: 44, borderRadius: 22 },
    resultAvatarPlaceholder: { backgroundColor: colors.surface.glassHover, alignItems: 'center', justifyContent: 'center' },
    resultInfo: { flex: 1, marginLeft: spacing.md },
    resultTitle: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary },
    resultSubtitle: { fontSize: typography.fontSize.sm, color: colors.text.muted, marginTop: 2 },
    resultTypeBadge: { backgroundColor: colors.surface.glassHover, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 6 },
    resultTypeText: { fontSize: typography.fontSize.xs, color: colors.text.muted },
});
