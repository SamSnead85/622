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
    rememberMe: z.boolean().optional().default(true),
});

const checkUsernameSchema = z.object({
    username: z.string().min(3).max(30),
});

// Helper to generate tokens
const generateTokens = async (
    userId: string,
    deviceInfo?: { type?: string; name?: string; ip?: string },
    rememberMe: boolean = true
) => {
    const sessionId = uuid();
    // 30 days for "remember me", 24 hours for temporary sessions
    const expiresIn = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + expiresIn);

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
        { expiresIn: rememberMe ? '30d' : '1d' }
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
        const { email, password, rememberMe } = loginSchema.parse(req.body);

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

        // Generate auth token (30 days if rememberMe, otherwise 24 hours)
        const { token, expiresAt } = await generateTokens(user.id, {
            type: req.headers['x-device-type'] as string,
            name: req.headers['x-device-name'] as string,
            ip: req.ip,
        }, rememberMe);

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

// POST /api/v1/auth/google - Handle Google OAuth
const googleAuthSchema = z.object({
    idToken: z.string(),
    accessToken: z.string().optional(),
});

// Import Google Auth Library at the top of the file dynamically
router.post('/google', async (req, res, next) => {
    try {
        const { idToken } = googleAuthSchema.parse(req.body);

        let email: string;
        let name: string | undefined;
        let picture: string | undefined;
        let googleId: string;

        // Use Google Auth Library for production token verification
        const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

        if (GOOGLE_CLIENT_ID) {
            // Production: Verify token with Google
            const { OAuth2Client } = await import('google-auth-library');
            const client = new OAuth2Client(GOOGLE_CLIENT_ID);

            try {
                const ticket = await client.verifyIdToken({
                    idToken,
                    audience: GOOGLE_CLIENT_ID,
                });
                const payload = ticket.getPayload();

                if (!payload || !payload.email) {
                    throw new AppError('Invalid Google token payload', 400);
                }

                email = payload.email;
                name = payload.name;
                picture = payload.picture;
                googleId = payload.sub;
            } catch (verifyError) {
                console.error('Google token verification failed:', verifyError);
                throw new AppError('Invalid or expired Google token', 401);
            }
        } else {
            // Development fallback: Decode without verification (NOT for production)
            console.warn('WARNING: GOOGLE_CLIENT_ID not set. Using unverified token decode.');
            const tokenParts = idToken.split('.');
            if (tokenParts.length !== 3) {
                throw new AppError('Invalid Google token format', 400);
            }

            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            email = payload.email;
            name = payload.name;
            picture = payload.picture;
            googleId = payload.sub;
        }

        if (!email) {
            throw new AppError('Email not provided by Google', 400);
        }

        // Check if user exists with this email
        let user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (user) {
            // User exists - check if OAuth account is linked
            const oauthAccount = await prisma.oAuthAccount.findUnique({
                where: { provider_providerId: { provider: 'google', providerId: googleId } },
            });

            if (!oauthAccount) {
                // Link Google account to existing user
                await prisma.oAuthAccount.create({
                    data: {
                        userId: user.id,
                        provider: 'google',
                        providerId: googleId,
                    },
                });
            }
        } else {
            // Create new user from Google profile
            const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') +
                Math.random().toString(36).substring(2, 6);

            user = await prisma.user.create({
                data: {
                    email: email.toLowerCase(),
                    username,
                    displayName: name || email.split('@')[0],
                    avatarUrl: picture,
                    isVerified: true, // Google accounts are pre-verified
                    oauthAccounts: {
                        create: {
                            provider: 'google',
                            providerId: googleId,
                        },
                    },
                },
            });
        }

        if (user.isBanned) {
            throw new AppError('Account suspended', 403);
        }

        // Generate session token
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
            isNewUser: !user.bio, // Indicate if profile needs setup
        });
    } catch (error) {
        next(error);
    }
});

export { router as authRouter };

