'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

// ============================================
// TYPES
// ============================================

export interface AnalyticsMetric {
    label: string;
    value: number;
    previousValue?: number;
    format: 'number' | 'percent' | 'currency' | 'duration';
    trend?: 'up' | 'down' | 'neutral';
}

export interface ChartDataPoint {
    date: string;
    value: number;
    label?: string;
}

export interface DemographicData {
    category: string;
    segments: { label: string; value: number; color: string }[];
}

export interface ActivityHeatmapData {
    day: number; // 0-6
    hour: number; // 0-23
    value: number;
}

// ============================================
// STAT CARD
// ============================================

interface StatCardProps {
    metric: AnalyticsMetric;
    icon?: string;
    color?: string;
}

export function StatCard({ metric, icon = '📊', color = 'cyan' }: StatCardProps) {
    const formatValue = (value: number) => {
        switch (metric.format) {
            case 'percent': return `${value.toFixed(1)}%`;
            case 'currency': return `$${value.toLocaleString()}`;
            case 'duration': {
                if (value < 60) return `${value}s`;
                if (value < 3600) return `${Math.floor(value / 60)}m`;
                return `${Math.floor(value / 3600)}h`;
            }
            default: return value >= 10000 ? `${(value / 1000).toFixed(1)}K` : value.toLocaleString();
        }
    };

    const changePercent = metric.previousValue
        ? ((metric.value - metric.previousValue) / metric.previousValue) * 100
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-5 rounded-2xl bg-${color}-500/10 border border-${color}-500/20`}
        >
            <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{icon}</span>
                {metric.trend && (
                    <span className={`text-sm ${metric.trend === 'up' ? 'text-green-400' :
                        metric.trend === 'down' ? 'text-red-400' : 'text-white/40'
                        }`}>
                        {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→'}
                        {Math.abs(changePercent).toFixed(1)}%
                    </span>
                )}
            </div>
            <p className={`text-3xl font-bold text-${color}-400`}>{formatValue(metric.value)}</p>
            <p className="text-sm text-white/50 mt-1">{metric.label}</p>
        </motion.div>
    );
}

// ============================================
// LINE CHART
// ============================================

interface LineChartProps {
    data: ChartDataPoint[];
    height?: number;
    color?: string;
    showArea?: boolean;
}

export function LineChart({ data, height = 200, color = '#00BCD4', showArea = true }: LineChartProps) {
    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue || 1;

    const points = data.map((d, i) => ({
        x: (i / (data.length - 1)) * 100,
        y: 100 - ((d.value - minValue) / range) * 100,
    }));

    const pathD = points.map((p, i) =>
        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');

    const areaD = `${pathD} L 100 100 L 0 100 Z`;

    return (
        <div className="relative" style={{ height }}>
            <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="w-full h-full"
            >
                {/* Grid Lines */}
                {[0, 25, 50, 75, 100].map(y => (
                    <line
                        key={y}
                        x1="0" y1={y} x2="100" y2={y}
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="0.5"
                    />
                ))}

                {/* Area Fill */}
                {showArea && (
                    <path
                        d={areaD}
                        fill={`${color}20`}
                    />
                )}

                {/* Line */}
                <path
                    d={pathD}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                />

                {/* Points */}
                {points.map((p, i) => (
                    <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r="1.5"
                        fill={color}
                    />
                ))}
            </svg>

            {/* Y-Axis Labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-white/40 pr-2">
                <span>{maxValue.toLocaleString()}</span>
                <span>{minValue.toLocaleString()}</span>
            </div>

            {/* X-Axis Labels */}
            <div className="flex justify-between text-xs text-white/40 mt-2">
                {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0).map((d, i) => (
                    <span key={i}>{d.date}</span>
                ))}
            </div>
        </div>
    );
}

// ============================================
// BAR CHART
// ============================================

interface BarChartProps {
    data: { label: string; value: number; color?: string }[];
    height?: number;
    horizontal?: boolean;
}

export function BarChart({ data, height = 200, horizontal = false }: BarChartProps) {
    const maxValue = Math.max(...data.map(d => d.value));

    if (horizontal) {
        return (
            <div className="space-y-3">
                {data.map((item, i) => (
                    <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-white/70">{item.label}</span>
                            <span className="text-white/50">{item.value.toLocaleString()}</span>
                        </div>
                        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(item.value / maxValue) * 100}%` }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: item.color || '#00BCD4' }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex items-end justify-between gap-2" style={{ height }}>
            {data.map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(item.value / maxValue) * 100}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        className="w-full rounded-t-lg"
                        style={{ backgroundColor: item.color || '#00BCD4' }}
                    />
                    <span className="text-xs text-white/50 mt-2 truncate w-full text-center">
                        {item.label}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ============================================
// DONUT CHART
// ============================================

interface DonutChartProps {
    data: { label: string; value: number; color: string }[];
    size?: number;
    thickness?: number;
}

export function DonutChart({ data, size = 160, thickness = 24 }: DonutChartProps) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;

    let accumulatedPercent = 0;

    return (
        <div className="flex items-center gap-6">
            <div className="relative" style={{ width: size, height: size }}>
                <svg viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                    {data.map((item, i) => {
                        const percent = item.value / total;
                        const offset = circumference * (1 - accumulatedPercent);
                        const length = circumference * percent;
                        accumulatedPercent += percent;

                        return (
                            <circle
                                key={i}
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke={item.color}
                                strokeWidth={thickness}
                                strokeDasharray={`${length} ${circumference - length}`}
                                strokeDashoffset={-offset + circumference}
                            />
                        );
                    })}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">{total.toLocaleString()}</span>
                </div>
            </div>

            <div className="space-y-2">
                {data.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-white/70">{item.label}</span>
                        <span className="text-sm text-white/40">
                            ({((item.value / total) * 100).toFixed(1)}%)
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================
// ACTIVITY HEATMAP
// ============================================

interface ActivityHeatmapProps {
    data: ActivityHeatmapData[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
    const maxValue = Math.max(...data.map(d => d.value), 1);

    const getColor = (value: number) => {
        const intensity = value / maxValue;
        if (intensity === 0) return 'rgba(255,255,255,0.05)';
        if (intensity < 0.25) return 'rgba(0,188,212,0.2)';
        if (intensity < 0.5) return 'rgba(0,188,212,0.4)';
        if (intensity < 0.75) return 'rgba(0,188,212,0.6)';
        return 'rgba(0,188,212,0.9)';
    };

    const getValue = (day: number, hour: number) => {
        return data.find(d => d.day === day && d.hour === hour)?.value || 0;
    };

    return (
        <div className="overflow-x-auto">
            <div className="min-w-[600px]">
                {/* Hour Labels */}
                <div className="flex mb-1 ml-12">
                    {HOURS.filter(h => h % 3 === 0).map(h => (
                        <div key={h} className="flex-1 text-xs text-white/40 text-center">
                            {h}:00
                        </div>
                    ))}
                </div>

                {/* Grid */}
                {DAYS.map((day, dayIndex) => (
                    <div key={day} className="flex items-center gap-1 mb-1">
                        <span className="w-10 text-xs text-white/50 text-right pr-2">{day}</span>
                        <div className="flex-1 flex gap-[2px]">
                            {HOURS.map(hour => {
                                const value = getValue(dayIndex, hour);
                                return (
                                    <div
                                        key={hour}
                                        className="flex-1 h-5 rounded-sm transition-all hover:ring-1 hover:ring-white/30"
                                        style={{ backgroundColor: getColor(value) }}
                                        title={`${day} ${hour}:00 - ${value} activities`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* Legend */}
                <div className="flex items-center justify-end gap-2 mt-4">
                    <span className="text-xs text-white/40">Less</span>
                    {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
                        <div
                            key={i}
                            className="w-4 h-4 rounded-sm"
                            style={{ backgroundColor: getColor(maxValue * intensity) }}
                        />
                    ))}
                    <span className="text-xs text-white/40">More</span>
                </div>
            </div>
        </div>
    );
}

// ============================================
// ANALYTICS DASHBOARD
// ============================================

interface AnalyticsDashboardProps {
    metrics: AnalyticsMetric[];
    memberGrowth: ChartDataPoint[];
    engagement: ChartDataPoint[];
    demographics: DemographicData[];
    activityHeatmap: ActivityHeatmapData[];
    topContent: { title: string; views: number; engagement: number }[];
}

export function AnalyticsDashboard({
    metrics,
    memberGrowth,
    engagement,
    demographics,
    activityHeatmap,
    topContent,
}: AnalyticsDashboardProps) {
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

    return (
        <div className="space-y-8">
            {/* Date Range Selector */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">Analytics Overview</h2>
                <div className="flex gap-2">
                    {(['7d', '30d', '90d', '1y'] as const).map(range => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${dateRange === range
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard metric={metrics[0] || { label: 'Members', value: 0, format: 'number' }} icon="👥" color="cyan" />
                <StatCard metric={metrics[1] || { label: 'Active', value: 0, format: 'number' }} icon="🔥" color="green" />
                <StatCard metric={metrics[2] || { label: 'Posts', value: 0, format: 'number' }} icon="📝" color="purple" />
                <StatCard metric={metrics[3] || { label: 'Events', value: 0, format: 'number' }} icon="📅" color="orange" />
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Member Growth</h3>
                    <LineChart data={memberGrowth} color="#00BCD4" />
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Engagement Rate</h3>
                    <LineChart data={engagement} color="#B8942D" />
                </div>
            </div>

            {/* Demographics & Activity */}
            <div className="grid lg:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Demographics</h3>
                    {demographics.map((demo, i) => (
                        <div key={i} className="mb-6 last:mb-0">
                            <p className="text-sm text-white/50 mb-3">{demo.category}</p>
                            <DonutChart data={demo.segments} />
                        </div>
                    ))}
                </div>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Activity Heatmap</h3>
                    <ActivityHeatmap data={activityHeatmap} />
                </div>
            </div>

            {/* Top Content */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Top Performing Content</h3>
                <div className="space-y-3">
                    {topContent.map((content, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/5">
                            <span className="text-lg font-bold text-white/30 w-8">#{i + 1}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-white truncate">{content.title}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-white/70">{content.views.toLocaleString()} views</p>
                                <p className="text-xs text-cyan-400">{content.engagement}% engagement</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default AnalyticsDashboard;
