// ============================================
// 0G Design System
// Dual-theme: Premium dark + Crystal-clear light
// ============================================

export const colors = {
    // Core Obsidian Palette (Dark)
    obsidian: {
        900: '#0A0A0B',
        800: '#121214',
        700: '#1A1A1D',
        600: '#232328',
        500: '#2D2D32',
        400: '#3D3D44',
        300: '#4D4D56',
    },

    // Primary Accent - Gold
    gold: {
        500: '#D4AF37',
        400: '#E5C158',
        300: '#F0D47A',
        600: '#B8942D',
        700: '#9A7A24',
    },

    // Secondary Accent - Amber
    amber: {
        500: '#F4A300',
        400: '#FFBA33',
        300: '#FFD066',
        600: '#D18E00',
        700: '#AE7600',
    },

    // Semantic Colors
    coral: {
        500: '#FF6B6B',
        400: '#FF8888',
        300: '#FFA5A5',
    },

    emerald: {
        500: '#10B981',
        400: '#34D399',
        300: '#6EE7B7',
    },

    azure: {
        500: '#3B82F6',
        400: '#60A5FA',
        300: '#93C5FD',
    },

    // Text Colors
    text: {
        primary: '#FAFAFA',
        secondary: '#A0A0A8',
        muted: '#6B6B75',
        inverse: '#0A0A0B',
    },

    // Surface & Border Colors
    surface: {
        glass: 'rgba(255, 255, 255, 0.03)',
        glassHover: 'rgba(255, 255, 255, 0.06)',
        glassActive: 'rgba(255, 255, 255, 0.08)',
        overlay: 'rgba(0, 0, 0, 0.7)',
        overlayLight: 'rgba(0, 0, 0, 0.4)',
        overlayMedium: 'rgba(0, 0, 0, 0.6)',
        overlayHeavy: 'rgba(0, 0, 0, 0.8)',
        goldSubtle: 'rgba(212, 175, 55, 0.08)',
        goldLight: 'rgba(212, 175, 55, 0.12)',
        goldMedium: 'rgba(212, 175, 55, 0.15)',
        goldStrong: 'rgba(212, 175, 55, 0.3)',
        goldFaded: 'rgba(212, 175, 55, 0.04)',
        coralSubtle: 'rgba(255, 82, 82, 0.1)',
        azureSubtle: 'rgba(59, 130, 246, 0.12)',
    },

    border: {
        subtle: 'rgba(255, 255, 255, 0.08)',
        default: 'rgba(255, 255, 255, 0.12)',
        strong: 'rgba(255, 255, 255, 0.20)',
    },

    // Gradients (as arrays for linear-gradient)
    gradients: {
        goldShine: ['#D4AF37', '#F0D47A', '#D4AF37'],
        obsidianFade: ['#0A0A0B', '#1A1A1D'],
        glassOverlay: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'],
    },
} as const;

// Dark theme alias (same as `colors`)
export const darkColors = colors;

// ============================================
// 0G Crystal Light Theme
// Liquid-glass clarity — bright, airy, futuristically clean
// ============================================

export const lightColors = {
    // Crystal Surface Palette (light equivalents of obsidian)
    obsidian: {
        900: '#FFFFFF',       // Primary background — pure white
        800: '#FAFBFC',       // Slightly off-white for depth
        700: '#F3F4F6',       // Card backgrounds, secondary surfaces
        600: '#E5E7EB',       // Dividers, inactive elements
        500: '#D1D5DB',       // Borders, disabled states
        400: '#9CA3AF',       // Muted icons
        300: '#6B7280',       // Secondary text weight
    },

    // Accents stay vibrant but slightly warmer for light backgrounds
    gold: {
        500: '#C9A227',       // Slightly deeper gold for white contrast
        400: '#D4AF37',
        300: '#E5C158',
        600: '#A88A1E',
        700: '#8B7218',
    },

    amber: {
        500: '#E09500',
        400: '#F4A300',
        300: '#FFBA33',
        600: '#C07F00',
        700: '#9E6800',
    },

    coral: {
        500: '#EF4444',       // Slightly deeper for light bg contrast
        400: '#F87171',
        300: '#FCA5A5',
    },

    emerald: {
        500: '#059669',       // Deeper green for readability on white
        400: '#10B981',
        300: '#34D399',
    },

    azure: {
        500: '#2563EB',       // Deeper blue for white contrast
        400: '#3B82F6',
        300: '#60A5FA',
    },

    // Text — high contrast, crisp readability
    text: {
        primary: '#111827',   // Near-black for maximum readability
        secondary: '#4B5563', // Medium gray — clear but not dominant
        muted: '#9CA3AF',     // Light gray for hints/placeholders
        inverse: '#FFFFFF',   // White text on dark surfaces
    },

    // Surfaces — clean, airy, minimal opacity tricks
    surface: {
        glass: 'rgba(0, 0, 0, 0.02)',         // Barely-there tint
        glassHover: 'rgba(0, 0, 0, 0.04)',
        glassActive: 'rgba(0, 0, 0, 0.06)',
        overlay: 'rgba(0, 0, 0, 0.5)',
        overlayLight: 'rgba(0, 0, 0, 0.15)',
        overlayMedium: 'rgba(0, 0, 0, 0.35)',
        overlayHeavy: 'rgba(0, 0, 0, 0.6)',
        goldSubtle: 'rgba(201, 162, 39, 0.06)',
        goldLight: 'rgba(201, 162, 39, 0.10)',
        goldMedium: 'rgba(201, 162, 39, 0.14)',
        goldStrong: 'rgba(201, 162, 39, 0.25)',
        goldFaded: 'rgba(201, 162, 39, 0.03)',
        coralSubtle: 'rgba(239, 68, 68, 0.06)',
        azureSubtle: 'rgba(37, 99, 235, 0.06)',
    },

    // Borders — crisp hairlines, not heavy
    border: {
        subtle: 'rgba(0, 0, 0, 0.06)',        // Barely visible dividers
        default: 'rgba(0, 0, 0, 0.10)',        // Standard borders
        strong: 'rgba(0, 0, 0, 0.18)',         // Emphasis borders
    },

    // Gradients — soft, luminous
    gradients: {
        goldShine: ['#C9A227', '#E5C158', '#C9A227'],
        obsidianFade: ['#FFFFFF', '#F3F4F6'],
        glassOverlay: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)'],
    },
} as const;

export const spacing = {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
    '3xl': 48,
    '4xl': 64,
} as const;

export const borderRadius = {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    full: 9999,
} as const;

export const typography = {
    // Font Families
    fontFamily: {
        sans: 'Inter',
        mono: 'JetBrains Mono',
    },

    // Font Sizes
    fontSize: {
        xs: 11,
        sm: 13,
        base: 15,
        lg: 17,
        xl: 20,
        '2xl': 24,
        '3xl': 30,
        '4xl': 36,
        '5xl': 48,
    },

    // Font Weights
    fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
    },

    // Line Heights
    lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
    },

    // Letter Spacing
    letterSpacing: {
        tight: -0.5,
        normal: 0,
        wide: 0.5,
        wider: 1,
    },
} as const;

export const shadows = {
    none: 'none',
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 8,
    },
    glow: {
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 0,
    },
} as const;

// Light-mode shadows — softer, more diffused for that airy feel
export const lightShadows = {
    none: 'none',
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 1,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 16,
        elevation: 5,
    },
    glow: {
        shadowColor: '#C9A227',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 0,
    },
} as const;

export const animation = {
    // Durations
    duration: {
        instant: 100,
        fast: 200,
        normal: 300,
        slow: 500,
    },

    // Easing curves
    easing: {
        easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
        easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
} as const;

// Composite theme object
export const theme = {
    colors,
    spacing,
    borderRadius,
    typography,
    shadows,
    animation,
} as const;

export type Theme = typeof theme;
export type Colors = typeof colors;
export type Spacing = typeof spacing;
