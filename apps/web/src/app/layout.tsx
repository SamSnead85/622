import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://0gravity.ai';

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: 'ZeroG — Privacy-First Social Platform for Communities',
        template: '%s | ZeroG',
    },
    description: 'ZeroG is a 100% Palestinian-built social platform with encrypted communities, real-time calling, group messaging, live streaming, and Travel Shield identity protection. No ads. No data selling. Community-first.',
    keywords: [
        'ZeroG', '0G', 'social media platform', 'privacy social network', 'community platform',
        'encrypted messaging', 'video calling app', 'group chat', 'live streaming platform',
        'Palestinian technology', 'diaspora community', 'community building',
        'travel shield', 'identity protection', 'content creation',
        'private social network', 'community-owned platform', 'no ads social media',
        'real-time communication', 'WebRTC calling', 'shared photo albums',
        'group polls', 'WhatsApp alternative', 'developer API platform',
        'open API social network', 'privacy-first', 'data sovereignty',
    ],
    authors: [{ name: 'ZeroG', url: siteUrl }],
    creator: 'ZeroG',
    publisher: 'ZeroG',
    category: 'Social Networking',
    classification: 'Social Media Platform',
    referrer: 'origin-when-cross-origin',
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    openGraph: {
        type: 'website',
        locale: 'en_US',
        siteName: 'ZeroG',
        title: 'ZeroG — Privacy-First Social Platform for Communities',
        description: 'Build encrypted communities, make calls, share albums, go live, and protect your identity — all on a platform that puts people first. 100% Palestinian-built. No ads. No data selling.',
        url: siteUrl,
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'ZeroG — Social Media Without the Weight',
                type: 'image/png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        site: '@zerog_social',
        creator: '@zerog_social',
        title: 'ZeroG — Privacy-First Social Platform for Communities',
        description: 'Encrypted communities, real-time calling, live streaming, Travel Shield identity protection. 100% Palestinian-built. No ads. No data selling.',
        images: ['/og-image.png'],
    },
    alternates: {
        canonical: siteUrl,
    },
    manifest: '/manifest.json',
    icons: {
        icon: [
            { url: '/favicon-0g.png', type: 'image/png' },
        ],
        apple: '/favicon-0g.png',
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'ZeroG',
    },
    other: {
        'application-name': 'ZeroG',
        'msapplication-TileColor': '#000000',
        'theme-color': '#000000',
        'mobile-web-app-capable': 'yes',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#000000',
};

import { GlobalMessageListener } from '@/components/GlobalMessageListener';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PageTransition } from '@/components/transitions/PageTransition';
import { SkipLinks } from '@/components/a11y/SkipLinks';
import { LiveRegionProvider } from '@/components/a11y/LiveRegion';
import { I18nProvider } from '@/components/layout/RTLProvider';
import { ToastProvider } from '@/components/Toast';
import { Inter } from 'next/font/google';

const inter = Inter({
    subsets: ['latin', 'latin-ext'],
    variable: '--font-inter',
    display: 'swap',
});

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`dark ${inter.variable}`}>
            <head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@graph': [
                                {
                                    '@type': 'WebApplication',
                                    name: 'ZeroG',
                                    alternateName: '0G',
                                    url: siteUrl,
                                    description: 'Privacy-first social platform with encrypted communities, real-time calling, live streaming, and Travel Shield identity protection. 100% Palestinian-built.',
                                    applicationCategory: 'SocialNetworkingApplication',
                                    operatingSystem: 'Web',
                                    offers: {
                                        '@type': 'Offer',
                                        price: '0',
                                        priceCurrency: 'USD',
                                    },
                                    featureList: [
                                        'Encrypted community messaging',
                                        'Voice and video calling (WebRTC)',
                                        'Live streaming',
                                        'Shared photo albums',
                                        'Group polls and voting',
                                        'Travel Shield identity protection',
                                        'WhatsApp chat import',
                                        'Developer API and OAuth2',
                                        'Check-in status updates',
                                        'Community bulletin boards',
                                    ],
                                },
                                {
                                    '@type': 'Organization',
                                    name: 'ZeroG',
                                    url: siteUrl,
                                    logo: `${siteUrl}/favicon-0g.png`,
                                    description: 'A 100% Palestinian-built social platform that prioritizes privacy, community sovereignty, and authentic human connection.',
                                    foundingDate: '2024',
                                    sameAs: [],
                                },
                                {
                                    '@type': 'WebSite',
                                    name: 'ZeroG',
                                    url: siteUrl,
                                    potentialAction: {
                                        '@type': 'SearchAction',
                                        target: {
                                            '@type': 'EntryPoint',
                                            urlTemplate: `${siteUrl}/explore?q={search_term_string}`,
                                        },
                                        'query-input': 'required name=search_term_string',
                                    },
                                },
                            ],
                        }),
                    }}
                />
            </head>
            <body className={`bg-black text-gray-50 antialiased ${inter.className}`}>
                <SkipLinks />
                <ErrorBoundary>
                    <Providers>
                        <I18nProvider>
                            <LiveRegionProvider>
                                <ToastProvider>
                                    <PageTransition>
                                        <GlobalMessageListener />
                                        {children}
                                    </PageTransition>
                                </ToastProvider>
                            </LiveRegionProvider>
                        </I18nProvider>
                    </Providers>
                </ErrorBoundary>
            </body>
        </html>
    );
}

