import { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { ScreenHeader, GlassCard } from '../../../components';

// ─── Juz → Surah mapping (start surah of each juz) ───────────────
const JUZ_STARTS: Record<number, number> = {
    1: 1, 2: 2, 3: 2, 4: 3, 5: 4, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8,
    11: 9, 12: 11, 13: 12, 14: 15, 15: 17, 16: 18, 17: 21, 18: 23,
    19: 25, 20: 27, 21: 29, 22: 33, 23: 36, 24: 39, 25: 41, 26: 46,
    27: 51, 28: 58, 29: 67, 30: 78,
};

function getSurahJuz(surahNum: number): number {
    let juz = 1;
    for (let j = 30; j >= 1; j--) {
        if (surahNum >= JUZ_STARTS[j]) { juz = j; break; }
    }
    return juz;
}

// ─── Surah data with Arabic names ─────────────────────────────────
const SURAHS = [
    { number: 1, name: 'Al-Fatihah', arabic: 'الفاتحة', englishName: 'The Opening', versesCount: 7, revelationType: 'Meccan' },
    { number: 2, name: 'Al-Baqarah', arabic: 'البقرة', englishName: 'The Cow', versesCount: 286, revelationType: 'Medinan' },
    { number: 3, name: 'Aal-E-Imran', arabic: 'آل عمران', englishName: 'Family of Imran', versesCount: 200, revelationType: 'Medinan' },
    { number: 4, name: 'An-Nisa', arabic: 'النساء', englishName: 'The Women', versesCount: 176, revelationType: 'Medinan' },
    { number: 5, name: 'Al-Ma\'idah', arabic: 'المائدة', englishName: 'The Table Spread', versesCount: 120, revelationType: 'Medinan' },
    { number: 6, name: 'Al-An\'am', arabic: 'الأنعام', englishName: 'The Cattle', versesCount: 165, revelationType: 'Meccan' },
    { number: 7, name: 'Al-A\'raf', arabic: 'الأعراف', englishName: 'The Heights', versesCount: 206, revelationType: 'Meccan' },
    { number: 8, name: 'Al-Anfal', arabic: 'الأنفال', englishName: 'The Spoils of War', versesCount: 75, revelationType: 'Medinan' },
    { number: 9, name: 'At-Tawbah', arabic: 'التوبة', englishName: 'The Repentance', versesCount: 129, revelationType: 'Medinan' },
    { number: 10, name: 'Yunus', arabic: 'يونس', englishName: 'Jonah', versesCount: 109, revelationType: 'Meccan' },
    { number: 11, name: 'Hud', arabic: 'هود', englishName: 'Hud', versesCount: 123, revelationType: 'Meccan' },
    { number: 12, name: 'Yusuf', arabic: 'يوسف', englishName: 'Joseph', versesCount: 111, revelationType: 'Meccan' },
    { number: 13, name: 'Ar-Ra\'d', arabic: 'الرعد', englishName: 'The Thunder', versesCount: 43, revelationType: 'Medinan' },
    { number: 14, name: 'Ibrahim', arabic: 'إبراهيم', englishName: 'Abraham', versesCount: 52, revelationType: 'Meccan' },
    { number: 15, name: 'Al-Hijr', arabic: 'الحجر', englishName: 'The Rocky Tract', versesCount: 99, revelationType: 'Meccan' },
    { number: 16, name: 'An-Nahl', arabic: 'النحل', englishName: 'The Bee', versesCount: 128, revelationType: 'Meccan' },
    { number: 17, name: 'Al-Isra', arabic: 'الإسراء', englishName: 'The Night Journey', versesCount: 111, revelationType: 'Meccan' },
    { number: 18, name: 'Al-Kahf', arabic: 'الكهف', englishName: 'The Cave', versesCount: 110, revelationType: 'Meccan' },
    { number: 19, name: 'Maryam', arabic: 'مريم', englishName: 'Mary', versesCount: 98, revelationType: 'Meccan' },
    { number: 20, name: 'Taha', arabic: 'طه', englishName: 'Ta-Ha', versesCount: 135, revelationType: 'Meccan' },
    { number: 21, name: 'Al-Anbiya', arabic: 'الأنبياء', englishName: 'The Prophets', versesCount: 112, revelationType: 'Meccan' },
    { number: 22, name: 'Al-Hajj', arabic: 'الحج', englishName: 'The Pilgrimage', versesCount: 78, revelationType: 'Medinan' },
    { number: 23, name: 'Al-Mu\'minun', arabic: 'المؤمنون', englishName: 'The Believers', versesCount: 118, revelationType: 'Meccan' },
    { number: 24, name: 'An-Nur', arabic: 'النور', englishName: 'The Light', versesCount: 64, revelationType: 'Medinan' },
    { number: 25, name: 'Al-Furqan', arabic: 'الفرقان', englishName: 'The Criterion', versesCount: 77, revelationType: 'Meccan' },
    { number: 26, name: 'Ash-Shu\'ara', arabic: 'الشعراء', englishName: 'The Poets', versesCount: 227, revelationType: 'Meccan' },
    { number: 27, name: 'An-Naml', arabic: 'النمل', englishName: 'The Ant', versesCount: 93, revelationType: 'Meccan' },
    { number: 28, name: 'Al-Qasas', arabic: 'القصص', englishName: 'The Stories', versesCount: 88, revelationType: 'Meccan' },
    { number: 29, name: 'Al-Ankabut', arabic: 'العنكبوت', englishName: 'The Spider', versesCount: 69, revelationType: 'Meccan' },
    { number: 30, name: 'Ar-Rum', arabic: 'الروم', englishName: 'The Romans', versesCount: 60, revelationType: 'Meccan' },
    { number: 31, name: 'Luqman', arabic: 'لقمان', englishName: 'Luqman', versesCount: 34, revelationType: 'Meccan' },
    { number: 32, name: 'As-Sajdah', arabic: 'السجدة', englishName: 'The Prostration', versesCount: 30, revelationType: 'Meccan' },
    { number: 33, name: 'Al-Ahzab', arabic: 'الأحزاب', englishName: 'The Combined Forces', versesCount: 73, revelationType: 'Medinan' },
    { number: 34, name: 'Saba', arabic: 'سبأ', englishName: 'Sheba', versesCount: 54, revelationType: 'Meccan' },
    { number: 35, name: 'Fatir', arabic: 'فاطر', englishName: 'Originator', versesCount: 45, revelationType: 'Meccan' },
    { number: 36, name: 'Ya-Sin', arabic: 'يس', englishName: 'Ya Sin', versesCount: 83, revelationType: 'Meccan' },
    { number: 37, name: 'As-Saffat', arabic: 'الصافات', englishName: 'Those in Ranks', versesCount: 182, revelationType: 'Meccan' },
    { number: 38, name: 'Sad', arabic: 'ص', englishName: 'The Letter Sad', versesCount: 88, revelationType: 'Meccan' },
    { number: 39, name: 'Az-Zumar', arabic: 'الزمر', englishName: 'The Troops', versesCount: 75, revelationType: 'Meccan' },
    { number: 40, name: 'Ghafir', arabic: 'غافر', englishName: 'The Forgiver', versesCount: 85, revelationType: 'Meccan' },
    { number: 41, name: 'Fussilat', arabic: 'فصلت', englishName: 'Explained in Detail', versesCount: 54, revelationType: 'Meccan' },
    { number: 42, name: 'Ash-Shura', arabic: 'الشورى', englishName: 'The Consultation', versesCount: 53, revelationType: 'Meccan' },
    { number: 43, name: 'Az-Zukhruf', arabic: 'الزخرف', englishName: 'The Ornaments of Gold', versesCount: 89, revelationType: 'Meccan' },
    { number: 44, name: 'Ad-Dukhan', arabic: 'الدخان', englishName: 'The Smoke', versesCount: 59, revelationType: 'Meccan' },
    { number: 45, name: 'Al-Jathiyah', arabic: 'الجاثية', englishName: 'The Crouching', versesCount: 37, revelationType: 'Meccan' },
    { number: 46, name: 'Al-Ahqaf', arabic: 'الأحقاف', englishName: 'The Wind-Curved Sandhills', versesCount: 35, revelationType: 'Meccan' },
    { number: 47, name: 'Muhammad', arabic: 'محمد', englishName: 'Muhammad', versesCount: 38, revelationType: 'Medinan' },
    { number: 48, name: 'Al-Fath', arabic: 'الفتح', englishName: 'The Victory', versesCount: 29, revelationType: 'Medinan' },
    { number: 49, name: 'Al-Hujurat', arabic: 'الحجرات', englishName: 'The Rooms', versesCount: 18, revelationType: 'Medinan' },
    { number: 50, name: 'Qaf', arabic: 'ق', englishName: 'The Letter Qaf', versesCount: 45, revelationType: 'Meccan' },
    { number: 51, name: 'Adh-Dhariyat', arabic: 'الذاريات', englishName: 'The Winnowing Winds', versesCount: 60, revelationType: 'Meccan' },
    { number: 52, name: 'At-Tur', arabic: 'الطور', englishName: 'The Mount', versesCount: 49, revelationType: 'Meccan' },
    { number: 53, name: 'An-Najm', arabic: 'النجم', englishName: 'The Star', versesCount: 62, revelationType: 'Meccan' },
    { number: 54, name: 'Al-Qamar', arabic: 'القمر', englishName: 'The Moon', versesCount: 55, revelationType: 'Meccan' },
    { number: 55, name: 'Ar-Rahman', arabic: 'الرحمن', englishName: 'The Beneficent', versesCount: 78, revelationType: 'Medinan' },
    { number: 56, name: 'Al-Waqi\'ah', arabic: 'الواقعة', englishName: 'The Inevitable', versesCount: 96, revelationType: 'Meccan' },
    { number: 57, name: 'Al-Hadid', arabic: 'الحديد', englishName: 'The Iron', versesCount: 29, revelationType: 'Medinan' },
    { number: 58, name: 'Al-Mujadila', arabic: 'المجادلة', englishName: 'The Pleading Woman', versesCount: 22, revelationType: 'Medinan' },
    { number: 59, name: 'Al-Hashr', arabic: 'الحشر', englishName: 'The Exile', versesCount: 24, revelationType: 'Medinan' },
    { number: 60, name: 'Al-Mumtahanah', arabic: 'الممتحنة', englishName: 'She That is Examined', versesCount: 13, revelationType: 'Medinan' },
    { number: 61, name: 'As-Saf', arabic: 'الصف', englishName: 'The Ranks', versesCount: 14, revelationType: 'Medinan' },
    { number: 62, name: 'Al-Jumu\'ah', arabic: 'الجمعة', englishName: 'The Congregation', versesCount: 11, revelationType: 'Medinan' },
    { number: 63, name: 'Al-Munafiqun', arabic: 'المنافقون', englishName: 'The Hypocrites', versesCount: 11, revelationType: 'Medinan' },
    { number: 64, name: 'At-Taghabun', arabic: 'التغابن', englishName: 'The Mutual Disillusion', versesCount: 18, revelationType: 'Medinan' },
    { number: 65, name: 'At-Talaq', arabic: 'الطلاق', englishName: 'The Divorce', versesCount: 12, revelationType: 'Medinan' },
    { number: 66, name: 'At-Tahrim', arabic: 'التحريم', englishName: 'The Prohibition', versesCount: 12, revelationType: 'Medinan' },
    { number: 67, name: 'Al-Mulk', arabic: 'الملك', englishName: 'The Sovereignty', versesCount: 30, revelationType: 'Meccan' },
    { number: 68, name: 'Al-Qalam', arabic: 'القلم', englishName: 'The Pen', versesCount: 52, revelationType: 'Meccan' },
    { number: 69, name: 'Al-Haqqah', arabic: 'الحاقة', englishName: 'The Reality', versesCount: 52, revelationType: 'Meccan' },
    { number: 70, name: 'Al-Ma\'arij', arabic: 'المعارج', englishName: 'The Ascending Stairways', versesCount: 44, revelationType: 'Meccan' },
    { number: 71, name: 'Nuh', arabic: 'نوح', englishName: 'Noah', versesCount: 28, revelationType: 'Meccan' },
    { number: 72, name: 'Al-Jinn', arabic: 'الجن', englishName: 'The Jinn', versesCount: 28, revelationType: 'Meccan' },
    { number: 73, name: 'Al-Muzzammil', arabic: 'المزمل', englishName: 'The Enshrouded One', versesCount: 20, revelationType: 'Meccan' },
    { number: 74, name: 'Al-Muddaththir', arabic: 'المدثر', englishName: 'The Cloaked One', versesCount: 56, revelationType: 'Meccan' },
    { number: 75, name: 'Al-Qiyamah', arabic: 'القيامة', englishName: 'The Resurrection', versesCount: 40, revelationType: 'Meccan' },
    { number: 76, name: 'Al-Insan', arabic: 'الإنسان', englishName: 'The Man', versesCount: 31, revelationType: 'Medinan' },
    { number: 77, name: 'Al-Mursalat', arabic: 'المرسلات', englishName: 'The Emissaries', versesCount: 50, revelationType: 'Meccan' },
    { number: 78, name: 'An-Naba', arabic: 'النبأ', englishName: 'The Tidings', versesCount: 40, revelationType: 'Meccan' },
    { number: 79, name: 'An-Nazi\'at', arabic: 'النازعات', englishName: 'Those Who Drag Forth', versesCount: 46, revelationType: 'Meccan' },
    { number: 80, name: 'Abasa', arabic: 'عبس', englishName: 'He Frowned', versesCount: 42, revelationType: 'Meccan' },
    { number: 81, name: 'At-Takwir', arabic: 'التكوير', englishName: 'The Overthrowing', versesCount: 29, revelationType: 'Meccan' },
    { number: 82, name: 'Al-Infitar', arabic: 'الانفطار', englishName: 'The Cleaving', versesCount: 19, revelationType: 'Meccan' },
    { number: 83, name: 'Al-Mutaffifin', arabic: 'المطففين', englishName: 'The Defrauding', versesCount: 36, revelationType: 'Meccan' },
    { number: 84, name: 'Al-Inshiqaq', arabic: 'الانشقاق', englishName: 'The Sundering', versesCount: 25, revelationType: 'Meccan' },
    { number: 85, name: 'Al-Buruj', arabic: 'البروج', englishName: 'The Mansions of the Stars', versesCount: 22, revelationType: 'Meccan' },
    { number: 86, name: 'At-Tariq', arabic: 'الطارق', englishName: 'The Morning Star', versesCount: 17, revelationType: 'Meccan' },
    { number: 87, name: 'Al-A\'la', arabic: 'الأعلى', englishName: 'The Most High', versesCount: 19, revelationType: 'Meccan' },
    { number: 88, name: 'Al-Ghashiyah', arabic: 'الغاشية', englishName: 'The Overwhelming', versesCount: 26, revelationType: 'Meccan' },
    { number: 89, name: 'Al-Fajr', arabic: 'الفجر', englishName: 'The Dawn', versesCount: 30, revelationType: 'Meccan' },
    { number: 90, name: 'Al-Balad', arabic: 'البلد', englishName: 'The City', versesCount: 20, revelationType: 'Meccan' },
    { number: 91, name: 'Ash-Shams', arabic: 'الشمس', englishName: 'The Sun', versesCount: 15, revelationType: 'Meccan' },
    { number: 92, name: 'Al-Layl', arabic: 'الليل', englishName: 'The Night', versesCount: 21, revelationType: 'Meccan' },
    { number: 93, name: 'Ad-Duhaa', arabic: 'الضحى', englishName: 'The Morning Hours', versesCount: 11, revelationType: 'Meccan' },
    { number: 94, name: 'Ash-Sharh', arabic: 'الشرح', englishName: 'The Relief', versesCount: 8, revelationType: 'Meccan' },
    { number: 95, name: 'At-Tin', arabic: 'التين', englishName: 'The Fig', versesCount: 8, revelationType: 'Meccan' },
    { number: 96, name: 'Al-Alaq', arabic: 'العلق', englishName: 'The Clot', versesCount: 19, revelationType: 'Meccan' },
    { number: 97, name: 'Al-Qadr', arabic: 'القدر', englishName: 'The Power', versesCount: 5, revelationType: 'Meccan' },
    { number: 98, name: 'Al-Bayyinah', arabic: 'البينة', englishName: 'The Clear Proof', versesCount: 8, revelationType: 'Medinan' },
    { number: 99, name: 'Az-Zalzalah', arabic: 'الزلزلة', englishName: 'The Earthquake', versesCount: 8, revelationType: 'Medinan' },
    { number: 100, name: 'Al-Adiyat', arabic: 'العاديات', englishName: 'The Chargers', versesCount: 11, revelationType: 'Meccan' },
    { number: 101, name: 'Al-Qari\'ah', arabic: 'القارعة', englishName: 'The Calamity', versesCount: 11, revelationType: 'Meccan' },
    { number: 102, name: 'At-Takathur', arabic: 'التكاثر', englishName: 'The Rivalry in Worldly Increase', versesCount: 8, revelationType: 'Meccan' },
    { number: 103, name: 'Al-Asr', arabic: 'العصر', englishName: 'The Declining Day', versesCount: 3, revelationType: 'Meccan' },
    { number: 104, name: 'Al-Humazah', arabic: 'الهمزة', englishName: 'The Traducer', versesCount: 9, revelationType: 'Meccan' },
    { number: 105, name: 'Al-Fil', arabic: 'الفيل', englishName: 'The Elephant', versesCount: 5, revelationType: 'Meccan' },
    { number: 106, name: 'Quraysh', arabic: 'قريش', englishName: 'Quraysh', versesCount: 4, revelationType: 'Meccan' },
    { number: 107, name: 'Al-Ma\'un', arabic: 'الماعون', englishName: 'The Small Kindnesses', versesCount: 7, revelationType: 'Meccan' },
    { number: 108, name: 'Al-Kawthar', arabic: 'الكوثر', englishName: 'The Abundance', versesCount: 3, revelationType: 'Meccan' },
    { number: 109, name: 'Al-Kafirun', arabic: 'الكافرون', englishName: 'The Disbelievers', versesCount: 6, revelationType: 'Meccan' },
    { number: 110, name: 'An-Nasr', arabic: 'النصر', englishName: 'The Divine Support', versesCount: 3, revelationType: 'Medinan' },
    { number: 111, name: 'Al-Masad', arabic: 'المسد', englishName: 'The Palm Fiber', versesCount: 5, revelationType: 'Meccan' },
    { number: 112, name: 'Al-Ikhlas', arabic: 'الإخلاص', englishName: 'The Sincerity', versesCount: 4, revelationType: 'Meccan' },
    { number: 113, name: 'Al-Falaq', arabic: 'الفلق', englishName: 'The Daybreak', versesCount: 5, revelationType: 'Meccan' },
    { number: 114, name: 'An-Nas', arabic: 'الناس', englishName: 'Mankind', versesCount: 6, revelationType: 'Meccan' },
];

// Total verse count for progress
const TOTAL_VERSES = SURAHS.reduce((sum, s) => sum + s.versesCount, 0);

// Juz filter tabs (popular ones quick-access, then scrollable for all 30)
const JUZ_TABS = [
    { id: 0, label: 'All' },
    { id: 1, label: '1' }, { id: 2, label: '2' }, { id: 3, label: '3' },
    { id: 10, label: '10' }, { id: 15, label: '15' }, { id: 20, label: '20' },
    { id: 25, label: '25' }, { id: 28, label: '28' }, { id: 29, label: '29' },
    { id: 30, label: '30' },
];

// ─── Surah Number Diamond ─────────────────────────────────────────
function SurahDiamond({ number }: { number: number }) {
    return (
        <View style={styles.diamondOuter}>
            <LinearGradient
                colors={[colors.gold[500] + '18', colors.gold[500] + '08']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <Text style={styles.diamondText}>{number}</Text>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────
export default function QuranSurahList() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedJuz, setSelectedJuz] = useState(0);
    const [searchFocused, setSearchFocused] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const filteredSurahs = useMemo(() => {
        let list = SURAHS;

        // Filter by juz
        if (selectedJuz > 0) {
            list = list.filter((s) => getSurahJuz(s.number) === selectedJuz);
        }

        // Filter by search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (s) =>
                    s.name.toLowerCase().includes(q) ||
                    s.englishName.toLowerCase().includes(q) ||
                    s.arabic.includes(q) ||
                    s.number.toString() === q
            );
        }

        return list;
    }, [searchQuery, selectedJuz]);

    const handleSurahPress = useCallback(
        (surahNumber: number) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/tools/quran/${surahNumber}` as any);
        },
        [router]
    );

    const handleJuzPress = useCallback((juzId: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedJuz(juzId);
    }, []);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        // Static data — briefly toggle refreshing state for consistency
        await new Promise((resolve) => setTimeout(resolve, 500));
        setIsRefreshing(false);
    }, []);

    // ─── Render surah row ──
    const renderSurah = ({ item, index }: { item: (typeof SURAHS)[0]; index: number }) => {
        const juz = getSurahJuz(item.number);
        return (
            <Animated.View entering={FadeInDown.duration(280).delay(Math.min(index * 25, 250))}>
                <TouchableOpacity
                    style={styles.surahRow}
                    onPress={() => handleSurahPress(item.number)}
                    activeOpacity={0.65}
                    accessibilityRole="button"
                    accessibilityLabel={`Surah ${item.number}, ${item.name}, ${item.englishName}, ${item.versesCount} verses, ${item.revelationType}`}
                >
                    {/* Number diamond */}
                    <SurahDiamond number={item.number} />

                    {/* Info */}
                    <View style={styles.surahInfo}>
                        <Text style={styles.surahName}>{item.name}</Text>
                        <Text style={styles.surahEnglish}>
                            {item.englishName}
                            <Text style={styles.surahMetaInline}> · {item.versesCount} ayat</Text>
                        </Text>
                    </View>

                    {/* Right: Arabic + type */}
                    <View style={styles.surahRight}>
                        <Text style={styles.surahArabic}>{item.arabic}</Text>
                        <View style={styles.surahTypeRow}>
                            <View
                                style={[
                                    styles.typeDot,
                                    {
                                        backgroundColor:
                                            item.revelationType === 'Meccan'
                                                ? colors.gold[500]
                                                : colors.emerald[500],
                                    },
                                ]}
                            />
                            <Text style={styles.surahType}>{item.revelationType}</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const ListHeader = useMemo(
        () => (
            <>
                {/* Bismillah */}
                <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
                    <Text style={styles.headerArabic}>القرآن الكريم</Text>
                    <Text style={styles.headerSub}>The Noble Quran</Text>
                    <View style={styles.headerStats}>
                        <View style={styles.headerStat}>
                            <Text style={styles.headerStatNum}>114</Text>
                            <Text style={styles.headerStatLabel}>Surahs</Text>
                        </View>
                        <View style={styles.headerStatDivider} />
                        <View style={styles.headerStat}>
                            <Text style={styles.headerStatNum}>30</Text>
                            <Text style={styles.headerStatLabel}>Juz</Text>
                        </View>
                        <View style={styles.headerStatDivider} />
                        <View style={styles.headerStat}>
                            <Text style={styles.headerStatNum}>{TOTAL_VERSES.toLocaleString()}</Text>
                            <Text style={styles.headerStatLabel}>Ayat</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Juz Filter Tabs */}
                <Animated.View entering={FadeInDown.duration(350).delay(100)}>
                    <FlatList
                        data={JUZ_TABS}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.juzTabsContent}
                        style={styles.juzTabs}
                        maxToRenderPerBatch={15}
                        initialNumToRender={15}
                        renderItem={({ item }) => {
                            const active = item.id === selectedJuz;
                            return (
                                <TouchableOpacity
                                    style={[styles.juzTab, active && styles.juzTabActive]}
                                    onPress={() => handleJuzPress(item.id)}
                                    activeOpacity={0.7}
                                >
                                    {active && (
                                        <LinearGradient
                                            colors={[colors.gold[500], colors.gold[600]]}
                                            style={StyleSheet.absoluteFill}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        />
                                    )}
                                    <Text
                                        style={[styles.juzTabText, active && styles.juzTabTextActive]}
                                    >
                                        {item.id === 0 ? 'All' : `Juz ${item.label}`}
                                    </Text>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </Animated.View>
            </>
        ),
        [selectedJuz, handleJuzPress]
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            <ScreenHeader title="Quran" noBorder />

            {/* Search bar */}
            <Animated.View entering={FadeInDown.duration(300)} style={styles.searchContainer}>
                <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
                    <Ionicons
                        name="search-outline"
                        size={16}
                        color={searchFocused ? colors.gold[400] : colors.text.muted}
                    />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search surahs by name, number, or Arabic..."
                        placeholderTextColor={colors.text.muted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        accessibilityLabel="Search surahs"
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSearchQuery('');
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="close-circle" size={18} color={colors.text.muted} />
                        </TouchableOpacity>
                    )}
                </View>
            </Animated.View>

            {/* Surah list */}
            <FlatList
                data={filteredSurahs}
                renderItem={renderSurah}
                keyExtractor={(item) => item.number.toString()}
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="search-outline" size={40} color={colors.text.muted} />
                        <Text style={styles.emptyText}>No surahs found</Text>
                        <Text style={styles.emptySubtext}>Try a different search term</Text>
                    </View>
                }
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={true}
                initialNumToRender={20}
                maxToRenderPerBatch={15}
                windowSize={10}
                getItemLayout={(_, index) => ({ length: 72, offset: 72 * index, index })}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.gold[500]} />}
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },

    // ── Header ──
    header: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        paddingHorizontal: spacing.lg,
    },
    headerArabic: {
        fontSize: 32,
        color: colors.gold[400],
        fontFamily: 'System',
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    headerSub: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginBottom: spacing.lg,
    },
    headerStats: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
    },
    headerStat: { alignItems: 'center', flex: 1 },
    headerStatNum: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.gold[400],
    },
    headerStatLabel: {
        fontSize: 10,
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 2,
    },
    headerStatDivider: {
        width: 1,
        height: 24,
        backgroundColor: colors.border.subtle,
        marginHorizontal: spacing.md,
    },

    // ── Search ──
    searchContainer: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.sm,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    searchBarFocused: {
        borderColor: colors.gold[500] + '40',
    },
    searchInput: {
        flex: 1,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        paddingVertical: 0,
    },

    // ── Juz Tabs ──
    juzTabs: { marginBottom: spacing.md },
    juzTabsContent: {
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
    },
    juzTab: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 10,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
    },
    juzTabActive: {
        borderColor: colors.gold[500] + '40',
    },
    juzTabText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
    },
    juzTabTextActive: {
        color: colors.obsidian[900],
        fontWeight: '700',
    },

    // ── Surah Row ──
    surahRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md + 2,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border.subtle,
    },

    // Number diamond
    diamondOuter: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.gold[500] + '18',
    },
    diamondText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.gold[400],
    },

    // Info
    surahInfo: { flex: 1, marginStart: spacing.md },
    surahName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        letterSpacing: -0.2,
    },
    surahEnglish: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: 2,
    },
    surahMetaInline: {
        color: colors.text.muted + 'AA',
        fontWeight: '400',
    },

    // Right side
    surahRight: { alignItems: 'flex-end', marginStart: spacing.sm },
    surahArabic: {
        fontSize: 20,
        color: colors.text.primary,
        fontFamily: 'System',
        opacity: 0.9,
    },
    surahTypeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 3,
    },
    typeDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    surahType: {
        fontSize: 10,
        color: colors.text.muted,
    },

    // ── Empty state ──
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing['4xl'],
    },
    emptyText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '600',
        color: colors.text.secondary,
        marginTop: spacing.md,
    },
    emptySubtext: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginTop: spacing.xs,
    },
});
