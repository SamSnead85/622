import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Caravan',
    description: 'The social platform built for communities. Share moments, build communities, and connect with people who share your passions.',
    keywords: ['social media', 'community', 'video', 'messaging', 'creators'],
    openGraph: {
        title: 'Caravan',
        description: 'The social platform built for communities.',
        type: 'website',
        siteName: 'Caravan',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Caravan',
        description: 'The social platform built for communities.',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body className="bg-gray-950 text-gray-50 antialiased">
                {children}
            </body>
        </html>
    );
}
