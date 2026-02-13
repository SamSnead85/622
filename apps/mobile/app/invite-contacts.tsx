// ============================================
// Invite Contacts Screen — SMS Blast
// Pick up to 20 contacts, send invite links
// ============================================

import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { typography, spacing } from '@zerog/ui';
import { useTheme } from '../contexts/ThemeContext';
import { BackButton } from '../components';
import { apiFetch } from '../lib/api';

const MAX_INVITES = 20;

interface ContactItem {
    id: string;
    name: string;
    phone: string;
    selected: boolean;
}

export default function InviteContactsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: c, isDark } = useTheme();

    const [contacts, setContacts] = useState<ContactItem[]>([]);
    const [filtered, setFiltered] = useState<ContactItem[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [message, setMessage] = useState('');
    const [sentCount, setSentCount] = useState<number | null>(null);

    const selectedCount = contacts.filter((c) => c.selected).length;

    // Load contacts
    useEffect(() => {
        (async () => {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status !== 'granted') {
                setPermissionDenied(true);
                setLoading(false);
                return;
            }

            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
                sort: Contacts.SortTypes.FirstName,
            });

            const mapped: ContactItem[] = data
                .filter((c) => c.phoneNumbers && c.phoneNumbers.length > 0 && c.name)
                .map((c) => ({
                    id: c.id ?? c.name ?? Math.random().toString(),
                    name: c.name ?? 'Unknown',
                    phone: c.phoneNumbers![0].number ?? '',
                    selected: false,
                }))
                .filter((c) => c.phone.length >= 10);

            setContacts(mapped);
            setFiltered(mapped);
            setLoading(false);
        })();
    }, []);

    // Filter contacts
    useEffect(() => {
        if (!search.trim()) {
            setFiltered(contacts);
        } else {
            const q = search.toLowerCase();
            setFiltered(contacts.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)));
        }
    }, [search, contacts]);

    const toggleContact = useCallback((id: string) => {
        setContacts((prev) => {
            const contact = prev.find((c) => c.id === id);
            if (!contact) return prev;

            // Don't allow selecting more than MAX_INVITES
            if (!contact.selected && prev.filter((c) => c.selected).length >= MAX_INVITES) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                Alert.alert('Limit reached', `You can invite up to ${MAX_INVITES} people at a time.`);
                return prev;
            }

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            return prev.map((c) => c.id === id ? { ...c, selected: !c.selected } : c);
        });
    }, []);

    const handleSend = useCallback(async () => {
        const selected = contacts.filter((c) => c.selected);
        if (selected.length === 0) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSending(true);

        try {
            const phones = selected.map((c) => c.phone);
            const result = await apiFetch<{ sent: number; failed: number }>('/api/v1/invite/sms-bulk', {
                method: 'POST',
                body: JSON.stringify({ phones, message: message || undefined }),
            });

            setSentCount(result.sent);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send invites. Please try again.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setSending(false);
        }
    }, [contacts, message]);

    // Success state
    if (sentCount !== null) {
        return (
            <View style={[styles.container, { backgroundColor: c.obsidian[900], paddingTop: insets.top }]}>
                <Animated.View entering={FadeIn.duration(500)} style={styles.successContainer}>
                    <View style={[styles.successIcon, { backgroundColor: c.emerald[500] + '18' }]}>
                        <Ionicons name="checkmark-circle" size={48} color={c.emerald[500]} />
                    </View>
                    <Text style={[styles.successTitle, { color: c.text.primary }]}>
                        {sentCount} invite{sentCount !== 1 ? 's' : ''} sent!
                    </Text>
                    <Text style={[styles.successSubtitle, { color: c.text.secondary }]}>
                        When they join, they'll automatically be connected to you.
                    </Text>
                    <Pressable
                        onPress={() => router.back()}
                        style={({ pressed }) => [
                            styles.doneButton,
                            { backgroundColor: c.text.primary, opacity: pressed ? 0.9 : 1 },
                        ]}
                    >
                        <Text style={[styles.doneButtonText, { color: c.text.inverse }]}>Done</Text>
                    </Pressable>
                </Animated.View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: c.obsidian[900] }]}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <BackButton />
                <Text style={[styles.headerTitle, { color: c.text.primary }]}>Invite Friends</Text>
                <View style={{ width: 44 }} />
            </View>

            {/* Search */}
            <View style={[styles.searchBar, { backgroundColor: isDark ? c.surface.glass : c.obsidian[700] }]}>
                <Ionicons name="search" size={18} color={c.text.muted} />
                <TextInput
                    style={[styles.searchInput, { color: c.text.primary }]}
                    placeholder="Search contacts..."
                    placeholderTextColor={c.text.muted}
                    value={search}
                    onChangeText={setSearch}
                    autoCorrect={false}
                />
            </View>

            {/* Custom message */}
            <View style={styles.messageSection}>
                <TextInput
                    style={[styles.messageInput, { color: c.text.primary, backgroundColor: isDark ? c.surface.glass : c.obsidian[700], borderColor: c.border.subtle }]}
                    placeholder="Add a personal message (optional)"
                    placeholderTextColor={c.text.muted}
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    maxLength={200}
                />
            </View>

            {/* Selection count */}
            <View style={styles.selectionBar}>
                <Text style={[styles.selectionText, { color: c.text.secondary }]}>
                    {selectedCount} of {MAX_INVITES} selected
                </Text>
                {selectedCount > 0 && (
                    <TouchableOpacity
                        onPress={() => {
                            setContacts((prev) => prev.map((c) => ({ ...c, selected: false })));
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                    >
                        <Text style={[styles.clearText, { color: c.azure[500] }]}>Clear all</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Contact list */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={c.gold[500]} />
                    <Text style={[styles.loadingText, { color: c.text.muted }]}>Loading contacts...</Text>
                </View>
            ) : permissionDenied ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="lock-closed-outline" size={48} color={c.text.muted} />
                    <Text style={[styles.emptyTitle, { color: c.text.primary }]}>Contacts access needed</Text>
                    <Text style={[styles.emptyText, { color: c.text.muted }]}>
                        Grant contacts permission in Settings to invite friends via text message.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.contactRow, { borderBottomColor: c.border.subtle }]}
                            onPress={() => toggleContact(item.id)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.contactAvatar, { backgroundColor: item.selected ? c.gold[500] + '20' : c.surface.glassHover }]}>
                                <Text style={[styles.contactInitial, { color: item.selected ? c.gold[500] : c.text.muted }]}>
                                    {item.name[0]?.toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.contactInfo}>
                                <Text style={[styles.contactName, { color: c.text.primary }]}>{item.name}</Text>
                                <Text style={[styles.contactPhone, { color: c.text.muted }]}>{item.phone}</Text>
                            </View>
                            <View style={[
                                styles.checkbox,
                                {
                                    backgroundColor: item.selected ? c.gold[500] : 'transparent',
                                    borderColor: item.selected ? c.gold[500] : c.border.default,
                                },
                            ]}>
                                {item.selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                            </View>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Send button */}
            {selectedCount > 0 && (
                <Animated.View entering={FadeInDown.duration(300)} style={[styles.sendBar, { paddingBottom: insets.bottom + 12, backgroundColor: c.obsidian[900] }]}>
                    <Pressable
                        onPress={handleSend}
                        disabled={sending}
                        style={({ pressed }) => [
                            styles.sendButton,
                            {
                                backgroundColor: c.text.primary,
                                opacity: pressed ? 0.9 : sending ? 0.7 : 1,
                            },
                        ]}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color={c.text.inverse} />
                        ) : (
                            <>
                                <Ionicons name="paper-plane" size={18} color={c.text.inverse} />
                                <Text style={[styles.sendButtonText, { color: c.text.inverse }]}>
                                    Send {selectedCount} invite{selectedCount !== 1 ? 's' : ''}
                                </Text>
                            </>
                        )}
                    </Pressable>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
    },
    headerTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: spacing.lg,
        paddingHorizontal: spacing.md,
        borderRadius: 12,
        height: 44,
        gap: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: typography.fontSize.base,
        fontFamily: 'Inter',
    },
    messageSection: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    messageInput: {
        borderRadius: 12,
        borderWidth: 1,
        padding: spacing.md,
        fontSize: typography.fontSize.sm,
        minHeight: 44,
        maxHeight: 80,
        fontFamily: 'Inter',
    },
    selectionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    selectionText: {
        fontSize: typography.fontSize.sm,
        fontFamily: 'Inter-Medium',
    },
    clearText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    contactAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactInitial: {
        fontSize: 18,
        fontWeight: '600',
    },
    contactInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    contactName: {
        fontSize: typography.fontSize.base,
        fontWeight: '500',
        fontFamily: 'Inter-Medium',
    },
    contactPhone: {
        fontSize: typography.fontSize.sm,
        marginTop: 1,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
    },
    loadingText: {
        fontSize: typography.fontSize.sm,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        gap: spacing.md,
    },
    emptyTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '600',
    },
    emptyText: {
        fontSize: typography.fontSize.sm,
        textAlign: 'center',
        lineHeight: 20,
    },
    sendBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    sendButton: {
        height: 52,
        borderRadius: 26,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    sendButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',
    },
    successContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    successIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    successTitle: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        fontFamily: 'Inter-Bold',
        marginBottom: spacing.sm,
    },
    successSubtitle: {
        fontSize: typography.fontSize.base,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing['2xl'],
    },
    doneButton: {
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 48,
    },
    doneButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        fontFamily: 'Inter-SemiBold',
    },
});
