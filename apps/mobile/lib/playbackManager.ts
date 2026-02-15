// ============================================
// Global Playback Manager
// ============================================
//
// Coordinates video/audio playback across the entire app.
// Ensures only one video plays at a time and all playback
// stops when navigating between screens or backgrounding.
//
// Inspired by Instagram's approach: only the visible video
// in the active screen plays; everything else is paused.

type PlayerLike = {
    pause: () => void;
    play?: () => void;
    muted?: boolean;
};

type PlaybackEntry = {
    player: PlayerLike;
    screenId: string;
};

class PlaybackManager {
    private activeEntries: Map<string, PlaybackEntry> = new Map();
    private activeScreenId: string | null = null;

    /**
     * Register a video player with a unique key and screen identifier.
     * When a player is registered, all players from OTHER screens are paused.
     */
    register(key: string, player: PlayerLike, screenId: string): void {
        this.activeEntries.set(key, { player, screenId });
    }

    /**
     * Unregister a player (e.g., when component unmounts).
     */
    unregister(key: string): void {
        this.activeEntries.delete(key);
    }

    /**
     * Set the currently active screen. Pauses all players
     * that don't belong to this screen.
     */
    setActiveScreen(screenId: string): void {
        this.activeScreenId = screenId;
        this.pauseAllExcept(screenId);
    }

    /**
     * Pause ALL players across the entire app.
     * Used when navigating to a non-media screen (e.g., profile, settings)
     * or when the app goes to background.
     */
    pauseAll(): void {
        this.activeEntries.forEach(({ player }) => {
            try {
                player.pause();
                if (player.muted !== undefined) {
                    player.muted = true;
                }
            } catch {
                // Player may have been released
            }
        });
    }

    /**
     * Pause all players except those on the given screen.
     */
    pauseAllExcept(screenId: string): void {
        this.activeEntries.forEach(({ player, screenId: entryScreen }) => {
            if (entryScreen !== screenId) {
                try {
                    player.pause();
                    if (player.muted !== undefined) {
                        player.muted = true;
                    }
                } catch {
                    // Player may have been released
                }
            }
        });
    }

    /**
     * Get the currently active screen ID.
     */
    getActiveScreen(): string | null {
        return this.activeScreenId;
    }

    /**
     * Clear all entries (e.g., on logout).
     */
    clear(): void {
        this.pauseAll();
        this.activeEntries.clear();
        this.activeScreenId = null;
    }
}

// Singleton instance
export const playbackManager = new PlaybackManager();
