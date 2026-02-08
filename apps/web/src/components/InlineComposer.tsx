'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { CameraIcon, VideoIcon, XIcon, GlobeIcon, LockIcon, UsersIcon } from '@/components/icons';
import { api, API_ENDPOINTS, API_URL, apiUpload } from '@/lib/api';
import { captureVideoThumbnail, isVideoTooLarge, formatFileSize } from '@/lib/videoUtils';

interface User {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
}

interface InlineComposerProps {
    user: User;
    communityId?: string;
    onPostSuccess?: () => void;
}

export function InlineComposer({ user, communityId, onPostSuccess }: InlineComposerProps) {
    const router = useRouter();
    const [content, setContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [privacy, setPrivacy] = useState<'public' | 'friends' | 'family' | 'private'>('public');
    const [filterWarning, setFilterWarning] = useState<string | null>(null);
    const [videoSizeWarning, setVideoSizeWarning] = useState<string | null>(null);
    const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [cropY, setCropY] = useState(50); // 0=top, 50=center, 100=bottom
    const [isRepositioning, setIsRepositioning] = useState(false);
    const [nativeRatio, setNativeRatio] = useState<number | null>(null); // width/height
    const [chosenRatio, setChosenRatio] = useState<'16:9' | '4:3' | '1:1' | '4:5' | 'original'>('original');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragCounterRef = useRef(0);
    const repositionRef = useRef<{ startY: number; startCropY: number } | null>(null);
    const mediaContainerRef = useRef<HTMLDivElement>(null);

    // Auto-resize textarea
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    };

    const detectAndSetRatio = useCallback((w: number, h: number) => {
        const ratio = w / h;
        setNativeRatio(ratio);
        // Auto-select best display ratio
        if (ratio >= 1.5) setChosenRatio('16:9');
        else if (ratio >= 1.1) setChosenRatio('4:3');
        else if (ratio >= 0.9) setChosenRatio('1:1');
        else setChosenRatio('4:5');
        setCropY(50);
    }, []);

    const acceptFile = (file: File) => {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return;
        setMediaFile(file);
        setVideoSizeWarning(null);
        setVideoThumbnail(null);
        const url = URL.createObjectURL(file);
        setMediaPreview(url);

        // Detect native dimensions
        if (file.type.startsWith('video/')) {
            const vid = document.createElement('video');
            vid.preload = 'metadata';
            vid.onloadedmetadata = () => {
                detectAndSetRatio(vid.videoWidth, vid.videoHeight);
                URL.revokeObjectURL(vid.src);
            };
            vid.src = url;

            // Check video size and warn if too large
            if (isVideoTooLarge(file)) {
                setVideoSizeWarning(
                    `This video is ${formatFileSize(file.size)}. Videos over 50 MB may take a long time to upload. Consider compressing it before uploading.`
                );
            }

            // Capture first-frame thumbnail in the background
            captureVideoThumbnail(file)
                .then((thumbnailDataUrl) => setVideoThumbnail(thumbnailDataUrl))
                .catch((err) => console.warn('Could not capture video thumbnail:', err));
        } else {
            const img = new window.Image();
            img.onload = () => {
                detectAndSetRatio(img.naturalWidth, img.naturalHeight);
            };
            img.src = url;
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) acceptFile(file);
    };

    // --- Drag-and-drop handlers ---
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current++;
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current--;
        if (dragCounterRef.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounterRef.current = 0;
        const file = e.dataTransfer.files?.[0];
        if (file) acceptFile(file);
    };

    // --- Media reposition handlers (drag to adjust crop) ---
    const onRepositionStart = useCallback((clientY: number) => {
        repositionRef.current = { startY: clientY, startCropY: cropY };
        setIsRepositioning(true);
    }, [cropY]);

    const onRepositionMove = useCallback((clientY: number) => {
        if (!repositionRef.current || !mediaContainerRef.current) return;
        const containerHeight = mediaContainerRef.current.offsetHeight;
        const deltaPixels = clientY - repositionRef.current.startY;
        // Moving mouse down → show higher part of image → decrease cropY
        const deltaPct = (deltaPixels / containerHeight) * 100;
        const newCropY = Math.max(0, Math.min(100, repositionRef.current.startCropY - deltaPct));
        setCropY(Math.round(newCropY));
    }, []);

    const onRepositionEnd = useCallback(() => {
        repositionRef.current = null;
        setIsRepositioning(false);
    }, []);

    // Mouse events for reposition
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

    // Touch events for reposition
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

    const clearMedia = () => {
        setMediaFile(null);
        setMediaPreview(null);
        setVideoSizeWarning(null);
        setVideoThumbnail(null);
        setCropY(50);
        setNativeRatio(null);
        setChosenRatio('original');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Aspect ratio helpers
    const ratioToNumber = (r: string): number => {
        const map: Record<string, number> = { '16:9': 16/9, '4:3': 4/3, '1:1': 1, '4:5': 4/5 };
        return map[r] || (nativeRatio || 4/3);
    };
    const containerAspect = chosenRatio === 'original' ? undefined : ratioToNumber(chosenRatio);
    const needsCrop = chosenRatio !== 'original';

    const handlePost = async () => {
        if (!content.trim() && !mediaFile) return;

        try {
            setIsPosting(true);
            setFilterWarning(null);

            // 0. Check content filters (client-side, for community posts)
            if (communityId && content.trim()) {
                try {
                    const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
                    const checkRes = await fetch(`${API_URL}/api/v1/communities/${communityId}/check-content`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({ text: content }),
                    });
                    if (checkRes.ok) {
                        const checkData = await checkRes.json();
                        if (!checkData.allowed) {
                            setFilterWarning('This content is not allowed in this community due to content filters.');
                            setIsPosting(false);
                            return;
                        }
                        if (checkData.flagged) {
                            setFilterWarning('Note: This content has been flagged for review by moderators.');
                            // Continue posting — just warn
                        }
                    }
                } catch {
                    // Fail open — don't block posting if filter check fails
                }
            }

            let mediaUrl = '';
            let mediaType = 'TEXT';
            let thumbnailUrl: string | null = null;

            // 1. Upload Media
            if (mediaFile) {
                const uploadRes = await apiUpload(API_ENDPOINTS.upload.post, mediaFile);
                mediaUrl = uploadRes.url;
                mediaType = mediaFile.type.startsWith('video') ? 'VIDEO' : 'IMAGE';

                // Use the captured client-side thumbnail for video posts
                if (mediaType === 'VIDEO' && videoThumbnail) {
                    thumbnailUrl = (uploadRes as any).thumbnailUrl || videoThumbnail;
                }
            }

            // 2. Create Post
            await api.post(API_ENDPOINTS.posts, {
                caption: content,
                mediaUrl,
                type: mediaType,
                privacy,
                ...(communityId ? { communityId } : {}),
                ...(mediaFile && cropY !== 50 ? { mediaCropY: cropY } : {}),
                ...(mediaFile && chosenRatio !== 'original' ? { mediaAspectRatio: chosenRatio } : {}),
                ...(thumbnailUrl ? { thumbnailUrl } : {}),
            });

            // 3. Reset & Notify
            setContent('');
            clearMedia();
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
            onPostSuccess?.();

        } catch (error) {
            console.error('Failed to post:', error);
            alert('Failed to post. Please try again.');
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div
            className="w-full relative"
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
                        className="absolute inset-0 z-20 rounded-2xl border-2 border-dashed border-[#00D4FF] bg-[#00D4FF]/5 backdrop-blur-sm flex items-center justify-center pointer-events-none"
                    >
                        <div className="text-center">
                            <CameraIcon size={32} className="mx-auto text-[#00D4FF] mb-2" />
                            <p className="text-[#00D4FF] font-semibold text-sm">Drop photo or video</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex gap-4">
                {/* Avatar */}
                {user.avatarUrl ? (
                    <img
                        src={user.avatarUrl}
                        alt={user.displayName || 'Profile'}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold flex-shrink-0">
                        {user.displayName?.[0] || 'U'}
                    </div>
                )}

                <div className="flex-1">
                    {/* Input Area */}
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleInput}
                        placeholder="What's going on?"
                        className="w-full bg-transparent text-white placeholder:text-white/40 text-lg resize-none focus:outline-none min-h-[50px] py-3"
                        rows={1}
                        disabled={isPosting}
                    />

                    {/* Media Preview with Reposition + Aspect Ratio */}
                    <AnimatePresence>
                        {mediaPreview && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="relative mt-2 mb-4"
                            >
                                {/* Aspect ratio picker */}
                                {nativeRatio !== null && (
                                    <div className="flex items-center gap-1 mb-2">
                                        {(['original', '16:9', '4:3', '1:1', '4:5'] as const).map((r) => (
                                            <button
                                                key={r}
                                                onClick={() => { setChosenRatio(r); setCropY(50); }}
                                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${chosenRatio === r
                                                    ? 'bg-[#00D4FF]/20 text-[#00D4FF] ring-1 ring-[#00D4FF]/30'
                                                    : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                                                }`}
                                            >
                                                <span className={`inline-block border border-current rounded-[2px] ${
                                                    r === '16:9' ? 'w-4 h-2.5' :
                                                    r === '4:3' ? 'w-3.5 h-[11px]' :
                                                    r === '1:1' ? 'w-3 h-3' :
                                                    r === '4:5' ? 'w-2.5 h-[13px]' :
                                                    'w-3 h-3.5'
                                                }`} />
                                                {r === 'original' ? 'Original' : r}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div
                                    ref={mediaContainerRef}
                                    className={`relative rounded-2xl overflow-hidden group/media bg-black/30 ${isRepositioning ? 'cursor-grabbing' : ''}`}
                                    style={containerAspect ? { aspectRatio: `${containerAspect}` } : { maxHeight: '300px' }}
                                >
                                    {mediaFile?.type.startsWith('video') ? (
                                        <video
                                            src={mediaPreview}
                                            controls={!isRepositioning}
                                            className={`w-full h-full ${needsCrop ? 'object-cover' : 'object-contain'}`}
                                            style={needsCrop ? { objectPosition: `center ${cropY}%` } : undefined}
                                        />
                                    ) : (
                                        <img
                                            src={mediaPreview}
                                            alt="Preview"
                                            className={`w-full h-full select-none ${needsCrop ? 'object-cover' : 'object-contain'}`}
                                            style={needsCrop ? { objectPosition: `center ${cropY}%` } : undefined}
                                            draggable={false}
                                        />
                                    )}

                                    {/* Reposition handle overlay (only when cropping) */}
                                    {needsCrop && (
                                        <div
                                            className={`absolute inset-0 transition-opacity ${isRepositioning ? 'opacity-100' : 'opacity-0 group-hover/media:opacity-100'}`}
                                            onMouseDown={handleRepositionMouseDown}
                                            onTouchStart={handleRepositionTouchStart}
                                            style={{ cursor: isRepositioning ? 'grabbing' : 'grab' }}
                                        >
                                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-white/90 text-xs font-medium select-none pointer-events-none">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                    <path d="M12 2v20M5 9l7-7 7 7M5 15l7 7 7-7" />
                                                </svg>
                                                Drag to reposition
                                            </div>
                                        </div>
                                    )}

                                    {/* Close button */}
                                    <button
                                        onClick={clearMedia}
                                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10"
                                    >
                                        <XIcon size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Video size warning */}
                    <AnimatePresence>
                        {videoSizeWarning && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-2 mb-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs flex items-start gap-2"
                            >
                                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                                <span>{videoSizeWarning}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Content filter warning */}
                    <AnimatePresence>
                        {filterWarning && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-2 mb-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs"
                            >
                                {filterWarning}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="border-b border-white/5 my-2" />

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                            {/* Media Inputs */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,video/*"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2.5 rounded-full text-[#00D4FF] hover:bg-[#00D4FF]/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-90"
                                title="Photo/Video"
                            >
                                <CameraIcon size={20} />
                            </button>
                            <button
                                onClick={() => router.push('/campfire')}
                                className="p-2.5 rounded-full text-white/40 hover:text-[#00D4FF] hover:bg-[#00D4FF]/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-90"
                                title="Go Live"
                            >
                                <VideoIcon size={20} />
                            </button>

                            {/* Privacy Dropdown (Mock for visual) */}
                            <div className="h-4 w-[1px] bg-white/10 mx-2" />
                            <button
                                onClick={() => setPrivacy(privacy === 'public' ? 'private' : 'public')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-medium text-[#00D4FF] transition-colors"
                            >
                                <GlobeIcon size={14} />
                                <span>{privacy === 'public' ? 'Everyone' : 'Private'}</span>
                            </button>
                        </div>

                        {/* Post Button */}
                        <button
                            onClick={handlePost}
                            disabled={(!content.trim() && !mediaFile) || isPosting}
                            className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 min-h-[44px] active:scale-95 ${(!content.trim() && !mediaFile) || isPosting
                                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                                : 'bg-gradient-to-r from-[#00D4FF] to-[#00D4FF]/80 text-black hover:shadow-[0_2px_12px_rgba(0,212,255,0.3)]'
                                }`}
                        >
                            {isPosting ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
