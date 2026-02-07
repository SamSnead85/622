'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckIcon, SearchIcon, XIcon } from '@/components/icons';

interface Topic {
    id: string;
    slug: string;
    name: string;
    icon: string;
    color: string;
}

interface TopicSelectorProps {
    selectedTopics: Topic[];
    onChange: (topics: Topic[]) => void;
    maxSelection?: number;
}

export default function TopicSelector({
    selectedTopics,
    onChange,
    maxSelection = 3
}: TopicSelectorProps) {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTopics();
    }, []);

    const fetchTopics = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/topics`);
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            setTopics(Array.isArray(data.topics) ? data.topics : []);
        } catch (error) {
            console.error('Failed to fetch topics:', error);
            setTopics([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredTopics = topics.filter(topic =>
        topic.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleTopic = (topic: Topic) => {
        const isSelected = selectedTopics.some(t => t.id === topic.id);

        if (isSelected) {
            onChange(selectedTopics.filter(t => t.id !== topic.id));
        } else if (selectedTopics.length < maxSelection) {
            onChange([...selectedTopics, topic]);
        }
    };

    const removeTopic = (topicId: string) => {
        onChange(selectedTopics.filter(t => t.id !== topicId));
    };

    return (
        <div className="space-y-3">
            {/* Selected Topics Pills */}
            {selectedTopics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedTopics.map((topic) => (
                        <motion.button
                            key={topic.id}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            onClick={() => removeTopic(topic.id)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                            style={{
                                background: `linear-gradient(135deg, ${topic.color}40 0%, ${topic.color}20 100%)`,
                                border: `1px solid ${topic.color}60`,
                            }}
                        >
                            <span>{topic.icon}</span>
                            <span className="text-white">{topic.name}</span>
                            <XIcon size={14} className="text-white/70 hover:text-white" />
                        </motion.button>
                    ))}
                </div>
            )}

            {/* Selector Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🏷️</span>
                    <div className="text-left">
                        <p className="text-white/70 text-sm font-medium">
                            {selectedTopics.length === 0
                                ? 'Add Topics'
                                : `${selectedTopics.length}/${maxSelection} topics selected`}
                        </p>
                        <p className="text-white/40 text-xs">
                            Help people discover your content
                        </p>
                    </div>
                </div>
                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/50">
                        <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </motion.div>
            </button>

            {/* Expanded Selector */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                            {/* Search Bar */}
                            <div className="relative">
                                <SearchIcon
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                                />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search topics..."
                                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 text-sm"
                                />
                            </div>

                            {/* Selection Hint */}
                            <p className="text-xs text-white/40 text-center">
                                {selectedTopics.length === maxSelection
                                    ? `Maximum ${maxSelection} topics selected`
                                    : `Select up to ${maxSelection} topics`}
                            </p>

                            {/* Topics Grid */}
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                        className="w-6 h-6 border-2 border-[#00D4FF] border-t-transparent rounded-full"
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                                    {filteredTopics.map((topic) => {
                                        const isSelected = selectedTopics.some(t => t.id === topic.id);
                                        const isMaxed = selectedTopics.length >= maxSelection && !isSelected;

                                        return (
                                            <motion.button
                                                key={topic.id}
                                                onClick={() => !isMaxed && toggleTopic(topic)}
                                                disabled={isMaxed}
                                                whileHover={!isMaxed ? { scale: 1.02 } : {}}
                                                whileTap={!isMaxed ? { scale: 0.98 } : {}}
                                                className={`
                          relative p-3 rounded-lg text-left transition-all
                          ${isSelected
                                                        ? 'bg-gradient-to-br shadow-lg'
                                                        : isMaxed
                                                            ? 'bg-white/5 opacity-50 cursor-not-allowed'
                                                            : 'bg-white/5 hover:bg-white/10 border border-white/10'
                                                    }
                        `}
                                                style={isSelected ? {
                                                    background: `linear-gradient(135deg, ${topic.color}40 0%, ${topic.color}20 100%)`,
                                                    borderColor: topic.color,
                                                    borderWidth: '1px',
                                                } : undefined}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xl">{topic.icon}</span>
                                                    {isSelected && (
                                                        <motion.div
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            className="ml-auto w-4 h-4 rounded-full flex items-center justify-center"
                                                            style={{ background: topic.color }}
                                                        >
                                                            <CheckIcon size={10} className="text-white" />
                                                        </motion.div>
                                                    )}
                                                </div>
                                                <p className="text-sm font-medium text-white line-clamp-1">
                                                    {topic.name}
                                                </p>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            )}

                            {filteredTopics.length === 0 && !loading && (
                                <p className="text-center text-white/40 text-sm py-8">
                                    No topics found for &quot;{searchQuery}&quot;
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
