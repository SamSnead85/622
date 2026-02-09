'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    sender: {
        username: string;
        displayName: string;
        avatarUrl?: string;
    };
    content: string;
}

interface IncomingNotification {
    id: string;
    type: string;
    message: string;
    actorId: string;
    actor?: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
    };
    targetId?: string;
    targetType?: string;
    createdAt: string;
}

export function GlobalMessageListener() {
    const { on } = useSocket();
    const pathname = usePathname();
    const router = useRouter();
    const [notification, setNotification] = useState<Message | null>(null);
    const [liveInvite, setLiveInvite] = useState<IncomingNotification | null>(null);

    // Listen for new DMs
    useEffect(() => {
        const unsub = on<Message>('message:new', (message) => {
            if (!pathname?.startsWith('/messages')) {
                setNotification(message);
                const timer = setTimeout(() => setNotification(null), 6000);
                return () => clearTimeout(timer);
            }
        });
        return () => unsub?.();
    }, [on, pathname]);

    // Listen for real-time notifications (live invites, waves, etc.)
    useEffect(() => {
        const unsub = on<IncomingNotification>('notification:new', (notif) => {
            // Show prominent banner for livestream invites
            if (notif.type === 'WAVE' && notif.targetType === 'LIVESTREAM') {
                setLiveInvite(notif);
                const timer = setTimeout(() => setLiveInvite(null), 15000); // 15s for live invites
                return () => clearTimeout(timer);
            }
        });
        return () => unsub?.();
    }, [on]);

    return (
        <>
            {/* ============================== */}
            {/* LIVE STREAM INVITE BANNER       */}
            {/* ============================== */}
            <AnimatePresence>
                {liveInvite && (
                    <motion.div
                        key="live-invite"
                        initial={{ y: -120, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -120, opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 300, damping: 22 }}
                        className="fixed top-4 left-0 right-0 z-[200] flex justify-center pointer-events-none"
                    >
                        <div className="pointer-events-auto bg-gradient-to-r from-rose-500/20 via-[#0A0A0F]/95 to-orange-500/20 backdrop-blur-xl border border-rose-500/40 rounded-2xl p-4 shadow-[0_0_40px_rgba(244,63,94,0.25)] w-[92%] max-w-md ring-1 ring-rose-400/20">
                            {/* Pulsing LIVE indicator */}
                            <div className="flex items-center gap-2 mb-3">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                                </span>
                                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Live Invite</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-rose-500 to-orange-500 flex-shrink-0 border-2 border-rose-500/50">
                                    {liveInvite.actor?.avatarUrl ? (
                                        <Image src={liveInvite.actor.avatarUrl} alt="" fill className="object-cover" />
                                    ) : (
                                        <span className="flex items-center justify-center w-full h-full text-white font-bold text-lg">
                                            {liveInvite.actor?.displayName?.[0] || '?'}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-white text-sm">
                                        {liveInvite.actor?.displayName || 'Someone'}
                                    </h4>
                                    <p className="text-white/70 text-xs truncate">{liveInvite.message}</p>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={() => {
                                        if (liveInvite.targetId) {
                                            router.push(`/campfire/watch/${liveInvite.targetId}`);
                                        } else {
                                            router.push('/campfire');
                                        }
                                        setLiveInvite(null);
                                    }}
                                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white text-sm font-bold hover:opacity-90 transition-opacity active:scale-95"
                                >
                                    Join Now
                                </button>
                                <button
                                    onClick={() => setLiveInvite(null)}
                                    className="px-4 py-2.5 rounded-xl bg-white/10 text-white/70 text-sm font-medium hover:bg-white/15 transition-colors active:scale-95"
                                >
                                    Later
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ============================== */}
            {/* NEW MESSAGE POPUP               */}
            {/* ============================== */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        key="notification-popup"
                        initial={{ y: -100, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -100, opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="fixed top-6 left-0 right-0 z-[100] flex justify-center pointer-events-none"
                    >
                        <div
                            className="pointer-events-auto bg-[#0A0A0F]/90 backdrop-blur-xl border border-[#D4AF37]/30 rounded-2xl p-4 shadow-[0_0_30px_rgba(0,212,255,0.15)] flex items-center gap-4 cursor-pointer hover:scale-105 transition-transform w-[90%] max-w-md ring-1 ring-white/10"
                            onClick={() => {
                                router.push('/messages');
                                setNotification(null);
                            }}
                        >
                            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-[#D4AF37] to-[#B8942D] flex-shrink-0 border-2 border-black">
                                {notification.sender.avatarUrl ? (
                                    <Image src={notification.sender.avatarUrl} alt="" fill className="object-cover" />
                                ) : (
                                    <span className="flex items-center justify-center w-full h-full text-white font-bold text-lg">
                                        {notification.sender.displayName?.[0] || '?'}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <h4 className="font-bold text-white text-sm truncate">{notification.sender.displayName}</h4>
                                    <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider bg-[#D4AF37]/10 px-1.5 py-0.5 rounded">New Message</span>
                                </div>
                                <p className="text-white/80 truncate text-sm font-medium">{notification.content}</p>
                                <p className="text-white/40 text-xs mt-1">Tap to reply</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
