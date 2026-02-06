export const locales = ['en', 'ar', 'fr', 'tr', 'ur', 'es'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const rtlLocales: Locale[] = ['ar', 'ur'];

export const localeNames: Record<Locale, string> = {
    en: 'English',
    ar: 'العربية',
    fr: 'Français',
    tr: 'Türkçe',
    ur: 'اردو',
    es: 'Español',
};

export function isRTL(locale: Locale): boolean {
    return rtlLocales.includes(locale);
}

export function getDirection(locale: Locale): 'ltr' | 'rtl' {
    return isRTL(locale) ? 'rtl' : 'ltr';
}
