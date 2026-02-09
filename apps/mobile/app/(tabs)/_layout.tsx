import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@zerog/ui';

// ============================================
// Tab Icon — uniform for all tabs including Create
// Clean, minimal, premium treatment
// ============================================

interface TabIconProps {
    label: string;
    iconName: keyof typeof Ionicons.glyphMap;
    iconNameFocused: keyof typeof Ionicons.glyphMap;
    focused: boolean;
    isCreate?: boolean;
}

function TabIcon({ label, iconName, iconNameFocused, focused, isCreate }: TabIconProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const prevFocused = useRef(focused);

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: focused ? 1.05 : 1,
            tension: 300,
            friction: 10,
            useNativeDriver: true,
        }).start();

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
            {/* Create tab gets a subtle pill background */}
            {isCreate ? (
                <View style={[styles.createPill, focused && styles.createPillFocused]}>
                    <Ionicons
                        name={focused ? iconNameFocused : iconName}
                        size={20}
                        color={focused ? colors.obsidian[900] : colors.text.primary}
                    />
                </View>
            ) : (
                <Ionicons
                    name={focused ? iconNameFocused : iconName}
                    size={23}
                    color={focused ? colors.text.primary : colors.text.muted}
                />
            )}
            <Text
                style={[
                    styles.tabLabel,
                    {
                        color: isCreate
                            ? (focused ? colors.gold[500] : colors.text.secondary)
                            : (focused ? colors.text.primary : colors.text.muted),
                    },
                ]}
            >
                {label}
            </Text>
            {focused && !isCreate && <View style={styles.tabIndicator} />}
        </Animated.View>
    );
}

// ============================================
// Tab Layout
// ============================================

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
                        <View style={styles.tabBarSurface} />
                        <View style={styles.tabBarBorder} />
                    </View>
                ),
                tabBarShowLabel: false,
                tabBarActiveTintColor: colors.text.primary,
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
                            label="Explore"
                            iconName="compass-outline"
                            iconNameFocused="compass"
                            focused={focused}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="create"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            label="Create"
                            iconName="add-outline"
                            iconNameFocused="add"
                            focused={focused}
                            isCreate
                        />
                    ),
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
                            label="You"
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

// ============================================
// Styles
// ============================================

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
    tabBarSurface: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.obsidian[900],
        opacity: 0.98,
    },
    tabBarBorder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border.subtle,
    },

    // Tab icon — uniform across all tabs
    tabIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 8,
        minWidth: 56,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 4,
        fontFamily: 'Inter-Medium',
        letterSpacing: 0.1,
    },
    tabIndicator: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.text.primary,
        marginTop: 3,
    },

    // Create tab — subtle pill shape instead of floating circle
    createPill: {
        width: 40,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.surface.glassActive,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border.default,
    },
    createPillFocused: {
        backgroundColor: colors.gold[500],
        borderColor: colors.gold[500],
    },
});
