import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/client.js';
import { logger } from '../utils/logger.js';

export interface AuthRequest extends Request {
    userId?: string;
    user?: {
        id: string;
        email: string;
        username: string;
        role: string;
    };
}

// ============================================
// PRODUCTION AUTH MIDDLEWARE
// All authentication uses real database sessions
// ============================================

export const authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            res.status(401).json({ error: 'Authentication token missing' });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
            userId: string;
            sessionId: string;
        };

        // Verify session exists and isn't expired
        let session;
        try {
            session = await prisma.session.findUnique({
                where: { id: decoded.sessionId },
                include: { user: true },
            });
        } catch (dbError) {
            logger.error('Database error in auth:', dbError);
            res.status(503).json({ error: 'Database unavailable' });
            return;
        }

        if (!session) {
            res.status(401).json({ error: 'Invalid session' });
            return;
        }

        if (session.expiresAt < new Date()) {
            // Clean up expired session
            await prisma.session.delete({ where: { id: decoded.sessionId } }).catch(() => { });
            res.status(401).json({ error: 'Session expired' });
            return;
        }

        if (session.user.isBanned) {
            res.status(403).json({ error: 'Account suspended' });
            return;
        }

        req.userId = decoded.userId;
        req.user = {
            id: session.user.id,
            email: session.user.email,
            username: session.user.username,
            role: session.user.role,
        };

        // Update last active timestamp
        await prisma.user.update({
            where: { id: decoded.userId },
            data: { lastActiveAt: new Date() },
        }).catch(() => { }); // Silently ignore update errors

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ error: 'Token expired' });
            return;
        }
        next(error);
    }
};

// ============================================
// OPTIONAL AUTH MIDDLEWARE
// Attaches user if authenticated, continues if not
// ============================================

// ============================================
// REQUIRE FULL ACCOUNT MIDDLEWARE
// Blocks provisional users from restricted actions
// ============================================

export const requireFullAccount = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { isProvisional: true },
        });
        if (user?.isProvisional) {
            res.status(403).json({
                error: 'signup_required',
                message: 'Complete your signup to access this feature.',
                redirect: '/complete-signup',
            });
            return;
        }
        next();
    } catch {
        next();
    }
};

export const optionalAuth = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        next();
        return;
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
            userId: string;
            sessionId: string;
        };

        const session = await prisma.session.findUnique({
            where: { id: decoded.sessionId },
            include: { user: true },
        });

        if (session && session.expiresAt >= new Date()) {
            req.userId = decoded.userId;
            req.user = {
                id: session.user.id,
                email: session.user.email,
                username: session.user.username,
                role: session.user.role,
            };
        }
    } catch {
        // Silent fail for optional auth - user simply isn't authenticated
    }

    next();
};
