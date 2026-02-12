import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@zerog/ui';
import { useNotificationsStore } from '../../stores';
import { useTheme } from '../../contexts/ThemeContext';

// ============================================
// Tab Icon — clean, minimal, premium
// ============================================

interface TabIconProps {
    label: string;
    iconName: keyof typeof Ionicons.glyphMap;
    iconNameFocused: keyof typeof Ionicons.glyphMap;
    focused: boolean;
    badge?: number;
}

function TabIcon({ label, iconName, iconNameFocused, focused, badge }: TabIconProps) {
    const { colors: c } = useTheme();
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
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: focused }}
        >
            <View>
                <Ionicons
                    name={focused ? iconNameFocused : iconName}
                    size={23}
                    color={focused ? c.text.primary : c.text.muted}
                />
                {badge != null && badge > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                    </View>
                )}
            </View>
            <Text
                style={[
                    styles.tabLabel,
                    { color: focused ? c.text.primary : c.text.muted },
                ]}
            >
                {label}
            </Text>
            {focused && <View style={[styles.tabIndicator, { backgroundColor: c.text.primary }]} />}
        </Animated.View>
    );
}

// ============================================
// Tab Layout — 4 tabs: Home, Messages, Discover, You
// ============================================

export default function TabLayout() {
    const insets = useSafeAreaInsets();
    const { colors: c } = useTheme();
    const unreadCount = useNotificationsStore((s) => s.unreadCount);

    const tabBarBg = useMemo(() => ({
        surface: { ...StyleSheet.absoluteFillObject, backgroundColor: c.obsidian[900], opacity: 0.92 } as const,
        border: { position: 'absolute' as const, top: 0, left: 0, right: 0, height: 1, backgroundColor: c.border.subtle },
    }), [c]);

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
                        <View style={tabBarBg.surface} />
                        <View style={tabBarBg.border} />
                    </View>
                ),
                tabBarShowLabel: false,
                tabBarActiveTintColor: c.text.primary,
                tabBarInactiveTintColor: c.text.muted,
                tabBarHideOnKeyboard: true,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    tabBarAccessibilityLabel: 'Home tab',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            label="Home"
                            iconName="home-outline"
                            iconNameFocused="home"
                            focused={focused}
                            badge={unreadCount}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="messages"
                options={{
                    tabBarAccessibilityLabel: 'Messages tab',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            label="Messages"
                            iconName="chatbubbles-outline"
                            iconNameFocused="chatbubbles"
                            focused={focused}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="search"
                options={{
                    tabBarAccessibilityLabel: 'Discover tab',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            label="Discover"
                            iconName="compass-outline"
                            iconNameFocused="compass"
                            focused={focused}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarAccessibilityLabel: 'You tab',
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
            {/* Hidden tabs — still routable but not in tab bar */}
            <Tabs.Screen name="create" options={{ href: null }} />
            <Tabs.Screen name="communities" options={{ href: null }} />
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
        height: 70,
        elevation: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    tabBarBackground: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    tabIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 8,
        minWidth: 56,
        minHeight: 48,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 4,
        letterSpacing: 0.1,
    },
    tabIndicator: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginTop: 3,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -8,
        backgroundColor: colors.coral[500],
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: colors.text.primary,
        fontSize: 10,
        fontWeight: '700',
    },
});
