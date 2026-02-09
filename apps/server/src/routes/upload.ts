import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { uploadFile, deleteFile, isValidMediaType, getMaxFileSize } from '../services/storage.js';
import { prisma } from '../db/client.js';
import path from 'path';
import os from 'os';
import fs from 'fs';

const router = Router();

// Extend Request type for multer file
interface MulterRequest extends AuthRequest {
    file?: Express.Multer.File;
}

// Small files (< 10MB): use memory storage for speed (avatars, thumbnails)
const memoryUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB max
    },
});

// Large files (videos, data imports): use disk storage to avoid OOM
const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tmpDir = path.join(os.tmpdir(), '0g-uploads');
        fs.mkdirSync(tmpDir, { recursive: true });
        cb(null, tmpDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

const diskUpload = multer({
    storage: diskStorage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500 MB max (validated per type)
    },
});

// Legacy upload alias for backward compatibility
const upload = memoryUpload;

// ============================================
// UPLOAD AVATAR
// ============================================
router.post('/avatar', authenticate, upload.single('file'), async (req: MulterRequest, res: Response, next: NextFunction) => {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ error: 'No file provided' });
            return;
        }

        if (!isValidMediaType(file.mimetype, 'image')) {
            res.status(400).json({ error: 'Invalid file type. Use JPG, PNG, GIF, or WebP.' });
            return;
        }

        if (file.size > getMaxFileSize('image')) {
            res.status(400).json({ error: 'File too large. Max 10 MB for images.' });
            return;
        }

        const result = await uploadFile(file.buffer, 'avatars', file.mimetype, file.originalname);

        // Update user profile
        await prisma.user.update({
            where: { id: req.user!.id },
            data: { avatarUrl: result.url },
        });

        res.json({ url: result.url });
    } catch (error) {
        next(error);
    }
});

// ============================================
// UPLOAD COVER IMAGE
// ============================================
router.post('/cover', authenticate, upload.single('file'), async (req: MulterRequest, res: Response, next: NextFunction) => {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ error: 'No file provided' });
            return;
        }

        if (!isValidMediaType(file.mimetype, 'image')) {
            res.status(400).json({ error: 'Invalid file type. Use JPG, PNG, GIF, or WebP.' });
            return;
        }

        if (file.size > getMaxFileSize('image')) {
            res.status(400).json({ error: 'File too large. Max 10 MB for images.' });
            return;
        }

        const result = await uploadFile(file.buffer, 'covers', file.mimetype, file.originalname);

        // Update user profile
        await prisma.user.update({
            where: { id: req.user!.id },
            data: { coverUrl: result.url },
        });

        res.json({ url: result.url });
    } catch (error) {
        next(error);
    }
});

// ============================================
// UPLOAD POST MEDIA
// ============================================
router.post('/post', authenticate, diskUpload.single('file'), async (req: MulterRequest, res: Response, next: NextFunction) => {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ error: 'No file provided' });
            return;
        }

        const isImage = isValidMediaType(file.mimetype, 'image');
        const isVideo = isValidMediaType(file.mimetype, 'video');

        if (!isImage && !isVideo) {
            res.status(400).json({ error: `Invalid file type: ${file.mimetype}. Supported: images (JPG, PNG, GIF, WebP, HEIC) and videos (MP4, MOV, WebM).` });
            return;
        }

        const maxSize = isVideo ? getMaxFileSize('video') : getMaxFileSize('image');
        if (file.size > maxSize) {
            res.status(400).json({
                error: `File too large. Max ${isVideo ? '500' : '25'} MB.`
            });
            return;
        }

        // Disk-stored files need to be read into a buffer, then cleaned up
        const fileBuffer = file.buffer || fs.readFileSync(file.path);
        const result = await uploadFile(fileBuffer, 'posts', file.mimetype, file.originalname);
        // Clean up disk temp file if used
        if (file.path) {
            fs.unlink(file.path, () => {}); // Non-blocking cleanup
        }

        // -------------------------------------------------------------------
        // Video thumbnail generation (server-side)
        //
        // Currently returns null — the client generates a thumbnail locally.
        // To enable server-side thumbnail generation with ffmpeg:
        //
        //   1. Install ffmpeg on the server (e.g. `apt install ffmpeg`)
        //   2. Use fluent-ffmpeg or child_process to extract a frame:
        //
        //      import ffmpeg from 'fluent-ffmpeg';
        //      import { Readable } from 'stream';
        //
        //      async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
        //        return new Promise((resolve, reject) => {
        //          const chunks: Buffer[] = [];
        //          ffmpeg(Readable.from(buffer))
        //            .frames(1)
        //            .outputOptions('-vf', 'scale=480:-1')
        //            .format('mjpeg')
        //            .on('error', reject)
        //            .pipe()
        //            .on('data', (chunk: Buffer) => chunks.push(chunk))
        //            .on('end', () => resolve(Buffer.concat(chunks)));
        //        });
        //      }
        //
        //   3. Upload the resulting JPEG buffer via uploadFile() and return
        //      its URL as thumbnailUrl in the response below.
        //
        //   4. For Cloudinary: use eager transformations on upload to auto-
        //      generate a poster frame. The thumbnail URL is returned in the
        //      eager array of the upload response.
        // -------------------------------------------------------------------
        res.json({
            url: result.url,
            key: result.key,
            type: isVideo ? 'VIDEO' : 'IMAGE',
            size: result.size,
            // For video uploads, include thumbnailUrl (null until server-side generation is configured)
            ...(isVideo ? { thumbnailUrl: null } : {}),
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// UPLOAD MOMENT MEDIA
// ============================================
router.post('/moment', authenticate, upload.single('file'), async (req: MulterRequest, res: Response, next: NextFunction) => {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ error: 'No file provided' });
            return;
        }

        const isImage = isValidMediaType(file.mimetype, 'image');
        const isVideo = isValidMediaType(file.mimetype, 'video');

        if (!isImage && !isVideo) {
            res.status(400).json({ error: 'Invalid file type. Use image or video.' });
            return;
        }

        const maxSize = isVideo ? getMaxFileSize('video') : getMaxFileSize('image');
        if (file.size > maxSize) {
            res.status(400).json({
                error: `File too large. Max ${isVideo ? '500' : '25'} MB.`
            });
            return;
        }

        const result = await uploadFile(file.buffer, 'moments', file.mimetype, file.originalname);

        res.json({
            url: result.url,
            key: result.key,
            type: isVideo ? 'VIDEO' : 'IMAGE',
            size: result.size,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// UPLOAD MESSAGE ATTACHMENT
// ============================================
router.post('/message', authenticate, upload.single('file'), async (req: MulterRequest, res: Response, next: NextFunction) => {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ error: 'No file provided' });
            return;
        }

        const isImage = isValidMediaType(file.mimetype, 'image');
        const isVideo = isValidMediaType(file.mimetype, 'video');
        const isAudio = isValidMediaType(file.mimetype, 'audio');

        if (!isImage && !isVideo && !isAudio) {
            res.status(400).json({ error: 'Invalid file type.' });
            return;
        }

        let maxSize = getMaxFileSize('image');
        if (isVideo) maxSize = getMaxFileSize('video');
        if (isAudio) maxSize = getMaxFileSize('audio');

        if (file.size > maxSize) {
            res.status(400).json({ error: 'File too large.' });
            return;
        }

        const result = await uploadFile(file.buffer, 'messages', file.mimetype, file.originalname);

        let mediaType: 'IMAGE' | 'VIDEO' | 'AUDIO' = 'IMAGE';
        if (isVideo) mediaType = 'VIDEO';
        if (isAudio) mediaType = 'AUDIO';

        res.json({
            url: result.url,
            key: result.key,
            mediaType,
            size: result.size,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// DELETE FILE (admin only - requires ADMIN/SUPERADMIN role)
// ============================================
router.delete('/:key(*)', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { key } = req.params;

        // Verify the user is an admin before allowing arbitrary file deletion
        const userRole = req.user?.role;
        const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';

        if (!isAdmin) {
            // Non-admins can only delete files they own
            // Check if the file key matches their avatar, cover, or a post they own
            const user = await prisma.user.findUnique({
                where: { id: req.user!.id },
                select: { avatarUrl: true, coverUrl: true },
            });

            const userPosts = await prisma.post.findMany({
                where: { userId: req.user!.id },
                select: { mediaUrl: true, thumbnailUrl: true },
            });

            const ownedUrls = [
                user?.avatarUrl,
                user?.coverUrl,
                ...userPosts.map(p => p.mediaUrl),
                ...userPosts.map(p => p.thumbnailUrl),
            ].filter(Boolean);

            const ownsFile = ownedUrls.some(url => url && url.includes(key));
            if (!ownsFile) {
                res.status(403).json({ error: 'You can only delete your own files' });
                return;
            }
        }

        await deleteFile(key);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

export default router;
