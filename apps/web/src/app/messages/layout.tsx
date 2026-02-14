import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Messages | ZeroG',
    description: 'Your private conversations on ZeroG. Message friends, start group chats, and stay connected.',
};

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
