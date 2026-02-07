'use client';

import { createContext, useContext, useCallback, useRef } from 'react';

/**
 * AudioFocusContext — All-play, single-audio pattern for feed videos.
 *
 * New behavior:
 * 1. ALL visible videos autoplay (muted by default) — no click required.
 * 2. Only the TOPMOST visible video gets audio (unmuted).
 * 3. When the user scrolls, the new topmost video gets unmuted;
 *    the previous one just gets muted but KEEPS playing.
 * 4. Manual unmute on any video steals audio focus from the current owner.
 * 5. Manual pause only pauses that specific video — others keep playing.
 *
 * Event-driven: focus changes notify components via callbacks (no polling).
 */

interface VideoEntry {
    id: string;
    element: HTMLVideoElement;
    top: number;
    /** Called when this video gains or loses AUDIO focus (not play/pause) */
    onAudioFocusChange?: (hasAudio: boolean) => void;
}

interface AudioFocusContextType {
    /** Register a video as visible. Returns true if this video gets AUDIO focus. */
    registerVisible: (id: string, element: HTMLVideoElement, onAudioFocusChange?: (hasAudio: boolean) => void) => boolean;
    /** Unregister a video (scrolled out of view or unmounted). */
    unregisterVisible: (id: string) => void;
    /** Manually claim audio focus (user tapped unmute). Mutes the previous owner. */
    claimFocus: (id: string) => void;
    /** Check if a specific video currently has audio focus. */
    hasFocus: (id: string) => boolean;
    /** Release audio focus (user muted the focused video). */
    releaseFocus: (id: string) => void;
}

const AudioFocusContext = createContext<AudioFocusContextType>({
    registerVisible: () => false,
    unregisterVisible: () => {},
    claimFocus: () => {},
    hasFocus: () => false,
    releaseFocus: () => {},
});

export function useAudioFocus() {
    return useContext(AudioFocusContext);
}

export function AudioFocusProvider({ children }: { children: React.ReactNode }) {
    const visibleRef = useRef<Map<string, VideoEntry>>(new Map());
    const focusOwnerRef = useRef<string | null>(null);

    const getTopmostVisible = useCallback((): VideoEntry | null => {
        let topmost: VideoEntry | null = null;
        visibleRef.current.forEach((entry) => {
            const rect = entry.element.getBoundingClientRect();
            entry.top = rect.top;
            if (!topmost || rect.top < topmost.top) {
                topmost = entry;
            }
        });
        return topmost;
    }, []);

    /** Switch AUDIO focus: mute the old owner, unmute notification to new owner */
    const applyFocus = useCallback((newOwnerId: string | null) => {
        const prevOwner = focusOwnerRef.current;

        // Mute previous audio owner (but do NOT pause — it keeps playing muted)
        if (prevOwner && prevOwner !== newOwnerId) {
            const prevEntry = visibleRef.current.get(prevOwner);
            if (prevEntry?.element) {
                prevEntry.element.muted = true;
            }
            prevEntry?.onAudioFocusChange?.(false);
        }

        focusOwnerRef.current = newOwnerId;

        // Notify new owner they gained audio focus
        if (newOwnerId) {
            const newEntry = visibleRef.current.get(newOwnerId);
            newEntry?.onAudioFocusChange?.(true);
        }
    }, []);

    const reassignFocus = useCallback(() => {
        if (focusOwnerRef.current && visibleRef.current.has(focusOwnerRef.current)) {
            return; // Current owner is still visible
        }
        const topmost = getTopmostVisible();
        applyFocus(topmost ? topmost.id : null);
    }, [getTopmostVisible, applyFocus]);

    const registerVisible = useCallback((id: string, element: HTMLVideoElement, onAudioFocusChange?: (hasAudio: boolean) => void): boolean => {
        const rect = element.getBoundingClientRect();
        visibleRef.current.set(id, { id, element, top: rect.top, onAudioFocusChange });

        // If nobody has audio focus, give it to this video
        if (!focusOwnerRef.current || !visibleRef.current.has(focusOwnerRef.current)) {
            applyFocus(id);
            return true; // You get audio focus
        }

        // Someone else has audio — this video should still PLAY (muted)
        // The component handles autoplay; we just return false for "no audio"
        return false;
    }, [applyFocus]);

    const unregisterVisible = useCallback((id: string) => {
        visibleRef.current.delete(id);

        if (focusOwnerRef.current === id) {
            focusOwnerRef.current = null;
            reassignFocus();
        }
    }, [reassignFocus]);

    const claimFocus = useCallback((id: string) => {
        if (visibleRef.current.has(id)) {
            applyFocus(id);
        }
    }, [applyFocus]);

    const hasFocus = useCallback((id: string): boolean => {
        return focusOwnerRef.current === id;
    }, []);

    const releaseFocus = useCallback((id: string) => {
        if (focusOwnerRef.current === id) {
            const entry = visibleRef.current.get(id);
            if (entry?.element) {
                entry.element.muted = true;
            }
            focusOwnerRef.current = null;
            // Don't auto-reassign — user intentionally muted
        }
    }, []);

    return (
        <AudioFocusContext.Provider value={{ registerVisible, unregisterVisible, claimFocus, hasFocus, releaseFocus }}>
            {children}
        </AudioFocusContext.Provider>
    );
}
