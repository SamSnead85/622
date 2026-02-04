'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================
// useAsync - Handle async operations with loading/error states
// ============================================

interface AsyncState<T> {
    data: T | null;
    error: Error | null;
    isLoading: boolean;
}

export function useAsync<T, Args extends unknown[]>(
    asyncFn: (...args: Args) => Promise<T>
) {
    const [state, setState] = useState<AsyncState<T>>({
        data: null,
        error: null,
        isLoading: false,
    });

    const execute = useCallback(
        async (...args: Args): Promise<T | null> => {
            setState({ data: null, error: null, isLoading: true });
            try {
                const data = await asyncFn(...args);
                setState({ data, error: null, isLoading: false });
                return data;
            } catch (error) {
                const err = error instanceof Error ? error : new Error('Unknown error');
                setState({ data: null, error: err, isLoading: false });
                return null;
            }
        },
        [asyncFn]
    );

    const reset = useCallback(() => {
        setState({ data: null, error: null, isLoading: false });
    }, []);

    return { ...state, execute, reset };
}

// ============================================
// useFetch - Fetch data with automatic loading states
// ============================================

interface FetchOptions {
    immediate?: boolean;
    cache?: boolean;
    refreshInterval?: number;
}

export function useFetch<T>(url: string | null, options: FetchOptions = {}) {
    const { immediate = true, cache = false, refreshInterval } = options;
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isLoading, setIsLoading] = useState(immediate && !!url);
    const abortController = useRef<AbortController | null>(null);

    const fetchData = useCallback(async () => {
        if (!url) return null;

        // Abort previous request
        if (abortController.current) {
            abortController.current.abort();
        }
        abortController.current = new AbortController();

        setIsLoading(true);
        setError(null);

        try {
            const token = typeof window !== 'undefined'
                ? localStorage.getItem('0g_token')
                : null;

            const response = await fetch(url, {
                signal: abortController.current.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            setData(result);
            setIsLoading(false);
            return result;
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                return null; // Ignore abort errors
            }
            const error = err instanceof Error ? err : new Error('Unknown error');
            setError(error);
            setIsLoading(false);
            return null;
        }
    }, [url]);

    const refetch = useCallback(() => {
        return fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (immediate && url) {
            fetchData();
        }

        return () => {
            if (abortController.current) {
                abortController.current.abort();
            }
        };
    }, [url, immediate, fetchData]);

    // Auto-refresh
    useEffect(() => {
        if (!refreshInterval || !url) return;

        const interval = setInterval(fetchData, refreshInterval);
        return () => clearInterval(interval);
    }, [refreshInterval, url, fetchData]);

    return { data, error, isLoading, refetch };
}

// ============================================
// useDebounce - Debounce a value
// ============================================

export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

// ============================================
// useLocalStorage - Persist state to localStorage
// ============================================

export function useLocalStorage<T>(key: string, initialValue: T) {
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') return initialValue;
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch {
            return initialValue;
        }
    });

    const setValue = useCallback(
        (value: T | ((val: T) => T)) => {
            try {
                const valueToStore = value instanceof Function ? value(storedValue) : value;
                setStoredValue(valueToStore);
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(key, JSON.stringify(valueToStore));
                }
            } catch (error) {
                console.error('Error saving to localStorage:', error);
            }
        },
        [key, storedValue]
    );

    return [storedValue, setValue] as const;
}

// ============================================
// useOnlineStatus - Track network connectivity
// ============================================

export function useOnlineStatus(): boolean {
    const [isOnline, setIsOnline] = useState(
        typeof window !== 'undefined' ? navigator.onLine : true
    );

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}

// ============================================
// useIntersectionObserver - Lazy loading / infinite scroll
// ============================================

interface IntersectionOptions {
    threshold?: number;
    rootMargin?: string;
    triggerOnce?: boolean;
}

export function useIntersectionObserver(
    options: IntersectionOptions = {}
): [React.RefObject<HTMLDivElement>, boolean] {
    const { threshold = 0, rootMargin = '0px', triggerOnce = false } = options;
    const ref = useRef<HTMLDivElement>(null);
    const [isIntersecting, setIsIntersecting] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                const intersecting = entry.isIntersecting;
                setIsIntersecting(intersecting);

                if (intersecting && triggerOnce) {
                    observer.disconnect();
                }
            },
            { threshold, rootMargin }
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, [threshold, rootMargin, triggerOnce]);

    return [ref, isIntersecting];
}

// ============================================
// useClickOutside - Detect clicks outside element
// ============================================

export function useClickOutside<T extends HTMLElement>(
    handler: () => void
): React.RefObject<T> {
    const ref = useRef<T>(null);

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                handler();
            }
        };

        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [handler]);

    return ref;
}

// ============================================
// usePrevious - Get previous value
// ============================================

export function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T>();
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref.current;
}

// ============================================
// useMediaQuery - Responsive breakpoints
// ============================================

export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const media = window.matchMedia(query);
        setMatches(media.matches);

        const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, [query]);

    return matches;
}

export function useIsMobile(): boolean {
    return useMediaQuery('(max-width: 768px)');
}

export function useIsTablet(): boolean {
    return useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
}

export function useIsDesktop(): boolean {
    return useMediaQuery('(min-width: 1025px)');
}

export default {
    useAsync,
    useFetch,
    useDebounce,
    useLocalStorage,
    useOnlineStatus,
    useIntersectionObserver,
    useClickOutside,
    usePrevious,
    useMediaQuery,
    useIsMobile,
    useIsTablet,
    useIsDesktop,
};
