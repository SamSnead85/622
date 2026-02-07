'use client';

import { Suspense, useCallback, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useAuth, ProtectedRoute } from '@/contexts/AuthContext';
import { API_URL, API_ENDPOINTS } from '@/lib/api';
import TopicSelector from '@/components/TopicSelector';

type CreateTab = 'post' | 'moment';

interface Topic {
    id: string;
    slug: string;
    name: string;
    icon: string;
    color: string;
}

function CreateContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();

    const initialType = searchParams.get('type') as CreateTab || 'post';
    const [activeTab, setActiveTab] = useState<CreateTab>(initialType);

    // Post content
    const [caption, setCaption] = useState('');
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
    const [selectedTopics, setSelectedTopics] = useState<Topic[]>([]);
    const [isPublishing, setIsPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMediaFile(file);
            setMediaPreview(URL.createObjectURL(file));
            setMediaType(file.type.startsWith('video') ? 'video' : 'image');
        }
    }, []);

    const removeMedia = useCallback(() => {
        setMediaFile(null);
        setMediaPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    const handlePublish = useCallback(async () => {
        if (!caption.trim() && !mediaFile) {
            setError('Write something or add a photo/video');
            return;
        }
        setError(null);
        setIsPublishing(true);

        try {
            const token = localStorage.getItem('0g_token');

            if (activeTab === 'moment') {
                // Moment flow: requires media
                if (!mediaFile) {
                    setError('Moments require a photo or video');
                    setIsPublishing(false);
                    return;
                }

                const formData = new FormData();
                formData.append('file', mediaFile);

                const uploadRes = await fetch(`${API_URL}/api/v1/upload/moment`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData,
                });
                if (!uploadRes.ok) throw new Error('Failed to upload');
                const uploadData = await uploadRes.json();

                const momentRes = await fetch(`${API_URL}/api/v1/moments`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type: mediaFile.type.startsWith('video') ? 'VIDEO' : 'IMAGE',
                        mediaUrl: uploadData.url,
                        caption,
                    }),
                });
                if (!momentRes.ok) throw new Error('Failed to create moment');
                router.replace('/dashboard');
            } else {
                // Regular post: upload media first if present, then create post
                let mediaUrl: string | undefined;
                let postType = 'TEXT';

                if (mediaFile) {
                    const formData = new FormData();
                    formData.append('file', mediaFile);

                    const uploadRes = await fetch(API_ENDPOINTS.upload.post, {
                        method: 'POST',
                        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
                        body: formData,
                    });
                    if (!uploadRes.ok) throw new Error('Failed to upload media');
                    const uploadData = await uploadRes.json();
                    mediaUrl = uploadData.url;
                    postType = mediaFile.type.startsWith('video') ? 'VIDEO' : 'IMAGE';
                }

                const postRes = await fetch(API_ENDPOINTS.posts, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                        type: postType,
                        caption: caption.trim(),
                        mediaUrl,
                        isPublic: true,
                        topicIds: selectedTopics.map(t => t.id),
                    }),
                });

                if (!postRes.ok) throw new Error('Failed to create post');

                // Navigate immediately -- dashboard will fetch its own feed
                router.replace('/dashboard');
            }
        } catch (err) {
            console.error('Publish error:', err);
            setError('Failed to publish. Please try again.');
            setIsPublishing(false);
        }
    }, [caption, mediaFile, activeTab, selectedTopics, router]);

    const canPublish = caption.trim().length > 0 || mediaFile;

    return (
        <div className="min-h-screen bg-[#050508]">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#050508]/95 backdrop-blur-xl border-b border-white/[0.06]">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="text-white/60 hover:text-white transition-colors text-sm font-medium"
                    >
                        Cancel
                    </button>

                    <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5">
                        <button
                            onClick={() => setActiveTab('post')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                                activeTab === 'post'
                                    ? 'bg-[#00D4FF]/20 text-[#00D4FF]'
                                    : 'text-white/50 hover:text-white/70'
                            }`}
                        >
                            Post
                        </button>
                        <button
                            onClick={() => setActiveTab('moment')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                                activeTab === 'moment'
                                    ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]'
                                    : 'text-white/50 hover:text-white/70'
                            }`}
                        >
                            Story
                        </button>
                    </div>

                    <button
                        onClick={handlePublish}
                        disabled={!canPublish || isPublishing}
                        className="px-5 py-2 rounded-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-black font-semibold text-sm disabled:opacity-30 transition-all hover:opacity-90 active:scale-95"
                    >
                        {isPublishing ? 'Posting...' : activeTab === 'moment' ? 'Share Story' : 'Post'}
                    </button>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-6">
                {/* Error */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Composer area */}
                <div className="flex gap-3">
                    {/* Avatar */}
                    <div className="shrink-0">
                        {user?.avatarUrl ? (
                            <img
                                src={user.avatarUrl}
                                alt=""
                                className="w-11 h-11 rounded-full object-cover ring-2 ring-white/10"
                            />
                        ) : (
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold">
                                {user?.displayName?.[0] || 'U'}
                            </div>
                        )}
                    </div>

                    {/* Text area */}
                    <div className="flex-1 min-w-0">
                        <textarea
                            ref={textareaRef}
                            value={caption}
                            onChange={(e) => {
                                setCaption(e.target.value);
                                // Auto-resize
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            placeholder={activeTab === 'moment' ? "What's happening right now?" : "What's on your mind?"}
                            className="w-full bg-transparent text-white text-lg placeholder:text-white/25 resize-none focus:outline-none min-h-[120px] leading-relaxed"
                            maxLength={activeTab === 'moment' ? 500 : 5000}
                            autoFocus
                        />

                        {/* Character count */}
                        <div className="text-right text-xs text-white/20 mb-3">
                            {caption.length}/{activeTab === 'moment' ? 500 : 5000}
                        </div>

                        {/* Media preview */}
                        {mediaPreview && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative rounded-2xl overflow-hidden mb-4 border border-white/10"
                            >
                                {mediaType === 'video' ? (
                                    <video
                                        src={mediaPreview}
                                        className="w-full max-h-[400px] object-cover"
                                        controls
                                    />
                                ) : (
                                    <Image
                                        src={mediaPreview}
                                        alt="Upload preview"
                                        width={600}
                                        height={400}
                                        className="w-full max-h-[400px] object-cover"
                                    />
                                )}
                                <button
                                    onClick={removeMedia}
                                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center hover:bg-black/90 transition-colors"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                                    </svg>
                                </button>
                            </motion.div>
                        )}

                        {/* Action bar */}
                        <div className="flex items-center gap-1 py-3 border-t border-white/[0.06]">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,video/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#00D4FF] hover:bg-[#00D4FF]/10 transition-colors text-sm"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <path d="M21 15l-5-5L5 21" />
                                </svg>
                                Photo/Video
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#8B5CF6] hover:bg-[#8B5CF6]/10 transition-colors text-sm"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14.5 4h-5L7 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-3l-2.5-3z" />
                                    <circle cx="12" cy="13" r="3" />
                                </svg>
                                Camera
                            </button>
                        </div>

                        {/* Topic Selector */}
                        {activeTab === 'post' && (
                            <div className="mt-4">
                                <TopicSelector
                                    selectedTopics={selectedTopics}
                                    onChange={setSelectedTopics}
                                    maxSelection={3}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Publishing Overlay */}
            <AnimatePresence>
                {isPublishing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-12 h-12 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full mb-4"
                        />
                        <p className="text-white font-semibold">Sharing your {activeTab === 'moment' ? 'story' : 'post'}...</p>
                        <p className="text-white/40 text-sm mt-1">This won&apos;t take long</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function CreatePage() {
    return (
        <ProtectedRoute>
            <Suspense fallback={<div className="min-h-screen bg-[#050508]" />}>
                <CreateContent />
            </Suspense>
        </ProtectedRoute>
    );
}
