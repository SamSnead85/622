'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface IncomingCallOverlayProps {
    isVisible: boolean;
    callerName: string;
    callerAvatar?: string;
    callType: 'audio' | 'video';
    onAcceptAudio: () => void;
    onAcceptVideo: () => void;
    onReject: () => void;
}

export function IncomingCallOverlay({
    isVisible,
    callerName,
    callerAvatar,
    callType,
    onAcceptAudio,
    onAcceptVideo,
    onReject,
}: IncomingCallOverlayProps) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xl flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="flex flex-col items-center gap-6 p-8"
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                    >
                        {/* Ringing animation */}
                        <div className="relative">
                            <motion.div
                                className="absolute inset-0 rounded-full bg-[#7C8FFF]/20"
                                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            />
                            <motion.div
                                className="absolute inset-0 rounded-full bg-[#7C8FFF]/10"
                                animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
                                transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                            />
                            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#7C8FFF] to-[#6070EE] flex items-center justify-center text-4xl font-bold relative z-10">
                                {callerAvatar ? (
                                    <img src={callerAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : callerName[0]?.toUpperCase() || '?'}
                            </div>
                        </div>

                        <div className="text-center">
                            <h2 className="text-white text-2xl font-bold">{callerName}</h2>
                            <motion.p
                                className="text-white/50 text-sm mt-1"
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            >
                                Incoming {callType} call...
                            </motion.p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-6 mt-4">
                            {/* Reject */}
                            <button
                                onClick={onReject}
                                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
                                aria-label="Decline call"
                            >
                                <svg width={28} height={28} viewBox="0 0 24 24" fill="white">
                                    <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
                                </svg>
                            </button>

                            {/* Accept audio */}
                            <button
                                onClick={onAcceptAudio}
                                className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center hover:bg-emerald-600 transition-colors"
                                aria-label="Accept audio call"
                            >
                                <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
                                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                                </svg>
                            </button>

                            {/* Accept video (if video call) */}
                            {callType === 'video' && (
                                <button
                                    onClick={onAcceptVideo}
                                    className="w-16 h-16 rounded-full bg-[#7C8FFF] flex items-center justify-center hover:opacity-90 transition-opacity"
                                    aria-label="Accept video call"
                                >
                                    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
                                        <path d="M23 7l-7 5 7 5V7z" />
                                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
