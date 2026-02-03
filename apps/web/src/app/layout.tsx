import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://0gravity.ai'),
    title: '0G - Zero Gravity | The Next Generation of Social',
    description: 'The weightless social network. No algorithms weighing you down. No corporate control. Just you. Weightless. Authentic. Yours.',
    keywords: ['social media', 'zero gravity', '0G', 'creator economy', 'AI', 'transparent algorithm', 'privacy', 'community'],
    openGraph: {
        title: '0G - Zero Gravity | The Next Generation of Social',
        description: 'The weightless social network. No algorithms weighing you down. Weightless. Authentic. Yours.',
        type: 'website',
        siteName: '0G',
        images: ['/og-image.png'],
    },
    twitter: {
        card: 'summary_large_image',
        title: '0G - Zero Gravity | The Next Generation of Social',
        description: 'The weightless social network. No algorithms weighing you down. Weightless. Authentic. Yours.',
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

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body className="bg-black text-gray-50 antialiased">
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}

