// ============================================
// FeedVideoPlayer — Video player for feed posts
// ============================================
//
// Auto-plays when active, pauses when scrolled away.
// First video in feed plays unmuted, others muted.
// Shows poster thumbnail while buffering.

import React, { useState, useEffect, memo } from 'react';
import {
    View,
    Pressable,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors } from '@zerog/ui';
import { IMAGE_PLACEHOLDER } from '../../lib/imagePlaceholder';
import { clampAspectRatio } from '../../lib/utils';

// ── Props ───────────────────────────────────────────

export interface FeedVideoPlayerProps {
    uri: string;
    thumbnailUrl?: string;
    isActive: boolean;
    isFirstVideo: boolean;
    shouldReduceData?: boolean;
    mediaAspectRatio?: string;
}

// ── Component ───────────────────────────────────────

function FeedVideoPlayerInner({
    uri,
    thumbnailUrl,
    isActive,
    isFirstVideo,
    shouldReduceData,
    mediaAspectRatio,
}: FeedVideoPlayerProps) {
    const videoAspect = 1 / clampAspectRatio(mediaAspectRatio);
    const [isMuted, setIsMuted] = useState(!isFirstVideo);
    const [showFirstFrame, setShowFirstFrame] = useState(false);

    const player = useVideoPlayer(uri, (p) => {
        p.loop = true;
        p.muted = !isFirstVideo;
    });

    // Detect when the first frame is ready
    useEffect(() => {
        const sub = player.addListener('statusChange', ({ status }: { status: string }) => {
            if (status === 'readyToPlay') {
                setShowFirstFrame(true);
            }
        });
        return () => { sub.remove(); };
    }, [player]);

    // Play/pause based on visibility
    useEffect(() => {
        if (shouldReduceData) {
            player.pause();
            return;
        }
        if (isActive) {
            player.play();
        } else {
            player.pause();
            player.muted = true;
            setIsMuted(true);
        }
    }, [isActive, player, shouldReduceData]);

    // Unmute first video
    useEffect(() => {
        if (isActive && isFirstVideo && !shouldReduceData) {
            player.muted = false;
            setIsMuted(false);
        }
    }, [isActive, isFirstVideo, player, shouldReduceData]);

    const toggleMute = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newMuted = !player.muted;
        player.muted = newMuted;
        setIsMuted(newMuted);
    };

    return (
        <Pressable
            onPress={toggleMute}
            style={[styles.container, { aspectRatio: videoAspect }]}
            accessibilityRole="button"
            accessibilityLabel={isMuted ? 'Video muted, tap to unmute' : 'Video playing, tap to mute'}
        >
            <VideoView
                player={player}
                style={styles.video}
                nativeControls={false}
                contentFit="cover"
            />
            {/* Poster thumbnail while buffering */}
            {!showFirstFrame && thumbnailUrl && (
                <View style={styles.posterOverlay}>
                    <Image
                        source={{ uri: thumbnailUrl }}
                        style={styles.poster}
                        contentFit="cover"
                        placeholder={IMAGE_PLACEHOLDER.blurhash}
                        transition={100}
                        cachePolicy="memory-disk"
                    />
                </View>
            )}
            {/* Buffering indicator (no poster) */}
            {!showFirstFrame && !thumbnailUrl && (
                <View style={styles.buffering}>
                    <View style={styles.bufferingInner}>
                        <ActivityIndicator size="small" color={colors.gold[500]} />
                    </View>
                </View>
            )}
            <View style={styles.muteIndicator}>
                <Ionicons
                    name={isMuted ? 'volume-mute' : 'volume-high'}
                    size={14}
                    color={colors.text.primary}
                />
            </View>
        </Pressable>
    );
}

// ── Styles ──────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        width: '100%',
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    posterOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    poster: {
        width: '100%',
        height: '100%',
    },
    buffering: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        zIndex: 1,
    },
    bufferingInner: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    muteIndicator: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
});

export const FeedVideoPlayer = memo(FeedVideoPlayerInner);
export default FeedVideoPlayer;
