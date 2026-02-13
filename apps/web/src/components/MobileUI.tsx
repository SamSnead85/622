'use client';

import { motion } from 'framer-motion';

// Skeleton loader for feed cards
export function FeedCardSkeleton() {
    return (
        <div className="bg-white/[0.02] rounded-2xl border border-white/5 p-4 animate-pulse">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-white/10" />
                <div className="flex-1">
                    <div className="h-4 bg-white/10 rounded w-32 mb-2" />
                    <div className="h-3 bg-white/5 rounded w-20" />
                </div>
            </div>
            {/* Content */}
            <div className="space-y-2 mb-4">
                <div className="h-4 bg-white/10 rounded w-full" />
                <div className="h-4 bg-white/10 rounded w-3/4" />
            </div>
            {/* Image placeholder */}
            <div className="aspect-video bg-white/5 rounded-xl mb-4" />
            {/* Actions */}
            <div className="flex gap-4">
                <div className="h-8 bg-white/5 rounded-lg w-16" />
                <div className="h-8 bg-white/5 rounded-lg w-16" />
                <div className="h-8 bg-white/5 rounded-lg w-16" />
            </div>
        </div>
    );
}

// Skeleton loader for profile header
export function ProfileSkeleton() {
    return (
        <div className="animate-pulse">
            {/* Cover */}
            <div className="h-32 md:h-48 bg-white/5" />
            {/* Profile info */}
            <div className="px-4 -mt-16 relative">
                <div className="w-28 h-28 rounded-full bg-white/10 border-4 border-black" />
                <div className="mt-4 space-y-3">
                    <div className="h-6 bg-white/10 rounded w-40" />
                    <div className="h-4 bg-white/5 rounded w-24" />
                    <div className="h-4 bg-white/5 rounded w-64" />
                </div>
                {/* Stats */}
                <div className="flex gap-6 mt-6">
                    <div className="text-center">
                        <div className="h-6 bg-white/10 rounded w-12 mx-auto mb-1" />
                        <div className="h-3 bg-white/5 rounded w-10 mx-auto" />
                    </div>
                    <div className="text-center">
                        <div className="h-6 bg-white/10 rounded w-12 mx-auto mb-1" />
                        <div className="h-3 bg-white/5 rounded w-14 mx-auto" />
                    </div>
                    <div className="text-center">
                        <div className="h-6 bg-white/10 rounded w-12 mx-auto mb-1" />
                        <div className="h-3 bg-white/5 rounded w-14 mx-auto" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Skeleton for explore grid
export function ExploreGridSkeleton({ count = 9 }: { count?: number }) {
    return (
        <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="aspect-square bg-white/5 animate-pulse"
                    style={{ animationDelay: `${i * 50}ms` }}
                />
            ))}
        </div>
    );
}

// Skeleton for community cards
export function CommunityCardSkeleton() {
    return (
        <div className="bg-white/[0.02] rounded-2xl border border-white/5 p-5 animate-pulse">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl bg-white/10" />
                <div className="flex-1">
                    <div className="h-5 bg-white/10 rounded w-32 mb-2" />
                    <div className="h-3 bg-white/5 rounded w-20" />
                </div>
            </div>
            <div className="h-4 bg-white/5 rounded w-full mb-2" />
            <div className="h-4 bg-white/5 rounded w-2/3" />
        </div>
    );
}

// Skeleton for messages list
export function MessageSkeleton() {
    return (
        <div className="flex items-center gap-3 p-4 animate-pulse">
            <div className="w-14 h-14 rounded-full bg-white/10" />
            <div className="flex-1">
                <div className="h-4 bg-white/10 rounded w-28 mb-2" />
                <div className="h-3 bg-white/5 rounded w-48" />
            </div>
            <div className="h-3 bg-white/5 rounded w-10" />
        </div>
    );
}

// Shimmer effect component
export function Shimmer({ className = '' }: { className?: string }) {
    return (
        <div className={`relative overflow-hidden ${className}`}>
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
        </div>
    );
}

// Pull to refresh indicator
export function PullToRefreshIndicator({
    progress,
    isRefreshing
}: {
    progress: number;
    isRefreshing: boolean
}) {
    return (
        <div className="flex items-center justify-center py-4">
            <motion.div
                className="w-8 h-8 border-2 border-[#7C8FFF]/30 border-t-[#7C8FFF] rounded-full"
                animate={{
                    rotate: isRefreshing ? 360 : progress * 360,
                    scale: Math.min(progress, 1)
                }}
                transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
            />
        </div>
    );
}

// Loading spinner
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const sizes = {
        sm: 'w-4 h-4 border',
        md: 'w-8 h-8 border-2',
        lg: 'w-16 h-16 border-4',
    };

    return (
        <div className={`${sizes[size]} border-[#7C8FFF]/20 border-t-[#7C8FFF] rounded-full animate-spin`} />
    );
}

// Page loading overlay
export function PageLoading() {
    return (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
            <LoadingSpinner size="lg" />
        </div>
    );
}

// Empty state component
export function EmptyState({
    icon,
    title,
    description,
    action,
}: {
    icon: string;
    title: string;
    description: string;
    action?: {
        label: string;
        href?: string;
        onClick?: () => void;
    };
}) {
    return (
        <div className="text-center py-16 px-4">
            <div className="text-5xl mb-4">{icon}</div>
            <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
            <p className="text-white/50 mb-6 max-w-md mx-auto">{description}</p>
            {action && (
                action.href ? (
                    <a
                        href={action.href}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#7C8FFF] text-white font-semibold hover:opacity-90 transition-opacity"
                    >
                        {action.label}
                    </a>
                ) : (
                    <button
                        onClick={action.onClick}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#7C8FFF] text-white font-semibold hover:opacity-90 transition-opacity"
                    >
                        {action.label}
                    </button>
                )
            )}
        </div>
    );
}

// Touch-optimized button
export function TouchButton({
    children,
    onClick,
    variant = 'primary',
    size = 'md',
    disabled = false,
    className = '',
}: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    className?: string;
}) {
    const variants = {
        primary: 'bg-[#7C8FFF] text-white hover:opacity-90',
        secondary: 'bg-white/10 text-white hover:bg-white/15',
        ghost: 'text-white/60 hover:text-white hover:bg-white/5',
    };

    const sizes = {
        sm: 'min-h-[36px] px-3 text-sm',
        md: 'min-h-[44px] px-4 text-sm',
        lg: 'min-h-[52px] px-6 text-base',
    };

    return (
        <motion.button
            onClick={onClick}
            disabled={disabled}
            className={`${variants[variant]} ${sizes[size]} rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            whileTap={{ scale: 0.95 }}
        >
            {children}
        </motion.button>
    );
}

// Touch-optimized input
export function TouchInput({
    type = 'text',
    placeholder,
    value,
    onChange,
    className = '',
    ...props
}: {
    type?: string;
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
    [key: string]: any;
}) {
    return (
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className={`min-h-[44px] w-full px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:border-[#7C8FFF]/50 focus:outline-none transition-colors ${className}`}
            {...props}
        />
    );
}

// Swipeable card container (for future use with swipe actions)
export function SwipeableCard({
    children,
    onSwipeLeft,
    onSwipeRight,
}: {
    children: React.ReactNode;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
}) {
    return (
        <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
                if (info.offset.x < -100 && onSwipeLeft) {
                    onSwipeLeft();
                } else if (info.offset.x > 100 && onSwipeRight) {
                    onSwipeRight();
                }
            }}
            className="touch-pan-y"
        >
            {children}
        </motion.div>
    );
}
