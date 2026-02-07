'use client';

import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth, ProtectedRoute } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';
import { BulletinBoard } from '@/components/BulletinBoard';
import { BulletinComposer } from '@/components/BulletinComposer';

// ============================================
// BULLETIN PAGE
// Community bulletin board: events, jobs,
// looking-for, services, discussions
// ============================================

function BulletinPageContent() {
    const { user, isAuthenticated } = useAuth();
    const [showComposer, setShowComposer] = useState(false);

    const handleCreatePost = useCallback(() => {
        setShowComposer(true);
    }, []);

    const handlePostCreated = useCallback(() => {
        setShowComposer(false);
        // Refresh handled by BulletinBoard component internally
    }, []);

    return (
        <div className="min-h-screen bg-[#050508] text-white">
            {/* Shared Navigation */}
            <Navigation
                activeTab="bulletin"
                userAvatarUrl={user?.avatarUrl}
                displayName={user?.displayName}
                username={user?.username}
            />

            {/* Main Content */}
            <main className="lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
                <div className="max-w-4xl mx-auto px-4 py-6 lg:py-8">
                    <BulletinBoard
                        showComposer={isAuthenticated}
                        onCreatePost={handleCreatePost}
                    />
                </div>
            </main>

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

export default function BulletinPage() {
    return (
        <ProtectedRoute>
            <BulletinPageContent />
        </ProtectedRoute>
    );
}
