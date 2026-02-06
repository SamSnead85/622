'use client';

import { useRouter } from 'next/navigation';
import { useRef, useCallback, useEffect } from 'react';

/**
 * Prefetch linked pages on hover with debounce.
 * Also prefetches the next page of data when near bottom of scroll.
 */
export function usePrefetch() {
    const router = useRouter();
    const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
    const prefetchedRef = useRef<Set<string>>(new Set());

    // Prefetch on link hover (200ms debounce)
    const onLinkHover = useCallback((href: string) => {
        if (prefetchedRef.current.has(href)) return;

        hoverTimerRef.current = setTimeout(() => {
            router.prefetch(href);
            prefetchedRef.current.add(href);
        }, 200);
    }, [router]);

    const onLinkLeave = useCallback(() => {
        if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        };
    }, []);

    return { onLinkHover, onLinkLeave };
}

/**
 * Prefetch data when scroll reaches threshold.
 */
export function useScrollPrefetch(
    loadMore: () => void,
    options: { threshold?: number; enabled?: boolean } = {}
) {
    const { threshold = 0.8, enabled = true } = options;
    const calledRef = useRef(false);

    useEffect(() => {
        if (!enabled) return;

        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight;
            const viewHeight = window.innerHeight;
            const scrollFraction = (scrollTop + viewHeight) / docHeight;

            if (scrollFraction > threshold && !calledRef.current) {
                calledRef.current = true;
                loadMore();
                // Reset after a delay
                setTimeout(() => { calledRef.current = false; }, 2000);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [loadMore, threshold, enabled]);
}
