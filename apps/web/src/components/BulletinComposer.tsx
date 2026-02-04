'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MegaphoneIcon,
    HeartIcon,
    CalendarIcon,
    ZapIcon,
    MessageIcon,
    MapPinIcon,
    CloseIcon,
    CheckCircleIcon,
} from '@/components/icons';
import type { BulletinType } from './BulletinBoard';

// ============================================
// TYPES
// ============================================

interface BulletinComposerProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        type: BulletinType;
        title: string;
        content: string;
        location?: string;
        eventDate?: string;
        tags: string[];
    }) => void;
}

// ============================================
// BULLETIN TYPE CONFIG
// ============================================

const BULLETIN_TYPES: { value: BulletinType; label: string; icon: React.ReactNode; color: string; description: string }[] = [
    {
        value: 'ANNOUNCEMENT',
        label: 'Announcement',
        icon: <MegaphoneIcon size={24} />,
        color: 'from-blue-500 to-cyan-500',
        description: 'Share news or updates with the community'
    },
    {
        value: 'NEED',
        label: 'Need Help',
        icon: <HeartIcon size={24} />,
        color: 'from-rose-500 to-pink-500',
        description: 'Request help or support from the community'
    },
    {
        value: 'EVENT',
        label: 'Event',
        icon: <CalendarIcon size={24} />,
        color: 'from-purple-500 to-indigo-500',
        description: 'Organize a gathering or activity'
    },
    {
        value: 'SERVICE',
        label: 'Service',
        icon: <ZapIcon size={24} />,
        color: 'from-amber-500 to-orange-500',
        description: 'Offer a service to community members'
    },
    {
        value: 'DISCUSSION',
        label: 'Discussion',
        icon: <MessageIcon size={24} />,
        color: 'from-emerald-500 to-teal-500',
        description: 'Start a conversation or ask for opinions'
    },
];

// ============================================
// BULLETIN COMPOSER COMPONENT
// ============================================

export function BulletinComposer({ isOpen, onClose, onSubmit }: BulletinComposerProps) {
    const [step, setStep] = useState<'type' | 'content'>('type');
    const [selectedType, setSelectedType] = useState<BulletinType | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [location, setLocation] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleTypeSelect = (type: BulletinType) => {
        setSelectedType(type);
        setStep('content');
    };

    const handleAddTag = () => {
        const trimmed = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
            setTags([...tags, trimmed]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };

    const handleSubmit = async () => {
        if (!selectedType || !title.trim() || !content.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmit({
                type: selectedType,
                title: title.trim(),
                content: content.trim(),
                location: location.trim() || undefined,
                eventDate: eventDate || undefined,
                tags,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBack = () => {
        if (step === 'content') {
            setStep('type');
        } else {
            onClose();
        }
    };

    const typeConfig = BULLETIN_TYPES.find(t => t.value === selectedType);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-xl bg-[#0A0A0F] border border-white/10 rounded-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        {step === 'content' && (
                            <button
                                onClick={handleBack}
                                className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white/60"
                            >
                                ←
                            </button>
                        )}
                        <h2 className="text-lg font-semibold text-white">
                            {step === 'type' ? 'Create Post' : typeConfig?.label}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <CloseIcon size={20} className="text-white/60" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <AnimatePresence mode="wait">
                        {step === 'type' ? (
                            <motion.div
                                key="type"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-3"
                            >
                                <p className="text-white/50 mb-4">What would you like to share?</p>
                                {BULLETIN_TYPES.map((type) => (
                                    <button
                                        key={type.value}
                                        onClick={() => handleTypeSelect(type.value)}
                                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left"
                                    >
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center text-white`}>
                                            {type.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-white">{type.label}</h3>
                                            <p className="text-sm text-white/50">{type.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="content"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-4"
                            >
                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-white/60 mb-2">Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="What's this about?"
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                        maxLength={100}
                                    />
                                </div>

                                {/* Content */}
                                <div>
                                    <label className="block text-sm font-medium text-white/60 mb-2">Details</label>
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="Share more details..."
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
                                        maxLength={1000}
                                    />
                                    <p className="text-xs text-white/30 text-right mt-1">{content.length}/1000</p>
                                </div>

                                {/* Location (for Events and Needs) */}
                                {(selectedType === 'EVENT' || selectedType === 'NEED') && (
                                    <div>
                                        <label className="block text-sm font-medium text-white/60 mb-2">
                                            <MapPinIcon size={14} className="inline mr-1" /> Location (optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            placeholder="Where is this?"
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                        />
                                    </div>
                                )}

                                {/* Event Date */}
                                {selectedType === 'EVENT' && (
                                    <div>
                                        <label className="block text-sm font-medium text-white/60 mb-2">
                                            <CalendarIcon size={14} className="inline mr-1" /> Date & Time
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={eventDate}
                                            onChange={(e) => setEventDate(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                                        />
                                    </div>
                                )}

                                {/* Tags */}
                                <div>
                                    <label className="block text-sm font-medium text-white/60 mb-2">Tags (optional)</label>
                                    <div className="flex gap-2 mb-2 flex-wrap">
                                        {tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-sm"
                                            >
                                                #{tag}
                                                <button
                                                    onClick={() => handleRemoveTag(tag)}
                                                    className="hover:text-white"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    {tags.length < 5 && (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={tagInput}
                                                onChange={(e) => setTagInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                                placeholder="Add a tag..."
                                                className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors text-sm"
                                            />
                                            <button
                                                onClick={handleAddTag}
                                                className="px-4 py-2 rounded-xl bg-white/10 text-white/60 hover:bg-white/20 transition-colors text-sm"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                {step === 'content' && (
                    <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-white/60 hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!title.trim() || !content.trim() || isSubmitting}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <CheckCircleIcon size={18} />
                            )}
                            Post
                        </button>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

export default BulletinComposer;
