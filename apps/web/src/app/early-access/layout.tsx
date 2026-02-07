import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://0gravity.ai';

export const metadata: Metadata = {
    title: 'Request Early Access — Join the ZeroG Founding Community',
    description: 'Apply to become one of the first members of ZeroG, a privacy-first social platform with encrypted communities, real-time calling, and Travel Shield identity protection. We are hand-selecting founding members.',
    keywords: [
        'ZeroG early access', 'join ZeroG', 'beta access social media', 'founding member',
        'early adopter', 'privacy social network invite', 'community builder',
    ],
    openGraph: {
        title: 'Request Early Access — Join the ZeroG Founding Community',
        description: 'We are hand-selecting our founding members. Apply to join ZeroG and help build the future of community-owned social media.',
        url: `${siteUrl}/early-access`,
        type: 'website',
    },
    twitter: {
        title: 'Request Early Access to ZeroG',
        description: 'Apply to become a founding member of ZeroG — privacy-first social media built by Palestinians.',
    },
    alternates: {
        canonical: `${siteUrl}/early-access`,
    },
};

export default function EarlyAccessLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
