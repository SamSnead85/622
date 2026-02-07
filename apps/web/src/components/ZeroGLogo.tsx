'use client';

import { motion } from 'framer-motion';

interface ZeroGLogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
    animated?: boolean;
    variant?: 'full' | 'mark' | 'minimal';
    className?: string;
    showTagline?: boolean;
}

const sizeMap = {
    sm: { width: 28, height: 28, text: 14 },
    md: { width: 40, height: 40, text: 18 },
    lg: { width: 56, height: 56, text: 24 },
    xl: { width: 80, height: 80, text: 32 },
    hero: { width: 120, height: 120, text: 48 },
};

/**
 * ZEROG LOGO - "The Path"
 * 
 * Design Philosophy:
 * - Subtle, modern, and inclusive
 * - A single flowing path/journey line that forms "622"
 * - Hints at migration/journey without religious iconography
 * - Clean, premium, and scalable
 * - Colors: Warm twilight gradient (amber → coral → violet)
 * 
 * The number 622 is historically significant as the year of the Hijra,
 * but this is represented abstractly as a "path" - universal and inclusive.
 */
export function ZeroGLogo({
    size = 'md',
    animated = true,
    variant = 'full',
    className = '',
    showTagline = false
}: ZeroGLogoProps) {
    const dims = sizeMap[size];
    const isLarge = size === 'lg' || size === 'xl' || size === 'hero';

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {/* The Path Mark */}
            <motion.svg
                width={dims.width}
                height={dims.height}
                viewBox="0 0 80 80"
                initial={animated ? { opacity: 0, scale: 0.9 } : {}}
                animate={animated ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            >
                <defs>
                    {/* Main gradient: Warm sunset journey */}
                    <linearGradient id="path-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F59E0B" />
                        <stop offset="50%" stopColor="#F43F5E" />
                        <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>

                    {/* Subtle glow */}
                    <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* 
                    THE PATH - A flowing line that subtly echoes "622"
                    Read as: starting point → journey line → destination
                    Abstract enough to be universal, not explicitly numeric
                */}

                {/* Journey Path - flowing S-curve representing the journey */}
                <motion.path
                    d="M 12 58 
                       C 12 42, 28 30, 40 30
                       C 52 30, 52 45, 40 48
                       C 28 51, 28 65, 40 65
                       C 55 65, 68 50, 68 35"
                    fill="none"
                    stroke="url(#path-gradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    filter="url(#soft-glow)"
                    initial={animated ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 1 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                />

                {/* Origin Point - where the journey begins */}
                <motion.circle
                    cx="12"
                    cy="58"
                    r="4"
                    fill="#F59E0B"
                    initial={animated ? { scale: 0 } : { scale: 1 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                />

                {/* Destination Point - the North Star / guiding light */}
                <motion.circle
                    cx="68"
                    cy="35"
                    r="3.5"
                    fill="#8B5CF6"
                    initial={animated ? { scale: 0 } : { scale: 1 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1, duration: 0.3 }}
                />

                {/* Subtle sparkle at destination */}
                {animated && (
                    <motion.circle
                        cx="68"
                        cy="35"
                        r="6"
                        fill="none"
                        stroke="#8B5CF6"
                        strokeWidth="1"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{
                            opacity: [0, 0.5, 0],
                            scale: [0.5, 1.5, 0.5]
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                )}
            </motion.svg>

            {/* Wordmark */}
            {variant === 'full' && (
                <motion.div
                    className="flex flex-col"
                    initial={animated ? { opacity: 0, x: -8 } : {}}
                    animate={animated ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.5 }}
                >
                    <span
                        className="font-bold tracking-tight"
                        style={{
                            fontSize: dims.text * 1.3,
                            lineHeight: 1,
                            background: 'linear-gradient(135deg, #F59E0B 0%, #F43F5E 50%, #8B5CF6 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        0G
                    </span>
                    {(showTagline || isLarge) && (
                        <span
                            className="text-white/40 font-medium tracking-wide"
                            style={{ fontSize: Math.max(10, dims.text * 0.35) }}
                        >
                            without the weight
                        </span>
                    )}
                </motion.div>
            )}

            {variant === 'minimal' && (
                <motion.span
                    className="font-bold tracking-tight"
                    style={{
                        fontSize: dims.text * 1.2,
                        background: 'linear-gradient(135deg, #F59E0B 0%, #F43F5E 50%, #8B5CF6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}
                    initial={animated ? { opacity: 0 } : {}}
                    animate={animated ? { opacity: 1 } : {}}
                    transition={{ duration: 0.4, delay: 0.3 }}
                >
                    0G
                </motion.span>
            )}
        </div>
    );
}

/**
 * Extended Journey Hero - For landing pages and hero sections
 * A larger, more elaborate version with particle trails
 */
export function JourneyHero({ className = '' }: { className?: string }) {
    return (
        <div className={`relative ${className}`}>
            <motion.svg
                viewBox="0 0 600 400"
                className="w-full h-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
            >
                <defs>
                    <linearGradient id="hero-journey-grad" x1="0%" y1="50%" x2="100%" y2="50%">
                        <stop offset="0%" stopColor="#F59E0B" />
                        <stop offset="40%" stopColor="#F43F5E" />
                        <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>

                    <filter id="hero-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    <radialGradient id="origin-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                    </radialGradient>

                    <radialGradient id="dest-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* The Great Journey Path */}
                <motion.path
                    d="M 80 280 
                       C 80 180, 180 120, 260 140
                       C 340 160, 340 260, 280 280
                       C 220 300, 220 340, 300 340
                       C 400 340, 480 280, 520 180"
                    fill="none"
                    stroke="url(#hero-journey-grad)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    filter="url(#hero-glow)"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2.5, ease: "easeOut" }}
                />

                {/* Secondary path - lighter */}
                <motion.path
                    d="M 100 260 
                       C 100 180, 190 130, 260 150
                       C 330 170, 330 250, 280 265
                       C 230 280, 230 320, 295 320
                       C 380 320, 460 270, 500 190"
                    fill="none"
                    stroke="url(#hero-journey-grad)"
                    strokeWidth="2"
                    strokeOpacity="0.3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2.2, ease: "easeOut", delay: 0.3 }}
                />

                {/* Origin point with glow */}
                <motion.g
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                >
                    <circle cx="80" cy="280" r="30" fill="url(#origin-glow)" />
                    <circle cx="80" cy="280" r="10" fill="#F59E0B" />
                    <circle cx="80" cy="280" r="5" fill="#FEF3C7" />
                </motion.g>

                {/* Destination star */}
                <motion.g
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 2.2, duration: 0.5 }}
                >
                    <circle cx="520" cy="180" r="40" fill="url(#dest-glow)" />
                    <circle cx="520" cy="180" r="12" fill="#8B5CF6" />
                    <circle cx="520" cy="180" r="5" fill="#E9D5FF" />

                    {/* Subtle rays */}
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                        <motion.line
                            key={angle}
                            x1={520 + Math.cos(angle * Math.PI / 180) * 18}
                            y1={180 + Math.sin(angle * Math.PI / 180) * 18}
                            x2={520 + Math.cos(angle * Math.PI / 180) * 28}
                            y2={180 + Math.sin(angle * Math.PI / 180) * 28}
                            stroke="#8B5CF6"
                            strokeWidth="2"
                            strokeLinecap="round"
                            initial={{ opacity: 0, pathLength: 0 }}
                            animate={{ opacity: 0.6, pathLength: 1 }}
                            transition={{ delay: 2.5 + i * 0.05, duration: 0.3 }}
                        />
                    ))}
                </motion.g>

                {/* Floating waypoint particles along the journey */}
                {[0.2, 0.4, 0.6, 0.8].map((t, i) => (
                    <motion.circle
                        key={i}
                        r="3"
                        fill={['#F59E0B', '#FB923C', '#F43F5E', '#A855F7'][i]}
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: [0, 1, 0],
                            // Approximate positions along the path
                            cx: [150 + i * 100, 160 + i * 100, 150 + i * 100],
                            cy: [200 + (i % 2) * 60, 190 + (i % 2) * 60, 200 + (i % 2) * 60],
                        }}
                        transition={{
                            duration: 2 + i * 0.5,
                            repeat: Infinity,
                            delay: i * 0.5,
                            ease: "easeInOut"
                        }}
                    />
                ))}
            </motion.svg>
        </div>
    );
}

// Keep backward compatibility
export { JourneyHero as GatewayHero };
export default ZeroGLogo;
