'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export type FeedMode = 'standard' | 'immersive' | 'video';

interface FeedModeToggleProps {
    mode: FeedMode;
    onChange: (mode: FeedMode) => void;
}

export function FeedModeToggle({ mode, onChange }: FeedModeToggleProps) {
    const modes: { key: FeedMode; icon: React.ReactNode; label: string }[] = [
        {
            key: 'standard',
            label: 'Standard',
            icon: (
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
            ),
        },
        {
            key: 'immersive',
            label: 'Immersive',
            icon: (
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="2" y="3" width="20" height="18" rx="2" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                </svg>
            ),
        },
        {
            key: 'video',
            label: 'Video',
            icon: (
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
            ),
        },
    ];

    return (
        <div className="flex bg-white/5 rounded-xl p-1">
            {modes.map(({ key, icon, label }) => (
                <button
                    key={key}
                    onClick={() => onChange(key)}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        mode === key ? 'text-white' : 'text-white/40 hover:text-white/60'
                    }`}
                    aria-label={`${label} view`}
                    aria-pressed={mode === key}
                >
                    {mode === key && (
                        <motion.div
                            layoutId="feedModeIndicator"
                            className="absolute inset-0 bg-white/10 rounded-lg"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                    )}
                    <span className="relative z-10">{icon}</span>
                    <span className="relative z-10 hidden sm:inline">{label}</span>
                </button>
            ))}
        </div>
    );
}

// Persistence hook
export function useFeedMode(): [FeedMode, (mode: FeedMode) => void] {
    const [mode, setMode] = useState<FeedMode>('standard');

    useEffect(() => {
        const saved = localStorage.getItem('0g_feed_mode') as FeedMode | null;
        if (saved && ['standard', 'immersive', 'video'].includes(saved)) {
            setMode(saved);
        }
    }, []);

    const setAndSave = (newMode: FeedMode) => {
        setMode(newMode);
        localStorage.setItem('0g_feed_mode', newMode);
    };

    return [mode, setAndSave];
}
