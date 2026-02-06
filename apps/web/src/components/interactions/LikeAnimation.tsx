'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LikeAnimationProps {
    isLiked: boolean;
    count: number;
    onToggle: () => void;
    size?: number;
}

export function LikeAnimation({ isLiked, count, onToggle, size = 24 }: LikeAnimationProps) {
    const [particles, setParticles] = useState<number[]>([]);

    const handleClick = useCallback(() => {
        if (!isLiked) {
            // Generate particles on like
            setParticles(Array.from({ length: 6 }, (_, i) => i));
            setTimeout(() => setParticles([]), 700);
        }
        onToggle();
    }, [isLiked, onToggle]);

    return (
        <button
            onClick={handleClick}
            className="relative flex items-center gap-2 group"
            aria-label={isLiked ? 'Unlike' : 'Like'}
            aria-pressed={isLiked}
        >
            <div className="relative">
                <motion.svg
                    width={size}
                    height={size}
                    viewBox="0 0 24 24"
                    animate={isLiked ? {
                        scale: [1, 1.3, 0.95, 1.1, 1],
                    } : { scale: 1 }}
                    transition={{ duration: 0.4, ease: [0.17, 0.67, 0.21, 0.98] }}
                >
                    <motion.path
                        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                        fill={isLiked ? '#ef4444' : 'none'}
                        stroke={isLiked ? '#ef4444' : 'currentColor'}
                        strokeWidth={1.5}
                        animate={isLiked ? {
                            fill: ['none', '#ef4444'],
                        } : {}}
                        transition={{ duration: 0.2 }}
                    />
                </motion.svg>

                {/* Particle burst */}
                <AnimatePresence>
                    {particles.map((i) => {
                        const angle = (i / 6) * Math.PI * 2;
                        const colors = ['#ef4444', '#f97316', '#eab308', '#ec4899', '#8b5cf6', '#00D4FF'];
                        return (
                            <motion.span
                                key={`particle-${i}-${Date.now()}`}
                                className="absolute rounded-full"
                                style={{
                                    width: 4,
                                    height: 4,
                                    backgroundColor: colors[i % colors.length],
                                    top: '50%',
                                    left: '50%',
                                }}
                                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                                animate={{
                                    x: Math.cos(angle) * 20,
                                    y: Math.sin(angle) * 20,
                                    scale: [0, 1.2, 0],
                                    opacity: [1, 1, 0],
                                }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Count with bounce */}
            <AnimatePresence mode="wait">
                <motion.span
                    key={count}
                    className={`text-sm font-medium ${isLiked ? 'text-red-400' : 'text-white/60'}`}
                    initial={{ y: -8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 8, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                    {count > 0 ? count : ''}
                </motion.span>
            </AnimatePresence>
        </button>
    );
}
