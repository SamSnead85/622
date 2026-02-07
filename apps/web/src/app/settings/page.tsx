'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { ProfileEditor, Avatar, useProfile } from '@/components/ProfileEditor';
import { loadPreferences, savePreferences, clearAllData, exportUserData } from '@/lib/persistence';
import { useAuth, ProtectedRoute, type User } from '@/contexts/AuthContext';
import { apiFetch, API_URL } from '@/lib/api';
import { isShieldConfigured, setupShield, removeShield } from '@/lib/stealth/engine';
import { InviteFriends } from '@/components/InviteFriends';
import { TwoFactorSetup } from '@/components/TwoFactorSetup';
import { NavigationSidebar } from '@/components/dashboard/NavigationSidebar';
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
import { PrivacyScore } from '@/components/security/PrivacyScore';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useRouter } from 'next/navigation';

// Navigation
// Local Navigation removed in favor of shared component

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

// Change Password Modal
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }

        setIsSubmitting(true);
        try {
            await apiFetch(`${API_URL}/api/v1/auth/change-password`, {
                method: 'POST',
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            setSuccess(true);
            setTimeout(() => onClose(), 1500);
        } catch (err: any) {
            setError(err?.message || 'Failed to change password.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#111] rounded-2xl border border-white/10 w-full max-w-md mx-4 overflow-hidden"
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <h3 className="font-semibold text-white">Change Password</h3>
                    <button
                        onClick={onClose}
                        className="text-white/50 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {success ? (
                        <div className="text-center py-4">
                            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                                <span className="text-green-400 text-xl">✓</span>
                            </div>
                            <p className="text-green-400 font-medium">Password changed successfully!</p>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm text-white/60 mb-1">Current Password</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30"
                                    placeholder="Enter current password"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-white/60 mb-1">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30"
                                    placeholder="At least 8 characters"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-white/60 mb-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30"
                                    placeholder="Confirm new password"
                                />
                            </div>
                            {error && (
                                <p className="text-red-400 text-sm">{error}</p>
                            )}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-black font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {isSubmitting ? 'Changing...' : 'Change Password'}
                            </button>
                        </>
                    )}
                </form>
            </motion.div>
        </div>
    );
}

function SettingsPageContent() {
    const { profile, updateProfile } = useProfile();
    const { user, logout, updateUser } = useAuth();
    const router = useRouter();
    const [showProfileEditor, setShowProfileEditor] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [show2FASetup, setShow2FASetup] = useState(false);
    const [showNotificationCenter, setShowNotificationCenter] = useState(false);
    const [showBlockedAccounts, setShowBlockedAccounts] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [toggles, setToggles] = useState<Record<string, boolean>>({
        'dark-mode': true,
        'push': true,
        'activity': true,
    });
    const [mounted, setMounted] = useState(false);

    // Travel Shield state
    const [shieldConfigured, setShieldConfigured] = useState(false);
    const [shieldExpanded, setShieldExpanded] = useState(false);
    const [shieldPassphrase, setShieldPassphrase] = useState('');
    const [shieldConfirm, setShieldConfirm] = useState('');
    const [shieldError, setShieldError] = useState('');
    const [shieldSuccess, setShieldSuccess] = useState(false);

    // Handler that syncs profile changes to both useProfile AND Auth Context
    const handleProfileSave = useCallback(async (updatedProfile: Parameters<typeof updateProfile>[0]) => {
        updateProfile(updatedProfile);

        // Build single update object for AuthContext
        const authUpdates: Partial<User> = {};

        if (updatedProfile.avatarType === 'custom' && updatedProfile.avatarCustomUrl) {
            authUpdates.avatarUrl = updatedProfile.avatarCustomUrl;
        } else if (updatedProfile.avatarPreset) {
            authUpdates.avatarUrl = `preset:${updatedProfile.avatarPreset}`;
        }

        if (updatedProfile.displayName) {
            authUpdates.displayName = updatedProfile.displayName;
        }

        if (updatedProfile.username) {
            authUpdates.username = updatedProfile.username;
        }

        if (updatedProfile.bio !== undefined) {
            authUpdates.bio = updatedProfile.bio;
        }

        // Single awaited call to ensure backend refetch happens
        await updateUser(authUpdates);
    }, [updateProfile, updateUser]);

    useEffect(() => {
        setMounted(true);
        setShieldConfigured(isShieldConfigured());
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

    const handleToggle = useCallback(async (id: string) => {
        // Special handling for 2FA toggle
        if (id === 'two-factor') {
            if (!twoFactorEnabled) {
                // Open 2FA setup modal
                setShow2FASetup(true);
            } else {
                // Show confirmation to disable 2FA
                const code = prompt('Enter your 2FA code to disable Two-Factor Authentication:');
                if (code) {
                    try {
                        await apiFetch(`${API_URL}/api/v1/auth/2fa/disable`, {
                            method: 'POST',
                            body: JSON.stringify({ code }),
                        });
                        setTwoFactorEnabled(false);
                    } catch (err: any) {
                        alert(err?.message || 'Failed to disable 2FA. Please check your code.');
                    }
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

    const handleLinkClick = useCallback((id: string) => {
        switch (id) {
            case 'edit-profile':
                setShowProfileEditor(true);
                break;
            case 'change-password':
                setShowChangePassword(true);
                break;
            case 'blocked':
                setShowBlockedAccounts(true);
                break;
            case 'help':
                window.location.href = 'mailto:support@0g.social?subject=Help Request';
                break;
            case 'report':
                window.location.href = 'mailto:support@0g.social?subject=Bug Report';
                break;
            case 'feedback':
                window.location.href = 'mailto:feedback@0g.social?subject=Feedback';
                break;
            case 'terms':
                router.push('/terms');
                break;
            case 'privacy-policy':
                router.push('/privacy');
                break;
            default:
                break;
        }
    }, [router]);

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

            <NavigationSidebar />


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

                    {/* Privacy & Security */}
                    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden mb-6">
                        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                            <ShieldIcon size={18} className="text-white/70" />
                            <h2 className="font-semibold text-white">Privacy &amp; Security</h2>
                        </div>
                        <div className="p-4 space-y-3">
                            <PrivacyScore compact />
                            <div className="divide-y divide-white/5">
                                <Link href="/transparency" className="flex items-center justify-between py-3 hover:bg-white/5 transition-colors rounded-lg px-2 -mx-2">
                                    <span className="text-white/80">What We Don&apos;t Track</span>
                                    <span className="text-white/30">→</span>
                                </Link>
                                <Link href="/settings/export" className="flex items-center justify-between py-3 hover:bg-white/5 transition-colors rounded-lg px-2 -mx-2">
                                    <span className="text-white/80">Export My Data</span>
                                    <span className="text-white/30">→</span>
                                </Link>
                            </div>

                            {/* ======== TRAVEL SHIELD ======== */}
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <button
                                    onClick={() => setShieldExpanded(!shieldExpanded)}
                                    className="w-full flex items-center justify-between py-2 group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center">
                                            <span className="text-sm">🛡</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-white font-medium text-sm">Travel Shield</p>
                                            <p className="text-white/40 text-xs">
                                                {shieldConfigured ? 'Configured — ready to activate' : 'Protect your privacy while traveling'}
                                            </p>
                                        </div>
                                    </div>
                                    <motion.span
                                        animate={{ rotate: shieldExpanded ? 90 : 0 }}
                                        className="text-white/30"
                                    >
                                        →
                                    </motion.span>
                                </button>

                                <AnimatePresence>
                                    {shieldExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pt-3 pb-2 space-y-3">
                                                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                                                    <p className="text-xs text-white/60 leading-relaxed">
                                                        Travel Shield instantly replaces your profile with a safe decoy when you need privacy
                                                        — at border crossings, security checkpoints, or anywhere your device might be inspected.
                                                        Your real content is encrypted and invisible until you enter your safe word.
                                                    </p>
                                                    <div className="mt-2 text-xs text-white/40 space-y-1">
                                                        <p><strong className="text-white/60">Activate:</strong> Triple-tap your avatar in the sidebar</p>
                                                        <p><strong className="text-white/60">Deactivate:</strong> Type your safe word in the search bar</p>
                                                    </div>
                                                </div>

                                                {shieldConfigured && !shieldSuccess ? (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 px-1">
                                                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                            <span className="text-sm text-emerald-400 font-medium">Shield is configured and ready</span>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                removeShield();
                                                                setShieldConfigured(false);
                                                                setShieldPassphrase('');
                                                                setShieldConfirm('');
                                                            }}
                                                            className="w-full py-2 rounded-lg text-red-400 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 transition-colors"
                                                        >
                                                            Remove Travel Shield
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {shieldSuccess ? (
                                                            <div className="text-center py-3">
                                                                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-2">
                                                                    <span className="text-emerald-400">✓</span>
                                                                </div>
                                                                <p className="text-emerald-400 text-sm font-medium">Travel Shield activated!</p>
                                                                <p className="text-white/40 text-xs mt-1">Triple-tap your avatar to engage</p>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div>
                                                                    <label className="block text-xs text-white/50 mb-1">Choose a safe word or passphrase</label>
                                                                    <input
                                                                        type="password"
                                                                        value={shieldPassphrase}
                                                                        onChange={(e) => { setShieldPassphrase(e.target.value); setShieldError(''); }}
                                                                        placeholder="Something only you would know"
                                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs text-white/50 mb-1">Confirm safe word</label>
                                                                    <input
                                                                        type="password"
                                                                        value={shieldConfirm}
                                                                        onChange={(e) => { setShieldConfirm(e.target.value); setShieldError(''); }}
                                                                        placeholder="Re-enter your safe word"
                                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                                                                    />
                                                                </div>
                                                                {shieldError && (
                                                                    <p className="text-red-400 text-xs">{shieldError}</p>
                                                                )}
                                                                <button
                                                                    onClick={async () => {
                                                                        if (shieldPassphrase.length < 4) {
                                                                            setShieldError('Safe word must be at least 4 characters');
                                                                            return;
                                                                        }
                                                                        if (shieldPassphrase !== shieldConfirm) {
                                                                            setShieldError('Safe words do not match');
                                                                            return;
                                                                        }
                                                                        const ok = await setupShield(shieldPassphrase);
                                                                        if (ok) {
                                                                            setShieldConfigured(true);
                                                                            setShieldSuccess(true);
                                                                            setShieldPassphrase('');
                                                                            setShieldConfirm('');
                                                                            setTimeout(() => setShieldSuccess(false), 3000);
                                                                        } else {
                                                                            setShieldError('Setup failed. Try again.');
                                                                        }
                                                                    }}
                                                                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                                                                >
                                                                    Enable Travel Shield
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Security Center Link */}
                            <Link
                                href="/security"
                                className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                        <span className="text-sm">🛡️</span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-white font-medium">Security Center</p>
                                        <p className="text-[10px] text-white/30">Safety guides, panic button, and feature status</p>
                                    </div>
                                </div>
                                <svg className="w-4 h-4 text-white/20 group-hover:text-white/40 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>
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
                                        <div
                                            key={item.id}
                                            className={`flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors ${item.type === 'link' ? 'cursor-pointer' : ''}`}
                                            onClick={item.type === 'link' ? () => handleLinkClick(item.id) : undefined}
                                            role={item.type === 'link' ? 'button' : undefined}
                                            tabIndex={item.type === 'link' ? 0 : undefined}
                                            onKeyDown={item.type === 'link' ? (e) => { if (e.key === 'Enter') handleLinkClick(item.id); } : undefined}
                                        >
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
                                {section.title === 'Notifications' && (
                                    <div className="px-4 py-3 border-t border-white/10">
                                        <button
                                            onClick={() => setShowNotificationCenter(true)}
                                            className="text-sm text-[#00D4FF] hover:text-[#00D4FF]/80 transition-colors font-medium"
                                        >
                                            Manage All Notification Preferences →
                                        </button>
                                    </div>
                                )}
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

                        {/* Growth Partner — only visible to tagged partners & admins */}
                        {(user?.isGrowthPartner || user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && (
                            <Link
                                href="/dashboard/growth-partner"
                                className="w-full py-3 rounded-xl bg-emerald-500/10 text-emerald-400 font-medium hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-2"
                            >
                                <span>💰</span>
                                <span>Growth Partner Program</span>
                            </Link>
                        )}

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

            {/* Notification Center Modal */}
            <NotificationCenter
                isOpen={showNotificationCenter}
                onClose={() => setShowNotificationCenter(false)}
            />

            {/* Change Password Modal */}
            {showChangePassword && (
                <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
            )}

            {/* Blocked Accounts Modal */}
            {showBlockedAccounts && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#111] rounded-2xl border border-white/10 w-full max-w-md mx-4 overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                            <h3 className="font-semibold text-white">Blocked Accounts</h3>
                            <button
                                onClick={() => setShowBlockedAccounts(false)}
                                className="text-white/50 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                                <ShieldIcon size={24} className="text-white/30" />
                            </div>
                            <p className="text-white/50 text-sm">No blocked accounts</p>
                            <p className="text-white/30 text-xs mt-1">Accounts you block will appear here</p>
                        </div>
                    </motion.div>
                </div>
            )}
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

