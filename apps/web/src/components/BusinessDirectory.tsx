'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { SearchIcon, CheckCircleIcon, MessageIcon } from '@/components/icons';

// ============================================
// TYPES
// ============================================

export interface Business {
    id: string;
    ownerId: string;
    name: string;
    description: string;
    category: string;
    subcategory?: string;
    logo?: string;
    coverImage?: string;
    address: string;
    phone?: string;
    email?: string;
    website?: string;
    socialLinks: { platform: string; url: string }[];
    hours: { day: string; open: string; close: string; isClosed: boolean }[];
    rating: number;
    reviewCount: number;
    isVerified: boolean;
    isFeatured: boolean;
    tags: string[];
    createdAt: Date;
}

export interface BusinessReview {
    id: string;
    businessId: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    rating: number;
    text: string;
    photos?: string[];
    createdAt: Date;
    helpfulCount: number;
}

// ============================================
// BUSINESS CARD
// ============================================

interface BusinessCardProps {
    business: Business;
    onView: (id: string) => void;
    onContact: (id: string) => void;
}

export function BusinessCard({ business, onView, onContact }: BusinessCardProps) {
    return (
        <motion.div whileHover={{ scale: 1.02 }} onClick={() => onView(business.id)}
            className="group overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 cursor-pointer">
            <div className="relative h-32 bg-gradient-to-br from-green-500/20 to-teal-500/20">
                {business.coverImage && <img src={business.coverImage} alt="" className="w-full h-full object-cover" />}
                {business.isFeatured && <span className="absolute top-2 left-2 px-2 py-1 rounded-full bg-yellow-500 text-black text-xs font-medium">⭐ Featured</span>}
            </div>
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {business.logo ? <img src={business.logo} alt="" className="w-full h-full object-cover" /> : <span className="text-xl">{business.name[0]}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white truncate group-hover:text-green-300">{business.name}</h3>
                            {business.isVerified && <CheckCircleIcon size={14} className="text-green-400" />}
                        </div>
                        <p className="text-xs text-white/40">{business.category}</p>
                    </div>
                </div>
                <p className="text-sm text-white/50 mt-3 line-clamp-2">{business.description}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-yellow-400">⭐ {business.rating.toFixed(1)}</span>
                        <span className="text-white/40">({business.reviewCount})</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onContact(business.id); }}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20"><MessageIcon size={16} className="text-white" /></button>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// BUSINESS DIRECTORY
// ============================================

interface BusinessDirectoryProps {
    businesses: Business[];
    categories: string[];
    onView: (id: string) => void;
    onContact: (id: string) => void;
    onAdd?: () => void;
}

export function BusinessDirectory({ businesses, categories, onView, onContact, onAdd }: BusinessDirectoryProps) {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
    const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'recent'>('rating');

    const filtered = useMemo(() => {
        return businesses.filter(b => {
            if (selectedCategory !== 'all' && b.category !== selectedCategory) return false;
            if (search && !b.name.toLowerCase().includes(search.toLowerCase()) && !b.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))) return false;
            return true;
        }).sort((a, b) => {
            if (sortBy === 'rating') return b.rating - a.rating;
            if (sortBy === 'reviews') return b.reviewCount - a.reviewCount;
            return b.createdAt.getTime() - a.createdAt.getTime();
        });
    }, [businesses, selectedCategory, search, sortBy]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                    <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search businesses..."
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40" />
                </div>
                {onAdd && <button onClick={onAdd} className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-teal-500 text-white font-medium">+ Add Business</button>}
            </div>

            <div className="flex flex-wrap gap-3">
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
                    <option value="all">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
                    <option value="rating">Top Rated</option>
                    <option value="reviews">Most Reviews</option>
                    <option value="recent">Newest</option>
                </select>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.slice(0, 8).map(c => (
                    <button key={c} onClick={() => setSelectedCategory(c === selectedCategory ? 'all' : c)}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm ${selectedCategory === c ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-white/5 text-white/60 border border-white/10'}`}>{c}</button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="py-16 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center text-4xl">🏪</div>
                    <h3 className="text-lg font-medium text-white/60 mb-2">No businesses found</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(b => <BusinessCard key={b.id} business={b} onView={onView} onContact={onContact} />)}
                </div>
            )}
        </div>
    );
}

export default BusinessDirectory;
