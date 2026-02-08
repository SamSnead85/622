import { useState, useCallback } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API } from '../../lib/api';

interface SearchResult {
    id: string;
    type: 'user' | 'post' | 'community' | 'hashtag';
    title: string;
    subtitle?: string;
    avatarUrl?: string;
}

export default function SearchScreen() {
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = useCallback(async (text: string) => {
        setQuery(text);

        if (text.trim().length < 2) {
            setResults([]);
            setHasSearched(false);
            return;
        }

        setIsSearching(true);
        setHasSearched(true);

        try {
            const data = await apiFetch<any>(
                `${API.search}?q=${encodeURIComponent(text.trim())}`
            );

            const formatted: SearchResult[] = [];

            // Map users
            if (data.users) {
                data.users.forEach((u: any) => {
                    formatted.push({
                        id: u.id,
                        type: 'user',
                        title: u.displayName || u.username,
                        subtitle: `@${u.username}`,
                        avatarUrl: u.avatarUrl,
                    });
                });
            }

            // Map communities
            if (data.communities) {
                data.communities.forEach((c: any) => {
                    formatted.push({
                        id: c.id,
                        type: 'community',
                        title: c.name,
                        subtitle: `${c.membersCount || 0} members`,
                        avatarUrl: c.avatarUrl,
                    });
                });
            }

            // Map posts
            if (data.posts) {
                data.posts.forEach((p: any) => {
                    formatted.push({
                        id: p.id,
                        type: 'post',
                        title: p.content?.substring(0, 100) || 'Post',
                        subtitle: `by ${p.author?.displayName || 'Unknown'}`,
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

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'user': return '👤';
            case 'community': return '👥';
            case 'post': return '📝';
            case 'hashtag': return '#';
            default: return '🔍';
        }
    };

    const renderResult = ({ item }: { item: SearchResult }) => (
        <TouchableOpacity
            style={styles.resultRow}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
            {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={styles.resultAvatar} />
            ) : (
                <View style={[styles.resultAvatar, styles.resultAvatarPlaceholder]}>
                    <Text style={styles.resultTypeIcon}>{getTypeIcon(item.type)}</Text>
                </View>
            )}
            <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                {item.subtitle && (
                    <Text style={styles.resultSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                )}
            </View>
            <View style={styles.resultTypeBadge}>
                <Text style={styles.resultTypeText}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <Text style={styles.headerTitle}>Search</Text>

                {/* Search input */}
                <View style={styles.searchContainer}>
                    <Text style={styles.searchIcon}>🔍</Text>
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
                        <TouchableOpacity
                            onPress={() => {
                                setQuery('');
                                setResults([]);
                                setHasSearched(false);
                            }}
                        >
                            <Text style={styles.clearIcon}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Results */}
            {isSearching ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.gold[500]} />
                </View>
            ) : hasSearched && results.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>🔍</Text>
                    <Text style={styles.emptyText}>No results found</Text>
                </View>
            ) : !hasSearched ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>🔍</Text>
                    <Text style={styles.emptyTitle}>Find your people</Text>
                    <Text style={styles.emptyText}>
                        Search for friends, communities, or topics
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={results}
                    renderItem={renderResult}
                    keyExtractor={(item) => `${item.type}-${item.id}`}
                    contentContainerStyle={{
                        paddingHorizontal: spacing.lg,
                        paddingBottom: insets.bottom + 100,
                    }}
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
        borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: -1,
        marginBottom: spacing.md,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 14,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    searchIcon: { fontSize: 16, marginRight: spacing.sm },
    searchInput: {
        flex: 1,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        paddingVertical: spacing.md,
    },
    clearIcon: { fontSize: 14, color: colors.text.muted, padding: spacing.sm },

    // Loading
    loadingContainer: { flex: 1, alignItems: 'center', paddingTop: 40 },

    // Empty
    emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
    emptyTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        paddingHorizontal: spacing['2xl'],
    },

    // Results
    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    },
    resultAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    resultAvatarPlaceholder: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    resultTypeIcon: { fontSize: 18 },
    resultInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    resultTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
    resultSubtitle: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginTop: 2,
    },
    resultTypeBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 6,
    },
    resultTypeText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
});
