'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckIcon, SparklesIcon } from '@/components/icons';

interface Topic {
    id: string;
    slug: string;
    name: string;
    description: string;
    icon: string;
    color: string;
}

interface InterestSelectorProps {
    onComplete: (selectedTopicIds: string[]) => void;
    onSkip?: () => void;
}

export default function InterestSelector({ onComplete, onSkip }: InterestSelectorProps) {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchTopics();
    }, []);

    const fetchTopics = async () => {
        try {
            const response = await fetch('/api/v1/topics');
            const data = await response.json();
            setTopics(data.topics);
        } catch (error) {
            console.error('Failed to fetch topics:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleTopic = (topicId: string) => {
        const newSelected = new Set(selected);
        if (newSelected.has(topicId)) {
            newSelected.delete(topicId);
        } else {
            newSelected.add(topicId);
        }
        setSelected(newSelected);
    };

    const handleContinue = async () => {
        if (selected.size === 0) {
            if (onSkip) onSkip();
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            await fetch('/api/v1/topics/user/interests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    topicIds: Array.from(selected),
                    level: 'INTERESTED',
                }),
            });

            onComplete(Array.from(selected));
        } catch (error) {
            console.error('Failed to save interests:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 border-4 border-[#7C8FFF] border-t-transparent rounded-full"
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 opacity-30">
                <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-[#7C8FFF]/20 via-[#6070EE]/20 to-[#EC4899]/20"
                    animate={{
                        backgroundPosition: ['0% 0%', '100% 100%'],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        repeatType: 'reverse',
                    }}
                />
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', duration: 0.6 }}
                        className="inline-flex items-center gap-2 mb-4"
                    >
                        <SparklesIcon size={32} className="text-[#7C8FFF]" />
                    </motion.div>

                    <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#7C8FFF] via-[#6070EE] to-[#EC4899] bg-clip-text text-transparent">
                        What interests you?
                    </h1>

                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Choose topics to personalize your feed. You can always change these later.
                    </p>

                    {/* Selection Counter */}
                    <motion.div
                        className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10"
                        animate={selected.size > 0 ? { scale: [1, 1.05, 1] } : {}}
                    >
                        <span className="text-sm text-gray-400">
                            {selected.size === 0 ? 'Select at least 3' : `${selected.size} selected`}
                        </span>
                        {selected.size >= 3 && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-5 h-5 rounded-full bg-gradient-to-r from-[#7C8FFF] to-[#6070EE] flex items-center justify-center"
                            >
                                <CheckIcon size={12} />
                            </motion.div>
                        )}
                    </motion.div>
                </motion.div>

                {/* Topics Grid */}
                <motion.div
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12"
                    initial="hidden"
                    animate="show"
                    variants={{
                        hidden: { opacity: 0 },
                        show: {
                            opacity: 1,
                            transition: {
                                staggerChildren: 0.05,
                            },
                        },
                    }}
                >
                    {topics.map((topic) => {
                        const isSelected = selected.has(topic.id);

                        return (
                            <motion.button
                                key={topic.id}
                                onClick={() => toggleTopic(topic.id)}
                                variants={{
                                    hidden: { opacity: 0, y: 20 },
                                    show: { opacity: 1, y: 0 },
                                }}
                                whileHover={{ scale: 1.05, y: -5 }}
                                whileTap={{ scale: 0.95 }}
                                className="relative group"
                            >
                                {/* Card */}
                                <div
                                    className={`
                    relative overflow-hidden rounded-2xl p-6 h-full
                    transition-all duration-300
                    ${isSelected
                                            ? 'bg-gradient-to-br shadow-2xl'
                                            : 'bg-white/5 hover:bg-white/10 border border-white/10'
                                        }
                  `}
                                    style={isSelected ? {
                                        background: `linear-gradient(135deg, ${topic.color}40 0%, ${topic.color}20 100%)`,
                                        borderColor: topic.color,
                                        borderWidth: '2px',
                                        boxShadow: `0 0 30px ${topic.color}40`,
                                    } : undefined}
                                >
                                    {/* Icon */}
                                    <motion.div
                                        className="text-5xl mb-3"
                                        animate={isSelected ? { rotate: [0, -10, 10, -10, 0] } : {}}
                                        transition={{ duration: 0.5 }}
                                    >
                                        {topic.icon}
                                    </motion.div>

                                    {/* Name */}
                                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                                        {topic.name}
                                    </h3>

                                    {/* Description (show on hover or selected) */}
                                    <AnimatePresence>
                                        {isSelected && (
                                            <motion.p
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="text-xs text-gray-300 line-clamp-2 mt-2"
                                            >
                                                {topic.description}
                                            </motion.p>
                                        )}
                                    </AnimatePresence>

                                    {/* Selection Indicator */}
                                    <AnimatePresence>
                                        {isSelected && (
                                            <motion.div
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0, opacity: 0 }}
                                                className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                                                style={{
                                                    background: topic.color,
                                                }}
                                            >
                                                <CheckIcon size={14} className="text-white" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Shimmer Effect on Hover */}
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        <div
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                                        />
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })}
                </motion.div>

                {/* Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center justify-center gap-4"
                >
                    {onSkip && (
                        <button
                            onClick={onSkip}
                            className="px-8 py-3 rounded-xl text-gray-400 hover:text-white transition-colors"
                        >
                            Skip for now
                        </button>
                    )}

                    <motion.button
                        onClick={handleContinue}
                        disabled={saving}
                        whileHover={selected.size >= 3 ? { scale: 1.05 } : {}}
                        whileTap={selected.size >= 3 ? { scale: 0.95 } : {}}
                        className={`
              px-10 py-4 rounded-xl font-semibold text-white
              transition-all duration-300 relative overflow-hidden
              ${selected.size >= 3
                                ? 'bg-gradient-to-r from-[#7C8FFF] to-[#6070EE] hover:shadow-2xl cursor-pointer'
                                : 'bg-white/5 text-gray-500 cursor-not-allowed'
                            }
            `}
                    >
                        {saving ? (
                            <span className="flex items-center gap-2">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                                />
                                Saving...
                            </span>
                        ) : (
                            selected.size === 0 ? 'Select topics to continue' : 'Continue'
                        )}

                        {/* Animated Background */}
                        {selected.size >= 3 && (
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-[#6070EE] to-[#EC4899] opacity-0 hover:opacity-100 transition-opacity -z-10"
                                animate={{
                                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                                }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                }}
                            />
                        )}
                    </motion.button>
                </motion.div>
            </div>
        </div>
    );
}
