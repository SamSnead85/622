import { useState, useCallback, useMemo } from 'react';
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
    Platform,
    Switch,
    Modal,
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
import { ScreenHeader } from '../../components';
import { apiFetch, apiUpload, API } from '../../lib/api';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, changeLanguage } from '../../lib/i18n';
import i18next from 'i18next';
import { showError } from '../../stores/toastStore';
import { AVATAR_PLACEHOLDER } from '../../lib/imagePlaceholder';
import { useDebounce } from '../../hooks/useDebounce';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Setting Row Component ───────────────────────────────────────────
interface SettingRowProps {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    description?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
    toggle?: { value: boolean; onValueChange: (v: boolean) => void };
}

function SettingRow({ icon, label, description, onPress, rightElement, danger, toggle }: SettingRowProps) {
    const { colors: c } = useTheme();

    const handlePress = () => {
        if (toggle) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggle.onValueChange(!toggle.value);
        } else if (onPress) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
        }
    };

    return (
        <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: c.border.subtle }, danger && styles.settingRowDanger]}
            onPress={handlePress}
            activeOpacity={onPress || toggle ? 0.7 : 1}
            disabled={!onPress && !toggle}
            accessibilityRole={toggle ? 'switch' : 'button'}
            accessibilityLabel={`${label}${description ? `, ${description}` : ''}`}
            accessibilityState={toggle ? { checked: toggle.value } : undefined}
        >
            <View style={[styles.settingIcon, { backgroundColor: c.surface.glassHover }, danger && styles.settingIconDanger]}>
                <Ionicons
                    name={icon}
                    size={20}
                    color={danger ? colors.coral[500] : c.gold[500]}
                />
            </View>
            <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: c.text.primary }, danger && styles.settingLabelDanger]}>{label}</Text>
                {description && <Text style={[styles.settingDescription, { color: c.text.muted }, danger && styles.settingDescriptionDanger]}>{description}</Text>}
            </View>
            {toggle ? (
                <Switch
                    value={toggle.value}
                    onValueChange={(val) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        toggle.onValueChange(val);
                    }}
                    trackColor={{ false: c.obsidian[600], true: c.gold[500] + '60' }}
                    thumbColor={toggle.value ? c.gold[500] : c.text.muted}
                />
            ) : rightElement || (onPress ? (
                <Ionicons name="chevron-forward" size={16} color={danger ? colors.coral[400] : c.text.muted} />
            ) : null)}
        </TouchableOpacity>
    );
}

// ─── Section Header Component ────────────────────────────────────────
function SectionHeader({ title, icon }: { title: string; icon?: keyof typeof Ionicons.glyphMap }) {
    const { colors: c } = useTheme();
    return (
        <View style={styles.sectionHeader}>
            {icon && (
                <Ionicons name={icon} size={14} color={c.gold[500]} style={{ marginRight: 6 }} />
            )}
            <Text style={[styles.sectionTitle, { color: c.text.secondary }]}>{title}</Text>
        </View>
    );
}

// ─── Main Settings Screen ────────────────────────────────────────────
export default function SettingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
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
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [showLanguagePicker, setShowLanguagePicker] = useState(false);
    const [currentLang, setCurrentLang] = useState(i18next.language || 'en');
    const currentLanguageName = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.nativeName || 'English';
    const { mode: themeMode, setMode: setThemeMode, colors: c } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 200);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);

    // Searchable settings metadata for filtering
    const settingsSections = useMemo(() => [
        { key: 'profile', keywords: ['profile', 'name', 'bio', 'avatar', 'photo', 'picture'] },
        { key: 'appearance', keywords: ['appearance', 'theme', 'dark', 'light', 'mode', 'color', 'display'] },
        { key: 'account', keywords: ['edit profile', 'name', 'bio', 'avatar', 'cover', 'background', 'banner', 'photo', 'password', 'security', '2fa', 'email', 'account'] },
        { key: 'cultural', keywords: ['cultural', 'greeting', 'muslim', 'standard', 'custom', 'deen', 'prayer', 'qibla', 'quran'] },
        { key: 'privacy', keywords: ['privacy', 'private', 'public', 'community', 'visible', 'invisible', 'mode'] },
        { key: 'language', keywords: ['language', 'data', 'import', 'whatsapp', 'instagram', 'tiktok', 'export'] },
        { key: 'feed', keywords: ['feed', 'algorithm', 'personalization', 'mixer', 'dna', 'insights', 'interests', 'topics'] },
        { key: 'notifications', keywords: ['notifications', 'push', 'alerts'] },
        { key: 'privacydata', keywords: ['privacy', 'data', 'dashboard', 'export', 'encrypted', 'download'] },
        { key: 'about', keywords: ['about', 'version', 'terms', 'privacy policy', 'service'] },
        { key: 'danger', keywords: ['logout', 'log out', 'delete', 'account', 'danger'] },
    ], []);

    const visibleSections = useMemo(() => {
        if (!debouncedSearch.trim()) return null; // null = show all
        const q = debouncedSearch.toLowerCase();
        const visible = new Set<string>();
        settingsSections.forEach((section) => {
            if (section.keywords.some((kw) => kw.includes(q))) {
                visible.add(section.key);
            }
        });
        return visible;
    }, [debouncedSearch, settingsSections]);

    const isSectionVisible = useCallback((key: string) => {
        if (!visibleSections) return true;
        return visibleSections.has(key);
    }, [visibleSections]);

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
            Alert.alert('Profile Update Failed', 'Failed to save profile. Please try again.');
            showError('Could not load profile');
        } finally {
            setIsSavingProfile(false);
        }
    }, [editDisplayName, editBio, refreshUser]);

    const handlePickAvatar = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('settings.permissionRequired'), 'We need access to your photos to update your avatar.');
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
            await apiUpload(API.uploadAvatar, result.assets[0].uri, 'image/jpeg', 'avatar.jpg');
            await refreshUser();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            Alert.alert('Upload Failed', 'Failed to upload avatar. Please try again.');
            showError('Could not upload photo');
        } finally {
            setIsUploadingAvatar(false);
        }
    }, [refreshUser]);

    const handlePickCover = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('settings.permissionRequired'), 'We need access to your photos to update your cover image.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [3, 1],
            quality: 0.85,
        });
        if (result.canceled || !result.assets?.[0]) return;

        setIsUploadingCover(true);
        try {
            await apiUpload(API.uploadCover, result.assets[0].uri, 'image/jpeg', 'cover.jpg');
            await refreshUser();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            Alert.alert('Upload Failed', 'Failed to upload cover image. Please try again.');
            showError('Could not upload cover image');
        } finally {
            setIsUploadingCover(false);
        }
    }, [refreshUser, t]);

    const handleCulturalProfileChange = async (profile: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCulturalProfile(profile);
        try {
            await apiFetch(`${API.users}/profile`, {
                method: 'PUT',
                body: JSON.stringify({ culturalProfile: profile }),
            });
            await refreshUser();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            Alert.alert('Update Failed', 'Failed to update cultural profile.');
            setCulturalProfile(user?.culturalProfile || 'standard');
            showError('Could not update setting');
        }
    };

    const appVersion = Constants.expoConfig?.version || '1.0.0';

    const handleLogout = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(t('auth.logout'), t('settings.logoutConfirm'), [
            { text: 'Cancel', style: 'cancel' },
            {
                text: t('auth.logout'),
                style: 'destructive',
                onPress: async () => {
                    await logout();
                    router.replace('/');
                },
            },
        ]);
    };

    const handleDeleteAccount = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Alert.alert(
            'Delete Account',
            'This action is permanent and cannot be undone. All your data will be deleted. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete My Account',
                    style: 'destructive',
                    onPress: () => {
                        if (Platform.OS === 'ios') {
                            Alert.prompt(
                                'Confirm Deletion',
                                'Enter your password to confirm account deletion:',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Delete',
                                        style: 'destructive',
                                        onPress: async (password) => {
                                            if (!password) {
                                                Alert.alert('Error', 'Password is required to delete your account.');
                                                return;
                                            }
                                            try {
                                                await apiFetch('/api/v1/auth/delete-account', {
                                                    method: 'POST',
                                                    body: JSON.stringify({ password }),
                                                });
                                                Alert.alert('Account Deleted', 'Your account has been successfully deleted.', [
                                                    {
                                                        text: 'OK',
                                                        onPress: async () => {
                                                            await logout();
                                                            router.replace('/');
                                                        },
                                                    },
                                                ]);
                                            } catch (error: unknown) {
                                                const errorMessage = error instanceof Error ? error.message : 'Failed to delete account. Please try again.';
                                                Alert.alert('Deletion Failed', errorMessage);
                                                showError('Could not delete account');
                                            }
                                        },
                                    },
                                ],
                                'secure-text'
                            );
                        } else {
                            // Android - show password modal
                            setShowPasswordModal(true);
                        }
                    },
                },
            ]
        );
    };

    const handleConfirmDelete = async () => {
        if (!deletePassword.trim()) {
            Alert.alert('Error', 'Password is required to delete your account.');
            return;
        }
        setIsDeletingAccount(true);
        try {
            await apiFetch('/api/v1/auth/delete-account', {
                method: 'POST',
                body: JSON.stringify({ password: deletePassword }),
            });
            setShowPasswordModal(false);
            setDeletePassword('');
            Alert.alert('Account Deleted', 'Your account has been successfully deleted.', [
                {
                    text: 'OK',
                    onPress: async () => {
                        await logout();
                        router.replace('/');
                    },
                },
            ]);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete account. Please try again.';
            Alert.alert('Deletion Failed', errorMessage);
            showError('Could not delete account');
            setDeletePassword('');
        } finally {
            setIsDeletingAccount(false);
        }
    };

    const handleJoinCommunity = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                            Alert.alert('Community Joined', 'You are now part of the larger community. You can switch back to private mode anytime from Settings.');
                        } catch {
                            Alert.alert('Join Failed', 'Failed to join community. Please try again.');
                            showError('Could not update profile');
                        }
                    },
                },
            ]
        );
    };

    const handleLeaveCommunity = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
                            Alert.alert('Privacy Updated', 'You\'re now in private-only mode. Only your groups will see your activity.');
                        } catch {
                            Alert.alert('Leave Failed', 'Failed to update privacy settings.');
                            showError('Could not update privacy settings');
                        } finally {
                            setIsLeavingCommunity(false);
                        }
                    },
                },
            ]
        );
    };

    // Stagger delay helper
    const stagger = (index: number) => FadeInDown.duration(400).delay(index * 80).springify();

    return (
        <View style={[styles.container, { backgroundColor: c.obsidian[900] }]}>
            <LinearGradient colors={[c.obsidian[900], c.obsidian[800]]} style={StyleSheet.absoluteFill} />

            <ScreenHeader title="Settings" />

            <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }} showsVerticalScrollIndicator={false}>

                {/* ─── Search Bar ─────────────────────────────────── */}
                <View style={styles.searchContainer}>
                    <View style={[styles.searchBar, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                        <Ionicons name="search-outline" size={18} color={c.text.muted} />
                        <TextInput
                            style={[styles.searchInput, { color: c.text.primary }]}
                            placeholder="Search settings..."
                            placeholderTextColor={c.text.muted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCorrect={false}
                            autoCapitalize="none"
                            selectionColor={colors.gold[500]}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                onPress={() => setSearchQuery('')}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="close-circle" size={18} color={colors.text.muted} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* No results message */}
                {visibleSections && visibleSections.size === 0 && (
                    <View style={styles.noResults}>
                        <Ionicons name="search-outline" size={32} color={colors.text.muted} />
                        <Text style={styles.noResultsText}>No settings found</Text>
                    </View>
                )}

                {/* ─── Profile Summary Card ───────────────────────── */}
                {isSectionVisible('profile') && <Animated.View entering={stagger(0)} style={styles.section}>
                    <TouchableOpacity
                        style={[styles.profileCard, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}
                        activeOpacity={0.8}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            if (user?.id) {
                                router.push(`/profile/${user.id}` as any);
                            }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="View your profile"
                    >
                        <View style={styles.profileCardInner}>
                            {user?.avatarUrl ? (
                                <Image source={{ uri: user.avatarUrl }} style={[styles.profileAvatar, { borderColor: c.gold[500] }]} placeholder={AVATAR_PLACEHOLDER.blurhash} transition={AVATAR_PLACEHOLDER.transition} cachePolicy="memory-disk" />
                            ) : (
                                <View style={[styles.profileAvatar, styles.profileAvatarPlaceholder, { borderColor: c.gold[500], backgroundColor: c.surface.goldSubtle }]}>
                                    <Ionicons name="person" size={28} color={c.gold[500]} />
                                </View>
                            )}
                            <View style={styles.profileInfo}>
                                <Text style={[styles.profileName, { color: c.text.primary }]} numberOfLines={1}>
                                    {user?.displayName || 'Your Name'}
                                </Text>
                                {user?.username ? (
                                    <Text style={[styles.profileUsername, { color: c.gold[400] }]} numberOfLines={1}>
                                        @{user.username}
                                    </Text>
                                ) : null}
                                <Text style={[styles.profileEmail, { color: c.text.muted }]} numberOfLines={1}>
                                    {user?.email || 'No email set'}
                                </Text>
                            </View>
                            <View style={[styles.profileChevron, { backgroundColor: c.surface.glassHover }]}>
                                <Ionicons name="chevron-forward" size={18} color={c.text.muted} />
                            </View>
                        </View>
                    </TouchableOpacity>
                </Animated.View>}

                {/* ─── Appearance ──────────────────────────────────── */}
                {isSectionVisible('appearance') && <Animated.View entering={stagger(1)} style={styles.section}>
                    <SectionHeader title="Appearance" icon="color-palette-outline" />
                    <View style={[styles.card, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                        <View style={styles.appearanceRow}>
                            {([
                                { key: 'dark' as const, icon: 'moon-outline' as const, label: 'Dark' },
                                { key: 'warm' as const, icon: 'flame-outline' as const, label: 'Warm' },
                                { key: 'light' as const, icon: 'sunny-outline' as const, label: 'Light' },
                                { key: 'system' as const, icon: 'phone-portrait-outline' as const, label: 'Auto' },
                            ]).map((opt) => {
                                const isActive = themeMode === opt.key;
                                return (
                                    <TouchableOpacity
                                        key={opt.key}
                                        style={[
                                            styles.appearanceOption,
                                            { backgroundColor: c.surface.glass, borderColor: c.border.subtle },
                                            isActive && { backgroundColor: c.surface.goldSubtle, borderColor: c.gold[500] },
                                        ]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setThemeMode(opt.key);
                                        }}
                                        activeOpacity={0.7}
                                        accessibilityRole="button"
                                        accessibilityLabel={`${opt.label} theme`}
                                        accessibilityState={{ selected: isActive }}
                                    >
                                        <Ionicons
                                            name={opt.icon}
                                            size={22}
                                            color={isActive ? c.gold[500] : c.text.muted}
                                        />
                                        <Text style={[styles.appearanceLabel, { color: c.text.secondary }, isActive && { color: c.gold[400] }]}>
                                            {opt.label}
                                        </Text>
                                        {isActive && (
                                            <Ionicons name="checkmark-circle" size={16} color={c.gold[500]} style={{ marginTop: 2 }} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </Animated.View>}

                {/* ─── Account ────────────────────────────────────── */}
                {isSectionVisible('account') && <Animated.View entering={stagger(2)} style={styles.section}>
                    <SectionHeader title="Account" icon="person-circle-outline" />
                    <View style={[styles.card, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                        <SettingRow
                            icon="create-outline"
                            label="Edit Profile"
                            description="Update your name, bio, and avatar"
                            onPress={() => {
                                setEditDisplayName(user?.displayName || '');
                                setEditBio(user?.bio || '');
                                setShowProfileEditor(!showProfileEditor);
                            }}
                        />
                        {/* Connected Accounts — hidden for v1.0, placeholder OAuth not ready */}

                        {/* Inline Profile Editor */}
                        {showProfileEditor && (
                            <View style={styles.profileEditor}>
                                {/* Cover Photo */}
                                <TouchableOpacity
                                    style={styles.coverEditor}
                                    onPress={handlePickCover}
                                    disabled={isUploadingCover}
                                    accessibilityRole="button"
                                    accessibilityLabel="Cover photo"
                                    accessibilityHint="Tap to change your background cover image"
                                    activeOpacity={0.8}
                                >
                                    {user?.coverUrl ? (
                                        <Image
                                            source={{ uri: user.coverUrl }}
                                            style={styles.editCover}
                                            transition={200}
                                            cachePolicy="memory-disk"
                                        />
                                    ) : (
                                        <LinearGradient
                                            colors={[colors.surface.glassHover, colors.surface.glass]}
                                            style={styles.editCover}
                                        >
                                            <Ionicons name="image-outline" size={28} color={colors.text.muted} />
                                            <Text style={styles.coverPlaceholderText}>Add cover photo</Text>
                                        </LinearGradient>
                                    )}
                                    <View style={styles.coverEditBadge}>
                                        {isUploadingCover ? (
                                            <ActivityIndicator size="small" color={colors.text.primary} />
                                        ) : (
                                            <Ionicons name="camera" size={14} color={colors.text.primary} />
                                        )}
                                    </View>
                                </TouchableOpacity>

                                {/* Avatar */}
                                <TouchableOpacity style={styles.avatarEditor} onPress={handlePickAvatar} disabled={isUploadingAvatar} accessibilityRole="button" accessibilityLabel="Your profile photo" accessibilityHint="Tap to change your avatar">
                                    {user?.avatarUrl ? (
                                        <Image source={{ uri: user.avatarUrl }} style={styles.editAvatar} placeholder={AVATAR_PLACEHOLDER.blurhash} transition={AVATAR_PLACEHOLDER.transition} cachePolicy="memory-disk" />
                                    ) : (
                                        <View style={[styles.editAvatar, styles.editAvatarPlaceholder]}>
                                            <Ionicons name="person" size={32} color={colors.text.muted} />
                                        </View>
                                    )}
                                    <View style={styles.avatarEditBadge}>
                                        {isUploadingAvatar ? (
                                            <ActivityIndicator size="small" color={colors.text.primary} />
                                        ) : (
                                            <Ionicons name="camera" size={14} color={colors.text.primary} />
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
                                <TouchableOpacity
                                    style={styles.saveProfileBtn}
                                    onPress={handleSaveProfile}
                                    disabled={isSavingProfile}
                                    accessibilityRole="button"
                                    accessibilityLabel="Save profile"
                                >
                                    <LinearGradient colors={[colors.gold[400], colors.gold[600]]} style={styles.saveProfileGradient}>
                                        {isSavingProfile ? (
                                            <ActivityIndicator size="small" color={colors.text.primary} />
                                        ) : (
                                            <Text style={styles.saveProfileText}>Save Profile</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}

                        <SettingRow
                            icon="lock-closed-outline"
                            label="Password & Security"
                            description="Change password, enable 2FA"
                            onPress={() => router.push('/settings/security' as any)}
                        />
                        <SettingRow
                            icon="mail-outline"
                            label="Email"
                            description={user?.email || 'Not set'}
                            onPress={() => router.push('/settings/email' as any)}
                        />
                    </View>
                </Animated.View>}

                {/* ─── Cultural Experience ────────────────────────── */}
                {isSectionVisible('cultural') && <Animated.View entering={stagger(3)} style={styles.section}>
                    <SectionHeader title="Cultural Experience" icon="globe-outline" />
                    <View style={[styles.card, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                        <View style={styles.settingRowFlat}>
                            <View style={styles.settingIcon}>
                                <Ionicons name="sparkles-outline" size={20} color={colors.gold[500]} />
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
                                            accessibilityRole="button"
                                            accessibilityLabel={`${opt.label} greeting profile, ${opt.desc}`}
                                            accessibilityState={{ selected: culturalProfile === opt.key }}
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
                </Animated.View>}

                {/* ─── Privacy ────────────────────────────────────── */}
                {isSectionVisible('privacy') && <Animated.View entering={stagger(4)} style={styles.section}>
                    <SectionHeader title="Privacy" icon="shield-half-outline" />
                    <View style={[styles.card, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                        <SettingRow
                            icon={user?.communityOptIn ? 'globe-outline' : 'lock-closed-outline'}
                            label="Community Visibility"
                            description={user?.communityOptIn ? 'Visible on community feed — others can discover you' : 'Private mode — only your groups can see you'}
                            toggle={{
                                value: !!user?.communityOptIn,
                                onValueChange: (val) => {
                                    if (val) {
                                        handleJoinCommunity();
                                    } else {
                                        handleLeaveCommunity();
                                    }
                                },
                            }}
                        />
                        <View style={[styles.privacyStatusRow, { backgroundColor: c.surface.glassHover, borderBottomColor: c.border.subtle }]}>
                            <Ionicons
                                name={user?.communityOptIn ? 'eye-outline' : 'eye-off-outline'}
                                size={14}
                                color={user?.communityOptIn ? c.gold[400] : colors.emerald[500]}
                            />
                            <Text style={[styles.privacyStatusText, { color: c.text.muted }]}>
                                {user?.communityOptIn
                                    ? 'Your profile is discoverable. Switch off to go private anytime.'
                                    : 'You are invisible to others outside your groups.'}
                            </Text>
                        </View>
                        <SettingRow
                            icon="shield-checkmark-outline"
                            label="Privacy Dashboard"
                            description="See what data is stored and your privacy score"
                            onPress={() => router.push('/settings/privacy-dashboard' as any)}
                        />
                    </View>
                </Animated.View>}

                {/* ─── Language & Data ────────────────────────────── */}
                {isSectionVisible('language') && <Animated.View entering={stagger(5)} style={styles.section}>
                    <SectionHeader title="Language & Data" icon="language-outline" />
                    <View style={[styles.card, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                        <SettingRow
                            icon="language-outline"
                            label="Language"
                            description={currentLanguageName}
                            onPress={() => {
                                setShowLanguagePicker(!showLanguagePicker);
                            }}
                        />
                        {showLanguagePicker && (
                            <View style={styles.languagePicker}>
                                {SUPPORTED_LANGUAGES.map((lang) => (
                                    <TouchableOpacity
                                        key={lang.code}
                                        style={[styles.languageOption, currentLang === lang.code && styles.languageOptionActive]}
                                        accessibilityRole="button"
                                        accessibilityLabel={`${lang.nativeName}, ${lang.name}`}
                                        accessibilityState={{ selected: currentLang === lang.code }}
                                        onPress={async () => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            await changeLanguage(lang.code as any);
                                            setCurrentLang(lang.code);
                                            setShowLanguagePicker(false);
                                        }}
                                    >
                                        <Text style={[styles.languageLabel, currentLang === lang.code && styles.languageLabelActive]}>
                                            {lang.nativeName}
                                        </Text>
                                        <Text style={styles.languageSubLabel}>{lang.name}</Text>
                                        {lang.rtl && <Text style={styles.rtlBadge}>RTL</Text>}
                                        {currentLang === lang.code && (
                                            <Ionicons name="checkmark-circle" size={18} color={colors.gold[400]} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        <SettingRow
                            icon="cloud-download-outline"
                            label="Import Data"
                            description="Bring data from WhatsApp, Instagram, TikTok"
                            onPress={() => router.push('/settings/import' as any)}
                        />
                        {/* Cross-Platform Sync — hidden for v1.0, depends on Connected Accounts */}
                    </View>
                </Animated.View>}

                {/* ─── Feed & Personalization ─────────────────────── */}
                {isSectionVisible('feed') && <Animated.View entering={stagger(6)} style={styles.section}>
                    <SectionHeader title="Feed & Personalization" icon="color-wand-outline" />
                    <View style={[styles.card, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                        <SettingRow
                            icon="options-outline"
                            label="Algorithm Mixer"
                            description="Control how your feed is ranked — full transparency"
                            onPress={() => router.push('/settings/algorithm' as any)}
                        />
                        <SettingRow
                            icon="analytics-outline"
                            label="Feed DNA & Insights"
                            description="See exactly how your feed works — no black boxes"
                            onPress={() => router.push('/settings/algorithm-insights' as any)}
                        />
                        <SettingRow
                            icon="pricetags-outline"
                            label="Your Interests"
                            description="Pick topics that personalize your feed"
                            onPress={() => router.push('/interests' as any)}
                        />
                    </View>
                </Animated.View>}

                {/* ─── Notifications ──────────────────────────────── */}
                {isSectionVisible('notifications') && <Animated.View entering={stagger(7)} style={styles.section}>
                    <SectionHeader title="Notifications" icon="notifications-outline" />
                    <View style={[styles.card, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                        <SettingRow
                            icon="notifications-outline"
                            label="Push Notifications"
                            description="All push notifications"
                            onPress={() => router.push('/settings/notifications' as any)}
                        />
                    </View>
                </Animated.View>}

                {/* ─── Privacy & Data ─────────────────────────────── */}
                {isSectionVisible('privacydata') && <Animated.View entering={stagger(8)} style={styles.section}>
                    <SectionHeader title="Data & Storage" icon="server-outline" />
                    <View style={[styles.card, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                        <SettingRow
                            icon="download-outline"
                            label="Export Your Data"
                            description="Download a copy of everything you've posted"
                            onPress={() => {
                                Alert.alert(
                                    'Export Data',
                                    'We\'ll prepare a download of all your content, posts, comments, and data. You\'ll receive an email when it\'s ready.',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'Request Export',
                                            onPress: async () => {
                                                try {
                                                    await apiFetch(API.accountExport, { method: 'POST' });
                                                    Alert.alert(t('settings.exportRequested'), 'You\'ll receive an email when your data export is ready.');
                                                } catch {
                                                    Alert.alert('Export Request Failed', 'Failed to request data export. Please try again.');
                                                    showError('Could not request data export');
                                                }
                                            },
                                        },
                                    ]
                                );
                            }}
                        />
                        <SettingRow
                            icon="lock-closed-outline"
                            label="Encryption"
                            description="Your data is encrypted with AES-256 and never sold"
                            rightElement={
                                <View style={styles.encryptedBadge}>
                                    <Ionicons name="checkmark-circle" size={14} color={colors.emerald[500]} />
                                    <Text style={styles.encryptedBadgeText}>Active</Text>
                                </View>
                            }
                        />
                    </View>
                </Animated.View>}

                {/* ─── About ──────────────────────────────────────── */}
                {isSectionVisible('about') && <Animated.View entering={stagger(9)} style={styles.section}>
                    <SectionHeader title="About" icon="information-circle-outline" />
                    <View style={[styles.card, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                        <SettingRow icon="phone-portrait-outline" label="App Version" description={appVersion} />
                        <SettingRow
                            icon="document-text-outline"
                            label="Terms of Service"
                            onPress={() => Linking.openURL('https://0gravity.ai/terms')}
                        />
                        <SettingRow
                            icon="reader-outline"
                            label="Privacy Policy"
                            onPress={() => Linking.openURL('https://0gravity.ai/privacy')}
                        />
                    </View>
                </Animated.View>}

                {/* ─── Danger Zone ─────────────────────────────────── */}
                {isSectionVisible('danger') && <Animated.View entering={stagger(10)} style={[styles.section, { marginTop: spacing.xl }]}>
                    <View style={styles.dangerHeader}>
                        <Ionicons name="warning-outline" size={14} color={colors.coral[500]} style={{ marginRight: 6 }} />
                        <Text style={styles.dangerTitle}>Danger Zone</Text>
                    </View>
                    <View style={styles.dangerCard}>
                        <SettingRow
                            icon="log-out-outline"
                            label="Log Out"
                            description="Sign out of your account"
                            onPress={handleLogout}
                            danger
                        />
                        <View style={styles.dangerDivider} />
                        <View style={styles.dangerBanner}>
                            <View style={styles.dangerBannerIcon}>
                                <Ionicons name="alert-circle" size={20} color={colors.coral[500]} />
                            </View>
                            <Text style={styles.dangerBannerText}>
                                Deleting your account is permanent. All your posts, comments, and data will be removed forever.
                            </Text>
                        </View>
                        <SettingRow
                            icon="trash-outline"
                            label="Delete Account"
                            description="Permanently delete your account and all data"
                            onPress={handleDeleteAccount}
                            danger
                        />
                    </View>
                </Animated.View>}

                {/* Footer */}
                <Animated.View entering={stagger(11)} style={styles.footer}>
                    <Text style={[styles.footerText, { color: c.text.muted }]}>Made with care by 0G</Text>
                    <Text style={[styles.footerVersion, { color: c.text.muted }]}>v{appVersion}</Text>
                </Animated.View>

            </ScrollView>

            {/* Password Modal for Android */}
            <Modal
                visible={showPasswordModal}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    setShowPasswordModal(false);
                    setDeletePassword('');
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                        <Text style={[styles.modalTitle, { color: c.text.primary }]}>Confirm Deletion</Text>
                        <Text style={[styles.modalMessage, { color: c.text.secondary }]}>
                            Enter your password to confirm account deletion:
                        </Text>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: c.surface.glassHover, borderColor: c.border.subtle, color: c.text.primary }]}
                            placeholder="Password"
                            placeholderTextColor={c.text.muted}
                            secureTextEntry
                            value={deletePassword}
                            onChangeText={setDeletePassword}
                            autoFocus
                            onSubmitEditing={handleConfirmDelete}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => {
                                    setShowPasswordModal(false);
                                    setDeletePassword('');
                                }}
                                disabled={isDeletingAccount}
                            >
                                <Text style={styles.modalButtonCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonDelete]}
                                onPress={handleConfirmDelete}
                                disabled={isDeletingAccount || !deletePassword.trim()}
                            >
                                {isDeletingAccount ? (
                                    <ActivityIndicator size="small" color={colors.text.primary} />
                                ) : (
                                    <Text style={styles.modalButtonDeleteText}>Delete</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },
    scrollView: {
        flex: 1,
    },

    // ─── Search Bar ─────────────────────────────
    searchContainer: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.xs,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface.glass,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        paddingHorizontal: spacing.md,
        paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0,
        gap: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        paddingVertical: spacing.xs,
    },
    noResults: {
        alignItems: 'center',
        paddingTop: 60,
        gap: spacing.sm,
    },
    noResultsText: {
        fontSize: typography.fontSize.base,
        color: colors.text.muted,
    },

    section: {
        marginTop: spacing.lg,
        paddingHorizontal: spacing.lg,
    },

    // ─── Section Headers ─────────────────────────
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
        marginStart: spacing.xs,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        color: colors.text.muted,
        textTransform: 'uppercase',
    },

    // ─── Cards (grouping rows) ───────────────────
    card: {
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
    },

    // ─── Profile Summary Card ────────────────────
    profileCard: {
        backgroundColor: colors.surface.glass,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: colors.obsidian[900],
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    profileCardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
    },
    profileAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2.5,
        borderColor: colors.gold[500],
        ...Platform.select({
            ios: {
                shadowColor: colors.gold[500],
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.35,
                shadowRadius: 10,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    profileAvatarPlaceholder: {
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    profileName: {
        fontSize: typography.fontSize.lg,
        fontWeight: '800',
        color: colors.text.primary,
        letterSpacing: -0.4,
        fontFamily: 'Inter-Bold',
    },
    profileUsername: {
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
        color: colors.gold[400],
        marginTop: 1,
    },
    profileEmail: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginTop: 2,
    },
    profileChevron: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ─── Setting Rows ────────────────────────────
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 54,
        paddingVertical: 14,
        paddingHorizontal: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border.subtle,
    },
    settingRowDanger: {
        borderBottomColor: colors.coral[500] + '14',
    },
    settingRowFlat: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 54,
        paddingVertical: 14,
        paddingHorizontal: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border.subtle,
    },
    settingIcon: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: colors.surface.glassHover,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingIconDanger: {
        backgroundColor: colors.surface.coralSubtle,
    },
    settingContent: {
        flex: 1,
        marginStart: spacing.md,
    },
    settingLabel: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
    settingLabelDanger: {
        color: colors.coral[500],
    },
    settingDescription: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        marginTop: 2,
    },
    settingDescriptionDanger: {
        color: colors.coral[300],
        opacity: 0.7,
    },

    // ─── Appearance Options ─────────────────────────
    appearanceRow: {
        flexDirection: 'row',
        padding: spacing.md,
        gap: spacing.sm,
    },
    appearanceOption: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xs,
        borderRadius: 12,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        gap: spacing.xs,
    },
    appearanceOptionActive: {
        backgroundColor: colors.surface.goldSubtle,
        borderColor: colors.gold[500],
    },
    appearanceLabel: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.secondary,
    },
    appearanceLabelActive: {
        color: colors.gold[400],
    },

    // ─── Cultural Profile Options ────────────────
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

    // ─── Privacy Status ─────────────────────────────
    privacyStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surface.glassHover,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
        gap: spacing.sm,
    },
    privacyStatusText: {
        flex: 1,
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        lineHeight: 16,
    },

    // ─── Encrypted Badge ────────────────────────────
    encryptedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.emerald[500] + '14',
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: 8,
    },
    encryptedBadgeText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.emerald[500],
    },

    // ─── Profile Editor ──────────────────────────
    profileEditor: {
        backgroundColor: colors.surface.glassHover,
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    coverEditor: {
        position: 'relative',
        marginBottom: spacing.md,
        borderRadius: 12,
        overflow: 'hidden',
    },
    editCover: {
        width: '100%',
        height: 100,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    coverPlaceholderText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: 4,
        fontWeight: '500',
    },
    coverEditBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.gold[500],
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.obsidian[900],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
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
        backgroundColor: colors.surface.glass,
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
        color: colors.text.primary,
    },

    // ─── Language Picker ─────────────────────────
    languagePicker: {
        backgroundColor: colors.surface.glassHover,
        padding: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
        gap: spacing.xs,
    },
    languageOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: 10,
        gap: spacing.sm,
    },
    languageOptionActive: {
        backgroundColor: colors.surface.goldSubtle,
    },
    languageLabel: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
    languageLabelActive: {
        color: colors.gold[400],
    },
    languageSubLabel: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        flex: 1,
    },
    rtlBadge: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.gold[400],
        backgroundColor: colors.surface.goldSubtle,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },

    // ─── Danger Zone ─────────────────────────────
    dangerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
        marginStart: spacing.xs,
        marginTop: spacing.md,
    },
    dangerTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.coral[400],
        textTransform: 'uppercase',
        letterSpacing: 1.4,
    },
    dangerCard: {
        backgroundColor: colors.coral[500] + '0A',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.coral[500] + '30',
        overflow: 'hidden',
        marginTop: spacing.xs,
    },
    dangerDivider: {
        height: 1,
        backgroundColor: colors.coral[500] + '1A',
    },
    dangerBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: spacing.md,
        backgroundColor: colors.coral[500] + '0F',
        borderBottomWidth: 1,
        borderBottomColor: colors.coral[500] + '1A',
        gap: spacing.sm,
    },
    dangerBannerIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.coral[500] + '1A',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    dangerBannerText: {
        flex: 1,
        fontSize: typography.fontSize.xs,
        color: colors.coral[300],
        lineHeight: 17,
    },

    // ─── Footer ──────────────────────────────────
    footer: {
        alignItems: 'center',
        paddingVertical: spacing['2xl'],
        paddingHorizontal: spacing.lg,
    },
    footerText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        fontWeight: '500',
    },
    footerVersion: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: spacing.xs,
        opacity: 0.6,
    },

    // ─── Password Modal ─────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.surface.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: colors.surface.glass,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        padding: spacing.xl,
        gap: spacing.md,
    },
    modalTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    modalMessage: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        lineHeight: 20,
    },
    modalInput: {
        backgroundColor: colors.surface.glassHover,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        marginTop: spacing.sm,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.md,
    },
    modalButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalButtonCancel: {
        backgroundColor: colors.surface.glassHover,
    },
    modalButtonCancelText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.secondary,
    },
    modalButtonDelete: {
        backgroundColor: colors.coral[500],
    },
    modalButtonDeleteText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.text.primary,
    },
});
