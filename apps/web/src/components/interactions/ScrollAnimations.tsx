'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';

// Hook: track scroll progress 0-1
export function useScrollProgress(ref?: React.RefObject<HTMLElement>) {
    const { scrollYProgress } = useScroll(ref ? { target: ref } : undefined);
    return scrollYProgress;
}

// Component: reveal on scroll into view
interface ScrollRevealProps {
    children: React.ReactNode;
    direction?: 'up' | 'down' | 'left' | 'right';
    delay?: number;
    duration?: number;
    className?: string;
    once?: boolean;
}

export function ScrollReveal({
    children,
    direction = 'up',
    delay = 0,
    duration = 0.5,
    className = '',
    once = true,
}: ScrollRevealProps) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once, margin: '-50px' });

    const directionMap = {
        up: { y: 30, x: 0 },
        down: { y: -30, x: 0 },
        left: { x: 30, y: 0 },
        right: { x: -30, y: 0 },
    };

    const offset = directionMap[direction];

    return (
        <motion.div
            ref={ref}
            className={className}
            initial={{ opacity: 0, ...offset }}
            animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...offset }}
            transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
        >
            {children}
        </motion.div>
    );
}

// Component: scroll-linked header compression
interface CompressHeaderProps {
    children: React.ReactNode;
    maxHeight?: number;
    minHeight?: number;
    className?: string;
}

export function CompressHeader({
    children,
    maxHeight = 64,
    minHeight = 48,
    className = '',
}: CompressHeaderProps) {
    const { scrollY } = useScroll();
    const height = useTransform(scrollY, [0, 100], [maxHeight, minHeight]);
    const bgOpacity = useTransform(scrollY, [0, 100], [0, 0.95]);
    const borderOpacity = useTransform(scrollY, [0, 100], [0, 0.1]);

    return (
        <motion.header
            className={`sticky top-0 z-20 backdrop-blur-xl ${className}`}
            style={{
                height,
                backgroundColor: `rgba(0, 0, 0, ${bgOpacity.get()})`,
                borderBottom: `1px solid rgba(255, 255, 255, ${borderOpacity.get()})`,
            }}
        >
            <motion.div className="h-full flex items-center" style={{ height }}>
                {children}
            </motion.div>
        </motion.header>
    );
}

// Component: parallax depth layer
interface ParallaxLayerProps {
    children: React.ReactNode;
    speed?: number; // 0 = no movement, 1 = full speed, negative = opposite
    className?: string;
}

export function ParallaxLayer({ children, speed = 0.5, className = '' }: ParallaxLayerProps) {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start end', 'end start'],
    });
    const y = useTransform(scrollYProgress, [0, 1], [speed * -50, speed * 50]);

    return (
        <motion.div ref={ref} className={className} style={{ y }}>
            {children}
        </motion.div>
    );
}
