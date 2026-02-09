import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://0gravity.ai';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/api/',
                    '/dashboard/',
                    '/messages/',
                    '/profile/',
                    '/onboarding/',
                    '/settings/',
                    '/communities/create/',
                ],
            },
            {
                userAgent: 'GPTBot',
                allow: ['/', '/about', '/signup', '/developers'],
                disallow: ['/api/', '/dashboard/', '/messages/'],
            },
            {
                userAgent: 'ChatGPT-User',
                allow: ['/', '/about', '/signup', '/developers'],
                disallow: ['/api/', '/dashboard/', '/messages/'],
            },
            {
                userAgent: 'Claude-Web',
                allow: ['/', '/about', '/signup', '/developers'],
                disallow: ['/api/', '/dashboard/', '/messages/'],
            },
            {
                userAgent: 'Googlebot',
                allow: '/',
                disallow: ['/api/', '/dashboard/', '/messages/', '/onboarding/'],
            },
        ],
        sitemap: `${BASE_URL}/sitemap.xml`,
    };
}
