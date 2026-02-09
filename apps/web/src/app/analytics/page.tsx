'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { API_URL } from '@/lib/api';

interface OverviewData {
    followers: number;
    posts: number;
    totalLikes: number;
    totalComments: number;
    engagementRate: number;
    recentFollowers: number;
}

interface GrowthPoint {
    date: string;
    newFollowers: number;
}

interface TopPost {
    id: string;
    caption: string;
    type: string;
    likes: number;
    comments: number;
    shares: number;
    engagement: number;
    createdAt: string;
}

export default function AnalyticsPage() {
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [growth, setGrowth] = useState<GrowthPoint[]>([]);
    const [topContent, setTopContent] = useState<TopPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [period, setPeriod] = useState('30');

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const [overviewRes, audienceRes, topRes] = await Promise.all([
                    apiFetch(`${API_URL}/api/v1/analytics/overview`),
                    apiFetch(`${API_URL}/api/v1/analytics/audience?days=${period}`),
                    apiFetch(`${API_URL}/api/v1/analytics/top-content?period=${period}`),
                ]);
                const overviewData = await overviewRes.json();
                const audienceData = await audienceRes.json();
                const topData = await topRes.json();
                setOverview(overviewData);
                setGrowth(audienceData.growth || []);
                setTopContent(topData.topContent || []);
            } catch {
                // silently handle fetch errors
            }
            setIsLoading(false);
        };
        load();
    }, [period]);

    const maxGrowth = Math.max(...growth.map(g => g.newFollowers), 1);

    const StatCard = ({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) => (
        <motion.div
            className="bg-white/5 border border-white/10 rounded-2xl p-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">{label}</p>
            <p className="text-white text-3xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
            {subtext && <p className="text-white/30 text-xs mt-1">{subtext}</p>}
        </motion.div>
    );

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-4 sm:p-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold">Creator Analytics</h1>
                    <p className="text-white/50 text-sm mt-1">Understand your audience and content performance</p>
                </div>
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    aria-label="Time period"
                >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                </select>
            </div>

            {/* Overview cards */}
            {overview && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                    <StatCard label="Followers" value={overview.followers} subtext={`+${overview.recentFollowers} this month`} />
                    <StatCard label="Posts" value={overview.posts} />
                    <StatCard label="Total Likes" value={overview.totalLikes} />
                    <StatCard label="Comments" value={overview.totalComments} />
                    <StatCard label="Engagement" value={`${overview.engagementRate}x`} subtext="per post avg" />
                    <StatCard label="New Followers" value={overview.recentFollowers} subtext="last 30 days" />
                </div>
            )}

            {/* Growth chart */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
                <h2 className="text-white font-semibold mb-4">Follower Growth</h2>
                <div className="flex items-end gap-[2px] h-40">
                    {growth.map((point) => (
                        <div
                            key={point.date}
                            className="flex-1 group relative"
                            title={`${point.date}: +${point.newFollowers}`}
                        >
                            <div
                                className="w-full bg-[#D4AF37]/60 hover:bg-[#D4AF37] rounded-t transition-colors"
                                style={{
                                    height: `${Math.max(2, (point.newFollowers / maxGrowth) * 100)}%`,
                                }}
                            />
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#12121A] px-2 py-1 rounded text-xs whitespace-nowrap border border-white/10">
                                +{point.newFollowers}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-2 text-white/20 text-xs">
                    <span>{growth[0]?.date}</span>
                    <span>{growth[growth.length - 1]?.date}</span>
                </div>
            </div>

            {/* Top content */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h2 className="text-white font-semibold mb-4">Top Performing Content</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-white/40 text-xs uppercase">
                                <th className="text-left pb-3">Post</th>
                                <th className="text-right pb-3">Likes</th>
                                <th className="text-right pb-3">Comments</th>
                                <th className="text-right pb-3">Shares</th>
                                <th className="text-right pb-3">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topContent.map((post, i) => (
                                <tr key={post.id} className="border-t border-white/5">
                                    <td className="py-3 pr-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white/30 text-xs w-5">{i + 1}</span>
                                            <span className="text-white truncate max-w-xs">{post.caption || 'Untitled'}</span>
                                            <span className="text-white/20 text-xs">{post.type}</span>
                                        </div>
                                    </td>
                                    <td className="text-right text-white/60">{post.likes}</td>
                                    <td className="text-right text-white/60">{post.comments}</td>
                                    <td className="text-right text-white/60">{post.shares}</td>
                                    <td className="text-right text-white font-medium">{post.engagement}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {topContent.length === 0 && (
                    <p className="text-center text-white/30 py-8">No content data available yet</p>
                )}
            </div>
        </div>
    );
}
