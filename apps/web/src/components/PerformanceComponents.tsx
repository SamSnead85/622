'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, ComponentType } from 'react';
import { motion } from 'framer-motion';

// ============================================
// LAZY LOAD COMPONENT
// Load components only when needed
// ============================================

interface LazyLoadProps {
    loader: () => Promise<{ default: ComponentType<unknown> }>;
    fallback?: React.ReactNode;
}

export function LazyLoad({ loader, fallback }: LazyLoadProps) {
    const [Component, setComponent] = useState<ComponentType<unknown> | null>(null);

    useEffect(() => {
        loader().then(module => setComponent(() => module.default));
    }, [loader]);

    if (!Component) {
        return fallback ? <>{fallback}</> : <LoadingSpinner />;
    }

    return <Component />;
}

// ============================================
// LOADING SPINNER
// Animated loading indicator
// ============================================

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: string;
}

export function LoadingSpinner({ size = 'md', color = '#D4AF37' }: LoadingSpinnerProps) {
    const sizes = { sm: 16, md: 24, lg: 40 };
    const dimension = sizes[size];

    return (
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="rounded-full border-2 border-white/20"
            style={{
                width: dimension,
                height: dimension,
                borderTopColor: color,
            }}
        />
    );
}

// ============================================
// INFINITE SCROLL
// Load more content on scroll
// ============================================

interface InfiniteScrollProps<T> {
    items: T[];
    renderItem: (item: T, index: number) => React.ReactNode;
    onLoadMore: () => void;
    hasMore: boolean;
    loading?: boolean;
    threshold?: number;
    className?: string;
}

export function InfiniteScroll<T>({
    items,
    renderItem,
    onLoadMore,
    hasMore,
    loading = false,
    threshold = 100,
    className = '',
}: InfiniteScrollProps<T>) {
    const observerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    onLoadMore();
                }
            },
            { rootMargin: `${threshold}px` }
        );

        if (observerRef.current) {
            observer.observe(observerRef.current);
        }

        return () => observer.disconnect();
    }, [hasMore, loading, onLoadMore, threshold]);

    return (
        <div className={className}>
            {items.map((item, index) => renderItem(item, index))}
            <div ref={observerRef} className="h-1" />
            {loading && (
                <div className="flex justify-center py-4">
                    <LoadingSpinner />
                </div>
            )}
        </div>
    );
}

// ============================================
// VIRTUAL LIST
// Efficiently render large lists
// ============================================

interface VirtualListProps<T> {
    items: T[];
    itemHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    overscan?: number;
    containerHeight?: number;
}

export function VirtualList<T>({
    items,
    itemHeight,
    renderItem,
    overscan = 5,
    containerHeight = 400,
}: VirtualListProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);

    const { startIndex, endIndex, offsetY, totalHeight } = useMemo(() => {
        const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
        const end = Math.min(
            items.length,
            Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
        );
        return {
            startIndex: start,
            endIndex: end,
            offsetY: start * itemHeight,
            totalHeight: items.length * itemHeight,
        };
    }, [scrollTop, itemHeight, items.length, containerHeight, overscan]);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    const visibleItems = items.slice(startIndex, endIndex);

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            style={{ height: containerHeight }}
            className="overflow-y-auto"
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                    {visibleItems.map((item, index) => (
                        <div key={startIndex + index} style={{ height: itemHeight }}>
                            {renderItem(item, startIndex + index)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ============================================
// LAZY IMAGE
// Load images with blur placeholder
// ============================================

interface LazyImageProps {
    src: string;
    alt: string;
    width: number;
    height: number;
    placeholder?: string;
    className?: string;
}

export function LazyImage({
    src,
    alt,
    width,
    height,
    placeholder,
    className = '',
}: LazyImageProps) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        if (!imgRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    const img = imgRef.current;
                    if (img && img.dataset.src) {
                        img.src = img.dataset.src;
                    }
                    observer.disconnect();
                }
            },
            { rootMargin: '100px' }
        );

        observer.observe(imgRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            className={`relative overflow-hidden ${className}`}
            style={{ width, height }}
        >
            {/* Placeholder */}
            {!loaded && !error && (
                <div className="absolute inset-0 bg-white/5 animate-pulse" />
            )}

            {/* Actual image */}
            <img
                ref={imgRef}
                data-src={src}
                alt={alt}
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
                className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'
                    }`}
            />

            {/* Error state */}
            {error && (
                <div className="absolute inset-0 bg-white/5 flex items-center justify-center text-white/40">
                    📷
                </div>
            )}
        </div>
    );
}

// ============================================
// DEBOUNCED INPUT
// Debounce user input
// ============================================

interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    value: string;
    onChange: (value: string) => void;
    debounceMs?: number;
}

export function DebouncedInput({
    value: initialValue,
    onChange,
    debounceMs = 300,
    ...props
}: DebouncedInputProps) {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (value !== initialValue) {
                onChange(value);
            }
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [value, debounceMs, onChange, initialValue]);

    return (
        <input
            {...props}
            value={value}
            onChange={(e) => setValue(e.target.value)}
        />
    );
}

// ============================================
// MEMOIZED LIST
// Optimized list with stable references
// ============================================

interface MemoizedListProps<T> {
    items: T[];
    keyExtractor: (item: T) => string;
    renderItem: (item: T) => React.ReactNode;
}

export function MemoizedList<T>({ items, keyExtractor, renderItem }: MemoizedListProps<T>) {
    return (
        <>
            {items.map((item) => (
                <React.Fragment key={keyExtractor(item)}>
                    {renderItem(item)}
                </React.Fragment>
            ))}
        </>
    );
}

// ============================================
// OFFLINE INDICATOR
// Show when user is offline
// ============================================

export function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(true);

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

    if (isOnline) return null;

    return (
        <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-0 left-0 right-0 bg-orange-500 text-black py-2 px-4 text-center text-sm font-medium z-50"
        >
            You&apos;re offline. Some features may be unavailable.
        </motion.div>
    );
}

// ============================================
// ERROR BOUNDARY
// Catch and display errors
// ============================================

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                    <span className="text-3xl mb-3 block">⚠️</span>
                    <p className="text-white font-medium">Something went wrong</p>
                    <p className="text-sm text-white/50 mt-1">{this.state.error?.message}</p>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="mt-4 px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
                    >
                        Try again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
