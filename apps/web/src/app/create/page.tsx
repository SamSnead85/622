'use client';

import { Suspense, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePosts } from '@/hooks/usePosts';
import { PremiumCreateFlow } from '@/components/PremiumCreateFlow';
import { ProtectedRoute } from '@/contexts/AuthContext';
import { API_URL, apiFetch } from '@/lib/api';
import dynamic from 'next/dynamic';

// Lazy-load studio components for code splitting
const PhotoEditor = dynamic(() => import('@/components/studio/PhotoEditor').then(m => ({ default: m.PhotoEditor })), {
    loading: () => <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full animate-spin" /></div>,
});
const VideoEditor = dynamic(() => import('@/components/studio/VideoEditor').then(m => ({ default: m.VideoEditor })), {
    loading: () => <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full animate-spin" /></div>,
});
const DraftManager = dynamic(() => import('@/components/studio/DraftManager').then(m => ({ default: m.DraftManager })), {
    loading: () => <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full animate-spin" /></div>,
});

type CreateTab = 'post' | 'photo' | 'video' | 'schedule';

function CreateContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { createPost } = usePosts();
    const initialTab = (searchParams.get('tab') as CreateTab) || 'post';
    const [activeTab, setActiveTab] = useState<CreateTab>(initialTab);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');

    const handlePublish = useCallback(async (data: { mediaUrl: string; caption: string; type: 'post' | 'moment' | 'journey'; file?: File | null; topicIds?: string[] }) => {
        try {
            const token = localStorage.getItem('0g_token');

            // MOMENT CREATION
            if (data.type === 'moment') {
                if (!data.file) {
                    console.error('Moments require a file');
                    return;
                }

                const formData = new FormData();
                formData.append('file', data.file);

                const uploadRes = await fetch(`${API_URL}/api/v1/upload/moment`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData,
                });

                if (!uploadRes.ok) throw new Error('Failed to upload media');
                const uploadData = await uploadRes.json();

                const momentRes = await fetch(`${API_URL}/api/v1/moments`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type: data.file.type.startsWith('video') ? 'VIDEO' : 'IMAGE',
                        mediaUrl: uploadData.url,
                        caption: data.caption,
                    }),
                });

                if (!momentRes.ok) throw new Error('Failed to create moment');
                router.push('/dashboard');
            } else if (data.type === 'journey') {
                const result = await createPost(data.caption, data.file || undefined, data.topicIds);
                if (result.success) router.push('/dashboard');
            } else {
                const result = await createPost(data.caption, data.file || undefined, data.topicIds);
                if (result.success) router.push('/dashboard');
            }
        } catch (error) {
            console.error('Publish error:', error);
            alert('Failed to publish content. Please try again.');
        }
    }, [createPost, router]);

    const handleSchedule = useCallback(async (caption: string, mediaUrl?: string, type?: string) => {
        if (!scheduleDate || !scheduleTime) {
            alert('Please select a date and time for scheduling.');
            return;
        }
        try {
            const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
            await apiFetch('/api/v1/posts/schedule', {
                method: 'POST',
                body: JSON.stringify({
                    type: type || 'TEXT',
                    caption,
                    mediaUrl,
                    scheduledFor,
                }),
            });
            router.push('/dashboard');
        } catch {
            alert('Failed to schedule post.');
        }
    }, [scheduleDate, scheduleTime, router]);

    const tabs: { id: CreateTab; label: string; icon: string }[] = [
        { id: 'post', label: 'Post', icon: '📝' },
        { id: 'photo', label: 'Edit Photo', icon: '🖼️' },
        { id: 'video', label: 'Edit Video', icon: '🎬' },
        { id: 'schedule', label: 'Schedule', icon: '📅' },
    ];

    return (
        <div className="min-h-screen bg-[#050508]">
            {/* Tab bar */}
            <div className="sticky top-0 z-40 bg-[#050508]/95 backdrop-blur-xl border-b border-white/[0.06]">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="flex items-center gap-1 py-3">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="p-2 text-white/50 hover:text-white mr-2"
                            aria-label="Go back"
                        >
                            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-[#00D4FF]/20 text-[#00D4FF]'
                                        : 'text-white/50 hover:text-white/70 hover:bg-white/[0.04]'
                                }`}
                                aria-pressed={activeTab === tab.id}
                            >
                                <span className="mr-1.5">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tab content */}
            {activeTab === 'post' && (
                <PremiumCreateFlow
                    isOpen={true}
                    onClose={() => router.push('/dashboard')}
                    onPublish={handlePublish}
                />
            )}

            {activeTab === 'photo' && (
                <div className="max-w-4xl mx-auto p-4">
                    <PhotoEditor
                        onSave={(dataUrl: string) => {
                            // Convert data URL to use as media in post
                            setActiveTab('post');
                        }}
                    />
                </div>
            )}

            {activeTab === 'video' && (
                <div className="max-w-4xl mx-auto p-4">
                    <VideoEditor
                        onExport={(blob: Blob) => {
                            setActiveTab('post');
                        }}
                    />
                </div>
            )}

            {activeTab === 'schedule' && (
                <div className="max-w-lg mx-auto p-6 mt-8">
                    <h2 className="text-white text-xl font-bold mb-6">Schedule a Post</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-white/60 text-sm mb-2">Date</label>
                            <input
                                type="date"
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div>
                            <label className="block text-white/60 text-sm mb-2">Time</label>
                            <input
                                type="time"
                                value={scheduleTime}
                                onChange={(e) => setScheduleTime(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                            />
                        </div>
                        <p className="text-white/30 text-xs">
                            Scheduled posts will be published automatically at the specified time.
                        </p>
                        <button
                            onClick={() => handleSchedule('', undefined, 'TEXT')}
                            disabled={!scheduleDate || !scheduleTime}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#7C3AED] text-white font-semibold disabled:opacity-40"
                        >
                            Schedule Post
                        </button>
                    </div>
                    <div className="mt-8">
                        <DraftManager />
                    </div>
                </div>
            )}
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
