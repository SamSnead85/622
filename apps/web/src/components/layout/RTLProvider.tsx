'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { type Locale, defaultLocale, getDirection, localeNames, locales } from '@/i18n/config';

interface I18nContextType {
    locale: Locale;
    direction: 'ltr' | 'rtl';
    isRTL: boolean;
    setLocale: (locale: Locale) => void;
    t: (key: string) => string;
    localeNames: Record<Locale, string>;
    availableLocales: readonly Locale[];
}

const I18nContext = createContext<I18nContextType>({
    locale: defaultLocale,
    direction: 'ltr',
    isRTL: false,
    setLocale: () => {},
    t: (key: string) => key,
    localeNames,
    availableLocales: locales,
});

export function useI18n() {
    return useContext(I18nContext);
}

export function useDirection() {
    const { direction } = useI18n();
    return direction;
}

export function useLocale() {
    const { locale, setLocale } = useI18n();
    return { locale, setLocale };
}

interface I18nProviderProps {
    children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
    const [locale, setLocaleState] = useState<Locale>(defaultLocale);
    const [messages, setMessages] = useState<Record<string, any>>({});

    // Load saved locale
    useEffect(() => {
        const saved = localStorage.getItem('0g_locale') as Locale | null;
        if (saved && locales.includes(saved as any)) {
            setLocaleState(saved as Locale);
        }
    }, []);

    // Load messages when locale changes
    useEffect(() => {
        import(`@/i18n/messages/${locale}.json`)
            .then((mod) => setMessages(mod.default || mod))
            .catch(() => {
                // Fallback to English
                import('@/i18n/messages/en.json')
                    .then((mod) => setMessages(mod.default || mod))
                    .catch(() => {});
            });
    }, [locale]);

    // Update HTML attributes when locale changes
    useEffect(() => {
        const dir = getDirection(locale);
        document.documentElement.setAttribute('dir', dir);
        document.documentElement.setAttribute('lang', locale);
    }, [locale]);

    const setLocale = useCallback((newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem('0g_locale', newLocale);
    }, []);

    const t = useCallback((key: string): string => {
        const keys = key.split('.');
        let value: any = messages;
        for (const k of keys) {
            value = value?.[k];
            if (value === undefined) return key;
        }
        return typeof value === 'string' ? value : key;
    }, [messages]);

    const direction = getDirection(locale);
    const isRTL = direction === 'rtl';

    return (
        <I18nContext.Provider
            value={{
                locale,
                direction,
                isRTL,
                setLocale,
                t,
                localeNames,
                availableLocales: locales,
            }}
        >
            {children}
        </I18nContext.Provider>
    );
}
