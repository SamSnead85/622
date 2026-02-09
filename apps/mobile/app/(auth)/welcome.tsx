import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useRef, useCallback, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedScrollHandler,
    interpolate,
    withSpring,
    FadeInUp,
    FadeIn,
} from 'react-native-reanimated';
import { Button, colors, typography, spacing } from '@zerog/ui';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Slide {
    icon: keyof typeof Ionicons.glyphMap;
    secondaryIcon?: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    accentColor: string;
    tag: string;
    title: string;
    subtitle: string;
}

const SLIDES: Slide[] = [
    {
        icon: 'lock-closed',
        secondaryIcon: 'shield-checkmark-outline',
        iconColor: colors.gold[500],
        accentColor: colors.gold[500],
        tag: 'THEY SELL YOUR DATA. WE DON\'T.',
        title: 'Your Privacy\nIs Not for Sale',
        subtitle:
            'No ads. No tracking. No one reading your messages. Your conversations are yours — encrypted, private, and never sold to advertisers.',
    },
    {
        icon: 'people',
        secondaryIcon: 'eye-off-outline',
        iconColor: colors.emerald[500],
        accentColor: colors.emerald[500],
        tag: 'INVISIBLE UNTIL YOU CHOOSE',
        title: 'Your Circle,\nYour Rules',
        subtitle:
            'Stay in your family group and never be seen by anyone else. Or join the larger community when you\'re ready. You control who sees you.',
    },
    {
        icon: 'compass',
        secondaryIcon: 'videocam-outline',
        iconColor: colors.azure[500],
        accentColor: colors.azure[500],
        tag: 'MORE THAN MESSAGING',
        title: 'Everything\nYou Need',
        subtitle:
            'Group chat, video calls, live streaming, cultural tools, community boards — all in one place. No juggling five different apps.',
    },
    {
        icon: 'heart',
        secondaryIcon: 'home-outline',
        iconColor: colors.coral[500],
        accentColor: colors.coral[500],
        tag: 'BUILT FOR YOU',
        title: 'Welcome\nHome',
        subtitle:
            'Built by people who know what it\'s like to be surveilled, silenced, and sold out. This is the platform we needed. Now it\'s yours.',
    },
];

function SlideItem({
    slide,
    index,
    scrollX,
}: {
    slide: Slide;
    index: number;
    scrollX: Animated.SharedValue<number>;
}) {
    const animatedIconStyle = useAnimatedStyle(() => {
        const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
        ];
        const translateY = interpolate(scrollX.value, inputRange, [40, 0, 40]);
        const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0]);
        const scale = interpolate(scrollX.value, inputRange, [0.6, 1, 0.6]);
        return {
            transform: [{ translateY }, { scale }],
            opacity,
        };
    });

    const animatedTextStyle = useAnimatedStyle(() => {
        const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
        ];
        const translateY = interpolate(scrollX.value, inputRange, [30, 0, 30]);
        const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0]);
        return {
            transform: [{ translateY }],
            opacity,
        };
    });

    return (
        <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
                {/* Outer glow ring */}
                <View style={[styles.iconGlowOuter, { borderColor: `${slide.accentColor}15` }]}>
                    <View style={[styles.iconCircle, { backgroundColor: `${slide.iconColor}12` }]}>
                        <View style={[styles.iconInner, { backgroundColor: `${slide.iconColor}20` }]}>
                            <Ionicons name={slide.icon} size={56} color={slide.iconColor} />
                        </View>
                    </View>
                </View>
                {/* Floating secondary icon */}
                {slide.secondaryIcon && (
                    <View style={[styles.floatingIcon, { backgroundColor: `${slide.accentColor}25` }]}>
                        <Ionicons name={slide.secondaryIcon} size={20} color={slide.accentColor} />
                    </View>
                )}
            </Animated.View>

            <Animated.View style={[styles.textContainer, animatedTextStyle]}>
                <View style={[styles.tagBadge, { backgroundColor: `${slide.accentColor}15` }]}>
                    <Text style={[styles.tagText, { color: slide.accentColor }]}>{slide.tag}</Text>
                </View>
                <Text style={styles.slideTitle}>{slide.title}</Text>
                <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
            </Animated.View>
        </View>
    );
}

function PaginationDots({
    count,
    scrollX,
}: {
    count: number;
    scrollX: Animated.SharedValue<number>;
}) {
    return (
        <View style={styles.dotsContainer}>
            {Array.from({ length: count }).map((_, i) => {
                const dotStyle = useAnimatedStyle(() => {
                    const inputRange = [
                        (i - 1) * SCREEN_WIDTH,
                        i * SCREEN_WIDTH,
                        (i + 1) * SCREEN_WIDTH,
                    ];
                    const width = interpolate(scrollX.value, inputRange, [8, 28, 8], 'clamp');
                    const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], 'clamp');
                    return { width, opacity };
                });

                return (
                    <Animated.View
                        key={i}
                        style={[styles.dot, dotStyle]}
                    />
                );
            })}
        </View>
    );
}

export default function WelcomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const scrollX = useSharedValue(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<Animated.FlatList<Slide>>(null);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
    });

    const onViewableItemsChanged = useCallback(
        ({ viewableItems }: { viewableItems: any[] }) => {
            if (viewableItems.length > 0) {
                setCurrentIndex(viewableItems[0].index ?? 0);
            }
        },
        []
    );

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
    }).current;

    const isLastSlide = currentIndex === SLIDES.length - 1;

    return (
        <LinearGradient
            colors={[colors.obsidian[900], '#0D0D10', colors.obsidian[900]]}
            style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        >
            {/* Skip button */}
            <Animated.View entering={FadeInUp.delay(800).duration(400)} style={styles.skipContainer}>
                <Pressable onPress={() => router.push('/(auth)/login')} style={styles.skipButton}>
                    <Text style={styles.skipText}>Skip</Text>
                </Pressable>
            </Animated.View>

            {/* Slides */}
            <Animated.FlatList
                ref={flatListRef as any}
                data={SLIDES}
                renderItem={({ item, index }) => (
                    <SlideItem slide={item} index={index} scrollX={scrollX} />
                )}
                keyExtractor={(_, index) => index.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                style={styles.slideList}
            />

            {/* Pagination dots */}
            <PaginationDots count={SLIDES.length} scrollX={scrollX} />

            {/* Bottom actions */}
            <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.actionsSection}>
                <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onPress={() => {
                        if (isLastSlide) {
                            router.push('/(auth)/signup');
                        } else {
                            flatListRef.current?.scrollToIndex({
                                index: currentIndex + 1,
                                animated: true,
                            });
                        }
                    }}
                >
                    {isLastSlide ? 'Join the Movement' : 'Next'}
                </Button>

                <Button
                    variant="ghost"
                    size="lg"
                    fullWidth
                    onPress={() => router.push('/(auth)/login')}
                    style={styles.loginButton}
                >
                    Already have an account? Log in
                </Button>
            </Animated.View>

            {/* Footer */}
            <Animated.View entering={FadeIn.delay(1000).duration(400)}>
                <Text style={styles.manifesto}>
                    No ads. No algorithms. No surveillance. Just you and your people.
                </Text>
                <Text style={styles.terms}>
                    By continuing, you agree to our Terms of Service and Privacy Policy
                </Text>
            </Animated.View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    skipContainer: {
        alignItems: 'flex-end',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
    },
    skipButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    skipText: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
        fontFamily: 'Inter-Medium',
    },
    slideList: {
        flex: 1,
    },
    slide: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    iconContainer: {
        marginBottom: spacing['2xl'],
        position: 'relative',
    },
    iconGlowOuter: {
        width: 180,
        height: 180,
        borderRadius: 90,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 156,
        height: 156,
        borderRadius: 78,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconInner: {
        width: 110,
        height: 110,
        borderRadius: 55,
        alignItems: 'center',
        justifyContent: 'center',
    },
    floatingIcon: {
        position: 'absolute',
        top: 8,
        right: -4,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        alignItems: 'center',
        paddingHorizontal: spacing.md,
    },
    tagBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 20,
        marginBottom: spacing.md,
    },
    tagText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        letterSpacing: 1.5,
        fontFamily: 'Inter-Bold',
    },
    slideTitle: {
        fontSize: 36,
        fontWeight: '700',
        color: colors.text.primary,
        textAlign: 'center',
        letterSpacing: -1.2,
        lineHeight: 44,
        fontFamily: 'Inter-Bold',
    },
    slideSubtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        marginTop: spacing.lg,
        lineHeight: 24,
        maxWidth: 320,
        fontFamily: 'Inter',
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: spacing.xl,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.gold[500],
    },
    actionsSection: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.md,
    },
    loginButton: {
        marginTop: spacing.md,
    },
    manifesto: {
        fontSize: typography.fontSize.xs,
        color: colors.gold[500],
        textAlign: 'center',
        fontFamily: 'Inter-SemiBold',
        letterSpacing: 0.5,
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.sm,
    },
    terms: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
    },
});
