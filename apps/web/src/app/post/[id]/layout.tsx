import type { Metadata, ResolvingMetadata } from 'next';
import type { ReactNode } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://caravanserver-production-d7da.up.railway.app';

type Props = {
    params: Promise<{ id: string }>;
    children: ReactNode;
};

async function getPost(id: string) {
    try {
        const response = await fetch(`${API_URL}/api/v1/posts/${id}`, {
            next: { revalidate: 60 }, // Cache for 60 seconds
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

    // Get parent metadata (fallback)
    const previousImages = (await parent).openGraph?.images || [];

    if (!post) {
        return {
            title: 'Post Not Found | 0G - ZeroG',
            description: 'This post may have been deleted or does not exist.',
        };
    }

    // Build description from caption or generate default
    const description = post.caption
        ? post.caption.slice(0, 160) + (post.caption.length > 160 ? '...' : '')
        : `Check out this ${post.type?.toLowerCase() || 'post'} by ${post.user?.displayName || 'a user'} on 0G - ZeroG`;

    const title = post.user?.displayName
        ? `${post.user.displayName} on 0G - ZeroG`
        : '0G - ZeroG | The Journey. Together.';

    // Use post media as OG image if available
    const images = post.mediaUrl && post.type === 'IMAGE'
        ? [{ url: post.mediaUrl, width: 1200, height: 630, alt: description }]
        : post.thumbnailUrl
            ? [{ url: post.thumbnailUrl, width: 1200, height: 630, alt: description }]
            : previousImages;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'article',
            url: `https://0gravity.ai/post/${id}`,
            siteName: '0G - ZeroG',
            images,
            authors: post.user?.displayName ? [post.user.displayName] : undefined,
            publishedTime: post.createdAt,
        },
        twitter: {
            card: post.mediaUrl ? 'summary_large_image' : 'summary',
            title,
            description,
            images: images.length > 0 ? [images[0]] : undefined,
            creator: post.user?.username ? `@${post.user.username}` : undefined,
        },
    };
}

export default function PostLayout({ children }: { children: ReactNode }) {
    return children;
}
