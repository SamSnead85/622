import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as darkColors, lightColors } from '@zerog/ui';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    mode: ThemeMode;
    isDark: boolean;
    colors: typeof darkColors;
    setMode: (mode: ThemeMode) => void;
}

const THEME_KEY = '@0g-theme-mode';

const ThemeContext = createContext<ThemeContextType>({
    mode: 'dark',
    isDark: true,
    colors: darkColors,
    setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme();
    const [mode, setModeState] = useState<ThemeMode>('dark');
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem(THEME_KEY).then((stored) => {
            if (stored === 'light' || stored === 'dark' || stored === 'system') {
                setModeState(stored);
            }
            setIsReady(true);
        }).catch(() => setIsReady(true));
    }, []);

    const setMode = useCallback((newMode: ThemeMode) => {
        setModeState(newMode);
        AsyncStorage.setItem(THEME_KEY, newMode).catch(() => {});
    }, []);

    const isDark = mode === 'system' ? systemScheme !== 'light' : mode === 'dark';
    const themeColors = isDark ? darkColors : lightColors;

    if (!isReady) {
        return null;
    }

    return (
        <ThemeContext.Provider value={{ mode, isDark, colors: themeColors, setMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
