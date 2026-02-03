'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useCommunities, type Community } from '@/hooks';

// ============================================
// SVG ICONS
// ============================================
const Icons = {
    plus: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
    ),
    users: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
    ),
    shield: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
    ),
    lock: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
    ),
    globe: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
    ),
    photo: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
    ),
    sliders: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
    ),
    cog: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    check: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
    ),
    arrow: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
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
    user: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
    ),
};

// Default cover images for communities without one
const DEFAULT_COVERS = [
    'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&h=200&fit=crop',
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=200&fit=crop',
    'https://images.unsplash.com/photo-1536640712-4d4c36ff0e4e?w=400&h=200&fit=crop',
];

// ============================================
// COMPONENTS
// ============================================

function CommunityCard({ community, index }: { community: Community; index: number }) {
    const coverImage = community.coverUrl || DEFAULT_COVERS[index % DEFAULT_COVERS.length];
    return (
        <motion.div
            className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01, borderColor: 'rgba(255,255,255,0.2)' }}
        >
            {/* Cover Image */}
            <div className="relative h-28 overflow-hidden">
                <Image
                    src={coverImage}
                    alt={community.name}
                    fill
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050508] to-transparent" />

                {/* Privacy Badge */}
                <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${community.isPrivate
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                    <span className="w-3 h-3">{community.isPrivate ? Icons.lock : Icons.globe}</span>
                    {community.isPrivate ? 'Private' : 'Public'}
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="font-semibold text-white text-lg mb-1">{community.name}</h3>
                <p className="text-sm text-white/50 mb-3 line-clamp-2">{community.description}</p>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-white/60">
                        <span className="w-4 h-4">{Icons.users}</span>
                        <span>{community.memberCount} members</span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${community.role === 'admin'
                        ? 'bg-orange-500/20 text-orange-300'
                        : community.role === 'moderator'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'bg-white/10 text-white/60'
                        }`}>
                        {community.role.charAt(0).toUpperCase() + community.role.slice(1)}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="px-4 pb-4 flex gap-2">
                <Link href={`/communities/${community.id}`} className="flex-1">
                    <motion.button
                        className="w-full py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors"
                        whileTap={{ scale: 0.98 }}
                    >
                        View Tribe
                    </motion.button>
                </Link>
                <Link href={`/communities/${community.id}/settings`}>
                    <motion.button
                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/20 transition-colors"
                        whileTap={{ scale: 0.95 }}
                    >
                        {Icons.cog}
                    </motion.button>
                </Link>
            </div>
        </motion.div>
    );
}

function CreateCommunityCard() {
    return (
        <Link href="/communities/create">
            <motion.div
                className="bg-gradient-to-br from-[#00D4FF]/10 to-[#8B5CF6]/10 rounded-2xl border border-dashed border-white/20 p-6 flex flex-col items-center justify-center text-center min-h-[280px] cursor-pointer hover:border-[#00D4FF]/50 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center mb-4 text-white">
                    {Icons.plus}
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">Create a Tribe</h3>
                <p className="text-sm text-white/50 max-w-[200px]">
                    Start your own private space for family, friends, or any group you want to connect.
                </p>
            </motion.div>
        </Link>
    );
}

function AlgorithmControlCard() {
    const [familyPriority, setFamilyPriority] = useState(80);

    return (
        <motion.div
            className="bg-white/5 rounded-2xl border border-white/10 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center text-cyan-400">
                    {Icons.sliders}
                </div>
                <div>
                    <h3 className="font-semibold text-white">Tribe Algorithm</h3>
                    <p className="text-sm text-white/50">You control what you see</p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white/70">Family Content Priority</span>
                        <span className="text-sm font-medium text-white">{familyPriority}%</span>
                    </div>
                    <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="absolute left-0 top-0 h-full bg-gradient-to-r from-orange-400 to-rose-500 rounded-full transition-all"
                            style={{ width: `${familyPriority}%` }}
                        />
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={familyPriority}
                        onChange={(e) => setFamilyPriority(parseInt(e.target.value))}
                        className="w-full h-2 mt-2 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg"
                    />
                </div>

                <Link href="/algorithm">
                    <motion.button
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-400 to-rose-500 text-white text-sm font-medium flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                    >
                        Advanced Algorithm Settings
                        {Icons.arrow}
                    </motion.button>
                </Link>
            </div>
        </motion.div>
    );
}

function DataOwnershipCard() {
    return (
        <motion.div
            className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-2xl border border-emerald-500/20 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400">
                    {Icons.shield}
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white mb-2">Your Data, Your Rules</h3>
                    <ul className="space-y-2 text-sm text-white/70">
                        <li className="flex items-center gap-2">
                            <span className="text-emerald-400 w-4 h-4">{Icons.check}</span>
                            All data encrypted end-to-end
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-emerald-400 w-4 h-4">{Icons.check}</span>
                            Export anytime in open formats
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-emerald-400 w-4 h-4">{Icons.check}</span>
                            Store locally or on our cloud
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="text-emerald-400 w-4 h-4">{Icons.check}</span>
                            Delete everything with one click
                        </li>
                    </ul>
                </div>
            </div>
        </motion.div>
    );
}

// Navigation
function Navigation() {
    return (
        <>
            <nav className="hidden md:flex fixed left-0 top-0 h-full w-20 flex-col items-center py-8 bg-[#0a0a0f]/80 backdrop-blur-xl border-r border-white/5 z-50">
                <Link href="/dashboard" className="mb-8">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center">
                        <span className="text-black font-bold text-lg">0G</span>
                    </div>
                </Link>

                <div className="flex-1 flex flex-col items-center gap-4">
                    {[
                        { icon: 'home', href: '/dashboard', label: 'Home' },
                        { icon: 'search', href: '/explore', label: 'Explore' },
                        { icon: 'users', href: '/communities', label: 'Tribes', active: true },
                        { icon: 'sliders', href: '/algorithm', label: 'Algorithm' },
                    ].map((item) => (
                        <Link key={item.href} href={item.href}>
                            <motion.div
                                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors text-white/60 hover:text-white ${item.active ? 'bg-white/10 text-white' : 'hover:bg-white/5'
                                    }`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                title={item.label}
                            >
                                {Icons[item.icon as keyof typeof Icons]}
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
                    { icon: 'home', href: '/dashboard' },
                    { icon: 'search', href: '/explore' },
                    { icon: 'users', href: '/communities', active: true },
                    { icon: 'sliders', href: '/algorithm' },
                    { icon: 'user', href: '/profile' },
                ].map((item) => (
                    <Link key={item.href} href={item.href}>
                        <motion.div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center text-white/60 ${item.active ? 'bg-white/10 text-white' : ''
                                }`}
                            whileTap={{ scale: 0.9 }}
                        >
                            {Icons[item.icon as keyof typeof Icons]}
                        </motion.div>
                    </Link>
                ))}
            </nav>
        </>
    );
}

// ============================================
// MAIN PAGE
// ============================================
export default function CommunitiesPage() {
    const [mounted, setMounted] = useState(false);
    const { communities, isLoading } = useCommunities();

    useEffect(() => { setMounted(true); }, []);

    if (!mounted) {
        return <div className="min-h-screen bg-[#050508]" />;
    }

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
                <div className="max-w-6xl mx-auto px-4 py-8">
                    {/* Header */}
                    <motion.div
                        className="mb-8"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h1 className="text-3xl font-bold text-white mb-2">Your Tribes</h1>
                        <p className="text-white/50">Find your tribe. Build something real together.</p>
                    </motion.div>

                    {/* Tribes Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        <CreateCommunityCard />
                        {isLoading ? (
                            <div className="col-span-full flex justify-center py-8">
                                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            </div>
                        ) : communities.length === 0 ? (
                            <div className="col-span-full text-center py-8 text-white/50">
                                <p>No communities yet. Create one to get started!</p>
                            </div>
                        ) : (
                            communities.map((community, i) => (
                                <motion.div
                                    key={community.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: (i + 1) * 0.1 }}
                                >
                                    <CommunityCard community={community} index={i} />
                                </motion.div>
                            ))
                        )}
                    </div>

                    {/* Control Cards */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <AlgorithmControlCard />
                        <DataOwnershipCard />
                    </div>
                </div>
            </main>
        </div>
    );
}
