'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// ============================================
// TYPES
// ============================================

export interface UserLevel {
    level: number;
    name: string;
    minXP: number;
    maxXP: number;
    badge: string;
    perks: string[];
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: 'social' | 'content' | 'community' | 'special' | 'streak';
    xpReward: number;
    isUnlocked: boolean;
    unlockedAt?: Date;
    progress?: number;
    target?: number;
    isRare: boolean;
}

export interface Badge {
    id: string;
    name: string;
    icon: string;
    description: string;
    color: string;
    isEquipped: boolean;
}

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    userName: string;
    avatar?: string;
    xp: number;
    level: number;
    isCurrentUser?: boolean;
}

// ============================================
// LEVEL PROGRESS
// ============================================

interface LevelProgressProps {
    currentXP: number;
    level: UserLevel;
    onViewRewards?: () => void;
}

export function LevelProgress({ currentXP, level, onViewRewards }: LevelProgressProps) {
    const progress = ((currentXP - level.minXP) / (level.maxXP - level.minXP)) * 100;
    const xpToNext = level.maxXP - currentXP;

    return (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">{level.badge}</div>
                    <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-purple-500 text-white text-xs font-bold">{level.level}</div>
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-white">{level.name}</h3>
                        <span className="text-sm text-purple-400">{currentXP.toLocaleString()} XP</span>
                    </div>
                    <div className="h-3 rounded-full bg-white/10 overflow-hidden mb-1">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                    </div>
                    <p className="text-xs text-white/40">{xpToNext.toLocaleString()} XP to next level</p>
                </div>
            </div>
            {onViewRewards && (
                <button onClick={onViewRewards} className="w-full mt-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20">View Level Rewards</button>
            )}
        </div>
    );
}

// ============================================
// ACHIEVEMENT CARD
// ============================================

interface AchievementCardProps {
    achievement: Achievement;
    onClick?: () => void;
}

export function AchievementCard({ achievement, onClick }: AchievementCardProps) {
    const progress = achievement.target ? (achievement.progress || 0) / achievement.target * 100 : 0;

    return (
        <motion.div whileHover={{ scale: 1.02 }} onClick={onClick}
            className={`relative p-4 rounded-xl border cursor-pointer ${achievement.isUnlocked ? 'bg-white/5 border-white/10' : 'bg-white/[0.02] border-white/5 opacity-60'}`}>
            {achievement.isRare && achievement.isUnlocked && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-yellow-500 text-black text-xs font-bold">RARE</div>
            )}
            <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${achievement.isUnlocked ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20' : 'bg-white/5 grayscale'}`}>
                    {achievement.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white truncate">{achievement.title}</h4>
                    <p className="text-xs text-white/40 truncate">{achievement.description}</p>
                </div>
                {achievement.isUnlocked && <span className="text-sm text-purple-400">+{achievement.xpReward} XP</span>}
            </div>
            {!achievement.isUnlocked && achievement.target && (
                <div className="mt-3">
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-xs text-white/30 mt-1">{achievement.progress}/{achievement.target}</p>
                </div>
            )}
        </motion.div>
    );
}

// ============================================
// BADGE SHOWCASE
// ============================================

interface BadgeShowcaseProps {
    badges: Badge[];
    onEquip: (id: string) => void;
}

export function BadgeShowcase({ badges, onEquip }: BadgeShowcaseProps) {
    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-white">Badges</h3>
            <div className="grid grid-cols-4 gap-3">
                {badges.map(badge => (
                    <motion.button key={badge.id} whileHover={{ scale: 1.1 }} onClick={() => onEquip(badge.id)}
                        className={`relative p-3 rounded-xl flex flex-col items-center gap-1 ${badge.isEquipped ? 'ring-2 ring-purple-500 bg-purple-500/10' : 'bg-white/5 hover:bg-white/10'}`}>
                        <span className="text-2xl">{badge.icon}</span>
                        <span className="text-xs text-white/60 truncate w-full text-center">{badge.name}</span>
                        {badge.isEquipped && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center text-[8px] text-white">✓</span>}
                    </motion.button>
                ))}
            </div>
        </div>
    );
}

// ============================================
// XP LEADERBOARD
// ============================================

interface XPLeaderboardProps {
    entries: LeaderboardEntry[];
    timeframe?: 'weekly' | 'monthly' | 'alltime';
    onViewProfile?: (userId: string) => void;
}

export function XPLeaderboard({ entries, timeframe = 'weekly', onViewProfile }: XPLeaderboardProps) {
    return (
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">🏆 Top Contributors</h3>
                <span className="text-xs text-white/40 capitalize">{timeframe}</span>
            </div>
            <div className="space-y-2">
                {entries.slice(0, 10).map(entry => (
                    <motion.div key={entry.userId} whileHover={{ x: 4 }} onClick={() => onViewProfile?.(entry.userId)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${entry.isCurrentUser ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-white/5 hover:bg-white/10'}`}>
                        <span className={`w-6 text-center font-bold ${entry.rank <= 3 ? 'text-yellow-400' : 'text-white/40'}`}>
                            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                        </span>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium">
                            {entry.avatar ? <img src={entry.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : entry.userName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{entry.userName}</p>
                            <p className="text-xs text-white/40">Level {entry.level}</p>
                        </div>
                        <span className="font-bold text-purple-400">{entry.xp.toLocaleString()} XP</span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

export default LevelProgress;
