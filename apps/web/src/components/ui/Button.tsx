'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// Premium Button Variants (Institutional Grade)
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({
        className,
        variant = 'primary',
        size = 'md',
        isLoading = false,
        fullWidth = false,
        disabled,
        children,
        ...props
    }, ref) => {
        const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0D]';

        const variants = {
            primary: 'bg-white text-black hover:bg-zinc-100 focus:ring-white shadow-sm active:scale-[0.98]',
            secondary: 'bg-white/8 text-white hover:bg-white/12 border border-white/10 hover:border-white/20 focus:ring-white/20',
            ghost: 'bg-transparent text-zinc-400 hover:text-white hover:bg-white/6 focus:ring-white/10',
            danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-sm active:scale-[0.98]',
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-sm rounded-md',
            md: 'px-4 py-2 text-sm rounded-lg',
            lg: 'px-6 py-2.5 text-base rounded-lg',
        };

        return (
            <button
                ref={ref}
                className={cn(
                    baseStyles,
                    variants[variant],
                    sizes[size],
                    fullWidth && 'w-full',
                    className
                )}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        {children}
                    </>
                ) : (
                    children
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
