'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CalendarIcon,
    ClockIcon,
    UsersIcon,
    MapPinIcon,
    CheckCircleIcon,
    CloseIcon,
    ShareIcon,
    BellIcon,
} from '@/components/icons';

// ============================================
// TYPES
// ============================================

export type EventType = 'in_person' | 'virtual' | 'hybrid';
export type EventVisibility = 'public' | 'private' | 'invite_only';
export type RsvpStatus = 'going' | 'interested' | 'not_going';

export interface EventAttendee {
    id: string;
    userId: string;
    displayName: string;
    avatarUrl?: string;
    status: RsvpStatus;
    registeredAt: Date;
}

export interface Event {
    id: string;
    title: string;
    description: string;
    coverUrl?: string;
    type: EventType;
    visibility: EventVisibility;
    startDateTime: Date;
    endDateTime?: Date;
    location?: string;
    virtualLink?: string;
    capacity?: number;
    attendeeCount: number;
    attendees?: EventAttendee[];
    hostId: string;
    hostName: string;
    tags: string[];
    createdAt: Date;
}

// ============================================
// EVENT CONFIG
// ============================================

const EVENT_TYPES: { value: EventType; label: string; icon: string; description: string }[] = [
    { value: 'in_person', label: 'In Person', icon: '📍', description: 'Physical location meetup' },
    { value: 'virtual', label: 'Virtual', icon: '💻', description: 'Online event via video call' },
    { value: 'hybrid', label: 'Hybrid', icon: '🔀', description: 'Both in-person and virtual' },
];

// ============================================
// EVENT CREATION WIZARD
// ============================================

interface EventCreationWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<Event>) => Promise<void>;
}

export function EventCreationWizard({ isOpen, onClose, onSubmit }: EventCreationWizardProps) {
    const [step, setStep] = useState(1);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [eventType, setEventType] = useState<EventType>('in_person');
    const [visibility, setVisibility] = useState<EventVisibility>('public');
    const [startDate, setStartDate] = useState<string>('');
    const [startTime, setStartTime] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');
    const [location, setLocation] = useState('');
    const [virtualLink, setVirtualLink] = useState('');
    const [capacity, setCapacity] = useState<number | undefined>();
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

    const handleNext = () => {
        if (step < totalSteps) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const startDateTime = new Date(`${startDate}T${startTime}`);
            const endDateTime = endDate && endTime ? new Date(`${endDate}T${endTime}`) : undefined;

            await onSubmit({
                title,
                description,
                type: eventType,
                visibility,
                startDateTime,
                endDateTime,
                location: location || undefined,
                virtualLink: virtualLink || undefined,
                capacity,
                tags,
            });
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const canProceed = () => {
        switch (step) {
            case 1: return title.trim().length >= 3;
            case 2: return startDate && startTime;
            case 3: return eventType !== 'virtual' ? location.trim().length > 0 : virtualLink.trim().length > 0;
            case 4: return true;
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
                        <h2 className="text-lg font-semibold text-white">Create an Event</h2>
                        <p className="text-sm text-white/50">Step {step} of {totalSteps}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        <CloseIcon size={20} className="text-white/60" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-white/10">
                    <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
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
                                    <h3 className="text-xl font-semibold text-white mb-2">Event Details</h3>
                                    <p className="text-white/50">What are you planning?</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-2">Event Title *</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g., Community Iftar Dinner"
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                                        maxLength={100}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-2">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Tell people what to expect..."
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-2">Event Type</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {EVENT_TYPES.map(type => (
                                            <button
                                                key={type.value}
                                                onClick={() => setEventType(type.value)}
                                                className={`p-4 rounded-xl border text-center transition-all ${eventType === type.value
                                                        ? 'bg-purple-500/20 border-purple-500/50'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                    }`}
                                            >
                                                <div className="text-2xl mb-1">{type.icon}</div>
                                                <div className="text-sm font-medium text-white">{type.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Date & Time */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">When is it?</h3>
                                    <p className="text-white/50">Set the date and time</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-2">Start Date *</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-2">Start Time *</label>
                                        <input
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-2">End Date (optional)</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            min={startDate || new Date().toISOString().split('T')[0]}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-2">End Time</label>
                                        <input
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-2">Capacity (optional)</label>
                                    <input
                                        type="number"
                                        value={capacity || ''}
                                        onChange={(e) => setCapacity(e.target.value ? parseInt(e.target.value) : undefined)}
                                        placeholder="Leave blank for unlimited"
                                        min={1}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                                    />
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Location */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Where is it?</h3>
                                    <p className="text-white/50">Add location details</p>
                                </div>

                                {(eventType === 'in_person' || eventType === 'hybrid') && (
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-2">
                                            Physical Location {eventType === 'in_person' ? '*' : ''}
                                        </label>
                                        <div className="relative">
                                            <MapPinIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                                            <input
                                                type="text"
                                                value={location}
                                                onChange={(e) => setLocation(e.target.value)}
                                                placeholder="Enter address or venue name"
                                                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                                            />
                                        </div>
                                    </div>
                                )}

                                {(eventType === 'virtual' || eventType === 'hybrid') && (
                                    <div>
                                        <label className="block text-sm font-medium text-white/70 mb-2">
                                            Virtual Link {eventType === 'virtual' ? '*' : ''}
                                        </label>
                                        <input
                                            type="url"
                                            value={virtualLink}
                                            onChange={(e) => setVirtualLink(e.target.value)}
                                            placeholder="https://zoom.us/j/..."
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                                        />
                                        <p className="text-xs text-white/40 mt-1">Zoom, Google Meet, or other video call link</p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-2">Tags</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {tags.map(tag => (
                                            <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm">
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
                                                className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 text-sm"
                                            />
                                            <button onClick={handleAddTag} className="px-4 py-2 rounded-xl bg-white/10 text-white/60 hover:bg-white/20 text-sm">Add</button>
                                        </div>
                                    )}
                                </div>
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
                                    <h3 className="text-xl font-semibold text-white mb-2">Review your event</h3>
                                    <p className="text-white/50">Make sure everything looks good</p>
                                </div>

                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
                                            {EVENT_TYPES.find(t => t.value === eventType)?.icon}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-lg font-semibold text-white">{title}</h4>
                                            <p className="text-sm text-white/50 capitalize">{eventType.replace('_', ' ')} Event</p>
                                        </div>
                                    </div>

                                    {description && <p className="text-white/70">{description}</p>}

                                    <div className="flex flex-wrap gap-4 text-sm">
                                        <div className="flex items-center gap-2 text-white/60">
                                            <CalendarIcon size={16} />
                                            <span>{new Date(`${startDate}T${startTime}`).toLocaleDateString('en-US', {
                                                weekday: 'short', month: 'short', day: 'numeric'
                                            })}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-white/60">
                                            <ClockIcon size={16} />
                                            <span>{new Date(`${startDate}T${startTime}`).toLocaleTimeString('en-US', {
                                                hour: 'numeric', minute: '2-digit'
                                            })}</span>
                                        </div>
                                        {capacity && (
                                            <div className="flex items-center gap-2 text-white/60">
                                                <UsersIcon size={16} />
                                                <span>{capacity} spots</span>
                                            </div>
                                        )}
                                    </div>

                                    {location && (
                                        <div className="flex items-center gap-2 text-white/60">
                                            <MapPinIcon size={16} />
                                            <span>{location}</span>
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
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                        >
                            Continue
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <CheckCircleIcon size={18} />
                            )}
                            Create Event
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================
// EVENT CARD COMPONENT
// ============================================

interface EventCardProps {
    event: Event;
    onRsvp?: (id: string, status: RsvpStatus) => void;
    onShare?: (id: string) => void;
    currentUserRsvp?: RsvpStatus;
}

export function EventCard({ event, onRsvp, onShare, currentUserRsvp }: EventCardProps) {
    const formatEventDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatEventTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const isUpcoming = event.startDateTime > new Date();
    const typeIcon = EVENT_TYPES.find(t => t.value === event.type)?.icon || '📅';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
        >
            {/* Cover */}
            <div className="h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/20 relative">
                {event.coverUrl && (
                    <img src={event.coverUrl} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] to-transparent" />

                {/* Type Badge */}
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/50 text-white text-xs flex items-center gap-1">
                    <span>{typeIcon}</span>
                    <span className="capitalize">{event.type.replace('_', ' ')}</span>
                </div>

                {/* Date Badge */}
                <div className="absolute bottom-3 left-3 text-center">
                    <div className="px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm">
                        <div className="text-xs text-white/60">{formatEventDate(event.startDateTime).split(' ')[0]}</div>
                        <div className="text-xl font-bold text-white">{event.startDateTime.getDate()}</div>
                        <div className="text-xs text-white/60">{formatEventDate(event.startDateTime).split(' ')[1]}</div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors line-clamp-2">
                    {event.title}
                </h3>

                <div className="flex items-center gap-3 text-sm text-white/50 mb-3">
                    <div className="flex items-center gap-1">
                        <ClockIcon size={14} />
                        <span>{formatEventTime(event.startDateTime)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <UsersIcon size={14} />
                        <span>{event.attendeeCount} going</span>
                    </div>
                </div>

                {event.location && (
                    <div className="flex items-center gap-1 text-sm text-white/40 mb-4">
                        <MapPinIcon size={14} />
                        <span className="truncate">{event.location}</span>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {isUpcoming ? (
                        <>
                            <button
                                onClick={() => onRsvp?.(event.id, currentUserRsvp === 'going' ? 'not_going' : 'going')}
                                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${currentUserRsvp === 'going'
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : 'bg-white/10 text-white hover:bg-white/20'
                                    }`}
                            >
                                {currentUserRsvp === 'going' ? '✓ Going' : 'RSVP'}
                            </button>
                            <button
                                onClick={() => onRsvp?.(event.id, 'interested')}
                                className={`px-3 py-2 rounded-xl transition-all ${currentUserRsvp === 'interested'
                                        ? 'bg-purple-500/20 text-purple-400'
                                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                                    }`}
                            >
                                ⭐
                            </button>
                        </>
                    ) : (
                        <span className="text-sm text-white/40">Event ended</span>
                    )}
                    <button
                        onClick={() => onShare?.(event.id)}
                        className="px-3 py-2 rounded-xl bg-white/10 text-white/60 hover:bg-white/20 transition-all"
                    >
                        <ShareIcon size={16} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// EVENT CALENDAR VIEW
// ============================================

interface EventCalendarProps {
    events: Event[];
    onEventClick?: (event: Event) => void;
}

export function EventCalendar({ events, onEventClick }: EventCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

    const monthEvents = events.filter(e =>
        e.startDateTime.getMonth() === currentMonth.getMonth() &&
        e.startDateTime.getFullYear() === currentMonth.getFullYear()
    );

    const getEventsForDay = (day: number) => {
        return monthEvents.filter(e => e.startDateTime.getDate() === day);
    };

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    return (
        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60"
                >
                    ←
                </button>
                <h3 className="text-lg font-semibold text-white">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60"
                >
                    →
                </button>
            </div>

            {/* Day Names */}
            <div className="grid grid-cols-7 border-b border-white/10">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-2 text-center text-xs text-white/40 font-medium">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
                {days.map((day, index) => {
                    const dayEvents = day ? getEventsForDay(day) : [];
                    const isToday = day === new Date().getDate() &&
                        currentMonth.getMonth() === new Date().getMonth() &&
                        currentMonth.getFullYear() === new Date().getFullYear();

                    return (
                        <div
                            key={index}
                            className={`min-h-[80px] p-1 border-b border-r border-white/5 ${!day ? 'bg-white/[0.02]' : ''
                                }`}
                        >
                            {day && (
                                <>
                                    <div className={`text-sm mb-1 ${isToday
                                            ? 'w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center'
                                            : 'text-white/60 pl-1'
                                        }`}>
                                        {day}
                                    </div>
                                    <div className="space-y-0.5">
                                        {dayEvents.slice(0, 2).map(event => (
                                            <button
                                                key={event.id}
                                                onClick={() => onEventClick?.(event)}
                                                className="w-full text-left px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 truncate hover:bg-purple-500/30 transition-colors"
                                            >
                                                {event.title}
                                            </button>
                                        ))}
                                        {dayEvents.length > 2 && (
                                            <div className="text-[10px] text-white/40 pl-1">
                                                +{dayEvents.length - 2} more
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default EventCreationWizard;
