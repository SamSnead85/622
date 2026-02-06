import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../db/client.js';

const router = Router();

// Request data export
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;

        // Gather all user data
        const [user, posts, comments, likes, followers, following, conversations] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    username: true,
                    email: true,
                    displayName: true,
                    bio: true,
                    website: true,
                    avatarUrl: true,
                    coverUrl: true,
                    createdAt: true,
                    isVerified: true,
                },
            }),
            prisma.post.findMany({
                where: { userId, deletedAt: null },
                select: {
                    id: true,
                    type: true,
                    caption: true,
                    mediaUrl: true,
                    createdAt: true,
                    isPublic: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.comment.findMany({
                where: { userId },
                select: {
                    id: true,
                    content: true,
                    createdAt: true,
                    postId: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.like.findMany({
                where: { userId },
                select: {
                    postId: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.follow.findMany({
                where: { followingId: userId },
                select: {
                    follower: { select: { username: true, displayName: true } },
                    createdAt: true,
                },
            }),
            prisma.follow.findMany({
                where: { followerId: userId },
                select: {
                    following: { select: { username: true, displayName: true } },
                    createdAt: true,
                },
            }),
            prisma.conversationParticipant.findMany({
                where: { userId },
                select: {
                    conversation: {
                        select: {
                            id: true,
                            messages: {
                                where: { senderId: userId },
                                select: { content: true, createdAt: true },
                                orderBy: { createdAt: 'desc' },
                                take: 1000,
                            },
                        },
                    },
                },
            }),
        ]);

        const exportData = {
            exportedAt: new Date().toISOString(),
            platform: 'ZeroG',
            version: '1.0',
            profile: user,
            posts,
            comments,
            likes,
            followers: followers.map(f => ({
                username: f.follower.username,
                displayName: f.follower.displayName,
                followedAt: f.createdAt,
            })),
            following: following.map(f => ({
                username: f.following.username,
                displayName: f.following.displayName,
                followedAt: f.createdAt,
            })),
            messages: conversations.map(cp => ({
                conversationId: cp.conversation.id,
                messages: cp.conversation.messages,
            })),
            summary: {
                totalPosts: posts.length,
                totalComments: comments.length,
                totalLikes: likes.length,
                totalFollowers: followers.length,
                totalFollowing: following.length,
            },
        };

        // Set headers for JSON download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="zerog-export-${user?.username}-${Date.now()}.json"`);
        res.json(exportData);
    } catch (error) {
        next(error);
    }
});

// Get export status / info
router.get('/info', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;

        const [postCount, commentCount, likeCount, followerCount] = await Promise.all([
            prisma.post.count({ where: { userId, deletedAt: null } }),
            prisma.comment.count({ where: { userId } }),
            prisma.like.count({ where: { userId } }),
            prisma.follow.count({ where: { followingId: userId } }),
        ]);

        res.json({
            estimatedItems: postCount + commentCount + likeCount + followerCount,
            breakdown: {
                posts: postCount,
                comments: commentCount,
                likes: likeCount,
                followers: followerCount,
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
