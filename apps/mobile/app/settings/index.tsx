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
import { ScreenHeader } from '../../components';
import { apiFetch, apiUpload, API } from '../../lib/api';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, changeLanguage } from '../../lib/i18n';
import i18next from 'i18next';
import { showError } from '../../stores/toastStore';
import { AVATAR_PLACEHOLDER } from '../../lib/imagePlaceholder';
import { useDebounce } from '../../hooks/useDebounce';

// ─── Setting Row Component ───────────────────────────────────────────
interface SettingRowProps {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    description?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
}

function SettingRow({ icon, label, description, onPress, rightElement, danger }: SettingRowProps) {
    const handlePress = () => {
        if (onPress) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
        }
    };

    return (
        <TouchableOpacity
            style={[styles.settingRow, danger && styles.settingRowDanger]}
            onPress={handlePress}
            activeOpacity={onPress ? 0.7 : 1}
            disabled={!onPress}
            accessibilityRole="button"
            accessibilityLabel={`${label}${description ? `, ${description}` : ''}`}
        >
            <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
                <Ionicons
                    name={icon}
                    size={20}
                    color={danger ? colors.coral[500] : colors.gold[500]}
                />
            </View>
            <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, danger && styles.settingLabelDanger]}>{label}</Text>
                {description && <Text style={[styles.settingDescription, danger && styles.settingDescriptionDanger]}>{description}</Text>}
            </View>
            {rightElement || (onPress ? (
                <Ionicons name="chevron-forward" size={16} color={danger ? colors.coral[400] : colors.text.muted} />
            ) : null)}
        </TouchableOpacity>
    );
}

// ─── Section Header Component ────────────────────────────────────────
function SectionHeader({ title, icon }: { title: string; icon?: keyof typeof Ionicons.glyphMap }) {
    return (
        <View style={styles.sectionHeader}>
            {icon && (
                <Ionicons name={icon} size={14} color={colors.gold[500]} style={{ marginRight: 6 }} />
            )}
            <Text style={styles.sectionTitle}>{title}</Text>
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
    const [showLanguagePicker, setShowLanguagePicker] = useState(false);
    const [currentLang, setCurrentLang] = useState(i18next.language || 'en');
    const currentLanguageName = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.nativeName || 'English';
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 200);

    // Searchable settings metadata for filtering
    const settingsSections = useMemo(() => [
        { key: 'profile', keywords: ['profile', 'name', 'bio', 'avatar', 'photo', 'picture'] },
        { key: 'account', keywords: ['edit profile', 'name', 'bio', 'avatar', 'password', 'security', '2fa', 'email', 'account'] },
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
            Alert.alert('Error', 'Failed to save profile. Please try again.');
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
            Alert.alert('Error', 'Failed to upload avatar. Please try again.');
            showError('Could not upload photo');
        } finally {
            setIsUploadingAvatar(false);
        }
    }, [refreshUser]);

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
            Alert.alert('Error', 'Failed to update cultural profile.');
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
                            Alert.alert('Welcome!', 'You\'re now part of the larger community. You can switch back to private mode anytime from Settings.');
                        } catch {
                            Alert.alert('Error', 'Failed to join community. Please try again.');
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
                            Alert.alert('Done', 'You\'re now in private-only mode.');
                        } catch {
                            Alert.alert('Error', 'Failed to leave community.');
                            showError('Could not delete account');
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
        <View style={styles.container}>
            <LinearGradient colors={[colors.obsidian[900], colors.obsidian[800]]} style={StyleSheet.absoluteFill} />

            <ScreenHeader title="Settings" />

            <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }} showsVerticalScrollIndicator={false}>

                {/* ─── Search Bar ─────────────────────────────────── */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search-outline" size={18} color={colors.text.muted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search settings..."
                            placeholderTextColor={colors.text.muted}
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
                        style={styles.profileCard}
                        activeOpacity={0.8}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push(`/profile/${user?.id}` as any);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="View your profile"
                    >
                        <View style={styles.profileCardInner}>
                            {user?.avatarUrl ? (
                                <Image source={{ uri: user.avatarUrl }} style={styles.profileAvatar} placeholder={AVATAR_PLACEHOLDER.blurhash} transition={AVATAR_PLACEHOLDER.transition} cachePolicy="memory-disk" />
                            ) : (
                                <View style={[styles.profileAvatar, styles.profileAvatarPlaceholder]}>
                                    <Ionicons name="person" size={28} color={colors.gold[500]} />
                                </View>
                            )}
                            <View style={styles.profileInfo}>
                                <Text style={styles.profileName} numberOfLines={1}>
                                    {user?.displayName || 'Your Name'}
                                </Text>
                                {user?.username ? (
                                    <Text style={styles.profileUsername} numberOfLines={1}>
                                        @{user.username}
                                    </Text>
                                ) : null}
                                <Text style={styles.profileEmail} numberOfLines={1}>
                                    {user?.email || 'No email set'}
                                </Text>
                            </View>
                            <View style={styles.profileChevron}>
                                <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
                            </View>
                        </View>
                    </TouchableOpacity>
                </Animated.View>}

                {/* ─── Account ────────────────────────────────────── */}
                {isSectionVisible('account') && <Animated.View entering={stagger(1)} style={styles.section}>
                    <SectionHeader title="Account" icon="person-circle-outline" />
                    <View style={styles.card}>
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

                        {/* Inline Profile Editor */}
                        {showProfileEditor && (
                            <View style={styles.profileEditor}>
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
                                <TouchableOpacity
                                    style={styles.saveProfileBtn}
                                    onPress={handleSaveProfile}
                                    disabled={isSavingProfile}
                                    accessibilityRole="button"
                                    accessibilityLabel="Save profile"
                                >
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
                {isSectionVisible('cultural') && <Animated.View entering={stagger(2)} style={styles.section}>
                    <SectionHeader title="Cultural Experience" icon="globe-outline" />
                    <View style={styles.card}>
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
                {isSectionVisible('privacy') && <Animated.View entering={stagger(3)} style={styles.section}>
                    <SectionHeader title="Privacy" icon="shield-half-outline" />
                    <View style={styles.card}>
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
                                description="Leave the community feed and become invisible to others. Your private groups stay safe. You can rejoin anytime."
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
                </Animated.View>}

                {/* ─── Language & Data ────────────────────────────── */}
                {isSectionVisible('language') && <Animated.View entering={stagger(4)} style={styles.section}>
                    <SectionHeader title="Language & Data" icon="language-outline" />
                    <View style={styles.card}>
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
                    </View>
                </Animated.View>}

                {/* ─── Feed & Personalization ─────────────────────── */}
                {isSectionVisible('feed') && <Animated.View entering={stagger(5)} style={styles.section}>
                    <SectionHeader title="Feed & Personalization" icon="color-wand-outline" />
                    <View style={styles.card}>
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
                {isSectionVisible('notifications') && <Animated.View entering={stagger(6)} style={styles.section}>
                    <SectionHeader title="Notifications" icon="notifications-outline" />
                    <View style={styles.card}>
                        <SettingRow
                            icon="notifications-outline"
                            label="Push Notifications"
                            description="All push notifications"
                            onPress={() => router.push('/settings/notifications' as any)}
                        />
                    </View>
                </Animated.View>}

                {/* ─── Privacy & Data ─────────────────────────────── */}
                {isSectionVisible('privacydata') && <Animated.View entering={stagger(7)} style={styles.section}>
                    <SectionHeader title="Privacy & Data" icon="lock-closed-outline" />
                    <View style={styles.card}>
                        <SettingRow
                            icon="shield-checkmark-outline"
                            label="Privacy Dashboard"
                            description="See what data is stored and who can see you"
                            onPress={() => router.push('/settings/privacy-dashboard' as any)}
                        />
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
                                                    await apiFetch('/api/v1/account/export', { method: 'POST' });
                                                    Alert.alert(t('settings.exportRequested'), 'You\'ll receive an email when your data export is ready.');
                                                } catch {
                                                    Alert.alert('Error', 'Failed to request data export. Please try again.');
                                                }
                                            },
                                        },
                                    ]
                                );
                            }}
                        />
                        <SettingRow
                            icon="shield-checkmark-outline"
                            label="Your data is encrypted and never sold"
                            description="We don't monetize your personal data"
                        />
                    </View>
                </Animated.View>}

                {/* ─── About ──────────────────────────────────────── */}
                {isSectionVisible('about') && <Animated.View entering={stagger(8)} style={styles.section}>
                    <SectionHeader title="About" icon="information-circle-outline" />
                    <View style={styles.card}>
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
                {isSectionVisible('danger') && <Animated.View entering={stagger(9)} style={styles.section}>
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
                <Animated.View entering={stagger(10)} style={styles.footer}>
                    <Text style={styles.footerText}>Made with care by 0G</Text>
                    <Text style={styles.footerVersion}>v{appVersion}</Text>
                </Animated.View>

            </ScrollView>
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
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
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
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
    },
    profileCardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
    },
    profileAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: colors.gold[500],
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
        fontWeight: '700',
        color: colors.text.primary,
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
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    settingRowDanger: {
        borderBottomColor: colors.coral[500] + '14',
    },
    settingRowFlat: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
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

    // ─── Badges ──────────────────────────────────
    badge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: 8,
    },
    badgeCommunity: {
        backgroundColor: colors.surface.azureSubtle,
    },
    badgePrivate: {
        backgroundColor: colors.surface.goldLight,
    },
    badgeText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.gold[400],
    },

    // ─── Profile Editor ──────────────────────────
    profileEditor: {
        backgroundColor: colors.surface.glassHover,
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
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
        color: colors.obsidian[900],
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
    },
    dangerTitle: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.coral[500],
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    dangerCard: {
        backgroundColor: colors.coral[500] + '0A',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.coral[500] + '26',
        overflow: 'hidden',
    },
    dangerDivider: {
        height: 1,
        backgroundColor: colors.coral[500] + '1A',
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
});
