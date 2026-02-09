'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
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
    MegaphoneIcon,
    TrendingIcon,
    ShieldIcon,
} from '@/components/icons';
import { ZeroGLogo } from './ZeroGLogo';
import { isShieldConfigured, activateStealth } from '@/lib/stealth/engine';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// NAVIGATION SIDEBAR — Self-contained
// All props optional. Auto-detects activeTab
// from pathname and user from AuthContext.
// ============================================
export type FeedViewMode = 'standard' | 'immersive' | 'video';

/** Detect active tab from the current pathname */
function detectActiveTab(pathname: string): string {
    if (pathname.startsWith('/dashboard/growth-partner')) return 'growth';
    if (pathname === '/dashboard') return 'feed';
    if (pathname.startsWith('/search') || pathname.startsWith('/explore') || pathname.startsWith('/adventures')) return 'explore';
    if (pathname.startsWith('/campfire')) return 'live';
    if (pathname.startsWith('/communities')) return 'communities';
    if (pathname.startsWith('/bulletin')) return 'bulletin';
    if (pathname.startsWith('/messages')) return 'messages';
    if (pathname.startsWith('/security')) return 'security';
    if (pathname.startsWith('/invite')) return 'invite';
    if (pathname.startsWith('/profile') || pathname.startsWith('/settings') || pathname.startsWith('/my-posts')) return 'profile';
    if (pathname.startsWith('/admin')) return '';
    if (pathname.startsWith('/developers')) return '';
    // /search handled above with /explore
    if (pathname.startsWith('/notifications')) return '';
    if (pathname.startsWith('/moments')) return '';
    return 'feed';
}

export function NavigationSidebar({ activeTab: activeTabOverride, user: userOverride, onCreateClick, onViewModeChange }: {
    activeTab?: string;
    user?: any;
    onCreateClick?: () => void;
    onViewModeChange?: (mode: FeedViewMode) => void;
} = {}) {
    const router = useRouter();
    const pathname = usePathname();
    const { user: authUser } = useAuth();

    // Use overrides if provided, otherwise auto-detect
    const activeTab = activeTabOverride ?? detectActiveTab(pathname);
    const user = userOverride ?? authUser;

    // Travel Shield: Triple-tap avatar to activate stealth mode
    const tapCountRef = useRef(0);
    const tapTimerRef = useRef<ReturnType<typeof setTimeout>>();
    const handleAvatarTap = useCallback((e: React.MouseEvent) => {
        tapCountRef.current += 1;
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        if (tapCountRef.current >= 3) {
            e.preventDefault();
            tapCountRef.current = 0;
            if (isShieldConfigured()) {
                activateStealth();
                window.location.href = '/dashboard';
            }
            return;
        }
        tapTimerRef.current = setTimeout(() => {
            if (tapCountRef.current < 3) {
                router.push('/profile');
            }
            tapCountRef.current = 0;
        }, 400);
    }, [router]);

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

    // Growth Partner nav is invite-only — only visible to tagged partners and admins
    const isGrowthPartnerOrAdmin = !!(
        user?.isGrowthPartner ||
        user?.role === 'ADMIN' ||
        user?.role === 'SUPERADMIN'
    );

    // Desktop sidebar shows all items
    const navItems = [
        { id: 'feed', Icon: HomeIcon, label: 'Feed', href: '/dashboard' },
        { id: 'explore', Icon: SearchIcon, label: 'Search', href: '/search' },
        { id: 'live', Icon: VideoIcon, label: 'Live', href: '/campfire' },
        { id: 'communities', Icon: UsersIcon, label: 'Communities', href: '/communities' },
        { id: 'bulletin', Icon: MegaphoneIcon, label: 'Bulletin', href: '/bulletin' },
        { id: 'messages', Icon: MessageIcon, label: 'Messages', href: '/messages', hasNotification: true },
        ...(isGrowthPartnerOrAdmin
            ? [{ id: 'growth', Icon: TrendingIcon, label: 'Growth', href: '/dashboard/growth-partner' }]
            : []),
        { id: 'security', Icon: ShieldIcon, label: 'Security', href: '/security' },
        { id: 'invite', Icon: SendIcon, label: 'Invite', href: '/invite', highlight: true },
    ];

    // Mobile bottom bar: focused on 5 core actions
    const mobileNavItems = [
        { id: 'feed', Icon: HomeIcon, label: 'Home', href: '/dashboard' },
        { id: 'explore', Icon: SearchIcon, label: 'Search', href: '/search' },
        { id: 'create', Icon: PlusIcon, label: 'Post', href: '/create', isCreate: true },
        { id: 'messages', Icon: MessageIcon, label: 'Messages', href: '/messages', hasNotification: true },
        { id: 'profile', Icon: UsersIcon, label: 'Profile', href: '/profile' },
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
                                ? 'text-[#D4AF37]'
                                : (item as any).highlight
                                    ? 'bg-gradient-to-r from-[#D4AF37]/20 to-[#B8942D]/20 text-[#D4AF37] border border-[#D4AF37]/30 hover:from-[#D4AF37]/30 hover:to-[#B8942D]/30'
                                    : 'text-white/60 hover:bg-white/[0.04] hover:text-white transition-all duration-200'
                                }`}
                        >
                            {activeTab === item.id && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-[#D4AF37]/10 border-l-2 border-[#D4AF37] rounded-xl shadow-[inset_0_0_20px_rgba(0,212,255,0.1)]"
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
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#D4AF37] rounded-full" />
                                )}
                            </span>
                            <span className="font-medium hidden xl:block relative z-10">{item.label}</span>
                            {(item as any).highlight && (
                                <span className="hidden xl:block ml-auto text-[10px] bg-[#D4AF37]/20 px-2 py-0.5 rounded-full text-[#D4AF37] relative z-10">NEW</span>
                            )}
                        </Link>
                    ))}
                </nav>

                {/* Feed view mode toggle — only on dashboard */}
                {pathname === '/dashboard' && onViewModeChange && (
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
                                            ? 'bg-[#D4AF37]/20 text-[#D4AF37]'
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
                    onClick={onCreateClick ?? (() => router.push('/create'))}
                    className="flex items-center justify-center xl:justify-start gap-3 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#9A7A24] text-white font-semibold hover:shadow-[0_4px_20px_rgba(0,212,255,0.3)] transition-all duration-300 hover:scale-[1.02] mb-4"
                >
                    <PlusIcon size={18} />
                    <span className="hidden xl:block">Create Post</span>
                </button>

                {/* Quick-access Emergency / Security button */}
                <Link
                    href="/security#emergency"
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 group"
                    title="Emergency lockdown"
                >
                    <ShieldIcon size={18} />
                    <span className="hidden xl:block text-xs font-medium group-hover:text-red-400">Emergency</span>
                </Link>

                {/* Profile -- Triple-tap for Travel Shield */}
                <div
                    onClick={handleAvatarTap}
                    className="flex items-center gap-3 px-3 py-3 border-t border-white/[0.06] pt-4 mt-4 cursor-pointer hover:bg-white/5 rounded-lg transition-colors"
                >
                    {user?.avatarUrl ? (
                        <img
                            src={user.avatarUrl}
                            alt={user.displayName || 'Profile'}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-[#D4AF37]/20"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8942D] flex items-center justify-center text-black font-bold ring-2 ring-[#D4AF37]/20">
                            {user?.displayName?.[0] || 'U'}
                        </div>
                    )}
                    <div className="hidden xl:block">
                        <p className="font-semibold text-white text-sm">{user?.displayName || 'User'}</p>
                        <p className="text-xs text-white/50">@{user?.username || 'username'}</p>
                    </div>
                </div>
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

            {/* Mobile Bottom Nav — 5 core items: Home, Search, Create, Messages, Profile */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0F]/95 backdrop-blur-xl border-t border-white/10 z-50 safe-area-pb">
                <div className="flex items-center justify-around py-1.5">
                    {mobileNavItems.map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`relative flex flex-col items-center gap-0.5 min-w-[56px] min-h-[44px] justify-center active:scale-95 transition-transform ${
                                item.isCreate
                                    ? ''
                                    : activeTab === item.id ? 'text-[#D4AF37]' : 'text-white/50'
                            }`}
                        >
                            {/* Create button gets a prominent style */}
                            {item.isCreate ? (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B8942D] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20 -mt-3">
                                    <item.Icon size={20} className="text-black" />
                                </div>
                            ) : (
                                <>
                                    {activeTab === item.id && (
                                        <motion.div
                                            layoutId="mobileActiveTab"
                                            className="absolute inset-0 bg-[#D4AF37]/10 rounded-xl"
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
                                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#D4AF37] rounded-full" />
                                        )}
                                    </span>
                                </>
                            )}
                            <span className="text-xs relative z-10">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </nav>

            {/* Mobile FAB removed — Create is now in the bottom nav */}
        </>
    );
}
