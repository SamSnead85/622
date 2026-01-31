import JSZip from 'jszip';
import { readFile } from 'fs/promises';
import { ParsedContent, ParsedPost, ParsedConnection } from '../MigrationService';

/**
 * Parser for TikTok data export files
 * 
 * TikTok exports data as a ZIP containing:
 * - Video/Videos.json (list of posted videos)
 * - Activity/Follower List.json
 * - Activity/Following List.json
 * - Activity/Like List.json
 */
export class TikTokParser {
    static async parse(filePath: string): Promise<ParsedContent> {
        const fileBuffer = await readFile(filePath);
        const zip = await JSZip.loadAsync(fileBuffer);

        const posts = await this.parsePosts(zip);
        const connections = await this.parseConnections(zip);

        return { posts, connections };
    }

    private static async parsePosts(zip: JSZip): Promise<ParsedPost[]> {
        const posts: ParsedPost[] = [];

        // Try different possible file paths for videos
        const videoPaths = [
            'Video/Videos.json',
            'Posts/Videos.json',
            'Content/Videos.json',
            'tiktok_data/Video/Videos.json',
        ];

        for (const path of videoPaths) {
            const file = zip.file(path);
            if (file) {
                try {
                    const content = await file.async('string');
                    const data = JSON.parse(content);

                    // TikTok export format
                    const videosArray = data.VideoList || data.videos || data;

                    if (Array.isArray(videosArray)) {
                        for (const video of videosArray) {
                            posts.push(this.transformVideo(video));
                        }
                    }
                    break;
                } catch {
                    continue;
                }
            }
        }

        return posts;
    }

    private static transformVideo(rawVideo: TikTokRawVideo): ParsedPost {
        // Extract hashtags from description
        const caption = rawVideo.Desc || rawVideo.description || '';
        const tags = caption.match(/#\w+/g)?.map(tag => tag.slice(1)) || [];

        // Get video URL
        const mediaUrls: string[] = [];
        if (rawVideo.Video?.Url || rawVideo.video_url) {
            mediaUrls.push(rawVideo.Video?.Url || rawVideo.video_url || '');
        }

        return {
            originalId: rawVideo.Video?.Url || rawVideo.id,
            originalTimestamp: rawVideo.Date
                ? new Date(rawVideo.Date)
                : rawVideo.create_time
                    ? new Date(rawVideo.create_time * 1000)
                    : undefined,
            type: 'VIDEO',
            caption,
            mediaUrls,
            location: undefined,
            tags,
        };
    }

    private static async parseConnections(zip: JSZip): Promise<ParsedConnection[]> {
        const connections: ParsedConnection[] = [];

        // Parse followers
        const followerPaths = [
            'Activity/Follower List.json',
            'Followers/Followers.json',
            'tiktok_data/Activity/Follower List.json',
        ];

        for (const path of followerPaths) {
            const file = zip.file(path);
            if (file) {
                try {
                    const content = await file.async('string');
                    const data = JSON.parse(content);
                    const followers = data.FansList || data.followers || data;

                    if (Array.isArray(followers)) {
                        for (const follower of followers) {
                            const username = follower.UserName || follower.username || follower.user_name;
                            if (username) {
                                connections.push({
                                    username,
                                    displayName: follower.NickName || follower.nickname || username,
                                    type: 'FOLLOWER',
                                });
                            }
                        }
                    }
                    break;
                } catch {
                    continue;
                }
            }
        }

        // Parse following
        const followingPaths = [
            'Activity/Following List.json',
            'Following/Following.json',
            'tiktok_data/Activity/Following List.json',
        ];

        for (const path of followingPaths) {
            const file = zip.file(path);
            if (file) {
                try {
                    const content = await file.async('string');
                    const data = JSON.parse(content);
                    const following = data.Following || data.following || data;

                    if (Array.isArray(following)) {
                        for (const follow of following) {
                            const username = follow.UserName || follow.username || follow.user_name;
                            if (username) {
                                // Check if already added as follower (mutual)
                                const existing = connections.find(c => c.username === username);
                                if (existing) {
                                    existing.type = 'MUTUAL';
                                } else {
                                    connections.push({
                                        username,
                                        displayName: follow.NickName || follow.nickname || username,
                                        type: 'FOLLOWING',
                                    });
                                }
                            }
                        }
                    }
                    break;
                } catch {
                    continue;
                }
            }
        }

        return connections;
    }
}

// Type definitions for TikTok export format
interface TikTokRawVideo {
    Video?: {
        Url?: string;
    };
    video_url?: string;
    id?: string;
    Desc?: string;
    description?: string;
    Date?: string;
    create_time?: number;
}
