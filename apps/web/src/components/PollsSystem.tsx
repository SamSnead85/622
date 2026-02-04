'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircleIcon } from '@/components/icons';

// ============================================
// TYPES
// ============================================

export interface Poll {
    id: string;
    question: string;
    options: PollOption[];
    creatorId: string;
    creatorName: string;
    type: 'single' | 'multiple' | 'ranked';
    isAnonymous: boolean;
    showResults: 'always' | 'after_vote' | 'after_end';
    endsAt?: Date;
    totalVotes: number;
    hasVoted: boolean;
    userVotes?: string[];
    status: 'active' | 'ended';
    createdAt: Date;
}

export interface PollOption {
    id: string;
    text: string;
    votes: number;
    percentage: number;
    isSelected?: boolean;
}

// ============================================
// POLL OPTION BUTTON
// ============================================

interface PollOptionButtonProps {
    option: PollOption;
    showResults: boolean;
    isWinner: boolean;
    onSelect: () => void;
    disabled: boolean;
}

export function PollOptionButton({ option, showResults, isWinner, onSelect, disabled }: PollOptionButtonProps) {
    return (
        <button onClick={onSelect} disabled={disabled}
            className={`relative w-full p-4 rounded-xl text-left transition-all overflow-hidden ${option.isSelected ? 'ring-2 ring-cyan-500 bg-cyan-500/10' : 'bg-white/5 hover:bg-white/10'
                } ${disabled ? 'cursor-default' : 'cursor-pointer'}`}>
            {showResults && (
                <motion.div initial={{ width: 0 }} animate={{ width: `${option.percentage}%` }}
                    className={`absolute inset-y-0 left-0 ${isWinner ? 'bg-cyan-500/20' : 'bg-white/10'}`} />
            )}
            <div className="relative flex items-center justify-between">
                <span className={`font-medium ${option.isSelected ? 'text-cyan-400' : 'text-white'}`}>{option.text}</span>
                <div className="flex items-center gap-2">
                    {showResults && <span className="text-sm text-white/60">{option.percentage}%</span>}
                    {option.isSelected && <CheckCircleIcon size={16} className="text-cyan-400" />}
                </div>
            </div>
        </button>
    );
}

// ============================================
// POLL CARD
// ============================================

interface PollCardProps {
    poll: Poll;
    onVote: (pollId: string, optionIds: string[]) => void;
    onViewResults?: (pollId: string) => void;
}

export function PollCard({ poll, onVote, onViewResults }: PollCardProps) {
    const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set(poll.userVotes || []));
    const isEnded = poll.status === 'ended' || (poll.endsAt && poll.endsAt < new Date());
    const canShowResults = poll.showResults === 'always' || (poll.showResults === 'after_vote' && poll.hasVoted) || isEnded;
    const canVote = !poll.hasVoted && !isEnded;
    const winningOption = canShowResults ? poll.options.reduce((a, b) => a.votes > b.votes ? a : b) : null;

    const timeLeft = poll.endsAt ? Math.max(0, Math.ceil((poll.endsAt.getTime() - Date.now()) / (1000 * 60 * 60))) : null;

    const handleSelect = (optionId: string) => {
        if (!canVote) return;
        const next = new Set(selectedOptions);
        if (poll.type === 'single') {
            next.clear();
            next.add(optionId);
        } else if (next.has(optionId)) {
            next.delete(optionId);
        } else {
            next.add(optionId);
        }
        setSelectedOptions(next);
    };

    const handleVote = () => {
        if (selectedOptions.size > 0) {
            onVote(poll.id, Array.from(selectedOptions));
        }
    };

    return (
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="font-semibold text-white">{poll.question}</h3>
                    <p className="text-xs text-white/40 mt-1">by {poll.creatorName} • {poll.totalVotes} votes</p>
                </div>
                {isEnded ? (
                    <span className="px-2 py-1 rounded-full bg-white/10 text-white/50 text-xs">Ended</span>
                ) : timeLeft !== null && (
                    <span className="px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs">{timeLeft}h left</span>
                )}
            </div>

            <div className="space-y-2 mb-4">
                {poll.options.map(option => (
                    <PollOptionButton key={option.id} option={{ ...option, isSelected: selectedOptions.has(option.id) }}
                        showResults={canShowResults} isWinner={winningOption?.id === option.id}
                        onSelect={() => handleSelect(option.id)} disabled={!canVote} />
                ))}
            </div>

            {canVote && selectedOptions.size > 0 && (
                <button onClick={handleVote}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium">
                    Vote
                </button>
            )}

            {poll.hasVoted && (
                <p className="text-center text-xs text-white/40 mt-2">✓ You voted</p>
            )}
        </div>
    );
}

// ============================================
// POLL CREATOR
// ============================================

interface PollCreatorProps {
    onSubmit: (poll: { question: string; options: string[]; type: Poll['type']; isAnonymous: boolean; duration: number | null }) => Promise<void>;
    onClose: () => void;
}

export function PollCreator({ onSubmit, onClose }: PollCreatorProps) {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [type, setType] = useState<Poll['type']>('single');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [duration, setDuration] = useState<number | null>(24);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const addOption = () => setOptions([...options, '']);
    const removeOption = (index: number) => setOptions(options.filter((_, i) => i !== index));
    const updateOption = (index: number, value: string) => {
        const next = [...options];
        next[index] = value;
        setOptions(next);
    };

    const handleSubmit = async () => {
        const validOptions = options.filter(o => o.trim());
        if (!question.trim() || validOptions.length < 2) return;
        setIsSubmitting(true);
        try { await onSubmit({ question, options: validOptions, type, isAnonymous, duration }); onClose(); }
        finally { setIsSubmitting(false); }
    };

    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="font-semibold text-white mb-4">Create Poll</h3>
            <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question..."
                className="w-full px-4 py-3 mb-4 rounded-xl bg-white/5 border border-white/10 text-white" />

            <div className="space-y-2 mb-4">
                {options.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                        <input type="text" value={opt} onChange={(e) => updateOption(i, e.target.value)} placeholder={`Option ${i + 1}`}
                            className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white" />
                        {options.length > 2 && <button onClick={() => removeOption(i)} className="px-3 text-red-400">×</button>}
                    </div>
                ))}
                {options.length < 6 && <button onClick={addOption} className="text-sm text-cyan-400">+ Add option</button>}
            </div>

            <div className="flex gap-4 mb-4">
                <select value={type} onChange={(e) => setType(e.target.value as Poll['type'])} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white">
                    <option value="single">Single choice</option>
                    <option value="multiple">Multiple choice</option>
                </select>
                <select value={duration ?? ''} onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : null)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white">
                    <option value="1">1 hour</option>
                    <option value="24">24 hours</option>
                    <option value="72">3 days</option>
                    <option value="168">1 week</option>
                    <option value="">No limit</option>
                </select>
            </div>

            <label className="flex items-center gap-2 mb-4 cursor-pointer">
                <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
                <span className="text-sm text-white/60">Anonymous voting</span>
            </label>

            <div className="flex justify-end gap-3">
                <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-white/60 hover:bg-white/10">Cancel</button>
                <button onClick={handleSubmit} disabled={isSubmitting || !question.trim() || options.filter(o => o.trim()).length < 2}
                    className="px-5 py-2.5 rounded-xl bg-cyan-500 text-white font-medium disabled:opacity-50">
                    {isSubmitting ? 'Creating...' : 'Create Poll'}
                </button>
            </div>
        </div>
    );
}

export default PollCard;
