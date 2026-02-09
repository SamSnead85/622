import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PrayerTime {
    name: string;
    time: string;
    icon: keyof typeof Ionicons.glyphMap;
    arabicName: string;
}

const CACHE_KEY = 'prayer_times_cache';

export default function PrayerTimesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [prayers, setPrayers] = useState<PrayerTime[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [nextPrayer, setNextPrayer] = useState<string | null>(null);
    const [countdown, setCountdown] = useState('');
    const [locationName, setLocationName] = useState('');
    const [hijriDate, setHijriDate] = useState('');

    const fetchPrayerTimes = useCallback(async () => {
        try {
            // Check cache first
            const cached = await AsyncStorage.getItem(CACHE_KEY);
            if (cached) {
                const { data, date, location } = JSON.parse(cached);
                const today = new Date().toDateString();
                if (date === today) {
                    setPrayers(data);
                    setLocationName(location);
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
            try {
                const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
                if (geo) setLocationName(geo.city || geo.subregion || 'Your Location');
            } catch { setLocationName('Your Location'); }

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

                // Cache for the day
                await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
                    data: prayerData,
                    date: today.toDateString(),
                    location: locationName || 'Your Location',
                }));

                // Set Hijri date
                if (json.data.date?.hijri) {
                    const h = json.data.date.hijri;
                    setHijriDate(`${h.day} ${h.month.en} ${h.year} AH`);
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
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            for (const prayer of prayers) {
                if (prayer.name === 'Sunrise') continue; // Skip sunrise
                const [h, m] = prayer.time.split(':').map(Number);
                const prayerMinutes = h * 60 + m;
                if (prayerMinutes > currentMinutes) {
                    setNextPrayer(prayer.name);
                    const diff = prayerMinutes - currentMinutes;
                    const hrs = Math.floor(diff / 60);
                    const mins = diff % 60;
                    setCountdown(hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`);
                    return;
                }
            }
            // All prayers passed — next is tomorrow's Fajr
            setNextPrayer('Fajr');
            setCountdown('Tomorrow');
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 60000);
        return () => clearInterval(interval);
    }, [prayers]);

    useEffect(() => {
        fetchPrayerTimes();
    }, [fetchPrayerTimes]);

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], '#0D0D12']} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Prayer Times</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.gold[500]} />
                        <Text style={styles.loadingText}>Getting your prayer times...</Text>
                    </View>
                ) : (
                    <>
                        {/* Next prayer card */}
                        <Animated.View entering={FadeInDown.duration(500)} style={styles.nextPrayerCard}>
                            <LinearGradient
                                colors={[colors.gold[700] + '30', colors.gold[500] + '10']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <View style={styles.nextPrayerTop}>
                                <View>
                                    <Text style={styles.nextPrayerLabel}>Next Prayer</Text>
                                    <Text style={styles.nextPrayerName}>{nextPrayer || 'Fajr'}</Text>
                                </View>
                                <View style={styles.countdownBadge}>
                                    <Ionicons name="time-outline" size={16} color={colors.gold[400]} />
                                    <Text style={styles.countdownText}>{countdown}</Text>
                                </View>
                            </View>
                            <View style={styles.nextPrayerBottom}>
                                <Ionicons name="location-outline" size={14} color={colors.text.muted} />
                                <Text style={styles.locationText}>{locationName}</Text>
                                {hijriDate ? (
                                    <>
                                        <Text style={styles.locationSep}>•</Text>
                                        <Text style={styles.locationText}>{hijriDate}</Text>
                                    </>
                                ) : null}
                            </View>
                        </Animated.View>

                        {/* Prayer times list */}
                        <View style={styles.prayersList}>
                            {prayers.map((prayer, i) => {
                                const isNext = prayer.name === nextPrayer;
                                return (
                                    <Animated.View
                                        key={prayer.name}
                                        entering={FadeInDown.duration(400).delay(i * 60)}
                                        style={[styles.prayerRow, isNext && styles.prayerRowActive]}
                                    >
                                        <View style={[styles.prayerIcon, isNext && styles.prayerIconActive]}>
                                            <Ionicons name={prayer.icon} size={20} color={isNext ? colors.gold[400] : colors.text.muted} />
                                        </View>
                                        <View style={styles.prayerInfo}>
                                            <Text style={[styles.prayerName, isNext && styles.prayerNameActive]}>{prayer.name}</Text>
                                            <Text style={styles.prayerArabic}>{prayer.arabicName}</Text>
                                        </View>
                                        <Text style={[styles.prayerTime, isNext && styles.prayerTimeActive]}>
                                            {prayer.time}
                                        </Text>
                                        {isNext && (
                                            <View style={styles.nextDot} />
                                        )}
                                    </Animated.View>
                                );
                            })}
                        </View>
                    </>
                )}
            </ScrollView>
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
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
    loadingContainer: { alignItems: 'center', paddingTop: 100 },
    loadingText: { color: colors.text.muted, marginTop: spacing.md, fontSize: typography.fontSize.sm },

    // Next prayer card
    nextPrayerCard: {
        margin: spacing.lg, borderRadius: 20, padding: spacing.xl,
        borderWidth: 1, borderColor: colors.gold[500] + '30',
        overflow: 'hidden',
    },
    nextPrayerTop: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: spacing.lg,
    },
    nextPrayerLabel: { fontSize: typography.fontSize.sm, color: colors.text.muted, marginBottom: 4 },
    nextPrayerName: { fontSize: 32, fontWeight: '700', color: colors.gold[400], fontFamily: 'Inter-Bold' },
    countdownBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: colors.surface.goldSubtle, paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs, borderRadius: 20,
    },
    countdownText: { fontSize: typography.fontSize.base, fontWeight: '700', color: colors.gold[400] },
    nextPrayerBottom: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    locationText: { fontSize: typography.fontSize.sm, color: colors.text.muted },
    locationSep: { color: colors.text.muted },

    // Prayer list
    prayersList: { paddingHorizontal: spacing.lg },
    prayerRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: spacing.lg, paddingHorizontal: spacing.md,
        borderRadius: 14, marginBottom: spacing.xs,
    },
    prayerRowActive: {
        backgroundColor: colors.surface.goldSubtle,
        borderWidth: 1, borderColor: colors.gold[500] + '20',
    },
    prayerIcon: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: colors.surface.glass,
        alignItems: 'center', justifyContent: 'center',
    },
    prayerIconActive: { backgroundColor: colors.surface.goldLight },
    prayerInfo: { flex: 1, marginLeft: spacing.md },
    prayerName: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary },
    prayerNameActive: { color: colors.gold[400] },
    prayerArabic: { fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 2 },
    prayerTime: { fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.text.secondary },
    prayerTimeActive: { color: colors.gold[400] },
    nextDot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: colors.gold[500], marginLeft: spacing.sm,
    },
});
