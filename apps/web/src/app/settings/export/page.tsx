'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiFetch, API_URL } from '@/lib/api';

interface ExportInfo {
    estimatedItems: number;
    breakdown: {
        posts: number;
        comments: number;
        likes: number;
        followers: number;
    };
}

export default function ExportPage() {
    const [info, setInfo] = useState<ExportInfo | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [exportComplete, setExportComplete] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        apiFetch(`${API_URL}/api/v1/account/export/info`)
            .then(res => res.json())
            .then(data => { if (data && !data.error) setInfo(data); })
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, []);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;
            const response = await fetch(`${API_URL}/api/v1/account/export`, {
                method: 'POST',
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `zerog-export-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setExportComplete(true);
        } catch (error) {
            console.error('Export error:', error);
        }
        setIsExporting(false);
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 sm:p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-2">Export Your Data</h1>
            <p className="text-white/50 text-sm mb-8">
                Download a complete copy of your data. This includes your profile, posts,
                comments, likes, followers, and messages.
            </p>

            {isLoading && (
                <div className="text-center py-12 text-white/40">Loading export info...</div>
            )}

            {info && (
                <motion.div
                    className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h3 className="text-white font-semibold mb-4">Your Data Summary</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-xl p-4">
                            <p className="text-white/40 text-xs">Posts</p>
                            <p className="text-white text-2xl font-bold">{info.breakdown.posts}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                            <p className="text-white/40 text-xs">Comments</p>
                            <p className="text-white text-2xl font-bold">{info.breakdown.comments}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                            <p className="text-white/40 text-xs">Likes</p>
                            <p className="text-white text-2xl font-bold">{info.breakdown.likes}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4">
                            <p className="text-white/40 text-xs">Followers</p>
                            <p className="text-white text-2xl font-bold">{info.breakdown.followers}</p>
                        </div>
                    </div>
                    <p className="text-white/30 text-xs mt-4">
                        Total items to export: {info.estimatedItems.toLocaleString()}
                    </p>
                </motion.div>
            )}

            {!exportComplete ? (
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="w-full py-4 rounded-2xl bg-[#D4AF37] text-black font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                    {isExporting ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            Exporting...
                        </span>
                    ) : 'Download My Data'}
                </button>
            ) : (
                <motion.div
                    className="text-center py-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2.5}>
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <p className="text-white font-semibold text-lg">Export Complete!</p>
                    <p className="text-white/50 text-sm mt-1">Your data has been downloaded as a JSON file.</p>
                    <button
                        onClick={() => setExportComplete(false)}
                        className="mt-4 text-[#D4AF37] text-sm hover:underline"
                    >
                        Export Again
                    </button>
                </motion.div>
            )}

            <div className="mt-8 text-white/30 text-xs space-y-2">
                <p>Your export includes: profile information, all posts and media URLs,
                    comments, likes, follower/following lists, and messages you&apos;ve sent.</p>
                <p>The export is in JSON format, which can be read by any text editor
                    or imported into other platforms.</p>
                <p>Your data belongs to you. You can export it at any time.</p>
            </div>
        </div>
    );
}
