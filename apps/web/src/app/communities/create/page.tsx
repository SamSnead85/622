'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCommunities } from '@/hooks/useCommunities';
import { API_ENDPOINTS } from '@/lib/api';
import Image from 'next/image';

// ============================================
// STEP TYPES
// ============================================
type WizardStep = 'template' | 'identity' | 'sovereignty' | 'cover' | 'invite' | 'complete';

interface TribeData {
    name: string;
    description: string;
    category: string;
    privacy: 'public' | 'private';
    approvalRequired: boolean;
    coverImage: string | null;
    isEncrypted: boolean; // Virtual flag for UI comfort
}

// ============================================
// CATEGORY OPTIONS (ARCHETYPES)
// ============================================
const ARCHETYPES = [
    { id: 'family', label: 'Kin & Family', icon: '🧬', desc: 'A private space for your bloodline.' },
    { id: 'friends', label: 'Inner Circle', icon: '⭕', desc: 'Secure comms for your closest allies.' },
    { id: 'business', label: 'Syndicate', icon: '🤝', desc: 'Professional network and deal flow.' },
    { id: 'faith', label: 'Sanctuary', icon: '🕌', desc: 'Spiritual and community gathering.' },
    { id: 'hobby', label: 'Guild', icon: '⚔️', desc: 'Connect over shared passions & crafts.' },
    { id: 'local', label: 'District', icon: '🏘️', desc: 'Neighborhood and local organizing.' },
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
    const [step, setStep] = useState<WizardStep>('template');
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [tribeData, setTribeData] = useState<TribeData>({
        name: '',
        description: '',
        category: '',
        privacy: 'private',
        approvalRequired: true,
        coverImage: null,
        isEncrypted: true,
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

    const steps: WizardStep[] = ['template', 'identity', 'sovereignty', 'cover', 'invite'];
    const currentStepIndex = steps.indexOf(step);

    const canProceed = () => {
        switch (step) {
            case 'template':
                return !!tribeData.category;
            case 'identity':
                return tribeData.name.trim().length >= 3;
            case 'sovereignty':
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
        <div className="min-h-screen bg-[#050508] text-white font-sans selection:bg-[#00D4FF]/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-b from-blue-900/10 to-transparent blur-[120px] opacity-40" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-t from-violet-900/10 to-transparent blur-[120px] opacity-30" />
            </div>

            {/* Header */}
            <header className="relative z-20 border-b border-white/5 bg-black/60 backdrop-blur-xl supports-[backdrop-filter]:bg-black/40">
                <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
                    <Link href="/communities" className="group flex items-center gap-3 text-white/50 hover:text-white transition-colors">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 border border-white/5">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span className="font-medium">Cancel</span>
                    </Link>
                    <div className="flex flex-col items-center">
                        <h1 className="font-bold text-lg tracking-tight">Establish Sovereign Circle</h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Secure Connection</span>
                        </div>
                    </div>
                    <div className="w-24" /> {/* Spacer */}
                </div>
            </header>

            {/* Progress */}
            {step !== 'complete' && (
                <div className="relative z-20 max-w-3xl mx-auto px-6 py-8">
                    <div className="flex items-center gap-2 mb-2">
                        {steps.map((s, i) => (
                            <div
                                key={s}
                                className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= currentStepIndex ? 'bg-gradient-to-r from-[#00D4FF] to-blue-500 shadow-[0_0_10px_rgba(0,212,255,0.3)]' : 'bg-white/5'}`}
                            />
                        ))}
                    </div>
                    <p className="text-xs font-medium text-[#00D4FF] uppercase tracking-widest text-right">Phase {currentStepIndex + 1} / {steps.length}</p>
                </div>
            )}

            {/* Main Content */}
            <main className="relative z-10 max-w-3xl mx-auto px-6 pb-24">
                <AnimatePresence mode="wait">
                    {/* Step 1: Template/Archetype */}
                    {step === 'template' && (
                        <motion.div
                            key="template"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="text-center space-y-2">
                                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">Choose your Archetype</h2>
                                <p className="text-white/40 text-lg">What kind of society are you building?</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {ARCHETYPES.map((arch) => (
                                    <button
                                        key={arch.id}
                                        onClick={() => setTribeData({ ...tribeData, category: arch.id })}
                                        className={`group relative p-6 rounded-2xl border text-left transition-all duration-300 ${tribeData.category === arch.id
                                            ? 'border-[#00D4FF] bg-[#00D4FF]/5 shadow-[0_0_30px_rgba(0,212,255,0.1)]'
                                            : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <span className="text-4xl filter drop-shadow-lg group-hover:scale-110 transition-transform duration-300">{arch.icon}</span>
                                            {tribeData.category === arch.id && (
                                                <div className="w-6 h-6 rounded-full bg-[#00D4FF] flex items-center justify-center box-shadow-glow">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
                                                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <h3 className={`text-xl font-bold mb-1 transition-colors ${tribeData.category === arch.id ? 'text-[#00D4FF]' : 'text-white'}`}>{arch.label}</h3>
                                        <p className="text-sm text-white/50 group-hover:text-white/70 transition-colors">{arch.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2: Identity */}
                    {step === 'identity' && (
                        <motion.div
                            key="identity"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="text-center space-y-2">
                                <h2 className="text-3xl font-bold">Define the Identity</h2>
                                <p className="text-white/40 text-lg">Give your circle a name and purpose.</p>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6 backdrop-blur-sm">
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-3 uppercase tracking-wider">
                                        Circle Designation (Name)
                                    </label>
                                    <input
                                        type="text"
                                        value={tribeData.name}
                                        onChange={(e) => setTribeData({ ...tribeData, name: e.target.value })}
                                        placeholder="e.g. The Iron Syndicate"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-xl text-white placeholder:text-white/20 focus:outline-none focus:border-[#00D4FF]/50 focus:ring-1 focus:ring-[#00D4FF]/50 transition-all font-medium"
                                        maxLength={50}
                                        autoFocus
                                    />
                                    <div className="flex justify-between mt-2">
                                        <span className="text-xs text-white/30">Visible to members</span>
                                        <span className="text-xs text-white/30">{tribeData.name.length}/50</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-3 uppercase tracking-wider">
                                        Manifesto (Description)
                                    </label>
                                    <textarea
                                        value={tribeData.description}
                                        onChange={(e) => setTribeData({ ...tribeData, description: e.target.value })}
                                        placeholder="What is the purpose of this assembly?"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#00D4FF]/50 h-32 resize-none transition-all leading-relaxed"
                                        maxLength={280}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Sovereignty (Privacy) */}
                    {step === 'sovereignty' && (
                        <motion.div
                            key="sovereignty"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="text-center space-y-2">
                                <h2 className="text-3xl font-bold">Sovereignty Protocols</h2>
                                <p className="text-white/40 text-lg">Establish the boundaries of your domain.</p>
                            </div>

                            <div className="grid gap-4">
                                <button
                                    onClick={() => setTribeData({ ...tribeData, privacy: 'private' })}
                                    className={`relative p-6 rounded-2xl border text-left transition-all ${tribeData.privacy === 'private'
                                        ? 'border-[#00D4FF] bg-[#00D4FF]/10'
                                        : 'border-white/10 bg-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <div className="flex items-start gap-5">
                                        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={tribeData.privacy === 'private' ? '#00D4FF' : 'white'} strokeWidth="2">
                                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold mb-1">Private & Encrypted</h3>
                                            <p className="text-white/50 text-sm leading-relaxed mb-3">
                                                The highest standard. Visible only to invited members. Content is sovereign and protected.
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">End-to-End Trust</span>
                                                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-500/20 text-blue-400 border border-blue-500/20">Invite Only</span>
                                            </div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 ${tribeData.privacy === 'private' ? 'border-[#00D4FF]' : 'border-white/20'}`}>
                                            {tribeData.privacy === 'private' && <div className="w-3 h-3 rounded-full bg-[#00D4FF]" />}
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setTribeData({ ...tribeData, privacy: 'public' })}
                                    className={`relative p-6 rounded-2xl border text-left transition-all ${tribeData.privacy === 'public'
                                        ? 'border-[#00D4FF] bg-[#00D4FF]/10'
                                        : 'border-white/10 bg-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <div className="flex items-start gap-5">
                                        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={tribeData.privacy === 'public' ? '#00D4FF' : 'white'} strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" />
                                                <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold mb-1">Public Domain</h3>
                                            <p className="text-white/50 text-sm leading-relaxed mb-3">
                                                Open to the world. Discoverable in search. Best for maximizing reach and growth.
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-white/10 text-white/60 border border-white/10">Global Index</span>
                                            </div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 ${tribeData.privacy === 'public' ? 'border-[#00D4FF]' : 'border-white/20'}`}>
                                            {tribeData.privacy === 'public' && <div className="w-3 h-3 rounded-full bg-[#00D4FF]" />}
                                        </div>
                                    </div>
                                </button>
                            </div>

                            {/* Additional Security Toggles */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">Gatekeeper Protocol</p>
                                            <p className="text-xs text-white/50">Require admin approval for new members</p>
                                        </div>
                                    </div>
                                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${tribeData.approvalRequired ? 'bg-[#00D4FF]' : 'bg-white/10'}`} onClick={() => setTribeData({ ...tribeData, approvalRequired: !tribeData.approvalRequired })}>
                                        <motion.div
                                            className="w-4 h-4 rounded-full bg-white shadow-sm"
                                            animate={{ x: tribeData.approvalRequired ? 24 : 0 }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        />
                                    </div>
                                </label>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 4: Cover */}
                    {step === 'cover' && (
                        <motion.div
                            key="cover"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="text-center space-y-2">
                                <h2 className="text-3xl font-bold">Visual Standard</h2>
                                <p className="text-white/40 text-lg">Define visual identity.</p>
                            </div>

                            <div className="relative group">
                                <div className="absolute inset-0 bg-[#00D4FF] rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity" />
                                <button
                                    onClick={() => coverInputRef.current?.click()}
                                    className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 group-hover:border-[#00D4FF]/50 transition-colors"
                                >
                                    {tribeData.coverImage ? (
                                        <>
                                            <img src={tribeData.coverImage} alt="Cover" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="font-medium">Change Image</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40">
                                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                            <p className="font-semibold text-lg">Upload Banner</p>
                                            <p className="text-sm text-white/40">1920x1080 Recommended</p>
                                        </div>
                                    )}
                                </button>
                                <input
                                    ref={coverInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleCoverUpload}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {COVER_PRESETS.map((url, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setTribeData({ ...tribeData, coverImage: url })}
                                        className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${tribeData.coverImage === url ? 'border-[#00D4FF]' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                    >
                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Step 5: Invite */}
                    {step === 'invite' && (
                        <motion.div
                            key="invite"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="text-center space-y-2">
                                <h2 className="text-3xl font-bold">Summon the Core</h2>
                                <p className="text-white/40 text-lg">Distribute the access key.</p>
                            </div>

                            <div className="bg-[#111115] border border-white/10 rounded-3xl p-8 text-center space-y-6">
                                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#00D4FF]/20 to-blue-600/20 rounded-2xl flex items-center justify-center ring-1 ring-[#00D4FF]/30">
                                    <span className="text-4xl">🔑</span>
                                </div>

                                <div>
                                    <p className="text-sm font-semibold uppercase tracking-widest text-[#00D4FF] mb-2">Secure Access Link</p>
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-black rounded-lg border border-white/10 px-4 py-3 text-white/60 font-mono text-sm truncate">
                                            {typeof window !== 'undefined' ? `${window.location.origin}/communities/${tribeData.name.toLowerCase().replace(/\s+/g, '-')}?ref=${user?.username}` : `Calculating...`}
                                        </div>
                                        <button
                                            onClick={() => {
                                                const url = `${window.location.origin}/communities/${tribeData.name.toLowerCase().replace(/\s+/g, '-')}?ref=${user?.username}`;
                                                navigator.clipboard.writeText(url);
                                                alert('Link copied');
                                            }}
                                            className="px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-semibold"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <button className="py-3 rounded-xl bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 hover:bg-[#25D366]/20 font-medium">WhatsApp</button>
                                    <button className="py-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 font-medium">iMessage</button>
                                    <button className="py-3 rounded-xl bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 font-medium">Email</button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Step: Complete */}
                    {step === 'complete' && (
                        <motion.div
                            key="complete"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-12 text-center"
                        >
                            <div className="w-32 h-32 rounded-full bg-[#00D4FF]/10 flex items-center justify-center mb-8 relative">
                                <div className="absolute inset-0 rounded-full border border-[#00D4FF]/30 animate-ping opacity-20" />
                                <div className="w-16 h-16 rounded-full bg-[#00D4FF] flex items-center justify-center shadow-[0_0_40px_rgba(0,212,255,0.4)]">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
                                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>

                            <h2 className="text-4xl font-bold text-white mb-4">Sovereignty Established</h2>
                            <p className="text-white/50 max-w-md text-lg mb-12">
                                <span className="text-[#00D4FF] font-semibold">{tribeData.name}</span> is online.
                                The circle is open.
                            </p>

                            <div className="flex gap-4">
                                <Link
                                    href="/communities"
                                    className="px-10 py-4 rounded-full bg-[#00D4FF] text-black font-bold text-lg hover:bg-[#00D4FF]/90 hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,212,255,0.3)]"
                                >
                                    Enter Domain
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Sticky Actions */}
            {step !== 'complete' && (
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-30">
                    <div className="max-w-3xl mx-auto flex items-center justify-between">
                        <button
                            onClick={prevStep}
                            disabled={currentStepIndex === 0}
                            className="px-8 py-4 rounded-full border border-white/10 font-bold hover:bg-white/5 disabled:opacity-0 transition-all"
                        >
                            Back
                        </button>

                        <button
                            onClick={nextStep}
                            disabled={!canProceed() || isCreating}
                            className="px-10 py-4 rounded-full bg-white text-black font-bold text-lg hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed transition-all shadow-lg flex items-center gap-2"
                        >
                            {isCreating ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    <span>Forging...</span>
                                </>
                            ) : (
                                <span>{step === 'invite' ? 'Initialize' : 'Continue'}</span>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
