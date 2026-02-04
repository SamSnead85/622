/**
 * Offline Status Component
 * Displays network status to users and handles offline gracefully
 */

'use client';

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// NETWORK STATUS CONTEXT
// ============================================

interface NetworkContextValue {
    isOnline: boolean;
    isSlowConnection: boolean;
    connectionType: string | null;
}

const NetworkContext = createContext<NetworkContextValue>({
    isOnline: true,
    isSlowConnection: false,
    connectionType: null,
});

export function useNetworkStatus() {
    return useContext(NetworkContext);
}

// ============================================
// NETWORK PROVIDER
// ============================================

export function NetworkProvider({ children }: { children: ReactNode }) {
    const [isOnline, setIsOnline] = useState(true);
    const [isSlowConnection, setIsSlowConnection] = useState(false);
    const [connectionType, setConnectionType] = useState<string | null>(null);

    useEffect(() => {
        // Set initial state
        setIsOnline(navigator.onLine);

        // Check connection quality
        const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
        if (connection) {
            setConnectionType(connection.effectiveType);
            setIsSlowConnection(connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g');
        }

        // Event handlers
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        const handleConnectionChange = () => {
            if (connection) {
                setConnectionType(connection.effectiveType);
                setIsSlowConnection(connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g');
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        connection?.addEventListener('change', handleConnectionChange);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            connection?.removeEventListener('change', handleConnectionChange);
        };
    }, []);

    return (
        <NetworkContext.Provider value={{ isOnline, isSlowConnection, connectionType }}>
            {children}
        </NetworkContext.Provider>
    );
}

// ============================================
// OFFLINE BANNER
// ============================================

export function OfflineBanner() {
    const { isOnline, isSlowConnection } = useNetworkStatus();
    const [dismissed, setDismissed] = useState(false);

    // Reset dismissed state when coming back online
    useEffect(() => {
        if (isOnline) setDismissed(false);
    }, [isOnline]);

    if (dismissed) return null;

    return (
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-black px-4 py-3"
                >
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">📡</span>
                            <div>
                                <p className="font-medium">You're offline</p>
                                <p className="text-sm opacity-75">
                                    Some features may be unavailable until you reconnect
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setDismissed(true)}
                            className="p-2 hover:bg-black/10 rounded-lg"
                        >
                            ✕
                        </button>
                    </div>
                </motion.div>
            )}
            {isOnline && isSlowConnection && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-[100] bg-orange-500/90 text-white px-4 py-2"
                >
                    <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm">
                        <span>⚡</span>
                        <span>Slow connection detected. Some content may take longer to load.</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ============================================
// NETWORK INFO TYPE
// ============================================

interface NetworkInformation extends EventTarget {
    effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
    downlink: number;
    rtt: number;
    saveData: boolean;
}

// ============================================
// EXPORTS
// ============================================

const OfflineSupport = {
    NetworkProvider,
    useNetworkStatus,
    OfflineBanner,
};

export default OfflineSupport;
