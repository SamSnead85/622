'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState, useEffect } from 'react';

// ============================================
// NAVIGATION COMPONENTS
// Six22 Silk Road Renaissance Navigation
// ============================================

// ============================================
// BOTTOM NAVIGATION
// Mobile-first navigation bar
// ============================================

interface NavItem {
    href: string;
    label: string;
    icon: ReactNode;
    activeIcon?: ReactNode;
    badge?: number;
}

interface BottomNavProps {
    items: NavItem[];
    className?: string;
}

export function BottomNav({ items, className = '' }: BottomNavProps) {
    const pathname = usePathname();

    return (
        <nav className={`fixed bottom-0 left-0 right-0 bg-[#0a0a12]/90 backdrop-blur-xl border-t border-white/10 safe-area-bottom z-50 ${className}`}>
            <div className="flex items-center justify-around h-16">
                {items.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative flex flex-col items-center justify-center w-full h-full"
                        >
                            <motion.div
                                animate={{
                                    scale: isActive ? 1.1 : 1,
                                    y: isActive ? -2 : 0,
                                }}
                                className={`relative ${isActive ? 'text-violet-400' : 'text-white/50'}`}
                            >
                                {isActive ? (item.activeIcon || item.icon) : item.icon}

                                {item.badge !== undefined && item.badge > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                                        {item.badge > 9 ? '9+' : item.badge}
                                    </span>
                                )}
                            </motion.div>

                            <span className={`text-[10px] mt-1 ${isActive ? 'text-violet-400 font-medium' : 'text-white/40'}`}>
                                {item.label}
                            </span>

                            {isActive && (
                                <motion.div
                                    layoutId="bottomNavIndicator"
                                    className="absolute bottom-0 w-12 h-0.5 bg-gradient-to-r from-violet-500 to-rose-500 rounded-full"
                                />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

// ============================================
// SIDEBAR NAVIGATION
// Desktop sidebar with collapsible sections
// ============================================

interface SidebarItem {
    id: string;
    label: string;
    icon: ReactNode;
    href?: string;
    onClick?: () => void;
    badge?: number | string;
    children?: SidebarItem[];
}

interface SidebarNavProps {
    items: SidebarItem[];
    collapsed?: boolean;
    onCollapse?: (collapsed: boolean) => void;
    header?: ReactNode;
    footer?: ReactNode;
    className?: string;
}

export function SidebarNav({
    items,
    collapsed = false,
    onCollapse,
    header,
    footer,
    className = '',
}: SidebarNavProps) {
    const pathname = usePathname();
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

    const toggleGroup = (id: string) => {
        setExpandedGroups(prev =>
            prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
        );
    };

    const renderItem = (item: SidebarItem, depth = 0) => {
        const isActive = item.href === pathname;
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedGroups.includes(item.id);

        const ItemWrapper = item.href ? Link : 'button';

        return (
            <div key={item.id}>
                <ItemWrapper
                    href={item.href || '#'}
                    onClick={() => {
                        if (hasChildren) toggleGroup(item.id);
                        item.onClick?.();
                    }}
                    className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                        transition-all group
                        ${isActive
                            ? 'bg-violet-500/20 text-violet-400'
                            : 'text-white/60 hover:bg-white/5 hover:text-white'}
                        ${depth > 0 ? 'ml-4' : ''}
                    `}
                >
                    <span className={`shrink-0 ${isActive ? 'text-violet-400' : 'text-white/50 group-hover:text-white/70'}`}>
                        {item.icon}
                    </span>

                    {!collapsed && (
                        <>
                            <span className="flex-1 text-left truncate">{item.label}</span>

                            {item.badge !== undefined && (
                                <span className={`px-2 py-0.5 text-xs rounded-full ${typeof item.badge === 'number' ? 'bg-violet-500/20 text-violet-400' : 'bg-white/10 text-white/60'}`}>
                                    {item.badge}
                                </span>
                            )}

                            {hasChildren && (
                                <motion.svg
                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                    className="w-4 h-4 text-white/40"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </motion.svg>
                            )}
                        </>
                    )}
                </ItemWrapper>

                <AnimatePresence>
                    {hasChildren && isExpanded && !collapsed && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            {item.children?.map(child => renderItem(child, depth + 1))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <motion.aside
            animate={{ width: collapsed ? 72 : 280 }}
            className={`h-full flex flex-col bg-[#0a0a12] border-r border-white/10 ${className}`}
        >
            {header && (
                <div className="p-4 border-b border-white/10">
                    {header}
                </div>
            )}

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {items.map(item => renderItem(item))}
            </nav>

            {footer && (
                <div className="p-4 border-t border-white/10">
                    {footer}
                </div>
            )}

            {onCollapse && (
                <button
                    onClick={() => onCollapse(!collapsed)}
                    className="absolute top-1/2 -right-3 w-6 h-6 bg-[#0a0a12] border border-white/10 rounded-full flex items-center justify-center text-white/40 hover:text-white/60"
                >
                    <motion.svg
                        animate={{ rotate: collapsed ? 180 : 0 }}
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </motion.svg>
                </button>
            )}
        </motion.aside>
    );
}

// ============================================
// TOP HEADER
// App header with back button and actions
// ============================================

interface TopHeaderProps {
    title?: string;
    subtitle?: string;
    showBack?: boolean;
    onBack?: () => void;
    leftAction?: ReactNode;
    rightActions?: ReactNode[];
    transparent?: boolean;
    className?: string;
}

export function TopHeader({
    title,
    subtitle,
    showBack = false,
    onBack,
    leftAction,
    rightActions = [],
    transparent = false,
    className = '',
}: TopHeaderProps) {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header className={`
            sticky top-0 z-40 px-4 py-3
            transition-all duration-300
            ${transparent && !scrolled
                ? 'bg-transparent'
                : 'bg-[#0a0a12]/90 backdrop-blur-xl border-b border-white/10'}
            ${className}
        `}>
            <div className="flex items-center gap-3">
                {showBack && (
                    <button
                        onClick={onBack || (() => window.history.back())}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                )}

                {leftAction}

                {(title || subtitle) && (
                    <div className="flex-1 min-w-0">
                        {title && (
                            <h1 className="font-semibold text-white truncate">{title}</h1>
                        )}
                        {subtitle && (
                            <p className="text-sm text-white/50 truncate">{subtitle}</p>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-2">
                    {rightActions.map((action, i) => (
                        <div key={i}>{action}</div>
                    ))}
                </div>
            </div>
        </header>
    );
}

// ============================================
// TABS
// Animated tab navigation
// ============================================

interface Tab {
    id: string;
    label: string;
    icon?: ReactNode;
    badge?: number;
}

interface TabsProps {
    tabs: Tab[];
    activeId: string;
    onChange: (id: string) => void;
    variant?: 'pills' | 'underline' | 'cards';
    fullWidth?: boolean;
    className?: string;
}

export function Tabs({
    tabs,
    activeId,
    onChange,
    variant = 'underline',
    fullWidth = false,
    className = '',
}: TabsProps) {
    const variants = {
        pills: {
            container: 'bg-white/5 p-1 rounded-xl',
            tab: 'px-4 py-2 rounded-lg',
            active: 'bg-violet-500 text-white',
            inactive: 'text-white/60 hover:text-white hover:bg-white/5',
        },
        underline: {
            container: 'border-b border-white/10',
            tab: 'px-4 py-3 relative',
            active: 'text-violet-400',
            inactive: 'text-white/50 hover:text-white',
        },
        cards: {
            container: 'gap-2',
            tab: 'px-4 py-3 rounded-xl border',
            active: 'bg-violet-500/20 border-violet-500/50 text-violet-400',
            inactive: 'bg-white/5 border-transparent text-white/60 hover:bg-white/10',
        },
    };

    const styles = variants[variant];

    return (
        <div className={`flex ${styles.container} ${fullWidth ? 'w-full' : ''} ${className}`}>
            {tabs.map((tab) => {
                const isActive = tab.id === activeId;

                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`
                            ${styles.tab}
                            ${isActive ? styles.active : styles.inactive}
                            ${fullWidth ? 'flex-1' : ''}
                            flex items-center justify-center gap-2 transition-all font-medium
                        `}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {tab.badge !== undefined && tab.badge > 0 && (
                            <span className="w-5 h-5 bg-rose-500 rounded-full text-xs text-white flex items-center justify-center">
                                {tab.badge}
                            </span>
                        )}

                        {variant === 'underline' && isActive && (
                            <motion.div
                                layoutId="tabUnderline"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-rose-500"
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// ============================================
// FLOATING ACTION BUTTON
// Material design-style FAB
// ============================================

interface FABAction {
    id: string;
    label: string;
    icon: ReactNode;
    onClick: () => void;
}

interface FloatingActionButtonProps {
    icon: ReactNode;
    onClick?: () => void;
    actions?: FABAction[];
    position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
    className?: string;
}

export function FloatingActionButton({
    icon,
    onClick,
    actions = [],
    position = 'bottom-right',
    className = '',
}: FloatingActionButtonProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const positions = {
        'bottom-right': 'right-4 bottom-20',
        'bottom-left': 'left-4 bottom-20',
        'bottom-center': 'left-1/2 -translate-x-1/2 bottom-20',
    };

    const handleClick = () => {
        if (actions.length > 0) {
            setIsExpanded(!isExpanded);
        } else {
            onClick?.();
        }
    };

    return (
        <div className={`fixed z-50 ${positions[position]} ${className}`}>
            <AnimatePresence>
                {isExpanded && actions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-16 right-0 flex flex-col gap-2"
                    >
                        {actions.map((action, i) => (
                            <motion.button
                                key={action.id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => {
                                    action.onClick();
                                    setIsExpanded(false);
                                }}
                                className="flex items-center gap-3 pl-4 pr-2 py-2 bg-[#0a0a12] border border-white/10 rounded-full shadow-xl hover:bg-white/5 transition-colors"
                            >
                                <span className="text-white text-sm whitespace-nowrap">{action.label}</span>
                                <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400">
                                    {action.icon}
                                </div>
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                onClick={handleClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{ rotate: isExpanded ? 45 : 0 }}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/30"
            >
                {icon}
            </motion.button>
        </div>
    );
}

// ============================================
// STEPPER
// Multi-step progress indicator
// ============================================

interface Step {
    id: string;
    label: string;
    description?: string;
}

interface StepperProps {
    steps: Step[];
    currentStep: number;
    onStepClick?: (index: number) => void;
    orientation?: 'horizontal' | 'vertical';
    className?: string;
}

export function Stepper({
    steps,
    currentStep,
    onStepClick,
    orientation = 'horizontal',
    className = '',
}: StepperProps) {
    const isVertical = orientation === 'vertical';

    return (
        <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} ${className}`}>
            {steps.map((step, i) => {
                const isCompleted = i < currentStep;
                const isCurrent = i === currentStep;
                const isClickable = onStepClick && i <= currentStep;

                return (
                    <div
                        key={step.id}
                        className={`flex ${isVertical ? 'flex-row' : 'flex-col'} items-center ${!isVertical && 'flex-1'}`}
                    >
                        <button
                            onClick={() => isClickable && onStepClick(i)}
                            disabled={!isClickable}
                            className={`
                                relative flex items-center
                                ${isVertical ? 'flex-row gap-4' : 'flex-col'}
                                ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                            `}
                        >
                            <motion.div
                                animate={{
                                    backgroundColor: isCompleted || isCurrent ? '#8B5CF6' : 'rgba(255, 255, 255, 0.1)',
                                    borderColor: isCompleted || isCurrent ? '#8B5CF6' : 'rgba(255, 255, 255, 0.2)',
                                }}
                                className="w-10 h-10 rounded-full border-2 flex items-center justify-center"
                            >
                                {isCompleted ? (
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <span className={`font-medium ${isCurrent ? 'text-white' : 'text-white/50'}`}>
                                        {i + 1}
                                    </span>
                                )}
                            </motion.div>

                            <div className={`${isVertical ? 'text-left' : 'text-center mt-2'}`}>
                                <p className={`font-medium ${isCurrent || isCompleted ? 'text-white' : 'text-white/50'}`}>
                                    {step.label}
                                </p>
                                {step.description && (
                                    <p className="text-xs text-white/40 mt-0.5">{step.description}</p>
                                )}
                            </div>
                        </button>

                        {i < steps.length - 1 && (
                            <div className={`
                                ${isVertical
                                    ? 'w-0.5 h-8 ml-5 my-2'
                                    : 'h-0.5 flex-1 mx-4 mt-5'}
                                ${isCompleted ? 'bg-violet-500' : 'bg-white/10'}
                            `} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ============================================
// EXPORTS
// ============================================

export {
    type NavItem,
    type BottomNavProps,
    type SidebarItem,
    type SidebarNavProps,
    type TopHeaderProps,
    type Tab,
    type TabsProps,
    type FABAction,
    type FloatingActionButtonProps,
    type Step,
    type StepperProps,
};
