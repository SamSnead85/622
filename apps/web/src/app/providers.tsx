'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { AIAssistant } from '@/components/AIAssistant';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            {children}
            <AIAssistant />
        </AuthProvider>
    );
}
