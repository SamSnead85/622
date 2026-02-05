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

export function GlobalMessageListener() {
    const { on } = useSocket();
    const pathname = usePathname();
    const router = useRouter();
    const [notification, setNotification] = useState<Message | null>(null);

    useEffect(() => {
        const unsub = on<Message>('message:new', (message) => {
            // Check if we are already in the conversation? 
            // If pathname is /messages, we rely on the page UI.
            // If pathname is NOT /messages, show global popup.

            if (!pathname?.startsWith('/messages')) {
                setNotification(message);
                // Auto hide after 6s
                const timer = setTimeout(() => setNotification(null), 6000);

                // Optional: Play Sound
                // const audio = new Audio('/sounds/pop.mp3'); audio.play().catch(() => {});

                return () => clearTimeout(timer);
            }
        });
        return () => unsub?.();
    }, [on, pathname]);

    return (
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
                        className="pointer-events-auto bg-[#0A0A0F]/90 backdrop-blur-xl border border-[#00D4FF]/30 rounded-2xl p-4 shadow-[0_0_30px_rgba(0,212,255,0.15)] flex items-center gap-4 cursor-pointer hover:scale-105 transition-transform w-[90%] max-w-md ring-1 ring-white/10"
                        onClick={() => {
                            router.push('/messages');
                            setNotification(null);
                        }}
                    >
                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex-shrink-0 border-2 border-black">
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
                                <span className="text-[10px] font-bold text-[#00D4FF] uppercase tracking-wider bg-[#00D4FF]/10 px-1.5 py-0.5 rounded">New Message</span>
                            </div>
                            <p className="text-white/80 truncate text-sm font-medium">{notification.content}</p>
                            <p className="text-white/40 text-xs mt-1">Tap to reply</p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
