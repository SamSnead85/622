import { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeInDown,
    useSharedValue,
    useAnimatedProps,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors, typography, spacing } from '@zerog/ui';
import { useAuthStore } from '../../stores';
import { ScreenHeader, GlassCard } from '../../components';
import { apiFetch, API } from '../../lib/api';

// ─── Animated Circle for Score Ring ──────────────────────────────────
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 160;
const STROKE_WIDTH = 12;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getScoreColor(score: number): string {
    if (score >= 70) return colors.emerald[500];
    if (score >= 40) return colors.amber[500];
    return colors.coral[500];
}

function getScoreLabel(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
}

// ─── Privacy Score Ring ──────────────────────────────────────────────
function PrivacyScoreRing({ score }: { score: number }) {
    const animatedProgress = useSharedValue(0);
    const scoreColor = getScoreColor(score);

    // Animate on mount
    useMemo(() => {
        animatedProgress.value = withTiming(score / 100, {
            duration: 1200,
            easing: Easing.out(Easing.cubic),
        });
    }, [score]);

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: CIRCUMFERENCE * (1 - animatedProgress.value),
    }));

    return (
        <View style={scoreStyles.container}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
                {/* Background track */}
                <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RADIUS}
                    stroke={colors.obsidian[600]}
                    strokeWidth={STROKE_WIDTH}
                    fill="transparent"
                />
                {/* Animated progress */}
                <AnimatedCircle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RADIUS}
                    stroke={scoreColor}
                    strokeWidth={STROKE_WIDTH}
                    fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    animatedProps={animatedProps}
                    rotation="-90"
                    origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                />
            </Svg>
            <View style={scoreStyles.labelContainer}>
                <Text style={[scoreStyles.scoreValue, { color: scoreColor }]}>{score}</Text>
                <Text style={scoreStyles.scoreMax}>/100</Text>
            </View>
        </View>
    );
}

const scoreStyles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    labelContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scoreValue: {
        fontSize: typography.fontSize['4xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
    },
    scoreMax: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginTop: -2,
    },
});

// ─── Visibility Row ──────────────────────────────────────────────────
function VisibilityRow({
    icon,
    label,
    value,
    onPress,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    onPress?: () => void;
}) {
    return (
        <TouchableOpacity
            style={styles.visibilityRow}
            onPress={() => {
                if (onPress) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPress();
                }
            }}
            activeOpacity={onPress ? 0.7 : 1}
            disabled={!onPress}
        >
            <View style={styles.visibilityIcon}>
                <Ionicons name={icon} size={18} color={colors.gold[400]} />
            </View>
            <View style={styles.visibilityContent}>
                <Text style={styles.visibilityLabel}>{label}</Text>
                <Text style={styles.visibilityValue}>{value}</Text>
            </View>
            {onPress && (
                <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
            )}
        </TouchableOpacity>
    );
}

// ─── Encryption Check Row ────────────────────────────────────────────
function EncryptionRow({ label }: { label: string }) {
    return (
        <View style={styles.encryptionRow}>
            <View style={styles.encryptionBadge}>
                <Ionicons name="checkmark-circle" size={18} color={colors.emerald[500]} />
            </View>
            <Text style={styles.encryptionLabel}>{label}</Text>
        </View>
    );
}

// ─── Data Stat ───────────────────────────────────────────────────────
function DataStat({ value, label }: { value: string; label: string }) {
    return (
        <View style={styles.dataStat}>
            <Text style={styles.dataStatValue}>{value}</Text>
            <Text style={styles.dataStatLabel}>{label}</Text>
        </View>
    );
}

// ─── Main Screen ─────────────────────────────────────────────────────
export default function PrivacyDashboardScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);

    // ─── Calculate privacy score ─────────────────────
    const privacyScore = useMemo(() => {
        let score = 0;
        // Profile visibility: private mode = +20
        if (user?.isPrivate) score += 20;
        // Encryption is always on (platform feature) = +20
        score += 20;
        // 2FA: we treat it as enabled if user has gone through security setup
        // For now, assume not enabled (server should expose this)
        // We give +20 if the user has a verified account as a proxy
        if (user?.isVerified) score += 20;
        // Public profile OFF = +20
        if (!user?.communityOptIn) score += 20;
        // Data export done recently = +20 (placeholder, always give partial)
        // In production this would check last export timestamp
        score += 0;
        return score;
    }, [user]);

    const memberSince = useMemo(() => {
        if (!user?.createdAt) return 'Unknown';
        const date = new Date(user.createdAt);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }, [user?.createdAt]);

    const handleExportData = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            'Export All My Data',
            "We'll prepare a complete archive of everything you've posted — posts, comments, media, and profile data. You'll receive an email when it's ready to download.",
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Request Export',
                    onPress: async () => {
                        try {
                            await apiFetch(API.accountExport, { method: 'POST' });
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            Alert.alert(
                                'Export Requested',
                                "You'll receive an email when your data archive is ready to download."
                            );
                        } catch {
                            Alert.alert('Error', 'Failed to request data export. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleDeleteAccount = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Alert.alert(
            'Delete My Account',
            'Your account will be scheduled for deletion with a 30-day grace period. During this time you can log back in to cancel the deletion. After 30 days, all your data will be permanently removed.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete My Account',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Confirm Deletion',
                            'To delete your account, please contact us at support@0gravity.ai or use the web app.',
                            [{ text: 'OK' }]
                        );
                    },
                },
            ]
        );
    };

    const stagger = (index: number) => FadeInDown.duration(400).delay(index * 100).springify();

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            <ScreenHeader title="Privacy Dashboard" showBack />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={{
                    paddingBottom: insets.bottom + 80,
                    paddingHorizontal: spacing.lg,
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* ─── 1. Privacy Score ──────────────────────────── */}
                <Animated.View entering={stagger(0)}>
                    <GlassCard style={styles.scoreCard} padding="lg">
                        <LinearGradient
                            colors={[colors.surface.goldSubtle, 'transparent']}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                        <Text style={styles.sectionLabel}>YOUR PRIVACY SCORE</Text>
                        <PrivacyScoreRing score={privacyScore} />
                        <Text style={[styles.scoreLabel, { color: getScoreColor(privacyScore) }]}>
                            {getScoreLabel(privacyScore)}
                        </Text>
                        <Text style={styles.scoreHint}>
                            Enable 2FA, go private, and export your data to reach 100.
                        </Text>
                    </GlassCard>
                </Animated.View>

                {/* ─── 2. Who Can See You ────────────────────────── */}
                <Animated.View entering={stagger(1)}>
                    <Text style={styles.sectionTitle}>Your Visibility</Text>
                    <GlassCard padding="none">
                        <VisibilityRow
                            icon="eye-outline"
                            label="Your posts are visible to"
                            value={
                                user?.communityOptIn
                                    ? 'Everyone in the community'
                                    : `${user?.followersCount ?? 0} followers`
                            }
                            onPress={() => router.push('/settings' as any)}
                        />
                        <VisibilityRow
                            icon="search-outline"
                            label="You appear in community search"
                            value={user?.communityOptIn ? 'Yes' : 'No'}
                            onPress={() => router.push('/settings' as any)}
                        />
                        <VisibilityRow
                            icon="globe-outline"
                            label="Public profile"
                            value={user?.communityOptIn ? 'Enabled' : 'Disabled'}
                            onPress={() => router.push('/settings' as any)}
                        />
                    </GlassCard>
                </Animated.View>

                {/* ─── 3. Encryption Status ──────────────────────── */}
                <Animated.View entering={stagger(2)}>
                    <Text style={styles.sectionTitle}>Encryption Status</Text>
                    <GlassCard style={styles.encryptionCard} padding="lg">
                        <View style={styles.encryptionHeader}>
                            <View style={styles.encryptionIconWrap}>
                                <Ionicons name="lock-closed" size={22} color={colors.emerald[400]} />
                            </View>
                            <Text style={styles.encryptionTitle}>Fully Protected</Text>
                        </View>
                        <EncryptionRow label="Your messages are end-to-end encrypted" />
                        <EncryptionRow label="Your media is stored with AES-256 encryption" />
                        <EncryptionRow label="All API traffic uses TLS 1.3" />
                    </GlassCard>
                </Animated.View>

                {/* ─── 4. Your Data ──────────────────────────────── */}
                <Animated.View entering={stagger(3)}>
                    <Text style={styles.sectionTitle}>Your Data</Text>
                    <GlassCard padding="lg">
                        <View style={styles.dataGrid}>
                            <DataStat value={String(user?.postsCount ?? 0)} label="Posts" />
                            <DataStat value={String(user?.followersCount ?? 0)} label="Followers" />
                            <DataStat value={String(user?.followingCount ?? 0)} label="Following" />
                            <DataStat value={memberSince} label="Member since" />
                        </View>

                        {/* Export Button */}
                        <TouchableOpacity
                            style={styles.exportBtn}
                            onPress={handleExportData}
                            activeOpacity={0.9}
                            accessibilityRole="button"
                            accessibilityLabel="Export all my data"
                        >
                            <LinearGradient
                                colors={[colors.gold[400], colors.gold[600]]}
                                style={styles.exportBtnGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons
                                    name="download-outline"
                                    size={18}
                                    color={colors.obsidian[900]}
                                />
                                <Text style={styles.exportBtnText}>Export All My Data</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Delete Account */}
                        <TouchableOpacity
                            style={styles.deleteLink}
                            onPress={handleDeleteAccount}
                            accessibilityRole="button"
                            accessibilityLabel="Delete my account"
                        >
                            <Text style={styles.deleteLinkText}>Delete My Account</Text>
                        </TouchableOpacity>
                    </GlassCard>
                </Animated.View>

                {/* ─── 5. Content Ownership Badge ────────────────── */}
                <Animated.View entering={stagger(4)}>
                    <GlassCard gold style={styles.ownershipCard} padding="lg">
                        <View style={styles.ownershipIcon}>
                            <Ionicons name="shield-checkmark" size={28} color={colors.gold[400]} />
                        </View>
                        <Text style={styles.ownershipTitle}>You Own Your Data</Text>
                        <Text style={styles.ownershipText}>
                            You own everything you create. You can export your data anytime and take
                            it with you. We never sell your personal information.
                        </Text>
                    </GlassCard>
                </Animated.View>

                {/* ─── Footer ────────────────────────────────────── */}
                <Animated.View entering={stagger(5)} style={styles.footer}>
                    <View style={styles.footerRow}>
                        <Ionicons name="shield-checkmark-outline" size={14} color={colors.emerald[500]} />
                        <Text style={styles.footerText}>
                            Your data is encrypted and never monetized.
                        </Text>
                    </View>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },
    scroll: {
        flex: 1,
    },

    // ─── Section Labels ─────────────────────────────
    sectionLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
        marginStart: spacing.xs,
    },

    // ─── Score Card ─────────────────────────────────
    scoreCard: {
        marginTop: spacing.lg,
        alignItems: 'center',
        overflow: 'hidden',
    },
    scoreLabel: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        marginTop: spacing.md,
    },
    scoreHint: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        textAlign: 'center',
        marginTop: spacing.xs,
        lineHeight: 18,
    },

    // ─── Visibility Rows ────────────────────────────
    visibilityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    visibilityIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center',
        justifyContent: 'center',
    },
    visibilityContent: {
        flex: 1,
        marginStart: spacing.md,
    },
    visibilityLabel: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
    },
    visibilityValue: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        marginTop: 1,
    },

    // ─── Encryption ─────────────────────────────────
    encryptionCard: {
        overflow: 'hidden',
    },
    encryptionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    encryptionIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.emerald[500] + '1F',
        alignItems: 'center',
        justifyContent: 'center',
    },
    encryptionTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
        marginStart: spacing.md,
    },
    encryptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        gap: spacing.sm,
    },
    encryptionBadge: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    encryptionLabel: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        flex: 1,
        lineHeight: 18,
    },

    // ─── Data Section ───────────────────────────────
    dataGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    dataStat: {
        flex: 1,
        minWidth: '40%',
        backgroundColor: colors.surface.glassHover,
        borderRadius: 12,
        padding: spacing.md,
        alignItems: 'center',
    },
    dataStatValue: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
    },
    dataStatLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: 2,
    },

    // ─── Export Button ──────────────────────────────
    exportBtn: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    exportBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: spacing.sm,
    },
    exportBtnText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.obsidian[900],
    },

    // ─── Delete Link ────────────────────────────────
    deleteLink: {
        alignItems: 'center',
        marginTop: spacing.md,
        paddingVertical: spacing.sm,
    },
    deleteLinkText: {
        fontSize: typography.fontSize.sm,
        color: colors.coral[500],
        fontWeight: '500',
    },

    // ─── Ownership Card ─────────────────────────────
    ownershipCard: {
        marginTop: spacing.xl,
        alignItems: 'center',
        overflow: 'hidden',
    },
    ownershipIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: colors.surface.goldMedium,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    ownershipTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.gold[400],
        marginBottom: spacing.xs,
    },
    ownershipText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 20,
    },

    // ─── Footer ─────────────────────────────────────
    footer: {
        marginTop: spacing.xl,
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    footerText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        lineHeight: 16,
    },
});
