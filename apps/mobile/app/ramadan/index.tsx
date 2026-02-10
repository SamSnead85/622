// ============================================
// Ramadan Hub — Flagship seasonal feature
// Iftar countdown, Quran progress, daily verse
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, shadows } from '@zerog/ui';
import { ScreenHeader, GlassCard } from '../../components';

// ─── Constants ────────────────────────────────────────────────────
const RAMADAN_START = new Date(2026, 1, 18); // Feb 18, 2026
const RAMADAN_END = new Date(2026, 2, 19);   // Mar 19, 2026 (30 days)
const TOTAL_DAYS = 30;
const QURAN_STORAGE_KEY = '@ramadan-quran-progress';
const PRAYER_CACHE_KEY = '@ramadan-prayer-cache';

// ─── Curated Ramadan Verses ──────────────────────────────────────
const RAMADAN_VERSES = [
    { arabic: 'شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ هُدًى لِّلنَّاسِ', english: 'The month of Ramadan in which the Quran was revealed, a guidance for mankind.', ref: '2:185' },
    { arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا كُتِبَ عَلَيْكُمُ الصِّيَامُ كَمَا كُتِبَ عَلَى الَّذِينَ مِن قَبْلِكُمْ لَعَلَّكُمْ تَتَّقُونَ', english: 'O you who believe, fasting is prescribed for you as it was prescribed for those before you, that you may become righteous.', ref: '2:183' },
    { arabic: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ', english: 'And when My servants ask you about Me, indeed I am near. I respond to the call of the caller when he calls upon Me.', ref: '2:186' },
    { arabic: 'إِنَّا أَنزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ', english: 'Indeed, We sent it down during the Night of Decree.', ref: '97:1' },
    { arabic: 'لَيْلَةُ الْقَدْرِ خَيْرٌ مِّنْ أَلْفِ شَهْرٍ', english: 'The Night of Decree is better than a thousand months.', ref: '97:3' },
    { arabic: 'وَلَا تَأْكُلُوا أَمْوَالَكُم بَيْنَكُم بِالْبَاطِلِ', english: 'And do not consume one another\'s wealth unjustly.', ref: '2:188' },
    { arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ', english: 'So remember Me; I will remember you. And be grateful to Me and do not deny Me.', ref: '2:152' },
    { arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', english: 'Our Lord, give us in this world good and in the Hereafter good and protect us from the punishment of the Fire.', ref: '2:201' },
    { arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', english: 'Indeed, Allah is with the patient.', ref: '2:153' },
    { arabic: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', english: 'And whoever relies upon Allah — then He is sufficient for him.', ref: '65:3' },
    { arabic: 'ادْعُونِي أَسْتَجِبْ لَكُمْ', english: 'Call upon Me; I will respond to you.', ref: '40:60' },
    { arabic: 'وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ', english: 'And your Lord is going to give you, and you will be satisfied.', ref: '93:5' },
    { arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', english: 'For indeed, with hardship comes ease.', ref: '94:5' },
    { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', english: 'Indeed, with hardship comes ease.', ref: '94:6' },
    { arabic: 'وَنَحْنُ أَقْرَبُ إِلَيْهِ مِنْ حَبْلِ الْوَرِيدِ', english: 'And We are closer to him than his jugular vein.', ref: '50:16' },
    { arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ', english: 'Verily, in the remembrance of Allah do hearts find rest.', ref: '13:28' },
    { arabic: 'وَاصْبِرْ فَإِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ', english: 'And be patient, for indeed Allah does not allow the reward of the doers of good to be lost.', ref: '11:115' },
    { arabic: 'إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا مَا بِأَنفُسِهِمْ', english: 'Indeed, Allah will not change the condition of a people until they change what is in themselves.', ref: '13:11' },
    { arabic: 'وَاللَّهُ يُحِبُّ الْمُحْسِنِينَ', english: 'And Allah loves the doers of good.', ref: '3:134' },
    { arabic: 'قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ', english: 'Say, O My servants who have transgressed against themselves, do not despair of the mercy of Allah.', ref: '39:53' },
    { arabic: 'وَرَحْمَتِي وَسِعَتْ كُلَّ شَيْءٍ', english: 'And My mercy encompasses all things.', ref: '7:156' },
    { arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي', english: 'My Lord, expand for me my breast and ease for me my task.', ref: '20:25-26' },
    { arabic: 'وَقُل رَّبِّ زِدْنِي عِلْمًا', english: 'And say, My Lord, increase me in knowledge.', ref: '20:114' },
    { arabic: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ', english: 'Our Lord, accept from us. Indeed You are the Hearing, the Knowing.', ref: '2:127' },
    { arabic: 'وَتُوبُوا إِلَى اللَّهِ جَمِيعًا أَيُّهَ الْمُؤْمِنُونَ لَعَلَّكُمْ تُفْلِحُونَ', english: 'And turn to Allah in repentance, all of you, O believers, that you might succeed.', ref: '24:31' },
    { arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ', english: 'O you who believe, seek help through patience and prayer.', ref: '2:153' },
    { arabic: 'وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنتُمُ الْأَعْلَوْنَ إِن كُنتُم مُّؤْمِنِينَ', english: 'So do not weaken and do not grieve, for you will be superior if you are believers.', ref: '3:139' },
    { arabic: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا', english: 'And whoever fears Allah — He will make a way out for him.', ref: '65:2' },
    { arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ', english: 'Sufficient for us is Allah, and He is the best Disposer of affairs.', ref: '3:173' },
    { arabic: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً', english: 'Our Lord, let not our hearts deviate after You have guided us and grant us from Yourself mercy.', ref: '3:8' },
];

// ─── Helpers ──────────────────────────────────────────────────────
function getRamadanDay(): number {
    const now = new Date();
    const diff = now.getTime() - RAMADAN_START.getTime();
    const day = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, Math.min(day, TOTAL_DAYS));
}

function isDuringRamadan(): boolean {
    const now = new Date();
    return now >= RAMADAN_START && now <= RAMADAN_END;
}

function getDailyVerseIndex(): number {
    const now = new Date();
    // Seed based on day of year for consistent daily verse
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    return dayOfYear % RAMADAN_VERSES.length;
}

function formatTime12h(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

function padZero(n: number): string {
    return n.toString().padStart(2, '0');
}

// ─── Main Screen ──────────────────────────────────────────────────
export default function RamadanHub() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // State
    const [maghribTime, setMaghribTime] = useState<string | null>(null);
    const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [isPastMaghrib, setIsPastMaghrib] = useState(false);
    const [juzCount, setJuzCount] = useState(0);
    const [isLoadingPrayer, setIsLoadingPrayer] = useState(true);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isRamadan = isDuringRamadan();
    const ramadanDay = getRamadanDay();
    const daysLeft = Math.max(0, TOTAL_DAYS - ramadanDay);
    const verseIndex = getDailyVerseIndex();
    const dailyVerse = RAMADAN_VERSES[verseIndex];

    // ─── Load Quran progress ──────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const stored = await AsyncStorage.getItem(QURAN_STORAGE_KEY);
                if (stored) setJuzCount(parseInt(stored, 10) || 0);
            } catch { /* AsyncStorage read failure — use default 0 */ }
        })();
    }, []);

    // ─── Save Quran progress ──────────────────────────────────────
    const updateJuzCount = useCallback(async (delta: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setJuzCount((prev) => {
            const next = Math.max(0, Math.min(30, prev + delta));
            AsyncStorage.setItem(QURAN_STORAGE_KEY, next.toString()).catch(() => {});
            return next;
        });
    }, []);

    // ─── Fetch prayer times from Aladhan ──────────────────────────
    useEffect(() => {
        (async () => {
            try {
                // Check cache first
                const cached = await AsyncStorage.getItem(PRAYER_CACHE_KEY);
                if (cached) {
                    let parsed: any = {};
                    try { parsed = JSON.parse(cached); } catch { /* corrupted cache */ }
                    const { maghrib, date } = parsed;
                    if (date === new Date().toDateString()) {
                        setMaghribTime(maghrib);
                        setIsLoadingPrayer(false);
                        return;
                    }
                }

                const res = await fetch(
                    'https://api.aladhan.com/v1/timingsByCity?city=NewYork&country=US&method=2'
                );
                const json = await res.json();
                if (json.code === 200 && json.data?.timings?.Maghrib) {
                    const maghrib = json.data.timings.Maghrib.replace(/\s*\(.*\)/, ''); // strip timezone annotation
                    setMaghribTime(maghrib);
                    await AsyncStorage.setItem(
                        PRAYER_CACHE_KEY,
                        JSON.stringify({ maghrib, date: new Date().toDateString() })
                    );
                }
            } catch (err) {
                console.error('Failed to fetch prayer times:', err);
            } finally {
                setIsLoadingPrayer(false);
            }
        })();
    }, []);

    // ─── Live countdown to Maghrib ────────────────────────────────
    useEffect(() => {
        if (!maghribTime) return;

        const updateCountdown = () => {
            const now = new Date();
            const [h, m] = maghribTime.split(':').map(Number);
            const maghribSec = h * 3600 + m * 60;
            const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
            const diff = maghribSec - nowSec;

            if (diff <= 0) {
                setIsPastMaghrib(true);
                setCountdown({ hours: 0, minutes: 0, seconds: 0 });
                return;
            }

            setIsPastMaghrib(false);
            setCountdown({
                hours: Math.floor(diff / 3600),
                minutes: Math.floor((diff % 3600) / 60),
                seconds: diff % 60,
            });
        };

        updateCountdown();
        intervalRef.current = setInterval(updateCountdown, 1000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [maghribTime]);

    // ─── Share verse ──────────────────────────────────────────────
    const shareVerse = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await Share.share({
                message: `${dailyVerse.arabic}\n\n"${dailyVerse.english}"\n— Quran ${dailyVerse.ref}\n\nShared from 0G`,
            });
        } catch { /* user cancelled share sheet */ }
    };

    const navigate = (route: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(route as any);
    };

    const juzRemaining = 30 - juzCount;
    const progressPercent = (juzCount / 30) * 100;

    return (
        <View style={styles.container}>
            {/* Deep gradient background */}
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[900], colors.obsidian[900]]}
                style={StyleSheet.absoluteFill}
            />

            {/* Subtle gold ambient glow at top */}
            <LinearGradient
                colors={[colors.gold[700] + '0A', 'transparent']}
                style={styles.ambientGlow}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            />

            <ScreenHeader title="Ramadan" showBack />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ════════════════════════════════════════════════
                    1. HEADER — Ramadan Mubarak + Day Counter
                   ════════════════════════════════════════════════ */}
                <Animated.View entering={FadeInDown.duration(600)} style={styles.heroSection}>
                    <View style={styles.crescentContainer}>
                        <LinearGradient
                            colors={[colors.gold[500] + '20', colors.gold[700] + '08']}
                            style={styles.crescentGlow}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                        <Text style={styles.crescentIcon}>☪️</Text>
                    </View>
                    <Text style={styles.heroTitle}>Ramadan Mubarak</Text>
                    <View style={styles.dayBadge}>
                        <Ionicons name="calendar-outline" size={14} color={colors.gold[400]} />
                        <Text style={styles.dayBadgeText}>
                            {isRamadan ? `Day ${ramadanDay} of ${TOTAL_DAYS}` : 'Ramadan 2026'}
                        </Text>
                    </View>
                    {/* Decorative bismillah */}
                    <Text style={styles.bismillah}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</Text>
                </Animated.View>

                {/* ════════════════════════════════════════════════
                    2. IFTAR COUNTDOWN
                   ════════════════════════════════════════════════ */}
                <Animated.View entering={FadeInDown.duration(500).delay(100)}>
                    <View style={styles.countdownCard}>
                        <LinearGradient
                            colors={[colors.gold[700] + '18', colors.gold[500] + '06', 'transparent']}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />

                        <View style={styles.countdownHeader}>
                            <Ionicons name="time-outline" size={18} color={colors.gold[400]} />
                            <Text style={styles.countdownLabel}>
                                {isPastMaghrib ? 'Iftar Time' : 'Time Until Iftar'}
                            </Text>
                        </View>

                        {isLoadingPrayer ? (
                            <Text style={styles.countdownLoading}>Loading prayer times...</Text>
                        ) : isPastMaghrib ? (
                            <View style={styles.iftarReached}>
                                <Text style={styles.iftarReachedEmoji}>🌙</Text>
                                <Text style={styles.iftarReachedText}>Alhamdulillah!</Text>
                                <Text style={styles.iftarReachedSub}>
                                    May your fast be accepted
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.countdownTimerRow}>
                                <View style={styles.countdownUnit}>
                                    <Text style={styles.countdownNumber}>
                                        {padZero(countdown.hours)}
                                    </Text>
                                    <Text style={styles.countdownUnitLabel}>hours</Text>
                                </View>
                                <Text style={styles.countdownSeparator}>:</Text>
                                <View style={styles.countdownUnit}>
                                    <Text style={styles.countdownNumber}>
                                        {padZero(countdown.minutes)}
                                    </Text>
                                    <Text style={styles.countdownUnitLabel}>min</Text>
                                </View>
                                <Text style={styles.countdownSeparator}>:</Text>
                                <View style={styles.countdownUnit}>
                                    <Text style={[styles.countdownNumber, styles.countdownSeconds]}>
                                        {padZero(countdown.seconds)}
                                    </Text>
                                    <Text style={styles.countdownUnitLabel}>sec</Text>
                                </View>
                            </View>
                        )}

                        {maghribTime && (
                            <Text style={styles.maghribTimeText}>
                                Maghrib at {formatTime12h(maghribTime)}
                            </Text>
                        )}

                        {/* Gold accent line */}
                        <LinearGradient
                            colors={[colors.gold[600], colors.gold[400], colors.gold[600]]}
                            style={styles.countdownAccent}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        />
                    </View>
                </Animated.View>

                {/* ════════════════════════════════════════════════
                    3. VERSE OF THE DAY
                   ════════════════════════════════════════════════ */}
                <Animated.View entering={FadeInDown.duration(500).delay(200)}>
                    <GlassCard style={styles.verseCard} gold>
                        <View style={styles.verseLabelRow}>
                            <Ionicons name="book-outline" size={15} color={colors.gold[400]} />
                            <Text style={styles.verseLabel}>Verse of the Day</Text>
                        </View>

                        {/* Decorative ornament */}
                        <View style={styles.verseOrnament}>
                            <View style={styles.ornamentLine} />
                            <Ionicons name="star" size={10} color={colors.gold[500] + '60'} />
                            <View style={styles.ornamentLine} />
                        </View>

                        <Text style={styles.verseArabic}>{dailyVerse.arabic}</Text>

                        <View style={styles.verseDivider} />

                        <Text style={styles.verseEnglish}>"{dailyVerse.english}"</Text>
                        <Text style={styles.verseRef}>— Quran {dailyVerse.ref}</Text>

                        <TouchableOpacity
                            style={styles.shareButton}
                            onPress={shareVerse}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel="Share this verse"
                        >
                            <Ionicons name="share-outline" size={16} color={colors.gold[400]} />
                            <Text style={styles.shareButtonText}>Share</Text>
                        </TouchableOpacity>
                    </GlassCard>
                </Animated.View>

                {/* ════════════════════════════════════════════════
                    4. QURAN PROGRESS TRACKER
                   ════════════════════════════════════════════════ */}
                <Animated.View entering={FadeInDown.duration(500).delay(300)}>
                    <GlassCard style={styles.progressCard}>
                        <View style={styles.progressHeader}>
                            <View style={styles.progressTitleRow}>
                                <Ionicons name="book" size={18} color={colors.gold[400]} />
                                <Text style={styles.progressTitle}>Quran Progress</Text>
                            </View>
                            <Text style={styles.progressFraction}>
                                {juzCount}<Text style={styles.progressFractionMuted}>/30 juz</Text>
                            </Text>
                        </View>

                        {/* Progress bar */}
                        <View style={styles.progressBarOuter}>
                            <LinearGradient
                                colors={[colors.gold[600], colors.gold[400]]}
                                style={[styles.progressBarInner, { width: `${Math.max(progressPercent, 1)}%` as any }]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
                        </View>

                        {/* Status message */}
                        <Text style={styles.progressMessage}>
                            {juzCount === 30
                                ? 'MashaAllah! You completed the Quran this Ramadan!'
                                : juzCount === 0
                                  ? 'Start your journey — every ayah counts'
                                  : `${juzRemaining} juz remaining, ${daysLeft} days left — you've got this`}
                        </Text>

                        {/* +/- Buttons */}
                        <View style={styles.progressButtons}>
                            <TouchableOpacity
                                style={[styles.juzButton, juzCount <= 0 && styles.juzButtonDisabled]}
                                onPress={() => updateJuzCount(-1)}
                                disabled={juzCount <= 0}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel="Decrease juz count"
                            >
                                <Ionicons
                                    name="remove"
                                    size={22}
                                    color={juzCount <= 0 ? colors.text.muted : colors.text.primary}
                                />
                            </TouchableOpacity>

                            <View style={styles.juzCountDisplay}>
                                <Text style={styles.juzCountText}>{juzCount}</Text>
                                <Text style={styles.juzCountSub}>juz read</Text>
                            </View>

                            <TouchableOpacity
                                style={[styles.juzButton, styles.juzButtonAdd, juzCount >= 30 && styles.juzButtonDisabled]}
                                onPress={() => updateJuzCount(1)}
                                disabled={juzCount >= 30}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel="Increase juz count"
                            >
                                <Ionicons
                                    name="add"
                                    size={22}
                                    color={juzCount >= 30 ? colors.text.muted : colors.obsidian[900]}
                                />
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                </Animated.View>

                {/* ════════════════════════════════════════════════
                    5. QUICK ACTIONS
                   ════════════════════════════════════════════════ */}
                <Animated.View entering={FadeInDown.duration(500).delay(400)}>
                    <View style={styles.quickActionsLabel}>
                        <Ionicons name="flash-outline" size={14} color={colors.gold[400]} />
                        <Text style={styles.quickActionsText}>Quick Actions</Text>
                        <View style={styles.quickActionsDivider} />
                    </View>

                    <View style={styles.quickActionsRow}>
                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => navigate('/tools/prayer-times')}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel="Open Prayer Times"
                        >
                            <LinearGradient
                                colors={[colors.gold[500] + '15', colors.gold[700] + '05']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <View style={styles.quickActionIcon}>
                                <Ionicons name="time-outline" size={24} color={colors.gold[400]} />
                            </View>
                            <Text style={styles.quickActionTitle}>Prayer Times</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => navigate('/tools/qibla')}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel="Open Qibla Compass"
                        >
                            <LinearGradient
                                colors={[colors.emerald[500] + '15', colors.emerald[500] + '05']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <View style={styles.quickActionIcon}>
                                <Ionicons name="compass-outline" size={24} color={colors.emerald[400]} />
                            </View>
                            <Text style={styles.quickActionTitle}>Qibla</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => navigate('/tools/quran')}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel="Open Quran Reader"
                        >
                            <LinearGradient
                                colors={[colors.azure[500] + '15', colors.azure[500] + '05']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <View style={styles.quickActionIcon}>
                                <Ionicons name="book-outline" size={24} color={colors.azure[400]} />
                            </View>
                            <Text style={styles.quickActionTitle}>Quran</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* ════════════════════════════════════════════════
                    6. IFTAR MOMENT PROMPT (shows at/after Maghrib)
                   ════════════════════════════════════════════════ */}
                {isPastMaghrib && (
                    <Animated.View entering={FadeIn.duration(600)}>
                        <TouchableOpacity
                            style={styles.iftarPrompt}
                            onPress={() => navigate('/(tabs)/create')}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Share your iftar moment"
                        >
                            <LinearGradient
                                colors={[colors.surface.goldMedium, colors.surface.goldSubtle]}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <View style={styles.iftarPromptIcon}>
                                <Ionicons name="camera-outline" size={28} color={colors.gold[400]} />
                            </View>
                            <View style={styles.iftarPromptContent}>
                                <Text style={styles.iftarPromptTitle}>Share Your Iftar Moment</Text>
                                <Text style={styles.iftarPromptSub}>
                                    Capture and share the blessings of tonight's iftar
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.gold[400]} />
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Footer */}
                <Animated.View entering={FadeIn.duration(400).delay(600)} style={styles.footer}>
                    <Text style={styles.footerText}>
                        رمضان كريم
                    </Text>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },
    scrollView: {
        flex: 1,
    },
    ambientGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 300,
    },

    // ── Hero Section ──────────────────────────────────────────────
    heroSection: {
        alignItems: 'center',
        paddingTop: spacing.xl,
        paddingBottom: spacing.lg,
        paddingHorizontal: spacing.lg,
    },
    crescentContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        overflow: 'hidden',
    },
    crescentGlow: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 36,
    },
    crescentIcon: {
        fontSize: 36,
    },
    heroTitle: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: '700',
        color: colors.gold[400],
        fontFamily: 'Inter-Bold',
        letterSpacing: -0.5,
        marginBottom: spacing.sm,
    },
    dayBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.surface.goldSubtle,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.gold[500] + '15',
        marginBottom: spacing.lg,
    },
    dayBadgeText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.gold[300],
    },
    bismillah: {
        fontSize: 18,
        color: colors.gold[500] + '50',
        fontFamily: 'System',
        textAlign: 'center',
    },

    // ── Iftar Countdown ───────────────────────────────────────────
    countdownCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        borderRadius: 22,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.gold[500] + '20',
        overflow: 'hidden',
        ...shadows.md,
    },
    countdownHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    countdownLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    countdownLoading: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        textAlign: 'center',
        paddingVertical: spacing.xl,
    },
    countdownTimerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    countdownUnit: {
        alignItems: 'center',
        minWidth: 70,
    },
    countdownNumber: {
        fontSize: typography.fontSize['5xl'],
        fontWeight: '700',
        color: colors.gold[400],
        fontFamily: 'Inter-Bold',
        letterSpacing: -1,
    },
    countdownSeconds: {
        color: colors.gold[500] + 'B0',
    },
    countdownUnitLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 2,
    },
    countdownSeparator: {
        fontSize: typography.fontSize['4xl'],
        fontWeight: '300',
        color: colors.gold[500] + '50',
        marginBottom: 18, // align with numbers, not labels
    },
    maghribTimeText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    countdownAccent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        opacity: 0.5,
    },

    // Iftar reached state
    iftarReached: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
    },
    iftarReachedEmoji: {
        fontSize: 40,
        marginBottom: spacing.sm,
    },
    iftarReachedText: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        color: colors.gold[400],
        fontFamily: 'Inter-Bold',
    },
    iftarReachedSub: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        marginTop: spacing.xs,
    },

    // ── Verse of the Day ──────────────────────────────────────────
    verseCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        padding: spacing.xl,
    },
    verseLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    verseLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.gold[400],
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    verseOrnament: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    ornamentLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.gold[500] + '20',
    },
    verseArabic: {
        fontSize: 22,
        color: colors.gold[300],
        fontFamily: 'System',
        textAlign: 'center',
        lineHeight: 38,
        marginBottom: spacing.lg,
    },
    verseDivider: {
        height: 1,
        backgroundColor: colors.gold[500] + '15',
        marginHorizontal: spacing['2xl'],
        marginBottom: spacing.lg,
    },
    verseEnglish: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 24,
        fontStyle: 'italic',
        marginBottom: spacing.sm,
    },
    verseRef: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        alignSelf: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.gold[500] + '25',
        backgroundColor: colors.surface.goldSubtle,
    },
    shareButtonText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.gold[400],
    },

    // ── Quran Progress ────────────────────────────────────────────
    progressCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        padding: spacing.xl,
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    progressTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    progressTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
    },
    progressFraction: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.gold[400],
    },
    progressFractionMuted: {
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
        color: colors.text.muted,
    },
    progressBarOuter: {
        height: 6,
        backgroundColor: colors.surface.glass,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    progressBarInner: {
        height: '100%',
        borderRadius: 3,
    },
    progressMessage: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
        lineHeight: 20,
    },
    progressButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xl,
    },
    juzButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.surface.glassActive,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    juzButtonAdd: {
        backgroundColor: colors.gold[500],
        borderColor: colors.gold[600],
    },
    juzButtonDisabled: {
        opacity: 0.3,
    },
    juzCountDisplay: {
        alignItems: 'center',
        minWidth: 60,
    },
    juzCountText: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        color: colors.gold[400],
        fontFamily: 'Inter-Bold',
    },
    juzCountSub: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: 2,
    },

    // ── Quick Actions ─────────────────────────────────────────────
    quickActionsLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    quickActionsText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    quickActionsDivider: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border.subtle,
        marginStart: spacing.sm,
    },
    quickActionsRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    quickActionCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.sm,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        backgroundColor: colors.surface.glass,
        overflow: 'hidden',
    },
    quickActionIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    quickActionTitle: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.primary,
        textAlign: 'center',
    },

    // ── Iftar Moment Prompt ───────────────────────────────────────
    iftarPrompt: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
        overflow: 'hidden',
    },
    iftarPromptIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    iftarPromptContent: {
        flex: 1,
    },
    iftarPromptTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.gold[400],
        marginBottom: 2,
    },
    iftarPromptSub: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        lineHeight: 16,
    },

    // ── Footer ────────────────────────────────────────────────────
    footer: {
        alignItems: 'center',
        paddingVertical: spacing['2xl'],
    },
    footerText: {
        fontSize: 20,
        color: colors.gold[500] + '30',
        fontFamily: 'System',
    },
});
