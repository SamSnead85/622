// ============================================
// Shared Utility Functions
// Used across multiple screens — single source of truth
// ============================================

/**
 * Format a date string into a relative time string (e.g., "2m", "3h", "1d")
 */
export function timeAgo(dateStr: string): string {
    const now = Date.now();
    const d = new Date(dateStr).getTime();
    if (isNaN(d)) return '';
    const seconds = Math.floor((now - d) / 1000);
    if (seconds < 0) return 'now';
    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w`;
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Format a number into a compact string (e.g., 1200 -> "1.2K")
 */
export function formatCount(num: number): string {
    if (num == null || isNaN(num)) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
}

/**
 * Truncate a string to a maximum length with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
    if (!str || str.length <= maxLength) return str || '';
    return str.slice(0, maxLength - 1) + '…';
}

/**
 * Safely parse a JSON string, returning a fallback on failure
 */
export function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
    if (!str) return fallback;
    try {
        return JSON.parse(str);
    } catch {
        return fallback;
    }
}

/**
 * Generate initials from a display name (e.g., "John Doe" -> "JD")
 */
export function getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Debounce a value change (for search inputs, etc.)
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// Media Aspect Ratio — Instagram-style clamping
// Ensures all feed media stays within a uniform band
// ============================================

/** Minimum H/W ratio: 1.91:1 landscape */
const MIN_HW_RATIO = 0.524;
/** Maximum H/W ratio: 4:5 portrait */
const MAX_HW_RATIO = 1.25;

/**
 * Parse and clamp a media aspect ratio to Instagram's supported band.
 * Accepts "W:H" (e.g. "16:9"), "W/H" decimal (e.g. "1.778"), or H/W decimal (e.g. "0.8").
 * Returns H/W ratio clamped between 0.524 (landscape) and 1.25 (portrait).
 * Use as: `{ aspectRatio: 1 / clampAspectRatio(raw) }` for RN style (RN aspectRatio = W/H).
 */
export function clampAspectRatio(raw?: string | null): number {
    if (!raw) return MAX_HW_RATIO; // default to 4:5 portrait

    // Handle "W:H" format (e.g. "16:9", "4:5", "1:1")
    if (raw.includes(':')) {
        const parts = raw.split(':').map(Number);
        const w = parts[0];
        const h = parts[1];
        if (w && h && w > 0 && h > 0) {
            return Math.min(MAX_HW_RATIO, Math.max(MIN_HW_RATIO, h / w));
        }
    }

    // Handle decimal format
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed > 0) {
        // Values > 2 are almost certainly W/H (e.g. 16/9 = 1.778) — invert to H/W
        // Values between 0.4 and 2 could be either, but treat as H/W
        // Values < 0.4 are very wide — likely W/H, invert
        let hwRatio: number;
        if (parsed > 2) {
            hwRatio = 1 / parsed;
        } else if (parsed < 0.4) {
            hwRatio = 1 / parsed;
        } else {
            hwRatio = parsed;
        }
        return Math.min(MAX_HW_RATIO, Math.max(MIN_HW_RATIO, hwRatio));
    }

    return MAX_HW_RATIO;
}
