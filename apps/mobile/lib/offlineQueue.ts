// ============================================
// Offline Action Queue
// Queues user actions (posts, messages, likes)
// when offline and auto-syncs on reconnect
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiFetch, apiUpload, API } from './api';

// ============================================
// Types
// ============================================

export type QueuedActionType =
    | 'send_message'
    | 'create_post'
    | 'like_post'
    | 'unlike_post'
    | 'follow_user'
    | 'unfollow_user'
    | 'save_post'
    | 'unsave_post'
    | 'poll_vote'
    | 'proposal_vote'
    | 'create_moment';

export interface QueuedAction {
    id: string;
    type: QueuedActionType;
    payload: Record<string, any>;
    createdAt: string;
    retries: number;
    maxRetries: number;
}

// ============================================
// Constants
// ============================================

const QUEUE_KEY = '@0g_offline_queue';
const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000];

// ============================================
// Queue Management
// ============================================

let isSyncing = false;
let syncListeners: ((queue: QueuedAction[]) => void)[] = [];

/**
 * Get the current offline queue
 */
export async function getQueue(): Promise<QueuedAction[]> {
    try {
        const raw = await AsyncStorage.getItem(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * Save the queue to storage
 */
async function saveQueue(queue: QueuedAction[]): Promise<void> {
    try {
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        syncListeners.forEach((cb) => cb(queue));
    } catch {
        // Storage error — non-critical
    }
}

/**
 * Add an action to the offline queue
 */
export async function enqueue(type: QueuedActionType, payload: Record<string, any>): Promise<string> {
    const action: QueuedAction = {
        id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type,
        payload,
        createdAt: new Date().toISOString(),
        retries: 0,
        maxRetries: MAX_RETRIES,
    };

    const queue = await getQueue();
    queue.push(action);
    await saveQueue(queue);

    return action.id;
}

/**
 * Remove a successfully processed action
 */
async function dequeue(actionId: string): Promise<void> {
    const queue = await getQueue();
    const filtered = queue.filter((a) => a.id !== actionId);
    await saveQueue(filtered);
}

/**
 * Mark an action as failed and increment retry count
 */
async function markFailed(actionId: string): Promise<void> {
    const queue = await getQueue();
    const updated = queue.map((a) => {
        if (a.id === actionId) {
            return { ...a, retries: a.retries + 1 };
        }
        return a;
    });

    // Remove actions that exceeded max retries
    const filtered = updated.filter((a) => a.retries < a.maxRetries);
    await saveQueue(filtered);
}

// ============================================
// Action Processors
// ============================================

async function processAction(action: QueuedAction): Promise<boolean> {
    try {
        switch (action.type) {
            case 'send_message': {
                const { conversationId, content, mediaUrl, mediaType } = action.payload;
                await apiFetch(API.messages(conversationId), {
                    method: 'POST',
                    body: JSON.stringify({ content, mediaUrl, mediaType }),
                });
                return true;
            }

            case 'create_post': {
                const { content, mediaUri, mimeType, fileName, ...rest } = action.payload;
                let mediaUrl: string | undefined;

                if (mediaUri) {
                    const uploadResult = await apiUpload(
                        API.uploadPost,
                        mediaUri,
                        mimeType || 'image/jpeg',
                        fileName || 'upload.jpg'
                    );
                    mediaUrl = uploadResult.url;
                }

                await apiFetch(API.posts, {
                    method: 'POST',
                    body: JSON.stringify({
                        ...rest,
                        caption: content,
                        mediaUrl,
                    }),
                });
                return true;
            }

            case 'like_post':
                await apiFetch(API.like(action.payload.postId), { method: 'POST' });
                return true;

            case 'unlike_post':
                await apiFetch(API.like(action.payload.postId), { method: 'DELETE' });
                return true;

            case 'save_post':
                await apiFetch(API.save(action.payload.postId), { method: 'POST' });
                return true;

            case 'unsave_post':
                await apiFetch(API.save(action.payload.postId), { method: 'DELETE' });
                return true;

            case 'follow_user':
                await apiFetch(API.follow(action.payload.userId), { method: 'POST' });
                return true;

            case 'unfollow_user':
                await apiFetch(API.follow(action.payload.userId), { method: 'DELETE' });
                return true;

            case 'poll_vote': {
                const { communityId, pollId, optionId } = action.payload;
                await apiFetch(API.communityPollVote(communityId, pollId), {
                    method: 'POST',
                    body: JSON.stringify({ optionId }),
                });
                return true;
            }

            case 'proposal_vote': {
                const { proposalId: propId, vote: propVote } = action.payload;
                await apiFetch(API.proposalVote(propId), {
                    method: 'POST',
                    body: JSON.stringify({ vote: propVote }),
                });
                return true;
            }

            case 'create_moment': {
                const { mediaUri: momentUri, mimeType: momentMime, fileName: momentFile, caption: momentCaption, mediaType: momentType } = action.payload;
                let momentMediaUrl: string | undefined;

                if (momentUri) {
                    const uploadResult = await apiUpload(
                        API.uploadMoment,
                        momentUri,
                        momentMime || 'image/jpeg',
                        momentFile || 'moment.jpg'
                    );
                    momentMediaUrl = uploadResult.url;
                }

                await apiFetch(API.moments, {
                    method: 'POST',
                    body: JSON.stringify({
                        mediaUrl: momentMediaUrl,
                        mediaType: momentType || 'IMAGE',
                        caption: momentCaption,
                    }),
                });
                return true;
            }

            default:
                if (__DEV__) console.warn('Unknown offline action type:', action.type);
                return true; // Remove from queue
        }
    } catch (error) {
        if (__DEV__) console.warn('Offline action failed:', action.type, error);
        return false;
    }
}

// ============================================
// Sync Engine
// ============================================

/**
 * Process all queued actions in order
 */
export async function syncQueue(): Promise<{ processed: number; failed: number }> {
    if (isSyncing) return { processed: 0, failed: 0 };

    // Check connectivity first
    const state = await NetInfo.fetch();
    if (!state.isConnected || !state.isInternetReachable) {
        return { processed: 0, failed: 0 };
    }

    isSyncing = true;
    let processed = 0;
    let failed = 0;

    try {
        const queue = await getQueue();

        for (const action of queue) {
            const success = await processAction(action);

            if (success) {
                await dequeue(action.id);
                processed++;
            } else {
                await markFailed(action.id);
                failed++;

                // Wait before next retry (backoff)
                const delay = RETRY_DELAYS[Math.min(action.retries, RETRY_DELAYS.length - 1)];
                await new Promise((r) => setTimeout(r, delay));
            }
        }
    } finally {
        isSyncing = false;
    }

    return { processed, failed };
}

/**
 * Get the number of pending actions
 */
export async function getPendingCount(): Promise<number> {
    const queue = await getQueue();
    return queue.length;
}

/**
 * Subscribe to queue changes
 */
export function onQueueChange(callback: (queue: QueuedAction[]) => void): () => void {
    syncListeners.push(callback);
    return () => {
        syncListeners = syncListeners.filter((cb) => cb !== callback);
    };
}

/**
 * Clear the entire queue (use with caution)
 */
export async function clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
    syncListeners.forEach((cb) => cb([]));
}

// ============================================
// Auto-Sync on Network Recovery
// ============================================

let unsubscribeNetInfo: (() => void) | null = null;

/**
 * Start listening for network recovery and auto-sync
 */
export function startAutoSync(): void {
    if (unsubscribeNetInfo) return;

    unsubscribeNetInfo = NetInfo.addEventListener(async (state) => {
        if (state.isConnected && state.isInternetReachable) {
            const pending = await getPendingCount();
            if (pending > 0) {
                // Small delay to let connection stabilize
                setTimeout(() => syncQueue(), 2000);
            }
        }
    });
}

/**
 * Stop auto-sync listener
 */
export function stopAutoSync(): void {
    unsubscribeNetInfo?.();
    unsubscribeNetInfo = null;
}
