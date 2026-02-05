/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'source.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'picsum.photos',
            },
            {
                protocol: 'https',
                hostname: 'ui-avatars.com',
            },
            // Local development backend
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '5180',
            },
            // Supabase Storage (matches any Supabase project)
            {
                protocol: 'https',
                hostname: '*.supabase.co',
            },
            // Railway backend (production)
            {
                protocol: 'https',
                hostname: '*.up.railway.app',
            },
        ],
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    swcMinify: true,
};

export default nextConfig;
