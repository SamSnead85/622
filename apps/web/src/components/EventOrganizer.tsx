'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

export type EventType = 'rally' | 'protest' | 'fundraiser' | 'workshop' | 'meetup' | 'online' | 'conference';
export type RSVPStatus = 'going' | 'maybe' | 'not-going' | 'pending';
export type VolunteerRole = 'marshal' | 'medic' | 'legal-observer' | 'media' | 'logistics' | 'speaker' | 'general';

export interface EventAttendee {
    id: string;
    name: string;
    avatar: string;
    rsvpStatus: RSVPStatus;
    volunteerRole?: VolunteerRole;
    checkedIn: boolean;
}

export interface EventVolunteerSlot {
    id: string;
    role: VolunteerRole;
    description: string;
    needed: number;
    filled: number;
    volunteers: EventAttendee[];
}

export interface CommunityEvent {
    id: string;
    title: string;
    description: string;
    type: EventType;
    startDate: Date;
    endDate: Date;
    location: {
        name: string;
        address: string;
        coordinates?: { lat: number; lng: number };
        isVirtual: boolean;
        virtualLink?: string;
    };
    organizer: {
        id: string;
        name: string;
        avatar: string;
    };
    coverImage?: string;
    attendees: EventAttendee[];
    volunteerSlots: EventVolunteerSlot[];
    capacity?: number;
    isTicketed: boolean;
    ticketPrice?: number;
    tags: string[];
    circleName?: string;
}

// ============================================================================
// EVENT TYPE CONFIG
// ============================================================================

const eventTypeConfig: Record<EventType, { label: string; icon: string; color: string }> = {
    rally: { label: 'Rally', icon: '✊', color: 'bg-red-500/20 text-red-400' },
    protest: { label: 'Protest', icon: '📢', color: 'bg-orange-500/20 text-orange-400' },
    fundraiser: { label: 'Fundraiser', icon: '💜', color: 'bg-violet-500/20 text-violet-400' },
    workshop: { label: 'Workshop', icon: '📚', color: 'bg-cyan-500/20 text-cyan-400' },
    meetup: { label: 'Meetup', icon: '🤝', color: 'bg-emerald-500/20 text-emerald-400' },
    online: { label: 'Online', icon: '💻', color: 'bg-blue-500/20 text-blue-400' },
    conference: { label: 'Conference', icon: '🎤', color: 'bg-amber-500/20 text-amber-400' },
};

const volunteerRoleConfig: Record<VolunteerRole, { label: string; icon: string }> = {
    marshal: { label: 'Marshal', icon: '🦺' },
    medic: { label: 'Medic', icon: '🏥' },
    'legal-observer': { label: 'Legal Observer', icon: '⚖️' },
    media: { label: 'Media', icon: '📷' },
    logistics: { label: 'Logistics', icon: '📦' },
    speaker: { label: 'Speaker', icon: '🎤' },
    general: { label: 'General', icon: '🤝' },
};

// ============================================================================
// RSVP BUTTON
// ============================================================================

interface RSVPButtonProps {
    currentStatus?: RSVPStatus;
    onRSVP: (status: RSVPStatus) => void;
}

export function RSVPButton({ currentStatus = 'pending', onRSVP }: RSVPButtonProps) {
    const [showOptions, setShowOptions] = useState(false);

    const statusConfig: Record<RSVPStatus, { label: string; color: string }> = {
        going: { label: "I'm Going! ✓", color: 'bg-emerald-500' },
        maybe: { label: 'Maybe', color: 'bg-amber-500' },
        'not-going': { label: 'Can\'t Make It', color: 'bg-white/20' },
        pending: { label: 'RSVP', color: 'bg-gradient-to-r from-violet-500 to-fuchsia-500' },
    };

    return (
        <div className="relative">
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowOptions(!showOptions)}
                className={`px-6 py-3 rounded-xl text-white font-medium ${statusConfig[currentStatus].color}`}
            >
                {statusConfig[currentStatus].label}
            </motion.button>
            <AnimatePresence>
                {showOptions && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-gray-800 rounded-xl border border-white/10 overflow-hidden z-10"
                    >
                        {(['going', 'maybe', 'not-going'] as RSVPStatus[]).map((status) => (
                            <button
                                key={status}
                                onClick={() => {
                                    onRSVP(status);
                                    setShowOptions(false);
                                }}
                                className={`w-full px-4 py-3 text-left text-sm transition-colors ${currentStatus === status ? 'bg-violet-500/20 text-violet-400' : 'text-white/70 hover:bg-white/10'
                                    }`}
                            >
                                {statusConfig[status].label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================================================
// VOLUNTEER SLOT CARD
// ============================================================================

interface VolunteerSlotCardProps {
    slot: EventVolunteerSlot;
    onSignUp?: (slotId: string) => void;
    currentUserId?: string;
}

export function VolunteerSlotCard({ slot, onSignUp, currentUserId }: VolunteerSlotCardProps) {
    const config = volunteerRoleConfig[slot.role];
    const progress = (slot.filled / slot.needed) * 100;
    const isSignedUp = slot.volunteers.some((v) => v.id === currentUserId);

    return (
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{config.icon}</span>
                    <div>
                        <p className="font-medium text-white">{config.label}</p>
                        <p className="text-xs text-white/50">{slot.description}</p>
                    </div>
                </div>
                <span className={`text-sm font-medium ${slot.filled >= slot.needed ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {slot.filled}/{slot.needed}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    className={`h-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-violet-500'}`}
                />
            </div>

            {/* Volunteers */}
            <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                    {slot.volunteers.slice(0, 5).map((vol, idx) => (
                        <div
                            key={vol.id}
                            className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 border-2 border-gray-900 flex items-center justify-center text-xs"
                            style={{ zIndex: 10 - idx }}
                        >
                            {vol.avatar}
                        </div>
                    ))}
                </div>
                {!isSignedUp && slot.filled < slot.needed && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onSignUp?.(slot.id)}
                        className="px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-400 text-sm font-medium hover:bg-violet-500/30"
                    >
                        Sign Up
                    </motion.button>
                )}
                {isSignedUp && (
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                        ✓ Signed Up
                    </span>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// ATTENDEE LIST
// ============================================================================

interface AttendeeListProps {
    attendees: EventAttendee[];
    maxShow?: number;
}

export function AttendeeList({ attendees, maxShow = 10 }: AttendeeListProps) {
    const goingCount = attendees.filter((a) => a.rsvpStatus === 'going').length;
    const maybeCount = attendees.filter((a) => a.rsvpStatus === 'maybe').length;

    return (
        <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Attendees</h3>
                <div className="flex gap-3">
                    <span className="text-sm text-emerald-400">{goingCount} going</span>
                    <span className="text-sm text-amber-400">{maybeCount} maybe</span>
                </div>
            </div>

            <div className="space-y-2">
                {attendees.filter((a) => a.rsvpStatus === 'going').slice(0, maxShow).map((attendee) => (
                    <div key={attendee.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-sm">
                            {attendee.avatar}
                        </div>
                        <span className="text-white/80 flex-1">{attendee.name}</span>
                        {attendee.volunteerRole && (
                            <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-xs">
                                {volunteerRoleConfig[attendee.volunteerRole].icon} {volunteerRoleConfig[attendee.volunteerRole].label}
                            </span>
                        )}
                        {attendee.checkedIn && (
                            <span className="text-emerald-400 text-xs">✓ Checked In</span>
                        )}
                    </div>
                ))}
            </div>

            {attendees.length > maxShow && (
                <button className="w-full mt-3 py-2 text-sm text-violet-400 hover:text-violet-300">
                    View all {attendees.length} attendees
                </button>
            )}
        </div>
    );
}

// ============================================================================
// EVENT DETAIL VIEW
// ============================================================================

interface EventDetailProps {
    event: CommunityEvent;
    currentUserId: string;
    onRSVP?: (status: RSVPStatus) => void;
    onVolunteerSignUp?: (slotId: string) => void;
}

export function EventDetail({ event, currentUserId, onRSVP, onVolunteerSignUp }: EventDetailProps) {
    const [activeTab, setActiveTab] = useState<'details' | 'attendees' | 'volunteers'>('details');
    const currentUserRSVP = event.attendees.find((a) => a.id === currentUserId)?.rsvpStatus || 'pending';
    const typeConfig = eventTypeConfig[event.type];

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }).format(new Date(date));
    };

    return (
        <div className="space-y-6">
            {/* Cover Image */}
            {event.coverImage && (
                <div className="h-64 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                    <span className="text-6xl">{typeConfig.icon}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeConfig.color}`}>
                            {typeConfig.icon} {typeConfig.label}
                        </span>
                        {event.circleName && (
                            <span className="px-3 py-1 rounded-full bg-white/10 text-white/60 text-sm">
                                ⭕ {event.circleName}
                            </span>
                        )}
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">{event.title}</h1>
                    <div className="flex items-center gap-4 text-white/60">
                        <span>📅 {formatDate(event.startDate)}</span>
                        {event.location.isVirtual ? (
                            <span>💻 Online Event</span>
                        ) : (
                            <span>📍 {event.location.name}</span>
                        )}
                    </div>
                </div>
                <RSVPButton currentStatus={currentUserRSVP} onRSVP={(status) => onRSVP?.(status)} />
            </div>

            {/* Organizer */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xl">
                    {event.organizer.avatar}
                </div>
                <div>
                    <p className="text-sm text-white/50">Organized by</p>
                    <p className="text-white font-medium">{event.organizer.name}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-4">
                {[
                    { id: 'details' as const, label: 'Details' },
                    { id: 'attendees' as const, label: `Attendees (${event.attendees.filter((a) => a.rsvpStatus === 'going').length})` },
                    { id: 'volunteers' as const, label: `Volunteers (${event.volunteerSlots.reduce((sum, s) => sum + s.filled, 0)})` },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-xl font-medium transition-colors ${activeTab === tab.id
                                ? 'bg-white text-gray-900'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                    >
                        {tab.label}
                    </button>
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
                    {activeTab === 'details' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">About This Event</h3>
                                <p className="text-white/70">{event.description}</p>
                            </div>

                            {!event.location.isVirtual && (
                                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                                    <h3 className="font-semibold text-white mb-2">📍 Location</h3>
                                    <p className="text-white/80">{event.location.name}</p>
                                    <p className="text-white/50 text-sm">{event.location.address}</p>
                                    <button className="mt-3 text-violet-400 text-sm hover:text-violet-300">
                                        Open in Maps →
                                    </button>
                                </div>
                            )}

                            {event.location.isVirtual && event.location.virtualLink && (
                                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                                    <h3 className="font-semibold text-white mb-2">💻 Virtual Event</h3>
                                    <p className="text-white/60 text-sm mb-3">Join link will be shared with attendees</p>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="px-4 py-2 rounded-lg bg-violet-500 text-white font-medium"
                                    >
                                        Join Event
                                    </motion.button>
                                </div>
                            )}

                            {event.isTicketed && (
                                <div className="p-5 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-white">🎟️ Ticketed Event</h3>
                                            <p className="text-white/60 text-sm">Registration required</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-white">
                                                {event.ticketPrice === 0 ? 'Free' : `$${event.ticketPrice}`}
                                            </p>
                                            {event.capacity && (
                                                <p className="text-xs text-white/50">{event.capacity - event.attendees.length} spots left</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'attendees' && (
                        <AttendeeList attendees={event.attendees} />
                    )}

                    {activeTab === 'volunteers' && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
                                <p className="text-white/80 text-sm">
                                    🤝 Volunteers are the backbone of our movement. Sign up to help make this event a success!
                                </p>
                            </div>
                            {event.volunteerSlots.map((slot) => (
                                <VolunteerSlotCard
                                    key={slot.id}
                                    slot={slot}
                                    currentUserId={currentUserId}
                                    onSignUp={onVolunteerSignUp}
                                />
                            ))}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

// ============================================================================
// EVENT CARD
// ============================================================================

interface EventCardProps {
    event: CommunityEvent;
    onClick?: () => void;
}

export function EventCard({ event, onClick }: EventCardProps) {
    const typeConfig = eventTypeConfig[event.type];
    const goingCount = event.attendees.filter((a) => a.rsvpStatus === 'going').length;

    const formatDate = (date: Date) => {
        const d = new Date(date);
        return {
            day: d.getDate(),
            month: d.toLocaleDateString('en-US', { month: 'short' }),
            time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        };
    };

    const dateInfo = formatDate(event.startDate);

    return (
        <motion.div
            whileHover={{ y: -4 }}
            onClick={onClick}
            className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden cursor-pointer hover:border-violet-500/30 transition-colors"
        >
            {/* Date Badge */}
            <div className="flex">
                <div className="w-20 bg-gradient-to-b from-violet-500 to-fuchsia-500 p-4 text-center">
                    <p className="text-3xl font-bold text-white">{dateInfo.day}</p>
                    <p className="text-sm text-white/80">{dateInfo.month}</p>
                </div>
                <div className="flex-1 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig.color}`}>
                            {typeConfig.icon} {typeConfig.label}
                        </span>
                    </div>
                    <h3 className="font-semibold text-white mb-1 line-clamp-1">{event.title}</h3>
                    <p className="text-sm text-white/50 mb-2">{dateInfo.time}</p>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-white/40">
                            {event.location.isVirtual ? '💻 Online' : `📍 ${event.location.name}`}
                        </span>
                        <span className="text-xs text-emerald-400">{goingCount} going</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default EventDetail;
