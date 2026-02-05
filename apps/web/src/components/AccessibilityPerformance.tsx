'use client';

import React, { useState, useCallback, useEffect, useRef, memo, useMemo } from 'react';

// ============================================
// PHASES 601-700: ACCESSIBILITY ENHANCEMENTS
// ============================================

// Phase 601-610: Screen Reader Optimization
export function useARIALive() {
    const [announcements, setAnnouncements] = useState<{ id: string; message: string; priority: 'polite' | 'assertive' }[]>([]);

    const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
        const id = `announce_${Date.now()}`;
        setAnnouncements(prev => [...prev, { id, message, priority }]);

        // Clear after announcement
        setTimeout(() => {
            setAnnouncements(prev => prev.filter(a => a.id !== id));
        }, 1000);
    }, []);

    return { announcements, announce };
}

export const ARIALiveRegion = memo(function ARIALiveRegion({
    announcements
}: { announcements: { id: string; message: string; priority: 'polite' | 'assertive' }[] }) {
    return (
        <>
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {announcements.filter(a => a.priority === 'polite').map(a => a.message).join('. ')}
            </div>
            <div aria-live="assertive" aria-atomic="true" className="sr-only">
                {announcements.filter(a => a.priority === 'assertive').map(a => a.message).join('. ')}
            </div>
        </>
    );
});

// Phase 611-620: Keyboard Navigation
export function useKeyboardNavigation(items: string[], onSelect: (id: string) => void) {
    const [focusedIndex, setFocusedIndex] = useState(0);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setFocusedIndex(i => Math.min(i + 1, items.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedIndex(i => Math.max(i - 1, 0));
                break;
            case 'Home':
                e.preventDefault();
                setFocusedIndex(0);
                break;
            case 'End':
                e.preventDefault();
                setFocusedIndex(items.length - 1);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (items[focusedIndex]) {
                    onSelect(items[focusedIndex]);
                }
                break;
        }
    }, [items, focusedIndex, onSelect]);

    return { focusedIndex, setFocusedIndex, handleKeyDown };
}

// Phase 621-630: Focus Management
export function useFocusTrap(isActive: boolean) {
    const containerRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isActive || !containerRef.current) return;

        previousFocusRef.current = document.activeElement as HTMLElement;

        const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab' || !containerRef.current) return;

            const focusable = containerRef.current.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            previousFocusRef.current?.focus();
        };
    }, [isActive]);

    return containerRef;
}

// Phase 631-640: Color Contrast
export function useColorContrast() {
    const [highContrast, setHighContrast] = useState(false);

    useEffect(() => {
        const query = window.matchMedia('(prefers-contrast: high)');
        setHighContrast(query.matches);

        const handler = (e: MediaQueryListEvent) => setHighContrast(e.matches);
        query.addEventListener('change', handler);
        return () => query.removeEventListener('change', handler);
    }, []);

    const contrastColors = highContrast ? {
        text: '#FFFFFF',
        background: '#000000',
        border: '#FFFFFF',
        accent: '#00FFFF',
    } : {
        text: '#FFFFFF',
        background: '#0A0A0F',
        border: 'rgba(255,255,255,0.1)',
        accent: '#00D4FF',
    };

    return { highContrast, setHighContrast, contrastColors };
}

// Phase 641-650: Reduced Motion
export function useReducedMotionPreference() {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(query.matches);

        const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
        query.addEventListener('change', handler);
        return () => query.removeEventListener('change', handler);
    }, []);

    const getAnimation = useCallback(<T extends object>(animation: T): T | {} => {
        return prefersReducedMotion ? {} : animation;
    }, [prefersReducedMotion]);

    return { prefersReducedMotion, getAnimation };
}

// Phase 651-660: Font Scaling
export function useFontScaling() {
    const [scale, setScale] = useState(1);
    const [dyslexicFont, setDyslexicFont] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('0g_font_settings');
            if (saved) {
                const { scale: s, dyslexicFont: d } = JSON.parse(saved);
                setScale(s);
                setDyslexicFont(d);
            }
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('0g_font_settings', JSON.stringify({ scale, dyslexicFont }));
            document.documentElement.style.fontSize = `${scale * 16}px`;
        }
    }, [scale, dyslexicFont]);

    const increaseSize = useCallback(() => setScale(s => Math.min(s + 0.1, 1.5)), []);
    const decreaseSize = useCallback(() => setScale(s => Math.max(s - 0.1, 0.8)), []);
    const resetSize = useCallback(() => setScale(1), []);

    return { scale, dyslexicFont, setDyslexicFont, increaseSize, decreaseSize, resetSize };
}

// Phase 661-670: RTL Support
export function useRTL() {
    const [isRTL, setIsRTL] = useState(false);
    const [language, setLanguage] = useState('en');

    const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

    useEffect(() => {
        setIsRTL(RTL_LANGUAGES.includes(language));
        document.documentElement.dir = RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';
    }, [language]);

    return { isRTL, language, setLanguage, RTL_LANGUAGES };
}

// Phase 671-680: Localization
export function useLocalization() {
    const [locale, setLocale] = useState('en-US');
    const [translations, setTranslations] = useState<Record<string, string>>({});

    const t = useCallback((key: string, params?: Record<string, string | number>): string => {
        let text = translations[key] || key;
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                text = text.replace(`{{${k}}}`, String(v));
            });
        }
        return text;
    }, [translations]);

    const formatNumber = useCallback((num: number) => {
        return new Intl.NumberFormat(locale).format(num);
    }, [locale]);

    const formatDate = useCallback((date: Date, options?: Intl.DateTimeFormatOptions) => {
        return new Intl.DateTimeFormat(locale, options).format(date);
    }, [locale]);

    const formatRelativeTime = useCallback((date: Date) => {
        const diff = Date.now() - date.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }, []);

    return { locale, setLocale, t, formatNumber, formatDate, formatRelativeTime };
}

// Phase 681-690: Translation Management
export interface TranslationEntry {
    key: string;
    en: string;
    translations: Record<string, string>;
}

export function useTranslationManager() {
    const [entries, setEntries] = useState<TranslationEntry[]>([]);
    const [currentLanguage, setCurrentLanguage] = useState('en');

    const addTranslation = useCallback((key: string, value: string, lang: string = 'en') => {
        setEntries(prev => {
            const existing = prev.find(e => e.key === key);
            if (existing) {
                return prev.map(e => e.key === key
                    ? { ...e, translations: { ...e.translations, [lang]: value } }
                    : e
                );
            }
            return [...prev, { key, en: lang === 'en' ? value : '', translations: { [lang]: value } }];
        });
    }, []);

    const getTranslation = useCallback((key: string, lang?: string) => {
        const entry = entries.find(e => e.key === key);
        if (!entry) return key;
        return entry.translations[lang || currentLanguage] || entry.en || key;
    }, [entries, currentLanguage]);

    return { entries, currentLanguage, setCurrentLanguage, addTranslation, getTranslation };
}

// Phase 691-700: Accessible Media
export function useAccessibleMedia() {
    const [autoPlayMedia, setAutoPlayMedia] = useState(false);
    const [showCaptions, setShowCaptions] = useState(true);
    const [audioDescriptions, setAudioDescriptions] = useState(false);

    const generateAltText = useCallback((mediaType: string, context?: string): string => {
        const base = mediaType === 'image' ? 'Image' : mediaType === 'video' ? 'Video' : 'Media';
        return context ? `${base}: ${context}` : `${base} content`;
    }, []);

    return { autoPlayMedia, setAutoPlayMedia, showCaptions, setShowCaptions, audioDescriptions, setAudioDescriptions, generateAltText };
}

// ============================================
// PHASES 701-800: PERFORMANCE ENHANCEMENTS
// ============================================

// Phase 701-710: Bundle Optimization
export function useLazyComponent<T extends React.ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    fallback?: React.ReactNode
) {
    const [Component, setComponent] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        importFn()
            .then(module => {
                setComponent(() => module.default);
                setIsLoading(false);
            })
            .catch(err => {
                setError(err);
                setIsLoading(false);
            });
    }, [importFn]);

    return { Component, isLoading, error, fallback };
}

// Phase 711-720: Image Lazy Loading
export function useLazyImage(src: string, placeholder?: string) {
    const [imageSrc, setImageSrc] = useState(placeholder || '');
    const [isLoaded, setIsLoaded] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    const img = new Image();
                    img.onload = () => {
                        setImageSrc(src);
                        setIsLoaded(true);
                    };
                    img.src = src;
                    observer.disconnect();
                }
            },
            { rootMargin: '100px' }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, [src]);

    return { imageSrc, isLoaded, imgRef };
}

// Phase 721-730: API Caching
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

export function useAPICache<T>(key: string, fetcher: () => Promise<T>, ttl: number = 60000) {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());

    const fetchData = useCallback(async (forceRefresh = false) => {
        const cached = cacheRef.current.get(key);

        if (!forceRefresh && cached && Date.now() - cached.timestamp < cached.ttl) {
            setData(cached.data);
            setIsLoading(false);
            return cached.data;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await fetcher();
            cacheRef.current.set(key, { data: result, timestamp: Date.now(), ttl });
            setData(result);
            return result;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [key, fetcher, ttl]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const invalidate = useCallback(() => {
        cacheRef.current.delete(key);
    }, [key]);

    return { data, isLoading, error, refetch: () => fetchData(true), invalidate };
}

// Phase 731-740: Service Worker
export function useServiceWorker() {
    const [isSupported, setIsSupported] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

    useEffect(() => {
        setIsSupported('serviceWorker' in navigator);
    }, []);

    const register = useCallback(async (swPath: string = '/sw.js') => {
        if (!isSupported) return false;

        try {
            const registration = await navigator.serviceWorker.register(swPath);
            registrationRef.current = registration;
            setIsRegistered(true);

            registration.addEventListener('updatefound', () => {
                setUpdateAvailable(true);
            });

            return true;
        } catch {
            return false;
        }
    }, [isSupported]);

    const update = useCallback(async () => {
        if (registrationRef.current) {
            await registrationRef.current.update();
        }
    }, []);

    return { isSupported, isRegistered, updateAvailable, register, update };
}

// Phase 741-750: Offline Support
export function useOfflineSupport() {
    const [isOnline, setIsOnline] = useState(true);
    const [offlineQueue, setOfflineQueue] = useState<{ id: string; action: string; data: any }[]>([]);

    useEffect(() => {
        setIsOnline(navigator.onLine);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const queueAction = useCallback((action: string, data: any) => {
        const id = `queue_${Date.now()}`;
        setOfflineQueue(prev => [...prev, { id, action, data }]);

        if (typeof window !== 'undefined') {
            localStorage.setItem('0g_offline_queue', JSON.stringify([...offlineQueue, { id, action, data }]));
        }

        return id;
    }, [offlineQueue]);

    const processQueue = useCallback(async (processor: (item: { action: string; data: any }) => Promise<void>) => {
        if (!isOnline || offlineQueue.length === 0) return;

        for (const item of offlineQueue) {
            try {
                await processor(item);
                setOfflineQueue(prev => prev.filter(q => q.id !== item.id));
            } catch {
                break;
            }
        }
    }, [isOnline, offlineQueue]);

    return { isOnline, offlineQueue, queueAction, processQueue };
}

// Phase 751-760: Database Optimization
export function useIndexedDB(dbName: string, storeName: string) {
    const dbRef = useRef<IDBDatabase | null>(null);

    const initDB = useCallback(async () => {
        return new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                dbRef.current = request.result;
                resolve(request.result);
            };
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: 'id' });
                }
            };
        });
    }, [dbName, storeName]);

    const put = useCallback(async (data: { id: string;[key: string]: any }) => {
        const db = dbRef.current || await initDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(data);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }, [initDB, storeName]);

    const get = useCallback(async (id: string) => {
        const db = dbRef.current || await initDB();
        return new Promise<any>((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }, [initDB, storeName]);

    const remove = useCallback(async (id: string) => {
        const db = dbRef.current || await initDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }, [initDB, storeName]);

    return { initDB, put, get, remove };
}

// Phase 761-770: CDN & Edge Caching
export function useCDNOptimization() {
    const getOptimizedUrl = useCallback((url: string, options?: { width?: number; quality?: number; format?: string }) => {
        if (!url) return url;

        const params = new URLSearchParams();
        if (options?.width) params.set('w', String(options.width));
        if (options?.quality) params.set('q', String(options.quality));
        if (options?.format) params.set('fm', options.format);

        return `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;
    }, []);

    return { getOptimizedUrl };
}

// Phase 771-780: Memory Management
export function useMemoryManagement() {
    const [memoryUsage, setMemoryUsage] = useState<{ usedJSHeapSize: number; totalJSHeapSize: number } | null>(null);

    useEffect(() => {
        const checkMemory = () => {
            if ('memory' in performance) {
                const memory = (performance as any).memory;
                setMemoryUsage({
                    usedJSHeapSize: memory.usedJSHeapSize,
                    totalJSHeapSize: memory.totalJSHeapSize,
                });
            }
        };

        checkMemory();
        const interval = setInterval(checkMemory, 5000);
        return () => clearInterval(interval);
    }, []);

    const cleanupUnusedData = useCallback(() => {
        // Clear caches
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
            });
        }
    }, []);

    return { memoryUsage, cleanupUnusedData };
}

// Phase 781-790: Frame Rate Optimization
export function useFrameRate() {
    const [fps, setFps] = useState(60);
    const frameCountRef = useRef(0);
    const lastTimeRef = useRef(performance.now());

    useEffect(() => {
        let animationId: number;

        const measureFPS = (time: number) => {
            frameCountRef.current++;

            if (time - lastTimeRef.current >= 1000) {
                setFps(frameCountRef.current);
                frameCountRef.current = 0;
                lastTimeRef.current = time;
            }

            animationId = requestAnimationFrame(measureFPS);
        };

        animationId = requestAnimationFrame(measureFPS);
        return () => cancelAnimationFrame(animationId);
    }, []);

    return { fps };
}

// Phase 791-800: Performance Metrics
export function usePerformanceMetrics() {
    const [metrics, setMetrics] = useState<{
        fcp?: number;
        lcp?: number;
        fid?: number;
        cls?: number;
        ttfb?: number;
    }>({});

    useEffect(() => {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
                    setMetrics(m => ({ ...m, fcp: entry.startTime }));
                }
                if (entry.entryType === 'largest-contentful-paint') {
                    setMetrics(m => ({ ...m, lcp: entry.startTime }));
                }
                if (entry.entryType === 'first-input') {
                    setMetrics(m => ({ ...m, fid: (entry as any).processingStart - entry.startTime }));
                }
                if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
                    setMetrics(m => ({ ...m, cls: (m.cls || 0) + (entry as any).value }));
                }
            }
        });

        try {
            observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
        } catch {
            // Some entry types may not be supported
        }

        // TTFB
        const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navEntry) {
            setMetrics(m => ({ ...m, ttfb: navEntry.responseStart - navEntry.requestStart }));
        }

        return () => observer.disconnect();
    }, []);

    return { metrics };
}
