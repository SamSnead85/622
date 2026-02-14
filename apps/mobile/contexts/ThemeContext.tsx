import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as darkColors, warmDarkColors, lightColors, shadows, warmDarkShadows, lightShadows } from '@zerog/ui';

type ThemeMode = 'light' | 'dark' | 'warm' | 'system';

interface ThemeContextType {
    mode: ThemeMode;
    isDark: boolean;
    colors: typeof darkColors & { background: string };
    shadows: typeof shadows;
    setMode: (mode: ThemeMode) => void;
}

const THEME_KEY = '@0g-theme-mode';

const ThemeContext = createContext<ThemeContextType>({
    mode: 'warm',
    isDark: true,
    colors: { ...warmDarkColors, background: warmDarkColors.obsidian[900] },
    shadows: warmDarkShadows,
    setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme();
    const [mode, setModeState] = useState<ThemeMode>('warm');
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(THEME_KEY).then((stored) => {
            if (stored === 'light' || stored === 'dark' || stored === 'warm' || stored === 'system') {
                setModeState(stored);
            }
            setIsReady(true);
        }).catch(() => setIsReady(true));
    }, []);

    const setMode = useCallback((newMode: ThemeMode) => {
        setModeState(newMode);
        AsyncStorage.setItem(THEME_KEY, newMode).catch(() => {});
    }, []);

    // Resolve the effective theme
    const resolvedMode = mode === 'system'
        ? (systemScheme === 'light' ? 'light' : 'warm')  // System dark → warm dark (the signature 0G experience)
        : mode;

    const isDark = resolvedMode !== 'light';

    const baseColors = resolvedMode === 'light'
        ? lightColors
        : resolvedMode === 'warm'
            ? warmDarkColors
            : darkColors;

    const themeColors = useMemo(() => ({
        ...baseColors,
        background: baseColors.obsidian[900],
    }), [baseColors]);

    const themeShadows = resolvedMode === 'light'
        ? lightShadows
        : resolvedMode === 'warm'
            ? warmDarkShadows
            : shadows;

    if (!isReady) {
        return null;
    }

    return (
        <ThemeContext.Provider value={{ mode, isDark, colors: themeColors, shadows: themeShadows, setMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

const fallbackColors = { ...warmDarkColors, background: warmDarkColors.obsidian[900] };

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    // Defensive: ensure colors is always defined even if context is incomplete
    if (!ctx.colors) {
        return { ...ctx, colors: fallbackColors };
    }
    return ctx;
};
export default ThemeContext;
