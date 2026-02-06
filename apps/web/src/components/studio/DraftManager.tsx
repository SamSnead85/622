'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Draft {
    id: string;
    type: 'IMAGE' | 'VIDEO' | 'TEXT';
    caption: string;
    mediaUrl?: string;
    thumbnailUrl?: string;
    createdAt: string;
    updatedAt: string;
}

const DB_NAME = '0g_drafts';
const STORE_NAME = 'drafts';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
            request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
        };
    });
}

// Hook for managing drafts
export function useDrafts() {
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadDrafts = useCallback(async () => {
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => {
                const all = (request.result as Draft[]).sort(
                    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                );
                setDrafts(all);
                setIsLoading(false);
            };
        } catch {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadDrafts(); }, [loadDrafts]);

    const saveDraft = useCallback(async (draft: Omit<Draft, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
        const db = await openDB();
        const now = new Date().toISOString();
        const fullDraft: Draft = {
            id: draft.id || `draft_${Date.now()}`,
            type: draft.type,
            caption: draft.caption,
            mediaUrl: draft.mediaUrl,
            thumbnailUrl: draft.thumbnailUrl,
            createdAt: draft.id ? drafts.find(d => d.id === draft.id)?.createdAt || now : now,
            updatedAt: now,
        };
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(fullDraft);
        await loadDrafts();
        return fullDraft.id;
    }, [drafts, loadDrafts]);

    const deleteDraft = useCallback(async (id: string) => {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        await loadDrafts();
    }, [loadDrafts]);

    return { drafts, isLoading, saveDraft, deleteDraft, refresh: loadDrafts };
}

// UI Component
interface DraftManagerProps {
    onSelectDraft: (draft: Draft) => void;
    onClose: () => void;
}

export function DraftManager({ onSelectDraft, onClose }: DraftManagerProps) {
    const { drafts, isLoading, deleteDraft } = useDrafts();

    return (
        <div className="bg-[#0A0A0F] rounded-2xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="font-semibold text-white">Drafts</h3>
                <button onClick={onClose} className="text-white/40 hover:text-white" aria-label="Close">
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
                {isLoading && (
                    <div className="p-8 text-center text-white/40">Loading drafts...</div>
                )}

                {!isLoading && drafts.length === 0 && (
                    <div className="p-8 text-center text-white/40 text-sm">No drafts saved yet</div>
                )}

                <AnimatePresence>
                    {drafts.map((draft) => (
                        <motion.div
                            key={draft.id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0"
                            onClick={() => onSelectDraft(draft)}
                        >
                            {/* Thumbnail */}
                            <div className="w-14 h-14 rounded-lg bg-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                {draft.thumbnailUrl ? (
                                    <img src={draft.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl">
                                        {draft.type === 'VIDEO' ? '🎬' : draft.type === 'IMAGE' ? '🖼' : '📝'}
                                    </span>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm truncate">{draft.caption || 'Untitled draft'}</p>
                                <p className="text-white/40 text-xs">
                                    {new Date(draft.updatedAt).toLocaleDateString()} · {draft.type}
                                </p>
                            </div>

                            {/* Delete */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteDraft(draft.id);
                                }}
                                className="text-white/30 hover:text-red-400 p-1"
                                aria-label="Delete draft"
                            >
                                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" strokeLinecap="round" />
                                </svg>
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
