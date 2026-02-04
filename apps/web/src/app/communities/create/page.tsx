'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCommunities } from '@/hooks/useCommunities';
import { API_ENDPOINTS } from '@/lib/api';

// ============================================
// STEP TYPES
// ============================================
type WizardStep = 'basics' | 'privacy' | 'cover' | 'invite' | 'complete';

interface TribeData {
    name: string;
    description: string;
    category: string;
    privacy: 'public' | 'private';
    approvalRequired: boolean;
    coverImage: string | null;
}

// ============================================
// CATEGORY OPTIONS
// ============================================
const CATEGORIES = [
    { id: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
    { id: 'friends', label: 'Friends', icon: '👯' },
    { id: 'faith', label: 'Faith & Spirituality', icon: '🕌' },
    { id: 'business', label: 'Business & Networking', icon: '💼' },
    { id: 'hobby', label: 'Hobbies & Interests', icon: '🎨' },
    { id: 'local', label: 'Local Community', icon: '🏘️' },
    { id: 'education', label: 'Education & Learning', icon: '📚' },
    { id: 'other', label: 'Other', icon: '✨' },
];

// ============================================
// COVER PRESETS
// ============================================
const COVER_PRESETS = [
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&h=400&fit=crop',
];

// ============================================
// MAIN COMPONENT
// ============================================
export default function CreateTribePage() {
    const router = useRouter();
    const { user } = useAuth();
    const { createCommunity } = useCommunities();
    const [step, setStep] = useState<WizardStep>('basics');
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [tribeData, setTribeData] = useState<TribeData>({
        name: '',
        description: '',
        category: '',
        privacy: 'private',
        approvalRequired: true,
        coverImage: null,
    });

    // Custom cover image upload state
    const coverInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Handle custom cover image upload
    const handleCoverUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setUploadError('Please select an image file');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setUploadError('Image must be less than 10MB');
            return;
        }

        setIsUploading(true);
        setUploadError(null);

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(API_ENDPOINTS.upload.post, {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                credentials: 'include',
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();
                setTribeData(prev => ({ ...prev, coverImage: result.url }));
            } else {
                setUploadError('Failed to upload image');
            }
        } catch (err) {
            console.error('Upload error:', err);
            setUploadError('Network error uploading image');
        } finally {
            setIsUploading(false);
        }
    }, []);

    const steps: WizardStep[] = ['basics', 'privacy', 'cover', 'invite'];
    const currentStepIndex = steps.indexOf(step);

    const canProceed = () => {
        switch (step) {
            case 'basics':
                return tribeData.name.trim().length >= 3 && tribeData.category;
            case 'privacy':
                return true;
            case 'cover':
                return true;
            case 'invite':
                return true;
            default:
                return false;
        }
    };

    const nextStep = () => {
        const idx = steps.indexOf(step);
        if (idx < steps.length - 1) {
            setStep(steps[idx + 1]);
        } else {
            handleCreate();
        }
    };

    const prevStep = () => {
        const idx = steps.indexOf(step);
        if (idx > 0) {
            setStep(steps[idx - 1]);
        }
    };

    const handleCreate = async () => {
        setIsCreating(true);
        setCreateError(null);

        const result = await createCommunity({
            name: tribeData.name,
            description: tribeData.description,
            category: tribeData.category,
            privacy: tribeData.privacy,
            approvalRequired: tribeData.approvalRequired,
            coverImage: tribeData.coverImage,
        });

        if (result.success) {
            setStep('complete');
        } else {
            setCreateError(result.error || 'Failed to create tribe');
        }
        setIsCreating(false);
    };

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0A1628] via-black to-black" />
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[#00D4FF]/5 blur-[120px]" />
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-white/5 bg-black/50 backdrop-blur-xl">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/communities" className="flex items-center gap-2 text-white/60 hover:text-white">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Back</span>
                    </Link>
                    <h1 className="font-semibold">Create a Tribe</h1>
                    <div className="w-16" />
                </div>
            </header>

            {/* Progress bar */}
            {step !== 'complete' && (
                <div className="relative z-10 max-w-2xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-2">
                        {steps.map((s, i) => (
                            <div
                                key={s}
                                className={`flex-1 h-1 rounded-full transition-colors ${i <= currentStepIndex ? 'bg-[#00D4FF]' : 'bg-white/10'
                                    }`}
                            />
                        ))}
                    </div>
                    <p className="text-sm text-white/40 mt-2">
                        Step {currentStepIndex + 1} of {steps.length}
                    </p>
                </div>
            )}

            {/* Content */}
            <main className="relative z-10 max-w-2xl mx-auto px-4 py-8">
                <AnimatePresence mode="wait">
                    {/* Step 1: Basics */}
                    {step === 'basics' && (
                        <motion.div
                            key="basics"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <h2 className="text-2xl font-bold mb-2">Name your Tribe</h2>
                            <p className="text-white/50 mb-8">Choose a name and category for your community</p>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-2">
                                        Tribe Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={tribeData.name}
                                        onChange={(e) => setTribeData({ ...tribeData, name: e.target.value })}
                                        placeholder="e.g., Hassan Family, Tech Founders Circle"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#00D4FF]/50"
                                        maxLength={50}
                                    />
                                    <p className="text-xs text-white/40 mt-1">{tribeData.name.length}/50 characters</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-2">
                                        Description (optional)
                                    </label>
                                    <textarea
                                        value={tribeData.description}
                                        onChange={(e) => setTribeData({ ...tribeData, description: e.target.value })}
                                        placeholder="What is this tribe about?"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#00D4FF]/50 h-24 resize-none"
                                        maxLength={200}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-3">
                                        Category *
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {CATEGORIES.map((cat) => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setTribeData({ ...tribeData, category: cat.id })}
                                                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${tribeData.category === cat.id
                                                    ? 'border-[#00D4FF] bg-[#00D4FF]/10'
                                                    : 'border-white/10 hover:border-white/20'
                                                    }`}
                                            >
                                                <span className="text-2xl">{cat.icon}</span>
                                                <span className="font-medium">{cat.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2: Privacy */}
                    {step === 'privacy' && (
                        <motion.div
                            key="privacy"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <h2 className="text-2xl font-bold mb-2">Privacy Settings</h2>
                            <p className="text-white/50 mb-8">Control who can find and join your tribe</p>

                            <div className="space-y-4">
                                <button
                                    onClick={() => setTribeData({ ...tribeData, privacy: 'public' })}
                                    className={`w-full p-5 rounded-2xl border text-left transition-all ${tribeData.privacy === 'public'
                                        ? 'border-[#00D4FF] bg-[#00D4FF]/10'
                                        : 'border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-2xl">
                                            🌍
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg">Public Tribe</h3>
                                            <p className="text-white/50 text-sm mt-1">
                                                Anyone can find and join. Posts are visible to all members.
                                            </p>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${tribeData.privacy === 'public' ? 'border-[#00D4FF]' : 'border-white/30'
                                            }`}>
                                            {tribeData.privacy === 'public' && (
                                                <div className="w-3 h-3 rounded-full bg-[#00D4FF]" />
                                            )}
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setTribeData({ ...tribeData, privacy: 'private' })}
                                    className={`w-full p-5 rounded-2xl border text-left transition-all ${tribeData.privacy === 'private'
                                        ? 'border-[#00D4FF] bg-[#00D4FF]/10'
                                        : 'border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center text-2xl">
                                            🔒
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg">Private Tribe</h3>
                                            <p className="text-white/50 text-sm mt-1">
                                                Only invited members can join. Hidden from search.
                                            </p>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${tribeData.privacy === 'private' ? 'border-[#00D4FF]' : 'border-white/30'
                                            }`}>
                                            {tribeData.privacy === 'private' && (
                                                <div className="w-3 h-3 rounded-full bg-[#00D4FF]" />
                                            )}
                                        </div>
                                    </div>
                                </button>
                            </div>

                            {tribeData.privacy === 'public' && (
                                <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={tribeData.approvalRequired}
                                            onChange={(e) => setTribeData({ ...tribeData, approvalRequired: e.target.checked })}
                                            className="w-5 h-5 rounded border-white/30 bg-white/5 text-[#00D4FF] focus:ring-[#00D4FF]/50"
                                        />
                                        <div>
                                            <p className="font-medium">Require approval to join</p>
                                            <p className="text-sm text-white/50">Review and approve new member requests</p>
                                        </div>
                                    </label>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Step 3: Cover Image */}
                    {step === 'cover' && (
                        <motion.div
                            key="cover"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <h2 className="text-2xl font-bold mb-2">Choose a Cover</h2>
                            <p className="text-white/50 mb-8">Select a preset or upload your own image</p>

                            {/* Custom Upload Button */}
                            <div className="mb-6">
                                <input
                                    ref={coverInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleCoverUpload}
                                />
                                <button
                                    onClick={() => coverInputRef.current?.click()}
                                    disabled={isUploading}
                                    className={`w-full p-6 rounded-2xl border-2 border-dashed transition-all ${tribeData.coverImage && !COVER_PRESETS.includes(tribeData.coverImage)
                                        ? 'border-[#00D4FF] bg-[#00D4FF]/10'
                                        : 'border-white/20 hover:border-[#00D4FF]/50 hover:bg-white/5'
                                        }`}
                                >
                                    {isUploading ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="w-5 h-5 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full animate-spin" />
                                            <span className="text-white/70">Uploading...</span>
                                        </div>
                                    ) : tribeData.coverImage && !COVER_PRESETS.includes(tribeData.coverImage) ? (
                                        <div className="relative">
                                            <img
                                                src={tribeData.coverImage}
                                                alt="Custom cover"
                                                className="w-full h-32 object-cover rounded-xl"
                                            />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                                                <span className="text-white font-medium">✓ Custom Image Selected</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#00D4FF]">
                                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-medium text-white">Upload Custom Image</p>
                                                <p className="text-sm text-white/50">PNG, JPG up to 10MB</p>
                                            </div>
                                        </div>
                                    )}
                                </button>
                                {uploadError && (
                                    <p className="text-red-400 text-sm mt-2">{uploadError}</p>
                                )}
                            </div>

                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex-1 h-px bg-white/10" />
                                <span className="text-xs text-white/40">or choose a preset</span>
                                <div className="flex-1 h-px bg-white/10" />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {COVER_PRESETS.map((url, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setTribeData({ ...tribeData, coverImage: url })}
                                        className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${tribeData.coverImage === url
                                            ? 'border-[#00D4FF] ring-2 ring-[#00D4FF]/30'
                                            : 'border-transparent hover:border-white/30'
                                            }`}
                                    >
                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                        {tribeData.coverImage === url && (
                                            <div className="absolute inset-0 bg-[#00D4FF]/20 flex items-center justify-center">
                                                <div className="w-8 h-8 rounded-full bg-[#00D4FF] flex items-center justify-center">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
                                                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setTribeData({ ...tribeData, coverImage: null })}
                                className="mt-4 text-sm text-white/50 hover:text-white"
                            >
                                Skip for now
                            </button>
                        </motion.div>
                    )}

                    {/* Step 4: Invite */}
                    {step === 'invite' && (
                        <motion.div
                            key="invite"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <h2 className="text-2xl font-bold mb-2">Invite Members</h2>
                            <p className="text-white/50 mb-8">Share your tribe with friends and family</p>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-3xl mb-4">
                                        🔗
                                    </div>
                                    <h3 className="font-semibold text-lg mb-1">Invite Link</h3>
                                    <p className="text-sm text-white/50">Share this link to invite people</p>
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        id="invite-link"
                                        value={`https://0g.social/tribe/${tribeData.name.toLowerCase().replace(/\s+/g, '-') || 'new-tribe'}`}
                                        className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white/70 text-sm"
                                    />
                                    <button
                                        onClick={() => {
                                            const input = document.getElementById('invite-link') as HTMLInputElement;
                                            navigator.clipboard.writeText(input.value);
                                            alert('Link copied to clipboard!');
                                        }}
                                        className="px-4 py-3 rounded-lg bg-[#00D4FF] text-black font-semibold hover:opacity-90 transition-opacity"
                                    >
                                        Copy
                                    </button>
                                </div>

                                <div className="flex justify-center gap-3 mt-6">
                                    {/* WhatsApp */}
                                    <a
                                        href={`https://wa.me/?text=${encodeURIComponent(`Join my tribe "${tribeData.name}" on 0G! https://0g.social/tribe/${tribeData.name.toLowerCase().replace(/\s+/g, '-')}`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 rounded-lg bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] text-sm font-medium hover:bg-[#25D366]/30 transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                        </svg>
                                        WhatsApp
                                    </a>

                                    {/* SMS */}
                                    <a
                                        href={`sms:?body=${encodeURIComponent(`Join my tribe "${tribeData.name}" on 0G! https://0g.social/tribe/${tribeData.name.toLowerCase().replace(/\s+/g, '-')}`)}`}
                                        className="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                        SMS
                                    </a>

                                    {/* Email */}
                                    <a
                                        href={`mailto:?subject=${encodeURIComponent(`Join my tribe "${tribeData.name}" on 0G`)}&body=${encodeURIComponent(`I'd love for you to join my tribe on 0G!\n\nTribe: ${tribeData.name}\n\nClick here to join: https://0g.social/tribe/${tribeData.name.toLowerCase().replace(/\s+/g, '-')}`)}`}
                                        className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-sm font-medium hover:bg-purple-500/30 transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        Email
                                    </a>
                                </div>
                            </div>

                            <p className="text-center text-sm text-white/40 mt-6">
                                You can invite more members anytime from tribe settings
                            </p>
                        </motion.div>
                    )}

                    {/* Complete */}
                    {step === 'complete' && (
                        <motion.div
                            key="complete"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-12"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 10 }}
                                className="text-8xl mb-6"
                            >
                                🎉
                            </motion.div>
                            <h2 className="text-3xl font-bold mb-3">Tribe Created!</h2>
                            <p className="text-white/50 mb-8 max-w-md mx-auto">
                                <span className="text-[#00D4FF] font-semibold">{tribeData.name}</span> is ready.
                                Start posting and invite your people!
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Link
                                    href="/communities"
                                    className="px-8 py-3 rounded-xl bg-[#00D4FF] text-black font-semibold hover:opacity-90 transition-opacity"
                                >
                                    Go to My Tribes
                                </Link>
                                <button
                                    onClick={() => {
                                        setStep('basics');
                                        setTribeData({
                                            name: '',
                                            description: '',
                                            category: '',
                                            privacy: 'private',
                                            approvalRequired: true,
                                            coverImage: null,
                                        });
                                    }}
                                    className="px-8 py-3 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/5 transition-colors"
                                >
                                    Create Another
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Footer nav */}
            {step !== 'complete' && (
                <footer className="fixed bottom-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-xl border-t border-white/5">
                    <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                        <button
                            onClick={prevStep}
                            disabled={currentStepIndex === 0}
                            className="px-6 py-3 rounded-xl border border-white/20 text-white font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
                        >
                            Back
                        </button>
                        <button
                            onClick={nextStep}
                            disabled={!canProceed() || isCreating}
                            className="px-8 py-3 rounded-xl bg-[#00D4FF] text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center gap-2"
                        >
                            {isCreating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    Creating...
                                </>
                            ) : step === 'invite' ? (
                                'Create Tribe'
                            ) : (
                                'Continue'
                            )}
                        </button>
                    </div>
                </footer>
            )}
        </div>
    );
}
