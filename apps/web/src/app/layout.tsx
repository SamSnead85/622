import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://0gravity.ai'),
    title: '0G - ZeroG | The Journey. Together.',
    description: 'The next generation social network. Where authentic connections transcend algorithms. Join the caravan of creators, communities, and changemakers building a weightless digital future.',
    keywords: ['social media', 'zero gravity', '0G', 'creator economy', 'AI', 'transparent algorithm', 'privacy', 'community', 'caravan', 'authentic connections'],
    openGraph: {
        title: '0G - ZeroG | The Journey. Together.',
        description: 'Where authentic connections transcend algorithms. Join the caravan of creators, communities, and changemakers.',
        type: 'website',
        siteName: '0G - ZeroG',
        images: ['/og-image.png'],
    },
    twitter: {
        card: 'summary_large_image',
        title: '0G - ZeroG | The Journey. Together.',
        description: 'Where authentic connections transcend algorithms. Join the caravan of creators, communities, and changemakers.',
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

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body className="bg-black text-gray-50 antialiased">
                <Providers>
                    <GlobalMessageListener />
                    {children}
                </Providers>
            </body>
        </html>
    );
}

