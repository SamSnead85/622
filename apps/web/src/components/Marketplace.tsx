'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    SearchIcon,
    CloseIcon,
    CheckCircleIcon,
    SettingsIcon,
    MessageIcon,
} from '@/components/icons';

// ============================================
// TYPES
// ============================================

export type ListingCategory =
    | 'electronics' | 'furniture' | 'clothing' | 'vehicles'
    | 'home' | 'sports' | 'toys' | 'books' | 'services' | 'other';

export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';
export type ListingStatus = 'active' | 'pending' | 'sold' | 'expired';

export interface Listing {
    id: string;
    sellerId: string;
    sellerName: string;
    sellerAvatar?: string;
    sellerRating: number;
    sellerVerified: boolean;
    title: string;
    description: string;
    price: number;
    originalPrice?: number;
    currency: string;
    category: ListingCategory;
    condition: ListingCondition;
    images: string[];
    location: string;
    isNegotiable: boolean;
    isBoosted: boolean;
    status: ListingStatus;
    viewCount: number;
    saveCount: number;
    createdAt: Date;
    expiresAt?: Date;
}

export interface SavedSearch {
    id: string;
    query: string;
    category?: ListingCategory;
    minPrice?: number;
    maxPrice?: number;
    alertsEnabled: boolean;
    createdAt: Date;
}

// ============================================
// CATEGORY CONFIG
// ============================================

const CATEGORIES: { value: ListingCategory; label: string; icon: string }[] = [
    { value: 'electronics', label: 'Electronics', icon: '📱' },
    { value: 'furniture', label: 'Furniture', icon: '🪑' },
    { value: 'clothing', label: 'Clothing', icon: '👕' },
    { value: 'vehicles', label: 'Vehicles', icon: '🚗' },
    { value: 'home', label: 'Home & Garden', icon: '🏠' },
    { value: 'sports', label: 'Sports', icon: '⚽' },
    { value: 'toys', label: 'Toys & Games', icon: '🎮' },
    { value: 'books', label: 'Books', icon: '📚' },
    { value: 'services', label: 'Services', icon: '🔧' },
    { value: 'other', label: 'Other', icon: '📦' },
];

const CONDITIONS: { value: ListingCondition; label: string }[] = [
    { value: 'new', label: 'New' },
    { value: 'like_new', label: 'Like New' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'For Parts' },
];

// ============================================
// LISTING CREATION WIZARD
// ============================================

interface ListingWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<Listing>) => Promise<void>;
}

export function ListingWizard({ isOpen, onClose, onSubmit }: ListingWizardProps) {
    const [step, setStep] = useState(1);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState<ListingCategory>('other');
    const [condition, setCondition] = useState<ListingCondition>('good');
    const [images, setImages] = useState<string[]>([]);
    const [location, setLocation] = useState('');
    const [isNegotiable, setIsNegotiable] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const totalSteps = 4;

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await onSubmit({
                title,
                description,
                price: parseFloat(price),
                category,
                condition,
                images,
                location,
                isNegotiable,
            });
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
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-2xl bg-[#0A0A0F] border border-white/10 rounded-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Create Listing</h2>
                        <p className="text-sm text-white/50">Step {step} of {totalSteps}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10">
                        <CloseIcon size={20} className="text-white/60" />
                    </button>
                </div>

                {/* Progress */}
                <div className="h-1 bg-white/10">
                    <motion.div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                        animate={{ width: `${(step / totalSteps) * 100}%` }}
                    />
                </div>

                {/* Content */}
                <div className="p-6 min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">What are you selling?</h3>
                                    <p className="text-white/50">Add photos and details about your item</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-2">Title *</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g., iPhone 14 Pro - 256GB"
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-green-500/50"
                                        maxLength={80}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-2">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe your item..."
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-green-500/50 resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-2">Photos</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[0, 1, 2, 3].map(i => (
                                            <div key={i} className="aspect-square rounded-xl bg-white/5 border border-dashed border-white/20 flex items-center justify-center text-white/40 hover:border-white/40 cursor-pointer">
                                                {images[i] ? (
                                                    <img src={images[i]} alt="" className="w-full h-full object-cover rounded-xl" />
                                                ) : (
                                                    <span>+</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Category & Condition</h3>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-2">Category</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {CATEGORIES.map(cat => (
                                            <button
                                                key={cat.value}
                                                onClick={() => setCategory(cat.value)}
                                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${category === cat.value
                                                        ? 'bg-green-500/10 border-green-500/50'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                    }`}
                                            >
                                                <span>{cat.icon}</span>
                                                <span className="text-white">{cat.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-2">Condition</label>
                                    <div className="flex flex-wrap gap-2">
                                        {CONDITIONS.map(cond => (
                                            <button
                                                key={cond.value}
                                                onClick={() => setCondition(cond.value)}
                                                className={`px-4 py-2 rounded-xl border transition-all ${condition === cond.value
                                                        ? 'bg-green-500/10 border-green-500/50 text-green-400'
                                                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                                    }`}
                                            >
                                                {cond.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Price & Location</h3>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-2">Price *</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">$</span>
                                        <input
                                            type="number"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full pl-8 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-green-500/50"
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isNegotiable}
                                            onChange={(e) => setIsNegotiable(e.target.checked)}
                                            className="rounded"
                                        />
                                        <span className="text-sm text-white/60">Price is negotiable</span>
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-2">Location</label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="City, State"
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-green-500/50"
                                    />
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Review Listing</h3>
                                </div>
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                                    <div className="flex gap-4">
                                        <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20" />
                                        <div>
                                            <h4 className="font-medium text-white">{title || 'Untitled'}</h4>
                                            <p className="text-2xl font-bold text-green-400 mt-1">${price || '0'}</p>
                                            <p className="text-sm text-white/50">{location || 'No location'}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-white/40">Category</span>
                                            <p className="text-white">{CATEGORIES.find(c => c.value === category)?.label}</p>
                                        </div>
                                        <div>
                                            <span className="text-white/40">Condition</span>
                                            <p className="text-white">{CONDITIONS.find(c => c.value === condition)?.label}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/10 flex justify-between">
                    <button
                        onClick={() => step === 1 ? onClose() : setStep(s => s - 1)}
                        className="px-5 py-2.5 rounded-xl text-white/60 hover:bg-white/10"
                    >
                        {step === 1 ? 'Cancel' : 'Back'}
                    </button>
                    {step < totalSteps ? (
                        <button
                            onClick={() => setStep(s => s + 1)}
                            disabled={step === 1 && !title.trim()}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium disabled:opacity-50"
                        >
                            Continue
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <CheckCircleIcon size={18} />
                            )}
                            Post Listing
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================
// LISTING CARD
// ============================================

interface ListingCardProps {
    listing: Listing;
    onView: (id: string) => void;
    onMessage: (id: string) => void;
    onSave: (id: string) => void;
    isSaved?: boolean;
}

export function ListingCard({ listing, onView, onMessage, onSave, isSaved = false }: ListingCardProps) {
    const discount = listing.originalPrice
        ? Math.round((1 - listing.price / listing.originalPrice) * 100)
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
            onClick={() => onView(listing.id)}
        >
            {/* Image */}
            <div className="relative aspect-square bg-gradient-to-br from-green-500/10 to-emerald-500/10">
                {listing.images[0] && (
                    <img src={listing.images[0]} alt="" className="w-full h-full object-cover" />
                )}

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {listing.isBoosted && (
                        <span className="px-2 py-0.5 rounded-full bg-yellow-500/90 text-black text-xs font-medium">
                            ⚡ Featured
                        </span>
                    )}
                    {discount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/90 text-white text-xs font-medium">
                            {discount}% OFF
                        </span>
                    )}
                </div>

                {/* Save Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onSave(listing.id); }}
                    className={`absolute top-2 right-2 p-2 rounded-full transition-all ${isSaved ? 'bg-red-500 text-white' : 'bg-black/50 text-white/70 hover:text-white'
                        }`}
                >
                    {isSaved ? '❤️' : '🤍'}
                </button>

                {/* Status */}
                {listing.status !== 'active' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="px-4 py-2 rounded-full bg-white/20 text-white font-medium uppercase text-sm">
                            {listing.status}
                        </span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="font-medium text-white truncate group-hover:text-green-300 transition-colors">
                    {listing.title}
                </h3>

                <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl font-bold text-green-400">
                        ${listing.price.toLocaleString()}
                    </span>
                    {listing.originalPrice && (
                        <span className="text-sm text-white/40 line-through">
                            ${listing.originalPrice.toLocaleString()}
                        </span>
                    )}
                    {listing.isNegotiable && (
                        <span className="text-xs text-white/40">OBO</span>
                    )}
                </div>

                <div className="flex items-center gap-2 mt-2 text-xs text-white/50">
                    <span>📍 {listing.location}</span>
                    <span>•</span>
                    <span>{CONDITIONS.find(c => c.value === listing.condition)?.label}</span>
                </div>

                {/* Seller */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-xs">
                            {listing.sellerName[0]}
                        </div>
                        <span className="text-sm text-white/60">{listing.sellerName}</span>
                        {listing.sellerVerified && <CheckCircleIcon size={12} className="text-green-400" />}
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onMessage(listing.id); }}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/60"
                    >
                        <MessageIcon size={16} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// MARKETPLACE DISCOVERY
// ============================================

interface MarketplaceProps {
    listings: Listing[];
    savedIds: string[];
    onView: (id: string) => void;
    onMessage: (id: string) => void;
    onSave: (id: string) => void;
    onCreateListing: () => void;
}

export function Marketplace({
    listings,
    savedIds,
    onView,
    onMessage,
    onSave,
    onCreateListing,
}: MarketplaceProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<ListingCategory | 'all'>('all');
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
    const [sortBy, setSortBy] = useState<'recent' | 'price_low' | 'price_high'>('recent');
    const [view, setView] = useState<'all' | 'saved'>('all');

    const filteredListings = useMemo(() => {
        return listings
            .filter(l => {
                if (view === 'saved' && !savedIds.includes(l.id)) return false;
                if (selectedCategory !== 'all' && l.category !== selectedCategory) return false;
                if (l.price < priceRange[0] || l.price > priceRange[1]) return false;
                if (searchQuery && !l.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                return l.status === 'active';
            })
            .sort((a, b) => {
                if (sortBy === 'price_low') return a.price - b.price;
                if (sortBy === 'price_high') return b.price - a.price;
                return b.createdAt.getTime() - a.createdAt.getTime();
            });
    }, [listings, savedIds, view, selectedCategory, priceRange, searchQuery, sortBy]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                    <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search marketplace..."
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-green-500/50"
                    />
                </div>
                <button
                    onClick={onCreateListing}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium"
                >
                    + Sell Something
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="flex gap-2">
                    {(['all', 'saved'] as const).map(v => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${view === v
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            {v === 'all' ? 'All Items' : `Saved (${savedIds.length})`}
                        </button>
                    ))}
                </div>

                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as ListingCategory | 'all')}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none"
                >
                    <option value="all">All Categories</option>
                    {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                    ))}
                </select>

                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none"
                >
                    <option value="recent">Most Recent</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                </select>
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.value}
                        onClick={() => setSelectedCategory(cat.value === selectedCategory ? 'all' : cat.value)}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm transition-all ${selectedCategory === cat.value
                                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                            }`}
                    >
                        {cat.icon} {cat.label}
                    </button>
                ))}
            </div>

            {/* Grid */}
            {filteredListings.length === 0 ? (
                <div className="py-16 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center text-4xl">
                        🛒
                    </div>
                    <h3 className="text-lg font-medium text-white/60 mb-2">No listings found</h3>
                    <p className="text-white/40 mb-4">Try adjusting your filters or be the first to sell</p>
                    <button
                        onClick={onCreateListing}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium"
                    >
                        Create Listing
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredListings.map(listing => (
                        <ListingCard
                            key={listing.id}
                            listing={listing}
                            onView={onView}
                            onMessage={onMessage}
                            onSave={onSave}
                            isSaved={savedIds.includes(listing.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default Marketplace;
