import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';

// Hardcoded surah list (~3KB, no API call needed)
const SURAHS = [
    { number: 1, name: 'Al-Fatihah', englishName: 'The Opening', versesCount: 7, revelationType: 'Meccan' },
    { number: 2, name: 'Al-Baqarah', englishName: 'The Cow', versesCount: 286, revelationType: 'Medinan' },
    { number: 3, name: 'Aal-E-Imran', englishName: 'Family of Imran', versesCount: 200, revelationType: 'Medinan' },
    { number: 4, name: 'An-Nisa', englishName: 'The Women', versesCount: 176, revelationType: 'Medinan' },
    { number: 5, name: 'Al-Ma\'idah', englishName: 'The Table Spread', versesCount: 120, revelationType: 'Medinan' },
    { number: 6, name: 'Al-An\'am', englishName: 'The Cattle', versesCount: 165, revelationType: 'Meccan' },
    { number: 7, name: 'Al-A\'raf', englishName: 'The Heights', versesCount: 206, revelationType: 'Meccan' },
    { number: 8, name: 'Al-Anfal', englishName: 'The Spoils of War', versesCount: 75, revelationType: 'Medinan' },
    { number: 9, name: 'At-Tawbah', englishName: 'The Repentance', versesCount: 129, revelationType: 'Medinan' },
    { number: 10, name: 'Yunus', englishName: 'Jonah', versesCount: 109, revelationType: 'Meccan' },
    { number: 11, name: 'Hud', englishName: 'Hud', versesCount: 123, revelationType: 'Meccan' },
    { number: 12, name: 'Yusuf', englishName: 'Joseph', versesCount: 111, revelationType: 'Meccan' },
    { number: 13, name: 'Ar-Ra\'d', englishName: 'The Thunder', versesCount: 43, revelationType: 'Medinan' },
    { number: 14, name: 'Ibrahim', englishName: 'Abraham', versesCount: 52, revelationType: 'Meccan' },
    { number: 15, name: 'Al-Hijr', englishName: 'The Rocky Tract', versesCount: 99, revelationType: 'Meccan' },
    { number: 16, name: 'An-Nahl', englishName: 'The Bee', versesCount: 128, revelationType: 'Meccan' },
    { number: 17, name: 'Al-Isra', englishName: 'The Night Journey', versesCount: 111, revelationType: 'Meccan' },
    { number: 18, name: 'Al-Kahf', englishName: 'The Cave', versesCount: 110, revelationType: 'Meccan' },
    { number: 19, name: 'Maryam', englishName: 'Mary', versesCount: 98, revelationType: 'Meccan' },
    { number: 20, name: 'Taha', englishName: 'Ta-Ha', versesCount: 135, revelationType: 'Meccan' },
    { number: 21, name: 'Al-Anbiya', englishName: 'The Prophets', versesCount: 112, revelationType: 'Meccan' },
    { number: 22, name: 'Al-Hajj', englishName: 'The Pilgrimage', versesCount: 78, revelationType: 'Medinan' },
    { number: 23, name: 'Al-Mu\'minun', englishName: 'The Believers', versesCount: 118, revelationType: 'Meccan' },
    { number: 24, name: 'An-Nur', englishName: 'The Light', versesCount: 64, revelationType: 'Medinan' },
    { number: 25, name: 'Al-Furqan', englishName: 'The Criterion', versesCount: 77, revelationType: 'Meccan' },
    { number: 26, name: 'Ash-Shu\'ara', englishName: 'The Poets', versesCount: 227, revelationType: 'Meccan' },
    { number: 27, name: 'An-Naml', englishName: 'The Ant', versesCount: 93, revelationType: 'Meccan' },
    { number: 28, name: 'Al-Qasas', englishName: 'The Stories', versesCount: 88, revelationType: 'Meccan' },
    { number: 29, name: 'Al-Ankabut', englishName: 'The Spider', versesCount: 69, revelationType: 'Meccan' },
    { number: 30, name: 'Ar-Rum', englishName: 'The Romans', versesCount: 60, revelationType: 'Meccan' },
    { number: 31, name: 'Luqman', englishName: 'Luqman', versesCount: 34, revelationType: 'Meccan' },
    { number: 32, name: 'As-Sajdah', englishName: 'The Prostration', versesCount: 30, revelationType: 'Meccan' },
    { number: 33, name: 'Al-Ahzab', englishName: 'The Combined Forces', versesCount: 73, revelationType: 'Medinan' },
    { number: 34, name: 'Saba', englishName: 'Sheba', versesCount: 54, revelationType: 'Meccan' },
    { number: 35, name: 'Fatir', englishName: 'Originator', versesCount: 45, revelationType: 'Meccan' },
    { number: 36, name: 'Ya-Sin', englishName: 'Ya Sin', versesCount: 83, revelationType: 'Meccan' },
    { number: 37, name: 'As-Saffat', englishName: 'Those in Ranks', versesCount: 182, revelationType: 'Meccan' },
    { number: 38, name: 'Sad', englishName: 'The Letter Sad', versesCount: 88, revelationType: 'Meccan' },
    { number: 39, name: 'Az-Zumar', englishName: 'The Troops', versesCount: 75, revelationType: 'Meccan' },
    { number: 40, name: 'Ghafir', englishName: 'The Forgiver', versesCount: 85, revelationType: 'Meccan' },
    { number: 41, name: 'Fussilat', englishName: 'Explained in Detail', versesCount: 54, revelationType: 'Meccan' },
    { number: 42, name: 'Ash-Shura', englishName: 'The Consultation', versesCount: 53, revelationType: 'Meccan' },
    { number: 43, name: 'Az-Zukhruf', englishName: 'The Ornaments of Gold', versesCount: 89, revelationType: 'Meccan' },
    { number: 44, name: 'Ad-Dukhan', englishName: 'The Smoke', versesCount: 59, revelationType: 'Meccan' },
    { number: 45, name: 'Al-Jathiyah', englishName: 'The Crouching', versesCount: 37, revelationType: 'Meccan' },
    { number: 46, name: 'Al-Ahqaf', englishName: 'The Wind-Curved Sandhills', versesCount: 35, revelationType: 'Meccan' },
    { number: 47, name: 'Muhammad', englishName: 'Muhammad', versesCount: 38, revelationType: 'Medinan' },
    { number: 48, name: 'Al-Fath', englishName: 'The Victory', versesCount: 29, revelationType: 'Medinan' },
    { number: 49, name: 'Al-Hujurat', englishName: 'The Rooms', versesCount: 18, revelationType: 'Medinan' },
    { number: 50, name: 'Qaf', englishName: 'The Letter Qaf', versesCount: 45, revelationType: 'Meccan' },
    { number: 51, name: 'Adh-Dhariyat', englishName: 'The Winnowing Winds', versesCount: 60, revelationType: 'Meccan' },
    { number: 52, name: 'At-Tur', englishName: 'The Mount', versesCount: 49, revelationType: 'Meccan' },
    { number: 53, name: 'An-Najm', englishName: 'The Star', versesCount: 62, revelationType: 'Meccan' },
    { number: 54, name: 'Al-Qamar', englishName: 'The Moon', versesCount: 55, revelationType: 'Meccan' },
    { number: 55, name: 'Ar-Rahman', englishName: 'The Beneficent', versesCount: 78, revelationType: 'Medinan' },
    { number: 56, name: 'Al-Waqi\'ah', englishName: 'The Inevitable', versesCount: 96, revelationType: 'Meccan' },
    { number: 57, name: 'Al-Hadid', englishName: 'The Iron', versesCount: 29, revelationType: 'Medinan' },
    { number: 58, name: 'Al-Mujadila', englishName: 'The Pleading Woman', versesCount: 22, revelationType: 'Medinan' },
    { number: 59, name: 'Al-Hashr', englishName: 'The Exile', versesCount: 24, revelationType: 'Medinan' },
    { number: 60, name: 'Al-Mumtahanah', englishName: 'She That is Examined', versesCount: 13, revelationType: 'Medinan' },
    { number: 61, name: 'As-Saf', englishName: 'The Ranks', versesCount: 14, revelationType: 'Medinan' },
    { number: 62, name: 'Al-Jumu\'ah', englishName: 'The Congregation', versesCount: 11, revelationType: 'Medinan' },
    { number: 63, name: 'Al-Munafiqun', englishName: 'The Hypocrites', versesCount: 11, revelationType: 'Medinan' },
    { number: 64, name: 'At-Taghabun', englishName: 'The Mutual Disillusion', versesCount: 18, revelationType: 'Medinan' },
    { number: 65, name: 'At-Talaq', englishName: 'The Divorce', versesCount: 12, revelationType: 'Medinan' },
    { number: 66, name: 'At-Tahrim', englishName: 'The Prohibition', versesCount: 12, revelationType: 'Medinan' },
    { number: 67, name: 'Al-Mulk', englishName: 'The Sovereignty', versesCount: 30, revelationType: 'Meccan' },
    { number: 68, name: 'Al-Qalam', englishName: 'The Pen', versesCount: 52, revelationType: 'Meccan' },
    { number: 69, name: 'Al-Haqqah', englishName: 'The Reality', versesCount: 52, revelationType: 'Meccan' },
    { number: 70, name: 'Al-Ma\'arij', englishName: 'The Ascending Stairways', versesCount: 44, revelationType: 'Meccan' },
    { number: 71, name: 'Nuh', englishName: 'Noah', versesCount: 28, revelationType: 'Meccan' },
    { number: 72, name: 'Al-Jinn', englishName: 'The Jinn', versesCount: 28, revelationType: 'Meccan' },
    { number: 73, name: 'Al-Muzzammil', englishName: 'The Enshrouded One', versesCount: 20, revelationType: 'Meccan' },
    { number: 74, name: 'Al-Muddaththir', englishName: 'The Cloaked One', versesCount: 56, revelationType: 'Meccan' },
    { number: 75, name: 'Al-Qiyamah', englishName: 'The Resurrection', versesCount: 40, revelationType: 'Meccan' },
    { number: 76, name: 'Al-Insan', englishName: 'The Man', versesCount: 31, revelationType: 'Medinan' },
    { number: 77, name: 'Al-Mursalat', englishName: 'The Emissaries', versesCount: 50, revelationType: 'Meccan' },
    { number: 78, name: 'An-Naba', englishName: 'The Tidings', versesCount: 40, revelationType: 'Meccan' },
    { number: 79, name: 'An-Nazi\'at', englishName: 'Those Who Drag Forth', versesCount: 46, revelationType: 'Meccan' },
    { number: 80, name: 'Abasa', englishName: 'He Frowned', versesCount: 42, revelationType: 'Meccan' },
    { number: 81, name: 'At-Takwir', englishName: 'The Overthrowing', versesCount: 29, revelationType: 'Meccan' },
    { number: 82, name: 'Al-Infitar', englishName: 'The Cleaving', versesCount: 19, revelationType: 'Meccan' },
    { number: 83, name: 'Al-Mutaffifin', englishName: 'The Defrauding', versesCount: 36, revelationType: 'Meccan' },
    { number: 84, name: 'Al-Inshiqaq', englishName: 'The Sundering', versesCount: 25, revelationType: 'Meccan' },
    { number: 85, name: 'Al-Buruj', englishName: 'The Mansions of the Stars', versesCount: 22, revelationType: 'Meccan' },
    { number: 86, name: 'At-Tariq', englishName: 'The Morning Star', versesCount: 17, revelationType: 'Meccan' },
    { number: 87, name: 'Al-A\'la', englishName: 'The Most High', versesCount: 19, revelationType: 'Meccan' },
    { number: 88, name: 'Al-Ghashiyah', englishName: 'The Overwhelming', versesCount: 26, revelationType: 'Meccan' },
    { number: 89, name: 'Al-Fajr', englishName: 'The Dawn', versesCount: 30, revelationType: 'Meccan' },
    { number: 90, name: 'Al-Balad', englishName: 'The City', versesCount: 20, revelationType: 'Meccan' },
    { number: 91, name: 'Ash-Shams', englishName: 'The Sun', versesCount: 15, revelationType: 'Meccan' },
    { number: 92, name: 'Al-Layl', englishName: 'The Night', versesCount: 21, revelationType: 'Meccan' },
    { number: 93, name: 'Ad-Duhaa', englishName: 'The Morning Hours', versesCount: 11, revelationType: 'Meccan' },
    { number: 94, name: 'Ash-Sharh', englishName: 'The Relief', versesCount: 8, revelationType: 'Meccan' },
    { number: 95, name: 'At-Tin', englishName: 'The Fig', versesCount: 8, revelationType: 'Meccan' },
    { number: 96, name: 'Al-Alaq', englishName: 'The Clot', versesCount: 19, revelationType: 'Meccan' },
    { number: 97, name: 'Al-Qadr', englishName: 'The Power', versesCount: 5, revelationType: 'Meccan' },
    { number: 98, name: 'Al-Bayyinah', englishName: 'The Clear Proof', versesCount: 8, revelationType: 'Medinan' },
    { number: 99, name: 'Az-Zalzalah', englishName: 'The Earthquake', versesCount: 8, revelationType: 'Medinan' },
    { number: 100, name: 'Al-Adiyat', englishName: 'The Chargers', versesCount: 11, revelationType: 'Meccan' },
    { number: 101, name: 'Al-Qari\'ah', englishName: 'The Calamity', versesCount: 11, revelationType: 'Meccan' },
    { number: 102, name: 'At-Takathur', englishName: 'The Rivalry in Worldly Increase', versesCount: 8, revelationType: 'Meccan' },
    { number: 103, name: 'Al-Asr', englishName: 'The Declining Day', versesCount: 3, revelationType: 'Meccan' },
    { number: 104, name: 'Al-Humazah', englishName: 'The Traducer', versesCount: 9, revelationType: 'Meccan' },
    { number: 105, name: 'Al-Fil', englishName: 'The Elephant', versesCount: 5, revelationType: 'Meccan' },
    { number: 106, name: 'Quraysh', englishName: 'Quraysh', versesCount: 4, revelationType: 'Meccan' },
    { number: 107, name: 'Al-Ma\'un', englishName: 'The Small Kindnesses', versesCount: 7, revelationType: 'Meccan' },
    { number: 108, name: 'Al-Kawthar', englishName: 'The Abundance', versesCount: 3, revelationType: 'Meccan' },
    { number: 109, name: 'Al-Kafirun', englishName: 'The Disbelievers', versesCount: 6, revelationType: 'Meccan' },
    { number: 110, name: 'An-Nasr', englishName: 'The Divine Support', versesCount: 3, revelationType: 'Medinan' },
    { number: 111, name: 'Al-Masad', englishName: 'The Palm Fiber', versesCount: 5, revelationType: 'Meccan' },
    { number: 112, name: 'Al-Ikhlas', englishName: 'The Sincerity', versesCount: 4, revelationType: 'Meccan' },
    { number: 113, name: 'Al-Falaq', englishName: 'The Daybreak', versesCount: 5, revelationType: 'Meccan' },
    { number: 114, name: 'An-Nas', englishName: 'Mankind', versesCount: 6, revelationType: 'Meccan' },
];

export default function QuranSurahList() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredSurahs = useMemo(() => {
        if (!searchQuery.trim()) return SURAHS;
        const q = searchQuery.toLowerCase();
        return SURAHS.filter(s =>
            s.name.toLowerCase().includes(q) ||
            s.englishName.toLowerCase().includes(q) ||
            s.number.toString() === q
        );
    }, [searchQuery]);

    const renderSurah = ({ item, index }: { item: typeof SURAHS[0]; index: number }) => (
        <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index * 30, 300))}>
            <TouchableOpacity
                style={styles.surahRow}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/tools/quran/${item.number}` as any);
                }}
                activeOpacity={0.7}
            >
                <View style={styles.surahNumber}>
                    <Text style={styles.surahNumberText}>{item.number}</Text>
                </View>
                <View style={styles.surahInfo}>
                    <Text style={styles.surahName}>{item.name}</Text>
                    <Text style={styles.surahEnglish}>{item.englishName}</Text>
                </View>
                <View style={styles.surahMeta}>
                    <Text style={styles.surahVerses}>{item.versesCount} verses</Text>
                    <Text style={styles.surahType}>{item.revelationType}</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Quran</Text>
                <TouchableOpacity
                    style={styles.searchIconBtn}
                    onPress={() => router.push('/tools/quran/search' as any)}
                >
                    <Ionicons name="search-outline" size={20} color={colors.text.primary} />
                </TouchableOpacity>
            </View>

            {/* Quick filter */}
            <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={16} color={colors.text.muted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search surahs..."
                    placeholderTextColor={colors.text.muted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Surah list */}
            <FlatList
                data={filteredSurahs}
                renderItem={renderSurah}
                keyExtractor={(item) => item.number.toString()}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
                initialNumToRender={20}
                maxToRenderPerBatch={15}
                windowSize={10}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text.primary, fontFamily: 'Inter-Bold' },
    searchIconBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center', justifyContent: 'center',
    },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        backgroundColor: colors.surface.glass, marginHorizontal: spacing.lg,
        borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
        borderWidth: 1, borderColor: colors.border.subtle,
        marginBottom: spacing.md,
    },
    searchInput: { flex: 1, fontSize: typography.fontSize.base, color: colors.text.primary },
    surahRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
    },
    surahNumber: {
        width: 40, height: 40, borderRadius: 10,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center', justifyContent: 'center',
    },
    surahNumberText: { fontSize: typography.fontSize.sm, fontWeight: '700', color: colors.gold[400] },
    surahInfo: { flex: 1, marginLeft: spacing.md },
    surahName: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary },
    surahEnglish: { fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 2 },
    surahMeta: { alignItems: 'flex-end' },
    surahVerses: { fontSize: typography.fontSize.xs, color: colors.text.muted },
    surahType: { fontSize: 10, color: colors.gold[500], marginTop: 2 },
});
