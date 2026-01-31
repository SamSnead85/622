/**
 * Caravan Data Persistence Utilities
 * Handles saving and loading user data for returning users
 */

// Storage keys
const STORAGE_KEYS = {
    PROFILE: 'caravan_user_profile',
    PREFERENCES: 'caravan_preferences',
    DRAFT_CONTENT: 'caravan_drafts',
    RECENT_SEARCHES: 'caravan_recent_searches',
    VIEW_HISTORY: 'caravan_view_history',
} as const;

// ============================================
// USER PREFERENCES
// ============================================
export interface UserPreferences {
    theme: 'dark' | 'light' | 'auto';
    fontSize: 'small' | 'medium' | 'large';
    autoplayVideos: boolean;
    reducedMotion: boolean;
    showOnlineStatus: boolean;
    readReceipts: boolean;
    soundEffects: boolean;
    language: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
    theme: 'dark',
    fontSize: 'medium',
    autoplayVideos: true,
    reducedMotion: false,
    showOnlineStatus: true,
    readReceipts: true,
    soundEffects: true,
    language: 'en',
};

export function savePreferences(prefs: Partial<UserPreferences>): void {
    if (typeof window === 'undefined') return;
    const current = loadPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
}

export function loadPreferences(): UserPreferences {
    if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
        return stored ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) } : DEFAULT_PREFERENCES;
    } catch {
        return DEFAULT_PREFERENCES;
    }
}

// ============================================
// DRAFT CONTENT (unsent posts, messages)
// ============================================
export interface DraftContent {
    id: string;
    type: 'post' | 'message' | 'comment';
    content: string;
    mediaUrls?: string[];
    createdAt: number;
    updatedAt: number;
    metadata?: Record<string, unknown>;
}

export function saveDraft(draft: DraftContent): void {
    if (typeof window === 'undefined') return;
    const drafts = loadDrafts();
    const existingIndex = drafts.findIndex(d => d.id === draft.id);
    if (existingIndex >= 0) {
        drafts[existingIndex] = { ...draft, updatedAt: Date.now() };
    } else {
        drafts.push({ ...draft, createdAt: Date.now(), updatedAt: Date.now() });
    }
    localStorage.setItem(STORAGE_KEYS.DRAFT_CONTENT, JSON.stringify(drafts));
}

export function loadDrafts(): DraftContent[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.DRAFT_CONTENT);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export function deleteDraft(id: string): void {
    if (typeof window === 'undefined') return;
    const drafts = loadDrafts().filter(d => d.id !== id);
    localStorage.setItem(STORAGE_KEYS.DRAFT_CONTENT, JSON.stringify(drafts));
}

// ============================================
// RECENT SEARCHES
// ============================================
export function saveRecentSearch(query: string): void {
    if (typeof window === 'undefined' || !query.trim()) return;
    const searches = loadRecentSearches();
    const filtered = searches.filter(s => s.toLowerCase() !== query.toLowerCase());
    const updated = [query, ...filtered].slice(0, 10); // Keep last 10
    localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(updated));
}

export function loadRecentSearches(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export function clearRecentSearches(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.RECENT_SEARCHES);
}

// ============================================
// VIEW HISTORY (for "Continue where you left off")
// ============================================
export interface ViewHistoryItem {
    type: 'post' | 'profile' | 'community' | 'journey';
    id: string;
    title: string;
    thumbnail?: string;
    timestamp: number;
}

export function addToViewHistory(item: Omit<ViewHistoryItem, 'timestamp'>): void {
    if (typeof window === 'undefined') return;
    const history = loadViewHistory();
    const filtered = history.filter(h => !(h.type === item.type && h.id === item.id));
    const updated = [{ ...item, timestamp: Date.now() }, ...filtered].slice(0, 20);
    localStorage.setItem(STORAGE_KEYS.VIEW_HISTORY, JSON.stringify(updated));
}

export function loadViewHistory(): ViewHistoryItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.VIEW_HISTORY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

// ============================================
// CLEAR ALL DATA
// ============================================
export function clearAllData(): void {
    if (typeof window === 'undefined') return;
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
}

// ============================================
// DATA EXPORT (for portability)
// ============================================
export function exportUserData(): string {
    if (typeof window === 'undefined') return '{}';
    const data: Record<string, unknown> = {};
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
        const value = localStorage.getItem(key);
        if (value) {
            try {
                data[name] = JSON.parse(value);
            } catch {
                data[name] = value;
            }
        }
    });
    return JSON.stringify(data, null, 2);
}

export function importUserData(jsonString: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const data = JSON.parse(jsonString);
        Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
            if (data[name]) {
                localStorage.setItem(key, JSON.stringify(data[name]));
            }
        });
        return true;
    } catch {
        return false;
    }
}
