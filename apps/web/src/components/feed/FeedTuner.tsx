'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';

interface FeedPreferences {
    recencyWeight: number;
    engagementWeight: number;
    followingRatio: number;
    contentTypes: Record<string, number>;
}

const defaultPreferences: FeedPreferences = {
    recencyWeight: 50,
    engagementWeight: 50,
    followingRatio: 70,
    contentTypes: { VIDEO: 1.0, IMAGE: 1.0, TEXT: 0.8, AUDIO: 0.8 },
};

interface FeedTunerProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (prefs: FeedPreferences) => void;
}

export function FeedTuner({ isOpen, onClose, onSave }: FeedTunerProps) {
    const [prefs, setPrefs] = useState<FeedPreferences>(defaultPreferences);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Load preferences
    useEffect(() => {
        if (!isOpen) return;
        apiFetch('/api/v1/users/preferences/feed')
            .then((data) => {
                if (data && !data.error) {
                    setPrefs({
                        recencyWeight: data.recencyWeight ?? 50,
                        engagementWeight: data.engagementWeight ?? 50,
                        followingRatio: data.followingRatio ?? 70,
                        contentTypes: data.contentTypes ?? defaultPreferences.contentTypes,
                    });
                }
            })
            .catch(() => {}); // Use defaults if API fails
    }, [isOpen]);

    const updatePref = (key: keyof FeedPreferences, value: number) => {
        setPrefs(p => ({ ...p, [key]: value }));
        setHasChanges(true);
    };

    const updateContentType = (type: string, value: number) => {
        setPrefs(p => ({
            ...p,
            contentTypes: { ...p.contentTypes, [type]: value },
        }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await apiFetch('/api/v1/users/preferences/feed', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(prefs),
            });
            onSave?.(prefs);
            setHasChanges(false);
            onClose();
        } catch {
            // Handle silently
        }
        setIsSaving(false);
    };

    const handleReset = () => {
        setPrefs(defaultPreferences);
        setHasChanges(true);
    };

    const Slider = ({ label, value, onChange, description }: {
        label: string; value: number; onChange: (v: number) => void; description: string;
    }) => (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">{label}</span>
                <span className="text-white/40 text-xs">{value}%</span>
            </div>
            <input
                type="range"
                min={0}
                max={100}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full accent-[#00D4FF] h-1.5"
                aria-label={`${label}: ${value}%`}
            />
            <p className="text-white/30 text-xs">{description}</p>
        </div>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="bg-[#12121A] border border-white/10 rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto"
                        initial={{ scale: 0.95, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.95, y: 20, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-white font-semibold text-lg">Feed Preferences</h3>
                                <p className="text-white/40 text-sm">Control what you see</p>
                            </div>
                            <button onClick={onClose} className="text-white/40 hover:text-white" aria-label="Close">
                                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <Slider
                                label="Recency"
                                value={prefs.recencyWeight}
                                onChange={(v) => updatePref('recencyWeight', v)}
                                description="Higher = more recent posts appear first"
                            />

                            <Slider
                                label="Engagement"
                                value={prefs.engagementWeight}
                                onChange={(v) => updatePref('engagementWeight', v)}
                                description="Higher = popular posts ranked higher"
                            />

                            <Slider
                                label="Following vs Discovery"
                                value={prefs.followingRatio}
                                onChange={(v) => updatePref('followingRatio', v)}
                                description={`${prefs.followingRatio}% from people you follow, ${100 - prefs.followingRatio}% discovery`}
                            />

                            <div>
                                <p className="text-white text-sm font-medium mb-3">Content Types</p>
                                <div className="space-y-3">
                                    {Object.entries(prefs.contentTypes).map(([type, weight]) => (
                                        <div key={type} className="flex items-center gap-3">
                                            <span className="text-white/60 text-sm w-16">{type}</span>
                                            <input
                                                type="range"
                                                min={0}
                                                max={100}
                                                value={weight * 100}
                                                onChange={(e) => updateContentType(type, Number(e.target.value) / 100)}
                                                className="flex-1 accent-[#00D4FF] h-1"
                                                aria-label={`${type} weight: ${Math.round(weight * 100)}%`}
                                            />
                                            <span className="text-white/40 text-xs w-8 text-right">{Math.round(weight * 100)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/10 flex gap-2">
                            <button
                                onClick={handleReset}
                                className="px-4 py-2.5 rounded-xl text-white/50 text-sm hover:text-white transition-colors"
                            >
                                Reset defaults
                            </button>
                            <div className="flex-1" />
                            <button
                                onClick={handleSave}
                                disabled={!hasChanges || isSaving}
                                className="px-6 py-2.5 rounded-xl bg-[#00D4FF] text-black text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
                            >
                                {isSaving ? 'Saving...' : 'Save Preferences'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
