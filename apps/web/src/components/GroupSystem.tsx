'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UsersIcon,
    SettingsIcon,
    LockIcon,
    CheckCircleIcon,
    CloseIcon,
    SearchIcon,
    MegaphoneIcon,
    CalendarIcon,
    MessageIcon,
} from '@/components/icons';

// ============================================
// TYPES
// ============================================

export type GroupPrivacy = 'public' | 'private' | 'secret';
export type GroupRole = 'owner' | 'admin' | 'moderator' | 'member';

export interface GroupMember {
    id: string;
    userId: string;
    displayName: string;
    avatarUrl?: string;
    role: GroupRole;
    joinedAt: Date;
}

export interface GroupRule {
    id: string;
    title: string;
    description: string;
    order: number;
}

export interface Group {
    id: string;
    name: string;
    description: string;
    coverUrl?: string;
    privacy: GroupPrivacy;
    memberCount: number;
    members?: GroupMember[];
    rules?: GroupRule[];
    tags: string[];
    createdAt: Date;
}

// ============================================
// PRIVACY CONFIG
// ============================================

const PRIVACY_OPTIONS: { value: GroupPrivacy; label: string; description: string; icon: React.ReactNode }[] = [
    {
        value: 'public',
        label: 'Public',
        description: 'Anyone can find and join this group',
        icon: <UsersIcon size={24} />,
    },
    {
        value: 'private',
        label: 'Private',
        description: 'Anyone can find, but members must be approved',
        icon: <LockIcon size={24} />,
    },
    {
        value: 'secret',
        label: 'Secret',
        description: 'Only members can find and see this group',
        icon: <LockIcon size={24} />,
    },
];

const RULE_TEMPLATES = [
    { title: 'Be Respectful', description: 'Treat all members with respect. No harassment, bullying, or hate speech.' },
    { title: 'Stay On Topic', description: 'Keep discussions relevant to the group purpose.' },
    { title: 'No Spam', description: 'No promotional content without approval from moderators.' },
    { title: 'Protect Privacy', description: 'Do not share personal information of other members.' },
    { title: 'Family Friendly', description: 'Keep content appropriate for all ages.' },
];

// ============================================
// GROUP CREATION WIZARD
// ============================================

interface GroupCreationWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<Group>) => Promise<void>;
}

export function GroupCreationWizard({ isOpen, onClose, onSubmit }: GroupCreationWizardProps) {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [privacy, setPrivacy] = useState<GroupPrivacy>('public');
    const [coverUrl, setCoverUrl] = useState('');
    const [rules, setRules] = useState<GroupRule[]>([]);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const totalSteps = 4;

    const handleAddTag = () => {
        const trimmed = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
            setTags([...tags, trimmed]);
            setTagInput('');
        }
    };

    const handleAddRule = (template?: typeof RULE_TEMPLATES[0]) => {
        const newRule: GroupRule = {
            id: Date.now().toString(),
            title: template?.title || '',
            description: template?.description || '',
            order: rules.length,
        };
        setRules([...rules, newRule]);
    };

    const handleUpdateRule = (id: string, field: 'title' | 'description', value: string) => {
        setRules(rules.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const handleRemoveRule = (id: string) => {
        setRules(rules.filter(r => r.id !== id));
    };

    const handleNext = () => {
        if (step < totalSteps) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await onSubmit({
                name,
                description,
                privacy,
                coverUrl: coverUrl || undefined,
                rules,
                tags,
            });
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const canProceed = () => {
        switch (step) {
            case 1: return name.trim().length >= 3;
            case 2: return true; // Privacy selection always valid
            case 3: return true; // Rules are optional
            case 4: return true; // Final review
            default: return false;
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-2xl bg-[#0A0A0F] border border-white/10 rounded-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Create a Group</h2>
                        <p className="text-sm text-white/50">Step {step} of {totalSteps}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <CloseIcon size={20} className="text-white/60" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-white/10">
                    <motion.div
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(step / totalSteps) * 100}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>

                {/* Content */}
                <div className="p-6 min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {/* Step 1: Basic Info */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">What&apos;s your group about?</h3>
                                    <p className="text-white/50">Give your group a name and description</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-2">Group Name *</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g., Youth Basketball Club"
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
                                        maxLength={50}
                                    />
                                    <p className="text-xs text-white/30 text-right mt-1">{name.length}/50</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-2">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="What is this group for?"
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 resize-none"
                                        maxLength={500}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-2">Tags (helps with discovery)</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {tags.map(tag => (
                                            <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-sm">
                                                #{tag}
                                                <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-white">×</button>
                                            </span>
                                        ))}
                                    </div>
                                    {tags.length < 5 && (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={tagInput}
                                                onChange={(e) => setTagInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                                placeholder="Add a tag..."
                                                className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 text-sm"
                                            />
                                            <button onClick={handleAddTag} className="px-4 py-2 rounded-xl bg-white/10 text-white/60 hover:bg-white/20 text-sm">Add</button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Privacy */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Choose privacy level</h3>
                                    <p className="text-white/50">Control who can find and join your group</p>
                                </div>

                                <div className="space-y-3">
                                    {PRIVACY_OPTIONS.map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => setPrivacy(option.value)}
                                            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${privacy === option.value
                                                ? 'bg-cyan-500/10 border-cyan-500/50'
                                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                }`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${privacy === option.value ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/10 text-white/50'
                                                }`}>
                                                {option.icon}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-medium text-white">{option.label}</h4>
                                                <p className="text-sm text-white/50">{option.description}</p>
                                            </div>
                                            {privacy === option.value && (
                                                <CheckCircleIcon size={24} className="text-cyan-400" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Rules */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Set group rules (optional)</h3>
                                    <p className="text-white/50">Help members understand expectations</p>
                                </div>

                                {/* Template Suggestions */}
                                <div>
                                    <p className="text-sm text-white/50 mb-2">Quick add from templates:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {RULE_TEMPLATES.filter(t => !rules.some(r => r.title === t.title)).map(template => (
                                            <button
                                                key={template.title}
                                                onClick={() => handleAddRule(template)}
                                                className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors"
                                            >
                                                + {template.title}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Current Rules */}
                                <div className="space-y-3">
                                    {rules.map((rule, index) => (
                                        <div key={rule.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-white/40 text-sm">Rule {index + 1}</span>
                                                <button
                                                    onClick={() => handleRemoveRule(rule.id)}
                                                    className="ml-auto text-white/40 hover:text-red-400 text-sm"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={rule.title}
                                                onChange={(e) => handleUpdateRule(rule.id, 'title', e.target.value)}
                                                placeholder="Rule title"
                                                className="w-full px-0 py-1 bg-transparent text-white font-medium focus:outline-none"
                                            />
                                            <textarea
                                                value={rule.description}
                                                onChange={(e) => handleUpdateRule(rule.id, 'description', e.target.value)}
                                                placeholder="Description"
                                                rows={2}
                                                className="w-full px-0 py-1 bg-transparent text-white/60 text-sm focus:outline-none resize-none"
                                            />
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => handleAddRule()}
                                    className="w-full py-3 rounded-xl border border-dashed border-white/20 text-white/50 hover:border-white/40 hover:text-white/70 transition-colors"
                                >
                                    + Add custom rule
                                </button>
                            </motion.div>
                        )}

                        {/* Step 4: Review */}
                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Review your group</h3>
                                    <p className="text-white/50">Make sure everything looks good</p>
                                </div>

                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                                    <div>
                                        <label className="text-xs text-white/40 uppercase tracking-wide">Name</label>
                                        <p className="text-lg font-semibold text-white">{name}</p>
                                    </div>
                                    {description && (
                                        <div>
                                            <label className="text-xs text-white/40 uppercase tracking-wide">Description</label>
                                            <p className="text-white/70">{description}</p>
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-xs text-white/40 uppercase tracking-wide">Privacy</label>
                                        <p className="text-white/70 capitalize">{privacy}</p>
                                    </div>
                                    {tags.length > 0 && (
                                        <div>
                                            <label className="text-xs text-white/40 uppercase tracking-wide">Tags</label>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {tags.map(tag => (
                                                    <span key={tag} className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-sm">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {rules.length > 0 && (
                                        <div>
                                            <label className="text-xs text-white/40 uppercase tracking-wide">Rules ({rules.length})</label>
                                            <ul className="mt-1 space-y-1">
                                                {rules.map((rule, i) => (
                                                    <li key={rule.id} className="text-white/70 text-sm">
                                                        {i + 1}. {rule.title}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/10 flex justify-between">
                    <button
                        onClick={step === 1 ? onClose : handleBack}
                        className="px-5 py-2.5 rounded-xl text-white/60 hover:bg-white/10 transition-colors"
                    >
                        {step === 1 ? 'Cancel' : 'Back'}
                    </button>

                    {step < totalSteps ? (
                        <button
                            onClick={handleNext}
                            disabled={!canProceed()}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                        >
                            Continue
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <CheckCircleIcon size={18} />
                            )}
                            Create Group
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================
// GROUP CARD COMPONENT
// ============================================

interface GroupCardProps {
    group: Group;
    onJoin?: (id: string) => void;
    onView?: (id: string) => void;
    isMember?: boolean;
}

export function GroupCard({ group, onJoin, onView, isMember = false }: GroupCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
            onClick={() => onView?.(group.id)}
        >
            {/* Cover Image */}
            <div className="h-24 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 relative">
                {group.coverUrl && (
                    <img src={group.coverUrl} alt="" className="w-full h-full object-cover" />
                )}
                {/* Privacy Badge */}
                {group.privacy !== 'public' && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/50 text-white/80 text-xs flex items-center gap-1">
                        <LockIcon size={12} />
                        {group.privacy === 'private' ? 'Private' : 'Secret'}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="font-semibold text-white mb-1 group-hover:text-cyan-300 transition-colors">
                    {group.name}
                </h3>
                {group.description && (
                    <p className="text-sm text-white/50 line-clamp-2 mb-3">{group.description}</p>
                )}

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-white/40 text-sm">
                        <UsersIcon size={14} />
                        <span>{group.memberCount.toLocaleString()} members</span>
                    </div>

                    {isMember ? (
                        <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-medium">
                            Member
                        </span>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); onJoin?.(group.id); }}
                            className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors"
                        >
                            {group.privacy === 'public' ? 'Join' : 'Request'}
                        </button>
                    )}
                </div>

                {/* Tags */}
                {group.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                        {group.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="px-2 py-0.5 rounded-full bg-white/5 text-white/40 text-xs">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ============================================
// GROUP DISCOVERY GRID
// ============================================

interface GroupDiscoveryProps {
    groups: Group[];
    onJoin?: (id: string) => void;
    onView?: (id: string) => void;
    userGroupIds?: string[];
}

export function GroupDiscovery({ groups, onJoin, onView, userGroupIds = [] }: GroupDiscoveryProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'joined' | 'discover'>('all');

    const filteredGroups = groups
        .filter(g => {
            if (filter === 'joined') return userGroupIds.includes(g.id);
            if (filter === 'discover') return !userGroupIds.includes(g.id);
            return true;
        })
        .filter(g =>
            !searchQuery ||
            g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            g.tags.some(t => t.includes(searchQuery.toLowerCase()))
        );

    return (
        <div className="space-y-6">
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                        type="text"
                        placeholder="Search groups..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-500/50"
                    />
                </div>
                <div className="flex gap-2">
                    {(['all', 'joined', 'discover'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            {f === 'all' ? 'All' : f === 'joined' ? 'My Groups' : 'Discover'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            {filteredGroups.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                        <UsersIcon size={32} className="text-white/20" />
                    </div>
                    <h3 className="text-lg font-medium text-white/60 mb-2">No groups found</h3>
                    <p className="text-white/40">Try a different search or create your own group</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredGroups.map(group => (
                        <GroupCard
                            key={group.id}
                            group={group}
                            onJoin={onJoin}
                            onView={onView}
                            isMember={userGroupIds.includes(group.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default GroupCreationWizard;
