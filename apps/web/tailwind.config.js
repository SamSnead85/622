/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // === VOID - Deep warm canvas ===
                void: {
                    DEFAULT: '#0A0806',
                    elevated: '#1A1412',
                    surface: '#221C18',
                },

                // === NEON - Warm accent system ===
                aurora: {
                    amber: '#FFB020',
                    'amber-bright': '#FFCC33',
                    pink: '#FF3366',
                    'pink-bright': '#FF6B8A',
                    yellow: '#FFE066',
                    'yellow-bright': '#FFF0AA',
                    // Legacy aliases for backward compat
                    violet: '#FFB020',
                    'violet-bright': '#FFCC33',
                    cyan: '#FFB020',
                    'cyan-bright': '#FFCC33',
                    rose: '#FF3366',
                    'rose-bright': '#FF6B8A',
                },

                // === EMBER - Warm accent ===
                ember: {
                    DEFAULT: '#FFB020',
                    bright: '#FFCC33',
                },

                // === GLASS - Warm-tinted surfaces ===
                glass: {
                    ultra: 'rgba(255, 176, 32, 0.02)',
                    light: 'rgba(255, 176, 32, 0.04)',
                    medium: 'rgba(255, 176, 32, 0.06)',
                    heavy: 'rgba(255, 176, 32, 0.10)',
                    border: 'rgba(255, 176, 32, 0.08)',
                    'border-bright': 'rgba(255, 176, 32, 0.18)',
                },

                // === LEGACY GRAYS (warm-tinted) ===
                gray: {
                    50: '#FFF8F0',
                    100: '#FFF3E6',
                    200: '#FFEDD5',
                    300: '#FFE0B2',
                    400: '#BFA882',
                    500: '#8C7A60',
                    600: '#5E5445',
                    700: '#3D352E',
                    800: '#2A231E',
                    850: '#221C18',
                    900: '#1A1412',
                    925: '#12100E',
                    950: '#0A0806',
                },
            },
            fontFamily: {
                sans: [
                    'var(--font-inter, Inter)',
                    '-apple-system',
                    'BlinkMacSystemFont',
                    'Segoe UI',
                    'Roboto',
                    'sans-serif',
                ],
                display: [
                    'var(--font-display, Space Grotesk)',
                    '-apple-system',
                    'BlinkMacSystemFont',
                    'sans-serif',
                ],
                arabic: [
                    'Noto Sans Arabic',
                    'Segoe UI',
                    'Tahoma',
                    'sans-serif',
                ],
            },
            fontSize: {
                // === DISPLAY - Hero headlines ===
                'display-2xl': ['5rem', { lineHeight: '1', letterSpacing: '-0.03em', fontWeight: '700' }],
                'display-xl': ['4rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '700' }],
                'display-lg': ['3rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '600' }],
                'display': ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '600' }],

                // === HEADINGS ===
                'title-xl': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
                'title-lg': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
                'title': ['1.25rem', { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '600' }],

                // === BODY ===
                'body-lg': ['1.125rem', { lineHeight: '1.7', fontWeight: '400' }],
                'body': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
                'body-sm': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],

                // === UTILITY ===
                'caption': ['0.875rem', { lineHeight: '1.5', fontWeight: '500' }],
                'micro': ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],
                'nano': ['0.625rem', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.05em' }],
            },
            spacing: {
                '18': '4.5rem',
                '22': '5.5rem',
                '26': '6.5rem',
                '30': '7.5rem',
                '34': '8.5rem',
                '38': '9.5rem',
            },
            borderRadius: {
                '2xl': '16px',
                '3xl': '24px',
                '4xl': '32px',
            },
            animation: {
                // === ENTRANCE ===
                'fade-in': 'fadeIn 0.6s ease-out forwards',
                'fade-up': 'fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'scale-in': 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',

                // === AMBIENT ===
                'float': 'float 6s ease-in-out infinite',
                'float-slow': 'float 8s ease-in-out infinite',
                'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
                'aurora-shift': 'auroraShift 15s ease infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'neon-flicker': 'neonFlicker 3s ease-in-out infinite',

                // === PARTICLES ===
                'particle-1': 'particleFloat 15s ease-in-out infinite',
                'particle-2': 'particleFloat 20s ease-in-out infinite 5s',
                'particle-3': 'particleFloat 18s ease-in-out infinite 10s',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeUp: {
                    '0%': { opacity: '0', transform: 'translateY(30px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(100%)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
                    '50%': { transform: 'translateY(-20px) rotate(2deg)' },
                },
                pulseGlow: {
                    '0%, 100%': { opacity: '0.4' },
                    '50%': { opacity: '0.8' },
                },
                auroraShift: {
                    '0%, 100%': {
                        backgroundPosition: '0% 50%',
                        filter: 'hue-rotate(0deg)',
                    },
                    '50%': {
                        backgroundPosition: '100% 50%',
                        filter: 'hue-rotate(15deg)',
                    },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                neonFlicker: {
                    '0%, 100%': { opacity: '1' },
                    '5%': { opacity: '0.85' },
                    '10%': { opacity: '1' },
                    '50%': { opacity: '0.95' },
                    '55%': { opacity: '1' },
                },
                particleFloat: {
                    '0%, 100%': {
                        transform: 'translateY(0) translateX(0)',
                        opacity: '0.3',
                    },
                    '25%': {
                        transform: 'translateY(-30px) translateX(10px)',
                        opacity: '0.6',
                    },
                    '50%': {
                        transform: 'translateY(-20px) translateX(-10px)',
                        opacity: '0.4',
                    },
                    '75%': {
                        transform: 'translateY(-40px) translateX(5px)',
                        opacity: '0.5',
                    },
                },
            },
            transitionTimingFunction: {
                'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
                'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            },
            transitionDuration: {
                '400': '400ms',
                '600': '600ms',
                '800': '800ms',
            },
            backdropBlur: {
                'xs': '2px',
                '3xl': '64px',
                '4xl': '80px',
            },
            boxShadow: {
                'glow-amber': '0 0 40px rgba(255, 176, 32, 0.4)',
                'glow-pink': '0 0 40px rgba(255, 51, 102, 0.4)',
                'glow-yellow': '0 0 40px rgba(255, 224, 102, 0.3)',
                // Legacy aliases
                'glow-violet': '0 0 40px rgba(255, 176, 32, 0.4)',
                'glow-cyan': '0 0 40px rgba(255, 176, 32, 0.4)',
                'glow-rose': '0 0 40px rgba(255, 51, 102, 0.4)',
                'glow-ember': '0 0 40px rgba(255, 176, 32, 0.4)',
                'glass': '0 8px 32px rgba(10, 8, 6, 0.4), inset 0 1px 0 rgba(255, 176, 32, 0.05)',
                'card': '0 4px 24px rgba(10, 8, 6, 0.3)',
                'elevated': '0 16px 48px rgba(10, 8, 6, 0.5)',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'aurora': 'linear-gradient(135deg, rgba(255, 176, 32, 0.15), rgba(255, 51, 102, 0.1), rgba(255, 224, 102, 0.05))',
            },
        },
    },
    plugins: [
        // RTL variant plugin
        function ({ addVariant }) {
            addVariant('rtl', '[dir="rtl"] &');
            addVariant('ltr', '[dir="ltr"] &');
        },
    ],
};
