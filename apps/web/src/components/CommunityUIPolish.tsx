'use client';

import React, { useState, useCallback, useEffect, useRef, memo, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// PHASES 401-500: COMMUNITY ENHANCEMENTS
// ============================================

// Phase 401-410: Community Creation Wizard
export interface CommunityConfig {
    name: string;
    description: string;
    category: string;
    visibility: 'public' | 'private' | 'restricted';
    joinApproval: 'auto' | 'manual' | 'questions';
    postApproval: boolean;
    allowedContentTypes: ('text' | 'image' | 'video' | 'poll' | 'event')[];
    rules: string[];
    coverImage?: string;
    icon?: string;
}

export function useCommunityCreationWizard() {
    const [step, setStep] = useState(1);
    const [config, setConfig] = useState<CommunityConfig>({
        name: '',
        description: '',
        category: '',
        visibility: 'public',
        joinApproval: 'auto',
        postApproval: false,
        allowedContentTypes: ['text', 'image', 'video', 'poll', 'event'],
        rules: [],
    });

    const totalSteps = 5;

    const updateConfig = useCallback(<K extends keyof CommunityConfig>(key: K, value: CommunityConfig[K]) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    }, []);

    const nextStep = useCallback(() => setStep(s => Math.min(s + 1, totalSteps)), []);
    const prevStep = useCallback(() => setStep(s => Math.max(s - 1, 1)), []);

    const isStepValid = useCallback((stepNum: number): boolean => {
        switch (stepNum) {
            case 1: return config.name.length >= 3 && config.description.length >= 10;
            case 2: return config.category !== '';
            case 3: return true;
            case 4: return config.rules.length >= 1;
            case 5: return true;
            default: return true;
        }
    }, [config]);

    const canProceed = isStepValid(step);

    return { step, setStep, config, updateConfig, nextStep, prevStep, totalSteps, canProceed, isStepValid };
}

// Phase 411-420: Community Roles & Permissions
export interface CommunityRole {
    id: string;
    name: string;
    color: string;
    permissions: CommunityPermission[];
    isDefault: boolean;
    position: number;
}

export type CommunityPermission =
    | 'manage_community' | 'manage_roles' | 'manage_members'
    | 'approve_posts' | 'delete_posts' | 'pin_posts'
    | 'approve_joins' | 'ban_members' | 'mute_members'
    | 'create_events' | 'manage_events'
    | 'view_analytics' | 'send_announcements';

export const DEFAULT_ROLES: CommunityRole[] = [
    { id: 'owner', name: 'Owner', color: '#FFD700', permissions: ['manage_community', 'manage_roles', 'manage_members', 'approve_posts', 'delete_posts', 'pin_posts', 'approve_joins', 'ban_members', 'mute_members', 'create_events', 'manage_events', 'view_analytics', 'send_announcements'], isDefault: false, position: 0 },
    { id: 'admin', name: 'Admin', color: '#FF6B6B', permissions: ['manage_members', 'approve_posts', 'delete_posts', 'pin_posts', 'approve_joins', 'ban_members', 'mute_members', 'create_events', 'manage_events', 'view_analytics', 'send_announcements'], isDefault: false, position: 1 },
    { id: 'moderator', name: 'Moderator', color: '#4ECDC4', permissions: ['approve_posts', 'delete_posts', 'mute_members', 'create_events'], isDefault: false, position: 2 },
    { id: 'member', name: 'Member', color: '#95A5A6', permissions: [], isDefault: true, position: 3 },
];

export function useCommunityRoles(communityId: string) {
    const [roles, setRoles] = useState<CommunityRole[]>(DEFAULT_ROLES);

    const createRole = useCallback((role: Omit<CommunityRole, 'id'>) => {
        const newRole = { ...role, id: `role_${Date.now()}` };
        setRoles(prev => [...prev, newRole]);
        return newRole.id;
    }, []);

    const updateRole = useCallback((roleId: string, updates: Partial<CommunityRole>) => {
        setRoles(prev => prev.map(r => r.id === roleId ? { ...r, ...updates } : r));
    }, []);

    const deleteRole = useCallback((roleId: string) => {
        setRoles(prev => prev.filter(r => r.id !== roleId && !['owner', 'admin', 'moderator', 'member'].includes(r.id)));
    }, []);

    const hasPermission = useCallback((roleId: string, permission: CommunityPermission): boolean => {
        const role = roles.find(r => r.id === roleId);
        return role?.permissions.includes(permission) || false;
    }, [roles]);

    return { roles, createRole, updateRole, deleteRole, hasPermission };
}

// Phase 421-430: Community Moderation
export interface ModerationAction {
    id: string;
    type: 'warn' | 'mute' | 'ban' | 'delete_content';
    targetUserId: string;
    reason: string;
    moderatorId: string;
    duration?: number;
    createdAt: string;
}

export function useCommunityModeration(communityId: string) {
    const [actions, setActions] = useState<ModerationAction[]>([]);
    const [autoModRules, setAutoModRules] = useState({
        profanityFilter: true,
        spamDetection: true,
        linkBlocking: false,
        minAccountAge: 0,
    });

    const warnUser = useCallback((userId: string, reason: string, modId: string) => {
        const action: ModerationAction = {
            id: `action_${Date.now()}`,
            type: 'warn',
            targetUserId: userId,
            reason,
            moderatorId: modId,
            createdAt: new Date().toISOString(),
        };
        setActions(prev => [...prev, action]);
    }, []);

    const muteUser = useCallback((userId: string, reason: string, modId: string, duration: number) => {
        const action: ModerationAction = {
            id: `action_${Date.now()}`,
            type: 'mute',
            targetUserId: userId,
            reason,
            moderatorId: modId,
            duration,
            createdAt: new Date().toISOString(),
        };
        setActions(prev => [...prev, action]);
    }, []);

    const banUser = useCallback((userId: string, reason: string, modId: string, duration?: number) => {
        const action: ModerationAction = {
            id: `action_${Date.now()}`,
            type: 'ban',
            targetUserId: userId,
            reason,
            moderatorId: modId,
            duration,
            createdAt: new Date().toISOString(),
        };
        setActions(prev => [...prev, action]);
    }, []);

    return { actions, autoModRules, setAutoModRules, warnUser, muteUser, banUser };
}

// Phase 431-440: Community Events
export interface CommunityEvent {
    id: string;
    title: string;
    description: string;
    startTime: string;
    endTime?: string;
    location?: string;
    isOnline: boolean;
    meetingUrl?: string;
    coverImage?: string;
    attendees: string[];
    interested: string[];
    maxAttendees?: number;
    status: 'upcoming' | 'live' | 'ended' | 'cancelled';
}

export function useCommunityEvents(communityId: string) {
    const [events, setEvents] = useState<CommunityEvent[]>([]);

    const createEvent = useCallback((event: Omit<CommunityEvent, 'id' | 'attendees' | 'interested' | 'status'>) => {
        const newEvent: CommunityEvent = {
            ...event,
            id: `event_${Date.now()}`,
            attendees: [],
            interested: [],
            status: 'upcoming',
        };
        setEvents(prev => [...prev, newEvent]);
        return newEvent.id;
    }, []);

    const attendEvent = useCallback((eventId: string, userId: string) => {
        setEvents(prev => prev.map(e =>
            e.id === eventId && !e.attendees.includes(userId) && (!e.maxAttendees || e.attendees.length < e.maxAttendees)
                ? { ...e, attendees: [...e.attendees, userId] }
                : e
        ));
    }, []);

    const markInterested = useCallback((eventId: string, userId: string) => {
        setEvents(prev => prev.map(e =>
            e.id === eventId && !e.interested.includes(userId)
                ? { ...e, interested: [...e.interested, userId] }
                : e
        ));
    }, []);

    const cancelEvent = useCallback((eventId: string) => {
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: 'cancelled' as const } : e));
    }, []);

    return { events, createEvent, attendEvent, markInterested, cancelEvent };
}

// Phase 441-450: Community Analytics
export interface CommunityAnalytics {
    memberCount: number;
    memberGrowth: number;
    activeMembers: number;
    postsThisWeek: number;
    postsTrend: number;
    engagement: number;
    topContributors: { id: string; name: string; posts: number; likes: number }[];
    membersByDay: { date: string; count: number }[];
    contentBreakdown: { type: string; count: number }[];
}

export function useCommunityAnalytics(communityId: string) {
    const [analytics, setAnalytics] = useState<CommunityAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate loading analytics
        setTimeout(() => {
            setAnalytics({
                memberCount: 5432,
                memberGrowth: 12.5,
                activeMembers: 892,
                postsThisWeek: 234,
                postsTrend: 8.3,
                engagement: 6.7,
                topContributors: [
                    { id: '1', name: 'User1', posts: 45, likes: 234 },
                    { id: '2', name: 'User2', posts: 38, likes: 198 },
                ],
                membersByDay: Array.from({ length: 30 }, (_, i) => ({
                    date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
                    count: Math.floor(Math.random() * 50) + 10,
                })),
                contentBreakdown: [
                    { type: 'Text', count: 456 },
                    { type: 'Image', count: 234 },
                    { type: 'Video', count: 89 },
                    { type: 'Poll', count: 45 },
                ],
            });
            setIsLoading(false);
        }, 500);
    }, [communityId]);

    return { analytics, isLoading };
}

// Phase 451-460: Invite System
export function useCommunityInvites(communityId: string) {
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [inviteLinks, setInviteLinks] = useState<{ code: string; uses: number; maxUses?: number; expiresAt?: string }[]>([]);

    const generateInviteCode = useCallback((maxUses?: number, expiresIn?: number) => {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        const expiresAt = expiresIn ? new Date(Date.now() + expiresIn).toISOString() : undefined;
        setInviteLinks(prev => [...prev, { code, uses: 0, maxUses, expiresAt }]);
        setInviteCode(code);
        return code;
    }, []);

    const revokeInvite = useCallback((code: string) => {
        setInviteLinks(prev => prev.filter(l => l.code !== code));
    }, []);

    return { inviteCode, inviteLinks, generateInviteCode, revokeInvite };
}

// Phase 461-470: Community Feed Algorithm
export function useCommunityFeedAlgorithm() {
    const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top' | 'controversial'>('hot');
    const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('week');

    const calculateScore = useCallback((post: { likes: number; comments: number; createdAt: string }) => {
        const age = (Date.now() - new Date(post.createdAt).getTime()) / 3600000; // hours
        const engagement = post.likes + post.comments * 2;

        switch (sortBy) {
            case 'hot': return engagement / Math.pow(age + 2, 1.5);
            case 'new': return -age;
            case 'top': return engagement;
            case 'controversial': return post.comments / (post.likes || 1);
            default: return engagement;
        }
    }, [sortBy]);

    return { sortBy, setSortBy, timeRange, setTimeRange, calculateScore };
}

// Phase 471-480: Community Guidelines
export interface CommunityGuideline {
    id: string;
    title: string;
    description: string;
    severity: 'info' | 'warning' | 'strict';
    examples?: string[];
}

export function useCommunityGuidelines(communityId: string) {
    const [guidelines, setGuidelines] = useState<CommunityGuideline[]>([
        { id: '1', title: 'Be Respectful', description: 'Treat all members with respect', severity: 'strict' },
        { id: '2', title: 'No Spam', description: 'Do not post repetitive or promotional content', severity: 'warning' },
        { id: '3', title: 'Stay On Topic', description: 'Keep discussions relevant to the community', severity: 'info' },
    ]);

    const addGuideline = useCallback((guideline: Omit<CommunityGuideline, 'id'>) => {
        setGuidelines(prev => [...prev, { ...guideline, id: `g_${Date.now()}` }]);
    }, []);

    const updateGuideline = useCallback((id: string, updates: Partial<CommunityGuideline>) => {
        setGuidelines(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
    }, []);

    const removeGuideline = useCallback((id: string) => {
        setGuidelines(prev => prev.filter(g => g.id !== id));
    }, []);

    return { guidelines, addGuideline, updateGuideline, removeGuideline };
}

// Phase 481-490: Community Discovery
export function useCommunityDiscovery() {
    const [trending, setTrending] = useState<any[]>([]);
    const [recommended, setRecommended] = useState<any[]>([]);
    const [categories, setCategories] = useState<{ id: string; name: string; count: number }[]>([
        { id: 'tech', name: 'Technology', count: 1234 },
        { id: 'art', name: 'Art & Design', count: 987 },
        { id: 'music', name: 'Music', count: 765 },
        { id: 'gaming', name: 'Gaming', count: 1456 },
        { id: 'sports', name: 'Sports', count: 543 },
        { id: 'lifestyle', name: 'Lifestyle', count: 876 },
    ]);

    return { trending, recommended, categories };
}

// Phase 491-500: Community Monetization
export function useCommunityMonetization(communityId: string) {
    const [subscriptionTiers, setSubscriptionTiers] = useState<{ id: string; name: string; price: number; benefits: string[] }[]>([]);
    const [revenue, setRevenue] = useState({ total: 0, thisMonth: 0, subscribers: 0 });

    const createTier = useCallback((tier: Omit<typeof subscriptionTiers[0], 'id'>) => {
        setSubscriptionTiers(prev => [...prev, { ...tier, id: `tier_${Date.now()}` }]);
    }, []);

    return { subscriptionTiers, revenue, createTier };
}

// ============================================
// PHASES 501-600: UI/UX POLISH
// ============================================

// Phase 501-520: Light/Dark Mode
export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
    mode: ThemeMode;
    resolvedTheme: 'light' | 'dark';
    setMode: (mode: ThemeMode) => void;
    colors: Record<string, string>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        return {
            mode: 'dark' as ThemeMode,
            resolvedTheme: 'dark' as const,
            setMode: () => { },
            colors: getThemeColors('dark'),
        };
    }
    return context;
}

function getThemeColors(theme: 'light' | 'dark') {
    return theme === 'dark' ? {
        background: '#0A0A0F',
        surface: '#1A1A1F',
        text: '#FFFFFF',
        textSecondary: 'rgba(255,255,255,0.6)',
        border: 'rgba(255,255,255,0.1)',
        accent: '#D4AF37',
    } : {
        background: '#FFFFFF',
        surface: '#F5F5F5',
        text: '#000000',
        textSecondary: 'rgba(0,0,0,0.6)',
        border: 'rgba(0,0,0,0.1)',
        accent: '#0099CC',
    };
}

// Phase 521-530: Animation System
export const ANIMATION_PRESETS = {
    fadeIn: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
    slideUp: { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } },
    slideDown: { initial: { opacity: 0, y: -20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 20 } },
    slideLeft: { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } },
    slideRight: { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 20 } },
    scale: { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.9 } },
    bounce: { initial: { scale: 0 }, animate: { scale: [0, 1.1, 1] }, exit: { scale: 0 } },
};

export function useReducedMotion() {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(query.matches);

        const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
        query.addEventListener('change', handler);
        return () => query.removeEventListener('change', handler);
    }, []);

    return prefersReducedMotion;
}

// Phase 531-540: Micro-interactions
export function useMicroInteractions() {
    const [haptics, setHaptics] = useState(true);

    const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
        if (!haptics || !('vibrate' in navigator)) return;
        const durations = { light: 10, medium: 20, heavy: 30 };
        navigator.vibrate(durations[type]);
    }, [haptics]);

    return { haptics, setHaptics, triggerHaptic };
}

// Phase 541-550: Loading States
export const LoadingSpinner = memo(function LoadingSpinner({ size = 24, color = '#D4AF37' }: { size?: number; color?: string }) {
    return (
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{ width: size, height: size }}
        >
            <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
        </motion.div>
    );
});

export const SkeletonLoader = memo(function SkeletonLoader({
    width = '100%',
    height = 20,
    rounded = 8
}: { width?: string | number; height?: number; rounded?: number }) {
    return (
        <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
                width,
                height,
                borderRadius: rounded,
                background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)',
            }}
        />
    );
});

// Phase 551-560: Empty States
interface EmptyStateProps {
    icon: string;
    title: string;
    description: string;
    action?: { label: string; onClick: () => void };
}

export const EmptyState = memo(function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 px-4 text-center"
        >
            <div className="text-6xl mb-4">{icon}</div>
            <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
            <p className="text-white/60 max-w-md mb-6">{description}</p>
            {action && (
                <button
                    onClick={action.onClick}
                    className="px-6 py-3 bg-[#D4AF37] text-black font-medium rounded-xl hover:bg-[#D4AF37]/90 transition-colors"
                >
                    {action.label}
                </button>
            )}
        </motion.div>
    );
});

// Phase 561-570: Error Handling UX
interface ErrorDisplayProps {
    error: Error | string;
    onRetry?: () => void;
    onDismiss?: () => void;
}

export const ErrorDisplay = memo(function ErrorDisplay({ error, onRetry, onDismiss }: ErrorDisplayProps) {
    const message = typeof error === 'string' ? error : error.message;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-4"
        >
            <div className="flex items-start gap-3">
                <span className="text-red-400 text-xl">⚠️</span>
                <div className="flex-1">
                    <h4 className="text-red-400 font-medium">Something went wrong</h4>
                    <p className="text-white/60 text-sm mt-1">{message}</p>
                    <div className="flex gap-2 mt-3">
                        {onRetry && (
                            <button onClick={onRetry} className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg">
                                Try Again
                            </button>
                        )}
                        {onDismiss && (
                            <button onClick={onDismiss} className="px-3 py-1.5 bg-white/10 text-white text-sm rounded-lg">
                                Dismiss
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
});

// Phase 571-580: Form Validation
export function useFormValidation<T extends Record<string, any>>(
    initialValues: T,
    validators: Partial<Record<keyof T, (value: any) => string | null>>
) {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
    const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

    const setValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
        setValues(prev => ({ ...prev, [key]: value }));

        const validator = validators[key];
        if (validator) {
            const error = validator(value);
            setErrors(prev => ({ ...prev, [key]: error || undefined }));
        }
    }, [validators]);

    const setFieldTouched = useCallback((key: keyof T) => {
        setTouched(prev => ({ ...prev, [key]: true }));
    }, []);

    const validateAll = useCallback(() => {
        const newErrors: Partial<Record<keyof T, string>> = {};
        let isValid = true;

        for (const key of Object.keys(validators) as (keyof T)[]) {
            const validator = validators[key];
            if (validator) {
                const error = validator(values[key]);
                if (error) {
                    newErrors[key] = error;
                    isValid = false;
                }
            }
        }

        setErrors(newErrors);
        return isValid;
    }, [validators, values]);

    const reset = useCallback(() => {
        setValues(initialValues);
        setErrors({});
        setTouched({});
    }, [initialValues]);

    return { values, errors, touched, setValue, setFieldTouched, validateAll, reset };
}

// Phase 581-590: Responsive Breakpoints
export function useBreakpoint() {
    const [breakpoint, setBreakpoint] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'>('lg');

    useEffect(() => {
        const checkBreakpoint = () => {
            const width = window.innerWidth;
            if (width < 640) setBreakpoint('xs');
            else if (width < 768) setBreakpoint('sm');
            else if (width < 1024) setBreakpoint('md');
            else if (width < 1280) setBreakpoint('lg');
            else if (width < 1536) setBreakpoint('xl');
            else setBreakpoint('2xl');
        };

        checkBreakpoint();
        window.addEventListener('resize', checkBreakpoint);
        return () => window.removeEventListener('resize', checkBreakpoint);
    }, []);

    const isMobile = breakpoint === 'xs' || breakpoint === 'sm';
    const isTablet = breakpoint === 'md';
    const isDesktop = breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl';

    return { breakpoint, isMobile, isTablet, isDesktop };
}

// Phase 591-600: Typography & Icon Consistency
export const TYPOGRAPHY = {
    h1: 'text-4xl font-bold tracking-tight',
    h2: 'text-3xl font-semibold tracking-tight',
    h3: 'text-2xl font-semibold',
    h4: 'text-xl font-medium',
    h5: 'text-lg font-medium',
    h6: 'text-base font-medium',
    body: 'text-base',
    bodySmall: 'text-sm',
    caption: 'text-xs text-white/60',
    label: 'text-sm font-medium',
};

export const SPACING = {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
};

export const SHADOWS = {
    sm: '0 1px 2px rgba(0,0,0,0.3)',
    md: '0 4px 6px rgba(0,0,0,0.3)',
    lg: '0 10px 15px rgba(0,0,0,0.3)',
    xl: '0 20px 25px rgba(0,0,0,0.3)',
    glow: '0 0 20px rgba(0,212,255,0.3)',
};
