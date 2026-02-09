// ============================================
// Internationalization (i18n) Setup
// Multi-language support with RTL handling
// ============================================

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import en from './translations/en';
import ar from './translations/ar';
import ur from './translations/ur';
import tr from './translations/tr';
import fr from './translations/fr';

// ============================================
// Constants
// ============================================

const LANGUAGE_KEY = '@0g_language';
const RTL_LANGUAGES = ['ar', 'ur', 'he', 'fa'];

export const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English', rtl: false },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
    { code: 'ur', name: 'Urdu', nativeName: 'اردو', rtl: true },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', rtl: false },
    { code: 'fr', name: 'French', nativeName: 'Français', rtl: false },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

// ============================================
// Detect Device Language
// ============================================

function getDeviceLanguage(): string {
    try {
        const locales = getLocales();
        if (locales.length > 0) {
            const langCode = locales[0].languageCode;
            // Check if we support this language
            if (SUPPORTED_LANGUAGES.some((l) => l.code === langCode)) {
                return langCode;
            }
        }
    } catch {
        // Fallback
    }
    return 'en';
}

// ============================================
// Persisted Language Preference
// ============================================

export async function getSavedLanguage(): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(LANGUAGE_KEY);
    } catch {
        return null;
    }
}

export async function saveLanguage(lang: string): Promise<void> {
    try {
        await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    } catch {
        // Non-critical
    }
}

// ============================================
// RTL Handling
// ============================================

export function isRTL(lang: string): boolean {
    return RTL_LANGUAGES.includes(lang);
}

function applyRTL(lang: string): void {
    const shouldBeRTL = isRTL(lang);
    if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.allowRTL(shouldBeRTL);
        I18nManager.forceRTL(shouldBeRTL);
        // Note: App restart may be needed for full RTL layout change
    }
}

// ============================================
// Initialize i18next
// ============================================

export async function initI18n(): Promise<void> {
    const savedLang = await getSavedLanguage();
    const deviceLang = getDeviceLanguage();
    const initialLang = savedLang || deviceLang;

    applyRTL(initialLang);

    await i18next
        .use(initReactI18next)
        .init({
            compatibilityJSON: 'v4',
            resources: {
                en: { translation: en },
                ar: { translation: ar },
                ur: { translation: ur },
                tr: { translation: tr },
                fr: { translation: fr },
            },
            lng: initialLang,
            fallbackLng: 'en',
            interpolation: {
                escapeValue: false, // React already escapes
            },
            react: {
                useSuspense: false,
            },
        });
}

/**
 * Change language at runtime
 */
export async function changeLanguage(lang: LanguageCode): Promise<void> {
    await i18next.changeLanguage(lang);
    await saveLanguage(lang);
    applyRTL(lang);
}

export default i18next;
