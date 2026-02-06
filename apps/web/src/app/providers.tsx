'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { I18nProvider } from '@/components/layout/RTLProvider';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <I18nProvider>
            <AuthProvider>
                {children}
            </AuthProvider>
        </I18nProvider>
    );
}
