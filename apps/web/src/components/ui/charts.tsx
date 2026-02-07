'use client';

import { motion } from 'framer-motion';
import { ReactNode, useMemo } from 'react';

// ============================================
// DATA VISUALIZATION COMPONENTS
// ZeroG Silk Road Renaissance Charts
// ============================================

// ============================================
// PROGRESS RING
// Circular progress indicator
// ============================================

interface ProgressRingProps {
    value: number; // 0-100
    size?: number;
    strokeWidth?: number;
    color?: string;
    backgroundColor?: string;
    label?: ReactNode;
    showValue?: boolean;
    className?: string;
}

export function ProgressRing({
    value,
    size = 120,
    strokeWidth = 8,
    color = '#8B5CF6',
    backgroundColor = 'rgba(255, 255, 255, 0.1)',
    label,
    showValue = true,
    className = '',
}: ProgressRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (value / 100) * circumference;

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={backgroundColor}
                    strokeWidth={strokeWidth}
                />
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
                {showValue && (
                    <span className="text-2xl font-bold text-white">
                        {Math.round(value)}%
                    </span>
                )}
                {label && (
                    <span className="text-xs text-white/60 mt-1">{label}</span>
                )}
            </div>
        </div>
    );
}

// ============================================
// BAR CHART
// Animated bar visualization
// ============================================

interface BarChartData {
    label: string;
    value: number;
    color?: string;
}

interface BarChartProps {
    data: BarChartData[];
    height?: number;
    showLabels?: boolean;
    showValues?: boolean;
    animated?: boolean;
    className?: string;
}

export function BarChart({
    data,
    height = 200,
    showLabels = true,
    showValues = true,
    animated = true,
    className = '',
}: BarChartProps) {
    const maxValue = Math.max(...data.map(d => d.value));
    const defaultColors = ['#8B5CF6', '#F43F5E', '#F59E0B', '#10B981', '#06B6D4', '#D4AF37'];

    return (
        <div className={`flex flex-col ${className}`}>
            <div className="flex items-end gap-4" style={{ height }}>
                {data.map((item, i) => {
                    const barHeight = (item.value / maxValue) * 100;
                    const color = item.color || defaultColors[i % defaultColors.length];

                    return (
                        <div key={i} className="flex-1 flex flex-col items-center">
                            <motion.div
                                className="w-full rounded-t-lg"
                                style={{ backgroundColor: color }}
                                initial={animated ? { height: 0 } : { height: `${barHeight}%` }}
                                animate={{ height: `${barHeight}%` }}
                                transition={{ delay: i * 0.1, duration: 0.6, ease: 'easeOut' }}
                            />

                            {showValues && (
                                <motion.span
                                    className="text-xs text-white/60 mt-2"
                                    initial={animated ? { opacity: 0 } : { opacity: 1 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.1 + 0.3 }}
                                >
                                    {item.value.toLocaleString()}
                                </motion.span>
                            )}
                        </div>
                    );
                })}
            </div>

            {showLabels && (
                <div className="flex gap-4 mt-4">
                    {data.map((item, i) => (
                        <div key={i} className="flex-1 text-center text-xs text-white/60">
                            {item.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================
// SPARKLINE
// Mini trend line
// ============================================

interface SparklineProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
    strokeWidth?: number;
    filled?: boolean;
    className?: string;
}

export function Sparkline({
    data,
    width = 100,
    height = 30,
    color = '#8B5CF6',
    strokeWidth = 2,
    filled = false,
    className = '',
}: SparklineProps) {
    const points = useMemo(() => {
        if (data.length === 0) return '';

        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;

        return data
            .map((value, i) => {
                const x = (i / (data.length - 1)) * width;
                const y = height - ((value - min) / range) * height;
                return `${x},${y}`;
            })
            .join(' ');
    }, [data, width, height]);

    const fillPath = useMemo(() => {
        if (data.length === 0 || !filled) return '';

        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;

        const pathPoints = data
            .map((value, i) => {
                const x = (i / (data.length - 1)) * width;
                const y = height - ((value - min) / range) * height;
                return `${x},${y}`;
            })
            .join(' L ');

        return `M 0,${height} L ${pathPoints} L ${width},${height} Z`;
    }, [data, width, height, filled]);

    return (
        <svg width={width} height={height} className={className}>
            {filled && (
                <motion.path
                    d={fillPath}
                    fill={color}
                    fillOpacity={0.2}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                />
            )}
            <motion.polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, ease: 'easeOut' }}
            />
        </svg>
    );
}

// ============================================
// STAT CARD
// Metric display with trend
// ============================================

interface StatCardProps {
    title: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
    icon?: ReactNode;
    sparklineData?: number[];
    className?: string;
}

export function StatCard({
    title,
    value,
    change,
    changeLabel,
    icon,
    sparklineData,
    className = '',
}: StatCardProps) {
    const isPositive = (change ?? 0) >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                p-6 rounded-2xl
                bg-white/5 border border-white/10
                backdrop-blur-xl
                ${className}
            `}
        >
            <div className="flex items-start justify-between mb-4">
                <span className="text-sm text-white/60">{title}</span>
                {icon && <span className="text-white/40">{icon}</span>}
            </div>

            <div className="flex items-end justify-between">
                <div>
                    <div className="text-3xl font-bold text-white mb-1">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </div>

                    {change !== undefined && (
                        <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            <span>{isPositive ? '↑' : '↓'}</span>
                            <span>{Math.abs(change)}%</span>
                            {changeLabel && <span className="text-white/40">{changeLabel}</span>}
                        </div>
                    )}
                </div>

                {sparklineData && sparklineData.length > 0 && (
                    <Sparkline
                        data={sparklineData}
                        width={80}
                        height={40}
                        color={isPositive ? '#10B981' : '#F43F5E'}
                        filled
                    />
                )}
            </div>
        </motion.div>
    );
}

// ============================================
// DONUT CHART
// Percentage breakdown
// ============================================

interface DonutChartData {
    label: string;
    value: number;
    color?: string;
}

interface DonutChartProps {
    data: DonutChartData[];
    size?: number;
    strokeWidth?: number;
    centerLabel?: ReactNode;
    className?: string;
}

export function DonutChart({
    data,
    size = 160,
    strokeWidth = 20,
    centerLabel,
    className = '',
}: DonutChartProps) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const defaultColors = ['#8B5CF6', '#F43F5E', '#F59E0B', '#10B981', '#06B6D4', '#D4AF37'];

    let currentOffset = 0;

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`}>
            <svg width={size} height={size} className="transform -rotate-90">
                {data.map((item, i) => {
                    const percentage = (item.value / total) * 100;
                    const strokeDasharray = (percentage / 100) * circumference;
                    const color = item.color || defaultColors[i % defaultColors.length];

                    const segment = (
                        <motion.circle
                            key={i}
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke={color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${strokeDasharray} ${circumference - strokeDasharray}`}
                            strokeDashoffset={-currentOffset}
                            strokeLinecap="round"
                            initial={{ strokeDasharray: `0 ${circumference}` }}
                            animate={{ strokeDasharray: `${strokeDasharray} ${circumference - strokeDasharray}` }}
                            transition={{ delay: i * 0.1, duration: 0.8, ease: 'easeOut' }}
                        />
                    );

                    currentOffset += strokeDasharray;
                    return segment;
                })}
            </svg>

            {centerLabel && (
                <div className="absolute inset-0 flex items-center justify-center">
                    {centerLabel}
                </div>
            )}
        </div>
    );
}

// ============================================
// ACTIVITY HEATMAP
// GitHub-style contribution grid
// ============================================

interface ActivityHeatmapProps {
    data: { date: string; count: number }[];
    colorScale?: string[];
    cellSize?: number;
    className?: string;
}

export function ActivityHeatmap({
    data,
    colorScale = ['#1a1a2e', '#2d1f4b', '#4c2a85', '#6b35c4', '#8B5CF6'],
    cellSize = 12,
    className = '',
}: ActivityHeatmapProps) {
    const maxCount = Math.max(...data.map(d => d.count), 1);

    const getColor = (count: number) => {
        if (count === 0) return colorScale[0];
        const index = Math.min(
            Math.floor((count / maxCount) * (colorScale.length - 1)) + 1,
            colorScale.length - 1
        );
        return colorScale[index];
    };

    // Group by weeks
    const weeks: { date: string; count: number }[][] = [];
    let currentWeek: { date: string; count: number }[] = [];

    data.forEach((d, i) => {
        currentWeek.push(d);
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    });

    if (currentWeek.length > 0) {
        weeks.push(currentWeek);
    }

    return (
        <div className={`flex gap-1 ${className}`}>
            {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                    {week.map((day, dayIndex) => (
                        <motion.div
                            key={day.date}
                            className="rounded-sm cursor-pointer"
                            style={{
                                width: cellSize,
                                height: cellSize,
                                backgroundColor: getColor(day.count),
                            }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: weekIndex * 0.02 + dayIndex * 0.005 }}
                            whileHover={{ scale: 1.3, zIndex: 10 }}
                            title={`${day.date}: ${day.count} contributions`}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

// ============================================
// METRIC PILL
// Compact metric display
// ============================================

interface MetricPillProps {
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
    color?: 'violet' | 'rose' | 'amber' | 'emerald' | 'cyan';
    className?: string;
}

export function MetricPill({
    label,
    value,
    trend,
    color = 'violet',
    className = '',
}: MetricPillProps) {
    const colorMap = {
        violet: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
        rose: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        cyan: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    };

    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`
                inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                border backdrop-blur-sm
                ${colorMap[color]}
                ${className}
            `}
        >
            <span className="text-xs opacity-80">{label}</span>
            <span className="font-semibold">{value}</span>
            {trend && (
                <span className={trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-white/40'}>
                    {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
                </span>
            )}
        </motion.div>
    );
}

// ============================================
// EXPORTS
// ============================================

export {
    type ProgressRingProps,
    type BarChartData,
    type BarChartProps,
    type SparklineProps,
    type StatCardProps,
    type DonutChartData,
    type DonutChartProps,
    type ActivityHeatmapProps,
    type MetricPillProps,
};
