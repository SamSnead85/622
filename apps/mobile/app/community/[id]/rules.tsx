import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API } from '../../../lib/api';

interface Rule {
    id: string;
    title: string;
    description: string;
    order: number;
}

export default function CommunityRulesScreen() {
    const router = useRouter();
    const { id: communityId } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const [rules, setRules] = useState<Rule[]>([]);
    const [communityName, setCommunityName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [communityId]);

    const loadData = async () => {
        if (!communityId) return;
        try {
            const data = await apiFetch<any>(API.community(communityId));
            const comm = data.community || data;
            setCommunityName(comm.name || '');
            setRules(comm.rules || []);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Community Rules</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.gold[500]} />
                </View>
            ) : (
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.communityLabel}>{communityName}</Text>

                    {rules.length > 0 ? (
                        rules.sort((a, b) => a.order - b.order).map((rule, i) => (
                            <Animated.View key={rule.id} entering={FadeInDown.duration(300).delay(i * 60)}>
                                <View style={styles.ruleCard}>
                                    <View style={styles.ruleNumber}>
                                        <Text style={styles.ruleNumberText}>{i + 1}</Text>
                                    </View>
                                    <View style={styles.ruleContent}>
                                        <Text style={styles.ruleTitle}>{rule.title}</Text>
                                        <Text style={styles.ruleDescription}>{rule.description}</Text>
                                    </View>
                                </View>
                            </Animated.View>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="book-outline" size={48} color={colors.text.muted} />
                            <Text style={styles.emptyTitle}>No rules yet</Text>
                            <Text style={styles.emptyText}>
                                This community hasn't set any rules yet. Admins can add rules to help keep the space welcoming.
                            </Text>
                        </View>
                    )}

                    <View style={styles.trustNote}>
                        <Ionicons name="shield-checkmark-outline" size={16} color={colors.emerald[500]} />
                        <Text style={styles.trustNoteText}>
                            Rules are decided by the community through governance proposals. Everyone has a voice.
                        </Text>
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
    scroll: { flex: 1 },
    communityLabel: {
        fontSize: typography.fontSize.sm, color: colors.text.muted,
        marginBottom: spacing.lg, fontWeight: '500',
    },
    ruleCard: {
        flexDirection: 'row', marginBottom: spacing.md,
        backgroundColor: colors.surface.glass, borderRadius: 14,
        padding: spacing.md, borderWidth: 1, borderColor: colors.border.subtle,
    },
    ruleNumber: {
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center', justifyContent: 'center',
        marginRight: spacing.md,
    },
    ruleNumberText: {
        fontSize: typography.fontSize.base, fontWeight: '700', color: colors.gold[500],
    },
    ruleContent: { flex: 1 },
    ruleTitle: {
        fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary,
        marginBottom: 4,
    },
    ruleDescription: {
        fontSize: typography.fontSize.sm, color: colors.text.secondary, lineHeight: 20,
    },
    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyTitle: {
        fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.text.primary,
        marginTop: spacing.md,
    },
    emptyText: {
        fontSize: typography.fontSize.base, color: colors.text.muted,
        textAlign: 'center', marginTop: spacing.sm, lineHeight: 22,
        paddingHorizontal: spacing.xl,
    },
    trustNote: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        marginTop: spacing.xl, paddingVertical: spacing.md,
    },
    trustNoteText: {
        flex: 1, fontSize: typography.fontSize.xs, color: colors.text.muted, lineHeight: 16,
    },
});
