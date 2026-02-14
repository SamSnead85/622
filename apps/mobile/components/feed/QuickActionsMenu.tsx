// ============================================
// QuickActionsMenu — Dropdown menu for feed header
// ============================================

import React, { memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

// ── Menu Items ──────────────────────────────────────

interface MenuItem {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    route: string;
    colorKey: 'emerald' | 'coral' | 'amber' | 'azure' | 'gold';
}

const MENU_ITEMS: MenuItem[] = [
    { icon: 'game-controller-outline', label: 'Games', route: '/games', colorKey: 'emerald' },
    { icon: 'play-circle-outline', label: 'Reels', route: '/reels', colorKey: 'coral' },
    { icon: 'radio-outline', label: 'Go Live', route: '/campfire', colorKey: 'emerald' },
    { icon: 'mic-outline', label: 'Spaces', route: '/spaces', colorKey: 'amber' },
    { icon: 'paper-plane-outline', label: 'Invite Friends', route: '/invite-contacts', colorKey: 'azure' },
    { icon: 'compass-outline', label: 'Tools', route: '/tools', colorKey: 'gold' },
];

// ── Props ───────────────────────────────────────────

interface QuickActionsMenuProps {
    visible: boolean;
    onClose: () => void;
    topOffset: number;
}

// ── Component ───────────────────────────────────────

function QuickActionsMenuInner({ visible, onClose, topOffset }: QuickActionsMenuProps) {
    const { colors: c } = useTheme();
    const router = useRouter();

    const handleItemPress = (route: string) => {
        onClose();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(route as Parameters<typeof router.push>[0]);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Animated.View
                    entering={FadeInDown.duration(200).springify().damping(18)}
                    style={[
                        styles.dropdown,
                        {
                            backgroundColor: c.surface.glass,
                            borderColor: c.border.subtle,
                            top: topOffset + 52,
                        },
                    ]}
                >
                    {MENU_ITEMS.map((item, idx) => {
                        const itemColor = c[item.colorKey]?.[500] ?? c.text.primary;
                        return (
                            <TouchableOpacity
                                key={item.label}
                                style={[
                                    styles.item,
                                    idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border.subtle },
                                ]}
                                onPress={() => handleItemPress(item.route)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.itemIcon, { backgroundColor: itemColor + '15' }]}>
                                    <Ionicons name={item.icon} size={20} color={itemColor} />
                                </View>
                                <Text style={[styles.itemLabel, { color: c.text.primary }]}>{item.label}</Text>
                                <Ionicons name="chevron-forward" size={16} color={c.text.muted} />
                            </TouchableOpacity>
                        );
                    })}
                </Animated.View>
            </Pressable>
        </Modal>
    );
}

// ── Styles ──────────────────────────────────────────

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    dropdown: {
        position: 'absolute',
        right: 12,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        minWidth: 200,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
    },
    itemIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        fontFamily: 'Inter-Medium',
    },
});

export const QuickActionsMenu = memo(QuickActionsMenuInner);
export default QuickActionsMenu;
