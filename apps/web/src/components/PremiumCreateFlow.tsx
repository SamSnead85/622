'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { AIMediaEditor } from './AIMediaEditor';

// ============================================
// TYPES
// ============================================
interface CreateFlowProps {
    isOpen: boolean;
    onClose: () => void;
    onPublish?: (post: { mediaUrl: string; caption: string; type: 'post' | 'moment' | 'journey' }) => void;
}

type Step = 'select' | 'edit' | 'caption' | 'share';
type ContentType = 'post' | 'moment' | 'journey';

// ============================================
// PREMIUM CREATE FLOW COMPONENT
// ============================================
export function PremiumCreateFlow({ isOpen, onClose, onPublish }: CreateFlowProps) {
    const [step, setStep] = useState<Step>('select');
    const [contentType, setContentType] = useState<ContentType>('post');
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
    const [editedMediaUrl, setEditedMediaUrl] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    const [aiCaption, setAiCaption] = useState<string | null>(null);
    const [showAiCaptions, setShowAiCaptions] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle file selection
    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMediaFile(file);
            setMediaUrl(URL.createObjectURL(file));
            setMediaType(file.type.startsWith('video') ? 'video' : 'image');
            setStep('edit');
        }
    }, []);

    // Handle media edit save
    const handleEditSave = useCallback((url: string) => {
        setEditedMediaUrl(url);
        setStep('caption');
    }, []);

    // Generate AI captions
    const generateAiCaptions = useCallback(async () => {
        setShowAiCaptions(true);
        // Simulate AI generation
        await new Promise(resolve => setTimeout(resolve, 1500));
        setAiCaption('Captured this beautiful moment ✨ #blessed #life');
    }, []);

    // Reset state
    const handleReset = useCallback(() => {
        setStep('select');
        setMediaFile(null);
        setMediaUrl(null);
        setEditedMediaUrl(null);
        setCaption('');
        setAiCaption(null);
        setShowAiCaptions(false);
    }, []);

    // Handle publish
    const handlePublish = useCallback(async () => {
        setIsPublishing(true);
        // Simulate upload
        await new Promise(resolve => setTimeout(resolve, 2000));

        onPublish?.({
            mediaUrl: editedMediaUrl || mediaUrl || '',
            caption,
            type: contentType,
        });

        setIsPublishing(false);
        handleReset();
        onClose();
    }, [editedMediaUrl, mediaUrl, caption, contentType, onPublish, onClose, handleReset]);

    // Close handler
    const handleClose = useCallback(() => {
        handleReset();
        onClose();
    }, [handleReset, onClose]);

    if (!isOpen) return null;

    // Show AI Editor
    if (step === 'edit' && mediaUrl) {
        return (
            <AIMediaEditor
                file={mediaFile}
                mediaUrl={mediaUrl}
                mediaType={mediaType}
                onSave={handleEditSave}
                onClose={() => setStep('select')}
            />
        );
    }

    return (
        <motion.div
            className="fixed inset-0 z-50 bg-black/95"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <button
                    onClick={step === 'select' ? handleClose : () => setStep('select')}
                    className="text-white/70 hover:text-white transition-colors px-3 py-2"
                >
                    {step === 'select' ? 'Cancel' : '← Back'}
                </button>
                <h1 className="font-semibold text-white">
                    {step === 'select' && 'Create'}
                    {step === 'caption' && 'Add Details'}
                    {step === 'share' && 'Share'}
                </h1>
                <button
                    onClick={step === 'caption' ? handlePublish : undefined}
                    disabled={step !== 'caption' || isPublishing}
                    className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${step === 'caption'
                        ? 'bg-gradient-to-r from-orange-400 via-rose-500 to-violet-500 text-white'
                        : 'text-white/30'
                        }`}
                >
                    {isPublishing ? 'Posting...' : 'Share'}
                </button>
            </header>

            <AnimatePresence mode="wait">
                {/* STEP 1: Select Content Type & Media */}
                {step === 'select' && (
                    <motion.div
                        key="select"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="p-6"
                    >
                        {/* Content Type Toggle */}
                        <div className="flex gap-2 mb-8">
                            {[
                                { id: 'post', label: 'Post', icon: '📷', desc: 'Share to your profile' },
                                { id: 'moment', label: 'Moment', icon: '⭕', desc: '24hr story' },
                                { id: 'journey', label: 'Journey', icon: '🎬', desc: 'Video series' },
                            ].map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() => setContentType(type.id as ContentType)}
                                    className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${contentType === type.id
                                        ? 'bg-gradient-to-br from-orange-400/20 to-rose-500/20 border-orange-400/50'
                                        : 'bg-white/5 border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <span className="text-2xl">{type.icon}</span>
                                    <span className="font-medium text-white text-sm">{type.label}</span>
                                    <span className="text-[10px] text-white/50">{type.desc}</span>
                                </button>
                            ))}
                        </div>

                        {/* Media Upload Area */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center min-h-[40vh] border-2 border-dashed border-white/20 rounded-3xl cursor-pointer hover:border-white/40 hover:bg-white/5 transition-all"
                        >
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="text-6xl mb-4"
                            >
                                {contentType === 'post' && '📷'}
                                {contentType === 'moment' && '⏱️'}
                                {contentType === 'journey' && '🎥'}
                            </motion.div>
                            <p className="text-white/70 text-lg mb-2">
                                Tap to select {contentType === 'journey' ? 'video' : 'photo or video'}
                            </p>
                            <p className="text-white/40 text-sm">
                                or drag and drop here
                            </p>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={contentType === 'journey' ? 'video/*' : 'image/*,video/*'}
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>

                        {/* Camera option */}
                        <div className="flex gap-3 mt-6">
                            <button className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                <span className="text-xl">📸</span>
                                <span className="text-white/70">Take Photo</span>
                            </button>
                            <button className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                                <span className="text-xl">🎬</span>
                                <span className="text-white/70">Record Video</span>
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* STEP 3: Caption & Details */}
                {step === 'caption' && (
                    <motion.div
                        key="caption"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col h-[calc(100vh-60px)]"
                    >
                        <div className="flex-1 overflow-y-auto p-4 scroll-y">
                            {/* Media Preview */}
                            <div className="relative rounded-2xl overflow-hidden mb-4">
                                {mediaType === 'image' ? (
                                    <Image
                                        src={editedMediaUrl || mediaUrl || ''}
                                        alt="Preview"
                                        width={400}
                                        height={500}
                                        className="w-full object-cover max-h-[40vh]"
                                    />
                                ) : (
                                    <video
                                        src={editedMediaUrl || mediaUrl || ''}
                                        className="w-full max-h-[40vh]"
                                        controls
                                    />
                                )}

                                {/* Re-edit button */}
                                <button
                                    onClick={() => setStep('edit')}
                                    className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-sm flex items-center gap-1"
                                >
                                    <span>✨</span> Edit
                                </button>
                            </div>

                            {/* Caption Input */}
                            <div className="relative">
                                <textarea
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                    placeholder="Write a caption..."
                                    className="w-full bg-white/5 rounded-2xl p-4 text-white placeholder:text-white/30 resize-none focus:outline-none focus:bg-white/10 transition-colors min-h-[100px]"
                                    maxLength={2200}
                                />
                                <div className="absolute bottom-3 right-3 text-xs text-white/30">
                                    {caption.length}/2200
                                </div>
                            </div>

                            {/* AI Caption Generator */}
                            <button
                                onClick={generateAiCaptions}
                                className="w-full flex items-center justify-center gap-2 py-3 mt-3 rounded-xl bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-violet-500/30 hover:border-violet-500/50 transition-colors"
                            >
                                <span>✨</span>
                                <span className="text-white/80 text-sm">Generate AI Caption</span>
                            </button>

                            {/* AI Suggestions */}
                            <AnimatePresence>
                                {showAiCaptions && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10">
                                            {aiCaption ? (
                                                <button
                                                    onClick={() => setCaption(aiCaption)}
                                                    className="w-full text-left p-3 rounded-lg hover:bg-white/5 transition-colors"
                                                >
                                                    <p className="text-white/80 text-sm">{aiCaption}</p>
                                                    <p className="text-[10px] text-violet-400 mt-1">Tap to use</p>
                                                </button>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2 py-4">
                                                    <motion.div
                                                        animate={{ rotate: 360 }}
                                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                        className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full"
                                                    />
                                                    <span className="text-white/50 text-sm">Generating...</span>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Post Settings */}
                            <div className="mt-6 space-y-3">
                                <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">📍</span>
                                        <span className="text-white/70 text-sm">Add Location</span>
                                    </div>
                                    <span className="text-white/30">›</span>
                                </button>
                                <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">👥</span>
                                        <span className="text-white/70 text-sm">Tag People</span>
                                    </div>
                                    <span className="text-white/30">›</span>
                                </button>
                                <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">🌐</span>
                                        <span className="text-white/70 text-sm">Audience</span>
                                    </div>
                                    <span className="text-white/50 text-sm">Everyone</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Publishing Overlay */}
            <AnimatePresence>
                {isPublishing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-16 h-16 border-3 border-orange-400 border-t-transparent rounded-full mb-6"
                        />
                        <p className="text-white font-semibold text-lg">Sharing your {contentType}...</p>
                        <p className="text-white/50 text-sm mt-2">This won&apos;t take long</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default PremiumCreateFlow;
