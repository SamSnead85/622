'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ============================================
// THEME CONTEXT - Global dark/light mode management
// ============================================

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('dark');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Load from localStorage or preferences
        const savedTheme = localStorage.getItem('0g_theme') as Theme;
        if (savedTheme) {
            setThemeState(savedTheme);
        }
    }, []);

    useEffect(() => {
        if (!mounted) return;

        // Apply theme to document
        const root = document.documentElement;
        if (theme === 'light') {
            root.classList.add('light-mode');
            root.classList.remove('dark-mode');
        } else {
            root.classList.add('dark-mode');
            root.classList.remove('light-mode');
        }

        // Save to localStorage
        localStorage.setItem('0g_theme', theme);
    }, [theme, mounted]);

    const toggleTheme = useCallback(() => {
        setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
    }, []);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
    }, []);

    const value = {
        theme,
        toggleTheme,
        setTheme,
        isDark: theme === 'dark',
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        // Return default values if not in provider
        return {
            theme: 'dark' as Theme,
            toggleTheme: () => { },
            setTheme: () => { },
            isDark: true,
        };
    }
    return context;
}
