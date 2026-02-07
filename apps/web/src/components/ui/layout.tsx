'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, useState, useEffect, useRef, createContext, useContext } from 'react';

// ============================================
// ADVANCED LAYOUT COMPONENTS
// ZeroG Silk Road Renaissance Layout System
// ============================================

// ============================================
// MASONRY GRID
// Pinterest-style responsive grid
// ============================================

interface MasonryGridProps {
    children: ReactNode[];
    columns?: number;
    gap?: number;
    className?: string;
}

export function MasonryGrid({ children, columns = 3, gap = 16, className = '' }: MasonryGridProps) {
    const [columnHeights, setColumnHeights] = useState<number[]>(Array(columns).fill(0));
    const containerRef = useRef<HTMLDivElement>(null);

    const getShortestColumn = (heights: number[]) =>
        heights.indexOf(Math.min(...heights));

    return (
        <div
            ref={containerRef}
            className={`relative ${className}`}
            style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap,
            }}
        >
            {children.map((child, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                >
                    {child}
                </motion.div>
            ))}
        </div>
    );
}

// ============================================
// SPLIT VIEW
// Resizable split pane layout
// ============================================

interface SplitViewProps {
    left: ReactNode;
    right: ReactNode;
    initialRatio?: number;
    minRatio?: number;
    maxRatio?: number;
    direction?: 'horizontal' | 'vertical';
    className?: string;
}

export function SplitView({
    left,
    right,
    initialRatio = 0.5,
    minRatio = 0.2,
    maxRatio = 0.8,
    direction = 'horizontal',
    className = '',
}: SplitViewProps) {
    const [ratio, setRatio] = useState(initialRatio);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = () => setIsDragging(true);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const isHorizontal = direction === 'horizontal';
            const position = isHorizontal ? e.clientX - rect.left : e.clientY - rect.top;
            const total = isHorizontal ? rect.width : rect.height;
            const newRatio = Math.min(maxRatio, Math.max(minRatio, position / total));
            setRatio(newRatio);
        };

        const handleMouseUp = () => setIsDragging(false);

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, direction, minRatio, maxRatio]);

    const isHorizontal = direction === 'horizontal';

    return (
        <div
            ref={containerRef}
            className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} h-full ${className}`}
        >
            <div style={{ [isHorizontal ? 'width' : 'height']: `${ratio * 100}%` }}>
                {left}
            </div>

            <div
                onMouseDown={handleMouseDown}
                className={`
                    ${isHorizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'}
                    bg-white/10 hover:bg-violet-500/50 transition-colors
                    ${isDragging ? 'bg-violet-500/50' : ''}
                `}
            />

            <div style={{ [isHorizontal ? 'width' : 'height']: `${(1 - ratio) * 100}%` }}>
                {right}
            </div>
        </div>
    );
}

// ============================================
// INFINITE SCROLL
// Virtual scrolling with auto-load
// ============================================

interface InfiniteScrollProps {
    children: ReactNode;
    hasMore: boolean;
    onLoadMore: () => void;
    loading?: boolean;
    loader?: ReactNode;
    endMessage?: ReactNode;
    threshold?: number;
    className?: string;
}

export function InfiniteScroll({
    children,
    hasMore,
    onLoadMore,
    loading = false,
    loader,
    endMessage,
    threshold = 200,
    className = '',
}: InfiniteScrollProps) {
    const observerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!hasMore || loading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
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
            {children}

            <div ref={observerRef} className="h-1" />

            {loading && (loader || (
                <div className="flex justify-center py-8">
                    <motion.div
                        className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                </div>
            ))}

            {!hasMore && endMessage && (
                <div className="text-center py-8 text-white/40">
                    {endMessage}
                </div>
            )}
        </div>
    );
}

// ============================================
// COMMAND PALETTE
// Spotlight-style search
// ============================================

interface CommandItem {
    id: string;
    label: string;
    icon?: ReactNode;
    shortcut?: string;
    action: () => void;
}

interface CommandPaletteContextType {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    register: (items: CommandItem[]) => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextType | null>(null);

export function useCommandPalette() {
    const context = useContext(CommandPaletteContext);
    if (!context) throw new Error('useCommandPalette must be used within CommandPaletteProvider');
    return context;
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [items, setItems] = useState<CommandItem[]>([]);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    const filteredItems = items.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase())
    );

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }

            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <CommandPaletteContext.Provider
            value={{
                isOpen,
                open: () => setIsOpen(true),
                close: () => setIsOpen(false),
                register: setItems,
            }}
        >
            {children}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh]"
                        onClick={() => setIsOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-xl bg-[#0a0a12] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                        >
                            <div className="p-4 border-b border-white/10">
                                <input
                                    type="text"
                                    placeholder="Search or type a command..."
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value);
                                        setSelectedIndex(0);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1));
                                        } else if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setSelectedIndex(i => Math.max(i - 1, 0));
                                        } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
                                            filteredItems[selectedIndex].action();
                                            setIsOpen(false);
                                            setQuery('');
                                        }
                                    }}
                                    className="w-full bg-transparent text-white text-lg placeholder:text-white/30 focus:outline-none"
                                    autoFocus
                                />
                            </div>

                            <div className="max-h-80 overflow-y-auto">
                                {filteredItems.length === 0 ? (
                                    <div className="p-4 text-center text-white/40">
                                        No results found
                                    </div>
                                ) : (
                                    filteredItems.map((item, i) => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                item.action();
                                                setIsOpen(false);
                                                setQuery('');
                                            }}
                                            className={`
                                                w-full flex items-center gap-3 px-4 py-3 text-left
                                                ${i === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5'}
                                                transition-colors
                                            `}
                                        >
                                            {item.icon && (
                                                <span className="text-white/60">{item.icon}</span>
                                            )}
                                            <span className="flex-1 text-white">{item.label}</span>
                                            {item.shortcut && (
                                                <kbd className="px-2 py-0.5 bg-white/10 rounded text-xs text-white/60">
                                                    {item.shortcut}
                                                </kbd>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>

                            <div className="p-3 border-t border-white/10 flex items-center gap-4 text-xs text-white/40">
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↑</kbd>
                                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↓</kbd>
                                    to navigate
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↵</kbd>
                                    to select
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 bg-white/10 rounded">esc</kbd>
                                    to close
                                </span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </CommandPaletteContext.Provider>
    );
}

// ============================================
// DRAWER
// Slide-in panel
// ============================================

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    position?: 'left' | 'right' | 'top' | 'bottom';
    size?: string;
    className?: string;
}

export function Drawer({
    isOpen,
    onClose,
    children,
    position = 'right',
    size = '400px',
    className = '',
}: DrawerProps) {
    const isHorizontal = position === 'left' || position === 'right';

    const getInitialPosition = () => {
        switch (position) {
            case 'left': return { x: '-100%' };
            case 'right': return { x: '100%' };
            case 'top': return { y: '-100%' };
            case 'bottom': return { y: '100%' };
        }
    };

    const getAnimatePosition = () => {
        switch (position) {
            case 'left': return { x: 0 };
            case 'right': return { x: 0 };
            case 'top': return { y: 0 };
            case 'bottom': return { y: 0 };
        }
    };

    const getPositionStyles = (): React.CSSProperties => {
        const base = { position: 'fixed' as const, zIndex: 50 };
        switch (position) {
            case 'left': return { ...base, left: 0, top: 0, bottom: 0, width: size };
            case 'right': return { ...base, right: 0, top: 0, bottom: 0, width: size };
            case 'top': return { ...base, top: 0, left: 0, right: 0, height: size };
            case 'bottom': return { ...base, bottom: 0, left: 0, right: 0, height: size };
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    />

                    <motion.div
                        initial={getInitialPosition()}
                        animate={getAnimatePosition()}
                        exit={getInitialPosition()}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        style={getPositionStyles()}
                        className={`bg-[#0a0a12] border-white/10 ${className}`}
                    >
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ============================================
// BREADCRUMBS
// Navigation path
// ============================================

interface BreadcrumbItem {
    label: string;
    href?: string;
    onClick?: () => void;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
    separator?: ReactNode;
    className?: string;
}

export function Breadcrumbs({
    items,
    separator = '/',
    className = '',
}: BreadcrumbsProps) {
    return (
        <nav className={`flex items-center gap-2 text-sm ${className}`}>
            {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                    {i > 0 && (
                        <span className="text-white/30">{separator}</span>
                    )}

                    {i === items.length - 1 ? (
                        <span className="text-white">{item.label}</span>
                    ) : (
                        <button
                            onClick={item.onClick}
                            className="text-white/60 hover:text-white transition-colors"
                        >
                            {item.label}
                        </button>
                    )}
                </div>
            ))}
        </nav>
    );
}

// ============================================
// EXPORTS
// ============================================

export {
    type MasonryGridProps,
    type SplitViewProps,
    type InfiniteScrollProps,
    type CommandItem,
    type DrawerProps,
    type BreadcrumbItem,
    type BreadcrumbsProps,
};
