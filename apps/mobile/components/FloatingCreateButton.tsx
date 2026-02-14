import { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Pressable,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    FadeIn,
    FadeOut,
    SlideInDown,
    SlideOutDown,
} from 'react-native-reanimated';
import { colors, spacing } from '@zerog/ui';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CREATE_OPTIONS = [
    {
        id: 'post',
        icon: 'create-outline' as const,
        label: 'New Post',
        subtitle: 'Share text, photos, or video',
        color: colors.gold[500],
        route: '/(tabs)/create',
    },
    {
        id: 'story',
        icon: 'camera-outline' as const,
        label: 'Story / Moment',
        subtitle: 'Share something ephemeral',
        color: colors.azure[500],
        route: '/(tabs)/create',
    },
    {
        id: 'poll',
        icon: 'bar-chart-outline' as const,
        label: 'Poll',
        subtitle: 'Ask your community',
        color: colors.emerald[500],
        route: '/(tabs)/create',
    },
    {
        id: 'live',
        icon: 'radio-outline' as const,
        label: 'Go Live',
        subtitle: 'Start a live stream or audio room',
        color: colors.coral[500],
        route: '/campfire/go-live',
    },
];

interface FloatingCreateButtonProps {
    bottomOffset?: number;
}

export default function FloatingCreateButton({ bottomOffset = 80 }: FloatingCreateButtonProps) {
    const router = useRouter();
    const { colors: c } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const scale = useSharedValue(1);

    const handlePress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsOpen(true);
    }, []);

    const handleClose = useCallback(() => {
        setIsOpen(false);
    }, []);

    const handleOptionPress = useCallback((option: typeof CREATE_OPTIONS[0]) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsOpen(false);
        // Small delay for sheet dismiss animation
        setTimeout(() => {
            router.push(option.route as any);
        }, 200);
    }, [router]);

    const handlePressIn = useCallback(() => {
        scale.value = withSpring(0.9, { damping: 15 });
    }, [scale]);

    const handlePressOut = useCallback(() => {
        scale.value = withSpring(1, { damping: 15 });
    }, [scale]);

    const fabStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <>
            {/* FAB Button */}
            <Animated.View
                style={[
                    styles.fabContainer,
                    { bottom: bottomOffset },
                    fabStyle,
                ]}
            >
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: colors.gold[500] }]}
                    onPress={handlePress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    activeOpacity={0.9}
                    accessibilityRole="button"
                    accessibilityLabel="Create new content"
                    accessibilityHint="Opens creation menu for posts, stories, and polls"
                >
                    <Ionicons name="add" size={26} color="#FFFFFF" />
                </TouchableOpacity>
            </Animated.View>

            {/* Bottom Sheet Modal */}
            <Modal
                visible={isOpen}
                transparent
                animationType="none"
                onRequestClose={handleClose}
            >
                <Pressable style={styles.overlay} onPress={handleClose}>
                    <Animated.View
                        entering={FadeIn.duration(200)}
                        exiting={FadeOut.duration(150)}
                        style={styles.overlayBg}
                    />
                </Pressable>

                <Animated.View
                    entering={SlideInDown.springify().damping(20).stiffness(200)}
                    exiting={SlideOutDown.duration(200)}
                    style={[styles.sheet, { backgroundColor: c.obsidian[800] }]}
                >
                    {/* Handle */}
                    <View style={styles.sheetHandle}>
                        <View style={[styles.sheetHandleBar, { backgroundColor: c.border.default }]} />
                    </View>

                    <Text style={[styles.sheetTitle, { color: c.text.primary }]}>Create</Text>

                    {CREATE_OPTIONS.map((option, index) => (
                        <Animated.View
                            key={option.id}
                            entering={FadeIn.duration(200).delay(index * 60)}
                        >
                            <TouchableOpacity
                                style={[styles.optionRow, { borderColor: c.border.subtle }]}
                                onPress={() => handleOptionPress(option)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.optionIcon, { backgroundColor: option.color + '18' }]}>
                                    <Ionicons name={option.icon} size={22} color={option.color} />
                                </View>
                                <View style={styles.optionText}>
                                    <Text style={[styles.optionLabel, { color: c.text.primary }]}>{option.label}</Text>
                                    <Text style={[styles.optionSubtitle, { color: c.text.secondary }]}>{option.subtitle}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={c.text.muted} />
                            </TouchableOpacity>
                        </Animated.View>
                    ))}

                    {/* Cancel */}
                    <TouchableOpacity
                        style={[styles.cancelBtn, { borderColor: c.border.subtle }]}
                        onPress={handleClose}
                    >
                        <Text style={[styles.cancelText, { color: c.text.muted }]}>Cancel</Text>
                    </TouchableOpacity>
                </Animated.View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    fabContainer: {
        position: 'absolute',
        right: 20,
        zIndex: 100,
    },
    fab: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    overlay: {
        flex: 1,
    },
    overlayBg: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: spacing.lg,
        paddingBottom: 40,
    },
    sheetHandle: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    sheetHandleBar: {
        width: 36,
        height: 4,
        borderRadius: 2,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: spacing.md,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    optionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    optionText: {
        flex: 1,
    },
    optionLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    optionSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    cancelBtn: {
        alignItems: 'center',
        paddingVertical: 14,
        marginTop: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
    },
    cancelText: {
        fontSize: 15,
        fontWeight: '600',
    },
});
