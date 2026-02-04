'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';

// ============================================
// TYPES
// ============================================

export interface AIRecommendation {
    id: string;
    type: 'content' | 'user' | 'group' | 'event' | 'topic';
    title: string;
    description?: string;
    imageUrl?: string;
    score: number; // 0-1 relevance
    reason: string;
    metadata?: Record<string, string | number>;
}

export interface ContentSuggestion {
    id: string;
    type: 'post' | 'reply' | 'hashtag' | 'mention' | 'correction';
    text: string;
    confidence: number;
}

export interface SentimentResult {
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
    keywords: string[];
}

// ============================================
// AI RECOMMENDATIONS
// ============================================

interface AIRecommendationsProps {
    recommendations: AIRecommendation[];
    title?: string;
    onSelect: (id: string, type: AIRecommendation['type']) => void;
    onDismiss?: (id: string) => void;
    onRefresh?: () => void;
}

export function AIRecommendations({ recommendations, title = 'For You', onSelect, onDismiss, onRefresh }: AIRecommendationsProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xl">✨</span>
                    <h3 className="font-semibold text-white">{title}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs">AI</span>
                </div>
                {onRefresh && (
                    <button onClick={onRefresh} className="p-2 rounded-lg hover:bg-white/10 text-white/60">↻</button>
                )}
            </div>

            <div className="grid gap-3">
                {recommendations.map((rec, i) => (
                    <motion.div key={rec.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="group flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 cursor-pointer"
                        onClick={() => onSelect(rec.id, rec.type)}>
                        {rec.imageUrl && (
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 overflow-hidden flex-shrink-0">
                                <img src={rec.imageUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white truncate group-hover:text-purple-300">{rec.title}</h4>
                            {rec.description && <p className="text-sm text-white/50 line-clamp-2 mt-1">{rec.description}</p>}
                            <p className="text-xs text-purple-400 mt-2">✨ {rec.reason}</p>
                        </div>
                        {onDismiss && (
                            <button onClick={(e) => { e.stopPropagation(); onDismiss(rec.id); }}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-white/40">×</button>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// ============================================
// SMART COMPOSE
// ============================================

interface SmartComposeProps {
    value: string;
    suggestions: ContentSuggestion[];
    onSuggestionSelect: (suggestion: ContentSuggestion) => void;
    onClearSuggestions: () => void;
}

export function SmartCompose({ value, suggestions, onSuggestionSelect, onClearSuggestions }: SmartComposeProps) {
    if (suggestions.length === 0) return null;

    return (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-full left-0 right-0 mb-2 p-2 rounded-xl bg-[#1A1A1F] border border-white/10 shadow-xl">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-purple-400 flex items-center gap-1">✨ AI Suggestions</span>
                <button onClick={onClearSuggestions} className="text-xs text-white/40 hover:text-white">Dismiss</button>
            </div>
            <div className="space-y-1">
                {suggestions.slice(0, 3).map(s => (
                    <button key={s.id} onClick={() => onSuggestionSelect(s)}
                        className="w-full p-2 text-left rounded-lg hover:bg-white/10 text-sm text-white/70 hover:text-white">
                        {s.type === 'hashtag' && <span className="text-cyan-400">#</span>}
                        {s.type === 'mention' && <span className="text-cyan-400">@</span>}
                        {s.text}
                    </button>
                ))}
            </div>
        </motion.div>
    );
}

// ============================================
// CONTENT SUMMARIZER
// ============================================

interface ContentSummarizerProps {
    content: string;
    onSummarize: () => Promise<string>;
}

export function ContentSummarizer({ content, onSummarize }: ContentSummarizerProps) {
    const [summary, setSummary] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSummarize = async () => {
        setLoading(true);
        try {
            const result = await onSummarize();
            setSummary(result);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📝</span>
                <h4 className="font-medium text-white">AI Summary</h4>
            </div>
            {summary ? (
                <p className="text-white/70">{summary}</p>
            ) : (
                <button onClick={handleSummarize} disabled={loading}
                    className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-sm hover:bg-purple-500/30 disabled:opacity-50">
                    {loading ? 'Generating...' : 'Generate Summary'}
                </button>
            )}
        </div>
    );
}

// ============================================
// AUTO TRANSLATOR
// ============================================

interface AutoTranslatorProps {
    originalText: string;
    originalLanguage?: string;
    onTranslate: (targetLang: string) => Promise<string>;
}

const TRANSLATE_LANGS = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'ar', name: 'Arabic' },
    { code: 'zh', name: 'Chinese' },
];

export function AutoTranslator({ originalText, originalLanguage = 'en', onTranslate }: AutoTranslatorProps) {
    const [translatedText, setTranslatedText] = useState<string | null>(null);
    const [targetLang, setTargetLang] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleTranslate = async (lang: string) => {
        setLoading(true);
        setTargetLang(lang);
        try {
            const result = await onTranslate(lang);
            setTranslatedText(result);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="border-t border-white/10 pt-3 mt-3">
            {translatedText ? (
                <div className="text-white/70">
                    <div className="flex items-center gap-2 text-xs text-cyan-400 mb-1">
                        <span>🌐</span>
                        <span>Translated from {originalLanguage} to {targetLang}</span>
                        <button onClick={() => { setTranslatedText(null); setTargetLang(null); }} className="text-white/40 hover:text-white">×</button>
                    </div>
                    <p>{translatedText}</p>
                </div>
            ) : (
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-white/50">Translate to:</span>
                    {TRANSLATE_LANGS.filter(l => l.code !== originalLanguage).map(l => (
                        <button key={l.code} onClick={() => handleTranslate(l.code)} disabled={loading}
                            className="px-2 py-1 rounded bg-white/5 text-white/60 hover:bg-white/10 text-xs disabled:opacity-50">
                            {l.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================
// SENTIMENT INDICATOR
// ============================================

interface SentimentIndicatorProps {
    result: SentimentResult;
}

export function SentimentIndicator({ result }: SentimentIndicatorProps) {
    const colors = { positive: 'green', negative: 'red', neutral: 'gray' };
    const icons = { positive: '😊', negative: '😔', neutral: '😐' };

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-${colors[result.sentiment]}-500/10 text-${colors[result.sentiment]}-400 text-sm`}>
            <span>{icons[result.sentiment]}</span>
            <span className="capitalize">{result.sentiment}</span>
            <span className="text-xs opacity-70">({Math.round(result.score * 100)}%)</span>
        </div>
    );
}

export default AIRecommendations;
