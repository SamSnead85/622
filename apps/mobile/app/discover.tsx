import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../stores';
import { apiFetch, API } from '../lib/api';
import { GlassCard } from '../components';

// ============================================
// Prayer Time Helpers
// ============================================
interface PrayerTimeData {
    name: string;
    time: string;
    icon: keyof typeof Ionicons.glyphMap;
    arabicName: string;
}

function formatTime12h(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

// ============================================
// Cultural Profile Types
// ============================================
type CulturalProfileType = 'muslim' | 'standard' | 'custom';

const CULTURAL_OPTIONS: {
    type: CulturalProfileType;
    title: string;
    greeting: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
}[] = [
    {
        type: 'muslim',
        title: 'Muslim',
        greeting: 'Assalamu Alaikum',
        description: 'Deen tools, prayer reminders, Islamic greetings',
        icon: 'moon-outline',
        color: colors.gold[500],
    },
    {
        type: 'standard',
        title: 'Standard',
        greeting: 'Welcome back',
        description: 'General community focus, all features available',
        icon: 'people-outline',
        color: colors.azure[500],
    },
    {
        type: 'custom',
        title: 'Custom',
        greeting: 'Your greeting...',
        description: 'Set your own personal greeting message',
        icon: 'create-outline',
        color: colors.emerald[500],
    },
];

// ============================================
// Main Screen
// ============================================
export default function DiscoverScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);

    // Prayer times state
    const [prayers, setPrayers] = useState<PrayerTimeData[]>([]);
    const [prayerLoading, setPrayerLoading] = useState(true);
    const [locationName, setLocationName] = useState('New York, US');

    // Cultural profile state
    const [selectedProfile, setSelectedProfile] = useState<CulturalProfileType>('muslim');
    const [customGreeting, setCustomGreeting] = useState('');

    useEffect(() => {
        fetchPrayerTimes();
    }, []);

    const fetchPrayerTimes = async () => {
        try {
            // Try to get user's actual location
            let apiUrl = 'https://api.aladhan.com/v1/timingsByCity?city=NewYork&country=US&method=2';

            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const position = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });
                    const { latitude, longitude } = position.coords;
                    apiUrl = `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=2`;

                    // Reverse geocode to get a display name
                    try {
                        const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
                        if (place) {
                            const city = place.city || place.subregion || place.region || '';
                            const country = place.isoCountryCode || place.country || '';
                            if (city || country) {
                                setLocationName([city, country].filter(Boolean).join(', '));
                            }
                        }
                    } catch {
                        // Reverse geocode failed — keep default display name
                    }
                }
                // If permission denied, fall through to default New York URL
            } catch {
                // Location unavailable — fall through to default
            }

            const res = await fetch(apiUrl);
            const json = await res.json();
            if (json.code === 200 && json.data) {
                const t = json.data.timings;
                setPrayers([
                    { name: 'Fajr', time: t.Fajr, icon: 'moon-outline', arabicName: 'الفجر' },
                    { name: 'Dhuhr', time: t.Dhuhr, icon: 'sunny', arabicName: 'الظهر' },
                    { name: 'Asr', time: t.Asr, icon: 'partly-sunny-outline', arabicName: 'العصر' },
                    { name: 'Maghrib', time: t.Maghrib, icon: 'cloud-outline', arabicName: 'المغرب' },
                    { name: 'Isha', time: t.Isha, icon: 'moon', arabicName: 'العشاء' },
                ]);
            }
        } catch {
            // Silently handle — prayer times are best-effort during onboarding
        } finally {
            setPrayerLoading(false);
        }
    };

    const handleSelectProfile = (type: CulturalProfileType) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedProfile(type);
    };

    const handleContinue = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Build and save cultural profile
        const greeting =
            selectedProfile === 'muslim'
                ? 'Assalamu Alaikum'
                : selectedProfile === 'standard'
                  ? 'Welcome back'
                  : customGreeting || 'Hello';

        try {
            await AsyncStorage.setItem(
                '@cultural-profile',
                JSON.stringify({
                    type: selectedProfile,
                    greeting,
                    enableDeenTools: selectedProfile === 'muslim',
                    enablePrayerReminders: selectedProfile === 'muslim',
                })
            );
        } catch {
            // Non-blocking — continue even if save fails
        }

        router.push('/interests?onboarding=true' as any);
    };

    // Determine next prayer for highlighting
    const getNextPrayer = (): string | null => {
        if (prayers.length === 0) return null;
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        for (const prayer of prayers) {
            const [h, m] = prayer.time.split(':').map(Number);
            if (h * 60 + m > currentMinutes) return prayer.name;
        }
        return prayers[0].name; // All passed — tomorrow's Fajr
    };
    const nextPrayerName = getNextPrayer();

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[900], colors.obsidian[900]]} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <Animated.View entering={FadeIn.duration(600)}>
                    <Text style={styles.welcomeText}>Welcome to 0G</Text>
                    <Text style={styles.subtitle}>
                        Personalize your experience in a few steps
                    </Text>
                </Animated.View>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Section 1: Prayer Times Preview ── */}
                <Animated.View entering={FadeInDown.duration(500).delay(300)}>
                    <Text style={styles.sectionTitle}>Today's Prayer Times</Text>
                    <View style={styles.prayerCard}>
                        <LinearGradient
                            colors={[colors.gold[700] + '18', colors.gold[500] + '05', 'transparent']}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />

                        {/* Header row: location + next prayer badge */}
                        <View style={styles.prayerCardHeader}>
                            <View style={styles.prayerLocationRow}>
                                <Ionicons name="location-outline" size={14} color={colors.text.muted} />
                                <Text style={styles.prayerLocationText}>{locationName}</Text>
                            </View>
                            {nextPrayerName && (
                                <View style={styles.nextPrayerBadge}>
                                    <Ionicons name="time-outline" size={12} color={colors.gold[400]} />
                                    <Text style={styles.nextPrayerLabel}>Next: {nextPrayerName}</Text>
                                </View>
                            )}
                        </View>

                        {prayerLoading ? (
                            <View style={styles.prayerLoadingContainer}>
                                <ActivityIndicator size="small" color={colors.gold[500]} />
                                <Text style={styles.prayerLoadingText}>Loading prayer times...</Text>
                            </View>
                        ) : prayers.length > 0 ? (
                            <View style={styles.prayerTimesGrid}>
                                {prayers.map((prayer) => {
                                    const isNext = prayer.name === nextPrayerName;
                                    return (
                                        <View
                                            key={prayer.name}
                                            style={[styles.prayerTimeRow, isNext && styles.prayerTimeRowActive]}
                                        >
                                            {isNext && (
                                                <LinearGradient
                                                    colors={[colors.gold[500] + '10', 'transparent']}
                                                    style={StyleSheet.absoluteFill}
                                                    start={{ x: 0, y: 0.5 }}
                                                    end={{ x: 1, y: 0.5 }}
                                                />
                                            )}
                                            <View style={[styles.prayerTimeIcon, isNext && styles.prayerTimeIconActive]}>
                                                <Ionicons
                                                    name={prayer.icon}
                                                    size={18}
                                                    color={isNext ? colors.gold[400] : colors.text.muted}
                                                />
                                            </View>
                                            <View style={styles.prayerTimeInfo}>
                                                <Text style={[styles.prayerTimeName, isNext && styles.prayerTimeNameActive]}>
                                                    {prayer.name}
                                                </Text>
                                                <Text style={styles.prayerTimeArabic}>{prayer.arabicName}</Text>
                                            </View>
                                            <Text style={[styles.prayerTimeValue, isNext && styles.prayerTimeValueActive]}>
                                                {formatTime12h(prayer.time)}
                                            </Text>
                                            {isNext && <View style={styles.nextDot} />}
                                        </View>
                                    );
                                })}
                            </View>
                        ) : (
                            <View style={styles.prayerLoadingContainer}>
                                <Ionicons name="cloud-offline-outline" size={20} color={colors.text.muted} />
                                <Text style={styles.prayerLoadingText}>Could not load prayer times</Text>
                            </View>
                        )}

                        <Text style={styles.prayerFooterNote}>
                            Calculated using ISNA method. You can update your location later.
                        </Text>
                    </View>
                </Animated.View>

                {/* ── Section 2: Cultural Profile Selector ── */}
                <Animated.View entering={FadeInDown.duration(500).delay(500)}>
                    <Text style={styles.sectionTitle}>Your Experience</Text>
                    <Text style={styles.sectionSubtitle}>
                        Choose how you'd like to be greeted and what features to enable
                    </Text>

                    <View style={styles.profileOptions}>
                        {CULTURAL_OPTIONS.map((option) => {
                            const isSelected = selectedProfile === option.type;
                            return (
                                <TouchableOpacity
                                    key={option.type}
                                    style={[
                                        styles.profileOption,
                                        isSelected && { borderColor: option.color + '80' },
                                    ]}
                                    onPress={() => handleSelectProfile(option.type)}
                                    activeOpacity={0.7}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected: isSelected }}
                                    accessibilityLabel={`${option.title}: ${option.description}`}
                                >
                                    {isSelected && (
                                        <View
                                            style={[
                                                StyleSheet.absoluteFill,
                                                { backgroundColor: option.color + '08', borderRadius: 14 },
                                            ]}
                                        />
                                    )}
                                    <View style={[styles.profileOptionIcon, { backgroundColor: option.color + '15' }]}>
                                        <Ionicons name={option.icon} size={22} color={option.color} />
                                    </View>
                                    <View style={styles.profileOptionContent}>
                                        <Text style={styles.profileOptionTitle}>{option.title}</Text>
                                        <Text style={styles.profileOptionGreeting}>"{option.greeting}"</Text>
                                        <Text style={styles.profileOptionDesc}>{option.description}</Text>
                                    </View>
                                    {isSelected && (
                                        <View style={[styles.profileCheckBadge, { backgroundColor: option.color }]}>
                                            <Ionicons name="checkmark" size={14} color={colors.text.primary} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}

                        {/* Custom greeting input */}
                        {selectedProfile === 'custom' && (
                            <Animated.View entering={FadeInDown.duration(300)} style={styles.customGreetingContainer}>
                                <Text style={styles.customGreetingLabel}>Your greeting</Text>
                                <View style={styles.customGreetingInputWrapper}>
                                    <TextInput
                                        style={styles.customGreetingTextInput}
                                        placeholder="Type your greeting..."
                                        placeholderTextColor={colors.text.muted}
                                        value={customGreeting}
                                        onChangeText={setCustomGreeting}
                                        selectionColor={colors.emerald[500]}
                                        maxLength={50}
                                    />
                                </View>
                            </Animated.View>
                        )}
                    </View>
                </Animated.View>

                {/* ── Privacy Highlight ── */}
                <Animated.View entering={FadeInDown.duration(400).delay(700)} style={styles.privacyCard}>
                    <View style={styles.privacyIcon}>
                        <Ionicons name="shield-checkmark" size={24} color={colors.emerald[500]} />
                    </View>
                    <Text style={styles.privacyTitle}>Your privacy is protected</Text>
                    <Text style={styles.privacyText}>
                        No tracking, no ads, no data selling. Your account starts in private mode.
                    </Text>
                </Animated.View>
            </ScrollView>

            {/* Floating CTA */}
            <View style={[styles.ctaBar, { paddingBottom: insets.bottom + spacing.md }]}>
                <TouchableOpacity
                    style={styles.ctaButton}
                    onPress={handleContinue}
                    activeOpacity={0.9}
                    accessibilityRole="button"
                    accessibilityLabel="Continue to choose your interests"
                >
                    <LinearGradient
                        colors={[colors.gold[400], colors.gold[600]]}
                        style={styles.ctaGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Text style={styles.ctaText}>Continue</Text>
                        <Ionicons
                            name="arrow-forward"
                            size={20}
                            color={colors.obsidian[900]}
                            style={{ marginStart: spacing.sm }}
                        />
                    </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        // Mark onboarding complete even if skipped
                        await apiFetch(API.onboardingComplete, { method: 'POST' }).catch(() => {});
                        await useAuthStore.getState().refreshUser().catch(() => {});
                        router.replace('/(tabs)');
                    }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Skip onboarding"
                >
                    <Text style={styles.skipText}>Skip for now</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },

    // ── Header ──
    header: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    welcomeText: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
        letterSpacing: -0.8,
    },
    subtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        marginTop: spacing.sm,
        lineHeight: 22,
    },
    scroll: { flex: 1 },
    sectionTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
        paddingHorizontal: spacing.xl,
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
    },
    sectionSubtitle: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.md,
        lineHeight: 20,
    },

    // ── Prayer Times Card ──
    prayerCard: {
        marginHorizontal: spacing.xl,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.gold[500] + '20',
        overflow: 'hidden',
        padding: spacing.lg,
    },
    prayerCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    prayerLocationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    prayerLocationText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
    },
    nextPrayerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.surface.goldSubtle,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.gold[500] + '15',
    },
    nextPrayerLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.gold[400],
    },
    prayerLoadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.xl,
    },
    prayerLoadingText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
    },
    prayerTimesGrid: {
        gap: spacing.xs,
    },
    prayerTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.sm,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    prayerTimeRowActive: {
        borderWidth: 1,
        borderColor: colors.gold[500] + '18',
    },
    prayerTimeIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.surface.glass,
        alignItems: 'center',
        justifyContent: 'center',
    },
    prayerTimeIconActive: {
        backgroundColor: colors.surface.goldSubtle,
    },
    prayerTimeInfo: {
        flex: 1,
        marginStart: spacing.md,
    },
    prayerTimeName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
    prayerTimeNameActive: {
        color: colors.gold[400],
    },
    prayerTimeArabic: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: 1,
    },
    prayerTimeValue: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.text.secondary,
        fontFamily: 'Inter-Bold',
    },
    prayerTimeValueActive: {
        color: colors.gold[400],
    },
    nextDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: colors.gold[500],
        marginStart: spacing.sm,
    },
    prayerFooterNote: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: spacing.md,
        textAlign: 'center',
    },

    // ── Cultural Profile ──
    profileOptions: {
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
    },
    profileOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        padding: spacing.md,
        borderWidth: 1.5,
        borderColor: colors.border.subtle,
        position: 'relative',
        overflow: 'hidden',
    },
    profileOptionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileOptionContent: {
        flex: 1,
        marginStart: spacing.md,
        marginEnd: spacing.lg,
    },
    profileOptionTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.text.primary,
    },
    profileOptionGreeting: {
        fontSize: typography.fontSize.sm,
        color: colors.gold[400],
        fontStyle: 'italic',
        marginTop: 2,
    },
    profileOptionDesc: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: 2,
        lineHeight: 16,
    },
    profileCheckBadge: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Custom Greeting Input ──
    customGreetingContainer: {
        marginTop: spacing.xs,
    },
    customGreetingLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
        marginBottom: spacing.xs,
    },
    customGreetingInputWrapper: {
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    customGreetingTextInput: {
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        minHeight: 48,
    },

    // ── Privacy ──
    privacyCard: {
        marginHorizontal: spacing.xl,
        marginTop: spacing.xl,
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        alignItems: 'center',
    },
    privacyIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.emerald[500] + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    privacyTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    privacyText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 20,
    },

    // ── CTA ──
    ctaBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        backgroundColor: colors.obsidian[900] + 'F0',
    },
    ctaButton: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    ctaGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: spacing.xl,
    },
    ctaText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '600',
        color: colors.obsidian[900],
        fontFamily: 'Inter-SemiBold',
    },
    skipText: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
        textAlign: 'center',
        marginTop: spacing.md,
    },
});
