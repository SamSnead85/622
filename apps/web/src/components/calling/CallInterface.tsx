'use client';

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { CallState } from '@/lib/webrtc/PeerConnection';

interface CallInterfaceProps {
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    callState: CallState;
    isMuted: boolean;
    isVideoOn: boolean;
    isScreenSharing: boolean;
    participantName: string;
    participantAvatar?: string;
    onEndCall: () => void;
    onToggleMute: () => void;
    onToggleVideo: () => void;
    onToggleScreenShare: () => void;
}

export function CallInterface({
    localStream,
    remoteStream,
    callState,
    isMuted,
    isVideoOn,
    isScreenSharing,
    participantName,
    participantAvatar,
    onEndCall,
    onToggleMute,
    onToggleVideo,
    onToggleScreenShare,
}: CallInterfaceProps) {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    // Attach streams to video elements
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    const statusMessages: Record<CallState, string> = {
        idle: '',
        calling: 'Calling...',
        ringing: 'Ringing...',
        connected: '',
        reconnecting: 'Reconnecting...',
        ended: 'Call ended',
    };

    return (
        <motion.div
            className="fixed inset-0 z-50 bg-black flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Remote video / audio display */}
            <div className="flex-1 relative flex items-center justify-center">
                {isVideoOn && remoteStream ? (
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                ) : (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-3xl font-bold">
                            {participantAvatar ? (
                                <img src={participantAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : participantName[0]?.toUpperCase() || '?'}
                        </div>
                        <p className="text-white text-xl font-semibold">{participantName}</p>
                        {statusMessages[callState] && (
                            <motion.p
                                className="text-white/50 text-sm"
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            >
                                {statusMessages[callState]}
                            </motion.p>
                        )}
                    </div>
                )}

                {/* Local video (picture-in-picture) */}
                {isVideoOn && localStream && (
                    <motion.div
                        className="absolute top-4 right-4 w-32 h-44 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl"
                        drag
                        dragConstraints={{ left: -200, right: 0, top: 0, bottom: 300 }}
                    >
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover mirror"
                            style={{ transform: 'scaleX(-1)' }}
                        />
                    </motion.div>
                )}
            </div>

            {/* Controls */}
            <div className="p-6 pb-10">
                <div className="flex items-center justify-center gap-4">
                    {/* Mute */}
                    <button
                        onClick={onToggleMute}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                            isMuted ? 'bg-red-500' : 'bg-white/15 hover:bg-white/25'
                        }`}
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
                            {isMuted ? (
                                <>
                                    <path d="M1 1l22 22" strokeLinecap="round" />
                                    <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
                                    <path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 .76-.12 1.5-.35 2.18" />
                                    <path d="M12 19v4M8 23h8" strokeLinecap="round" />
                                </>
                            ) : (
                                <>
                                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                                    <path d="M19 10v2a7 7 0 01-14 0v-2" />
                                    <path d="M12 19v4M8 23h8" strokeLinecap="round" />
                                </>
                            )}
                        </svg>
                    </button>

                    {/* Video toggle */}
                    <button
                        onClick={onToggleVideo}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                            !isVideoOn ? 'bg-red-500' : 'bg-white/15 hover:bg-white/25'
                        }`}
                        aria-label={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
                    >
                        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
                            {!isVideoOn ? (
                                <>
                                    <path d="M1 1l22 22" strokeLinecap="round" />
                                    <path d="M21 7.5l-5 3.5v-3A2 2 0 0014 6H7.5M2 8v8a2 2 0 002 2h10a2 2 0 002-2v-1.5" />
                                </>
                            ) : (
                                <>
                                    <path d="M23 7l-7 5 7 5V7z" />
                                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                </>
                            )}
                        </svg>
                    </button>

                    {/* Screen share */}
                    <button
                        onClick={onToggleScreenShare}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                            isScreenSharing ? 'bg-[#00D4FF]' : 'bg-white/15 hover:bg-white/25'
                        }`}
                        aria-label={isScreenSharing ? 'Stop screen share' : 'Share screen'}
                    >
                        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={isScreenSharing ? 'black' : 'white'} strokeWidth={2}>
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                            <path d="M8 21h8M12 17v4" strokeLinecap="round" />
                        </svg>
                    </button>

                    {/* End call */}
                    <button
                        onClick={onEndCall}
                        className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
                        aria-label="End call"
                    >
                        <svg width={28} height={28} viewBox="0 0 24 24" fill="white">
                            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
                        </svg>
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
