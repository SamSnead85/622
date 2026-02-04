'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon, MicrophoneIcon, HandIcon } from '@/components/icons';

// ============================================
// TYPES
// ============================================

export interface AudioSpace {
    id: string;
    title: string;
    description?: string;
    hostId: string;
    hostName: string;
    hostAvatar?: string;
    coHosts: { id: string; name: string; avatar?: string }[];
    speakers: Participant[];
    listeners: Participant[];
    topics: string[];
    isLive: boolean;
    isRecording: boolean;
    scheduledAt?: Date;
    startedAt?: Date;
    maxSpeakers: number;
}

export interface Participant {
    id: string;
    name: string;
    avatar?: string;
    role: 'host' | 'cohost' | 'speaker' | 'listener';
    isMuted: boolean;
    isSpeaking: boolean;
    raisedHand: boolean;
}

// ============================================
// SPEAKER AVATAR
// ============================================

interface SpeakerAvatarProps {
    participant: Participant;
    size?: 'sm' | 'md' | 'lg';
    onClick?: () => void;
}

export function SpeakerAvatar({ participant, size = 'md', onClick }: SpeakerAvatarProps) {
    const sizeClasses = { sm: 'w-12 h-12', md: 'w-16 h-16', lg: 'w-20 h-20' };
    const ringColor = participant.isSpeaking ? 'ring-green-500' : 'ring-transparent';

    return (
        <button onClick={onClick} className="flex flex-col items-center gap-1 group">
            <div className={`relative ${sizeClasses[size]} rounded-full ring-2 ${ringColor} transition-all`}>
                <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium overflow-hidden">
                    {participant.avatar ? <img src={participant.avatar} alt="" className="w-full h-full object-cover" /> : participant.name[0]}
                </div>
                {participant.isMuted && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                        <span className="text-xs">🔇</span>
                    </div>
                )}
                {participant.raisedHand && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center animate-bounce">
                        <span className="text-xs">✋</span>
                    </div>
                )}
                {participant.role === 'host' && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-purple-500 text-[8px] text-white font-bold">HOST</div>
                )}
            </div>
            <span className="text-xs text-white/60 truncate max-w-[60px] group-hover:text-white">{participant.name.split(' ')[0]}</span>
        </button>
    );
}

// ============================================
// AUDIO SPACE CARD
// ============================================

interface AudioSpaceCardProps {
    space: AudioSpace;
    onJoin: (id: string) => void;
}

export function AudioSpaceCard({ space, onJoin }: AudioSpaceCardProps) {
    const totalListeners = space.speakers.length + space.listeners.length;

    return (
        <motion.div whileHover={{ scale: 1.02 }} onClick={() => onJoin(space.id)}
            className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 cursor-pointer">
            {space.isLive && <span className="inline-block px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-medium mb-2 animate-pulse">🔴 LIVE</span>}
            <h3 className="font-semibold text-white line-clamp-2">{space.title}</h3>
            <p className="text-sm text-white/50 mt-1">Hosted by {space.hostName}</p>

            <div className="flex items-center gap-2 mt-4">
                <div className="flex -space-x-3">
                    {space.speakers.slice(0, 4).map((s, i) => (
                        <div key={s.id} className="w-8 h-8 rounded-full ring-2 ring-[#0A0A0F] bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs" style={{ zIndex: 4 - i }}>
                            {s.avatar ? <img src={s.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : s.name[0]}
                        </div>
                    ))}
                </div>
                <span className="text-sm text-white/40">{totalListeners} listening</span>
            </div>

            <div className="flex gap-2 mt-3">
                {space.topics.slice(0, 3).map(t => (
                    <span key={t} className="px-2 py-1 rounded-full bg-white/5 text-white/50 text-xs">#{t}</span>
                ))}
            </div>
        </motion.div>
    );
}

// ============================================
// AUDIO SPACE STAGE
// ============================================

interface AudioSpaceStageProps {
    space: AudioSpace;
    currentUserId: string;
    onLeave: () => void;
    onMuteToggle: () => void;
    onRaiseHand: () => void;
    onInviteSpeaker?: (userId: string) => void;
    onRemoveSpeaker?: (userId: string) => void;
}

export function AudioSpaceStage({ space, currentUserId, onLeave, onMuteToggle, onRaiseHand, onInviteSpeaker, onRemoveSpeaker }: AudioSpaceStageProps) {
    const currentUser = [...space.speakers, ...space.listeners].find(p => p.id === currentUserId);
    const isHost = space.hostId === currentUserId;
    const isSpeaker = currentUser?.role === 'speaker' || currentUser?.role === 'host' || currentUser?.role === 'cohost';

    return (
        <div className="fixed inset-0 z-50 bg-[#0A0A0F] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div>
                    <h2 className="font-semibold text-white">{space.title}</h2>
                    <p className="text-sm text-white/50">{space.speakers.length + space.listeners.length} in room</p>
                </div>
                <button onClick={onLeave} className="p-2 rounded-lg hover:bg-white/10"><CloseIcon size={24} className="text-white" /></button>
            </div>

            {/* Speakers Stage */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-6">
                    <h3 className="text-sm text-white/40 mb-4">Speakers</h3>
                    <div className="flex flex-wrap gap-6">
                        {space.speakers.map(s => <SpeakerAvatar key={s.id} participant={s} size="lg" />)}
                    </div>
                </div>

                {space.listeners.length > 0 && (
                    <div>
                        <h3 className="text-sm text-white/40 mb-4">Listeners</h3>
                        <div className="flex flex-wrap gap-4">
                            {space.listeners.map(l => <SpeakerAvatar key={l.id} participant={l} size="sm" onClick={() => isHost && onInviteSpeaker?.(l.id)} />)}
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-center gap-4">
                {isSpeaker ? (
                    <button onClick={onMuteToggle}
                        className={`w-14 h-14 rounded-full flex items-center justify-center ${currentUser?.isMuted ? 'bg-red-500' : 'bg-white/10'}`}>
                        <MicrophoneIcon size={24} className="text-white" />
                    </button>
                ) : (
                    <button onClick={onRaiseHand}
                        className={`w-14 h-14 rounded-full flex items-center justify-center ${currentUser?.raisedHand ? 'bg-yellow-500' : 'bg-white/10'}`}>
                        <span className="text-2xl">✋</span>
                    </button>
                )}
                <button onClick={onLeave} className="px-6 py-3 rounded-full bg-red-500/20 text-red-400 font-medium">Leave Room</button>
            </div>
        </div>
    );
}

export default AudioSpaceCard;
