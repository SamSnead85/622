'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { NavigationSidebar } from '@/components/dashboard/NavigationSidebar';
import { useAuth } from '@/contexts/AuthContext';
import {
    AdventureList,
    CreateAdventureWizard,
    useTravelAdventures,
    TravelAdventure,
    TravelResponse
} from '@/components/TravelAdventure';
import {
    ArrowLeftIcon,
    PlusIcon,
    MapIcon,
    CalendarIcon,
    UsersIcon,
} from '@/components/icons';

// ============================================
// ADVENTURES PAGE - WHO'S IN? TRAVEL POLLS
// Plan adventures with your family and groups
// ============================================

export default function AdventuresPage() {
    const { user } = useAuth();
    const { adventures, isLoading, createAdventure, respondToAdventure } = useTravelAdventures();
    const [showWizard, setShowWizard] = useState(false);
    const [filter, setFilter] = useState<'all' | 'planning' | 'confirmed' | 'past'>('all');

    // Filter adventures
    const filteredAdventures = adventures.filter(a => {
        const startDate = new Date(a.proposedDates.start);
        const isPast = startDate < new Date();

        if (filter === 'all') return !isPast;
        if (filter === 'past') return isPast;
        if (filter === 'planning') return a.status === 'planning' && !isPast;
        if (filter === 'confirmed') return a.status === 'confirmed' && !isPast;
        return true;
    });

    // Sort by date
    const sortedAdventures = [...filteredAdventures].sort((a, b) => {
        return new Date(a.proposedDates.start).getTime() - new Date(b.proposedDates.start).getTime();
    });

    // Stats
    const stats = {
        upcoming: adventures.filter(a => new Date(a.proposedDates.start) >= new Date()).length,
        confirmed: adventures.filter(a => a.status === 'confirmed').length,
        totalResponses: adventures.reduce((sum, a) => sum + a.responses.length, 0),
    };

    const handleCreateAdventure = (adventure: TravelAdventure) => {
        createAdventure(adventure);
        setShowWizard(false);
    };

    const handleRespond = (adventureId: string, status: TravelResponse['status'], message?: string) => {
        if (!user) return;
        respondToAdventure(adventureId, {
            userId: user.id,
            displayName: user.displayName || user.username || 'You',
            avatarUrl: user.avatarUrl,
            status,
            message,
        });
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-[#0A0A0F]">
                <NavigationSidebar />
                <main className="lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
                    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                        <div className="text-6xl mb-4">🗺️</div>
                        <h1 className="text-2xl font-bold mb-2">Sign in to plan adventures</h1>
                        <p className="text-white/50 mb-6">Join your family and friends on exciting trips!</p>
                        <Link
                            href="/login"
                            className="inline-block px-6 py-3 rounded-xl bg-[#00D4FF] text-black font-semibold hover:opacity-90"
                        >
                            Sign In
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0F]">
            <NavigationSidebar />

            <main className="lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[#00D4FF]/20 via-[#8B5CF6]/10 to-transparent">
                    <div className="absolute inset-0 bg-[url('/patterns/topography.svg')] opacity-5" />
                    <div className="max-w-4xl mx-auto px-4 py-12 relative">
                        <div className="flex items-center gap-4 mb-6">
                            <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                                <ArrowLeftIcon size={20} className="text-white" />
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold text-white">Adventures</h1>
                                <p className="text-white/60">Plan trips and see who&apos;s in! 🚀</p>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-3 gap-4">
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="p-4 rounded-2xl bg-white/5 backdrop-blur border border-white/10"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-[#00D4FF]/20">
                                        <MapIcon size={24} className="text-[#00D4FF]" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-white">{stats.upcoming}</div>
                                        <div className="text-sm text-white/50">Upcoming</div>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="p-4 rounded-2xl bg-white/5 backdrop-blur border border-white/10"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-emerald-500/20">
                                        <CalendarIcon size={24} className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-white">{stats.confirmed}</div>
                                        <div className="text-sm text-white/50">Confirmed</div>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="p-4 rounded-2xl bg-white/5 backdrop-blur border border-white/10"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-purple-500/20">
                                        <UsersIcon size={24} className="text-purple-400" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-white">{stats.totalResponses}</div>
                                        <div className="text-sm text-white/50">Responses</div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="sticky top-0 z-40 bg-[#0A0A0F]/95 backdrop-blur-xl border-b border-white/5">
                    <div className="max-w-4xl mx-auto px-4 py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                {(['all', 'planning', 'confirmed', 'past'] as const).map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${filter === f
                                            ? 'bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white'
                                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                                            }`}
                                    >
                                        {f === 'all' && '🌎 All'}
                                        {f === 'planning' && '📋 Planning'}
                                        {f === 'confirmed' && '✅ Confirmed'}
                                        {f === 'past' && '📸 Past'}
                                    </button>
                                ))}
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowWizard(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-white font-medium shadow-lg shadow-[#00D4FF]/20"
                            >
                                <PlusIcon size={18} />
                                <span className="hidden sm:inline">Plan Adventure</span>
                            </motion.button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-4xl mx-auto px-4 py-6">
                    {isLoading ? (
                        <div className="space-y-6">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-[400px] rounded-3xl bg-white/[0.02] animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <AdventureList
                            adventures={sortedAdventures}
                            currentUserId={user.id}
                            onRespond={handleRespond}
                            onCreateNew={() => setShowWizard(true)}
                            emptyMessage={
                                filter === 'past'
                                    ? "No past adventures yet!"
                                    : filter === 'confirmed'
                                        ? "No confirmed adventures yet!"
                                        : "No adventures planned yet!"
                            }
                        />
                    )}
                </div>
            </main>

            {/* Create Wizard Modal */}
            {showWizard && (
                <CreateAdventureWizard
                    creatorId={user.id}
                    creatorName={user.displayName || user.username || 'You'}
                    creatorAvatar={user.avatarUrl}
                    onComplete={handleCreateAdventure}
                    onCancel={() => setShowWizard(false)}
                />
            )}
        </div>
    );
}
