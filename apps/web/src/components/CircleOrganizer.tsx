'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

export type MemberRole = 'organizer' | 'coordinator' | 'volunteer' | 'member';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'blocked';

export interface CircleMember {
    id: string;
    name: string;
    avatar: string;
    role: MemberRole;
    joinedAt: Date;
    tasksCompleted: number;
    isOnline: boolean;
}

export interface CircleTask {
    id: string;
    title: string;
    description: string;
    assignee?: CircleMember;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate?: Date;
    createdAt: Date;
    completedAt?: Date;
    tags: string[];
}

export interface CircleResource {
    id: string;
    title: string;
    type: 'document' | 'link' | 'image' | 'video';
    url: string;
    addedBy: CircleMember;
    addedAt: Date;
}

export interface CircleAnnouncement {
    id: string;
    title: string;
    content: string;
    author: CircleMember;
    createdAt: Date;
    isPinned: boolean;
    reactions: { emoji: string; count: number }[];
}

export interface Circle {
    id: string;
    name: string;
    description: string;
    coverImage?: string;
    members: CircleMember[];
    tasks: CircleTask[];
    resources: CircleResource[];
    announcements: CircleAnnouncement[];
    createdAt: Date;
    isPublic: boolean;
    tags: string[];
}

// ============================================================================
// ROLE BADGE
// ============================================================================

const roleConfig: Record<MemberRole, { label: string; color: string; icon: string }> = {
    organizer: { label: 'Organizer', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30', icon: '👑' },
    coordinator: { label: 'Coordinator', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: '⭐' },
    volunteer: { label: 'Volunteer', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: '🤝' },
    member: { label: 'Member', color: 'bg-white/10 text-white/60 border-white/10', icon: '👤' },
};

export function RoleBadge({ role }: { role: MemberRole }) {
    const config = roleConfig[role];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
            <span>{config.icon}</span>
            {config.label}
        </span>
    );
}

// ============================================================================
// MEMBER CARD
// ============================================================================

interface MemberCardProps {
    member: CircleMember;
    onRoleChange?: (memberId: string, newRole: MemberRole) => void;
    canManage?: boolean;
}

export function MemberCard({ member, onRoleChange, canManage = false }: MemberCardProps) {
    const [showRoleMenu, setShowRoleMenu] = useState(false);

    return (
        <motion.div
            whileHover={{ y: -2 }}
            className="bg-white/5 rounded-xl p-4 border border-white/10"
        >
            <div className="flex items-center gap-3">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xl">
                        {member.avatar}
                    </div>
                    {member.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-gray-900" />
                    )}
                </div>
                <div className="flex-1">
                    <p className="font-medium text-white">{member.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <RoleBadge role={member.role} />
                        <span className="text-xs text-white/40">{member.tasksCompleted} tasks</span>
                    </div>
                </div>
                {canManage && member.role !== 'organizer' && (
                    <div className="relative">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setShowRoleMenu(!showRoleMenu)}
                            className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10"
                        >
                            ⋮
                        </motion.button>
                        <AnimatePresence>
                            {showRoleMenu && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-1 w-40 bg-gray-800 rounded-xl border border-white/10 overflow-hidden z-10"
                                >
                                    {(['coordinator', 'volunteer', 'member'] as MemberRole[]).map((role) => (
                                        <button
                                            key={role}
                                            onClick={() => {
                                                onRoleChange?.(member.id, role);
                                                setShowRoleMenu(false);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm text-white/70 hover:bg-white/10 flex items-center gap-2"
                                        >
                                            <span>{roleConfig[role].icon}</span>
                                            {roleConfig[role].label}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ============================================================================
// TASK CARD
// ============================================================================

const priorityConfig: Record<TaskPriority, { color: string; label: string }> = {
    urgent: { color: 'bg-red-500/20 text-red-400', label: '🔴 Urgent' },
    high: { color: 'bg-orange-500/20 text-orange-400', label: '🟠 High' },
    medium: { color: 'bg-amber-500/20 text-amber-400', label: '🟡 Medium' },
    low: { color: 'bg-emerald-500/20 text-emerald-400', label: '🟢 Low' },
};

const statusConfig: Record<TaskStatus, { color: string; icon: string }> = {
    pending: { color: 'text-white/50', icon: '○' },
    'in-progress': { color: 'text-cyan-400', icon: '◐' },
    completed: { color: 'text-emerald-400', icon: '●' },
    blocked: { color: 'text-red-400', icon: '⊘' },
};

interface TaskCardProps {
    task: CircleTask;
    onStatusChange?: (taskId: string, status: TaskStatus) => void;
    onAssign?: (taskId: string) => void;
}

export function TaskCard({ task, onStatusChange, onAssign }: TaskCardProps) {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

    return (
        <motion.div
            whileHover={{ y: -2 }}
            className={`bg-white/5 rounded-xl p-4 border ${isOverdue ? 'border-red-500/30' : 'border-white/10'}`}
        >
            <div className="flex items-start gap-3">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                        const nextStatus: Record<TaskStatus, TaskStatus> = {
                            pending: 'in-progress',
                            'in-progress': 'completed',
                            completed: 'pending',
                            blocked: 'pending',
                        };
                        onStatusChange?.(task.id, nextStatus[task.status]);
                    }}
                    className={`text-xl mt-1 ${statusConfig[task.status].color}`}
                >
                    {statusConfig[task.status].icon}
                </motion.button>
                <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <h4 className={`font-medium ${task.status === 'completed' ? 'text-white/40 line-through' : 'text-white'}`}>
                            {task.title}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${priorityConfig[task.priority].color}`}>
                            {priorityConfig[task.priority].label}
                        </span>
                    </div>
                    {task.description && (
                        <p className="text-sm text-white/50 mt-1 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                        {task.assignee ? (
                            <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs">
                                    {task.assignee.avatar}
                                </div>
                                <span className="text-xs text-white/60">{task.assignee.name}</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => onAssign?.(task.id)}
                                className="text-xs text-violet-400 hover:text-violet-300"
                            >
                                + Assign
                            </button>
                        )}
                        {task.dueDate && (
                            <span className={`text-xs ${isOverdue ? 'text-red-400' : 'text-white/40'}`}>
                                📅 {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                        )}
                        {task.tags.length > 0 && (
                            <div className="flex gap-1">
                                {task.tags.slice(0, 2).map((tag) => (
                                    <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/50">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================================================
// RESOURCE CARD
// ============================================================================

const resourceIcons: Record<string, string> = {
    document: '📄',
    link: '🔗',
    image: '🖼️',
    video: '🎬',
};

interface ResourceCardProps {
    resource: CircleResource;
}

export function ResourceCard({ resource }: ResourceCardProps) {
    return (
        <motion.a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -2 }}
            className="block bg-white/5 rounded-xl p-4 border border-white/10 hover:border-violet-500/30 transition-colors"
        >
            <div className="flex items-center gap-3">
                <span className="text-2xl">{resourceIcons[resource.type]}</span>
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{resource.title}</p>
                    <p className="text-xs text-white/40">Added by {resource.addedBy.name}</p>
                </div>
            </div>
        </motion.a>
    );
}

// ============================================================================
// ANNOUNCEMENT CARD
// ============================================================================

interface AnnouncementCardProps {
    announcement: CircleAnnouncement;
    onReact?: (announcementId: string, emoji: string) => void;
}

export function AnnouncementCard({ announcement, onReact }: AnnouncementCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white/5 rounded-xl p-5 border ${announcement.isPinned ? 'border-amber-500/30' : 'border-white/10'}`}
        >
            {announcement.isPinned && (
                <div className="flex items-center gap-1 text-amber-400 text-xs font-medium mb-2">
                    <span>📌</span> Pinned
                </div>
            )}
            <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                    {announcement.author.avatar}
                </div>
                <div>
                    <p className="font-medium text-white">{announcement.author.name}</p>
                    <p className="text-xs text-white/40">{new Date(announcement.createdAt).toLocaleDateString()}</p>
                </div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{announcement.title}</h3>
            <p className="text-white/70 text-sm">{announcement.content}</p>
            <div className="flex items-center gap-2 mt-4">
                {announcement.reactions.map((reaction) => (
                    <button
                        key={reaction.emoji}
                        onClick={() => onReact?.(announcement.id, reaction.emoji)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <span>{reaction.emoji}</span>
                        <span className="text-xs text-white/60">{reaction.count}</span>
                    </button>
                ))}
                <button
                    onClick={() => onReact?.(announcement.id, '👍')}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 text-sm"
                >
                    + React
                </button>
            </div>
        </motion.div>
    );
}

// ============================================================================
// CIRCLE ORGANIZER DASHBOARD
// ============================================================================

type OrganizerTab = 'tasks' | 'members' | 'resources' | 'announcements';

interface CircleOrganizerProps {
    circle: Circle;
    currentUserId: string;
    onTaskCreate?: (task: Partial<CircleTask>) => void;
    onTaskUpdate?: (taskId: string, updates: Partial<CircleTask>) => void;
    onMemberRoleChange?: (memberId: string, role: MemberRole) => void;
    onResourceAdd?: (resource: Partial<CircleResource>) => void;
    onAnnouncementCreate?: (announcement: Partial<CircleAnnouncement>) => void;
}

export function CircleOrganizer({
    circle,
    currentUserId,
    onTaskCreate,
    onTaskUpdate,
    onMemberRoleChange,
    onResourceAdd,
    onAnnouncementCreate,
}: CircleOrganizerProps) {
    const [activeTab, setActiveTab] = useState<OrganizerTab>('tasks');
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [taskFilter, setTaskFilter] = useState<'all' | TaskStatus>('all');

    const currentMember = circle.members.find((m) => m.id === currentUserId);
    const isOrganizer = currentMember?.role === 'organizer';
    const isCoordinator = currentMember?.role === 'coordinator';
    const canManage = isOrganizer || isCoordinator;

    const filteredTasks = taskFilter === 'all'
        ? circle.tasks
        : circle.tasks.filter((t) => t.status === taskFilter);

    const taskCounts = {
        pending: circle.tasks.filter((t) => t.status === 'pending').length,
        'in-progress': circle.tasks.filter((t) => t.status === 'in-progress').length,
        completed: circle.tasks.filter((t) => t.status === 'completed').length,
        blocked: circle.tasks.filter((t) => t.status === 'blocked').length,
    };

    const tabs: { id: OrganizerTab; label: string; icon: string; count?: number }[] = [
        { id: 'tasks', label: 'Tasks', icon: '✓', count: circle.tasks.filter((t) => t.status !== 'completed').length },
        { id: 'members', label: 'Members', icon: '👥', count: circle.members.length },
        { id: 'resources', label: 'Resources', icon: '📚', count: circle.resources.length },
        { id: 'announcements', label: 'Announcements', icon: '📢', count: circle.announcements.length },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">{circle.name}</h2>
                    <p className="text-white/50">{circle.description}</p>
                </div>
                {canManage && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowCreateTask(true)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium"
                    >
                        + Create Task
                    </motion.button>
                )}
            </div>

            {/* Progress Stats */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Pending', count: taskCounts.pending, color: 'text-white/60' },
                    { label: 'In Progress', count: taskCounts['in-progress'], color: 'text-cyan-400' },
                    { label: 'Completed', count: taskCounts.completed, color: 'text-emerald-400' },
                    { label: 'Blocked', count: taskCounts.blocked, color: 'text-red-400' },
                ].map(({ label, count, color }) => (
                    <div key={label} className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
                        <p className={`text-2xl font-bold ${color}`}>{count}</p>
                        <p className="text-sm text-white/50">{label}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
                {tabs.map((tab) => (
                    <motion.button
                        key={tab.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${activeTab === tab.id
                                ? 'bg-white text-gray-900'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                    >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                        {tab.count !== undefined && (
                            <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-gray-900 text-white' : 'bg-white/10'
                                }`}>
                                {tab.count}
                            </span>
                        )}
                    </motion.button>
                ))}
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                >
                    {activeTab === 'tasks' && (
                        <div className="space-y-4">
                            {/* Task Filters */}
                            <div className="flex gap-2">
                                {(['all', 'pending', 'in-progress', 'completed', 'blocked'] as const).map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => setTaskFilter(filter)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${taskFilter === filter
                                                ? 'bg-violet-500/20 text-violet-400'
                                                : 'bg-white/5 text-white/50 hover:bg-white/10'
                                            }`}
                                    >
                                        {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1).replace('-', ' ')}
                                    </button>
                                ))}
                            </div>

                            {/* Task List */}
                            <div className="space-y-3">
                                {filteredTasks.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onStatusChange={(id, status) => onTaskUpdate?.(id, { status })}
                                    />
                                ))}
                                {filteredTasks.length === 0 && (
                                    <div className="text-center py-12 text-white/40">
                                        No tasks found
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'members' && (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {circle.members.map((member) => (
                                <MemberCard
                                    key={member.id}
                                    member={member}
                                    canManage={isOrganizer}
                                    onRoleChange={onMemberRoleChange}
                                />
                            ))}
                        </div>
                    )}

                    {activeTab === 'resources' && (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {circle.resources.map((resource) => (
                                <ResourceCard key={resource.id} resource={resource} />
                            ))}
                            {canManage && (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="bg-white/5 rounded-xl p-8 border border-dashed border-white/20 text-white/40 hover:text-white hover:border-violet-500/50 transition-colors"
                                >
                                    + Add Resource
                                </motion.button>
                            )}
                        </div>
                    )}

                    {activeTab === 'announcements' && (
                        <div className="space-y-4">
                            {circle.announcements.map((announcement) => (
                                <AnnouncementCard key={announcement.id} announcement={announcement} />
                            ))}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Create Task Modal */}
            <AnimatePresence>
                {showCreateTask && (
                    <CreateTaskModal
                        onClose={() => setShowCreateTask(false)}
                        onCreate={(task) => {
                            onTaskCreate?.(task);
                            setShowCreateTask(false);
                        }}
                        members={circle.members}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================================================
// CREATE TASK MODAL
// ============================================================================

interface CreateTaskModalProps {
    onClose: () => void;
    onCreate: (task: Partial<CircleTask>) => void;
    members: CircleMember[];
}

function CreateTaskModal({ onClose, onCreate, members }: CreateTaskModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<TaskPriority>('medium');
    const [assigneeId, setAssigneeId] = useState<string>('');
    const [dueDate, setDueDate] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreate({
            title,
            description,
            priority,
            assignee: members.find((m) => m.id === assigneeId),
            dueDate: dueDate ? new Date(dueDate) : undefined,
            status: 'pending',
            tags: [],
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gray-900 rounded-2xl border border-white/10 p-6 max-w-lg w-full"
            >
                <h3 className="text-xl font-bold text-white mb-6">Create Task</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-white/60 mb-1">Task Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What needs to be done?"
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-white/60 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add details..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-white/60 mb-1">Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500/50"
                            >
                                <option value="low">🟢 Low</option>
                                <option value="medium">🟡 Medium</option>
                                <option value="high">🟠 High</option>
                                <option value="urgent">🔴 Urgent</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-white/60 mb-1">Due Date</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500/50"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-white/60 mb-1">Assign To</label>
                        <select
                            value={assigneeId}
                            onChange={(e) => setAssigneeId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500/50"
                        >
                            <option value="">Unassigned</option>
                            {members.map((member) => (
                                <option key={member.id} value={member.id}>
                                    {member.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 font-medium hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <motion.button
                            type="submit"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium"
                        >
                            Create Task
                        </motion.button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default CircleOrganizer;
