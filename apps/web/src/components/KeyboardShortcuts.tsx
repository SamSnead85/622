'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// KEYBOARD SHORTCUTS
// Global keyboard shortcut system with guide
// ============================================

interface Shortcut {
    keys: string[];
    label: string;
    description: string;
    category: 'navigation' | 'actions' | 'media' | 'accessibility';
}

const SHORTCUTS: Shortcut[] = [
    // Navigation
    { keys: ['g', 'h'], label: 'Go Home', description: 'Navigate to dashboard', category: 'navigation' },
    { keys: ['g', 'e'], label: 'Explore', description: 'Navigate to explore page', category: 'navigation' },
    { keys: ['g', 'p'], label: 'Profile', description: 'Navigate to your profile', category: 'navigation' },
    { keys: ['g', 'm'], label: 'Messages', description: 'Navigate to messages', category: 'navigation' },
    { keys: ['g', 'n'], label: 'Notifications', description: 'Navigate to notifications', category: 'navigation' },
    { keys: ['g', 's'], label: 'Settings', description: 'Navigate to settings', category: 'navigation' },

    // Actions
    { keys: ['n'], label: 'New Post', description: 'Create a new post', category: 'actions' },
    { keys: ['l'], label: 'Like', description: 'Like current post', category: 'actions' },
    { keys: ['c'], label: 'Comment', description: 'Focus comment input', category: 'actions' },
    { keys: ['r'], label: 'Repost', description: 'Repost current content', category: 'actions' },
    { keys: ['s'], label: 'Save', description: 'Save to collection', category: 'actions' },
    { keys: ['/'], label: 'Search', description: 'Focus search bar', category: 'actions' },
    { keys: ['Escape'], label: 'Close', description: 'Close modal or menu', category: 'actions' },

    // Media
    { keys: ['Space'], label: 'Play/Pause', description: 'Toggle video playback', category: 'media' },
    { keys: ['m'], label: 'Mute', description: 'Toggle audio mute', category: 'media' },
    { keys: ['f'], label: 'Fullscreen', description: 'Toggle fullscreen video', category: 'media' },
    { keys: ['ArrowLeft'], label: 'Seek Back', description: 'Seek video back 10s', category: 'media' },
    { keys: ['ArrowRight'], label: 'Seek Forward', description: 'Seek video forward 10s', category: 'media' },

    // Accessibility
    { keys: ['?'], label: 'Help', description: 'Show keyboard shortcuts', category: 'accessibility' },
    { keys: ['Tab'], label: 'Navigate', description: 'Move focus to next element', category: 'accessibility' },
    { keys: ['Shift', 'Tab'], label: 'Back', description: 'Move focus to previous element', category: 'accessibility' },
];

interface KeyboardShortcutsGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

export function KeyboardShortcutsGuide({ isOpen, onClose }: KeyboardShortcutsGuideProps) {
    const categories = ['navigation', 'actions', 'media', 'accessibility'] as const;
    const categoryLabels = {
        navigation: '🧭 Navigation',
        actions: '⚡ Actions',
        media: '🎬 Media',
        accessibility: '♿ Accessibility',
    };

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
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
                        className="bg-[#1A1A1F] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-white/10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                ⌨️ Keyboard Shortcuts
                            </h2>
                            <button
                                onClick={onClose}
                                className="text-white/40 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {categories.map((category) => (
                                    <div key={category}>
                                        <h3 className="text-sm font-semibold text-white/60 mb-3">
                                            {categoryLabels[category]}
                                        </h3>
                                        <div className="space-y-2">
                                            {SHORTCUTS.filter(s => s.category === category).map((shortcut, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center justify-between py-2"
                                                >
                                                    <span className="text-white/70 text-sm">
                                                        {shortcut.description}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        {shortcut.keys.map((key, j) => (
                                                            <React.Fragment key={j}>
                                                                {j > 0 && (
                                                                    <span className="text-white/30 text-xs">+</span>
                                                                )}
                                                                <kbd className="px-2 py-1 text-xs font-mono bg-white/10 border border-white/20 rounded text-white/80">
                                                                    {key}
                                                                </kbd>
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 border-t border-white/10 bg-white/5">
                            <p className="text-xs text-white/40 text-center">
                                Press <kbd className="px-1 py-0.5 bg-white/10 rounded text-white/60">?</kbd> anywhere to show this guide
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ============================================
// KEYBOARD SHORTCUTS HOOK
// Use this hook to register shortcuts
// ============================================

type ShortcutHandler = () => void;

export function useKeyboardShortcuts(shortcuts: Record<string, ShortcutHandler>) {
    useEffect(() => {
        let keySequence: string[] = [];
        let timeout: NodeJS.Timeout;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            // Clear sequence after delay
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                keySequence = [];
            }, 500);

            keySequence.push(e.key.toLowerCase());
            const sequence = keySequence.join('');

            // Check for matching shortcuts
            for (const [keys, handler] of Object.entries(shortcuts)) {
                if (keys === sequence || keys === e.key.toLowerCase()) {
                    e.preventDefault();
                    handler();
                    keySequence = [];
                    break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
}

// ============================================
// GLOBAL SHORTCUTS PROVIDER
// Wrap app to enable global shortcuts
// ============================================

interface GlobalShortcutsProviderProps {
    children: React.ReactNode;
}

export function GlobalShortcutsProvider({ children }: GlobalShortcutsProviderProps) {
    const [showGuide, setShowGuide] = useState(false);

    useKeyboardShortcuts({
        '?': () => setShowGuide(true),
    });

    return (
        <>
            {children}
            <KeyboardShortcutsGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
        </>
    );
}
