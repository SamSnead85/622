import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://0gravity.ai';

export const metadata: Metadata = {
    title: 'Communities — Private, Encrypted Groups on ZeroG',
    description: 'Join and build private communities with encrypted messaging, group polls, shared photo albums, status check-ins, and real-time voice/video calling. Community sovereignty by design.',
    keywords: [
        'ZeroG communities', 'private groups', 'encrypted communities', 'group messaging',
        'community building', 'private social groups', 'group polls', 'shared albums',
    ],
    openGraph: {
        title: 'ZeroG Communities — Build Your Private Community',
        description: 'Encrypted messaging, group polls, shared albums, and voice/video calling. Build sovereign communities on ZeroG.',
        url: `${siteUrl}/communities`,
    },
    alternates: { canonical: `${siteUrl}/communities` },
};

export default function CommunitiesLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
