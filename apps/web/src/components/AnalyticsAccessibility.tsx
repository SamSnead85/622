'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

// ============================================
// ANALYTICS CARD
// Display key metrics with trends
// ============================================

interface AnalyticsCardProps {
    title: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
    icon?: string;
}

export function AnalyticsCard({ title, value, change, changeLabel = 'vs last week', icon }: AnalyticsCardProps) {
    const isPositive = change && change > 0;
    const isNegative = change && change < 0;

    return (
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-start justify-between mb-3">
                <span className="text-sm text-white/60">{title}</span>
                {icon && <span className="text-lg">{icon}</span>}
            </div>
            <div className="text-2xl font-bold text-white mb-2">
                {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            {change !== undefined && (
                <div className="flex items-center gap-1 text-sm">
                    <span className={isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-white/50'}>
                        {isPositive ? '↑' : isNegative ? '↓' : '→'} {Math.abs(change)}%
                    </span>
                    <span className="text-white/40">{changeLabel}</span>
                </div>
            )}
        </div>
    );
}

// ============================================
// MINI CHART
// Small inline trend chart
// ============================================

interface MiniChartProps {
    data: number[];
    height?: number;
    color?: string;
}

export function MiniChart({ data, height = 40, color = '#D4AF37' }: MiniChartProps) {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * 100;
        const y = 100 - ((value - min) / range) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width="100%" height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
                <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                points={points}
            />
            <polygon
                fill={`url(#gradient-${color})`}
                points={`0,100 ${points} 100,100`}
            />
        </svg>
    );
}

// ============================================
// PROFILE ANALYTICS
// Analytics dashboard for profile
// ============================================

interface ProfileAnalytics {
    impressions: number;
    impressionsChange: number;
    profileViews: number;
    profileViewsChange: number;
    followers: number;
    followersChange: number;
    engagement: number;
    engagementChange: number;
    recentViews: number[];
    topPosts: Array<{
        id: string;
        impressions: number;
        likes: number;
        comments: number;
    }>;
}

interface ProfileAnalyticsDashboardProps {
    analytics: ProfileAnalytics;
    loading?: boolean;
}

export function ProfileAnalyticsDashboard({ analytics, loading = false }: ProfileAnalyticsDashboardProps) {
    if (loading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                📊 Analytics
            </h3>

            <div className="grid grid-cols-2 gap-4">
                <AnalyticsCard
                    title="Impressions"
                    value={analytics.impressions}
                    change={analytics.impressionsChange}
                    icon="👁️"
                />
                <AnalyticsCard
                    title="Profile Views"
                    value={analytics.profileViews}
                    change={analytics.profileViewsChange}
                    icon="👤"
                />
                <AnalyticsCard
                    title="Followers"
                    value={analytics.followers}
                    change={analytics.followersChange}
                    icon="⭐"
                />
                <AnalyticsCard
                    title="Engagement Rate"
                    value={`${analytics.engagement}%`}
                    change={analytics.engagementChange}
                    icon="💬"
                />
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <h4 className="text-sm text-white/60 mb-4">Profile Views (Last 7 Days)</h4>
                <MiniChart data={analytics.recentViews} height={60} />
            </div>
        </div>
    );
}

// ============================================
// POST INSIGHTS
// Analytics for individual posts
// ============================================

interface PostInsightsProps {
    impressions: number;
    reach: number;
    likes: number;
    comments: number;
    saves: number;
    shares: number;
    profileVisits: number;
}

export function PostInsights({ impressions, reach, likes, comments, saves, shares, profileVisits }: PostInsightsProps) {
    const stats = [
        { label: 'Impressions', value: impressions, icon: '👁️' },
        { label: 'Reach', value: reach, icon: '🌐' },
        { label: 'Likes', value: likes, icon: '❤️' },
        { label: 'Comments', value: comments, icon: '💬' },
        { label: 'Saves', value: saves, icon: '🔖' },
        { label: 'Shares', value: shares, icon: '↗️' },
        { label: 'Profile Visits', value: profileVisits, icon: '👤' },
    ];

    return (
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-4">Post Insights</h4>
            <div className="grid grid-cols-2 gap-3">
                {stats.map((stat) => (
                    <div key={stat.label} className="flex items-center gap-2">
                        <span>{stat.icon}</span>
                        <div>
                            <p className="text-white font-semibold">{stat.value.toLocaleString()}</p>
                            <p className="text-xs text-white/50">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================
// ACCESSIBILITY ANNOUNCER
// Screen reader announcements
// ============================================

interface AnnouncerProps {
    message: string;
    politeness?: 'polite' | 'assertive';
}

export function Announcer({ message, politeness = 'polite' }: AnnouncerProps) {
    return (
        <div
            role="status"
            aria-live={politeness}
            aria-atomic="true"
            className="sr-only"
        >
            {message}
        </div>
    );
}

// ============================================
// SKIP LINK
// Skip to main content link
// ============================================

export function SkipLink() {
    return (
        <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#D4AF37] focus:text-black focus:font-semibold"
        >
            Skip to main content
        </a>
    );
}

// ============================================
// FOCUS TRAP
// Trap focus within modal/dialog
// ============================================

interface FocusTrapProps {
    children: React.ReactNode;
    active?: boolean;
}

export function FocusTrap({ children, active = true }: FocusTrapProps) {
    const containerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!active || !containerRef.current) return;

        const container = containerRef.current;
        const focusableElements = container.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement?.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement?.focus();
                }
            }
        };

        container.addEventListener('keydown', handleKeyDown);
        firstElement?.focus();

        return () => container.removeEventListener('keydown', handleKeyDown);
    }, [active]);

    return <div ref={containerRef}>{children}</div>;
}

// ============================================
// REDUCED MOTION
// Check user's motion preferences
// ============================================

export function useReducedMotion() {
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(query.matches);

        const handleChange = (e: MediaQueryListEvent) => {
            setReducedMotion(e.matches);
        };

        query.addEventListener('change', handleChange);
        return () => query.removeEventListener('change', handleChange);
    }, []);

    return reducedMotion;
}

// ============================================
// HIGH CONTRAST
// Check high contrast mode
// ============================================

export function useHighContrast() {
    const [highContrast, setHighContrast] = useState(false);

    useEffect(() => {
        const query = window.matchMedia('(prefers-contrast: more)');
        setHighContrast(query.matches);

        const handleChange = (e: MediaQueryListEvent) => {
            setHighContrast(e.matches);
        };

        query.addEventListener('change', handleChange);
        return () => query.removeEventListener('change', handleChange);
    }, []);

    return highContrast;
}
