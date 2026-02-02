import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// ============================================
// STORAGE SERVICE
// Supports: Local, Supabase Storage, AWS S3, Cloudflare R2
// ============================================

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local'; // local | supabase | s3 | r2
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5180}`;

// Configure S3 client based on provider (only if not local)
function createStorageClient(): S3Client | null {
    if (STORAGE_PROVIDER === 'local') return null;

    switch (STORAGE_PROVIDER) {
        case 'supabase':
            return new S3Client({
                region: 'auto',
                endpoint: `${process.env.SUPABASE_URL}/storage/v1/s3`,
                credentials: {
                    accessKeyId: process.env.SUPABASE_SERVICE_KEY || '',
                    secretAccessKey: process.env.SUPABASE_SERVICE_KEY || '',
                },
                forcePathStyle: true,
            });
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

const s3Client = createStorageClient();
const BUCKET = process.env.STORAGE_BUCKET || 'caravan-media';

// ============================================
// PUBLIC API
// ============================================

export interface UploadResult {
    key: string;
    url: string;
    size: number;
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
    const extension = getExtensionFromMime(mimeType);
    const key = `${folder}/${uuid()}.${extension}`;

    // Local storage
    if (STORAGE_PROVIDER === 'local' || !s3Client) {
        const uploadPath = path.join(UPLOAD_DIR, folder);
        if (!existsSync(uploadPath)) {
            await mkdir(uploadPath, { recursive: true });
        }
        const filePath = path.join(UPLOAD_DIR, key);
        await writeFile(filePath, buffer);

        return {
            key,
            url: `${SERVER_URL}/uploads/${key}`,
            size: buffer.length,
        };
    }

    // S3-compatible storage
    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: 'public, max-age=31536000', // 1 year cache
    }));

    return {
        key,
        url: getPublicUrl(key),
        size: buffer.length,
    };
}

/**
 * Delete a file from storage
 */
export async function deleteFile(key: string): Promise<void> {
    if (STORAGE_PROVIDER === 'local' || !s3Client) {
        const filePath = path.join(UPLOAD_DIR, key);
        try {
            await unlink(filePath);
        } catch {
            // File might not exist
        }
        return;
    }

    await s3Client.send(new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
    }));
}

/**
 * Get a signed URL for temporary access (private files)
 */
export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    if (STORAGE_PROVIDER === 'local' || !s3Client) {
        return `${SERVER_URL}/uploads/${key}`;
    }

    const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
    });
    return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(key: string): string {
    switch (STORAGE_PROVIDER) {
        case 'supabase':
            return `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${key}`;
        case 'r2':
            // R2 public URL via custom domain or workers
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
        image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
        video: ['video/mp4', 'video/webm', 'video/quicktime'],
        audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
    };
    return allowed[category]?.includes(mimeType) ?? false;
}

/**
 * Get max file size in bytes
 */
export function getMaxFileSize(category: 'image' | 'video' | 'audio'): number {
    const limits: Record<string, number> = {
        image: 10 * 1024 * 1024,   // 10 MB
        video: 100 * 1024 * 1024,  // 100 MB
        audio: 20 * 1024 * 1024,   // 20 MB
    };
    return limits[category] || 10 * 1024 * 1024;
}
