import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@zerog/ui';
import { useNotificationsStore } from '../../stores';
import { useTheme } from '../../contexts/ThemeContext';

// ============================================
// Tab Icon — clean, minimal, Instagram-style
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
            <Ionicons
                name={focused ? iconNameFocused : iconName}
                size={24}
                color={focused ? c.text.primary : c.text.muted}
            />
            {badge != null && badge > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                </View>
            )}
        </View>
    );
}

// ============================================
// Tab Layout — 5 tabs: Home, Search, Create, Communities, Profile
// ============================================

export default function TabLayout() {
    const insets = useSafeAreaInsets();
    const { colors: c } = useTheme();
    const unreadCount = useNotificationsStore((s) => s.unreadCount);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: [
                    styles.tabBar,
                    {
                        paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
                        backgroundColor: c.background,
                        borderTopColor: c.border.subtle,
                    },
                ],
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
                            iconName="home-outline"
                            iconNameFocused="home"
                            focused={focused}
                            badge={unreadCount}
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
                name="create"
                options={{
                    tabBarAccessibilityLabel: 'Create tab',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon
                            iconName="add-circle-outline"
                            iconNameFocused="add-circle"
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
            <Tabs.Screen name="messages" options={{ href: null }} />
        </Tabs>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    tabBar: {
        borderTopWidth: StyleSheet.hairlineWidth,
        height: 50,
        elevation: 0,
        shadowOpacity: 0,
    },
    tabIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 48,
        minHeight: 40,
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
