'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// DOUBLE-TAP HEART ANIMATION - Instagram style
// ============================================
export function DoubleTapHeart({
    children,
    onDoubleTap,
    className = ''
}: {
    children: React.ReactNode;
    onDoubleTap: () => void;
    className?: string;
}) {
    const [showHeart, setShowHeart] = useState(false);
    const lastTapRef = useRef<number>(0);
    const DOUBLE_TAP_DELAY = 300;

    const handleTap = useCallback(() => {
        const now = Date.now();
        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            // Double tap detected
            onDoubleTap();
            setShowHeart(true);
            setTimeout(() => setShowHeart(false), 1200);
        }
        lastTapRef.current = now;
    }, [onDoubleTap]);

    return (
        <div className={`relative ${className}`} onClick={handleTap}>
            {children}
            <AnimatePresence>
                {showHeart && (
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* Main heart */}
                        <motion.div
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: [0, 1.4, 1], rotate: [-20, 10, 0] }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="relative"
                        >
                            <span className="text-[100px] drop-shadow-[0_0_40px_rgba(255,0,100,0.8)]">❤️</span>
                        </motion.div>
                        {/* Particle burst */}
                        {[...Array(8)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-3 h-3 rounded-full"
                                style={{ background: i % 2 === 0 ? '#FF0064' : '#00D4FF' }}
                                initial={{ scale: 0, x: 0, y: 0 }}
                                animate={{
                                    scale: [0, 1, 0],
                                    x: Math.cos((i * 45 * Math.PI) / 180) * 100,
                                    y: Math.sin((i * 45 * Math.PI) / 180) * 100,
                                    opacity: [1, 1, 0],
                                }}
                                transition={{ duration: 0.7, delay: 0.1 }}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
