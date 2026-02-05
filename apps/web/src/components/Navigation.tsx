'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
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

interface NavItem {
    id: string;
    label: string;
    href: string;
    Icon: React.ComponentType<{ className?: string; size?: number }>;
}

// Standard navigation items used across the app
const NAV_ITEMS: NavItem[] = [
    { id: 'home', label: 'Home', href: '/dashboard', Icon: HomeIcon },
    { id: 'explore', label: 'Explore', href: '/explore', Icon: SearchIcon },
    { id: 'community', label: 'Community', href: '/community', Icon: MegaphoneIcon },
    { id: 'communities', label: 'Tribes', href: '/communities', Icon: UsersIcon },
    { id: 'profile', label: 'Profile', href: '/profile', Icon: UserIcon },
];

const NAV_ITEMS_MESSAGES: NavItem[] = [
    { id: 'home', label: 'Home', href: '/dashboard', Icon: HomeIcon },
    { id: 'explore', label: 'Explore', href: '/explore', Icon: SearchIcon },
    { id: 'communities', label: 'Tribes', href: '/communities', Icon: UsersIcon },
    { id: 'messages', label: 'Messages', href: '/messages', Icon: MessageIcon },
    { id: 'profile', label: 'Profile', href: '/profile', Icon: UserIcon },
];

const NAV_ITEMS_CREATE: NavItem[] = [
    { id: 'home', label: 'Home', href: '/dashboard', Icon: HomeIcon },
    { id: 'explore', label: 'Explore', href: '/explore', Icon: SearchIcon },
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

    const avatarSrc = userAvatarUrl && !userAvatarUrl.startsWith('preset:')
        ? userAvatarUrl
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'User')}&background=random`;

    return (
        <>
            {/* Desktop Sidebar - Glassmorphic & Motion */}
            <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 xl:w-64 bg-[#050508]/80 backdrop-blur-2xl border-r border-white/5 flex-col p-4 z-40 supports-[backdrop-filter]:bg-[#050508]/60">
                <Link href="/" className="flex items-center gap-4 px-3 py-6 mb-4 group">
                    <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                        <span className="text-white font-bold text-lg">0G</span>
                    </div>
                    <span className="text-xl font-bold hidden xl:block tracking-tight group-hover:tracking-normal transition-all duration-300">
                        <span className="text-[#00D4FF]">Zero</span>
                        <span className="text-white">Gravity</span>
                    </span>
                </Link>

                <nav className="flex-1 space-y-2">
                    {items.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                className={`relative flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${isActive ? 'text-white' : 'text-white/40 hover:text-white'
                                    }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="desktop-nav-active"
                                        className="absolute inset-0 bg-white/[0.03] border border-white/5 rounded-xl shadow-inner"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    >
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#00D4FF] rounded-r-full shadow-[0_0_10px_#00D4FF]" />
                                    </motion.div>
                                )}
                                <div className="relative z-10">
                                    <item.Icon
                                        size={24}
                                        className={`transition-all duration-300 ${isActive
                                            ? 'text-[#00D4FF] drop-shadow-[0_0_8px_rgba(0,212,255,0.5)] scale-110'
                                            : 'group-hover:text-white group-hover:scale-105'
                                            }`}
                                    />
                                </div>
                                <span className={`font-medium hidden xl:block relative z-10 transition-colors ${isActive ? 'text-white' : ''}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Optional: Navigation Footer / Profile Link */}
                {userAvatarUrl && (
                    <Link href="/profile" className="flex items-center gap-3 px-3 py-4 mt-4 border-t border-white/5 group">
                        <div className="w-10 h-10 rounded-full overflow-hidden relative ring-2 ring-white/10 group-hover:ring-[#00D4FF]/50 transition-all">
                            {/* Assuming next/image is handled by caller or basic img */}
                            <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                        <div className="hidden xl:block overflow-hidden">
                            <p className="font-semibold text-white text-sm truncate group-hover:text-[#00D4FF] transition-colors">{displayName || 'Profile'}</p>
                            <p className="text-xs text-white/50 truncate">@{username || 'user'}</p>
                        </div>
                    </Link>
                )}
            </aside>

            {/* Mobile Bottom Navigation - Glass Island */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#050508]/90 backdrop-blur-3xl border-t border-white/5 z-50 safe-area-pb">
                <div className="flex items-center justify-around py-1">
                    {items.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                className="relative flex flex-col items-center gap-1 p-3 w-full group"
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="mobile-nav-active"
                                        className="absolute top-0 w-8 h-1 bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] rounded-b-full shadow-[0_2px_10px_rgba(139,92,246,0.5)]"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <div className={`relative transition-all duration-300 ${isActive ? '-translate-y-1' : 'group-active:scale-90'}`}>
                                    <item.Icon
                                        size={24}
                                        className={`transition-all ${isActive
                                            ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]'
                                            : 'text-white/40 group-hover:text-white'
                                            }`}
                                    />
                                </div>
                                <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-white' : 'text-white/40'}`}>
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
                            ? 'text-[#00D4FF]'
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
