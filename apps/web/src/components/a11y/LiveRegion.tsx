'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';

interface LiveRegionContextType {
    announce: (message: string, politeness?: 'polite' | 'assertive') => void;
}

const LiveRegionContext = createContext<LiveRegionContextType>({
    announce: () => {},
});

export function useAnnounce() {
    const { announce } = useContext(LiveRegionContext);
    return announce;
}

export function LiveRegionProvider({ children }: { children: React.ReactNode }) {
    const [politeMessage, setPoliteMessage] = useState('');
    const [assertiveMessage, setAssertiveMessage] = useState('');
    const clearTimerRef = useRef<NodeJS.Timeout | null>(null);

    const announce = useCallback((message: string, politeness: 'polite' | 'assertive' = 'polite') => {
        // Clear existing timer
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);

        // Clear first to force re-announce of same message
        if (politeness === 'polite') {
            setPoliteMessage('');
            requestAnimationFrame(() => setPoliteMessage(message));
        } else {
            setAssertiveMessage('');
            requestAnimationFrame(() => setAssertiveMessage(message));
        }

        // Clear after 5 seconds
        clearTimerRef.current = setTimeout(() => {
            setPoliteMessage('');
            setAssertiveMessage('');
        }, 5000);
    }, []);

    return (
        <LiveRegionContext.Provider value={{ announce }}>
            {children}
            {/* Screen reader live regions */}
            <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
            >
                {politeMessage}
            </div>
            <div
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
                className="sr-only"
            >
                {assertiveMessage}
            </div>
        </LiveRegionContext.Provider>
    );
}
