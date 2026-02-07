'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInvite } from '@/hooks/useInvite';
import { useAuth } from '@/contexts/AuthContext';
import { API_ENDPOINTS, apiFetch } from '@/lib/api';

// ============================================
// INVITE FRIENDS MODAL
// Revolutionary "Send a ZeroG Invitation" UI
// ============================================

interface InviteFriendsProps {
    isOpen: boolean;
    onClose: () => void;
    communityId?: string;
    communityName?: string;
    communitySlug?: string;
}

// Share platforms with ZeroG branding
const SHARE_PLATFORMS = [
    { id: 'whatsapp', name: 'WhatsApp', icon: '💬', gradient: 'from-green-500 to-green-600' },
    { id: 'sms', name: 'Message', icon: '📱', gradient: 'from-blue-500 to-blue-600' },
    { id: 'telegram', name: 'Telegram', icon: '✈️', gradient: 'from-sky-400 to-sky-500' },
    { id: 'twitter', name: 'X', icon: '𝕏', gradient: 'from-neutral-600 to-neutral-700' },
    { id: 'email', name: 'Email', icon: '📧', gradient: 'from-rose-400 to-rose-500' },
] as const;

export function InviteFriends({ isOpen, onClose, communityId, communityName, communitySlug }: InviteFriendsProps) {
    const { user } = useAuth();
    const {
        isLoading,
        inviteLink,
        inviteCode,
        generateLink,
        copyLink,
        getShareUrl,
        remainingInvites
    } = useInvite();

    // State
    const [activeTab, setActiveTab] = useState<'external' | 'internal'>(communityId ? 'internal' : 'external');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [isSearching, setIsSearching] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const [copied, setCopied] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Generate link or reset state on open
    useEffect(() => {
        if (isOpen) {
            setActiveTab(communityId ? 'internal' : 'external');
            setSearchQuery('');
            setSearchResults([]);
            setSelectedUsers(new Set());
            setShowSuccess(false);
            if (!inviteLink && !communityId) {
                generateLink();
            }
        }
    }, [isOpen, inviteLink, generateLink, communityId]);

    // Search Effect (Internal)
    useEffect(() => {
        if (!searchQuery.trim() || activeTab !== 'internal') {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await apiFetch(`${API_ENDPOINTS.users}?search=${encodeURIComponent(searchQuery)}&limit=5`);
                const data = await res.json();
                if (data.users) {
                    setSearchResults(data.users.filter((u: any) => u.id !== user?.id));
                }
            } catch (error) {
                console.error('Search error', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, activeTab, user?.id]);

    const handleSendInternalInvites = async () => {
        if (selectedUsers.size === 0 || !communityId) return;
        setIsSending(true);
        try {
            await apiFetch(`${API_ENDPOINTS.communities}/${communityId}/invite`, {
                method: 'POST',
                body: JSON.stringify({ userIds: Array.from(selectedUsers) })
            });
            setShowSuccess(true);
            setTimeout(onClose, 2000);
        } catch (error) {
            console.error('Invite failed', error);
        } finally {
            setIsSending(false);
        }
    };

    const toggleUser = (id: string) => {
        const next = new Set(selectedUsers);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedUsers(next);
    };

    const handleCopyLink = useCallback(async () => {
        const linkToCopy = communityId
            ? `${window.location.origin}/communities/${communityId}/join`
            : inviteLink;

        if (linkToCopy) {
            await navigator.clipboard.writeText(linkToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [inviteLink, communityId]);

    const handleShare = useCallback((platform: typeof SHARE_PLATFORMS[number]['id']) => {
        let url;
        const senderName = user?.displayName || 'Someone';

        if (communityId) {
            // Community-specific invite with rich message (use slug for prettier URL)
            const joinSlug = communitySlug || communityId;
            const communityUrl = `${window.location.origin}/communities/${joinSlug}/join?ref=${user?.username || ''}`;
            const groupName = communityName || 'our group';

            const messages: Record<string, string> = {
                whatsapp: `Hey! 👋 I created *${groupName}* on 0G — a private social platform with end-to-end privacy.\n\nJoin us here: ${communityUrl}\n\n✅ No ads, no tracking\n🔒 Private & encrypted\n⚡ Takes 30 seconds to join`,
                sms: `Hey! I made a group called "${groupName}" on 0G. Join us: ${communityUrl}`,
                telegram: `Hey! 👋 I created "${groupName}" on 0G — a private social platform.\n\nJoin here: ${communityUrl}`,
                twitter: `Join ${groupName} on @ZeroG_Social — the privacy-first social platform 🔒\n\n${communityUrl}`,
                email: `Hi!\n\nI'd love for you to join "${groupName}" on 0G — a private social network built for real communities.\n\nJoin here: ${communityUrl}\n\nIt only takes 30 seconds to create an account. No ads, no tracking, end-to-end privacy.\n\n— ${senderName}`,
            };

            const message = messages[platform] || `Join ${groupName} on 0G: ${communityUrl}`;

            switch (platform) {
                case 'whatsapp':
                    url = `https://wa.me/?text=${encodeURIComponent(message)}`;
                    break;
                case 'sms':
                    url = `sms:?body=${encodeURIComponent(message)}`;
                    break;
                case 'telegram':
                    url = `https://t.me/share/url?url=${encodeURIComponent(communityUrl)}&text=${encodeURIComponent(messages.telegram)}`;
                    break;
                case 'twitter':
                    url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(messages.twitter)}`;
                    break;
                case 'email':
                    url = `mailto:?subject=${encodeURIComponent(`Join ${groupName} on 0G`)}&body=${encodeURIComponent(messages.email)}`;
                    break;
            }
        } else {
            // General invite (personal referral link)
            const personalUrl = inviteLink || `${window.location.origin}/r/${inviteCode || ''}`;

            const messages: Record<string, string> = {
                whatsapp: `Hey! 👋 I'm on *0G* — a private social platform with no ads and real privacy.\n\nJoin me: ${personalUrl}\n\n🔒 End-to-end encrypted\n⚡ No tracking or data selling\n✨ Built for real communities`,
                sms: `Hey! Join me on 0G — a private social platform. ${personalUrl}`,
                telegram: `Join me on 0G — the privacy-first social network!\n\n${personalUrl}`,
                twitter: `I'm on @ZeroG_Social — social media built for privacy 🔒\n\nJoin: ${personalUrl}`,
                email: `Hi!\n\nI've been using 0G, a new private social platform that doesn't track you, sell your data, or show ads.\n\nJoin me here: ${personalUrl}\n\nIt takes 30 seconds to sign up.\n\n— ${senderName}`,
            };

            const message = messages[platform] || `Join me on 0G: ${personalUrl}`;

            switch (platform) {
                case 'whatsapp':
                    url = `https://wa.me/?text=${encodeURIComponent(message)}`;
                    break;
                case 'sms':
                    url = `sms:?body=${encodeURIComponent(message)}`;
                    break;
                case 'telegram':
                    url = `https://t.me/share/url?url=${encodeURIComponent(personalUrl)}&text=${encodeURIComponent(messages.telegram)}`;
                    break;
                case 'twitter':
                    url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(messages.twitter)}`;
                    break;
                case 'email':
                    url = `mailto:?subject=${encodeURIComponent(`${senderName} invited you to 0G`)}&body=${encodeURIComponent(messages.email)}`;
                    break;
                default:
                    url = getShareUrl(platform as any, user?.displayName);
            }
        }

        if (url) window.open(url, '_blank', 'width=600,height=500');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    }, [getShareUrl, user?.displayName, user?.username, communityId, communityName, inviteLink, inviteCode]);

    if (!mounted) return null;

    const displayLink = communityId
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/communities/${communitySlug || communityId}/join`
        : (inviteLink || 'Generating link...');

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-gradient-to-b from-[#0a0a0f] to-[#050508] rounded-3xl border border-white/10 shadow-2xl">

                            {/* Header */}
                            <div className="relative px-6 pt-8 pb-6 overflow-hidden">
                                {/* Gradient Orbs */}
                                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                    <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-amber-500/20 blur-3xl" />
                                    <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-violet-500/20 blur-3xl" />
                                </div>

                                <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors z-10">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>

                                <h2 className="text-2xl font-bold text-center text-white mb-2 relative z-10">
                                    {communityId ? `Invite to ${communityName || 'Tribe'}` : 'Invite Friends'}
                                </h2>
                                <p className="text-sm text-center text-white/50 relative z-10">
                                    {communityId ? 'Search for existing users or share a link' : 'Bring your tribe to 0G'}
                                </p>
                            </div>

                            {/* Tabs */}
                            {communityId && (
                                <div className="flex gap-2 px-6 mb-6">
                                    <button
                                        onClick={() => setActiveTab('internal')}
                                        className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${activeTab === 'internal'
                                            ? 'bg-white/10 text-white'
                                            : 'text-white/40 hover:text-white/60'
                                            }`}
                                    >
                                        Tap In
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('external')}
                                        className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${activeTab === 'external'
                                            ? 'bg-white/10 text-white'
                                            : 'text-white/40 hover:text-white/60'
                                            }`}
                                    >
                                        Share Link
                                    </button>
                                </div>
                            )}

                            {/* Content */}
                            <div className="px-6 pb-6 space-y-6">
                                {activeTab === 'internal' ? (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Search users by name..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
                                            />
                                            {isSearching && (
                                                <div className="absolute right-3 top-3.5 w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            )}
                                        </div>

                                        <div className="max-h-60 overflow-y-auto space-y-2 min-h-[100px]">
                                            {searchResults.length === 0 && searchQuery && !isSearching && (
                                                <p className="text-center text-sm text-white/30 py-4">No users found</p>
                                            )}
                                            {searchResults.map(u => (
                                                <div
                                                    key={u.id}
                                                    onClick={() => toggleUser(u.id)}
                                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${selectedUsers.has(u.id) ? 'bg-indigo-500/20 border border-indigo-500/40' : 'bg-white/5 border border-transparent hover:bg-white/10'
                                                        }`}
                                                >
                                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0">
                                                        {u.avatarUrl ? (
                                                            <img src={u.avatarUrl} alt={u.displayName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-white/50 text-xs font-bold">
                                                                {u.displayName?.[0]?.toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-white font-medium text-sm truncate">{u.displayName}</h4>
                                                        <p className="text-white/40 text-xs truncate">@{u.username}</p>
                                                    </div>
                                                    {selectedUsers.has(u.id) && (
                                                        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            onClick={handleSendInternalInvites}
                                            disabled={selectedUsers.size === 0 || isSending}
                                            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-violet-500 text-white font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                                        >
                                            {isSending ? 'Sending Invites...' : `Send Invite to ${selectedUsers.size} Users`}
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                        <div className="relative">
                                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                                                <p className="flex-1 text-sm text-white font-mono truncate">
                                                    {displayLink}
                                                </p>
                                                <button
                                                    onClick={handleCopyLink}
                                                    className="flex-shrink-0 px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors"
                                                >
                                                    {copied ? 'Copied' : 'Copy'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-5 gap-3">
                                            {SHARE_PLATFORMS.map((platform, index) => (
                                                <button
                                                    key={platform.id}
                                                    onClick={() => handleShare(platform.id)}
                                                    className="flex flex-col items-center gap-2 group"
                                                >
                                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${platform.gradient} flex items-center justify-center text-xl shadow-lg transition-transform group-hover:scale-110`}>
                                                        {platform.icon}
                                                    </div>
                                                    <span className="text-[10px] text-white/60">{platform.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {/* Success Toast */}
                                <AnimatePresence>
                                    {showSuccess && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute bottom-6 left-6 right-6 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-md"
                                        >
                                            <span className="text-emerald-400">✓</span>
                                            <span className="text-sm text-emerald-400">{activeTab === 'internal' ? 'Invites Sent!' : 'Link Copied/Shared!'}</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default InviteFriends;
