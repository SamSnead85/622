'use client';

import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { ReactNode, useState, useEffect, useCallback, useRef } from 'react';

// ============================================
// PREMIUM EFFECTS LIBRARY
// Six22 Silk Road Renaissance Motion System
// ============================================

// ============================================
// PARALLAX CONTAINER
// Multi-layer depth effect on scroll
// ============================================

interface ParallaxLayerProps {
    children: ReactNode;
    depth?: number; // 0 = no movement, 1 = full movement
    className?: string;
}

export function ParallaxContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`relative ${className}`}>
            {children}
        </div>
    );
}

export function ParallaxLayer({ children, depth = 0.5, className = '' }: ParallaxLayerProps) {
    const y = useMotionValue(0);

    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            y.set(scrollY * depth * -0.1);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [depth, y]);

    return (
        <motion.div style={{ y }} className={className}>
            {children}
        </motion.div>
    );
}

// ============================================
// MAGNETIC BUTTON
// Follows cursor when nearby
// ============================================

interface MagneticButtonProps {
    children: ReactNode;
    className?: string;
    strength?: number;
    onClick?: () => void;
}

export function MagneticButton({ children, className = '', strength = 0.3, onClick }: MagneticButtonProps) {
    const ref = useRef<HTMLButtonElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const springConfig = { stiffness: 150, damping: 15 };
    const springX = useSpring(x, springConfig);
    const springY = useSpring(y, springConfig);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!ref.current) return;

        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const distanceX = e.clientX - centerX;
        const distanceY = e.clientY - centerY;

        x.set(distanceX * strength);
        y.set(distanceY * strength);
    }, [strength, x, y]);

    const handleMouseLeave = useCallback(() => {
        x.set(0);
        y.set(0);
    }, [x, y]);

    return (
        <motion.button
            ref={ref}
            style={{ x: springX, y: springY }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            className={className}
        >
            {children}
        </motion.button>
    );
}

// ============================================
// CONFETTI BURST
// Celebration animation
// ============================================

interface ConfettiPiece {
    id: number;
    x: number;
    y: number;
    rotation: number;
    color: string;
    size: number;
    delay: number;
}

const CONFETTI_COLORS = ['#8B5CF6', '#F43F5E', '#F59E0B', '#10B981', '#06B6D4', '#D4AF37'];

export function ConfettiBurst({ trigger, count = 50 }: { trigger: boolean; count?: number }) {
    const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

    useEffect(() => {
        if (trigger) {
            const newPieces = Array.from({ length: count }, (_, i) => ({
                id: i,
                x: Math.random() * 100,
                y: Math.random() * 100,
                rotation: Math.random() * 360,
                color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                size: Math.random() * 8 + 4,
                delay: Math.random() * 0.5,
            }));
            setPieces(newPieces);

            setTimeout(() => setPieces([]), 3000);
        }
    }, [trigger, count]);

    return (
        <AnimatePresence>
            {pieces.map((piece) => (
                <motion.div
                    key={piece.id}
                    initial={{ opacity: 1, scale: 0 }}
                    animate={{
                        opacity: [1, 1, 0],
                        scale: [0, 1, 1],
                        x: [0, (piece.x - 50) * 10],
                        y: [0, (piece.y - 50) * 10 - 100],
                        rotate: [0, piece.rotation],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2, delay: piece.delay }}
                    className="fixed pointer-events-none"
                    style={{
                        left: '50%',
                        top: '50%',
                        width: piece.size,
                        height: piece.size,
                        backgroundColor: piece.color,
                        borderRadius: Math.random() > 0.5 ? '50%' : '0',
                        zIndex: 9999,
                    }}
                />
            ))}
        </AnimatePresence>
    );
}

// ============================================
// STAR FIELD BACKGROUND
// Atmospheric particle system
// ============================================

interface Star {
    id: number;
    x: number;
    y: number;
    size: number;
    opacity: number;
    animationDuration: number;
}

export function StarField({ count = 100 }: { count?: number }) {
    const [stars, setStars] = useState<Star[]>([]);

    useEffect(() => {
        const newStars = Array.from({ length: count }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 2 + 1,
            opacity: Math.random() * 0.5 + 0.2,
            animationDuration: Math.random() * 3 + 2,
        }));
        setStars(newStars);
    }, [count]);

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
            {stars.map((star) => (
                <motion.div
                    key={star.id}
                    className="absolute rounded-full bg-white"
                    animate={{
                        opacity: [star.opacity, star.opacity * 2, star.opacity],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: star.animationDuration,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                    style={{
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        width: star.size,
                        height: star.size,
                    }}
                />
            ))}
        </div>
    );
}

// ============================================
// GLOW CURSOR
// Premium cursor effect
// ============================================

export function GlowCursor() {
    const cursorX = useMotionValue(0);
    const cursorY = useMotionValue(0);

    const springConfig = { stiffness: 500, damping: 28 };
    const cursorXSpring = useSpring(cursorX, springConfig);
    const cursorYSpring = useSpring(cursorY, springConfig);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            cursorX.set(e.clientX);
            cursorY.set(e.clientY);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [cursorX, cursorY]);

    return (
        <motion.div
            className="fixed w-96 h-96 pointer-events-none z-0"
            style={{
                left: cursorXSpring,
                top: cursorYSpring,
                x: '-50%',
                y: '-50%',
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 60%)',
            }}
        />
    );
}

// ============================================
// RIPPLE EFFECT
// Touch feedback animation
// ============================================

interface RippleProps {
    color?: string;
    duration?: number;
}

export function useRipple({ color = 'rgba(255, 255, 255, 0.3)', duration = 600 }: RippleProps = {}) {
    const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number; size: number }>>([]);

    const createRipple = useCallback((e: React.MouseEvent<HTMLElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 2;
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        const id = Date.now();

        setRipples((prev) => [...prev, { id, x, y, size }]);

        setTimeout(() => {
            setRipples((prev) => prev.filter((r) => r.id !== id));
        }, duration);
    }, [duration]);

    const RippleContainer = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
        <div className={`relative overflow-hidden ${className}`} onClick={createRipple}>
            {children}
            <AnimatePresence>
                {ripples.map((ripple) => (
                    <motion.span
                        key={ripple.id}
                        initial={{ scale: 0, opacity: 0.5 }}
                        animate={{ scale: 1, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: duration / 1000 }}
                        className="absolute rounded-full pointer-events-none"
                        style={{
                            left: ripple.x,
                            top: ripple.y,
                            width: ripple.size,
                            height: ripple.size,
                            backgroundColor: color,
                        }}
                    />
                ))}
            </AnimatePresence>
        </div>
    );

    return { createRipple, RippleContainer };
}

// ============================================
// FLIP CARD
// 3D flip animation
// ============================================

interface FlipCardProps {
    front: ReactNode;
    back: ReactNode;
    flipped?: boolean;
    onFlip?: () => void;
    className?: string;
}

export function FlipCard({ front, back, flipped = false, onFlip, className = '' }: FlipCardProps) {
    const [isFlipped, setIsFlipped] = useState(flipped);

    return (
        <div
            className={`relative preserve-3d cursor-pointer ${className}`}
            style={{ perspective: 1000 }}
            onClick={() => {
                setIsFlipped(!isFlipped);
                onFlip?.();
            }}
        >
            <motion.div
                className="relative w-full h-full"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
                style={{ transformStyle: 'preserve-3d' }}
            >
                <div
                    className="absolute inset-0 backface-hidden"
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    {front}
                </div>
                <div
                    className="absolute inset-0 backface-hidden"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                    {back}
                </div>
            </motion.div>
        </div>
    );
}

// ============================================
// TYPEWRITER TEXT
// Animated text reveal
// ============================================

interface TypewriterProps {
    text: string;
    speed?: number;
    delay?: number;
    className?: string;
    onComplete?: () => void;
}

export function Typewriter({ text, speed = 50, delay = 0, className = '', onComplete }: TypewriterProps) {
    const [displayText, setDisplayText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        setDisplayText('');
        setIsComplete(false);

        const timeout = setTimeout(() => {
            let i = 0;
            const interval = setInterval(() => {
                if (i < text.length) {
                    setDisplayText(text.slice(0, i + 1));
                    i++;
                } else {
                    clearInterval(interval);
                    setIsComplete(true);
                    onComplete?.();
                }
            }, speed);

            return () => clearInterval(interval);
        }, delay);

        return () => clearTimeout(timeout);
    }, [text, speed, delay, onComplete]);

    return (
        <span className={className}>
            {displayText}
            {!isComplete && (
                <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                >
                    |
                </motion.span>
            )}
        </span>
    );
}

// ============================================
// STAGGERED LIST
// Animated list container
// ============================================

interface StaggeredListProps {
    children: ReactNode[];
    staggerDelay?: number;
    className?: string;
}

export function StaggeredList({ children, staggerDelay = 0.1, className = '' }: StaggeredListProps) {
    return (
        <motion.div className={className}>
            {children.map((child, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * staggerDelay, duration: 0.3 }}
                >
                    {child}
                </motion.div>
            ))}
        </motion.div>
    );
}

// ============================================
// MORPHING SHAPE
// Smooth blob animation
// ============================================

export function MorphingBlob({ className = '' }: { className?: string }) {
    return (
        <motion.div
            className={`absolute bg-gradient-to-r from-violet-500 to-rose-500 opacity-30 blur-3xl ${className}`}
            animate={{
                borderRadius: [
                    '60% 40% 30% 70% / 60% 30% 70% 40%',
                    '30% 60% 70% 40% / 50% 60% 30% 60%',
                    '60% 40% 30% 70% / 60% 30% 70% 40%',
                ],
                scale: [1, 1.1, 1],
            }}
            transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
        />
    );
}

// ============================================
// NUMBER COUNTER
// Animated counting
// ============================================

interface NumberCounterProps {
    value: number;
    duration?: number;
    className?: string;
    format?: (n: number) => string;
}

export function NumberCounter({ value, duration = 1, className = '', format }: NumberCounterProps) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const startTime = Date.now();
        const startValue = count;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / (duration * 1000), 1);

            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.round(startValue + (value - startValue) * easeOut);

            setCount(currentValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value, duration]);

    return <span className={className}>{format ? format(count) : count}</span>;
}

// ============================================
// EXPORTS
// ============================================

export {
    type ParallaxLayerProps,
    type MagneticButtonProps,
    type FlipCardProps,
    type TypewriterProps,
    type StaggeredListProps,
    type NumberCounterProps,
};
