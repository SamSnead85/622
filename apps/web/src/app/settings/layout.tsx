import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Settings | ZeroG',
    description: 'Manage your ZeroG account settings, privacy, notifications, and preferences.',
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
