'use client';

import { motion } from 'framer-motion';

// ============================================
// SIX22 REVOLUTIONARY LOGO
// A completely unique, animated brand mark
// Inspired by Year 622 CE - The Journey
// ============================================

interface Six22LogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
    animated?: boolean;
    variant?: 'full' | 'mark' | 'minimal';
    className?: string;
}

const sizeMap = {
    sm: { width: 32, height: 32, text: 12 },
    md: { width: 48, height: 48, text: 16 },
    lg: { width: 64, height: 64, text: 20 },
    xl: { width: 96, height: 96, text: 28 },
    hero: { width: 140, height: 140, text: 40 },
};

export function Six22Logo({
    size = 'md',
    animated = true,
    variant = 'full',
    className = ''
}: Six22LogoProps) {
    const dims = sizeMap[size];

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {/* The Revolutionary Mark */}
            <motion.svg
                width={dims.width}
                height={dims.height}
                viewBox="0 0 100 100"
                initial={animated ? { opacity: 0, scale: 0.8 } : {}}
                animate={animated ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            >
                <defs>
                    {/* Premium gradient - Desert Gold to Cosmic Violet */}
                    <linearGradient id="six22-brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#D4AF37">
                            {animated && <animate attributeName="stop-color" values="#D4AF37;#E8C547;#D4AF37" dur="4s" repeatCount="indefinite" />}
                        </stop>
                        <stop offset="35%" stopColor="#F59E0B" />
                        <stop offset="65%" stopColor="#F43F5E" />
                        <stop offset="100%" stopColor="#8B5CF6">
                            {animated && <animate attributeName="stop-color" values="#8B5CF6;#A78BFA;#8B5CF6" dur="4s" repeatCount="indefinite" />}
                        </stop>
                    </linearGradient>

                    {/* Inner glow */}
                    <radialGradient id="six22-inner-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="white" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </radialGradient>

                    {/* Outer glow filter */}
                    <filter id="six22-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Outer geometric frame - 6 sided for "6" */}
                <motion.polygon
                    points="50,5 90,27 90,73 50,95 10,73 10,27"
                    fill="none"
                    stroke="url(#six22-brand-grad)"
                    strokeWidth="2"
                    filter="url(#six22-glow)"
                    initial={animated ? { pathLength: 0, opacity: 0 } : {}}
                    animate={animated ? { pathLength: 1, opacity: 1 } : {}}
                    transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                />

                {/* Inner hexagon */}
                <motion.polygon
                    points="50,15 80,32 80,68 50,85 20,68 20,32"
                    fill="url(#six22-brand-grad)"
                    initial={animated ? { scale: 0, opacity: 0 } : {}}
                    animate={animated ? { scale: 1, opacity: 1 } : {}}
                    transition={{ duration: 0.5, delay: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                    style={{ transformOrigin: 'center' }}
                />

                {/* Inner glow overlay */}
                <polygon
                    points="50,15 80,32 80,68 50,85 20,68 20,32"
                    fill="url(#six22-inner-glow)"
                />

                {/* The "622" stylized - just the "6" as primary mark */}
                <motion.text
                    x="50"
                    y="58"
                    textAnchor="middle"
                    fill="white"
                    fontSize="38"
                    fontWeight="800"
                    fontFamily="'Outfit', sans-serif"
                    initial={animated ? { opacity: 0, y: 10 } : {}}
                    animate={animated ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.9 }}
                >
                    6
                </motion.text>

                {/* Crescent accent - subtle Islamic heritage */}
                <motion.path
                    d="M 70 25 A 15 15 0 1 1 70 45 A 12 12 0 1 0 70 25"
                    fill="#D4AF37"
                    opacity="0.8"
                    initial={animated ? { opacity: 0, scale: 0 } : {}}
                    animate={animated ? { opacity: 0.8, scale: 1 } : {}}
                    transition={{ duration: 0.3, delay: 1.1 }}
                    style={{ transformOrigin: '70px 35px' }}
                />

                {/* Orbital ring - journey symbolism */}
                {animated && (
                    <motion.ellipse
                        cx="50"
                        cy="50"
                        rx="48"
                        ry="48"
                        fill="none"
                        stroke="url(#six22-brand-grad)"
                        strokeWidth="0.5"
                        strokeDasharray="4 8"
                        initial={{ rotate: 0 }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                        style={{ transformOrigin: 'center' }}
                    />
                )}
            </motion.svg>

            {/* Wordmark */}
            {variant === 'full' && (
                <motion.div
                    className="flex flex-col"
                    initial={animated ? { opacity: 0, x: -10 } : {}}
                    animate={animated ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.8 }}
                >
                    <span
                        className="font-extrabold tracking-tight bg-gradient-to-r from-[#D4AF37] via-[#F59E0B] to-[#F43F5E] bg-clip-text text-transparent"
                        style={{ fontSize: dims.text * 1.5, lineHeight: 1 }}
                    >
                        SIX22
                    </span>
                    {size !== 'sm' && (
                        <span
                            className="text-white/50 tracking-widest uppercase"
                            style={{ fontSize: dims.text * 0.35 }}
                        >
                            The Journey
                        </span>
                    )}
                </motion.div>
            )}
        </div>
    );
}

// ============================================
// ANIMATED PATTERN BACKGROUND
// Unique to Six22 - nowhere else has this
// ============================================
export function Six22PatternBg({ opacity = 0.03 }: { opacity?: number }) {
    return (
        <svg className="absolute inset-0 w-full h-full" style={{ opacity }} xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="six22-unique-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                    {/* Interlocking hexagons - 6 for 622 */}
                    <polygon points="50,10 70,22 70,46 50,58 30,46 30,22" fill="none" stroke="#D4AF37" strokeWidth="0.5" />
                    <polygon points="50,42 70,54 70,78 50,90 30,78 30,54" fill="none" stroke="#F59E0B" strokeWidth="0.3" />
                    {/* Connecting paths - journey lines */}
                    <line x1="50" y1="58" x2="50" y2="42" stroke="#F43F5E" strokeWidth="0.3" />
                    <circle cx="50" cy="50" r="4" fill="none" stroke="#8B5CF6" strokeWidth="0.3" />
                </pattern>

                {/* Animated gradient overlay */}
                <linearGradient id="pattern-fade" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="black" stopOpacity="0" />
                    <stop offset="50%" stopColor="black" stopOpacity="1" />
                    <stop offset="100%" stopColor="black" stopOpacity="0" />
                </linearGradient>
            </defs>

            <rect width="100%" height="100%" fill="url(#six22-unique-pattern)" />
        </svg>
    );
}

// ============================================
// JOURNEY PATH DECORATION
// Visual metaphor for the platform's purpose
// ============================================
export function JourneyPath({ className = '' }: { className?: string }) {
    return (
        <motion.svg
            className={`absolute ${className}`}
            width="400"
            height="200"
            viewBox="0 0 400 200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
        >
            <defs>
                <linearGradient id="journey-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#D4AF37" stopOpacity="0" />
                    <stop offset="30%" stopColor="#D4AF37" stopOpacity="0.6" />
                    <stop offset="70%" stopColor="#F59E0B" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#F43F5E" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* The winding journey path */}
            <motion.path
                d="M 0 100 Q 100 20, 200 100 T 400 100"
                fill="none"
                stroke="url(#journey-grad)"
                strokeWidth="2"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 0.8, ease: "easeOut" }}
            />

            {/* Waypoints */}
            <motion.circle cx="100" cy="60" r="4" fill="#D4AF37"
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.5 }} />
            <motion.circle cx="200" cy="100" r="5" fill="#F59E0B"
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.8 }} />
            <motion.circle cx="300" cy="60" r="4" fill="#F43F5E"
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2.1 }} />
        </motion.svg>
    );
}

export default Six22Logo;
