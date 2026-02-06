'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface LogEntry {
    id: string;
    moderatorId: string;
    action: string;
    targetType: string;
    targetId: string;
    reason?: string;
    createdAt: string;
}

export default function TransparencyPage() {
    const { id: communityId } = useParams();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await apiFetch(`/api/v1/governance/${communityId}/moderation-log?page=${page}`);
                setLogs(data.logs || []);
                setTotalPages(Math.ceil((data.pagination?.total || 0) / 50));
            } catch {
                // Handle silently
            }
            setIsLoading(false);
        };
        load();
    }, [communityId, page]);

    const actionLabels: Record<string, string> = {
        remove_post: 'Removed post',
        ban_user: 'Banned user',
        unban_user: 'Unbanned user',
        edit_rule: 'Edited rule',
        pin_post: 'Pinned post',
        lock_thread: 'Locked thread',
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 sm:p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold">Transparency Log</h1>
                <p className="text-white/50 text-sm mt-1">Public record of all moderation actions in this community</p>
            </div>

            {isLoading && <div className="text-center py-12 text-white/40">Loading...</div>}

            <div className="space-y-2">
                {logs.map((log) => (
                    <div key={log.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} opacity={0.4}>
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-sm">
                                <span className="font-medium">{actionLabels[log.action] || log.action}</span>
                                {' '}
                                <span className="text-white/40">({log.targetType}: {log.targetId.slice(0, 8)}...)</span>
                            </p>
                            {log.reason && <p className="text-white/50 text-sm mt-0.5">Reason: {log.reason}</p>}
                            <p className="text-white/30 text-xs mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                ))}
            </div>

            {!isLoading && logs.length === 0 && (
                <div className="text-center py-16 text-white/30">
                    <p className="text-lg mb-1">No moderation actions recorded</p>
                    <p className="text-sm text-white/20">All moderation actions will appear here publicly</p>
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="px-4 py-2 rounded-lg bg-white/10 text-sm disabled:opacity-30"
                    >
                        Previous
                    </button>
                    <span className="px-4 py-2 text-white/40 text-sm">Page {page} of {totalPages}</span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="px-4 py-2 rounded-lg bg-white/10 text-sm disabled:opacity-30"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
