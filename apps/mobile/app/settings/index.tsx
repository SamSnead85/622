import { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Linking,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { useAuthStore } from '../../stores';
import { apiFetch, apiUpload, API } from '../../lib/api';

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
    const [culturalProfile, setCulturalProfile] = useState(user?.culturalProfile || 'standard');
    const [showProfileEditor, setShowProfileEditor] = useState(false);
    const [editDisplayName, setEditDisplayName] = useState(user?.displayName || '');
    const [editBio, setEditBio] = useState(user?.bio || '');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    const handleSaveProfile = useCallback(async () => {
        setIsSavingProfile(true);
        try {
            await apiFetch(`${API.users}/profile`, {
                method: 'PUT',
                body: JSON.stringify({
                    displayName: editDisplayName.trim(),
                    bio: editBio.trim(),
                }),
            });
            await refreshUser();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowProfileEditor(false);
        } catch {
            Alert.alert('Error', 'Failed to save profile. Please try again.');
        } finally {
            setIsSavingProfile(false);
        }
    }, [editDisplayName, editBio, refreshUser]);

    const handlePickAvatar = useCallback(async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'We need access to your photos to update your avatar.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (result.canceled || !result.assets?.[0]) return;

        setIsUploadingAvatar(true);
        try {
            await apiUpload(API.uploadAvatar, result.assets[0].uri);
            await refreshUser();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            Alert.alert('Error', 'Failed to upload avatar. Please try again.');
        } finally {
            setIsUploadingAvatar(false);
        }
    }, [refreshUser]);

    const handleCulturalProfileChange = async (profile: string) => {
        setCulturalProfile(profile);
        try {
            await apiFetch(`${API.users}/profile`, {
                method: 'PUT',
                body: JSON.stringify({ culturalProfile: profile }),
            });
            await refreshUser();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            Alert.alert('Error', 'Failed to update cultural profile.');
            setCulturalProfile(user?.culturalProfile || 'standard');
        }
    };

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

    const handleJoinCommunity = () => {
        Alert.alert(
            'Join the Community',
            'You\'ll become visible on the community feed and others can discover your public profile. Your private groups remain private. You can switch back to private mode anytime.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Join Community',
                    onPress: async () => {
                        try {
                            await apiFetch(API.communityOptIn, { method: 'POST', body: JSON.stringify({ optIn: true }) });
                            await refreshUser();
                            Alert.alert('Welcome!', 'You\'re now part of the larger community. You can switch back to private mode anytime from Settings.');
                        } catch {
                            Alert.alert('Error', 'Failed to join community. Please try again.');
                        }
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
                            onPress={() => {
                                setEditDisplayName(user?.displayName || '');
                                setEditBio(user?.bio || '');
                                setShowProfileEditor(!showProfileEditor);
                            }}
                        />

                        {/* Inline Profile Editor */}
                        {showProfileEditor && (
                            <View style={styles.profileEditor}>
                                {/* Avatar */}
                                <TouchableOpacity style={styles.avatarEditor} onPress={handlePickAvatar} disabled={isUploadingAvatar}>
                                    {user?.avatarUrl ? (
                                        <Image source={{ uri: user.avatarUrl }} style={styles.editAvatar} transition={150} />
                                    ) : (
                                        <View style={[styles.editAvatar, styles.editAvatarPlaceholder]}>
                                            <Ionicons name="person" size={32} color={colors.text.muted} />
                                        </View>
                                    )}
                                    <View style={styles.avatarEditBadge}>
                                        {isUploadingAvatar ? (
                                            <ActivityIndicator size="small" color={colors.obsidian[900]} />
                                        ) : (
                                            <Ionicons name="camera" size={14} color={colors.obsidian[900]} />
                                        )}
                                    </View>
                                </TouchableOpacity>

                                {/* Display Name */}
                                <Text style={styles.editorLabel}>Display Name</Text>
                                <TextInput
                                    style={styles.editorInput}
                                    value={editDisplayName}
                                    onChangeText={setEditDisplayName}
                                    placeholder="Your display name"
                                    placeholderTextColor={colors.text.muted}
                                    maxLength={50}
                                    returnKeyType="next"
                                />

                                {/* Bio */}
                                <Text style={styles.editorLabel}>Bio</Text>
                                <TextInput
                                    style={[styles.editorInput, styles.editorTextarea]}
                                    value={editBio}
                                    onChangeText={setEditBio}
                                    placeholder="Tell people about yourself"
                                    placeholderTextColor={colors.text.muted}
                                    maxLength={200}
                                    multiline
                                    numberOfLines={3}
                                />
                                <Text style={styles.charCount}>{editBio.length}/200</Text>

                                {/* Save button */}
                                <TouchableOpacity style={styles.saveProfileBtn} onPress={handleSaveProfile} disabled={isSavingProfile}>
                                    <LinearGradient colors={[colors.gold[400], colors.gold[600]]} style={styles.saveProfileGradient}>
                                        {isSavingProfile ? (
                                            <ActivityIndicator size="small" color={colors.obsidian[900]} />
                                        ) : (
                                            <Text style={styles.saveProfileText}>Save Profile</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}

                        <SettingRow icon="lock-closed-outline" label="Password & Security" description="Change password, enable 2FA" />
                        <SettingRow icon="mail-outline" label="Email" description={user?.email || 'Not set'} />
                    </View>

                    {/* Cultural Experience */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Cultural Experience</Text>
                        <View style={styles.settingRow}>
                            <View style={styles.settingIcon}>
                                <Ionicons name="globe-outline" size={20} color={colors.text.secondary} />
                            </View>
                            <View style={[styles.settingContent, { gap: spacing.sm }]}>
                                <Text style={styles.settingLabel}>Greeting Profile</Text>
                                <View style={styles.profileOptions}>
                                    {[
                                        { key: 'standard', label: 'Standard', desc: 'Good morning' },
                                        { key: 'muslim', label: 'Muslim', desc: 'Assalamu Alaikum' },
                                        { key: 'custom', label: 'Custom', desc: 'Your greeting' },
                                    ].map(opt => (
                                        <TouchableOpacity
                                            key={opt.key}
                                            style={[styles.profileOption, culturalProfile === opt.key && styles.profileOptionActive]}
                                            onPress={() => handleCulturalProfileChange(opt.key)}
                                        >
                                            <Text style={[styles.profileOptionLabel, culturalProfile === opt.key && styles.profileOptionLabelActive]}>{opt.label}</Text>
                                            <Text style={styles.profileOptionDesc}>{opt.desc}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>
                        {culturalProfile === 'muslim' && (
                            <SettingRow
                                icon="compass-outline"
                                label="Deen Tools"
                                description="Prayer times, Qibla, Quran, and more"
                                onPress={() => router.push('/tools' as any)}
                            />
                        )}
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
                        {user?.communityOptIn ? (
                            <SettingRow
                                icon="eye-off-outline"
                                label="Switch to Private Mode"
                                description="Leave the community feed and become invisible to others. Your private groups stay safe. You can rejoin anytime from here."
                                onPress={handleLeaveCommunity}
                                danger
                            />
                        ) : (
                            <SettingRow
                                icon="people-outline"
                                label="Join the Larger Community"
                                description="See the community feed and become discoverable. You can switch back to private anytime from this settings page."
                                onPress={handleJoinCommunity}
                            />
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
    settingIconDanger: { backgroundColor: colors.surface.coralSubtle },
    settingContent: { flex: 1, marginLeft: spacing.md },
    settingLabel: { fontSize: typography.fontSize.base, fontWeight: '600', color: colors.text.primary },
    settingLabelDanger: { color: colors.coral[500] },
    settingDescription: { fontSize: typography.fontSize.sm, color: colors.text.muted, marginTop: 2 },
    profileOptions: {
        flexDirection: 'row',
        gap: spacing.xs,
    },
    profileOption: {
        flex: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
        borderRadius: 10,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        alignItems: 'center',
    },
    profileOptionActive: {
        backgroundColor: colors.surface.goldSubtle,
        borderColor: colors.gold[500],
    },
    profileOptionLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
    },
    profileOptionLabelActive: {
        color: colors.gold[400],
    },
    profileOptionDesc: {
        fontSize: 10,
        color: colors.text.muted,
        marginTop: 2,
    },
    badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 8 },
    badgeCommunity: { backgroundColor: colors.surface.azureSubtle },
    badgePrivate: { backgroundColor: colors.surface.goldLight },
    badgeText: { fontSize: typography.fontSize.xs, fontWeight: '600', color: colors.gold[400] },
    // Profile Editor
    profileEditor: {
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        padding: spacing.lg,
        marginBottom: spacing.xs,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    avatarEditor: {
        alignSelf: 'center',
        marginBottom: spacing.lg,
        position: 'relative',
    },
    editAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    editAvatarPlaceholder: {
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarEditBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.gold[500],
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.obsidian[900],
    },
    editorLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: spacing.xs,
        marginTop: spacing.sm,
    },
    editorInput: {
        backgroundColor: colors.surface.glassHover,
        borderRadius: 10,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    editorTextarea: {
        minHeight: 70,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        textAlign: 'right',
        marginTop: 4,
    },
    saveProfileBtn: {
        marginTop: spacing.md,
    },
    saveProfileGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.sm + 2,
        borderRadius: 12,
    },
    saveProfileText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.obsidian[900],
    },
});
