'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useCallback, useState, useEffect } from 'react';
import { motion, PanInfo } from 'framer-motion';
import {
    HomeIcon,
    SearchIcon,
    VideoIcon,
    UsersIcon,
    SendIcon,
    MessageIcon,
    PlusIcon,
} from '@/components/icons';
import { ZeroGLogo } from './ZeroGLogo';

// ============================================
// NAVIGATION SIDEBAR
// ============================================
export type FeedViewMode = 'standard' | 'immersive' | 'video';

export function NavigationSidebar({ activeTab, user, onCreateClick, onViewModeChange }: {
    activeTab: string;
    user: any;
    onCreateClick: () => void;
    onViewModeChange?: (mode: FeedViewMode) => void;
}) {
    const router = useRouter();

    // Feed view mode (persisted in localStorage)
    const [viewMode, setViewMode] = useState<FeedViewMode>('standard');
    useEffect(() => {
        const saved = localStorage.getItem('0g_feed_view_mode') as FeedViewMode | null;
        if (saved && ['standard', 'immersive', 'video'].includes(saved)) {
            setViewMode(saved);
        }
    }, []);

    const changeViewMode = useCallback((mode: FeedViewMode) => {
        setViewMode(mode);
        localStorage.setItem('0g_feed_view_mode', mode);
        onViewModeChange?.(mode);
    }, [onViewModeChange]);

    // Gesture-based swipe-to-go-back on mobile
    const handleSwipe = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // Swipe right to go back (threshold: 80px, velocity: 300px/s)
        if (info.offset.x > 80 && info.velocity.x > 300) {
            router.back();
        }
    }, [router]);

    const navItems = [
        { id: 'feed', Icon: HomeIcon, label: 'Feed', href: '/dashboard' },
        { id: 'explore', Icon: SearchIcon, label: 'Explore', href: '/explore' },
        { id: 'live', Icon: VideoIcon, label: 'Live', href: '/campfire' },
        { id: 'communities', Icon: UsersIcon, label: 'Communities', href: '/communities' },
        { id: 'invite', Icon: SendIcon, label: 'Invite', href: '/invite', highlight: true },
        { id: 'messages', Icon: MessageIcon, label: 'Messages', href: '/messages', hasNotification: true },
    ];

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 xl:w-64 bg-[#0A0A0F]/95 backdrop-blur-xl border-r border-white/5 flex-col p-4 z-40">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 px-3 py-4 mb-6">
                    <ZeroGLogo size="lg" />
                    <span className="text-white/60 text-sm font-medium hidden xl:block">ZeroG</span>
                </Link>

                {/* Nav items */}
                <nav className="flex-1 space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`relative flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${activeTab === item.id
                                ? 'text-[#00D4FF]'
                                : (item as any).highlight
                                    ? 'bg-gradient-to-r from-[#00D4FF]/20 to-[#8B5CF6]/20 text-[#00D4FF] border border-[#00D4FF]/30 hover:from-[#00D4FF]/30 hover:to-[#8B5CF6]/30'
                                    : 'text-white/60 hover:bg-white/[0.04] hover:text-white transition-all duration-200'
                                }`}
                        >
                            {activeTab === item.id && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-[#00D4FF]/10 border-l-2 border-[#00D4FF] rounded-xl shadow-[inset_0_0_20px_rgba(0,212,255,0.1)]"
                                    transition={{
                                        type: 'spring',
                                        stiffness: 350,
                                        damping: 30,
                                        mass: 0.8,
                                    }}
                                />
                            )}
                            <span className="relative z-10">
                                <item.Icon size={22} />
                                {item.hasNotification && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#00D4FF] rounded-full" />
                                )}
                            </span>
                            <span className="font-medium hidden xl:block relative z-10">{item.label}</span>
                            {(item as any).highlight && (
                                <span className="hidden xl:block ml-auto text-[10px] bg-[#00D4FF]/20 px-2 py-0.5 rounded-full text-[#00D4FF] relative z-10">NEW</span>
                            )}
                        </Link>
                    ))}
                </nav>

                {/* Feed view mode toggle */}
                {activeTab === 'feed' && (
                    <div className="hidden xl:block mb-4 px-2">
                        <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2 px-1">View</p>
                        <div className="flex gap-1 bg-white/[0.03] rounded-lg p-1">
                            {([
                                { mode: 'standard' as FeedViewMode, label: 'Standard' },
                                { mode: 'immersive' as FeedViewMode, label: 'Immersive' },
                                { mode: 'video' as FeedViewMode, label: 'Video' },
                            ]).map(({ mode, label }) => (
                                <button
                                    key={mode}
                                    onClick={() => changeViewMode(mode)}
                                    className={`flex-1 py-1.5 rounded-md text-[10px] font-medium transition-all ${
                                        viewMode === mode
                                            ? 'bg-[#00D4FF]/20 text-[#00D4FF]'
                                            : 'text-white/40 hover:text-white/60'
                                    }`}
                                    aria-pressed={viewMode === mode}
                                    aria-label={`${label} feed view`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Create button */}
                <button
                    onClick={onCreateClick}
                    className="flex items-center justify-center xl:justify-start gap-3 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#7C3AED] text-white font-semibold hover:shadow-[0_4px_20px_rgba(0,212,255,0.3)] transition-all duration-300 hover:scale-[1.02] mb-4"
                >
                    <PlusIcon size={18} />
                    <span className="hidden xl:block">Create Post</span>
                </button>

                {/* Profile */}
                <Link href="/profile" className="flex items-center gap-3 px-3 py-3 border-t border-white/[0.06] pt-4 mt-4">
                    {user?.avatarUrl ? (
                        <img
                            src={user.avatarUrl}
                            alt={user.displayName || 'Profile'}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-[#00D4FF]/20"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold ring-2 ring-[#00D4FF]/20">
                            {user?.displayName?.[0] || 'U'}
                        </div>
                    )}
                    <div className="hidden xl:block">
                        <p className="font-semibold text-white text-sm">{user?.displayName || 'User'}</p>
                        <p className="text-xs text-white/50">@{user?.username || 'username'}</p>
                    </div>
                </Link>
            </aside>

            {/* Mobile swipe-to-go-back gesture area */}
            <motion.div
                className="lg:hidden fixed inset-0 z-30 pointer-events-none"
                style={{ pointerEvents: 'none' }}
            >
                <motion.div
                    className="absolute left-0 top-0 bottom-0 w-6"
                    style={{ pointerEvents: 'auto', touchAction: 'pan-y' }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.5}
                    onDragEnd={handleSwipe}
                />
            </motion.div>

            {/* Mobile Bottom Nav */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0F]/95 backdrop-blur-xl border-t border-white/10 z-50 safe-area-pb">
                <div className="flex items-center justify-around py-1.5">
                    {navItems.slice(0, 5).map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`relative flex flex-col items-center gap-0.5 min-w-[56px] min-h-[44px] justify-center active:scale-95 transition-transform ${activeTab === item.id ? 'text-[#00D4FF]' : 'text-white/50'
                                }`}
                        >
                            {activeTab === item.id && (
                                <motion.div
                                    layoutId="mobileActiveTab"
                                    className="absolute inset-0 bg-[#00D4FF]/10 rounded-xl"
                                    transition={{
                                        type: 'spring',
                                        stiffness: 350,
                                        damping: 30,
                                        mass: 0.8,
                                    }}
                                />
                            )}
                            <span className="relative z-10">
                                <item.Icon size={22} />
                                {item.hasNotification && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#00D4FF] rounded-full" />
                                )}
                            </span>
                            <span className="text-xs relative z-10">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </nav>

            {/* Mobile Floating Action Button */}
            <motion.button
                onClick={onCreateClick}
                className="lg:hidden fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] shadow-lg shadow-[#00D4FF]/30 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                initial={false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
                <PlusIcon size={24} className="text-black" />
            </motion.button>
        </>
    );
}
