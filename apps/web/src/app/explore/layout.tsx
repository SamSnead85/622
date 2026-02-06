import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Explore',
    description: 'Discover new creators, communities, and content on ZeroG.',
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
