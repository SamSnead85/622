"use client";

/**
 * CREATE BULLETIN POST
 * Form for creating new community posts (jobs, events, collaborations, etc.)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';

const POST_TYPES = [
    { value: 'DISCUSSION', label: 'Discussion', icon: '💬', description: 'Start a conversation' },
    { value: 'EVENT', label: 'Event', icon: '📅', description: 'Protests, meetups, rallies' },
    { value: 'JOB', label: 'Job', icon: '💼', description: 'Career opportunities' },
    { value: 'COLLABORATION', label: 'Collaboration', icon: '🤝', description: 'Find co-founders, partners' },
    { value: 'INVESTMENT', label: 'Investment', icon: '💰', description: 'Seeking investors' },
    { value: 'CALL_TO_ACTION', label: 'Call to Action', icon: '⚡', description: 'Mobilize the community' },
    { value: 'ANNOUNCEMENT', label: 'Announcement', icon: '📢', description: 'Important news' },
];

const CATEGORIES = [
    { value: 'SOCIAL_JUSTICE', label: 'Social Justice', icon: '✊' },
    { value: 'ACTIVISM', label: 'Activism', icon: '📣' },
    { value: 'CAREER', label: 'Career', icon: '💼' },
    { value: 'BUSINESS', label: 'Business', icon: '📊' },
    { value: 'COMMUNITY', label: 'Community', icon: '🏘️' },
    { value: 'CULTURE', label: 'Culture', icon: '🎭' },
    { value: 'TECH', label: 'Tech', icon: '💻' },
    { value: 'GENERAL', label: 'General', icon: '🌐' },
];

export default function CreateBulletinPage() {
    const router = useRouter();
    const { isAuthenticated, user } = useAuth();

    const [step, setStep] = useState(1);
    const [type, setType] = useState('');
    const [category, setCategory] = useState('');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [location, setLocation] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [externalLink, setExternalLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Redirect if not authenticated
    if (typeof window !== 'undefined' && !isAuthenticated) {
        router.push('/login?redirect=/community/create');
        return null;
    }

    const handleSubmit = async () => {
        if (!type || !category || !title || !content) {
            setError('Please fill in all required fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await apiFetch('/community/bulletins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    category,
                    title,
                    content,
                    location: location || undefined,
                    eventDate: eventDate ? new Date(eventDate).toISOString() : undefined,
                    externalLink: externalLink || undefined,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create post');
            }

            router.push('/community');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to create post');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050508]">
            <Navigation activeTab="community" />

            <main className="pt-24 pb-24">
                <div className="max-w-2xl mx-auto px-4">
                    {/* Progress */}
                    <div className="flex items-center gap-4 mb-8">
                        {[1, 2, 3].map(s => (
                            <div
                                key={s}
                                className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? 'bg-gradient-to-r from-orange-500 to-violet-500' : 'bg-white/10'}`}
                            />
                        ))}
                    </div>

                    {/* Step 1: Type Selection */}
                    {step === 1 && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-6"
                        >
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold text-white mb-2">What are you sharing?</h1>
                                <p className="text-white/60">Choose the type of post</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {POST_TYPES.map(t => (
                                    <button
                                        key={t.value}
                                        onClick={() => { setType(t.value); setStep(2); }}
                                        className={`p-5 rounded-2xl border text-left transition-all ${type === t.value ? 'border-orange-500 bg-orange-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                                    >
                                        <div className="text-3xl mb-2">{t.icon}</div>
                                        <h3 className="font-semibold text-white">{t.label}</h3>
                                        <p className="text-sm text-white/50">{t.description}</p>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2: Category & Content */}
                    {step === 2 && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-6"
                        >
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold text-white mb-2">Tell us more</h1>
                                <p className="text-white/60">Fill in the details</p>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-3">Category</label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIES.map(c => (
                                        <button
                                            key={c.value}
                                            onClick={() => setCategory(c.value)}
                                            className={`px-4 py-2 rounded-full text-sm transition-colors ${category === c.value ? 'bg-white text-black font-semibold' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                                        >
                                            {c.icon} {c.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">Title *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="A compelling title..."
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    maxLength={200}
                                />
                            </div>

                            {/* Content */}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">Content *</label>
                                <textarea
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    placeholder="Tell the community what this is about..."
                                    rows={6}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                                    maxLength={10000}
                                />
                            </div>

                            {/* Event-specific fields */}
                            {type === 'EVENT' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-2">Event Date</label>
                                        <input
                                            type="datetime-local"
                                            value={eventDate}
                                            onChange={e => setEventDate(e.target.value)}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-2">Location</label>
                                        <input
                                            type="text"
                                            value={location}
                                            onChange={e => setLocation(e.target.value)}
                                            placeholder="City, Address, or 'Online'"
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                </>
                            )}

                            {/* External Link */}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">External Link (optional)</label>
                                <input
                                    type="url"
                                    value={externalLink}
                                    onChange={e => setExternalLink(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => category && title && content ? setStep(3) : setError('Please fill in all required fields')}
                                    className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-violet-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                                >
                                    Preview →
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Preview & Submit */}
                    {step === 3 && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-6"
                        >
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold text-white mb-2">Preview</h1>
                                <p className="text-white/60">Review before posting</p>
                            </div>

                            {/* Preview Card */}
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-violet-500 flex items-center justify-center text-white font-bold text-lg">
                                        {user?.displayName?.[0] || 'U'}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-white">{user?.displayName}</div>
                                        <div className="text-sm text-white/50">Just now</div>
                                    </div>
                                    <div className="ml-auto px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-violet-500 text-white text-sm">
                                        {POST_TYPES.find(t => t.value === type)?.icon} {POST_TYPES.find(t => t.value === type)?.label}
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                                <p className="text-white/70 mb-4 whitespace-pre-wrap">{content}</p>

                                {type === 'EVENT' && eventDate && (
                                    <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl mb-4">
                                        <div className="text-2xl">📅</div>
                                        <div>
                                            <div className="text-white font-medium">{new Date(eventDate).toLocaleString()}</div>
                                            {location && <div className="text-white/60 text-sm">📍 {location}</div>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setStep(2)}
                                    disabled={loading}
                                    className="flex-1 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-violet-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Posting...
                                        </>
                                    ) : (
                                        'Post to Community 🚀'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
}
