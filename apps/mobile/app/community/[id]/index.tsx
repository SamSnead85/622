import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    Alert,
    Share,
    Linking,
    Dimensions,
    FlatList,
    TextInput,
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { IMAGE_PLACEHOLDER, AVATAR_PLACEHOLDER } from '../../../lib/imagePlaceholder';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeInDown,
    FadeIn,
    FadeInUp,
    useSharedValue,
    useAnimatedStyle,
    useAnimatedScrollHandler,
    withSpring,
    interpolate,
    Extrapolation,
    SlideInRight,
    ZoomIn,
} from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { Post, mapApiPost, useCommunitiesStore, useAuthStore } from '../../../stores';
import { apiFetch, API } from '../../../lib/api';
import { ScreenHeader, LoadingView, CommunityInviteSheet, Avatar } from '../../../components';
import { showError, showSuccess } from '../../../stores/toastStore';
import { formatCount, timeAgo } from '../../../lib/utils';
import { socketManager } from '../../../lib/socket';

// ============================================
// Constants
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 220;
const HEADER_COLLAPSE_THRESHOLD = COVER_HEIGHT * 0.6;
// ============================================
// Types
// ============================================

interface CommunityDetail {
    id: string;
    name: string;
    slug?: string;
    description: string;
    avatarUrl?: string;
    coverUrl?: string;
    membersCount: number;
    postsCount: number;
    activeNow?: number;
    isPublic: boolean;
    role: 'member' | 'admin' | 'moderator' | null;
    createdAt: string;
    welcomeMessage?: string;
    websiteUrl?: string;
    brandColor?: string;
    logoUrl?: string;
    tagline?: string;
    isDemo?: boolean;
    rules?: CommunityRule[];
}

interface CommunityRule {
    id: string;
    title: string;
    description: string;
    order: number;
}

interface MemberPreview {
    id: string;
    avatarUrl?: string;
    displayName: string;
    username?: string;
    role?: string;
    joinedAt?: string;
}

interface ChatMessage {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    sender?: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
    };
    mediaUrl?: string;
    mediaType?: string;
}

type TabKey = 'feed' | 'classroom' | 'calendar' | 'members' | 'about';

// ============================================
// Tab definitions
// ============================================

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'feed', label: 'Feed', icon: 'chatbubbles-outline' },
    { key: 'classroom', label: 'Classroom', icon: 'school-outline' },
    { key: 'calendar', label: 'Events', icon: 'calendar-outline' },
    { key: 'members', label: 'Members', icon: 'people-outline' },
    { key: 'about', label: 'About', icon: 'information-circle-outline' },
];

const POST_TYPE_FILTERS = [
    { key: 'all' as const, label: 'All', icon: 'apps-outline' as const },
    { key: 'text' as const, label: 'Text', icon: 'document-text-outline' as const },
    { key: 'images' as const, label: 'Images', icon: 'image-outline' as const },
    { key: 'videos' as const, label: 'Videos', icon: 'videocam-outline' as const },
];

// ============================================
// Memoized Sub-Components
// ============================================

const PostCard = memo(function PostCard({
    post,
    onPress,
    onReport,
    showReportOption,
}: {
    post: Post;
    onPress: () => void;
    onReport?: () => void;
    showReportOption: boolean;
}) {
    return (
        <Animated.View entering={FadeInDown.duration(300)}>
            <TouchableOpacity
                style={styles.postCard}
                onPress={onPress}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Post by ${post.author?.displayName || 'Anonymous'}`}
            >
                <View style={styles.postHeader}>
                    <View style={styles.postAuthorRow}>
                        <Avatar
                            uri={post.author?.avatarUrl}
                            name={post.author?.displayName}
                            size="xs"
                        />
                        <View>
                            <Text style={styles.postAuthor}>{post.author?.displayName || 'Anonymous'}</Text>
                            <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>
                        </View>
                    </View>
                    {showReportOption && (
                        <TouchableOpacity
                            onPress={onReport}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityLabel="Report post"
                        >
                            <Ionicons name="ellipsis-horizontal" size={18} color={colors.text.muted} />
                        </TouchableOpacity>
                    )}
                </View>
                {post.content ? (
                    <Text style={styles.postContent} numberOfLines={3}>{post.content}</Text>
                ) : null}
                {post.mediaUrl && (
                    <Image
                        source={{ uri: post.thumbnailUrl || post.mediaUrl }}
                        placeholder={IMAGE_PLACEHOLDER.blurhash}
                        transition={IMAGE_PLACEHOLDER.transition}
                        cachePolicy="memory-disk"
                        style={styles.postMedia}
                        contentFit="cover"
                    />
                )}
                <View style={styles.postStats}>
                    <View style={styles.postStatItem}>
                        <Ionicons
                            name={post.isLiked ? 'heart' : 'heart-outline'}
                            size={14}
                            color={post.isLiked ? colors.coral[500] : colors.text.muted}
                        />
                        <Text style={styles.postStat}>{post.likesCount}</Text>
                    </View>
                    <View style={styles.postStatItem}>
                        <Ionicons name="chatbubble-outline" size={14} color={colors.text.muted} />
                        <Text style={styles.postStat}>{post.commentsCount}</Text>
                    </View>
                    <View style={styles.postStatItem}>
                        <Ionicons name="share-outline" size={14} color={colors.text.muted} />
                        <Text style={styles.postStat}>{post.sharesCount || 0}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

const MemberCard = memo(function MemberCard({
    member,
    isAdmin,
    onPress,
    onManage,
}: {
    member: MemberPreview;
    isAdmin: boolean;
    onPress: () => void;
    onManage?: () => void;
}) {
    return (
        <TouchableOpacity
            style={styles.memberCard}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Avatar
                uri={member.avatarUrl}
                name={member.displayName}
                size="md"
            />
            <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.displayName}</Text>
                {member.username && (
                    <Text style={styles.memberUsername}>@{member.username}</Text>
                )}
                {member.role && member.role !== 'member' && (
                    <View style={styles.memberRoleBadge}>
                        <Ionicons
                            name="shield-checkmark"
                            size={10}
                            color={colors.gold[500]}
                        />
                        <Text style={styles.memberRoleText}>{member.role}</Text>
                    </View>
                )}
            </View>
            {isAdmin && onManage && (
                <TouchableOpacity
                    onPress={onManage}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel={`Manage ${member.displayName}`}
                >
                    <Ionicons name="ellipsis-vertical" size={18} color={colors.text.muted} />
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
});

const ChatBubble = memo(function ChatBubble({
    message,
    isMine,
}: {
    message: ChatMessage;
    isMine: boolean;
}) {
    return (
        <Animated.View
            entering={isMine ? SlideInRight.duration(250) : FadeIn.duration(250)}
            style={[styles.chatBubbleWrap, isMine && styles.chatBubbleWrapMine]}
        >
            {!isMine && (
                <Avatar
                    uri={message.sender?.avatarUrl}
                    name={message.sender?.displayName}
                    size="xs"
                />
            )}
            <View style={[styles.chatBubble, isMine && styles.chatBubbleMine]}>
                {!isMine && (
                    <Text style={styles.chatSenderName}>
                        {message.sender?.displayName || 'Unknown'}
                    </Text>
                )}
                <Text style={[styles.chatText, isMine && styles.chatTextMine]}>
                    {message.content}
                </Text>
                <Text style={[styles.chatTime, isMine && styles.chatTimeMine]}>
                    {timeAgo(message.createdAt)}
                </Text>
            </View>
        </Animated.View>
    );
});

const TypingIndicator = memo(function TypingIndicator({
    names,
}: {
    names: string[];
}) {
    if (names.length === 0) return null;
    const display =
        names.length === 1
            ? `${names[0]} is typing...`
            : names.length === 2
                ? `${names[0]} and ${names[1]} are typing...`
                : `${names[0]} and ${names.length - 1} others are typing...`;
    return (
        <Animated.View entering={FadeIn.duration(200)} style={styles.typingRow}>
            <View style={styles.typingDots}>
                {[0, 1, 2].map((i) => (
                    <Animated.View
                        key={i}
                        entering={ZoomIn.delay(i * 150).duration(300)}
                        style={styles.typingDot}
                    />
                ))}
            </View>
            <Text style={styles.typingText}>{display}</Text>
        </Animated.View>
    );
});

const EmptyTabState = memo(function EmptyTabState({
    icon,
    title,
    subtitle,
    actionLabel,
    onAction,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    actionLabel?: string;
    onAction?: () => void;
}) {
    return (
        <Animated.View entering={FadeIn.duration(300)} style={styles.emptyTab}>
            <Ionicons name={icon} size={48} color={colors.text.muted} />
            <Text style={styles.emptyTabTitle}>{title}</Text>
            <Text style={styles.emptyTabSubtitle}>{subtitle}</Text>
            {actionLabel && onAction && (
                <TouchableOpacity style={styles.emptyTabAction} onPress={onAction}>
                    <Text style={styles.emptyTabActionText}>{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
});

const ErrorTabState = memo(function ErrorTabState({
    message,
    onRetry,
}: {
    message: string;
    onRetry: () => void;
}) {
    return (
        <View style={styles.emptyTab}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.coral[500]} />
            <Text style={styles.emptyTabTitle}>Unable to load content</Text>
            <Text style={styles.emptyTabSubtitle}>{message}</Text>
            <TouchableOpacity style={styles.emptyTabAction} onPress={onRetry}>
                <Text style={styles.emptyTabActionText}>Try Again</Text>
            </TouchableOpacity>
        </View>
    );
});

const TabLoadingState = memo(function TabLoadingState() {
    return (
        <View style={styles.tabLoadingContainer}>
            <ActivityIndicator size="small" color={colors.gold[500]} />
            <Text style={styles.tabLoadingText}>Loading...</Text>
        </View>
    );
});

// ============================================
// Main Screen Component
// ============================================

export default function CommunityDetailScreen() {
    const router = useRouter();
    const { id: communityId } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const joinCommunity = useCommunitiesStore((s) => s.joinCommunity);
    const leaveCommunity = useCommunitiesStore((s) => s.leaveCommunity);
    const currentUser = useAuthStore((s) => s.user);

    // ── Core State ──────────────────────────────────
    const [community, setCommunity] = useState<CommunityDetail | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isJoinLoading, setIsJoinLoading] = useState(false);
    const [showInviteSheet, setShowInviteSheet] = useState(false);
    const [memberPreviews, setMemberPreviews] = useState<MemberPreview[]>([]);
    const [activePostFilter, setActivePostFilter] = useState<'all' | 'text' | 'images' | 'videos'>('all');

    // ── Tab State ──────────────────────────────────
    const [activeTab, setActiveTab] = useState<TabKey>('feed');
    const [allMembers, setAllMembers] = useState<MemberPreview[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [membersError, setMembersError] = useState<string | null>(null);
    const [rules, setRules] = useState<CommunityRule[]>([]);
    const [rulesLoading, setRulesLoading] = useState(false);
    const [rulesError, setRulesError] = useState<string | null>(null);
    const [feedError, setFeedError] = useState<string | null>(null);

    // ── Chat State ──────────────────────────────────
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatLoading, setChatLoading] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatSending, setChatSending] = useState(false);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [showChat, setShowChat] = useState(false);
    const chatListRef = useRef<FlatList>(null);
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Moderation State ──────────────────────────────────
    const [showModPanel, setShowModPanel] = useState(false);

    // ── Animation Values ──────────────────────────────────
    const scrollY = useSharedValue(0);
    const joinScale = useSharedValue(1);
    const tabIndicatorX = useSharedValue(0);
    const TAB_WIDTH = (SCREEN_WIDTH - spacing.xl * 2) / TABS.length;

    // ── Scroll Handler (parallax) ──────────────────
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const coverAnimStyle = useAnimatedStyle(() => {
        const translateY = interpolate(
            scrollY.value,
            [-COVER_HEIGHT, 0, COVER_HEIGHT],
            [-COVER_HEIGHT / 2, 0, COVER_HEIGHT * 0.4],
            Extrapolation.CLAMP,
        );
        const scale = interpolate(
            scrollY.value,
            [-COVER_HEIGHT, 0, COVER_HEIGHT],
            [1.6, 1, 1],
            Extrapolation.CLAMP,
        );
        return { transform: [{ translateY }, { scale }] };
    });

    const coverOverlayStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            scrollY.value,
            [0, HEADER_COLLAPSE_THRESHOLD],
            [0.3, 0.85],
            Extrapolation.CLAMP,
        );
        return { opacity };
    });

    const headerOpacityStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            scrollY.value,
            [0, HEADER_COLLAPSE_THRESHOLD],
            [0, 1],
            Extrapolation.CLAMP,
        );
        return { opacity };
    });

    const tabIndicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: tabIndicatorX.value }],
        width: TAB_WIDTH,
    }));

    // ── Data Loading ──────────────────────────────────

    const loadCommunity = useCallback(async () => {
        if (!communityId) return;
        try {
            const data = await apiFetch<any>(API.community(communityId));
            const communityData = data.community || data;
            setCommunity(communityData);
            setFeedError(null);
            try {
                const postsData = await apiFetch<any>(
                    `${API.posts}?communityId=${communityId}&limit=20`,
                );
                const rawPosts = postsData.posts || postsData.data || [];
                setPosts(
                    (Array.isArray(rawPosts) ? rawPosts : []).map(mapApiPost),
                );
            } catch {
                setFeedError("Couldn't load community posts");
            }
            // Fetch member previews (first 5)
            try {
                const membersData = await apiFetch<any>(
                    API.communityMembers(communityId),
                );
                const membersList = membersData.members || membersData || [];
                const previews = (Array.isArray(membersList) ? membersList : [])
                    .slice(0, 5)
                    .map((m: any) => ({
                        id: m.userId || m.id,
                        avatarUrl: m.user?.avatarUrl,
                        displayName: m.user?.displayName || 'Member',
                        username: m.user?.username,
                        role: m.role,
                        joinedAt: m.createdAt,
                    }));
                setMemberPreviews(previews);
            } catch {
                /* silent — member preview is non-critical */
            }
        } catch (e: any) {
            if (!isRefreshing)
                Alert.alert('Load Failed', e.message || 'Failed to load community');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [communityId, isRefreshing]);

    useEffect(() => {
        loadCommunity();
    }, [communityId]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Load Members Tab ──────────────────────────────
    const loadAllMembers = useCallback(async () => {
        if (!communityId) return;
        setMembersLoading(true);
        setMembersError(null);
        try {
            const data = await apiFetch<any>(API.communityMembers(communityId));
            const membersList = data.members || data || [];
            setAllMembers(
                (Array.isArray(membersList) ? membersList : []).map((m: any) => ({
                    id: m.userId || m.id,
                    avatarUrl: m.user?.avatarUrl,
                    displayName: m.user?.displayName || 'Member',
                    username: m.user?.username,
                    role: m.role,
                    joinedAt: m.createdAt,
                })),
            );
        } catch (e: any) {
            setMembersError(e.message || 'Failed to load members');
        } finally {
            setMembersLoading(false);
        }
    }, [communityId]);

    // ── Load Rules Tab ──────────────────────────────
    const loadRules = useCallback(async () => {
        if (!communityId) return;
        setRulesLoading(true);
        setRulesError(null);
        try {
            const data = await apiFetch<any>(
                `${API.community(communityId)}/rules`,
            );
            const rulesList = data.rules || data || [];
            setRules(Array.isArray(rulesList) ? rulesList : []);
        } catch (e: any) {
            // If 404, there are simply no rules — not an error
            if (e.status === 404) {
                setRules([]);
            } else {
                setRulesError(e.message || 'Failed to load rules');
            }
        } finally {
            setRulesLoading(false);
        }
    }, [communityId]);

    // ── Tab switching: lazy-load data ──────────────────
    const handleTabChange = useCallback(
        (tab: TabKey) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab(tab);
            const idx = TABS.findIndex((t) => t.key === tab);
            tabIndicatorX.value = withSpring(idx * TAB_WIDTH, {
                damping: 20,
                stiffness: 200,
            });
            // Lazy load
            if (tab === 'members' && allMembers.length === 0 && !membersLoading) {
                loadAllMembers();
            }
            if (tab === 'members' && canModerate) {
                loadJoinRequests();
            }
            // Rules are now shown in the About tab
        },
        [allMembers.length, membersLoading, rules.length, rulesLoading, rulesError, loadAllMembers, loadRules, loadJoinRequests, canModerate, tabIndicatorX, TAB_WIDTH],
    );

    // ── Chat ──────────────────────────────────

    const loadChat = useCallback(async () => {
        if (!communityId) return;
        setChatLoading(true);
        try {
            // First get/create the chat conversation
            await apiFetch<any>(
                `/api/v1/communities/${communityId}/chat`,
            );
            // Then load messages
            const msgData = await apiFetch<any>(
                `/api/v1/communities/${communityId}/chat/messages?limit=50`,
            );
            const msgs = msgData.messages || msgData || [];
            setChatMessages(Array.isArray(msgs) ? msgs.reverse() : []);
        } catch {
            showError("Couldn't load chat messages");
        } finally {
            setChatLoading(false);
        }
    }, [communityId]);

    const sendChatMessage = useCallback(async () => {
        if (!communityId || !chatInput.trim() || chatSending) return;
        const content = chatInput.trim();
        setChatInput('');
        setChatSending(true);
        try {
            const data = await apiFetch<any>(
                `/api/v1/communities/${communityId}/chat/messages`,
                {
                    method: 'POST',
                    body: JSON.stringify({ content }),
                },
            );
            const msg = data.message || data;
            setChatMessages((prev) => [...prev, msg]);
            setTimeout(() => {
                chatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        } catch {
            showError('Failed to send message');
            setChatInput(content); // restore the text
        } finally {
            setChatSending(false);
        }
    }, [communityId, chatInput, chatSending]);

    // Socket listeners for real-time chat
    useEffect(() => {
        if (!communityId || !showChat) return;

        socketManager.joinCommunity(communityId);

        const unsubs: (() => void)[] = [];

        unsubs.push(
            socketManager.on('message:new', (msg: any) => {
                if (msg.communityId === communityId || msg.conversationId) {
                    setChatMessages((prev) => {
                        if (prev.some((m) => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                    setTimeout(() => {
                        chatListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                }
            }),
        );

        unsubs.push(
            socketManager.on('typing:start', (data: any) => {
                if (data.username) {
                    setTypingUsers((prev) =>
                        prev.includes(data.username) ? prev : [...prev, data.username],
                    );
                }
            }),
        );

        unsubs.push(
            socketManager.on('typing:stop', (data: any) => {
                setTypingUsers((prev) => prev.filter((u) => u !== data.username));
            }),
        );

        return () => {
            unsubs.forEach((fn) => fn());
            socketManager.leaveCommunity(communityId);
        };
    }, [communityId, showChat]);

    const handleChatInputChange = useCallback(
        (text: string) => {
            setChatInput(text);
            if (communityId && text.length > 0) {
                socketManager.startTyping(communityId);
                if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                typingTimerRef.current = setTimeout(() => {
                    socketManager.stopTyping(communityId);
                }, 2000);
            }
        },
        [communityId],
    );

    // Cleanup typing timer
    useEffect(() => {
        return () => {
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        };
    }, []);

    // ── Filtered posts ──────────────────────────────
    const filteredPosts = useMemo(() => {
        if (activePostFilter === 'all') return posts;
        return posts.filter((post) => {
            if (activePostFilter === 'text') return !post.mediaUrl;
            if (activePostFilter === 'images')
                return post.mediaUrl && post.mediaType === 'image';
            if (activePostFilter === 'videos')
                return post.mediaUrl && post.mediaType === 'video';
            return true;
        });
    }, [posts, activePostFilter]);

    // ── Join / Leave ──────────────────────────────
    const handleJoinLeave = useCallback(async () => {
        if (!community) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Animate button press
        joinScale.value = withSpring(0.92, { damping: 15 }, () => {
            joinScale.value = withSpring(1, { damping: 12 });
        });

        setIsJoinLoading(true);
        try {
            if (community.role) {
                if (community.role === 'admin') {
                    Alert.alert(
                        'Leave Community',
                        'As an admin, leaving will transfer ownership. Are you sure?',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            {
                                text: 'Leave',
                                style: 'destructive',
                                onPress: async () => {
                                    await leaveCommunity(community.id);
                                    setCommunity((c) =>
                                        c ? { ...c, role: null, membersCount: c.membersCount - 1 } : c,
                                    );
                                    showSuccess('Left community');
                                },
                            },
                        ],
                    );
                    setIsJoinLoading(false);
                    return;
                }
                await leaveCommunity(community.id);
                setCommunity((c) =>
                    c ? { ...c, role: null, membersCount: c.membersCount - 1 } : c,
                );
                showSuccess('Left community');
            } else {
                await joinCommunity(community.id);
                setCommunity((c) =>
                    c ? { ...c, role: 'member', membersCount: c.membersCount + 1 } : c,
                );
                showSuccess('Welcome to the community!');
            }
        } catch {
            showError('Action failed, please try again');
        } finally {
            setIsJoinLoading(false);
        }
    }, [community, joinCommunity, leaveCommunity, joinScale]);

    const joinButtonAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: joinScale.value }],
    }));

    // ── Report Post ──────────────────────────────
    const handleReportPost = useCallback(
        (postId: string) => {
            Alert.alert('Report Post', 'Why are you reporting this post?', [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Spam',
                    onPress: async () => {
                        try {
                            await apiFetch(API.report(postId), {
                                method: 'POST',
                                body: JSON.stringify({ reason: 'spam' }),
                            });
                            showSuccess('Report submitted');
                        } catch {
                            showError('Failed to submit report');
                        }
                    },
                },
                {
                    text: 'Inappropriate',
                    onPress: async () => {
                        try {
                            await apiFetch(API.report(postId), {
                                method: 'POST',
                                body: JSON.stringify({ reason: 'inappropriate' }),
                            });
                            showSuccess('Report submitted');
                        } catch {
                            showError('Failed to submit report');
                        }
                    },
                },
                {
                    text: 'Harassment',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiFetch(API.report(postId), {
                                method: 'POST',
                                body: JSON.stringify({ reason: 'harassment' }),
                            });
                            showSuccess('Report submitted');
                        } catch {
                            showError('Failed to submit report');
                        }
                    },
                },
            ]);
        },
        [],
    );

    // ── Member Management ──────────────────────────────
    const handleManageMember = useCallback(
        (member: MemberPreview) => {
            if (!community) return;
            const options: Array<{
                text: string;
                style?: 'cancel' | 'destructive';
                onPress?: () => void;
            }> = [{ text: 'Cancel', style: 'cancel' }];

            if (member.role !== 'admin') {
                options.push({
                    text: member.role === 'moderator' ? 'Remove Moderator' : 'Make Moderator',
                    onPress: async () => {
                        try {
                            const newRole = member.role === 'moderator' ? 'member' : 'moderator';
                            await apiFetch(
                                API.communityMember(community.id, member.id),
                                {
                                    method: 'PUT',
                                    body: JSON.stringify({ role: newRole }),
                                },
                            );
                            setAllMembers((prev) =>
                                prev.map((m) =>
                                    m.id === member.id ? { ...m, role: newRole } : m,
                                ),
                            );
                            showSuccess(`${member.displayName} is now a ${newRole}`);
                        } catch {
                            showError('Failed to update role');
                        }
                    },
                });
                options.push({
                    text: 'Remove from Community',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiFetch(
                                API.communityMember(community.id, member.id),
                                { method: 'DELETE' },
                            );
                            setAllMembers((prev) => prev.filter((m) => m.id !== member.id));
                            setCommunity((c) =>
                                c ? { ...c, membersCount: c.membersCount - 1 } : c,
                            );
                            showSuccess(`${member.displayName} has been removed`);
                        } catch {
                            showError('Failed to remove member');
                        }
                    },
                });
            }

            Alert.alert('Manage Member', member.displayName, options);
        },
        [community],
    );

    // ── Report Member ──────────────────────────────
    const handleReportMember = useCallback(
        (member: MemberPreview) => {
            Alert.alert('Report Member', `Report ${member.displayName}?`, [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Report',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiFetch(API.submitReport, {
                                method: 'POST',
                                body: JSON.stringify({
                                    type: 'user',
                                    targetId: member.id,
                                    reason: 'community_violation',
                                }),
                            });
                            showSuccess('Report submitted');
                        } catch {
                            showError('Failed to submit report');
                        }
                    },
                },
            ]);
        },
        [],
    );

    // ── Derived values ──────────────────────────────
    const isAdmin = community?.role === 'admin';
    const isModerator = community?.role === 'moderator';
    const canModerate = isAdmin || isModerator;

    const isDemo =
        community?.welcomeMessage?.toLowerCase().includes('demo group') ||
        community?.slug === 'miraj-collective';

    // ── Loading / Error States ──────────────────────
    if (isLoading) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[colors.obsidian[900], colors.obsidian[800]]}
                    style={StyleSheet.absoluteFill}
                />
                <LoadingView message="Loading community..." />
            </View>
        );
    }

    if (!community) {
        return (
            <View style={[styles.container, styles.centered]}>
                <LinearGradient
                    colors={[colors.obsidian[900], colors.obsidian[800]]}
                    style={StyleSheet.absoluteFill}
                />
                <Ionicons name="people-outline" size={48} color={colors.text.muted} />
                <Text style={styles.errorText}>Community not found</Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backLink}
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
                >
                    <Text style={styles.backLinkText}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Chat overlay ──────────────────────────────
    if (showChat) {
        return (
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <LinearGradient
                    colors={[colors.obsidian[900], colors.obsidian[800]]}
                    style={StyleSheet.absoluteFill}
                />
                <ScreenHeader
                    title={`${community.name} Chat`}
                    onBack={() => setShowChat(false)}
                    rightElement={
                        <TouchableOpacity
                            onPress={() => {
                                setChatMessages([]);
                                loadChat();
                            }}
                            accessibilityLabel="Refresh chat"
                        >
                            <Ionicons name="refresh" size={20} color={colors.text.primary} />
                        </TouchableOpacity>
                    }
                />

                {chatLoading ? (
                    <LoadingView message="Loading chat..." />
                ) : (
                    <FlatList
                        ref={chatListRef}
                        data={chatMessages}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <ChatBubble
                                message={item}
                                isMine={item.senderId === currentUser?.id}
                            />
                        )}
                        contentContainerStyle={styles.chatListContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <EmptyTabState
                                icon="chatbubbles-outline"
                                title="No messages yet"
                                subtitle="Start the conversation!"
                            />
                        }
                        onContentSizeChange={() =>
                            chatListRef.current?.scrollToEnd({ animated: false })
                        }
                    />
                )}

                <TypingIndicator names={typingUsers} />

                <View
                    style={[
                        styles.chatInputRow,
                        { paddingBottom: insets.bottom + spacing.sm },
                    ]}
                >
                    <TextInput
                        style={styles.chatInputField}
                        value={chatInput}
                        onChangeText={handleChatInputChange}
                        placeholder="Type a message..."
                        placeholderTextColor={colors.text.muted}
                        returnKeyType="send"
                        onSubmitEditing={sendChatMessage}
                        editable={!chatSending}
                        multiline
                        maxLength={2000}
                    />
                    <TouchableOpacity
                        style={[
                            styles.chatSendBtn,
                            (!chatInput.trim() || chatSending) && styles.chatSendBtnDisabled,
                        ]}
                        onPress={sendChatMessage}
                        disabled={!chatInput.trim() || chatSending}
                        accessibilityLabel="Send message"
                    >
                        {chatSending ? (
                            <ActivityIndicator size="small" color={colors.obsidian[900]} />
                        ) : (
                            <Ionicons
                                name="send"
                                size={18}
                                color={
                                    chatInput.trim()
                                        ? colors.obsidian[900]
                                        : colors.text.muted
                                }
                            />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        );
    }

    // ── Tab Content Renderers ──────────────────────

    const renderFeedTab = () => (
        <View>
            {/* Post Type Filter Pills */}
            <Animated.ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.postFilterScroll}
                style={styles.postFilterContainer}
            >
                {POST_TYPE_FILTERS.map((filter) => {
                    const isActive = activePostFilter === filter.key;
                    return (
                        <TouchableOpacity
                            key={filter.key}
                            style={[
                                styles.postFilterPill,
                                isActive && styles.postFilterPillActive,
                            ]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setActivePostFilter(filter.key);
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={filter.icon}
                                size={14}
                                color={isActive ? colors.gold[500] : colors.text.muted}
                            />
                            <Text
                                style={[
                                    styles.postFilterText,
                                    isActive && styles.postFilterTextActive,
                                ]}
                            >
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </Animated.ScrollView>

            {feedError ? (
                <ErrorTabState message={feedError} onRetry={loadCommunity} />
            ) : filteredPosts.length === 0 ? (
                <EmptyTabState
                    icon="document-text-outline"
                    title={
                        activePostFilter === 'all'
                            ? 'No posts yet'
                            : `No ${activePostFilter} posts`
                    }
                    subtitle="Be the first to post something!"
                    actionLabel={community.role ? 'Create Post' : undefined}
                    onAction={
                        community.role
                            ? () => router.push('/(tabs)/create' as any)
                            : undefined
                    }
                />
            ) : (
                filteredPosts.map((post) => (
                    <PostCard
                        key={post.id}
                        post={post}
                        onPress={() => router.push(`/post/${post.id}`)}
                        onReport={() => handleReportPost(post.id)}
                        showReportOption={!!community.role}
                    />
                ))
            )}
        </View>
    );

    const renderAboutTab = () => (
        <Animated.View entering={FadeIn.duration(300)} style={styles.aboutContainer}>
            <View style={styles.aboutSection}>
                <Text style={styles.aboutSectionTitle}>Description</Text>
                <Text style={styles.aboutText}>
                    {community.description || 'No description provided.'}
                </Text>
            </View>

            {community.tagline && (
                <View style={styles.aboutSection}>
                    <Text style={styles.aboutSectionTitle}>Tagline</Text>
                    <Text style={styles.aboutText}>{community.tagline}</Text>
                </View>
            )}

            {community.welcomeMessage && (
                <View style={styles.aboutSection}>
                    <Text style={styles.aboutSectionTitle}>Welcome Message</Text>
                    <Text style={styles.aboutText}>{community.welcomeMessage}</Text>
                </View>
            )}

            <View style={styles.aboutSection}>
                <Text style={styles.aboutSectionTitle}>Details</Text>
                <View style={styles.aboutDetailRow}>
                    <Ionicons name="calendar-outline" size={16} color={colors.text.muted} />
                    <Text style={styles.aboutDetailText}>
                        Created {new Date(community.createdAt).toLocaleDateString(undefined, {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                    </Text>
                </View>
                <View style={styles.aboutDetailRow}>
                    <Ionicons
                        name={community.isPublic ? 'globe-outline' : 'lock-closed-outline'}
                        size={16}
                        color={colors.text.muted}
                    />
                    <Text style={styles.aboutDetailText}>
                        {community.isPublic ? 'Public community' : 'Private community'}
                    </Text>
                </View>
                {community.websiteUrl && (
                    <TouchableOpacity
                        style={styles.aboutDetailRow}
                        onPress={() => Linking.openURL(community.websiteUrl!)}
                    >
                        <Ionicons name="link-outline" size={16} color={colors.gold[500]} />
                        <Text style={[styles.aboutDetailText, { color: colors.gold[500] }]}>
                            {community.websiteUrl.replace(/^https?:\/\//, '')}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );

    // ── Join Requests (Admin) ──────────────────────────
    const [joinRequests, setJoinRequests] = useState<any[]>([]);
    const [requestsLoading, setRequestsLoading] = useState(false);

    const loadJoinRequests = useCallback(async () => {
        if (!communityId || !canModerate) return;
        setRequestsLoading(true);
        try {
            const data = await apiFetch<any[]>(`/api/v1/communities/${communityId}/requests`);
            setJoinRequests(Array.isArray(data) ? data : []);
        } catch { /* ignore */ }
        setRequestsLoading(false);
    }, [communityId, canModerate]);

    const handleApproveRequest = useCallback(async (requestId: string) => {
        try {
            await apiFetch(`/api/v1/communities/${communityId}/requests/${requestId}/approve`, { method: 'POST' });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
            loadAllMembers(); // Refresh members list
        } catch {
            Alert.alert('Approval Failed', 'Failed to approve request.');
        }
    }, [communityId, loadAllMembers]);

    const handleRejectRequest = useCallback(async (requestId: string) => {
        try {
            await apiFetch(`/api/v1/communities/${communityId}/requests/${requestId}/reject`, { method: 'POST' });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
        } catch {
            Alert.alert('Rejection Failed', 'Failed to reject request.');
        }
    }, [communityId]);

    const renderMembersTab = () => {
        if (membersLoading) return <TabLoadingState />;
        if (membersError)
            return <ErrorTabState message={membersError} onRetry={loadAllMembers} />;
        if (allMembers.length === 0 && joinRequests.length === 0)
            return (
                <EmptyTabState
                    icon="people-outline"
                    title="No members yet"
                    subtitle="Be the first to join!"
                />
            );

        return (
            <View>
                {/* Pending Join Requests — Admin only */}
                {canModerate && joinRequests.length > 0 && (
                    <View style={{ marginBottom: spacing.lg }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.xs }}>
                            <Ionicons name="hourglass-outline" size={16} color={colors.amber[500]} />
                            <Text style={{ fontSize: typography.fontSize.sm, fontWeight: '700', color: colors.amber[400] }}>
                                Pending Requests ({joinRequests.length})
                            </Text>
                        </View>
                        {joinRequests.map((req: any) => (
                            <Animated.View
                                key={req.id}
                                entering={FadeInDown.duration(250)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: colors.surface.glass,
                                    borderRadius: 12,
                                    padding: spacing.sm,
                                    marginBottom: spacing.xs,
                                    borderWidth: 1,
                                    borderColor: colors.amber[500] + '30',
                                }}
                            >
                                <View style={{
                                    width: 40, height: 40, borderRadius: 20,
                                    backgroundColor: colors.obsidian[600],
                                    alignItems: 'center', justifyContent: 'center',
                                    marginRight: spacing.sm,
                                    overflow: 'hidden',
                                }}>
                                    {req.user?.avatarUrl ? (
                                        <Image source={{ uri: req.user.avatarUrl }} style={{ width: 40, height: 40 }} contentFit="cover" />
                                    ) : (
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.secondary }}>
                                            {(req.user?.displayName || '?').charAt(0).toUpperCase()}
                                        </Text>
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.text.primary }}>
                                        {req.user?.displayName || req.user?.username || 'Unknown'}
                                    </Text>
                                    {req.message && (
                                        <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: 2 }} numberOfLines={1}>
                                            {req.message}
                                        </Text>
                                    )}
                                </View>
                                <TouchableOpacity
                                    onPress={() => handleApproveRequest(req.id)}
                                    style={{
                                        backgroundColor: colors.emerald[500] + '20',
                                        paddingHorizontal: 12, paddingVertical: 6,
                                        borderRadius: 8, marginRight: 6,
                                    }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.emerald[400] }}>Approve</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleRejectRequest(req.id)}
                                    style={{
                                        backgroundColor: colors.coral[500] + '15',
                                        paddingHorizontal: 10, paddingVertical: 6,
                                        borderRadius: 8,
                                    }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.coral[400] }}>Deny</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </View>
                )}

                <Text style={styles.memberCount}>
                    {formatCount(community.membersCount)} member{community.membersCount !== 1 ? 's' : ''}
                </Text>
                {allMembers.map((member, index) => (
                    <Animated.View key={member.id} entering={FadeInDown.delay(index * 50).duration(250)}>
                        <MemberCard
                            member={member}
                            isAdmin={canModerate}
                            onPress={() => {
                                if (member.username) {
                                    router.push(`/profile/${member.username}` as any);
                                }
                            }}
                            onManage={
                                canModerate && member.id !== currentUser?.id
                                    ? () => handleManageMember(member)
                                    : undefined
                            }
                        />
                    </Animated.View>
                ))}
            </View>
        );
    };

    const renderRulesTab = () => {
        if (rulesLoading) return <TabLoadingState />;
        if (rulesError)
            return <ErrorTabState message={rulesError} onRetry={loadRules} />;
        if (rules.length === 0)
            return (
                <EmptyTabState
                    icon="book-outline"
                    title="No rules set"
                    subtitle={
                        canModerate
                            ? 'Add community rules to set expectations.'
                            : 'This community has not set any rules yet.'
                    }
                    actionLabel={canModerate ? 'Add Rules' : undefined}
                    onAction={
                        canModerate
                            ? () => router.push(`/community/${communityId}/rules` as any)
                            : undefined
                    }
                />
            );

        return (
            <View>
                {rules.map((rule, index) => (
                    <Animated.View
                        key={rule.id}
                        entering={FadeInDown.delay(index * 60).duration(250)}
                        style={styles.ruleCard}
                    >
                        <View style={styles.ruleNumber}>
                            <Text style={styles.ruleNumberText}>{index + 1}</Text>
                        </View>
                        <View style={styles.ruleContent}>
                            <Text style={styles.ruleTitle}>{rule.title}</Text>
                            {rule.description && (
                                <Text style={styles.ruleDescription}>{rule.description}</Text>
                            )}
                        </View>
                    </Animated.View>
                ))}
            </View>
        );
    };

    // ── Main Render ──────────────────────────────

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            {/* Collapsed header background (appears on scroll) */}
            <Animated.View style={[styles.collapsedHeaderBg, headerOpacityStyle]}>
                <LinearGradient
                    colors={[colors.obsidian[900], colors.obsidian[800]]}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>

            <ScreenHeader
                title={community.name}
                noBorder
                rightElement={
                    <View style={styles.headerActions}>
                        {community.role && (
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    loadChat();
                                    setShowChat(true);
                                }}
                                accessibilityLabel="Community chat"
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons
                                    name="chatbubbles-outline"
                                    size={22}
                                    color={colors.text.primary}
                                />
                            </TouchableOpacity>
                        )}
                        {canModerate && (
                            <TouchableOpacity
                                onPress={() => setShowModPanel(!showModPanel)}
                                accessibilityLabel="Moderation tools"
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons
                                    name="shield-outline"
                                    size={22}
                                    color={colors.gold[500]}
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />

            <Animated.ScrollView
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={() => {
                            setIsRefreshing(true);
                            loadCommunity();
                        }}
                        tintColor={colors.gold[500]}
                    />
                }
            >
                {/* ── Parallax Cover ────────────────── */}
                <Animated.View style={[styles.coverContainer, coverAnimStyle]}>
                    {community.coverUrl ? (
                        <Image
                            source={{ uri: community.coverUrl }}
                            placeholder={IMAGE_PLACEHOLDER.blurhash}
                            transition={IMAGE_PLACEHOLDER.transition}
                            cachePolicy="memory-disk"
                            style={styles.coverImage}
                            contentFit="cover"
                        />
                    ) : (
                        <LinearGradient
                            colors={[
                                community.brandColor || colors.gold[700],
                                colors.obsidian[800],
                            ]}
                            style={styles.coverImage}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                    )}
                    <Animated.View style={[styles.coverGradient, coverOverlayStyle]}>
                        <LinearGradient
                            colors={['transparent', colors.obsidian[900]]}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>
                </Animated.View>

                <Animated.View entering={FadeInDown.duration(400)}>
                    {/* ── Demo Banner ────────────────── */}
                    {isDemo && (
                        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
                            <View style={styles.demoBanner}>
                                <LinearGradient
                                    colors={[
                                        community.brandColor || colors.gold[500],
                                        (community.brandColor || colors.gold[500]) + '80',
                                    ]}
                                    style={StyleSheet.absoluteFill}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                />
                                <View style={styles.demoBannerContent}>
                                    <Ionicons name="sparkles" size={20} color={colors.text.primary} />
                                    <View style={styles.demoBannerText}>
                                        <Text style={styles.demoBannerTitle}>
                                            This is your demo group
                                        </Text>
                                        <Text style={styles.demoBannerSubtitle}>
                                            Take ownership of this space — free of charge. Your
                                            branding, your rules, your community.
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.demoBannerActions}>
                                    <TouchableOpacity
                                        style={styles.claimBtn}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            if (community.websiteUrl) {
                                                Linking.openURL(community.websiteUrl);
                                            } else {
                                                Alert.alert(
                                                    'Claim This Group',
                                                    "Contact us to take full ownership of this branded community space. It's free!",
                                                    [
                                                        { text: 'Maybe Later', style: 'cancel' },
                                                        {
                                                            text: 'Contact Us',
                                                            onPress: () =>
                                                                Linking.openURL(
                                                                    'https://0gravity.ai/contact',
                                                                ),
                                                        },
                                                    ],
                                                );
                                            }
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Claim this group"
                                    >
                                        <Text style={styles.claimBtnText}>Claim This Group</Text>
                                        <Ionicons
                                            name="arrow-forward"
                                            size={14}
                                            color={colors.obsidian[900]}
                                        />
                                    </TouchableOpacity>
                                    {community.websiteUrl && (
                                        <TouchableOpacity
                                            style={styles.visitWebsiteBtn}
                                            onPress={() => Linking.openURL(community.websiteUrl!)}
                                            accessibilityRole="link"
                                        >
                                            <Ionicons
                                                name="globe-outline"
                                                size={14}
                                                color={colors.text.primary}
                                            />
                                            <Text style={styles.visitWebsiteText}>
                                                Visit Website
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </Animated.View>
                    )}

                    <View style={styles.content}>
                        {/* ── Community Info ────────────────── */}
                        <View style={styles.communityInfo}>
                            {community.avatarUrl ? (
                                <View style={styles.avatarRing}>
                                    <Image
                                        source={{ uri: community.avatarUrl }}
                                        placeholder={AVATAR_PLACEHOLDER.blurhash}
                                        transition={AVATAR_PLACEHOLDER.transition}
                                        cachePolicy="memory-disk"
                                        style={styles.avatar}
                                    />
                                </View>
                            ) : (
                                <View style={[styles.avatarRing, styles.avatarFallback]}>
                                    <Text style={styles.avatarFallbackText}>
                                        {community.name.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <Text style={styles.communityName}>{community.name}</Text>
                            {community.tagline && (
                                <Text style={styles.communityTagline}>{community.tagline}</Text>
                            )}
                            <Text style={styles.communityDescription}>
                                {community.description}
                            </Text>
                        </View>

                        {/* ── Member Avatars Row ────────────────── */}
                        {memberPreviews.length > 0 && (
                            <TouchableOpacity
                                style={styles.membersPreviewRow}
                                onPress={() => handleTabChange('members')}
                                activeOpacity={0.85}
                            >
                                <View style={styles.membersAvatarStack}>
                                    {memberPreviews.map((member, i) => (
                                        <View
                                            key={member.id}
                                            style={[
                                                styles.membersAvatarWrap,
                                                {
                                                    marginStart: i === 0 ? 0 : -10,
                                                    zIndex: 5 - i,
                                                },
                                            ]}
                                        >
                                            <Avatar
                                                uri={member.avatarUrl}
                                                name={member.displayName}
                                                customSize={30}
                                                borderColor={colors.obsidian[800]}
                                                borderWidth={2}
                                            />
                                        </View>
                                    ))}
                                </View>
                                <Text style={styles.membersPreviewText}>
                                    {formatCount(community.membersCount)} member
                                    {community.membersCount !== 1 ? 's' : ''}
                                </Text>
                                <Ionicons
                                    name="chevron-forward"
                                    size={16}
                                    color={colors.text.muted}
                                />
                            </TouchableOpacity>
                        )}

                        {/* ── Stats Row ────────────────── */}
                        <View style={styles.statsContainer}>
                            <View style={styles.stat}>
                                <Ionicons name="people" size={18} color={colors.gold[500]} />
                                <Text style={styles.statValue}>
                                    {formatCount(community.membersCount)}
                                </Text>
                                <Text style={styles.statLabel}>Members</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.stat}>
                                <Ionicons
                                    name="document-text"
                                    size={18}
                                    color={colors.gold[500]}
                                />
                                <Text style={styles.statValue}>
                                    {formatCount(community.postsCount)}
                                </Text>
                                <Text style={styles.statLabel}>Posts</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.stat}>
                                <Ionicons
                                    name="pulse"
                                    size={18}
                                    color={colors.emerald[500]}
                                />
                                <Text style={styles.statValue}>
                                    {formatCount(community.activeNow ?? Math.min(community.membersCount, Math.floor(community.membersCount * 0.1) + 1))}
                                </Text>
                                <Text style={styles.statLabel}>Active Now</Text>
                            </View>
                        </View>

                        {/* ── Join / Leave Button ────────────────── */}
                        <Animated.View style={joinButtonAnimStyle}>
                            <TouchableOpacity
                                style={[
                                    styles.joinButton,
                                    community.role && styles.leaveButton,
                                ]}
                                onPress={handleJoinLeave}
                                disabled={isJoinLoading}
                                activeOpacity={0.8}
                                accessibilityLabel={
                                    community.role
                                        ? 'Leave community'
                                        : 'Join community'
                                }
                                accessibilityRole="button"
                            >
                                {isJoinLoading ? (
                                    <View style={styles.joinLoadingWrap}>
                                        <ActivityIndicator
                                            size="small"
                                            color={
                                                community.role
                                                    ? colors.text.secondary
                                                    : colors.obsidian[900]
                                            }
                                        />
                                    </View>
                                ) : community.role ? (
                                    <View style={styles.leaveInner}>
                                        <Ionicons
                                            name={
                                                community.role === 'admin'
                                                    ? 'shield'
                                                    : community.role === 'moderator'
                                                        ? 'shield-half'
                                                        : 'log-out-outline'
                                            }
                                            size={16}
                                            color={colors.text.secondary}
                                        />
                                        <Text style={styles.leaveButtonText}>
                                            {community.role === 'admin'
                                                ? 'Admin'
                                                : community.role === 'moderator'
                                                    ? 'Moderator'
                                                    : 'Leave'}
                                        </Text>
                                    </View>
                                ) : (
                                    <LinearGradient
                                        colors={[colors.gold[400], colors.gold[600]]}
                                        style={styles.joinGradient}
                                    >
                                        <Ionicons
                                            name="add-circle-outline"
                                            size={18}
                                            color={colors.obsidian[900]}
                                        />
                                        <Text style={styles.joinButtonText}>
                                            Join Community
                                        </Text>
                                    </LinearGradient>
                                )}
                            </TouchableOpacity>
                        </Animated.View>

                        {/* ── Share / Invite Row ────────────────── */}
                        {community.role && (
                            <Animated.View entering={FadeInUp.duration(300).delay(100)}>
                                <View style={styles.shareRow}>
                                    <TouchableOpacity
                                        style={styles.shareBtn}
                                        onPress={() => {
                                            Haptics.impactAsync(
                                                Haptics.ImpactFeedbackStyle.Light,
                                            );
                                            setShowInviteSheet(true);
                                        }}
                                        activeOpacity={0.8}
                                        accessibilityRole="button"
                                        accessibilityLabel="Invite people to this group"
                                    >
                                        <Ionicons
                                            name="person-add-outline"
                                            size={16}
                                            color={colors.gold[500]}
                                        />
                                        <Text style={styles.shareBtnText}>Invite</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.shareBtn}
                                        onPress={async () => {
                                            Haptics.impactAsync(
                                                Haptics.ImpactFeedbackStyle.Light,
                                            );
                                            const link = `https://0gravity.ai/group/${communityId}`;
                                            try {
                                                await Share.share({
                                                    message: `Join ${community.name} on 0G!\n\n${community.description}\n\n${link}`,
                                                    url: link,
                                                });
                                            } catch {
                                                /* user cancelled share sheet */
                                            }
                                        }}
                                        activeOpacity={0.8}
                                        accessibilityRole="button"
                                        accessibilityLabel="Share group link"
                                    >
                                        <Ionicons
                                            name="share-outline"
                                            size={16}
                                            color={colors.gold[500]}
                                        />
                                        <Text style={styles.shareBtnText}>Share</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.shareBtn}
                                        onPress={() => {
                                            Haptics.impactAsync(
                                                Haptics.ImpactFeedbackStyle.Light,
                                            );
                                            loadChat();
                                            setShowChat(true);
                                        }}
                                        activeOpacity={0.8}
                                        accessibilityRole="button"
                                        accessibilityLabel="Open community chat"
                                    >
                                        <Ionicons
                                            name="chatbubbles-outline"
                                            size={16}
                                            color={colors.gold[500]}
                                        />
                                        <Text style={styles.shareBtnText}>Chat</Text>
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>
                        )}

                        {/* ── Role Badge ────────────────── */}
                        {community.role && (
                            <View style={styles.roleBadge}>
                                <Ionicons
                                    name="shield-checkmark"
                                    size={12}
                                    color={colors.gold[500]}
                                />
                                <Text style={styles.roleBadgeText}>
                                    You are a {community.role}
                                </Text>
                            </View>
                        )}

                        {/* ── Moderation Panel ────────────────── */}
                        {canModerate && showModPanel && (
                            <Animated.View
                                entering={FadeInDown.duration(300)}
                                style={styles.modPanel}
                            >
                                <View style={styles.modPanelHeader}>
                                    <Ionicons
                                        name="shield"
                                        size={18}
                                        color={colors.gold[500]}
                                    />
                                    <Text style={styles.modPanelTitle}>
                                        Moderation Tools
                                    </Text>
                                </View>
                                <View style={styles.modActions}>
                                    <TouchableOpacity
                                        style={styles.modActionBtn}
                                        onPress={() =>
                                            router.push(
                                                `/community/${communityId}/manage` as any,
                                            )
                                        }
                                    >
                                        <Ionicons
                                            name="settings-outline"
                                            size={18}
                                            color={colors.gold[400]}
                                        />
                                        <Text style={styles.modActionText}>Settings</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.modActionBtn}
                                        onPress={() => handleTabChange('members')}
                                    >
                                        <Ionicons
                                            name="people-outline"
                                            size={18}
                                            color={colors.gold[400]}
                                        />
                                        <Text style={styles.modActionText}>Members</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.modActionBtn}
                                        onPress={() =>
                                            router.push(
                                                `/community/${communityId}/governance` as any,
                                            )
                                        }
                                    >
                                        <Ionicons
                                            name="people-circle-outline"
                                            size={18}
                                            color={colors.gold[400]}
                                        />
                                        <Text style={styles.modActionText}>Governance</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.modActionBtn}
                                        onPress={() =>
                                            router.push(
                                                `/community/${communityId}/polls` as any,
                                            )
                                        }
                                    >
                                        <Ionicons
                                            name="bar-chart-outline"
                                            size={18}
                                            color={colors.gold[400]}
                                        />
                                        <Text style={styles.modActionText}>Polls</Text>
                                    </TouchableOpacity>
                                </View>
                                {isAdmin && (
                                    <View style={styles.modDangerZone}>
                                        <Text style={styles.modDangerTitle}>
                                            Admin Actions
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.modDangerBtn}
                                            onPress={() => {
                                                Alert.alert(
                                                    'Community Analytics',
                                                    'View detailed analytics for this community.',
                                                    [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        {
                                                            text: 'View',
                                                            onPress: () =>
                                                                router.push(
                                                                    `/community/${communityId}/manage` as any,
                                                                ),
                                                        },
                                                    ],
                                                );
                                            }}
                                        >
                                            <Ionicons
                                                name="analytics-outline"
                                                size={16}
                                                color={colors.amber[500]}
                                            />
                                            <Text style={styles.modDangerBtnText}>
                                                View Analytics
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </Animated.View>
                        )}

                        {/* ── Quick Action Row (non-moderator) ────── */}
                        {community.role && !showModPanel && (
                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={() =>
                                        router.push(
                                            `/community/${communityId}/polls` as any,
                                        )
                                    }
                                    accessibilityLabel="Polls"
                                    accessibilityRole="button"
                                >
                                    <Ionicons
                                        name="bar-chart-outline"
                                        size={18}
                                        color={colors.gold[400]}
                                    />
                                    <Text style={styles.actionBtnText}>Polls</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={() => handleTabChange('about')}
                                    accessibilityLabel="About"
                                    accessibilityRole="button"
                                >
                                    <Ionicons
                                        name="information-circle-outline"
                                        size={18}
                                        color={colors.gold[400]}
                                    />
                                    <Text style={styles.actionBtnText}>About</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={() =>
                                        router.push(
                                            `/community/${communityId}/governance` as any,
                                        )
                                    }
                                    accessibilityLabel="Governance"
                                    accessibilityRole="button"
                                >
                                    <Ionicons
                                        name="people-circle-outline"
                                        size={18}
                                        color={colors.gold[400]}
                                    />
                                    <Text style={styles.actionBtnText}>Governance</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* ── Content Tabs ────────────────── */}
                        <View style={styles.tabBar}>
                            <Animated.View
                                style={[styles.tabIndicator, tabIndicatorStyle]}
                            />
                            {TABS.map((tab) => {
                                const isActive = activeTab === tab.key;
                                return (
                                    <TouchableOpacity
                                        key={tab.key}
                                        style={styles.tabItem}
                                        onPress={() => handleTabChange(tab.key)}
                                        activeOpacity={0.7}
                                        accessibilityRole="tab"
                                        accessibilityState={{ selected: isActive }}
                                    >
                                        <Ionicons
                                            name={tab.icon as any}
                                            size={16}
                                            color={
                                                isActive
                                                    ? colors.gold[500]
                                                    : colors.text.muted
                                            }
                                        />
                                        <Text
                                            style={[
                                                styles.tabLabel,
                                                isActive && styles.tabLabelActive,
                                            ]}
                                        >
                                            {tab.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* ── Tab Content ────────────────── */}
                        <View style={styles.tabContent}>
                            {activeTab === 'feed' && renderFeedTab()}
                            {activeTab === 'classroom' && (
                                <View style={{ flex: 1, minHeight: 400 }}>
                                    <TouchableOpacity
                                        style={styles.tabNavButton}
                                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/community/${communityId}/classroom` as any); }}
                                        activeOpacity={0.7}
                                    >
                                        <LinearGradient colors={[colors.surface.glass, colors.surface.glassHover]} style={styles.tabNavCard}>
                                            <View style={styles.tabNavIconWrap}>
                                                <Ionicons name="school" size={32} color={colors.gold[500]} />
                                            </View>
                                            <Text style={styles.tabNavTitle}>Courses & Learning</Text>
                                            <Text style={styles.tabNavDesc}>Access courses, track your progress, and level up your knowledge</Text>
                                            <View style={styles.tabNavArrow}>
                                                <Ionicons name="arrow-forward" size={20} color={colors.gold[500]} />
                                            </View>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.tabNavButton}
                                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/community/${communityId}/leaderboard` as any); }}
                                        activeOpacity={0.7}
                                    >
                                        <LinearGradient colors={[colors.surface.glass, colors.surface.glassHover]} style={styles.tabNavCard}>
                                            <View style={styles.tabNavIconWrap}>
                                                <Ionicons name="trophy" size={32} color={colors.gold[500]} />
                                            </View>
                                            <Text style={styles.tabNavTitle}>Leaderboard</Text>
                                            <Text style={styles.tabNavDesc}>See top contributors and your ranking in this community</Text>
                                            <View style={styles.tabNavArrow}>
                                                <Ionicons name="arrow-forward" size={20} color={colors.gold[500]} />
                                            </View>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            )}
                            {activeTab === 'calendar' && (
                                <View style={{ flex: 1, minHeight: 400 }}>
                                    <TouchableOpacity
                                        style={styles.tabNavButton}
                                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/community/${communityId}/calendar` as any); }}
                                        activeOpacity={0.7}
                                    >
                                        <LinearGradient colors={[colors.surface.glass, colors.surface.glassHover]} style={styles.tabNavCard}>
                                            <View style={styles.tabNavIconWrap}>
                                                <Ionicons name="calendar" size={32} color={colors.gold[500]} />
                                            </View>
                                            <Text style={styles.tabNavTitle}>Community Events</Text>
                                            <Text style={styles.tabNavDesc}>View upcoming events, RSVP, and never miss a gathering</Text>
                                            <View style={styles.tabNavArrow}>
                                                <Ionicons name="arrow-forward" size={20} color={colors.gold[500]} />
                                            </View>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            )}
                            {activeTab === 'members' && renderMembersTab()}
                            {activeTab === 'about' && renderAboutTab()}
                        </View>
                    </View>
                </Animated.View>
            </Animated.ScrollView>

            {/* ── Invite Sheet ────────────────── */}
            <CommunityInviteSheet
                communityId={communityId || ''}
                communityName={community.name}
                memberCount={community.membersCount}
                description={community.description}
                visible={showInviteSheet}
                onClose={() => setShowInviteSheet(false)}
            />
        </View>
    );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.obsidian[900] },
    centered: { alignItems: 'center', justifyContent: 'center' },
    errorText: {
        fontSize: typography.fontSize.lg,
        color: colors.text.muted,
        marginTop: spacing.md,
        marginBottom: spacing.md,
    },
    backLink: { paddingVertical: spacing.sm },
    backLinkText: { fontSize: typography.fontSize.base, color: colors.gold[500] },

    // ── Collapsed Header ──────────────────
    collapsedHeaderBg: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 100,
        zIndex: 5,
    },

    // ── Header Actions ──────────────────
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },

    // ── Parallax Cover ──────────────────
    coverContainer: { height: COVER_HEIGHT, position: 'relative', overflow: 'hidden' },
    coverImage: { width: '100%', height: '100%' },
    coverGradient: { ...StyleSheet.absoluteFillObject },

    // ── Content ──────────────────
    content: { paddingHorizontal: spacing.xl },
    communityInfo: { alignItems: 'center', paddingTop: spacing.xl },
    avatarRing: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: colors.gold[500],
        marginTop: -40,
        marginBottom: spacing.md,
        overflow: 'hidden',
        backgroundColor: colors.obsidian[800],
    },
    avatar: { width: '100%', height: '100%' },
    avatarFallback: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface.goldMedium,
    },
    avatarFallbackText: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.gold[500],
        fontFamily: 'Inter-Bold',
    },
    communityName: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text.primary,
        letterSpacing: -0.5,
        textAlign: 'center',
        fontFamily: 'Inter-Bold',
    },
    communityTagline: {
        fontSize: typography.fontSize.sm,
        color: colors.gold[400],
        textAlign: 'center',
        marginTop: spacing.xs,
        fontStyle: 'italic',
    },
    communityDescription: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        marginTop: spacing.sm,
        lineHeight: 22,
    },

    // ── Stats ──────────────────
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        paddingVertical: spacing.lg,
        marginVertical: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    stat: { flex: 1, alignItems: 'center', gap: 4 },
    statValue: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
        color: colors.text.primary,
    },
    statLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
    },
    statDivider: { width: 1, height: 40, backgroundColor: colors.border.subtle },

    // ── Join / Leave Button ──────────────────
    joinButton: { borderRadius: 12, overflow: 'hidden', marginBottom: spacing.lg },
    joinGradient: {
        paddingVertical: spacing.md,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    joinButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.obsidian[900],
    },
    joinLoadingWrap: {
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    leaveButton: {
        borderWidth: 1,
        borderColor: colors.border.strong,
        alignItems: 'center',
    },
    leaveInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
    },
    leaveButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.secondary,
    },

    // ── Share Row ──────────────────
    shareRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    shareBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: colors.surface.goldSubtle,
        paddingVertical: spacing.sm,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    shareBtnText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.gold[500],
    },

    // ── Role Badge ──────────────────
    roleBadge: {
        alignSelf: 'center',
        backgroundColor: colors.surface.goldMedium,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 8,
        marginBottom: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    roleBadgeText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.gold[500],
    },

    // ── Action Row ──────────────────
    actionRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.lg,
        flexWrap: 'wrap',
    },
    actionBtn: {
        flex: 1,
        minWidth: 70,
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.surface.glass,
        borderRadius: 12,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    actionBtnText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        fontWeight: '500',
    },

    // ── Members Preview ──────────────────
    membersPreviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    membersAvatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    membersAvatarWrap: {
        borderRadius: 15,
    },
    membersPreviewText: {
        flex: 1,
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.secondary,
    },

    // ── Content Tabs ──────────────────
    tabBar: {
        flexDirection: 'row',
        marginBottom: spacing.lg,
        borderRadius: 12,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
        position: 'relative',
    },
    tabIndicator: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        backgroundColor: colors.surface.goldSubtle,
        borderRadius: 12,
    },
    tabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: spacing.md,
    },
    tabLabel: {
        fontSize: typography.fontSize.xs,
        fontWeight: '500',
        color: colors.text.muted,
    },
    tabLabelActive: {
        color: colors.gold[500],
        fontWeight: '700',
    },
    tabContent: {
        minHeight: 200,
    },

    // ── Post Filter Pills ──────────────────
    postFilterContainer: {
        marginBottom: spacing.md,
    },
    postFilterScroll: {
        gap: spacing.xs,
    },
    postFilterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    postFilterPillActive: {
        backgroundColor: colors.surface.goldSubtle,
        borderColor: colors.gold[500] + '40',
    },
    postFilterText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        fontWeight: '500',
    },
    postFilterTextActive: {
        color: colors.gold[500],
        fontWeight: '600',
    },

    // ── Post Card ──────────────────
    postCard: {
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        marginBottom: spacing.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    postHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    postAuthorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    postAuthor: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.text.primary,
    },
    postTime: { fontSize: typography.fontSize.xs, color: colors.text.muted },
    postContent: {
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        lineHeight: 22,
        marginBottom: spacing.sm,
    },
    postMedia: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginBottom: spacing.sm,
        backgroundColor: colors.obsidian[700],
    },
    postStats: { flexDirection: 'row', gap: spacing.lg },
    postStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    postStat: { fontSize: typography.fontSize.sm, color: colors.text.muted },

    // ── About Tab ──────────────────
    aboutContainer: { gap: spacing.lg },
    aboutSection: {
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    aboutSectionTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.gold[500],
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.sm,
    },
    aboutText: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        lineHeight: 22,
    },
    aboutDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    aboutDetailText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
    },

    // ── Members Tab ──────────────────
    memberCount: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        fontWeight: '600',
        marginBottom: spacing.md,
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    memberInfo: { flex: 1 },
    memberName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
    },
    memberUsername: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
    },
    memberRoleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    memberRoleText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.gold[500],
        textTransform: 'capitalize',
    },

    // ── Rules Tab ──────────────────
    ruleCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        backgroundColor: colors.surface.glass,
        borderRadius: 14,
        padding: spacing.lg,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    ruleNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.surface.goldMedium,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ruleNumberText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.gold[500],
    },
    ruleContent: { flex: 1 },
    ruleTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.text.primary,
        marginBottom: 4,
    },
    ruleDescription: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        lineHeight: 20,
    },

    // ── Empty / Error / Loading Tab States ──────────────────
    emptyTab: {
        alignItems: 'center',
        paddingVertical: spacing['3xl'],
        gap: spacing.sm,
    },
    emptyTabTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
    },
    emptyTabSubtitle: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        textAlign: 'center',
        maxWidth: 260,
    },
    emptyTabAction: {
        marginTop: spacing.md,
        backgroundColor: colors.surface.goldSubtle,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm,
        borderRadius: 20,
    },
    emptyTabActionText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        color: colors.gold[500],
    },
    tabLoadingContainer: {
        alignItems: 'center',
        paddingVertical: spacing['3xl'],
        gap: spacing.sm,
    },
    tabLoadingText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
    },

    // ── Chat ──────────────────
    chatListContent: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        flexGrow: 1,
        justifyContent: 'flex-end',
    },
    chatBubbleWrap: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: spacing.sm,
        marginBottom: spacing.sm,
        maxWidth: '80%',
    },
    chatBubbleWrapMine: {
        alignSelf: 'flex-end',
        flexDirection: 'row-reverse',
    },
    chatBubble: {
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        borderTopLeftRadius: 4,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    chatBubbleMine: {
        backgroundColor: colors.surface.goldSubtle,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 4,
        borderColor: colors.gold[500] + '30',
    },
    chatSenderName: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        color: colors.gold[500],
        marginBottom: 4,
    },
    chatText: {
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        lineHeight: 20,
    },
    chatTextMine: {
        color: colors.text.primary,
    },
    chatTime: {
        fontSize: 10,
        color: colors.text.muted,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    chatTimeMine: {
        color: colors.text.muted,
    },
    chatInputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border.subtle,
        backgroundColor: colors.obsidian[900],
    },
    chatInputField: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        backgroundColor: colors.surface.glass,
        borderRadius: 20,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    chatSendBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.gold[500],
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatSendBtnDisabled: {
        backgroundColor: colors.surface.glass,
    },

    // ── Typing Indicator ──────────────────
    typingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs,
    },
    typingDots: {
        flexDirection: 'row',
        gap: 3,
    },
    typingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.text.muted,
    },
    typingText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        fontStyle: 'italic',
    },

    // ── Moderation Panel ──────────────────
    modPanel: {
        backgroundColor: colors.surface.glass,
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
    },
    modPanelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    modPanelTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
    },
    modActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    modActionBtn: {
        flex: 1,
        minWidth: 70,
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.surface.goldSubtle,
        borderRadius: 12,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
    },
    modActionText: {
        fontSize: typography.fontSize.xs,
        color: colors.gold[400],
        fontWeight: '500',
    },
    modDangerZone: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border.subtle,
    },
    modDangerTitle: {
        fontSize: typography.fontSize.xs,
        fontWeight: '700',
        color: colors.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.sm,
    },
    modDangerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
    },
    modDangerBtnText: {
        fontSize: typography.fontSize.sm,
        color: colors.amber[500],
        fontWeight: '600',
    },

    // ── Demo Banner ──────────────────
    demoBanner: {
        marginHorizontal: spacing.md,
        marginBottom: spacing.lg,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.gold[500] + '30',
    },
    demoBannerContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: spacing.lg,
        gap: spacing.sm,
    },
    demoBannerText: {
        flex: 1,
    },
    demoBannerTitle: {
        fontSize: typography.fontSize.base,
        fontWeight: '700',
        color: colors.text.primary,
        fontFamily: 'Inter-Bold',
        marginBottom: 4,
    },
    demoBannerSubtitle: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        lineHeight: 20,
    },
    demoBannerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
    },
    claimBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.gold[500],
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: 20,
    },
    claimBtnText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '700',
        color: colors.obsidian[900],
        fontFamily: 'Inter-Bold',
    },
    visitWebsiteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        backgroundColor: colors.surface.glassActive,
    },
    visitWebsiteText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.primary,
        fontFamily: 'Inter-Medium',
    },

    // ─── Tab Navigation Cards ─────────────────
    tabNavButton: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    tabNavCard: {
        borderRadius: 16,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        alignItems: 'center',
    },
    tabNavIconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    tabNavTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        color: colors.text.primary,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    tabNavDesc: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: spacing.md,
    },
    tabNavArrow: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surface.goldSubtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
