import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { prisma } from '../db/client.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { rateLimiters } from '../middleware/rateLimit.js';
import { logger } from '../utils/logger.js';
import { validatePassword } from '../utils/security.js';
import { encryptField } from '../services/encryption.js';
import { hashValue } from '../services/encryption.js';
import { trackSignup, trackFailedLogin, trackPasswordReset, checkGeoAnomaly, trackUserAgent } from '../services/securityMonitor.js';
import { generateFingerprint } from '../services/sessionSecurity.js';
import { logSecurityEvent, SecurityEvents, getClientIP } from '../services/security.js';
import { getGeoFromIP } from '../services/geoblock.js';
import { checkForEvasion } from '../services/evasionDetection.js';
import { recordSignupTime } from '../services/botDetection.js';
import { sendAlert } from '../services/alerting.js';
import { evaluatePromotion } from '../services/trustService.js';

// Apple JWKS endpoint for verifying Apple Sign-In tokens
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

const router = Router();

// Validation schemas
const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
    displayName: z.string().min(1).max(50).optional(),
    groupOnly: z.boolean().optional(),
    primaryCommunityId: z.string().optional(),
    accessCode: z.string().optional(),
});

const earlyAccessSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    reason: z.string().min(20).max(2000),
    role: z.string().max(100).optional(),
    socialUrl: z.string().url().optional().or(z.literal('')),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
    rememberMe: z.boolean().optional().default(true),
});

const checkUsernameSchema = z.object({
    username: z.string().min(3).max(30),
});

const unlockSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

const accessCodeSchema = z.object({
    code: z.string().optional(),
    type: z.string().optional(),
    maxUses: z.number().int().positive().optional(),
    expiresAt: z.string().nullable().optional(),
});

// Helper to generate tokens
const generateTokens = async (
    userId: string,
    deviceInfo?: { type?: string; name?: string; ip?: string; fingerprint?: string },
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
            fingerprint: deviceInfo?.fingerprint,
            expiresAt,
        },
    });

    const token = jwt.sign(
        { userId, sessionId },
        process.env.JWT_SECRET!,
        { algorithm: 'HS256', expiresIn: rememberMe ? '7d' : '24h' }
    );

    return { token, expiresAt };
};

// POST /api/v1/auth/early-access – Submit early access request
router.post('/early-access', async (req, res, next) => {
    try {
        const data = earlyAccessSchema.parse(req.body);

        // Check if already submitted
        const existing = await prisma.earlyAccessRequest.findUnique({
            where: { email: data.email.toLowerCase() },
        });
        if (existing) {
            if (existing.status === 'approved' && existing.accessCode) {
                return res.json({ message: 'You have already been approved! Check your email for your access code.', status: 'approved' });
            }
            return res.json({ message: 'Your application is already under review. We will be in touch soon.', status: existing.status });
        }

        await prisma.earlyAccessRequest.create({
            data: {
                name: data.name,
                email: data.email.toLowerCase(),
                reason: data.reason,
                role: data.role || null,
                socialUrl: data.socialUrl || null,
            },
        });

        res.status(201).json({ message: 'Thank you for your interest! We will review your application and be in touch soon.', status: 'submitted' });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/auth/validate-code – Check if an access code is valid
router.post('/validate-code', async (req, res, next) => {
    try {
        const { code } = req.body;
        if (!code) throw new AppError('Access code is required', 400);

        const accessCode = await prisma.accessCode.findUnique({ where: { code: code.trim().toUpperCase() } });
        if (!accessCode || !accessCode.isActive) {
            return res.json({ valid: false, message: 'Invalid access code.' });
        }
        if (accessCode.expiresAt && accessCode.expiresAt < new Date()) {
            return res.json({ valid: false, message: 'This access code has expired.' });
        }
        if (accessCode.maxUses > 0 && accessCode.useCount >= accessCode.maxUses) {
            return res.json({ valid: false, message: 'This access code has reached its usage limit.' });
        }

        res.json({ valid: true, message: 'Valid access code.' });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/auth/signup
router.post('/signup', rateLimiters.auth, async (req, res, next) => {
    try {
        const { email, password, username, displayName, groupOnly, primaryCommunityId, accessCode } = signupSchema.parse(req.body);

        // Security: check for bot signup patterns
        const signupCheck = await trackSignup(req.ip || '0.0.0.0');
        if (!signupCheck.allowed) {
            throw new AppError('Too many signup attempts. Please try again later.', 429);
        }

        // Validate access code (optional — track usage if provided)
        let codeRecord: any = null;
        if (accessCode) {
            codeRecord = await prisma.accessCode.findUnique({ where: { code: accessCode.trim().toUpperCase() } });
            // If code is provided but invalid, just ignore it — don't block signup
        }

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

        // Enforce password complexity
        const passwordCheck = validatePassword(password);
        if (!passwordCheck.valid) {
            throw new AppError(`Password too weak: ${passwordCheck.errors.join(', ')}`, 400);
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

        // Increment access code usage (if a valid code was provided)
        if (codeRecord?.id && codeRecord.isActive) {
            await prisma.accessCode.update({
                where: { id: codeRecord.id },
                data: { useCount: { increment: 1 } },
            }).catch((err) => logger.warn('Non-critical operation failed:', { error: err?.message || err })); // non-blocking
        }

        // ── Founding Creator auto-elevation ──
        // If the access code is a founding_creator code, auto-create CreatorProfile and elevate trust
        const isFoundingCreator = codeRecord?.type === 'founding_creator' && codeRecord.isActive;
        if (isFoundingCreator) {
            const { default: crypto } = await import('crypto');
            const referralCode = `FC${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

            await prisma.creatorProfile.create({
                data: {
                    userId: user.id,
                    tier: 'partner',
                    status: 'active',
                    hasVerifiedBadge: true,
                    hasPrioritySupport: true,
                    referralCode,
                    earlyAccessSlots: 50,
                    agreedToTerms: true,
                    agreedAt: new Date(),
                },
            }).catch((err) => logger.warn('[Auth] Founding creator profile creation failed:', { error: err?.message || err }));

            // Auto-elevate: skip email verification, max trust, verified badge
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    trustLevel: 3,
                    isVerified: true,
                    emailVerified: true,
                },
            }).catch((err) => logger.warn('[Auth] Founding creator elevation failed:', { error: err?.message || err }));

            logger.info(`[Auth] Founding creator signed up: userId=${user.id}, username=${user.username}`);
        }

        // Generate device fingerprint for session tracking and evasion detection
        const fp = generateFingerprint(req);
        const signupIp = getClientIP(req);

        // Store fingerprint on user record (first device)
        await prisma.user.update({
            where: { id: user.id },
            data: { deviceFingerprint: fp.hash },
        }).catch(() => {}); // non-blocking

        // Record signup time for bot velocity detection
        await recordSignupTime(user.id).catch(() => {});

        // ── Evasion detection: check if this signup correlates with a banned account ──
        const evasionResult = await checkForEvasion({
            fingerprint: fp.hash,
            email: user.email,
            ip: signupIp,
        }).catch(() => null);

        if (evasionResult?.shouldShadowBan) {
            // Silently shadow-ban — account appears to work but content is invisible
            await prisma.user.update({
                where: { id: user.id },
                data: { isShadowBanned: true },
            }).catch(() => {});

            await sendAlert({
                severity: 'HIGH',
                eventType: 'EVASION_DETECTED',
                message: `Ban evasion detected on signup: ${user.username} (${user.email})`,
                details: { signals: evasionResult.signals, confidence: evasionResult.confidence },
                ip: signupIp,
                userId: user.id,
            }).catch(() => {});
        } else if (evasionResult?.evasionDetected) {
            // Low confidence — log but don't shadow-ban
            await sendAlert({
                severity: 'MEDIUM',
                eventType: 'EVASION_SIGNAL',
                message: `Possible evasion signal on signup: ${user.username}`,
                details: { signals: evasionResult.signals, confidence: evasionResult.confidence },
                ip: signupIp,
                userId: user.id,
            }).catch(() => {});
        }

        // Log signup security event
        await logSecurityEvent({
            action: SecurityEvents.SIGNUP_SUCCESS,
            userId: user.id,
            ipAddress: signupIp,
            countryCode: getGeoFromIP(signupIp)?.countryCode || undefined,
            userAgent: req.headers['user-agent'] || '',
            details: { username: user.username, fingerprint: fp.hash },
        }).catch(() => {});

        // Generate auth token
        const { token, expiresAt } = await generateTokens(user.id, {
            type: req.headers['x-device-type'] as string,
            name: req.headers['x-device-name'] as string,
            ip: req.ip,
            fingerprint: fp.hash,
        });

        // === Growth Partner referral tracking (non-blocking) ===
        // Check if the access code was created by a Growth Partner
        if (codeRecord?.createdById) {
            (async () => {
                try {
                    const partnerRecord = await prisma.growthPartner.findUnique({
                        where: { userId: codeRecord.createdById! },
                    });
                    if (partnerRecord) {
                        // Create direct referral
                        await prisma.growthReferral.create({
                            data: {
                                growthPartnerId: partnerRecord.id,
                                referredUserId: user.id,
                                referralLevel: 'direct',
                                status: 'pending',
                                invitedAt: new Date(),
                            },
                        });

                        // Check for second-level: was this partner themselves referred by another partner?
                        const parentReferral = await prisma.growthReferral.findFirst({
                            where: { referredUserId: partnerRecord.userId, status: 'qualified' },
                        });
                        if (parentReferral) {
                            await prisma.growthReferral.create({
                                data: {
                                    growthPartnerId: parentReferral.growthPartnerId,
                                    referredUserId: user.id,
                                    referralLevel: 'second_level',
                                    parentReferralId: parentReferral.id,
                                    status: 'pending',
                                    invitedAt: new Date(),
                                },
                            });
                        }
                    }
                } catch (err) {
                    logger.error('[Auth] Growth referral tracking error:', err);
                }
            })();
        }

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
                    try {
                        for (const admin of admins) {
                            // Admin follows the new user
                            await prisma.follow.create({
                                data: { followerId: admin.id, followingId: user.id },
                            }).catch((err) => logger.warn('Non-critical operation failed:', { error: err?.message || err })); // Ignore if already following

                            // New user follows admin (so their feed isn't empty)
                            await prisma.follow.create({
                                data: { followerId: user.id, followingId: admin.id },
                            }).catch((err) => logger.warn('Non-critical operation failed:', { error: err?.message || err }));
                        }
                    } catch (followErr) {
                        logger.error('[Auth] Auto-follow error (non-blocking):', followErr);
                    }
                }

                // 3. Send a welcome notification to the new user
                const welcomeMessage = isFoundingCreator
                    ? `Welcome to 0G as a Founding Creator, ${user.displayName || user.username}! 🎉 Your account has full access — you can post, go live, message, and invite your community from day one. Thank you for being part of our founding story.`
                    : `Welcome to 0G, ${user.displayName || user.username}! 🎉 You're part of a new kind of social platform — one built on privacy, transparency, and community ownership. Start by creating your first post or exploring what others are sharing.`;
                await prisma.notification.create({
                    data: {
                        userId: user.id,
                        type: 'SYSTEM' as const,
                        message: welcomeMessage,
                    },
                });
            } catch (err) {
                logger.error('[Auth] Post-signup automation error:', err);
            }
        })();

        // Auto-send verification email (non-blocking)
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
            const otp = String(Math.floor(100000 + Math.random() * 900000));
            const { cache: cacheService } = await import('../services/cache/RedisCache.js');
            await cacheService.set(`email_otp:${user.id}`, otp, 300).catch(() => {});
            fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: process.env.EMAIL_FROM || 'noreply@0g.social',
                    to: user.email,
                    subject: 'Verify your 0G account',
                    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;"><h2 style="color:#111827;">Verify your email</h2><p style="color:#6B7280;">Enter this code in the app:</p><div style="background:#F3F4F6;border-radius:12px;padding:24px;text-align:center;margin:24px 0;"><span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#111827;">${otp}</span></div><p style="color:#9CA3AF;font-size:14px;">Expires in 5 minutes.</p></div>`,
                }),
            }).catch(err => logger.error('[Auth] Verification email send failed:', err));
        }

        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                isVerified: isFoundingCreator ? true : user.isVerified,
                emailVerified: isFoundingCreator ? true : false,
                trustLevel: isFoundingCreator ? 3 : 0,
                isFoundingCreator: isFoundingCreator || false,
            },
            token,
            expiresAt,
            requiresEmailVerification: !isFoundingCreator,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/auth/login
router.post('/login', rateLimiters.auth, async (req, res, next) => {
    try {
        const { email, password, rememberMe } = loginSchema.parse(req.body);

        // Check if locked out due to failed attempts
        const { isLockedOut, recordFailedLogin, clearFailedLogins } = await import('../services/sessionSecurity.js');
        const lockoutStatus = await isLockedOut(email);

        if (lockoutStatus.locked) {
            const remainingMinutes = Math.ceil((lockoutStatus.lockoutEnds!.getTime() - Date.now()) / 60000);
            throw new AppError(`Too many failed attempts. Try again in ${remainingMinutes} minutes.`, 429);
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user) {
            await recordFailedLogin(email);
            await trackFailedLogin(req.ip || '0.0.0.0', email);
            throw new AppError('Invalid email or password', 401);
        }

        // Check if account is locked (panic button)
        if (user.isLocked) {
            res.status(423).json({
                error: 'account_locked',
                message: 'This account has been locked for security. Use the unlock flow to recover access.',
                redirect: '/unlock',
            });
            return;
        }

        // Check if user has a password (OAuth users may not have one)
        if (!user.passwordHash) {
            throw new AppError('Please use social login for this account', 400);
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            const lockResult = await recordFailedLogin(email);
            await trackFailedLogin(req.ip || '0.0.0.0', email);
            if (lockResult.locked) {
                throw new AppError(`Account locked due to too many failed attempts. Try again in 15 minutes.`, 429);
            }
            throw new AppError('Invalid email or password', 401);
        }

        // Successful login - clear failed attempts
        await clearFailedLogins(email);

        // ── Security monitoring on successful login ──
        const loginIp = getClientIP(req);
        const loginGeo = getGeoFromIP(loginIp);
        const loginUA = req.headers['user-agent'] || '';

        // Track geo-anomaly (login from new country)
        if (loginGeo?.countryCode) {
            checkGeoAnomaly(user.id, loginIp, loginGeo.countryCode).catch(() => {});
        }

        // Track user-agent diversity (bot detection)
        trackUserAgent(loginIp, loginUA).catch(() => {});

        // Generate device fingerprint
        const loginFp = generateFingerprint(req);

        // Log successful login
        await logSecurityEvent({
            action: SecurityEvents.LOGIN_SUCCESS,
            userId: user.id,
            ipAddress: loginIp,
            countryCode: loginGeo?.countryCode || undefined,
            userAgent: loginUA,
            details: { fingerprint: loginFp.hash },
        }).catch(() => {});

        // ── New device detection ──
        // Check if this fingerprint has been seen in any of the user's previous sessions
        (async () => {
            try {
                const knownSession = await prisma.session.findFirst({
                    where: { userId: user.id, fingerprint: loginFp.hash },
                });

                if (!knownSession) {
                    // This is a new device — notify the user
                    const deviceType = req.headers['x-device-type'] as string || 'Unknown device';
                    const deviceName = req.headers['x-device-name'] as string || loginUA.substring(0, 50);
                    const location = loginGeo?.city
                        ? `${loginGeo.city}, ${loginGeo.countryCode}`
                        : loginGeo?.countryCode || 'Unknown location';
                    const loginTime = new Date().toLocaleString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                        hour: 'numeric', minute: '2-digit', hour12: true,
                    });

                    // 1. In-app notification
                    await prisma.notification.create({
                        data: {
                            userId: user.id,
                            type: 'SYSTEM',
                            message: `New login from ${deviceType} in ${location} at ${loginTime}. If this wasn't you, go to Settings > Security to secure your account.`,
                        },
                    });

                    // 2. Push notification (non-blocking)
                    try {
                        const { sendPushNotification } = await import('../services/notifications/ExpoPushService.js');
                        await sendPushNotification(
                            user.id,
                            'New device login',
                            `Someone logged into your account from ${location}. Was this you?`,
                            { type: 'security_alert', screen: '/settings/security' },
                        );
                    } catch {
                        // Push not configured or failed — that's fine
                    }

                    // 3. Email notification (non-blocking)
                    const resendKey = process.env.RESEND_API_KEY;
                    if (resendKey) {
                        fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                from: process.env.EMAIL_FROM || 'security@0g.social',
                                to: user.email,
                                subject: 'New login to your 0G account',
                                html: `
                                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
                                        <h2 style="color:#111827;margin-bottom:8px;">New device login</h2>
                                        <p style="color:#6B7280;font-size:16px;">We noticed a login to your account from a new device:</p>
                                        <div style="background:#F3F4F6;border-radius:12px;padding:20px;margin:20px 0;">
                                            <p style="margin:4px 0;color:#374151;"><strong>Device:</strong> ${deviceName}</p>
                                            <p style="margin:4px 0;color:#374151;"><strong>Location:</strong> ${location}</p>
                                            <p style="margin:4px 0;color:#374151;"><strong>Time:</strong> ${loginTime}</p>
                                            <p style="margin:4px 0;color:#374151;"><strong>IP:</strong> ${loginIp}</p>
                                        </div>
                                        <p style="color:#6B7280;font-size:14px;">If this was you, no action is needed.</p>
                                        <p style="color:#EF4444;font-size:14px;font-weight:600;">If this wasn't you, open the app and go to Settings > Security to review your active sessions and secure your account.</p>
                                    </div>
                                `,
                            }),
                        }).catch(err => logger.error('[Auth] New device email failed:', err));
                    }

                    logger.info(`[Auth] New device login for user ${user.id} from ${location} (${loginFp.hash})`);
                }
            } catch (err) {
                logger.error('[Auth] New device detection error (non-blocking):', err);
            }
        })();

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
            fingerprint: loginFp.hash,
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
                onboardingComplete: user.onboardingComplete,
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
            }).catch((err) => logger.warn('Non-critical operation failed:', { error: err?.message || err }));
        }

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
});

// ============================================
// SESSION MANAGEMENT
// ============================================

// GET /api/v1/auth/sessions — List all active sessions for the current user
router.get('/sessions', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const sessions = await prisma.session.findMany({
            where: {
                userId: req.userId!,
                expiresAt: { gt: new Date() },
            },
            select: {
                id: true,
                deviceType: true,
                deviceName: true,
                ipAddress: true,
                fingerprint: true,
                createdAt: true,
                expiresAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        // Determine which session is the current one
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];
        let currentSessionId: string | null = null;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sessionId: string };
                currentSessionId = decoded.sessionId;
            } catch {
                // Token decode failed — not critical
            }
        }

        const enriched = sessions.map(s => ({
            id: s.id,
            deviceType: s.deviceType || 'Unknown',
            deviceName: s.deviceName || 'Unknown device',
            ipAddress: s.ipAddress ? s.ipAddress.substring(0, 3) + '***' : null, // Partially mask IP
            createdAt: s.createdAt.toISOString(),
            expiresAt: s.expiresAt.toISOString(),
            isCurrent: s.id === currentSessionId,
        }));

        res.json({ sessions: enriched, count: enriched.length });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/auth/sessions/:sessionId — Revoke a specific session
router.delete('/sessions/:sessionId', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { sessionId } = req.params;

        // Verify the session belongs to this user
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            select: { userId: true },
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (session.userId !== req.userId) {
            return res.status(403).json({ error: 'You can only revoke your own sessions' });
        }

        // Don't allow revoking the current session (use logout for that)
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sessionId: string };
                if (decoded.sessionId === sessionId) {
                    return res.status(400).json({ error: 'Use logout to end your current session' });
                }
            } catch {
                // Token decode failed — allow the revocation
            }
        }

        await prisma.session.delete({ where: { id: sessionId } });

        await logSecurityEvent({
            action: 'SESSION_REVOKED',
            userId: req.userId,
            ipAddress: getClientIP(req),
            details: { revokedSessionId: sessionId },
            severity: 'LOW',
        }).catch(() => {});

        res.json({ message: 'Session revoked successfully' });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/auth/sessions — Revoke ALL other sessions (panic button)
router.delete('/sessions', authenticate, async (req: AuthRequest, res, next) => {
    try {
        // Get current session ID so we don't revoke it
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];
        let currentSessionId: string | null = null;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sessionId: string };
                currentSessionId = decoded.sessionId;
            } catch {
                // If we can't decode, revoke everything
            }
        }

        const result = await prisma.session.deleteMany({
            where: {
                userId: req.userId!,
                ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
            },
        });

        await logSecurityEvent({
            action: 'ALL_SESSIONS_REVOKED',
            userId: req.userId,
            ipAddress: getClientIP(req),
            details: { revokedCount: result.count },
            severity: 'MEDIUM',
        }).catch(() => {});

        res.json({ message: `${result.count} session(s) revoked`, count: result.count });
    } catch (error) {
        next(error);
    }
});

// ============================================
// EMAIL VERIFICATION
// ============================================

// POST /api/v1/auth/send-verification-email
router.post('/send-verification-email', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { id: true, email: true, emailVerified: true },
        });

        if (!user) throw new AppError('User not found', 404);
        if (user.emailVerified) {
            return res.json({ message: 'Email already verified', alreadyVerified: true });
        }

        // Rate limit: max 3 OTP sends per email per hour
        const { cache } = await import('../services/cache/RedisCache.js');
        const rateLimitKey = `email_otp_rate:${user.email}`;
        const sendCount = await cache.increment(rateLimitKey, 3600);
        if (sendCount > 3) {
            throw new AppError('Too many verification emails sent. Please try again in an hour.', 429);
        }

        // Generate 6-digit OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const otpKey = `email_otp:${user.id}`;
        await cache.set(otpKey, otp, 300); // 5-minute TTL

        // Send email via Resend (if configured)
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: process.env.EMAIL_FROM || 'noreply@0g.social',
                    to: user.email,
                    subject: 'Verify your 0G account',
                    html: `
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                            <h2 style="color: #111827; margin-bottom: 8px;">Verify your email</h2>
                            <p style="color: #6B7280; font-size: 16px;">Enter this code in the app to verify your account:</p>
                            <div style="background: #F3F4F6; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #111827;">${otp}</span>
                            </div>
                            <p style="color: #9CA3AF; font-size: 14px;">This code expires in 5 minutes. If you didn't create an account, you can ignore this email.</p>
                        </div>
                    `,
                }),
            }).catch(err => logger.error('[Auth] Failed to send verification email:', err));
        } else {
            logger.warn('[Auth] RESEND_API_KEY not configured. OTP for dev:', { otp, userId: user.id });
        }

        res.json({ message: 'Verification code sent', sent: true });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/auth/verify-email
router.post('/verify-email', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { code } = req.body;
        if (!code || typeof code !== 'string' || code.length !== 6) {
            throw new AppError('Please enter a valid 6-digit code', 400);
        }

        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { id: true, emailVerified: true },
        });

        if (!user) throw new AppError('User not found', 404);
        if (user.emailVerified) {
            return res.json({ verified: true, message: 'Email already verified' });
        }

        // Check OTP from Redis
        const { cache } = await import('../services/cache/RedisCache.js');
        const otpKey = `email_otp:${user.id}`;
        const storedOtp = await cache.get<string>(otpKey);

        if (!storedOtp) {
            throw new AppError('Verification code expired. Please request a new one.', 400);
        }

        if (storedOtp !== code.trim()) {
            throw new AppError('Invalid verification code. Please try again.', 400);
        }

        // Mark email as verified and promote trust level
        await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true, trustLevel: 1 },
        });

        // Clean up OTP
        await cache.delete(otpKey).catch(() => {});

        // Evaluate if user qualifies for further promotion
        await evaluatePromotion(user.id).catch(() => {});

        res.json({ verified: true, message: 'Email verified successfully' });
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
                    // Privacy-first fields
                    communityOptIn: true,
                    activeFeedView: true,
                    usePublicProfile: true,
                    publicDisplayName: true,
                    publicUsername: true,
                    publicAvatarUrl: true,
                    publicBio: true,
                    // Onboarding
                    onboardingComplete: true,
                    // Security & Trust
                    emailVerified: true,
                    trustLevel: true,
                    // Cultural profile
                    culturalProfile: true,
                    customGreeting: true,
                    growthPartner: { select: { id: true, status: true, tier: true } },
                    _count: {
                        select: {
                            followers: true,
                            following: true,
                            posts: true,
                            interests: true,
                        },
                    },
                },
            });
        } catch (dbError) {
            logger.error('Database error:', dbError);
            throw new AppError('Database unavailable', 503);
        }

        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Growth partner: 'active' or 'invited' both grant access to the module
        const gpStatus = user.growthPartner?.status;
        const isGrowthPartner = gpStatus === 'active' || gpStatus === 'invited';

        // Infer onboarding completion for existing users who haven't been flagged yet
        // If they have interests or posts, they clearly completed onboarding before the flag existed
        const inferredOnboarding = user.onboardingComplete ||
            user._count.interests > 0 ||
            user._count.posts > 0;

        // Auto-fix: if inferred but not flagged, update the DB (fire-and-forget)
        if (inferredOnboarding && !user.onboardingComplete) {
            prisma.user.update({
                where: { id: user.id },
                data: { onboardingComplete: true },
            }).catch((err) => logger.warn('Non-critical operation failed:', { error: err?.message || err }));
        }

        res.json({
            user: {
                ...user,
                growthPartner: undefined, // Don't leak raw relation data
                isGrowthPartner,
                growthPartnerTier: isGrowthPartner ? user.growthPartner!.tier : undefined,
                onboardingComplete: inferredOnboarding,
                followersCount: user._count.followers,
                followingCount: user._count.following,
                postsCount: user._count.posts,
            },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/auth/onboarding-complete — Mark onboarding as done
router.post('/onboarding-complete', authenticate, async (req: AuthRequest, res, next) => {
    try {
        await prisma.user.update({
            where: { id: req.userId },
            data: { onboardingComplete: true },
        });
        res.json({ success: true });
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
            }).catch((err) => logger.warn('Non-critical operation failed:', { error: err?.message || err }));
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
    idToken: z.string().optional(),
    accessToken: z.string().optional(),
    userInfo: z.object({
        email: z.string().email(),
        name: z.string().optional(),
        picture: z.string().optional(),
        sub: z.string().optional(),
    }).optional(),
});

// Import Google Auth Library at the top of the file dynamically
router.post('/google', async (req, res, next) => {
    try {
        const { idToken, accessToken, userInfo } = googleAuthSchema.parse(req.body);

        if (!idToken && !accessToken) {
            throw new AppError('Either idToken or accessToken is required', 400);
        }

        let email: string;
        let name: string | undefined;
        let picture: string | undefined;
        let googleId: string;

        const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

        if (!GOOGLE_CLIENT_ID) {
            throw new AppError(
                'Google OAuth is not configured. Set GOOGLE_CLIENT_ID in environment variables.',
                503
            );
        }

        if (idToken) {
            // Path 1: Verify ID token cryptographically
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
                if (verifyError instanceof AppError) throw verifyError;
                logger.error('Google ID token verification failed:', verifyError);
                throw new AppError('Invalid or expired Google token', 401);
            }
        } else if (accessToken) {
            // Path 2: Verify access token by calling Google's userinfo API
            try {
                const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });

                if (!googleRes.ok) {
                    throw new AppError('Invalid Google access token', 401);
                }

                const googleUser = await googleRes.json();

                if (!googleUser.email) {
                    // Fall back to provided userInfo
                    if (userInfo?.email) {
                        email = userInfo.email;
                        name = userInfo.name;
                        picture = userInfo.picture;
                        googleId = userInfo.sub || `google_${Date.now()}`;
                    } else {
                        throw new AppError('Could not get email from Google', 400);
                    }
                } else {
                    email = googleUser.email;
                    name = googleUser.name;
                    picture = googleUser.picture;
                    googleId = googleUser.sub || `google_${Date.now()}`;
                }
            } catch (fetchError) {
                if (fetchError instanceof AppError) throw fetchError;
                logger.error('Google userinfo fetch failed:', fetchError);
                throw new AppError('Failed to verify Google access token', 401);
            }
        } else {
            throw new AppError('No valid Google token provided', 400);
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
                        accessToken: accessToken ? encryptField(accessToken) : null,
                        refreshToken: null, // Refresh token not available in this flow
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
                            accessToken: accessToken ? encryptField(accessToken) : null,
                            refreshToken: null, // Refresh token not available in this flow
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
// POST /api/v1/auth/apple - Handle Apple Sign In
// ============================================
const appleAuthSchema = z.object({
    identityToken: z.string(),
    displayName: z.string().optional(),
});

router.post('/apple', rateLimiters.auth, async (req, res, next) => {
    try {
        const { identityToken, displayName } = appleAuthSchema.parse(req.body);

        // Verify the Apple identity token cryptographically
        // This validates the JWT signature against Apple's public keys (JWKS)
        let payload: { sub: string; email?: string; email_verified?: string | boolean };
        try {
            const { payload: verified } = await jwtVerify(identityToken, APPLE_JWKS, {
                issuer: 'https://appleid.apple.com',
                audience: process.env.APPLE_CLIENT_ID || 'com.zerog.social',
            });
            payload = verified as { sub: string; email?: string; email_verified?: string | boolean };
        } catch (jwtError) {
            logger.warn('Apple JWT verification failed', { error: (jwtError as Error).message });
            throw new AppError('Invalid or expired Apple identity token', 401);
        }

        if (!payload.sub) {
            throw new AppError('Apple token missing subject identifier', 400);
        }

        const appleId = payload.sub;
        const email = payload.email;

        // Look up existing OAuth account
        let oauthAccount = await prisma.oAuthAccount.findUnique({
            where: { provider_providerId: { provider: 'apple', providerId: appleId } },
            include: { user: true },
        });

        let user;

        if (oauthAccount) {
            // Existing Apple user — log them in
            user = oauthAccount.user;
        } else if (email) {
            // Check if a user exists with this email
            user = await prisma.user.findUnique({
                where: { email: email.toLowerCase() },
            });

            if (user) {
                // Link Apple account to existing user
                await prisma.oAuthAccount.create({
                    data: {
                        userId: user.id,
                        provider: 'apple',
                        providerId: appleId,
                        accessToken: null, // Apple doesn't provide access tokens in this flow
                        refreshToken: null,
                    },
                });
            } else {
                // Create new user from Apple profile
                const username = (email.split('@')[0] || 'user')
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, '')
                    .substring(0, 20) +
                    Math.random().toString(36).substring(2, 6);

                user = await prisma.user.create({
                    data: {
                        email: email.toLowerCase(),
                        username,
                        displayName: displayName || email.split('@')[0],
                        isVerified: true, // Apple accounts are pre-verified
                        oauthAccounts: {
                            create: {
                                provider: 'apple',
                                providerId: appleId,
                                accessToken: null, // Apple doesn't provide access tokens in this flow
                                refreshToken: null,
                            },
                        },
                    },
                });
            }
        } else {
            // No email provided (user chose "Hide My Email" and first sign-in)
            // Create user with Apple sub as identifier
            const username = 'apple_' + Math.random().toString(36).substring(2, 10);
            user = await prisma.user.create({
                data: {
                    email: `${appleId}@privaterelay.appleid.com`,
                    username,
                    displayName: displayName || 'Apple User',
                    isVerified: true,
                    oauthAccounts: {
                        create: {
                            provider: 'apple',
                            providerId: appleId,
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
            isNewUser: !user.bio,
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
router.post('/forgot-password', rateLimiters.auth, async (req, res, next) => {
    try {
        const { email } = forgotPasswordSchema.parse(req.body);

        const resetCheck = await trackPasswordReset(req.ip || '0.0.0.0');
        if (!resetCheck.allowed) {
            throw new AppError('Too many reset requests. Please try again later.', 429);
        }

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
        const hashedToken = hashValue(resetToken);
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Store HASHED reset token in database
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: hashedToken,
                resetTokenExpiry,
            },
        });

        // Import and send email with UNHASHED token
        const { sendPasswordResetEmail } = await import('../services/email.js');
        await sendPasswordResetEmail(user.email, resetToken);

        res.json({ message: 'If an account exists with this email, you will receive a password reset link.' });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', rateLimiters.auth, async (req, res, next) => {
    try {
        const { token, password } = resetPasswordSchema.parse(req.body);

        // Hash the incoming token before comparing
        const hashedToken = hashValue(token);

        // Find user by hashed reset token
        const user = await prisma.user.findFirst({
            where: {
                resetToken: hashedToken,
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

// ============================================
// ADMIN: EARLY ACCESS MANAGEMENT
// ============================================

// Admin guard middleware
const requireAdmin = (req: AuthRequest, res: any, next: any) => {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// GET /api/v1/auth/admin/early-access - List all requests
router.get('/admin/early-access', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const status = req.query.status as string || undefined;
        const requests = await prisma.earlyAccessRequest.findMany({
            where: status ? { status } : undefined,
            orderBy: { createdAt: 'desc' },
        });
        res.json(requests);
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/auth/admin/early-access/:id/approve - Approve request & generate code
router.post('/admin/early-access/:id/approve', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const { id } = req.params;
        const request = await prisma.earlyAccessRequest.findUnique({ where: { id } });
        if (!request) throw new AppError('Request not found', 404);
        if (request.status === 'approved') throw new AppError('Already approved', 400);

        // Generate unique access code
        const code = `EA${Date.now().toString(36).toUpperCase().slice(-4)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

        // Create the access code record
        await prisma.accessCode.create({
            data: { code, type: 'early_access', maxUses: 1, createdById: req.userId },
        });

        // Update the request
        const updated = await prisma.earlyAccessRequest.update({
            where: { id },
            data: { status: 'approved', accessCode: code, reviewedAt: new Date() },
        });

        res.json({ ...updated, generatedCode: code });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/auth/admin/early-access/:id/reject - Reject request
router.post('/admin/early-access/:id/reject', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const { id } = req.params;
        const updated = await prisma.earlyAccessRequest.update({
            where: { id },
            data: { status: 'rejected', reviewedAt: new Date() },
        });
        res.json(updated);
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/auth/admin/access-codes - Create manual access codes
router.post('/admin/access-codes', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const { code, type, maxUses, expiresAt } = accessCodeSchema.parse(req.body);
        const finalCode = (code || `MAN${Date.now().toString(36).toUpperCase().slice(-4)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`).toUpperCase();

        const accessCode = await prisma.accessCode.create({
            data: {
                code: finalCode,
                type: type || 'early_access',
                maxUses: maxUses || 1,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                createdById: req.userId,
            },
        });
        res.status(201).json(accessCode);
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/auth/admin/access-codes - List all access codes
router.get('/admin/access-codes', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const codes = await prisma.accessCode.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json(codes);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/v1/auth/admin/access-codes/:id - Deactivate access code
router.delete('/admin/access-codes/:id', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        await prisma.accessCode.update({
            where: { id: req.params.id },
            data: { isActive: false },
        });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// ============================================
// PROVISIONAL ACCOUNT SYSTEM
// ============================================

// POST /api/v1/auth/provisional-signup — Create a lightweight provisional account
router.post('/provisional-signup', async (req, res, next) => {
    try {
        const { username, displayName, inviteCode, communityId } = req.body;

        if (!username || username.length < 3 || username.length > 30) {
            throw new AppError('Username must be between 3 and 30 characters.', 400);
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            throw new AppError('Username can only contain letters, numbers, and underscores.', 400);
        }

        // Check username uniqueness
        const existing = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
        if (existing) {
            throw new AppError('Username already taken.', 409);
        }

        // Validate invite code if provided
        let invite: any = null;
        let inviterId: string | null = null;
        if (inviteCode) {
            invite = await prisma.invite.findUnique({ where: { referralCode: inviteCode } });
            if (invite) {
                inviterId = invite.senderId;
            }
        }

        // Resolve community - from invite context or explicit param
        let targetCommunityId = communityId || null;

        // Create provisional user with placeholder email
        const placeholderEmail = `provisional_${uuid()}@0g.internal`;
        const user = await prisma.user.create({
            data: {
                email: placeholderEmail,
                username: username.toLowerCase(),
                displayName: displayName || username,
                isProvisional: true,
                provisionedAt: new Date(),
                invitedToCommunityId: targetCommunityId,
                invitedById: inviterId,
                isGroupOnly: !!targetCommunityId,
                primaryCommunityId: targetCommunityId,
            },
        });

        // Auto-join the community if provided
        if (targetCommunityId) {
            try {
                await prisma.communityMember.create({
                    data: {
                        userId: user.id,
                        communityId: targetCommunityId,
                        role: 'MEMBER',
                    },
                });
                // Increment member count
                await prisma.community.update({
                    where: { id: targetCommunityId },
                    data: { memberCount: { increment: 1 } },
                });
            } catch (err) {
                logger.warn('Non-critical operation failed:', { error: (err as Error)?.message || err });
            }
        }

        // Link invite to user
        if (invite) {
            await prisma.invite.update({
                where: { id: invite.id },
                data: {
                    status: 'JOINED',
                    joinedAt: new Date(),
                    joinedUserId: user.id,
                },
            }).catch((err) => logger.warn('Non-critical operation failed:', { error: err?.message || err }));

            // Auto-follow the inviter
            if (inviterId) {
                await prisma.follow.create({
                    data: { followerId: user.id, followingId: inviterId },
                }).catch((err) => logger.warn('Non-critical operation failed:', { error: err?.message || err }));
                await prisma.follow.create({
                    data: { followerId: inviterId, followingId: user.id },
                }).catch((err) => logger.warn('Non-critical operation failed:', { error: err?.message || err }));
            }
        }

        // === Growth Partner referral tracking (non-blocking) ===
        if (inviterId) {
            (async () => {
                try {
                    const partnerRecord = await prisma.growthPartner.findUnique({
                        where: { userId: inviterId },
                    });
                    if (partnerRecord) {
                        // Create direct referral
                        await prisma.growthReferral.create({
                            data: {
                                growthPartnerId: partnerRecord.id,
                                referredUserId: user.id,
                                referralLevel: 'direct',
                                status: 'pending',
                                invitedAt: new Date(),
                            },
                        });

                        // Check for second-level referral
                        const parentReferral = await prisma.growthReferral.findFirst({
                            where: { referredUserId: partnerRecord.userId, status: 'qualified' },
                        });
                        if (parentReferral) {
                            await prisma.growthReferral.create({
                                data: {
                                    growthPartnerId: parentReferral.growthPartnerId,
                                    referredUserId: user.id,
                                    referralLevel: 'second_level',
                                    parentReferralId: parentReferral.id,
                                    status: 'pending',
                                    invitedAt: new Date(),
                                },
                            });
                        }
                    }
                } catch (err) {
                    logger.error('[Auth] Provisional growth referral tracking error:', err);
                }
            })();
        }

        // Generate a short-lived session token (7 days for provisional)
        const { token, expiresAt } = await generateTokens(user.id, {
            type: req.headers['x-device-type'] as string,
            name: req.headers['x-device-name'] as string,
            ip: req.ip,
        }, false);

        res.status(201).json({
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                isProvisional: true,
            },
            token,
            expiresAt,
            communityId: targetCommunityId,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/auth/complete-signup — Upgrade provisional account to full account
router.post('/complete-signup', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const completeSignupSchema = z.object({
            email: z.string().email('Invalid email format.'),
            password: z.string().min(8, 'Password must be at least 8 characters.'),
        });
        const { email, password } = completeSignupSchema.parse(req.body);

        // Check current user is provisional
        const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
        if (!currentUser) {
            throw new AppError('User not found.', 404);
        }
        if (!currentUser.isProvisional) {
            throw new AppError('Account is already fully registered.', 400);
        }

        // Check if email is already taken by a real user
        const emailTaken = await prisma.user.findFirst({
            where: {
                email: email.toLowerCase(),
                NOT: { id: req.user!.id },
            },
        });
        if (emailTaken) {
            throw new AppError('Email already registered.', 409);
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Upgrade the account
        const updatedUser = await prisma.user.update({
            where: { id: req.user!.id },
            data: {
                email: email.toLowerCase(),
                passwordHash,
                isProvisional: false,
            },
        });

        // Post-signup automation (non-blocking)
        (async () => {
            try {
                // Notify admins about upgrade
                const admins = await prisma.user.findMany({
                    where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
                    select: { id: true },
                });
                if (admins.length > 0) {
                    await prisma.notification.createMany({
                        data: admins.map((admin) => ({
                            userId: admin.id,
                            type: 'SYSTEM' as const,
                            actorId: updatedUser.id,
                            message: `Provisional member completed signup: ${updatedUser.displayName} (@${updatedUser.username})`,
                        })),
                    });
                }
                // Welcome notification
                await prisma.notification.create({
                    data: {
                        userId: updatedUser.id,
                        type: 'SYSTEM' as const,
                        message: `Welcome to 0G, ${updatedUser.displayName}! Your account is now fully set up. Explore communities, share content, and connect with people who matter to you.`,
                    },
                });
            } catch (err) {
                logger.error('[Auth] Complete-signup automation error:', err);
            }
        })();

        // Generate new full-scope token
        const { token, expiresAt } = await generateTokens(updatedUser.id, {
            type: req.headers['x-device-type'] as string,
            name: req.headers['x-device-name'] as string,
            ip: req.ip,
        }, true);

        res.json({
            success: true,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                username: updatedUser.username,
                displayName: updatedUser.displayName,
                isProvisional: false,
            },
            token,
            expiresAt,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/auth/validate-invite — Public endpoint to validate invite and get sender info
router.post('/validate-invite', async (req, res, next) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'Invite code required.' });
        }

        const invite = await prisma.invite.findUnique({
            where: { referralCode: code },
            include: {
                sender: {
                    select: {
                        id: true,
                        displayName: true,
                        username: true,
                        avatarUrl: true,
                        coverUrl: true,
                    },
                },
            },
        });

        if (!invite || invite.status === 'JOINED') {
            return res.status(404).json({ error: 'Invalid or used invite code.' });
        }

        // Check if the sender has a primary community to invite into
        let community: any = null;
        const sender = invite.sender;
        if (sender) {
            // Find the first community this user administers
            const membership = await prisma.communityMember.findFirst({
                where: {
                    userId: sender.id,
                    role: { in: ['ADMIN', 'MODERATOR'] },
                },
                include: {
                    community: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            avatarUrl: true,
                            coverUrl: true,
                            description: true,
                            memberCount: true,
                        },
                    },
                },
            });
            if (membership) {
                community = membership.community;
            }
        }

        // Mark as opened
        if (invite.status === 'SENT' || invite.status === 'NOT_SENT') {
            await prisma.invite.update({
                where: { id: invite.id },
                data: { status: 'OPENED', openedAt: new Date() },
            }).catch((err) => logger.warn('Non-critical operation failed:', { error: err?.message || err }));
        }

        res.json({
            valid: true,
            sender: invite.sender,
            community,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// PANIC BUTTON - Emergency Account Lockdown
// ============================================
router.post('/panic', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const userId = req.user!.id;

        // Lock the account immediately
        await prisma.user.update({
            where: { id: userId },
            data: {
                isLocked: true,
                lockedAt: new Date(),
                lockReason: 'panic',
            },
        });

        // Invalidate ALL active sessions for this user
        await prisma.session.deleteMany({
            where: { userId },
        });

        res.json({
            success: true,
            message: 'Emergency lockdown activated. Your account is locked and all sessions have been terminated. Contact support to recover your account.',
            locked: true,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// UNLOCK ACCOUNT (after panic)
// ============================================
router.post('/unlock', rateLimiters.auth, async (req, res, next) => {
    try {
        const { email, password } = unlockSchema.parse(req.body);

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) {
            res.status(401).json({ error: 'Invalid credentials.' });
            return;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            res.status(401).json({ error: 'Invalid credentials.' });
            return;
        }

        if (!user.isLocked) {
            res.json({ success: true, message: 'Account is not locked.' });
            return;
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                isLocked: false,
                lockedAt: null,
                lockReason: null,
            },
        });

        res.json({
            success: true,
            message: 'Account unlocked. You can now log in normally.',
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// ACCOUNT DELETION (App Store requirement)
// ============================================

// POST /api/v1/auth/delete-account — Schedule account for deletion
router.post('/delete-account', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const userId = req.userId!;
        
        // Verify password for security
        const { password } = req.body;
        if (!password) {
            throw new AppError('Password is required to delete your account', 400);
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, passwordHash: true, email: true, username: true },
        });

        if (!user || !user.passwordHash) {
            throw new AppError('Account not found', 404);
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            throw new AppError('Incorrect password', 401);
        }

        // Schedule deletion: set a 30-day grace period
        const deletionDate = new Date();
        deletionDate.setDate(deletionDate.getDate() + 30);

        await prisma.user.update({
            where: { id: userId },
            data: {
                isLocked: true,
                lockedAt: new Date(),
                lockReason: 'deletion_scheduled',
            },
        });

        // Delete all sessions immediately (force logout everywhere)
        await prisma.session.deleteMany({ where: { userId } });

        // Anonymize user data immediately for privacy
        await prisma.user.update({
            where: { id: userId },
            data: {
                displayName: 'Deleted User',
                bio: null,
                avatarUrl: null,
                coverUrl: null,
                phone: null,
                publicDisplayName: null,
                publicUsername: null,
                publicAvatarUrl: null,
                publicBio: null,
            },
        });

        // Delete related data in batches
        await Promise.allSettled([
            prisma.like.deleteMany({ where: { userId } }),
            prisma.comment.deleteMany({ where: { userId } }),
            prisma.share.deleteMany({ where: { userId } }),
            prisma.save.deleteMany({ where: { userId } }),
            prisma.follow.deleteMany({ where: { OR: [{ followerId: userId }, { followingId: userId }] } }),
            prisma.communityMember.deleteMany({ where: { userId } }),
            prisma.message.deleteMany({ where: { senderId: userId } }),
            prisma.pushSubscription.deleteMany({ where: { userId } }),
            prisma.notification.deleteMany({ where: { OR: [{ userId }, { actorId: userId }] } }),
        ]);

        logger.info(`Account deletion completed for user ${user.username} (${userId})`);

        res.json({
            success: true,
            message: 'Your account has been deleted. Your posts will be anonymized.',
        });
    } catch (error) {
        next(error);
    }
});

export { router as authRouter };

