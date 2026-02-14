import { useState, useEffect, useCallback } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { colors } from '@zerog/ui';
import { useNotificationsStore } from '../../stores';
import { useTheme } from '../../contexts/ThemeContext';
import { apiFetch, API } from '../../lib/api';

// ============================================
// Tab Icon — warm neon glow on active
// ============================================

interface TabIconProps {
    iconName: keyof typeof Ionicons.glyphMap;
    iconNameFocused: keyof typeof Ionicons.glyphMap;
    focused: boolean;
    badge?: number;
}

function TabIcon({ iconName, iconNameFocused, focused, badge }: TabIconProps) {
    const { colors: c } = useTheme();

    return (
        <View style={styles.tabIconContainer}>
            <View style={focused ? [styles.activeGlow, { shadowColor: c.gold[500] }] : undefined}>
                <Ionicons
                    name={focused ? iconNameFocused : iconName}
                    size={24}
                    color={focused ? c.gold[500] : c.text.muted}
                />
            </View>
            {badge != null && badge > 0 && (
                <View style={[styles.badge, { backgroundColor: c.amber[500] }]}>
                    <Text style={[styles.badgeText, { color: c.text.inverse }]}>{badge > 99 ? '99+' : badge}</Text>
                </View>
            )}
        </View>
    );
}

// ============================================
// Tab Layout — 4 visible tabs + hidden routes
// ============================================

export default function TabLayout() {
    const insets = useSafeAreaInsets();
    const { colors: c } = useTheme();
    const unreadNotifs = useNotificationsStore((s) => s.unreadCount);
    const [unreadMessages, setUnreadMessages] = useState(0);

    const fetchUnreadMessages = useCallback(async () => {
        try {
            const data = await apiFetch<{ conversations: Array<{ unreadCount: number }> }>(API.conversations);
            const total = (data?.conversations || []).reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
            setUnreadMessages(total);
        } catch {
            // Silently fail — badge just won't update
        }
    }, []);

    // Refresh unread count when any tab gains focus
    useFocusEffect(useCallback(() => {
        fetchUnreadMessages();
    }, [fetchUnreadMessages]));

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: [
                    styles.tabBar,
                    {
                        paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
                        backgroundColor: c.background,
                        borderTopColor: c.gold[500] + '15',
                    },
                ],
                tabBarShowLabel: false,
                tabBarActiveTintColor: c.gold[500],
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
                            iconName="home-outline"
                            iconNameFocused="home"
                            focused={focused}
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
                            iconName="chatbubble-outline"
                            iconNameFocused="chatbubble"
                            focused={focused}
                            badge={unreadMessages}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="search"
                options={{
                    tabBarAccessibilityLabel: 'Search tab',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            iconName="search-outline"
                            iconNameFocused="search"
                            focused={focused}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="communities"
                options={{
                    tabBarAccessibilityLabel: 'Communities tab',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
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
                    tabBarAccessibilityLabel: 'Profile tab',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            iconName="person-outline"
                            iconNameFocused="person"
                            focused={focused}
                        />
                    ),
                }}
            />
            {/* Hidden tabs — still routable but not in tab bar */}
            <Tabs.Screen name="create" options={{ href: null }} />
        </Tabs>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    tabBar: {
        borderTopWidth: StyleSheet.hairlineWidth,
        height: 56,
        elevation: 0,
        shadowOpacity: 0,
    },
    tabIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 48,
        minHeight: 44,
    },
    activeGlow: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -8,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
});
