'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

// ============================================
// TYPES
// ============================================
interface ShareSheetProps {
    isOpen: boolean;
    onClose: () => void;
    content: {
        type: 'post' | 'moment' | 'profile' | 'journey' | 'community';
        title?: string;
        description?: string;
        imageUrl?: string;
        url?: string;
    };
}

interface ShareTarget {
    id: string;
    name: string;
    icon: string;
    color: string;
    action: 'native' | 'copy' | 'external';
    url?: string;
}

interface QuickShareUser {
    id: string;
    name: string;
    username: string;
    avatar: string;
    isOnline?: boolean;
}

// ============================================
// SHARE TARGETS
// ============================================
const SHARE_TARGETS: ShareTarget[] = [
    { id: 'message', name: 'Messages', icon: '💬', color: 'from-blue-500 to-blue-600', action: 'native' },
    { id: 'copy', name: 'Copy Link', icon: '🔗', color: 'from-gray-500 to-gray-600', action: 'copy' },
    { id: 'twitter', name: 'X (Twitter)', icon: '𝕏', color: 'from-neutral-700 to-neutral-800', action: 'external', url: 'https://twitter.com/intent/tweet?url=' },
    { id: 'facebook', name: 'Facebook', icon: '📘', color: 'from-blue-600 to-blue-700', action: 'external', url: 'https://www.facebook.com/sharer/sharer.php?u=' },
    { id: 'whatsapp', name: 'WhatsApp', icon: '📱', color: 'from-green-500 to-green-600', action: 'external', url: 'https://wa.me/?text=' },
    { id: 'telegram', name: 'Telegram', icon: '✈️', color: 'from-sky-400 to-sky-500', action: 'external', url: 'https://t.me/share/url?url=' },
    { id: 'email', name: 'Email', icon: '📧', color: 'from-red-400 to-red-500', action: 'external', url: 'mailto:?body=' },
    { id: 'sms', name: 'SMS', icon: '💬', color: 'from-green-400 to-green-500', action: 'external', url: 'sms:?body=' },
];

// ============================================
// QUICK SHARE USERS (Mock Data)
// ============================================
const QUICK_SHARE_USERS: QuickShareUser[] = [
    { id: '1', name: 'Sarah Chen', username: 'sarah', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face', isOnline: true },
    { id: '2', name: 'Marcus J', username: 'marcus', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', isOnline: true },
    { id: '3', name: 'Emily Park', username: 'emily', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face', isOnline: false },
    { id: '4', name: 'Jordan Lee', username: 'jordan', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=face', isOnline: true },
    { id: '5', name: 'Alex Rivera', username: 'alex', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face', isOnline: false },
];

// ============================================
// SHARE SHEET COMPONENT
// ============================================
export function ShareSheet({ isOpen, onClose, content }: ShareSheetProps) {
    const [copied, setCopied] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Generate share URL
    const shareUrl = content.url || `https://caravan.app/share/${content.type}`;

    // Copy link to clipboard
    const handleCopyLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            console.error('Failed to copy');
        }
    }, [shareUrl]);

    // Handle external share
    const handleExternalShare = useCallback((target: ShareTarget) => {
        if (!target.url) return;

        const text = content.description
            ? `${content.title || 'Check this out'} - ${content.description}`
            : content.title || 'Check this out on Caravan!';

        const shareLink = target.id === 'email' || target.id === 'sms'
            ? `${target.url}${encodeURIComponent(`${text}\n\n${shareUrl}`)}`
            : `${target.url}${encodeURIComponent(shareUrl)}`;

        window.open(shareLink, '_blank', 'width=600,height=400');
    }, [content, shareUrl]);

    // Toggle user selection
    const toggleUser = useCallback((userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    }, []);

    // Send to selected users
    const handleSendToUsers = useCallback(async () => {
        if (selectedUsers.length === 0) return;

        setSending(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSending(false);
        setSelectedUsers([]);
        setMessage('');
        onClose();
    }, [selectedUsers, onClose]);

    // Use native share if available
    const handleNativeShare = useCallback(async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: content.title || 'Check this out!',
                    text: content.description,
                    url: shareUrl,
                });
            } catch {
                // User cancelled or share failed
            }
        }
    }, [content, shareUrl]);

    if (!mounted) return null;

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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0f] rounded-t-3xl max-h-[85vh] overflow-hidden"
                    >
                        {/* Handle */}
                        <div className="flex justify-center py-3">
                            <div className="w-10 h-1 bg-white/20 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="px-4 pb-4 border-b border-white/10">
                            <div className="flex items-center gap-4">
                                {content.imageUrl && (
                                    <div className="w-16 h-16 rounded-xl overflow-hidden relative flex-shrink-0">
                                        <Image
                                            src={content.imageUrl}
                                            alt="Share preview"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h2 className="font-semibold text-white truncate">
                                        {content.title || 'Share'}
                                    </h2>
                                    {content.description && (
                                        <p className="text-sm text-white/50 truncate">
                                            {content.description}
                                        </p>
                                    )}
                                    <p className="text-xs text-white/30 truncate mt-1">
                                        {shareUrl}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="overflow-y-auto max-h-[calc(85vh-120px)] scroll-y pb-safe">
                            {/* Quick Share to Friends */}
                            <div className="p-4 border-b border-white/10">
                                <h3 className="text-sm font-medium text-white/70 mb-3">Send to Friends</h3>
                                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 scroll-x">
                                    {QUICK_SHARE_USERS.map((user) => (
                                        <button
                                            key={user.id}
                                            onClick={() => toggleUser(user.id)}
                                            className="flex flex-col items-center gap-2 flex-shrink-0"
                                        >
                                            <div className="relative">
                                                <div className={`w-14 h-14 rounded-full overflow-hidden ring-2 transition-all ${selectedUsers.includes(user.id)
                                                    ? 'ring-orange-400 ring-offset-2 ring-offset-[#0a0a0f]'
                                                    : 'ring-transparent'
                                                    }`}>
                                                    <Image
                                                        src={user.avatar}
                                                        alt={user.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                                {user.isOnline && (
                                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-[#0a0a0f]" />
                                                )}
                                                {selectedUsers.includes(user.id) && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="absolute -top-1 -right-1 w-5 h-5 bg-orange-400 rounded-full flex items-center justify-center"
                                                    >
                                                        <span className="text-[10px]">✓</span>
                                                    </motion.div>
                                                )}
                                            </div>
                                            <span className="text-xs text-white/60 truncate max-w-14">
                                                {user.name.split(' ')[0]}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Message input (when users selected) */}
                                <AnimatePresence>
                                    {selectedUsers.length > 0 && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-3 flex gap-2">
                                                <input
                                                    type="text"
                                                    value={message}
                                                    onChange={(e) => setMessage(e.target.value)}
                                                    placeholder="Add a message..."
                                                    className="flex-1 bg-white/5 rounded-full px-4 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:bg-white/10 transition-colors"
                                                />
                                                <button
                                                    onClick={handleSendToUsers}
                                                    disabled={sending}
                                                    className="px-5 py-2 rounded-full bg-gradient-to-r from-orange-400 via-rose-500 to-violet-500 text-white font-semibold text-sm disabled:opacity-50"
                                                >
                                                    {sending ? (
                                                        <motion.div
                                                            animate={{ rotate: 360 }}
                                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                                                        />
                                                    ) : (
                                                        'Send'
                                                    )}
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Share Targets Grid */}
                            <div className="p-4">
                                <h3 className="text-sm font-medium text-white/70 mb-3">Share to</h3>
                                <div className="grid grid-cols-4 gap-3">
                                    {SHARE_TARGETS.map((target) => (
                                        <button
                                            key={target.id}
                                            onClick={() => {
                                                if (target.action === 'copy') {
                                                    handleCopyLink();
                                                } else if (target.action === 'native') {
                                                    handleNativeShare();
                                                } else {
                                                    handleExternalShare(target);
                                                }
                                            }}
                                            className="flex flex-col items-center gap-2"
                                        >
                                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${target.color} flex items-center justify-center text-xl shadow-lg transition-transform hover:scale-110 active:scale-95`}>
                                                {target.id === 'copy' && copied ? '✓' : target.icon}
                                            </div>
                                            <span className="text-[10px] text-white/60">
                                                {target.id === 'copy' && copied ? 'Copied!' : target.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* More Actions */}
                            <div className="p-4 pt-0">
                                <div className="space-y-2">
                                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                        <span className="text-lg">📌</span>
                                        <span className="text-sm text-white">Save to Collection</span>
                                    </button>
                                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                        <span className="text-lg">🔗</span>
                                        <span className="text-sm text-white">Add to Journey</span>
                                    </button>
                                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                        <span className="text-lg">📤</span>
                                        <span className="text-sm text-white">Post to My Profile</span>
                                    </button>
                                </div>
                            </div>

                            {/* Cancel Button */}
                            <div className="p-4 pt-0">
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/15 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default ShareSheet;
