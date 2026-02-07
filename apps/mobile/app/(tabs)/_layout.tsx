import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useEffect, useRef } from 'react';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@zerog/ui';

interface TabIconProps {
    name: string;
    icon: string;
    focused: boolean;
}

function TabIcon({ name, icon, focused }: TabIconProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0.5)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: focused ? 1.1 : 1,
                tension: 300,
                friction: 10,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: focused ? 1 : 0.5,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();

        if (focused) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [focused]);

    return (
        <Animated.View
            style={[
                styles.tabIconContainer,
                {
                    transform: [{ scale: scaleAnim }],
                    opacity: opacityAnim,
                },
            ]}
        >
            <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
                {icon}
            </Text>
            {focused && (
                <View style={styles.tabIndicator} />
            )}
        </Animated.View>
    );
}

// Premium Create Button Component
function CreateButton({ focused }: { focused: boolean }) {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.05,
                        duration: 1200,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1200,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
                Animated.sequence([
                    Animated.timing(glowAnim, {
                        toValue: 0.6,
                        duration: 1200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(glowAnim, {
                        toValue: 0.3,
                        duration: 1200,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        ).start();
    }, []);

    return (
        <View style={styles.createButtonWrapper}>
            {/* Glow effect */}
            <Animated.View
                style={[
                    styles.createButtonGlow,
                    { opacity: glowAnim },
                ]}
            />
            <Animated.View
                style={[
                    styles.createButton,
                    { transform: [{ scale: pulseAnim }] },
                ]}
            >
                <Text style={styles.createButtonIcon}>+</Text>
            </Animated.View>
        </View>
    );
}

export default function TabLayout() {
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: [
                    styles.tabBar,
                    { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 },
                ],
                tabBarBackground: () => (
                    <View style={styles.tabBarBackground}>
                        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={styles.tabBarGradientOverlay} />
                        <View style={styles.tabBarBorder} />
                    </View>
                ),
                tabBarShowLabel: false,
                tabBarActiveTintColor: colors.gold[500],
                tabBarInactiveTintColor: colors.text.muted,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name="Home" icon="🏠" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="discover"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name="Discover" icon="🔍" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="create"
                options={{
                    tabBarIcon: ({ focused }) => <CreateButton focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="communities"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name="Communities" icon="👥" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name="Profile" icon="👤" focused={focused} />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: 'absolute',
        borderTopWidth: 0,
        backgroundColor: 'transparent',
        height: 80,
        elevation: 0,
    },
    tabBarBackground: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    tabBarGradientOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10, 10, 11, 0.85)',
    },
    tabBarBorder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
    },
    tabIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 8,
    },
    tabIcon: {
        fontSize: 24,
    },
    tabIconFocused: {},
    tabIndicator: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.gold[500],
        marginTop: 6,
    },
    createButtonWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -20,
    },
    createButtonGlow: {
        position: 'absolute',
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: colors.gold[500],
    },
    createButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.gold[500],
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.gold[500],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    createButtonIcon: {
        fontSize: 32,
        fontWeight: '300',
        color: colors.obsidian[900],
        marginTop: -2,
    },
});
