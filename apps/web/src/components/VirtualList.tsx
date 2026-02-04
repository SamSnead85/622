'use client';

import React, { useRef, useEffect, useState, useCallback, ReactNode } from 'react';

// ============================================
// VIRTUAL LIST TYPES
// ============================================

interface VirtualListProps<T> {
    items: T[];
    itemHeight: number;
    containerHeight: number;
    renderItem: (item: T, index: number) => ReactNode;
    overscan?: number;
    onEndReached?: () => void;
    endReachedThreshold?: number;
    className?: string;
    keyExtractor?: (item: T, index: number) => string;
}

// ============================================
// VIRTUAL LIST COMPONENT
// ============================================

export function VirtualList<T>({
    items,
    itemHeight,
    containerHeight,
    renderItem,
    overscan = 3,
    onEndReached,
    endReachedThreshold = 0.8,
    className = '',
    keyExtractor = (_, index) => String(index),
}: VirtualListProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);

    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
        items.length - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const visibleItems = items.slice(startIndex, endIndex + 1);
    const offsetY = startIndex * itemHeight;

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        setScrollTop(target.scrollTop);

        // Check if near end
        if (onEndReached) {
            const scrollProgress = (target.scrollTop + containerHeight) / totalHeight;
            if (scrollProgress >= endReachedThreshold) {
                onEndReached();
            }
        }
    }, [containerHeight, totalHeight, endReachedThreshold, onEndReached]);

    return (
        <div
            ref={containerRef}
            className={`overflow-auto ${className}`}
            style={{ height: containerHeight }}
            onScroll={handleScroll}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                    {visibleItems.map((item, index) => (
                        <div
                            key={keyExtractor(item, startIndex + index)}
                            style={{ height: itemHeight }}
                        >
                            {renderItem(item, startIndex + index)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ============================================
// INFINITE SCROLL LIST
// ============================================

interface InfiniteScrollProps {
    children: ReactNode;
    onLoadMore: () => void;
    hasMore: boolean;
    isLoading: boolean;
    loadingComponent?: ReactNode;
    threshold?: number;
    className?: string;
}

export function InfiniteScroll({
    children,
    onLoadMore,
    hasMore,
    isLoading,
    loadingComponent,
    threshold = 200,
    className = '',
}: InfiniteScrollProps) {
    const observerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = observerRef.current;
        if (!element || !hasMore || isLoading) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    onLoadMore();
                }
            },
            { rootMargin: `${threshold}px` }
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, [hasMore, isLoading, onLoadMore, threshold]);

    return (
        <div className={className}>
            {children}
            <div ref={observerRef} className="h-1" />
            {isLoading && (loadingComponent || (
                <div className="flex justify-center py-4">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-cyan-500 rounded-full animate-spin" />
                </div>
            ))}
        </div>
    );
}

// ============================================
// LAZY COMPONENT LOADER
// ============================================

interface LazyLoadProps {
    children: ReactNode;
    placeholder?: ReactNode;
    threshold?: number;
    className?: string;
}

export function LazyLoad({
    children,
    placeholder,
    threshold = 100,
    className = '',
}: LazyLoadProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: `${threshold}px` }
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, [threshold]);

    return (
        <div ref={ref} className={className}>
            {isVisible ? children : (placeholder || (
                <div className="h-32 bg-white/5 animate-pulse rounded-xl" />
            ))}
        </div>
    );
}

// ============================================
// LAZY IMAGE
// ============================================

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    placeholderColor?: string;
}

export function LazyImage({
    src,
    alt = '',
    className = '',
    placeholderColor = 'bg-white/5',
    ...props
}: LazyImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const element = imgRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '100px' }
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {!isLoaded && (
                <div className={`absolute inset-0 ${placeholderColor} animate-pulse`} />
            )}
            <img
                ref={imgRef}
                src={isInView ? src : undefined}
                alt={alt}
                className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setIsLoaded(true)}
                {...props}
            />
        </div>
    );
}

// ============================================
// EXPORTS
// ============================================

const VirtualComponents = {
    VirtualList,
    InfiniteScroll,
    LazyLoad,
    LazyImage,
};

export default VirtualComponents;
