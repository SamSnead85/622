'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { BulletinBoard } from '@/components/BulletinBoard';
import { BulletinComposer } from '@/components/BulletinComposer';
import {
    HomeIcon,
    SearchIcon,
    UsersIcon,
    MegaphoneIcon,
    MessageIcon,
    BellIcon,
    SettingsIcon,
} from '@/components/icons';

// ============================================
// NAVIGATION
// ============================================

function Navigation({ activeTab }: { activeTab: string }) {
    const navItems = [
        { id: 'home', icon: <HomeIcon size={22} />, label: 'Home', href: '/dashboard' },
        { id: 'explore', icon: <SearchIcon size={22} />, label: 'Explore', href: '/explore' },
        { id: 'communities', icon: <UsersIcon size={22} />, label: 'Tribes', href: '/communities' },
        { id: 'bulletin', icon: <MegaphoneIcon size={22} />, label: 'Bulletin', href: '/bulletin' },
        { id: 'messages', icon: <MessageIcon size={22} />, label: 'Messages', href: '/messages' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:relative md:bottom-auto bg-black/80 backdrop-blur-xl border-t border-white/10 md:border-t-0 md:border-r md:min-h-screen md:w-20 lg:w-64">
            <div className="flex md:flex-col justify-around md:justify-start md:pt-8 md:gap-2 px-2 py-2 md:px-4">
                {navItems.map((item) => (
                    <Link
                        key={item.id}
                        href={item.href}
                        className={`flex items-center justify-center lg:justify-start gap-3 p-3 rounded-xl transition-all ${activeTab === item.id
                            ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {item.icon}
                        <span className="hidden lg:block font-medium">{item.label}</span>
                    </Link>
                ))}
            </div>
        </nav>
    );
}

// ============================================
// BULLETIN PAGE
// ============================================

export default function BulletinPage() {
    const { isAuthenticated, isLoading } = useAuth();
    const [showComposer, setShowComposer] = useState(false);

    // Handle post creation
    const handleCreatePost = useCallback(() => {
        setShowComposer(true);
    }, []);

    const handlePostCreated = useCallback(() => {
        setShowComposer(false);
        // TODO: Refresh posts
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#0A0A0F] to-[#121218] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-cyan-500/50 border-t-cyan-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0A0A0F] to-[#121218]">
            <div className="flex">
                {/* Navigation */}
                <Navigation activeTab="bulletin" />

                {/* Main Content */}
                <main className="flex-1 pb-24 md:pb-8 overflow-y-auto">
                    <div className="max-w-4xl mx-auto px-4 py-8">
                        {/* Bulletin Board */}
                        <BulletinBoard
                            showComposer={isAuthenticated}
                            onCreatePost={handleCreatePost}
                        />
                    </div>
                </main>

                {/* Right Sidebar - Desktop Only */}
                <aside className="hidden xl:block w-80 p-6 border-l border-white/10">
                    {/* Trending Topics */}
                    <div className="bg-white/5 rounded-2xl p-5 mb-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Trending Topics</h3>
                        <div className="space-y-3">
                            {['community', 'ramadan', 'events', 'volunteer'].map((tag) => (
                                <div key={tag} className="flex items-center gap-2">
                                    <span className="text-cyan-400">#</span>
                                    <span className="text-white/80">{tag}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-white/5 rounded-2xl p-5">
                        <h3 className="text-lg font-semibold text-white mb-4">Community Pulse</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-white/60">Active needs</span>
                                <span className="text-rose-400 font-medium">3</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/60">Upcoming events</span>
                                <span className="text-purple-400 font-medium">5</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/60">This week&apos;s posts</span>
                                <span className="text-cyan-400 font-medium">24</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Composer Modal */}
            <AnimatePresence>
                {showComposer && (
                    <BulletinComposer
                        isOpen={showComposer}
                        onClose={() => setShowComposer(false)}
                        onSubmit={handlePostCreated}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
