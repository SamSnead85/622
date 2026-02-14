import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';

const QURAN_API = 'https://api.quran.com/api/v4';

interface SearchResult {
    verseKey: string;
    text: string;
    surahName: string;
    verseNumber: number;
    surahNumber: number;
}

export default function QuranSearch() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const search = useCallback(async (q: string) => {
        if (!q.trim() || q.trim().length < 3) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await fetch(
                `${QURAN_API}/search?q=${encodeURIComponent(q.trim())}&size=20&language=en`
            );
            const json = await res.json();
            const searchResults = json.search?.results || [];

            setResults(searchResults.map((r: { verse_key?: string; text?: string; [key: string]: unknown }) => ({
                verseKey: r.verse_key,
                text: (r.text || '').replace(/<[^>]+>/g, ''),
                surahName: r.verse_key?.split(':')[0] || '',
                verseNumber: parseInt(r.verse_key?.split(':')[1] || '1'),
                surahNumber: parseInt(r.verse_key?.split(':')[0] || '1'),
            })));
        } catch (err) {
            if (__DEV__) console.error('Quran search error:', err);
        } finally {
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const handleQueryChange = (text: string) => {
        setQuery(text);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(text), 500);
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <View style={styles.searchBar}>
                    <Ionicons name="search-outline" size={16} color={colors.text.muted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search the Quran..."
                        placeholderTextColor={colors.text.muted}
                        value={query}
                        onChangeText={handleQueryChange}
                        autoFocus
                        returnKeyType="search"
                    />
                    {isSearching && <ActivityIndicator size="small" color={colors.gold[500]} />}
                </View>
            </View>

            {/* Results */}
            <FlatList
                data={results}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={5}
                initialNumToRender={10}
                renderItem={({ item }) => (
                    <Animated.View entering={FadeIn.duration(200)}>
                        <TouchableOpacity
                            style={styles.resultCard}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push(`/tools/quran/${item.surahNumber}` as any);
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.resultHeader}>
                                <View style={styles.verseBadge}>
                                    <Text style={styles.verseBadgeText}>{item.verseKey}</Text>
                                </View>
                            </View>
                            <Text style={styles.resultText} numberOfLines={3}>{item.text}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
                keyExtractor={(item) => item.verseKey}
                contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    !isSearching && query.length >= 3 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="search-outline" size={40} color={colors.text.muted} />
                            <Text style={styles.emptyText}>No results found</Text>
                        </View>
                    ) : !isSearching ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyHint}>Type at least 3 characters to search</Text>
                        </View>
                    ) : null
                }
            />
        </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center', justifyContent: 'center',
    },
    searchBar: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        backgroundColor: colors.surface.glass, borderRadius: 12,
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    searchInput: { flex: 1, fontSize: typography.fontSize.base, color: colors.text.primary },

    resultCard: {
        backgroundColor: colors.surface.glass, borderRadius: 14,
        padding: spacing.lg, marginBottom: spacing.sm,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
    verseBadge: {
        backgroundColor: colors.surface.goldSubtle,
        paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
        borderRadius: 8,
    },
    verseBadgeText: { fontSize: typography.fontSize.xs, fontWeight: '700', color: colors.gold[400] },
    resultText: { fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 22 },

    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyText: { fontSize: typography.fontSize.base, color: colors.text.muted, marginTop: spacing.md },
    emptyHint: { fontSize: typography.fontSize.sm, color: colors.text.muted },
});
