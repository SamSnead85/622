// ============================================
// New Message Screen
// Search for users and start a new conversation
// ============================================

import { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { typography, spacing } from '@zerog/ui';
import { useAuthStore } from '../../stores';
import { apiFetch, API } from '../../lib/api';
import { AVATAR_PLACEHOLDER } from '../../lib/imagePlaceholder';
import { useTheme } from '../../contexts/ThemeContext';
import { ScreenHeader } from '../../components';

interface UserResult {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
}

export default function NewMessageScreen() {
    const { colors: c } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<UserResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = useCallback((text: string) => {
        setQuery(text);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (text.trim().length < 2) {
            setResults([]);
            setHasSearched(false);
            return;
        }

        searchTimeout.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const data = await apiFetch<{ users: UserResult[] }>(
                    `/api/v1/users/search?q=${encodeURIComponent(text.trim())}&limit=20`
                );
                setResults((data.users || []).filter((u) => u.id !== user?.id));
                setHasSearched(true);
            } catch {
                setResults([]);
                setHasSearched(true);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    }, [user?.id]);

    const handleSelectUser = useCallback(async (selectedUser: UserResult) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            // Try to find existing conversation or create new one
            const data = await apiFetch<{ conversation: { id: string } }>(
                API.conversations,
                {
                    method: 'POST',
                    body: JSON.stringify({ participantIds: [selectedUser.id] }),
                }
            );
            router.replace(`/messages/${data.conversation.id}` as any);
        } catch {
            // If conversation creation fails, navigate to messages with the user id
            router.replace(`/messages/${selectedUser.id}` as any);
        }
    }, [router]);

    const renderUser = useCallback(({ item, index }: { item: UserResult; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 40).duration(250)}>
            <TouchableOpacity
                style={[styles.userRow, { borderBottomColor: c.border.subtle }]}
                onPress={() => handleSelectUser(item)}
                activeOpacity={0.7}
            >
                <Image
                    source={{ uri: item.avatarUrl || undefined }}
                    style={[styles.avatar, { backgroundColor: c.surface.glass }]}
                    placeholder={AVATAR_PLACEHOLDER.blurhash}
                    transition={200}
                    cachePolicy="memory-disk"
                />
                <View style={styles.userInfo}>
                    <View style={styles.nameRow}>
                        <Text style={[styles.displayName, { color: c.text.primary }]} numberOfLines={1}>
                            {item.displayName}
                        </Text>
                        {item.isVerified && (
                            <Ionicons name="checkmark-circle" size={14} color={c.gold[500]} />
                        )}
                    </View>
                    <Text style={[styles.username, { color: c.text.muted }]} numberOfLines={1}>
                        @{item.username}
                    </Text>
                </View>
                <Ionicons name="chatbubble-outline" size={20} color={c.text.muted} />
            </TouchableOpacity>
        </Animated.View>
    ), [c, handleSelectUser]);

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <ScreenHeader title="New Message" />

            {/* Search */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <View style={[styles.searchContainer, { borderBottomColor: c.border.subtle }]}>
                    <View style={[styles.searchBar, { backgroundColor: c.surface.glass, borderColor: c.border.subtle }]}>
                        <Ionicons name="search" size={18} color={c.text.muted} />
                        <TextInput
                            style={[styles.searchInput, { color: c.text.primary }]}
                            placeholder="Search by name or username..."
                            placeholderTextColor={c.text.muted}
                            value={query}
                            onChangeText={handleSearch}
                            autoFocus
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="search"
                        />
                        {query.length > 0 && (
                            <TouchableOpacity onPress={() => handleSearch('')}>
                                <Ionicons name="close-circle" size={18} color={c.text.muted} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Results */}
                {isSearching ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="small" color={c.gold[400]} />
                    </View>
                ) : results.length > 0 ? (
                    <FlatList
                        data={results}
                        keyExtractor={(item) => item.id}
                        renderItem={renderUser}
                        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    />
                ) : hasSearched ? (
                    <View style={styles.centered}>
                        <Ionicons name="search" size={48} color={c.text.muted + '40'} />
                        <Text style={[styles.emptyTitle, { color: c.text.secondary }]}>
                            No users found
                        </Text>
                        <Text style={[styles.emptySubtitle, { color: c.text.muted }]}>
                            Try a different search term
                        </Text>
                    </View>
                ) : (
                    <View style={styles.centered}>
                        <Ionicons name="people" size={48} color={c.text.muted + '40'} />
                        <Text style={[styles.emptyTitle, { color: c.text.secondary }]}>
                            Start a conversation
                        </Text>
                        <Text style={[styles.emptySubtitle, { color: c.text.muted }]}>
                            Search for someone to message
                        </Text>
                    </View>
                )}
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    backBtn: { width: 40, alignItems: 'center' },
    headerTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
    },
    searchContainer: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 14,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: typography.fontSize.md,
        paddingVertical: 2,
    },
    listContent: {
        paddingHorizontal: spacing.md,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    userInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    displayName: {
        fontSize: typography.fontSize.md,
        fontWeight: '600',
    },
    username: {
        fontSize: typography.fontSize.sm,
        marginTop: 2,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.xl,
    },
    emptyTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '600',
        marginTop: spacing.sm,
    },
    emptySubtitle: {
        fontSize: typography.fontSize.sm,
        textAlign: 'center',
    },
});
