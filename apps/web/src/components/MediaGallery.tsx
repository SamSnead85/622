'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon, SearchIcon, CheckCircleIcon } from '@/components/icons';

// ============================================
// TYPES
// ============================================

export interface MediaItem {
    id: string;
    type: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
    width: number;
    height: number;
    size: number; // bytes
    duration?: number; // for videos
    altText?: string;
    createdAt: Date;
    albumId?: string;
    tags: string[];
}

export interface Album {
    id: string;
    name: string;
    description?: string;
    coverUrl?: string;
    itemCount: number;
    isPrivate: boolean;
    createdAt: Date;
}

// ============================================
// IMAGE EDITOR
// ============================================

export interface ImageEditorProps {
    imageUrl: string;
    onSave: (editedUrl: string) => void;
    onCancel: () => void;
}

const FILTERS = [
    { id: 'none', name: 'None', css: '' },
    { id: 'grayscale', name: 'B&W', css: 'grayscale(100%)' },
    { id: 'sepia', name: 'Sepia', css: 'sepia(100%)' },
    { id: 'bright', name: 'Bright', css: 'brightness(120%)' },
    { id: 'contrast', name: 'Contrast', css: 'contrast(130%)' },
    { id: 'warm', name: 'Warm', css: 'sepia(30%) saturate(140%)' },
    { id: 'cool', name: 'Cool', css: 'hue-rotate(180deg) saturate(80%)' },
    { id: 'vintage', name: 'Vintage', css: 'sepia(50%) contrast(95%) brightness(95%)' },
];

export function ImageEditor({ imageUrl, onSave, onCancel }: ImageEditorProps) {
    const [activeFilter, setActiveFilter] = useState('none');
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturation, setSaturation] = useState(100);
    const [rotation, setRotation] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const getFilterStyle = () => {
        const filter = FILTERS.find(f => f.id === activeFilter);
        let css = filter?.css || '';

        if (brightness !== 100) css += ` brightness(${brightness}%)`;
        if (contrast !== 100) css += ` contrast(${contrast}%)`;
        if (saturation !== 100) css += ` saturate(${saturation}%)`;

        return css.trim();
    };

    const handleSave = () => {
        // In a real implementation, apply filters to canvas and export
        onSave(imageUrl);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <button onClick={onCancel} className="p-2 rounded-lg hover:bg-white/10 text-white">
                    <CloseIcon size={20} />
                </button>
                <h2 className="text-lg font-semibold text-white">Edit Photo</h2>
                <button
                    onClick={handleSave}
                    className="px-4 py-2 rounded-xl bg-cyan-500 text-white font-medium"
                >
                    Save
                </button>
            </div>

            {/* Image Preview */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                <img
                    src={imageUrl}
                    alt="Edit preview"
                    style={{
                        filter: getFilterStyle(),
                        transform: `rotate(${rotation}deg)`,
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                    }}
                />
            </div>

            {/* Controls */}
            <div className="border-t border-white/10 p-4 space-y-4">
                {/* Filters */}
                <div>
                    <p className="text-sm text-white/60 mb-2">Filters</p>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {FILTERS.map(filter => (
                            <button
                                key={filter.id}
                                onClick={() => setActiveFilter(filter.id)}
                                className={`flex-shrink-0 text-center ${activeFilter === filter.id ? 'ring-2 ring-cyan-500 rounded-xl' : ''
                                    }`}
                            >
                                <div
                                    className="w-16 h-16 rounded-lg bg-cover bg-center mb-1"
                                    style={{
                                        backgroundImage: `url(${imageUrl})`,
                                        filter: filter.css,
                                    }}
                                />
                                <span className="text-xs text-white/60">{filter.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Adjustments */}
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs text-white/60">Brightness</label>
                        <input
                            type="range"
                            min={50}
                            max={150}
                            value={brightness}
                            onChange={(e) => setBrightness(Number(e.target.value))}
                            className="w-full accent-cyan-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-white/60">Contrast</label>
                        <input
                            type="range"
                            min={50}
                            max={150}
                            value={contrast}
                            onChange={(e) => setContrast(Number(e.target.value))}
                            className="w-full accent-cyan-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-white/60">Saturation</label>
                        <input
                            type="range"
                            min={0}
                            max={200}
                            value={saturation}
                            onChange={(e) => setSaturation(Number(e.target.value))}
                            className="w-full accent-cyan-500"
                        />
                    </div>
                </div>

                {/* Rotation */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setRotation(r => r - 90)}
                        className="px-4 py-2 rounded-xl bg-white/10 text-white"
                    >
                        ↺ Rotate Left
                    </button>
                    <button
                        onClick={() => setRotation(r => r + 90)}
                        className="px-4 py-2 rounded-xl bg-white/10 text-white"
                    >
                        ↻ Rotate Right
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// VIDEO TRIMMER
// ============================================

interface VideoTrimmerProps {
    videoUrl: string;
    maxDuration?: number;
    onSave: (start: number, end: number) => void;
    onCancel: () => void;
}

export function VideoTrimmer({ videoUrl, maxDuration = 60, onSave, onCancel }: VideoTrimmerProps) {
    const [duration, setDuration] = useState(0);
    const [start, setStart] = useState(0);
    const [end, setEnd] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            const dur = videoRef.current.duration;
            setDuration(dur);
            setEnd(Math.min(dur, maxDuration));
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            if (videoRef.current.currentTime >= end) {
                videoRef.current.pause();
                videoRef.current.currentTime = start;
                setIsPlaying(false);
            }
        }
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.currentTime = start;
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const clipDuration = end - start;

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <button onClick={onCancel} className="p-2 rounded-lg hover:bg-white/10 text-white">
                    <CloseIcon size={20} />
                </button>
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-white">Trim Video</h2>
                    <p className="text-xs text-white/60">
                        {formatTime(clipDuration)} / {formatTime(maxDuration)} max
                    </p>
                </div>
                <button
                    onClick={() => onSave(start, end)}
                    disabled={clipDuration > maxDuration}
                    className="px-4 py-2 rounded-xl bg-cyan-500 text-white font-medium disabled:opacity-50"
                >
                    Save
                </button>
            </div>

            {/* Video Preview */}
            <div className="flex-1 flex items-center justify-center p-4">
                <video
                    ref={videoRef}
                    src={videoUrl}
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    className="max-w-full max-h-full"
                />
            </div>

            {/* Controls */}
            <div className="border-t border-white/10 p-4 space-y-4">
                {/* Timeline */}
                <div className="relative h-16 bg-white/5 rounded-xl overflow-hidden">
                    {/* Selected Range */}
                    <div
                        className="absolute h-full bg-cyan-500/30"
                        style={{
                            left: `${(start / duration) * 100}%`,
                            width: `${((end - start) / duration) * 100}%`,
                        }}
                    />

                    {/* Current Position */}
                    <div
                        className="absolute h-full w-0.5 bg-white"
                        style={{ left: `${(currentTime / duration) * 100}%` }}
                    />

                    {/* Handle Controls */}
                    <input
                        type="range"
                        min={0}
                        max={duration}
                        step={0.1}
                        value={start}
                        onChange={(e) => setStart(Math.min(Number(e.target.value), end - 1))}
                        className="absolute w-full h-full opacity-0 cursor-pointer"
                    />
                </div>

                {/* Time Display */}
                <div className="flex items-center justify-between text-sm text-white/60">
                    <span>Start: {formatTime(start)}</span>
                    <button
                        onClick={togglePlay}
                        className="px-6 py-2 rounded-xl bg-white/10 text-white"
                    >
                        {isPlaying ? '⏸ Pause' : '▶ Play'}
                    </button>
                    <span>End: {formatTime(end)}</span>
                </div>

                {/* Range Inputs */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-white/60">Start Time</label>
                        <input
                            type="range"
                            min={0}
                            max={duration}
                            step={0.1}
                            value={start}
                            onChange={(e) => setStart(Math.min(Number(e.target.value), end - 1))}
                            className="w-full accent-cyan-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-white/60">End Time</label>
                        <input
                            type="range"
                            min={0}
                            max={duration}
                            step={0.1}
                            value={end}
                            onChange={(e) => setEnd(Math.max(Number(e.target.value), start + 1))}
                            className="w-full accent-cyan-500"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================
// MEDIA GALLERY GRID
// ============================================

interface MediaGalleryProps {
    items: MediaItem[];
    albums?: Album[];
    onItemClick: (item: MediaItem) => void;
    onAlbumClick?: (album: Album) => void;
    onUpload?: () => void;
    selectable?: boolean;
    selectedIds?: string[];
    onSelect?: (id: string) => void;
}

export function MediaGallery({
    items,
    albums,
    onItemClick,
    onAlbumClick,
    onUpload,
    selectable = false,
    selectedIds = [],
    onSelect
}: MediaGalleryProps) {
    const [view, setView] = useState<'all' | 'photos' | 'videos' | 'albums'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredItems = items.filter(item => {
        if (view === 'photos' && item.type !== 'image') return false;
        if (view === 'videos' && item.type !== 'video') return false;
        if (searchQuery && !item.tags.some(t => t.includes(searchQuery.toLowerCase()))) return false;
        return true;
    });

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by tags..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-cyan-500/50"
                    />
                </div>
                <div className="flex gap-2">
                    {(['all', 'photos', 'videos', 'albums'] as const).map(v => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${view === v
                                    ? 'bg-cyan-500/20 text-cyan-400'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Albums Section */}
            {view === 'albums' && albums && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {albums.map(album => (
                        <button
                            key={album.id}
                            onClick={() => onAlbumClick?.(album)}
                            className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-left"
                        >
                            <div className="aspect-square bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                                {album.coverUrl && (
                                    <img
                                        src={album.coverUrl}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>
                            <div className="p-3">
                                <h3 className="font-medium text-white truncate">{album.name}</h3>
                                <p className="text-xs text-white/50">{album.itemCount} items</p>
                            </div>
                            {album.isPrivate && (
                                <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/50 text-xs text-white">
                                    🔒
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Media Grid */}
            {view !== 'albums' && (
                <>
                    {filteredItems.length === 0 ? (
                        <div className="py-16 text-center">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center text-4xl">
                                📷
                            </div>
                            <h3 className="text-lg font-medium text-white/60 mb-2">No media yet</h3>
                            <p className="text-white/40 mb-4">Upload photos and videos to create memories</p>
                            {onUpload && (
                                <button
                                    onClick={onUpload}
                                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium"
                                >
                                    Upload Media
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                            {filteredItems.map(item => (
                                <motion.button
                                    key={item.id}
                                    onClick={() => selectable ? onSelect?.(item.id) : onItemClick(item)}
                                    className="relative aspect-square overflow-hidden rounded-xl group"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <img
                                        src={item.thumbnailUrl || item.url}
                                        alt={item.altText || ''}
                                        className="w-full h-full object-cover"
                                    />

                                    {/* Overlay */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />

                                    {/* Video Badge */}
                                    {item.type === 'video' && (
                                        <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs flex items-center gap-1">
                                            ▶ {item.duration ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : ''}
                                        </div>
                                    )}

                                    {/* Selection Indicator */}
                                    {selectable && (
                                        <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.includes(item.id)
                                                ? 'bg-cyan-500 border-cyan-500'
                                                : 'border-white/50 group-hover:border-white'
                                            }`}>
                                            {selectedIds.includes(item.id) && (
                                                <CheckCircleIcon size={14} className="text-white" />
                                            )}
                                        </div>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ============================================
// COLLAGE MAKER
// ============================================

interface CollageMakerProps {
    images: string[];
    onSave: (collageUrl: string) => void;
    onCancel: () => void;
}

const COLLAGE_LAYOUTS = [
    { id: '2x1', cols: 2, rows: 1, cells: 2 },
    { id: '1x2', cols: 1, rows: 2, cells: 2 },
    { id: '2x2', cols: 2, rows: 2, cells: 4 },
    { id: '3x1', cols: 3, rows: 1, cells: 3 },
    { id: '3x2', cols: 3, rows: 2, cells: 6 },
];

export function CollageMaker({ images, onSave, onCancel }: CollageMakerProps) {
    const [layout, setLayout] = useState(COLLAGE_LAYOUTS[2]);
    const [cellImages, setCellImages] = useState<(string | null)[]>(
        Array(layout.cells).fill(null).map((_, i) => images[i] || null)
    );

    const handleLayoutChange = (newLayout: typeof COLLAGE_LAYOUTS[0]) => {
        setLayout(newLayout);
        setCellImages(
            Array(newLayout.cells).fill(null).map((_, i) => images[i] || null)
        );
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <button onClick={onCancel} className="p-2 rounded-lg hover:bg-white/10 text-white">
                    <CloseIcon size={20} />
                </button>
                <h2 className="text-lg font-semibold text-white">Create Collage</h2>
                <button
                    onClick={() => onSave('')}
                    className="px-4 py-2 rounded-xl bg-cyan-500 text-white font-medium"
                >
                    Save
                </button>
            </div>

            {/* Preview */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div
                    className="bg-white rounded-lg overflow-hidden shadow-2xl"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
                        gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
                        gap: '4px',
                        width: '400px',
                        height: '400px',
                    }}
                >
                    {cellImages.map((img, i) => (
                        <div key={i} className="bg-gray-200">
                            {img ? (
                                <img src={img} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    +
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Layout Selector */}
            <div className="border-t border-white/10 p-4">
                <p className="text-sm text-white/60 mb-3">Choose Layout</p>
                <div className="flex gap-3">
                    {COLLAGE_LAYOUTS.map(l => (
                        <button
                            key={l.id}
                            onClick={() => handleLayoutChange(l)}
                            className={`p-3 rounded-xl border transition-all ${layout.id === l.id
                                    ? 'bg-cyan-500/20 border-cyan-500/50'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                                }`}
                        >
                            <div
                                className="w-12 h-12"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${l.cols}, 1fr)`,
                                    gridTemplateRows: `repeat(${l.rows}, 1fr)`,
                                    gap: '2px',
                                }}
                            >
                                {Array(l.cells).fill(0).map((_, i) => (
                                    <div key={i} className="bg-white/30 rounded-sm" />
                                ))}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default MediaGallery;
