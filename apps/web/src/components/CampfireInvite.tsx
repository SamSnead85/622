'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_ENDPOINTS, apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface User {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
}

interface CampfireInviteProps {
    isOpen: boolean;
    onClose: () => void;
    streamTitle: string;
}

export function CampfireInvite({ isOpen, onClose, streamTitle }: CampfireInviteProps) {
    const { user } = useAuth();
    const [friends, setFriends] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [pinged, setPinged] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen && user?.id) {
            fetchFriends();
        }
    }, [isOpen, user?.id]);

    const fetchFriends = async () => {
        try {
            setLoading(true);
            // Fetch who I am following as a proxy for "Friends" to ping
            const res = await apiFetch(`${API_ENDPOINTS.users}/${user?.id}/following`);
            const data = await res.json();
            if (data.following) {
                setFriends(data.following);
            }
        } catch (error) {
            console.error('Failed to load friends', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePing = async (targetId: string) => {
        setPinged(prev => new Set(prev).add(targetId));
        try {
            // Using the "Wave" endpoint as a generic "Ping" mechanism for now
            // Message format: "is LIVE: [Title]"
            await apiFetch(`${API_ENDPOINTS.users}/${targetId}/wave`, {
                method: 'POST',
                body: JSON.stringify({
                    message: `is LIVE right now: "${streamTitle}" 🔥 Tap to watch!`
                })
            });
        } catch (error) {
            console.error('Ping failed', error);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                    >
                        <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-6 pointer-events-auto m-4">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-white">Tap In Friends</h2>
                                <button onClick={onClose} className="text-white/50 hover:text-white">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                                {loading ? (
                                    <div className="text-center py-8 text-white/50">
                                        <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                        Loading your circle...
                                    </div>
                                ) : friends.length === 0 ? (
                                    <div className="text-center py-8 text-white/50">
                                        You aren&apos;t following anyone yet.
                                    </div>
                                ) : (
                                    friends.map(friend => (
                                        <div key={friend.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden relative">
                                                    {friend.avatarUrl ? (
                                                        <img src={friend.avatarUrl} alt={friend.username} className="object-cover w-full h-full" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/50">
                                                            {friend.username[0].toUpperCase()}
                                                        </div>
                                                    )}
                                                    {/* Mock Online Status */}
                                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-gray-900" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-white">{friend.displayName}</h3>
                                                    <p className="text-xs text-white/50">@{friend.username}</p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handlePing(friend.id)}
                                                disabled={pinged.has(friend.id)}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${pinged.has(friend.id)
                                                        ? 'bg-emerald-500/20 text-emerald-500 cursor-default'
                                                        : 'bg-rose-500 text-white hover:bg-rose-600 hover:scale-105'
                                                    }`}
                                            >
                                                {pinged.has(friend.id) ? 'Pinged' : 'Tap In'}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <p className="mt-4 text-center text-xs text-white/30">
                                Sending a ping will notify them instantly.
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
