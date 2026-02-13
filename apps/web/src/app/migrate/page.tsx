'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ProtectedRoute, useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/lib/api';
import { NavigationSidebar } from '@/components/dashboard/NavigationSidebar';

interface Platform {
    id: string;
    name: string;
    description: string;
    ready: boolean;
    instructions: string[];
    estimatedTime: string;
    acceptedFiles: string;
}

interface MigrationStatus {
    id: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    platform: string;
    stats?: {
        postsImported: number;
        postsFailed: number;
        connectionsImported: number;
        connectionsMatched: number;
    };
    createdAt: string;
}

const PLATFORMS: Platform[] = [
    {
        id: 'INSTAGRAM',
        name: 'Instagram',
        description: 'Import your posts, stories, followers, and following list.',
        ready: true,
        instructions: [
            'Open Instagram and go to Settings > Accounts Center',
            'Select "Your information and permissions" > "Download your information"',
            'Choose "Some of your information" and select Posts, Stories, Followers, Following',
            'Select JSON format and request the download',
            'You will receive an email within 24-48 hours with a download link',
            'Download the ZIP file and upload it below',
        ],
        estimatedTime: '24-48 hours for Instagram to prepare your data',
        acceptedFiles: '.zip',
    },
    {
        id: 'TIKTOK',
        name: 'TikTok',
        description: 'Import your videos, likes, and connections.',
        ready: true,
        instructions: [
            'Open TikTok and go to Settings > Privacy',
            'Tap "Download your data"',
            'Choose JSON format',
            'Request the download and wait for notification',
            'Download the ZIP file and upload it below',
        ],
        estimatedTime: '1-3 days for TikTok to prepare your data',
        acceptedFiles: '.zip',
    },
    {
        id: 'WHATSAPP',
        name: 'WhatsApp',
        description: 'Import chat history and media from any conversation.',
        ready: true,
        instructions: [
            'Open a chat in WhatsApp',
            'Tap the menu (three dots) > More > Export Chat',
            'Choose whether to include or exclude media',
            'Share the exported .txt file here',
        ],
        estimatedTime: 'Instant processing',
        acceptedFiles: '.txt,.zip',
    },
    {
        id: 'TWITTER',
        name: 'X (Twitter)',
        description: 'Import your tweets, likes, and followers.',
        ready: false,
        instructions: [],
        estimatedTime: '',
        acceptedFiles: '.zip',
    },
    {
        id: 'FACEBOOK',
        name: 'Facebook',
        description: 'Import your posts, photos, and connections.',
        ready: false,
        instructions: [],
        estimatedTime: '',
        acceptedFiles: '.zip',
    },
];

function MigrateContent() {
    const { user } = useAuth();
    const [step, setStep] = useState<'select' | 'instructions' | 'upload' | 'processing' | 'complete'>('select');
    const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [migration, setMigration] = useState<MigrationStatus | null>(null);
    const [error, setError] = useState('');
    const [pastMigrations, setPastMigrations] = useState<MigrationStatus[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('0g_token') : null;

    // Fetch past migrations
    useEffect(() => {
        if (!token) return;
        fetch(`${API_URL}/api/v1/migration`, {
            headers: { 'Authorization': `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : [])
            .then(data => { if (Array.isArray(data)) setPastMigrations(data); })
            .catch(() => {});
    }, [token]);

    const pollStatus = useCallback((migrationId: string) => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch(`${API_URL}/api/v1/migration/${migrationId}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setMigration(data);
                    if (data.status === 'COMPLETED' || data.status === 'FAILED') {
                        if (pollRef.current) clearInterval(pollRef.current);
                        setStep(data.status === 'COMPLETED' ? 'complete' : 'upload');
                        if (data.status === 'FAILED') setError('Migration failed. Please try again.');
                    }
                }
            } catch { /* */ }
        }, 3000);
    }, [token]);

    useEffect(() => {
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    const handleUpload = async (file: File) => {
        if (!selectedPlatform || !token) return;
        setUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('platform', selectedPlatform.id);

        try {
            const res = await fetch(`${API_URL}/api/v1/migration/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                setMigration({ id: data.migrationId || data.id, status: 'PROCESSING', platform: selectedPlatform.id, createdAt: new Date().toISOString() });
                setStep('processing');
                pollStatus(data.migrationId || data.id);
            } else {
                setError(data.error || 'Upload failed. Please try again.');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
    };

    const selectPlatform = (platform: Platform) => {
        if (!platform.ready) return;
        setSelectedPlatform(platform);
        setStep('instructions');
    };

    const resetFlow = () => {
        setStep('select');
        setSelectedPlatform(null);
        setMigration(null);
        setError('');
    };

    return (
        <div className="min-h-screen bg-[#030305]">
            <NavigationSidebar />
            <main className="pt-20 pb-16 px-4 md:px-8 max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-white mb-2">Import Your Data</h1>
                    <p className="text-white/50">Bring your content, connections, and memories from other platforms into ZeroG.</p>
                </div>

                <AnimatePresence mode="wait">
                    {/* Step 1: Platform Selection */}
                    {step === 'select' && (
                        <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {PLATFORMS.map(platform => (
                                    <button
                                        key={platform.id}
                                        onClick={() => selectPlatform(platform)}
                                        disabled={!platform.ready}
                                        className={`text-left p-5 rounded-2xl border transition-all duration-300 ${
                                            platform.ready
                                                ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] cursor-pointer'
                                                : 'bg-white/[0.01] border-white/[0.03] opacity-50 cursor-not-allowed'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold text-white">{platform.name}</h3>
                                            {!platform.ready && (
                                                <span className="text-[10px] uppercase tracking-wider text-white/30 bg-white/5 px-2 py-0.5 rounded">This feature is being finalized</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-white/40 leading-relaxed">{platform.description}</p>
                                    </button>
                                ))}
                            </div>

                            {/* Past Migrations */}
                            {pastMigrations.length > 0 && (
                                <div className="mt-12">
                                    <h2 className="text-lg font-semibold text-white mb-4">Previous Imports</h2>
                                    <div className="space-y-2">
                                        {pastMigrations.map(m => (
                                            <div key={m.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                                                <div>
                                                    <p className="text-sm font-medium text-white">{m.platform}</p>
                                                    <p className="text-xs text-white/30">{new Date(m.createdAt).toLocaleDateString()}</p>
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded ${
                                                    m.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    m.status === 'PROCESSING' ? 'bg-amber-500/20 text-amber-400' :
                                                    m.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-white/10 text-white/40'
                                                }`}>
                                                    {m.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Step 2: Instructions */}
                    {step === 'instructions' && selectedPlatform && (
                        <motion.div key="instructions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                            <button onClick={resetFlow} className="text-sm text-white/40 hover:text-white mb-6 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" /></svg>
                                Back to platforms
                            </button>

                            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 md:p-8">
                                <h2 className="text-xl font-semibold text-white mb-2">Import from {selectedPlatform.name}</h2>
                                <p className="text-sm text-white/40 mb-6">Follow these steps to export your data, then upload the file below.</p>

                                <div className="space-y-4 mb-8">
                                    {selectedPlatform.instructions.map((instruction, i) => (
                                        <div key={i} className="flex gap-4">
                                            <div className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                                                <span className="text-xs font-medium text-white/50">{i + 1}</span>
                                            </div>
                                            <p className="text-sm text-white/70 leading-relaxed pt-1">{instruction}</p>
                                        </div>
                                    ))}
                                </div>

                                {selectedPlatform.estimatedTime && (
                                    <div className="bg-white/[0.03] border border-white/[0.04] rounded-xl p-4 mb-6">
                                        <p className="text-xs text-white/40">
                                            <span className="font-medium text-white/60">Estimated wait:</span>{' '}
                                            {selectedPlatform.estimatedTime}
                                        </p>
                                    </div>
                                )}

                                <button
                                    onClick={() => setStep('upload')}
                                    className="w-full py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all"
                                >
                                    I have my file ready — Continue
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Upload */}
                    {step === 'upload' && selectedPlatform && (
                        <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                            <button onClick={() => setStep('instructions')} className="text-sm text-white/40 hover:text-white mb-6 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" /></svg>
                                Back to instructions
                            </button>

                            <div
                                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
                                    isDragging ? 'border-[#7C8FFF]/50 bg-[#7C8FFF]/5' :
                                    'border-white/[0.08] hover:border-white/[0.15] bg-white/[0.02] hover:bg-white/[0.04]'
                                }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={selectedPlatform.acceptedFiles}
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                                    <svg className="w-7 h-7 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    {uploading ? 'Uploading...' : 'Drop your file here'}
                                </h3>
                                <p className="text-sm text-white/40 mb-1">or click to browse</p>
                                <p className="text-xs text-white/20">Accepted formats: {selectedPlatform.acceptedFiles}</p>
                            </div>

                            {error && (
                                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Step 4: Processing */}
                    {step === 'processing' && (
                        <motion.div key="processing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center py-16">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#7C8FFF]/10 border border-[#7C8FFF]/20 flex items-center justify-center">
                                <motion.svg
                                    className="w-8 h-8 text-[#7C8FFF]"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </motion.svg>
                            </div>
                            <h2 className="text-2xl font-semibold text-white mb-3">Processing Your Data</h2>
                            <p className="text-white/50 max-w-md mx-auto">
                                We are importing your content from {selectedPlatform?.name}. This may take a few minutes depending on the size of your data.
                            </p>
                        </motion.div>
                    )}

                    {/* Step 5: Complete */}
                    {step === 'complete' && migration && (
                        <motion.div key="complete" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center py-16">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-semibold text-white mb-3">Import Complete</h2>
                            {migration.stats && (
                                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-8 mt-6">
                                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                                        <p className="text-2xl font-bold text-white">{migration.stats.postsImported}</p>
                                        <p className="text-xs text-white/40">Posts Imported</p>
                                    </div>
                                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                                        <p className="text-2xl font-bold text-white">{migration.stats.connectionsMatched}</p>
                                        <p className="text-xs text-white/40">Connections Found</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center justify-center gap-4">
                                <button onClick={resetFlow} className="px-6 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm font-medium hover:bg-white/[0.1] transition-all">
                                    Import More
                                </button>
                                <Link href="/dashboard" className="px-6 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all">
                                    Go to Dashboard
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

export default function MigratePage() {
    return (
        <ProtectedRoute>
            <MigrateContent />
        </ProtectedRoute>
    );
}
