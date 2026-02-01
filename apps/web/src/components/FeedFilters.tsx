'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

// ============================================
// TYPES
// ============================================
export interface FeedFilter {
    id: string;
    label: string;
    icon: string;
}

interface FeedFiltersProps {
    filters?: FeedFilter[];
    activeFilter: string;
    onFilterChange: (filterId: string) => void;
    className?: string;
}

// ============================================
// DEFAULT FILTERS
// ============================================
export const DEFAULT_FEED_FILTERS: FeedFilter[] = [
    { id: 'all', label: 'For You', icon: '✨' },
    { id: 'friends', label: 'Friends', icon: '👥' },
    { id: 'tribes', label: 'Tribes', icon: '🏕️' },
    { id: 'explore', label: 'Explore', icon: '🌍' },
];

// ============================================
// FEED FILTERS COMPONENT
// ============================================
export function FeedFilters({
    filters = DEFAULT_FEED_FILTERS,
    activeFilter,
    onFilterChange,
    className = '',
}: FeedFiltersProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // Check scroll position
    const updateScrollButtons = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
        }
    };

    useEffect(() => {
        updateScrollButtons();
        window.addEventListener('resize', updateScrollButtons);
        return () => window.removeEventListener('resize', updateScrollButtons);
    }, []);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 150;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth',
            });
        }
    };

    return (
        <div className={`relative ${className}`}>
            {/* Left scroll button */}
            {canScrollLeft && (
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                    ‹
                </button>
            )}

            {/* Filter tabs */}
            <div
                ref={scrollRef}
                onScroll={updateScrollButtons}
                className="flex gap-2 overflow-x-auto scrollbar-hide px-4 snap-x snap-mandatory"
                style={{ scrollPaddingInline: '1rem' }}
            >
                {filters.map((filter) => (
                    <motion.button
                        key={filter.id}
                        onClick={() => onFilterChange(filter.id)}
                        className={`
                            snap-start flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full
                            text-sm font-medium whitespace-nowrap transition-all
                            ${activeFilter === filter.id
                                ? 'bg-gradient-to-r from-orange-400 to-rose-500 text-white shadow-lg shadow-rose-500/20'
                                : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
                            }
                        `}
                        whileTap={{ scale: 0.95 }}
                    >
                        <span>{filter.icon}</span>
                        <span>{filter.label}</span>
                    </motion.button>
                ))}
            </div>

            {/* Right scroll button */}
            {canScrollRight && (
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                    ›
                </button>
            )}
        </div>
    );
}

// ============================================
// TRIBE QUICK SELECTOR
// ============================================
export interface Tribe {
    id: string;
    name: string;
    icon: string;
    memberCount?: number;
}

interface TribeSelectorProps {
    tribes: Tribe[];
    activeTribe: string | null;
    onTribeChange: (tribeId: string | null) => void;
    className?: string;
}

export function TribeSelector({
    tribes,
    activeTribe,
    onTribeChange,
    className = '',
}: TribeSelectorProps) {
    return (
        <div className={`flex gap-2 overflow-x-auto scrollbar-hide px-4 ${className}`}>
            {/* All tribes option */}
            <button
                onClick={() => onTribeChange(null)}
                className={`
                    flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full
                    text-xs font-medium transition-all
                    ${!activeTribe
                        ? 'bg-white text-black'
                        : 'bg-white/10 text-white/70 hover:bg-white/15'
                    }
                `}
            >
                All Tribes
            </button>

            {tribes.map((tribe) => (
                <button
                    key={tribe.id}
                    onClick={() => onTribeChange(tribe.id)}
                    className={`
                        flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full
                        text-xs font-medium transition-all
                        ${activeTribe === tribe.id
                            ? 'bg-white text-black'
                            : 'bg-white/10 text-white/70 hover:bg-white/15'
                        }
                    `}
                >
                    <span>{tribe.icon}</span>
                    <span>{tribe.name}</span>
                </button>
            ))}
        </div>
    );
}

export default FeedFilters;
