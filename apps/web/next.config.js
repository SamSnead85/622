/** @type {import('next').NextConfig} */
const nextConfig = {
    // Strip console.log/warn/error from production builds (via SWC compiler)
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production'
            ? { exclude: ['error'] } // Keep console.error for critical issues
            : false,
    },
    images: {
        formats: ['image/avif', 'image/webp'],
        remotePatterns: [
            // Supabase Storage
            { protocol: 'https', hostname: '*.supabase.co' },
            { protocol: 'https', hostname: '*.supabase.in' },
            // Google profile pictures (OAuth avatars)
            { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
            // YouTube thumbnails (post embeds)
            { protocol: 'https', hostname: 'img.youtube.com' },
            { protocol: 'https', hostname: 'i.ytimg.com' },
            // Gravatar fallback
            { protocol: 'https', hostname: '*.gravatar.com' },
            // Railway deployment (file uploads served by backend)
            { protocol: 'https', hostname: '*.up.railway.app' },
            // Production domains
            { protocol: 'https', hostname: '0gravity.ai' },
            { protocol: 'https', hostname: '*.0gravity.ai' },
            { protocol: 'https', hostname: 'zerog.social' },
            { protocol: 'https', hostname: '*.zerog.social' },
            // Local development
            ...(process.env.NODE_ENV !== 'production' ? [
                { protocol: 'http', hostname: 'localhost' },
                { protocol: 'http', hostname: '127.0.0.1' },
            ] : []),
        ],
    },
    eslint: {
        ignoreDuringBuilds: false,
    },
    typescript: {
        ignoreBuildErrors: false,
    },
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5180',
    },
    async headers() {
        return [
            {
                source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif|woff|woff2)',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                ],
            },
            {
                source: '/_next/static/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
