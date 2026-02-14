import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Games | ZeroG',
    description: 'Play games and connect with friends on ZeroG. Discover fun activities in the gaming hub.',
};

export default function GamesLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
