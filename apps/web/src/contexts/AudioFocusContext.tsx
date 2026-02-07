'use client';

import { createContext, useContext, useCallback, useRef } from 'react';

/**
 * AudioFocusContext — Single-audio-owner pattern for feed videos.
 *
 * Rules:
 * 1. Only ONE video plays with audio at a time.
 * 2. When a video enters the viewport (>50% visible), it registers as "visible".
 * 3. The topmost visible video gets audio focus.
 * 4. When the focused video leaves the viewport, focus transfers to the next topmost.
 * 5. New videos entering while another has focus play muted — they only get audio
 *    when the current owner leaves the viewport or the user taps to unmute manually.
 * 6. Manual unmute on any video immediately steals focus from the current owner.
 */

interface VideoEntry {
    id: string;
    element: HTMLVideoElement;
    top: number; // viewport top position at registration
}

interface AudioFocusContextType {
    /** Register a video as visible in the viewport. Returns true if this video should have audio. */
    registerVisible: (id: string, element: HTMLVideoElement) => boolean;
    /** Unregister a video (scrolled out of view or unmounted). */
    unregisterVisible: (id: string) => void;
    /** Manually claim audio focus (user tapped unmute). */
    claimFocus: (id: string) => void;
    /** Check if a specific video currently has audio focus. */
    hasFocus: (id: string) => boolean;
    /** Release focus (user tapped mute on the focused video). */
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
    // Map of currently visible videos
    const visibleRef = useRef<Map<string, VideoEntry>>(new Map());
    // Current audio focus owner ID
    const focusOwnerRef = useRef<string | null>(null);

    const getTopmostVisible = useCallback((): VideoEntry | null => {
        let topmost: VideoEntry | null = null;
        visibleRef.current.forEach((entry) => {
            // Re-measure position
            const rect = entry.element.getBoundingClientRect();
            entry.top = rect.top;
            if (!topmost || rect.top < topmost.top) {
                topmost = entry;
            }
        });
        return topmost;
    }, []);

    const applyFocus = useCallback((newOwnerId: string | null) => {
        const prevOwner = focusOwnerRef.current;

        // Mute previous owner if different
        if (prevOwner && prevOwner !== newOwnerId) {
            const prevEntry = visibleRef.current.get(prevOwner);
            if (prevEntry && prevEntry.element) {
                prevEntry.element.muted = true;
            }
        }

        focusOwnerRef.current = newOwnerId;

        // Unmute new owner
        if (newOwnerId) {
            const newEntry = visibleRef.current.get(newOwnerId);
            if (newEntry && newEntry.element) {
                newEntry.element.muted = false;
            }
        }
    }, []);

    const reassignFocus = useCallback(() => {
        // If current focus owner is still visible, keep them
        if (focusOwnerRef.current && visibleRef.current.has(focusOwnerRef.current)) {
            return;
        }
        // Otherwise, assign to topmost visible
        const topmost = getTopmostVisible();
        applyFocus(topmost ? topmost.id : null);
    }, [getTopmostVisible, applyFocus]);

    const registerVisible = useCallback((id: string, element: HTMLVideoElement): boolean => {
        const rect = element.getBoundingClientRect();
        visibleRef.current.set(id, { id, element, top: rect.top });

        // If no one has focus, this video gets it
        if (!focusOwnerRef.current || !visibleRef.current.has(focusOwnerRef.current)) {
            applyFocus(id);
            return true;
        }

        // Someone else has focus — this video plays muted
        element.muted = true;
        return false;
    }, [applyFocus]);

    const unregisterVisible = useCallback((id: string) => {
        visibleRef.current.delete(id);

        // If this was the focus owner, reassign
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
            if (entry) {
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
