'use client';

import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// PHASES 201-300: MESSAGING ENHANCEMENTS
// ============================================

// Phase 201-210: Real-time Message Delivery
export interface Message {
    id: string;
    senderId: string;
    recipientId: string;
    content: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location';
    status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    createdAt: string;
    replyTo?: string;
    reactions?: { emoji: string; userId: string }[];
}

export function useRealtimeMessaging(conversationId: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const wsRef = useRef<WebSocket | null>(null);

    const sendMessage = useCallback((content: string, type: Message['type'] = 'text') => {
        const tempId = `temp_${Date.now()}`;
        const message: Message = {
            id: tempId,
            senderId: 'current_user',
            recipientId: '',
            content,
            type,
            status: 'sending',
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, message]);

        // Simulate successful send
        setTimeout(() => {
            setMessages(prev => prev.map(m =>
                m.id === tempId ? { ...m, id: `msg_${Date.now()}`, status: 'sent' as const } : m
            ));
        }, 300);

        return tempId;
    }, []);

    const markAsRead = useCallback((messageId: string) => {
        setMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, status: 'read' as const } : m
        ));
    }, []);

    const deleteMessage = useCallback((messageId: string) => {
        setMessages(prev => prev.filter(m => m.id !== messageId));
    }, []);

    const editMessage = useCallback((messageId: string, newContent: string) => {
        setMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, content: newContent } : m
        ));
    }, []);

    return {
        messages, isConnected, typingUsers,
        sendMessage, markAsRead, deleteMessage, editMessage
    };
}

// Phase 211-220: Voice Messages
export function useVoiceRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const [waveform, setWaveform] = useState<number[]>([]);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const intervalRef = useRef<ReturnType<typeof setInterval>>();

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setDuration(0);

            // Track duration
            intervalRef.current = setInterval(() => {
                setDuration(d => d + 1);
            }, 1000);

        } catch (err) {
            console.error('Failed to start recording:', err);
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
    }, [isRecording]);

    const cancelRecording = useCallback(() => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setAudioUrl(null);
            setDuration(0);
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
    }, []);

    return { isRecording, audioUrl, duration, waveform, startRecording, stopRecording, cancelRecording };
}

// Phase 221-230: Message Reactions
export const MESSAGE_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥', '👏', '💯'];

export function useMessageReactions() {
    const [reactions, setReactions] = useState<Record<string, { emoji: string; users: string[] }[]>>({});

    const addReaction = useCallback((messageId: string, emoji: string, userId: string) => {
        setReactions(prev => {
            const messageReactions = prev[messageId] || [];
            const existing = messageReactions.find(r => r.emoji === emoji);
            if (existing) {
                if (!existing.users.includes(userId)) {
                    existing.users.push(userId);
                }
            } else {
                messageReactions.push({ emoji, users: [userId] });
            }
            return { ...prev, [messageId]: messageReactions };
        });
    }, []);

    const removeReaction = useCallback((messageId: string, emoji: string, userId: string) => {
        setReactions(prev => {
            const messageReactions = prev[messageId] || [];
            const existing = messageReactions.find(r => r.emoji === emoji);
            if (existing) {
                existing.users = existing.users.filter(u => u !== userId);
                if (existing.users.length === 0) {
                    return { ...prev, [messageId]: messageReactions.filter(r => r.emoji !== emoji) };
                }
            }
            return { ...prev, [messageId]: messageReactions };
        });
    }, []);

    return { reactions, addReaction, removeReaction };
}

// Phase 231-240: Read Receipts & Typing Indicators
export function useTypingIndicator(conversationId: string) {
    const [isTyping, setIsTyping] = useState(false);
    const [otherTyping, setOtherTyping] = useState<string[]>([]);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

    const startTyping = useCallback(() => {
        if (!isTyping) {
            setIsTyping(true);
            // Emit typing start event
        }

        // Reset timeout
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setIsTyping(false);
        }, 3000);
    }, [isTyping]);

    const stopTyping = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsTyping(false);
    }, []);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return { isTyping, otherTyping, startTyping, stopTyping };
}

// Phase 241-250: Group Messaging
export interface GroupConversation {
    id: string;
    name: string;
    avatarUrl?: string;
    members: { id: string; displayName: string; role: 'admin' | 'member' }[];
    createdAt: string;
    lastMessage?: Message;
}

export function useGroupMessaging() {
    const [groups, setGroups] = useState<GroupConversation[]>([]);

    const createGroup = useCallback((name: string, memberIds: string[]) => {
        const newGroup: GroupConversation = {
            id: `group_${Date.now()}`,
            name,
            members: memberIds.map((id, i) => ({ id, displayName: `User ${i}`, role: i === 0 ? 'admin' : 'member' })),
            createdAt: new Date().toISOString(),
        };
        setGroups(prev => [...prev, newGroup]);
        return newGroup.id;
    }, []);

    const addMember = useCallback((groupId: string, userId: string, displayName: string) => {
        setGroups(prev => prev.map(g =>
            g.id === groupId
                ? { ...g, members: [...g.members, { id: userId, displayName, role: 'member' as const }] }
                : g
        ));
    }, []);

    const removeMember = useCallback((groupId: string, userId: string) => {
        setGroups(prev => prev.map(g =>
            g.id === groupId
                ? { ...g, members: g.members.filter(m => m.id !== userId) }
                : g
        ));
    }, []);

    const promoteToAdmin = useCallback((groupId: string, userId: string) => {
        setGroups(prev => prev.map(g =>
            g.id === groupId
                ? { ...g, members: g.members.map(m => m.id === userId ? { ...m, role: 'admin' as const } : m) }
                : g
        ));
    }, []);

    return { groups, createGroup, addMember, removeMember, promoteToAdmin };
}

// Phase 251-260: Message Search
export function useMessageSearch(conversationId: string) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Message[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [filters, setFilters] = useState<{ type?: Message['type']; dateRange?: { start: Date; end: Date } }>({});

    const search = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }
        setIsSearching(true);
        // Simulate search
        await new Promise(r => setTimeout(r, 300));
        setResults([]);
        setIsSearching(false);
    }, []);

    return { query, setQuery, results, isSearching, search, filters, setFilters };
}

// Phase 261-270: Media Sharing in Messages
export function useMediaSharing() {
    const [uploads, setUploads] = useState<{ id: string; file: File; progress: number; status: 'uploading' | 'done' | 'failed' }[]>([]);

    const uploadMedia = useCallback(async (file: File) => {
        const id = `upload_${Date.now()}`;
        setUploads(prev => [...prev, { id, file, progress: 0, status: 'uploading' }]);

        // Simulate upload progress
        for (let i = 0; i <= 100; i += 10) {
            await new Promise(r => setTimeout(r, 100));
            setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: i } : u));
        }

        setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'done' as const } : u));
        return { id, url: URL.createObjectURL(file) };
    }, []);

    const cancelUpload = useCallback((uploadId: string) => {
        setUploads(prev => prev.filter(u => u.id !== uploadId));
    }, []);

    return { uploads, uploadMedia, cancelUpload };
}

// Phase 271-280: Encryption Indicators
export function useEncryptionStatus() {
    const [isE2EEnabled, setIsE2EEnabled] = useState(true);
    const [keyExchangeComplete, setKeyExchangeComplete] = useState(true);
    const [lastVerified, setLastVerified] = useState<Date | null>(null);

    const verifyEncryption = useCallback(async () => {
        // Simulate verification
        await new Promise(r => setTimeout(r, 500));
        setLastVerified(new Date());
        return true;
    }, []);

    return { isE2EEnabled, keyExchangeComplete, lastVerified, verifyEncryption, setIsE2EEnabled };
}

// Phase 281-290: Message Pinning & Archiving
export function usePinnedMessages(conversationId: string) {
    const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
    const [archivedConversations, setArchivedConversations] = useState<string[]>([]);

    const pinMessage = useCallback((message: Message) => {
        setPinnedMessages(prev => [...prev.filter(m => m.id !== message.id), message]);
    }, []);

    const unpinMessage = useCallback((messageId: string) => {
        setPinnedMessages(prev => prev.filter(m => m.id !== messageId));
    }, []);

    const archiveConversation = useCallback((convId: string) => {
        setArchivedConversations(prev => [...prev, convId]);
    }, []);

    const unarchiveConversation = useCallback((convId: string) => {
        setArchivedConversations(prev => prev.filter(id => id !== convId));
    }, []);

    return { pinnedMessages, archivedConversations, pinMessage, unpinMessage, archiveConversation, unarchiveConversation };
}

// Phase 291-300: Message Requests
export interface MessageRequest {
    id: string;
    from: { id: string; displayName: string; avatarUrl?: string };
    preview: string;
    createdAt: string;
    isSpam: boolean;
}

export function useMessageRequests() {
    const [requests, setRequests] = useState<MessageRequest[]>([]);
    const [spamFilter, setSpamFilter] = useState(true);

    const acceptRequest = useCallback((requestId: string) => {
        setRequests(prev => prev.filter(r => r.id !== requestId));
    }, []);

    const declineRequest = useCallback((requestId: string) => {
        setRequests(prev => prev.filter(r => r.id !== requestId));
    }, []);

    const markAsSpam = useCallback((requestId: string) => {
        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, isSpam: true } : r));
    }, []);

    const filteredRequests = spamFilter ? requests.filter(r => !r.isSpam) : requests;

    return { requests: filteredRequests, spamFilter, setSpamFilter, acceptRequest, declineRequest, markAsSpam };
}

// ============================================
// PHASES 301-400: NOTIFICATION ENHANCEMENTS
// ============================================

// Phase 301-310: Push Notification Infrastructure
export function usePushNotifications() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = useCallback(async () => {
        if ('Notification' in window) {
            const result = await Notification.requestPermission();
            setPermission(result);
            return result === 'granted';
        }
        return false;
    }, []);

    const subscribe = useCallback(async () => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            const registration = await navigator.serviceWorker.ready;
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: 'your-vapid-public-key',
            });
            setSubscription(sub);
            return sub;
        }
        return null;
    }, []);

    return { permission, subscription, requestPermission, subscribe };
}

// Phase 311-320: Notification Preferences
export interface NotificationPreferences {
    likes: boolean;
    comments: boolean;
    follows: boolean;
    mentions: boolean;
    messages: boolean;
    liveNotifications: boolean;
    emailDigest: 'none' | 'daily' | 'weekly';
    quietHoursStart?: string;
    quietHoursEnd?: string;
}

export function useNotificationPreferences() {
    const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
        if (typeof window === 'undefined') return getDefaults();
        const saved = localStorage.getItem('0g_notification_prefs');
        return saved ? JSON.parse(saved) : getDefaults();
    });

    function getDefaults(): NotificationPreferences {
        return {
            likes: true,
            comments: true,
            follows: true,
            mentions: true,
            messages: true,
            liveNotifications: true,
            emailDigest: 'daily',
        };
    }

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('0g_notification_prefs', JSON.stringify(preferences));
        }
    }, [preferences]);

    const updatePreference = useCallback(<K extends keyof NotificationPreferences>(
        key: K, value: NotificationPreferences[K]
    ) => {
        setPreferences(prev => ({ ...prev, [key]: value }));
    }, []);

    return { preferences, updatePreference, resetToDefaults: () => setPreferences(getDefaults()) };
}

// Phase 321-330: Notification Batching
export interface BatchedNotification {
    id: string;
    type: 'likes' | 'comments' | 'follows';
    count: number;
    users: { id: string; displayName: string }[];
    targetId: string;
    createdAt: string;
}

export function useNotificationBatching() {
    const [batched, setBatched] = useState<BatchedNotification[]>([]);

    const batchNotifications = useCallback((notifications: any[]) => {
        const grouped = notifications.reduce((acc, n) => {
            const key = `${n.type}_${n.targetId}`;
            if (!acc[key]) {
                acc[key] = { ...n, count: 0, users: [] };
            }
            acc[key].count++;
            acc[key].users.push(n.user);
            return acc;
        }, {} as Record<string, BatchedNotification>);

        setBatched(Object.values(grouped));
    }, []);

    return { batched, batchNotifications };
}

// Phase 331-340: Notification Center
export interface Notification {
    id: string;
    type: 'like' | 'comment' | 'follow' | 'mention' | 'message' | 'system';
    title: string;
    body: string;
    read: boolean;
    createdAt: string;
    actionUrl?: string;
    imageUrl?: string;
}

export function useNotificationCenter() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    useEffect(() => {
        setUnreadCount(notifications.filter(n => !n.read).length);
    }, [notifications]);

    const markAsRead = useCallback((notificationId: string) => {
        setNotifications(prev => prev.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
        ));
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    const deleteNotification = useCallback((notificationId: string) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;

    return { notifications: filtered, unreadCount, filter, setFilter, markAsRead, markAllAsRead, deleteNotification, clearAll };
}

// Phase 341-350: Email Notifications
export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    enabled: boolean;
}

export function useEmailNotifications() {
    const [templates, setTemplates] = useState<EmailTemplate[]>([
        { id: 'welcome', name: 'Welcome Email', subject: 'Welcome to 0G!', enabled: true },
        { id: 'weekly_digest', name: 'Weekly Digest', subject: 'Your Weekly Summary', enabled: true },
        { id: 'new_follower', name: 'New Follower', subject: 'You have a new follower!', enabled: true },
        { id: 'security_alert', name: 'Security Alert', subject: 'Security Alert', enabled: true },
    ]);

    const toggleTemplate = useCallback((templateId: string) => {
        setTemplates(prev => prev.map(t =>
            t.id === templateId ? { ...t, enabled: !t.enabled } : t
        ));
    }, []);

    return { templates, toggleTemplate };
}

// Phase 351-360: Notification Sounds
export function useNotificationSounds() {
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [volume, setVolume] = useState(0.5);
    const [selectedSound, setSelectedSound] = useState('default');

    const sounds = ['default', 'chime', 'pop', 'ding', 'swoosh', 'none'];

    const playSound = useCallback((soundName: string = selectedSound) => {
        if (!soundEnabled || soundName === 'none') return;

        const audio = new Audio(`/sounds/${soundName}.mp3`);
        audio.volume = volume;
        audio.play().catch(() => { });
    }, [soundEnabled, volume, selectedSound]);

    return { soundEnabled, setSoundEnabled, volume, setVolume, selectedSound, setSelectedSound, sounds, playSound };
}

// Phase 361-370: @Mention Notifications
export function useMentionNotifications() {
    const [mentions, setMentions] = useState<Notification[]>([]);
    const [mentionSettings, setMentionSettings] = useState({
        notifyEveryOne: false,
        notifyFollowersOnly: true,
        highlightMentions: true,
    });

    const getMentions = useCallback((content: string): string[] => {
        const matches = content.match(/@(\w+)/g) || [];
        return matches.map(m => m.slice(1));
    }, []);

    return { mentions, mentionSettings, setMentionSettings, getMentions };
}

// Phase 371-380: Smart Notifications
export function useSmartNotifications() {
    const [activityScore, setActivityScore] = useState(50);
    const [priorityThreshold, setPriorityThreshold] = useState(30);

    const calculatePriority = useCallback((notification: Notification): number => {
        let score = 50;
        if (notification.type === 'message') score += 30;
        if (notification.type === 'mention') score += 25;
        if (notification.type === 'follow') score += 15;
        return Math.min(100, score);
    }, []);

    const shouldNotify = useCallback((notification: Notification): boolean => {
        return calculatePriority(notification) >= priorityThreshold;
    }, [calculatePriority, priorityThreshold]);

    return { activityScore, priorityThreshold, setPriorityThreshold, calculatePriority, shouldNotify };
}

// Phase 381-390: Notification History
export function useNotificationHistory() {
    const [history, setHistory] = useState<Notification[]>([]);
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('0g_notification_history');
            if (saved) setHistory(JSON.parse(saved));
        }
    }, []);

    const addToHistory = useCallback((notification: Notification) => {
        setHistory(prev => {
            const updated = [notification, ...prev].slice(0, 500);
            if (typeof window !== 'undefined') {
                localStorage.setItem('0g_notification_history', JSON.stringify(updated));
            }
            return updated;
        });
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('0g_notification_history');
        }
    }, []);

    return { history, dateFilter, setDateFilter, addToHistory, clearHistory };
}

// Phase 391-400: Do Not Disturb
export function useDoNotDisturb() {
    const [dndEnabled, setDndEnabled] = useState(false);
    const [schedule, setSchedule] = useState<{ start: string; end: string; days: number[] } | null>(null);
    const [allowExceptions, setAllowExceptions] = useState<string[]>([]);

    const isDNDActive = useCallback(() => {
        if (!dndEnabled && !schedule) return false;
        if (dndEnabled) return true;

        if (schedule) {
            const now = new Date();
            const currentDay = now.getDay();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

            if (!schedule.days.includes(currentDay)) return false;
            return currentTime >= schedule.start && currentTime <= schedule.end;
        }

        return false;
    }, [dndEnabled, schedule]);

    return { dndEnabled, setDndEnabled, schedule, setSchedule, allowExceptions, setAllowExceptions, isDNDActive };
}
