'use client';

import { useState, useRef, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// ============================================
// CREATE PAGE - Post, Moment, Journey creation
// ============================================

type ContentType = 'post' | 'moment' | 'journey';

interface MediaItem {
    id: string;
    type: 'image' | 'video';
    url: string;
    file?: File;
}

function CreateContent() {
    const searchParams = useSearchParams();
    const initialType = (searchParams.get('type') as ContentType) || 'post';

    const [contentType, setContentType] = useState<ContentType>(initialType);
    const [caption, setCaption] = useState('');
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [isPosting, setIsPosting] = useState(false);
    const [showAudienceSelect, setShowAudienceSelect] = useState(false);
    const [audience, setAudience] = useState<'public' | 'friends' | 'private'>('public');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newMedia: MediaItem[] = [];
        Array.from(files).forEach(file => {
            const id = `${Date.now()}-${Math.random()}`;
            const type = file.type.startsWith('video') ? 'video' : 'image';
            const url = URL.createObjectURL(file);
            newMedia.push({ id, type, url, file });
        });
        setMedia(prev => [...prev, ...newMedia]);
    }, []);

    const removeMedia = useCallback((id: string) => {
        setMedia(prev => {
            const item = prev.find(m => m.id === id);
            if (item) URL.revokeObjectURL(item.url);
            return prev.filter(m => m.id !== id);
        });
    }, []);

    const handlePost = useCallback(async () => {
        if (!caption.trim() && media.length === 0) return;

        setIsPosting(true);
        // Simulate posting
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsPosting(false);
        // Would redirect to dashboard
        window.location.href = '/dashboard';
    }, [caption, media.length]);

    const contentTypes = [
        { id: 'post', label: 'Post', icon: '📝', desc: 'Share thoughts, photos, or videos' },
        { id: 'moment', label: 'Moment', icon: '✨', desc: 'A 24-hour story highlight' },
        { id: 'journey', label: 'Journey', icon: '🗺️', desc: 'A collection of connected moments' },
    ];

    const audiences = [
        { id: 'public', label: 'Everyone', icon: '🌍', desc: 'Visible to all users' },
        { id: 'friends', label: 'Friends', icon: '👥', desc: 'Only your friends can see' },
        { id: 'private', label: 'Only Me', icon: '🔒', desc: 'Save privately' },
    ];

    return (
        <div className="min-h-screen bg-[#050508] relative">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/3 w-80 h-80 rounded-full bg-violet-500/5 blur-[100px]" />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-30 px-4 py-4 bg-black/60 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">
                        ← Cancel
                    </Link>
                    <h1 className="text-lg font-semibold text-white">Create</h1>
                    <motion.button
                        onClick={handlePost}
                        disabled={isPosting || (!caption.trim() && media.length === 0)}
                        className="px-5 py-2 rounded-full bg-gradient-to-r from-orange-400 to-rose-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        whileTap={{ scale: 0.95 }}
                    >
                        {isPosting ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Posting
                            </span>
                        ) : (
                            'Share'
                        )}
                    </motion.button>
                </div>
            </header>

            <main className="max-w-2xl mx-auto p-4 pb-24">
                {/* Content Type Selector */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {contentTypes.map(type => (
                        <button
                            key={type.id}
                            onClick={() => setContentType(type.id as ContentType)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${contentType === type.id
                                ? 'bg-white text-black'
                                : 'bg-white/10 text-white hover:bg-white/15'
                                }`}
                        >
                            <span>{type.icon}</span>
                            <span className="font-medium">{type.label}</span>
                        </button>
                    ))}
                </div>

                {/* Media Upload Area */}
                <div className="mb-6">
                    {media.length === 0 ? (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full aspect-video rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-3 hover:border-white/40 hover:bg-white/5 transition-all"
                        >
                            <span className="text-4xl">📸</span>
                            <p className="text-white/60">Add photos or videos</p>
                            <p className="text-xs text-white/30">or drag and drop</p>
                        </button>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            {media.map(item => (
                                <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden">
                                    {item.type === 'image' ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <video src={item.url} className="w-full h-full object-cover" />
                                    )}
                                    <button
                                        onClick={() => removeMedia(item.id)}
                                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-square rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center hover:border-white/40 transition-colors"
                            >
                                <span className="text-2xl">+</span>
                            </button>
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                </div>

                {/* Caption */}
                <textarea
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    placeholder={contentType === 'journey' ? 'Describe your journey...' : 'Write a caption...'}
                    className="w-full h-32 bg-white/5 rounded-xl p-4 text-white placeholder:text-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />

                {/* Character count */}
                <div className="text-right mt-2">
                    <span className={`text-sm ${caption.length > 2000 ? 'text-red-400' : 'text-white/40'}`}>
                        {caption.length}/2000
                    </span>
                </div>

                {/* Options */}
                <div className="mt-6 space-y-3">
                    {/* Audience */}
                    <button
                        onClick={() => setShowAudienceSelect(true)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <span>{audiences.find(a => a.id === audience)?.icon}</span>
                            <span className="text-white">{audiences.find(a => a.id === audience)?.label}</span>
                        </div>
                        <span className="text-white/40">→</span>
                    </button>

                    {/* Location */}
                    <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                            <span>📍</span>
                            <span className="text-white">Add Location</span>
                        </div>
                        <span className="text-white/40">→</span>
                    </button>

                    {/* Tag People */}
                    <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                            <span>👤</span>
                            <span className="text-white">Tag People</span>
                        </div>
                        <span className="text-white/40">→</span>
                    </button>
                </div>
            </main>

            {/* Audience Selector Modal */}
            <AnimatePresence>
                {showAudienceSelect && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center"
                        onClick={() => setShowAudienceSelect(false)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="w-full max-w-lg bg-[#0a0a0f] rounded-t-3xl p-6"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-semibold text-white mb-4">Who can see this?</h3>
                            <div className="space-y-2">
                                {audiences.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => { setAudience(opt.id as typeof audience); setShowAudienceSelect(false); }}
                                        className={`w-full flex items-center gap-4 p-4 rounded-xl transition-colors ${audience === opt.id ? 'bg-white/10' : 'hover:bg-white/5'
                                            }`}
                                    >
                                        <span className="text-2xl">{opt.icon}</span>
                                        <div className="text-left flex-1">
                                            <p className="text-white font-medium">{opt.label}</p>
                                            <p className="text-sm text-white/50">{opt.desc}</p>
                                        </div>
                                        {audience === opt.id && <span className="text-orange-400">✓</span>}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Wrap in Suspense for useSearchParams
export default function CreatePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#050508]" />}>
            <CreateContent />
        </Suspense>
    );
}
