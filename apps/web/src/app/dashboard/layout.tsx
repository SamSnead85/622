import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Feed | ZeroG',
    description: 'Your main feed on ZeroG — posts from your circle and community. Share moments, discover content, and stay connected.',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
