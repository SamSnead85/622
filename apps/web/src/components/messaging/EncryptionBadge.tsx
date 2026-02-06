'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EncryptionBadgeProps {
    isEncrypted: boolean;
    ownFingerprint?: string;
    theirFingerprint?: string;
    compact?: boolean;
}

export function EncryptionBadge({ isEncrypted, ownFingerprint, theirFingerprint, compact = false }: EncryptionBadgeProps) {
    const [showDetails, setShowDetails] = useState(false);

    if (!isEncrypted) return null;

    return (
        <>
            <button
                onClick={() => setShowDetails(true)}
                className={`flex items-center gap-1.5 ${compact ? 'text-xs' : 'text-sm'} text-emerald-400 hover:text-emerald-300 transition-colors`}
                aria-label="End-to-end encrypted. Click for details."
            >
                <svg width={compact ? 12 : 14} height={compact ? 12 : 14} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
                </svg>
                {!compact && <span>End-to-end encrypted</span>}
            </button>

            <AnimatePresence>
                {showDetails && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowDetails(false)}
                    >
                        <motion.div
                            className="bg-[#12121A] border border-white/10 rounded-2xl p-6 max-w-md w-full"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <svg width={20} height={20} viewBox="0 0 24 24" fill="#10b981">
                                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold">End-to-End Encrypted</h3>
                                    <p className="text-white/50 text-sm">Messages are encrypted on your device</p>
                                </div>
                            </div>

                            <p className="text-white/60 text-sm mb-4 leading-relaxed">
                                Messages in this conversation are secured with end-to-end encryption.
                                Only you and the other participants can read them. Not even ZeroG can access
                                your messages.
                            </p>

                            {(ownFingerprint || theirFingerprint) && (
                                <div className="space-y-3">
                                    <p className="text-white/40 text-xs uppercase tracking-wider">Safety Numbers</p>
                                    {ownFingerprint && (
                                        <div className="bg-white/5 rounded-lg p-3">
                                            <p className="text-white/40 text-xs mb-1">Your fingerprint</p>
                                            <p className="text-white font-mono text-xs leading-relaxed whitespace-pre-wrap">{ownFingerprint}</p>
                                        </div>
                                    )}
                                    {theirFingerprint && (
                                        <div className="bg-white/5 rounded-lg p-3">
                                            <p className="text-white/40 text-xs mb-1">Their fingerprint</p>
                                            <p className="text-white font-mono text-xs leading-relaxed whitespace-pre-wrap">{theirFingerprint}</p>
                                        </div>
                                    )}
                                    <p className="text-white/30 text-xs">
                                        Compare these numbers with the other person to verify the encryption.
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => setShowDetails(false)}
                                className="w-full mt-4 py-2.5 rounded-xl bg-white/10 text-white font-medium text-sm hover:bg-white/15 transition-colors"
                            >
                                Close
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
