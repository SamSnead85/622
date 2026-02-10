import { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { colors, typography, spacing } from '@zerog/ui';
import { apiFetch, API } from '../../lib/api';
import { useAuthStore } from '../../stores';
import { showError } from '../../stores/toastStore';
import { Avatar } from '../../components';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MOMENT_DURATION = 5000; // 5 seconds per moment

interface Moment {
    id: string;
    mediaUrl: string;
    mediaType: 'IMAGE' | 'VIDEO';
    caption?: string;
    viewCount: number;
    createdAt: string;
    user: { id: string; displayName: string; avatarUrl?: string };
}

function ProgressBar({ segments, activeIndex, progress }: { segments: number; activeIndex: number; progress: number }) {
    return (
        <View style={styles.progressContainer}>
            {Array.from({ length: segments }).map((_, i) => (
                <View key={i} style={styles.progressSegment}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                width: i < activeIndex ? '100%' : i === activeIndex ? `${progress * 100}%` : '0%',
                            },
                        ]}
                    />
                </View>
            ))}
        </View>
    );
}

export default function MomentViewerScreen() {
    const router = useRouter();
    const { id: userId } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const currentUser = useAuthStore((s) => s.user);

    const [moments, setMoments] = useState<Moment[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [paused, setPaused] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        loadMoments();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [userId]);

    const loadMoments = async () => {
        if (!userId) return;
        try {
            const data = await apiFetch<any>(`${API.momentsFeed}?userId=${userId}`);
            const list = data.moments || data || [];
            setMoments(Array.isArray(list) ? list : []);
        } catch {
            showError("Couldn't load moment");
            router.back();
        }
    };

    const markViewed = useCallback((momentId: string) => {
        apiFetch(API.momentView(momentId), { method: 'POST' }).catch(() => {});
    }, []);

    useEffect(() => {
        if (moments.length === 0) return;

        const moment = moments[activeIndex];
        if (moment) markViewed(moment.id);

        setProgress(0);
        if (timerRef.current) clearInterval(timerRef.current);

        const start = Date.now();
        timerRef.current = setInterval(() => {
            if (paused) return;
            const elapsed = Date.now() - start;
            const pct = Math.min(1, elapsed / MOMENT_DURATION);
            setProgress(pct);

            if (pct >= 1) {
                goNext();
            }
        }, 50);

        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [activeIndex, moments, paused]);

    const goNext = () => {
        if (activeIndex < moments.length - 1) {
            setActiveIndex((i) => i + 1);
        } else {
            router.back();
        }
    };

    const goPrev = () => {
        if (activeIndex > 0) {
            setActiveIndex((i) => i - 1);
        }
    };

    const currentMoment = moments[activeIndex];

    if (!currentMoment) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />
            </View>
        );
    }

    const isOwn = currentMoment.user.id === currentUser?.id;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Media */}
            <Image source={{ uri: currentMoment.mediaUrl }} style={styles.media} resizeMode="cover" />

            {/* Gradient overlays */}
            <LinearGradient
                colors={[colors.obsidian[900] + 'AA', 'transparent']}
                style={styles.topGradient}
            />
            <LinearGradient
                colors={['transparent', colors.obsidian[900] + 'CC']}
                style={styles.bottomGradient}
            />

            {/* Progress bars */}
            <View style={[styles.topControls, { paddingTop: insets.top + spacing.sm }]}>
                <ProgressBar segments={moments.length} activeIndex={activeIndex} progress={progress} />

                {/* User info */}
                <View style={styles.userInfo}>
                    <Avatar uri={currentMoment.user.avatarUrl} name={currentMoment.user.displayName} customSize={32} />
                    <Text style={styles.userName}>{currentMoment.user.displayName}</Text>
                    <Text style={styles.timeAgo}>{getTimeAgo(currentMoment.createdAt)}</Text>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tap areas */}
            <View style={styles.tapAreas}>
                <TouchableOpacity
                    style={styles.tapLeft}
                    onPress={goPrev}
                    onLongPress={() => setPaused(true)}
                    onPressOut={() => setPaused(false)}
                    activeOpacity={1}
                />
                <TouchableOpacity
                    style={styles.tapRight}
                    onPress={goNext}
                    onLongPress={() => setPaused(true)}
                    onPressOut={() => setPaused(false)}
                    activeOpacity={1}
                />
            </View>

            {/* Bottom info */}
            <View style={[styles.bottomControls, { paddingBottom: insets.bottom + spacing.md }]}>
                {currentMoment.caption && (
                    <Text style={styles.caption}>{currentMoment.caption}</Text>
                )}
                {isOwn && (
                    <View style={styles.viewCount}>
                        <Ionicons name="eye-outline" size={16} color="#fff" />
                        <Text style={styles.viewCountText}>{currentMoment.viewCount || 0}</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

function getTimeAgo(dateStr: string): string {
    const ms = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(ms / 3600000);
    if (hours < 1) return `${Math.floor(ms / 60000)}m`;
    return `${hours}h`;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    media: { ...StyleSheet.absoluteFillObject },
    topGradient: {
        position: 'absolute', top: 0, left: 0, right: 0, height: 180,
    },
    bottomGradient: {
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 200,
    },
    topControls: {
        position: 'absolute', top: 0, left: 0, right: 0,
        zIndex: 10, paddingHorizontal: spacing.md,
    },
    progressContainer: {
        flexDirection: 'row', gap: 3,
    },
    progressSegment: {
        flex: 1, height: 2.5, backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
    },
    progressFill: {
        height: '100%', backgroundColor: '#fff', borderRadius: 2,
    },
    userInfo: {
        flexDirection: 'row', alignItems: 'center',
        marginTop: spacing.md, gap: spacing.sm,
    },
    userAvatar: {
        width: 32, height: 32, borderRadius: 16,
    },
    userName: {
        fontSize: typography.fontSize.base, fontWeight: '700', color: '#fff',
    },
    timeAgo: {
        fontSize: typography.fontSize.sm, color: 'rgba(255,255,255,0.6)',
    },
    closeBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center', justifyContent: 'center',
    },
    tapAreas: { flex: 1, flexDirection: 'row' },
    tapLeft: { flex: 1 },
    tapRight: { flex: 2 },
    bottomControls: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: spacing.lg, zIndex: 10,
    },
    caption: {
        fontSize: typography.fontSize.base, color: '#fff',
        fontWeight: '500', lineHeight: 22, marginBottom: spacing.sm,
        textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    viewCount: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        alignSelf: 'flex-start',
    },
    viewCountText: {
        fontSize: typography.fontSize.sm, color: '#fff', fontWeight: '600',
    },
});
