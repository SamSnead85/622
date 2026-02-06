'use client';

import { useState, useCallback, useRef } from 'react';

interface RippleData {
    id: number;
    x: number;
    y: number;
    size: number;
}

interface RippleProps {
    children: React.ReactNode;
    className?: string;
    color?: string;
    disabled?: boolean;
    as?: 'div' | 'button' | 'span';
    onClick?: (e: React.MouseEvent) => void;
}

export function Ripple({
    children,
    className = '',
    color = 'rgba(255, 255, 255, 0.15)',
    disabled = false,
    as: Component = 'div',
    onClick,
}: RippleProps) {
    const [ripples, setRipples] = useState<RippleData[]>([]);
    const nextId = useRef(0);

    const handleClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
        if (disabled) return;
        onClick?.(e);

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const size = Math.max(rect.width, rect.height) * 2;
        const id = nextId.current++;

        setRipples((prev) => [...prev, { id, x, y, size }]);
        setTimeout(() => {
            setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 600);
    }, [disabled, onClick]);

    return (
        <Component
            className={`relative overflow-hidden ${className}`}
            onClick={handleClick}
            style={{ position: 'relative', overflow: 'hidden' }}
        >
            {children}
            {ripples.map((ripple) => (
                <span
                    key={ripple.id}
                    className="absolute rounded-full pointer-events-none animate-ripple-expand"
                    style={{
                        left: ripple.x - ripple.size / 2,
                        top: ripple.y - ripple.size / 2,
                        width: ripple.size,
                        height: ripple.size,
                        backgroundColor: color,
                    }}
                />
            ))}
        </Component>
    );
}
