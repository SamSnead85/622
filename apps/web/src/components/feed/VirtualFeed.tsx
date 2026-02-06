'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';

interface VirtualFeedProps<T> {
    items: T[];
    renderItem: (item: T, index: number) => React.ReactNode;
    estimatedItemHeight?: number;
    overscan?: number;
    onEndReached?: () => void;
    endReachedThreshold?: number;
    keyExtractor: (item: T) => string;
    className?: string;
}

export function VirtualFeed<T>({
    items,
    renderItem,
    estimatedItemHeight = 400,
    overscan = 2,
    onEndReached,
    endReachedThreshold = 0.8,
    keyExtractor,
    className = '',
}: VirtualFeedProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
    const itemHeights = useRef<Map<string, number>>(new Map());
    const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const endReachedRef = useRef(false);

    // Measure items after render
    const measureItems = useCallback(() => {
        itemRefs.current.forEach((el, key) => {
            const height = el.getBoundingClientRect().height;
            if (height > 0) {
                itemHeights.current.set(key, height);
            }
        });
    }, []);

    // Calculate visible range on scroll
    useEffect(() => {
        const handleScroll = () => {
            measureItems();
            const scrollTop = window.scrollY;
            const viewportHeight = window.innerHeight;

            // Find which items are visible
            let currentTop = 0;
            let startIdx = 0;
            let endIdx = items.length;

            for (let i = 0; i < items.length; i++) {
                const key = keyExtractor(items[i]);
                const height = itemHeights.current.get(key) || estimatedItemHeight;

                if (currentTop + height < scrollTop - viewportHeight) {
                    startIdx = i;
                }
                if (currentTop > scrollTop + viewportHeight * 2) {
                    endIdx = i;
                    break;
                }
                currentTop += height;
            }

            const newStart = Math.max(0, startIdx - overscan);
            const newEnd = Math.min(items.length, endIdx + overscan);

            setVisibleRange({ start: newStart, end: newEnd });

            // Check end reached
            const scrollFraction = (scrollTop + viewportHeight) / document.documentElement.scrollHeight;
            if (scrollFraction > endReachedThreshold && !endReachedRef.current) {
                endReachedRef.current = true;
                onEndReached?.();
                setTimeout(() => { endReachedRef.current = false; }, 1000);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [items, estimatedItemHeight, overscan, onEndReached, endReachedThreshold, keyExtractor, measureItems]);

    // Calculate total height and offsets
    const { totalHeight, offsets } = useMemo(() => {
        let total = 0;
        const offs: number[] = [];
        for (let i = 0; i < items.length; i++) {
            offs.push(total);
            const key = keyExtractor(items[i]);
            total += itemHeights.current.get(key) || estimatedItemHeight;
        }
        return { totalHeight: total, offsets: offs };
    }, [items, estimatedItemHeight, keyExtractor, visibleRange]);

    return (
        <div ref={containerRef} className={className} style={{ position: 'relative', minHeight: totalHeight }}>
            {items.slice(visibleRange.start, visibleRange.end).map((item, idx) => {
                const realIndex = visibleRange.start + idx;
                const key = keyExtractor(item);
                return (
                    <div
                        key={key}
                        ref={(el) => { if (el) itemRefs.current.set(key, el); }}
                        style={{
                            position: 'absolute',
                            top: offsets[realIndex] || 0,
                            left: 0,
                            right: 0,
                        }}
                    >
                        {renderItem(item, realIndex)}
                    </div>
                );
            })}
        </div>
    );
}
