import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://0g-server.up.railway.app';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://0gravity.ai';

type Props = {
    params: Promise<{ id: string }>;
    children: ReactNode;
};

async function getCommunity(id: string) {
    try {
        const res = await fetch(`${API_URL}/api/v1/communities/${id}`, {
            next: { revalidate: 60 },
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.community ?? data;
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const community = await getCommunity(id);

    const canonical = `${SITE_URL}/communities/${id}`;

    if (!community) {
        return {
            title: 'Community Not Found | 0G',
            description: 'This community may have been deleted or doesn\'t exist.',
            alternates: { canonical },
        };
    }

    const title = `${community.name} | 0G Communities`;
    const description =
        community.description?.slice(0, 160) ||
        `${community.name} — Join this community on 0G`;

    return {
        title,
        description,
        alternates: { canonical },
        openGraph: {
            title,
            description,
            url: canonical,
            type: 'website',
            ...(community.coverUrl ? { images: [{ url: community.coverUrl }] } : {}),
        },
        twitter: {
            card: community.coverUrl ? 'summary_large_image' : 'summary',
            title,
            description,
        },
    };
}

export default function CommunityDetailLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}
