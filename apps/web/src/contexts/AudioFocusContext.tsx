'use client';

import { createContext, useContext, useCallback, useRef } from 'react';

/**
 * AudioFocusContext — Single-play, single-audio pattern for feed videos.
 *
 * Rules:
 * 1. Only ONE video plays at a time — all other visible videos are paused.
 * 2. When a video enters the viewport (>50% visible), it registers as "visible".
 * 3. The topmost visible video gets focus (plays with audio).
 * 4. When the focused video leaves the viewport, focus transfers to the next topmost.
 * 5. New videos entering while another has focus stay paused.
 * 6. Manual play/unmute on any video immediately steals focus from the current owner.
 *
 * Event-driven: focus changes notify affected components via callbacks (no polling).
 */

interface VideoEntry {
    id: string;
    element: HTMLVideoElement;
    top: number;
    /** Called when this video gains or loses focus */
    onFocusChange?: (hasFocus: boolean) => void;
}

interface AudioFocusContextType {
    /** Register a video as visible. Returns true if this video gets focus. */
    registerVisible: (id: string, element: HTMLVideoElement, onFocusChange?: (hasFocus: boolean) => void) => boolean;
    /** Unregister a video (scrolled out of view or unmounted). */
    unregisterVisible: (id: string) => void;
    /** Manually claim focus (user pressed play/unmute). Pauses the previous owner. */
    claimFocus: (id: string) => void;
    /** Check if a specific video currently has focus. */
    hasFocus: (id: string) => boolean;
    /** Release focus (user pressed mute on the focused video). */
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

    /** Switch focus: pause+mute the old owner, notify both old and new */
    const applyFocus = useCallback((newOwnerId: string | null) => {
        const prevOwner = focusOwnerRef.current;

        // Pause + mute + notify previous owner
        if (prevOwner && prevOwner !== newOwnerId) {
            const prevEntry = visibleRef.current.get(prevOwner);
            if (prevEntry?.element) {
                prevEntry.element.pause();
                prevEntry.element.muted = true;
            }
            // Notify previous owner they lost focus
            prevEntry?.onFocusChange?.(false);
        }

        focusOwnerRef.current = newOwnerId;

        // Notify new owner they gained focus
        if (newOwnerId) {
            const newEntry = visibleRef.current.get(newOwnerId);
            newEntry?.onFocusChange?.(true);
        }
    }, []);

    const reassignFocus = useCallback(() => {
        if (focusOwnerRef.current && visibleRef.current.has(focusOwnerRef.current)) {
            return;
        }
        const topmost = getTopmostVisible();
        applyFocus(topmost ? topmost.id : null);
    }, [getTopmostVisible, applyFocus]);

    const registerVisible = useCallback((id: string, element: HTMLVideoElement, onFocusChange?: (hasFocus: boolean) => void): boolean => {
        const rect = element.getBoundingClientRect();
        visibleRef.current.set(id, { id, element, top: rect.top, onFocusChange });

        if (!focusOwnerRef.current || !visibleRef.current.has(focusOwnerRef.current)) {
            applyFocus(id);
            return true; // You are the focus owner — play
        }

        // Someone else has focus — stay paused
        element.pause();
        element.muted = true;
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
