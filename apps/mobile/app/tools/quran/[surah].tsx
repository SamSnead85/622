import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Verse {
    number: number;
    text: string;
    translation: string;
}

const QURAN_API = 'https://api.quran.com/api/v4';

export default function SurahReader() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { surah } = useLocalSearchParams<{ surah: string }>();
    const surahNumber = parseInt(surah || '1', 10);

    const [verses, setVerses] = useState<Verse[]>([]);
    const [surahName, setSurahName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [currentVerse, setCurrentVerse] = useState<number | null>(null);

    const cacheKey = `quran_surah_${surahNumber}`;

    const fetchVerses = useCallback(async () => {
        try {
            // Check cache
            const cached = await AsyncStorage.getItem(cacheKey);
            if (cached) {
                const data = JSON.parse(cached);
                setVerses(data.verses);
                setSurahName(data.name);
                setIsLoading(false);
                return;
            }

            // Fetch Arabic text
            const arabicRes = await fetch(
                `${QURAN_API}/quran/verses/uthmani?chapter_number=${surahNumber}`
            );
            const arabicJson = await arabicRes.json();

            // Fetch English translation (Sahih International - id 131)
            const transRes = await fetch(
                `${QURAN_API}/quran/translations/131?chapter_number=${surahNumber}`
            );
            const transJson = await transRes.json();

            // Fetch surah info
            const infoRes = await fetch(`${QURAN_API}/chapters/${surahNumber}`);
            const infoJson = await infoRes.json();

            const arabicVerses = arabicJson.verses || [];
            const translations = transJson.translations || [];

            const versesData: Verse[] = arabicVerses.map((v: any, i: number) => ({
                number: v.verse_key ? parseInt(v.verse_key.split(':')[1]) : i + 1,
                text: v.text_uthmani || v.text || '',
                translation: translations[i]?.text?.replace(/<[^>]+>/g, '') || '',
            }));

            const name = infoJson.chapter?.name_simple || `Surah ${surahNumber}`;
            setSurahName(name);
            setVerses(versesData);

            // Cache
            await AsyncStorage.setItem(cacheKey, JSON.stringify({
                verses: versesData,
                name,
            }));
        } catch (err) {
            console.error('Quran fetch error:', err);
            Alert.alert('Error', 'Failed to load surah. Check your connection.');
        } finally {
            setIsLoading(false);
        }
    }, [surahNumber]);

    useEffect(() => {
        fetchVerses();
    }, [fetchVerses]);

    const renderVerse = ({ item }: { item: Verse }) => (
        <Animated.View entering={FadeIn.duration(300)}>
            <TouchableOpacity
                style={[styles.verseCard, currentVerse === item.number && styles.verseCardActive]}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCurrentVerse(currentVerse === item.number ? null : item.number);
                }}
                activeOpacity={0.8}
            >
                {/* Verse number */}
                <View style={styles.verseNumberBadge}>
                    <Text style={styles.verseNumber}>{item.number}</Text>
                </View>

                {/* Arabic text */}
                <Text style={styles.arabicText}>{item.text}</Text>

                {/* Translation */}
                <Text style={styles.translationText}>{item.translation}</Text>
            </TouchableOpacity>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], '#0D0D12']} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{surahName || `Surah ${surahNumber}`}</Text>
                    <Text style={styles.headerSubtitle}>{verses.length} verses</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.gold[500]} />
                    <Text style={styles.loadingText}>Loading surah...</Text>
                </View>
            ) : (
                <FlatList
                    data={verses}
                    renderItem={renderVerse}
                    keyExtractor={(item) => `${surahNumber}-${item.number}`}
                    contentContainerStyle={{
                        paddingHorizontal: spacing.lg,
                        paddingBottom: insets.bottom + 40,
                        paddingTop: spacing.md,
                    }}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        surahNumber !== 9 ? (
                            <View style={styles.bismillahHeader}>
                                <Text style={styles.bismillahArabic}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</Text>
                            </View>
                        ) : null
                    }
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={7}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: { alignItems: 'center', flex: 1 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
    headerSubtitle: { fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 2 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { color: colors.text.muted, marginTop: spacing.md },

    bismillahHeader: {
        alignItems: 'center', paddingVertical: spacing.xl,
        marginBottom: spacing.md,
    },
    bismillahArabic: {
        fontSize: 26, color: colors.gold[400], textAlign: 'center',
    },

    verseCard: {
        backgroundColor: colors.surface.glass,
        borderRadius: 14, padding: spacing.lg,
        marginBottom: spacing.sm, borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    verseCardActive: {
        borderColor: colors.gold[500] + '40',
        backgroundColor: colors.surface.goldSubtle,
    },
    verseNumberBadge: {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center', justifyContent: 'center',
        alignSelf: 'flex-end', marginBottom: spacing.sm,
    },
    verseNumber: { fontSize: 12, fontWeight: '700', color: colors.gold[400] },
    arabicText: {
        fontSize: 24, color: colors.text.primary,
        textAlign: 'right', lineHeight: 48,
        marginBottom: spacing.md, writingDirection: 'rtl',
    },
    translationText: {
        fontSize: typography.fontSize.sm, color: colors.text.secondary,
        lineHeight: 22,
    },
});
