import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Profile | ZeroG',
    description: 'View and manage your ZeroG profile. Your posts, journeys, and saved content in one place.',
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
