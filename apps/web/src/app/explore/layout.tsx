import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://0gravity.ai';

export const metadata: Metadata = {
    title: 'Explore — Discover Communities, Creators & Content on ZeroG',
    description: 'Discover communities, trending content, creators, and live streams on ZeroG. Find your people in a privacy-first social platform.',
    keywords: [
        'ZeroG explore', 'discover communities', 'trending content', 'social discovery',
        'find creators', 'live streams', 'content feed', 'social media explore',
    ],
    openGraph: {
        title: 'Explore ZeroG — Discover Communities & Content',
        description: 'Find communities, creators, and trending content on ZeroG, the privacy-first social platform.',
        url: `${siteUrl}/explore`,
    },
    alternates: { canonical: `${siteUrl}/explore` },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
