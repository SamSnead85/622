import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';

interface ToolCardProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    color: string;
    onPress: () => void;
    delay: number;
}

function ToolCard({ icon, title, description, color, onPress, delay }: ToolCardProps) {
    return (
        <Animated.View entering={FadeInDown.duration(400).delay(delay)}>
            <TouchableOpacity
                style={styles.toolCard}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPress();
                }}
                activeOpacity={0.7}
            >
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

    const tools = [
        {
            icon: 'time-outline' as const,
            title: 'Prayer Times',
            description: 'Daily salah schedule & Athan alerts',
            color: colors.gold[500],
            route: '/tools/prayer-times',
        },
        {
            icon: 'compass-outline' as const,
            title: 'Qibla',
            description: 'Find prayer direction',
            color: colors.emerald[500],
            route: '/tools/qibla',
        },
        {
            icon: 'book-outline' as const,
            title: 'Quran',
            description: 'Read, search & listen',
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
            description: 'Check products against BDS list',
            color: colors.coral[500],
            route: '/tools/boycott-scanner',
        },
    ];

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Deen Tools</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: insets.bottom + 80, paddingHorizontal: spacing.lg }}
                showsVerticalScrollIndicator={false}
            >
                {/* Bismillah header */}
                <Animated.View entering={FadeInDown.duration(500)} style={styles.bismillah}>
                    <Text style={styles.bismillahText}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</Text>
                    <Text style={styles.bismillahTranslation}>In the name of God, the Most Gracious, the Most Merciful</Text>
                </Animated.View>

                {/* Tools grid */}
                <View style={styles.grid}>
                    {tools.map((tool, i) => (
                        <ToolCard
                            key={tool.route}
                            icon={tool.icon}
                            title={tool.title}
                            description={tool.description}
                            color={tool.color}
                            onPress={() => router.push(tool.route as any)}
                            delay={i * 80}
                        />
                    ))}
                </View>
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
    headerTitle: {
        fontSize: 20, fontWeight: '700', color: colors.text.primary, fontFamily: 'Inter-Bold',
    },
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
});
