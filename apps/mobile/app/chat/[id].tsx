import { useState, useRef, useEffect, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Animated,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, Avatar } from '@caravan/ui';

// Mock conversation data
const MOCK_MESSAGES = [
    {
        id: 'm1',
        senderId: 'other',
        text: 'Hey! I loved your latest post 😍',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        isRead: true,
    },
    {
        id: 'm2',
        senderId: 'me',
        text: 'Thank you so much! That means a lot 🙏',
        timestamp: new Date(Date.now() - 3500000).toISOString(),
        isRead: true,
    },
    {
        id: 'm3',
        senderId: 'other',
        text: 'Would love to collaborate sometime. Are you open to that?',
        timestamp: new Date(Date.now() - 3400000).toISOString(),
        isRead: true,
    },
    {
        id: 'm4',
        senderId: 'me',
        text: 'Absolutely! Let me know what you have in mind',
        timestamp: new Date(Date.now() - 3300000).toISOString(),
        isRead: true,
    },
    {
        id: 'm5',
        senderId: 'other',
        text: "I'm thinking of a travel series together. Hit some amazing spots and create content!",
        timestamp: new Date(Date.now() - 3200000).toISOString(),
        isRead: true,
    },
];

const OTHER_USER = {
    id: 'other',
    username: 'adventure_sarah',
    displayName: 'Sarah Chen',
    avatarUrl: 'https://i.pravatar.cc/150?img=1',
    isOnline: true,
};

// Message bubble component
const MessageBubble = memo(({ message, isOwn }: { message: typeof MOCK_MESSAGES[0]; isOwn: boolean }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(isOwn ? 20 : -20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 100,
                friction: 10,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <Animated.View
            style={[
                styles.messageBubbleContainer,
                isOwn ? styles.ownMessage : styles.otherMessage,
                {
                    opacity: fadeAnim,
                    transform: [{ translateX: slideAnim }],
                },
            ]}
        >
            {isOwn ? (
                <LinearGradient
                    colors={[colors.gold[500], colors.gold[600]]}
                    style={styles.messageBubble}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={[styles.messageText, styles.ownMessageText]}>{message.text}</Text>
                    <Text style={[styles.messageTime, styles.ownMessageTime]}>
                        {formatTime(message.timestamp)}
                    </Text>
                </LinearGradient>
            ) : (
                <View style={[styles.messageBubble, styles.otherBubble]}>
                    <Text style={styles.messageText}>{message.text}</Text>
                    <Text style={styles.messageTime}>{formatTime(message.timestamp)}</Text>
                </View>
            )}
        </Animated.View>
    );
});

// Typing indicator component
const TypingIndicator = memo(() => {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animate = (dot: Animated.Value, delay: number) => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(dot, {
                        toValue: 1,
                        duration: 300,
                        delay,
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        };

        animate(dot1, 0);
        animate(dot2, 150);
        animate(dot3, 300);
    }, []);

    return (
        <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
                {[dot1, dot2, dot3].map((dot, i) => (
                    <Animated.View
                        key={i}
                        style={[
                            styles.typingDot,
                            {
                                opacity: dot.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.3, 1],
                                }),
                                transform: [
                                    {
                                        scale: dot.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.8, 1.2],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    />
                ))}
            </View>
        </View>
    );
});

export default function ChatScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [messages, setMessages] = useState(MOCK_MESSAGES);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    const handleSend = () => {
        if (!inputText.trim()) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const newMessage = {
            id: `m${Date.now()}`,
            senderId: 'me',
            text: inputText.trim(),
            timestamp: new Date().toISOString(),
            isRead: false,
        };

        setMessages((prev) => [...prev, newMessage]);
        setInputText('');

        // Simulate typing response
        setTimeout(() => setIsTyping(true), 500);
        setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [
                ...prev,
                {
                    id: `m${Date.now() + 1}`,
                    senderId: 'other',
                    text: 'Sounds great! 🎉',
                    timestamp: new Date().toISOString(),
                    isRead: true,
                },
            ]);
        }, 2000);

        // Scroll to bottom
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
        >
            <LinearGradient
                colors={[colors.obsidian[900], colors.obsidian[800]]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.back();
                    }}
                >
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.userInfo} activeOpacity={0.8}>
                    <View style={styles.avatarWrapper}>
                        <Avatar source={OTHER_USER.avatarUrl} name={OTHER_USER.displayName} size="md" />
                        {OTHER_USER.isOnline && <View style={styles.onlineIndicator} />}
                    </View>
                    <View style={styles.userDetails}>
                        <Text style={styles.displayName}>{OTHER_USER.displayName}</Text>
                        <Text style={styles.onlineStatus}>
                            {OTHER_USER.isOnline ? 'Online' : 'Offline'}
                        </Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerButton}>
                        <Text style={styles.headerIcon}>📞</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerButton}>
                        <Text style={styles.headerIcon}>📹</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Messages */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={[
                    styles.messagesContent,
                    { paddingBottom: spacing.xl },
                ]}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
            >
                {messages.map((message) => (
                    <MessageBubble
                        key={message.id}
                        message={message}
                        isOwn={message.senderId === 'me'}
                    />
                ))}
                {isTyping && <TypingIndicator />}
            </ScrollView>

            {/* Input */}
            <View style={[styles.inputContainer, { paddingBottom: insets.bottom + spacing.md }]}>
                <View style={styles.inputWrapper}>
                    <TouchableOpacity style={styles.attachButton}>
                        <Text style={styles.attachIcon}>+</Text>
                    </TouchableOpacity>

                    <TextInput
                        style={styles.textInput}
                        placeholder="Message..."
                        placeholderTextColor={colors.text.muted}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={1000}
                    />

                    <TouchableOpacity style={styles.emojiButton}>
                        <Text style={styles.emojiIcon}>😊</Text>
                    </TouchableOpacity>

                    {inputText.trim() ? (
                        <TouchableOpacity onPress={handleSend} activeOpacity={0.8}>
                            <LinearGradient
                                colors={[colors.gold[400], colors.gold[600]]}
                                style={styles.sendButton}
                            >
                                <Text style={styles.sendIcon}>↑</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.micButton}>
                            <Text style={styles.micIcon}>🎙️</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.obsidian[900],
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    backIcon: {
        fontSize: 20,
        color: colors.text.primary,
    },
    userInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarWrapper: {
        position: 'relative',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.emerald[500],
        borderWidth: 2,
        borderColor: colors.obsidian[900],
    },
    userDetails: {
        marginLeft: spacing.md,
    },
    displayName: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
    },
    onlineStatus: {
        fontSize: typography.fontSize.sm,
        color: colors.emerald[500],
        fontFamily: typography.fontFamily.sans,
    },
    headerActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerIcon: {
        fontSize: 18,
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
    },
    messageBubbleContainer: {
        marginBottom: spacing.md,
        maxWidth: '80%',
    },
    ownMessage: {
        alignSelf: 'flex-end',
    },
    otherMessage: {
        alignSelf: 'flex-start',
    },
    messageBubble: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: 20,
    },
    otherBubble: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
        lineHeight: 22,
    },
    ownMessageText: {
        color: colors.obsidian[900],
    },
    messageTime: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        fontFamily: typography.fontFamily.sans,
        marginTop: spacing.xs,
        alignSelf: 'flex-end',
    },
    ownMessageTime: {
        color: 'rgba(10, 10, 11, 0.6)',
    },
    typingContainer: {
        alignSelf: 'flex-start',
    },
    typingBubble: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: 20,
        gap: 4,
    },
    typingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.text.muted,
    },
    inputContainer: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.06)',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 24,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    attachButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    attachIcon: {
        fontSize: 22,
        color: colors.text.primary,
    },
    textInput: {
        flex: 1,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        maxHeight: 100,
    },
    emojiButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emojiIcon: {
        fontSize: 22,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendIcon: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.obsidian[900],
    },
    micButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    micIcon: {
        fontSize: 20,
    },
});
