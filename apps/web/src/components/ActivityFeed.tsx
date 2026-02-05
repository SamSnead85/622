'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
    HeartIcon,
    MessageIcon,
    UsersIcon,
    CalendarIcon,
    MegaphoneIcon,
    ShareIcon,
    CheckCircleIcon,
} from '@/components/icons';
import { PresenceIndicator } from './PresenceSystem';

// ============================================
// TYPES
// ============================================

export type ActivityType =
    | 'new_post'
    | 'new_comment'
    | 'reaction'
    | 'new_member'
    | 'event_created'
    | 'event_rsvp'
    | 'bulletin_posted'
    | 'mention'
    | 'follow'
    | 'achievement';

export interface ActivityItem {
    id: string;
    type: ActivityType;
    actor: {
        id: string;
        displayName: string;
        avatarUrl?: string;
    };
    target?: {
        id: string;
        type: 'post' | 'comment' | 'event' | 'bulletin' | 'user' | 'group';
        title?: string;
    };
    metadata?: {
        reaction?: string;
        eventName?: string;
        groupName?: string;
        achievementName?: string;
    };
    createdAt: Date;
    isNew?: boolean;
}

// ============================================
// ACTIVITY CONFIG
// ============================================

const ACTIVITY_CONFIG: Record<ActivityType, { icon: React.ReactNode; color: string; verb: string }> = {
    new_post: { icon: <MegaphoneIcon size={16} />, color: 'text-blue-400', verb: 'posted' },
    new_comment: { icon: <MessageIcon size={16} />, color: 'text-cyan-400', verb: 'commented on' },
    reaction: { icon: <HeartIcon size={16} />, color: 'text-rose-400', verb: 'reacted to' },
    new_member: { icon: <UsersIcon size={16} />, color: 'text-green-400', verb: 'joined' },
    event_created: { icon: <CalendarIcon size={16} />, color: 'text-purple-400', verb: 'created an event' },
    event_rsvp: { icon: <CalendarIcon size={16} />, color: 'text-indigo-400', verb: 'is going to' },
    bulletin_posted: { icon: <MegaphoneIcon size={16} />, color: 'text-amber-400', verb: 'posted to bulletin' },
    mention: { icon: <MessageIcon size={16} />, color: 'text-cyan-400', verb: 'mentioned you in' },
    follow: { icon: <UsersIcon size={16} />, color: 'text-emerald-400', verb: 'started following you' },
    achievement: { icon: <CheckCircleIcon size={16} />, color: 'text-yellow-400', verb: 'earned' },
};

// ============================================
// ACTIVITY ITEM COMPONENT
// ============================================

interface ActivityItemCardProps {
    activity: ActivityItem;
}

function ActivityItemCard({ activity }: ActivityItemCardProps) {
    const config = ACTIVITY_CONFIG[activity.type];

    const formatTime = (date: Date) => {
        const diff = Date.now() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        return `${Math.floor(hours / 24)}d`;
    };

    const getMessage = () => {
        const { actor, target, metadata } = activity;

        switch (activity.type) {
            case 'reaction':
                return (
                    <>
                        <strong>{actor.displayName}</strong>
                        {' '}reacted {metadata?.reaction} to{' '}
                        {target?.title && <span className="text-white/80">{target.title}</span>}
                    </>
                );
            case 'new_member':
                return (
                    <>
                        <strong>{actor.displayName}</strong>
                        {' '}joined{' '}
                        {metadata?.groupName && <span className="text-white/80">{metadata.groupName}</span>}
                    </>
                );
            case 'event_rsvp':
                return (
                    <>
                        <strong>{actor.displayName}</strong>
                        {' '}is going to{' '}
                        {metadata?.eventName && <span className="text-white/80">{metadata.eventName}</span>}
                    </>
                );
            case 'achievement':
                return (
                    <>
                        <strong>{actor.displayName}</strong>
                        {' '}earned{' '}
                        {metadata?.achievementName && <span className="text-yellow-400">{metadata.achievementName}</span>}
                    </>
                );
            default:
                return (
                    <>
                        <strong>{actor.displayName}</strong>
                        {' '}{config.verb}{' '}
                        {target?.title && <span className="text-white/80">{target.title}</span>}
                    </>
                );
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${activity.isNew ? 'bg-cyan-500/10' : 'hover:bg-white/5'
                }`}
        >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                    {activity.actor.avatarUrl ? (
                        <img src={activity.actor.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                        activity.actor.displayName[0]
                    )}
                </div>
                {/* Activity Type Icon */}
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0A0A0F] flex items-center justify-center ${config.color}`}>
                    {config.icon}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-sm text-white/70 leading-relaxed">
                    {getMessage()}
                </p>
                <p className="text-xs text-white/40 mt-1">{formatTime(activity.createdAt)}</p>
            </div>

            {/* New Indicator */}
            {activity.isNew && (
                <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0 mt-2" />
            )}
        </motion.div>
    );
}

// ============================================
// ACTIVITY FEED COMPONENT
// ============================================

interface ActivityFeedProps {
    title?: string;
    maxItems?: number;
    showViewAll?: boolean;
    compact?: boolean;
}

export function ActivityFeed({
    title = 'Activity',
    maxItems = 10,
    showViewAll = true,
    compact = false
}: ActivityFeedProps) {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Mock data
    useEffect(() => {
        setTimeout(() => {
            setActivities([
                {
                    id: '1',
                    type: 'reaction',
                    actor: { id: 'u1', displayName: 'Sarah Ahmed' },
                    target: { id: 'p1', type: 'post', title: 'Community Iftar Announcement' },
                    metadata: { reaction: '❤️' },
                    createdAt: new Date(Date.now() - 2 * 60000),
                    isNew: true,
                },
                {
                    id: '2',
                    type: 'new_member',
                    actor: { id: 'u2', displayName: 'Omar Hassan', avatarUrl: '/avatars/omar.jpg' },
                    metadata: { groupName: 'Youth Basketball Club' },
                    createdAt: new Date(Date.now() - 15 * 60000),
                    isNew: true,
                },
                {
                    id: '3',
                    type: 'event_rsvp',
                    actor: { id: 'u3', displayName: 'Fatima Ali' },
                    metadata: { eventName: 'Community Cleanup Day' },
                    createdAt: new Date(Date.now() - 45 * 60000),
                },
                {
                    id: '4',
                    type: 'new_comment',
                    actor: { id: 'u4', displayName: 'Yusuf Khan' },
                    target: { id: 'p2', type: 'post', title: 'Ideas for summer programs' },
                    createdAt: new Date(Date.now() - 2 * 60 * 60000),
                },
                {
                    id: '5',
                    type: 'achievement',
                    actor: { id: 'u5', displayName: 'Aisha' },
                    metadata: { achievementName: '🏆 Community Champion' },
                    createdAt: new Date(Date.now() - 5 * 60 * 60000),
                },
            ]);
            setIsLoading(false);
        }, 500);
    }, []);

    // Simulate real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            // Randomly add new activity
            if (Math.random() > 0.8) {
                const types: ActivityType[] = ['reaction', 'new_comment', 'event_rsvp'];
                const type = types[Math.floor(Math.random() * types.length)];
                const names = ['Ali', 'Maryam', 'Hassan', 'Layla', 'Ibrahim'];
                const name = names[Math.floor(Math.random() * names.length)];

                const newActivity: ActivityItem = {
                    id: Date.now().toString(),
                    type,
                    actor: { id: `u-${Date.now()}`, displayName: name },
                    target: { id: 'p1', type: 'post', title: 'a post' },
                    metadata: type === 'reaction' ? { reaction: ['❤️', '🔥', '👏'][Math.floor(Math.random() * 3)] } : undefined,
                    createdAt: new Date(),
                    isNew: true,
                };

                setActivities(prev => [newActivity, ...prev].slice(0, maxItems));
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [maxItems]);

    const displayActivities = activities.slice(0, maxItems);

    return (
        <div className={`bg-white/5 rounded-2xl border border-white/10 overflow-hidden ${compact ? '' : 'p-4'}`}>
            {!compact && (
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    {showViewAll && (
                        <Link href="/activity" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                            View all
                        </Link>
                    )}
                </div>
            )}

            {isLoading ? (
                <div className="space-y-3 p-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-white/10 rounded animate-pulse w-3/4" />
                                <div className="h-2 bg-white/10 rounded animate-pulse w-1/4" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : displayActivities.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-white/40">No recent activity</p>
                </div>
            ) : (
                <div className="divide-y divide-white/5">
                    <AnimatePresence mode="popLayout">
                        {displayActivities.map(activity => (
                            <ActivityItemCard key={activity.id} activity={activity} />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

export default ActivityFeed;
