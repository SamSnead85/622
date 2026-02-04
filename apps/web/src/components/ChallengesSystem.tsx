'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircleIcon, SearchIcon } from '@/components/icons';

// ============================================
// TYPES
// ============================================

export interface Challenge {
    id: string;
    title: string;
    description: string;
    type: 'individual' | 'team' | 'community';
    category: 'fitness' | 'learning' | 'creative' | 'social' | 'spiritual' | 'wellness' | 'charity';
    startDate: Date;
    endDate: Date;
    goal: { type: 'count' | 'duration' | 'streak'; target: number; unit: string };
    reward: { points: number; badge?: string; prize?: string };
    participants: number;
    progress?: number;
    isJoined: boolean;
    isCompleted: boolean;
    imageUrl?: string;
}

export interface Milestone {
    id: string;
    challengeId: string;
    title: string;
    threshold: number;
    isReached: boolean;
    reachedAt?: Date;
}

// ============================================
// CHALLENGE CARD
// ============================================

interface ChallengeCardProps {
    challenge: Challenge;
    onJoin: (id: string) => void;
    onView: (id: string) => void;
}

export function ChallengeCard({ challenge, onJoin, onView }: ChallengeCardProps) {
    const daysLeft = Math.max(0, Math.ceil((challenge.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const categoryIcons = { fitness: '💪', learning: '📚', creative: '🎨', social: '🤝', spiritual: '🙏', wellness: '🧘', charity: '❤️' };

    return (
        <motion.div whileHover={{ scale: 1.02 }} className="overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-white/20">
            <div className="relative h-32 bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
                {challenge.imageUrl && <img src={challenge.imageUrl} alt="" className="w-full h-full object-cover" />}
                <div className="absolute top-2 left-2 flex gap-2">
                    <span className="px-2 py-1 rounded-full bg-black/50 text-white text-xs">{categoryIcons[challenge.category]} {challenge.category}</span>
                    {challenge.isCompleted && <span className="px-2 py-1 rounded-full bg-green-500 text-white text-xs">✓ Completed</span>}
                </div>
                <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/50 text-white text-xs">{daysLeft} days left</div>
            </div>
            <div className="p-4">
                <h3 className="font-semibold text-white mb-1">{challenge.title}</h3>
                <p className="text-sm text-white/50 line-clamp-2 mb-3">{challenge.description}</p>

                {challenge.isJoined && challenge.progress !== undefined && (
                    <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-white/50">Progress</span>
                            <span className="text-cyan-400">{challenge.progress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${challenge.progress}%` }} />
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">{challenge.participants.toLocaleString()} participants</span>
                    {challenge.isJoined ? (
                        <button onClick={() => onView(challenge.id)} className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20">View Progress</button>
                    ) : (
                        <button onClick={() => onJoin(challenge.id)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-sm font-medium">Join Challenge</button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// CHALLENGE PROGRESS
// ============================================

interface ChallengeProgressProps {
    challenge: Challenge;
    milestones: Milestone[];
    entries: { date: Date; value: number }[];
    onLogProgress: (value: number) => void;
}

export function ChallengeProgress({ challenge, milestones, entries, onLogProgress }: ChallengeProgressProps) {
    const [logValue, setLogValue] = useState('');
    const totalProgress = entries.reduce((sum, e) => sum + e.value, 0);
    const progressPercent = Math.min((totalProgress / challenge.goal.target) * 100, 100);

    return (
        <div className="space-y-6">
            {/* Progress Ring */}
            <div className="flex items-center gap-6 p-6 rounded-2xl bg-white/5 border border-white/10">
                <div className="relative w-32 h-32">
                    <svg viewBox="0 0 100 100" className="transform -rotate-90">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="url(#progressGradient)" strokeWidth="12"
                            strokeDasharray={`${progressPercent * 2.51} 251`} strokeLinecap="round" />
                        <defs><linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#8B5CF6" /><stop offset="100%" stopColor="#06B6D4" />
                        </linearGradient></defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-white">{Math.round(progressPercent)}%</span>
                        <span className="text-xs text-white/50">complete</span>
                    </div>
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-white mb-2">{challenge.title}</h3>
                    <p className="text-white/50 mb-2">{totalProgress} / {challenge.goal.target} {challenge.goal.unit}</p>
                    <div className="flex gap-2">
                        <input type="number" value={logValue} onChange={(e) => setLogValue(e.target.value)} placeholder="Log progress"
                            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm" />
                        <button onClick={() => { if (logValue) { onLogProgress(Number(logValue)); setLogValue(''); } }}
                            className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm">Log</button>
                    </div>
                </div>
            </div>

            {/* Milestones */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h4 className="font-semibold text-white mb-4">Milestones</h4>
                <div className="space-y-3">
                    {milestones.map((m, i) => (
                        <div key={m.id} className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${m.isReached ? 'bg-green-500' : 'bg-white/10'}`}>
                                {m.isReached ? <CheckCircleIcon size={16} className="text-white" /> : <span className="text-white/40">{i + 1}</span>}
                            </div>
                            <div className="flex-1">
                                <p className={m.isReached ? 'text-white' : 'text-white/50'}>{m.title}</p>
                                <p className="text-xs text-white/30">{m.threshold} {challenge.goal.unit}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ============================================
// LEADERBOARD
// ============================================

interface LeaderboardProps {
    entries: { rank: number; userId: string; userName: string; avatar?: string; score: number; isCurrentUser?: boolean }[];
    title?: string;
}

export function Leaderboard({ entries, title = 'Leaderboard' }: LeaderboardProps) {
    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="font-semibold text-white mb-4">{title}</h3>
            <div className="space-y-2">
                {entries.slice(0, 10).map(entry => (
                    <div key={entry.userId} className={`flex items-center gap-3 p-3 rounded-xl ${entry.isCurrentUser ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-white/5'}`}>
                        <span className={`w-8 text-center font-bold ${entry.rank <= 3 ? 'text-yellow-400' : 'text-white/40'}`}>
                            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                        </span>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-medium">
                            {entry.avatar ? <img src={entry.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : entry.userName[0]}
                        </div>
                        <span className="flex-1 font-medium text-white">{entry.userName}</span>
                        <span className="font-bold text-cyan-400">{entry.score.toLocaleString()}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ChallengeCard;
