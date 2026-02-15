// ============================================
// 0G Design System — "The People's Network"
// Three modes: Dark (blue/black metallic), Warm Dark, Light
// Dark: Blue accent on metallic glass black — the signature 0G look
// Warm: Amber neon on warm charcoal — cozy night mode
// Light: Cool slate — clean daytime reading
// ============================================

// ============================================
// DARK MODE — Blue & Black Metallic Glass
// The original 0G identity: electric blue on deep black
// with metallic glass surfaces and cool-tinted depth
// ============================================
export const colors = {
    // Core Obsidian Palette — true black with cool blue undertone
    obsidian: {
        900: '#06080C',       // Near-black with blue undertone
        800: '#0C1018',       // Deep navy-black
        700: '#141A24',       // Elevated surface
        600: '#1C2430',       // Card backgrounds
        500: '#24303E',       // Muted fills
        400: '#344050',       // Disabled states
        300: '#485668',       // Heavier muted
    },

    // Primary Accent — Electric Blue (the 0G signature)
    gold: {
        500: '#4A90FF',       // Electric blue — primary brand color
        400: '#6AABFF',       // Lighter — hover/active
        300: '#8EC5FF',       // Lightest — highlights
        600: '#2A70E0',       // Deeper — pressed states
        700: '#1A58C0',       // Darkest — strong emphasis
    },

    // Secondary Accent — Cyan/Teal (complementary energy)
    amber: {
        500: '#00D4FF',
        400: '#40E0FF',
        300: '#80ECFF',
        600: '#00B0D4',
        700: '#0090AA',
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

    // Badge/Verification
    badge: {
        gold: '#4A90FF',
        goldLight: '#6AABFF',
    },

    // Text Colors — cool white on dark
    text: {
        primary: '#E8EDF5',
        secondary: '#8896AA',
        muted: '#556070',
        inverse: '#06080C',
    },

    // Surface & Border Colors — blue-tinted metallic glass
    surface: {
        glass: 'rgba(74, 144, 255, 0.04)',
        glassHover: 'rgba(74, 144, 255, 0.07)',
        glassActive: 'rgba(74, 144, 255, 0.10)',
        overlay: 'rgba(0, 0, 0, 0.7)',
        overlayLight: 'rgba(0, 0, 0, 0.4)',
        overlayMedium: 'rgba(0, 0, 0, 0.6)',
        overlayHeavy: 'rgba(0, 0, 0, 0.8)',
        goldSubtle: 'rgba(74, 144, 255, 0.10)',
        goldLight: 'rgba(74, 144, 255, 0.15)',
        goldMedium: 'rgba(74, 144, 255, 0.20)',
        goldStrong: 'rgba(74, 144, 255, 0.35)',
        goldFaded: 'rgba(74, 144, 255, 0.05)',
        coralSubtle: 'rgba(239, 68, 68, 0.1)',
        azureSubtle: 'rgba(59, 130, 246, 0.12)',
    },

    border: {
        subtle: 'rgba(74, 144, 255, 0.08)',
        default: 'rgba(74, 144, 255, 0.14)',
        strong: 'rgba(74, 144, 255, 0.22)',
    },

    // Gradients — blue metallic
    gradients: {
        goldShine: ['#4A90FF', '#6AABFF', '#4A90FF'],
        obsidianFade: ['#06080C', '#141A24'],
        glassOverlay: ['rgba(74, 144, 255, 0.08)', 'rgba(74, 144, 255, 0.02)'],
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
// LIGHT MODE — Cool slate with deep blue accent
// Matches the 0G identity: the same blue accent from dark mode,
// deepened for WCAG AA contrast on light backgrounds.
// Clean, modern, premium — like Linear, Notion, or Threads.
// ============================================
export const lightColors = {
    obsidian: {
        900: '#F8F9FB',       // Cool off-white — slight blue tint
        800: '#F0F2F5',       // Elevated surface
        700: '#E6E9EF',       // Card backgrounds
        600: '#D8DDE5',       // Dividers, subtle fills
        500: '#C0C8D4',       // Muted fills
        400: '#8C98A8',       // Disabled / placeholder
        300: '#64738A',       // Heavier muted
    },

    // Primary Accent — Deep Blue (same family as dark mode's electric blue)
    // Deepened for strong contrast on light backgrounds (WCAG AA)
    gold: {
        500: '#2563EB',       // Primary — rich deep blue, 4.6:1 on #F8F9FB
        400: '#3B82F6',       // Hover / lighter interactive
        300: '#60A5FA',       // Highlights, sparkles
        600: '#1D4ED8',       // Pressed / strong emphasis
        700: '#1E40AF',       // Darkest accent
    },

    // Secondary Accent — Indigo/Violet (cool complement)
    amber: {
        500: '#7C3AED',
        400: '#8B5CF6',
        300: '#A78BFA',
        600: '#6D28D9',
        700: '#5B21B6',
    },

    coral: {
        500: '#DC3545',
        400: '#E8525F',
        300: '#F08090',
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
        gold: '#2563EB',
        goldLight: '#3B82F6',
    },

    // Text — cool dark slate, high contrast on cool white
    text: {
        primary: '#0F172A',       // Slate 900 — strong contrast
        secondary: '#475569',     // Slate 600 — readable secondary
        muted: '#94A3B8',         // Slate 400 — cool muted
        inverse: '#FFFFFF',       // Pure white for dark-bg buttons
    },

    // Surfaces — cool blue-tinted glass
    surface: {
        glass: 'rgba(37, 99, 235, 0.03)',
        glassHover: 'rgba(37, 99, 235, 0.05)',
        glassActive: 'rgba(37, 99, 235, 0.08)',
        overlay: 'rgba(15, 23, 42, 0.5)',
        overlayLight: 'rgba(15, 23, 42, 0.10)',
        overlayMedium: 'rgba(15, 23, 42, 0.28)',
        overlayHeavy: 'rgba(15, 23, 42, 0.55)',
        goldSubtle: 'rgba(37, 99, 235, 0.05)',
        goldLight: 'rgba(37, 99, 235, 0.08)',
        goldMedium: 'rgba(37, 99, 235, 0.12)',
        goldStrong: 'rgba(37, 99, 235, 0.20)',
        goldFaded: 'rgba(37, 99, 235, 0.03)',
        coralSubtle: 'rgba(220, 53, 69, 0.06)',
        azureSubtle: 'rgba(37, 99, 235, 0.06)',
    },

    border: {
        subtle: 'rgba(15, 23, 42, 0.06)',
        default: 'rgba(15, 23, 42, 0.10)',
        strong: 'rgba(15, 23, 42, 0.18)',
    },

    gradients: {
        goldShine: ['#2563EB', '#3B82F6', '#2563EB'],
        obsidianFade: ['#F8F9FB', '#E6E9EF'],
        glassOverlay: ['rgba(248, 249, 251, 0.95)', 'rgba(248, 249, 251, 0.70)'],
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
        shadowColor: '#000810',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.35,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#000810',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000810',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.55,
        shadowRadius: 16,
        elevation: 8,
    },
    glow: {
        shadowColor: '#4A90FF',
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

// Light-mode shadows — cool blue-tinted, subtle
export const lightShadows = {
    none: 'none',
    sm: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    md: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
    },
    lg: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.09,
        shadowRadius: 16,
        elevation: 5,
    },
    glow: {
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.18,
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
