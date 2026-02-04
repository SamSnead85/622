"use client";

/**
 * SUGGEST LIVE STREAM
 * Form for suggesting external streams (YouTube, Twitch, Facebook)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

const PLATFORM_EXAMPLES = [
    { platform: 'YouTube', icon: '🔴', example: 'youtube.com/watch?v=...' },
    { platform: 'Twitch', icon: '💜', example: 'twitch.tv/channelname' },
    { platform: 'Facebook', icon: '🔵', example: 'facebook.com/.../videos/...' },
];

export default function SuggestStreamPage() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();

    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (typeof window !== 'undefined' && !isAuthenticated) {
        router.push('/login?redirect=/community/streams/suggest');
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!url || !title) {
            setError('Please fill in the stream URL and title');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await apiFetch('/community/streams/suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, title, description }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to submit stream');
            }

            router.push('/community?tab=streams');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to submit stream');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050508]">
            <Navigation activeTab="community" />

            <main className="pt-24 pb-24">
                <div className="max-w-xl mx-auto px-4">
                    {/* Back Link */}
                    <Link
                        href="/community"
                        className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
                    >
                        ← Back to Community
                    </Link>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10"
                    >
                        <div className="text-center mb-8">
                            <div className="text-5xl mb-4">📺</div>
                            <h1 className="text-2xl font-bold text-white mb-2">Suggest a Live Stream</h1>
                            <p className="text-white/60">Share an important stream with the community</p>
                        </div>

                        {/* Platform Examples */}
                        <div className="flex justify-center gap-6 mb-8 p-4 bg-white/5 rounded-xl">
                            {PLATFORM_EXAMPLES.map(p => (
                                <div key={p.platform} className="text-center">
                                    <div className="text-2xl mb-1">{p.icon}</div>
                                    <div className="text-sm font-medium text-white">{p.platform}</div>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* URL */}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">
                                    Stream URL *
                                </label>
                                <input
                                    type="url"
                                    value={url}
                                    onChange={e => setUrl(e.target.value)}
                                    placeholder="https://youtube.com/watch?v=..."
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    required
                                />
                                <p className="text-xs text-white/40 mt-2">
                                    Supported: YouTube, Twitch, Facebook Live
                                </p>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="What's this stream about?"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    maxLength={200}
                                    required
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">
                                    Why should we watch? (optional)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Tell the community why this stream is important..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                    maxLength={1000}
                                />
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400">
                                    {error}
                                </div>
                            )}

                            {/* Info box */}
                            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                                <h4 className="font-medium text-blue-400 mb-2">ℹ️ How it works</h4>
                                <ul className="text-sm text-white/60 space-y-1">
                                    <li>• Your suggestion goes to the community for voting</li>
                                    <li>• Streams with 5+ upvotes get auto-approved</li>
                                    <li>• Approved streams appear in the Live Now section</li>
                                </ul>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-red-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Stream Suggestion 📺'
                                )}
                            </button>
                        </form>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
