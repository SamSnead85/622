import JSZip from 'jszip';
import { readFile } from 'fs/promises';
import { ParsedContent, ParsedPost, ParsedConnection } from '../MigrationService';

/**
 * Parser for Instagram data export files
 * 
 * Instagram exports data as a ZIP containing:
 * - content/posts_1.json (or posts.json)
 * - followers_and_following/followers_1.json
 * - followers_and_following/following.json
 * - messages/inbox/[conversation]/message_1.json
 */
export class InstagramParser {
    static async parse(filePath: string): Promise<ParsedContent> {
        const fileBuffer = await readFile(filePath);
        const zip = await JSZip.loadAsync(fileBuffer);

        const posts = await this.parsePosts(zip);
        const connections = await this.parseConnections(zip);

        return { posts, connections };
    }

    private static async parsePosts(zip: JSZip): Promise<ParsedPost[]> {
        const posts: ParsedPost[] = [];

        // Try different possible file paths for posts
        const postPaths = [
            'content/posts_1.json',
            'your_instagram_activity/content/posts_1.json',
            'posts/posts_1.json',
            'media.json',
        ];

        for (const path of postPaths) {
            const file = zip.file(path);
            if (file) {
                try {
                    const content = await file.async('string');
                    const data = JSON.parse(content);

                    // Handle different Instagram export formats
                    const postsArray = Array.isArray(data) ? data : data.ig_posts || [];

                    for (const post of postsArray) {
                        posts.push(this.transformPost(post));
                    }
                    break;
                } catch {
                    continue;
                }
            }
        }

        return posts;
    }

    private static transformPost(rawPost: InstagramRawPost): ParsedPost {
        // Extract media URLs
        const mediaUrls: string[] = [];
        if (rawPost.media) {
            for (const media of rawPost.media) {
                if (media.uri) {
                    mediaUrls.push(media.uri);
                }
            }
        }

        // Determine post type
        let type: 'IMAGE' | 'VIDEO' | 'TEXT' = 'IMAGE';
        if (mediaUrls.some(url => url.endsWith('.mp4') || url.includes('video'))) {
            type = 'VIDEO';
        } else if (mediaUrls.length === 0) {
            type = 'TEXT';
        }

        // Extract hashtags from caption
        const caption = rawPost.title || '';
        const tags = caption.match(/#\w+/g)?.map(tag => tag.slice(1)) || [];

        return {
            originalId: rawPost.media?.[0]?.uri, // Use media URI as ID
            originalTimestamp: rawPost.creation_timestamp
                ? new Date(rawPost.creation_timestamp * 1000)
                : rawPost.taken_at
                    ? new Date(rawPost.taken_at)
                    : undefined,
            type,
            caption,
            mediaUrls,
            location: rawPost.location,
            tags,
        };
    }

    private static async parseConnections(zip: JSZip): Promise<ParsedConnection[]> {
        const connections: ParsedConnection[] = [];

        // Parse followers
        const followerPaths = [
            'followers_and_following/followers_1.json',
            'connections/followers_and_following/followers_1.json',
            'followers.json',
        ];

        for (const path of followerPaths) {
            const file = zip.file(path);
            if (file) {
                try {
                    const content = await file.async('string');
                    const data = JSON.parse(content);
                    const followers = Array.isArray(data) ? data : data.relationships_followers || [];

                    for (const follower of followers) {
                        const username = follower.string_list_data?.[0]?.value || follower.username;
                        if (username) {
                            connections.push({
                                username,
                                displayName: username,
                                type: 'FOLLOWER',
                            });
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
            'followers_and_following/following.json',
            'connections/followers_and_following/following.json',
            'following.json',
        ];

        for (const path of followingPaths) {
            const file = zip.file(path);
            if (file) {
                try {
                    const content = await file.async('string');
                    const data = JSON.parse(content);
                    const following = Array.isArray(data) ? data : data.relationships_following || [];

                    for (const follow of following) {
                        const username = follow.string_list_data?.[0]?.value || follow.username;
                        if (username) {
                            // Check if already added as follower (mutual)
                            const existing = connections.find(c => c.username === username);
                            if (existing) {
                                existing.type = 'MUTUAL';
                            } else {
                                connections.push({
                                    username,
                                    displayName: username,
                                    type: 'FOLLOWING',
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

        return connections;
    }
}

// Type definitions for Instagram export format
interface InstagramRawPost {
    media?: Array<{
        uri: string;
        creation_timestamp?: number;
    }>;
    title?: string;
    creation_timestamp?: number;
    taken_at?: string;
    location?: string;
}
