import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    FadeIn,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { colors, typography, spacing, shadows } from '@zerog/ui';
import { ScreenHeader, LoadingView } from '../../components';

// ─── Constants ────────────────────────────────────────────────────
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(SCREEN_WIDTH - 64, 320);
const RING_WIDTH = 2;

// ─── Math helpers ─────────────────────────────────────────────────
function calculateQiblaDirection(lat: number, lng: number): number {
    const latRad = (lat * Math.PI) / 180;
    const lngRad = (lng * Math.PI) / 180;
    const kaabaLatRad = (KAABA_LAT * Math.PI) / 180;
    const kaabaLngRad = (KAABA_LNG * Math.PI) / 180;

    const y = Math.sin(kaabaLngRad - lngRad);
    const x =
        Math.cos(latRad) * Math.tan(kaabaLatRad) -
        Math.sin(latRad) * Math.cos(kaabaLngRad - lngRad);

    let qibla = (Math.atan2(y, x) * 180) / Math.PI;
    if (qibla < 0) qibla += 360;
    return qibla;
}

function calculateDistance(lat: number, lng: number): number {
    const R = 6371; // km
    const dLat = ((KAABA_LAT - lat) * Math.PI) / 180;
    const dLng = ((KAABA_LNG - lng) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat * Math.PI) / 180) *
            Math.cos((KAABA_LAT * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

function formatDistance(km: number): string {
    if (km >= 1000) return `${(km / 1000).toFixed(1)}k km`;
    return `${km.toLocaleString()} km`;
}

// ─── Compass Tick Component ───────────────────────────────────────
function CompassTick({ index, total }: { index: number; total: number }) {
    const angle = (index * 360) / total;
    const isMajor = index % 18 === 0;
    const isMinor = index % 6 === 0;
    return (
        <View
            style={[
                styles.tick,
                {
                    transform: [
                        { rotate: `${angle}deg` },
                        { translateY: -(COMPASS_SIZE / 2) + 10 },
                    ],
                },
                isMajor ? styles.tickMajor : isMinor ? styles.tickMinor : null,
            ]}
        />
    );
}

// ─── Main Screen ──────────────────────────────────────────────────
export default function QiblaScreen() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [qiblaAngle, setQiblaAngle] = useState(0);
    const [distance, setDistance] = useState(0);
    const [locationName, setLocationName] = useState('');
    const rotation = useSharedValue(0);

    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Location Required', 'Qibla direction requires location access.');
                    setIsLoading(false);
                    return;
                }

                const loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });
                const { latitude, longitude } = loc.coords;

                const angle = calculateQiblaDirection(latitude, longitude);
                setQiblaAngle(Math.round(angle));
                setDistance(calculateDistance(latitude, longitude));

                rotation.value = withSpring(angle, {
                    damping: 18,
                    stiffness: 70,
                    mass: 1.2,
                });

                try {
                    const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
                    if (geo) setLocationName(geo.city || geo.subregion || 'Your Location');
                } catch {
                    setLocationName('Your Location');
                }
            } catch (err) {
                console.error('Qibla error:', err);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const needleStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], '#0A0A10', colors.obsidian[900]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            />

            <ScreenHeader title="Qibla Direction" />

            <View style={styles.content}>
                {isLoading ? (
                    <LoadingView message="Finding Qibla direction..." />
                ) : (
                    <Animated.View entering={FadeIn.duration(700)} style={styles.compassContainer}>
                        {/* Outer glow ring */}
                        <View style={styles.compassGlow}>
                            <LinearGradient
                                colors={[colors.gold[500] + '08', 'transparent']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0.5, y: 0 }}
                                end={{ x: 0.5, y: 1 }}
                            />
                        </View>

                        {/* Main compass ring */}
                        <View style={styles.compassOuter}>
                            {/* Inner gradient ring */}
                            <View style={styles.compassInnerRing} />

                            {/* Cardinal directions */}
                            <Text style={[styles.cardinal, styles.cardinalN]}>N</Text>
                            <Text style={[styles.cardinal, styles.cardinalS]}>S</Text>
                            <Text style={[styles.cardinal, styles.cardinalE]}>E</Text>
                            <Text style={[styles.cardinal, styles.cardinalW]}>W</Text>

                            {/* Degree marks */}
                            {Array.from({ length: 72 }).map((_, i) => (
                                <CompassTick key={i} index={i} total={72} />
                            ))}

                            {/* Qibla needle */}
                            <Animated.View style={[styles.needle, needleStyle]}>
                                <LinearGradient
                                    colors={[colors.gold[400], colors.gold[600]]}
                                    style={styles.needleBar}
                                    start={{ x: 0.5, y: 0 }}
                                    end={{ x: 0.5, y: 1 }}
                                />
                                <View style={styles.kaabaIcon}>
                                    <LinearGradient
                                        colors={[colors.obsidian[700], colors.obsidian[900]]}
                                        style={StyleSheet.absoluteFill}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    />
                                    <Text style={styles.kaabaEmoji}>🕋</Text>
                                </View>
                            </Animated.View>

                            {/* Center dot */}
                            <View style={styles.centerDot}>
                                <View style={styles.centerDotInner} />
                            </View>
                        </View>

                        {/* ── Info Section ── */}
                        <Animated.View entering={FadeInUp.duration(500).delay(400)} style={styles.infoSection}>
                            {/* Angle */}
                            <View style={styles.anglePill}>
                                <Ionicons name="navigate" size={16} color={colors.gold[400]} />
                                <Text style={styles.angleText}>{qiblaAngle}°</Text>
                            </View>

                            {/* Info cards */}
                            <View style={styles.infoCards}>
                                <View style={styles.infoCard}>
                                    <Ionicons name="location-outline" size={16} color={colors.emerald[400]} />
                                    <Text style={styles.infoCardLabel}>Location</Text>
                                    <Text style={styles.infoCardValue}>{locationName}</Text>
                                </View>
                                <View style={styles.infoDivider} />
                                <View style={styles.infoCard}>
                                    <Ionicons name="airplane-outline" size={16} color={colors.gold[400]} />
                                    <Text style={styles.infoCardLabel}>Distance</Text>
                                    <Text style={styles.infoCardValue}>{formatDistance(distance)}</Text>
                                </View>
                            </View>
                        </Animated.View>

                        {/* Tip */}
                        <Animated.View entering={FadeIn.duration(400).delay(600)} style={styles.tipContainer}>
                            <Ionicons name="information-circle-outline" size={14} color={colors.text.muted} />
                            <Text style={styles.tipText}>
                                Point the top of your phone toward the Kaaba. Hold flat, away from magnets.
                            </Text>
                        </Animated.View>
                    </Animated.View>
                )}
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    compassContainer: { alignItems: 'center', paddingHorizontal: spacing.xl },

    // Outer glow
    compassGlow: {
        position: 'absolute',
        width: COMPASS_SIZE + 40,
        height: COMPASS_SIZE + 40,
        borderRadius: (COMPASS_SIZE + 40) / 2,
        top: -20,
    },

    // Main compass
    compassOuter: {
        width: COMPASS_SIZE,
        height: COMPASS_SIZE,
        borderRadius: COMPASS_SIZE / 2,
        borderWidth: RING_WIDTH,
        borderColor: colors.border.default,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface.glass,
    },
    compassInnerRing: {
        position: 'absolute',
        width: COMPASS_SIZE - 50,
        height: COMPASS_SIZE - 50,
        borderRadius: (COMPASS_SIZE - 50) / 2,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },

    // Cardinals
    cardinal: {
        position: 'absolute',
        fontSize: 14,
        fontWeight: '700',
        color: colors.text.secondary,
        letterSpacing: 0.5,
    },
    cardinalN: { top: 18, color: colors.gold[400], fontSize: 16 },
    cardinalS: { bottom: 18 },
    cardinalE: { right: 18 },
    cardinalW: { left: 18 },

    // Ticks
    tick: {
        position: 'absolute',
        width: 1,
        height: 6,
        backgroundColor: colors.text.muted + '30',
    },
    tickMajor: { height: 14, width: 2, backgroundColor: colors.text.secondary + '80' },
    tickMinor: { height: 9, backgroundColor: colors.text.muted + '60' },

    // Needle
    needle: {
        position: 'absolute',
        width: 4,
        height: COMPASS_SIZE / 2 - 30,
        alignItems: 'center',
        bottom: COMPASS_SIZE / 2,
        transformOrigin: 'bottom',
    },
    needleBar: {
        width: 3,
        height: '65%',
        borderRadius: 2,
    },
    kaabaIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: colors.gold[500],
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        top: -20,
        overflow: 'hidden',
        ...shadows.glow,
    },
    kaabaEmoji: { fontSize: 20 },

    // Center
    centerDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.obsidian[800],
        borderWidth: 2,
        borderColor: colors.gold[500],
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerDotInner: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.gold[400],
    },

    // ── Info Section ──
    infoSection: { alignItems: 'center', marginTop: spacing['2xl'], width: '100%' },

    anglePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface.goldSubtle,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.gold[500] + '20',
        marginBottom: spacing.xl,
    },
    angleText: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: '700',
        color: colors.gold[400],
        fontFamily: 'Inter-Bold',
    },

    infoCards: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        paddingVertical: spacing.lg,
        width: '100%',
    },
    infoCard: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    infoCardLabel: {
        fontSize: 10,
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoCardValue: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.text.primary,
    },
    infoDivider: {
        width: 1,
        height: 36,
        backgroundColor: colors.border.subtle,
    },

    // Tip
    tipContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.xl,
        paddingHorizontal: spacing.xl,
    },
    tipText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        textAlign: 'center',
        lineHeight: 17,
        flex: 1,
    },
});
