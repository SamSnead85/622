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
    groupOnly: z.boolean().optional(),
    primaryCommunityId: z.string().optional(),
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
        const { email, password, username, displayName, groupOnly, primaryCommunityId } = signupSchema.parse(req.body);

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

        // Create user (with optional group-only restriction)
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                username: username.toLowerCase(),
                displayName: displayName || username,
                passwordHash,
                isGroupOnly: groupOnly || false,
                primaryCommunityId: groupOnly ? primaryCommunityId : null,
            },
        });

        // Generate auth token
        const { token, expiresAt } = await generateTokens(user.id, {
            type: req.headers['x-device-type'] as string,
            name: req.headers['x-device-name'] as string,
            ip: req.ip,
        });

        // === Post-signup automation (non-blocking) ===
        (async () => {
            try {
                // 1. Notify all admins/superadmins about new signup
                const admins = await prisma.user.findMany({
                    where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
                    select: { id: true, username: true },
                });
                if (admins.length > 0) {
                    await prisma.notification.createMany({
                        data: admins.map((admin) => ({
                            userId: admin.id,
                            type: 'SYSTEM' as const,
                            actorId: user.id,
                            message: `New member joined: ${user.displayName || user.username} (@${user.username})`,
                        })),
                    });

                    // 2. Auto-follow the new user from admin accounts (so they appear in admin feeds)
                    //    AND make the new user follow admin accounts (so they see content immediately)
                    for (const admin of admins) {
                        // Admin follows the new user
                        await prisma.follow.create({
                            data: { followerId: admin.id, followingId: user.id },
                        }).catch(() => {}); // Ignore if already following

                        // New user follows admin (so their feed isn't empty)
                        await prisma.follow.create({
                            data: { followerId: user.id, followingId: admin.id },
                        }).catch(() => {});
                    }
                }

                // 3. Send a welcome notification to the new user
                await prisma.notification.create({
                    data: {
                        userId: user.id,
                        type: 'SYSTEM' as const,
                        message: `Welcome to 0G, ${user.displayName || user.username}! 🎉 You're part of a new kind of social platform — one built on privacy, transparency, and community ownership. Start by creating your first post or exploring what others are sharing.`,
                    },
                });
            } catch (err) {
                console.error('[Auth] Post-signup automation error:', err);
            }
        })();

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

        // Check if locked out due to failed attempts
        const { isLockedOut, recordFailedLogin, clearFailedLogins } = await import('../services/sessionSecurity.js');
        const lockoutStatus = isLockedOut(email);

        if (lockoutStatus.locked) {
            const remainingMinutes = Math.ceil((lockoutStatus.lockoutEnds!.getTime() - Date.now()) / 60000);
            throw new AppError(`Too many failed attempts. Try again in ${remainingMinutes} minutes.`, 429);
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user) {
            recordFailedLogin(email);
            throw new AppError('Invalid email or password', 401);
        }

        // Check if user has a password (OAuth users may not have one)
        if (!user.passwordHash) {
            throw new AppError('Please use social login for this account', 400);
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            const lockResult = recordFailedLogin(email);
            if (lockResult.locked) {
                throw new AppError(`Account locked due to too many failed attempts. Try again in 15 minutes.`, 429);
            }
            throw new AppError('Invalid email or password', 401);
        }

        // Successful login - clear failed attempts
        clearFailedLogins(email);

        // Check if 2FA is enabled
        if (user.twoFactorEnabled) {
            // Import 2FA service and create challenge
            const { createTwoFactorChallenge } = await import('../services/twoFactor.js');
            const challengeToken = await createTwoFactorChallenge(user.id);

            // Return challenge response (don't give full token yet)
            res.json({
                requires2FA: true,
                challengeToken,
                userId: user.id,
            });
            return;
        }

        // No 2FA - generate auth token directly
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
                role: user.role, // Include role for admin detection
                createdAt: user.createdAt.toISOString(),
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
        let user;
        try {
            user = await prisma.user.findUnique({
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
                    isGroupOnly: true,
                    primaryCommunityId: true,
                    role: true, // Include role for admin detection
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
        } catch (dbError) {
            console.error('Database error:', dbError);
            throw new AppError('Database unavailable', 503);
        }

        if (!user) {
            throw new AppError('User not found', 404);
        }

        res.json({
            user: {
                ...user,
                followersCount: user._count.followers,
                followingCount: user._count.following,
                postsCount: user._count.posts,
            },
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

// ============================================
// PASSWORD RESET FLOW
// ============================================

const forgotPasswordSchema = z.object({
    email: z.string().email(),
});

const resetPasswordSchema = z.object({
    token: z.string().min(1),
    password: z.string().min(8),
});

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = forgotPasswordSchema.parse(req.body);

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        // Always return success (don't leak whether email exists)
        if (!user) {
            res.json({ message: 'If an account exists with this email, you will receive a password reset link.' });
            return;
        }

        // Generate reset token
        const resetToken = uuid();
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Store reset token in database
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetTokenExpiry,
            },
        });

        // Import and send email
        const { sendPasswordResetEmail } = await import('../services/email.js');
        await sendPasswordResetEmail(user.email, resetToken);

        res.json({ message: 'If an account exists with this email, you will receive a password reset link.' });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
    try {
        const { token, password } = resetPasswordSchema.parse(req.body);

        // Find user by reset token
        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: { gt: new Date() },
            },
        });

        if (!user) {
            throw new AppError('Invalid or expired reset token', 400);
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(password, 12);

        // Update password and clear reset token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                resetToken: null,
                resetTokenExpiry: null,
            },
        });

        // Invalidate all existing sessions for security
        await prisma.session.deleteMany({
            where: { userId: user.id },
        });

        res.json({ message: 'Password reset successfully. Please login with your new password.' });
    } catch (error) {
        next(error);
    }
});

// ============================================
// TWO-FACTOR AUTHENTICATION
// ============================================

const twoFactorSchema = z.object({
    code: z.string().length(6).regex(/^\d+$/),
});

const twoFactorChallengeSchema = z.object({
    challengeToken: z.string().min(1),
    code: z.string().min(1), // Can be 6-digit or backup code
    rememberMe: z.boolean().optional().default(true),
});

// POST /api/v1/auth/2fa/setup - Start 2FA setup
router.post('/2fa/setup', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { generateTOTPSecret } = await import('../services/twoFactor.js');
        const result = await generateTOTPSecret(req.userId!);

        res.json({
            secret: result.secret,
            otpauthUrl: result.otpauthUrl,
            message: 'Scan the QR code with your authenticator app, then verify with a code.',
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/auth/2fa/verify - Verify and enable 2FA
router.post('/2fa/verify', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { code } = twoFactorSchema.parse(req.body);
        const { verifyAndEnable2FA } = await import('../services/twoFactor.js');

        const result = await verifyAndEnable2FA(req.userId!, code);

        if (!result.success) {
            throw new AppError('Invalid verification code. Please try again.', 400);
        }

        res.json({
            success: true,
            backupCodes: result.backupCodes,
            message: '2FA enabled successfully. Save your backup codes securely!',
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/auth/2fa/challenge - Complete login with 2FA
router.post('/2fa/challenge', async (req, res, next) => {
    try {
        const { challengeToken, code, rememberMe } = twoFactorChallengeSchema.parse(req.body);

        const { verifyTwoFactorChallenge, verifyTOTPCode, useBackupCode } = await import('../services/twoFactor.js');

        // Verify challenge token and get user ID
        const userId = await verifyTwoFactorChallenge(challengeToken);

        if (!userId) {
            throw new AppError('Invalid or expired challenge. Please login again.', 401);
        }

        // Try TOTP code first, then backup code
        const normalizedCode = code.replace(/\s/g, '');
        let isValid = false;

        if (/^\d{6}$/.test(normalizedCode)) {
            // Looks like a TOTP code
            isValid = await verifyTOTPCode(userId, normalizedCode);
        }

        if (!isValid) {
            // Try as backup code
            isValid = await useBackupCode(userId, normalizedCode);
        }

        if (!isValid) {
            throw new AppError('Invalid verification code.', 401);
        }

        // 2FA verified - generate full auth token
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        const { token, expiresAt } = await generateTokens(userId, {
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
                createdAt: user.createdAt.toISOString(),
            },
            token,
            expiresAt,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/auth/2fa/disable - Disable 2FA
router.post('/2fa/disable', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { code } = twoFactorSchema.parse(req.body);
        const { disable2FA } = await import('../services/twoFactor.js');

        const success = await disable2FA(req.userId!, code);

        if (!success) {
            throw new AppError('Invalid verification code.', 400);
        }

        res.json({
            success: true,
            message: '2FA has been disabled.',
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/auth/2fa/backup-codes - Regenerate backup codes
router.post('/2fa/backup-codes', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { code } = twoFactorSchema.parse(req.body);
        const { regenerateBackupCodes } = await import('../services/twoFactor.js');

        const backupCodes = await regenerateBackupCodes(req.userId!, code);

        if (!backupCodes) {
            throw new AppError('Invalid verification code.', 400);
        }

        res.json({
            backupCodes,
            message: 'New backup codes generated. Your old codes are no longer valid.',
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/auth/2fa/status - Check 2FA status
router.get('/2fa/status', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { is2FAEnabled, getBackupCodesCount } = await import('../services/twoFactor.js');

        const enabled = await is2FAEnabled(req.userId!);
        const backupCodesRemaining = enabled ? await getBackupCodesCount(req.userId!) : 0;

        res.json({
            enabled,
            backupCodesRemaining,
        });
    } catch (error) {
        next(error);
    }
});

export { router as authRouter };

