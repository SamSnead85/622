/**
 * MUX LIVE STREAMING SERVICE
 * Wrapper around the Mux SDK for creating, managing, and monitoring live streams.
 */

import Mux from '@mux/mux-node';
import { logger } from '../utils/logger.js';

// ============================================
// CLIENT INITIALIZATION
// ============================================

let muxClient: Mux | null = null;

function getClient(): Mux {
    if (!muxClient) {
        const tokenId = process.env.MUX_TOKEN_ID;
        const tokenSecret = process.env.MUX_TOKEN_SECRET;

        if (!tokenId || !tokenSecret) {
            throw new Error('MUX_TOKEN_ID and MUX_TOKEN_SECRET must be set in environment variables');
        }

        muxClient = new Mux({
            tokenId,
            tokenSecret,
        });

        logger.info('Mux client initialized');
    }

    return muxClient;
}

// ============================================
// LIVE STREAM MANAGEMENT
// ============================================

export interface MuxLiveStreamResult {
    muxStreamId: string;
    streamKey: string;
    muxPlaybackId: string;
    rtmpUrl: string;
    rtmpsUrl: string;
}

/**
 * Create a new Mux live stream with low-latency mode and auto-VOD recording.
 */
export async function createMuxLiveStream(options?: {
    record?: boolean;
}): Promise<MuxLiveStreamResult> {
    const client = getClient();
    const record = options?.record ?? true;

    const liveStream = await client.video.liveStreams.create({
        latency_mode: 'low',
        playback_policies: ['public'],
        new_asset_settings: record
            ? { playback_policies: ['public'] }
            : undefined,
        reconnect_window: 60,
    });

    const playbackId = liveStream.playback_ids?.[0]?.id;
    if (!playbackId) {
        throw new Error('Mux did not return a playback ID');
    }

    logger.info(`Mux live stream created: ${liveStream.id} (playback: ${playbackId})`);

    return {
        muxStreamId: liveStream.id!,
        streamKey: liveStream.stream_key!,
        muxPlaybackId: playbackId,
        rtmpUrl: 'rtmp://global-live.mux.com:5222/app',
        rtmpsUrl: 'rtmps://global-live.mux.com:443/app',
    };
}

/**
 * Signal a live stream is finished (triggers VOD asset creation).
 */
export async function endMuxLiveStream(muxStreamId: string): Promise<void> {
    const client = getClient();

    try {
        await client.video.liveStreams.complete(muxStreamId);
        logger.info(`Mux live stream signaled complete: ${muxStreamId}`);
    } catch (error) {
        logger.error(`Failed to end Mux live stream ${muxStreamId}:`, error);
        throw error;
    }
}

/**
 * Delete a Mux live stream resource entirely.
 */
export async function deleteMuxLiveStream(muxStreamId: string): Promise<void> {
    const client = getClient();

    try {
        await client.video.liveStreams.delete(muxStreamId);
        logger.info(`Mux live stream deleted: ${muxStreamId}`);
    } catch (error) {
        logger.error(`Failed to delete Mux live stream ${muxStreamId}:`, error);
    }
}

/**
 * Get the current status of a Mux live stream.
 */
export async function getMuxLiveStream(muxStreamId: string) {
    const client = getClient();
    return client.video.liveStreams.retrieve(muxStreamId);
}

/**
 * Reset the stream key for a live stream (security measure).
 */
export async function resetMuxStreamKey(muxStreamId: string): Promise<string> {
    const client = getClient();
    const result = await client.video.liveStreams.resetStreamKey(muxStreamId);
    return result.stream_key!;
}

// ============================================
// URL HELPERS
// ============================================

/**
 * Get the HLS playback URL from a Mux playback ID.
 */
export function getPlaybackUrl(playbackId: string): string {
    return `https://stream.mux.com/${playbackId}.m3u8`;
}

/**
 * Get a live thumbnail URL from a Mux playback ID.
 * The `time` param can be omitted for live thumbnails (defaults to current frame).
 */
export function getThumbnailUrl(playbackId: string, options?: {
    width?: number;
    height?: number;
    time?: number;
    fitMode?: 'preserve' | 'stretch' | 'crop' | 'smartcrop' | 'pad';
}): string {
    const params = new URLSearchParams();
    if (options?.width) params.set('width', options.width.toString());
    if (options?.height) params.set('height', options.height.toString());
    if (options?.time !== undefined) params.set('time', options.time.toString());
    if (options?.fitMode) params.set('fit_mode', options.fitMode);

    const qs = params.toString();
    return `https://image.mux.com/${playbackId}/thumbnail.webp${qs ? `?${qs}` : ''}`;
}

/**
 * Get an animated GIF preview from a Mux playback ID.
 */
export function getAnimatedThumbnailUrl(playbackId: string): string {
    return `https://image.mux.com/${playbackId}/animated.gif?width=320&fps=15`;
}

/**
 * Get the storyboard VTT URL for timeline hover previews.
 */
export function getStoryboardUrl(playbackId: string): string {
    return `https://image.mux.com/${playbackId}/storyboard.vtt`;
}

// ============================================
// WEBHOOK VERIFICATION
// ============================================

/**
 * Verify a Mux webhook signature.
 * Mux signs webhooks with a shared secret using HMAC-SHA256.
 */
export function isMuxConfigured(): boolean {
    return !!(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET);
}

export default {
    createMuxLiveStream,
    endMuxLiveStream,
    deleteMuxLiveStream,
    getMuxLiveStream,
    resetMuxStreamKey,
    getPlaybackUrl,
    getThumbnailUrl,
    getAnimatedThumbnailUrl,
    getStoryboardUrl,
    isMuxConfigured,
};
