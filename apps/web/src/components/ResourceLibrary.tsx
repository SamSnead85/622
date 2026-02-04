'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { SearchIcon, CheckCircleIcon } from '@/components/icons';

// ============================================
// TYPES
// ============================================

export type ResourceType = 'article' | 'video' | 'document' | 'audio' | 'link' | 'course';

export interface Resource {
    id: string;
    title: string;
    description: string;
    type: ResourceType;
    category: string;
    tags: string[];
    url?: string;
    fileUrl?: string;
    thumbnailUrl?: string;
    authorId: string;
    authorName: string;
    duration?: number;
    viewCount: number;
    downloadCount: number;
    rating: number;
    isBookmarked: boolean;
    isFeatured: boolean;
    createdAt: Date;
}

export interface ResourceCollection {
    id: string;
    title: string;
    description?: string;
    resources: Resource[];
    creatorId: string;
    isPublic: boolean;
}

// ============================================
// RESOURCE CARD
// ============================================

interface ResourceCardProps {
    resource: Resource;
    onView: (id: string) => void;
    onBookmark: (id: string) => void;
}

const TYPE_ICONS: Record<ResourceType, string> = { article: '📄', video: '🎬', document: '📑', audio: '🎧', link: '🔗', course: '🎓' };

export function ResourceCard({ resource, onView, onBookmark }: ResourceCardProps) {
    const formatDuration = (mins?: number) => {
        if (!mins) return '';
        if (mins < 60) return `${mins} min`;
        return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    };

    return (
        <motion.div whileHover={{ scale: 1.02 }} onClick={() => onView(resource.id)}
            className="group overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 cursor-pointer">
            <div className="relative h-36 bg-gradient-to-br from-blue-500/20 to-indigo-500/20">
                {resource.thumbnailUrl && <img src={resource.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
                <span className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/50 text-white text-xs">
                    {TYPE_ICONS[resource.type]} {resource.type}
                </span>
                {resource.duration && (
                    <span className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs">{formatDuration(resource.duration)}</span>
                )}
                <button onClick={(e) => { e.stopPropagation(); onBookmark(resource.id); }}
                    className={`absolute top-2 right-2 p-2 rounded-full ${resource.isBookmarked ? 'bg-yellow-500 text-white' : 'bg-black/50 text-white/70'}`}>
                    {resource.isBookmarked ? '★' : '☆'}
                </button>
            </div>
            <div className="p-4">
                <h3 className="font-semibold text-white truncate group-hover:text-blue-300">{resource.title}</h3>
                <p className="text-sm text-white/50 line-clamp-2 mt-1">{resource.description}</p>
                <div className="flex items-center justify-between mt-3 text-xs text-white/40">
                    <span>by {resource.authorName}</span>
                    <span>⭐ {resource.rating.toFixed(1)}</span>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// RESOURCE LIBRARY
// ============================================

interface ResourceLibraryProps {
    resources: Resource[];
    categories: string[];
    onView: (id: string) => void;
    onBookmark: (id: string) => void;
    onUpload?: () => void;
}

export function ResourceLibrary({ resources, categories, onView, onBookmark, onUpload }: ResourceLibraryProps) {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
    const [selectedType, setSelectedType] = useState<ResourceType | 'all'>('all');
    const [view, setView] = useState<'all' | 'bookmarked' | 'featured'>('all');

    const filtered = useMemo(() => {
        return resources.filter(r => {
            if (view === 'bookmarked' && !r.isBookmarked) return false;
            if (view === 'featured' && !r.isFeatured) return false;
            if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
            if (selectedType !== 'all' && r.type !== selectedType) return false;
            if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.tags.some(t => t.includes(search.toLowerCase()))) return false;
            return true;
        });
    }, [resources, view, selectedCategory, selectedType, search]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                    <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search resources..."
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500/50" />
                </div>
                {onUpload && <button onClick={onUpload} className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium">+ Add Resource</button>}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="flex gap-2">
                    {(['all', 'featured', 'bookmarked'] as const).map(v => (
                        <button key={v} onClick={() => setView(v)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium ${view === v ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                            {v === 'all' ? 'All' : v === 'featured' ? '⭐ Featured' : '★ Saved'}
                        </button>
                    ))}
                </div>
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none">
                    <option value="all">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value as ResourceType | 'all')}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none">
                    <option value="all">All Types</option>
                    {(Object.keys(TYPE_ICONS) as ResourceType[]).map(t => <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>)}
                </select>
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
                <div className="py-16 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center text-4xl">📚</div>
                    <h3 className="text-lg font-medium text-white/60 mb-2">No resources found</h3>
                    <p className="text-white/40">Try adjusting your filters</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map(r => <ResourceCard key={r.id} resource={r} onView={onView} onBookmark={onBookmark} />)}
                </div>
            )}
        </div>
    );
}

export default ResourceLibrary;
