// Mock for @zerog/ui design system tokens
// Provides real values so component snapshots are meaningful

const colors = {
    obsidian: {
        900: '#0A0A0B',
        800: '#121214',
        700: '#1A1A1D',
        600: '#232328',
        500: '#2D2D32',
        400: '#3D3D44',
        300: '#4D4D56',
    },
    gold: {
        500: '#7C8FFF',
        400: '#99AAFF',
        300: '#B8C4FF',
        600: '#6070EE',
        700: '#4F5FDD',
    },
    amber: {
        500: '#A78BFA',
        400: '#C4B5FD',
        300: '#DDD6FE',
        600: '#7C3AED',
        700: '#6D28D9',
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
        gold: '#7C8FFF',
        goldLight: '#99AAFF',
    },
    text: {
        primary: '#FAFAFA',
        secondary: '#A0A0A8',
        muted: '#6B6B75',
        inverse: '#0A0A0B',
    },
    surface: {
        glass: 'rgba(255, 255, 255, 0.04)',
        glassHover: 'rgba(255, 255, 255, 0.07)',
        glassActive: 'rgba(255, 255, 255, 0.10)',
        overlay: 'rgba(0, 0, 0, 0.7)',
        overlayLight: 'rgba(0, 0, 0, 0.4)',
        overlayMedium: 'rgba(0, 0, 0, 0.6)',
        overlayHeavy: 'rgba(0, 0, 0, 0.8)',
        goldSubtle: 'rgba(124, 143, 255, 0.08)',
        goldLight: 'rgba(124, 143, 255, 0.12)',
        goldMedium: 'rgba(124, 143, 255, 0.16)',
        goldStrong: 'rgba(124, 143, 255, 0.30)',
        goldFaded: 'rgba(124, 143, 255, 0.04)',
        coralSubtle: 'rgba(239, 68, 68, 0.1)',
        azureSubtle: 'rgba(59, 130, 246, 0.12)',
    },
    border: {
        subtle: 'rgba(255, 255, 255, 0.08)',
        default: 'rgba(255, 255, 255, 0.12)',
        strong: 'rgba(255, 255, 255, 0.20)',
    },
    gradients: {
        goldShine: ['#7C8FFF', '#99AAFF', '#7C8FFF'],
        obsidianFade: ['#0A0A0B', '#1A1A1D'],
        glassOverlay: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'],
    },
};

const lightColors = {
    obsidian: {
        900: '#FFFFFF',
        800: '#FAFBFC',
        700: '#F3F4F6',
        600: '#E5E7EB',
        500: '#D1D5DB',
        400: '#9CA3AF',
        300: '#6B7280',
    },
    gold: {
        500: '#5B6BF0',
        400: '#7C8FFF',
        300: '#99AAFF',
        600: '#4F5FDD',
        700: '#4050CC',
    },
    amber: {
        500: '#8B5CF6',
        400: '#A78BFA',
        300: '#C4B5FD',
        600: '#7C3AED',
        700: '#6D28D9',
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
        gold: '#7C8FFF',
        goldLight: '#99AAFF',
    },
    text: {
        primary: '#111827',
        secondary: '#4B5563',
        muted: '#9CA3AF',
        inverse: '#FFFFFF',
    },
    surface: {
        glass: 'rgba(0, 0, 0, 0.02)',
        glassHover: 'rgba(0, 0, 0, 0.04)',
        glassActive: 'rgba(0, 0, 0, 0.06)',
        overlay: 'rgba(0, 0, 0, 0.5)',
        overlayLight: 'rgba(0, 0, 0, 0.15)',
        overlayMedium: 'rgba(0, 0, 0, 0.35)',
        overlayHeavy: 'rgba(0, 0, 0, 0.6)',
        goldSubtle: 'rgba(91, 107, 240, 0.05)',
        goldLight: 'rgba(91, 107, 240, 0.08)',
        goldMedium: 'rgba(91, 107, 240, 0.12)',
        goldStrong: 'rgba(91, 107, 240, 0.20)',
        goldFaded: 'rgba(91, 107, 240, 0.03)',
        coralSubtle: 'rgba(239, 68, 68, 0.06)',
        azureSubtle: 'rgba(37, 99, 235, 0.06)',
    },
    border: {
        subtle: 'rgba(0, 0, 0, 0.06)',
        default: 'rgba(0, 0, 0, 0.10)',
        strong: 'rgba(0, 0, 0, 0.18)',
    },
    gradients: {
        goldShine: ['#5B6BF0', '#7C8FFF', '#5B6BF0'],
        obsidianFade: ['#FFFFFF', '#F3F4F6'],
        glassOverlay: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)'],
    },
};

const spacing = {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
    '3xl': 48,
    '4xl': 64,
};

const borderRadius = {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    full: 9999,
};

const typography = {
    fontFamily: { sans: 'Inter', mono: 'JetBrains Mono' },
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
    sizes: {
        xs: 11,
        sm: 13,
        md: 15,
        lg: 17,
        xl: 20,
        '2xl': 24,
        '3xl': 30,
    },
    fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
    lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
    letterSpacing: { tight: -0.5, normal: 0, wide: 0.5, wider: 1 },
};

const shadows = {
    none: 'none',
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 2 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 },
    glow: { shadowColor: '#7C8FFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 0 },
};

const lightShadows = {
    none: 'none',
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 16, elevation: 5 },
    glow: { shadowColor: '#6070EE', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 0 },
};

const animation = {
    duration: { instant: 100, fast: 200, normal: 300, slow: 500 },
    easing: {
        easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
        easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
};

const theme = { colors, spacing, borderRadius, typography, shadows, animation };

module.exports = {
    colors,
    lightColors,
    spacing,
    borderRadius,
    typography,
    shadows,
    lightShadows,
    animation,
    theme,
};
