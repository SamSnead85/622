import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { migrationService } from '../services/migration/MigrationService';
import { MigrationPlatform } from '@prisma/client';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads/migrations'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB max
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
            cb(null, true);
        } else {
            cb(new Error('Only ZIP files are allowed'));
        }
    },
});

// Auth middleware type (from your existing auth)
interface AuthRequest extends Request {
    user?: { id: string };
}

// Middleware to ensure user is authenticated
const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

/**
 * GET /api/migration
 * Get user's migration history
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const migrations = await migrationService.getUserMigrations(req.user!.id);
        res.json({ migrations });
    } catch (error) {
        console.error('Error getting migrations:', error);
        res.status(500).json({ error: 'Failed to get migrations' });
    }
});

/**
 * GET /api/migration/:id
 * Get migration status by ID
 */
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const migration = await migrationService.getMigrationStatus(req.params.id);

        if (!migration || migration.userId !== req.user!.id) {
            return res.status(404).json({ error: 'Migration not found' });
        }

        res.json({ migration });
    } catch (error) {
        console.error('Error getting migration:', error);
        res.status(500).json({ error: 'Failed to get migration status' });
    }
});

/**
 * POST /api/migration/upload
 * Upload and start a new migration
 */
router.post(
    '/upload',
    requireAuth,
    upload.single('file'),
    async (req: AuthRequest, res: Response) => {
        try {
            const { platform } = req.body;

            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            if (!platform || !['INSTAGRAM', 'TIKTOK', 'TWITTER', 'FACEBOOK', 'WHATSAPP'].includes(platform)) {
                return res.status(400).json({ error: 'Invalid platform' });
            }

            const migrationId = await migrationService.startMigration(
                req.user!.id,
                platform as MigrationPlatform,
                req.file.path
            );

            res.status(201).json({
                message: 'Migration started',
                migrationId,
            });
        } catch (error) {
            console.error('Error starting migration:', error);
            res.status(500).json({ error: 'Failed to start migration' });
        }
    }
);

/**
 * POST /api/migration/:id/cancel
 * Cancel a pending or processing migration
 */
router.post('/:id/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        await migrationService.cancelMigration(req.params.id, req.user!.id);
        res.json({ message: 'Migration cancelled' });
    } catch (error) {
        console.error('Error cancelling migration:', error);
        res.status(500).json({ error: 'Failed to cancel migration' });
    }
});

/**
 * GET /api/migration/platforms
 * Get supported platforms with instructions
 */
router.get('/platforms/info', async (req: Request, res: Response) => {
    const platforms = [
        {
            id: 'INSTAGRAM',
            name: 'Instagram',
            icon: '📷',
            instructions: [
                'Open Instagram app and go to Settings',
                'Select "Accounts Center" > "Your information and permissions"',
                'Tap "Download your information"',
                'Select "Some of your information"',
                'Choose Posts, Stories, Followers and Following',
                'Request download and wait for email',
                'Download the ZIP file and upload here',
            ],
            estimatedTime: '24-48 hours to receive file',
        },
        {
            id: 'TIKTOK',
            name: 'TikTok',
            icon: '🎵',
            instructions: [
                'Open TikTok app and go to Settings',
                'Select "Privacy" > "Download your data"',
                'Choose JSON format',
                'Request download and wait for notification',
                'Download the ZIP file and upload here',
            ],
            estimatedTime: '1-3 days to receive file',
        },
        {
            id: 'TWITTER',
            name: 'X (Twitter)',
            icon: '𝕏',
            instructions: [
                'Go to Settings > Your Account > Download an archive',
                'Confirm your identity',
                'Wait for email with download link',
                'Download the ZIP file and upload here',
            ],
            estimatedTime: '24-48 hours to receive file',
            comingSoon: true,
        },
        {
            id: 'FACEBOOK',
            name: 'Facebook',
            icon: '📘',
            instructions: [
                'Go to Settings > Your Facebook Information',
                'Select "Download Your Information"',
                'Choose JSON format and select data types',
                'Create file and wait for notification',
                'Download and upload here',
            ],
            estimatedTime: '24-48 hours to receive file',
            comingSoon: true,
        },
        {
            id: 'WHATSAPP',
            name: 'WhatsApp',
            icon: '💬',
            instructions: [
                'Open a chat in WhatsApp',
                'Tap More > Export Chat',
                'Choose to include or exclude media',
                'Share the exported file here',
            ],
            estimatedTime: 'Instant',
            comingSoon: true,
        },
    ];

    res.json({ platforms });
});

export default router;
