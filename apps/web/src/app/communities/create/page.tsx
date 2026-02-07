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
type WizardStep = 'template' | 'identity' | 'branding' | 'sovereignty' | 'invite' | 'complete';

interface TribeData {
    name: string;
    description: string;
    category: string;
    privacy: 'public' | 'private';
    approvalRequired: boolean;
    coverImage: string | null;
    isEncrypted: boolean;
    // Branding
    brandColor: string;
    tagline: string;
    logoUrl: string | null;
}

// ============================================
// CATEGORY OPTIONS (ARCHETYPES)
// ============================================
const ARCHETYPES = [
    { id: 'family', label: 'Family', icon: '🧬', desc: 'A private space for your family.' },
    { id: 'friends', label: 'Friends', icon: '⭕', desc: 'Inner circle for your closest people.' },
    { id: 'business', label: 'Organization', icon: '🤝', desc: 'Professional network or team.' },
    { id: 'faith', label: 'Faith', icon: '🕌', desc: 'Spiritual and community gathering.' },
    { id: 'hobby', label: 'Club / Interest', icon: '⚔️', desc: 'Connect over shared passions.' },
    { id: 'local', label: 'Neighborhood', icon: '🏘️', desc: 'Local community organizing.' },
];

// ============================================
// BRAND COLOR PRESETS
// ============================================
const BRAND_COLORS = [
    '#00D4FF', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981',
    '#3B82F6', '#EC4899', '#F97316', '#14B8A6', '#6366F1',
    '#84CC16', '#D946EF',
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
    const [createdSlug, setCreatedSlug] = useState<string | null>(null);
    const [tribeData, setTribeData] = useState<TribeData>({
        name: '',
        description: '',
        category: '',
        privacy: 'private',
        approvalRequired: true,
        coverImage: null,
        isEncrypted: true,
        brandColor: '#00D4FF',
        tagline: '',
        logoUrl: null,
    });

    // Upload refs
    const coverInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isLogoUploading, setIsLogoUploading] = useState(false);
    const [copied, setCopied] = useState(false);

    // Handle image upload (reusable)
    const handleUpload = useCallback(async (file: File, type: 'cover' | 'logo') => {
        if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) return;
        const setter = type === 'cover' ? setIsUploading : setIsLogoUploading;
        setter(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch(API_ENDPOINTS.upload.post, {
                method: 'POST',
                headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
                credentials: 'include',
                body: formData,
            });
            if (response.ok) {
                const result = await response.json();
                if (type === 'cover') {
                    setTribeData(prev => ({ ...prev, coverImage: result.url }));
                } else {
                    setTribeData(prev => ({ ...prev, logoUrl: result.url }));
                }
            }
        } catch (err) {
            console.error('Upload error:', err);
        } finally {
            setter(false);
        }
    }, []);

    const steps: WizardStep[] = ['template', 'identity', 'branding', 'sovereignty', 'invite'];
    const currentStepIndex = steps.indexOf(step);

    const canProceed = () => {
        switch (step) {
            case 'template': return !!tribeData.category;
            case 'identity': return tribeData.name.trim().length >= 3;
            case 'branding': return true;
            case 'sovereignty': return true;
            case 'invite': return true;
            default: return false;
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
        if (idx > 0) setStep(steps[idx - 1]);
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
            brandColor: tribeData.brandColor,
            tagline: tribeData.tagline,
            logoUrl: tribeData.logoUrl || undefined,
        });
        if (result.success) {
            const slug = tribeData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            setCreatedSlug(slug);
            setStep('complete');
        } else {
            setCreateError(result.error || 'Failed to create group');
        }
        setIsCreating(false);
    };

    // Generate slug for preview
    const slug = tribeData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/communities/${createdSlug || slug}/join` : '';
    const brandColor = tribeData.brandColor || '#00D4FF';

    // Archetype context
    const selectedArchetype = ARCHETYPES.find(a => a.id === tribeData.category);
    const isContainedType = ['family', 'friends'].includes(tribeData.category);

    return (
        <div className="min-h-screen bg-[#050508] text-white font-sans selection:bg-[#00D4FF]/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] blur-[120px] opacity-20" style={{ background: `radial-gradient(circle, ${brandColor}22, transparent 70%)` }} />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-t from-violet-900/10 to-transparent blur-[120px] opacity-30" />
            </div>

            {/* Header */}
            <header className="relative z-20 border-b border-white/5 bg-black/60 backdrop-blur-xl">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/communities" className="group flex items-center gap-2 text-white/50 hover:text-white transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="font-medium text-sm">Cancel</span>
                    </Link>
                    <h1 className="font-bold text-base">Create Group</h1>
                    <div className="w-20" />
                </div>
            </header>

            {/* Progress */}
            {step !== 'complete' && (
                <div className="relative z-20 max-w-3xl mx-auto px-6 pt-6 pb-4">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        {steps.map((s, i) => (
                            <div
                                key={s}
                                className="h-1 flex-1 rounded-full transition-all duration-500"
                                style={{
                                    background: i <= currentStepIndex
                                        ? `linear-gradient(to right, ${brandColor}, ${brandColor}88)`
                                        : 'rgba(255,255,255,0.05)'
                                }}
                            />
                        ))}
                    </div>
                    <p className="text-xs text-white/30 text-right">Step {currentStepIndex + 1} of {steps.length}</p>
                </div>
            )}

            {/* Main Content */}
            <main className="relative z-10 max-w-3xl mx-auto px-6 pb-32">
                <AnimatePresence mode="wait">
                    {/* Step 1: Template/Category */}
                    {step === 'template' && (
                        <motion.div key="template" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-bold">What kind of group?</h2>
                                <p className="text-white/40">This helps us set the right defaults for privacy and features.</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {ARCHETYPES.map((arch) => (
                                    <button
                                        key={arch.id}
                                        onClick={() => {
                                            setTribeData({
                                                ...tribeData,
                                                category: arch.id,
                                                privacy: ['family', 'friends'].includes(arch.id) ? 'private' : tribeData.privacy,
                                            });
                                        }}
                                        className={`group relative p-5 rounded-2xl border text-left transition-all duration-200 ${
                                            tribeData.category === arch.id
                                                ? 'border-[#00D4FF] bg-[#00D4FF]/5'
                                                : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20'
                                        }`}
                                    >
                                        <span className="text-3xl mb-3 block">{arch.icon}</span>
                                        <h3 className={`font-bold text-sm mb-0.5 ${tribeData.category === arch.id ? 'text-[#00D4FF]' : 'text-white'}`}>{arch.label}</h3>
                                        <p className="text-xs text-white/40">{arch.desc}</p>
                                        {tribeData.category === arch.id && (
                                            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#00D4FF] flex items-center justify-center">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
                                                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Auto-isolation hint for family/friends */}
                            {isContainedType && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                    <div className="flex items-start gap-3">
                                        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth={2} className="mt-0.5 flex-shrink-0">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                        </svg>
                                        <div>
                                            <p className="text-emerald-400 text-sm font-medium">Isolated by default</p>
                                            <p className="text-white/40 text-xs mt-1 leading-relaxed">
                                                Members you invite can join <strong className="text-white/60">only this group</strong> — they won&apos;t be part of the wider platform, won&apos;t appear in search, and won&apos;t see anyone else&apos;s content. Perfect for families and close friends who want a private, contained space.
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* Step 2: Identity (Name + Description) */}
                    {step === 'identity' && (
                        <motion.div key="identity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-bold">Name your group</h2>
                                <p className="text-white/40">Give it a name and description that your members will recognize.</p>
                            </div>

                            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-white/70 mb-2">Group Name</label>
                                    <input
                                        type="text"
                                        value={tribeData.name}
                                        onChange={(e) => setTribeData({ ...tribeData, name: e.target.value })}
                                        placeholder={isContainedType ? 'e.g. The Smith Family' : 'e.g. Engineering Club at MIT'}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-lg text-white placeholder:text-white/20 focus:outline-none focus:border-[#00D4FF]/50 transition-all font-medium"
                                        maxLength={50}
                                        autoFocus
                                    />
                                    <div className="flex justify-between mt-1.5">
                                        <span className="text-xs text-white/20">This is what members see</span>
                                        <span className="text-xs text-white/20">{tribeData.name.length}/50</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-white/70 mb-2">Description</label>
                                    <textarea
                                        value={tribeData.description}
                                        onChange={(e) => setTribeData({ ...tribeData, description: e.target.value })}
                                        placeholder={isContainedType ? 'Our private family space for sharing updates, photos, and staying connected.' : 'What is this group about?'}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#00D4FF]/50 h-28 resize-none transition-all leading-relaxed text-sm"
                                        maxLength={280}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-white/70 mb-2">Invite Tagline</label>
                                    <input
                                        type="text"
                                        value={tribeData.tagline}
                                        onChange={(e) => setTribeData({ ...tribeData, tagline: e.target.value })}
                                        placeholder={isContainedType ? 'Join our family circle — private and secure' : 'Join us on 0G — your own private space'}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#00D4FF]/50 transition-all text-sm"
                                        maxLength={120}
                                    />
                                    <p className="text-xs text-white/20 mt-1">Shown on the invite page your members will see</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Branding (Logo, Color, Cover) */}
                    {step === 'branding' && (
                        <motion.div key="branding" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-bold">Your group&apos;s brand</h2>
                                <p className="text-white/40">Upload a logo and pick your colors. This is what people see when invited.</p>
                            </div>

                            {/* Logo Upload */}
                            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                                <label className="block text-sm font-semibold text-white/70 mb-3">Group Logo</label>
                                <div className="flex items-center gap-5">
                                    <button
                                        onClick={() => logoInputRef.current?.click()}
                                        className="relative w-20 h-20 rounded-2xl border-2 border-dashed transition-all overflow-hidden flex-shrink-0 hover:border-white/30"
                                        style={{ borderColor: tribeData.logoUrl ? brandColor : 'rgba(255,255,255,0.15)' }}
                                    >
                                        {isLogoUploading ? (
                                            <div className="w-full h-full flex items-center justify-center bg-white/5">
                                                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            </div>
                                        ) : tribeData.logoUrl ? (
                                            <img src={tribeData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-white/[0.03]">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
                                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                                    <path d="M21 15l-5-5L5 21" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                    <div>
                                        <p className="text-white/60 text-sm font-medium">
                                            {tribeData.logoUrl ? 'Logo uploaded' : 'Upload your group logo'}
                                        </p>
                                        <p className="text-white/30 text-xs mt-0.5">Square image, at least 200x200px</p>
                                        {tribeData.logoUrl && (
                                            <button onClick={() => setTribeData(prev => ({ ...prev, logoUrl: null }))} className="text-red-400 text-xs mt-1 hover:underline">Remove</button>
                                        )}
                                    </div>
                                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'logo')} />
                                </div>
                            </div>

                            {/* Brand Color */}
                            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                                <label className="block text-sm font-semibold text-white/70 mb-3">Brand Color</label>
                                <div className="flex flex-wrap gap-2.5">
                                    {BRAND_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setTribeData({ ...tribeData, brandColor: color })}
                                            className="w-9 h-9 rounded-xl transition-all duration-200 relative"
                                            style={{
                                                backgroundColor: color,
                                                transform: tribeData.brandColor === color ? 'scale(1.15)' : 'scale(1)',
                                                boxShadow: tribeData.brandColor === color ? `0 0 20px ${color}44` : 'none',
                                            }}
                                        >
                                            {tribeData.brandColor === color && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Cover Image */}
                            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                                <label className="block text-sm font-semibold text-white/70 mb-3">Cover Banner <span className="text-white/30 font-normal">(optional)</span></label>
                                <button
                                    onClick={() => coverInputRef.current?.click()}
                                    className="w-full aspect-[3/1] rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-colors relative"
                                >
                                    {isUploading ? (
                                        <div className="w-full h-full flex items-center justify-center bg-white/[0.03]">
                                            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        </div>
                                    ) : tribeData.coverImage ? (
                                        <>
                                            <img src={tribeData.coverImage} alt="Cover" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-white/80 text-sm font-medium">Change</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-white/[0.02]" style={{ background: `linear-gradient(135deg, ${brandColor}15, transparent)` }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30 mb-1">
                                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <p className="text-xs text-white/30">Upload banner</p>
                                        </div>
                                    )}
                                </button>
                                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'cover')} />
                            </div>

                            {/* Live Preview */}
                            <div>
                                <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Invite Preview</p>
                                <div className="bg-[#111115] rounded-2xl border border-white/10 overflow-hidden">
                                    {/* Cover */}
                                    <div className="h-20 relative" style={{ background: tribeData.coverImage ? undefined : `linear-gradient(135deg, ${brandColor}33, ${brandColor}11, transparent)` }}>
                                        {tribeData.coverImage && <img src={tribeData.coverImage} alt="" className="w-full h-full object-cover" />}
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#111115] to-transparent" />
                                    </div>
                                    {/* Info */}
                                    <div className="px-5 pb-5 -mt-6 relative">
                                        <div className="w-12 h-12 rounded-xl overflow-hidden border-2 mb-2" style={{ borderColor: brandColor, background: tribeData.logoUrl ? undefined : `${brandColor}22` }}>
                                            {tribeData.logoUrl ? (
                                                <img src={tribeData.logoUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-lg font-bold" style={{ color: brandColor }}>
                                                    {tribeData.name?.[0]?.toUpperCase() || '?'}
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-white text-base">{tribeData.name || 'Your Group'}</h3>
                                        {(tribeData.tagline || tribeData.description) && (
                                            <p className="text-white/40 text-xs mt-0.5">{tribeData.tagline || tribeData.description}</p>
                                        )}
                                        <div className="mt-3 py-2 rounded-lg text-center text-sm font-semibold text-black" style={{ backgroundColor: brandColor }}>
                                            Join {tribeData.name || 'Group'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 4: Sovereignty (Privacy) */}
                    {step === 'sovereignty' && (
                        <motion.div key="sovereignty" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-bold">Privacy settings</h2>
                                <p className="text-white/40">Control who can find and join your group.</p>
                            </div>

                            <div className="grid gap-3">
                                <button
                                    onClick={() => setTribeData({ ...tribeData, privacy: 'private' })}
                                    className={`relative p-5 rounded-2xl border text-left transition-all ${tribeData.privacy === 'private' ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/10 bg-white/[0.03] hover:border-white/20'}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
                                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold mb-0.5">Private — Invite Only</h3>
                                            <p className="text-white/40 text-sm leading-relaxed">
                                                Only people with your invite link can join. Not discoverable in search. Best for families, friends, and private organizations.
                                            </p>
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">Invite Only</span>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">Hidden from Search</span>
                                            </div>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 ${tribeData.privacy === 'private' ? 'border-emerald-500' : 'border-white/20'}`}>
                                            {tribeData.privacy === 'private' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setTribeData({ ...tribeData, privacy: 'public' })}
                                    className={`relative p-5 rounded-2xl border text-left transition-all ${tribeData.privacy === 'public' ? 'border-[#00D4FF]/40 bg-[#00D4FF]/5' : 'border-white/10 bg-white/[0.03] hover:border-white/20'}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" />
                                                <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold mb-0.5">Public</h3>
                                            <p className="text-white/40 text-sm leading-relaxed">
                                                Anyone can find and join. Discoverable in search and recommendations.
                                            </p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 ${tribeData.privacy === 'public' ? 'border-[#00D4FF]' : 'border-white/20'}`}>
                                            {tribeData.privacy === 'public' && <div className="w-2.5 h-2.5 rounded-full bg-[#00D4FF]" />}
                                        </div>
                                    </div>
                                </button>
                            </div>

                            {/* Gatekeeper toggle */}
                            {tribeData.privacy === 'private' && (
                                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                                    <label className="flex items-center justify-between cursor-pointer" onClick={() => setTribeData({ ...tribeData, approvalRequired: !tribeData.approvalRequired })}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">Require admin approval</p>
                                                <p className="text-xs text-white/40">New members need approval before joining</p>
                                            </div>
                                        </div>
                                        <div className={`w-11 h-6 rounded-full p-0.5 transition-colors ${tribeData.approvalRequired ? 'bg-emerald-500' : 'bg-white/10'}`}>
                                            <motion.div className="w-5 h-5 rounded-full bg-white shadow-sm" animate={{ x: tribeData.approvalRequired ? 20 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                                        </div>
                                    </label>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Step 5: Invite — Branded */}
                    {step === 'invite' && (
                        <motion.div key="invite" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-bold">Invite your people</h2>
                                <p className="text-white/40">Share the invite link — it includes your group&apos;s branding.</p>
                            </div>

                            {/* Branded invite preview */}
                            <div className="bg-[#111115] rounded-2xl border border-white/10 overflow-hidden">
                                <div className="h-16 relative" style={{ background: `linear-gradient(135deg, ${brandColor}44, ${brandColor}11)` }}>
                                    {tribeData.coverImage && <img src={tribeData.coverImage} alt="" className="w-full h-full object-cover opacity-60" />}
                                </div>
                                <div className="px-5 pb-5 -mt-5 relative">
                                    <div className="w-10 h-10 rounded-xl overflow-hidden border-2 mb-2" style={{ borderColor: brandColor, background: `${brandColor}22` }}>
                                        {tribeData.logoUrl ? (
                                            <img src={tribeData.logoUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center font-bold" style={{ color: brandColor }}>
                                                {tribeData.name?.[0]?.toUpperCase() || '?'}
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-white">{tribeData.name}</h3>
                                    <p className="text-white/40 text-xs">{tribeData.tagline || tribeData.description || 'Join our private group'}</p>

                                    {isContainedType && (
                                        <div className="mt-2 flex items-center gap-1.5">
                                            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth={2}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                                            <span className="text-emerald-400 text-[10px] font-medium">Private &amp; contained — members stay isolated</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Copy Link */}
                            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
                                <div>
                                    <p className="text-sm font-semibold text-white/70 mb-2">Invite Link</p>
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-black rounded-lg border border-white/10 px-3 py-2.5 text-white/50 font-mono text-xs truncate">
                                            {inviteUrl}
                                        </div>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(inviteUrl);
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }}
                                            className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors"
                                            style={{ backgroundColor: copied ? '#34d399' : brandColor, color: '#000' }}
                                        >
                                            {copied ? '✓ Copied' : 'Copy'}
                                        </button>
                                    </div>
                                </div>

                                {/* Share buttons */}
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => {
                                            const msg = isContainedType
                                                ? `Hey! 👋 I set up *${tribeData.name}* — a private, secure group just for us.\n\n${tribeData.tagline || 'Join our private circle.'}\n\n✅ Private & contained — no social media exposure\n🔒 Your data stays yours\n⚡ 30 second signup\n\nJoin here: ${inviteUrl}`
                                                : `Hey! 👋 Join *${tribeData.name}* on 0G.\n\n${tribeData.tagline || ''}\n\nJoin here: ${inviteUrl}`;
                                            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                                        }}
                                        className="py-2.5 rounded-xl bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 hover:bg-[#25D366]/20 font-medium transition-colors text-sm"
                                    >
                                        WhatsApp
                                    </button>
                                    <button
                                        onClick={() => {
                                            const msg = isContainedType
                                                ? `Join ${tribeData.name} — our private group: ${inviteUrl}`
                                                : `Join ${tribeData.name} on 0G! ${inviteUrl}`;
                                            window.open(`sms:?body=${encodeURIComponent(msg)}`, '_blank');
                                        }}
                                        className="py-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 font-medium transition-colors text-sm"
                                    >
                                        iMessage
                                    </button>
                                    <button
                                        onClick={() => {
                                            const msg = isContainedType
                                                ? `I set up "${tribeData.name}" as our private group — it's secure and contained.\n\nJoin here: ${inviteUrl}\n\nYou'll only see our group content. No social media, no ads, no tracking.`
                                                : `Join "${tribeData.name}" on 0G: ${inviteUrl}`;
                                            window.open(`mailto:?subject=${encodeURIComponent(`Join ${tribeData.name}`)}&body=${encodeURIComponent(msg)}`, '_blank');
                                        }}
                                        className="py-2.5 rounded-xl bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 font-medium transition-colors text-sm"
                                    >
                                        Email
                                    </button>
                                </div>

                                {/* WhatsApp migration tip */}
                                {isContainedType && (
                                    <div className="px-4 py-3 rounded-xl bg-[#25D366]/5 border border-[#25D366]/10">
                                        <p className="text-[#25D366] text-xs font-medium mb-1">💡 Moving from WhatsApp?</p>
                                        <p className="text-white/40 text-xs leading-relaxed">Share this link in your existing group chat. Everyone can join with one tap. They&apos;ll only see this group — no social media exposure.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Step: Complete */}
                    {step === 'complete' && (
                        <motion.div key="complete" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 relative" style={{ background: `${brandColor}15` }}>
                                <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ border: `1px solid ${brandColor}44` }} />
                                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: brandColor }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
                                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>

                            <h2 className="text-3xl font-bold text-white mb-3">{tribeData.name} is live!</h2>
                            <p className="text-white/50 max-w-sm mb-8">
                                Your group is ready. Share the invite link to bring your people in.
                            </p>

                            <div className="flex flex-col gap-3 w-full max-w-sm">
                                <Link
                                    href={`/communities/${createdSlug || slug}`}
                                    className="w-full py-3.5 rounded-xl font-bold text-center text-black"
                                    style={{ backgroundColor: brandColor }}
                                >
                                    Enter {tribeData.name}
                                </Link>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(inviteUrl);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }}
                                    className="w-full py-3.5 rounded-xl font-bold border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                    {copied ? '✓ Link Copied' : 'Copy Invite Link'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Sticky Actions */}
            {step !== 'complete' && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent z-30">
                    <div className="max-w-3xl mx-auto flex items-center justify-between">
                        <button
                            onClick={prevStep}
                            disabled={currentStepIndex === 0}
                            className="px-6 py-3 rounded-full border border-white/10 font-medium text-sm hover:bg-white/5 disabled:opacity-0 transition-all"
                        >
                            Back
                        </button>

                        {createError && (
                            <p className="text-red-400 text-xs">{createError}</p>
                        )}

                        <button
                            onClick={nextStep}
                            disabled={!canProceed() || isCreating}
                            className="px-8 py-3 rounded-full text-black font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center gap-2 hover:opacity-90"
                            style={{ backgroundColor: brandColor }}
                        >
                            {isCreating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    <span>Creating...</span>
                                </>
                            ) : (
                                <span>{step === 'invite' ? 'Create Group' : 'Continue'}</span>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
