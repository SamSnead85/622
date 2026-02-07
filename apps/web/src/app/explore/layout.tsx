import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://0gravity.ai';

export const metadata: Metadata = {
    title: 'Search — ZeroG',
    description: 'Search and discover on ZeroG.',
    alternates: { canonical: `${siteUrl}/search` },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
