'use client';

import { useRef, useEffect, useCallback } from 'react';

interface FocusTrapProps {
    children: React.ReactNode;
    active?: boolean;
    returnFocusOnDeactivate?: boolean;
    className?: string;
}

export function FocusTrap({
    children,
    active = true,
    returnFocusOnDeactivate = true,
    className = '',
}: FocusTrapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    // Store the previously focused element
    useEffect(() => {
        if (active) {
            previousFocusRef.current = document.activeElement as HTMLElement;
        }
    }, [active]);

    // Focus the first focusable element when activated
    useEffect(() => {
        if (!active || !containerRef.current) return;

        const focusableElements = getFocusableElements(containerRef.current);
        if (focusableElements.length > 0) {
            (focusableElements[0] as HTMLElement).focus();
        }

        return () => {
            // Return focus when deactivated
            if (returnFocusOnDeactivate && previousFocusRef.current) {
                previousFocusRef.current.focus();
            }
        };
    }, [active, returnFocusOnDeactivate]);

    // Handle tab key for cycling
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!active || e.key !== 'Tab' || !containerRef.current) return;

        const focusableElements = getFocusableElements(containerRef.current);
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
            // Shift+Tab: if on first element, wrap to last
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab: if on last element, wrap to first
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }, [active]);

    return (
        <div ref={containerRef} onKeyDown={handleKeyDown} className={className}>
            {children}
        </div>
    );
}

function getFocusableElements(container: HTMLElement): NodeListOf<Element> {
    return container.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
}
