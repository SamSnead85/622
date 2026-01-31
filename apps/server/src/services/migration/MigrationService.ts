import { PrismaClient, MigrationPlatform, MigrationStatus, PostType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { InstagramParser } from './parsers/InstagramParser';
import { TikTokParser } from './parsers/TikTokParser';

const prisma = new PrismaClient();

export interface MigrationResult {
    migrationId: string;
    status: MigrationStatus;
    stats: {
        postsImported: number;
        postsFailed: number;
        connectionsImported: number;
        connectionsMatched: number;
    };
}

export interface ParsedContent {
    posts: ParsedPost[];
    connections: ParsedConnection[];
}

export interface ParsedPost {
    originalId?: string;
    originalTimestamp?: Date;
    type: 'IMAGE' | 'VIDEO' | 'TEXT';
    caption?: string;
    mediaUrls: string[];
    location?: string;
    tags: string[];
}

export interface ParsedConnection {
    username: string;
    displayName?: string;
    profileImageUrl?: string;
    email?: string;
    type: 'FOLLOWER' | 'FOLLOWING' | 'MUTUAL';
}

export class MigrationService {
    /**
     * Start a new migration for a user
     */
    async startMigration(
        userId: string,
        platform: MigrationPlatform,
        filePath: string
    ): Promise<string> {
        // Create migration record
        const migration = await prisma.migration.create({
            data: {
                id: randomUUID(),
                userId,
                platform,
                status: 'PENDING',
                filePath,
            },
        });

        // Start processing in background (in production, use a job queue)
        this.processMigration(migration.id).catch(console.error);

        return migration.id;
    }

    /**
     * Process a migration (parse and import)
     */
    async processMigration(migrationId: string): Promise<MigrationResult> {
        const migration = await prisma.migration.findUnique({
            where: { id: migrationId },
        });

        if (!migration) {
            throw new Error('Migration not found');
        }

        // Update status to processing
        await prisma.migration.update({
            where: { id: migrationId },
            data: {
                status: 'PROCESSING',
                startedAt: new Date(),
            },
        });

        try {
            // Parse the export file based on platform
            const parsedContent = await this.parseExportFile(
                migration.platform,
                migration.filePath!
            );

            // Import posts
            const postStats = await this.importPosts(migrationId, parsedContent.posts);

            // Import connections
            const connectionStats = await this.importConnections(
                migration.userId,
                migrationId,
                migration.platform,
                parsedContent.connections
            );

            // Update migration with results
            const stats = {
                postsImported: postStats.imported,
                postsFailed: postStats.failed,
                connectionsImported: connectionStats.imported,
                connectionsMatched: connectionStats.matched,
            };

            await prisma.migration.update({
                where: { id: migrationId },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    stats: stats as object,
                },
            });

            return {
                migrationId,
                status: 'COMPLETED',
                stats,
            };
        } catch (error) {
            // Update migration with error
            await prisma.migration.update({
                where: { id: migrationId },
                data: {
                    status: 'FAILED',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    completedAt: new Date(),
                },
            });

            throw error;
        }
    }

    /**
     * Parse export file based on platform
     */
    private async parseExportFile(
        platform: MigrationPlatform,
        filePath: string
    ): Promise<ParsedContent> {
        switch (platform) {
            case 'INSTAGRAM':
                return InstagramParser.parse(filePath);
            case 'TIKTOK':
                return TikTokParser.parse(filePath);
            default:
                throw new Error(`Platform ${platform} not yet supported`);
        }
    }

    /**
     * Import parsed posts into temporary storage
     */
    private async importPosts(
        migrationId: string,
        posts: ParsedPost[]
    ): Promise<{ imported: number; failed: number }> {
        let imported = 0;
        let failed = 0;

        for (const post of posts) {
            try {
                await prisma.importedPost.create({
                    data: {
                        migrationId,
                        originalPlatform: 'INSTAGRAM', // Will be dynamic
                        originalId: post.originalId,
                        originalTimestamp: post.originalTimestamp,
                        type: post.type as PostType,
                        caption: post.caption,
                        mediaUrls: post.mediaUrls,
                        location: post.location,
                        tags: post.tags,
                        importStatus: 'PENDING',
                    },
                });
                imported++;
            } catch {
                failed++;
            }
        }

        return { imported, failed };
    }

    /**
     * Import connections and match against existing users
     */
    private async importConnections(
        userId: string,
        migrationId: string,
        platform: MigrationPlatform,
        connections: ParsedConnection[]
    ): Promise<{ imported: number; matched: number }> {
        let imported = 0;
        let matched = 0;

        for (const connection of connections) {
            try {
                // Try to find existing Caravan user with matching username
                const matchedUser = await prisma.user.findUnique({
                    where: { username: connection.username.toLowerCase() },
                });

                await prisma.pendingConnection.create({
                    data: {
                        userId,
                        migrationId,
                        platform,
                        originalUsername: connection.username,
                        displayName: connection.displayName,
                        profileImageUrl: connection.profileImageUrl,
                        email: connection.email,
                        matchedUserId: matchedUser?.id,
                        matchConfidence: matchedUser ? 100 : null,
                        connectionType: connection.type,
                        inviteStatus: 'NOT_SENT',
                    },
                });

                imported++;
                if (matchedUser) matched++;
            } catch {
                // Skip duplicates
            }
        }

        return { imported, matched };
    }

    /**
     * Get migration status
     */
    async getMigrationStatus(migrationId: string) {
        return prisma.migration.findUnique({
            where: { id: migrationId },
            include: {
                _count: {
                    select: {
                        importedPosts: true,
                        pendingConnections: true,
                    },
                },
            },
        });
    }

    /**
     * Get user's migrations
     */
    async getUserMigrations(userId: string) {
        return prisma.migration.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: {
                        importedPosts: true,
                        pendingConnections: true,
                    },
                },
            },
        });
    }

    /**
     * Cancel a pending or processing migration
     */
    async cancelMigration(migrationId: string, userId: string) {
        const migration = await prisma.migration.findFirst({
            where: {
                id: migrationId,
                userId,
                status: { in: ['PENDING', 'PROCESSING'] },
            },
        });

        if (!migration) {
            throw new Error('Migration not found or cannot be cancelled');
        }

        await prisma.migration.update({
            where: { id: migrationId },
            data: {
                status: 'CANCELLED',
                completedAt: new Date(),
            },
        });
    }
}

export const migrationService = new MigrationService();
