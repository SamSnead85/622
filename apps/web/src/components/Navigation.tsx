'use client';

/**
 * @deprecated Use NavigationSidebar from '@/components/dashboard/NavigationSidebar' instead.
 * This component is kept only for legacy _community_backup pages.
 * All active pages have been migrated to the unified NavigationSidebar.
 */

import Link from 'next/link';
import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { isShieldConfigured, activateStealth } from '@/lib/stealth/engine';
import {
    HomeIcon,
    SearchIcon,
    UsersIcon,
    SendIcon,
    UserIcon,
    MessageIcon,
    PlusIcon,
    BellIcon,
    MegaphoneIcon
} from '@/components/icons';

function DevIcon({ className = '' }: { className?: string; size?: number }) {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="16,18 22,12 16,6" /><polyline points="8,6 2,12 8,18" />
        </svg>
    );
}

interface NavItem {
    id: string;
    label: string;
    href: string;
    Icon: React.ComponentType<{ className?: string; size?: number }>;
}

// Standard navigation items used across the app
const NAV_ITEMS: NavItem[] = [
    { id: 'home', label: 'Home', href: '/dashboard', Icon: HomeIcon },
    { id: 'explore', label: 'Search', href: '/search', Icon: SearchIcon },
    { id: 'communities', label: 'Tribes', href: '/communities', Icon: UsersIcon },
    { id: 'bulletin', label: 'Bulletin', href: '/bulletin', Icon: MegaphoneIcon },
    { id: 'developers', label: 'Developers', href: '/developers', Icon: DevIcon },
    { id: 'profile', label: 'Profile', href: '/profile', Icon: UserIcon },
];

const NAV_ITEMS_MESSAGES: NavItem[] = [
    { id: 'home', label: 'Home', href: '/dashboard', Icon: HomeIcon },
    { id: 'explore', label: 'Search', href: '/search', Icon: SearchIcon },
    { id: 'communities', label: 'Tribes', href: '/communities', Icon: UsersIcon },
    { id: 'messages', label: 'Messages', href: '/messages', Icon: MessageIcon },
    { id: 'profile', label: 'Profile', href: '/profile', Icon: UserIcon },
];

const NAV_ITEMS_CREATE: NavItem[] = [
    { id: 'home', label: 'Home', href: '/dashboard', Icon: HomeIcon },
    { id: 'explore', label: 'Search', href: '/search', Icon: SearchIcon },
    { id: 'create', label: 'Create', href: '/create', Icon: PlusIcon },
    { id: 'invite', label: 'Invite', href: '/invite', Icon: SendIcon },
    { id: 'profile', label: 'Profile', href: '/profile', Icon: UserIcon },
];

interface NavigationProps {
    activeTab: string;
    variant?: 'default' | 'messages' | 'create';
    userAvatarUrl?: string; // Optional prop for profile pic in sidebar if needed
    displayName?: string;
    username?: string;
}

// ============================================
// PREMIUM NAVIGATION COMPONENT
// Phase 1001: Navigation Singularity
// ============================================
export function Navigation({ activeTab, variant = 'default', userAvatarUrl, displayName, username }: NavigationProps) {
    const items = variant === 'messages' ? NAV_ITEMS_MESSAGES
        : variant === 'create' ? NAV_ITEMS_CREATE
            : NAV_ITEMS;
    const navRouter = useRouter();

    const avatarSrc = userAvatarUrl && !userAvatarUrl.startsWith('preset:')
        ? userAvatarUrl
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'User')}&background=random`;

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
                // Force full page reload so AuthContext picks up stealth state
                window.location.href = '/dashboard';
            }
            return;
        }
        tapTimerRef.current = setTimeout(() => {
            // Single/double tap - navigate to profile normally
            if (tapCountRef.current < 3) {
                navRouter.push('/profile');
            }
            tapCountRef.current = 0;
        }, 400);
    }, [navRouter]);

    return (
        <>
            {/* Desktop Sidebar - Glassmorphic & Motion */}
            <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 xl:w-64 bg-[var(--bg-primary)] border-r border-[var(--border-default)] flex-col p-4 z-40">
                <Link href="/" className="flex items-center gap-3 px-3 py-4 mb-6 group">
                    <div className="relative w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-[1.02]">
                        <span className="text-black font-bold text-sm">0G</span>
                    </div>
                </Link>

                <nav className="flex-1 space-y-2">
                    {items.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                className={`relative flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group ${isActive ? 'text-white' : 'text-[var(--text-tertiary)] hover:text-white'
                                    }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="desktop-nav-active"
                                        className="absolute inset-0 bg-white/[0.06] border border-white/10 rounded-lg"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <div className="relative z-10">
                                    <item.Icon
                                        size={20}
                                        className={`transition-colors duration-200 ${isActive ? 'text-white' : 'group-hover:text-white'}`}
                                    />
                                </div>
                                <span className={`text-sm font-medium hidden xl:block relative z-10 transition-colors ${isActive ? 'text-white' : ''}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Optional: Navigation Footer / Profile Link -- Triple-tap for Travel Shield */}
                {userAvatarUrl && (
                    <div
                        onClick={handleAvatarTap}
                        className="flex items-center gap-3 px-3 py-3 mt-4 border-t border-[var(--border-default)] group hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                    >
                        <div className="w-9 h-9 rounded-lg overflow-hidden relative ring-1 ring-white/10 group-hover:ring-white/20 transition-all">
                            <Image src={avatarSrc} alt="Profile" fill className="object-cover" />
                        </div>
                        <div className="hidden xl:block overflow-hidden">
                            <p className="font-medium text-white text-sm truncate">{displayName || 'Profile'}</p>
                            <p className="text-xs text-[var(--text-tertiary)] truncate">@{username || 'user'}</p>
                        </div>
                    </div>
                )}
            </aside>

            {/* Mobile Bottom Navigation - Glass Island */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-primary)]/95 backdrop-blur-xl border-t border-[var(--border-default)] z-50 safe-area-pb">
                <div className="flex items-center justify-around py-2">
                    {items.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                className="relative flex flex-col items-center gap-1 p-2 w-full group"
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="mobile-nav-active"
                                        className="absolute top-0 w-10 h-0.5 bg-white rounded-b"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <div className="relative">
                                    <item.Icon
                                        size={22}
                                        className={`transition-colors ${isActive ? 'text-white' : 'text-[var(--text-tertiary)]'}`}
                                    />
                                </div>
                                <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-white' : 'text-[var(--text-tertiary)]'}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}

// Bottom Nav only (for specific layouts)
export function BottomNav({ activeTab, variant = 'default' }: NavigationProps) {
    const items = variant === 'messages' ? NAV_ITEMS_MESSAGES
        : variant === 'create' ? NAV_ITEMS_CREATE
            : NAV_ITEMS;

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#050508]/90 backdrop-blur-3xl border-t border-white/5 z-50 safe-area-pb">
            <div className="flex items-center justify-around py-2">
                {items.map((item) => (
                    <Link
                        key={item.id}
                        href={item.href}
                        className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === item.id
                            ? 'text-[#D4AF37]'
                            : 'text-white/50 hover:text-white'
                            }`}
                    >
                        <item.Icon size={22} />
                        <span className="text-[10px]">{item.label}</span>
                    </Link>
                ))}
            </div>
        </nav>
    );
}

// Notification Bell with Badge
export function NotificationBell({ count = 0 }: { count?: number }) {
    return (
        <Link href="/notifications" className="relative p-2 rounded-full hover:bg-white/10 transition-colors group">
            <BellIcon size={24} className="text-white/70 group-hover:text-white transition-colors" />
            {count > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-orange-400 to-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg animate-pulse">
                    {count > 9 ? '9+' : count}
                </span>
            )}
        </Link>
    );
}

export { NAV_ITEMS, NAV_ITEMS_MESSAGES, NAV_ITEMS_CREATE };
