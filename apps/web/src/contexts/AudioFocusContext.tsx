'use client';

import { createContext, useContext, useCallback, useRef, useEffect } from 'react';

/**
 * AudioFocusContext — All-play, single-audio pattern for feed videos.
 *
 * Behavior:
 * 1. ALL visible videos autoplay — no click required.
 * 2. The TOPMOST visible video plays WITH AUDIO (unmuted).
 * 3. All other visible videos play MUTED.
 * 4. When the user scrolls, the new topmost video gets audio;
 *    the previous one just gets muted but KEEPS playing.
 * 5. Manual unmute on any video steals audio focus from the current owner.
 * 6. Manual pause only pauses that specific video — others keep playing.
 *
 * Browser autoplay policy: browsers block unmuted autoplay until the user
 * interacts with the page. We start muted, then unmute the focused video
 * as soon as the first interaction (scroll, click, tap) happens.
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
    const userInteractedRef = useRef(false);

    // After the first user interaction, unmute whichever video has audio focus.
    // Browsers require at least one click/tap/scroll before allowing unmuted playback.
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleInteraction = () => {
            if (userInteractedRef.current) return;
            userInteractedRef.current = true;

            // Unmute the currently focused video now that the browser allows it
            const ownerId = focusOwnerRef.current;
            if (ownerId) {
                const entry = visibleRef.current.get(ownerId);
                if (entry?.element) {
                    entry.element.muted = false;
                    entry.onAudioFocusChange?.(true);
                }
            }

            // Clean up — we only need the first interaction
            window.removeEventListener('click', handleInteraction, true);
            window.removeEventListener('touchstart', handleInteraction, true);
            window.removeEventListener('scroll', handleInteraction, true);
            window.removeEventListener('keydown', handleInteraction, true);
        };

        window.addEventListener('click', handleInteraction, true);
        window.addEventListener('touchstart', handleInteraction, true);
        window.addEventListener('scroll', handleInteraction, true);
        window.addEventListener('keydown', handleInteraction, true);

        return () => {
            window.removeEventListener('click', handleInteraction, true);
            window.removeEventListener('touchstart', handleInteraction, true);
            window.removeEventListener('scroll', handleInteraction, true);
            window.removeEventListener('keydown', handleInteraction, true);
        };
    }, []);

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
            // Return true (unmuted) only if user has already interacted with the page;
            // otherwise the browser will reject unmuted autoplay anyway.
            return userInteractedRef.current;
        }

        // Someone else has audio — this video should still PLAY (muted)
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
