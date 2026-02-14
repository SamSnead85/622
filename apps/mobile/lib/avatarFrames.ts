// ============================================
// Avatar Frames — Cause & Identity Ring Overlays
// Users can select a frame that wraps their profile photo
// similar to LinkedIn's "Open to Work" or flag frames
// ============================================

export interface AvatarFrame {
    /** Unique key stored in DB */
    id: string;
    /** Display label */
    label: string;
    /** Short description */
    description: string;
    /** Category for grouping in picker */
    category: 'cause' | 'identity' | 'pride' | 'seasonal';
    /** Colors for the ring gradient (3-6 stops, rendered as conic/segmented ring) */
    ringColors: string[];
    /** Optional: if true, ring is segmented (flag-style) instead of smooth gradient */
    segmented?: boolean;
    /** Optional emoji shown as badge */
    badge?: string;
}

export const AVATAR_FRAMES: AvatarFrame[] = [
    // ── Causes ──────────────────────────────────────────
    {
        id: 'palestine',
        label: 'Palestine',
        description: 'Stand with Palestine',
        category: 'cause',
        ringColors: ['#000000', '#FFFFFF', '#009736', '#CE1126'],
        segmented: true,
        badge: '🇵🇸',
    },
    {
        id: 'ceasefire',
        label: 'Ceasefire Now',
        description: 'Advocate for peace',
        category: 'cause',
        ringColors: ['#E8E8E8', '#FF4444', '#E8E8E8', '#FF4444'],
        segmented: true,
        badge: '🕊️',
    },
    {
        id: 'sudan',
        label: 'Sudan',
        description: 'Stand with Sudan',
        category: 'cause',
        ringColors: ['#D21034', '#FFFFFF', '#000000', '#007229'],
        segmented: true,
        badge: '🇸🇩',
    },
    {
        id: 'congo',
        label: 'Congo',
        description: 'Stand with Congo',
        category: 'cause',
        ringColors: ['#007FFF', '#F7D618', '#CE1021'],
        segmented: true,
        badge: '🇨🇩',
    },
    {
        id: 'yemen',
        label: 'Yemen',
        description: 'Stand with Yemen',
        category: 'cause',
        ringColors: ['#CE1126', '#FFFFFF', '#000000'],
        segmented: true,
        badge: '🇾🇪',
    },
    {
        id: 'uyghur',
        label: 'Uyghur',
        description: 'Stand with Uyghurs',
        category: 'cause',
        ringColors: ['#75AADB', '#FFFFFF', '#75AADB'],
        segmented: true,
        badge: '☪️',
    },
    {
        id: 'kashmir',
        label: 'Kashmir',
        description: 'Stand with Kashmir',
        category: 'cause',
        ringColors: ['#006600', '#FFFFFF', '#006600'],
        segmented: true,
    },
    {
        id: 'rohingya',
        label: 'Rohingya',
        description: 'Stand with Rohingya',
        category: 'cause',
        ringColors: ['#006B3F', '#FCD116', '#CE1126'],
        segmented: true,
    },

    // ── Identity ────────────────────────────────────────
    {
        id: 'muslim',
        label: 'Muslim',
        description: 'Proud Muslim',
        category: 'identity',
        ringColors: ['#006633', '#C5A028', '#006633'],
        badge: '☪️',
    },
    {
        id: 'hijabi',
        label: 'Hijabi',
        description: 'Hijab is my crown',
        category: 'identity',
        ringColors: ['#9B59B6', '#E8DAEF', '#9B59B6'],
        badge: '🧕',
    },
    {
        id: 'revert',
        label: 'Revert',
        description: 'Proud revert to Islam',
        category: 'identity',
        ringColors: ['#2ECC71', '#F1C40F', '#2ECC71'],
        badge: '🌙',
    },
    {
        id: 'arab',
        label: 'Arab',
        description: 'Arab heritage',
        category: 'identity',
        ringColors: ['#000000', '#CE1126', '#FFFFFF', '#006233'],
        segmented: true,
    },
    {
        id: 'south-asian',
        label: 'South Asian',
        description: 'South Asian heritage',
        category: 'identity',
        ringColors: ['#FF9933', '#FFFFFF', '#138808'],
        segmented: true,
    },
    {
        id: 'african',
        label: 'African',
        description: 'African heritage',
        category: 'identity',
        ringColors: ['#009639', '#FCD116', '#CE1126'],
        segmented: true,
    },

    // ── Pride / Values ──────────────────────────────────
    {
        id: 'open-to-connect',
        label: 'Open to Connect',
        description: 'Looking for new connections',
        category: 'pride',
        ringColors: ['#C5A028', '#F5D76E', '#C5A028', '#F5D76E'],
        badge: '🤝',
    },
    {
        id: 'entrepreneur',
        label: 'Entrepreneur',
        description: 'Building something great',
        category: 'pride',
        ringColors: ['#1A73E8', '#34A853', '#FBBC04', '#EA4335'],
        badge: '🚀',
    },
    {
        id: 'creator',
        label: 'Creator',
        description: 'Content creator',
        category: 'pride',
        ringColors: ['#FF6B6B', '#FFA07A', '#FFD700', '#FF6B6B'],
        badge: '🎨',
    },
    {
        id: 'tech',
        label: 'Tech',
        description: 'Tech professional',
        category: 'pride',
        ringColors: ['#00D4FF', '#7B61FF', '#00D4FF'],
        badge: '💻',
    },
    {
        id: 'volunteer',
        label: 'Volunteer',
        description: 'Active volunteer',
        category: 'pride',
        ringColors: ['#FF6B6B', '#FFFFFF', '#FF6B6B'],
        badge: '❤️',
    },
    {
        id: 'educator',
        label: 'Educator',
        description: 'Teacher & mentor',
        category: 'pride',
        ringColors: ['#4A90D9', '#F5D76E', '#4A90D9'],
        badge: '📚',
    },

    // ── Seasonal ────────────────────────────────────────
    {
        id: 'ramadan',
        label: 'Ramadan',
        description: 'Ramadan Mubarak',
        category: 'seasonal',
        ringColors: ['#C5A028', '#1A3A5C', '#C5A028', '#1A3A5C'],
        badge: '🌙',
    },
    {
        id: 'eid',
        label: 'Eid',
        description: 'Eid Mubarak',
        category: 'seasonal',
        ringColors: ['#FFD700', '#FF6B6B', '#FFD700', '#FF6B6B'],
        badge: '🎉',
    },
    {
        id: 'hajj',
        label: 'Hajj',
        description: 'Hajj Mubarak',
        category: 'seasonal',
        ringColors: ['#FFFFFF', '#006633', '#FFFFFF', '#006633'],
        badge: '🕋',
    },
];

/** Look up a frame by ID — returns undefined if not found or 'none' */
export function getAvatarFrame(id?: string | null): AvatarFrame | undefined {
    if (!id || id === 'none') return undefined;
    return AVATAR_FRAMES.find((f) => f.id === id);
}

/** Group frames by category for the picker UI */
export function getFramesByCategory(): Record<string, AvatarFrame[]> {
    const groups: Record<string, AvatarFrame[]> = {};
    for (const frame of AVATAR_FRAMES) {
        if (!groups[frame.category]) groups[frame.category] = [];
        groups[frame.category].push(frame);
    }
    return groups;
}

/** Category display labels */
export const FRAME_CATEGORY_LABELS: Record<string, string> = {
    cause: 'Causes & Solidarity',
    identity: 'Heritage & Identity',
    pride: 'Values & Profession',
    seasonal: 'Seasonal',
};
