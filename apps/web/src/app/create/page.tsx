'use client';

import { Suspense, useCallback, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useAuth, ProtectedRoute } from '@/contexts/AuthContext';
import { API_ENDPOINTS } from '@/lib/api';
import TopicSelector from '@/components/TopicSelector';

interface Topic {
    id: string;
    slug: string;
    name: string;
    icon: string;
    color: string;
}

function CreateContent() {
    const router = useRouter();
    const { user } = useAuth();

    // Post content
    const [caption, setCaption] = useState('');
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
    const [selectedTopics, setSelectedTopics] = useState<Topic[]>([]);
    const [isPublishing, setIsPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [cropY, setCropY] = useState(50); // 0=top, 50=center, 100=bottom
    const [isRepositioning, setIsRepositioning] = useState(false);
    const [nativeRatio, setNativeRatio] = useState<number | null>(null);
    const [chosenRatio, setChosenRatio] = useState<'16:9' | '4:3' | '1:1' | '4:5' | 'original'>('original');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dragCounterRef = useRef(0);
    const repositionRef = useRef<{ startY: number; startCropY: number } | null>(null);
    const mediaContainerRef = useRef<HTMLDivElement>(null);

    const detectAndSetRatio = useCallback((w: number, h: number) => {
        const ratio = w / h;
        setNativeRatio(ratio);
        if (ratio >= 1.5) setChosenRatio('16:9');
        else if (ratio >= 1.1) setChosenRatio('4:3');
        else if (ratio >= 0.9) setChosenRatio('1:1');
        else setChosenRatio('4:5');
        setCropY(50);
    }, []);

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
    const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

    const acceptFile = useCallback((file: File) => {
        if (file.size > MAX_FILE_SIZE) {
            alert('File size must be under 10MB');
            return;
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
            alert('Unsupported file type. Please use JPEG, PNG, GIF, WebP, MP4, or WebM.');
            return;
        }
        setError(null);
        setMediaFile(file);
        const url = URL.createObjectURL(file);
        setMediaPreview(url);
        setMediaType(file.type.startsWith('video') ? 'video' : 'image');

        if (file.type.startsWith('video/')) {
            const vid = document.createElement('video');
            vid.preload = 'metadata';
            vid.onloadedmetadata = () => {
                detectAndSetRatio(vid.videoWidth, vid.videoHeight);
                URL.revokeObjectURL(vid.src);
            };
            vid.src = url;
        } else {
            const img = new window.Image();
            img.onload = () => detectAndSetRatio(img.naturalWidth, img.naturalHeight);
            img.src = url;
        }
    }, [detectAndSetRatio]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) acceptFile(file);
    }, [acceptFile]);

    // --- Drag-and-drop handlers ---
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current++;
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current--;
        if (dragCounterRef.current === 0) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounterRef.current = 0;
        const file = e.dataTransfer.files?.[0];
        if (file) acceptFile(file);
    }, [acceptFile]);

    // --- Media reposition handlers (drag to adjust crop) ---
    const onRepositionStart = useCallback((clientY: number) => {
        repositionRef.current = { startY: clientY, startCropY: cropY };
        setIsRepositioning(true);
    }, [cropY]);

    const onRepositionMove = useCallback((clientY: number) => {
        if (!repositionRef.current || !mediaContainerRef.current) return;
        const containerHeight = mediaContainerRef.current.offsetHeight;
        const deltaPixels = clientY - repositionRef.current.startY;
        // Moving mouse/finger down → show higher part → decrease cropY
        const deltaPct = (deltaPixels / containerHeight) * 100;
        const newCropY = Math.max(0, Math.min(100, repositionRef.current.startCropY - deltaPct));
        setCropY(Math.round(newCropY));
    }, []);

    const onRepositionEnd = useCallback(() => {
        repositionRef.current = null;
        setIsRepositioning(false);
    }, []);

    const handleRepositionMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        onRepositionStart(e.clientY);
        const onMouseMove = (ev: MouseEvent) => onRepositionMove(ev.clientY);
        const onMouseUp = () => {
            onRepositionEnd();
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, [onRepositionStart, onRepositionMove, onRepositionEnd]);

    const handleRepositionTouchStart = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        if (touch) onRepositionStart(touch.clientY);
        const onTouchMove = (ev: TouchEvent) => {
            const t = ev.touches[0];
            if (t) onRepositionMove(t.clientY);
        };
        const onTouchEnd = () => {
            onRepositionEnd();
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
        };
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('touchend', onTouchEnd);
    }, [onRepositionStart, onRepositionMove, onRepositionEnd]);

    const removeMedia = useCallback(() => {
        setMediaFile(null);
        setMediaPreview(null);
        setCropY(50);
        setNativeRatio(null);
        setChosenRatio('original');
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    // Aspect ratio helpers
    const ratioToNumber = useCallback((r: string): number => {
        const map: Record<string, number> = { '16:9': 16/9, '4:3': 4/3, '1:1': 1, '4:5': 4/5 };
        return map[r] || (nativeRatio || 4/3);
    }, [nativeRatio]);
    const containerAspect = chosenRatio === 'original' ? undefined : ratioToNumber(chosenRatio);
    const needsCrop = chosenRatio !== 'original';

    const handlePublish = useCallback(async () => {
        if (!caption.trim() && !mediaFile) {
            setError('Write something or add a photo/video');
            return;
        }
        setError(null);
        setIsPublishing(true);

        try {
            const token = localStorage.getItem('0g_token');

            // Upload media first if present, then create post
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
                    ...(mediaFile && cropY !== 50 ? { mediaCropY: cropY } : {}),
                    ...(mediaFile && chosenRatio !== 'original' ? { mediaAspectRatio: chosenRatio } : {}),
                }),
            });

            if (!postRes.ok) throw new Error('Failed to create post');

            // Navigate immediately -- dashboard will fetch its own feed
            router.replace('/dashboard');
        } catch (err) {
            console.error('Publish error:', err);
            setError('Failed to publish. Please try again.');
            setIsPublishing(false);
        }
    }, [caption, mediaFile, selectedTopics, router, cropY, chosenRatio]);

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

                    <h1 className="text-white font-semibold text-base">New Post</h1>

                    <button
                        onClick={handlePublish}
                        disabled={!canPublish || isPublishing}
                        className="px-5 py-2 rounded-full bg-gradient-to-r from-[#7C8FFF] to-[#6070EE] text-white font-semibold text-sm disabled:opacity-30 transition-all hover:opacity-90 active:scale-95"
                    >
                        {isPublishing ? 'Posting...' : 'Post'}
                    </button>
                </div>
            </header>

            <div
                className="max-w-2xl mx-auto px-4 py-6 relative"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {/* Drag-and-drop overlay */}
                <AnimatePresence>
                    {isDragging && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-30 rounded-2xl border-2 border-dashed border-[#7C8FFF] bg-[#7C8FFF]/5 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none"
                        >
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#7C8FFF" strokeWidth="2" className="mb-3">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <path d="M21 15l-5-5L5 21" />
                            </svg>
                            <p className="text-[#7C8FFF] font-semibold">Drop photo or video here</p>
                            <p className="text-[#7C8FFF]/50 text-sm mt-1">Supports images and videos</p>
                        </motion.div>
                    )}
                </AnimatePresence>

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
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#7C8FFF] to-[#6070EE] flex items-center justify-center text-white font-bold">
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
                            placeholder="What's on your mind?"
                            className="w-full bg-transparent text-white text-lg placeholder:text-white/25 resize-none focus:outline-none min-h-[120px] leading-relaxed"
                            maxLength={5000}
                            autoFocus
                        />

                        {/* Character count */}
                        <div className="text-right text-xs text-white/20 mb-3">
                            {caption.length}/5000
                        </div>

                        {/* Media preview with reposition + aspect ratio picker */}
                        {mediaPreview && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mb-4"
                            >
                                {/* Aspect ratio picker */}
                                {nativeRatio !== null && (
                                    <div className="flex items-center gap-1.5 mb-3">
                                        <span className="text-white/30 text-xs mr-1">Crop:</span>
                                        {(['original', '16:9', '4:3', '1:1', '4:5'] as const).map((r) => (
                                            <button
                                                key={r}
                                                onClick={() => { setChosenRatio(r); setCropY(50); }}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${chosenRatio === r
                                                    ? 'bg-[#7C8FFF]/20 text-[#7C8FFF] ring-1 ring-[#7C8FFF]/30'
                                                    : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/60'
                                                }`}
                                            >
                                                <span className={`inline-block border border-current rounded-[2px] ${
                                                    r === '16:9' ? 'w-5 h-3' :
                                                    r === '4:3' ? 'w-4 h-3' :
                                                    r === '1:1' ? 'w-3.5 h-3.5' :
                                                    r === '4:5' ? 'w-3 h-[15px]' :
                                                    'w-3.5 h-4'
                                                }`} />
                                                {r === 'original' ? 'Original' : r}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="relative rounded-2xl overflow-hidden border border-white/10">
                                    <div
                                        ref={mediaContainerRef}
                                        className={`relative group/media bg-black/30 ${isRepositioning ? 'cursor-grabbing' : ''}`}
                                        style={containerAspect ? { aspectRatio: `${containerAspect}` } : { maxHeight: '400px' }}
                                    >
                                        {mediaType === 'video' ? (
                                            <video
                                                src={mediaPreview}
                                                className={`w-full h-full ${needsCrop ? 'object-cover' : 'object-contain'}`}
                                                controls={!isRepositioning}
                                                style={needsCrop ? { objectPosition: `center ${cropY}%` } : undefined}
                                            />
                                        ) : (
                                            <img
                                                src={mediaPreview}
                                                alt="Upload preview"
                                                className={`w-full h-full select-none ${needsCrop ? 'object-cover' : 'object-contain'}`}
                                                style={needsCrop ? { objectPosition: `center ${cropY}%` } : undefined}
                                                draggable={false}
                                            />
                                        )}

                                        {/* Reposition handle (only when cropping) */}
                                        {needsCrop && (
                                            <div
                                                className={`absolute inset-0 transition-opacity ${isRepositioning ? 'opacity-100 bg-black/10' : 'opacity-0 group-hover/media:opacity-100'}`}
                                                onMouseDown={handleRepositionMouseDown}
                                                onTouchStart={handleRepositionTouchStart}
                                                style={{ cursor: isRepositioning ? 'grabbing' : 'grab' }}
                                            >
                                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-black/70 backdrop-blur-sm text-white/90 text-xs font-medium select-none pointer-events-none">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                        <path d="M12 2v20M5 9l7-7 7 7M5 15l7 7 7-7" />
                                                    </svg>
                                                    Drag to reposition
                                                </div>
                                            </div>
                                        )}

                                        {/* Close button */}
                                        <button
                                            onClick={removeMedia}
                                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center hover:bg-black/90 transition-colors z-10"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
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
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#7C8FFF] hover:bg-[#7C8FFF]/10 transition-colors text-sm"
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
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#6070EE] hover:bg-[#6070EE]/10 transition-colors text-sm"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14.5 4h-5L7 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-3l-2.5-3z" />
                                    <circle cx="12" cy="13" r="3" />
                                </svg>
                                Camera
                            </button>
                        </div>

                        {/* Topic Selector */}
                        <div className="mt-4">
                            <TopicSelector
                                    selectedTopics={selectedTopics}
                                    onChange={setSelectedTopics}
                                    maxSelection={3}
                                />
                        </div>
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
                            className="w-12 h-12 border-2 border-[#7C8FFF]/30 border-t-[#7C8FFF] rounded-full mb-4"
                        />
                        <p className="text-white font-semibold">Sharing your post...</p>
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
