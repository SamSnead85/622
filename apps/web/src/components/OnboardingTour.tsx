'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// ONBOARDING TOUR
// Interactive guide for new users
// ============================================

interface TourStep {
    id: string;
    title: string;
    description: string;
    emoji: string;
    targetSelector?: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
    {
        id: 'welcome',
        title: 'Welcome to 0G! 🚀',
        description: 'The weightless social network where your voice matters. Let us show you around.',
        emoji: '👋',
    },
    {
        id: 'feed',
        title: 'Your Feed',
        description: 'This is your home. See posts from people you follow and discover trending content.',
        emoji: '📱',
        targetSelector: '.feed-container',
    },
    {
        id: 'create',
        title: 'Share Your Story',
        description: 'Tap the + button to share photos, videos, or thoughts with your community.',
        emoji: '✨',
        targetSelector: '[data-tour="create"]',
    },
    {
        id: 'explore',
        title: 'Explore & Discover',
        description: 'Find new people, trending topics, and tribes that match your interests.',
        emoji: '🔍',
        targetSelector: '[data-tour="explore"]',
    },
    {
        id: 'tribes',
        title: 'Join Tribes',
        description: 'Connect with communities that share your passions and values.',
        emoji: '👥',
        targetSelector: '[data-tour="tribes"]',
    },
    {
        id: 'messages',
        title: 'Direct Messages',
        description: 'Have private conversations with friends and connections.',
        emoji: '💬',
        targetSelector: '[data-tour="messages"]',
    },
    {
        id: 'profile',
        title: 'Your Profile',
        description: 'Customize your profile, view your posts, and manage your settings.',
        emoji: '👤',
        targetSelector: '[data-tour="profile"]',
    },
    {
        id: 'complete',
        title: "You're Ready!",
        description: 'Start connecting, sharing, and building your community. Welcome to 0G!',
        emoji: '🎉',
    },
];

const TOUR_KEY = '0g_onboarding_complete';

interface OnboardingTourProps {
    forceShow?: boolean;
    onComplete?: () => void;
}

export function OnboardingTour({ forceShow = false, onComplete }: OnboardingTourProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        if (forceShow) {
            setIsOpen(true);
            setCurrentStep(0);
            return;
        }

        // Check if tour was completed
        const completed = localStorage.getItem(TOUR_KEY);
        if (!completed) {
            // Show tour for new users after short delay
            const timer = setTimeout(() => setIsOpen(true), 1000);
            return () => clearTimeout(timer);
        }
    }, [forceShow]);

    const handleNext = useCallback(() => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    }, [currentStep]);

    const handlePrev = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep]);

    const handleComplete = useCallback(() => {
        localStorage.setItem(TOUR_KEY, 'true');
        setIsOpen(false);
        onComplete?.();
    }, [onComplete]);

    const handleSkip = useCallback(() => {
        localStorage.setItem(TOUR_KEY, 'true');
        setIsOpen(false);
    }, []);

    const step = TOUR_STEPS[currentStep];
    const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
                >
                    <motion.div
                        key={step.id}
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: -20, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="bg-[#1A1A1F] rounded-3xl w-full max-w-md overflow-hidden border border-white/10"
                    >
                        {/* Progress Bar */}
                        <div className="h-1 bg-white/10">
                            <motion.div
                                className="h-full bg-gradient-to-r from-[#7C8FFF] to-[#6070EE]"
                                initial={false}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>

                        {/* Content */}
                        <div className="p-8 text-center">
                            <motion.div
                                key={step.emoji}
                                initial={{ scale: 0, rotate: -20 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className="text-6xl mb-6"
                            >
                                {step.emoji}
                            </motion.div>

                            <h2 className="text-2xl font-bold text-white mb-3">
                                {step.title}
                            </h2>

                            <p className="text-white/60 leading-relaxed">
                                {step.description}
                            </p>
                        </div>

                        {/* Navigation */}
                        <div className="p-6 pt-0 flex items-center justify-between">
                            <button
                                onClick={handleSkip}
                                className="text-white/40 hover:text-white text-sm transition-colors"
                            >
                                Skip tour
                            </button>

                            <div className="flex items-center gap-2">
                                {/* Step indicators */}
                                <div className="flex gap-1.5 mr-4">
                                    {TOUR_STEPS.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentStep(i)}
                                            className={`w-2 h-2 rounded-full transition-colors ${i === currentStep
                                                    ? 'bg-[#7C8FFF]'
                                                    : i < currentStep
                                                        ? 'bg-[#7C8FFF]/50'
                                                        : 'bg-white/20'
                                                }`}
                                        />
                                    ))}
                                </div>

                                {currentStep > 0 && (
                                    <button
                                        onClick={handlePrev}
                                        className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition-colors"
                                    >
                                        Back
                                    </button>
                                )}

                                <button
                                    onClick={handleNext}
                                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#7C8FFF] to-[#6070EE] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                                >
                                    {currentStep === TOUR_STEPS.length - 1 ? 'Get Started' : 'Next'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ============================================
// EMPTY STATE ILLUSTRATIONS
// Premium empty states for various scenarios
// ============================================

interface EmptyStateProps {
    type: 'posts' | 'messages' | 'notifications' | 'search' | 'collections' | 'followers' | 'following';
    title?: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

const EMPTY_STATES: Record<EmptyStateProps['type'], { emoji: string; defaultTitle: string; defaultDescription: string }> = {
    posts: {
        emoji: '📱',
        defaultTitle: 'No posts yet',
        defaultDescription: 'Share your first post and start connecting with others.',
    },
    messages: {
        emoji: '💬',
        defaultTitle: 'No messages',
        defaultDescription: 'Start a conversation with someone from your network.',
    },
    notifications: {
        emoji: '🔔',
        defaultTitle: 'All caught up!',
        defaultDescription: "You've seen all your notifications.",
    },
    search: {
        emoji: '🔍',
        defaultTitle: 'No results found',
        defaultDescription: 'Try different keywords or check for typos.',
    },
    collections: {
        emoji: '📚',
        defaultTitle: 'No saved posts',
        defaultDescription: 'Save posts you want to revisit later.',
    },
    followers: {
        emoji: '👥',
        defaultTitle: 'No followers yet',
        defaultDescription: 'Share great content to attract followers.',
    },
    following: {
        emoji: '🌟',
        defaultTitle: 'Not following anyone',
        defaultDescription: 'Follow people to see their posts in your feed.',
    },
};

export function EmptyState({ type, title, description, action }: EmptyStateProps) {
    const state = EMPTY_STATES[type];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 px-8 text-center"
        >
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#7C8FFF]/20 to-[#6070EE]/20 flex items-center justify-center mb-6"
            >
                <span className="text-4xl">{state.emoji}</span>
            </motion.div>

            <h3 className="text-xl font-semibold text-white mb-2">
                {title || state.defaultTitle}
            </h3>

            <p className="text-white/50 max-w-xs leading-relaxed">
                {description || state.defaultDescription}
            </p>

            {action && (
                <button
                    onClick={action.onClick}
                    className="mt-6 px-6 py-2.5 rounded-xl bg-[#7C8FFF] text-white font-medium hover:opacity-90 transition-opacity"
                >
                    {action.label}
                </button>
            )}
        </motion.div>
    );
}

// Helper to reset tour (for testing)
export function resetOnboardingTour() {
    localStorage.removeItem(TOUR_KEY);
}
