import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { useAuthStore } from '../../stores';
import { apiFetch, API } from '../../lib/api';

interface SettingRowProps {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    description?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
}

function SettingRow({ icon, label, description, onPress, rightElement, danger }: SettingRowProps) {
    return (
        <TouchableOpacity
            style={styles.settingRow}
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
            disabled={!onPress}
        >
            <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
                <Ionicons
                    name={icon}
                    size={20}
                    color={danger ? colors.coral[500] : colors.text.secondary}
                />
            </View>
            <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, danger && styles.settingLabelDanger]}>{label}</Text>
                {description && <Text style={styles.settingDescription}>{description}</Text>}
            </View>
            {rightElement || (onPress ? (
                <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
            ) : null)}
        </TouchableOpacity>
    );
}

export default function SettingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const refreshUser = useAuthStore((s) => s.refreshUser);
    const [isLeavingCommunity, setIsLeavingCommunity] = useState(false);

    const appVersion = Constants.expoConfig?.version || '1.0.0';

    const handleLogout = () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out',
                style: 'destructive',
                onPress: async () => {
                    await logout();
                    router.replace('/');
                },
            },
        ]);
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'This action is permanent and cannot be undone. All your data will be deleted. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete My Account',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Confirm Deletion',
                            'To delete your account, please contact us at support@0gravity.ai or use the web app.',
                            [{ text: 'OK' }]
                        );
                    },
                },
            ]
        );
    };

    const handleLeaveCommunity = () => {
        Alert.alert(
            'Leave Community',
            'You\'ll return to private-only mode. Your private groups and content stay safe. You can rejoin anytime.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave Community',
                    style: 'destructive',
                    onPress: async () => {
                        setIsLeavingCommunity(true);
                        try {
                            await apiFetch(API.communityOptIn, { method: 'POST', body: JSON.stringify({ optIn: false }) });
                            await refreshUser();
                            Alert.alert('Done', 'You\'re now in private-only mode.');
                        } catch {
                            Alert.alert('Error', 'Failed to leave community.');
                        } finally {
                            setIsLeavingCommunity(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.duration(300)}>
                    {/* Account */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Account</Text>
                        <SettingRow
                            icon="person-outline"
                            label="Edit Profile"
                            description="Update your name, bio, and avatar"
                            onPress={() => Alert.alert('Edit Profile', 'Profile editing is available on the web app. Mobile editing coming soon!', [{ text: 'OK' }])}
                        />
                        <SettingRow icon="lock-closed-outline" label="Password & Security" description="Change password, enable 2FA" />
                        <SettingRow icon="mail-outline" label="Email" description={user?.email || 'Not set'} />
                    </View>

                    {/* Privacy */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Privacy</Text>
                        <SettingRow
                            icon="shield-outline"
                            label="Privacy Mode"
                            description={user?.communityOptIn ? 'Community member — visible to others' : 'Private — only your groups can see you'}
                            rightElement={
                                <View style={[styles.badge, user?.communityOptIn ? styles.badgeCommunity : styles.badgePrivate]}>
                                    <Text style={styles.badgeText}>{user?.communityOptIn ? 'Public' : 'Private'}</Text>
                                </View>
                            }
                        />
                        {user?.communityOptIn && (
                            <SettingRow icon="log-out-outline" label="Leave Community" description="Return to private-only mode" onPress={handleLeaveCommunity} danger />
                        )}
                    </View>

                    {/* Notifications */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Notifications</Text>
                        <SettingRow icon="notifications-outline" label="Push Notifications" description="Manage notification preferences" />
                        <SettingRow icon="moon-outline" label="Quiet Hours" description="Set times when notifications are silenced" />
                    </View>

                    {/* About */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>About</Text>
                        <SettingRow icon="phone-portrait-outline" label="App Version" description={appVersion} />
                        <SettingRow
                            icon="document-text-outline"
                            label="Terms of Service"
                            onPress={() => Linking.openURL('https://0gravity.ai/terms')}
                        />
                        <SettingRow
                            icon="shield-checkmark-outline"
                            label="Privacy Policy"
                            onPress={() => Linking.openURL('https://0gravity.ai/privacy')}
                        />
                    </View>

                    {/* Danger zone */}
                    <View style={styles.section}>
                        <SettingRow icon="log-out-outline" label="Log Out" onPress={handleLogout} danger />
                        <SettingRow icon="trash-outline" label="Delete Account" description="Permanently delete your account" onPress={handleDeleteAccount} danger />
                    </View>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
    },
    backButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary, fontFamily: 'Inter-Bold' },
    scrollView: { flex: 1 },
    section: { marginTop: spacing.lg, paddingHorizontal: spacing.lg },
    sectionTitle: {
        fontSize: typography.fontSize.xs, fontWeight: '700',
        color: colors.text.muted, textTransform: 'uppercase',
        letterSpacing: 1, marginBottom: spacing.sm, marginLeft: spacing.sm,
    },
    settingRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface.glass, borderRadius: 14,
        padding: spacing.md, marginBottom: spacing.xs,
        borderWidth: 1, borderColor: colors.surface.glass,
    },
    settingIcon: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center', justifyContent: 'center',
    },
    settingIconDanger: { backgroundColor: 'rgba(255, 82, 82, 0.1)' },
    settingContent: { flex: 1, marginLeft: spacing.md },
    settingLabel: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary },
    settingLabelDanger: { color: colors.coral[500] },
    settingDescription: { fontSize: typography.fontSize.sm, color: colors.text.muted, marginTop: 2 },
    badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 8 },
    badgeCommunity: { backgroundColor: 'rgba(0, 212, 255, 0.12)' },
    badgePrivate: { backgroundColor: 'rgba(212, 175, 55, 0.12)' },
    badgeText: { fontSize: typography.fontSize.xs, fontWeight: '600', color: colors.gold[400] },
});
