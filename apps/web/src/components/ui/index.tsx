'use client';

import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useState, useEffect, ReactNode, forwardRef } from 'react';
import Image from 'next/image';

// ============================================
// HEXAGONAL AVATAR
// Premium avatar with hexagonal shape and gradient border
// ============================================
interface HexAvatarProps {
    src?: string;
    alt?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    hasStory?: boolean;
    isOnline?: boolean;
    fallback?: string;
    className?: string;
    onClick?: () => void;
}

const sizeMap = {
    xs: { container: 32, text: 10 },
    sm: { container: 40, text: 12 },
    md: { container: 48, text: 14 },
    lg: { container: 64, text: 18 },
    xl: { container: 80, text: 22 },
    '2xl': { container: 120, text: 32 },
};

export function HexAvatar({
    src,
    alt = 'Avatar',
    size = 'md',
    hasStory = false,
    isOnline = false,
    fallback,
    className = '',
    onClick,
}: HexAvatarProps) {
    const dimensions = sizeMap[size];
    const initials = fallback || alt?.charAt(0).toUpperCase() || '?';

    return (
        <motion.div
            className={`relative cursor-pointer ${className}`}
            style={{ width: dimensions.container, height: dimensions.container }}
            onClick={onClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            {/* Story Ring */}
            {hasStory && (
                <motion.div
                    className="absolute inset-0"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                >
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                        <defs>
                            <linearGradient id={`story-grad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#F59E0B" />
                                <stop offset="50%" stopColor="#F43F5E" />
                                <stop offset="100%" stopColor="#8B5CF6" />
                            </linearGradient>
                        </defs>
                        <polygon
                            points="50,3 93,26 93,74 50,97 7,74 7,26"
                            fill="transparent"
                            stroke={`url(#story-grad-${size})`}
                            strokeWidth="4"
                            strokeDasharray="8 4"
                        />
                    </svg>
                </motion.div>
            )}

            {/* Avatar Container */}
            <div
                className="absolute inset-[4px] overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900"
                style={{ clipPath: 'polygon(50% 5%, 90% 27%, 90% 73%, 50% 95%, 10% 73%, 10% 27%)' }}
            >
                {src ? (
                    <Image
                        src={src}
                        alt={alt}
                        fill
                        className="object-cover"
                        sizes={`${dimensions.container}px`}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500 via-rose-500 to-violet-500">
                        <span
                            className="text-white font-bold"
                            style={{ fontSize: dimensions.text }}
                        >
                            {initials}
                        </span>
                    </div>
                )}
            </div>

            {/* Online Indicator */}
            {isOnline && (
                <motion.div
                    className="absolute bottom-0 right-0 w-1/4 h-1/4 bg-emerald-500 rounded-full border-2 border-black"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            )}
        </motion.div>
    );
}

// ============================================
// GLOW BUTTON
// Premium button with gradient glow effect
// ============================================
interface GlowButtonProps {
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    disabled?: boolean;
    loading?: boolean;
    icon?: ReactNode;
    iconPosition?: 'left' | 'right';
    className?: string;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
}

export const GlowButton = forwardRef<HTMLButtonElement, GlowButtonProps>(
    function GlowButton(
        {
            children,
            variant = 'primary',
            size = 'md',
            fullWidth = false,
            disabled = false,
            loading = false,
            icon,
            iconPosition = 'left',
            className = '',
            onClick,
            type = 'button',
        },
        ref
    ) {
        const sizeClasses = {
            sm: 'px-4 py-2 text-sm gap-1.5',
            md: 'px-6 py-3 text-base gap-2',
            lg: 'px-8 py-4 text-lg gap-2.5',
        };

        const variantClasses = {
            primary: 'bg-gradient-to-r from-amber-500 via-rose-500 to-violet-500 text-white hover:opacity-90',
            secondary: 'bg-white/10 text-white border border-white/20 hover:bg-white/20',
            ghost: 'bg-transparent text-white/70 hover:text-white hover:bg-white/10',
            danger: 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:opacity-90',
        };

        return (
            <motion.button
                ref={ref}
                type={type}
                onClick={onClick}
                disabled={disabled || loading}
                className={`
                    relative inline-flex items-center justify-center font-semibold rounded-xl
                    transition-all duration-200 overflow-hidden
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${sizeClasses[size]}
                    ${variantClasses[variant]}
                    ${fullWidth ? 'w-full' : ''}
                    ${className}
                `}
                whileHover={{ scale: disabled ? 1 : 1.02 }}
                whileTap={{ scale: disabled ? 1 : 0.98 }}
            >
                {/* Glow Effect */}
                {variant === 'primary' && !disabled && (
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-amber-400 via-rose-400 to-violet-400 opacity-0"
                        whileHover={{ opacity: 0.3 }}
                        transition={{ duration: 0.3 }}
                    />
                )}

                {/* Content */}
                <span className="relative flex items-center gap-2">
                    {loading ? (
                        <motion.div
                            className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                    ) : (
                        <>
                            {icon && iconPosition === 'left' && icon}
                            {children}
                            {icon && iconPosition === 'right' && icon}
                        </>
                    )}
                </span>
            </motion.button>
        );
    }
);

// ============================================
// HEX CARD
// Premium card with hexagonal corners
// ============================================
interface HexCardProps {
    children: ReactNode;
    variant?: 'default' | 'elevated' | 'bordered' | 'glass';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
    className?: string;
    onClick?: () => void;
}

export function HexCard({
    children,
    variant = 'default',
    padding = 'md',
    hover = false,
    className = '',
    onClick,
}: HexCardProps) {
    const paddingClasses = {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-5',
        lg: 'p-8',
    };

    const variantClasses = {
        default: 'bg-white/5 border border-white/10',
        elevated: 'bg-white/5 shadow-xl shadow-black/20',
        bordered: 'bg-transparent border-2 border-white/20',
        glass: 'bg-white/5 backdrop-blur-xl border border-white/10',
    };

    return (
        <motion.div
            className={`
                relative overflow-hidden
                ${paddingClasses[padding]}
                ${variantClasses[variant]}
                ${hover ? 'cursor-pointer' : ''}
                ${className}
            `}
            style={{
                clipPath: 'polygon(16px 0, calc(100% - 16px) 0, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0 calc(100% - 16px), 0 16px)',
            }}
            onClick={onClick}
            whileHover={hover ? { scale: 1.01, y: -2 } : undefined}
            whileTap={hover ? { scale: 0.99 } : undefined}
        >
            {children}
        </motion.div>
    );
}

// ============================================
// GEOMETRIC LOADER
// Hexagonal loading spinner
// ============================================
interface GeometricLoaderProps {
    size?: 'sm' | 'md' | 'lg';
    color?: 'brand' | 'white' | 'amber' | 'rose' | 'violet';
    className?: string;
}

export function GeometricLoader({
    size = 'md',
    color = 'brand',
    className = '',
}: GeometricLoaderProps) {
    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-10 h-10',
        lg: 'w-16 h-16',
    };

    const colorClasses = {
        brand: 'from-amber-400 via-rose-400 to-violet-400',
        white: 'from-white to-white',
        amber: 'from-amber-300 to-amber-500',
        rose: 'from-rose-300 to-rose-500',
        violet: 'from-violet-300 to-violet-500',
    };

    return (
        <div className={`${sizeClasses[size]} ${className}`}>
            <motion.div
                className={`w-full h-full bg-gradient-to-br ${colorClasses[color]}`}
                style={{
                    clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
        </div>
    );
}

// ============================================
// GRADIENT TEXT
// Text with gradient fill
// ============================================
interface GradientTextProps {
    children: ReactNode;
    variant?: 'brand' | 'amber' | 'rose' | 'violet' | 'custom';
    customGradient?: string;
    as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    className?: string;
}

export function GradientText({
    children,
    variant = 'brand',
    customGradient,
    as: Component = 'span',
    className = '',
}: GradientTextProps) {
    const gradientClasses = {
        brand: 'from-amber-400 via-rose-400 to-violet-400',
        amber: 'from-amber-300 to-amber-500',
        rose: 'from-rose-300 to-rose-500',
        violet: 'from-violet-300 to-violet-500',
        custom: customGradient || 'from-white to-white',
    };

    return (
        <Component
            className={`bg-gradient-to-r ${gradientClasses[variant]} bg-clip-text text-transparent ${className}`}
        >
            {children}
        </Component>
    );
}

// ============================================
// FLOATING ORB
// Atmospheric background element
// ============================================
interface FloatingOrbProps {
    color?: 'amber' | 'rose' | 'violet';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    position?: { top?: string; left?: string; right?: string; bottom?: string };
    delay?: number;
    className?: string;
}

export function FloatingOrb({
    color = 'amber',
    size = 'md',
    position = { top: '10%', left: '10%' },
    delay = 0,
    className = '',
}: FloatingOrbProps) {
    const colorValues = {
        amber: 'rgba(245, 158, 11, 0.15)',
        rose: 'rgba(244, 63, 94, 0.12)',
        violet: 'rgba(139, 92, 246, 0.10)',
    };

    const sizeValues = {
        sm: 200,
        md: 400,
        lg: 600,
        xl: 800,
    };

    return (
        <motion.div
            className={`absolute rounded-full pointer-events-none ${className}`}
            style={{
                ...position,
                width: sizeValues[size],
                height: sizeValues[size],
                background: `radial-gradient(circle, ${colorValues[color]} 0%, transparent 70%)`,
            }}
            animate={{
                scale: [1, 1.2, 1],
                x: [0, 30, 0],
                y: [0, 20, 0],
            }}
            transition={{
                duration: 15 + Math.random() * 10,
                repeat: Infinity,
                ease: 'easeInOut',
                delay,
            }}
        />
    );
}

// ============================================
// BADGE
// Small label component
// ============================================
interface BadgeProps {
    children: ReactNode;
    variant?: 'default' | 'brand' | 'success' | 'warning' | 'error';
    size?: 'sm' | 'md';
    className?: string;
}

export function Badge({
    children,
    variant = 'default',
    size = 'sm',
    className = '',
}: BadgeProps) {
    const variantClasses = {
        default: 'bg-white/10 text-white/70',
        brand: 'bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-violet-500/20 text-amber-400 border border-amber-500/30',
        success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
        warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
        error: 'bg-red-500/20 text-red-400 border border-red-500/30',
    };

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-3 py-1 text-sm',
    };

    return (
        <span
            className={`
                inline-flex items-center font-medium rounded-full
                ${variantClasses[variant]}
                ${sizeClasses[size]}
                ${className}
            `}
        >
            {children}
        </span>
    );
}

// ============================================
// DIVIDER
// Styled horizontal rule
// ============================================
interface DividerProps {
    variant?: 'subtle' | 'default' | 'gradient';
    className?: string;
}

export function Divider({ variant = 'default', className = '' }: DividerProps) {
    const variantClasses = {
        subtle: 'border-white/5',
        default: 'border-white/10',
        gradient: 'border-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent',
    };

    return (
        <hr className={`w-full ${variantClasses[variant]} ${className}`} />
    );
}

// ============================================
// SKELETON
// Loading placeholder with shimmer
// ============================================
interface SkeletonProps {
    variant?: 'text' | 'circular' | 'rectangular' | 'hex';
    width?: string | number;
    height?: string | number;
    className?: string;
}

export function Skeleton({
    variant = 'text',
    width,
    height,
    className = '',
}: SkeletonProps) {
    const variantClasses = {
        text: 'h-4 rounded',
        circular: 'rounded-full aspect-square',
        rectangular: 'rounded-xl',
        hex: '',
    };

    return (
        <motion.div
            className={`bg-white/10 ${variantClasses[variant]} ${className}`}
            style={{
                width: width || '100%',
                height: height || (variant === 'text' ? 16 : undefined),
                clipPath: variant === 'hex' ? 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)' : undefined,
            }}
            animate={{
                opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
        />
    );
}

// ============================================
// TOOLTIP
// Information popup on hover
// ============================================
interface TooltipProps {
    children: ReactNode;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
}

export function Tooltip({
    children,
    content,
    position = 'top',
    className = '',
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    return (
        <div
            className={`relative inline-block ${className}`}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        className={`absolute z-50 px-3 py-1.5 text-xs font-medium text-white bg-black/90 rounded-lg whitespace-nowrap ${positionClasses[position]}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                    >
                        {content}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
