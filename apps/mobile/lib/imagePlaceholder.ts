// Universal placeholder configuration for expo-image
// Uses a neutral dark blur that matches our obsidian theme
export const IMAGE_PLACEHOLDER = {
    // A generic dark blurhash that works well with our obsidian theme
    blurhash: 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4',
    // Transition duration in ms (fast fade from blur to real image)
    transition: 200,
};

// For avatar images - slightly different blurhash (rounder feel)
export const AVATAR_PLACEHOLDER = {
    blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
    transition: 150,
};

// Reusable props to spread on expo-image Image components
export const imageLoadingProps = {
    placeholder: IMAGE_PLACEHOLDER.blurhash,
    transition: IMAGE_PLACEHOLDER.transition,
    cachePolicy: 'memory-disk' as const,
    recyclingKey: undefined as string | undefined, // set per-instance
};
