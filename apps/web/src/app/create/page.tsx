'use client';

import { Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePosts } from '@/hooks/usePosts';
import { PremiumCreateFlow } from '@/components/PremiumCreateFlow';
import { ProtectedRoute } from '@/contexts/AuthContext';

function CreateContent() {
    const router = useRouter();
    const { createPost } = usePosts();

    const handlePublish = useCallback(async (data: { mediaUrl: string; caption: string; type: 'post' | 'moment' | 'journey'; file?: File | null; topicIds?: string[] }) => {
        try {
            const token = localStorage.getItem('0g_token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://caravanserver-production-d7da.up.railway.app';

            // MOMENT CREATION
            if (data.type === 'moment') {
                if (!data.file) {
                    console.error('Moments require a file');
                    return;
                }

                // First upload
                const formData = new FormData();
                formData.append('file', data.file);

                const uploadRes = await fetch(`${API_URL}/api/v1/upload/moment`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: formData,
                });

                if (!uploadRes.ok) throw new Error('Failed to upload media');
                const uploadData = await uploadRes.json();

                // Create Moment
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

            }
            // JOURNEY CREATION (Placeholder - treat as post for now or add specific logic)
            else if (data.type === 'journey') {
                // Todo: Implement Journey specific API
                // For now, post as video?
                const result = await createPost(data.caption, data.file || undefined, data.topicIds);
                if (result.success) router.push('/dashboard');
            }
            // REGULAR POST
            else {
                const result = await createPost(data.caption, data.file || undefined, data.topicIds);
                if (result.success) {
                    router.push('/dashboard');
                }
            }
        } catch (error) {
            console.error('Publish error:', error);
            alert('Failed to publish content. Please try again.');
        }
    }, [createPost, router]);

    return (
        <div className="min-h-screen bg-[#050508]">
            {/* 
                We render PremiumCreateFlow always open.
                It acts as the page content.
            */}
            <PremiumCreateFlow
                isOpen={true}
                onClose={() => router.push('/dashboard')}
                onPublish={handlePublish}
            />
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
