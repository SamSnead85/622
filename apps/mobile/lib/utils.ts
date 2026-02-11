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
