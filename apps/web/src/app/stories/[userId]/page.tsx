'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon, HeartIcon, SendIcon } from '@/components/icons';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/lib/api';

interface Story {
    id: string;
    type: 'IMAGE' | 'VIDEO' | 'TEXT';
    mediaUrl: string;
    thumbnailUrl?: string;
    caption?: string;
    viewCount: number;
    createdAt: string;
    expiresAt: string;
    user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
    };
}

interface UserWithStories {
    user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
    };
    stories: Story[];
}

export default function StoriesViewerPage() {
    const params = useParams();
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const userId = params.userId as string;

    const [usersWithStories, setUsersWithStories] = useState<UserWithStories[]>([]);
    const [currentUserIndex, setCurrentUserIndex] = useState(0);
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [reply, setReply] = useState('');
    const [isLiked, setIsLiked] = useState(false);

    const STORY_DURATION = 5000; // 5 seconds per story

    // Fetch all stories
    useEffect(() => {
        const fetchStories = async () => {
            try {
                const token = localStorage.getItem('0g_token');
                const response = await fetch(`${API_URL}/api/v1/moments`, {
                    headers: {
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    const moments = data.moments || [];

                    // Group by user
                    const grouped: Record<string, UserWithStories> = {};
                    for (const moment of moments) {
                        if (!grouped[moment.user.id]) {
                            grouped[moment.user.id] = {
                                user: moment.user,
                                stories: [],
                            };
                        }
                        grouped[moment.user.id].stories.push(moment);
                    }

                    const usersArray = Object.values(grouped);
                    setUsersWithStories(usersArray);

                    // Find initial user index
                    const startIndex = usersArray.findIndex(u => u.user.id === userId);
                    if (startIndex >= 0) {
                        setCurrentUserIndex(startIndex);
                    }
                }
            } catch (err) {
                console.error('Error fetching stories:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStories();
    }, [userId, API_URL]);

    const currentUserStories = usersWithStories[currentUserIndex];
    const currentStory = currentUserStories?.stories[currentStoryIndex];

    // Mark story as viewed
    useEffect(() => {
        if (currentStory && isAuthenticated) {
            const token = localStorage.getItem('0g_token');
            fetch(`${API_URL}/api/v1/moments/${currentStory.id}/view`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            }).catch(console.error);
        }
        // Reset like state when story changes
        setIsLiked(false);
    }, [currentStory, isAuthenticated, API_URL]);

    // Handle like on current story (creates a like via posts API since moments are posts)
    const handleLikeStory = async () => {
        if (!currentStory || !isAuthenticated) return;
        const token = localStorage.getItem('0g_token');
        setIsLiked(true);
        try {
            await fetch(`${API_URL}/api/v1/posts/${currentStory.id}/like`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });
        } catch (err) {
            console.error('Failed to like story:', err);
            setIsLiked(false);
        }
    };

    // Handle reply to story (sends a DM to the story author)
    const handleSendReply = async () => {
        if (!reply.trim() || !currentStory || !isAuthenticated) return;
        const token = localStorage.getItem('0g_token');
        try {
            // Create or get conversation with the story author
            const convRes = await fetch(`${API_URL}/api/v1/messages/conversations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ participantIds: [currentStory.user.id] }),
            });
            if (convRes.ok) {
                const convData = await convRes.json();
                const conversationId = convData.conversation?.id || convData.id;
                if (conversationId) {
                    await fetch(`${API_URL}/api/v1/messages/conversations/${conversationId}/messages`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ content: `Replied to your story: ${reply}` }),
                    });
                }
            }
            setReply('');
        } catch (err) {
            console.error('Failed to send reply:', err);
        }
    };



    const goToNextStory = useCallback(() => {
        if (!currentUserStories) return;

        if (currentStoryIndex < currentUserStories.stories.length - 1) {
            setCurrentStoryIndex(prev => prev + 1);
            setProgress(0);
        } else if (currentUserIndex < usersWithStories.length - 1) {
            setCurrentUserIndex(prev => prev + 1);
            setCurrentStoryIndex(0);
            setProgress(0);
        } else {
            router.push('/dashboard');
        }
    }, [currentStoryIndex, currentUserIndex, usersWithStories.length, currentUserStories, router]);

    const goToPreviousStory = useCallback(() => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(prev => prev - 1);
            setProgress(0);
        } else if (currentUserIndex > 0) {
            setCurrentUserIndex(prev => prev - 1);
            setCurrentStoryIndex(usersWithStories[currentUserIndex - 1]?.stories.length - 1 || 0);
            setProgress(0);
        }
    }, [currentStoryIndex, currentUserIndex, usersWithStories]);

    // Progress timer (Moved here to avoid hoisting issues)
    useEffect(() => {
        if (!currentStory || isPaused) return;

        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    goToNextStory();
                    return 0;
                }
                return prev + (100 / (STORY_DURATION / 100));
            });
        }, 100);

        return () => clearInterval(interval);
    }, [currentStory, isPaused, goToNextStory]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') goToNextStory();
        if (e.key === 'ArrowLeft') goToPreviousStory();
        if (e.key === 'Escape') router.push('/dashboard');
        if (e.key === ' ') setIsPaused(prev => !prev);
    }, [goToNextStory, goToPreviousStory, router]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            </div>
        );
    }

    if (!currentStory) {
        return (
            <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white">
                <div className="text-6xl mb-4">📸</div>
                <h1 className="text-2xl font-bold mb-2">No Stories</h1>
                <p className="text-white/60 mb-6">This user hasn&apos;t shared any stories yet.</p>
                <Link
                    href="/dashboard"
                    className="px-6 py-3 rounded-xl bg-[#D4AF37] text-black font-semibold"
                >
                    Back to Feed
                </Link>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 bg-black flex items-center justify-center"
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
        >
            {/* Close button */}
            <button
                onClick={() => router.push('/dashboard')}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
                <CloseIcon size={24} className="text-white" />
            </button>

            {/* Navigation arrows */}
            {(currentUserIndex > 0 || currentStoryIndex > 0) && (
                <button
                    onClick={goToPreviousStory}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                >
                    <ChevronLeftIcon size={32} className="text-white" />
                </button>
            )}

            {(currentUserIndex < usersWithStories.length - 1 || currentStoryIndex < currentUserStories.stories.length - 1) && (
                <button
                    onClick={goToNextStory}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                >
                    <ChevronRightIcon size={32} className="text-white" />
                </button>
            )}

            {/* Story content */}
            <div className="relative w-full max-w-[420px] h-full max-h-[90vh] mx-auto">
                {/* Progress bars */}
                <div className="absolute top-4 left-4 right-4 z-40 flex gap-1">
                    {currentUserStories.stories.map((_, idx) => (
                        <div
                            key={idx}
                            className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden"
                        >
                            <div
                                className="h-full bg-white rounded-full transition-all duration-100"
                                style={{
                                    width: idx < currentStoryIndex ? '100%' :
                                        idx === currentStoryIndex ? `${progress}%` : '0%'
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* User info */}
                <div className="absolute top-8 left-4 right-4 z-40 flex items-center gap-3">
                    <Link href={`/profile/${currentStory.user.username}`}>
                        {currentStory.user.avatarUrl ? (
                            <div className="relative w-10 h-10 rounded-full border-2 border-white overflow-hidden">
                                <Image
                                    src={currentStory.user.avatarUrl}
                                    alt={currentStory.user.displayName}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8942D] flex items-center justify-center text-black font-bold border-2 border-white">
                                {currentStory.user.displayName?.[0] || 'U'}
                            </div>
                        )}
                    </Link>
                    <div className="flex-1">
                        <Link
                            href={`/profile/${currentStory.user.username}`}
                            className="font-semibold text-white text-sm hover:underline"
                        >
                            {currentStory.user.displayName}
                        </Link>
                        <div className="text-white/60 text-xs">
                            {getTimeAgo(currentStory.createdAt)}
                        </div>
                    </div>
                </div>

                {/* Story media */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStory.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative w-full h-full rounded-2xl overflow-hidden"
                    >
                        {currentStory.type === 'VIDEO' ? (
                            <video
                                src={currentStory.mediaUrl}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <Image
                                src={currentStory.mediaUrl}
                                alt=""
                                fill
                                className="object-cover"
                            />
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Caption */}
                {currentStory.caption && (
                    <div className="absolute bottom-24 left-4 right-4 z-40">
                        <p className="text-white text-sm bg-black/50 backdrop-blur-sm rounded-lg p-3">
                            {currentStory.caption}
                        </p>
                    </div>
                )}

                {/* Reply input */}
                {isAuthenticated && currentStory.user.id !== user?.id && (
                    <div className="absolute bottom-4 left-4 right-4 z-40">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={reply}
                                onChange={(e) => setReply(e.target.value)}
                                placeholder={`Reply to ${currentStory.user.displayName}...`}
                                className="flex-1 bg-white/10 backdrop-blur-sm rounded-full px-4 py-3 text-white text-sm placeholder:text-white/50 border border-white/20 focus:border-white/40 focus:outline-none"
                                onFocus={() => setIsPaused(true)}
                                onBlur={() => setIsPaused(false)}
                            />
                            <button
                                onClick={(e) => { e.stopPropagation(); handleLikeStory(); }}
                                className={`p-3 rounded-full backdrop-blur-sm border transition-colors ${isLiked ? 'bg-rose-500/30 border-rose-500/50' : 'bg-white/10 border-white/20 hover:bg-white/20'}`}
                            >
                                <HeartIcon size={20} className={isLiked ? 'text-rose-500 fill-current' : 'text-white'} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleSendReply(); }}
                                disabled={!reply.trim()}
                                className="p-3 rounded-full bg-[#D4AF37] hover:opacity-90 transition-opacity disabled:opacity-40"
                            >
                                <SendIcon size={20} className="text-black" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Tap zones */}
                <div className="absolute inset-0 z-30 flex">
                    <div className="w-1/3 h-full" onClick={goToPreviousStory} />
                    <div className="w-1/3 h-full" />
                    <div className="w-1/3 h-full" onClick={goToNextStory} />
                </div>
            </div>
        </div >
    );
}

function getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
}
