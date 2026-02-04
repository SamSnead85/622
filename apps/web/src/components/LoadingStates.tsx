'use client';

import React from 'react';
import { motion } from 'framer-motion';

// ============================================
// LOADING STATES
// ============================================

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    return (
        <div className={`${sizeClasses[size]} ${className}`}>
            <motion.div
                className="w-full h-full border-2 border-white/20 border-t-cyan-500 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
        </div>
    );
}

interface PageLoaderProps {
    message?: string;
}

export function PageLoader({ message = 'Loading...' }: PageLoaderProps) {
    return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-white/60">{message}</p>
        </div>
    );
}

export function FullPageLoader({ message = 'Loading...' }: PageLoaderProps) {
    return (
        <div className="fixed inset-0 bg-[#0A0A0F] flex flex-col items-center justify-center z-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
            >
                <div className="w-20 h-20 mx-auto mb-6">
                    <motion.div
                        className="w-full h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
                        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">0G</h2>
                <p className="text-white/60">{message}</p>
            </motion.div>
        </div>
    );
}

// ============================================
// SKELETON COMPONENTS
// ============================================

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div className={`bg-white/5 animate-pulse rounded ${className}`} />
    );
}

export function SkeletonCard() {
    return (
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
            <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2 rounded" />
                    <Skeleton className="h-3 w-1/3 rounded" />
                </div>
            </div>
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
            <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
        </div>
    );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}

export function SkeletonProfile() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Skeleton className="w-24 h-24 rounded-full" />
                <div className="flex-1 space-y-3">
                    <Skeleton className="h-6 w-1/3 rounded" />
                    <Skeleton className="h-4 w-1/2 rounded" />
                    <Skeleton className="h-4 w-2/3 rounded" />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
                <Skeleton className="h-20 rounded-xl" />
            </div>
        </div>
    );
}

// ============================================
// EMPTY STATES
// ============================================

interface EmptyStateProps {
    icon?: string;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-16 px-8 text-center"
        >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center text-4xl">
                {icon}
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
            {description && (
                <p className="text-white/50 max-w-md mx-auto mb-6">{description}</p>
            )}
            {action && (
                <button
                    onClick={action.onClick}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity"
                >
                    {action.label}
                </button>
            )}
        </motion.div>
    );
}

// ============================================
// BUTTON WITH LOADING
// ============================================

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    loadingText?: string;
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

export function LoadingButton({
    children,
    isLoading = false,
    loadingText = 'Loading...',
    variant = 'primary',
    size = 'md',
    disabled,
    className = '',
    ...props
}: LoadingButtonProps) {
    const variantClasses = {
        primary: 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white',
        secondary: 'bg-white/10 text-white hover:bg-white/20',
        ghost: 'bg-transparent text-white/60 hover:text-white hover:bg-white/10',
    };

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-5 py-2.5',
        lg: 'px-8 py-4 text-lg',
    };

    return (
        <button
            disabled={isLoading || disabled}
            className={`
                rounded-xl font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98]
                ${variantClasses[variant]}
                ${sizeClasses[size]}
                ${isLoading || disabled ? 'opacity-60 cursor-not-allowed hover:scale-100 active:scale-100' : ''}
                ${className}
            `}
            {...props}
        >
            {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" />
                    {loadingText}
                </span>
            ) : (
                children
            )}
        </button>
    );
}

// ============================================
// OPTIMISTIC UPDATE WRAPPER
// ============================================

interface OptimisticWrapperProps {
    isPending?: boolean;
    children: React.ReactNode;
}

export function OptimisticWrapper({ isPending = false, children }: OptimisticWrapperProps) {
    return (
        <div className={isPending ? 'opacity-60 pointer-events-none' : ''}>
            {children}
        </div>
    );
}

// ============================================
// EXPORTS
// ============================================

const LoadingStates = {
    LoadingSpinner,
    PageLoader,
    FullPageLoader,
    Skeleton,
    SkeletonCard,
    SkeletonList,
    SkeletonProfile,
    EmptyState,
    LoadingButton,
    OptimisticWrapper,
};

export default LoadingStates;
