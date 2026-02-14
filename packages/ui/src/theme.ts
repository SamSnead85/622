// ============================================
// 0G Design System — "The People's Network"
// Revolutionary activist soul, retro-warm neon skin
// Three modes: Dark, Warm Dark (default), Light
// Primary accent: Amber neon — warm gold glow
// Secondary accent: Hot pink — protest energy
// ============================================

// ============================================
// DARK MODE — True dark, warm-tinted accents
// ============================================
export const colors = {
    // Core Obsidian Palette (Dark)
    obsidian: {
        900: '#0A0A0B',
        800: '#12110F',
        700: '#1C1916',
        600: '#26221E',
        500: '#302B26',
        400: '#3D3630',
        300: '#4D453D',
    },

    // Primary Accent — Amber Neon (warm gold glow)
    gold: {
        500: '#FFB020',       // Amber neon — like a warm neon sign
        400: '#FFCC33',       // Lighter — hover/active states
        300: '#FFE066',       // Lightest — highlights, sparks
        600: '#E09000',       // Deeper — pressed states
        700: '#C07800',       // Darkest — strong emphasis
    },

    // Secondary Accent — Hot Pink (protest energy)
    amber: {
        500: '#FF3366',
        400: '#FF6B8A',
        300: '#FF99B3',
        600: '#E0204D',
        700: '#C01040',
    },

    // Semantic Colors
    coral: {
        500: '#EF4444',
        400: '#F87171',
        300: '#FCA5A5',
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

    // Badge/Verification Gold
    badge: {
        gold: '#D4AF37',
        goldLight: '#E5C158',
    },

    // Text Colors — warm-tinted whites
    text: {
        primary: '#F5F0E8',
        secondary: '#A89E90',
        muted: '#6B6258',
        inverse: '#1A1412',
    },

    // Surface & Border Colors — warm-tinted glass
    surface: {
        glass: 'rgba(255, 176, 32, 0.04)',
        glassHover: 'rgba(255, 176, 32, 0.07)',
        glassActive: 'rgba(255, 176, 32, 0.10)',
        overlay: 'rgba(0, 0, 0, 0.7)',
        overlayLight: 'rgba(0, 0, 0, 0.4)',
        overlayMedium: 'rgba(0, 0, 0, 0.6)',
        overlayHeavy: 'rgba(0, 0, 0, 0.8)',
        goldSubtle: 'rgba(255, 176, 32, 0.10)',
        goldLight: 'rgba(255, 176, 32, 0.15)',
        goldMedium: 'rgba(255, 176, 32, 0.20)',
        goldStrong: 'rgba(255, 176, 32, 0.35)',
        goldFaded: 'rgba(255, 176, 32, 0.05)',
        coralSubtle: 'rgba(239, 68, 68, 0.1)',
        azureSubtle: 'rgba(59, 130, 246, 0.12)',
    },

    border: {
        subtle: 'rgba(255, 176, 32, 0.08)',
        default: 'rgba(255, 176, 32, 0.12)',
        strong: 'rgba(255, 176, 32, 0.20)',
    },

    // Gradients — warm amber-to-pink
    gradients: {
        goldShine: ['#FFB020', '#FFCC33', '#FFB020'],
        obsidianFade: ['#0A0A0B', '#1C1916'],
        glassOverlay: ['rgba(255, 176, 32, 0.08)', 'rgba(255, 176, 32, 0.02)'],
    },
} as const;

// Dark theme alias
export const darkColors = colors;

// ============================================
// WARM DARK MODE — Deep warm charcoal, full neon
// The signature 0G experience — like a warm room at night
// ============================================
export const warmDarkColors = {
    obsidian: {
        900: '#1A1412',       // Deep warm charcoal — not pure black
        800: '#221C18',
        700: '#2A231E',
        600: '#332C26',
        500: '#3D352E',
        400: '#4D4438',
        300: '#5E5445',
    },

    // Primary Accent — Amber Neon (full warmth)
    gold: {
        500: '#FFB020',
        400: '#FFCC33',
        300: '#FFE066',
        600: '#E09000',
        700: '#C07800',
    },

    // Secondary Accent — Hot Pink
    amber: {
        500: '#FF3366',
        400: '#FF6B8A',
        300: '#FF99B3',
        600: '#E0204D',
        700: '#C01040',
    },

    coral: {
        500: '#EF4444',
        400: '#F87171',
        300: '#FCA5A5',
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

    badge: {
        gold: '#D4AF37',
        goldLight: '#E5C158',
    },

    // Text — warm white, cozy
    text: {
        primary: '#FFF5E6',
        secondary: '#BFB09E',
        muted: '#7A6E60',
        inverse: '#1A1412',
    },

    // Surfaces — warm-tinted, cozy glass
    surface: {
        glass: 'rgba(255, 176, 32, 0.05)',
        glassHover: 'rgba(255, 176, 32, 0.08)',
        glassActive: 'rgba(255, 176, 32, 0.12)',
        overlay: 'rgba(10, 8, 6, 0.7)',
        overlayLight: 'rgba(10, 8, 6, 0.4)',
        overlayMedium: 'rgba(10, 8, 6, 0.6)',
        overlayHeavy: 'rgba(10, 8, 6, 0.8)',
        goldSubtle: 'rgba(255, 176, 32, 0.10)',
        goldLight: 'rgba(255, 176, 32, 0.15)',
        goldMedium: 'rgba(255, 176, 32, 0.22)',
        goldStrong: 'rgba(255, 176, 32, 0.38)',
        goldFaded: 'rgba(255, 176, 32, 0.06)',
        coralSubtle: 'rgba(239, 68, 68, 0.1)',
        azureSubtle: 'rgba(59, 130, 246, 0.12)',
    },

    border: {
        subtle: 'rgba(255, 176, 32, 0.10)',
        default: 'rgba(255, 176, 32, 0.15)',
        strong: 'rgba(255, 176, 32, 0.25)',
    },

    gradients: {
        goldShine: ['#FFB020', '#FFCC33', '#FFE066'],
        obsidianFade: ['#1A1412', '#2A231E'],
        glassOverlay: ['rgba(255, 176, 32, 0.10)', 'rgba(255, 176, 32, 0.03)'],
    },
} as const;

// ============================================
// LIGHT MODE — Warm cream, deeper accents
// ============================================
export const lightColors = {
    obsidian: {
        900: '#FFF8F0',       // Warm cream — not sterile white
        800: '#FFF3E6',
        700: '#FFEDD5',
        600: '#FFE0B2',
        500: '#FFD699',
        400: '#BFA882',
        300: '#8C7A60',
    },

    // Primary Accent — Deeper amber for readability on cream
    gold: {
        500: '#E09000',
        400: '#FFB020',
        300: '#FFCC33',
        600: '#C07800',
        700: '#A06000',
    },

    // Secondary Accent — Deeper pink
    amber: {
        500: '#E02050',
        400: '#FF3366',
        300: '#FF6B8A',
        600: '#C01040',
        700: '#A00830',
    },

    coral: {
        500: '#EF4444',
        400: '#F87171',
        300: '#FCA5A5',
    },

    emerald: {
        500: '#059669',
        400: '#10B981',
        300: '#34D399',
    },

    azure: {
        500: '#2563EB',
        400: '#3B82F6',
        300: '#60A5FA',
    },

    badge: {
        gold: '#B8942D',
        goldLight: '#D4AF37',
    },

    // Text — warm dark, high contrast on cream
    text: {
        primary: '#2A1A0A',
        secondary: '#5C4A38',
        muted: '#9C8A78',
        inverse: '#FFF8F0',
    },

    // Surfaces — warm-tinted
    surface: {
        glass: 'rgba(160, 96, 0, 0.03)',
        glassHover: 'rgba(160, 96, 0, 0.06)',
        glassActive: 'rgba(160, 96, 0, 0.09)',
        overlay: 'rgba(42, 26, 10, 0.5)',
        overlayLight: 'rgba(42, 26, 10, 0.15)',
        overlayMedium: 'rgba(42, 26, 10, 0.35)',
        overlayHeavy: 'rgba(42, 26, 10, 0.6)',
        goldSubtle: 'rgba(224, 144, 0, 0.08)',
        goldLight: 'rgba(224, 144, 0, 0.12)',
        goldMedium: 'rgba(224, 144, 0, 0.16)',
        goldStrong: 'rgba(224, 144, 0, 0.25)',
        goldFaded: 'rgba(224, 144, 0, 0.04)',
        coralSubtle: 'rgba(239, 68, 68, 0.06)',
        azureSubtle: 'rgba(37, 99, 235, 0.06)',
    },

    border: {
        subtle: 'rgba(160, 96, 0, 0.08)',
        default: 'rgba(160, 96, 0, 0.12)',
        strong: 'rgba(160, 96, 0, 0.20)',
    },

    gradients: {
        goldShine: ['#E09000', '#FFB020', '#E09000'],
        obsidianFade: ['#FFF8F0', '#FFEDD5'],
        glassOverlay: ['rgba(255, 248, 240, 0.9)', 'rgba(255, 248, 240, 0.6)'],
    },
} as const;

// ============================================
// SPACING, BORDER RADIUS, TYPOGRAPHY
// ============================================

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
    sm: 6,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 28,
    full: 9999,
} as const;

export const typography = {
    // Font Families
    fontFamily: {
        sans: 'Inter',
        display: 'SpaceGrotesk',
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

// ============================================
// SHADOWS — warm-tinted
// ============================================

export const shadows = {
    none: 'none',
    sm: {
        shadowColor: '#1A1412',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#1A1412',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: '#1A1412',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 8,
    },
    glow: {
        shadowColor: '#FFB020',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 14,
        elevation: 0,
    },
} as const;

// Warm dark shadows — slightly warmer glow
export const warmDarkShadows = {
    none: 'none',
    sm: {
        shadowColor: '#0A0806',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.35,
        shadowRadius: 3,
        elevation: 2,
    },
    md: {
        shadowColor: '#0A0806',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
        elevation: 4,
    },
    lg: {
        shadowColor: '#0A0806',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.55,
        shadowRadius: 18,
        elevation: 8,
    },
    glow: {
        shadowColor: '#FFB020',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 0,
    },
} as const;

// Light-mode shadows — softer, warm-tinted
export const lightShadows = {
    none: 'none',
    sm: {
        shadowColor: '#8C6A30',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 1,
    },
    md: {
        shadowColor: '#8C6A30',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    lg: {
        shadowColor: '#8C6A30',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 16,
        elevation: 5,
    },
    glow: {
        shadowColor: '#E09000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
        elevation: 0,
    },
} as const;

export const animation = {
    duration: {
        instant: 100,
        fast: 200,
        normal: 300,
        slow: 500,
    },

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
