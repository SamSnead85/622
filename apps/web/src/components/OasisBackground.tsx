'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

// ============================================
// OASIS BACKGROUND
// Premium atmospheric background with subtle
// Middle Eastern/Islamic design influence
// ============================================

// Subtle arabesque pattern - geometric but not overtly religious
function ArabesquePattern() {
    return (
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="oasis-arabesque" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                    {/* Interlocking arches - subtle mihrab reference */}
                    <g fill="none" stroke="url(#arabesque-gradient)" strokeWidth="0.5">
                        {/* Central arch */}
                        <path d="M 50 10 Q 50 40, 30 50 Q 50 60, 70 50 Q 50 40, 50 10" />
                        {/* Corner flourishes */}
                        <path d="M 0 0 Q 15 15, 0 30" />
                        <path d="M 100 0 Q 85 15, 100 30" />
                        <path d="M 0 100 Q 15 85, 0 70" />
                        <path d="M 100 100 Q 85 85, 100 70" />
                        {/* Connecting lines */}
                        <circle cx="50" cy="50" r="8" opacity="0.5" />
                        <circle cx="0" cy="50" r="4" opacity="0.3" />
                        <circle cx="100" cy="50" r="4" opacity="0.3" />
                        <circle cx="50" cy="0" r="4" opacity="0.3" />
                        <circle cx="50" cy="100" r="4" opacity="0.3" />
                    </g>
                </pattern>
                <linearGradient id="arabesque-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7C8FFF" />
                    <stop offset="100%" stopColor="#E8927C" />
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#oasis-arabesque)" />
        </svg>
    );
}

// 8-pointed star decorations
function StarField() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(12)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute"
                    style={{
                        left: `${10 + (i * 7) % 80}%`,
                        top: `${5 + (i * 11) % 90}%`,
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: [0.1, 0.3, 0.1], scale: 1 }}
                    transition={{
                        duration: 4 + i * 0.5,
                        repeat: Infinity,
                        delay: i * 0.3
                    }}
                >
                    <EightPointedStar size={6 + (i % 3) * 4} />
                </motion.div>
            ))}
        </div>
    );
}

// Eight-pointed star SVG (Rub el Hizb inspired)
function EightPointedStar({ size = 12, className = '' }: { size?: number; className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={className}
            fill="none"
        >
            <path
                d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z"
                fill="url(#star-gradient)"
                opacity="0.6"
            />
            <defs>
                <linearGradient id="star-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7C8FFF" />
                    <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
            </defs>
        </svg>
    );
}

// Crescent moon accent
export function CrescentMoon({ size = 16, className = '' }: { size?: number; className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={className}
            fill="none"
        >
            <path
                d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                fill="url(#moon-gradient)"
            />
            <defs>
                <linearGradient id="moon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7C8FFF" />
                    <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
            </defs>
        </svg>
    );
}

// Main Oasis Background Component
export function OasisBackground() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <div className="fixed inset-0 bg-[#0A0908]" />;

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
            {/* Deep desert night base */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0A0908] via-[#0F0D0A] to-[#1A1512]" />

            {/* Subtle arabesque overlay */}
            <ArabesquePattern />

            {/* Floating stars */}
            <StarField />

            {/* Warm glow from horizon - sunset/twilight feel */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 h-[60%]"
                style={{
                    background: 'radial-gradient(ellipse at 50% 100%, rgba(212,175,55,0.08) 0%, rgba(232,146,124,0.04) 30%, transparent 70%)',
                }}
                animate={{
                    opacity: [0.8, 1, 0.8],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Oasis glow - center accent */}
            <motion.div
                className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(45,212,191,0.06) 0%, transparent 60%)',
                }}
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 0.8, 0.5],
                }}
                transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Dust/sand particles */}
            <div className="absolute inset-0">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 rounded-full bg-amber-200/20"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                            y: [0, -30, 0],
                            opacity: [0, 0.5, 0],
                        }}
                        transition={{
                            duration: 6 + Math.random() * 4,
                            repeat: Infinity,
                            delay: Math.random() * 5,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

export { EightPointedStar };
export default OasisBackground;
