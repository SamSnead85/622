'use client';

import { useState, useEffect, createContext, useContext } from 'react';

// ============================================
// TYPES
// ============================================

export type FontSize = 'normal' | 'large' | 'larger' | 'largest';
export type ContrastMode = 'normal' | 'high' | 'inverted';
export type MotionPreference = 'normal' | 'reduced' | 'none';

export interface AccessibilitySettings {
    fontSize: FontSize;
    contrastMode: ContrastMode;
    motionPreference: MotionPreference;
    screenReaderMode: boolean;
    keyboardNavigation: boolean;
    focusIndicators: boolean;
    lineHeight: 'normal' | 'relaxed' | 'loose';
    letterSpacing: 'normal' | 'wide' | 'wider';
    dyslexiaFont: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
    fontSize: 'normal',
    contrastMode: 'normal',
    motionPreference: 'normal',
    screenReaderMode: false,
    keyboardNavigation: true,
    focusIndicators: true,
    lineHeight: 'normal',
    letterSpacing: 'normal',
    dyslexiaFont: false,
};

// ============================================
// ACCESSIBILITY CONTEXT
// ============================================

interface AccessibilityContextType {
    settings: AccessibilitySettings;
    updateSetting: <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => void;
    resetSettings: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function useAccessibility() {
    const context = useContext(AccessibilityContext);
    if (!context) throw new Error('useAccessibility must be used within AccessibilityProvider');
    return context;
}

// ============================================
// ACCESSIBILITY PROVIDER
// ============================================

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);

    useEffect(() => {
        const saved = localStorage.getItem('accessibility-settings');
        if (saved) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });

        // Detect system preference for reduced motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setSettings(s => ({ ...s, motionPreference: 'reduced' }));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('accessibility-settings', JSON.stringify(settings));

        // Apply CSS variables
        const fontSizeMap = { normal: '16px', large: '18px', larger: '20px', largest: '24px' };
        const lineHeightMap = { normal: '1.5', relaxed: '1.75', loose: '2' };
        const letterSpacingMap = { normal: '0', wide: '0.025em', wider: '0.05em' };

        document.documentElement.style.setProperty('--base-font-size', fontSizeMap[settings.fontSize]);
        document.documentElement.style.setProperty('--line-height', lineHeightMap[settings.lineHeight]);
        document.documentElement.style.setProperty('--letter-spacing', letterSpacingMap[settings.letterSpacing]);
        document.documentElement.classList.toggle('high-contrast', settings.contrastMode === 'high');
        document.documentElement.classList.toggle('reduce-motion', settings.motionPreference !== 'normal');
        document.documentElement.classList.toggle('dyslexia-font', settings.dyslexiaFont);
    }, [settings]);

    const updateSetting = <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const resetSettings = () => setSettings(DEFAULT_SETTINGS);

    return (
        <AccessibilityContext.Provider value={{ settings, updateSetting, resetSettings }}>
            {children}
        </AccessibilityContext.Provider>
    );
}

// ============================================
// ACCESSIBILITY PANEL
// ============================================

export function AccessibilityPanel() {
    const { settings, updateSetting, resetSettings } = useAccessibility();

    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">♿ Accessibility Settings</h2>
                <button onClick={resetSettings} className="text-sm text-cyan-400 hover:underline">Reset All</button>
            </div>

            {/* Font Size */}
            <div>
                <label className="text-sm text-white/60 mb-2 block">Text Size</label>
                <div className="flex gap-2">
                    {(['normal', 'large', 'larger', 'largest'] as FontSize[]).map(size => (
                        <button key={size} onClick={() => updateSetting('fontSize', size)}
                            className={`flex-1 py-2 rounded-xl text-sm ${settings.fontSize === size ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-white/5 text-white/60 border border-white/10'}`}>
                            {size === 'normal' ? 'A' : size === 'large' ? 'A+' : size === 'larger' ? 'A++' : 'A+++'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Contrast */}
            <div>
                <label className="text-sm text-white/60 mb-2 block">Contrast</label>
                <div className="flex gap-2">
                    {(['normal', 'high', 'inverted'] as ContrastMode[]).map(mode => (
                        <button key={mode} onClick={() => updateSetting('contrastMode', mode)}
                            className={`flex-1 py-2 rounded-xl text-sm capitalize ${settings.contrastMode === mode ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-white/5 text-white/60 border border-white/10'}`}>
                            {mode}
                        </button>
                    ))}
                </div>
            </div>

            {/* Motion */}
            <div>
                <label className="text-sm text-white/60 mb-2 block">Motion</label>
                <div className="flex gap-2">
                    {(['normal', 'reduced', 'none'] as MotionPreference[]).map(pref => (
                        <button key={pref} onClick={() => updateSetting('motionPreference', pref)}
                            className={`flex-1 py-2 rounded-xl text-sm capitalize ${settings.motionPreference === pref ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-white/5 text-white/60 border border-white/10'}`}>
                            {pref}
                        </button>
                    ))}
                </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
                {[
                    { key: 'screenReaderMode' as const, label: 'Screen Reader Optimizations' },
                    { key: 'keyboardNavigation' as const, label: 'Enhanced Keyboard Navigation' },
                    { key: 'focusIndicators' as const, label: 'Visible Focus Indicators' },
                    { key: 'dyslexiaFont' as const, label: 'Dyslexia-Friendly Font' },
                ].map(({ key, label }) => (
                    <label key={key} className="flex items-center justify-between cursor-pointer">
                        <span className="text-white/70">{label}</span>
                        <button onClick={() => updateSetting(key, !settings[key])}
                            className={`w-12 h-6 rounded-full transition-colors ${settings[key] ? 'bg-cyan-500' : 'bg-white/20'}`}>
                            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${settings[key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                        </button>
                    </label>
                ))}
            </div>
        </div>
    );
}

// ============================================
// SKIP LINK
// ============================================

export function SkipLink({ href = '#main-content', children = 'Skip to main content' }: { href?: string; children?: React.ReactNode }) {
    return (
        <a href={href}
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-cyan-500 focus:text-white focus:rounded-lg focus:font-medium">
            {children}
        </a>
    );
}

export default AccessibilityProvider;
