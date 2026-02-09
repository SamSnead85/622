import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;
const COMPASS_SIZE = Dimensions.get('window').width - 80;

function calculateQiblaDirection(lat: number, lng: number): number {
    const latRad = (lat * Math.PI) / 180;
    const lngRad = (lng * Math.PI) / 180;
    const kaabaLatRad = (KAABA_LAT * Math.PI) / 180;
    const kaabaLngRad = (KAABA_LNG * Math.PI) / 180;

    const y = Math.sin(kaabaLngRad - lngRad);
    const x = Math.cos(latRad) * Math.tan(kaabaLatRad) - Math.sin(latRad) * Math.cos(kaabaLngRad - lngRad);

    let qibla = (Math.atan2(y, x) * 180) / Math.PI;
    if (qibla < 0) qibla += 360;
    return qibla;
}

function calculateDistance(lat: number, lng: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((KAABA_LAT - lat) * Math.PI) / 180;
    const dLng = ((KAABA_LNG - lng) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat * Math.PI) / 180) * Math.cos((KAABA_LAT * Math.PI) / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

export default function QiblaScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
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

                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                const { latitude, longitude } = loc.coords;

                const angle = calculateQiblaDirection(latitude, longitude);
                setQiblaAngle(Math.round(angle));
                setDistance(calculateDistance(latitude, longitude));

                rotation.value = withSpring(angle, { damping: 15, stiffness: 80 });

                try {
                    const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
                    if (geo) setLocationName(geo.city || geo.subregion || 'Your Location');
                } catch { setLocationName('Your Location'); }
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
            <LinearGradient colors={[colors.obsidian[900], '#0A0A10']} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Qibla Direction</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.gold[500]} />
                        <Text style={styles.loadingText}>Finding Qibla direction...</Text>
                    </View>
                ) : (
                    <Animated.View entering={FadeIn.duration(800)} style={styles.compassContainer}>
                        {/* Compass outer ring */}
                        <View style={styles.compassOuter}>
                            {/* Cardinal directions */}
                            <Text style={[styles.cardinal, styles.cardinalN]}>N</Text>
                            <Text style={[styles.cardinal, styles.cardinalS]}>S</Text>
                            <Text style={[styles.cardinal, styles.cardinalE]}>E</Text>
                            <Text style={[styles.cardinal, styles.cardinalW]}>W</Text>

                            {/* Compass markings */}
                            {Array.from({ length: 72 }).map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.tick,
                                        {
                                            transform: [
                                                { rotate: `${i * 5}deg` },
                                                { translateY: -COMPASS_SIZE / 2 + 8 },
                                            ],
                                        },
                                        i % 18 === 0 ? styles.tickMajor : i % 6 === 0 ? styles.tickMinor : {},
                                    ]}
                                />
                            ))}

                            {/* Qibla needle */}
                            <Animated.View style={[styles.needle, needleStyle]}>
                                <View style={styles.needleArrow} />
                                <View style={styles.kaabaIcon}>
                                    <Text style={styles.kaabaEmoji}>🕋</Text>
                                </View>
                            </Animated.View>

                            {/* Center dot */}
                            <View style={styles.centerDot} />
                        </View>

                        {/* Info */}
                        <View style={styles.infoContainer}>
                            <Text style={styles.angleText}>{qiblaAngle}°</Text>
                            <View style={styles.infoRow}>
                                <Ionicons name="location-outline" size={14} color={colors.text.muted} />
                                <Text style={styles.infoText}>{locationName}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Ionicons name="navigate-outline" size={14} color={colors.text.muted} />
                                <Text style={styles.infoText}>{distance.toLocaleString()} km to Mecca</Text>
                            </View>
                        </View>

                        <Text style={styles.note}>
                            Point the top of your phone toward the Kaaba indicator. For best accuracy, hold your phone flat and away from magnets.
                        </Text>
                    </Animated.View>
                )}
            </View>
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
    content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingContainer: { alignItems: 'center' },
    loadingText: { color: colors.text.muted, marginTop: spacing.md, fontSize: typography.fontSize.sm },

    compassContainer: { alignItems: 'center', paddingHorizontal: spacing.xl },
    compassOuter: {
        width: COMPASS_SIZE, height: COMPASS_SIZE, borderRadius: COMPASS_SIZE / 2,
        borderWidth: 2, borderColor: colors.border.default,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.surface.glass,
    },
    cardinal: {
        position: 'absolute', fontSize: 14, fontWeight: '700', color: colors.text.secondary,
    },
    cardinalN: { top: 16, color: colors.gold[400] },
    cardinalS: { bottom: 16 },
    cardinalE: { right: 16 },
    cardinalW: { left: 16 },
    tick: {
        position: 'absolute', width: 1, height: 6,
        backgroundColor: colors.text.muted + '40',
    },
    tickMajor: { height: 12, width: 2, backgroundColor: colors.text.secondary },
    tickMinor: { height: 8, backgroundColor: colors.text.muted + '80' },
    needle: {
        position: 'absolute', width: 4, height: COMPASS_SIZE / 2 - 30,
        alignItems: 'center',
        bottom: COMPASS_SIZE / 2,
        transformOrigin: 'bottom',
    },
    needleArrow: {
        width: 4, height: '70%',
        backgroundColor: colors.gold[500],
        borderRadius: 2,
    },
    kaabaIcon: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: colors.obsidian[800],
        borderWidth: 2, borderColor: colors.gold[500],
        alignItems: 'center', justifyContent: 'center',
        position: 'absolute', top: -18,
    },
    kaabaEmoji: { fontSize: 18 },
    centerDot: {
        width: 12, height: 12, borderRadius: 6,
        backgroundColor: colors.gold[500],
    },
    infoContainer: { alignItems: 'center', marginTop: spacing['2xl'] },
    angleText: { fontSize: 48, fontWeight: '700', color: colors.gold[400], fontFamily: 'Inter-Bold' },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
    infoText: { fontSize: typography.fontSize.sm, color: colors.text.muted },
    note: {
        fontSize: typography.fontSize.xs, color: colors.text.muted, textAlign: 'center',
        marginTop: spacing.xl, paddingHorizontal: spacing.xl, lineHeight: 18,
    },
});
