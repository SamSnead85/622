'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

/**
 * QuickCompose - Floating action button for quick content creation
 * Appears on mobile and provides quick access to create content
 */
export function QuickCompose() {
    const [isOpen, setIsOpen] = useState(false);

    const actions = [
        { id: 'post', icon: '📝', label: 'New Post', href: '/create?type=post', color: 'from-orange-500 to-rose-500' },
        { id: 'moment', icon: '✨', label: 'Moment', href: '/create?type=moment', color: 'from-purple-500 to-violet-500' },
        { id: 'message', icon: '💬', label: 'Message', href: '/messages', color: 'from-cyan-500 to-blue-500' },
        { id: 'live', icon: '🔴', label: 'Go Live', href: '/campfire/go-live', color: 'from-red-500 to-pink-500' },
    ];

    return (
        <>
            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setIsOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Action buttons */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed bottom-24 right-4 z-50 lg:hidden flex flex-col-reverse gap-3 items-end">
                        {actions.map((action, i) => (
                            <motion.div
                                key={action.id}
                                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center gap-3"
                            >
                                <span className="px-3 py-1.5 rounded-full bg-black/80 text-white text-sm">
                                    {action.label}
                                </span>
                                <Link
                                    href={action.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`w-12 h-12 rounded-full bg-gradient-to-r ${action.color} flex items-center justify-center text-xl shadow-lg`}
                                >
                                    {action.icon}
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* Main FAB */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-20 right-4 z-50 lg:hidden w-14 h-14 rounded-full bg-gradient-to-r from-orange-400 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/25"
                whileTap={{ scale: 0.9 }}
                animate={{ rotate: isOpen ? 45 : 0 }}
            >
                <span className="text-white text-2xl">+</span>
            </motion.button>
        </>
    );
}

export default QuickCompose;
