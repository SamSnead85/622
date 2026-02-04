'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { SearchIcon, CheckCircleIcon, MessageIcon } from '@/components/icons';

// ============================================
// TYPES
// ============================================

export interface MentorProfile {
    id: string;
    userId: string;
    name: string;
    avatar?: string;
    title: string;
    bio: string;
    expertise: string[];
    industries: string[];
    yearsExperience: number;
    rating: number;
    reviewCount: number;
    menteeCount: number;
    sessionsCompleted: number;
    availability: 'available' | 'limited' | 'unavailable';
    hourlyRate?: number;
    isFree: boolean;
    isVerified: boolean;
    languages: string[];
}

export interface MentorshipRequest {
    id: string;
    mentorId: string;
    menteeId: string;
    menteeName: string;
    message: string;
    goals: string[];
    status: 'pending' | 'accepted' | 'declined';
    createdAt: Date;
}

export interface MentorshipSession {
    id: string;
    mentorId: string;
    menteeId: string;
    scheduledAt: Date;
    duration: number;
    topic: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    notes?: string;
    rating?: number;
}

// ============================================
// MENTOR CARD
// ============================================

interface MentorCardProps {
    mentor: MentorProfile;
    onView: (id: string) => void;
    onConnect: (id: string) => void;
}

export function MentorCard({ mentor, onView, onConnect }: MentorCardProps) {
    const availabilityColors = { available: 'green', limited: 'yellow', unavailable: 'red' };

    return (
        <motion.div whileHover={{ scale: 1.02 }} className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20">
            <div className="flex gap-4">
                <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl font-medium">
                        {mentor.avatar ? <img src={mentor.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : mentor.name[0]}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-${availabilityColors[mentor.availability]}-500 border-2 border-[#0A0A0F]`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white truncate">{mentor.name}</h3>
                        {mentor.isVerified && <CheckCircleIcon size={14} className="text-cyan-400" />}
                    </div>
                    <p className="text-sm text-white/50">{mentor.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-white/40">
                        <span>⭐ {mentor.rating.toFixed(1)}</span>
                        <span>•</span>
                        <span>{mentor.reviewCount} reviews</span>
                        <span>•</span>
                        <span>{mentor.yearsExperience}+ years</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-1 mt-4">
                {mentor.expertise.slice(0, 4).map(e => (
                    <span key={e} className="px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs">{e}</span>
                ))}
                {mentor.expertise.length > 4 && <span className="px-2 py-1 rounded-full bg-white/5 text-white/40 text-xs">+{mentor.expertise.length - 4}</span>}
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                <span className="text-sm text-white/50">{mentor.isFree ? 'Free' : `$${mentor.hourlyRate}/hr`}</span>
                <div className="flex gap-2">
                    <button onClick={() => onView(mentor.id)} className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20">View Profile</button>
                    <button onClick={() => onConnect(mentor.id)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium">Connect</button>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// MENTOR MATCHING
// ============================================

interface MentorMatchingProps {
    mentors: MentorProfile[];
    onView: (id: string) => void;
    onConnect: (id: string) => void;
}

export function MentorMatching({ mentors, onView, onConnect }: MentorMatchingProps) {
    const [search, setSearch] = useState('');
    const [selectedExpertise, setSelectedExpertise] = useState<string | 'all'>('all');
    const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');

    const allExpertise = useMemo(() => [...new Set(mentors.flatMap(m => m.expertise))].sort(), [mentors]);

    const filtered = useMemo(() => {
        return mentors.filter(m => {
            if (priceFilter === 'free' && !m.isFree) return false;
            if (priceFilter === 'paid' && m.isFree) return false;
            if (selectedExpertise !== 'all' && !m.expertise.includes(selectedExpertise)) return false;
            if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.expertise.some(e => e.toLowerCase().includes(search.toLowerCase()))) return false;
            return true;
        }).sort((a, b) => b.rating - a.rating);
    }, [mentors, priceFilter, selectedExpertise, search]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                    <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search mentors..."
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40" />
                </div>
                <select value={selectedExpertise} onChange={(e) => setSelectedExpertise(e.target.value)}
                    className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white">
                    <option value="all">All Expertise</option>
                    {allExpertise.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <select value={priceFilter} onChange={(e) => setPriceFilter(e.target.value as typeof priceFilter)}
                    className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white">
                    <option value="all">All</option>
                    <option value="free">Free Only</option>
                    <option value="paid">Paid Only</option>
                </select>
            </div>

            {filtered.length === 0 ? (
                <div className="py-16 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center text-4xl">👨‍🏫</div>
                    <h3 className="text-lg font-medium text-white/60 mb-2">No mentors found</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filtered.map(m => <MentorCard key={m.id} mentor={m} onView={onView} onConnect={onConnect} />)}
                </div>
            )}
        </div>
    );
}

// ============================================
// SESSION SCHEDULER
// ============================================

interface SessionSchedulerProps {
    mentorName: string;
    availableSlots: Date[];
    onSchedule: (slot: Date, topic: string) => Promise<void>;
    onClose: () => void;
}

export function SessionScheduler({ mentorName, availableSlots, onSchedule, onClose }: SessionSchedulerProps) {
    const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
    const [topic, setTopic] = useState('');
    const [isScheduling, setIsScheduling] = useState(false);

    const handleSchedule = async () => {
        if (!selectedSlot || !topic.trim()) return;
        setIsScheduling(true);
        try { await onSchedule(selectedSlot, topic); onClose(); }
        finally { setIsScheduling(false); }
    };

    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="font-semibold text-white mb-4">Schedule Session with {mentorName}</h3>
            <div className="mb-4">
                <label className="block text-sm text-white/60 mb-2">Available Times</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {availableSlots.map((slot, i) => (
                        <button key={i} onClick={() => setSelectedSlot(slot)}
                            className={`p-3 rounded-xl text-sm text-left ${selectedSlot?.getTime() === slot.getTime() ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'bg-white/5 text-white/60 border border-white/10'}`}>
                            {slot.toLocaleDateString()} {slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </button>
                    ))}
                </div>
            </div>
            <div className="mb-4">
                <label className="block text-sm text-white/60 mb-2">What would you like to discuss?</label>
                <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Describe the topics..."
                    rows={3} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white resize-none" />
            </div>
            <div className="flex justify-end gap-3">
                <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-white/60 hover:bg-white/10">Cancel</button>
                <button onClick={handleSchedule} disabled={!selectedSlot || !topic.trim() || isScheduling}
                    className="px-5 py-2.5 rounded-xl bg-indigo-500 text-white font-medium disabled:opacity-50">
                    {isScheduling ? 'Scheduling...' : 'Confirm Session'}
                </button>
            </div>
        </div>
    );
}

export default MentorMatching;
