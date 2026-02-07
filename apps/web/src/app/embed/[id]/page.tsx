'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { API_URL } from '@/lib/api';

/**
 * Lightweight video embed page for Twitter Player Cards and other platforms.
 * Shows just the video with minimal 0G branding — no auth required.
 */
export default function VideoEmbedPage() {
    const params = useParams();
    const postId = params.id as string;
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        async function fetchVideo() {
            try {
                const res = await fetch(`${API_URL}/api/v1/posts/${postId}`);
                if (!res.ok) throw new Error();
                const data = await res.json();
                if (data.mediaUrl && data.type === 'VIDEO') {
                    setVideoUrl(data.mediaUrl);
                } else {
                    setError(true);
                }
            } catch {
                setError(true);
            }
        }
        fetchVideo();
    }, [postId]);

    useEffect(() => {
        if (videoRef.current && videoUrl) {
            videoRef.current.play().catch(() => {
                if (videoRef.current) {
                    videoRef.current.muted = true;
                    videoRef.current.play().catch(() => {});
                }
            });
        }
    }, [videoUrl]);

    if (error) {
        return (
            <div className="w-screen h-screen bg-black flex items-center justify-center">
                <p className="text-white/60 text-sm">Video not available</p>
            </div>
        );
    }

    if (!videoUrl) {
        return (
            <div className="w-screen h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-screen h-screen bg-black relative">
            <video
                ref={videoRef}
                src={videoUrl}
                controls
                playsInline
                autoPlay
                className="w-full h-full object-contain"
            />
            {/* Minimal 0G watermark */}
            <a
                href={`/post/${postId}`}
                className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white/80 text-xs font-semibold hover:text-white transition-colors z-10"
            >
                <span className="w-4 h-4 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#7C3AED] flex items-center justify-center text-[6px] font-black text-white">0G</span>
                ZeroG
            </a>
        </div>
    );
}
