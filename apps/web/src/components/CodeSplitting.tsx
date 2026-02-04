'use client';

import dynamic from 'next/dynamic';
import { ComponentType, ReactNode, useRef, useEffect, useState } from 'react';
import { PageLoader } from './LoadingStates';

// ============================================
// DYNAMIC IMPORTS FOR CODE SPLITTING
// ============================================

/**
 * Lazy load a component with a loading fallback
 */
export function lazyLoad<P extends object>(
    importFn: () => Promise<{ default: ComponentType<P> }>,
    options?: {
        loading?: ReactNode;
        ssr?: boolean;
    }
) {
    return dynamic(importFn, {
        loading: () => <>{options?.loading ?? <PageLoader />}</>,
        ssr: options?.ssr ?? true,
    });
}

// ============================================
// CONDITIONAL LAZY LOADING
// ============================================

interface ConditionalLoadProps {
    when: boolean;
    fallback?: ReactNode;
    children: ReactNode;
}

/**
 * Only render children when condition is true
 * Useful for tab content that shouldn't mount until selected
 */
export function ConditionalLoad({ when, fallback = null, children }: ConditionalLoadProps) {
    return when ? <>{children}</> : <>{fallback}</>;
}

// ============================================
// PREFETCH UTILITY
// ============================================

/**
 * Prefetch a dynamic import to warm the cache
 * Call this on hover or when user is likely to navigate
 */
export function prefetchComponent(importFn: () => Promise<unknown>) {
    // Start the import but don't wait for it
    importFn().catch(() => {
        // Silently ignore prefetch errors
    });
}

// ============================================
// INTERSECTION OBSERVER LAZY LOADER
// ============================================

interface IntersectionLoaderProps {
    children: ReactNode;
    placeholder?: ReactNode;
    threshold?: number;
    rootMargin?: string;
}

/**
 * Only render children when scrolled into view
 */
export function IntersectionLoader({
    children,
    placeholder,
    threshold = 0.1,
    rootMargin = '100px',
}: IntersectionLoaderProps) {
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
            { threshold, rootMargin }
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, [threshold, rootMargin]);

    return (
        <div ref={ref}>
            {isVisible ? children : (placeholder || <div className="h-40 bg-white/5 animate-pulse rounded-xl" />)}
        </div>
    );
}

// ============================================
// EXPORTS
// ============================================

const CodeSplitting = {
    lazyLoad,
    ConditionalLoad,
    prefetchComponent,
    IntersectionLoader,
};

export default CodeSplitting;
