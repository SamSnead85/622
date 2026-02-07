'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch, API_URL } from '@/lib/api';

// ============================================
// TYPES
// ============================================
interface Member {
    id: string;
    userId: string;
    role: 'ADMIN' | 'MODERATOR' | 'MEMBER';
    isMuted: boolean;
    isBanned: boolean;
    joinedAt: string;
    user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
        isVerified?: boolean;
    };
}

interface CommunitySettings {
    id: string;
    name: string;
    slug: string;
    description: string;
    avatarUrl?: string;
    coverUrl?: string;
    isPublic: boolean;
    memberCount: number;
    postCount: number;
    brandColor?: string;
    tagline?: string;
    logoUrl?: string;
    category?: string;
    websiteUrl?: string;
    approvalRequired: boolean;
    postingPermission: string;
    invitePermission: string;
    isAnnouncementOnly: boolean;
    welcomeMessage?: string;
    creatorId: string;
    createdAt: string;
}

type SettingsTab = 'general' | 'members' | 'permissions' | 'invites' | 'appearance' | 'danger';

// ============================================
// TOGGLE COMPONENT
// ============================================
function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    return (
        <button
            onClick={() => !disabled && onChange(!enabled)}
            className={`w-12 h-7 rounded-full transition-all relative flex-shrink-0 ${
                enabled ? 'bg-emerald-500' : 'bg-white/20'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform shadow-md ${
                enabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
        </button>
    );
}

// ============================================
// ROLE BADGE
// ============================================
function RoleBadge({ role, isMuted, isBanned }: { role: string; isMuted?: boolean; isBanned?: boolean }) {
    if (isBanned) return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/20">Banned</span>;
    if (isMuted) return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/20">Muted</span>;

    const styles: Record<string, string> = {
        ADMIN: 'bg-violet-500/20 text-violet-400 border-violet-500/20',
        MODERATOR: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/20',
        MEMBER: 'bg-white/10 text-white/60 border-white/10',
    };

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[role] || styles.MEMBER}`}>
            {role.charAt(0) + role.slice(1).toLowerCase()}
        </span>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function CommunityAdminSettings() {
    const router = useRouter();
    const params = useParams();
    const { user } = useAuth();
    const communityId = params.id as string;

    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [settings, setSettings] = useState<CommunitySettings | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [memberSearch, setMemberSearch] = useState('');
    const [memberFilter, setMemberFilter] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [actionMemberId, setActionMemberId] = useState<string | null>(null);
    const [inviteCopied, setInviteCopied] = useState(false);
    const [waImportText, setWaImportText] = useState('');
    const [waImporting, setWaImporting] = useState(false);
    const [waImportResult, setWaImportResult] = useState<string | null>(null);

    // ============================================
    // FETCH DATA
    // ============================================
    const fetchCommunity = useCallback(async () => {
        try {
            const data = await apiFetch(`${API_URL}/api/v1/communities/${communityId}`);
            const c = data.community || data;
            setSettings({
                id: c.id,
                name: c.name || '',
                slug: c.slug || '',
                description: c.description || '',
                avatarUrl: c.avatarUrl,
                coverUrl: c.coverUrl || c.coverImageUrl,
                isPublic: c.isPublic ?? true,
                memberCount: c.membersCount ?? c.memberCount ?? 0,
                postCount: c.postsCount ?? c.postCount ?? 0,
                brandColor: c.brandColor || '#00D4FF',
                tagline: c.tagline || '',
                logoUrl: c.logoUrl,
                category: c.category || '',
                websiteUrl: c.websiteUrl || '',
                approvalRequired: c.approvalRequired ?? false,
                postingPermission: c.postingPermission || 'all',
                invitePermission: c.invitePermission || 'all',
                isAnnouncementOnly: c.isAnnouncementOnly ?? false,
                welcomeMessage: c.welcomeMessage || '',
                creatorId: c.creatorId,
                createdAt: c.createdAt,
            });
        } catch (err) {
            console.error('Failed to fetch community:', err);
        }
    }, [communityId]);

    const fetchMembers = useCallback(async () => {
        try {
            const data = await apiFetch(`${API_URL}/api/v1/communities/${communityId}/members`);
            setMembers(data.members || []);
        } catch (err) {
            console.error('Failed to fetch members:', err);
        }
    }, [communityId]);

    useEffect(() => {
        async function load() {
            setIsLoading(true);
            await Promise.all([fetchCommunity(), fetchMembers()]);
            setIsLoading(false);
        }
        load();
    }, [fetchCommunity, fetchMembers]);

    // ============================================
    // SAVE SETTINGS
    // ============================================
    const handleSave = async () => {
        if (!settings) return;
        setIsSaving(true);
        setSaveMessage('');
        try {
            await apiFetch(`${API_URL}/api/v1/communities/${communityId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: settings.name,
                    description: settings.description,
                    isPublic: settings.isPublic,
                    brandColor: settings.brandColor,
                    tagline: settings.tagline,
                    logoUrl: settings.logoUrl,
                    category: settings.category,
                    websiteUrl: settings.websiteUrl,
                    approvalRequired: settings.approvalRequired,
                    postingPermission: settings.postingPermission,
                    invitePermission: settings.invitePermission,
                    isAnnouncementOnly: settings.isAnnouncementOnly,
                    welcomeMessage: settings.welcomeMessage,
                }),
            });
            setSaveMessage('Settings saved successfully');
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (err) {
            console.error('Failed to save:', err);
            setSaveMessage('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    // ============================================
    // MEMBER ACTIONS (all call real APIs)
    // ============================================
    const updateMemberRole = async (userId: string, role: 'ADMIN' | 'MODERATOR' | 'MEMBER') => {
        try {
            await apiFetch(`${API_URL}/api/v1/communities/${communityId}/members/${userId}`, {
                method: 'PUT',
                body: JSON.stringify({ role }),
            });
            setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role } : m));
            setActionMemberId(null);
        } catch (err: any) {
            alert(err?.message || 'Failed to update role');
        }
    };

    const toggleMuteMember = async (userId: string, isMuted: boolean) => {
        try {
            await apiFetch(`${API_URL}/api/v1/communities/${communityId}/members/${userId}`, {
                method: 'PUT',
                body: JSON.stringify({ isMuted }),
            });
            setMembers(prev => prev.map(m => m.userId === userId ? { ...m, isMuted } : m));
            setActionMemberId(null);
        } catch (err: any) {
            alert(err?.message || 'Failed to update member');
        }
    };

    const toggleBanMember = async (userId: string, isBanned: boolean) => {
        try {
            await apiFetch(`${API_URL}/api/v1/communities/${communityId}/members/${userId}`, {
                method: 'PUT',
                body: JSON.stringify({ isBanned }),
            });
            setMembers(prev => prev.map(m => m.userId === userId ? { ...m, isBanned } : m));
            setActionMemberId(null);
        } catch (err: any) {
            alert(err?.message || 'Failed to update member');
        }
    };

    const removeMember = async (userId: string) => {
        if (!confirm('Are you sure you want to remove this member?')) return;
        try {
            await apiFetch(`${API_URL}/api/v1/communities/${communityId}/members/${userId}`, {
                method: 'DELETE',
            });
            setMembers(prev => prev.filter(m => m.userId !== userId));
            setActionMemberId(null);
        } catch (err: any) {
            alert(err?.message || 'Failed to remove member');
        }
    };

    const deleteCommunity = async () => {
        try {
            await apiFetch(`${API_URL}/api/v1/communities/${communityId}`, {
                method: 'DELETE',
            });
            router.push('/communities');
        } catch (err: any) {
            alert(err?.message || 'Failed to delete community');
        }
    };

    // ============================================
    // INVITE LINK
    // ============================================
    const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : 'https://0g.social'}/communities/${communityId}/join`;

    const copyInviteLink = () => {
        navigator.clipboard.writeText(inviteLink);
        setInviteCopied(true);
        setTimeout(() => setInviteCopied(false), 2000);
    };

    // ============================================
    // FILTERED MEMBERS
    // ============================================
    const filteredMembers = members.filter(m => {
        const matchesSearch = !memberSearch ||
            m.user.displayName?.toLowerCase().includes(memberSearch.toLowerCase()) ||
            m.user.username.toLowerCase().includes(memberSearch.toLowerCase());
        const matchesFilter = memberFilter === 'all' ||
            (memberFilter === 'muted' && m.isMuted) ||
            (memberFilter === 'banned' && m.isBanned) ||
            (memberFilter !== 'muted' && memberFilter !== 'banned' && m.role === memberFilter.toUpperCase());
        return matchesSearch && matchesFilter;
    });

    const adminCount = members.filter(m => m.role === 'ADMIN').length;
    const modCount = members.filter(m => m.role === 'MODERATOR').length;
    const memberCount = members.filter(m => m.role === 'MEMBER').length;

    // ============================================
    // TAB CONFIG
    // ============================================
    const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
        {
            id: 'general', label: 'General',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
        },
        {
            id: 'members', label: 'Members',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
        },
        {
            id: 'permissions', label: 'Permissions',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
        },
        {
            id: 'invites', label: 'Invites',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
        },
        {
            id: 'appearance', label: 'Appearance',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>,
        },
        {
            id: 'danger', label: 'Danger Zone',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
        },
    ];

    // ============================================
    // RENDER
    // ============================================
    if (isLoading || !settings) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0A1628] via-black to-black" />
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
                    <Link
                        href={`/communities/${communityId}`}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Link>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-semibold text-lg truncate">{settings.name}</h1>
                        <p className="text-sm text-white/50">Group Administration</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {saveMessage && (
                            <motion.span
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`text-sm ${saveMessage.includes('Failed') ? 'text-red-400' : 'text-emerald-400'}`}
                            >
                                {saveMessage}
                            </motion.span>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-5 py-2.5 bg-white text-black font-medium rounded-xl hover:bg-white/90 transition-all disabled:opacity-50 flex items-center gap-2 text-sm"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Tabs */}
                    <nav className="lg:w-60 flex-shrink-0">
                        <div className="lg:sticky lg:top-24">
                            {/* Stats Card */}
                            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 mb-4">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <div className="text-lg font-bold">{settings.memberCount}</div>
                                        <div className="text-xs text-white/40">Members</div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold">{settings.postCount}</div>
                                        <div className="text-xs text-white/40">Posts</div>
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold">{adminCount + modCount}</div>
                                        <div className="text-xs text-white/40">Staff</div>
                                    </div>
                                </div>
                            </div>

                            {/* Tab Buttons */}
                            <div className="space-y-1">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all text-sm ${
                                            activeTab === tab.id
                                                ? 'bg-white/10 text-white font-medium'
                                                : tab.id === 'danger'
                                                    ? 'text-red-400/60 hover:bg-red-500/10 hover:text-red-400'
                                                    : 'text-white/50 hover:bg-white/5 hover:text-white'
                                        }`}
                                    >
                                        <span className="opacity-70">{tab.icon}</span>
                                        <span>{tab.label}</span>
                                        {tab.id === 'members' && <span className="ml-auto text-xs text-white/30">{members.length}</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </nav>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <AnimatePresence mode="wait">
                            {/* ============================== GENERAL ============================== */}
                            {activeTab === 'general' && (
                                <motion.div key="general" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                                    <h2 className="text-xl font-semibold">General Settings</h2>

                                    {/* Cover */}
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-3">Cover Image</label>
                                        <div className="relative aspect-[3/1] rounded-2xl overflow-hidden border border-white/10 group">
                                            {settings.coverUrl ? (
                                                <img src={settings.coverUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-[#00D4FF]/20 to-[#8B5CF6]/20 flex items-center justify-center">
                                                    <span className="text-white/20 text-sm">No cover image</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button className="px-4 py-2 bg-white text-black rounded-lg font-medium text-sm">Change Cover</button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-2">Group Name</label>
                                        <input
                                            type="text"
                                            value={settings.name}
                                            onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors"
                                        />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-2">Description</label>
                                        <textarea
                                            value={settings.description}
                                            onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                                            rows={4}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 resize-none transition-colors"
                                            placeholder="Tell people what this group is about..."
                                        />
                                        <p className="text-xs text-white/30 mt-1">{settings.description.length}/500 characters</p>
                                    </div>

                                    {/* Tagline */}
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-2">Tagline</label>
                                        <input
                                            type="text"
                                            value={settings.tagline || ''}
                                            onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                                            placeholder="e.g. The Smith Family Circle"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors"
                                        />
                                        <p className="text-xs text-white/30 mt-1">Displayed on invite pages</p>
                                    </div>

                                    {/* Website */}
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-2">Website</label>
                                        <input
                                            type="url"
                                            value={settings.websiteUrl || ''}
                                            onChange={(e) => setSettings({ ...settings, websiteUrl: e.target.value })}
                                            placeholder="https://your-organization.com"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors"
                                        />
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-2">Category</label>
                                        <select
                                            value={settings.category || ''}
                                            onChange={(e) => setSettings({ ...settings, category: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors appearance-none"
                                        >
                                            <option value="" className="bg-[#1a1a1a]">Select category</option>
                                            <option value="family" className="bg-[#1a1a1a]">Family</option>
                                            <option value="friends" className="bg-[#1a1a1a]">Friends</option>
                                            <option value="business" className="bg-[#1a1a1a]">Business / Organization</option>
                                            <option value="faith" className="bg-[#1a1a1a]">Faith Community</option>
                                            <option value="hobby" className="bg-[#1a1a1a]">Hobby / Interest</option>
                                            <option value="education" className="bg-[#1a1a1a]">Education / School</option>
                                            <option value="local" className="bg-[#1a1a1a]">Local / Neighborhood</option>
                                        </select>
                                    </div>

                                    {/* Privacy */}
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-3">Privacy</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { value: true, icon: 'public', label: 'Public', desc: 'Anyone can find and join' },
                                                { value: false, icon: 'private', label: 'Private', desc: 'Invite only, hidden from search' },
                                            ].map(opt => (
                                                <button
                                                    key={String(opt.value)}
                                                    onClick={() => setSettings({ ...settings, isPublic: opt.value })}
                                                    className={`p-4 rounded-xl border text-left transition-all ${
                                                        settings.isPublic === opt.value
                                                            ? 'border-white/30 bg-white/10'
                                                            : 'border-white/10 hover:border-white/20'
                                                    }`}
                                                >
                                                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center mb-2 text-white/60">
                                                        {opt.icon === 'public' ? (
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                                                        ) : (
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                                                        )}
                                                    </div>
                                                    <div className="font-medium text-sm">{opt.label}</div>
                                                    <div className="text-xs text-white/50">{opt.desc}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ============================== MEMBERS ============================== */}
                            {activeTab === 'members' && (
                                <motion.div key="members" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div>
                                            <h2 className="text-xl font-semibold">Members</h2>
                                            <p className="text-sm text-white/50">{members.length} total &middot; {adminCount} admin{adminCount !== 1 && 's'} &middot; {modCount} mod{modCount !== 1 && 's'} &middot; {memberCount} member{memberCount !== 1 && 's'}</p>
                                        </div>
                                    </div>

                                    {/* Search + Filter */}
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <div className="flex-1 relative">
                                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                                            <input
                                                type="text"
                                                value={memberSearch}
                                                onChange={(e) => setMemberSearch(e.target.value)}
                                                placeholder="Search by name or username..."
                                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                                            />
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            {['all', 'ADMIN', 'MODERATOR', 'MEMBER', 'muted', 'banned'].map(f => (
                                                <button
                                                    key={f}
                                                    onClick={() => setMemberFilter(f)}
                                                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                                        memberFilter === f
                                                            ? 'bg-white/15 text-white'
                                                            : 'bg-white/5 text-white/50 hover:bg-white/10'
                                                    }`}
                                                >
                                                    {f === 'all' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase() + 's'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Members List */}
                                    <div className="space-y-2">
                                        {filteredMembers.length === 0 ? (
                                            <div className="text-center py-12 text-white/30">
                                                <svg className="mx-auto mb-3 opacity-40" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                                <p>No members match your search</p>
                                            </div>
                                        ) : filteredMembers.map((member) => (
                                            <div
                                                key={member.id}
                                                className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group"
                                            >
                                                {/* Avatar */}
                                                {member.user.avatarUrl ? (
                                                    <img src={member.user.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                                                ) : (
                                                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold flex-shrink-0 text-sm">
                                                        {(member.user.displayName || member.user.username)[0]?.toUpperCase()}
                                                    </div>
                                                )}

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium truncate text-sm">{member.user.displayName || member.user.username}</span>
                                                        {member.user.isVerified && <span className="text-blue-400 text-xs">✓</span>}
                                                    </div>
                                                    <div className="text-xs text-white/40">@{member.user.username} &middot; Joined {new Date(member.joinedAt).toLocaleDateString()}</div>
                                                </div>

                                                {/* Role Badge */}
                                                <RoleBadge role={member.role} isMuted={member.isMuted} isBanned={member.isBanned} />

                                                {/* Actions - only for non-self members */}
                                                {member.userId !== user?.id && (
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setActionMemberId(actionMemberId === member.userId ? null : member.userId)}
                                                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
                                                            </svg>
                                                        </button>

                                                        {/* Dropdown */}
                                                        <AnimatePresence>
                                                            {actionMemberId === member.userId && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                                                    className="absolute right-0 top-full mt-2 w-56 bg-[#1a1a1a] border border-white/10 rounded-xl py-2 z-50 shadow-2xl"
                                                                >
                                                                    <div className="px-3 py-2 text-xs text-white/30 uppercase tracking-wider">Role</div>
                                                                    {['ADMIN', 'MODERATOR', 'MEMBER'].map(r => (
                                                                        <button
                                                                            key={r}
                                                                            onClick={() => updateMemberRole(member.userId, r as any)}
                                                                            className={`w-full px-4 py-2 text-left text-sm hover:bg-white/5 flex items-center justify-between ${
                                                                                member.role === r ? 'text-white' : 'text-white/60'
                                                                            }`}
                                                                        >
                                                                            <span>{r.charAt(0) + r.slice(1).toLowerCase()}</span>
                                                                            {member.role === r && <span className="text-emerald-400">✓</span>}
                                                                        </button>
                                                                    ))}

                                                                    <div className="border-t border-white/5 my-1" />
                                                                    <div className="px-3 py-2 text-xs text-white/30 uppercase tracking-wider">Moderation</div>

                                                                    <button
                                                                        onClick={() => toggleMuteMember(member.userId, !member.isMuted)}
                                                                        className="w-full px-4 py-2 text-left text-sm text-amber-400 hover:bg-white/5 flex items-center gap-2"
                                                                    >
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                                                                        {member.isMuted ? 'Unmute' : 'Mute'} Member
                                                                    </button>

                                                                    <button
                                                                        onClick={() => toggleBanMember(member.userId, !member.isBanned)}
                                                                        className="w-full px-4 py-2 text-left text-sm text-orange-400 hover:bg-white/5 flex items-center gap-2"
                                                                    >
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                                                                        {member.isBanned ? 'Unban' : 'Ban'} Member
                                                                    </button>

                                                                    <div className="border-t border-white/5 my-1" />
                                                                    <button
                                                                        onClick={() => removeMember(member.userId)}
                                                                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                                                    >
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                                                                        Remove from Group
                                                                    </button>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                )}

                                                {/* Self indicator */}
                                                {member.userId === user?.id && (
                                                    <span className="text-xs text-white/30 px-3 py-1 border border-white/10 rounded-full">You</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* ============================== PERMISSIONS ============================== */}
                            {activeTab === 'permissions' && (
                                <motion.div key="permissions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                                    <h2 className="text-xl font-semibold">Permissions &amp; Rules</h2>

                                    {/* Posting Permission */}
                                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                                        <h3 className="font-medium mb-1">Who can post?</h3>
                                        <p className="text-sm text-white/40 mb-4">Control who is allowed to create new posts in the group</p>
                                        <div className="space-y-2">
                                            {[
                                                { value: 'all', label: 'Everyone', desc: 'All members can create posts' },
                                                { value: 'admins_mods', label: 'Admins & Moderators', desc: 'Only admins and mods can post' },
                                                { value: 'admins_only', label: 'Admins Only', desc: 'Only admins can post (announcement channel)' },
                                            ].map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setSettings({ ...settings, postingPermission: opt.value })}
                                                    className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4 ${
                                                        settings.postingPermission === opt.value
                                                            ? 'border-emerald-500/40 bg-emerald-500/10'
                                                            : 'border-white/5 hover:border-white/10'
                                                    }`}
                                                >
                                                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                                                        settings.postingPermission === opt.value ? 'border-emerald-500' : 'border-white/20'
                                                    }`}>
                                                        {settings.postingPermission === opt.value && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm">{opt.label}</div>
                                                        <div className="text-xs text-white/40">{opt.desc}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Invite Permission */}
                                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                                        <h3 className="font-medium mb-1">Who can invite?</h3>
                                        <p className="text-sm text-white/40 mb-4">Control who can share invite links and add new members</p>
                                        <div className="space-y-2">
                                            {[
                                                { value: 'all', label: 'Everyone', desc: 'All members can invite others' },
                                                { value: 'admins_mods', label: 'Admins & Moderators', desc: 'Only staff can invite' },
                                                { value: 'admins_only', label: 'Admins Only', desc: 'Tightest control over membership' },
                                            ].map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setSettings({ ...settings, invitePermission: opt.value })}
                                                    className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4 ${
                                                        settings.invitePermission === opt.value
                                                            ? 'border-emerald-500/40 bg-emerald-500/10'
                                                            : 'border-white/5 hover:border-white/10'
                                                    }`}
                                                >
                                                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                                                        settings.invitePermission === opt.value ? 'border-emerald-500' : 'border-white/20'
                                                    }`}>
                                                        {settings.invitePermission === opt.value && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm">{opt.label}</div>
                                                        <div className="text-xs text-white/40">{opt.desc}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Toggle Settings */}
                                    <div className="space-y-4">
                                        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <h3 className="font-medium text-sm">Announcement-Only Mode</h3>
                                                    <p className="text-xs text-white/40 mt-0.5">Only admins and moderators can post. Members receive and read only. Like a WhatsApp broadcast channel.</p>
                                                </div>
                                                <Toggle enabled={settings.isAnnouncementOnly} onChange={(v) => setSettings({ ...settings, isAnnouncementOnly: v })} />
                                            </div>
                                        </div>

                                        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <h3 className="font-medium text-sm">Require Approval for New Members</h3>
                                                    <p className="text-xs text-white/40 mt-0.5">New members must be approved by an admin before they can see content</p>
                                                </div>
                                                <Toggle enabled={settings.approvalRequired} onChange={(v) => setSettings({ ...settings, approvalRequired: v })} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Welcome Message */}
                                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                                        <h3 className="font-medium mb-1">Welcome Message</h3>
                                        <p className="text-sm text-white/40 mb-4">Automatically sent to new members when they join</p>
                                        <textarea
                                            value={settings.welcomeMessage || ''}
                                            onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
                                            rows={3}
                                            placeholder="Welcome to our group! Here are some things to know..."
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 resize-none transition-colors placeholder:text-white/20"
                                        />
                                        <p className="text-xs text-white/30 mt-1">{(settings.welcomeMessage || '').length}/500</p>
                                    </div>
                                </motion.div>
                            )}

                            {/* ============================== INVITES ============================== */}
                            {activeTab === 'invites' && (
                                <motion.div key="invites" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                                    <h2 className="text-xl font-semibold">Invite People</h2>

                                    {/* Invite Link */}
                                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                                        <h3 className="font-medium mb-1">Share Invite Link</h3>
                                        <p className="text-sm text-white/40 mb-4">Anyone with this link can join your group (or request to join if approval is required)</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={inviteLink}
                                                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white/70 text-sm font-mono"
                                            />
                                            <button
                                                onClick={copyInviteLink}
                                                className={`px-5 py-3 rounded-lg font-medium transition-all text-sm ${
                                                    inviteCopied
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'bg-white text-black hover:bg-white/90'
                                                }`}
                                            >
                                                {inviteCopied ? 'Copied!' : 'Copy'}
                                            </button>
                                        </div>

                                        {/* Share Buttons */}
                                        <div className="flex gap-3 mt-4 flex-wrap">
                                            <a
                                                href={`https://wa.me/?text=${encodeURIComponent(`Join ${settings.name} on 0G! ${inviteLink}`)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 0 0 .612.61l4.458-1.495A11.952 11.952 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.319 0-4.46-.764-6.189-2.055l-.432-.327-2.645.887.887-2.645-.327-.432A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                                                WhatsApp
                                            </a>
                                            <a
                                                href={`sms:?body=${encodeURIComponent(`Join ${settings.name} on 0G! ${inviteLink}`)}`}
                                                className="px-4 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                                SMS
                                            </a>
                                            <a
                                                href={`mailto:?subject=${encodeURIComponent(`Join ${settings.name} on 0G`)}&body=${encodeURIComponent(`You're invited to join ${settings.name} on 0G Social. Click here to join: ${inviteLink}`)}`}
                                                className="px-4 py-2.5 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors flex items-center gap-2"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                                Email
                                            </a>
                                        </div>
                                    </div>

                                    {/* WhatsApp Chat Import */}
                                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                                        <h3 className="font-medium mb-1 flex items-center gap-2">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 0 0 .612.61l4.458-1.495A11.952 11.952 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.319 0-4.46-.764-6.189-2.055l-.432-.327-2.645.887.887-2.645-.327-.432A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                                            Import WhatsApp Chat
                                        </h3>
                                        <p className="text-sm text-white/40 mb-4">
                                            Export your WhatsApp group chat (Settings &gt; Export Chat &gt; Without Media) and paste the text below to import the conversation history.
                                        </p>
                                        <textarea
                                            value={waImportText}
                                            onChange={(e) => setWaImportText(e.target.value)}
                                            rows={5}
                                            placeholder="Paste exported WhatsApp chat text here..."
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 resize-none mb-3 font-mono"
                                        />
                                        {waImportResult && (
                                            <p className={`text-sm mb-3 ${waImportResult.includes('Failed') ? 'text-red-400' : 'text-emerald-400'}`}>{waImportResult}</p>
                                        )}
                                        <button
                                            onClick={async () => {
                                                if (!waImportText.trim()) return;
                                                setWaImporting(true);
                                                setWaImportResult(null);
                                                try {
                                                    // Parse WhatsApp format: "MM/DD/YY, HH:MM - Sender: Message"
                                                    const lines = waImportText.split('\n').filter(l => l.trim());
                                                    const parsed: { sender: string; content: string; timestamp?: string }[] = [];
                                                    const waRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s*(\d{1,2}:\d{2}(?:\s*[AP]M)?)\s*-\s*([^:]+):\s*(.+)$/i;
                                                    for (const line of lines) {
                                                        const match = line.match(waRegex);
                                                        if (match) {
                                                            parsed.push({
                                                                sender: match[3].trim(),
                                                                content: match[4].trim(),
                                                                timestamp: new Date(`${match[1]} ${match[2]}`).toISOString(),
                                                            });
                                                        }
                                                    }
                                                    if (parsed.length === 0) {
                                                        setWaImportResult('No valid messages found. Make sure you paste the exported WhatsApp chat text.');
                                                    } else {
                                                        const data = await apiFetch(`${API_URL}/api/v1/communities/${communityId}/import/whatsapp`, {
                                                            method: 'POST',
                                                            body: JSON.stringify({ messages: parsed }),
                                                        });
                                                        setWaImportResult(`Successfully imported ${data.imported} messages!`);
                                                        setWaImportText('');
                                                    }
                                                } catch (err: any) {
                                                    setWaImportResult(err?.message || 'Failed to import. Please try again.');
                                                } finally {
                                                    setWaImporting(false);
                                                }
                                            }}
                                            disabled={waImporting || !waImportText.trim()}
                                            className="px-5 py-2.5 bg-[#25D366] text-white rounded-xl font-medium text-sm hover:bg-[#20bd5a] transition-colors disabled:opacity-40 flex items-center gap-2"
                                        >
                                            {waImporting ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Importing...
                                                </>
                                            ) : 'Import Messages'}
                                        </button>
                                    </div>

                                    {/* Branded Invite Preview */}
                                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                                        <h3 className="font-medium mb-1">Invite Preview</h3>
                                        <p className="text-sm text-white/40 mb-4">This is how your invite page looks to new members</p>
                                        <div className="rounded-xl border border-white/10 overflow-hidden" style={{ borderColor: `${settings.brandColor}30` }}>
                                            <div className="h-20 relative" style={{ background: `linear-gradient(135deg, ${settings.brandColor}40, ${settings.brandColor}10)` }}>
                                                {settings.logoUrl && (
                                                    <img src={settings.logoUrl} alt="" className="absolute bottom-0 left-4 translate-y-1/2 w-12 h-12 rounded-xl border-2 border-black object-cover" />
                                                )}
                                            </div>
                                            <div className={`p-4 ${settings.logoUrl ? 'pt-8' : 'pt-4'}`}>
                                                <div className="font-semibold text-sm">{settings.name}</div>
                                                {settings.tagline && <div className="text-xs text-white/50 mt-0.5">{settings.tagline}</div>}
                                                <div className="text-xs text-white/30 mt-2">{settings.memberCount} members &middot; {!settings.isPublic ? 'Private' : 'Public'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ============================== APPEARANCE ============================== */}
                            {activeTab === 'appearance' && (
                                <motion.div key="appearance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                                    <h2 className="text-xl font-semibold">Appearance &amp; Branding</h2>

                                    {/* Brand Color */}
                                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                                        <h3 className="font-medium mb-1">Brand Color</h3>
                                        <p className="text-sm text-white/40 mb-4">Used on invite pages, badges, and accent elements</p>
                                        <div className="flex flex-wrap gap-3">
                                            {['#00D4FF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#84CC16'].map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => setSettings({ ...settings, brandColor: color })}
                                                    className={`w-10 h-10 rounded-xl transition-all ${
                                                        settings.brandColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : 'hover:scale-105'
                                                    }`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                            <div className="relative">
                                                <input
                                                    type="color"
                                                    value={settings.brandColor || '#00D4FF'}
                                                    onChange={(e) => setSettings({ ...settings, brandColor: e.target.value })}
                                                    className="w-10 h-10 rounded-xl cursor-pointer border-2 border-dashed border-white/20"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-4 flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: settings.brandColor }} />
                                            <span className="text-sm text-white/50 font-mono">{settings.brandColor}</span>
                                        </div>
                                    </div>

                                    {/* Logo */}
                                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                                        <h3 className="font-medium mb-1">Group Logo</h3>
                                        <p className="text-sm text-white/40 mb-4">Upload your group&apos;s logo or icon (displayed on invites and group headers)</p>
                                        <div className="flex items-center gap-4">
                                            {settings.logoUrl ? (
                                                <img src={settings.logoUrl} alt="" className="w-20 h-20 rounded-2xl object-cover border border-white/10" />
                                            ) : (
                                                <div className="w-20 h-20 rounded-2xl bg-white/5 border border-dashed border-white/20 flex items-center justify-center">
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/30"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
                                                </div>
                                            )}
                                            <div>
                                                <button className="px-4 py-2 bg-white/10 border border-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/15 transition-colors">
                                                    Upload Logo
                                                </button>
                                                <p className="text-xs text-white/30 mt-1">PNG, JPG, or SVG. Max 2MB.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Preview Card */}
                                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                                        <h3 className="font-medium mb-4">Live Preview</h3>
                                        <div className="rounded-2xl overflow-hidden border border-white/10" style={{ borderColor: `${settings.brandColor}40` }}>
                                            <div className="h-24" style={{ background: `linear-gradient(135deg, ${settings.brandColor}50, ${settings.brandColor}15)` }} />
                                            <div className="p-5 -mt-8">
                                                <div className="flex items-end gap-3">
                                                    {settings.logoUrl ? (
                                                        <img src={settings.logoUrl} alt="" className="w-16 h-16 rounded-2xl border-4 border-black object-cover" />
                                                    ) : (
                                                        <div className="w-16 h-16 rounded-2xl border-4 border-black flex items-center justify-center text-xl font-bold" style={{ backgroundColor: settings.brandColor }}>
                                                            {settings.name[0]?.toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="pb-1">
                                                        <h4 className="font-bold">{settings.name}</h4>
                                                        {settings.tagline && <p className="text-xs text-white/50">{settings.tagline}</p>}
                                                    </div>
                                                </div>
                                                {settings.description && <p className="text-sm text-white/60 mt-3 line-clamp-2">{settings.description}</p>}
                                                {settings.websiteUrl && (
                                                    <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: settings.brandColor }}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                                                        {settings.websiteUrl.replace(/^https?:\/\//, '')}
                                                    </div>
                                                )}
                                                <div className="mt-3 flex items-center gap-4 text-xs text-white/40">
                                                    <span>{settings.memberCount} members</span>
                                                    <span>{settings.postCount} posts</span>
                                                    <span>{!settings.isPublic ? 'Private' : 'Public'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ============================== DANGER ZONE ============================== */}
                            {activeTab === 'danger' && (
                                <motion.div key="danger" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                                    <h2 className="text-xl font-semibold text-red-400">Danger Zone</h2>

                                    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
                                        <h3 className="font-medium text-red-400 mb-2">Delete Group</h3>
                                        <p className="text-sm text-white/50 mb-4">
                                            Permanently delete this group and all its posts, members, and content. This action cannot be undone.
                                        </p>
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="px-5 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-medium text-sm hover:bg-red-500/30 transition-colors"
                                        >
                                            Delete Group
                                        </button>
                                    </div>

                                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6">
                                        <h3 className="font-medium text-amber-400 mb-2">Transfer Ownership</h3>
                                        <p className="text-sm text-white/50 mb-4">
                                            Transfer ownership to another admin. You will remain as a regular admin.
                                        </p>
                                        <select className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 w-full max-w-sm mb-3 appearance-none">
                                            <option value="" className="bg-[#1a1a1a]">Select an admin...</option>
                                            {members.filter(m => m.role === 'ADMIN' && m.userId !== user?.id).map(m => (
                                                <option key={m.userId} value={m.userId} className="bg-[#1a1a1a]">{m.user.displayName} (@{m.user.username})</option>
                                            ))}
                                        </select>
                                        <button className="px-5 py-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-medium text-sm hover:bg-amber-500/30 transition-colors">
                                            Transfer Ownership
                                        </button>
                                    </div>

                                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                                        <h3 className="font-medium mb-2">Archive Group</h3>
                                        <p className="text-sm text-white/50 mb-4">
                                            Make the group read-only. No new posts or members. All content is preserved.
                                        </p>
                                        <button className="px-5 py-2.5 bg-white/10 border border-white/10 rounded-xl font-medium text-sm hover:bg-white/15 transition-colors">
                                            Archive Group
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>

            {/* Click-away handler for member dropdown */}
            {actionMemberId && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setActionMemberId(null)}
                />
            )}

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowDeleteConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-md w-full"
                        >
                            <h3 className="text-xl font-semibold text-red-400 mb-2">Delete Group?</h3>
                            <p className="text-white/60 text-sm mb-4">
                                This will permanently delete <strong>{settings.name}</strong>, including all {settings.postCount} posts, {settings.memberCount} members, and all associated data. This action cannot be undone.
                            </p>
                            <div className="mb-4">
                                <label className="block text-xs text-white/40 mb-2">Type the group name to confirm:</label>
                                <input
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    placeholder={settings.name}
                                    className="w-full bg-black/50 border border-red-500/30 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                                    className="flex-1 px-5 py-3 border border-white/20 rounded-xl font-medium text-sm hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={deleteCommunity}
                                    disabled={deleteConfirmText !== settings.name}
                                    className="flex-1 px-5 py-3 bg-red-500 text-white rounded-xl font-medium text-sm hover:bg-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    Delete Forever
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
