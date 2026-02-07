import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://0gravity.ai'),
    title: {
        default: 'ZeroG - Social Media Without the Weight',
        template: '%s | ZeroG',
    },
    description: 'A platform where truth-tellers share their stories, communities decide what matters, and you own everything you create.',
    keywords: ['social media', 'community', 'privacy', 'zero gravity', 'content creation'],
    openGraph: {
        type: 'website',
        siteName: 'ZeroG',
        title: 'ZeroG - Social Media Without the Weight',
        description: 'A platform where truth-tellers share their stories, communities decide what matters, and you own everything you create.',
        images: ['/og-image.png'],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'ZeroG - Social Media Without the Weight',
        description: 'A platform where truth-tellers share their stories, communities decide what matters, and you own everything you create.',
        images: ['/og-image.png'],
    },
    manifest: '/manifest.json',
    icons: {
        icon: '/favicon-0g.png',
        apple: '/favicon-0g.png',
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: '0G',
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

