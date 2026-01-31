'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

// ============================================
// PRESET AVATARS - Clean, universal options
// ============================================
const PRESET_AVATARS = [
    // Gradients (no external dependencies)
    { id: 'gradient-1', type: 'gradient', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', label: 'Purple' },
    { id: 'gradient-2', type: 'gradient', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', label: 'Pink' },
    { id: 'gradient-3', type: 'gradient', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', label: 'Blue' },
    { id: 'gradient-4', type: 'gradient', value: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', label: 'Green' },
    { id: 'gradient-5', type: 'gradient', value: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', label: 'Sunset' },
    { id: 'gradient-6', type: 'gradient', value: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', label: 'Lavender' },
    { id: 'gradient-7', type: 'gradient', value: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', label: 'Rose' },
    { id: 'gradient-8', type: 'gradient', value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', label: 'Peach' },
    // Emoji avatars
    { id: 'emoji-1', type: 'emoji', value: '😊', label: 'Happy' },
    { id: 'emoji-2', type: 'emoji', value: '😎', label: 'Cool' },
    { id: 'emoji-3', type: 'emoji', value: '🌟', label: 'Star' },
    { id: 'emoji-4', type: 'emoji', value: '🦊', label: 'Fox' },
    { id: 'emoji-5', type: 'emoji', value: '🐱', label: 'Cat' },
    { id: 'emoji-6', type: 'emoji', value: '🌈', label: 'Rainbow' },
    { id: 'emoji-7', type: 'emoji', value: '🔥', label: 'Fire' },
    { id: 'emoji-8', type: 'emoji', value: '💜', label: 'Purple Heart' },
];

// ============================================
// TYPES
// ============================================
interface UserProfile {
    id: string;
    displayName: string;
    username: string;
    bio: string;
    avatarType: 'preset' | 'custom';
    avatarPreset?: string;
    avatarCustomUrl?: string;
    theme: 'dark' | 'light' | 'auto';
    notificationsEnabled: boolean;
    privateProfile: boolean;
}

interface ProfileEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (profile: UserProfile) => void;
    currentProfile?: UserProfile;
}

// ============================================
// LOCAL STORAGE HELPERS
// ============================================
const STORAGE_KEY = 'caravan_user_profile';

export function saveProfileToStorage(profile: UserProfile): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    }
}

export function loadProfileFromStorage(): UserProfile | null {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored) as UserProfile;
            } catch {
                return null;
            }
        }
    }
    return null;
}

// ============================================
// AVATAR DISPLAY COMPONENT
// ============================================
export function Avatar({
    profile,
    size = 48,
    className = '',
}: {
    profile?: UserProfile | null;
    size?: number;
    className?: string;
}) {
    const preset = PRESET_AVATARS.find(p => p.id === profile?.avatarPreset);

    // Custom photo
    if (profile?.avatarType === 'custom' && profile.avatarCustomUrl) {
        return (
            <div
                className={`relative rounded-full overflow-hidden ${className}`}
                style={{ width: size, height: size }}
            >
                <Image
                    src={profile.avatarCustomUrl}
                    alt={profile.displayName || 'Avatar'}
                    fill
                    className="object-cover"
                />
            </div>
        );
    }

    // Preset gradient
    if (preset?.type === 'gradient') {
        const initials = profile?.displayName
            ? profile.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            : '?';
        return (
            <div
                className={`flex items-center justify-center rounded-full text-white font-bold ${className}`}
                style={{
                    width: size,
                    height: size,
                    background: preset.value,
                    fontSize: size * 0.4,
                }}
            >
                {initials}
            </div>
        );
    }

    // Preset emoji
    if (preset?.type === 'emoji') {
        return (
            <div
                className={`flex items-center justify-center rounded-full bg-white/10 ${className}`}
                style={{ width: size, height: size, fontSize: size * 0.5 }}
            >
                {preset.value}
            </div>
        );
    }

    // Default fallback
    return (
        <div
            className={`flex items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white font-bold ${className}`}
            style={{ width: size, height: size, fontSize: size * 0.4 }}
        >
            {profile?.displayName?.[0]?.toUpperCase() || '?'}
        </div>
    );
}

// ============================================
// PROFILE EDITOR COMPONENT
// ============================================
export function ProfileEditor({ isOpen, onClose, onSave, currentProfile }: ProfileEditorProps) {
    const [profile, setProfile] = useState<UserProfile>(() => currentProfile || {
        id: '',
        displayName: '',
        username: '',
        bio: '',
        avatarType: 'preset',
        avatarPreset: 'gradient-1',
        theme: 'dark',
        notificationsEnabled: true,
        privateProfile: false,
    });
    const [avatarTab, setAvatarTab] = useState<'presets' | 'upload'>('presets');
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (currentProfile) {
            setProfile(currentProfile);
        }
    }, [currentProfile]);

    const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setProfile(p => ({
                ...p,
                avatarType: 'custom',
                avatarCustomUrl: url,
            }));
        }
    }, []);

    const handleSave = async () => {
        setSaving(true);
        // Save to local storage
        saveProfileToStorage(profile);
        // Simulate API save
        await new Promise(r => setTimeout(r, 500));
        onSave(profile);
        setSaving(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <motion.div
                className="relative w-full max-w-lg max-h-[90vh] bg-[#0a0a0f] rounded-3xl border border-white/10 overflow-hidden flex flex-col"
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white">Edit Profile</h2>
                    <button onClick={onClose} className="text-white/50 hover:text-white text-2xl">×</button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Avatar Section */}
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-3">Avatar</label>

                        {/* Current Avatar Preview */}
                        <div className="flex items-center gap-4 mb-4">
                            <Avatar profile={profile} size={80} />
                            <div>
                                <p className="text-white font-medium">{profile.displayName || 'Your Name'}</p>
                                <p className="text-white/50 text-sm">@{profile.username || 'username'}</p>
                            </div>
                        </div>

                        {/* Avatar Tabs */}
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setAvatarTab('presets')}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${avatarTab === 'presets' ? 'bg-white text-black' : 'bg-white/10 text-white/70'
                                    }`}
                            >
                                Presets
                            </button>
                            <button
                                onClick={() => setAvatarTab('upload')}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${avatarTab === 'upload' ? 'bg-white text-black' : 'bg-white/10 text-white/70'
                                    }`}
                            >
                                Upload Photo
                            </button>
                        </div>

                        {/* Presets Grid */}
                        {avatarTab === 'presets' && (
                            <div className="grid grid-cols-8 gap-2">
                                {PRESET_AVATARS.map(preset => (
                                    <button
                                        key={preset.id}
                                        onClick={() => setProfile(p => ({
                                            ...p,
                                            avatarType: 'preset',
                                            avatarPreset: preset.id,
                                        }))}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${profile.avatarPreset === preset.id
                                            ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-[#0a0a0f]'
                                            : 'hover:scale-110'
                                            }`}
                                        style={preset.type === 'gradient' ? { background: preset.value } : undefined}
                                        title={preset.label}
                                    >
                                        {preset.type === 'emoji' && (
                                            <span className="text-xl">{preset.value}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Upload Photo */}
                        {avatarTab === 'upload' && (
                            <div>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-4 rounded-2xl border-2 border-dashed border-white/20 text-white/60 hover:border-white/40 hover:text-white/80 transition-colors"
                                >
                                    📷 Choose Photo
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoUpload}
                                    className="hidden"
                                />
                                <p className="text-xs text-white/40 mt-2 text-center">
                                    JPG, PNG up to 5MB
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Profile Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-2">Display Name</label>
                            <input
                                type="text"
                                value={profile.displayName}
                                onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))}
                                placeholder="Your name"
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-2">Username</label>
                            <input
                                type="text"
                                value={profile.username}
                                onChange={e => setProfile(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                                placeholder="username"
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-2">Bio</label>
                            <textarea
                                value={profile.bio}
                                onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                                placeholder="Tell people about yourself..."
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500 resize-none"
                            />
                        </div>
                    </div>

                    {/* Settings */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-white/70">Settings</h3>

                        <label className="flex items-center justify-between p-4 rounded-xl bg-white/5 cursor-pointer">
                            <span className="text-white">Push Notifications</span>
                            <div
                                onClick={() => setProfile(p => ({ ...p, notificationsEnabled: !p.notificationsEnabled }))}
                                className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer ${profile.notificationsEnabled ? 'bg-violet-500' : 'bg-white/20'
                                    }`}
                            >
                                <div
                                    className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${profile.notificationsEnabled ? 'left-6' : 'left-1'
                                        }`}
                                />
                            </div>
                        </label>

                        <label className="flex items-center justify-between p-4 rounded-xl bg-white/5 cursor-pointer">
                            <span className="text-white">Private Profile</span>
                            <div
                                onClick={() => setProfile(p => ({ ...p, privateProfile: !p.privateProfile }))}
                                className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer ${profile.privateProfile ? 'bg-violet-500' : 'bg-white/20'
                                    }`}
                            >
                                <div
                                    className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${profile.privateProfile ? 'left-6' : 'left-1'
                                        }`}
                                />
                            </div>
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/10 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/15 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium disabled:opacity-50 transition-all"
                    >
                        {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================
// PROFILE PROVIDER HOOK
// ============================================
export function useProfile() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load from local storage on mount
        const stored = loadProfileFromStorage();
        if (stored) {
            setProfile(stored);
        }
        setLoading(false);
    }, []);

    const updateProfile = useCallback((updates: Partial<UserProfile>) => {
        setProfile(prev => {
            const newProfile: UserProfile = {
                id: prev?.id || `user-${Date.now()}`,
                displayName: prev?.displayName || '',
                username: prev?.username || '',
                bio: prev?.bio || '',
                avatarType: prev?.avatarType || 'preset',
                avatarPreset: prev?.avatarPreset || 'gradient-1',
                theme: prev?.theme || 'dark',
                notificationsEnabled: prev?.notificationsEnabled ?? true,
                privateProfile: prev?.privateProfile ?? false,
                ...updates,
            };
            saveProfileToStorage(newProfile);
            return newProfile;
        });
    }, []);

    return { profile, loading, updateProfile };
}

export default ProfileEditor;
