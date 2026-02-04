'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

// ============================================
// UNIQUE MESSAGING INNOVATIONS
// Features that differentiate 0G messaging
// ============================================

// ============================================
// WHISPER MODE - Self-destructing messages
// ============================================
interface WhisperSettings {
    enabled: boolean;
    duration: number; // seconds
    preventScreenshot: boolean;
    notifyOnView: boolean;
}

export function WhisperModeToggle({
    settings,
    onChange
}: {
    settings: WhisperSettings;
    onChange: (settings: WhisperSettings) => void;
}) {
    const durations = [
        { value: 5, label: '5s' },
        { value: 10, label: '10s' },
        { value: 30, label: '30s' },
        { value: 60, label: '1m' },
        { value: 300, label: '5m' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-2xl p-4 border border-violet-500/20"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">👻</span>
                    <div>
                        <h3 className="font-semibold text-white">Whisper Mode</h3>
                        <p className="text-xs text-white/50">Messages disappear after viewing</p>
                    </div>
                </div>
                <button
                    onClick={() => onChange({ ...settings, enabled: !settings.enabled })}
                    className={`w-12 h-7 rounded-full p-1 transition-colors ${settings.enabled ? 'bg-violet-500' : 'bg-white/20'
                        }`}
                >
                    <motion.div
                        className="w-5 h-5 rounded-full bg-white shadow-lg"
                        animate={{ x: settings.enabled ? 20 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                </button>
            </div>

            {settings.enabled && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4"
                >
                    {/* Duration selector */}
                    <div>
                        <p className="text-xs text-white/40 mb-2">Disappear after</p>
                        <div className="flex gap-2">
                            {durations.map((d) => (
                                <button
                                    key={d.value}
                                    onClick={() => onChange({ ...settings, duration: d.value })}
                                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${settings.duration === d.value
                                            ? 'bg-violet-500 text-white'
                                            : 'bg-white/10 text-white/60 hover:bg-white/15'
                                        }`}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Extra options */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.preventScreenshot}
                                onChange={(e) => onChange({ ...settings, preventScreenshot: e.target.checked })}
                                className="sr-only"
                            />
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${settings.preventScreenshot ? 'bg-violet-500 border-violet-500' : 'border-white/20'
                                }`}>
                                {settings.preventScreenshot && <span className="text-white text-xs">✓</span>}
                            </div>
                            <span className="text-sm text-white/70">Notify if screenshot attempted</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.notifyOnView}
                                onChange={(e) => onChange({ ...settings, notifyOnView: e.target.checked })}
                                className="sr-only"
                            />
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${settings.notifyOnView ? 'bg-violet-500 border-violet-500' : 'border-white/20'
                                }`}>
                                {settings.notifyOnView && <span className="text-white text-xs">✓</span>}
                            </div>
                            <span className="text-sm text-white/70">Notify when message is viewed</span>
                        </label>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

// ============================================
// SCHEDULED MESSAGE
// ============================================
interface ScheduledMessage {
    content: string;
    scheduledFor: Date;
    timezone: string;
}

export function ScheduleMessagePicker({
    onSchedule,
    onCancel
}: {
    onSchedule: (message: ScheduledMessage) => void;
    onCancel: () => void;
}) {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [content, setContent] = useState('');

    const quickOptions = [
        { label: 'Tomorrow 9am', hours: 24 + 9 },
        { label: 'In 1 hour', hours: 1 },
        { label: 'In 4 hours', hours: 4 },
        { label: 'Next Monday', hours: 168 }, // Simplified
    ];

    const setQuickTime = (hoursFromNow: number) => {
        const scheduled = new Date();
        scheduled.setHours(scheduled.getHours() + hoursFromNow);
        setDate(scheduled.toISOString().split('T')[0]);
        setTime(scheduled.toTimeString().slice(0, 5));
    };

    const handleSchedule = () => {
        if (!date || !time || !content.trim()) return;
        onSchedule({
            content: content.trim(),
            scheduledFor: new Date(`${date}T${time}`),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#0A0A0F] rounded-3xl border border-white/10 p-6 max-w-sm"
        >
            <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">⏰</span>
                <div>
                    <h3 className="font-semibold text-white">Schedule Message</h3>
                    <p className="text-xs text-white/50">Send later, at the perfect time</p>
                </div>
            </div>

            {/* Quick options */}
            <div className="flex flex-wrap gap-2 mb-4">
                {quickOptions.map((option) => (
                    <button
                        key={option.label}
                        onClick={() => setQuickTime(option.hours)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 text-xs hover:bg-white/10 transition-colors"
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {/* Date/Time inputs */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500"
                />
                <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500"
                />
            </div>

            {/* Message content */}
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your message..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm resize-none h-24 focus:outline-none focus:border-violet-500 mb-4"
            />

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    onClick={onCancel}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSchedule}
                    disabled={!date || !time || !content.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                    Schedule
                </button>
            </div>
        </motion.div>
    );
}

// ============================================
// MESSAGE MOOD INDICATOR
// ============================================
const MOODS = [
    { id: 'calm', emoji: '😌', label: 'Calm', color: 'from-cyan-400 to-blue-500' },
    { id: 'excited', emoji: '🤩', label: 'Excited', color: 'from-yellow-400 to-orange-500' },
    { id: 'thoughtful', emoji: '🤔', label: 'Thoughtful', color: 'from-violet-400 to-purple-500' },
    { id: 'loving', emoji: '🥰', label: 'Loving', color: 'from-pink-400 to-rose-500' },
    { id: 'serious', emoji: '😐', label: 'Serious', color: 'from-gray-400 to-gray-600' },
    { id: 'playful', emoji: '😜', label: 'Playful', color: 'from-green-400 to-emerald-500' },
];

export function MoodSelector({
    selectedMood,
    onSelect
}: {
    selectedMood: string | null;
    onSelect: (moodId: string | null) => void;
}) {
    return (
        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-2xl">
            {MOODS.map((mood) => (
                <motion.button
                    key={mood.id}
                    onClick={() => onSelect(selectedMood === mood.id ? null : mood.id)}
                    className={`relative p-2 rounded-xl transition-colors ${selectedMood === mood.id
                            ? 'bg-white/10'
                            : 'hover:bg-white/5'
                        }`}
                    whileTap={{ scale: 0.9 }}
                    title={mood.label}
                >
                    <span className="text-lg">{mood.emoji}</span>
                    {selectedMood === mood.id && (
                        <motion.div
                            layoutId="mood-indicator"
                            className={`absolute inset-0 rounded-xl bg-gradient-to-r ${mood.color} opacity-20`}
                        />
                    )}
                </motion.button>
            ))}
        </div>
    );
}

export function MoodBadge({ moodId }: { moodId: string }) {
    const mood = MOODS.find(m => m.id === moodId);
    if (!mood) return null;

    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-gradient-to-r ${mood.color} text-white`}
        >
            {mood.emoji} {mood.label}
        </span>
    );
}

// ============================================
// ENHANCED VOICE BUBBLE
// ============================================
export function VoiceBubble({
    duration,
    waveform,
    isPlaying,
    progress,
    onPlayPause,
    sender = 'them'
}: {
    duration: number;
    waveform?: number[];
    isPlaying: boolean;
    progress: number;
    onPlayPause: () => void;
    sender?: 'me' | 'them';
}) {
    // Generate fake waveform if not provided
    const wave = waveform || Array.from({ length: 30 }, () => Math.random() * 0.8 + 0.2);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`flex items-center gap-3 p-3 rounded-2xl ${sender === 'me'
                ? 'bg-gradient-to-r from-violet-500/20 to-cyan-500/20'
                : 'bg-white/5'
            }`}>
            {/* Play button */}
            <motion.button
                onClick={onPlayPause}
                className={`w-10 h-10 rounded-full flex items-center justify-center ${sender === 'me' ? 'bg-white/20' : 'bg-white/10'
                    }`}
                whileTap={{ scale: 0.9 }}
            >
                {isPlaying ? (
                    <span className="text-white">⏸</span>
                ) : (
                    <span className="text-white ml-0.5">▶</span>
                )}
            </motion.button>

            {/* Waveform */}
            <div className="flex-1 flex items-center gap-0.5 h-8">
                {wave.map((height, i) => {
                    const playedPercent = (progress / 100) * wave.length;
                    const isPlayed = i < playedPercent;

                    return (
                        <motion.div
                            key={i}
                            className={`w-1 rounded-full transition-colors ${isPlayed
                                    ? sender === 'me' ? 'bg-white' : 'bg-violet-400'
                                    : 'bg-white/30'
                                }`}
                            style={{ height: `${height * 100}%` }}
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ delay: i * 0.02 }}
                        />
                    );
                })}
            </div>

            {/* Duration */}
            <span className="text-xs text-white/60 min-w-[35px]">
                {formatTime(isPlaying ? (progress / 100) * duration : duration)}
            </span>
        </div>
    );
}

// ============================================
// READ RECEIPTS INDICATOR
// ============================================
export function ReadReceipts({
    status,
    timestamp,
    readers
}: {
    status: 'sending' | 'sent' | 'delivered' | 'read';
    timestamp?: Date;
    readers?: { name: string; avatar?: string }[];
}) {
    const statusIcons: Record<string, string> = {
        sending: '○',
        sent: '✓',
        delivered: '✓✓',
        read: '✓✓',
    };

    const statusColors: Record<string, string> = {
        sending: 'text-white/30',
        sent: 'text-white/50',
        delivered: 'text-white/50',
        read: 'text-cyan-400',
    };

    return (
        <div className="flex items-center gap-2">
            {timestamp && (
                <span className="text-[10px] text-white/40">
                    {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            )}
            <span className={`text-xs ${statusColors[status]}`}>
                {statusIcons[status]}
            </span>
            {status === 'read' && readers && readers.length > 0 && (
                <div className="flex -space-x-1">
                    {readers.slice(0, 3).map((reader, i) => (
                        <div
                            key={i}
                            className="w-4 h-4 rounded-full bg-gradient-to-br from-violet-400 to-cyan-500 border border-[#0A0A0F] flex items-center justify-center"
                            title={reader.name}
                        >
                            {reader.avatar ? (
                                <img src={reader.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <span className="text-[8px] text-white">{reader.name[0]}</span>
                            )}
                        </div>
                    ))}
                    {readers.length > 3 && (
                        <span className="text-[10px] text-white/40 ml-1">+{readers.length - 3}</span>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================
// MESSAGE REACTIONS PICKER (Enhanced)
// ============================================
const MESSAGE_REACTIONS = [
    { emoji: '❤️', label: 'Love' },
    { emoji: '😂', label: 'Haha' },
    { emoji: '😮', label: 'Wow' },
    { emoji: '😢', label: 'Sad' },
    { emoji: '🔥', label: 'Fire' },
    { emoji: '👏', label: 'Clap' },
    { emoji: '💯', label: 'Perfect' },
    { emoji: '🙏', label: 'Thanks' },
];

export function MessageReactionPicker({
    onSelect,
    onClose,
    position = 'top'
}: {
    onSelect: (emoji: string) => void;
    onClose: () => void;
    position?: 'top' | 'bottom';
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, y: position === 'top' ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 flex gap-1 p-2 bg-[#1a1a1f] rounded-full border border-white/10 shadow-xl z-50`}
        >
            {MESSAGE_REACTIONS.map((reaction) => (
                <motion.button
                    key={reaction.emoji}
                    onClick={() => {
                        onSelect(reaction.emoji);
                        onClose();
                    }}
                    className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    title={reaction.label}
                >
                    <span className="text-lg">{reaction.emoji}</span>
                </motion.button>
            ))}
        </motion.div>
    );
}

// ============================================
// REPLY PREVIEW
// ============================================
export function ReplyPreview({
    originalMessage,
    originalSender,
    onClear
}: {
    originalMessage: string;
    originalSender: string;
    onClear: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-3 px-4 py-2 bg-white/5 border-l-2 border-violet-500 rounded-lg"
        >
            <div className="flex-1 min-w-0">
                <p className="text-xs text-violet-400 font-medium">Replying to {originalSender}</p>
                <p className="text-sm text-white/50 truncate">{originalMessage}</p>
            </div>
            <button
                onClick={onClear}
                className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/20 transition-colors"
            >
                ✕
            </button>
        </motion.div>
    );
}

export default {
    WhisperModeToggle,
    ScheduleMessagePicker,
    MoodSelector,
    MoodBadge,
    VoiceBubble,
    ReadReceipts,
    MessageReactionPicker,
    ReplyPreview,
};
