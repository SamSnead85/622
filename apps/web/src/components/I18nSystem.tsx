'use client';

import { useState, createContext, useContext, useEffect } from 'react';

// ============================================
// TYPES
// ============================================

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'ar' | 'zh' | 'hi' | 'pt' | 'ru' | 'ja' | 'ko';
export type TextDirection = 'ltr' | 'rtl';

export interface LocaleConfig {
    code: SupportedLanguage;
    name: string;
    nativeName: string;
    direction: TextDirection;
    flag: string;
}

export const SUPPORTED_LOCALES: LocaleConfig[] = [
    { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr', flag: '🇪🇸' },
    { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr', flag: '🇫🇷' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', flag: '🇸🇦' },
    { code: 'zh', name: 'Chinese', nativeName: '中文', direction: 'ltr', flag: '🇨🇳' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr', flag: '🇮🇳' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr', flag: '🇧🇷' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'ltr', flag: '🇷🇺' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr', flag: '🇰🇷' },
];

// ============================================
// I18N CONTEXT
// ============================================

interface I18nContextType {
    locale: SupportedLanguage;
    direction: TextDirection;
    setLocale: (locale: SupportedLanguage) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
    formatDate: (date: Date, style?: 'short' | 'medium' | 'long') => string;
    formatNumber: (num: number) => string;
    formatCurrency: (amount: number, currency?: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) throw new Error('useI18n must be used within I18nProvider');
    return context;
}

// ============================================
// I18N PROVIDER
// ============================================

interface I18nProviderProps {
    children: React.ReactNode;
    defaultLocale?: SupportedLanguage;
    translations: Record<SupportedLanguage, Record<string, string>>;
}

export function I18nProvider({ children, defaultLocale = 'en', translations }: I18nProviderProps) {
    const [locale, setLocaleState] = useState<SupportedLanguage>(defaultLocale);
    const config = SUPPORTED_LOCALES.find(l => l.code === locale) || SUPPORTED_LOCALES[0];

    useEffect(() => {
        const saved = localStorage.getItem('preferred-locale') as SupportedLanguage;
        if (saved && SUPPORTED_LOCALES.some(l => l.code === saved)) {
            setLocaleState(saved);
        }
    }, []);

    const setLocale = (newLocale: SupportedLanguage) => {
        setLocaleState(newLocale);
        localStorage.setItem('preferred-locale', newLocale);
        document.documentElement.dir = SUPPORTED_LOCALES.find(l => l.code === newLocale)?.direction || 'ltr';
        document.documentElement.lang = newLocale;
    };

    const t = (key: string, params?: Record<string, string | number>): string => {
        let text = translations[locale]?.[key] || translations.en?.[key] || key;
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                text = text.replace(`{${k}}`, String(v));
            });
        }
        return text;
    };

    const formatDate = (date: Date, style: 'short' | 'medium' | 'long' = 'medium'): string => {
        const options: Intl.DateTimeFormatOptions = style === 'short'
            ? { month: 'numeric', day: 'numeric' }
            : style === 'long'
                ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
                : { year: 'numeric', month: 'short', day: 'numeric' };
        return new Intl.DateTimeFormat(locale, options).format(date);
    };

    const formatNumber = (num: number): string => new Intl.NumberFormat(locale).format(num);

    const formatCurrency = (amount: number, currency = 'USD'): string =>
        new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);

    return (
        <I18nContext.Provider value={{ locale, direction: config.direction, setLocale, t, formatDate, formatNumber, formatCurrency }}>
            <div dir={config.direction}>{children}</div>
        </I18nContext.Provider>
    );
}

// ============================================
// LANGUAGE SELECTOR
// ============================================

interface LanguageSelectorProps {
    size?: 'sm' | 'md' | 'lg';
}

export function LanguageSelector({ size = 'md' }: LanguageSelectorProps) {
    const { locale, setLocale } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const current = SUPPORTED_LOCALES.find(l => l.code === locale);

    const sizeClasses = { sm: 'text-xs px-2 py-1', md: 'text-sm px-3 py-2', lg: 'text-base px-4 py-3' };

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)}
                className={`${sizeClasses[size]} rounded-xl bg-white/5 border border-white/10 text-white flex items-center gap-2 hover:bg-white/10`}>
                <span>{current?.flag}</span>
                <span>{current?.nativeName}</span>
                <span className="text-white/40">▼</span>
            </button>
            {isOpen && (
                <div className="absolute top-full mt-2 right-0 w-48 bg-[#1A1A1F] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                    {SUPPORTED_LOCALES.map(loc => (
                        <button key={loc.code} onClick={() => { setLocale(loc.code); setIsOpen(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/10 ${locale === loc.code ? 'bg-cyan-500/10 text-cyan-400' : 'text-white'}`}>
                            <span>{loc.flag}</span>
                            <span>{loc.nativeName}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default I18nProvider;
