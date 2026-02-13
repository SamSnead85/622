'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface VideoEditorProps {
    videoUrl: string;
    onSave: (editedBlob: Blob) => void;
    onCancel: () => void;
}

interface TextOverlay {
    id: string;
    text: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
}

export function VideoEditor({ videoUrl, onSave, onCancel }: VideoEditorProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [trimStart, setTrimStart] = useState(0);
    const [trimEnd, setTrimEnd] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoaded = () => {
            setDuration(video.duration);
            setTrimEnd(video.duration);
        };
        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime);
            if (video.currentTime >= trimEnd) {
                video.pause();
                video.currentTime = trimStart;
                setIsPlaying(false);
            }
        };

        video.addEventListener('loadedmetadata', handleLoaded);
        video.addEventListener('timeupdate', handleTimeUpdate);
        return () => {
            video.removeEventListener('loadedmetadata', handleLoaded);
            video.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, [trimStart, trimEnd]);

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        if (isPlaying) {
            video.pause();
        } else {
            if (video.currentTime < trimStart || video.currentTime >= trimEnd) {
                video.currentTime = trimStart;
            }
            video.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const addTextOverlay = () => {
        setTextOverlays(prev => [...prev, {
            id: Date.now().toString(),
            text: 'Tap to edit',
            x: 50,
            y: 50,
            fontSize: 24,
            color: '#ffffff',
        }]);
    };

    const handleSave = async () => {
        setIsSaving(true);
        // In a production app, this would use MediaRecorder API to re-encode
        // For now, we pass back the original with metadata
        try {
            const response = await fetch(videoUrl);
            const blob = await response.blob();
            onSave(blob);
        } catch {
            onSave(new Blob([]));
        }
        setIsSaving(false);
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const trimStartPercent = duration > 0 ? (trimStart / duration) * 100 : 0;
    const trimEndPercent = duration > 0 ? (trimEnd / duration) * 100 : 0;

    return (
        <div className="flex flex-col h-full bg-black">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <button onClick={onCancel} className="text-white/60 hover:text-white text-sm">Cancel</button>
                <h2 className="text-white font-semibold">Edit Video</h2>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="text-[#7C8FFF] font-semibold text-sm disabled:opacity-50"
                >
                    {isSaving ? 'Exporting...' : 'Done'}
                </button>
            </div>

            {/* Video preview */}
            <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
                <div className="relative">
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        className="max-w-full max-h-full rounded-lg"
                        playsInline
                        preload="metadata"
                    />

                    {/* Play/pause overlay */}
                    <button
                        onClick={togglePlay}
                        className="absolute inset-0 flex items-center justify-center"
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                        {!isPlaying && (
                            <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
                                <span className="text-3xl ml-1">▶</span>
                            </div>
                        )}
                    </button>

                    {/* Text overlays */}
                    {textOverlays.map((overlay) => (
                        <div
                            key={overlay.id}
                            className="absolute cursor-move select-none"
                            style={{
                                left: `${overlay.x}%`,
                                top: `${overlay.y}%`,
                                transform: 'translate(-50%, -50%)',
                                fontSize: overlay.fontSize,
                                color: overlay.color,
                                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                                fontWeight: 'bold',
                            }}
                            contentEditable
                            suppressContentEditableWarning
                        >
                            {overlay.text}
                        </div>
                    ))}
                </div>
            </div>

            {/* Timeline */}
            <div className="border-t border-white/10 p-4 space-y-3">
                {/* Time display */}
                <div className="flex justify-between text-xs text-white/40">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>

                {/* Trim timeline */}
                <div className="relative h-12 bg-white/5 rounded-lg overflow-hidden">
                    {/* Trim region */}
                    <div
                        className="absolute top-0 bottom-0 bg-[#7C8FFF]/10 border-x-2 border-[#7C8FFF]"
                        style={{
                            left: `${trimStartPercent}%`,
                            width: `${trimEndPercent - trimStartPercent}%`,
                        }}
                    />

                    {/* Playhead */}
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white"
                        style={{ left: `${progress}%` }}
                    />

                    {/* Trim handles */}
                    <input
                        type="range"
                        min={0}
                        max={duration}
                        step={0.1}
                        value={trimStart}
                        onChange={(e) => {
                            const v = Number(e.target.value);
                            if (v < trimEnd - 0.5) setTrimStart(v);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        aria-label="Trim start"
                    />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={addTextOverlay}
                        className="px-4 py-2 rounded-lg bg-white/10 text-white/70 text-sm hover:bg-white/15"
                    >
                        + Text
                    </button>
                    <button className="px-4 py-2 rounded-lg bg-white/10 text-white/70 text-sm hover:bg-white/15">
                        Trim: {formatTime(trimStart)} - {formatTime(trimEnd)}
                    </button>
                </div>
            </div>
        </div>
    );
}
