import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://0gravity.ai';

export const metadata: Metadata = {
    title: 'Developer Platform — ZeroG API, OAuth2, Webhooks & SDK',
    description: 'Build on ZeroG with our REST API, OAuth 2.0 authentication, real-time webhooks, and developer SDK. Create integrations, manage communities, and extend the platform for your users.',
    keywords: [
        'ZeroG API', 'social media API', 'developer platform', 'OAuth2 social API',
        'community management API', 'webhooks', 'REST API', 'social SDK',
        'app integration', 'third-party developer', 'community building API',
    ],
    openGraph: {
        title: 'ZeroG Developer Platform — API, OAuth2 & Webhooks',
        description: 'Build integrations with ZeroG. REST API, OAuth 2.0, real-time webhooks, and a developer SDK for community management and content creation.',
        url: `${siteUrl}/developers`,
        type: 'website',
    },
    twitter: {
        title: 'ZeroG Developer Platform',
        description: 'REST API, OAuth 2.0, webhooks, and SDK for building on ZeroG. Start integrating today.',
    },
    alternates: {
        canonical: `${siteUrl}/developers`,
    },
};

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
