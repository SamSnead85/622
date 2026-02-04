'use client';

import Link from 'next/link';
import {
    HomeIcon,
    SearchIcon,
    UsersIcon,
    SendIcon,
    UserIcon,
    MessageIcon,
    PlusIcon,
    BellIcon
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
    { id: 'communities', label: 'Tribes', href: '/communities', Icon: UsersIcon },
    { id: 'invite', label: 'Invite', href: '/invite', Icon: SendIcon },
    { id: 'profile', label: 'Profile', href: '/profile', Icon: UserIcon },
];

// Alternate nav with messages instead of invite
const NAV_ITEMS_MESSAGES: NavItem[] = [
    { id: 'home', label: 'Home', href: '/dashboard', Icon: HomeIcon },
    { id: 'explore', label: 'Explore', href: '/explore', Icon: SearchIcon },
    { id: 'communities', label: 'Tribes', href: '/communities', Icon: UsersIcon },
    { id: 'messages', label: 'Messages', href: '/messages', Icon: MessageIcon },
    { id: 'profile', label: 'Profile', href: '/profile', Icon: UserIcon },
];

// Create post variant
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
}

// Desktop Sidebar + Mobile Bottom Nav
export function Navigation({ activeTab, variant = 'default' }: NavigationProps) {
    const items = variant === 'messages' ? NAV_ITEMS_MESSAGES
        : variant === 'create' ? NAV_ITEMS_CREATE
            : NAV_ITEMS;

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 xl:w-64 bg-black/40 backdrop-blur-xl border-r border-white/5 flex-col p-4 z-40">
                <Link href="/" className="flex items-center gap-3 px-3 py-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                        <span className="text-black font-bold text-lg">0G</span>
                    </div>
                    <span className="text-xl font-bold hidden xl:block">
                        <span className="text-[#00D4FF]">0</span>
                        <span className="text-white">G</span>
                    </span>
                </Link>
                <nav className="flex-1 space-y-2">
                    {items.map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${activeTab === item.id
                                    ? 'bg-white/10 text-white'
                                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <item.Icon size={24} />
                            <span className="font-medium hidden xl:block">{item.label}</span>
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10 z-50 safe-area-pb">
                <div className="flex items-center justify-around py-2">
                    {items.map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === item.id
                                    ? 'text-white'
                                    : 'text-white/50 hover:text-white'
                                }`}
                        >
                            <item.Icon size={22} />
                            <span className="text-[10px]">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </nav>
        </>
    );
}

// Bottom Nav only (for pages with custom sidebars)
export function BottomNav({ activeTab, variant = 'default' }: NavigationProps) {
    const items = variant === 'messages' ? NAV_ITEMS_MESSAGES
        : variant === 'create' ? NAV_ITEMS_CREATE
            : NAV_ITEMS;

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10 z-50 safe-area-pb">
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
        <Link href="/notifications" className="relative p-2 rounded-full hover:bg-white/10 transition-colors">
            <BellIcon size={24} className="text-white/70" />
            {count > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-orange-400 to-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {count > 9 ? '9+' : count}
                </span>
            )}
        </Link>
    );
}

export { NAV_ITEMS, NAV_ITEMS_MESSAGES, NAV_ITEMS_CREATE };
