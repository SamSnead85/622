import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@zerog/ui';

interface TabIconProps {
    label: string;
    iconName: keyof typeof Ionicons.glyphMap;
    iconNameFocused: keyof typeof Ionicons.glyphMap;
    focused: boolean;
}

function TabIcon({ label, iconName, iconNameFocused, focused }: TabIconProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const prevFocused = useRef(focused);

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: focused ? 1.05 : 1,
            tension: 300,
            friction: 10,
            useNativeDriver: true,
        }).start();

        // Only fire haptics on tab *change*, not initial render
        if (focused && !prevFocused.current) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        prevFocused.current = focused;
    }, [focused]);

    return (
        <Animated.View
            style={[
                styles.tabIconContainer,
                { transform: [{ scale: scaleAnim }] },
            ]}
        >
            <Ionicons
                name={focused ? iconNameFocused : iconName}
                size={24}
                color={focused ? colors.gold[500] : colors.text.muted}
            />
            <Text
                style={[
                    styles.tabLabel,
                    { color: focused ? colors.gold[500] : colors.text.muted },
                ]}
            >
                {label}
            </Text>
            {focused && <View style={styles.tabIndicator} />}
        </Animated.View>
    );
}

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
            <Animated.View
                style={[styles.createButtonGlow, { opacity: glowAnim }]}
            />
            <Animated.View
                style={[styles.createButton, { transform: [{ scale: pulseAnim }] }]}
            >
                <Ionicons name="add" size={32} color={colors.obsidian[900]} />
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
                        <TabIcon
                            label="Home"
                            iconName="home-outline"
                            iconNameFocused="home"
                            focused={focused}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="search"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            label="Search"
                            iconName="search-outline"
                            iconNameFocused="search"
                            focused={focused}
                        />
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
                        <TabIcon
                            label="Groups"
                            iconName="people-outline"
                            iconNameFocused="people"
                            focused={focused}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            label="Profile"
                            iconName="person-outline"
                            iconNameFocused="person"
                            focused={focused}
                        />
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
        height: 85,
        elevation: 0,
    },
    tabBarBackground: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    tabBarGradientOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.obsidian[900],
        opacity: 0.97,
    },
    tabBarBorder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: colors.border.subtle,
    },
    tabIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 8,
        minWidth: 50,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 3,
        fontFamily: 'Inter-Medium',
    },
    tabIndicator: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.gold[500],
        marginTop: 4,
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
});
