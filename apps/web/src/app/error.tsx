'use client';

import { useEffect } from 'react';
import { captureException } from '@/lib/sentry';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log to error reporting service
        console.error('Application error:', error);
        captureException(error, {
            tags: {
                errorBoundary: true,
                digest: error.digest,
            },
            extra: {
                digest: error.digest,
            },
        });
    }, [error]);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="text-center max-w-md">
                <div className="w-24 h-24 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-8">
                    <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={1.5}>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">An unexpected error occurred</h1>
                <p className="text-white/40 text-sm mb-8">
                    We hit an unexpected error. Your data is safe — nothing was lost.
                    {error.digest && (
                        <span className="block mt-2 text-white/20 text-xs font-mono">
                            Error ID: {error.digest}
                        </span>
                    )}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="px-6 py-3 rounded-xl bg-[#D4AF37] text-black font-semibold text-sm hover:opacity-90 transition-opacity"
                    >
                        Try Again
                    </button>
                    <a
                        href="/dashboard"
                        className="px-6 py-3 rounded-xl bg-white/10 text-white font-medium text-sm hover:bg-white/15 transition-colors"
                    >
                        Go to Feed
                    </a>
                </div>
                <p className="mt-12 text-white/20 text-xs">
                    ZeroG — Social Media Without the Weight
                </p>
            </div>
        </div>
    );
}
