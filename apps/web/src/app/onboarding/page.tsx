'use client';

import { useRouter } from 'next/navigation';
import { WelcomeOnboarding } from '@/components/WelcomeOnboarding';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export default function OnboardingPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) return null;

    return <WelcomeOnboarding onComplete={() => router.push('/dashboard')} />;
}
