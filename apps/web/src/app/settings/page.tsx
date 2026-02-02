'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { ProfileEditor, Avatar, useProfile } from '@/components/ProfileEditor';
import { loadPreferences, savePreferences, clearAllData, exportUserData } from '@/lib/persistence';
import { useAuth, ProtectedRoute } from '@/contexts/AuthContext';

// Navigation
function Navigation() {
    const navItems = [
        { id: 'home', icon: '🏠', label: 'Home', href: '/dashboard' },
        { id: 'explore', icon: '🔍', label: 'Explore', href: '/explore' },
        { id: 'journeys', icon: '🎬', label: 'Journeys', href: '/journeys' },
        { id: 'campfire', icon: '🔥', label: 'Live', href: '/campfire' },
        { id: 'messages', icon: '💬', label: 'Messages', href: '/messages' },
    ];

    return (
        <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 xl:w-64 bg-black/40 backdrop-blur-xl border-r border-white/5 flex-col p-4 z-40">
            <Link href="/" className="flex items-center gap-3 px-3 py-4 mb-6">
                <svg width="40" height="40" viewBox="0 0 40 40" className="flex-shrink-0">
                    <defs>
                        <linearGradient id="settings-nav-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#F59E0B" />
                            <stop offset="50%" stopColor="#F43F5E" />
                            <stop offset="100%" stopColor="#8B5CF6" />
                        </linearGradient>
                    </defs>
                    <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="url(#settings-nav-grad)" />
                    <text x="20" y="24" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">6</text>
                </svg>
                <span className="text-xl font-semibold bg-gradient-to-r from-amber-400 via-rose-400 to-violet-400 bg-clip-text text-transparent hidden xl:block">Six22</span>
            </Link>
            <nav className="flex-1 space-y-2">
                {navItems.map((item) => (
                    <Link key={item.id} href={item.href} className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-white/60 hover:bg-white/5 hover:text-white">
                        <span className="text-2xl">{item.icon}</span>
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
            className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-gradient-to-r from-orange-400 to-rose-500' : 'bg-white/20'}`}
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

// Setting sections
const settingSections: SettingSection[] = [
    {
        title: 'Account',
        icon: '👤',
        items: [
            { id: 'edit-profile', label: 'Edit Profile', type: 'link' },
            { id: 'change-password', label: 'Change Password', type: 'link' },
            { id: 'two-factor', label: 'Two-Factor Authentication', type: 'toggle' },
            { id: 'email', label: 'Email Notifications', type: 'toggle' },
        ]
    },
    {
        title: 'Privacy',
        icon: '🔒',
        items: [
            { id: 'private', label: 'Private Account', type: 'toggle' },
            { id: 'activity', label: 'Show Activity Status', type: 'toggle' },
            { id: 'read-receipts', label: 'Read Receipts', type: 'toggle' },
            { id: 'blocked', label: 'Blocked Accounts', type: 'link' },
        ]
    },
    {
        title: 'Notifications',
        icon: '🔔',
        items: [
            { id: 'push', label: 'Push Notifications', type: 'toggle' },
            { id: 'email-updates', label: 'Email Updates', type: 'toggle' },
            { id: 'sounds', label: 'Notification Sounds', type: 'toggle' },
            { id: 'vibration', label: 'Vibration', type: 'toggle' },
        ]
    },
    {
        title: 'Appearance',
        icon: '🎨',
        items: [
            { id: 'dark-mode', label: 'Dark Mode', type: 'toggle', defaultOn: true },
            { id: 'reduced-motion', label: 'Reduced Motion', type: 'toggle' },
            { id: 'high-contrast', label: 'High Contrast', type: 'toggle' },
        ]
    },
    {
        title: 'Support',
        icon: '💬',
        items: [
            { id: 'help', label: 'Help Center', type: 'link' },
            { id: 'report', label: 'Report a Problem', type: 'link' },
            { id: 'feedback', label: 'Send Feedback', type: 'link' },
        ]
    },
    {
        title: 'About',
        icon: 'ℹ️',
        items: [
            { id: 'terms', label: 'Terms of Service', type: 'link' },
            { id: 'privacy-policy', label: 'Privacy Policy', type: 'link' },
            { id: 'version', label: 'App Version', type: 'info', value: '2.0.0' },
        ]
    },
];

function SettingsPageContent() {
    const { profile, updateProfile } = useProfile();
    const { logout } = useAuth();
    const [showProfileEditor, setShowProfileEditor] = useState(false);
    const [toggles, setToggles] = useState<Record<string, boolean>>({
        'dark-mode': true,
        'push': true,
        'activity': true,
    });
    const [mounted, setMounted] = useState(false);

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
    }, []);

    const handleExportData = useCallback(() => {
        const data = exportUserData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'six22-data.json';
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
                                    <span>{section.icon}</span>
                                    <h2 className="font-semibold text-white">{section.title}</h2>
                                </div>
                                <div className="divide-y divide-white/5">
                                    {section.items.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
                                            <span className="text-white/80">{item.label}</span>
                                            {item.type === 'toggle' && (
                                                <Toggle
                                                    enabled={toggles[item.id] || false}
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
                        <button
                            onClick={handleExportData}
                            className="w-full py-3 rounded-xl bg-violet-500/10 text-violet-400 font-medium hover:bg-violet-500/20 transition-colors flex items-center justify-center gap-2"
                        >
                            📦 Export My Data
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
                onSave={updateProfile}
                currentProfile={profile || undefined}
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

