import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenHeader, LoadingView, RetryView } from '../../components';

const BOYCOTT_DATA_URL = 'https://raw.githubusercontent.com/TechForPalestine/boycott-israeli-consumer-goods-dataset/main/dataset/brands.json';
const BOYCOTT_CACHE_KEY = 'boycott_brands_cache';

interface BoycottBrand {
    name: string;
    description?: string;
    alternatives?: string[];
    categories?: string[];
    country?: string;
    reason?: string;
}

export default function BoycottScannerScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState('');
    const [brands, setBrands] = useState<BoycottBrand[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [result, setResult] = useState<{ found: boolean; brand?: BoycottBrand } | null>(null);

    // Load boycott dataset
    const loadBrands = useCallback(async (isRetry = false) => {
        try {
            if (isRetry) setIsRetrying(true);
            setError(null);

            // Check cache first
            const cached = await AsyncStorage.getItem(BOYCOTT_CACHE_KEY);
            if (cached) {
                try {
                    const { data, timestamp } = JSON.parse(cached);
                    // Refresh weekly
                    if (Array.isArray(data) && data.length > 0 && Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
                        setBrands(data);
                        setIsLoading(false);
                        setIsRetrying(false);
                        return;
                    }
                } catch { /* corrupted cache, ignore */ }
            }

            const res = await fetch(BOYCOTT_DATA_URL);
            if (!res.ok) throw new Error(`Network error: ${res.status}`);
            const json = await res.json();
            const brandList = Array.isArray(json) ? json : json.brands || json.data || [];

            if (brandList.length === 0) {
                throw new Error('Empty dataset received');
            }

            setBrands(brandList);

            // Cache
            await AsyncStorage.setItem(BOYCOTT_CACHE_KEY, JSON.stringify({
                data: brandList,
                timestamp: Date.now(),
            }));
        } catch (err) {
            if (__DEV__) console.error('Boycott data load error:', err);
            // Try to use cached data even if expired
            try {
                const cached = await AsyncStorage.getItem(BOYCOTT_CACHE_KEY);
                if (cached) {
                    const { data } = JSON.parse(cached);
                    if (Array.isArray(data) && data.length > 0) {
                        setBrands(data);
                        // Don't show error — we have stale data
                        return;
                    }
                }
            } catch { /* stale cache also failed */ }
            setError('Could not load the boycott database. Check your connection and try again.');
        } finally {
            setIsLoading(false);
            setIsRetrying(false);
        }
    }, []);

    useEffect(() => {
        loadBrands();
    }, [loadBrands]);

    const handleSearch = useCallback(() => {
        if (!searchQuery.trim()) return;

        const query = searchQuery.trim().toLowerCase();
        const found = brands.find(b =>
            (b.name || '').toLowerCase().includes(query) ||
            (b.description || '').toLowerCase().includes(query) ||
            (b.categories || []).some(c => (c || '').toLowerCase().includes(query))
        );

        setResult(found ? { found: true, brand: found } : { found: false });
        Haptics.notificationAsync(
            found ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success
        );
    }, [searchQuery, brands]);

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            <ScreenHeader title="Boycott Check" />

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
                {isLoading ? (
                    <LoadingView message="Loading boycott database..." />
                ) : error && brands.length === 0 ? (
                    <RetryView
                        message={error}
                        onRetry={() => loadBrands(true)}
                        isRetrying={isRetrying}
                    />
                ) : (
                    <>
                        {/* Search input */}
                        <Animated.View entering={FadeInDown.duration(400)} style={styles.inputCard}>
                            <Text style={styles.inputLabel}>Search Brand or Product</Text>
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Coca-Cola, Nestle..."
                                    placeholderTextColor={colors.text.muted}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    returnKeyType="search"
                                    onSubmitEditing={handleSearch}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    style={[styles.searchBtn, !searchQuery.trim() && styles.searchBtnDisabled]}
                                    onPress={handleSearch}
                                    disabled={!searchQuery.trim()}
                                >
                                    <Ionicons name="search" size={20} color={colors.text.inverse} />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.inputHint}>
                                {brands.length} brands in database • Updated weekly
                            </Text>
                        </Animated.View>

                        {/* Result */}
                        {result && (
                            <Animated.View entering={FadeIn.duration(500)}>
                                {result.found && result.brand ? (
                                    <View style={[styles.resultCard, styles.resultCardBoycott]}>
                                        <View style={styles.resultHeader}>
                                            <Ionicons name="alert-circle" size={32} color={colors.coral[500]} />
                                            <View style={styles.resultInfo}>
                                                <Text style={[styles.resultStatus, { color: colors.coral[500] }]}>
                                                    On Boycott List
                                                </Text>
                                                <Text style={styles.resultBrandName}>{result.brand.name}</Text>
                                            </View>
                                        </View>
                                        {result.brand.description && (
                                            <Text style={styles.resultDescription}>{result.brand.description}</Text>
                                        )}
                                        {result.brand.reason && (
                                            <View style={styles.reasonBox}>
                                                <Text style={styles.reasonLabel}>Reason</Text>
                                                <Text style={styles.reasonText}>{result.brand.reason}</Text>
                                            </View>
                                        )}
                                        {result.brand.alternatives && result.brand.alternatives.length > 0 && (
                                            <View style={styles.alternativesSection}>
                                                <Text style={styles.alternativesTitle}>Alternatives</Text>
                                                <View style={styles.alternativesList}>
                                                    {result.brand.alternatives.map(alt => (
                                                        <View key={alt} style={styles.altChip}>
                                                            <Ionicons name="checkmark-circle" size={14} color={colors.emerald[500]} />
                                                            <Text style={styles.altChipText}>{alt}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                ) : (
                                    <View style={[styles.resultCard, styles.resultCardClear]}>
                                        <Ionicons name="checkmark-circle" size={32} color={colors.emerald[500]} />
                                        <View style={styles.resultInfo}>
                                            <Text style={[styles.resultStatus, { color: colors.emerald[500] }]}>
                                                Not on Boycott List
                                            </Text>
                                            <Text style={styles.resultSubtext}>
                                                "{searchQuery}" was not found in the boycott database
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </Animated.View>
                        )}

                        {/* Source info */}
                        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.sourceCard}>
                            <Ionicons name="information-circle-outline" size={18} color={colors.gold[400]} />
                            <Text style={styles.sourceText}>
                                Data sourced from TechForPalestine open-source dataset. This is a community-maintained list and may not be comprehensive.
                            </Text>
                        </Animated.View>
                    </>
                )}
            </ScrollView>
        </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },

    inputCard: {
        backgroundColor: colors.surface.glass, borderRadius: 16,
        padding: spacing.lg, borderWidth: 1, borderColor: colors.border.subtle,
        marginBottom: spacing.lg,
    },
    inputLabel: { fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.text.primary, marginBottom: spacing.sm },
    inputRow: { flexDirection: 'row', gap: spacing.sm },
    input: {
        flex: 1, backgroundColor: colors.obsidian[700],
        borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
        fontSize: typography.fontSize.base, color: colors.text.primary,
        borderWidth: 1, borderColor: colors.border.subtle,
    },
    searchBtn: {
        width: 48, height: 48, borderRadius: 12,
        backgroundColor: colors.gold[500],
        alignItems: 'center', justifyContent: 'center',
    },
    searchBtnDisabled: { opacity: 0.4 },
    inputHint: { fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.sm },

    resultCard: {
        borderRadius: 16, padding: spacing.lg,
        borderWidth: 1, marginBottom: spacing.lg,
    },
    resultCardBoycott: {
        backgroundColor: colors.coral[500] + '10',
        borderColor: colors.coral[500] + '30',
    },
    resultCardClear: {
        backgroundColor: colors.emerald[500] + '10',
        borderColor: colors.emerald[500] + '30',
        flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    },
    resultHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
    resultInfo: { flex: 1 },
    resultStatus: { fontSize: typography.fontSize.lg, fontWeight: '700' },
    resultBrandName: { fontSize: typography.fontSize.base, color: colors.text.primary, fontWeight: '600', marginTop: 4 },
    resultSubtext: { fontSize: typography.fontSize.sm, color: colors.text.muted, marginTop: 4 },
    resultDescription: { fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 20, marginBottom: spacing.md },
    reasonBox: {
        backgroundColor: colors.coral[500] + '10',
        borderRadius: 10, padding: spacing.md, marginBottom: spacing.md,
    },
    reasonLabel: { fontSize: typography.fontSize.xs, fontWeight: '700', color: colors.coral[400], marginBottom: 4 },
    reasonText: { fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 18 },
    alternativesSection: { marginTop: spacing.sm },
    alternativesTitle: { fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.text.secondary, marginBottom: spacing.sm },
    alternativesList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    altChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: colors.emerald[500] + '15',
        paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 8,
    },
    altChipText: { fontSize: typography.fontSize.xs, color: colors.emerald[400], fontWeight: '600' },

    sourceCard: {
        flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
        backgroundColor: colors.surface.goldSubtle, borderRadius: 14,
        padding: spacing.lg, borderWidth: 1, borderColor: colors.gold[500] + '20',
    },
    sourceText: { flex: 1, fontSize: typography.fontSize.xs, color: colors.text.muted, lineHeight: 18 },
});
