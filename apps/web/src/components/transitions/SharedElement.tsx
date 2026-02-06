'use client';

import { motion } from 'framer-motion';
import React from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface SharedElementProps {
    id: string;
    children: React.ReactNode;
    className?: string;
    as?: 'div' | 'span' | 'img' | 'section' | 'article';
}

export function SharedElement({ id, children, className = '', as = 'div' }: SharedElementProps) {
    const reducedMotion = useReducedMotion();
    const Component = motion[as] as any;

    return (
        <Component
            layoutId={reducedMotion ? undefined : id}
            className={className}
            layout={reducedMotion ? false : true}
            transition={{
                type: 'spring',
                stiffness: 350,
                damping: 30,
                mass: 0.8,
            }}
        >
            {children}
        </Component>
    );
}

// Convenience wrapper for avatar transitions
export function SharedAvatar({
    id,
    src,
    alt,
    size = 40,
    className = '',
}: {
    id: string;
    src?: string;
    alt: string;
    size?: number;
    className?: string;
}) {
    const reducedMotion = useReducedMotion();

    if (!src) {
        return (
            <motion.div
                layoutId={reducedMotion ? undefined : `avatar-${id}`}
                className={`rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] flex items-center justify-center text-black font-bold ${className}`}
                style={{ width: size, height: size, fontSize: size * 0.4 }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            >
                {alt[0]?.toUpperCase() || 'U'}
            </motion.div>
        );
    }

    return (
        <motion.img
            layoutId={reducedMotion ? undefined : `avatar-${id}`}
            src={src}
            alt={alt}
            className={`rounded-full object-cover ${className}`}
            style={{ width: size, height: size }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
    );
}
