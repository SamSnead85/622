'use client';

import React, { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// MEDIA UPLOAD
// Drag-and-drop file upload component
// ============================================

interface MediaUploadProps {
    onFilesSelected: (files: File[]) => void;
    accept?: string;
    multiple?: boolean;
    maxSize?: number;
    maxFiles?: number;
}

export function MediaUpload({
    onFilesSelected,
    accept = 'image/*,video/*',
    multiple = true,
    maxSize = 50 * 1024 * 1024, // 50MB
    maxFiles = 10,
}: MediaUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const validateFiles = useCallback((files: File[]) => {
        const validFiles: File[] = [];

        for (const file of files) {
            if (file.size > maxSize) {
                setError(`File ${file.name} is too large. Max size is ${maxSize / 1024 / 1024}MB`);
                continue;
            }
            if (validFiles.length >= maxFiles) {
                setError(`Maximum ${maxFiles} files allowed`);
                break;
            }
            validFiles.push(file);
        }

        if (validFiles.length > 0) {
            onFilesSelected(validFiles);
        }
    }, [maxSize, maxFiles, onFilesSelected]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        setError(null);

        const files = Array.from(e.dataTransfer.files);
        validateFiles(files);
    }, [validateFiles]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const files = e.target.files ? Array.from(e.target.files) : [];
        validateFiles(files);
    }, [validateFiles]);

    return (
        <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${isDragging
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                    : 'border-white/20 hover:border-white/40'
                }`}
        >
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={handleInputChange}
                className="hidden"
            />

            <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 flex items-center justify-center">
                    <span className="text-3xl">📤</span>
                </div>
                <div>
                    <p className="text-white font-medium">
                        {isDragging ? 'Drop files here' : 'Drag and drop or click to upload'}
                    </p>
                    <p className="text-sm text-white/50 mt-1">
                        Images and videos up to {maxSize / 1024 / 1024}MB
                    </p>
                </div>
            </div>

            {error && (
                <p className="mt-4 text-sm text-red-400">{error}</p>
            )}
        </div>
    );
}

// ============================================
// MEDIA PREVIEW
// Preview uploaded media with remove option
// ============================================

interface MediaItem {
    id: string;
    file: File;
    url: string;
    type: 'image' | 'video';
}

interface MediaPreviewProps {
    items: MediaItem[];
    onRemove: (id: string) => void;
    onReorder?: (items: MediaItem[]) => void;
}

export function MediaPreview({ items, onRemove }: MediaPreviewProps) {
    if (items.length === 0) return null;

    return (
        <div className="grid grid-cols-3 gap-2">
            {items.map((item, index) => (
                <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative aspect-square rounded-xl overflow-hidden bg-black group"
                >
                    {item.type === 'image' ? (
                        <Image
                            src={item.url}
                            alt={`Upload ${index + 1}`}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <video
                            src={item.url}
                            className="w-full h-full object-cover"
                            muted
                        />
                    )}

                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                            onClick={() => onRemove(item.id)}
                            className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                            🗑️
                        </button>
                    </div>

                    {/* Type indicator */}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-xs text-white">
                        {item.type === 'video' ? '🎬' : '📷'}
                    </span>
                </motion.div>
            ))}
        </div>
    );
}

// ============================================
// CONTENT FILTERS
// Apply filters/effects to images
// ============================================

const FILTERS = [
    { id: 'none', name: 'Original', style: '' },
    { id: 'grayscale', name: 'B&W', style: 'grayscale(100%)' },
    { id: 'sepia', name: 'Sepia', style: 'sepia(100%)' },
    { id: 'warm', name: 'Warm', style: 'saturate(1.3) hue-rotate(-10deg)' },
    { id: 'cool', name: 'Cool', style: 'saturate(1.1) hue-rotate(10deg)' },
    { id: 'vibrant', name: 'Vibrant', style: 'saturate(1.5) contrast(1.1)' },
    { id: 'dramatic', name: 'Dramatic', style: 'contrast(1.3) brightness(0.9)' },
    { id: 'fade', name: 'Fade', style: 'contrast(0.9) brightness(1.1) saturate(0.8)' },
];

interface ContentFiltersProps {
    imageUrl: string;
    selectedFilter: string;
    onFilterSelect: (filterId: string) => void;
}

export function ContentFilters({ imageUrl, selectedFilter, onFilterSelect }: ContentFiltersProps) {
    return (
        <div className="space-y-4">
            {/* Large Preview */}
            <div className="aspect-square rounded-xl overflow-hidden bg-black">
                <Image
                    src={imageUrl}
                    alt="Preview"
                    width={400}
                    height={400}
                    className="w-full h-full object-cover"
                    style={{ filter: FILTERS.find(f => f.id === selectedFilter)?.style }}
                />
            </div>

            {/* Filter Options */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {FILTERS.map((filter) => (
                    <button
                        key={filter.id}
                        onClick={() => onFilterSelect(filter.id)}
                        className={`flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${selectedFilter === filter.id
                                ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/30'
                                : 'hover:bg-white/5'
                            }`}
                    >
                        <div className="w-14 h-14 rounded-lg overflow-hidden">
                            <Image
                                src={imageUrl}
                                alt={filter.name}
                                width={56}
                                height={56}
                                className="w-full h-full object-cover"
                                style={{ filter: filter.style }}
                            />
                        </div>
                        <span className="text-xs text-white/70">{filter.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ============================================
// POLL CREATOR
// Create interactive polls
// ============================================

interface PollOption {
    id: string;
    text: string;
}

interface PollCreatorProps {
    options: PollOption[];
    onOptionsChange: (options: PollOption[]) => void;
    duration: number;
    onDurationChange: (hours: number) => void;
}

export function PollCreator({ options, onOptionsChange, duration, onDurationChange }: PollCreatorProps) {
    const addOption = useCallback(() => {
        if (options.length >= 4) return;
        onOptionsChange([...options, { id: Date.now().toString(), text: '' }]);
    }, [options, onOptionsChange]);

    const removeOption = useCallback((id: string) => {
        if (options.length <= 2) return;
        onOptionsChange(options.filter(o => o.id !== id));
    }, [options, onOptionsChange]);

    const updateOption = useCallback((id: string, text: string) => {
        onOptionsChange(options.map(o => o.id === id ? { ...o, text } : o));
    }, [options, onOptionsChange]);

    const DURATIONS = [
        { hours: 1, label: '1 hour' },
        { hours: 6, label: '6 hours' },
        { hours: 24, label: '1 day' },
        { hours: 72, label: '3 days' },
        { hours: 168, label: '1 week' },
    ];

    return (
        <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
                <span className="text-lg">📊</span>
                <span className="font-medium text-white">Create Poll</span>
            </div>

            <div className="space-y-2">
                {options.map((option, index) => (
                    <div key={option.id} className="flex items-center gap-2">
                        <span className="text-white/40 text-sm w-4">{index + 1}.</span>
                        <input
                            type="text"
                            value={option.text}
                            onChange={(e) => updateOption(option.id, e.target.value)}
                            placeholder={`Option ${index + 1}`}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50"
                        />
                        {options.length > 2 && (
                            <button
                                onClick={() => removeOption(option.id)}
                                className="text-white/40 hover:text-red-400"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {options.length < 4 && (
                <button
                    onClick={addOption}
                    className="text-[#D4AF37] text-sm hover:underline"
                >
                    + Add option
                </button>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <span className="text-sm text-white/60">Duration:</span>
                <div className="flex gap-1">
                    {DURATIONS.map((d) => (
                        <button
                            key={d.hours}
                            onClick={() => onDurationChange(d.hours)}
                            className={`px-2 py-1 text-xs rounded-lg ${duration === d.hours
                                    ? 'bg-[#D4AF37] text-black'
                                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                                }`}
                        >
                            {d.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ============================================
// LOCATION PICKER
// Add location to posts
// ============================================

interface Location {
    id: string;
    name: string;
    address: string;
}

interface LocationPickerProps {
    selectedLocation?: Location;
    onLocationSelect: (location: Location | undefined) => void;
    isOpen: boolean;
    onClose: () => void;
}

export function LocationPicker({ selectedLocation, onLocationSelect, isOpen, onClose }: LocationPickerProps) {
    const [search, setSearch] = useState('');
    const [locations, setLocations] = useState<Location[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Search locations via API when search query changes
    useEffect(() => {
        if (!search.trim()) {
            setLocations([]);
            return;
        }

        const debounce = setTimeout(async () => {
            setIsSearching(true);
            try {
                const { API_URL } = await import('@/lib/api');
                const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
                const res = await fetch(
                    `${API_URL}/api/v1/search/locations?q=${encodeURIComponent(search)}`,
                    {
                        headers: {
                            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                        },
                        credentials: 'include',
                    }
                );
                if (res.ok) {
                    const data = await res.json();
                    setLocations(data.locations || []);
                }
            } catch (err) {
                console.error('Location search failed:', err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(debounce);
    }, [search]);

    const filteredLocations = locations;

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[#1A1A1F] rounded-2xl w-full max-w-md border border-white/10 max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        📍 Add Location
                    </h3>
                </div>

                <div className="p-4">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search locations..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#D4AF37]/50"
                        autoFocus
                    />
                </div>

                <div className="max-h-60 overflow-y-auto">
                    {selectedLocation && (
                        <button
                            onClick={() => onLocationSelect(undefined)}
                            className="w-full p-4 text-left hover:bg-white/5 border-b border-white/10 flex items-center gap-3"
                        >
                            <span className="text-red-400">✕</span>
                            <span className="text-white/70">Remove location</span>
                        </button>
                    )}

                    {isSearching && (
                        <div className="p-4 text-center text-white/40 text-sm">Searching...</div>
                    )}

                    {!isSearching && search.trim() && filteredLocations.length === 0 && (
                        <div className="p-4 text-center text-white/40 text-sm">No locations found. Try a different search.</div>
                    )}

                    {!isSearching && !search.trim() && filteredLocations.length === 0 && (
                        <div className="p-4 text-center text-white/40 text-sm">Type to search for a location...</div>
                    )}

                    {filteredLocations.map((location) => (
                        <button
                            key={location.id}
                            onClick={() => {
                                onLocationSelect(location);
                                onClose();
                            }}
                            className={`w-full p-4 text-left hover:bg-white/5 flex items-start gap-3 ${selectedLocation?.id === location.id ? 'bg-[#D4AF37]/10' : ''
                                }`}
                        >
                            <span className="text-lg">📍</span>
                            <div>
                                <p className="font-medium text-white">{location.name}</p>
                                <p className="text-sm text-white/50">{location.address}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================
// MENTIONS INPUT
// Auto-complete @mentions
// ============================================

interface User {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
}

interface MentionsInputProps {
    value: string;
    onChange: (value: string) => void;
    onMention?: (user: User) => void;
    placeholder?: string;
    users?: User[];
}

export function MentionsInput({
    value,
    onChange,
    onMention,
    placeholder = "What's happening?",
    users = [],
}: MentionsInputProps) {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [cursorPosition, setCursorPosition] = useState(0);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursor = e.target.selectionStart || 0;
        onChange(newValue);
        setCursorPosition(cursor);

        // Check for @mention
        const textBeforeCursor = newValue.slice(0, cursor);
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

        if (mentionMatch) {
            setMentionQuery(mentionMatch[1]);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    }, [onChange]);

    const insertMention = useCallback((user: User) => {
        const textBeforeMention = value.slice(0, cursorPosition).replace(/@\w*$/, '');
        const textAfterMention = value.slice(cursorPosition);
        const newValue = `${textBeforeMention}@${user.username} ${textAfterMention}`;
        onChange(newValue);
        setShowSuggestions(false);
        onMention?.(user);
        inputRef.current?.focus();
    }, [value, cursorPosition, onChange, onMention]);

    const filteredUsers = users.filter(
        u => u.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
            u.displayName.toLowerCase().includes(mentionQuery.toLowerCase())
    ).slice(0, 5);

    return (
        <div className="relative">
            <textarea
                ref={inputRef}
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                className="w-full min-h-[120px] bg-transparent text-white text-lg placeholder:text-white/40 resize-none focus:outline-none"
            />

            <AnimatePresence>
                {showSuggestions && filteredUsers.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute left-0 right-0 mt-2 bg-[#1A1A1F] border border-white/10 rounded-xl overflow-hidden shadow-xl z-10"
                    >
                        {filteredUsers.map((user) => (
                            <button
                                key={user.id}
                                onClick={() => insertMention(user)}
                                className="w-full p-3 text-left hover:bg-white/5 flex items-center gap-3"
                            >
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                                    {user.avatarUrl ? (
                                        <Image src={user.avatarUrl} alt={user.displayName} width={32} height={32} />
                                    ) : (
                                        <span className="text-white/60 text-sm font-bold">{user.displayName[0]}</span>
                                    )}
                                </div>
                                <div>
                                    <p className="font-medium text-white text-sm">{user.displayName}</p>
                                    <p className="text-xs text-white/50">@{user.username}</p>
                                </div>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
