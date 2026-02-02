import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/client.js';

export interface AuthRequest extends Request {
    userId?: string;
    user?: {
        id: string;
        email: string;
        username: string;
    };
}

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

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as {
            userId: string;
            sessionId: string;
        };

        // Demo mode - ensure demo user exists in database
        if (decoded.sessionId === 'demo-session' && decoded.userId === 'demo-user-id') {
            // Ensure demo user exists in the database
            let demoUser;
            try {
                demoUser = await prisma.user.upsert({
                    where: { id: 'demo-user-id' },
                    update: { lastActiveAt: new Date() },
                    create: {
                        id: 'demo-user-id',
                        email: 'demo@six22.app',
                        username: 'demo',
                        displayName: 'Demo User',
                        passwordHash: 'demo-no-login',
                        isVerified: true,
                    },
                });
            } catch (upsertError) {
                // Try finding by email if id conflict
                demoUser = await prisma.user.findUnique({
                    where: { email: 'demo@six22.app' },
                });
                if (!demoUser) {
                    console.error('Failed to create/find demo user:', upsertError);
                    res.status(500).json({ error: 'Demo user initialization failed' });
                    return;
                }
            }

            req.userId = demoUser.id;
            req.user = {
                id: demoUser.id,
                email: demoUser.email,
                username: demoUser.username,
            };
            next();
            return;
        }

        // Verify session exists and isn't expired
        let session;
        try {
            session = await prisma.session.findUnique({
                where: { id: decoded.sessionId },
                include: { user: true },
            });
        } catch (dbError) {
            console.error('Database error in auth:', dbError);
            res.status(503).json({ error: 'Database unavailable' });
            return;
        }

        if (!session || session.expiresAt < new Date()) {
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
        };

        // Update last active
        await prisma.user.update({
            where: { id: decoded.userId },
            data: { lastActiveAt: new Date() },
        }).catch(() => { }); // Ignore errors updating last active

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        next(error);
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as {
            userId: string;
            sessionId: string;
        };

        // Demo mode - ensure demo user exists
        if (decoded.sessionId === 'demo-session' && decoded.userId === 'demo-user-id') {
            let demoUser;
            try {
                demoUser = await prisma.user.upsert({
                    where: { id: 'demo-user-id' },
                    update: {},
                    create: {
                        id: 'demo-user-id',
                        email: 'demo@six22.app',
                        username: 'demo',
                        displayName: 'Demo User',
                        passwordHash: 'demo-no-login',
                        isVerified: true,
                    },
                });
            } catch {
                demoUser = await prisma.user.findFirst({
                    where: { email: 'demo@six22.app' },
                });
            }

            if (demoUser) {
                req.userId = demoUser.id;
                req.user = {
                    id: demoUser.id,
                    email: demoUser.email,
                    username: demoUser.username,
                };
            }
            next();
            return;
        }

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
            };
        }
    } catch {
        // Silent fail for optional auth
    }

    next();
};
