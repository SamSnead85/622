import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { useAuthStore } from '../../stores';
import { ScreenHeader } from '../../components';

interface ToolCardProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    color: string;
    badge?: string;
    onPress: () => void;
    delay: number;
}

function ToolCard({ icon, title, description, color, badge, onPress, delay }: ToolCardProps) {
    return (
        <Animated.View entering={FadeInDown.duration(400).delay(delay)}>
            <TouchableOpacity
                style={styles.toolCard}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPress();
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${title}, ${description}`}
            >
                {badge && (
                    <View style={styles.toolBadge}>
                        <Text style={styles.toolBadgeText}>{badge}</Text>
                    </View>
                )}
                <View style={[styles.toolIcon, { backgroundColor: color + '18' }]}>
                    <Ionicons name={icon} size={28} color={color} />
                </View>
                <Text style={styles.toolTitle}>{title}</Text>
                <Text style={styles.toolDesc}>{description}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

export default function ToolsHub() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const isMuslim = user?.culturalProfile === 'muslim';

    // Ramadan detection
    const now = new Date();
    const ramadanStart = new Date(2026, 2, 17);
    const ramadanEnd = new Date(2026, 3, 15);
    const daysUntil = Math.ceil((ramadanStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isRamadanSeason = daysUntil <= 30 && now <= ramadanEnd;
    const isDuringRamadan = now >= ramadanStart && now <= ramadanEnd;

    const tools = [
        {
            icon: 'game-controller-outline' as const,
            title: '0G Arena',
            description: 'Party games & trivia',
            color: '#D4AF37',
            route: '/games',
            badge: 'NEW',
        },
        {
            icon: 'time-outline' as const,
            title: 'Prayer Times',
            description: 'Daily salah schedule with countdown',
            color: colors.gold[500],
            route: '/tools/prayer-times',
            badge: isRamadanSeason ? (isDuringRamadan ? 'RAMADAN' : 'SOON') : undefined,
        },
        {
            icon: 'compass-outline' as const,
            title: 'Qibla',
            description: 'Find the direction to Mecca',
            color: colors.emerald[500],
            route: '/tools/qibla',
        },
        {
            icon: 'book-outline' as const,
            title: 'Quran',
            description: 'Read, search & reflect',
            color: '#D4AF37',
            route: '/tools/quran',
        },
        {
            icon: 'scan-outline' as const,
            title: 'Halal Check',
            description: 'Scan barcodes for halal status',
            color: colors.azure[500],
            route: '/tools/halal-scanner',
        },
        {
            icon: 'shield-checkmark-outline' as const,
            title: 'Boycott Check',
            description: 'Check products & find alternatives',
            color: colors.coral[500],
            route: '/tools/boycott-scanner',
        },
    ];

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            <ScreenHeader title="Tools" />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: insets.bottom + 80, paddingHorizontal: spacing.lg }}
                showsVerticalScrollIndicator={false}
            >
                {/* Bismillah header — show for Muslim profile users */}
                {isMuslim && (
                    <Animated.View entering={FadeInDown.duration(500)} style={styles.bismillah}>
                        <Text style={styles.bismillahText}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</Text>
                        <Text style={styles.bismillahTranslation}>In the name of God, the Most Gracious, the Most Merciful</Text>
                    </Animated.View>
                )}

                {/* Ramadan Banner */}
                {isRamadanSeason && (
                    <Animated.View entering={FadeIn.duration(600)} style={styles.ramadanCard}>
                        <LinearGradient
                            colors={[colors.surface.goldSubtle, colors.surface.goldMedium, colors.surface.goldSubtle]}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                        <Text style={styles.ramadanEmoji}>☪️</Text>
                        <View style={styles.ramadanInfo}>
                            <Text style={styles.ramadanTitle}>
                                {isDuringRamadan ? 'Ramadan Mubarak' : `Ramadan starts in ${daysUntil} days`}
                            </Text>
                            <Text style={styles.ramadanSubtext}>
                                {isDuringRamadan
                                    ? 'Use Prayer Times for iftar & suhoor schedules'
                                    : 'Prepare with prayer times, Quran, and daily tools'}
                            </Text>
                        </View>
                    </Animated.View>
                )}

                {/* Subtitle for non-Muslim users */}
                {!isMuslim && !isRamadanSeason && (
                    <Animated.View entering={FadeIn.duration(400)} style={styles.toolsIntro}>
                        <Text style={styles.toolsIntroText}>
                            Essential daily tools built right into 0G — no extra apps needed
                        </Text>
                    </Animated.View>
                )}

                {/* Tools grid */}
                <View style={styles.grid}>
                    {tools.map((tool, i) => (
                        <ToolCard
                            key={tool.route}
                            icon={tool.icon}
                            title={tool.title}
                            description={tool.description}
                            color={tool.color}
                            badge={tool.badge}
                            onPress={() => router.push(tool.route as any)}
                            delay={i * 80}
                        />
                    ))}
                </View>

                {/* Privacy footer */}
                <Animated.View entering={FadeInDown.duration(400).delay(500)} style={styles.privacyFooter}>
                    <Ionicons name="lock-closed" size={14} color={colors.emerald[500]} />
                    <Text style={styles.privacyFooterText}>All tools work offline. No data is shared with third parties.</Text>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    scrollView: { flex: 1 },
    bismillah: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    bismillahText: {
        fontSize: 24, color: colors.gold[400],
        fontFamily: 'System', textAlign: 'center',
    },
    bismillahTranslation: {
        fontSize: typography.fontSize.sm, color: colors.text.muted,
        marginTop: spacing.xs, textAlign: 'center',
    },
    toolsIntro: {
        paddingVertical: spacing.lg, alignItems: 'center',
    },
    toolsIntroText: {
        fontSize: typography.fontSize.base, color: colors.text.secondary,
        textAlign: 'center', lineHeight: 22, maxWidth: 280,
    },
    ramadanCard: {
        borderRadius: 14, overflow: 'hidden',
        flexDirection: 'row', alignItems: 'center',
        padding: spacing.lg, marginBottom: spacing.lg,
        borderWidth: 1, borderColor: colors.gold[500] + '30',
    },
    ramadanEmoji: { fontSize: 28, marginEnd: spacing.md },
    ramadanInfo: { flex: 1 },
    ramadanTitle: {
        fontSize: typography.fontSize.lg, fontWeight: '700',
        color: colors.gold[400], fontFamily: 'Inter-Bold',
    },
    ramadanSubtext: {
        fontSize: typography.fontSize.sm, color: colors.text.secondary,
        marginTop: 4, lineHeight: 18,
    },
    grid: {
        flexDirection: 'row', flexWrap: 'wrap',
        gap: spacing.md, justifyContent: 'space-between',
    },
    toolCard: {
        width: '47%' as any,
        backgroundColor: colors.surface.glass,
        borderRadius: 16, padding: spacing.lg,
        borderWidth: 1, borderColor: colors.border.subtle,
        minWidth: 150, flexGrow: 1,
        position: 'relative',
    },
    toolBadge: {
        position: 'absolute', top: spacing.sm, right: spacing.sm,
        backgroundColor: colors.gold[500], borderRadius: 6,
        paddingHorizontal: 6, paddingVertical: 2,
    },
    toolBadgeText: {
        fontSize: 9, fontWeight: '700', color: colors.obsidian[900],
        letterSpacing: 0.5,
    },
    toolIcon: {
        width: 52, height: 52, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: spacing.md,
    },
    toolTitle: {
        fontSize: typography.fontSize.base, fontWeight: '700',
        color: colors.text.primary, marginBottom: 4,
    },
    toolDesc: {
        fontSize: typography.fontSize.xs, color: colors.text.muted, lineHeight: 16,
    },
    privacyFooter: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: spacing.sm,
        marginTop: spacing.xl, paddingVertical: spacing.lg,
    },
    privacyFooterText: {
        fontSize: typography.fontSize.xs, color: colors.text.muted,
    },
});
