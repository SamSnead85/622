import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Communities',
    description: 'Join and build communities on ZeroG.',
};

export default function CommunitiesLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
