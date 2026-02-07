'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { CameraIcon, VideoIcon, XIcon, GlobeIcon, LockIcon, UsersIcon } from '@/components/icons';
import { api, API_ENDPOINTS, apiUpload } from '@/lib/api';

interface User {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
}

interface InlineComposerProps {
    user: User;
    onPostSuccess?: () => void;
}

export function InlineComposer({ user, onPostSuccess }: InlineComposerProps) {
    const router = useRouter();
    const [content, setContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [privacy, setPrivacy] = useState<'public' | 'friends' | 'family' | 'private'>('public');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-resize textarea
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMediaFile(file);
            setMediaPreview(URL.createObjectURL(file));
        }
    };

    const clearMedia = () => {
        setMediaFile(null);
        setMediaPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handlePost = async () => {
        if (!content.trim() && !mediaFile) return;

        try {
            setIsPosting(true);
            let mediaUrl = '';
            let mediaType = 'TEXT';

            // 1. Upload Media
            if (mediaFile) {
                const uploadRes = await apiUpload(API_ENDPOINTS.upload.post, mediaFile);
                mediaUrl = uploadRes.url;
                mediaType = mediaFile.type.startsWith('video') ? 'VIDEO' : 'IMAGE';
            }

            // 2. Create Post
            await api.post(API_ENDPOINTS.posts, {
                caption: content,
                mediaUrl,
                type: mediaType,
                privacy,
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
        <div className="w-full">
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

                    {/* Media Preview */}
                    <AnimatePresence>
                        {mediaPreview && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="relative mt-2 mb-4"
                            >
                                <div className="relative rounded-2xl overflow-hidden max-h-[400px]">
                                    {mediaFile?.type.startsWith('video') ? (
                                        <video src={mediaPreview} controls className="w-full h-full object-cover" />
                                    ) : (
                                        <Image
                                            src={mediaPreview}
                                            alt="Preview"
                                            width={600}
                                            height={400}
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                    <button
                                        onClick={clearMedia}
                                        className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                                    >
                                        <XIcon size={16} />
                                    </button>
                                </div>
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
