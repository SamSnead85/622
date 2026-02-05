import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { uploadFile, deleteFile, isValidMediaType, getMaxFileSize } from '../services/storage.js';
import { prisma } from '../db/client.js';

const router = Router();

// Extend Request type for multer file
interface MulterRequest extends AuthRequest {
    file?: Express.Multer.File;
}

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024, // 100 MB max (validated per type)
    },
});

// ============================================
// UPLOAD AVATAR
// ============================================
router.post('/avatar', authenticate, upload.single('file'), async (req: MulterRequest, res: Response, _next: NextFunction) => {
    console.log('[UPLOAD] Avatar upload request received');
    console.log('[UPLOAD] User ID:', req.userId);
    console.log('[UPLOAD] File received:', req.file ? `${req.file.originalname} (${req.file.size} bytes, ${req.file.mimetype})` : 'NO FILE');

    try {
        const file = req.file;
        if (!file) {
            console.log('[UPLOAD] Error: No file provided');
            res.status(400).json({ error: 'No file provided' });
            return;
        }

        if (!isValidMediaType(file.mimetype, 'image')) {
            console.log('[UPLOAD] Error: Invalid file type:', file.mimetype);
            res.status(400).json({ error: 'Invalid file type. Use JPG, PNG, GIF, or WebP.' });
            return;
        }

        if (file.size > getMaxFileSize('image')) {
            console.log('[UPLOAD] Error: File too large:', file.size);
            res.status(400).json({ error: 'File too large. Max 10 MB for images.' });
            return;
        }

        console.log('[UPLOAD] Uploading file to storage...');
        const result = await uploadFile(file.buffer, 'avatars', file.mimetype, file.originalname);
        console.log('[UPLOAD] Upload result:', result);

        // Update user profile
        console.log('[UPLOAD] Updating user profile...');
        await prisma.user.update({
            where: { id: req.user!.id },
            data: { avatarUrl: result.url },
        });
        console.log('[UPLOAD] User profile updated successfully');

        res.json({ url: result.url });
    } catch (error) {
        console.error('[UPLOAD] Avatar upload error:', error);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});

// ============================================
// UPLOAD COVER IMAGE
// ============================================
router.post('/cover', authenticate, upload.single('file'), async (req: MulterRequest, res: Response, _next: NextFunction) => {
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
        console.error('Cover upload error:', error);
        res.status(500).json({ error: 'Failed to upload cover image' });
    }
});

// ============================================
// UPLOAD POST MEDIA
// ============================================
router.post('/post', authenticate, upload.single('file'), async (req: MulterRequest, res: Response, _next: NextFunction) => {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ error: 'No file provided' });
            return;
        }

        const isImage = isValidMediaType(file.mimetype, 'image');
        const isVideo = isValidMediaType(file.mimetype, 'video');

        if (!isImage && !isVideo) {
            console.log('[UPLOAD] Rejected file type:', file.mimetype);
            res.status(400).json({ error: `Invalid file type: ${file.mimetype}. Supported: images (JPG, PNG, GIF, WebP, HEIC) and videos (MP4, MOV, WebM).` });
            return;
        }

        const maxSize = isVideo ? getMaxFileSize('video') : getMaxFileSize('image');
        if (file.size > maxSize) {
            res.status(400).json({
                error: `File too large. Max ${isVideo ? '100' : '10'} MB.`
            });
            return;
        }

        const result = await uploadFile(file.buffer, 'posts', file.mimetype, file.originalname);

        res.json({
            url: result.url,
            key: result.key,
            type: isVideo ? 'VIDEO' : 'IMAGE',
            size: result.size,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Post media upload error:', error);
        res.status(500).json({ error: `Failed to upload media: ${errorMessage}` });
    }
});

// ============================================
// UPLOAD MOMENT MEDIA
// ============================================
router.post('/moment', authenticate, upload.single('file'), async (req: MulterRequest, res: Response, _next: NextFunction) => {
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
                error: `File too large. Max ${isVideo ? '100' : '10'} MB.`
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Moment media upload error:', error);
        res.status(500).json({ error: `Failed to upload media: ${errorMessage}` });
    }
});

// ============================================
// UPLOAD MESSAGE ATTACHMENT
// ============================================
router.post('/message', authenticate, upload.single('file'), async (req: MulterRequest, res: Response, _next: NextFunction) => {
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
        console.error('Message attachment upload error:', error);
        res.status(500).json({ error: 'Failed to upload attachment' });
    }
});

// ============================================
// DELETE FILE (admin/cleanup)
// ============================================
router.delete('/:key(*)', authenticate, async (req: AuthRequest, res: Response, _next: NextFunction) => {
    try {
        const { key } = req.params;

        // TODO: Verify ownership of the file before deleting
        await deleteFile(key);

        res.json({ success: true });
    } catch (error) {
        console.error('File delete error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

export default router;
