import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://0gravity.ai';

export const metadata: Metadata = {
    title: 'Search — Find People, Communities & Content on ZeroG',
    description: 'Search for people, communities, posts, and hashtags on ZeroG. Privacy-first discovery that adapts to your mode.',
    keywords: [
        'ZeroG search', 'find people', 'discover communities', 'search posts',
        'social search', 'privacy-first search', 'find creators',
    ],
    openGraph: {
        title: 'Search ZeroG — Find People & Communities',
        description: 'Search for people, communities, and content on ZeroG, the privacy-first social platform.',
        url: `${siteUrl}/search`,
    },
    alternates: { canonical: `${siteUrl}/search` },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
