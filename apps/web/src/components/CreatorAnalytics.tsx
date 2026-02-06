'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

interface CreatorMetrics {
    followers: number;
    followersGrowth: number;
    totalViews: number;
    viewsGrowth: number;
    engagement: number;
    engagementGrowth: number;
    earnings: number;
    earningsGrowth: number;
}

interface ContentPerformance {
    id: string;
    title: string;
    type: 'post' | 'video' | 'story' | 'stream';
    views: number;
    likes: number;
    shares: number;
    comments: number;
    earnings: number;
    publishedAt: Date;
    thumbnail?: string;
}

interface AudienceDemographic {
    category: string;
    value: string;
    percentage: number;
}

interface TimeSeriesData {
    date: string;
    value: number;
}

// ============================================================================
// METRIC CARD
// ============================================================================

interface MetricCardProps {
    label: string;
    value: string | number;
    growth?: number;
    icon: string;
    color: string;
}

function MetricCard({ label, value, growth, icon, color }: MetricCardProps) {
    return (
        <motion.div
            whileHover={{ y: -4 }}
            className="bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 p-5"
        >
            <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{icon}</span>
                {growth !== undefined && (
                    <span className={`text-sm font-medium ${growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {growth >= 0 ? '↑' : '↓'} {Math.abs(growth)}%
                    </span>
                )}
            </div>
            <p className={`text-3xl font-bold ${color}`}>
                {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            <p className="text-sm text-white/50 mt-1">{label}</p>
        </motion.div>
    );
}

// ============================================================================
// PERFORMANCE TABLE
// ============================================================================

interface PerformanceTableProps {
    content: ContentPerformance[];
    onSort?: (key: keyof ContentPerformance) => void;
}

function PerformanceTable({ content, onSort }: PerformanceTableProps) {
    const [sortKey, setSortKey] = useState<keyof ContentPerformance>('views');

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'post': return '📝';
            case 'video': return '🎬';
            case 'story': return '📖';
            case 'stream': return '📺';
            default: return '📄';
        }
    };

    const sortedContent = [...content].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return bVal - aVal;
        }
        return 0;
    });

    return (
        <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-5 border-b border-white/5">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <span>📊</span> Content Performance
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5">
                            {[
                                { key: 'title', label: 'Content' },
                                { key: 'views', label: 'Views' },
                                { key: 'likes', label: 'Likes' },
                                { key: 'shares', label: 'Shares' },
                                { key: 'comments', label: 'Comments' },
                                { key: 'earnings', label: 'Earnings' },
                            ].map((col) => (
                                <th
                                    key={col.key}
                                    onClick={() => {
                                        setSortKey(col.key as keyof ContentPerformance);
                                        onSort?.(col.key as keyof ContentPerformance);
                                    }}
                                    className={`px-5 py-3 text-left text-xs font-medium text-white/50 cursor-pointer hover:text-white ${sortKey === col.key ? 'text-violet-400' : ''
                                        }`}
                                >
                                    {col.label}
                                    {sortKey === col.key && ' ↓'}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedContent.map((item) => (
                            <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <span>{getTypeIcon(item.type)}</span>
                                        <div>
                                            <p className="text-white font-medium line-clamp-1 max-w-[200px]">{item.title}</p>
                                            <p className="text-xs text-white/40">{new Date(item.publishedAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-white/80">{item.views.toLocaleString()}</td>
                                <td className="px-5 py-4 text-white/80">{item.likes.toLocaleString()}</td>
                                <td className="px-5 py-4 text-white/80">{item.shares.toLocaleString()}</td>
                                <td className="px-5 py-4 text-white/80">{item.comments.toLocaleString()}</td>
                                <td className="px-5 py-4 text-emerald-400 font-medium">${item.earnings.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ============================================================================
// AUDIENCE INSIGHTS
// ============================================================================

interface AudienceInsightsProps {
    demographics: AudienceDemographic[];
    topLocations: { location: string; percentage: number }[];
}

function AudienceInsights({ demographics, topLocations }: AudienceInsightsProps) {
    return (
        <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <span>👥</span> Audience Insights
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Demographics */}
                <div>
                    <h4 className="text-sm text-white/50 mb-3">Demographics</h4>
                    <div className="space-y-3">
                        {demographics.map((demo) => (
                            <div key={demo.category}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-white/70">{demo.value}</span>
                                    <span className="text-white font-medium">{demo.percentage}%</span>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${demo.percentage}%` }}
                                        transition={{ duration: 0.8 }}
                                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Locations */}
                <div>
                    <h4 className="text-sm text-white/50 mb-3">Top Locations</h4>
                    <div className="space-y-2">
                        {topLocations.map((loc, idx) => (
                            <div key={loc.location} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                                <span className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-xs text-violet-400 font-bold">
                                    {idx + 1}
                                </span>
                                <span className="flex-1 text-white/80">{loc.location}</span>
                                <span className="text-white/50">{loc.percentage}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// ENGAGEMENT CHART (Simple bar visualization)
// ============================================================================

interface EngagementChartProps {
    data: TimeSeriesData[];
    title: string;
}

function EngagementChart({ data, title }: EngagementChartProps) {
    const maxValue = Math.max(...data.map(d => d.value));

    return (
        <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <span>📈</span> {title}
                </h3>
                <select className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 text-sm">
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>Last 90 days</option>
                </select>
            </div>

            <div className="flex items-end gap-1 h-32">
                {data.map((point, idx) => (
                    <motion.div
                        key={point.date}
                        initial={{ height: 0 }}
                        animate={{ height: `${(point.value / maxValue) * 100}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.05 }}
                        className="flex-1 bg-gradient-to-t from-violet-500/80 to-fuchsia-500/80 rounded-t-sm relative group"
                    >
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-gray-800 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {point.value.toLocaleString()}
                            <br />
                            <span className="text-white/50">{point.date}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="flex justify-between mt-2 text-xs text-white/40">
                <span>{data[0]?.date}</span>
                <span>{data[data.length - 1]?.date}</span>
            </div>
        </div>
    );
}

// ============================================================================
// TRENDING TOPICS
// ============================================================================

interface TrendingTopic {
    id: string;
    topic: string;
    posts: number;
    growth: number;
    hashtag?: string;
}

interface TrendingTopicsProps {
    topics: TrendingTopic[];
}

export function TrendingTopics({ topics }: TrendingTopicsProps) {
    return (
        <div className="bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <span>🔥</span> Trending Topics
                </h3>
                <span className="text-xs text-white/40">Updated 5m ago</span>
            </div>

            <div className="space-y-3">
                {topics.map((topic, idx) => (
                    <motion.div
                        key={topic.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <span className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-sm">
                            {idx + 1}
                        </span>
                        <div className="flex-1">
                            <p className="text-white font-medium">{topic.topic}</p>
                            {topic.hashtag && <p className="text-xs text-cyan-400">#{topic.hashtag}</p>}
                        </div>
                        <div className="text-right">
                            <span className="text-sm text-white/80">{topic.posts.toLocaleString()} posts</span>
                            <p className={`text-xs ${topic.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {topic.growth >= 0 ? '↑' : '↓'} {Math.abs(topic.growth)}%
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// CREATOR ANALYTICS DASHBOARD
// ============================================================================

interface CreatorAnalyticsDashboardProps {
    metrics: CreatorMetrics;
    content: ContentPerformance[];
    demographics: AudienceDemographic[];
    topLocations: { location: string; percentage: number }[];
    engagementData: TimeSeriesData[];
}

export function CreatorAnalyticsDashboard({
    metrics,
    content,
    demographics,
    topLocations,
    engagementData,
}: CreatorAnalyticsDashboardProps) {
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Creator Analytics</h2>
                    <p className="text-white/50">Track your content performance and audience growth</p>
                </div>
                <div className="flex gap-2">
                    {(['7d', '30d', '90d'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${timeRange === range
                                    ? 'bg-white text-gray-900'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    label="Followers"
                    value={metrics.followers}
                    growth={metrics.followersGrowth}
                    icon="👥"
                    color="text-white"
                />
                <MetricCard
                    label="Total Views"
                    value={metrics.totalViews}
                    growth={metrics.viewsGrowth}
                    icon="👁️"
                    color="text-cyan-400"
                />
                <MetricCard
                    label="Engagement Rate"
                    value={`${metrics.engagement}%`}
                    growth={metrics.engagementGrowth}
                    icon="💜"
                    color="text-violet-400"
                />
                <MetricCard
                    label="Earnings"
                    value={`$${metrics.earnings.toLocaleString()}`}
                    growth={metrics.earningsGrowth}
                    icon="💰"
                    color="text-emerald-400"
                />
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-4">
                <EngagementChart data={engagementData} title="Views Over Time" />
                <AudienceInsights demographics={demographics} topLocations={topLocations} />
            </div>

            {/* Performance Table */}
            <PerformanceTable content={content} />
        </div>
    );
}

export default CreatorAnalyticsDashboard;
