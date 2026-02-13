'use client';

import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// PHASES 101-200: PROFILE & IDENTITY ENHANCEMENTS
// ============================================

// Phase 101-110: Profile Customization
export interface ProfileTheme {
    id: string;
    name: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
}

export const PROFILE_THEMES: ProfileTheme[] = [
    { id: 'default', name: 'Default', accentColor: '#7C8FFF', backgroundColor: '#0A0A0F', textColor: '#FFFFFF' },
    { id: 'sunset', name: 'Sunset', accentColor: '#FF6B6B', backgroundColor: '#1A0F0F', textColor: '#FFFFFF' },
    { id: 'forest', name: 'Forest', accentColor: '#2ECC71', backgroundColor: '#0F1A0F', textColor: '#FFFFFF' },
    { id: 'ocean', name: 'Ocean', accentColor: '#3498DB', backgroundColor: '#0F0F1A', textColor: '#FFFFFF' },
    { id: 'royal', name: 'Royal', accentColor: '#9B59B6', backgroundColor: '#0F0A1A', textColor: '#FFFFFF' },
    { id: 'gold', name: 'Gold', accentColor: '#F1C40F', backgroundColor: '#1A1A0F', textColor: '#FFFFFF' },
];

export function useProfileCustomization() {
    const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
    const [theme, setTheme] = useState<ProfileTheme>(PROFILE_THEMES[0]);
    const [bio, setBio] = useState('');
    const [links, setLinks] = useState<{ label: string; url: string }[]>([]);
    const [pronouns, setPronouns] = useState('');
    const [location, setLocation] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('0g_profile_customization');
            if (saved) {
                const data = JSON.parse(saved);
                setCoverPhoto(data.coverPhoto);
                setTheme(data.theme || PROFILE_THEMES[0]);
                setBio(data.bio || '');
                setLinks(data.links || []);
                setPronouns(data.pronouns || '');
                setLocation(data.location || '');
            }
        }
    }, []);

    const save = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('0g_profile_customization', JSON.stringify({
                coverPhoto, theme, bio, links, pronouns, location
            }));
        }
    }, [coverPhoto, theme, bio, links, pronouns, location]);

    return {
        coverPhoto, setCoverPhoto,
        theme, setTheme,
        bio, setBio,
        links, setLinks,
        pronouns, setPronouns,
        location, setLocation,
        save,
        availableThemes: PROFILE_THEMES,
    };
}

// Phase 111-120: Verification Badges
export type VerificationType = 'verified' | 'creator' | 'business' | 'government' | 'notable' | 'founder';

export interface VerificationBadge {
    type: VerificationType;
    label: string;
    icon: string;
    color: string;
    description: string;
}

export const VERIFICATION_BADGES: Record<VerificationType, VerificationBadge> = {
    verified: { type: 'verified', label: 'Verified', icon: '✓', color: '#7C8FFF', description: 'This account has been verified' },
    creator: { type: 'creator', label: 'Creator', icon: '★', color: '#FF6B9D', description: 'Established content creator' },
    business: { type: 'business', label: 'Business', icon: '🏢', color: '#2ECC71', description: 'Official business account' },
    government: { type: 'government', label: 'Government', icon: '🏛️', color: '#9B59B6', description: 'Government or official entity' },
    notable: { type: 'notable', label: 'Notable', icon: '⭐', color: '#F1C40F', description: 'Notable public figure' },
    founder: { type: 'founder', label: 'Founder', icon: '🚀', color: '#FF4500', description: '0G Platform Founder' },
};

interface VerificationBadgeDisplayProps {
    type: VerificationType;
    size?: 'sm' | 'md' | 'lg';
    showTooltip?: boolean;
}

export const VerificationBadgeDisplay = memo(function VerificationBadgeDisplay({
    type,
    size = 'md',
    showTooltip = true
}: VerificationBadgeDisplayProps) {
    const badge = VERIFICATION_BADGES[type];
    const sizes = { sm: 'w-4 h-4 text-[10px]', md: 'w-5 h-5 text-xs', lg: 'w-6 h-6 text-sm' };
    const [showTip, setShowTip] = useState(false);

    return (
        <div className="relative inline-flex">
            <div
                className={`${sizes[size]} rounded-full flex items-center justify-center font-bold`}
                style={{ backgroundColor: badge.color }}
                onMouseEnter={() => setShowTip(true)}
                onMouseLeave={() => setShowTip(false)}
            >
                {badge.icon}
            </div>
            {showTooltip && showTip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap z-50">
                    {badge.description}
                </div>
            )}
        </div>
    );
});

// Phase 121-130: Avatar Upload/Crop
export interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

export function useAvatarCrop(imageSrc: string | null) {
    const [crop, setCrop] = useState<CropArea>({ x: 0, y: 0, width: 100, height: 100 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);

    const getCroppedImage = useCallback(async (): Promise<Blob | null> => {
        if (!imageSrc) return null;

        return new Promise((resolve) => {
            const image = new Image();
            image.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d')!;

                const size = 256;
                canvas.width = size;
                canvas.height = size;

                ctx.save();
                ctx.translate(size / 2, size / 2);
                ctx.rotate((rotation * Math.PI) / 180);
                ctx.scale(zoom, zoom);
                ctx.translate(-size / 2, -size / 2);

                const sx = (crop.x / 100) * image.width;
                const sy = (crop.y / 100) * image.height;
                const sw = (crop.width / 100) * image.width;
                const sh = (crop.height / 100) * image.height;

                ctx.drawImage(image, sx, sy, sw, sh, 0, 0, size, size);
                ctx.restore();

                canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.9);
            };
            image.src = imageSrc;
        });
    }, [imageSrc, crop, zoom, rotation]);

    return { crop, setCrop, zoom, setZoom, rotation, setRotation, getCroppedImage };
}

// Phase 131-140: Profile Analytics Dashboard
export interface ProfileAnalytics {
    profileViews: number;
    profileViewsTrend: number;
    followers: number;
    followersTrend: number;
    following: number;
    posts: number;
    engagement: number;
    engagementTrend: number;
    topPosts: { id: string; views: number; likes: number }[];
    viewsByDay: { date: string; views: number }[];
    demographicData: { age: string; percentage: number }[];
    topLocations: { location: string; percentage: number }[];
}

export function useProfileAnalytics(userId: string) {
    const [analytics, setAnalytics] = useState<ProfileAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

    useEffect(() => {
        // Simulate fetching analytics
        setIsLoading(true);
        setTimeout(() => {
            setAnalytics({
                profileViews: 12450,
                profileViewsTrend: 15.3,
                followers: 8234,
                followersTrend: 8.7,
                following: 342,
                posts: 156,
                engagement: 4.2,
                engagementTrend: -2.1,
                topPosts: [
                    { id: '1', views: 5234, likes: 423 },
                    { id: '2', views: 3421, likes: 287 },
                    { id: '3', views: 2198, likes: 189 },
                ],
                viewsByDay: Array.from({ length: 30 }, (_, i) => ({
                    date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
                    views: Math.floor(Math.random() * 500) + 100,
                })),
                demographicData: [
                    { age: '18-24', percentage: 35 },
                    { age: '25-34', percentage: 40 },
                    { age: '35-44', percentage: 15 },
                    { age: '45+', percentage: 10 },
                ],
                topLocations: [
                    { location: 'United States', percentage: 45 },
                    { location: 'United Kingdom', percentage: 15 },
                    { location: 'Canada', percentage: 10 },
                    { location: 'Australia', percentage: 8 },
                ],
            });
            setIsLoading(false);
        }, 500);
    }, [userId, dateRange]);

    return { analytics, isLoading, dateRange, setDateRange };
}

// Phase 141-150: Follow Management
export interface FollowRelationship {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    followedAt: string;
    mutualFollowers: number;
    isVerified: boolean;
}

export function useFollowManagement() {
    const [followers, setFollowers] = useState<FollowRelationship[]>([]);
    const [following, setFollowing] = useState<FollowRelationship[]>([]);
    const [pendingRequests, setPendingRequests] = useState<FollowRelationship[]>([]);
    const [blockedUsers, setBlockedUsers] = useState<FollowRelationship[]>([]);

    const removeFollower = useCallback((userId: string) => {
        setFollowers(prev => prev.filter(f => f.id !== userId));
    }, []);

    const unfollow = useCallback((userId: string) => {
        setFollowing(prev => prev.filter(f => f.id !== userId));
    }, []);

    const approveRequest = useCallback((userId: string) => {
        const user = pendingRequests.find(r => r.id === userId);
        if (user) {
            setFollowers(prev => [...prev, user]);
            setPendingRequests(prev => prev.filter(r => r.id !== userId));
        }
    }, [pendingRequests]);

    const rejectRequest = useCallback((userId: string) => {
        setPendingRequests(prev => prev.filter(r => r.id !== userId));
    }, []);

    const blockUser = useCallback((userId: string) => {
        const user = followers.find(f => f.id === userId) || following.find(f => f.id === userId);
        if (user) {
            setBlockedUsers(prev => [...prev, user]);
            setFollowers(prev => prev.filter(f => f.id !== userId));
            setFollowing(prev => prev.filter(f => f.id !== userId));
        }
    }, [followers, following]);

    const unblockUser = useCallback((userId: string) => {
        setBlockedUsers(prev => prev.filter(u => u.id !== userId));
    }, []);

    return {
        followers, following, pendingRequests, blockedUsers,
        removeFollower, unfollow, approveRequest, rejectRequest, blockUser, unblockUser
    };
}

// Phase 151-160: Privacy Controls
export interface PrivacySettings {
    profileVisibility: 'public' | 'followers' | 'private';
    showOnlineStatus: boolean;
    showLastSeen: boolean;
    allowTagging: 'everyone' | 'followers' | 'nobody';
    allowMentions: 'everyone' | 'followers' | 'nobody';
    allowDMs: 'everyone' | 'followers' | 'nobody';
    showActivity: boolean;
    hideFromSearch: boolean;
    hideLikeCount: boolean;
}

export function usePrivacySettings() {
    const [settings, setSettings] = useState<PrivacySettings>(() => {
        if (typeof window === 'undefined') return getDefaultPrivacy();
        const saved = localStorage.getItem('0g_privacy_settings');
        return saved ? JSON.parse(saved) : getDefaultPrivacy();
    });

    function getDefaultPrivacy(): PrivacySettings {
        return {
            profileVisibility: 'public',
            showOnlineStatus: true,
            showLastSeen: true,
            allowTagging: 'everyone',
            allowMentions: 'everyone',
            allowDMs: 'followers',
            showActivity: true,
            hideFromSearch: false,
            hideLikeCount: false,
        };
    }

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('0g_privacy_settings', JSON.stringify(settings));
        }
    }, [settings]);

    const updateSetting = useCallback(<K extends keyof PrivacySettings>(
        key: K,
        value: PrivacySettings[K]
    ) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    }, []);

    return { settings, updateSetting, resetToDefault: () => setSettings(getDefaultPrivacy()) };
}

// Phase 161-170: Activity Timeline
export interface ActivityItem {
    id: string;
    type: 'post' | 'like' | 'comment' | 'follow' | 'share' | 'mention';
    timestamp: string;
    data: Record<string, any>;
}

export function useActivityTimeline(userId: string) {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [filter, setFilter] = useState<ActivityItem['type'] | 'all'>('all');

    const loadMore = useCallback(async () => {
        // Simulate loading more
        setIsLoading(true);
        await new Promise(r => setTimeout(r, 500));
        setIsLoading(false);
    }, []);

    const filteredActivities = activities.filter(a => filter === 'all' || a.type === filter);

    return { activities: filteredActivities, isLoading, hasMore, loadMore, filter, setFilter };
}

// Phase 171-180: Profile QR Code
export function useProfileQRCode(username: string) {
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

    useEffect(() => {
        const profileUrl = typeof window !== 'undefined'
            ? `${window.location.origin}/profile/${username}`
            : `https://0gravity.ai/profile/${username}`;

        // Generate QR code URL using external service
        setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(profileUrl)}`);
    }, [username]);

    const downloadQRCode = useCallback(() => {
        if (qrCodeUrl) {
            const link = document.createElement('a');
            link.href = qrCodeUrl;
            link.download = `${username}-qr.png`;
            link.click();
        }
    }, [qrCodeUrl, username]);

    return { qrCodeUrl, downloadQRCode };
}

// Phase 181-190: Block/Mute Management
export interface BlockedMutedUser {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    blockedAt?: string;
    mutedAt?: string;
    muteUntil?: string;
}

export function useBlockMuteManagement() {
    const [blocked, setBlocked] = useState<BlockedMutedUser[]>([]);
    const [muted, setMuted] = useState<BlockedMutedUser[]>([]);

    const blockUser = useCallback((user: Omit<BlockedMutedUser, 'blockedAt'>) => {
        setBlocked(prev => [...prev, { ...user, blockedAt: new Date().toISOString() }]);
        setMuted(prev => prev.filter(m => m.id !== user.id));
    }, []);

    const unblockUser = useCallback((userId: string) => {
        setBlocked(prev => prev.filter(b => b.id !== userId));
    }, []);

    const muteUser = useCallback((user: Omit<BlockedMutedUser, 'mutedAt'>, duration?: number) => {
        const muteUntil = duration ? new Date(Date.now() + duration).toISOString() : undefined;
        setMuted(prev => [...prev, { ...user, mutedAt: new Date().toISOString(), muteUntil }]);
    }, []);

    const unmuteUser = useCallback((userId: string) => {
        setMuted(prev => prev.filter(m => m.id !== userId));
    }, []);

    const isBlocked = useCallback((userId: string) => blocked.some(b => b.id === userId), [blocked]);
    const isMuted = useCallback((userId: string) => muted.some(m => m.id === userId), [muted]);

    return { blocked, muted, blockUser, unblockUser, muteUser, unmuteUser, isBlocked, isMuted };
}

// Phase 191-200: Profile Search
export function useProfileSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>(() => {
        if (typeof window === 'undefined') return [];
        const saved = localStorage.getItem('0g_recent_searches');
        return saved ? JSON.parse(saved) : [];
    });

    const search = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        // Simulate search
        await new Promise(r => setTimeout(r, 300));
        setResults([
            { id: '1', username: `${searchQuery}_user1`, displayName: `User matching ${searchQuery}` },
            { id: '2', username: `${searchQuery}_user2`, displayName: `Another ${searchQuery} user` },
        ]);
        setIsSearching(false);

        // Save to recent
        setRecentSearches(prev => {
            const updated = [searchQuery, ...prev.filter(s => s !== searchQuery)].slice(0, 10);
            if (typeof window !== 'undefined') {
                localStorage.setItem('0g_recent_searches', JSON.stringify(updated));
            }
            return updated;
        });
    }, []);

    const clearRecentSearches = useCallback(() => {
        setRecentSearches([]);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('0g_recent_searches');
        }
    }, []);

    return { query, setQuery, results, isSearching, search, recentSearches, clearRecentSearches };
}
