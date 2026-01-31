'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

// ============================================
// PROFESSIONAL SVG ICONS
// ============================================
const Icons = {
    family: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
    ),
    friends: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
    ),
    community: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
    ),
    photo: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
    ),
    video: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125-.504-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125m1.5 3.75c-.621 0-1.125-.504-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125m0 3.75h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125" />
        </svg>
    ),
    live: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
        </svg>
    ),
    morning: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
    ),
    realtime: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
    ),
    inspiring: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
    ),
    learning: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
        </svg>
    ),
    shield: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
    ),
    device: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
        </svg>
    ),
    cloud: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
        </svg>
    ),
    sync: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
    ),
    lock: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
    ),
    sliders: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
    ),
    check: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
    ),
    home: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
    ),
    search: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
    ),
    map: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
        </svg>
    ),
    flame: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        </svg>
    ),
    user: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
    ),
};

// ============================================
// YOUR ALGORITHM - You Own It
// ============================================

interface AlgorithmWeight {
    id: string;
    name: string;
    icon: keyof typeof Icons;
    weight: number;
    description: string;
    category: 'content' | 'people' | 'time' | 'mood';
}

const defaultWeights: AlgorithmWeight[] = [
    { id: 'family', name: 'Family First', icon: 'family', weight: 80, description: 'Prioritize content from family members', category: 'people' },
    { id: 'close-friends', name: 'Close Friends', icon: 'friends', weight: 70, description: 'Content from your inner circle', category: 'people' },
    { id: 'communities', name: 'My Tribes', icon: 'community', weight: 60, description: 'Posts from groups you manage', category: 'people' },
    { id: 'photos', name: 'Photos & Memories', icon: 'photo', weight: 75, description: 'Visual content preference', category: 'content' },
    { id: 'videos', name: 'Videos & Journeys', icon: 'video', weight: 50, description: 'Video content in your feed', category: 'content' },
    { id: 'live', name: 'Live Campfires', icon: 'live', weight: 40, description: 'Live streaming notifications', category: 'content' },
    { id: 'morning', name: 'Morning Digest', icon: 'morning', weight: 60, description: 'Catch up on overnight moments', category: 'time' },
    { id: 'realtime', name: 'Real-time Updates', icon: 'realtime', weight: 30, description: 'Instant new post notifications', category: 'time' },
    { id: 'inspiring', name: 'Inspiring Content', icon: 'inspiring', weight: 55, description: 'Uplifting and positive posts', category: 'mood' },
    { id: 'educational', name: 'Learning & Growth', icon: 'learning', weight: 45, description: 'Educational content', category: 'mood' },
];

function WeightSlider({
    weight,
    onChange,
    color = 'from-orange-400 to-rose-500'
}: {
    weight: AlgorithmWeight;
    onChange: (value: number) => void;
    color?: string;
}) {
    return (
        <motion.div
            className="bg-white/5 rounded-2xl p-4 border border-white/10"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.01, borderColor: 'rgba(255,255,255,0.2)' }}
        >
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/80">
                    {Icons[weight.icon]}
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-white">{weight.name}</h4>
                        <span className="text-sm font-medium text-white/80">{weight.weight}%</span>
                    </div>
                    <p className="text-xs text-white/40">{weight.description}</p>
                </div>
            </div>
            <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                    className={`absolute left-0 top-0 h-full bg-gradient-to-r ${color} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${weight.weight}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                />
            </div>
            <input
                type="range"
                min="0"
                max="100"
                value={weight.weight}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="w-full h-2 mt-2 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg"
            />
        </motion.div>
    );
}

function DataStorageSection() {
    const [storageOption, setStorageOption] = useState<'local' | 'cloud' | 'hybrid'>('hybrid');

    const options = [
        {
            id: 'local' as const,
            icon: 'device' as const,
            title: 'Your Device Only',
            desc: 'Data stays on your device. Maximum privacy. You control everything.',
            color: 'from-emerald-400 to-cyan-500'
        },
        {
            id: 'cloud' as const,
            icon: 'cloud' as const,
            title: 'Six22 Cloud',
            desc: 'Encrypted storage on our servers. Access from anywhere.',
            color: 'from-violet-400 to-purple-500'
        },
        {
            id: 'hybrid' as const,
            icon: 'sync' as const,
            title: 'Smart Hybrid',
            desc: 'Best of both. Local-first with cloud backup. Your choice.',
            color: 'from-orange-400 to-rose-500'
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center text-cyan-400">
                    {Icons.lock}
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">Your Data, Your Rules</h3>
                    <p className="text-sm text-white/50">Choose where your data lives</p>
                </div>
            </div>

            <div className="grid gap-3">
                {options.map((option) => (
                    <motion.button
                        key={option.id}
                        onClick={() => setStorageOption(option.id)}
                        className={`relative p-4 rounded-2xl border text-left transition-all ${storageOption === option.id
                                ? 'bg-white/10 border-white/20'
                                : 'bg-white/5 border-white/10 hover:bg-white/[0.07]'
                            }`}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/80">
                                {Icons[option.icon]}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-white">{option.title}</h4>
                                <p className="text-sm text-white/50">{option.desc}</p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${storageOption === option.id ? 'border-white bg-white' : 'border-white/30'
                                }`}>
                                {storageOption === option.id && (
                                    <motion.div
                                        className="w-2 h-2 rounded-full bg-[#050508]"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                    />
                                )}
                            </div>
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}

function AlgorithmPresets() {
    const presets = [
        { id: 'family', name: 'Family Focus', icon: 'family' as const, desc: 'Prioritize family above all' },
        { id: 'friends', name: 'Friend Zone', icon: 'friends' as const, desc: 'Maximize friend interactions' },
        { id: 'quiet', name: 'Quiet Mode', icon: 'shield' as const, desc: 'Minimal, intentional feed' },
        { id: 'discovery', name: 'Explorer', icon: 'map' as const, desc: 'Discover new connections' },
        { id: 'custom', name: 'My Recipe', icon: 'sliders' as const, desc: 'Your custom algorithm' },
    ];

    const [activePreset, setActivePreset] = useState('family');

    return (
        <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Presets</h3>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {presets.map((preset) => (
                    <motion.button
                        key={preset.id}
                        onClick={() => setActivePreset(preset.id)}
                        className={`flex items-center gap-2 flex-shrink-0 px-4 py-3 rounded-2xl border transition-all ${activePreset === preset.id
                                ? 'bg-gradient-to-r from-orange-400 to-rose-500 border-transparent text-white'
                                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                            }`}
                        whileTap={{ scale: 0.95 }}
                    >
                        <span className="w-5 h-5">{Icons[preset.icon]}</span>
                        <span className="text-sm font-medium">{preset.name}</span>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}

// Navigation component
function Navigation() {
    return (
        <>
            {/* Desktop Sidebar */}
            <nav className="hidden md:flex fixed left-0 top-0 h-full w-20 flex-col items-center py-8 bg-[#0a0a0f]/80 backdrop-blur-xl border-r border-white/5 z-50">
                <Link href="/dashboard" className="mb-8">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
                        <span className="text-white font-bold">C</span>
                    </div>
                </Link>

                <div className="flex-1 flex flex-col items-center gap-4">
                    {[
                        { icon: 'home' as const, href: '/dashboard', label: 'Home' },
                        { icon: 'search' as const, href: '/explore', label: 'Explore' },
                        { icon: 'map' as const, href: '/journeys', label: 'Journeys' },
                        { icon: 'flame' as const, href: '/campfire', label: 'Campfire' },
                        { icon: 'sliders' as const, href: '/algorithm', label: 'Algorithm', active: true },
                    ].map((item) => (
                        <Link key={item.href} href={item.href}>
                            <motion.div
                                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors text-white/60 hover:text-white ${item.active ? 'bg-white/10 text-white' : 'hover:bg-white/5'
                                    }`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                title={item.label}
                            >
                                {Icons[item.icon]}
                            </motion.div>
                        </Link>
                    ))}
                </div>

                <Link href="/profile">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-500" />
                </Link>
            </nav>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-[#0a0a0f]/90 backdrop-blur-xl border-t border-white/5 z-50 flex items-center justify-around px-6 safe-area-pb">
                {[
                    { icon: 'home' as const, href: '/dashboard' },
                    { icon: 'search' as const, href: '/explore' },
                    { icon: 'sliders' as const, href: '/algorithm', active: true },
                    { icon: 'flame' as const, href: '/campfire' },
                    { icon: 'user' as const, href: '/profile' },
                ].map((item) => (
                    <Link key={item.href} href={item.href}>
                        <motion.div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center text-white/60 ${item.active ? 'bg-white/10 text-white' : ''
                                }`}
                            whileTap={{ scale: 0.9 }}
                        >
                            {Icons[item.icon]}
                        </motion.div>
                    </Link>
                ))}
            </nav>
        </>
    );
}

export default function AlgorithmPage() {
    const [mounted, setMounted] = useState(false);
    const [weights, setWeights] = useState(defaultWeights);
    const [activeTab, setActiveTab] = useState<'content' | 'people' | 'time' | 'mood'>('people');
    const [showSaveToast, setShowSaveToast] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const updateWeight = (id: string, value: number) => {
        setWeights(prev => prev.map(w => w.id === id ? { ...w, weight: value } : w));
    };

    const handleSave = () => {
        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 3000);
    };

    if (!mounted) {
        return <div className="min-h-screen bg-[#050508]" />;
    }

    const filteredWeights = weights.filter(w => w.category === activeTab);
    const categoryColors: Record<string, string> = {
        people: 'from-violet-400 to-purple-500',
        content: 'from-orange-400 to-rose-500',
        time: 'from-cyan-400 to-blue-500',
        mood: 'from-emerald-400 to-teal-500',
    };

    const tabIcons: Record<string, keyof typeof Icons> = {
        people: 'family',
        content: 'photo',
        time: 'morning',
        mood: 'inspiring',
    };

    return (
        <div className="min-h-screen bg-[#050508] text-white">
            <Navigation />

            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <motion.div
                    className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-violet-500/10 blur-[120px]"
                    animate={{ scale: [1, 1.2, 1], x: [0, 30, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-orange-500/10 blur-[100px]"
                    animate={{ scale: [1.2, 1, 1.2] }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                />
            </div>

            {/* Main Content */}
            <main className="relative z-10 md:ml-20 pb-24 md:pb-8">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    {/* Hero */}
                    <motion.div
                        className="text-center mb-12"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <motion.div
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/20 to-violet-500/20 border border-white/10 mb-6"
                            animate={{ scale: [1, 1.02, 1] }}
                            transition={{ duration: 3, repeat: Infinity }}
                        >
                            <span className="w-5 h-5 text-orange-400">{Icons.sliders}</span>
                            <span className="text-sm font-semibold bg-gradient-to-r from-orange-400 to-violet-400 bg-clip-text text-transparent">
                                YOU OWN THE ALGORITHM
                            </span>
                        </motion.div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Your Feed, <span className="bg-gradient-to-r from-orange-400 via-rose-400 to-violet-400 bg-clip-text text-transparent">Your Rules</span>
                        </h1>
                        <p className="text-lg text-white/50 max-w-xl mx-auto">
                            No hidden algorithms. No manipulation. You decide what you see and when you see it.
                        </p>
                    </motion.div>

                    {/* Algorithm Presets */}
                    <AlgorithmPresets />

                    {/* Category Tabs */}
                    <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
                        {[
                            { id: 'people' as const, label: 'People' },
                            { id: 'content' as const, label: 'Content' },
                            { id: 'time' as const, label: 'Timing' },
                            { id: 'mood' as const, label: 'Mood' },
                        ].map((tab) => (
                            <motion.button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                        ? 'bg-white text-[#050508]'
                                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                                    }`}
                                whileTap={{ scale: 0.95 }}
                            >
                                <span className="w-4 h-4">{Icons[tabIcons[tab.id]]}</span>
                                {tab.label}
                            </motion.button>
                        ))}
                    </div>

                    {/* Weight Sliders */}
                    <div className="space-y-3 mb-8">
                        <AnimatePresence mode="wait">
                            {filteredWeights.map((weight, i) => (
                                <motion.div
                                    key={weight.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <WeightSlider
                                        weight={weight}
                                        onChange={(value) => updateWeight(weight.id, value)}
                                        color={categoryColors[activeTab]}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Data Storage Section */}
                    <div className="bg-white/5 rounded-3xl p-6 border border-white/10 mb-8">
                        <DataStorageSection />
                    </div>

                    {/* Privacy Promise */}
                    <motion.div
                        className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-3xl p-6 border border-emerald-500/20 mb-8"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400">
                                {Icons.shield}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">Our Privacy Promise</h3>
                                <ul className="space-y-2 text-sm text-white/70">
                                    <li className="flex items-center gap-2">
                                        <span className="text-emerald-400">{Icons.check}</span>
                                        Your data is never sold to advertisers
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-emerald-400">{Icons.check}</span>
                                        End-to-end encryption on all messages
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-emerald-400">{Icons.check}</span>
                                        Export or delete your data anytime
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-emerald-400">{Icons.check}</span>
                                        No shadow profiles or tracking
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </motion.div>

                    {/* Save Button */}
                    <motion.button
                        onClick={handleSave}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-400 via-rose-500 to-violet-500 font-semibold text-lg"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                    >
                        Save My Algorithm
                    </motion.button>
                </div>
            </main>

            {/* Save Toast */}
            <AnimatePresence>
                {showSaveToast && (
                    <motion.div
                        className="fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-emerald-500 text-white font-medium shadow-lg z-50 flex items-center gap-2"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        {Icons.check} Algorithm saved! Your feed will update.
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
