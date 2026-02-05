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
            // Supabase Storage uses their S3-compatible endpoint
            // Requires: SUPABASE_URL, SUPABASE_ACCESS_KEY_ID, SUPABASE_SECRET_ACCESS_KEY
            // Get these from: Supabase Dashboard > Storage > S3 Access Keys
            const supabaseUrl = process.env.SUPABASE_URL;
            if (!supabaseUrl) {
                console.error('[Storage] SUPABASE_URL not configured');
                return null;
            }

            // Extract project ref for endpoint (e.g., "abc123" from "https://abc123.supabase.co")
            const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

            return new S3Client({
                region: 'auto',
                endpoint: `https://${projectRef}.supabase.co/storage/v1/s3`,
                credentials: {
                    accessKeyId: process.env.SUPABASE_ACCESS_KEY_ID || process.env.SUPABASE_SERVICE_KEY || '',
                    secretAccessKey: process.env.SUPABASE_SECRET_ACCESS_KEY || process.env.SUPABASE_SERVICE_KEY || '',
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

// Log storage configuration at startup
console.log('[Storage] Provider:', STORAGE_PROVIDER);
console.log('[Storage] Bucket:', BUCKET);
if (STORAGE_PROVIDER !== 'local') {
    console.log('[Storage] S3 Client initialized:', !!s3Client);
    if (STORAGE_PROVIDER === 'supabase') {
        console.log('[Storage] Supabase URL:', process.env.SUPABASE_URL ? 'configured' : 'MISSING');
        console.log('[Storage] Access Key ID:', process.env.SUPABASE_ACCESS_KEY_ID ? 'configured' : 'MISSING');
        console.log('[Storage] Secret Access Key:', process.env.SUPABASE_SECRET_ACCESS_KEY ? 'configured' : 'MISSING');
    }
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
    console.log('[Storage] Uploading to S3:', { bucket: BUCKET, key, mimeType, size: buffer.length });
    try {
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
            CacheControl: 'public, max-age=31536000', // 1 year cache
        }));
        console.log('[Storage] Upload successful:', key);
    } catch (s3Error: unknown) {
        const errorDetails = s3Error instanceof Error ? {
            name: s3Error.name,
            message: s3Error.message,
            // @ts-expect-error S3 errors have additional properties
            code: s3Error.Code || s3Error.$metadata?.httpStatusCode,
        } : s3Error;
        console.error('[Storage] S3 upload failed:', errorDetails);
        throw new Error(`Storage upload failed: ${s3Error instanceof Error ? s3Error.message : 'Unknown S3 error'}`);
    }

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
        image: 10 * 1024 * 1024,   // 10 MB
        video: 100 * 1024 * 1024,  // 100 MB
        audio: 20 * 1024 * 1024,   // 20 MB
    };
    return limits[category] || 10 * 1024 * 1024;
}
