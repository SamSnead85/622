'use client';

import { ReactNode, useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { I18nProvider } from '@/components/layout/RTLProvider';

function useServiceWorkerRegistration() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
            navigator.serviceWorker.register('/sw.js').catch(() => {
                // Service worker registration failed -- non-critical
            });
        }
    }, []);
}

export function Providers({ children }: { children: ReactNode }) {
    useServiceWorkerRegistration();

    return (
        <I18nProvider>
            <AuthProvider>
                {children}
            </AuthProvider>
        </I18nProvider>
    );
}
