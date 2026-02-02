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

        // Demo mode - bypass database check
        if (decoded.sessionId === 'demo-session' && decoded.userId === 'demo-user-id') {
            req.userId = 'demo-user-id';
            req.user = {
                id: 'demo-user-id',
                email: 'demo@six22.app',
                username: 'demo',
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

        // Demo mode
        if (decoded.sessionId === 'demo-session' && decoded.userId === 'demo-user-id') {
            req.userId = 'demo-user-id';
            req.user = {
                id: 'demo-user-id',
                email: 'demo@six22.app',
                username: 'demo',
            };
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
