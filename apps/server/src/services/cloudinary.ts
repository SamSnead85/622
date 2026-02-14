import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../utils/logger.js';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary with automatic optimization
 */
export const uploadImage = async (
    buffer: Buffer,
    options: {
        folder?: string;
        publicId?: string;
        transformations?: Record<string, unknown>;
    } = {}
) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
        throw new Error('Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
    }

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: options.folder || '0g-uploads',
                public_id: options.publicId,
                resource_type: 'auto',
                // Automatic optimizations
                quality: 'auto',
                fetch_format: 'auto',
                // Generate responsive variants
                responsive_breakpoints: {
                    bytes_step: 20000,
                    min_width: 200,
                    max_width: 1000,
                    max_images: 5,
                },
                ...options.transformations,
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );

        uploadStream.end(buffer);
    });
};

/**
 * Upload video to Cloudinary with transcoding and multi-quality eager transforms.
 *
 * Eager transforms pre-generate:
 *   - 360p (preview / thumbnail quality)
 *   - 720p (mobile playback)
 *   - 1080p (desktop playback)
 *   - A JPEG poster frame from the first second of the video
 *
 * These are created asynchronously so the upload response returns immediately.
 * Clients can construct the derivative URLs from the base public_id.
 */
export const uploadVideo = async (
    buffer: Buffer,
    options: {
        folder?: string;
        publicId?: string;
    } = {}
): Promise<any> => {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
        throw new Error('Cloudinary not configured');
    }

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: options.folder || '0g-videos',
                public_id: options.publicId,
                resource_type: 'video',
                // Video optimizations
                quality: 'auto',
                format: 'mp4',
                // ── Multi-quality eager transforms for adaptive delivery ──
                eager: [
                    // 360p — lightweight preview / thumbnail video
                    { width: 640, height: 360, crop: 'limit', format: 'mp4', quality: 'auto' },
                    // 720p — mobile-optimized
                    { width: 1280, height: 720, crop: 'limit', format: 'mp4', quality: 'auto' },
                    // 1080p — desktop quality
                    { width: 1920, height: 1080, crop: 'limit', format: 'mp4', quality: 'auto' },
                    // Poster frame — JPEG from the first second
                    { width: 800, height: 450, crop: 'fill', gravity: 'auto', format: 'jpg', quality: 80, start_offset: '0' },
                ],
                eager_async: true,
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );

        uploadStream.end(buffer);
    });
};

/**
 * Delete asset from Cloudinary
 */
export const deleteAsset = async (publicId: string, resourceType: 'image' | 'video' = 'image') => {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
        logger.warn('Cloudinary not configured. Skipping asset deletion.');
        return;
    }

    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (error) {
        logger.error('Failed to delete Cloudinary asset:', error);
        // Don't throw - deletion failures shouldn't break the app
    }
};

/**
 * Generate optimized image URL with transformations
 */
export const getOptimizedImageUrl = (
    publicId: string,
    options: {
        width?: number;
        height?: number;
        crop?: string;
        quality?: string | number;
    } = {}
) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
        return publicId; // Return original if Cloudinary not configured
    }

    return cloudinary.url(publicId, {
        width: options.width,
        height: options.height,
        crop: options.crop || 'fill',
        quality: options.quality || 'auto',
        fetch_format: 'auto',
    });
};

/**
 * Transform a full Cloudinary URL to serve an optimized version.
 * Injects width, quality, and format transformations into the URL.
 *
 * Input:  https://res.cloudinary.com/xxx/image/upload/v123/folder/image.jpg
 * Output: https://res.cloudinary.com/xxx/image/upload/w_400,q_auto,f_auto/v123/folder/image.jpg
 *
 * Non-Cloudinary URLs are returned unchanged.
 */
export const transformImageUrl = (
    url: string | null | undefined,
    width: number,
    quality: number | 'auto' = 'auto'
): string | null => {
    if (!url) return null;

    // Only transform Cloudinary URLs
    if (!url.includes('res.cloudinary.com')) return url;

    // Already has transformations? Replace them.
    // Cloudinary URL pattern: /upload/[optional transforms]/vXXX/...
    const transformStr = `w_${width},q_${quality},f_auto,c_limit`;

    // Insert transforms after /upload/
    const transformed = url.replace(
        /\/upload\/(v\d+\/)/,
        `/upload/${transformStr}/v$1`.replace('/v', '/')
    );

    // Fallback: if regex didn't match (different URL format), try simpler insert
    if (transformed === url) {
        return url.replace('/upload/', `/upload/${transformStr}/`);
    }

    return transformed;
};

/**
 * Generate feed-optimized image URLs for a post.
 * Returns { thumbnailUrl, feedMediaUrl } where thumbnailUrl is small (200px)
 * and feedMediaUrl is appropriately sized for the feed.
 *
 * For VIDEO posts the feedMediaUrl is unchanged (browser streams the video)
 * but we generate a poster/thumbnail URL from Cloudinary's video-to-image transform.
 */
export const getFeedImageUrls = (mediaUrl: string | null | undefined, mediaType?: string) => {
    if (!mediaUrl) {
        return { thumbnailUrl: null, feedMediaUrl: null };
    }

    // ── Video posts: generate a poster thumbnail from the video URL ──
    if (mediaType === 'VIDEO') {
        return {
            thumbnailUrl: getVideoThumbnailUrl(mediaUrl),
            feedMediaUrl: transformVideoUrl(mediaUrl),
        };
    }

    return {
        thumbnailUrl: transformImageUrl(mediaUrl, 200, 70),      // Tiny preview (list/grid)
        feedMediaUrl: transformImageUrl(mediaUrl, 800, 'auto'),   // Feed-sized (not full-res)
    };
};

/**
 * Generate a poster/thumbnail image from a Cloudinary video URL.
 *
 * Converts:
 *   .../video/upload/v123/folder/video.mp4
 * To:
 *   .../video/upload/so_0,w_400,h_225,c_fill,f_jpg,q_80/v123/folder/video.jpg
 *
 * Non-Cloudinary URLs return null (no server-side thumbnail available).
 */
export const getVideoThumbnailUrl = (videoUrl: string | null | undefined): string | null => {
    if (!videoUrl) return null;
    if (!videoUrl.includes('res.cloudinary.com')) return null;

    const transforms = 'so_0,w_400,h_225,c_fill,f_jpg,q_80';

    // Insert transforms after /upload/
    let thumbUrl = videoUrl.replace(
        /\/upload\/(v\d+\/)/,
        `/upload/${transforms}/$1`
    );

    // Fallback if regex didn't match
    if (thumbUrl === videoUrl) {
        thumbUrl = videoUrl.replace('/upload/', `/upload/${transforms}/`);
    }

    // Change extension to .jpg so Cloudinary returns an image
    thumbUrl = thumbUrl.replace(/\.(mp4|mov|webm|m3u8)(\?.*)?$/i, '.jpg');

    return thumbUrl;
};

/**
 * Apply f_auto,q_auto delivery optimizations to a Cloudinary video URL.
 * Non-Cloudinary URLs pass through unchanged.
 */
export const transformVideoUrl = (videoUrl: string | null | undefined): string | null => {
    if (!videoUrl) return null;
    if (!videoUrl.includes('res.cloudinary.com')) return videoUrl;

    const transforms = 'f_auto,q_auto';

    // Insert transforms after /upload/
    let optimized = videoUrl.replace(
        /\/upload\/(v\d+\/)/,
        `/upload/${transforms}/$1`
    );

    if (optimized === videoUrl) {
        optimized = videoUrl.replace('/upload/', `/upload/${transforms}/`);
    }

    return optimized;
};

/**
 * Check if Cloudinary is configured
 */
export const isCloudinaryConfigured = () => {
    return !!(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );
};
