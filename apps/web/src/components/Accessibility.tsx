'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// SKIP LINK
// ============================================

export function SkipLink() {
    return (
        <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-cyan-500 focus:text-white focus:rounded-lg"
        >
            Skip to main content
        </a>
    );
}

// ============================================
// SCREEN READER ONLY TEXT
// ============================================

interface SrOnlyProps {
    children: ReactNode;
}

export function SrOnly({ children }: SrOnlyProps) {
    return <span className="sr-only">{children}</span>;
}

// ============================================
// LIVE REGION - Announce changes to screen readers
// ============================================

interface LiveRegionProps {
    message: string;
    priority?: 'polite' | 'assertive';
}

export function LiveRegion({ message, priority = 'polite' }: LiveRegionProps) {
    return (
        <div
            role="status"
            aria-live={priority}
            aria-atomic="true"
            className="sr-only"
        >
            {message}
        </div>
    );
}

// ============================================
// ANNOUNCER CONTEXT - Global announcements
// ============================================

interface AnnouncerContextValue {
    announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AnnouncerContext = createContext<AnnouncerContextValue | undefined>(undefined);

export function useAnnouncer() {
    const context = useContext(AnnouncerContext);
    if (!context) {
        throw new Error('useAnnouncer must be used within an AnnouncerProvider');
    }
    return context;
}

export function AnnouncerProvider({ children }: { children: ReactNode }) {
    const [politeMessage, setPoliteMessage] = useState('');
    const [assertiveMessage, setAssertiveMessage] = useState('');

    const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
        if (priority === 'assertive') {
            setAssertiveMessage(message);
            setTimeout(() => setAssertiveMessage(''), 1000);
        } else {
            setPoliteMessage(message);
            setTimeout(() => setPoliteMessage(''), 1000);
        }
    }, []);

    return (
        <AnnouncerContext.Provider value={{ announce }}>
            {children}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {politeMessage}
            </div>
            <div aria-live="assertive" aria-atomic="true" className="sr-only">
                {assertiveMessage}
            </div>
        </AnnouncerContext.Provider>
    );
}

// ============================================
// FOCUS TRAP - Keep focus within a container
// ============================================

interface FocusTrapProps {
    children: ReactNode;
    active?: boolean;
    className?: string;
}

export function FocusTrap({ children, active = true, className = '' }: FocusTrapProps) {
    const containerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!active) return;

        const container = containerRef.current;
        if (!container) return;

        const focusableElements = container.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement?.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement?.focus();
                }
            }
        };

        // Focus first element on mount
        firstElement?.focus();

        container.addEventListener('keydown', handleKeyDown);
        return () => container.removeEventListener('keydown', handleKeyDown);
    }, [active]);

    return (
        <div ref={containerRef} className={className}>
            {children}
        </div>
    );
}

// ============================================
// ACCESSIBLE MODAL
// ============================================

interface AccessibleModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    className?: string;
}

export function AccessibleModal({
    isOpen,
    onClose,
    title,
    children,
    className = '',
}: AccessibleModalProps) {
    const titleId = React.useId();

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                >
                    <motion.div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <FocusTrap>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`relative bg-gray-900 rounded-2xl border border-white/10 p-6 max-w-lg w-full ${className}`}
                        >
                            <header className="flex items-center justify-between mb-4">
                                <h2 id={titleId} className="text-xl font-bold text-white">
                                    {title}
                                </h2>
                                <button
                                    onClick={onClose}
                                    aria-label="Close modal"
                                    className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            </header>
                            {children}
                        </motion.div>
                    </FocusTrap>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ============================================
// KEYBOARD NAVIGATION HOOK
// ============================================

interface KeyboardNavigationOptions {
    onEscape?: () => void;
    onEnter?: () => void;
    onArrowDown?: () => void;
    onArrowUp?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
}

export function useKeyboardNavigation(options: KeyboardNavigationOptions) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape':
                    options.onEscape?.();
                    break;
                case 'Enter':
                    options.onEnter?.();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    options.onArrowDown?.();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    options.onArrowUp?.();
                    break;
                case 'ArrowLeft':
                    options.onArrowLeft?.();
                    break;
                case 'ArrowRight':
                    options.onArrowRight?.();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [options]);
}

// ============================================
// REDUCED MOTION HOOK
// ============================================

export function useReducedMotion(): boolean {
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    return reducedMotion;
}

// ============================================
// EXPORTS
// ============================================

const Accessibility = {
    SkipLink,
    SrOnly,
    LiveRegion,
    AnnouncerProvider,
    useAnnouncer,
    FocusTrap,
    AccessibleModal,
    useKeyboardNavigation,
    useReducedMotion,
};

export default Accessibility;
