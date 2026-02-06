import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../db/client.js';

const router = Router();

// Get overview stats
router.get('/overview', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;

        // Get total followers
        const followerCount = await prisma.follow.count({ where: { followingId: userId } });

        // Get total posts
        const postCount = await prisma.post.count({ where: { userId, deletedAt: null } });

        // Get total likes across all posts
        const totalLikes = await prisma.like.count({
            where: { post: { userId } },
        });

        // Get total comments on user's posts
        const totalComments = await prisma.comment.count({
            where: { post: { userId } },
        });

        // Engagement rate (likes + comments per post)
        const engagementRate = postCount > 0
            ? ((totalLikes + totalComments) / postCount).toFixed(2)
            : '0';

        // Follower growth (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentFollowers = await prisma.follow.count({
            where: { followingId: userId, createdAt: { gte: thirtyDaysAgo } },
        });

        res.json({
            followers: followerCount,
            posts: postCount,
            totalLikes,
            totalComments,
            engagementRate: parseFloat(engagementRate),
            recentFollowers,
        });
    } catch (error) {
        next(error);
    }
});

// Get per-post performance
router.get('/posts', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { page = '1', limit = '20', sort = 'recent' } = req.query;
        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const orderBy: any = sort === 'popular'
            ? [{ likes: { _count: 'desc' } }]
            : { createdAt: 'desc' };

        const posts = await prisma.post.findMany({
            where: { userId: req.userId!, deletedAt: null },
            include: {
                _count: { select: { likes: true, comments: true, shares: true } },
            },
            orderBy,
            take: parseInt(limit as string),
            skip,
        });

        const total = await prisma.post.count({
            where: { userId: req.userId!, deletedAt: null },
        });

        const postMetrics = posts.map(post => ({
            id: post.id,
            caption: post.caption?.slice(0, 100),
            type: post.type,
            mediaUrl: post.thumbnailUrl || post.mediaUrl,
            likes: post._count.likes,
            comments: post._count.comments,
            shares: post._count.shares,
            createdAt: post.createdAt,
        }));

        res.json({ posts: postMetrics, total, page: parseInt(page as string) });
    } catch (error) {
        next(error);
    }
});

// Get audience growth data
router.get('/audience', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { days = '30' } = req.query;
        const daysNum = parseInt(days as string);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysNum);

        // Get followers grouped by day
        const followers = await prisma.follow.findMany({
            where: {
                followingId: req.userId!,
                createdAt: { gte: startDate },
            },
            select: { createdAt: true },
            orderBy: { createdAt: 'asc' },
        });

        // Group by date
        const growthByDay = new Map<string, number>();
        for (let i = 0; i < daysNum; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (daysNum - 1 - i));
            growthByDay.set(d.toISOString().split('T')[0], 0);
        }

        followers.forEach(f => {
            const dateKey = f.createdAt.toISOString().split('T')[0];
            growthByDay.set(dateKey, (growthByDay.get(dateKey) || 0) + 1);
        });

        const growth = Array.from(growthByDay.entries()).map(([date, count]) => ({
            date,
            newFollowers: count,
        }));

        res.json({ growth });
    } catch (error) {
        next(error);
    }
});

// Get top performing content
router.get('/top-content', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { period = '30' } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period as string));

        const topPosts = await prisma.post.findMany({
            where: {
                userId: req.userId!,
                deletedAt: null,
                createdAt: { gte: startDate },
            },
            include: {
                _count: { select: { likes: true, comments: true, shares: true } },
            },
            orderBy: { likes: { _count: 'desc' } },
            take: 10,
        });

        const formatted = topPosts.map(post => ({
            id: post.id,
            caption: post.caption?.slice(0, 80),
            type: post.type,
            thumbnailUrl: post.thumbnailUrl,
            likes: post._count.likes,
            comments: post._count.comments,
            shares: post._count.shares,
            engagement: post._count.likes + post._count.comments + post._count.shares,
            createdAt: post.createdAt,
        }));

        res.json({ topContent: formatted });
    } catch (error) {
        next(error);
    }
});

export default router;
