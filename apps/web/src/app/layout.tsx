import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://six22.app'),
    title: 'Six22 - Start a New Chapter',
    description: 'The social platform where you move together and build something real. Find your tribe, share moments, and own your experience.',
    keywords: ['social media', 'tribes', 'community', 'privacy', 'data ownership', 'video', 'messaging', 'Six22'],
    openGraph: {
        title: 'Six22 - Start a New Chapter',
        description: 'Move together. Build something real. Find your tribe on Six22.',
        type: 'website',
        siteName: 'Six22',
        images: ['/og-image.png'],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Six22 - Start a New Chapter',
        description: 'Move together. Build something real. Find your tribe on Six22.',
        images: ['/og-image.png'],
    },
    manifest: '/manifest.json',
    icons: {
        icon: '/favicon-six22.png',
        apple: '/favicon-six22.png',
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Six22',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#050508',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body className="bg-[#050508] text-gray-50 antialiased">
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
