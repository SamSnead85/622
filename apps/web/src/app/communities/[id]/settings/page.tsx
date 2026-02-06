'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch, API_URL } from '@/lib/api';

// ============================================
// TYPES
// ============================================
interface TribeMember {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    role: 'owner' | 'admin' | 'moderator' | 'member';
    joinedAt: string;
}

interface TribeSettings {
    id: string;
    name: string;
    description: string;
    coverImage?: string;
    privacy: 'public' | 'private';
    approvalRequired: boolean;
    memberCount: number;
    createdAt: string;
}

// ============================================
// INITIAL DATA
// ============================================
const INITIAL_MEMBERS: TribeMember[] = [];

const INITIAL_SETTINGS: TribeSettings = {
    id: '',
    name: '',
    description: '',
    privacy: 'private',
    approvalRequired: true,
    memberCount: 0,
    createdAt: new Date().toISOString(),
};

// ============================================
// TAB TYPES
// ============================================
type SettingsTab = 'general' | 'members' | 'invites' | 'permissions' | 'danger';

// ============================================
// MAIN COMPONENT
// ============================================
export default function TribeSettingsPage() {
    const router = useRouter();
    const params = useParams();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [settings, setSettings] = useState<TribeSettings>(INITIAL_SETTINGS);
    const [members, setMembers] = useState<TribeMember[]>(INITIAL_MEMBERS);
    const [inviteLink, setInviteLink] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Fetch real community settings and members from API
    useEffect(() => {
        const tribeId = params.id as string;
        setInviteLink(`https://0g.social/tribe/invite/${tribeId}`);

        async function fetchCommunity() {
            setIsLoading(true);
            try {
                const data = await apiFetch(`${API_URL}/api/v1/communities/${tribeId}`);
                const community = data.community || data;
                setSettings({
                    id: community.id || tribeId,
                    name: community.name || '',
                    description: community.description || '',
                    coverImage: community.coverImageUrl || community.coverImage,
                    privacy: community.isPrivate ? 'private' : 'public',
                    approvalRequired: community.approvalRequired ?? true,
                    memberCount: community.membersCount ?? community.memberCount ?? 0,
                    createdAt: community.createdAt || new Date().toISOString(),
                });

                // Fetch members if available
                if (community.members && Array.isArray(community.members)) {
                    setMembers(community.members.map((m: any) => ({
                        id: m.user?.id || m.id,
                        username: m.user?.username || m.username || '',
                        displayName: m.user?.displayName || m.displayName || '',
                        avatarUrl: m.user?.avatarUrl || m.avatarUrl,
                        role: m.role?.toLowerCase() || 'member',
                        joinedAt: m.joinedAt || m.createdAt || '',
                    })));
                }
            } catch (err) {
                console.error('Failed to load community settings:', err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchCommunity();
    }, [params.id]);

    const tabs: { id: SettingsTab; label: string; icon: string }[] = [
        { id: 'general', label: 'General', icon: '⚙️' },
        { id: 'members', label: 'Members', icon: '👥' },
        { id: 'invites', label: 'Invites', icon: '🔗' },
        { id: 'permissions', label: 'Permissions', icon: '🛡️' },
        { id: 'danger', label: 'Danger Zone', icon: '⚠️' },
    ];

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const tribeId = params.id as string;
            await apiFetch(`${API_URL}/api/v1/communities/${tribeId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: settings.name,
                    description: settings.description,
                    isPrivate: settings.privacy === 'private',
                    approvalRequired: settings.approvalRequired,
                }),
            });
        } catch (err) {
            console.error('Failed to save settings:', err);
            alert('Failed to save settings. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const copyInviteLink = () => {
        navigator.clipboard.writeText(inviteLink);
    };

    const promoteMemner = (memberId: string, newRole: TribeMember['role']) => {
        setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    };

    const removeMember = (memberId: string) => {
        setMembers(members.filter(m => m.id !== memberId));
    };

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0A1628] via-black to-black" />
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
                    <Link
                        href="/communities"
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </Link>
                    <div className="flex-1">
                        <h1 className="font-semibold text-lg">{settings.name}</h1>
                        <p className="text-sm text-white/50">Tribe Settings</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-5 py-2 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </header>

            <main className="relative z-10 max-w-5xl mx-auto px-6 py-8">
                {isLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    </div>
                ) : (
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Tabs */}
                    <nav className="lg:w-56 flex-shrink-0">
                        <div className="lg:sticky lg:top-24 space-y-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${activeTab === tab.id
                                            ? 'bg-white/10 text-white'
                                            : 'text-white/50 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <span className="text-lg">{tab.icon}</span>
                                    <span className="font-medium">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </nav>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <AnimatePresence mode="wait">
                            {/* General Settings */}
                            {activeTab === 'general' && (
                                <motion.div
                                    key="general"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-8"
                                >
                                    <div>
                                        <h2 className="text-xl font-semibold mb-6">General Settings</h2>

                                        {/* Cover Image */}
                                        <div className="mb-8">
                                            <label className="block text-sm font-medium text-white/70 mb-3">Cover Image</label>
                                            <div className="relative aspect-[3/1] rounded-2xl overflow-hidden border border-white/10 group">
                                                {settings.coverImage ? (
                                                    <img src={settings.coverImage} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-[#00D4FF]/20 to-[#8B5CF6]/20" />
                                                )}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button className="px-4 py-2 bg-white text-black rounded-lg font-medium">
                                                        Change Cover
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Name */}
                                        <div className="mb-6">
                                            <label className="block text-sm font-medium text-white/70 mb-2">Tribe Name</label>
                                            <input
                                                type="text"
                                                value={settings.name}
                                                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30"
                                            />
                                        </div>

                                        {/* Description */}
                                        <div className="mb-6">
                                            <label className="block text-sm font-medium text-white/70 mb-2">Description</label>
                                            <textarea
                                                value={settings.description}
                                                onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                                                rows={4}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 resize-none"
                                            />
                                        </div>

                                        {/* Privacy */}
                                        <div className="mb-6">
                                            <label className="block text-sm font-medium text-white/70 mb-3">Privacy</label>
                                            <div className="grid grid-cols-2 gap-4">
                                                <button
                                                    onClick={() => setSettings({ ...settings, privacy: 'public' })}
                                                    className={`p-4 rounded-xl border text-left transition-all ${settings.privacy === 'public'
                                                            ? 'border-white bg-white/10'
                                                            : 'border-white/10 hover:border-white/20'
                                                        }`}
                                                >
                                                    <div className="text-xl mb-2">🌍</div>
                                                    <div className="font-medium">Public</div>
                                                    <div className="text-sm text-white/50">Anyone can find and join</div>
                                                </button>
                                                <button
                                                    onClick={() => setSettings({ ...settings, privacy: 'private' })}
                                                    className={`p-4 rounded-xl border text-left transition-all ${settings.privacy === 'private'
                                                            ? 'border-white bg-white/10'
                                                            : 'border-white/10 hover:border-white/20'
                                                        }`}
                                                >
                                                    <div className="text-xl mb-2">🔒</div>
                                                    <div className="font-medium">Private</div>
                                                    <div className="text-sm text-white/50">Invite only</div>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Members Tab */}
                            {activeTab === 'members' && (
                                <motion.div
                                    key="members"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-6"
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-xl font-semibold">Members</h2>
                                            <p className="text-white/50 text-sm">{members.length} members</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                placeholder="Search members..."
                                                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-white/30"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {members.map((member) => (
                                            <div
                                                key={member.id}
                                                className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors"
                                            >
                                                {member.avatarUrl ? (
                                                    <img src={member.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold">
                                                        {member.displayName[0]}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium truncate">{member.displayName}</div>
                                                    <div className="text-sm text-white/50">@{member.username}</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${member.role === 'owner' ? 'bg-amber-500/20 text-amber-400' :
                                                            member.role === 'admin' ? 'bg-violet-500/20 text-violet-400' :
                                                                member.role === 'moderator' ? 'bg-cyan-500/20 text-cyan-400' :
                                                                    'bg-white/10 text-white/60'
                                                        }`}>
                                                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                                    </span>
                                                    {member.role !== 'owner' && (
                                                        <div className="relative group">
                                                            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <circle cx="12" cy="12" r="1" />
                                                                    <circle cx="19" cy="12" r="1" />
                                                                    <circle cx="5" cy="12" r="1" />
                                                                </svg>
                                                            </button>
                                                            <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                                                <button
                                                                    onClick={() => promoteMemner(member.id, 'admin')}
                                                                    className="w-full px-4 py-2 text-left text-sm hover:bg-white/5"
                                                                >
                                                                    Make Admin
                                                                </button>
                                                                <button
                                                                    onClick={() => promoteMemner(member.id, 'moderator')}
                                                                    className="w-full px-4 py-2 text-left text-sm hover:bg-white/5"
                                                                >
                                                                    Make Moderator
                                                                </button>
                                                                <button
                                                                    onClick={() => removeMember(member.id)}
                                                                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/5"
                                                                >
                                                                    Remove Member
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Invites Tab */}
                            {activeTab === 'invites' && (
                                <motion.div
                                    key="invites"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-8"
                                >
                                    <h2 className="text-xl font-semibold">Invite People</h2>

                                    {/* Invite Link */}
                                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                                        <h3 className="font-medium mb-4">Invite Link</h3>
                                        <p className="text-sm text-white/50 mb-4">
                                            Share this link with people you want to invite to your tribe.
                                        </p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={inviteLink}
                                                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white/70 text-sm"
                                            />
                                            <button
                                                onClick={copyInviteLink}
                                                className="px-5 py-3 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                        <div className="flex gap-3 mt-4">
                                            <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                                                WhatsApp
                                            </button>
                                            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                                                SMS
                                            </button>
                                            <button className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
                                                Email
                                            </button>
                                        </div>
                                    </div>

                                    {/* Pending Invites */}
                                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                                        <h3 className="font-medium mb-4">Pending Invites</h3>
                                        <div className="text-center py-8 text-white/40">
                                            <div className="text-4xl mb-2">📬</div>
                                            <p>No pending invites</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Permissions Tab */}
                            {activeTab === 'permissions' && (
                                <motion.div
                                    key="permissions"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-8"
                                >
                                    <h2 className="text-xl font-semibold">Permissions</h2>

                                    <div className="space-y-4">
                                        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-medium">Require approval for new members</h3>
                                                    <p className="text-sm text-white/50">New members must be approved by admins</p>
                                                </div>
                                                <button
                                                    onClick={() => setSettings({ ...settings, approvalRequired: !settings.approvalRequired })}
                                                    className={`w-12 h-7 rounded-full transition-colors relative ${settings.approvalRequired ? 'bg-green-500' : 'bg-white/20'
                                                        }`}
                                                >
                                                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${settings.approvalRequired ? 'left-6' : 'left-1'
                                                        }`} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-medium">All members can post</h3>
                                                    <p className="text-sm text-white/50">Allow all members to create posts</p>
                                                </div>
                                                <button className="w-12 h-7 rounded-full bg-green-500 relative">
                                                    <div className="absolute top-1 left-6 w-5 h-5 rounded-full bg-white" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-medium">Members can invite others</h3>
                                                    <p className="text-sm text-white/50">Allow all members to share the invite link</p>
                                                </div>
                                                <button className="w-12 h-7 rounded-full bg-white/20 relative">
                                                    <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Danger Zone Tab */}
                            {activeTab === 'danger' && (
                                <motion.div
                                    key="danger"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-8"
                                >
                                    <h2 className="text-xl font-semibold text-red-400">Danger Zone</h2>

                                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
                                        <h3 className="font-medium text-red-400 mb-2">Delete Tribe</h3>
                                        <p className="text-sm text-white/60 mb-4">
                                            Permanently delete this tribe and all its content. This action cannot be undone.
                                        </p>
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="px-5 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                                        >
                                            Delete Tribe
                                        </button>
                                    </div>

                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
                                        <h3 className="font-medium text-amber-400 mb-2">Transfer Ownership</h3>
                                        <p className="text-sm text-white/60 mb-4">
                                            Transfer ownership of this tribe to another admin.
                                        </p>
                                        <button className="px-5 py-2 bg-amber-500 text-black rounded-lg font-medium hover:bg-amber-400 transition-colors">
                                            Transfer Ownership
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                )}
            </main>

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
                            <h3 className="text-xl font-semibold text-red-400 mb-2">Delete Tribe?</h3>
                            <p className="text-white/60 mb-6">
                                Are you sure you want to delete <strong>{settings.name}</strong>? This will permanently remove all posts, members, and content. This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 px-5 py-3 border border-white/20 rounded-xl font-medium hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => router.push('/communities')}
                                    className="flex-1 px-5 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
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
