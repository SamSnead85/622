import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn, FadeInRight } from 'react-native-reanimated';
import { colors, typography, spacing, shadows } from '@zerog/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../stores';
import { ScreenHeader, GlassCard } from '../../components';

const RECENT_TOOLS_KEY = '@recent-tools';

interface RecentTool {
    route: string;
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    timestamp: number;
}

// ─── Types ────────────────────────────────────────────────────────
interface ToolCardProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    gradient: [string, string];
    iconColor: string;
    badge?: string;
    badgeColor?: string;
    onPress: () => void;
    delay: number;
    featured?: boolean;
}

// ─── Tool Card Component ──────────────────────────────────────────
function ToolCard({
    icon,
    title,
    description,
    gradient,
    iconColor,
    badge,
    badgeColor,
    onPress,
    delay,
    featured = false,
}: ToolCardProps) {
    return (
        <Animated.View
            entering={FadeInDown.duration(450).delay(delay).springify().damping(18)}
            style={featured ? styles.toolCardFeaturedWrapper : styles.toolCardWrapper}
        >
            <TouchableOpacity
                style={[styles.toolCard, featured && styles.toolCardFeatured]}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPress();
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${title}, ${description}`}
            >
                {/* Gradient overlay */}
                <LinearGradient
                    colors={[gradient[0] + '12', gradient[1] + '06']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />

                {/* Badge */}
                {badge && (
                    <View style={[styles.toolBadge, { backgroundColor: badgeColor || colors.gold[500] }]}>
                        <Text style={styles.toolBadgeText}>{badge}</Text>
                    </View>
                )}

                {/* Icon with glow */}
                <View style={styles.toolIconContainer}>
                    <LinearGradient
                        colors={[gradient[0] + '25', gradient[1] + '10']}
                        style={styles.toolIconGlow}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    <Ionicons name={icon} size={featured ? 30 : 26} color={iconColor} />
                </View>

                {/* Text */}
                <Text style={[styles.toolTitle, featured && styles.toolTitleFeatured]} numberOfLines={1}>
                    {title}
                </Text>
                <Text style={styles.toolDesc} numberOfLines={2}>
                    {description}
                </Text>

                {/* Accent line at bottom */}
                {featured && (
                    <LinearGradient
                        colors={[gradient[0], gradient[1]]}
                        style={styles.toolAccentLine}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    />
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

// ─── Section Header ───────────────────────────────────────────────
function SectionHeader({ title, icon, delay }: { title: string; icon: keyof typeof Ionicons.glyphMap; delay: number }) {
    return (
        <Animated.View entering={FadeInRight.duration(400).delay(delay)} style={styles.sectionHeader}>
            <Ionicons name={icon} size={16} color={colors.gold[400]} />
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.sectionLine} />
        </Animated.View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────
export default function ToolsHub() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const isMuslim = user?.culturalProfile === 'muslim';
    const [recentTools, setRecentTools] = useState<RecentTool[]>([]);

    // ─── Load recent tools ───────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const stored = await AsyncStorage.getItem(RECENT_TOOLS_KEY);
                if (stored) setRecentTools(JSON.parse(stored));
            } catch { /* ignore */ }
        })();
    }, []);

    // ─── Record tool usage ───────────────────────────────────────
    const recordToolUsage = useCallback(async (tool: { route: string; title: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string }) => {
        const entry: RecentTool = { ...tool, timestamp: Date.now() };
        const updated = [entry, ...recentTools.filter((t) => t.route !== tool.route)].slice(0, 5);
        setRecentTools(updated);
        await AsyncStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify(updated));
    }, [recentTools]);

    // Ramadan detection
    const now = new Date();
    const ramadanStart = new Date(2026, 2, 17);
    const ramadanEnd = new Date(2026, 3, 15);
    const daysUntil = Math.ceil((ramadanStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isRamadanSeason = daysUntil <= 30 && now <= ramadanEnd;
    const isDuringRamadan = now >= ramadanStart && now <= ramadanEnd;

    const navigate = (route: string, toolMeta?: { title: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string }) => {
        if (toolMeta) {
            recordToolUsage({ route, ...toolMeta });
        }
        router.push(route as any);
    };

    // ─── Deen Tools ──────────────────────
    const deenTools = [
        {
            icon: 'time-outline' as const,
            title: 'Prayer Times',
            description: 'Salah schedule with live countdown',
            gradient: [colors.gold[500], colors.amber[500]] as [string, string],
            iconColor: colors.gold[400],
            route: '/tools/prayer-times',
            badge: isRamadanSeason ? (isDuringRamadan ? 'RAMADAN' : `${daysUntil}d`) : undefined,
            badgeColor: colors.gold[500],
            featured: true,
        },
        {
            icon: 'compass-outline' as const,
            title: 'Qibla',
            description: 'Direction to Mecca',
            gradient: [colors.emerald[500], colors.emerald[300]] as [string, string],
            iconColor: colors.emerald[400],
            route: '/tools/qibla',
            featured: true,
        },
        {
            icon: 'book-outline' as const,
            title: 'Quran',
            description: 'Read, search & reflect',
            gradient: [colors.gold[500], colors.gold[300]] as [string, string],
            iconColor: colors.gold[400],
            route: '/tools/quran',
            featured: true,
        },
    ];

    // ─── Scanners ────────────────────────
    const scannerTools = [
        {
            icon: 'scan-outline' as const,
            title: 'Halal Check',
            description: 'Scan barcodes for halal status',
            gradient: [colors.azure[500], colors.azure[300]] as [string, string],
            iconColor: colors.azure[400],
            route: '/tools/halal-scanner',
        },
        {
            icon: 'shield-checkmark-outline' as const,
            title: 'Boycott Check',
            description: 'Products & alternatives',
            gradient: [colors.coral[500], colors.coral[300]] as [string, string],
            iconColor: colors.coral[400],
            route: '/tools/boycott-scanner',
        },
    ];

    // ─── Personal Tools ──────────────────
    const personalTools = [
        {
            icon: 'calendar-outline' as const,
            title: 'My Calendar',
            description: 'Events, birthdays & reminders',
            gradient: [colors.azure[500], colors.azure[300]] as [string, string],
            iconColor: colors.azure[400],
            route: '/tools/calendar',
            badge: 'NEW',
            badgeColor: colors.azure[500],
        },
    ];

    // ─── Games ───────────────────────────
    const gameTools = [
        {
            icon: 'game-controller-outline' as const,
            title: '0G Arena',
            description: 'Party games, trivia & more',
            gradient: [colors.gold[500], colors.coral[400]] as [string, string],
            iconColor: colors.gold[400],
            route: '/games',
            badge: 'NEW',
            badgeColor: colors.coral[500],
        },
    ];

    // Stagger base delay
    const baseDelay = isMuslim || isRamadanSeason ? 200 : 100;

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            <ScreenHeader title="Tools" />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: insets.bottom + 80, paddingHorizontal: spacing.lg }}
                showsVerticalScrollIndicator={false}
            >
                {/* Sign-up banner for guest users */}
                {!isAuthenticated && (
                    <TouchableOpacity style={styles.signupBanner} onPress={() => router.push('/(auth)/signup' as any)}>
                        <Ionicons name="sparkles" size={16} color={colors.gold[500]} />
                        <Text style={styles.signupBannerText}>Sign up for the full 0G experience</Text>
                        <Ionicons name="chevron-forward" size={14} color={colors.gold[400]} />
                    </TouchableOpacity>
                )}

                {/* Bismillah header — Muslim profile users */}
                {isMuslim && (
                    <Animated.View entering={FadeInDown.duration(500)} style={styles.bismillah}>
                        <Text style={styles.bismillahText}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</Text>
                        <Text style={styles.bismillahTranslation}>
                            In the name of God, the Most Gracious, the Most Merciful
                        </Text>
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
                                {isDuringRamadan ? 'Ramadan Mubarak' : `Ramadan in ${daysUntil} days`}
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

                {/* ── Recently Used Section ── */}
                {recentTools.length > 0 && (
                    <>
                        <SectionHeader title="Recently Used" icon="time-outline" delay={baseDelay - 80} />
                        <Animated.View entering={FadeInDown.duration(350).delay(baseDelay - 40)}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.recentRow}
                                style={styles.recentScroll}
                            >
                                {recentTools.slice(0, 3).map((tool) => (
                                    <TouchableOpacity
                                        key={tool.route}
                                        style={styles.recentCard}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            navigate(tool.route, { title: tool.title, icon: tool.icon, iconColor: tool.iconColor });
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.recentIconWrap}>
                                            <Ionicons name={tool.icon} size={20} color={tool.iconColor} />
                                        </View>
                                        <Text style={styles.recentTitle} numberOfLines={1}>{tool.title}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </Animated.View>
                    </>
                )}

                {/* ── Deen Tools Section ── */}
                <SectionHeader title="Deen Tools" icon="moon-outline" delay={baseDelay} />
                <View style={styles.gridFeatured}>
                    {deenTools.map((tool, i) => (
                        <ToolCard
                            key={tool.route}
                            icon={tool.icon}
                            title={tool.title}
                            description={tool.description}
                            gradient={tool.gradient}
                            iconColor={tool.iconColor}
                            badge={tool.badge}
                            badgeColor={tool.badgeColor}
                            onPress={() => navigate(tool.route, { title: tool.title, icon: tool.icon, iconColor: tool.iconColor })}
                            delay={baseDelay + 80 + i * 90}
                            featured={tool.featured}
                        />
                    ))}
                </View>

                {/* ── Scanners Section ── */}
                <SectionHeader title="Scanners" icon="scan-outline" delay={baseDelay + 400} />
                <View style={styles.grid}>
                    {scannerTools.map((tool, i) => (
                        <ToolCard
                            key={tool.route}
                            icon={tool.icon}
                            title={tool.title}
                            description={tool.description}
                            gradient={tool.gradient}
                            iconColor={tool.iconColor}
                            onPress={() => navigate(tool.route, { title: tool.title, icon: tool.icon, iconColor: tool.iconColor })}
                            delay={baseDelay + 480 + i * 90}
                        />
                    ))}
                </View>

                {/* ── Personal Tools Section ── */}
                <SectionHeader title="Personal" icon="person-outline" delay={baseDelay + 620} />
                <View style={styles.grid}>
                    {personalTools.map((tool, i) => (
                        <ToolCard
                            key={tool.route}
                            icon={tool.icon}
                            title={tool.title}
                            description={tool.description}
                            gradient={tool.gradient}
                            iconColor={tool.iconColor}
                            badge={tool.badge}
                            badgeColor={tool.badgeColor}
                            onPress={() => navigate(tool.route, { title: tool.title, icon: tool.icon, iconColor: tool.iconColor })}
                            delay={baseDelay + 680 + i * 90}
                        />
                    ))}
                </View>

                {/* ── Games & Fun Section ── */}
                <SectionHeader title="Games & Fun" icon="game-controller-outline" delay={baseDelay + 800} />
                <View style={styles.grid}>
                    {gameTools.map((tool, i) => (
                        <ToolCard
                            key={tool.route}
                            icon={tool.icon}
                            title={tool.title}
                            description={tool.description}
                            gradient={tool.gradient}
                            iconColor={tool.iconColor}
                            badge={tool.badge}
                            badgeColor={tool.badgeColor}
                            onPress={() => navigate(tool.route, { title: tool.title, icon: tool.icon, iconColor: tool.iconColor })}
                            delay={baseDelay + 730 + i * 90}
                        />
                    ))}
                </View>

                {/* Privacy footer */}
                <Animated.View entering={FadeInDown.duration(400).delay(baseDelay + 900)} style={styles.privacyFooter}>
                    <Ionicons name="lock-closed" size={14} color={colors.emerald[500]} />
                    <Text style={styles.privacyFooterText}>
                        All tools work offline. No data is shared with third parties.
                    </Text>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    scrollView: { flex: 1 },

    // Sign-up banner
    signupBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.gold[500] + '12',
        borderWidth: 1,
        borderColor: colors.gold[500] + '25',
        borderRadius: 12,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        marginTop: spacing.md,
    },
    signupBannerText: {
        flex: 1,
        fontSize: typography.fontSize.sm,
        color: colors.gold[400],
        fontFamily: 'Inter-Medium',
    },

    // Bismillah
    bismillah: { alignItems: 'center', paddingVertical: spacing.xl },
    bismillahText: {
        fontSize: 24,
        color: colors.gold[400],
        fontFamily: 'System',
        textAlign: 'center',
    },
    bismillahTranslation: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginTop: spacing.xs,
        textAlign: 'center',
    },

    // Intro
    toolsIntro: { paddingVertical: spacing.lg, alignItems: 'center' },
    toolsIntroText: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 280,
    },

    // Ramadan
    ramadanCard: {
        borderRadius: 14,
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
    },
    ramadanEmoji: { fontSize: 28, marginEnd: spacing.md },
    ramadanInfo: { flex: 1 },
    ramadanTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.gold[400],
        fontFamily: 'Inter-Bold',
    },
    ramadanSubtext: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        marginTop: 4,
        lineHeight: 18,
    },

    // Recently Used
    recentScroll: { marginBottom: spacing.sm },
    recentRow: { gap: spacing.md },
    recentCard: {
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 14,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        minWidth: 90,
    },
    recentIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.surface.glassActive,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    recentTitle: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.primary,
        textAlign: 'center',
    },

    // Section Headers
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xl,
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    sectionTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.text.secondary,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    sectionLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border.subtle,
        marginStart: spacing.sm,
    },

    // Grids
    gridFeatured: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },

    // Tool Card
    toolCardWrapper: {
        width: '47%' as any,
        minWidth: 150,
        flexGrow: 1,
    },
    toolCardFeaturedWrapper: {
        width: '47%' as any,
        minWidth: 150,
        flexGrow: 1,
    },
    toolCard: {
        backgroundColor: colors.surface.glass,
        borderRadius: 18,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
        position: 'relative',
        minHeight: 140,
    },
    toolCardFeatured: {
        borderColor: colors.gold[500] + '18',
        ...shadows.sm,
    },
    toolBadge: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 2.5,
        zIndex: 10,
    },
    toolBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.obsidian[900],
        letterSpacing: 0.6,
    },

    // Icon
    toolIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        overflow: 'hidden',
    },
    toolIconGlow: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 16,
    },

    // Text
    toolTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.text.primary,
        marginBottom: 4,
    },
    toolTitleFeatured: {
        color: colors.gold[300],
    },
    toolDesc: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        lineHeight: 16,
    },

    // Accent line
    toolAccentLine: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        opacity: 0.6,
    },

    // Privacy
    privacyFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginTop: spacing['2xl'],
        paddingVertical: spacing.lg,
    },
    privacyFooterText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
});
