import { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing } from '@zerog/ui';
import { useAuthStore } from '../../stores';
import { apiFetch, API } from '../../lib/api';

interface SettingRowProps {
    icon: string;
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
                <Text style={styles.settingIconText}>{icon}</Text>
            </View>
            <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, danger && styles.settingLabelDanger]}>{label}</Text>
                {description && <Text style={styles.settingDescription}>{description}</Text>}
            </View>
            {rightElement || (onPress ? <Text style={styles.chevron}>›</Text> : null)}
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
                            await apiFetch(API.communityOptIn, {
                                method: 'PUT',
                                body: JSON.stringify({ optIn: false }),
                            });
                            await refreshUser();
                            Alert.alert('Done', 'You\'re now in private-only mode.');
                        } catch {
                            Alert.alert('Error', 'Failed to leave community. Please try again.');
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
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Account section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <SettingRow
                        icon="👤"
                        label="Edit Profile"
                        description="Update your name, bio, and avatar"
                        onPress={() => router.push('/settings/edit-profile')}
                    />
                    <SettingRow
                        icon="🔐"
                        label="Password & Security"
                        description="Change password, enable 2FA"
                    />
                    <SettingRow
                        icon="📧"
                        label="Email"
                        description={user?.email || 'Not set'}
                    />
                </View>

                {/* Privacy section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Privacy</Text>
                    <SettingRow
                        icon="🔒"
                        label="Privacy Mode"
                        description={user?.communityOptIn ? 'Community member — visible to others' : 'Private — only your groups can see you'}
                        rightElement={
                            <View style={[styles.badge, user?.communityOptIn ? styles.badgeCommunity : styles.badgePrivate]}>
                                <Text style={styles.badgeText}>{user?.communityOptIn ? 'Public' : 'Private'}</Text>
                            </View>
                        }
                    />
                    {user?.communityOptIn && (
                        <SettingRow
                            icon="🚪"
                            label="Leave Community"
                            description="Return to private-only mode"
                            onPress={handleLeaveCommunity}
                            danger
                        />
                    )}
                    {user?.communityOptIn && (
                        <SettingRow
                            icon="🎭"
                            label="Public Profile"
                            description={user?.usePublicProfile ? 'Using separate public identity' : 'Using your real name publicly'}
                        />
                    )}
                </View>

                {/* Notifications section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notifications</Text>
                    <SettingRow
                        icon="🔔"
                        label="Push Notifications"
                        description="Manage notification preferences"
                    />
                    <SettingRow
                        icon="🌙"
                        label="Quiet Hours"
                        description="Set times when notifications are silenced"
                    />
                </View>

                {/* About section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <SettingRow icon="📱" label="App Version" description="1.0.0" />
                    <SettingRow icon="📜" label="Terms of Service" />
                    <SettingRow icon="🛡️" label="Privacy Policy" />
                </View>

                {/* Danger zone */}
                <View style={styles.section}>
                    <SettingRow
                        icon="🚪"
                        label="Log Out"
                        onPress={handleLogout}
                        danger
                    />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    },
    backButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center', justifyContent: 'center',
    },
    backIcon: { fontSize: 20, color: colors.text.primary },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },

    scrollView: { flex: 1 },

    // Section
    section: {
        marginTop: spacing.lg, paddingHorizontal: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.fontSize.xs, fontWeight: '700',
        color: colors.text.muted, textTransform: 'uppercase',
        letterSpacing: 1, marginBottom: spacing.sm, marginLeft: spacing.sm,
    },

    // Setting row
    settingRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 14, padding: spacing.md,
        marginBottom: spacing.xs, borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.04)',
    },
    settingIcon: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center', justifyContent: 'center',
    },
    settingIconDanger: { backgroundColor: 'rgba(255, 82, 82, 0.1)' },
    settingIconText: { fontSize: 18 },
    settingContent: { flex: 1, marginLeft: spacing.md },
    settingLabel: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary },
    settingLabelDanger: { color: colors.coral[500] },
    settingDescription: { fontSize: typography.fontSize.sm, color: colors.text.muted, marginTop: 2 },
    chevron: { fontSize: 24, color: colors.text.muted, marginLeft: spacing.sm },

    // Badge
    badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 8 },
    badgeCommunity: { backgroundColor: 'rgba(0, 212, 255, 0.12)' },
    badgePrivate: { backgroundColor: 'rgba(212, 175, 55, 0.12)' },
    badgeText: { fontSize: typography.fontSize.xs, fontWeight: '600', color: colors.gold[400] },
});
