'use client';

import { Suspense } from 'react';
import GameJoinContent from './GameJoinContent';

// ============================================
// Game Join Page — Wrapper with Suspense for useSearchParams
// ============================================

export default function GameJoinPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
                </div>
            }
        >
            <GameJoinContent />
        </Suspense>
    );
}
