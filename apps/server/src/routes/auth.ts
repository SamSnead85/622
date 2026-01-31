import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { prisma } from '../db/client.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
    displayName: z.string().min(1).max(50).optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

const checkUsernameSchema = z.object({
    username: z.string().min(3).max(30),
});

// Helper to generate tokens
const generateTokens = async (userId: string, deviceInfo?: { type?: string; name?: string; ip?: string }) => {
    const sessionId = uuid();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.session.create({
        data: {
            id: sessionId,
            userId,
            token: sessionId,
            deviceType: deviceInfo?.type,
            deviceName: deviceInfo?.name,
            ipAddress: deviceInfo?.ip,
            expiresAt,
        },
    });

    const token = jwt.sign(
        { userId, sessionId },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
    );

    return { token, expiresAt };
};

// POST /api/v1/auth/signup
router.post('/signup', async (req, res, next) => {
    try {
        const { email, password, username, displayName } = signupSchema.parse(req.body);

        // Check if email or username exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email.toLowerCase() },
                    { username: username.toLowerCase() },
                ],
            },
        });

        if (existingUser) {
            if (existingUser.email === email.toLowerCase()) {
                throw new AppError('Email already registered', 409);
            }
            throw new AppError('Username already taken', 409);
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                username: username.toLowerCase(),
                displayName: displayName || username,
                passwordHash,
            },
        });

        // Generate auth token
        const { token, expiresAt } = await generateTokens(user.id, {
            type: req.headers['x-device-type'] as string,
            name: req.headers['x-device-name'] as string,
            ip: req.ip,
        });

        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                isVerified: user.isVerified,
            },
            token,
            expiresAt,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user || !user.passwordHash) {
            throw new AppError('Invalid credentials', 401);
        }

        if (user.isBanned) {
            throw new AppError('Account suspended', 403);
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);

        if (!isValidPassword) {
            throw new AppError('Invalid credentials', 401);
        }

        // Generate auth token
        const { token, expiresAt } = await generateTokens(user.id, {
            type: req.headers['x-device-type'] as string,
            name: req.headers['x-device-name'] as string,
            ip: req.ip,
        });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                coverUrl: user.coverUrl,
                bio: user.bio,
                isVerified: user.isVerified,
            },
            token,
            expiresAt,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sessionId: string };
            await prisma.session.delete({
                where: { id: decoded.sessionId },
            }).catch(() => { });
        }

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
                bio: true,
                website: true,
                avatarUrl: true,
                coverUrl: true,
                isVerified: true,
                isPrivate: true,
                createdAt: true,
                _count: {
                    select: {
                        followers: true,
                        following: true,
                        posts: true,
                    },
                },
            },
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        res.json({
            ...user,
            followersCount: user._count.followers,
            followingCount: user._count.following,
            postsCount: user._count.posts,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/auth/check-username
router.post('/check-username', async (req, res, next) => {
    try {
        const { username } = checkUsernameSchema.parse(req.body);

        const existingUser = await prisma.user.findUnique({
            where: { username: username.toLowerCase() },
        });

        res.json({ available: !existingUser });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/auth/refresh
router.post('/refresh', authenticate, async (req: AuthRequest, res, next) => {
    try {
        // Invalidate old session
        const authHeader = req.headers.authorization;
        const oldToken = authHeader?.split(' ')[1];

        if (oldToken) {
            const decoded = jwt.verify(oldToken, process.env.JWT_SECRET!) as { sessionId: string };
            await prisma.session.delete({
                where: { id: decoded.sessionId },
            }).catch(() => { });
        }

        // Generate new token
        const { token, expiresAt } = await generateTokens(req.userId!, {
            type: req.headers['x-device-type'] as string,
            name: req.headers['x-device-name'] as string,
            ip: req.ip,
        });

        res.json({ token, expiresAt });
    } catch (error) {
        next(error);
    }
});

export { router as authRouter };
