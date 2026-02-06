'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import type { Post } from '@/hooks/usePosts';

interface ImmersiveFeedProps {
    posts: Post[];
    renderPost: (post: Post, index: number) => React.ReactNode;
    onLoadMore?: () => void;
    hasMore?: boolean;
    isLoading?: boolean;
}

export function ImmersiveFeed({
    posts,
    renderPost,
    onLoadMore,
    hasMore = false,
    isLoading = false,
}: ImmersiveFeedProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });

    // Intersection observer for infinite scroll
    useEffect(() => {
        if (!sentinelRef.current || !hasMore || !onLoadMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    onLoadMore();
                }
            },
            { rootMargin: '400px' }
        );

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, onLoadMore]);

    // Virtual rendering - expand visible range on scroll
    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            const scrollTop = window.scrollY;
            const viewportHeight = window.innerHeight;
            const estimatedItemHeight = 500;
            
            const start = Math.max(0, Math.floor(scrollTop / estimatedItemHeight) - 2);
            const end = Math.min(posts.length, Math.ceil((scrollTop + viewportHeight) / estimatedItemHeight) + 3);
            
            setVisibleRange({ start, end });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [posts.length]);

    // Pull to refresh
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    return (
        <div ref={containerRef} className="space-y-3">
            {/* Pull to refresh indicator */}
            <AnimatePresence>
                {pullDistance > 0 && (
                    <motion.div
                        className="flex justify-center py-4"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: pullDistance, opacity: pullDistance / 80 }}
                        exit={{ height: 0, opacity: 0 }}
                    >
                        <motion.div
                            className="w-8 h-8 border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full"
                            animate={{ rotate: pullDistance * 3 }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Rendered posts */}
            {posts.map((post, index) => {
                // Only render items in visible range + buffer
                const isVisible = index >= visibleRange.start && index <= visibleRange.end;
                
                if (!isVisible) {
                    // Placeholder for off-screen posts
                    return (
                        <div
                            key={post.id}
                            style={{ height: 400 }}
                            className="bg-transparent"
                        />
                    );
                }

                return (
                    <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
                    >
                        {renderPost(post, index)}
                    </motion.div>
                );
            })}

            {/* Load more sentinel */}
            {hasMore && (
                <div ref={sentinelRef} className="py-8 flex justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-[#00D4FF]/30 border-t-[#00D4FF] animate-spin" />
                </div>
            )}

            {/* End of feed */}
            {!hasMore && posts.length > 0 && (
                <div className="text-center py-8 text-white/30 text-sm">
                    You&apos;re all caught up
                </div>
            )}
        </div>
    );
}
