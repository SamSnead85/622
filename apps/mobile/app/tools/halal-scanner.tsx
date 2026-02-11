import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { ScreenHeader } from '../../components';

// Known haram/doubtful ingredients (simplified list)
const HARAM_INGREDIENTS = [
    'pork', 'lard', 'gelatin', 'pepsin', 'carmine', 'cochineal', 'shellac',
    'l-cysteine', 'e120', 'e441', 'e542', 'animal fat', 'animal shortening',
    'bacon', 'ham', 'ethanol', 'wine', 'beer', 'rum', 'brandy', 'whiskey',
    'rennet', 'whey powder',
];

const DOUBTFUL_INGREDIENTS = [
    'mono and diglycerides', 'enzymes', 'emulsifiers', 'glycerin', 'glycerol',
    'lecithin', 'natural flavors', 'natural flavoring', 'vanilla extract',
    'e471', 'e472', 'e473', 'e474', 'e475', 'e476', 'e477',
];

type ScanResult = {
    status: 'halal' | 'haram' | 'doubtful' | 'unknown';
    productName: string;
    brand?: string;
    ingredients: string[];
    flaggedIngredients: string[];
    imageUrl?: string;
};

export default function HalalScannerScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [barcode, setBarcode] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const [lastScannedCode, setLastScannedCode] = useState('');

    const lookupProduct = useCallback(async (code: string) => {
        setIsScanning(true);
        setResult(null);
        setScanError(null);
        setLastScannedCode(code);
        try {
            // Open Food Facts API
            const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`);
            if (!res.ok) throw new Error(`Network error (${res.status})`);
            const json = await res.json();

            if (json?.status !== 1 || !json?.product) {
                setResult({
                    status: 'unknown',
                    productName: 'Product not found',
                    ingredients: [],
                    flaggedIngredients: [],
                });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                return;
            }

            const product = json.product;
            const ingredientsText = (product?.ingredients_text || '').toLowerCase();
            const ingredientsList = ingredientsText.split(/[,;]/).map((i: string) => i.trim()).filter(Boolean);

            // Check for haram ingredients
            const haramFound = HARAM_INGREDIENTS.filter(h => ingredientsText.includes(h));
            const doubtfulFound = DOUBTFUL_INGREDIENTS.filter(d => ingredientsText.includes(d));

            let status: 'halal' | 'haram' | 'doubtful' | 'unknown' = 'halal';
            if (haramFound.length > 0) status = 'haram';
            else if (doubtfulFound.length > 0) status = 'doubtful';
            else if (ingredientsList.length === 0) status = 'unknown';

            setResult({
                status,
                productName: product.product_name || 'Unknown Product',
                brand: product.brands || undefined,
                ingredients: ingredientsList.slice(0, 20),
                flaggedIngredients: [...haramFound, ...doubtfulFound],
                imageUrl: product.image_front_small_url || undefined,
            });

            Haptics.notificationAsync(
                status === 'halal' ? Haptics.NotificationFeedbackType.Success :
                    status === 'haram' ? Haptics.NotificationFeedbackType.Error :
                        Haptics.NotificationFeedbackType.Warning
            );
        } catch (err) {
            console.error('Halal scan error:', err);
            setScanError('Failed to look up product. Check your connection and try again.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsScanning(false);
        }
    }, []);

    const statusConfig = {
        halal: { color: colors.emerald[500], icon: 'checkmark-circle' as const, label: 'Likely Halal', bg: colors.emerald[500] + '15' },
        haram: { color: colors.coral[500], icon: 'close-circle' as const, label: 'Contains Haram', bg: colors.coral[500] + '15' },
        doubtful: { color: colors.amber[500], icon: 'alert-circle' as const, label: 'Doubtful (Mushbooh)', bg: colors.amber[500] + '15' },
        unknown: { color: colors.text.muted, icon: 'help-circle' as const, label: 'Unknown', bg: colors.surface.glass },
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            <ScreenHeader title="Halal Check" />

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
                {/* Barcode input */}
                <Animated.View entering={FadeInDown.duration(400)} style={styles.inputCard}>
                    <Text style={styles.inputLabel}>Enter Barcode Number</Text>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 5901234123457"
                            placeholderTextColor={colors.text.muted}
                            value={barcode}
                            onChangeText={setBarcode}
                            keyboardType="number-pad"
                            returnKeyType="search"
                            onSubmitEditing={() => barcode.trim() && lookupProduct(barcode.trim())}
                        />
                        <TouchableOpacity
                            style={[styles.searchBtn, !barcode.trim() && styles.searchBtnDisabled]}
                            onPress={() => barcode.trim() && lookupProduct(barcode.trim())}
                            disabled={!barcode.trim() || isScanning}
                        >
                            {isScanning ? (
                                <ActivityIndicator size="small" color={colors.obsidian[900]} />
                            ) : (
                                <Ionicons name="search" size={20} color={colors.obsidian[900]} />
                            )}
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.inputHint}>
                        Find the barcode number on the product packaging
                    </Text>
                </Animated.View>

                {/* Scan Error with Retry */}
                {scanError && !result && (
                    <Animated.View entering={FadeIn.duration(400)} style={styles.errorCard}>
                        <Ionicons name="cloud-offline-outline" size={24} color={colors.coral[400]} />
                        <Text style={styles.errorText}>{scanError}</Text>
                        <TouchableOpacity
                            style={styles.retryBtn}
                            onPress={() => lastScannedCode && lookupProduct(lastScannedCode)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="refresh" size={16} color={colors.obsidian[900]} />
                            <Text style={styles.retryBtnText}>Retry</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Result */}
                {result && (
                    <Animated.View entering={FadeIn.duration(500)} style={[styles.resultCard, { backgroundColor: statusConfig[result.status].bg }]}>
                        <View style={styles.resultHeader}>
                            <Ionicons
                                name={statusConfig[result.status].icon}
                                size={32}
                                color={statusConfig[result.status].color}
                            />
                            <View style={styles.resultInfo}>
                                <Text style={[styles.resultStatus, { color: statusConfig[result.status].color }]}>
                                    {statusConfig[result.status].label}
                                </Text>
                                <Text style={styles.resultProductName}>{result.productName}</Text>
                                {result.brand ? <Text style={styles.resultBrand}>{result.brand}</Text> : null}
                            </View>
                        </View>

                        {result.flaggedIngredients.length > 0 && (
                            <View style={styles.flaggedSection}>
                                <Text style={styles.flaggedTitle}>Flagged Ingredients</Text>
                                <View style={styles.flaggedList}>
                                    {result.flaggedIngredients.map(ing => (
                                        <View key={ing} style={styles.flaggedChip}>
                                            <Text style={styles.flaggedChipText}>{ing}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        <Text style={styles.disclaimer}>
                            For guidance only. Always verify with your local halal certification authority.
                        </Text>
                    </Animated.View>
                )}

                {/* Tip */}
                {!result && !isScanning && (
                    <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.tipCard}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.gold[400]} />
                        <Text style={styles.tipText}>
                            This tool checks product ingredients against a database of known haram and doubtful substances. It uses Open Food Facts data — a collaborative, open-source food product database.
                        </Text>
                    </Animated.View>
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
        borderWidth: 1, borderColor: colors.border.subtle,
        marginBottom: spacing.lg,
    },
    resultHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
    resultInfo: { flex: 1 },
    resultStatus: { fontSize: typography.fontSize.lg, fontWeight: '700' },
    resultProductName: { fontSize: typography.fontSize.base, color: colors.text.primary, marginTop: 4 },
    resultBrand: { fontSize: typography.fontSize.sm, color: colors.text.muted, marginTop: 2 },

    flaggedSection: { marginTop: spacing.md },
    flaggedTitle: { fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.text.secondary, marginBottom: spacing.sm },
    flaggedList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    flaggedChip: {
        backgroundColor: colors.coral[500] + '20', paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs, borderRadius: 8,
    },
    flaggedChipText: { fontSize: typography.fontSize.xs, color: colors.coral[400], fontWeight: '600' },

    disclaimer: {
        fontSize: typography.fontSize.xs, color: colors.text.muted,
        marginTop: spacing.md, lineHeight: 16,
    },

    errorCard: {
        alignItems: 'center',
        backgroundColor: colors.coral[500] + '10',
        borderRadius: 16,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.coral[500] + '25',
        marginBottom: spacing.lg,
        gap: spacing.md,
    },
    errorText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.gold[500],
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm + 2,
        borderRadius: 12,
    },
    retryBtnText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.obsidian[900],
    },

    tipCard: {
        flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
        backgroundColor: colors.surface.goldSubtle, borderRadius: 14,
        padding: spacing.lg, borderWidth: 1, borderColor: colors.gold[500] + '20',
    },
    tipText: { flex: 1, fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 20 },
});
