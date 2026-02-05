'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Users, Check, AlertCircle, Loader2 } from 'lucide-react';

interface Platform {
    id: string;
    name: string;
    icon: string;
    ready: boolean;
    instructions: string[];
    estimatedTime: string;
    comingSoon?: boolean;
}

interface MigrationStatus {
    id: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    stats?: {
        postsImported: number;
        postsFailed: number;
        connectionsImported: number;
        connectionsMatched: number;
    };
}

export default function MigratePage() {
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
    const [uploading, setUploading] = useState(false);

    const platforms: Platform[] = [
        {
            id: 'WHATSAPP',
            name: 'WhatsApp',
            icon: '💬',
            ready: true,
            instructions: [
                'Open a chat in WhatsApp',
                'Tap More > Export Chat',
                'Choose to include or exclude media',
                'Share the exported file here',
            ],
            estimatedTime: 'Instant',
        },
        {
            id: 'INSTAGRAM',
            name: 'Instagram',
            icon: '📷',
            ready: true,
            instructions: [
                'Open Instagram app and go to Settings',
                'Select "Accounts Center" > "Your information and permissions"',
                'Tap "Download your information"',
                'Select "Some of your information"',
                'Choose Posts, Stories, Followers and Following',
                'Request download and wait for email',
                'Download the ZIP file and upload here',
            ],
            estimatedTime: '24-48 hours to receive file',
        },
        {
            id: 'TIKTOK',
            name: 'TikTok',
            icon: '🎵',
            ready: true,
            instructions: [
                'Open TikTok app and go to Settings',
                'Select "Privacy" > "Download your data"',
                'Choose JSON format',
                'Request download and wait for notification',
                'Download the ZIP file and upload here',
            ],
            estimatedTime: '1-3 days to receive file',
        },
        {
            id: 'TWITTER',
            name: 'X (Twitter)',
            icon: '𝕏',
            ready: false,
            comingSoon: true,
            instructions: [],
            estimatedTime: '',
        },
    ];

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            if (!selectedPlatform || acceptedFiles.length === 0) return;

            setUploading(true);
            const file = acceptedFiles[0];

            const formData = new FormData();
            formData.append('file', file);
            formData.append('platform', selectedPlatform);

            try {
                const res = await fetch('/api/v1/migration/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    },
                    body: formData,
                });

                const data = await res.json();
                if (res.ok) {
                    setMigrationStatus({
                        id: data.migrationId,
                        status: 'PROCESSING',
                    });

                    // Poll for status
                    pollMigrationStatus(data.migrationId);
                } else {
                    alert('Upload failed: ' + data.error);
                }
            } catch (error) {
                console.error('Upload error:', error);
                alert('Upload failed');
            } finally {
                setUploading(false);
            }
        },
        [selectedPlatform]
    );

    const pollMigrationStatus = async (migrationId: string) => {
        const intervalId = setInterval(async () => {
            try {
                const res = await fetch(`/api/v1/migration/${migrationId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    },
                });

                const data = await res.json();
                if (data.migration) {
                    setMigrationStatus(data.migration);

                    if (
                        data.migration.status === 'COMPLETED' ||
                        data.migration.status === 'FAILED'
                    ) {
                        clearInterval(intervalId);
                    }
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 2000);
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/zip': ['.zip'],
            'application/x-zip-compressed': ['.zip'],
            'text/plain': ['.txt'],
        },
        multiple: false,
        disabled: uploading,
    });

    const selectedPlatformData = platforms.find((p) => p.id === selectedPlatform);

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-950 via-slate-900 to-cyan-950 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent mb-4">
                        Bring Your Community to 0G
                    </h1>
                    <p className="text-slate-300 text-lg">
                        Migrate your contacts and content from other platforms. No one left behind.
                    </p>
                </div>

                {/* Platform Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {platforms.map((platform) => (
                        <button
                            key={platform.id}
                            onClick={() => !platform.comingSoon && setSelectedPlatform(platform.id)}
                            disabled={platform.comingSoon}
                            className={`
                                relative p-6 rounded-2xl border-2 transition-all
                                ${selectedPlatform === platform.id
                                    ? 'border-cyan-400 bg-cyan-950/50 shadow-[0_0_30px_rgba(34,211,238,0.3)]'
                                    : platform.comingSoon
                                        ? 'border-slate-700 bg-slate-900/50 opacity-50 cursor-not-allowed'
                                        : 'border-slate-700 bg-slate-900/50 hover:border-violet-400 hover:shadow-[0_0_20px_rgba(167,139,250,0.2)]'
                                }
                            `}
                        >
                            <div className="text-5xl mb-3">{platform.icon}</div>
                            <div className="text-xl font-semibold text-white mb-1">
                                {platform.name}
                            </div>
                            {platform.comingSoon && (
                                <div className="text-sm text-slate-400">Coming Soon</div>
                            )}
                            {selectedPlatform === platform.id && (
                                <div className="absolute top-3 right-3">
                                    <Check className="w-6 h-6 text-cyan-400" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Instructions */}
                {selectedPlatformData && !selectedPlatformData.comingSoon && (
                    <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">
                            How to Export from {selectedPlatformData.name}
                        </h2>
                        <ol className="space-y-3 mb-6">
                            {selectedPlatformData.instructions.map((instruction, idx) => (
                                <li key={idx} className="flex items-start text-slate-300">
                                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-600 text-white flex items-center justify-center text-sm font-bold mr-3">
                                        {idx + 1}
                                    </span>
                                    <span>{instruction}</span>
                                </li>
                            ))}
                        </ol>
                        <div className="flex items-center text-sm text-slate-400">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            <span>Estimated time: {selectedPlatformData.estimatedTime}</span>
                        </div>
                    </div>
                )}

                {/* Upload Zone */}
                {selectedPlatform && selectedPlatformData && !selectedPlatformData.comingSoon && (
                    <div
                        {...getRootProps()}
                        className={`
                            border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
                            ${isDragActive
                                ? 'border-cyan-400 bg-cyan-950/30'
                                : 'border-slate-600 bg-slate-900/50 hover:border-violet-400'
                            }
                            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        <input {...getInputProps()} />
                        {uploading ? (
                            <div className="flex flex-col items-center">
                                <Loader2 className="w-16 h-16 text-cyan-400 animate-spin mb-4" />
                                <p className="text-white text-lg">Uploading and processing...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <Upload className="w-16 h-16 text-violet-400 mb-4" />
                                <p className="text-white text-xl font-semibold mb-2">
                                    {isDragActive
                                        ? 'Drop your file here'
                                        : 'Drag & drop your file here, or click to select'}
                                </p>
                                <p className="text-slate-400">
                                    Accepted formats: ZIP, TXT (max 500MB)
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Migration Status */}
                {migrationStatus && (
                    <div className="mt-8 bg-slate-900/80 border border-slate-700 rounded-2xl p-8">
                        <div className="flex items-center mb-6">
                            <Users className="w-8 h-8 text-cyan-400 mr-3" />
                            <h2 className="text-2xl font-bold text-white">Migration Status</h2>
                        </div>

                        {migrationStatus.status === 'PROCESSING' && (
                            <div className="flex items-center text-yellow-400">
                                <Loader2 className="w-5 h-5 animate-spin mr-3" />
                                <span>Processing your data...</span>
                            </div>
                        )}

                        {migrationStatus.status === 'COMPLETED' && migrationStatus.stats && (
                            <div className="space-y-4">
                                <div className="flex items-center text-green-400 mb-6">
                                    <Check className="w-6 h-6 mr-2" />
                                    <span className="text-lg font-semibold">
                                        Migration completed successfully!
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-800 rounded-lg p-4">
                                        <div className="text-3xl font-bold text-cyan-400">
                                            {migrationStatus.stats.connectionsImported}
                                        </div>
                                        <div className="text-slate-400">Contacts Imported</div>
                                    </div>
                                    <div className="bg-slate-800 rounded-lg p-4">
                                        <div className="text-3xl font-bold text-violet-400">
                                            {migrationStatus.stats.connectionsMatched}
                                        </div>
                                        <div className="text-slate-400">
                                            Already on 0G
                                        </div>
                                    </div>
                                    <div className="bg-slate-800 rounded-lg p-4">
                                        <div className="text-3xl font-bold text-green-400">
                                            {migrationStatus.stats.postsImported}
                                        </div>
                                        <div className="text-slate-400">Posts Imported</div>
                                    </div>
                                    <div className="bg-slate-800 rounded-lg p-4">
                                        <div className="text-3xl font-bold text-red-400">
                                            {migrationStatus.stats.postsFailed}
                                        </div>
                                        <div className="text-slate-400">Posts Failed</div>
                                    </div>
                                </div>
                                <button className="w-full mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-semibold hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all">
                                    Invite Your Contacts
                                </button>
                            </div>
                        )}

                        {migrationStatus.status === 'FAILED' && (
                            <div className="flex items-center text-red-400">
                                <AlertCircle className="w-6 h-6 mr-2" />
                                <span>Migration failed. Please try again.</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
