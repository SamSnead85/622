'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useInfiniteScroll - Hook for infinite scrolling with load-more functionality
 * 
 * Features:
 * - Intersection Observer for efficient scroll detection
 * - Loading states
 * - Pull-to-refresh support
 * - Debounced loading to prevent excessive API calls
 */
interface UseInfiniteScrollOptions<T> {
    fetchFn: (page: number) => Promise<T[]>;
    initialData?: T[];
    pageSize?: number;
    threshold?: number;
}

interface UseInfiniteScrollReturn<T> {
    data: T[];
    isLoading: boolean;
    isLoadingMore: boolean;
    isRefreshing: boolean;
    hasMore: boolean;
    error: Error | null;
    loadMore: () => void;
    refresh: () => Promise<void>;
    sentinelRef: React.RefObject<HTMLDivElement>;
}

export function useInfiniteScroll<T>({
    fetchFn,
    initialData = [],
    pageSize = 10,
    threshold = 0.1,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
    const [data, setData] = useState<T[]>(initialData);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const sentinelRef = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);

    // Initial load
    useEffect(() => {
        const loadInitial = async () => {
            try {
                setIsLoading(true);
                const items = await fetchFn(1);
                setData(items);
                setHasMore(items.length >= pageSize);
                setPage(1);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to load'));
            } finally {
                setIsLoading(false);
            }
        };

        loadInitial();
    }, [fetchFn, pageSize]);

    // Load more function
    const loadMore = useCallback(async () => {
        if (loadingRef.current || !hasMore) return;

        loadingRef.current = true;
        setIsLoadingMore(true);

        try {
            const nextPage = page + 1;
            const items = await fetchFn(nextPage);

            if (items.length === 0) {
                setHasMore(false);
            } else {
                setData(prev => [...prev, ...items]);
                setPage(nextPage);
                setHasMore(items.length >= pageSize);
            }
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load more'));
        } finally {
            setIsLoadingMore(false);
            loadingRef.current = false;
        }
    }, [fetchFn, page, hasMore, pageSize]);

    // Refresh function (pull-to-refresh)
    const refresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            const items = await fetchFn(1);
            setData(items);
            setPage(1);
            setHasMore(items.length >= pageSize);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to refresh'));
        } finally {
            setIsRefreshing(false);
        }
    }, [fetchFn, pageSize]);

    // Intersection Observer for automatic loading
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
                    loadMore();
                }
            },
            { threshold }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loadMore, hasMore, threshold]);

    return {
        data,
        isLoading,
        isLoadingMore,
        isRefreshing,
        hasMore,
        error,
        loadMore,
        refresh,
        sentinelRef: sentinelRef as React.RefObject<HTMLDivElement>,
    };
}

/**
 * usePullToRefresh - Hook for pull-to-refresh gesture on mobile
 */
interface UsePullToRefreshOptions {
    onRefresh: () => Promise<void>;
    threshold?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: UsePullToRefreshOptions) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);

    const startY = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        if (containerRef.current?.scrollTop === 0) {
            startY.current = e.touches[0].clientY;
            setIsPulling(true);
        }
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!isPulling) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;

        if (diff > 0) {
            setPullDistance(Math.min(diff * 0.5, threshold * 1.5));
            if (diff > threshold) {
                e.preventDefault();
            }
        }
    }, [isPulling, threshold]);

    const handleTouchEnd = useCallback(async () => {
        if (pullDistance >= threshold && !isRefreshing) {
            setIsRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
            }
        }
        setPullDistance(0);
        setIsPulling(false);
    }, [pullDistance, threshold, isRefreshing, onRefresh]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd);

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

    return {
        pullDistance,
        isRefreshing,
        isPulling,
        containerRef,
        shouldRefresh: pullDistance >= threshold,
    };
}

export default useInfiniteScroll;
