'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleOrganizer, Circle, CircleMember, CircleTask } from '@/components/CircleOrganizer';
import { API_URL } from '@/lib/api';

// ============================================================================
// CIRCLE CARD
// ============================================================================

interface CircleCardProps {
    circle: Partial<Circle>;
    onSelect: (circleId: string) => void;
}

function CircleCard({ circle, onSelect }: CircleCardProps) {
    return (
        <motion.div
            whileHover={{ y: -4 }}
            onClick={() => onSelect(circle.id!)}
            className="bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-violet-500/30 cursor-pointer transition-colors"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-2xl">
                    ⭕
                </div>
                {!circle.isPublic && (
                    <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
                        🔒 Private
                    </span>
                )}
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">{circle.name}</h3>
            <p className="text-sm text-white/50 mb-4 line-clamp-2">{circle.description}</p>
            <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                    {circle.members?.slice(0, 4).map((member, idx) => (
                        <div
                            key={member.id}
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 border-2 border-gray-900 flex items-center justify-center text-sm"
                            style={{ zIndex: 10 - idx }}
                        >
                            {member.avatar}
                        </div>
                    ))}
                    {(circle.members?.length || 0) > 4 && (
                        <div className="w-8 h-8 rounded-full bg-white/10 border-2 border-gray-900 flex items-center justify-center text-xs text-white/60">
                            +{(circle.members?.length || 0) - 4}
                        </div>
                    )}
                </div>
                <span className="text-xs text-white/40">
                    {circle.tasks?.filter((t) => t.status !== 'completed').length || 0} active tasks
                </span>
            </div>
        </motion.div>
    );
}

// ============================================================================
// CIRCLES PAGE
// ============================================================================

export default function CirclesPage() {
    const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
    const [showCreateCircle, setShowCreateCircle] = useState(false);
    const [circles, setCircles] = useState<Partial<Circle>[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ activeTasks: 0, members: 0, completed: 0 });

    // Fetch circles from API
    useEffect(() => {
        const fetchCircles = async () => {
            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
                const res = await fetch(`${API_URL}/api/v1/circles`, {
                    headers: {
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    },
                    credentials: 'include',
                });
                if (res.ok) {
                    const data = await res.json();
                    setCircles(data.circles || []);
                    if (data.stats) {
                        setStats(data.stats);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch circles:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCircles();
    }, []);

    if (selectedCircle) {
        return (
            <div className="min-h-screen bg-[#0a0a0f]">
                {/* Back Button */}
                <div className="max-w-6xl mx-auto px-6 py-6">
                    <button
                        onClick={() => setSelectedCircle(null)}
                        className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                    >
                        <span>←</span> Back to Circles
                    </button>
                </div>

                {/* Circle Organizer */}
                <div className="max-w-6xl mx-auto px-6 pb-12">
                    <CircleOrganizer
                        circle={selectedCircle}
                        currentUserId="1"
                        onTaskCreate={() => {}}
                        onTaskUpdate={() => {}}
                        onMemberRoleChange={() => {}}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            {/* Hero Section with Background */}
            <div className="relative overflow-hidden">
                {/* Background Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: 'url(/og-hero.png)' }}
                />
                {/* Dark Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/70 via-[#0a0a0f]/60 to-[#0a0a0f]" />

                {/* Hero Content */}
                <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-24">
                    {/* Main Headline */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-8"
                    >
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm font-medium mb-6">
                            🚀 The ZeroG Moves Forward
                        </span>
                        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
                            Build. Organize. <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500">Rise.</span>
                        </h1>
                        <p className="text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
                            No more begging for platforms that silence us. We build our own.
                            We organize together. We control our narrative.
                        </p>
                    </motion.div>

                    {/* Action Buttons */}
                    <div className="flex justify-center gap-4 mb-12">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowCreateCircle(true)}
                            className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 font-bold text-lg shadow-lg shadow-amber-500/25"
                        >
                            + Create Circle
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-8 py-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium text-lg hover:bg-white/20"
                        >
                            Explore Circles
                        </motion.button>
                    </div>

                    {/* Quote */}
                    <div className="text-center">
                        <p className="text-white/60 italic text-lg">
                            &ldquo;The believers are like a structure, each part strengthening the other&rdquo;
                        </p>
                        <p className="text-amber-400 text-sm mt-1">— Hadith</p>
                    </div>
                </div>
            </div>

            {/* Circles Grid */}
            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Your Circles', value: circles.length, icon: '⭕' },
                        { label: 'Active Tasks', value: stats.activeTasks, icon: '✓' },
                        { label: 'Members', value: stats.members, icon: '👥' },
                        { label: 'Completed', value: stats.completed, icon: '🎯' },
                    ].map(({ label, value, icon }) => (
                        <div key={label} className="bg-white/5 rounded-xl p-5 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">{icon}</span>
                                <span className="text-sm text-white/50">{label}</span>
                            </div>
                            <p className="text-3xl font-bold text-white">{value}</p>
                        </div>
                    ))}
                </div>

                {/* My Circles */}
                <h2 className="text-xl font-semibold text-white mb-4">My Circles</h2>
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                    </div>
                ) : circles.length === 0 ? (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                        <span className="text-4xl mb-4 block">⭕</span>
                        <p className="text-white/50 mb-4">You haven&apos;t joined any circles yet. Create one to start organizing.</p>
                        <button
                            onClick={() => setShowCreateCircle(true)}
                            className="px-6 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium text-sm"
                        >
                            Create Your First Circle
                        </button>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {circles.map((circle) => (
                            <CircleCard
                                key={circle.id}
                                circle={circle}
                                onSelect={() => setSelectedCircle(circle as Circle)}
                            />
                        ))}
                    </div>
                )}

                {/* Call to Action */}
                <div className="mt-12 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 rounded-2xl p-8 border border-violet-500/20 text-center">
                    <h3 className="text-xl font-bold text-white mb-2">
                        Stop begging for platforms. Build your own.
                    </h3>
                    <p className="text-white/60 mb-6">
                        Create a Circle for your cause, connect with like-minded activists, and organize real action.
                    </p>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-8 py-3 rounded-xl bg-white text-gray-900 font-medium"
                    >
                        Start Your Circle
                    </motion.button>
                </div>
            </div>

            {/* Create Circle Modal */}
            <AnimatePresence>
                {showCreateCircle && (
                    <CreateCircleModal onClose={() => setShowCreateCircle(false)} />
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================================================
// CREATE CIRCLE MODAL
// ============================================================================

function CreateCircleModal({ onClose }: { onClose: () => void }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(true);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gray-900 rounded-2xl border border-white/10 p-6 max-w-lg w-full"
            >
                <h3 className="text-xl font-bold text-white mb-6">Create New Circle</h3>
                <form className="space-y-4">
                    <div>
                        <label className="block text-sm text-white/60 mb-1">Circle Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Palestine Action Coalition"
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-white/60 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What is this circle about?"
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 resize-none"
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                        <div>
                            <p className="text-white font-medium">Public Circle</p>
                            <p className="text-sm text-white/50">Anyone can discover and join</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsPublic(!isPublic)}
                            className={`w-12 h-6 rounded-full transition-colors ${isPublic ? 'bg-violet-500' : 'bg-white/20'}`}
                        >
                            <motion.div
                                animate={{ x: isPublic ? 24 : 2 }}
                                className="w-5 h-5 bg-white rounded-full"
                            />
                        </button>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 font-medium hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <motion.button
                            type="submit"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium"
                        >
                            Create Circle
                        </motion.button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}
