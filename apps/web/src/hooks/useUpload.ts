'use client';

import { useState, useCallback, useRef } from 'react';
import { API_ENDPOINTS, apiUpload } from '../lib/api';

// ============================================
// TYPES
// ============================================
export interface UploadResult {
    url: string;
    key?: string;
    type?: 'IMAGE' | 'VIDEO';
    size?: number;
}

export interface UseUploadReturn {
    // State
    uploading: boolean;
    progress: number;
    error: string | null;

    // Actions
    uploadAvatar: (file: File) => Promise<UploadResult | null>;
    uploadCover: (file: File) => Promise<UploadResult | null>;
    uploadPostMedia: (file: File) => Promise<UploadResult | null>;
    uploadMomentMedia: (file: File) => Promise<UploadResult | null>;
    uploadMessageAttachment: (file: File) => Promise<UploadResult | null>;
    cancelUpload: () => void;
    resetError: () => void;
}

// ============================================
// VALIDATION HELPERS
// ============================================
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

const VALID_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const VALID_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

function validateFile(file: File, allowVideo = false): string | null {
    const isImage = VALID_IMAGE_TYPES.includes(file.type);
    const isVideo = VALID_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
        return 'Invalid file type. Use JPG, PNG, GIF, or WebP.';
    }

    if (isVideo && !allowVideo) {
        return 'Videos are not allowed for this upload type.';
    }

    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
        return `File too large. Max ${isVideo ? '100' : '10'} MB.`;
    }

    return null;
}

// ============================================
// HOOK
// ============================================
export function useUpload(): UseUploadReturn {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const resetError = useCallback(() => setError(null), []);

    const cancelUpload = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setUploading(false);
        setProgress(0);
    }, []);

    const upload = useCallback(async (
        url: string,
        file: File,
        allowVideo = false
    ): Promise<UploadResult | null> => {
        // Validate file
        const validationError = validateFile(file, allowVideo);
        if (validationError) {
            setError(validationError);
            return null;
        }

        setUploading(true);
        setProgress(0);
        setError(null);

        try {
            const result = await apiUpload(url, file, setProgress);
            setProgress(100);
            return result as UploadResult;
        } catch (err) {
            let message = err instanceof Error ? err.message : 'Upload failed';
            // Provide better guidance for auth errors
            if (message.includes('Authentication') || message.includes('401')) {
                message = 'Please log in to upload files. Go to Login to continue.';
            }
            setError(message);
            return null;
        } finally {
            setUploading(false);
        }
    }, []);

    const uploadAvatar = useCallback(async (file: File) => {
        return upload(API_ENDPOINTS.upload.avatar, file, false);
    }, [upload]);

    const uploadCover = useCallback(async (file: File) => {
        return upload(API_ENDPOINTS.upload.cover, file, false);
    }, [upload]);

    const uploadPostMedia = useCallback(async (file: File) => {
        return upload(API_ENDPOINTS.upload.post, file, true);
    }, [upload]);

    const uploadMomentMedia = useCallback(async (file: File) => {
        return upload(API_ENDPOINTS.upload.moment, file, true);
    }, [upload]);

    const uploadMessageAttachment = useCallback(async (file: File) => {
        return upload(API_ENDPOINTS.upload.message, file, true);
    }, [upload]);

    return {
        uploading,
        progress,
        error,
        uploadAvatar,
        uploadCover,
        uploadPostMedia,
        uploadMomentMedia,
        uploadMessageAttachment,
        cancelUpload,
        resetError,
    };
}

export default useUpload;
