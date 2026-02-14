import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../db/client.js';
import { rateLimiters } from '../middleware/rateLimit.js';

const router = Router();

// List proposals for a community
router.get('/:communityId/proposals', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { communityId } = req.params;
        const { status, skip: rawSkip } = req.query;
        const skip = parseInt(rawSkip as string) || 0;

        const proposals = await prisma.proposal.findMany({
            where: {
                communityId,
                ...(status ? { status: status as any } : {}),
            },
            include: {
                author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
                _count: { select: { votes: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
            skip,
        });

        // Auto-expire proposals
        const now = new Date();
        for (const p of proposals) {
            if (p.status === 'ACTIVE' && p.expiresAt < now) {
                await prisma.proposal.update({
                    where: { id: p.id },
                    data: { status: p.votesFor + p.votesAgainst >= p.quorum && p.votesFor > p.votesAgainst ? 'PASSED' : 'EXPIRED', resolvedAt: now },
                });
            }
        }

        res.json({ proposals });
    } catch (error) {
        next(error);
    }
});

// Create proposal
router.post('/:communityId/proposals', authenticate, rateLimiters.general, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { communityId } = req.params;
        const { title, description, type, targetData, quorum, expiresInDays } = req.body;

        if (!title || !description || !type) {
            res.status(400).json({ error: 'Title, description, and type are required' });
            return;
        }

        // Verify membership
        const membership = await prisma.communityMember.findFirst({
            where: { communityId, userId: req.userId! },
        });
        if (!membership) {
            res.status(403).json({ error: 'Must be a community member to create proposals' });
            return;
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7));

        const proposal = await prisma.proposal.create({
            data: {
                communityId,
                authorId: req.userId!,
                title,
                description,
                type,
                targetData,
                quorum: quorum || 10,
                expiresAt,
            },
            include: {
                author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            },
        });

        res.status(201).json(proposal);
    } catch (error) {
        next(error);
    }
});

// Vote on a proposal
router.post('/proposals/:proposalId/vote', authenticate, rateLimiters.general, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { proposalId } = req.params;
        const { vote } = req.body; // true = for, false = against

        if (typeof vote !== 'boolean') {
            res.status(400).json({ error: 'Vote must be true (for) or false (against)' });
            return;
        }

        const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } });
        if (!proposal) {
            res.status(404).json({ error: 'Proposal not found' });
            return;
        }
        if (proposal.status !== 'ACTIVE') {
            res.status(400).json({ error: 'Proposal is no longer active' });
            return;
        }

        // Verify membership
        const membership = await prisma.communityMember.findFirst({
            where: { communityId: proposal.communityId, userId: req.userId! },
        });
        if (!membership) {
            res.status(403).json({ error: 'Must be a community member to vote' });
            return;
        }

        // Create or update vote — wrapped in transaction for atomicity
        const existing = await prisma.proposalVote.findUnique({
            where: { proposalId_userId: { proposalId, userId: req.userId! } },
        });

        if (existing && existing.vote === vote) {
            res.json({ message: 'Vote unchanged' });
            return;
        }

        await prisma.$transaction(async (tx) => {
            if (existing) {
                await tx.proposalVote.update({
                    where: { id: existing.id },
                    data: { vote },
                });
                // Update counts
                await tx.proposal.update({
                    where: { id: proposalId },
                    data: {
                        votesFor: { increment: vote ? 1 : -1 },
                        votesAgainst: { increment: vote ? -1 : 1 },
                    },
                });
            } else {
                await tx.proposalVote.create({
                    data: { proposalId, userId: req.userId!, vote },
                });
                await tx.proposal.update({
                    where: { id: proposalId },
                    data: vote
                        ? { votesFor: { increment: 1 } }
                        : { votesAgainst: { increment: 1 } },
                });
            }

            // Check if quorum reached
            const updated = await tx.proposal.findUnique({ where: { id: proposalId } });
            if (updated && (updated.votesFor + updated.votesAgainst >= updated.quorum)) {
                const status = updated.votesFor > updated.votesAgainst ? 'PASSED' : 'REJECTED';
                await tx.proposal.update({
                    where: { id: proposalId },
                    data: { status, resolvedAt: new Date() },
                });
            }
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// Get moderation log for a community
router.get('/:communityId/moderation-log', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { communityId } = req.params;

        // Verify the user is a member of the community
        const membership = await prisma.communityMember.findFirst({
            where: { communityId, userId: req.userId! },
        });
        if (!membership) {
            res.status(403).json({ error: 'Must be a community member to view moderation log' });
            return;
        }

        const { page = '1', limit = '50' } = req.query;

        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const [logs, total] = await Promise.all([
            prisma.moderationLog.findMany({
                where: { communityId },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit as string),
                skip,
            }),
            prisma.moderationLog.count({ where: { communityId } }),
        ]);

        res.json({
            logs,
            pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total },
        });
    } catch (error) {
        next(error);
    }
});

// Create moderation log entry
router.post('/:communityId/moderation-log', authenticate, rateLimiters.general, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { communityId } = req.params;
        const { action, targetType, targetId, reason } = req.body;

        // Check if user is a moderator or admin of the community
        const membership = await prisma.communityMember.findFirst({
            where: { communityId, userId: req.userId!, role: { in: ['MODERATOR', 'ADMIN'] } },
        });
        if (!membership) {
            res.status(403).json({ error: 'Only moderators can create log entries' });
            return;
        }

        const log = await prisma.moderationLog.create({
            data: {
                communityId,
                moderatorId: req.userId!,
                action,
                targetType,
                targetId,
                reason,
            },
        });

        res.status(201).json(log);
    } catch (error) {
        next(error);
    }
});

export default router;
