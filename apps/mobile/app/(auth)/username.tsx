import { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Animated,
    Easing,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Button, Input, colors, typography, spacing } from '@caravan/ui';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Animated particle for ambient background
const FloatingOrb = ({ delay, size, startX, startY }: { delay: number; size: number; startX: number; startY: number }) => {
    const translateY = useRef(new Animated.Value(0)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        const animate = () => {
            Animated.loop(
                Animated.sequence([
                    Animated.parallel([
                        Animated.timing(translateY, {
                            toValue: -80,
                            duration: 8000 + Math.random() * 4000,
                            easing: Easing.inOut(Easing.sin),
                            useNativeDriver: true,
                        }),
                        Animated.timing(translateX, {
                            toValue: Math.random() * 40 - 20,
                            duration: 6000 + Math.random() * 3000,
                            easing: Easing.inOut(Easing.sin),
                            useNativeDriver: true,
                        }),
                        Animated.sequence([
                            Animated.timing(opacity, {
                                toValue: 0.6,
                                duration: 2000,
                                useNativeDriver: true,
                            }),
                            Animated.timing(opacity, {
                                toValue: 0.2,
                                duration: 4000,
                                useNativeDriver: true,
                            }),
                        ]),
                        Animated.sequence([
                            Animated.timing(scale, {
                                toValue: 1.2,
                                duration: 4000,
                                easing: Easing.inOut(Easing.sin),
                                useNativeDriver: true,
                            }),
                            Animated.timing(scale, {
                                toValue: 0.8,
                                duration: 4000,
                                easing: Easing.inOut(Easing.sin),
                                useNativeDriver: true,
                            }),
                        ]),
                    ]),
                    Animated.parallel([
                        Animated.timing(translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
                        Animated.timing(translateX, { toValue: 0, duration: 0, useNativeDriver: true }),
                        Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
                        Animated.timing(scale, { toValue: 0.8, duration: 0, useNativeDriver: true }),
                    ]),
                ])
            ).start();
        };

        const timer = setTimeout(animate, delay);
        return () => clearTimeout(timer);
    }, []);

    return (
        <Animated.View
            style={[
                styles.floatingOrb,
                {
                    width: size,
                    height: size,
                    left: startX,
                    top: startY,
                    opacity,
                    transform: [{ translateY }, { translateX }, { scale }],
                },
            ]}
        >
            <LinearGradient
                colors={['rgba(212, 175, 55, 0.4)', 'rgba(212, 175, 55, 0.1)', 'transparent']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            />
        </Animated.View>
    );
};

export default function UsernameScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [error, setError] = useState('');

    // Sophisticated animations
    const headerAnim = useRef(new Animated.Value(0)).current;
    const cardAnim = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Staggered entrance animation
        Animated.stagger(120, [
            Animated.spring(headerAnim, {
                toValue: 1,
                tension: 40,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.spring(cardAnim, {
                toValue: 1,
                tension: 35,
                friction: 9,
                useNativeDriver: true,
            }),
        ]).start();

        // Continuous shimmer effect on premium elements
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Subtle pulse for CTA
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.02,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    // Debounced username availability check
    useEffect(() => {
        if (username.length < 3) {
            setIsAvailable(null);
            return;
        }

        setChecking(true);
        const timer = setTimeout(async () => {
            // Simulate API check
            await new Promise((resolve) => setTimeout(resolve, 600));
            const available = !['admin', 'caravan', 'official', 'support'].includes(username.toLowerCase());
            setIsAvailable(available);
            setChecking(false);

            if (available) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [username]);

    const handleContinue = async () => {
        if (!username || username.length < 3) {
            setError('Username must be at least 3 characters');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        if (!isAvailable) {
            setError('This username is not available');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);

        try {
            await new Promise((resolve) => setTimeout(resolve, 1200));
            router.replace('/(tabs)');
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const headerTranslateY = headerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [40, 0],
    });

    const cardTranslateY = cardAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [60, 0],
    });

    const shimmerTranslate = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-200, 200],
    });

    return (
        <View style={styles.container}>
            {/* Premium animated background */}
            <LinearGradient
                colors={['#0A0A0B', '#0D0D10', '#0A0A0B']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Ambient floating orbs */}
            <View style={styles.orbContainer} pointerEvents="none">
                <FloatingOrb delay={0} size={120} startX={SCREEN_WIDTH * 0.1} startY={SCREEN_HEIGHT * 0.2} />
                <FloatingOrb delay={1500} size={80} startX={SCREEN_WIDTH * 0.7} startY={SCREEN_HEIGHT * 0.15} />
                <FloatingOrb delay={3000} size={100} startX={SCREEN_WIDTH * 0.5} startY={SCREEN_HEIGHT * 0.6} />
                <FloatingOrb delay={4500} size={60} startX={SCREEN_WIDTH * 0.2} startY={SCREEN_HEIGHT * 0.7} />
            </View>

            {/* Gradient mesh overlay */}
            <View style={styles.meshOverlay} pointerEvents="none">
                <LinearGradient
                    colors={['transparent', 'rgba(212, 175, 55, 0.03)', 'transparent']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0.3 }}
                    end={{ x: 1, y: 0.7 }}
                />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Premium back button */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.back();
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={styles.backButtonInner}>
                            <Text style={styles.backIcon}>←</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Header with sophisticated animation */}
                    <Animated.View
                        style={[
                            styles.header,
                            {
                                opacity: headerAnim,
                                transform: [{ translateY: headerTranslateY }],
                            },
                        ]}
                    >
                        <View style={styles.stepIndicator}>
                            <View style={[styles.stepDot, styles.stepDotCompleted]} />
                            <View style={styles.stepLine} />
                            <View style={[styles.stepDot, styles.stepDotActive]}>
                                <Animated.View
                                    style={[
                                        styles.stepDotPulse,
                                        { transform: [{ scale: pulseAnim }] },
                                    ]}
                                />
                            </View>
                            <View style={[styles.stepLine, styles.stepLineInactive]} />
                            <View style={[styles.stepDot, styles.stepDotInactive]} />
                        </View>

                        <Text style={styles.title}>Choose your identity</Text>
                        <Text style={styles.subtitle}>
                            This is how others will find and recognize you on Caravan
                        </Text>
                    </Animated.View>

                    {/* Premium glass card */}
                    <Animated.View
                        style={[
                            styles.cardContainer,
                            {
                                opacity: cardAnim,
                                transform: [{ translateY: cardTranslateY }],
                            },
                        ]}
                    >
                        <View style={styles.glassCard}>
                            {/* Card glow effect */}
                            <View style={styles.cardGlow} />

                            {/* Shimmer effect */}
                            <Animated.View
                                style={[
                                    styles.shimmer,
                                    { transform: [{ translateX: shimmerTranslate }] },
                                ]}
                            />

                            <View style={styles.cardContent}>
                                {/* Username preview */}
                                <View style={styles.previewContainer}>
                                    <View style={styles.avatarPlaceholder}>
                                        <LinearGradient
                                            colors={[colors.gold[400], colors.gold[600]]}
                                            style={styles.avatarGradient}
                                        >
                                            <Text style={styles.avatarLetter}>
                                                {username ? username[0].toUpperCase() : '?'}
                                            </Text>
                                        </LinearGradient>
                                    </View>
                                    <View style={styles.previewText}>
                                        <Text style={styles.previewHandle}>
                                            @{username || 'username'}
                                        </Text>
                                        <Text style={styles.previewMeta}>
                                            caravan.social/{username || 'username'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Premium input */}
                                <View style={styles.inputSection}>
                                    <Text style={styles.inputLabel}>Username</Text>
                                    <View style={styles.inputWrapper}>
                                        <Text style={styles.inputPrefix}>@</Text>
                                        <View style={styles.inputContainer}>
                                            <Input
                                                placeholder="Choose a unique username"
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                                value={username}
                                                onChangeText={(text) => {
                                                    setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                                                    setError('');
                                                }}
                                                containerStyle={styles.inputOverride}
                                            />
                                        </View>
                                        {/* Status indicator */}
                                        <View style={styles.statusIndicator}>
                                            {checking && (
                                                <Animated.View style={styles.checkingDot}>
                                                    <View style={styles.loadingDot} />
                                                </Animated.View>
                                            )}
                                            {!checking && isAvailable === true && (
                                                <View style={styles.availableIndicator}>
                                                    <Text style={styles.checkmark}>✓</Text>
                                                </View>
                                            )}
                                            {!checking && isAvailable === false && (
                                                <View style={styles.unavailableIndicator}>
                                                    <Text style={styles.xmark}>✕</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    {/* Availability message */}
                                    <View style={styles.availabilityMessage}>
                                        {checking && (
                                            <Text style={styles.checkingText}>Checking availability...</Text>
                                        )}
                                        {!checking && isAvailable === true && (
                                            <Text style={styles.availableText}>✓ Username is available</Text>
                                        )}
                                        {!checking && isAvailable === false && (
                                            <Text style={styles.unavailableText}>✕ Username is taken</Text>
                                        )}
                                        {error && <Text style={styles.errorText}>{error}</Text>}
                                    </View>

                                    {/* Username requirements */}
                                    <View style={styles.requirements}>
                                        <RequirementItem
                                            met={username.length >= 3}
                                            text="At least 3 characters"
                                        />
                                        <RequirementItem
                                            met={username.length <= 20}
                                            text="Maximum 20 characters"
                                        />
                                        <RequirementItem
                                            met={/^[a-z0-9_]*$/.test(username)}
                                            text="Only lowercase, numbers, underscores"
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>
                    </Animated.View>

                    {/* Premium CTA */}
                    <Animated.View
                        style={[
                            styles.ctaContainer,
                            { transform: [{ scale: pulseAnim }] },
                        ]}
                    >
                        <TouchableOpacity
                            style={[
                                styles.premiumButton,
                                (!isAvailable || loading) && styles.premiumButtonDisabled,
                            ]}
                            onPress={handleContinue}
                            disabled={!isAvailable || loading}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={
                                    isAvailable
                                        ? [colors.gold[400], colors.gold[600]]
                                        : [colors.obsidian[500], colors.obsidian[600]]
                                }
                                style={styles.premiumButtonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                {loading ? (
                                    <View style={styles.loadingContainer}>
                                        <View style={styles.loadingSpinner} />
                                        <Text style={styles.premiumButtonText}>Creating your profile...</Text>
                                    </View>
                                ) : (
                                    <>
                                        <Text style={styles.premiumButtonText}>Continue to Caravan</Text>
                                        <Text style={styles.premiumButtonArrow}>→</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Skip option */}
                    <TouchableOpacity
                        style={styles.skipButton}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.replace('/(tabs)');
                        }}
                    >
                        <Text style={styles.skipText}>I'll do this later</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

function RequirementItem({ met, text }: { met: boolean; text: string }) {
    return (
        <View style={styles.requirementItem}>
            <View style={[styles.requirementDot, met && styles.requirementDotMet]} />
            <Text style={[styles.requirementText, met && styles.requirementTextMet]}>
                {text}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0B',
    },
    orbContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    floatingOrb: {
        position: 'absolute',
        borderRadius: 999,
    },
    meshOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: spacing.xl,
    },
    backButton: {
        alignSelf: 'flex-start',
        marginBottom: spacing['2xl'],
    },
    backButtonInner: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: {
        fontSize: 20,
        color: colors.text.secondary,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing['2xl'],
    },
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    stepDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.obsidian[500],
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepDotCompleted: {
        backgroundColor: colors.gold[500],
    },
    stepDotActive: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: colors.gold[500],
    },
    stepDotPulse: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.gold[500],
    },
    stepDotInactive: {
        backgroundColor: colors.obsidian[600],
    },
    stepLine: {
        width: 40,
        height: 2,
        backgroundColor: colors.gold[500],
        marginHorizontal: spacing.xs,
    },
    stepLineInactive: {
        backgroundColor: colors.obsidian[600],
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
        textAlign: 'center',
        letterSpacing: -0.8,
    },
    subtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        fontFamily: typography.fontFamily.sans,
        textAlign: 'center',
        marginTop: spacing.sm,
        lineHeight: 22,
        maxWidth: 280,
    },
    cardContainer: {
        marginBottom: spacing['2xl'],
    },
    glassCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        position: 'relative',
    },
    cardGlow: {
        position: 'absolute',
        top: -100,
        left: '50%',
        marginLeft: -100,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(212, 175, 55, 0.08)',
    },
    shimmer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        transform: [{ skewX: '-20deg' }],
        width: 100,
    },
    cardContent: {
        padding: spacing.xl,
    },
    previewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.06)',
        marginBottom: spacing.xl,
    },
    avatarPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 32,
        overflow: 'hidden',
    },
    avatarGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarLetter: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.obsidian[900],
    },
    previewText: {
        marginLeft: spacing.lg,
        flex: 1,
    },
    previewHandle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
    },
    previewMeta: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        fontFamily: typography.fontFamily.sans,
        marginTop: 4,
    },
    inputSection: {},
    inputLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
        color: colors.text.secondary,
        fontFamily: typography.fontFamily.sans,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: spacing.lg,
    },
    inputPrefix: {
        fontSize: 18,
        color: colors.gold[500],
        fontWeight: '600',
        marginRight: spacing.xs,
    },
    inputContainer: {
        flex: 1,
    },
    inputOverride: {
        marginBottom: 0,
    },
    statusIndicator: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkingDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.gold[500],
        borderTopColor: 'transparent',
    },
    loadingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.gold[500],
    },
    availableIndicator: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.emerald[500],
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmark: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    unavailableIndicator: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.coral[500],
        alignItems: 'center',
        justifyContent: 'center',
    },
    xmark: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    availabilityMessage: {
        minHeight: 24,
        marginTop: spacing.sm,
    },
    checkingText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        fontFamily: typography.fontFamily.sans,
    },
    availableText: {
        fontSize: typography.fontSize.sm,
        color: colors.emerald[500],
        fontFamily: typography.fontFamily.sans,
        fontWeight: '500',
    },
    unavailableText: {
        fontSize: typography.fontSize.sm,
        color: colors.coral[500],
        fontFamily: typography.fontFamily.sans,
        fontWeight: '500',
    },
    errorText: {
        fontSize: typography.fontSize.sm,
        color: colors.coral[500],
        fontFamily: typography.fontFamily.sans,
    },
    requirements: {
        marginTop: spacing.xl,
        gap: spacing.sm,
    },
    requirementItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    requirementDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.obsidian[500],
        marginRight: spacing.sm,
    },
    requirementDotMet: {
        backgroundColor: colors.emerald[500],
    },
    requirementText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        fontFamily: typography.fontFamily.sans,
    },
    requirementTextMet: {
        color: colors.text.secondary,
    },
    ctaContainer: {
        marginBottom: spacing.lg,
    },
    premiumButton: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    premiumButtonDisabled: {
        shadowOpacity: 0,
    },
    premiumButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        paddingHorizontal: spacing.xl,
    },
    premiumButtonText: {
        fontSize: typography.fontSize.lg,
        fontWeight: '600',
        color: colors.obsidian[900],
        fontFamily: typography.fontFamily.sans,
        letterSpacing: -0.3,
    },
    premiumButtonArrow: {
        fontSize: 20,
        color: colors.obsidian[900],
        marginLeft: spacing.sm,
        fontWeight: '600',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loadingSpinner: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.obsidian[900],
        borderTopColor: 'transparent',
        marginRight: spacing.sm,
    },
    skipButton: {
        alignSelf: 'center',
        paddingVertical: spacing.md,
    },
    skipText: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
        fontFamily: typography.fontFamily.sans,
    },
});
