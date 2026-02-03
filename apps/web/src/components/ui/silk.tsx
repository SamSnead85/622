'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { forwardRef, ReactNode } from 'react';

// ============================================
// SILK BUTTON - The Premium Interactive Element
// Inspired by woven silk threads of the ancient trade routes
// ============================================

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold' | 'outline';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface SilkButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
    children: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    fullWidth?: boolean;
    glow?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: `
        bg-gradient-to-r from-violet-600 via-rose-500 to-amber-500
        text-white font-semibold
        shadow-lg shadow-violet-500/20
        hover:shadow-xl hover:shadow-violet-500/30
        active:scale-[0.98]
    `,
    secondary: `
        bg-white/5 backdrop-blur-xl
        border border-white/10
        text-white
        hover:bg-white/10 hover:border-white/20
        active:scale-[0.98]
    `,
    ghost: `
        bg-transparent
        text-white/70
        hover:text-white hover:bg-white/5
        active:scale-[0.98]
    `,
    danger: `
        bg-gradient-to-r from-red-600 to-rose-500
        text-white font-semibold
        shadow-lg shadow-red-500/20
        hover:shadow-xl hover:shadow-red-500/30
        active:scale-[0.98]
    `,
    gold: `
        bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600
        text-black font-semibold
        shadow-lg shadow-amber-500/30
        hover:shadow-xl hover:shadow-amber-500/40
        active:scale-[0.98]
    `,
    outline: `
        bg-transparent
        border border-white/20
        text-white
        hover:bg-white/5 hover:border-white/30
        active:scale-[0.98]
    `,
};

const sizeStyles: Record<ButtonSize, string> = {
    xs: 'px-2.5 py-1 text-xs rounded-lg gap-1',
    sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
    md: 'px-4 py-2 text-sm rounded-xl gap-2',
    lg: 'px-5 py-2.5 text-base rounded-xl gap-2',
    xl: 'px-6 py-3 text-lg rounded-2xl gap-2.5',
};

export const SilkButton = forwardRef<HTMLButtonElement, SilkButtonProps>(({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    glow = false,
    disabled,
    className = '',
    ...props
}, ref) => {
    return (
        <motion.button
            ref={ref}
            disabled={disabled || loading}
            whileHover={{ scale: disabled ? 1 : 1.02 }}
            whileTap={{ scale: disabled ? 1 : 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className={`
                relative inline-flex items-center justify-center
                transition-all duration-200 ease-out
                disabled:opacity-50 disabled:cursor-not-allowed
                ${variantStyles[variant]}
                ${sizeStyles[size]}
                ${fullWidth ? 'w-full' : ''}
                ${glow ? 'silk-glow' : ''}
                ${className}
            `}
            {...props}
        >
            {/* Glow effect overlay */}
            {glow && (
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/20 via-rose-500/20 to-amber-500/20 blur-xl animate-pulse" />
            )}

            {/* Loading spinner */}
            {loading && (
                <span className="absolute inset-0 flex items-center justify-center">
                    <EightPointedStar className="w-5 h-5 animate-spin" />
                </span>
            )}

            {/* Content */}
            <span className={`flex items-center gap-inherit ${loading ? 'opacity-0' : ''}`}>
                {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
                <span>{children}</span>
                {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
            </span>
        </motion.button>
    );
});

SilkButton.displayName = 'SilkButton';

// ============================================
// EIGHT-POINTED STAR (Rub el Hizb)
// The signature loading indicator
// ============================================

interface EightPointedStarProps {
    className?: string;
    filled?: boolean;
}

export function EightPointedStar({ className = '', filled = true }: EightPointedStarProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            fill={filled ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={filled ? 0 : 1.5}
        >
            {/* 8-pointed star path */}
            <path d="M12 0L14.59 8.26L22.5 6L16.5 12L22.5 18L14.59 15.74L12 24L9.41 15.74L1.5 18L7.5 12L1.5 6L9.41 8.26L12 0Z" />
        </svg>
    );
}

// ============================================
// SILK SPINNER - Animated Loading State
// ============================================

interface SilkSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function SilkSpinner({ size = 'md', className = '' }: SilkSpinnerProps) {
    const sizeValue = { sm: 16, md: 24, lg: 32 }[size];

    return (
        <motion.div
            className={`relative ${className}`}
            style={{ width: sizeValue, height: sizeValue }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
            <EightPointedStar className="w-full h-full text-amber-400" />
            <motion.div
                className="absolute inset-0"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            >
                <EightPointedStar className="w-full h-full text-rose-400" />
            </motion.div>
        </motion.div>
    );
}

// ============================================
// SILK CARD - Glassmorphic Container
// ============================================

interface SilkCardProps {
    children: ReactNode;
    variant?: 'default' | 'elevated' | 'bordered' | 'gradient';
    hover?: boolean;
    className?: string;
    onClick?: () => void;
}

export function SilkCard({
    children,
    variant = 'default',
    hover = false,
    className = '',
    onClick,
}: SilkCardProps) {
    const variantClasses = {
        default: 'bg-white/5 backdrop-blur-xl',
        elevated: 'bg-white/5 backdrop-blur-xl shadow-xl shadow-black/20',
        bordered: 'bg-transparent border border-white/10',
        gradient: 'bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl',
    };

    return (
        <motion.div
            onClick={onClick}
            whileHover={hover ? { scale: 1.02, y: -2 } : undefined}
            whileTap={onClick ? { scale: 0.98 } : undefined}
            className={`
                relative rounded-2xl overflow-hidden
                ${variantClasses[variant]}
                ${onClick ? 'cursor-pointer' : ''}
                ${className}
            `}
        >
            {/* Arabesque border glow */}
            <div className="absolute inset-0 rounded-2xl border border-white/5" />

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
}

// ============================================
// SILK INPUT - Elegant Form Input
// ============================================

interface SilkInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leftElement?: ReactNode;
    rightElement?: ReactNode;
}

export const SilkInput = forwardRef<HTMLInputElement, SilkInputProps>(({
    label,
    error,
    hint,
    leftElement,
    rightElement,
    className = '',
    ...props
}, ref) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-white/70 mb-2">
                    {label}
                </label>
            )}

            <div className="relative">
                {leftElement && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                        {leftElement}
                    </div>
                )}

                <input
                    ref={ref}
                    className={`
                        w-full bg-white/5 backdrop-blur-sm
                        border border-white/10 rounded-xl
                        px-4 py-3 text-white placeholder:text-white/30
                        focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20
                        focus:bg-white/10
                        transition-all duration-200
                        ${leftElement ? 'pl-10' : ''}
                        ${rightElement ? 'pr-10' : ''}
                        ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : ''}
                        ${className}
                    `}
                    {...props}
                />

                {rightElement && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
                        {rightElement}
                    </div>
                )}
            </div>

            {error && (
                <p className="mt-1.5 text-sm text-red-400">{error}</p>
            )}

            {hint && !error && (
                <p className="mt-1.5 text-sm text-white/40">{hint}</p>
            )}
        </div>
    );
});

SilkInput.displayName = 'SilkInput';

// ============================================
// SILK BADGE - Status Indicators
// ============================================

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold';

interface SilkBadgeProps {
    children: ReactNode;
    variant?: BadgeVariant;
    dot?: boolean;
    size?: 'sm' | 'md';
}

const badgeVariants: Record<BadgeVariant, string> = {
    default: 'bg-white/10 text-white/80',
    success: 'bg-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/20 text-amber-400',
    danger: 'bg-red-500/20 text-red-400',
    info: 'bg-blue-500/20 text-blue-400',
    gold: 'bg-gradient-to-r from-amber-500/30 to-yellow-400/30 text-amber-300',
};

export function SilkBadge({
    children,
    variant = 'default',
    dot = false,
    size = 'sm',
}: SilkBadgeProps) {
    return (
        <span
            className={`
                inline-flex items-center gap-1.5
                rounded-full font-medium
                ${badgeVariants[variant]}
                ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
            `}
        >
            {dot && (
                <span className={`w-1.5 h-1.5 rounded-full bg-current`} />
            )}
            {children}
        </span>
    );
}

// ============================================
// SILK AVATAR - Profile Image with Ring
// ============================================

interface SilkAvatarProps {
    src?: string | null;
    alt?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    ring?: boolean;
    ringColor?: 'gradient' | 'gold' | 'violet' | 'rose';
    fallback?: string;
    status?: 'online' | 'offline' | 'away';
}

const avatarSizes: Record<string, number> = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
    '2xl': 96,
};

const ringColors: Record<string, string> = {
    gradient: 'bg-gradient-to-r from-violet-500 via-rose-500 to-amber-500',
    gold: 'bg-gradient-to-r from-amber-400 to-yellow-300',
    violet: 'bg-gradient-to-r from-violet-500 to-purple-500',
    rose: 'bg-gradient-to-r from-rose-500 to-pink-500',
};

export function SilkAvatar({
    src,
    alt = 'Avatar',
    size = 'md',
    ring = false,
    ringColor = 'gradient',
    fallback,
    status,
}: SilkAvatarProps) {
    const sizeValue = avatarSizes[size];
    const ringWidth = size === 'xs' || size === 'sm' ? 2 : 3;

    return (
        <div
            className="relative inline-flex"
            style={{ width: sizeValue, height: sizeValue }}
        >
            {/* Ring */}
            {ring && (
                <div
                    className={`absolute inset-0 rounded-full ${ringColors[ringColor]} p-[${ringWidth}px]`}
                    style={{ padding: ringWidth }}
                >
                    <div className="w-full h-full rounded-full bg-[#050508]" />
                </div>
            )}

            {/* Avatar */}
            <div
                className={`
                    relative rounded-full overflow-hidden bg-white/10
                    flex items-center justify-center
                    ${ring ? '' : ''}
                `}
                style={{
                    width: ring ? sizeValue - ringWidth * 2 - 2 : sizeValue,
                    height: ring ? sizeValue - ringWidth * 2 - 2 : sizeValue,
                    margin: ring ? ringWidth + 1 : 0,
                }}
            >
                {src ? (
                    <img src={src} alt={alt} className="w-full h-full object-cover" />
                ) : (
                    <span
                        className="font-semibold text-white/60 uppercase"
                        style={{ fontSize: sizeValue * 0.4 }}
                    >
                        {fallback || alt?.[0] || '?'}
                    </span>
                )}
            </div>

            {/* Status indicator */}
            {status && (
                <span
                    className={`
                        absolute bottom-0 right-0 rounded-full border-2 border-[#050508]
                        ${status === 'online' ? 'bg-emerald-500' : ''}
                        ${status === 'away' ? 'bg-amber-500' : ''}
                        ${status === 'offline' ? 'bg-white/30' : ''}
                    `}
                    style={{
                        width: sizeValue * 0.25,
                        height: sizeValue * 0.25,
                    }}
                />
            )}
        </div>
    );
}

// ============================================
// SILK DIVIDER - Arabesque Pattern
// ============================================

interface SilkDividerProps {
    variant?: 'line' | 'arabesque' | 'dots';
    className?: string;
}

export function SilkDivider({ variant = 'line', className = '' }: SilkDividerProps) {
    if (variant === 'line') {
        return <div className={`h-px bg-gradient-to-r from-transparent via-white/10 to-transparent ${className}`} />;
    }

    if (variant === 'dots') {
        return (
            <div className={`flex items-center justify-center gap-1.5 py-2 ${className}`}>
                <span className="w-1 h-1 rounded-full bg-amber-500/50" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70" />
                <EightPointedStar className="w-3 h-3 text-amber-500" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70" />
                <span className="w-1 h-1 rounded-full bg-amber-500/50" />
            </div>
        );
    }

    // Arabesque pattern
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/10" />
            <EightPointedStar className="w-4 h-4 text-amber-500/60" />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/10" />
        </div>
    );
}

// ============================================
// SILK TOOLTIP
// ============================================

interface SilkTooltipProps {
    children: ReactNode;
    content: ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export function SilkTooltip({ children, content, position = 'top' }: SilkTooltipProps) {
    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    return (
        <div className="relative group inline-flex">
            {children}
            <div
                className={`
                    absolute ${positionClasses[position]}
                    px-3 py-1.5 rounded-lg
                    bg-black/90 backdrop-blur-sm border border-white/10
                    text-sm text-white whitespace-nowrap
                    opacity-0 invisible group-hover:opacity-100 group-hover:visible
                    transition-all duration-200
                    z-50
                `}
            >
                {content}
            </div>
        </div>
    );
}

// ============================================
// SILK TOAST - Notification System
// ============================================

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface SilkToastProps {
    type?: ToastType;
    title: string;
    message?: string;
    onClose?: () => void;
}

const toastIcons: Record<ToastType, ReactNode> = {
    success: (
        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    ),
    error: (
        <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
    warning: (
        <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    ),
    info: (
        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
};

export function SilkToast({ type = 'info', title, message, onClose }: SilkToastProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="
                flex items-start gap-3 p-4 rounded-2xl
                bg-black/80 backdrop-blur-xl border border-white/10
                shadow-xl shadow-black/30
                min-w-[300px] max-w-md
            "
        >
            <div className="flex-shrink-0 mt-0.5">
                {toastIcons[type]}
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{title}</p>
                {message && (
                    <p className="mt-1 text-sm text-white/60">{message}</p>
                )}
            </div>

            {onClose && (
                <button
                    onClick={onClose}
                    className="flex-shrink-0 text-white/40 hover:text-white transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </motion.div>
    );
}

// ============================================
// EXPORTS
// ============================================

export {
    type SilkButtonProps,
    type SilkCardProps,
    type SilkInputProps,
    type SilkBadgeProps,
    type SilkAvatarProps,
    type SilkToastProps,
    type SilkSpinnerProps,
};
