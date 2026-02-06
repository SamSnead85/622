import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../db/client.js';

const router = Router();

// Get user's circles (communities they belong to)
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const memberships = await prisma.communityMember.findMany({
            where: { userId },
            include: {
                community: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        avatarUrl: true,
                        coverUrl: true,
                        memberCount: true,
                        _count: { select: { members: true } },
                    },
                },
            },
            orderBy: { joinedAt: 'desc' },
        });

        const circles = memberships.map(m => ({
            id: m.community.id,
            name: m.community.name,
            description: m.community.description,
            avatarUrl: m.community.avatarUrl,
            coverUrl: m.community.coverUrl,
            memberCount: m.community.memberCount || m.community._count.members,
            role: m.role,
            joinedAt: m.joinedAt,
        }));

        res.json({ circles });
    } catch (error) {
        next(error);
    }
});

export default router;
