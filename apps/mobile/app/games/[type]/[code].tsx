// ============================================
// Generic Game Room Screen
// Catches /games/:type/:code routes and redirects
// to the specific game screen if it exists,
// otherwise shows a fallback game room UI.
// ============================================

import { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { typography, spacing } from '@zerog/ui';
import { useTheme } from '../../../contexts/ThemeContext';

// Known game types that have dedicated screens
const KNOWN_GAME_TYPES = [
    'trivia',
    'wavelength',
    'infiltrator',
    'cipher',
    'predict',
    'emoji-charades',
    'would-you-rather',
    'sketch-duel',
    'wheel-of-fortune',
    'jeopardy',
];

export default function GameRoomScreen() {
    const { type, code } = useLocalSearchParams<{ type: string; code: string }>();
    const { colors: c } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [isRedirecting, setIsRedirecting] = useState(false);

    // Attempt to redirect to a dedicated game screen if one exists
    useEffect(() => {
        if (type && code && KNOWN_GAME_TYPES.includes(type)) {
            setIsRedirecting(true);
            // The specific game screen exists at /games/<type>/[code]
            // Since we ARE that catch-all, the specific screens take priority
            // in Expo Router's file-based routing. If we're here, the specific
            // screen didn't match, so we show the fallback.
            setIsRedirecting(false);
        }
    }, [type, code]);

    const handleLeave = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.replace('/games');
    }, [router]);

    if (isRedirecting) {
        return (
            <View style={[styles.container, { backgroundColor: c.background }]}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={c.gold[400]} />
                    <Text style={[styles.loadingText, { color: c.text.muted }]}>
                        Joining game...
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backBtn}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Ionicons name="chevron-back" size={24} color={c.text.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: c.text.primary }]}>
                    Game Room
                </Text>
                <View style={styles.backBtn} />
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Animated.View
                    entering={FadeInDown.delay(100).duration(400).springify()}
                    style={styles.iconContainer}
                >
                    <View style={[styles.iconCircle, { backgroundColor: c.surface.glass }]}>
                        <Ionicons name="game-controller" size={48} color={c.gold[500]} />
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
                    <Text style={[styles.title, { color: c.text.primary }]}>
                        {type ? type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' ') : 'Game'}
                    </Text>
                </Animated.View>

                {/* Room Code Badge */}
                {code && (
                    <Animated.View
                        entering={FadeIn.delay(300).duration(300)}
                        style={[styles.codeBadge, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}
                    >
                        <Ionicons name="key-outline" size={14} color={c.gold[500]} />
                        <Text style={[styles.codeText, { color: c.gold[500] }]}>
                            {code.toUpperCase()}
                        </Text>
                    </Animated.View>
                )}

                <Animated.View entering={FadeInDown.delay(400).duration(400).springify()}>
                    <Text style={[styles.statusText, { color: c.text.muted }]}>
                        Connecting to game room...
                    </Text>
                    <ActivityIndicator
                        size="small"
                        color={c.gold[400]}
                        style={styles.spinner}
                    />
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(500).duration(400).springify()}>
                    <TouchableOpacity
                        style={[styles.leaveBtn, { borderColor: c.border.default }]}
                        onPress={handleLeave}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Leave game"
                    >
                        <Ionicons name="exit-outline" size={18} color={c.text.secondary} />
                        <Text style={[styles.leaveBtnText, { color: c.text.secondary }]}>
                            Leave Game
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </View>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    backBtn: { width: 40, alignItems: 'center' },
    headerTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        gap: spacing.lg,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    loadingText: {
        fontSize: typography.fontSize.sm,
        marginTop: spacing.sm,
    },
    iconContainer: {
        marginBottom: spacing.sm,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    codeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 12,
        borderWidth: 1,
    },
    codeText: {
        fontSize: typography.fontSize.md,
        fontWeight: '700',
        letterSpacing: 2,
    },
    statusText: {
        fontSize: typography.fontSize.sm,
        textAlign: 'center',
    },
    spinner: {
        marginTop: spacing.sm,
    },
    leaveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: 14,
        borderWidth: 1,
    },
    leaveBtnText: {
        fontSize: typography.fontSize.md,
        fontWeight: '600',
    },
});
