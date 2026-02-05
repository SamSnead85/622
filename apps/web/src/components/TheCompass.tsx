'use client';

import { motion } from 'framer-motion';
import {
    VideoIcon,
    BookIcon,
    GlobeIcon,
    UsersIcon,
    EyeIcon,
    EyeOffIcon,
    CompassIcon,
    ZapIcon
} from '@/components/icons';

export type ViewMode = 'standard' | 'immersive' | 'journal';
export type ScopeMode = 'tribe' | 'orbit';

interface TheCompassProps {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    scopeMode: ScopeMode;
    setScopeMode: (mode: ScopeMode) => void;
    zenMode: boolean;
    setZenMode: (zen: boolean) => void;
}

export function TheCompass({
    viewMode,
    setViewMode,
    scopeMode,
    setScopeMode,
    zenMode,
    setZenMode
}: TheCompassProps) {
    return (
        <div className="sticky top-0 z-30 bg-[#050508]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 mb-6">
            <div className="flex items-center justify-between max-w-2xl mx-auto">

                {/* SCOPE SELECTOR (Left) */}
                <div className="flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/5">
                    <button
                        onClick={() => setScopeMode('tribe')}
                        className={`
                            px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2
                            ${scopeMode === 'tribe'
                                ? 'bg-[#00D4FF]/20 text-[#00D4FF] shadow-[0_0_10px_rgba(0,212,255,0.2)]'
                                : 'text-white/40 hover:text-white/80'}
                        `}
                    >
                        <UsersIcon size={14} />
                        Tribe
                    </button>
                    <button
                        onClick={() => setScopeMode('orbit')}
                        className={`
                            px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2
                            ${scopeMode === 'orbit'
                                ? 'bg-violet-500/20 text-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.2)]'
                                : 'text-white/40 hover:text-white/80'}
                        `}
                    >
                        <GlobeIcon size={14} />
                        Orbit
                    </button>
                </div>

                {/* VIEW MODE SELECTOR (Center) */}
                <div className="hidden md:flex items-center gap-4">
                    <button
                        onClick={() => setViewMode('standard')}
                        className={`group flex flex-col items-center gap-1 ${viewMode === 'standard' ? 'opacity-100' : 'opacity-40 hover:opacity-70'} transition-opacity`}
                        title="Standard View"
                    >
                        <ZapIcon size={18} className={viewMode === 'standard' ? 'text-white' : 'text-white'} />
                        <div className={`w-1 h-1 rounded-full ${viewMode === 'standard' ? 'bg-white' : 'bg-transparent'}`} />
                    </button>

                    <button
                        onClick={() => setViewMode('immersive')}
                        className={`group flex flex-col items-center gap-1 ${viewMode === 'immersive' ? 'opacity-100' : 'opacity-40 hover:opacity-70'} transition-opacity`}
                        title="Immersive Video"
                    >
                        <VideoIcon size={18} className={viewMode === 'immersive' ? 'text-white' : 'text-white'} />
                        <div className={`w-1 h-1 rounded-full ${viewMode === 'immersive' ? 'bg-white' : 'bg-transparent'}`} />
                    </button>

                    <button
                        onClick={() => setViewMode('journal')}
                        className={`group flex flex-col items-center gap-1 ${viewMode === 'journal' ? 'opacity-100' : 'opacity-40 hover:opacity-70'} transition-opacity`}
                        title="Journal Mode"
                    >
                        <BookIcon size={18} className={viewMode === 'journal' ? 'text-white' : 'text-white'} />
                        <div className={`w-1 h-1 rounded-full ${viewMode === 'journal' ? 'bg-white' : 'bg-transparent'}`} />
                    </button>
                </div>

                {/* ZEN MODE TOGGLE (Right) */}
                <button
                    onClick={() => setZenMode(!zenMode)}
                    className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all
                        ${zenMode
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-white/[0.02] border-white/5 text-white/40 hover:text-white/60'}
                    `}
                    title={zenMode ? "Disable Zen Mode (Show Metrics)" : "Enable Zen Mode (Hide Metrics)"}
                >
                    {zenMode ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                    <span className="text-xs font-medium hidden sm:inline">
                        {zenMode ? 'Zen: On' : 'Zen'}
                    </span>
                </button>

            </div>
        </div>
    );
}
