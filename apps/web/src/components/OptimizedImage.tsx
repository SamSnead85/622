'use client';

import React, { useState, useEffect, useRef } from 'react';

// ============================================
// OPTIMIZED IMAGE COMPONENT
// ============================================

interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'loading'> {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    priority?: boolean;
    placeholder?: 'blur' | 'shimmer' | 'none';
    blurDataUrl?: string;
    fallback?: string;
    aspectRatio?: string;
    objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
    onLoadComplete?: () => void;
}

export function OptimizedImage({
    src,
    alt,
    width,
    height,
    priority = false,
    placeholder = 'shimmer',
    blurDataUrl,
    fallback = '/images/placeholder.png',
    aspectRatio,
    objectFit = 'cover',
    className = '',
    onLoadComplete,
    ...props
}: OptimizedImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isInView, setIsInView] = useState(priority);
    const imgRef = useRef<HTMLImageElement>(null);

    // Intersection Observer for lazy loading
    useEffect(() => {
        if (priority || !imgRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '200px' }
        );

        observer.observe(imgRef.current);
        return () => observer.disconnect();
    }, [priority]);

    const handleLoad = () => {
        setIsLoaded(true);
        onLoadComplete?.();
    };

    const handleError = () => {
        setHasError(true);
    };

    // Build styles
    const containerStyle: React.CSSProperties = {
        position: 'relative',
        overflow: 'hidden',
        ...(width && { width }),
        ...(height && { height }),
        ...(aspectRatio && { aspectRatio }),
    };

    const imgStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        objectFit,
        transition: 'opacity 0.3s ease',
        opacity: isLoaded ? 1 : 0,
    };

    // Placeholder component
    const renderPlaceholder = () => {
        if (placeholder === 'none' || isLoaded) return null;

        if (placeholder === 'blur' && blurDataUrl) {
            return (
                <img
                    src={blurDataUrl}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-lg scale-110"
                />
            );
        }

        return (
            <div
                className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer"
                style={{
                    backgroundSize: '200% 100%',
                }}
            />
        );
    };

    return (
        <div
            ref={imgRef}
            className={`relative ${className}`}
            style={containerStyle}
        >
            {renderPlaceholder()}
            {isInView && (
                <img
                    src={hasError ? fallback : src}
                    alt={alt}
                    width={width}
                    height={height}
                    loading={priority ? 'eager' : 'lazy'}
                    decoding="async"
                    style={imgStyle}
                    onLoad={handleLoad}
                    onError={handleError}
                    {...props}
                />
            )}
        </div>
    );
}

// ============================================
// AVATAR COMPONENT
// ============================================

interface AvatarProps {
    src?: string;
    name: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    isOnline?: boolean;
    className?: string;
}

const sizeMap = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-24 h-24 text-2xl',
};

const statusSizeMap = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
    '2xl': 'w-5 h-5',
};

export function Avatar({ src, name, size = 'md', isOnline, className = '' }: AvatarProps) {
    const [hasError, setHasError] = useState(false);

    // Generate initials
    const initials = name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    // Generate color from name
    const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 6;
    const gradients = [
        'from-violet-500 to-fuchsia-500',
        'from-cyan-500 to-blue-500',
        'from-emerald-500 to-teal-500',
        'from-amber-500 to-orange-500',
        'from-pink-500 to-rose-500',
        'from-indigo-500 to-purple-500',
    ];

    return (
        <div className={`relative inline-block ${className}`}>
            <div
                className={`
                    ${sizeMap[size]}
                    rounded-full flex items-center justify-center
                    font-medium text-white overflow-hidden
                    bg-gradient-to-br ${gradients[colorIndex]}
                `}
            >
                {src && !hasError ? (
                    <img
                        src={src}
                        alt={name}
                        className="w-full h-full object-cover"
                        onError={() => setHasError(true)}
                    />
                ) : (
                    <span>{initials}</span>
                )}
            </div>
            {isOnline !== undefined && (
                <span
                    className={`
                        absolute bottom-0 right-0
                        ${statusSizeMap[size]}
                        rounded-full border-2 border-gray-900
                        ${isOnline ? 'bg-emerald-500' : 'bg-gray-500'}
                    `}
                />
            )}
        </div>
    );
}

// ============================================
// RESPONSIVE IMAGE GRID
// ============================================

interface ImageGridProps {
    images: { src: string; alt: string }[];
    maxDisplay?: number;
    onImageClick?: (index: number) => void;
    className?: string;
}

export function ImageGrid({
    images,
    maxDisplay = 4,
    onImageClick,
    className = '',
}: ImageGridProps) {
    const displayImages = images.slice(0, maxDisplay);
    const remainingCount = images.length - maxDisplay;

    const getGridClass = () => {
        switch (displayImages.length) {
            case 1:
                return 'grid-cols-1';
            case 2:
                return 'grid-cols-2';
            case 3:
                return 'grid-cols-2';
            default:
                return 'grid-cols-2';
        }
    };

    return (
        <div className={`grid ${getGridClass()} gap-1 rounded-xl overflow-hidden ${className}`}>
            {displayImages.map((image, index) => (
                <button
                    key={index}
                    onClick={() => onImageClick?.(index)}
                    className={`
                        relative overflow-hidden
                        ${displayImages.length === 3 && index === 0 ? 'row-span-2' : ''}
                        aspect-square
                    `}
                >
                    <OptimizedImage
                        src={image.src}
                        alt={image.alt}
                        className="w-full h-full"
                        objectFit="cover"
                    />
                    {index === maxDisplay - 1 && remainingCount > 0 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-white text-xl font-bold">+{remainingCount}</span>
                        </div>
                    )}
                </button>
            ))}
        </div>
    );
}

// ============================================
// SHIMMER ANIMATION STYLE
// ============================================

// Add to globals.css:
// @keyframes shimmer {
//   0% { background-position: -200% 0; }
//   100% { background-position: 200% 0; }
// }
// .animate-shimmer {
//   animation: shimmer 1.5s infinite;
// }

// ============================================
// EXPORTS
// ============================================

const ImageComponents = {
    OptimizedImage,
    Avatar,
    ImageGrid,
};

export default ImageComponents;
