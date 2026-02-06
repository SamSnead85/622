'use client';

import { motion } from 'framer-motion';

interface SecurityShieldProps {
    variant?: 'inline' | 'banner' | 'badge';
    message?: string;
}

export function SecurityShield({ variant = 'inline', message }: SecurityShieldProps) {
    if (variant === 'badge') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                <svg width={10} height={10} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                </svg>
                Protected
            </span>
        );
    }

    if (variant === 'banner') {
        return (
            <motion.div
                className="flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-emerald-500/10 border-b border-emerald-500/10"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="#10B981">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                </svg>
                <span className="text-emerald-400 text-xs font-medium">
                    {message || 'Your activity on ZeroG is private and encrypted'}
                </span>
            </motion.div>
        );
    }

    // Default: inline
    return (
        <span className="inline-flex items-center gap-1 text-emerald-400/70 text-xs">
            <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            </svg>
            {message || 'Protected'}
        </span>
    );
}
