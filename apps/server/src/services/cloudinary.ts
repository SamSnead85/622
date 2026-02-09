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
        transformations?: any;
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
 * Upload video to Cloudinary with transcoding
 */
export const uploadVideo = async (
    buffer: Buffer,
    options: {
        folder?: string;
        publicId?: string;
    } = {}
) => {
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
                // Adaptive streaming
                eager: [
                    {
                        streaming_profile: 'hd',
                        format: 'm3u8',
                    },
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
 * Check if Cloudinary is configured
 */
export const isCloudinaryConfigured = () => {
    return !!(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );
};
