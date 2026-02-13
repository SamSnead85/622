'use client';

import React, { useState, useCallback, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// WHO'S IN? - PREMIUM TRAVEL ADVENTURE SYSTEM
// A stunning, interactive travel poll feature
// for families and groups to plan adventures
// ============================================

// Types
export interface TravelAdventure {
    id: string;
    title: string;
    description: string;
    destination: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'youtube';
    youtubeId?: string;
    proposedDates: {
        start: string;
        end: string;
    };
    estimatedBudget?: {
        min: number;
        max: number;
        currency: string;
    };
    activities: string[];
    responses: TravelResponse[];
    creator: {
        id: string;
        displayName: string;
        avatarUrl?: string;
    };
    groupId?: string;
    familyId?: string;
    status: 'planning' | 'confirmed' | 'completed' | 'cancelled';
    createdAt: string;
    expiresAt?: string;
}

export interface TravelResponse {
    userId: string;
    displayName: string;
    avatarUrl?: string;
    status: 'in' | 'out' | 'maybe' | 'pending';
    message?: string;
    respondedAt: string;
}

// Premium Destination Presets
export const DESTINATION_PRESETS = [
    { id: 'redwood', name: 'Redwood Forest', emoji: '🌲', gradient: 'from-emerald-600 to-green-800', image: '/destinations/redwood.jpg' },
    { id: 'beach', name: 'Beach Paradise', emoji: '🏖️', gradient: 'from-cyan-500 to-blue-600', image: '/destinations/beach.jpg' },
    { id: 'mountain', name: 'Mountain Retreat', emoji: '⛰️', gradient: 'from-slate-600 to-stone-800', image: '/destinations/mountain.jpg' },
    { id: 'city', name: 'City Adventure', emoji: '🏙️', gradient: 'from-purple-600 to-indigo-800', image: '/destinations/city.jpg' },
    { id: 'camping', name: 'Camping Trip', emoji: '🏕️', gradient: 'from-amber-600 to-orange-700', image: '/destinations/camping.jpg' },
    { id: 'roadtrip', name: 'Road Trip', emoji: '🚗', gradient: 'from-red-500 to-rose-700', image: '/destinations/roadtrip.jpg' },
    { id: 'theme_park', name: 'Theme Park', emoji: '🎢', gradient: 'from-pink-500 to-fuchsia-700', image: '/destinations/themepark.jpg' },
    { id: 'cruise', name: 'Cruise Getaway', emoji: '🚢', gradient: 'from-blue-600 to-indigo-700', image: '/destinations/cruise.jpg' },
    { id: 'ski', name: 'Ski Resort', emoji: '⛷️', gradient: 'from-sky-400 to-blue-700', image: '/destinations/ski.jpg' },
    { id: 'safari', name: 'Safari Adventure', emoji: '🦁', gradient: 'from-yellow-600 to-amber-800', image: '/destinations/safari.jpg' },
    { id: 'custom', name: 'Custom Destination', emoji: '✨', gradient: 'from-violet-600 to-purple-800', image: '' },
] as const;

// Response Icons with Premium Design
const RESPONSE_OPTIONS = [
    { id: 'in', label: "I'm In!", emoji: '🙌', color: 'from-emerald-500 to-green-600', bgColor: 'bg-emerald-500/20', textColor: 'text-emerald-400' },
    { id: 'maybe', label: 'Maybe', emoji: '🤔', color: 'from-amber-500 to-orange-600', bgColor: 'bg-amber-500/20', textColor: 'text-amber-400' },
    { id: 'out', label: "Can't Make It", emoji: '😢', color: 'from-rose-500 to-red-600', bgColor: 'bg-rose-500/20', textColor: 'text-rose-400' },
] as const;

// ============================================
// HOOKS
// ============================================

export function useTravelAdventures(groupId?: string) {
    const [adventures, setAdventures] = useState<TravelAdventure[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Load adventures from localStorage
        const saved = localStorage.getItem('0g_travel_adventures');
        if (saved) {
            const all = JSON.parse(saved) as TravelAdventure[];
            setAdventures(groupId ? all.filter(a => a.groupId === groupId || a.familyId === groupId) : all);
        }
        setIsLoading(false);
    }, [groupId]);

    const saveAdventures = useCallback((updated: TravelAdventure[]) => {
        const saved = localStorage.getItem('0g_travel_adventures');
        const all = saved ? JSON.parse(saved) as TravelAdventure[] : [];

        // Merge updates
        const merged = [...all.filter(a => !updated.find(u => u.id === a.id)), ...updated];
        localStorage.setItem('0g_travel_adventures', JSON.stringify(merged));
        setAdventures(groupId ? merged.filter(a => a.groupId === groupId || a.familyId === groupId) : merged);
    }, [groupId]);

    const createAdventure = useCallback((adventure: Omit<TravelAdventure, 'id' | 'createdAt' | 'responses' | 'status'>) => {
        const newAdventure: TravelAdventure = {
            ...adventure,
            id: `adventure_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            responses: [],
            status: 'planning',
            createdAt: new Date().toISOString(),
        };
        saveAdventures([...adventures, newAdventure]);
        return newAdventure;
    }, [adventures, saveAdventures]);

    const respondToAdventure = useCallback((adventureId: string, response: Omit<TravelResponse, 'respondedAt'>) => {
        const updated = adventures.map(a => {
            if (a.id !== adventureId) return a;
            const existingIndex = a.responses.findIndex(r => r.userId === response.userId);
            const newResponse = { ...response, respondedAt: new Date().toISOString() };
            if (existingIndex >= 0) {
                a.responses[existingIndex] = newResponse;
            } else {
                a.responses.push(newResponse);
            }
            return a;
        });
        saveAdventures(updated);
    }, [adventures, saveAdventures]);

    const deleteAdventure = useCallback((adventureId: string) => {
        saveAdventures(adventures.filter(a => a.id !== adventureId));
    }, [adventures, saveAdventures]);

    const updateAdventureStatus = useCallback((adventureId: string, status: TravelAdventure['status']) => {
        const updated = adventures.map(a => a.id === adventureId ? { ...a, status } : a);
        saveAdventures(updated);
    }, [adventures, saveAdventures]);

    return { adventures, isLoading, createAdventure, respondToAdventure, deleteAdventure, updateAdventureStatus };
}

// ============================================
// PREMIUM COMPONENTS
// ============================================

// Adventure Card - Hero Display
interface AdventureCardProps {
    adventure: TravelAdventure;
    currentUserId?: string;
    onRespond: (status: TravelResponse['status'], message?: string) => void;
    onViewDetails?: () => void;
    variant?: 'full' | 'compact';
}

export const AdventureCard = memo(function AdventureCard({
    adventure,
    currentUserId,
    onRespond,
    onViewDetails,
    variant = 'full'
}: AdventureCardProps) {
    const [showResponseModal, setShowResponseModal] = useState(false);
    const [responseMessage, setResponseMessage] = useState('');
    const [selectedResponse, setSelectedResponse] = useState<TravelResponse['status'] | null>(null);

    const userResponse = adventure.responses.find(r => r.userId === currentUserId);
    const inCount = adventure.responses.filter(r => r.status === 'in').length;
    const maybeCount = adventure.responses.filter(r => r.status === 'maybe').length;
    const totalResponses = adventure.responses.length;

    const daysUntil = adventure.proposedDates.start
        ? Math.ceil((new Date(adventure.proposedDates.start).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    const preset = DESTINATION_PRESETS.find(p => p.id === adventure.destination) || DESTINATION_PRESETS[DESTINATION_PRESETS.length - 1];

    const handleSubmitResponse = () => {
        if (selectedResponse) {
            onRespond(selectedResponse, responseMessage || undefined);
            setShowResponseModal(false);
            setResponseMessage('');
            setSelectedResponse(null);
        }
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${preset.gradient} ${variant === 'full' ? 'min-h-[400px]' : 'min-h-[200px]'
                    }`}
            >
                {/* Background Media */}
                {adventure.mediaUrl && (
                    <div className="absolute inset-0">
                        {adventure.mediaType === 'video' || adventure.mediaType === 'youtube' ? (
                            adventure.youtubeId ? (
                                <iframe
                                    src={`https://www.youtube.com/embed/${adventure.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${adventure.youtubeId}&controls=0`}
                                    className="w-full h-full object-cover"
                                    allow="autoplay; encrypted-media"
                                    allowFullScreen
                                />
                            ) : (
                                <video
                                    src={adventure.mediaUrl}
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                            )
                        ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={adventure.mediaUrl}
                                alt={adventure.title}
                                className="w-full h-full object-cover"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                    </div>
                )}

                {/* Content Overlay */}
                <div className="relative flex flex-col justify-end h-full p-6">
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4 flex gap-2">
                        {daysUntil !== null && daysUntil > 0 && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-xl text-white text-sm font-medium"
                            >
                                {daysUntil} days away
                            </motion.div>
                        )}
                        <div className={`px-3 py-1.5 rounded-full backdrop-blur-xl text-sm font-medium ${adventure.status === 'confirmed' ? 'bg-emerald-500/30 text-emerald-300' :
                                adventure.status === 'planning' ? 'bg-blue-500/30 text-blue-300' :
                                    'bg-gray-500/30 text-gray-300'
                            }`}>
                            {adventure.status === 'confirmed' ? '✓ Confirmed' :
                                adventure.status === 'planning' ? '📋 Planning' : adventure.status}
                        </div>
                    </div>

                    {/* Destination Emoji */}
                    <div className="text-6xl mb-4">{preset.emoji}</div>

                    {/* Title & Description */}
                    <h2 className="text-3xl font-bold text-white mb-2">{adventure.title}</h2>
                    <p className="text-white/80 text-lg mb-4 line-clamp-2">{adventure.description}</p>

                    {/* Date Range */}
                    {adventure.proposedDates.start && (
                        <div className="flex items-center gap-2 text-white/70 mb-4">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="font-medium">
                                {new Date(adventure.proposedDates.start).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                })}
                                {adventure.proposedDates.end && adventure.proposedDates.end !== adventure.proposedDates.start && (
                                    ` - ${new Date(adventure.proposedDates.end).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}`
                                )}
                            </span>
                        </div>
                    )}

                    {/* Response Stats */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex -space-x-2">
                            {adventure.responses.slice(0, 5).map((r, i) => (
                                <div
                                    key={r.userId}
                                    className={`w-10 h-10 rounded-full border-2 border-black flex items-center justify-center text-lg ${r.status === 'in' ? 'bg-emerald-500' :
                                            r.status === 'maybe' ? 'bg-amber-500' :
                                                'bg-rose-500'
                                        }`}
                                    style={{ zIndex: 5 - i }}
                                    title={`${r.displayName}: ${r.status}`}
                                >
                                    {r.avatarUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={r.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        r.displayName.charAt(0).toUpperCase()
                                    )}
                                </div>
                            ))}
                            {adventure.responses.length > 5 && (
                                <div className="w-10 h-10 rounded-full border-2 border-black bg-white/20 backdrop-blur flex items-center justify-center text-sm font-bold text-white">
                                    +{adventure.responses.length - 5}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 flex gap-3 text-sm">
                            <span className="text-emerald-300 font-medium">{inCount} in</span>
                            <span className="text-amber-300 font-medium">{maybeCount} maybe</span>
                            <span className="text-white/50">{totalResponses} total</span>
                        </div>
                    </div>

                    {/* WHO'S IN? CTA */}
                    <div className="flex gap-3">
                        {RESPONSE_OPTIONS.map((option) => (
                            <motion.button
                                key={option.id}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    setSelectedResponse(option.id as TravelResponse['status']);
                                    setShowResponseModal(true);
                                }}
                                className={`flex-1 py-4 rounded-2xl font-bold text-lg transition-all ${userResponse?.status === option.id
                                        ? `bg-gradient-to-r ${option.color} text-white shadow-lg`
                                        : `${option.bgColor} ${option.textColor} hover:opacity-80`
                                    }`}
                            >
                                <span className="mr-2">{option.emoji}</span>
                                {option.label}
                            </motion.button>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Response Modal */}
            <AnimatePresence>
                {showResponseModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowResponseModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1A1A1F] rounded-3xl p-6 max-w-md w-full border border-white/10"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="text-center mb-6">
                                <div className="text-5xl mb-3">
                                    {RESPONSE_OPTIONS.find(o => o.id === selectedResponse)?.emoji}
                                </div>
                                <h3 className="text-xl font-bold text-white">
                                    {selectedResponse === 'in' && "You're In! 🎉"}
                                    {selectedResponse === 'maybe' && "Maybe... 🤔"}
                                    {selectedResponse === 'out' && "Can't Make It 😢"}
                                </h3>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm text-white/60 mb-2">Add a message (optional)</label>
                                <textarea
                                    value={responseMessage}
                                    onChange={(e) => setResponseMessage(e.target.value)}
                                    placeholder={
                                        selectedResponse === 'in' ? "Can't wait! I'll bring the snacks..." :
                                            selectedResponse === 'maybe' ? "Let me check my schedule..." :
                                                "Sorry, I have other plans..."
                                    }
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-[#7C8FFF] focus:outline-none resize-none"
                                    rows={3}
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowResponseModal(false)}
                                    className="flex-1 py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmitResponse}
                                    className={`flex-1 py-3 rounded-xl font-bold text-white transition-all bg-gradient-to-r ${RESPONSE_OPTIONS.find(o => o.id === selectedResponse)?.color
                                        }`}
                                >
                                    Confirm
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
});

// ============================================
// CREATE ADVENTURE WIZARD
// ============================================

interface CreateAdventureWizardProps {
    groupId?: string;
    familyId?: string;
    creatorId: string;
    creatorName: string;
    creatorAvatar?: string;
    onComplete: (adventure: TravelAdventure) => void;
    onCancel: () => void;
}

export function CreateAdventureWizard({
    groupId,
    familyId,
    creatorId,
    creatorName,
    creatorAvatar,
    onComplete,
    onCancel
}: CreateAdventureWizardProps) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        destination: '',
        customDestination: '',
        mediaUrl: '',
        mediaType: 'image' as 'image' | 'video' | 'youtube',
        youtubeId: '',
        startDate: '',
        endDate: '',
        budgetMin: '',
        budgetMax: '',
        activities: [] as string[],
    });
    const [newActivity, setNewActivity] = useState('');

    const selectedPreset = DESTINATION_PRESETS.find(p => p.id === formData.destination);

    const extractYouTubeId = (url: string): string | null => {
        const patterns = [
            /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
            /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
            /youtu\.be\/([a-zA-Z0-9_-]+)/,
            /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    };

    const handleMediaUrlChange = (url: string) => {
        const ytId = extractYouTubeId(url);
        if (ytId) {
            setFormData(prev => ({ ...prev, mediaUrl: url, mediaType: 'youtube', youtubeId: ytId }));
        } else if (url.match(/\.(mp4|webm|mov)$/i)) {
            setFormData(prev => ({ ...prev, mediaUrl: url, mediaType: 'video', youtubeId: '' }));
        } else {
            setFormData(prev => ({ ...prev, mediaUrl: url, mediaType: 'image', youtubeId: '' }));
        }
    };

    const addActivity = () => {
        if (newActivity.trim()) {
            setFormData(prev => ({ ...prev, activities: [...prev.activities, newActivity.trim()] }));
            setNewActivity('');
        }
    };

    const removeActivity = (index: number) => {
        setFormData(prev => ({ ...prev, activities: prev.activities.filter((_, i) => i !== index) }));
    };

    const handleSubmit = () => {
        const adventure = onComplete({
            id: '',
            title: formData.title || `Trip to ${formData.destination === 'custom' ? formData.customDestination : selectedPreset?.name}`,
            description: formData.description,
            destination: formData.destination === 'custom' ? formData.customDestination : formData.destination,
            mediaUrl: formData.mediaUrl || undefined,
            mediaType: formData.mediaType,
            youtubeId: formData.youtubeId || undefined,
            proposedDates: {
                start: formData.startDate,
                end: formData.endDate || formData.startDate,
            },
            estimatedBudget: formData.budgetMin || formData.budgetMax ? {
                min: parseFloat(formData.budgetMin) || 0,
                max: parseFloat(formData.budgetMax) || parseFloat(formData.budgetMin) || 0,
                currency: 'USD',
            } : undefined,
            activities: formData.activities,
            creator: { id: creatorId, displayName: creatorName, avatarUrl: creatorAvatar },
            groupId,
            familyId,
            responses: [],
            status: 'planning',
            createdAt: '',
        } as TravelAdventure);
        return adventure;
    };

    const totalSteps = 4;
    const progress = (step / totalSteps) * 100;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#0A0A0F] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-white/10"
            >
                {/* Progress Bar */}
                <div className="h-1 bg-white/5">
                    <motion.div
                        className="h-full bg-gradient-to-r from-[#7C8FFF] to-[#6070EE]"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                    />
                </div>

                {/* Header */}
                <div className="p-6 border-b border-white/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Plan an Adventure</h2>
                            <p className="text-white/50">Step {step} of {totalSteps}</p>
                        </div>
                        <button
                            onClick={onCancel}
                            className="p-2 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
                    <AnimatePresence mode="wait">
                        {/* Step 1: Choose Destination */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <h3 className="text-xl font-semibold text-white mb-6">Where are we going? 🗺️</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {DESTINATION_PRESETS.map((preset) => (
                                        <motion.button
                                            key={preset.id}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setFormData(prev => ({ ...prev, destination: preset.id }))}
                                            className={`p-4 rounded-2xl text-center transition-all ${formData.destination === preset.id
                                                    ? `bg-gradient-to-br ${preset.gradient} ring-2 ring-white/30`
                                                    : 'bg-white/5 hover:bg-white/10'
                                                }`}
                                        >
                                            <div className="text-3xl mb-2">{preset.emoji}</div>
                                            <div className="text-sm font-medium text-white">{preset.name}</div>
                                        </motion.button>
                                    ))}
                                </div>

                                {formData.destination === 'custom' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-4"
                                    >
                                        <input
                                            type="text"
                                            value={formData.customDestination}
                                            onChange={(e) => setFormData(prev => ({ ...prev, customDestination: e.target.value }))}
                                            placeholder="Enter your destination..."
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-[#7C8FFF] focus:outline-none"
                                        />
                                    </motion.div>
                                )}
                            </motion.div>
                        )}

                        {/* Step 2: Details */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <h3 className="text-xl font-semibold text-white mb-6">Tell us more 📝</h3>

                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Adventure Title</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder={`Amazing ${selectedPreset?.name || 'Adventure'}!`}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-[#7C8FFF] focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="I want to go see the redwood forest next weekend! Who's in? 🌲"
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-[#7C8FFF] focus:outline-none resize-none"
                                        rows={3}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Share a video or image (optional)</label>
                                    <input
                                        type="text"
                                        value={formData.mediaUrl}
                                        onChange={(e) => handleMediaUrlChange(e.target.value)}
                                        placeholder="Paste YouTube link or image URL..."
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-[#7C8FFF] focus:outline-none"
                                    />
                                    {formData.youtubeId && (
                                        <div className="mt-3 rounded-xl overflow-hidden aspect-video">
                                            <iframe
                                                src={`https://www.youtube.com/embed/${formData.youtubeId}`}
                                                className="w-full h-full"
                                                allow="encrypted-media"
                                            />
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Dates & Budget */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <h3 className="text-xl font-semibold text-white mb-6">When are we going? 📅</h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-white/60 mb-2">Start Date</label>
                                        <input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#7C8FFF] focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-white/60 mb-2">End Date</label>
                                        <input
                                            type="date"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                            min={formData.startDate}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#7C8FFF] focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-white/60 mb-2">Estimated Budget (optional)</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span>
                                            <input
                                                type="number"
                                                value={formData.budgetMin}
                                                onChange={(e) => setFormData(prev => ({ ...prev, budgetMin: e.target.value }))}
                                                placeholder="Min"
                                                className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-[#7C8FFF] focus:outline-none"
                                            />
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span>
                                            <input
                                                type="number"
                                                value={formData.budgetMax}
                                                onChange={(e) => setFormData(prev => ({ ...prev, budgetMax: e.target.value }))}
                                                placeholder="Max"
                                                className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-[#7C8FFF] focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 4: Activities */}
                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <h3 className="text-xl font-semibold text-white mb-6">What will we do there? 🎯</h3>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newActivity}
                                        onChange={(e) => setNewActivity(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addActivity()}
                                        placeholder="Add an activity..."
                                        className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-[#7C8FFF] focus:outline-none"
                                    />
                                    <button
                                        onClick={addActivity}
                                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#7C8FFF] to-[#6070EE] text-white font-medium"
                                    >
                                        Add
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {formData.activities.length === 0 ? (
                                        <div className="text-center py-8 text-white/40">
                                            <div className="text-4xl mb-2">🎒</div>
                                            <p>Add some activities you want to do!</p>
                                        </div>
                                    ) : (
                                        formData.activities.map((activity, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-xl"
                                            >
                                                <span className="text-white">{activity}</span>
                                                <button
                                                    onClick={() => removeActivity(index)}
                                                    className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </motion.div>
                                        ))
                                    )}
                                </div>

                                {/* Preview */}
                                <div className="mt-8 p-4 bg-gradient-to-br from-[#7C8FFF]/10 to-[#6070EE]/10 rounded-2xl border border-white/10">
                                    <h4 className="text-sm font-medium text-white/60 mb-3">Preview</h4>
                                    <div className="flex items-center gap-3">
                                        <div className="text-4xl">{selectedPreset?.emoji || '✨'}</div>
                                        <div>
                                            <h5 className="font-semibold text-white">
                                                {formData.title || `Trip to ${formData.destination === 'custom' ? formData.customDestination : selectedPreset?.name}`}
                                            </h5>
                                            <p className="text-sm text-white/60">
                                                {formData.startDate && new Date(formData.startDate).toLocaleDateString()}
                                                {formData.activities.length > 0 && ` • ${formData.activities.length} activities`}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 flex justify-between">
                    <button
                        onClick={() => step > 1 ? setStep(step - 1) : onCancel()}
                        className="px-6 py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors"
                    >
                        {step === 1 ? 'Cancel' : 'Back'}
                    </button>
                    <button
                        onClick={() => {
                            if (step < totalSteps) {
                                setStep(step + 1);
                            } else {
                                handleSubmit();
                            }
                        }}
                        disabled={step === 1 && !formData.destination}
                        className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#7C8FFF] to-[#6070EE] text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {step === totalSteps ? "Who's In? 🚀" : 'Next'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ============================================
// ADVENTURE LIST COMPONENT
// ============================================

interface AdventureListProps {
    adventures: TravelAdventure[];
    currentUserId?: string;
    onRespond: (adventureId: string, status: TravelResponse['status'], message?: string) => void;
    onCreateNew: () => void;
    emptyMessage?: string;
}

export function AdventureList({
    adventures,
    currentUserId,
    onRespond,
    onCreateNew,
    emptyMessage = "No adventures planned yet!"
}: AdventureListProps) {
    if (adventures.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-[#7C8FFF]/20 to-[#6070EE]/20 flex items-center justify-center">
                    <span className="text-5xl">🗺️</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">{emptyMessage}</h3>
                <p className="text-white/50 mb-8 max-w-md mx-auto">
                    Start planning your next adventure and see who wants to join!
                </p>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onCreateNew}
                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#7C8FFF] to-[#6070EE] text-white font-bold text-lg shadow-lg shadow-[#7C8FFF]/20"
                >
                    <span className="mr-2">🚀</span>
                    Plan an Adventure
                </motion.button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Upcoming Adventures</h2>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onCreateNew}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#7C8FFF] to-[#6070EE] text-white font-medium"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Adventure
                </motion.button>
            </div>

            {adventures.map((adventure) => (
                <AdventureCard
                    key={adventure.id}
                    adventure={adventure}
                    currentUserId={currentUserId}
                    onRespond={(status, message) => onRespond(adventure.id, status, message)}
                />
            ))}
        </div>
    );
}

// All components and hooks are individually named-exported above.
