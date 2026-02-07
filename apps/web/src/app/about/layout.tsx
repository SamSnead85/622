import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://0gravity.ai';

export const metadata: Metadata = {
    title: 'About ZeroG — Our Mission, Vision & Architecture',
    description: 'Learn about ZeroG, a 100% Palestinian-built social platform. Explore our privacy-first architecture, cryptographic identity protection (Travel Shield), security commitments, and the vision behind community-owned social media.',
    keywords: [
        'ZeroG about', 'Palestinian social media', 'privacy-first platform', 'Travel Shield',
        'community sovereignty', 'social media architecture', 'cryptographic identity protection',
        'data sovereignty', 'no ads social network', 'community-built platform',
    ],
    openGraph: {
        title: 'About ZeroG — Our Mission, Vision & Architecture',
        description: 'A 100% Palestinian-built platform with Travel Shield identity protection, encrypted communities, and zero ads. Learn about our architecture and security commitments.',
        url: `${siteUrl}/about`,
        type: 'website',
    },
    twitter: {
        title: 'About ZeroG — Mission, Vision & Architecture',
        description: '100% Palestinian-built. Privacy-first architecture. Travel Shield identity protection. Zero ads. Learn about ZeroG.',
    },
    alternates: {
        canonical: `${siteUrl}/about`,
    },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
