// ============================================
// Go Live Screen
// Start a live broadcast for your community
// ============================================

import { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { typography, spacing } from '@zerog/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { ScreenHeader } from '../../components';

export default function GoLiveScreen() {
    const { colors: c } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [title, setTitle] = useState('');

    const handleGoLive = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // TODO: Implement live broadcast creation
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <ScreenHeader title="Go Live" />

            {/* Content */}
            <View style={styles.content}>
                <Animated.View
                    entering={FadeInDown.delay(100).duration(400).springify()}
                    style={styles.iconContainer}
                >
                    <View style={[styles.iconCircle, { backgroundColor: c.surface.glass }]}>
                        <Ionicons name="videocam" size={48} color={c.gold[500]} />
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
                    <Text style={[styles.title, { color: c.text.primary }]}>
                        Start a Live Broadcast
                    </Text>
                    <Text style={[styles.subtitle, { color: c.text.muted }]}>
                        Share moments in real-time with your community
                    </Text>
                </Animated.View>

                <Animated.View
                    entering={FadeInDown.delay(300).duration(400).springify()}
                    style={styles.inputSection}
                >
                    <Text style={[styles.inputLabel, { color: c.text.secondary }]}>
                        Stream Title
                    </Text>
                    <View
                        style={[
                            styles.inputContainer,
                            { backgroundColor: c.surface.glass, borderColor: c.border.subtle },
                        ]}
                    >
                        <TextInput
                            style={[styles.textInput, { color: c.text.primary }]}
                            placeholder="What are you streaming?"
                            placeholderTextColor={c.text.muted}
                            value={title}
                            onChangeText={setTitle}
                            maxLength={100}
                            accessibilityLabel="Stream title"
                        />
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(400).duration(400).springify()}>
                    <TouchableOpacity
                        style={[
                            styles.goLiveBtn,
                            { backgroundColor: c.gold[500], opacity: title.trim() ? 1 : 0.5 },
                        ]}
                        onPress={handleGoLive}
                        disabled={!title.trim()}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Start live broadcast"
                    >
                        <Ionicons name="radio" size={20} color="#FFFFFF" />
                        <Text style={styles.goLiveBtnText}>Go Live</Text>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(500).duration(400).springify()}>
                    <Text style={[styles.comingSoon, { color: c.text.muted }]}>
                        Live streaming is coming soon. Stay tuned!
                    </Text>
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
    subtitle: {
        fontSize: typography.fontSize.sm,
        textAlign: 'center',
        marginTop: spacing.xs,
        lineHeight: 20,
    },
    inputSection: {
        width: '100%',
    },
    inputLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        marginBottom: spacing.xs,
    },
    inputContainer: {
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    textInput: {
        fontSize: typography.fontSize.md,
    },
    goLiveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        paddingHorizontal: spacing.xl,
        borderRadius: 14,
        gap: spacing.sm,
        width: '100%',
    },
    goLiveBtnText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    comingSoon: {
        fontSize: typography.fontSize.xs,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
});
