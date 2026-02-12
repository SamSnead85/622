import type { Metadata, ResolvingMetadata } from 'next';
import type { ReactNode } from 'react';

// Use env vars directly — this runs server-side only
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://0g-server.up.railway.app';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://0gravity.ai';

type Props = {
    params: Promise<{ id: string }>;
    children: ReactNode;
};

async function getPost(id: string) {
    try {
        const response = await fetch(`${API_URL}/api/v1/posts/${id}`, {
            next: { revalidate: 60 },
        });
        if (!response.ok) return null;
        return response.json();
    } catch {
        return null;
    }
}

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { id } = await params;
    const post = await getPost(id);

    const previousImages = (await parent).openGraph?.images || [];

    if (!post) {
        return {
            title: 'Post Not Found | 0G',
            description: 'This post may have been deleted or doesn\'t exist.',
        };
    }

    const authorName = post.user?.displayName || post.user?.username || 'Someone';
    const authorHandle = post.user?.username ? `@${post.user.username}` : '';
    const caption = post.caption || '';
    const isVideo = post.type === 'VIDEO';
    const isImage = post.type === 'IMAGE';
    const postUrl = `${SITE_URL}/post/${id}`;

    // Rich title for link previews
    const title = caption
        ? `${authorName}: "${caption.slice(0, 60)}${caption.length > 60 ? '...' : ''}" | 0G`
        : `${authorName} shared ${isVideo ? 'a video' : isImage ? 'a photo' : 'a post'} on 0G`;

    // Description for search engines and link previews
    const description = caption
        ? `${caption.slice(0, 200)}${caption.length > 200 ? '...' : ''} — ${authorHandle} on 0G`
        : `Check out ${authorName}'s ${isVideo ? 'video' : isImage ? 'photo' : 'post'} on 0G — social media without the weight.`;

    // Determine OG images
    let ogImages: any[] = [];
    if (post.mediaUrl && isImage) {
        ogImages = [{ url: post.mediaUrl, width: 1200, height: 630, alt: caption || `Photo by ${authorName}` }];
    } else if (post.thumbnailUrl) {
        ogImages = [{ url: post.thumbnailUrl, width: 1200, height: 630, alt: description }];
    } else if (post.user?.avatarUrl) {
        ogImages = [{ url: post.user.avatarUrl, width: 400, height: 400, alt: authorName }];
    } else {
        ogImages = previousImages.length > 0 ? previousImages : [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: '0G' }];
    }

    // Base metadata
    const metadata: Metadata = {
        title,
        description,
        alternates: { canonical: postUrl },
        openGraph: {
            title,
            description,
            url: postUrl,
            siteName: '0G — ZeroG',
            locale: 'en_US',
            type: 'article',
            images: ogImages,
            authors: authorName ? [authorName] : undefined,
            publishedTime: post.createdAt,
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: ogImages.length > 0 ? [ogImages[0]] : undefined,
            creator: authorHandle || undefined,
        },
    };

    // Video-specific OG tags for native video playback in link previews
    if (isVideo && post.mediaUrl && !post.mediaUrl.includes('youtube') && !post.mediaUrl.includes('youtu.be')) {
        metadata.openGraph = {
            ...metadata.openGraph,
            type: 'video.other',
            videos: [
                {
                    url: post.mediaUrl,
                    type: 'video/mp4',
                    width: 1280,
                    height: 720,
                },
            ],
        };
        // Twitter player card for inline video
        metadata.twitter = {
            ...metadata.twitter,
            card: 'player',
            players: [
                {
                    playerUrl: `${SITE_URL}/embed/${id}`,
                    streamUrl: post.mediaUrl,
                    width: 480,
                    height: 270,
                },
            ],
        };
    }

    return metadata;
}

export default function PostLayout({ children }: { children: ReactNode }) {
    return children;
}
