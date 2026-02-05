'use client';

import { useRouter } from 'next/navigation';
import { WelcomeOnboarding } from '@/components/WelcomeOnboarding';
import InterestSelector from '@/components/InterestSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OnboardingPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading } = useAuth();
    const [step, setStep] = useState<'welcome' | 'interests'>('welcome');

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

    return (
        <AnimatePresence mode="wait">
            {step === 'welcome' ? (
                <motion.div
                    key="welcome"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -100 }}
                >
                    <WelcomeOnboarding onComplete={() => setStep('interests')} />
                </motion.div>
            ) : (
                <motion.div
                    key="interests"
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                >
                    <InterestSelector
                        onComplete={() => router.push('/dashboard')}
                        onSkip={() => router.push('/dashboard')}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
