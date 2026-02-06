'use client';

import { usePathname } from 'next/navigation';
import { useRef, useEffect, useState, createContext, useContext } from 'react';

type TransitionDirection = 'forward' | 'back' | 'up' | 'down' | 'none';

interface PageTransitionContextType {
    direction: TransitionDirection;
    previousPath: string | null;
}

export const PageTransitionContext = createContext<PageTransitionContextType>({
    direction: 'none',
    previousPath: null,
});

export function usePageTransitionProvider() {
    const pathname = usePathname();
    const previousPathRef = useRef<string | null>(null);
    const historyStackRef = useRef<string[]>([]);
    const [direction, setDirection] = useState<TransitionDirection>('none');

    useEffect(() => {
        const prevPath = previousPathRef.current;
        if (prevPath === null) {
            setDirection('none');
        } else if (historyStackRef.current.includes(pathname)) {
            // Going back to a page we've been to
            setDirection('back');
            historyStackRef.current = historyStackRef.current.slice(
                0,
                historyStackRef.current.indexOf(pathname) + 1
            );
        } else {
            // Determine direction based on route depth
            const prevDepth = prevPath.split('/').filter(Boolean).length;
            const nextDepth = pathname.split('/').filter(Boolean).length;
            if (nextDepth > prevDepth) {
                setDirection('forward');
            } else if (nextDepth < prevDepth) {
                setDirection('back');
            } else {
                setDirection('forward');
            }
            historyStackRef.current.push(pathname);
        }
        previousPathRef.current = pathname;
    }, [pathname]);

    return {
        direction,
        previousPath: previousPathRef.current,
    };
}

export function usePageTransition() {
    return useContext(PageTransitionContext);
}
