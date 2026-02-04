'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { ProfileEditor, Avatar, useProfile } from '@/components/ProfileEditor';
import { loadPreferences, savePreferences, clearAllData, exportUserData } from '@/lib/persistence';
import { useAuth, ProtectedRoute } from '@/contexts/AuthContext';
import { InviteFriends } from '@/components/InviteFriends';
import { TwoFactorSetup } from '@/components/TwoFactorSetup';
import {
    HomeIcon,
    SearchIcon,
    UsersIcon,
    SendIcon,
    MessageIcon,
    UserIcon,
    LockIcon,
    BellIcon,
    PaletteIcon,
    InfoIcon,
    ZapIcon,
    DownloadIcon,
    ShieldIcon
} from '@/components/icons';

// Navigation
function Navigation() {
    const navItems = [
        { id: 'home', Icon: HomeIcon, label: 'Home', href: '/dashboard' },
        { id: 'explore', Icon: SearchIcon, label: 'Explore', href: '/explore' },
        { id: 'communities', Icon: UsersIcon, label: 'Tribes', href: '/communities' },
        { id: 'invite', Icon: SendIcon, label: 'Invite', href: '/invite' },
        { id: 'messages', Icon: MessageIcon, label: 'Messages', href: '/messages' },
    ];

    return (
        <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 xl:w-64 bg-black/40 backdrop-blur-xl border-r border-white/5 flex-col p-4 z-40">
            <Link href="/" className="flex items-center gap-3 px-3 py-4 mb-6">
                {/* 0G Logo */}
                <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold flex-shrink-0">
                        <span className="text-[#00D4FF]">0</span>
                        <span className="text-white">G</span>
                    </div>
                    <span className="text-lg font-medium text-white/70 hidden xl:block">Zero Gravity</span>
                </div>
            </Link>
            <nav className="flex-1 space-y-2">
                {navItems.map((item) => (
                    <Link key={item.id} href={item.href} className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-white/60 hover:bg-white/5 hover:text-white">
                        <item.Icon size={24} />
                        <span className="font-medium hidden xl:block">{item.label}</span>
                    </Link>
                ))}
            </nav>
        </aside>
    );
}

// Toggle Switch
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
    return (
        <button
            onClick={onChange}
            className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6]' : 'bg-white/20'}`}
        >
            <motion.div
                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                animate={{ left: enabled ? 28 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
        </button>
    );
}

// Setting item types
type SettingItem = {
    id: string;
    label: string;
    type: 'link' | 'toggle' | 'info';
    value?: string;
    defaultOn?: boolean;
};

type SettingSection = {
    title: string;
    icon: string;
    items: SettingItem[];
};

// Setting sections with Icon components
const settingSections = [
    {
        title: 'Account',
        Icon: UserIcon,
        items: [
            { id: 'edit-profile', label: 'Edit Profile', type: 'link' as const },
            { id: 'change-password', label: 'Change Password', type: 'link' as const },
            { id: 'two-factor', label: 'Two-Factor Authentication', type: 'toggle' as const },
            { id: 'email', label: 'Email Notifications', type: 'toggle' as const },
        ]
    },
    {
        title: 'Privacy',
        Icon: LockIcon,
        items: [
            { id: 'private', label: 'Private Account', type: 'toggle' as const },
            { id: 'activity', label: 'Show Activity Status', type: 'toggle' as const },
            { id: 'read-receipts', label: 'Read Receipts', type: 'toggle' as const },
            { id: 'blocked', label: 'Blocked Accounts', type: 'link' as const },
        ]
    },
    {
        title: 'Notifications',
        Icon: BellIcon,
        items: [
            { id: 'push', label: 'Push Notifications', type: 'toggle' as const },
            { id: 'email-updates', label: 'Email Updates', type: 'toggle' as const },
            { id: 'sounds', label: 'Notification Sounds', type: 'toggle' as const },
            { id: 'vibration', label: 'Vibration', type: 'toggle' as const },
        ]
    },
    {
        title: 'Appearance',
        Icon: PaletteIcon,
        items: [
            { id: 'dark-mode', label: 'Dark Mode', type: 'toggle' as const, defaultOn: true },
            { id: 'reduced-motion', label: 'Reduced Motion', type: 'toggle' as const },
            { id: 'high-contrast', label: 'High Contrast', type: 'toggle' as const },
        ]
    },
    {
        title: 'Support',
        Icon: MessageIcon,
        items: [
            { id: 'help', label: 'Help Center', type: 'link' as const },
            { id: 'report', label: 'Report a Problem', type: 'link' as const },
            { id: 'feedback', label: 'Send Feedback', type: 'link' as const },
        ]
    },
    {
        title: 'About',
        Icon: InfoIcon,
        items: [
            { id: 'terms', label: 'Terms of Service', type: 'link' as const },
            { id: 'privacy-policy', label: 'Privacy Policy', type: 'link' as const },
            { id: 'version', label: 'App Version', type: 'info' as const, value: '2.0.0' },
        ]
    },
];

function SettingsPageContent() {
    const { profile, updateProfile } = useProfile();
    const { logout, updateUser } = useAuth();
    const [showProfileEditor, setShowProfileEditor] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [show2FASetup, setShow2FASetup] = useState(false);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [toggles, setToggles] = useState<Record<string, boolean>>({
        'dark-mode': true,
        'push': true,
        'activity': true,
    });
    const [mounted, setMounted] = useState(false);

    // Handler that syncs profile changes to both useProfile AND AuthContext
    const handleProfileSave = useCallback((updatedProfile: Parameters<typeof updateProfile>[0]) => {
        updateProfile(updatedProfile);
        // Also update AuthContext so all components (sidebar, dashboard, etc.) get the new avatar
        if (updatedProfile.avatarType === 'custom' && updatedProfile.avatarCustomUrl) {
            updateUser({ avatarUrl: updatedProfile.avatarCustomUrl });
        } else if (updatedProfile.avatarPreset) {
            // For presets, store as special format
            updateUser({ avatarUrl: `preset:${updatedProfile.avatarPreset}` });
        }
        if (updatedProfile.displayName) {
            updateUser({ displayName: updatedProfile.displayName });
        }
        if (updatedProfile.bio !== undefined) {
            updateUser({ bio: updatedProfile.bio });
        }
    }, [updateProfile, updateUser]);

    useEffect(() => {
        setMounted(true);
        // Load saved preferences
        const prefs = loadPreferences();
        setToggles(prev => ({
            ...prev,
            'dark-mode': prefs.theme === 'dark',
            'push': prefs.soundEffects,
            'activity': prefs.showOnlineStatus,
            'read-receipts': prefs.readReceipts,
            'reduced-motion': prefs.reducedMotion,
        }));
    }, []);

    const handleToggle = useCallback((id: string) => {
        // Special handling for 2FA toggle
        if (id === 'two-factor') {
            if (!twoFactorEnabled) {
                // Open 2FA setup modal
                setShow2FASetup(true);
            } else {
                // Show confirmation to disable 2FA
                if (confirm('Are you sure you want to disable Two-Factor Authentication?')) {
                    // TODO: Call API to disable 2FA
                    setTwoFactorEnabled(false);
                }
            }
            return;
        }

        setToggles(prev => {
            const updated = { ...prev, [id]: !prev[id] };
            // Save to persistence
            savePreferences({
                theme: updated['dark-mode'] ? 'dark' : 'light',
                showOnlineStatus: updated['activity'],
                readReceipts: updated['read-receipts'],
                soundEffects: updated['push'],
                reducedMotion: updated['reduced-motion'],
            });
            return updated;
        });
    }, [twoFactorEnabled]);

    const handle2FAComplete = useCallback(() => {
        setTwoFactorEnabled(true);
        setShow2FASetup(false);
    }, []);

    const handleExportData = useCallback(() => {
        const data = exportUserData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '0g-data.json';
        a.click();
    }, []);

    const handleClearData = useCallback(() => {
        if (confirm('Are you sure? This will clear all your saved preferences and drafts.')) {
            clearAllData();
            window.location.reload();
        }
    }, []);

    const handleLogout = useCallback(async () => {
        await logout();
    }, [logout]);

    if (!mounted) return <div className="min-h-screen bg-[#050508]" />;

    return (
        <div className="min-h-screen bg-[#050508] relative">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-violet-500/5 blur-[100px]" />
            </div>

            <Navigation />


            <main className="relative z-10 lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
                {/* Header */}
                <header className="sticky top-0 z-30 px-4 lg:px-6 py-4 bg-black/60 backdrop-blur-xl border-b border-white/5">
                    <div className="max-w-2xl mx-auto flex items-center gap-4">
                        <Link href="/profile" className="text-white/60 hover:text-white transition-colors">
                            ← Back
                        </Link>
                        <h1 className="text-xl font-bold text-white">Settings</h1>
                    </div>
                </header>

                {/* Profile Quick Edit */}
                <div className="max-w-2xl mx-auto px-4 lg:px-6 py-6">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 mb-6">
                        <Avatar profile={profile} size={64} />
                        <div className="flex-1">
                            <p className="font-semibold text-white">{profile?.displayName || 'Set up your profile'}</p>
                            <p className="text-sm text-white/50">@{profile?.username || 'username'}</p>
                        </div>
                        <button
                            onClick={() => setShowProfileEditor(true)}
                            className="px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors"
                        >
                            Edit
                        </button>
                    </div>

                    {/* Settings Sections */}
                    <div className="space-y-6">
                        {settingSections.map((section, sectionIndex) => (
                            <motion.div
                                key={section.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: sectionIndex * 0.05 }}
                                className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
                            >
                                <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                                    <section.Icon size={18} className="text-white/70" />
                                    <h2 className="font-semibold text-white">{section.title}</h2>
                                </div>
                                <div className="divide-y divide-white/5">
                                    {section.items.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
                                            <span className="text-white/80">{item.label}</span>
                                            {item.type === 'toggle' && (
                                                <Toggle
                                                    enabled={item.id === 'two-factor' ? twoFactorEnabled : (toggles[item.id] || false)}
                                                    onChange={() => handleToggle(item.id)}
                                                />
                                            )}
                                            {item.type === 'link' && (
                                                <span className="text-white/30">→</span>
                                            )}
                                            {item.type === 'info' && (
                                                <span className="text-white/50">{item.value}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Logout & Danger Zone */}
                    <div className="mt-8 space-y-4">
                        {/* Invite Friends - Prominent CTA */}
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-black font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-3 shadow-lg"
                        >
                            <ZapIcon size={20} />
                            <span>Invite Friends to 0G</span>
                        </button>

                        <button
                            onClick={handleExportData}
                            className="w-full py-3 rounded-xl bg-violet-500/10 text-violet-400 font-medium hover:bg-violet-500/20 transition-colors flex items-center justify-center gap-2"
                        >
                            <DownloadIcon size={18} />
                            <span>Export My Data</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/15 transition-colors"
                        >
                            Log Out
                        </button>
                        <button
                            onClick={handleClearData}
                            className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 font-medium hover:bg-red-500/20 transition-colors"
                        >
                            Clear All Local Data
                        </button>
                    </div>
                </div>
            </main>

            {/* Profile Editor Modal */}
            <ProfileEditor
                isOpen={showProfileEditor}
                onClose={() => setShowProfileEditor(false)}
                onSave={handleProfileSave}
                currentProfile={profile || undefined}
            />

            {/* Invite Friends Modal */}
            <InviteFriends
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
            />

            {/* 2FA Setup Modal */}
            <TwoFactorSetup
                isOpen={show2FASetup}
                onClose={() => setShow2FASetup(false)}
                onComplete={handle2FAComplete}
            />
        </div>
    );
}

// Wrap with ProtectedRoute for authentication requirement
export default function SettingsPage() {
    return (
        <ProtectedRoute>
            <SettingsPageContent />
        </ProtectedRoute>
    );
}

