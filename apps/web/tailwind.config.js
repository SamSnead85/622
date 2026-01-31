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
                // Pure monochromatic scale - no color tints
                gray: {
                    50: '#fafafa',
                    100: '#f5f5f5',
                    200: '#e5e5e5',
                    300: '#d4d4d4',
                    400: '#a3a3a3',
                    500: '#737373',
                    600: '#525252',
                    700: '#404040',
                    800: '#262626',
                    850: '#1a1a1a',
                    900: '#171717',
                    925: '#111111',
                    950: '#0a0a0a',
                },
                // Single accent - restrained use only
                brand: {
                    DEFAULT: '#ffffff',
                    muted: 'rgba(255, 255, 255, 0.7)',
                    subtle: 'rgba(255, 255, 255, 0.5)',
                    faint: 'rgba(255, 255, 255, 0.1)',
                },
            },
            fontFamily: {
                sans: [
                    'Inter',
                    '-apple-system',
                    'BlinkMacSystemFont',
                    'Segoe UI',
                    'Roboto',
                    'sans-serif',
                ],
                display: [
                    'Inter',
                    '-apple-system',
                    'BlinkMacSystemFont',
                    'sans-serif',
                ],
            },
            fontSize: {
                // Refined type scale
                'display-xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '600' }],
                'display-lg': ['3.75rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '600' }],
                'display': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '600' }],
                'title-lg': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
                'title': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
                'body-lg': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }],
                'body': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
                'caption': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
                'micro': ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],
            },
            spacing: {
                '18': '4.5rem',
                '22': '5.5rem',
                '30': '7.5rem',
                '34': '8.5rem',
            },
            animation: {
                'fade-in': 'fadeIn 0.6s ease-out',
                'fade-up': 'fadeUp 0.8s ease-out',
                'scale-in': 'scaleIn 0.5s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeUp: {
                    '0%': { opacity: '0', transform: 'translateY(24px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.98)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
            },
            transitionTimingFunction: {
                'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
            },
            transitionDuration: {
                '400': '400ms',
                '600': '600ms',
            },
        },
    },
    plugins: [],
};
