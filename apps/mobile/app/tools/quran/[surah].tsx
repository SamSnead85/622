import { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Dimensions,
    Animated as RNAnimated,
    RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenHeader, GlassCard } from '../../../components';

// ─── Types ─────────────────────────────────────────────────────────
interface Ayah {
    number: number;
    numberInSurah: number;
    text: string;
    translation: string;
}

interface SurahMeta {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    revelationType: string;
    numberOfAyahs: number;
}

// ─── Constants ─────────────────────────────────────────────────────
const API_BASE = 'https://api.alquran.cloud/v1';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';

// ─── Shimmer Skeleton ──────────────────────────────────────────────
function ShimmerBlock({
    width,
    height,
    borderRadius = 4,
    style,
}: {
    width: number | string;
    height: number;
    borderRadius?: number;
    style?: any;
}) {
    const shimmerAnim = useRef(new RNAnimated.Value(0)).current;

    useEffect(() => {
        RNAnimated.loop(
            RNAnimated.timing(shimmerAnim, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const translateX = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
    });

    return (
        <View
            style={[
                {
                    width: width as any,
                    height,
                    borderRadius,
                    backgroundColor: colors.obsidian[700],
                    overflow: 'hidden',
                },
                style,
            ]}
        >
            <RNAnimated.View
                style={{
                    ...StyleSheet.absoluteFillObject,
                    transform: [{ translateX }],
                }}
            >
                <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.04)', 'transparent']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{ width: SCREEN_WIDTH, height: '100%' }}
                />
            </RNAnimated.View>
        </View>
    );
}

function AyahSkeleton() {
    return (
        <View style={styles.skeletonCard}>
            {/* Number badge */}
            <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
                <ShimmerBlock width={36} height={36} borderRadius={18} />
            </View>
            {/* Arabic lines */}
            <ShimmerBlock width="100%" height={20} borderRadius={10} style={{ marginBottom: 10 }} />
            <ShimmerBlock width="80%" height={20} borderRadius={10} style={{ alignSelf: 'flex-end', marginBottom: spacing.lg }} />
            {/* Translation lines */}
            <ShimmerBlock width="90%" height={12} borderRadius={6} style={{ marginBottom: 6 }} />
            <ShimmerBlock width="70%" height={12} borderRadius={6} />
        </View>
    );
}

function SkeletonLoading() {
    return (
        <View style={styles.skeletonContainer}>
            {/* Header skeleton */}
            <View style={styles.skeletonHeader}>
                <ShimmerBlock width={180} height={28} borderRadius={14} style={{ alignSelf: 'center' }} />
                <ShimmerBlock width={120} height={16} borderRadius={8} style={{ alignSelf: 'center', marginTop: spacing.sm }} />
                <ShimmerBlock width={200} height={14} borderRadius={7} style={{ alignSelf: 'center', marginTop: spacing.sm }} />
            </View>
            {/* Ayah skeletons */}
            <AyahSkeleton />
            <AyahSkeleton />
            <AyahSkeleton />
        </View>
    );
}

// ─── Gold Diamond Badge ────────────────────────────────────────────
function AyahDiamond({ number }: { number: number }) {
    return (
        <View style={styles.diamondWrapper}>
            <View style={styles.diamondShape}>
                <LinearGradient
                    colors={[colors.gold[500] + '25', colors.gold[600] + '10']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <Text style={styles.diamondNumber}>{number}</Text>
            </View>
        </View>
    );
}

// ─── Main Screen ───────────────────────────────────────────────────
export default function SurahDetailScreen() {
    const insets = useSafeAreaInsets();
    const { surah } = useLocalSearchParams<{ surah: string }>();
    const surahNumber = parseInt(surah || '1', 10);

    const [ayahs, setAyahs] = useState<Ayah[]>([]);
    const [surahMeta, setSurahMeta] = useState<SurahMeta | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [bookmarkedAyah, setBookmarkedAyah] = useState<number | null>(null);
    const [activeAyah, setActiveAyah] = useState<number | null>(null);

    const flatListRef = useRef<FlatList>(null);
    const bookmarkKey = `@quran-bookmark-${surahNumber}`;

    // ── Load bookmark ──
    const loadBookmark = useCallback(async () => {
        try {
            const saved = await AsyncStorage.getItem(bookmarkKey);
            if (saved) {
                setBookmarkedAyah(parseInt(saved, 10));
                return parseInt(saved, 10);
            }
        } catch {
            // Silently fail
        }
        return null;
    }, [bookmarkKey]);

    // ── Save bookmark ──
    const saveBookmark = useCallback(
        async (ayahNumber: number) => {
            try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                await AsyncStorage.setItem(bookmarkKey, ayahNumber.toString());
                setBookmarkedAyah(ayahNumber);
            } catch {
                // Silently fail
            }
        },
        [bookmarkKey]
    );

    // ── Fetch surah data from Al-Quran Cloud API ──
    const fetchSurah = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(
                `${API_BASE}/surah/${surahNumber}/editions/quran-uthmani,en.sahih`
            );

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const json = await res.json();

            if (json.code !== 200 || !json.data || json.data.length < 2) {
                throw new Error('Invalid API response');
            }

            const arabicEdition = json.data[0];
            const englishEdition = json.data[1];

            // Extract surah metadata
            const meta: SurahMeta = {
                number: arabicEdition.number,
                name: arabicEdition.name,
                englishName: arabicEdition.englishName,
                englishNameTranslation: arabicEdition.englishNameTranslation,
                revelationType: arabicEdition.revelationType,
                numberOfAyahs: arabicEdition.numberOfAyahs,
            };
            setSurahMeta(meta);

            // Combine Arabic + English ayahs
            const arabicAyahs = arabicEdition.ayahs || [];
            const englishAyahs = englishEdition.ayahs || [];

            const combined: Ayah[] = arabicAyahs.map((a: any, i: number) => ({
                number: a.number,
                numberInSurah: a.numberInSurah,
                text: a.text,
                translation: englishAyahs[i]?.text || '',
            }));

            setAyahs(combined);

            // Load bookmark and auto-scroll
            const savedAyah = await loadBookmark();
            if (savedAyah && flatListRef.current) {
                const index = combined.findIndex((a) => a.numberInSurah === savedAyah);
                if (index > 0) {
                    // Short delay to ensure list is rendered
                    setTimeout(() => {
                        flatListRef.current?.scrollToIndex({
                            index,
                            animated: true,
                            viewPosition: 0.1,
                        });
                    }, 500);
                }
            }
        } catch (err: any) {
            console.error('Quran fetch error:', err);
            setError(err.message || 'Failed to load surah');
        } finally {
            setIsLoading(false);
            setIsRetrying(false);
        }
    }, [surahNumber, loadBookmark]);

    useEffect(() => {
        fetchSurah();
    }, [fetchSurah]);

    // ── Retry handler ──
    const handleRetry = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsRetrying(true);
        fetchSurah();
    }, [fetchSurah]);

    // ── Pull-to-refresh handler ──
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await fetchSurah();
        setIsRefreshing(false);
    }, [fetchSurah]);

    // ── Scroll failure handler ──
    const onScrollToIndexFailed = useCallback(
        (info: { index: number; averageItemLength: number }) => {
            const offset = info.averageItemLength * info.index;
            flatListRef.current?.scrollToOffset({ offset, animated: true });
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                    index: info.index,
                    animated: true,
                    viewPosition: 0.1,
                });
            }, 200);
        },
        []
    );

    // ── Surah Info Header ──
    const SurahInfoHeader = useCallback(() => {
        if (!surahMeta) return null;

        const isMeccan = surahMeta.revelationType === 'Meccan';

        return (
            <Animated.View entering={FadeIn.duration(500)}>
                {/* Surah info card */}
                <GlassCard style={styles.infoCard} padding="lg" gold>
                    <LinearGradient
                        colors={[colors.gold[500] + '08', 'transparent']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                    />

                    {/* Arabic surah name */}
                    <Text style={styles.surahArabicName}>{surahMeta.name}</Text>

                    {/* English name */}
                    <Text style={styles.surahEnglishName}>{surahMeta.englishName}</Text>
                    <Text style={styles.surahMeaning}>{surahMeta.englishNameTranslation}</Text>

                    {/* Metadata pills */}
                    <View style={styles.metaRow}>
                        <View style={styles.metaPill}>
                            <View
                                style={[
                                    styles.metaDot,
                                    {
                                        backgroundColor: isMeccan
                                            ? colors.gold[500]
                                            : colors.emerald[500],
                                    },
                                ]}
                            />
                            <Text style={styles.metaText}>{surahMeta.revelationType}</Text>
                        </View>

                        <View style={styles.metaDivider} />

                        <View style={styles.metaPill}>
                            <Ionicons
                                name="book-outline"
                                size={12}
                                color={colors.text.muted}
                            />
                            <Text style={styles.metaText}>
                                {surahMeta.numberOfAyahs} Ayahs
                            </Text>
                        </View>

                        <View style={styles.metaDivider} />

                        <View style={styles.metaPill}>
                            <Ionicons
                                name="layers-outline"
                                size={12}
                                color={colors.text.muted}
                            />
                            <Text style={styles.metaText}>Surah {surahMeta.number}</Text>
                        </View>
                    </View>

                    {/* Bookmark indicator */}
                    {bookmarkedAyah && (
                        <View style={styles.bookmarkIndicator}>
                            <Ionicons
                                name="bookmark"
                                size={12}
                                color={colors.gold[400]}
                            />
                            <Text style={styles.bookmarkIndicatorText}>
                                Bookmarked at Ayah {bookmarkedAyah}
                            </Text>
                        </View>
                    )}
                </GlassCard>

                {/* Bismillah */}
                {surahNumber !== 9 && (
                    <Animated.View
                        entering={FadeInDown.duration(600).delay(200)}
                        style={styles.bismillahContainer}
                    >
                        <View style={styles.bismillahLine} />
                        <Text style={styles.bismillahText}>{BISMILLAH}</Text>
                        <View style={styles.bismillahLine} />
                    </Animated.View>
                )}
            </Animated.View>
        );
    }, [surahMeta, surahNumber, bookmarkedAyah]);

    // ── Render single ayah ──
    const renderAyah = useCallback(
        ({ item, index }: { item: Ayah; index: number }) => {
            const isBookmarked = bookmarkedAyah === item.numberInSurah;
            const isActive = activeAyah === item.numberInSurah;

            return (
                <Animated.View
                    entering={FadeInDown.duration(300).delay(Math.min(index * 40, 300))}
                >
                    <TouchableOpacity
                        style={[
                            styles.ayahCard,
                            isActive && styles.ayahCardActive,
                            isBookmarked && styles.ayahCardBookmarked,
                        ]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveAyah(
                                activeAyah === item.numberInSurah
                                    ? null
                                    : item.numberInSurah
                            );
                        }}
                        activeOpacity={0.8}
                        accessibilityLabel={`Ayah ${item.numberInSurah}`}
                        accessibilityHint="Tap to expand, long press to bookmark"
                    >
                        {/* Top row: diamond badge + bookmark button */}
                        <View style={styles.ayahTopRow}>
                            <AyahDiamond number={item.numberInSurah} />

                            <TouchableOpacity
                                style={[
                                    styles.bookmarkBtn,
                                    isBookmarked && styles.bookmarkBtnActive,
                                ]}
                                onPress={() => saveBookmark(item.numberInSurah)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                accessibilityLabel={
                                    isBookmarked
                                        ? `Ayah ${item.numberInSurah} bookmarked`
                                        : `Bookmark ayah ${item.numberInSurah}`
                                }
                            >
                                <Ionicons
                                    name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                                    size={18}
                                    color={
                                        isBookmarked
                                            ? colors.gold[400]
                                            : colors.text.muted
                                    }
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Arabic text */}
                        <Text style={styles.arabicText}>{item.text}</Text>

                        {/* Divider */}
                        <View style={styles.ayahDivider} />

                        {/* English translation */}
                        <Text style={styles.translationText}>{item.translation}</Text>
                    </TouchableOpacity>
                </Animated.View>
            );
        },
        [bookmarkedAyah, activeAyah, saveBookmark]
    );

    // ── Error state ──
    if (error && !isLoading) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.obsidian[900], colors.obsidian[900]]}
                    style={StyleSheet.absoluteFill}
                />
                <ScreenHeader title={`Surah ${surahNumber}`} />

                <View style={styles.errorContainer}>
                    <Animated.View
                        entering={FadeIn.duration(400)}
                        style={styles.errorContent}
                    >
                        <View style={styles.errorIconCircle}>
                            <Ionicons
                                name="cloud-offline-outline"
                                size={36}
                                color={colors.text.muted}
                            />
                        </View>
                        <Text style={styles.errorTitle}>Unable to Load Surah</Text>
                        <Text style={styles.errorMessage}>
                            Please check your connection and try again.
                        </Text>
                        <TouchableOpacity
                            style={[
                                styles.retryButton,
                                isRetrying && styles.retryButtonDisabled,
                            ]}
                            onPress={handleRetry}
                            disabled={isRetrying}
                            activeOpacity={0.8}
                        >
                            <Ionicons
                                name="refresh"
                                size={16}
                                color={colors.obsidian[900]}
                            />
                            <Text style={styles.retryButtonText}>
                                {isRetrying ? 'Retrying...' : 'Tap to Retry'}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[900]]}
                style={StyleSheet.absoluteFill}
            />

            <ScreenHeader
                title={surahMeta?.englishName || `Surah ${surahNumber}`}
                noBorder
            />

            {isLoading ? (
                <SkeletonLoading />
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={ayahs}
                    renderItem={renderAyah}
                    keyExtractor={(item) => `ayah-${item.number}`}
                    contentContainerStyle={{
                        paddingHorizontal: spacing.lg,
                        paddingBottom: insets.bottom + 60,
                        paddingTop: spacing.sm,
                    }}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={true}
                    ListHeaderComponent={<SurahInfoHeader />}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={7}
                    onScrollToIndexFailed={onScrollToIndexFailed}
                    getItemLayout={undefined}
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.gold[500]} />}
                />
            )}
        </View>
    );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },

    // ── Skeleton ──
    skeletonContainer: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    skeletonHeader: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        marginBottom: spacing.lg,
    },
    skeletonCard: {
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },

    // ── Surah Info Header ──
    infoCard: {
        marginBottom: spacing.lg,
        alignItems: 'center',
        overflow: 'hidden',
    },
    surahArabicName: {
        fontSize: 34,
        color: colors.gold[400],
        textAlign: 'center',
        marginBottom: spacing.xs,
        lineHeight: 52,
    },
    surahEnglishName: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    surahMeaning: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        marginTop: 2,
        marginBottom: spacing.lg,
        fontStyle: 'italic',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface.glass,
        borderRadius: 12,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.md,
    },
    metaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    metaDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    metaText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        fontWeight: '600',
    },
    metaDivider: {
        width: 1,
        height: 14,
        backgroundColor: colors.border.subtle,
        marginHorizontal: spacing.md,
    },
    bookmarkIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: spacing.md,
        backgroundColor: colors.surface.goldSubtle,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: 8,
    },
    bookmarkIndicatorText: {
        fontSize: typography.fontSize.xs,
        color: colors.gold[400],
        fontWeight: '600',
    },

    // ── Bismillah ──
    bismillahContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        marginBottom: spacing.sm,
        flexDirection: 'row',
        gap: spacing.md,
    },
    bismillahLine: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.gold[500] + '30',
    },
    bismillahText: {
        fontSize: 26,
        color: colors.gold[400],
        textAlign: 'center',
        lineHeight: 44,
    },

    // ── Ayah Card ──
    ayahCard: {
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    ayahCardActive: {
        borderColor: colors.gold[500] + '40',
        backgroundColor: colors.surface.glassHover,
    },
    ayahCardBookmarked: {
        borderColor: colors.gold[500] + '30',
        backgroundColor: colors.surface.goldSubtle,
    },
    ayahTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },

    // ── Diamond Badge ──
    diamondWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    diamondShape: {
        width: 38,
        height: 38,
        borderRadius: 10,
        transform: [{ rotate: '45deg' }],
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
        overflow: 'hidden',
    },
    diamondNumber: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.gold[400],
        transform: [{ rotate: '-45deg' }],
    },

    // ── Bookmark Button ──
    bookmarkBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface.glass,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    bookmarkBtnActive: {
        backgroundColor: colors.surface.goldSubtle,
        borderColor: colors.gold[500] + '30',
    },

    // ── Arabic Text ──
    arabicText: {
        fontSize: 26,
        color: colors.text.primary,
        textAlign: 'right',
        lineHeight: 52,
        writingDirection: 'rtl',
        paddingVertical: spacing.sm,
        letterSpacing: 0,
    },

    // ── Divider ──
    ayahDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border.subtle,
        marginVertical: spacing.md,
    },

    // ── Translation Text ──
    translationText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        lineHeight: 22,
        textAlign: 'left',
    },

    // ── Error State ──
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    errorContent: {
        alignItems: 'center',
    },
    errorIconCircle: {
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
        marginBottom: spacing.sm,
    },
    errorMessage: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: spacing.xl,
        maxWidth: 260,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.gold[500],
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm + 2,
        borderRadius: 12,
    },
    retryButtonDisabled: {
        opacity: 0.6,
    },
    retryButtonText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.obsidian[900],
    },
});
