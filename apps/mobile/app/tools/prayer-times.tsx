import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';
import { colors, typography, spacing, shadows } from '@zerog/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenHeader, LoadingView, GlassCard } from '../../components';

// ─── Types ────────────────────────────────────────────────────────
interface PrayerTime {
    name: string;
    time: string;
    icon: keyof typeof Ionicons.glyphMap;
    arabicName: string;
}

const CACHE_KEY = 'prayer_times_cache';

// ─── Helper: format time to 12hr ──────────────────────────────────
function formatTime12h(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

// ─── Main Screen ──────────────────────────────────────────────────
export default function PrayerTimesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [prayers, setPrayers] = useState<PrayerTime[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [nextPrayer, setNextPrayer] = useState<string | null>(null);
    const [countdown, setCountdown] = useState('');
    const [countdownSeconds, setCountdownSeconds] = useState('');
    const [locationName, setLocationName] = useState('');
    const [hijriDate, setHijriDate] = useState('');
    const [gregorianDate, setGregorianDate] = useState('');
    const [sunriseTime, setSunriseTime] = useState('');
    const [sunsetTime, setSunsetTime] = useState('');
    const [progressPct, setProgressPct] = useState(0);

    const fetchPrayerTimes = useCallback(async () => {
        try {
            // Check cache first
            const cached = await AsyncStorage.getItem(CACHE_KEY);
            if (cached) {
                const { data, date, location, sunrise, sunset } = JSON.parse(cached);
                const today = new Date().toDateString();
                if (date === today) {
                    setPrayers(data);
                    setLocationName(location);
                    if (sunrise) setSunriseTime(sunrise);
                    if (sunset) setSunsetTime(sunset);
                    setIsLoading(false);
                    return;
                }
            }

            // Get location
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Location Required', 'Prayer times require your location to calculate accurately.');
                setIsLoading(false);
                return;
            }

            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = loc.coords;

            // Reverse geocode for city name
            let cityName = 'Your Location';
            try {
                const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
                if (geo) cityName = geo.city || geo.subregion || 'Your Location';
            } catch {}
            setLocationName(cityName);

            // Fetch from AlAdhan API
            const today = new Date();
            const dd = today.getDate();
            const mm = today.getMonth() + 1;
            const yyyy = today.getFullYear();

            const res = await fetch(
                `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${latitude}&longitude=${longitude}&method=2`
            );
            const json = await res.json();

            if (json.code === 200 && json.data) {
                const t = json.data.timings;
                const prayerData: PrayerTime[] = [
                    { name: 'Fajr', time: t.Fajr, icon: 'moon-outline', arabicName: 'الفجر' },
                    { name: 'Sunrise', time: t.Sunrise, icon: 'sunny-outline', arabicName: 'الشروق' },
                    { name: 'Dhuhr', time: t.Dhuhr, icon: 'sunny', arabicName: 'الظهر' },
                    { name: 'Asr', time: t.Asr, icon: 'partly-sunny-outline', arabicName: 'العصر' },
                    { name: 'Maghrib', time: t.Maghrib, icon: 'cloud-outline', arabicName: 'المغرب' },
                    { name: 'Isha', time: t.Isha, icon: 'moon', arabicName: 'العشاء' },
                ];
                setPrayers(prayerData);
                setSunriseTime(t.Sunrise);
                setSunsetTime(t.Sunset || t.Maghrib);

                // Cache for the day
                await AsyncStorage.setItem(
                    CACHE_KEY,
                    JSON.stringify({
                        data: prayerData,
                        date: today.toDateString(),
                        location: cityName,
                        sunrise: t.Sunrise,
                        sunset: t.Sunset || t.Maghrib,
                    })
                );

                // Set Hijri date
                if (json.data.date?.hijri) {
                    const h = json.data.date.hijri;
                    setHijriDate(`${h.day} ${h.month.en} ${h.year} AH`);
                }
                if (json.data.date?.gregorian) {
                    const g = json.data.date.gregorian;
                    setGregorianDate(`${g.weekday.en}, ${g.day} ${g.month.en} ${g.year}`);
                }
            }
        } catch (err) {
            console.error('Prayer times fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Determine next prayer and countdown
    useEffect(() => {
        if (prayers.length === 0) return;

        const updateCountdown = () => {
            const now = new Date();
            const currentTotalSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

            // Find previous prayer and next prayer
            let prevPrayerSec = 0;
            for (const prayer of prayers) {
                if (prayer.name === 'Sunrise') continue;
                const [h, m] = prayer.time.split(':').map(Number);
                const prayerSec = h * 3600 + m * 60;
                if (prayerSec > currentTotalSec) {
                    setNextPrayer(prayer.name);
                    const diff = prayerSec - currentTotalSec;
                    const hrs = Math.floor(diff / 3600);
                    const mins = Math.floor((diff % 3600) / 60);
                    const secs = diff % 60;
                    setCountdown(hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`);
                    setCountdownSeconds(secs.toString().padStart(2, '0'));

                    // Calculate progress between prev and next prayer
                    const totalSpan = prayerSec - prevPrayerSec;
                    const elapsed = currentTotalSec - prevPrayerSec;
                    setProgressPct(totalSpan > 0 ? Math.min(elapsed / totalSpan, 1) : 0);
                    return;
                }
                prevPrayerSec = prayerSec;
            }
            // All prayers passed — next is tomorrow's Fajr
            setNextPrayer('Fajr');
            setCountdown('Tomorrow');
            setCountdownSeconds('');
            setProgressPct(1);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [prayers]);

    useEffect(() => {
        fetchPrayerTimes();
    }, [fetchPrayerTimes]);

    // Determine current time period for greeting
    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 5) return { text: 'Night', icon: 'moon' as const };
        if (h < 12) return { text: 'Morning', icon: 'sunny-outline' as const };
        if (h < 17) return { text: 'Afternoon', icon: 'sunny' as const };
        if (h < 20) return { text: 'Evening', icon: 'partly-sunny-outline' as const };
        return { text: 'Night', icon: 'moon' as const };
    };
    const greeting = getGreeting();

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], '#0D0D12']} style={StyleSheet.absoluteFill} />

            <ScreenHeader title="Prayer Times" />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
            >
                {isLoading ? (
                    <LoadingView message="Getting your prayer times..." />
                ) : (
                    <>
                        {/* ── Hero: Next Prayer Card ── */}
                        <Animated.View
                            entering={FadeInDown.duration(500)}
                            style={styles.heroCard}
                            accessibilityRole="header"
                            accessibilityLabel={`Next prayer: ${nextPrayer || 'Fajr'} in ${countdown}${locationName ? `, location: ${locationName}` : ''}`}
                        >
                            <LinearGradient
                                colors={[colors.gold[700] + '28', colors.gold[500] + '08', 'transparent']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />

                            {/* Top row: label + countdown badge */}
                            <View style={styles.heroTop}>
                                <View>
                                    <Text style={styles.heroLabel}>Next Prayer</Text>
                                    <Text style={styles.heroName}>{nextPrayer || 'Fajr'}</Text>
                                </View>
                                <View style={styles.countdownContainer}>
                                    <View style={styles.countdownBadge}>
                                        <Ionicons name="time-outline" size={16} color={colors.gold[400]} />
                                        <Text style={styles.countdownText}>{countdown}</Text>
                                        {countdownSeconds !== '' && (
                                            <Text style={styles.countdownSec}>:{countdownSeconds}</Text>
                                        )}
                                    </View>
                                </View>
                            </View>

                            {/* Progress bar */}
                            <View style={styles.progressBar}>
                                <LinearGradient
                                    colors={[colors.gold[600], colors.gold[400]]}
                                    style={[styles.progressFill, { width: `${progressPct * 100}%` as any }]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                />
                            </View>

                            {/* Bottom: location & date */}
                            <View style={styles.heroBottom}>
                                <View style={styles.heroInfoRow}>
                                    <Ionicons name="location-outline" size={13} color={colors.text.muted} />
                                    <Text style={styles.heroInfoText}>{locationName}</Text>
                                </View>
                                {hijriDate ? (
                                    <View style={styles.heroInfoRow}>
                                        <Ionicons name="calendar-outline" size={13} color={colors.text.muted} />
                                        <Text style={styles.heroInfoText}>{hijriDate}</Text>
                                    </View>
                                ) : null}
                            </View>
                        </Animated.View>

                        {/* ── Sunrise / Sunset mini cards ── */}
                        {(sunriseTime || sunsetTime) && (
                            <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.sunRow}>
                                {sunriseTime && (
                                    <View style={styles.sunCard}>
                                        <LinearGradient
                                            colors={['rgba(255,180,50,0.10)', 'rgba(255,180,50,0.03)']}
                                            style={StyleSheet.absoluteFill}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        />
                                        <Ionicons name="sunny-outline" size={18} color="#FFBA33" />
                                        <View style={styles.sunInfo}>
                                            <Text style={styles.sunLabel}>Sunrise</Text>
                                            <Text style={styles.sunTime}>{formatTime12h(sunriseTime)}</Text>
                                        </View>
                                    </View>
                                )}
                                {sunsetTime && (
                                    <View style={styles.sunCard}>
                                        <LinearGradient
                                            colors={['rgba(255,107,107,0.10)', 'rgba(255,107,107,0.03)']}
                                            style={StyleSheet.absoluteFill}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        />
                                        <Ionicons name="moon-outline" size={18} color={colors.coral[400]} />
                                        <View style={styles.sunInfo}>
                                            <Text style={styles.sunLabel}>Sunset</Text>
                                            <Text style={styles.sunTime}>{formatTime12h(sunsetTime)}</Text>
                                        </View>
                                    </View>
                                )}
                            </Animated.View>
                        )}

                        {/* ── Gregorian date ── */}
                        {gregorianDate && (
                            <Animated.View entering={FadeIn.duration(300).delay(200)} style={styles.dateRow}>
                                <Text style={styles.dateText}>{gregorianDate}</Text>
                            </Animated.View>
                        )}

                        {/* ── Prayer Times List ── */}
                        <View style={styles.prayersList}>
                            {prayers.map((prayer, i) => {
                                const isNext = prayer.name === nextPrayer;
                                const isSunrise = prayer.name === 'Sunrise';
                                return (
                                    <Animated.View
                                        key={prayer.name}
                                        entering={FadeInDown.duration(400).delay(250 + i * 70)}
                                        style={[
                                            styles.prayerRow,
                                            isNext && styles.prayerRowActive,
                                            isSunrise && styles.prayerRowSunrise,
                                        ]}
                                        accessibilityLabel={`${prayer.name}, ${prayer.arabicName}, ${formatTime12h(prayer.time)}${isNext ? ', next prayer' : ''}`}
                                    >
                                        {/* Active glow */}
                                        {isNext && (
                                            <LinearGradient
                                                colors={[colors.gold[500] + '12', 'transparent']}
                                                style={StyleSheet.absoluteFill}
                                                start={{ x: 0, y: 0.5 }}
                                                end={{ x: 1, y: 0.5 }}
                                            />
                                        )}

                                        {/* Icon */}
                                        <View
                                            style={[
                                                styles.prayerIcon,
                                                isNext && styles.prayerIconActive,
                                                isSunrise && styles.prayerIconSunrise,
                                            ]}
                                        >
                                            <Ionicons
                                                name={prayer.icon}
                                                size={20}
                                                color={
                                                    isNext
                                                        ? colors.gold[400]
                                                        : isSunrise
                                                          ? '#FFBA33'
                                                          : colors.text.muted
                                                }
                                            />
                                        </View>

                                        {/* Name */}
                                        <View style={styles.prayerInfo}>
                                            <Text
                                                style={[
                                                    styles.prayerName,
                                                    isNext && styles.prayerNameActive,
                                                ]}
                                            >
                                                {prayer.name}
                                            </Text>
                                            <Text style={styles.prayerArabic}>{prayer.arabicName}</Text>
                                        </View>

                                        {/* Time */}
                                        <Text
                                            style={[
                                                styles.prayerTime,
                                                isNext && styles.prayerTimeActive,
                                            ]}
                                        >
                                            {formatTime12h(prayer.time)}
                                        </Text>

                                        {/* Active indicator */}
                                        {isNext && <View style={styles.nextDot} />}
                                    </Animated.View>
                                );
                            })}
                        </View>

                        {/* ── Footer note ── */}
                        <Animated.View entering={FadeIn.duration(300).delay(700)} style={styles.footer}>
                            <Ionicons name="information-circle-outline" size={14} color={colors.text.muted} />
                            <Text style={styles.footerText}>
                                Times calculated using ISNA method based on your location
                            </Text>
                        </Animated.View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },

    // ── Hero Card ──
    heroCard: {
        margin: spacing.lg,
        borderRadius: 22,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.gold[500] + '25',
        overflow: 'hidden',
        ...shadows.md,
    },
    heroTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.lg,
    },
    heroLabel: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginBottom: 4,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    heroName: {
        fontSize: 36,
        fontWeight: '700',
        color: colors.gold[400],
        fontFamily: 'Inter-Bold',
    },
    countdownContainer: { alignItems: 'flex-end' },
    countdownBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.surface.goldSubtle,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.gold[500] + '15',
    },
    countdownText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.gold[400],
    },
    countdownSec: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.gold[500] + '80',
    },

    // Progress bar
    progressBar: {
        height: 3,
        backgroundColor: colors.surface.glass,
        borderRadius: 2,
        marginBottom: spacing.lg,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },

    // Bottom
    heroBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    heroInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    heroInfoText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },

    // ── Sunrise / Sunset ──
    sunRow: {
        flexDirection: 'row',
        marginHorizontal: spacing.lg,
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    sunCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        backgroundColor: colors.surface.glass,
        overflow: 'hidden',
    },
    sunInfo: { flex: 1 },
    sunLabel: {
        fontSize: 10,
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sunTime: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.text.primary,
        marginTop: 1,
    },

    // ── Date row ──
    dateRow: {
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    dateText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },

    // ── Prayer List ──
    prayersList: { paddingHorizontal: spacing.lg },
    prayerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.md,
        borderRadius: 16,
        marginBottom: spacing.xs,
        overflow: 'hidden',
        position: 'relative',
    },
    prayerRowActive: {
        borderWidth: 1,
        borderColor: colors.gold[500] + '20',
    },
    prayerRowSunrise: {
        opacity: 0.65,
    },
    prayerIcon: {
        width: 42,
        height: 42,
        borderRadius: 13,
        backgroundColor: colors.surface.glass,
        alignItems: 'center',
        justifyContent: 'center',
    },
    prayerIconActive: {
        backgroundColor: colors.surface.goldLight,
    },
    prayerIconSunrise: {
        backgroundColor: 'rgba(255,186,51,0.08)',
    },
    prayerInfo: { flex: 1, marginStart: spacing.md },
    prayerName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
    prayerNameActive: { color: colors.gold[400] },
    prayerArabic: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: 2,
    },
    prayerTime: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.secondary,
        fontFamily: 'Inter-Bold',
    },
    prayerTimeActive: { color: colors.gold[400] },
    nextDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.gold[500],
        marginStart: spacing.sm,
        ...shadows.glow,
    },

    // ── Footer ──
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginTop: spacing.xl,
        paddingHorizontal: spacing.xl,
    },
    footerText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        textAlign: 'center',
    },
});
