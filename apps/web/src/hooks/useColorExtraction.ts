'use client';

import { useState, useEffect, useCallback } from 'react';

interface ColorPalette {
    dominant: string;
    muted: string;
    vibrant: string;
}

const defaultPalette: ColorPalette = {
    dominant: '#0A0A0F',
    muted: '#1a1a2e',
    vibrant: '#D4AF37',
};

export function useColorExtraction(imageUrl?: string): ColorPalette {
    const [palette, setPalette] = useState<ColorPalette>(defaultPalette);

    useEffect(() => {
        if (!imageUrl) {
            setPalette(defaultPalette);
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                // Sample at small size for performance
                const sampleSize = 32;
                canvas.width = sampleSize;
                canvas.height = sampleSize;
                ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

                const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
                const colors: { r: number; g: number; b: number; count: number }[] = [];

                // Simple color quantization
                for (let i = 0; i < imageData.length; i += 16) { // Sample every 4th pixel
                    const r = Math.round(imageData[i] / 32) * 32;
                    const g = Math.round(imageData[i + 1] / 32) * 32;
                    const b = Math.round(imageData[i + 2] / 32) * 32;

                    const existing = colors.find(c => c.r === r && c.g === g && c.b === b);
                    if (existing) {
                        existing.count++;
                    } else {
                        colors.push({ r, g, b, count: 1 });
                    }
                }

                colors.sort((a, b) => b.count - a.count);

                const toHex = (c: { r: number; g: number; b: number }) =>
                    `#${c.r.toString(16).padStart(2, '0')}${c.g.toString(16).padStart(2, '0')}${c.b.toString(16).padStart(2, '0')}`;

                // Get saturation of a color
                const getSaturation = (c: { r: number; g: number; b: number }) => {
                    const max = Math.max(c.r, c.g, c.b) / 255;
                    const min = Math.min(c.r, c.g, c.b) / 255;
                    return max === 0 ? 0 : (max - min) / max;
                };

                const dominant = colors[0] || { r: 10, g: 10, b: 15 };

                // Muted: low saturation color
                const muted = colors.find(c => getSaturation(c) < 0.3 && c.count > 1) || colors[1] || dominant;

                // Vibrant: highest saturation
                const sortedBySaturation = [...colors].sort((a, b) => getSaturation(b) - getSaturation(a));
                const vibrant = sortedBySaturation[0] || dominant;

                setPalette({
                    dominant: toHex(dominant),
                    muted: toHex(muted),
                    vibrant: toHex(vibrant),
                });
            } catch {
                setPalette(defaultPalette);
            }
        };
        img.onerror = () => setPalette(defaultPalette);
        img.src = imageUrl;
    }, [imageUrl]);

    return palette;
}
