'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type TransitionPreset = 'fade' | 'slideUp' | 'slideRight' | 'scaleUp';

const presets = {
    fade: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2, ease: 'easeInOut' },
    },
    slideUp: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
        transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
    },
    slideRight: {
        initial: { opacity: 0, x: 30 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -30 },
        transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
    },
    scaleUp: {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.98 },
        transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
    },
};

const reducedPreset = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 },
};

interface PageTransitionProps {
    children: React.ReactNode;
    preset?: TransitionPreset;
}

export function PageTransition({ children, preset = 'fade' }: PageTransitionProps) {
    const pathname = usePathname();
    const reducedMotion = useReducedMotion();
    const config = reducedMotion ? reducedPreset : presets[preset];

    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={pathname}
                initial={config.initial}
                animate={config.animate}
                exit={config.exit}
                transition={config.transition}
                style={{ minHeight: '100%' }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
