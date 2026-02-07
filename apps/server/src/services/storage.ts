import sharp from 'sharp';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// ============================================
// STORAGE SERVICE
// Supports: Local, Supabase Storage (JS SDK), AWS S3, Cloudflare R2
// ============================================

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local'; // local | supabase | s3 | r2
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5180}`;
const BUCKET = process.env.STORAGE_BUCKET || 'og-media';

// ============================================
// SUPABASE CLIENT (for native SDK uploads)
// ============================================
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
    if (supabaseClient) return supabaseClient;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('[Storage] Supabase URL or SERVICE_KEY not configured');
        return null;
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
    });

    return supabaseClient;
}

// ============================================
// S3 CLIENT (for S3/R2)
// ============================================
function createS3Client(): S3Client | null {
    if (STORAGE_PROVIDER === 'local' || STORAGE_PROVIDER === 'supabase') return null;

    switch (STORAGE_PROVIDER) {
        case 'r2':
            return new S3Client({
                region: 'auto',
                endpoint: process.env.R2_ENDPOINT,
                credentials: {
                    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
                    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
                },
            });
        case 's3':
        default:
            return new S3Client({
                region: process.env.AWS_REGION || 'us-east-1',
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
                },
            });
    }
}

const s3Client = createS3Client();

// Log storage configuration at startup
console.log('[Storage] Provider:', STORAGE_PROVIDER);
console.log('[Storage] Bucket:', BUCKET);
if (STORAGE_PROVIDER === 'supabase') {
    console.log('[Storage] Supabase URL:', process.env.SUPABASE_URL ? 'configured' : 'MISSING');
    console.log('[Storage] Service Key:', process.env.SUPABASE_SERVICE_KEY ? 'configured' : 'MISSING');
}

// ============================================
// PUBLIC API
// ============================================

export interface UploadResult {
    key: string;
    url: string;
    size: number;
}

/**
 * Strip EXIF/GPS metadata from image buffers for user safety.
 * Removes GPS coordinates, device info, timestamps, and all other EXIF data.
 * Returns the sanitized buffer. Non-image buffers pass through unchanged.
 */
export async function stripImageMetadata(buffer: Buffer, mimeType: string): Promise<Buffer> {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/tiff'];
    if (!imageTypes.includes(mimeType)) return buffer;

    try {
        // sharp.rotate() without arguments auto-orients based on EXIF then strips metadata
        const stripped = await sharp(buffer)
            .rotate()           // auto-orient from EXIF rotation, then discard orientation tag
            .withMetadata({})   // strip ALL metadata (EXIF, GPS, ICC, XMP, IPTC)
            .toBuffer();

        console.log(`[Storage] Metadata stripped: ${buffer.length} → ${stripped.length} bytes`);
        return stripped;
    } catch (err) {
        console.error('[Storage] Metadata stripping failed, using original buffer:', err);
        return buffer; // fail-safe: return original if stripping fails
    }
}

/**
 * Upload a file buffer to storage
 */
export async function uploadFile(
    buffer: Buffer,
    folder: 'avatars' | 'covers' | 'posts' | 'moments' | 'messages' | 'communities',
    mimeType: string,
    originalFilename?: string
): Promise<UploadResult> {
    // Strip metadata from all image uploads for privacy/safety
    const sanitizedBuffer = await stripImageMetadata(buffer, mimeType);

    const extension = getExtensionFromMime(mimeType);
    const key = `${folder}/${uuid()}.${extension}`;

    // Priority 1: Cloudinary (if configured)
    if (process.env.CLOUDINARY_CLOUD_NAME) {
        try {
            const { uploadImage, uploadVideo } = await import('./cloudinary.js');
            const isVideo = mimeType.startsWith('video/');

            console.log('[Storage] Uploading to Cloudinary:', { folder, mimeType, size: sanitizedBuffer.length });

            const result: any = isVideo
                ? await uploadVideo(sanitizedBuffer, { folder, publicId: uuid() })
                : await uploadImage(sanitizedBuffer, { folder, publicId: uuid() });

            console.log('[Storage] Cloudinary upload successful');

            return {
                key: result.public_id,
                url: result.secure_url,
                size: sanitizedBuffer.length,
            };
        } catch (cloudinaryError) {
            console.error('[Storage] Cloudinary upload failed, falling back to default storage:', cloudinaryError);
            // Fall through to default storage
        }
    }

    // Priority 2: Local storage
    if (STORAGE_PROVIDER === 'local') {
        const uploadPath = path.join(UPLOAD_DIR, folder);
        if (!existsSync(uploadPath)) {
            await mkdir(uploadPath, { recursive: true });
        }
        const filePath = path.join(UPLOAD_DIR, key);
        await writeFile(filePath, sanitizedBuffer);

        return {
            key,
            url: `${SERVER_URL}/uploads/${key}`,
            size: sanitizedBuffer.length,
        };
    }

    // Priority 3: Supabase Storage (using JS SDK - simpler and more reliable)
    if (STORAGE_PROVIDER === 'supabase') {
        const supabase = getSupabaseClient();
        if (!supabase) {
            throw new Error('Supabase client not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_KEY.');
        }

        console.log('[Storage] Uploading to Supabase:', { bucket: BUCKET, key, mimeType, size: sanitizedBuffer.length });

        const { data, error } = await supabase.storage
            .from(BUCKET)
            .upload(key, sanitizedBuffer, {
                contentType: mimeType,
                cacheControl: '31536000',
                upsert: false,
            });

        if (error) {
            console.error('[Storage] Supabase upload failed:', error);
            throw new Error(`Storage upload failed: ${error.message}`);
        }

        console.log('[Storage] Supabase upload successful:', key);

        return {
            key,
            url: getPublicUrl(key),
            size: sanitizedBuffer.length,
        };
    }

    // Priority 4: S3-compatible storage (S3, R2)
    if (!s3Client) {
        throw new Error('S3 client not initialized');
    }

    console.log('[Storage] Uploading to S3:', { bucket: BUCKET, key, mimeType, size: sanitizedBuffer.length });
    try {
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: sanitizedBuffer,
            ContentType: mimeType,
            CacheControl: 'public, max-age=31536000',
        }));
        console.log('[Storage] S3 upload successful:', key);
    } catch (s3Error: unknown) {
        console.error('[Storage] S3 upload failed:', s3Error);
        throw new Error(`Storage upload failed: ${s3Error instanceof Error ? s3Error.message : 'Unknown S3 error'}`);
    }

    return {
        key,
        url: getPublicUrl(key),
        size: sanitizedBuffer.length,
    };
}

/**
 * Delete a file from storage
 */
export async function deleteFile(key: string): Promise<void> {
    if (STORAGE_PROVIDER === 'local') {
        const filePath = path.join(UPLOAD_DIR, key);
        try {
            await unlink(filePath);
        } catch {
            // File might not exist
        }
        return;
    }

    if (STORAGE_PROVIDER === 'supabase') {
        const supabase = getSupabaseClient();
        if (supabase) {
            await supabase.storage.from(BUCKET).remove([key]);
        }
        return;
    }

    if (s3Client) {
        await s3Client.send(new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: key,
        }));
    }
}

/**
 * Get a signed URL for temporary access (private files)
 */
export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    if (STORAGE_PROVIDER === 'local') {
        return `${SERVER_URL}/uploads/${key}`;
    }

    if (STORAGE_PROVIDER === 'supabase') {
        const supabase = getSupabaseClient();
        if (supabase) {
            const { data } = await supabase.storage.from(BUCKET).createSignedUrl(key, expiresIn);
            return data?.signedUrl || getPublicUrl(key);
        }
    }

    if (s3Client) {
        const command = new GetObjectCommand({
            Bucket: BUCKET,
            Key: key,
        });
        return getSignedUrl(s3Client, command, { expiresIn });
    }

    return getPublicUrl(key);
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(key: string): string {
    switch (STORAGE_PROVIDER) {
        case 'supabase':
            return `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${key}`;
        case 'r2':
            return `${process.env.R2_PUBLIC_URL || process.env.R2_ENDPOINT}/${BUCKET}/${key}`;
        case 's3':
        default:
            return `https://${BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
    }
}

// ============================================
// HELPERS
// ============================================

function getExtensionFromMime(mimeType: string): string {
    const map: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/avif': 'avif',
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'video/quicktime': 'mov',
        'audio/mpeg': 'mp3',
        'audio/wav': 'wav',
        'audio/ogg': 'ogg',
    };
    return map[mimeType] || 'bin';
}

/**
 * Validate file type for upload
 */
export function isValidMediaType(mimeType: string, category: 'image' | 'video' | 'audio'): boolean {
    const allowed: Record<string, string[]> = {
        image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/heic', 'image/heif'],
        video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/3gpp', 'video/3gpp2', 'video/mpeg', 'video/x-msvideo'],
        audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/aac'],
    };
    return allowed[category]?.includes(mimeType) ?? false;
}

/**
 * Get max file size in bytes
 */
export function getMaxFileSize(category: 'image' | 'video' | 'audio'): number {
    const limits: Record<string, number> = {
        image: 25 * 1024 * 1024,   // 25 MB
        video: 500 * 1024 * 1024,  // 500 MB
        audio: 50 * 1024 * 1024,   // 50 MB
    };
    return limits[category] || 10 * 1024 * 1024;
}
