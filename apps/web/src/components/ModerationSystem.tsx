'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    SearchIcon,
    CloseIcon,
    CheckCircleIcon,
    SettingsIcon,
    BellIcon,
} from '@/components/icons';

// ============================================
// TYPES
// ============================================

export type ReportReason =
    | 'spam' | 'harassment' | 'hate_speech' | 'violence'
    | 'nudity' | 'misinformation' | 'copyright' | 'other';

export type ModAction =
    | 'approve' | 'remove' | 'warn' | 'mute' | 'ban' | 'escalate';

export type ContentType = 'post' | 'comment' | 'message' | 'profile' | 'listing';

export interface Report {
    id: string;
    contentId: string;
    contentType: ContentType;
    contentPreview: string;
    reporterId: string;
    reporterName: string;
    reason: ReportReason;
    details?: string;
    createdAt: Date;
    status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
    assignedTo?: string;
    resolution?: {
        action: ModAction;
        note?: string;
        moderatorId: string;
        timestamp: Date;
    };
}

export interface ModNote {
    id: string;
    userId: string;
    note: string;
    moderatorId: string;
    moderatorName: string;
    createdAt: Date;
}

export interface Warning {
    id: string;
    userId: string;
    reason: string;
    severity: 'minor' | 'moderate' | 'severe';
    issuedBy: string;
    createdAt: Date;
    expiresAt?: Date;
    acknowledged: boolean;
}

export interface UserModerationHistory {
    userId: string;
    warnings: Warning[];
    mutes: { start: Date; end: Date; reason: string }[];
    bans: { start: Date; end?: Date; reason: string }[];
    reports: Report[];
    notes: ModNote[];
}

// ============================================
// REPORT REASONS CONFIG
// ============================================

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
    { value: 'spam', label: 'Spam', description: 'Repetitive or promotional content' },
    { value: 'harassment', label: 'Harassment', description: 'Bullying or targeting an individual' },
    { value: 'hate_speech', label: 'Hate Speech', description: 'Attacks based on identity' },
    { value: 'violence', label: 'Violence', description: 'Threats or graphic content' },
    { value: 'nudity', label: 'Nudity', description: 'Inappropriate sexual content' },
    { value: 'misinformation', label: 'Misinformation', description: 'False or misleading information' },
    { value: 'copyright', label: 'Copyright', description: 'Intellectual property violation' },
    { value: 'other', label: 'Other', description: 'Something else' },
];

const MOD_ACTIONS: { value: ModAction; label: string; severity: number }[] = [
    { value: 'approve', label: 'Approve Content', severity: 0 },
    { value: 'remove', label: 'Remove Content', severity: 2 },
    { value: 'warn', label: 'Issue Warning', severity: 3 },
    { value: 'mute', label: 'Mute User', severity: 4 },
    { value: 'ban', label: 'Ban User', severity: 5 },
    { value: 'escalate', label: 'Escalate to Admin', severity: 1 },
];

// ============================================
// REPORT MODAL
// ============================================

interface ReportModalProps {
    isOpen: boolean;
    contentType: ContentType;
    contentId: string;
    contentPreview?: string;
    onClose: () => void;
    onSubmit: (reason: ReportReason, details: string) => Promise<void>;
}

export function ReportModal({
    isOpen,
    contentType,
    contentId,
    contentPreview,
    onClose,
    onSubmit
}: ReportModalProps) {
    const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selectedReason) return;
        setIsSubmitting(true);
        try {
            await onSubmit(selectedReason, details);
            onClose();
        } finally {
            setIsSubmitting(false);
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
                className="w-full max-w-md bg-[#0A0A0F] border border-white/10 rounded-2xl overflow-hidden"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-white">Report {contentType}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10">
                        <CloseIcon size={20} className="text-white/60" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {contentPreview && (
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-sm text-white/60 line-clamp-2">{contentPreview}</p>
                        </div>
                    )}

                    <div>
                        <p className="text-sm text-white/50 mb-3">Why are you reporting this?</p>
                        <div className="space-y-2">
                            {REPORT_REASONS.map(reason => (
                                <button
                                    key={reason.value}
                                    onClick={() => setSelectedReason(reason.value)}
                                    className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${selectedReason === reason.value
                                            ? 'bg-red-500/10 border-red-500/50'
                                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${selectedReason === reason.value
                                            ? 'border-red-500 bg-red-500'
                                            : 'border-white/30'
                                        }`}>
                                        {selectedReason === reason.value && (
                                            <CheckCircleIcon size={12} className="text-white" />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-white">{reason.label}</h4>
                                        <p className="text-sm text-white/50">{reason.description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-white/50 mb-2">Additional details (optional)</label>
                        <textarea
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            placeholder="Provide more context..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50 resize-none"
                        />
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-white/60 hover:bg-white/10"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedReason || isSubmitting}
                        className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-medium disabled:opacity-50"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================
// MOD QUEUE ITEM
// ============================================

interface ModQueueItemProps {
    report: Report;
    onAction: (reportId: string, action: ModAction, note?: string) => void;
    onViewContent: (contentId: string, contentType: ContentType) => void;
    onViewUser: (userId: string) => void;
}

export function ModQueueItem({ report, onAction, onViewContent, onViewUser }: ModQueueItemProps) {
    const [showActions, setShowActions] = useState(false);
    const [selectedAction, setSelectedAction] = useState<ModAction | null>(null);
    const [actionNote, setActionNote] = useState('');

    const handleConfirmAction = () => {
        if (selectedAction) {
            onAction(report.id, selectedAction, actionNote);
            setShowActions(false);
            setSelectedAction(null);
            setActionNote('');
        }
    };

    const timeAgo = (date: Date) => {
        const diff = Date.now() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            report.status === 'reviewed' ? 'bg-blue-500/20 text-blue-400' :
                                report.status === 'actioned' ? 'bg-green-500/20 text-green-400' :
                                    'bg-white/10 text-white/50'
                        }`}>
                        {report.status}
                    </span>
                    <span className="text-xs text-white/40">{timeAgo(report.createdAt)}</span>
                </div>
                <span className="text-xs text-white/40 uppercase">{report.contentType}</span>
            </div>

            {/* Content Preview */}
            <button
                onClick={() => onViewContent(report.contentId, report.contentType)}
                className="w-full p-3 mb-3 rounded-lg bg-white/5 text-left hover:bg-white/10 transition-colors"
            >
                <p className="text-sm text-white/70 line-clamp-2">{report.contentPreview}</p>
            </button>

            {/* Report Info */}
            <div className="flex items-center justify-between mb-3">
                <div>
                    <span className="text-sm text-white/50">Reported for: </span>
                    <span className="text-sm text-red-400 font-medium">
                        {REPORT_REASONS.find(r => r.value === report.reason)?.label}
                    </span>
                </div>
                <button
                    onClick={() => onViewUser(report.reporterId)}
                    className="text-xs text-cyan-400 hover:underline"
                >
                    by {report.reporterName}
                </button>
            </div>

            {report.details && (
                <p className="text-sm text-white/50 mb-3 italic">&quot;{report.details}&quot;</p>
            )}

            {/* Actions */}
            {!showActions ? (
                <div className="flex gap-2">
                    <button
                        onClick={() => onAction(report.id, 'approve')}
                        className="flex-1 px-4 py-2 rounded-lg bg-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/30"
                    >
                        ✓ Approve
                    </button>
                    <button
                        onClick={() => onAction(report.id, 'remove')}
                        className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30"
                    >
                        ✕ Remove
                    </button>
                    <button
                        onClick={() => setShowActions(true)}
                        className="px-4 py-2 rounded-lg bg-white/10 text-white/60 text-sm hover:bg-white/20"
                    >
                        More
                    </button>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3"
                >
                    <div className="flex flex-wrap gap-2">
                        {MOD_ACTIONS.map(action => (
                            <button
                                key={action.value}
                                onClick={() => setSelectedAction(action.value)}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${selectedAction === action.value
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                                        : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>

                    <textarea
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                        placeholder="Add a note (optional)"
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none resize-none"
                    />

                    <div className="flex gap-2">
                        <button
                            onClick={() => { setShowActions(false); setSelectedAction(null); }}
                            className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white/60 text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmAction}
                            disabled={!selectedAction}
                            className="flex-1 px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-medium disabled:opacity-50"
                        >
                            Confirm Action
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

// ============================================
// MODERATION DASHBOARD
// ============================================

interface ModerationDashboardProps {
    reports: Report[];
    stats: {
        pending: number;
        reviewedToday: number;
        actionsToday: number;
        avgResponseTime: number; // minutes
    };
    onAction: (reportId: string, action: ModAction, note?: string) => void;
    onViewContent: (contentId: string, contentType: ContentType) => void;
    onViewUser: (userId: string) => void;
}

export function ModerationDashboard({
    reports,
    stats,
    onAction,
    onViewContent,
    onViewUser,
}: ModerationDashboardProps) {
    const [filter, setFilter] = useState<'pending' | 'reviewed' | 'all'>('pending');
    const [typeFilter, setTypeFilter] = useState<ContentType | 'all'>('all');
    const [reasonFilter, setReasonFilter] = useState<ReportReason | 'all'>('all');

    const filteredReports = useMemo(() => {
        return reports.filter(r => {
            if (filter === 'pending' && r.status !== 'pending') return false;
            if (filter === 'reviewed' && r.status === 'pending') return false;
            if (typeFilter !== 'all' && r.contentType !== typeFilter) return false;
            if (reasonFilter !== 'all' && r.reason !== reasonFilter) return false;
            return true;
        }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [reports, filter, typeFilter, reasonFilter]);

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                    <p className="text-sm text-white/50">Pending Reports</p>
                </div>
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                    <p className="text-2xl font-bold text-green-400">{stats.reviewedToday}</p>
                    <p className="text-sm text-white/50">Reviewed Today</p>
                </div>
                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <p className="text-2xl font-bold text-cyan-400">{stats.actionsToday}</p>
                    <p className="text-sm text-white/50">Actions Taken</p>
                </div>
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <p className="text-2xl font-bold text-purple-400">{stats.avgResponseTime}m</p>
                    <p className="text-sm text-white/50">Avg Response Time</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="flex gap-2">
                    {(['pending', 'reviewed', 'all'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f
                                    ? 'bg-cyan-500/20 text-cyan-400'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as ContentType | 'all')}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none"
                >
                    <option value="all">All Types</option>
                    <option value="post">Posts</option>
                    <option value="comment">Comments</option>
                    <option value="message">Messages</option>
                    <option value="profile">Profiles</option>
                    <option value="listing">Listings</option>
                </select>

                <select
                    value={reasonFilter}
                    onChange={(e) => setReasonFilter(e.target.value as ReportReason | 'all')}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none"
                >
                    <option value="all">All Reasons</option>
                    {REPORT_REASONS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                </select>
            </div>

            {/* Queue */}
            {filteredReports.length === 0 ? (
                <div className="py-16 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center text-4xl">
                        ✓
                    </div>
                    <h3 className="text-lg font-medium text-white/60 mb-2">Queue is clear!</h3>
                    <p className="text-white/40">No reports matching your filters</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredReports.map(report => (
                        <ModQueueItem
                            key={report.id}
                            report={report}
                            onAction={onAction}
                            onViewContent={onViewContent}
                            onViewUser={onViewUser}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default ModerationDashboard;
