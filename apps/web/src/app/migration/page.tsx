'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

type Platform = 'instagram' | 'tiktok' | 'twitter' | 'facebook' | 'whatsapp';
type WizardStep = 'select' | 'guide' | 'upload' | 'processing' | 'connections' | 'invite' | 'complete';

interface PlatformInfo {
    id: Platform;
    name: string;
    icon: string;
    color: string;
    instructions: string[];
    estimatedTime: string;
    available: boolean;
}

const platforms: PlatformInfo[] = [
    {
        id: 'instagram',
        name: 'Instagram',
        icon: '📷',
        color: 'from-purple-500 to-pink-500',
        estimatedTime: '24-48 hours for file',
        available: true,
        instructions: [
            'Open Instagram app → Settings',
            'Accounts Center → Your information and permissions',
            'Download your information',
            'Select "Some of your information"',
            'Choose Posts, Stories, Followers, Following',
            'Request download and wait for email',
            'Download ZIP file and upload here',
        ],
    },
    {
        id: 'tiktok',
        name: 'TikTok',
        icon: '🎵',
        color: 'from-gray-900 to-gray-700',
        estimatedTime: '1-3 days for file',
        available: true,
        instructions: [
            'Open TikTok → Profile → Menu (☰)',
            'Settings and privacy → Account',
            'Download your data',
            'Select JSON format',
            'Request data and wait for notification',
            'Download ZIP file and upload here',
        ],
    },
    {
        id: 'twitter',
        name: 'X (Twitter)',
        icon: '𝕏',
        color: 'from-gray-800 to-black',
        estimatedTime: '24-48 hours for file',
        available: false,
        instructions: [
            'Go to Settings → Your Account',
            'Download an archive of your data',
            'Verify your identity',
            'Wait for email with download link',
            'Download ZIP and upload here',
        ],
    },
    {
        id: 'facebook',
        name: 'Facebook',
        icon: '📘',
        color: 'from-blue-600 to-blue-800',
        estimatedTime: '24-48 hours for file',
        available: false,
        instructions: [
            'Settings → Your Facebook Information',
            'Download Your Information',
            'Choose JSON format',
            'Select data types and create file',
            'Download and upload here',
        ],
    },
    {
        id: 'whatsapp',
        name: 'WhatsApp',
        icon: '💬',
        color: 'from-green-500 to-green-700',
        estimatedTime: 'Instant',
        available: false,
        instructions: [
            'Open the chat you want to export',
            'Tap More (⋯) → Export Chat',
            'Choose to include media or not',
            'Share the file and upload here',
        ],
    },
];

export default function MigrationPage() {
    const [step, setStep] = useState<WizardStep>('select');
    const [selectedPlatform, setSelectedPlatform] = useState<PlatformInfo | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [processingStep, setProcessingStep] = useState(0);
    const [connections, setConnections] = useState<{ matched: number; invitable: number; total: number }>({
        matched: 0,
        invitable: 0,
        total: 0,
    });
    const [selectedConnections, setSelectedConnections] = useState<string[]>([]);

    const handlePlatformSelect = (platform: PlatformInfo) => {
        if (!platform.available) return;
        setSelectedPlatform(platform);
        setStep('guide');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        setStep('upload');
    };

    const handleStartUpload = async () => {
        if (!file || !selectedPlatform) return;

        setStep('processing');

        // Simulate upload progress
        for (let i = 0; i <= 100; i += 10) {
            await new Promise(r => setTimeout(r, 200));
            setUploadProgress(i);
        }

        // Simulate processing steps
        const steps = ['Extracting files...', 'Parsing content...', 'Importing posts...', 'Finding connections...'];
        for (let i = 0; i < steps.length; i++) {
            await new Promise(r => setTimeout(r, 1500));
            setProcessingStep(i + 1);
        }

        // Mock results
        setConnections({ matched: 47, invitable: 128, total: 234 });
        setStep('connections');
    };

    const handleSendInvites = async () => {
        // In production, call API to send invites
        await new Promise(r => setTimeout(r, 1500));
        setStep('complete');
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <header className="border-b border-gray-900 px-6 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                            <span className="text-gray-950 font-bold text-sm">C</span>
                        </div>
                        <span className="font-semibold">Migrate to Six22</span>
                    </div>
                    {step !== 'select' && step !== 'complete' && (
                        <button
                            onClick={() => {
                                setStep('select');
                                setSelectedPlatform(null);
                                setFile(null);
                                setUploadProgress(0);
                                setProcessingStep(0);
                            }}
                            className="text-sm text-gray-500 hover:text-white transition-colors"
                        >
                            Start Over
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12">
                <AnimatePresence mode="wait">
                    {/* Step 1: Platform Selection */}
                    {step === 'select' && (
                        <motion.div
                            key="select"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <div className="text-center mb-12">
                                <h1 className="text-3xl font-bold mb-3">Bring Your Content Home</h1>
                                <p className="text-gray-400 max-w-lg mx-auto">
                                    Import your posts, videos, and connections from other platforms.
                                    Your content, your community — now on Six22.
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {platforms.map((platform) => (
                                    <button
                                        key={platform.id}
                                        onClick={() => handlePlatformSelect(platform)}
                                        disabled={!platform.available}
                                        className={`group relative p-6 rounded-2xl border transition-all duration-300 text-left
                      ${platform.available
                                                ? 'border-gray-800 hover:border-gray-700 hover:bg-gray-900/50 cursor-pointer'
                                                : 'border-gray-900 opacity-50 cursor-not-allowed'
                                            }`}
                                    >
                                        <div className={`absolute inset-0 bg-gradient-to-br ${platform.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity`} />

                                        <div className="text-3xl mb-3">{platform.icon}</div>
                                        <div className="font-semibold mb-1">{platform.name}</div>
                                        <div className="text-sm text-gray-500">{platform.estimatedTime}</div>

                                        {!platform.available && (
                                            <div className="absolute top-4 right-4 text-xs bg-gray-800 px-2 py-1 rounded">
                                                Coming Soon
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2: Instructions Guide */}
                    {step === 'guide' && selectedPlatform && (
                        <motion.div
                            key="guide"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <div className="flex items-center gap-3 mb-8">
                                <span className="text-4xl">{selectedPlatform.icon}</span>
                                <div>
                                    <h1 className="text-2xl font-bold">Export from {selectedPlatform.name}</h1>
                                    <p className="text-gray-400">{selectedPlatform.estimatedTime}</p>
                                </div>
                            </div>

                            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-8">
                                <h2 className="font-semibold mb-4">How to download your data</h2>
                                <ol className="space-y-3">
                                    {selectedPlatform.instructions.map((instruction, i) => (
                                        <li key={i} className="flex gap-3">
                                            <span className="w-6 h-6 rounded-full bg-gray-800 text-gray-400 text-sm flex items-center justify-center flex-shrink-0">
                                                {i + 1}
                                            </span>
                                            <span className="text-gray-300">{instruction}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-8">
                                <h2 className="font-semibold mb-4">Already have your data file?</h2>
                                <label className="block">
                                    <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-gray-600 transition-colors">
                                        <input
                                            type="file"
                                            accept=".zip"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                        <div className="text-4xl mb-3">📁</div>
                                        <div className="font-medium mb-1">Drop your ZIP file here</div>
                                        <div className="text-sm text-gray-500">or click to browse</div>
                                    </div>
                                </label>
                            </div>

                            <p className="text-sm text-gray-500 text-center">
                                Your data is processed securely and never shared. We only import what you explicitly allow.
                            </p>
                        </motion.div>
                    )}

                    {/* Step 3: Upload Confirmation */}
                    {step === 'upload' && file && selectedPlatform && (
                        <motion.div
                            key="upload"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="text-center"
                        >
                            <div className="text-6xl mb-6">📦</div>
                            <h1 className="text-2xl font-bold mb-2">Ready to Import</h1>
                            <p className="text-gray-400 mb-8">
                                {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                            </p>

                            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 max-w-md mx-auto mb-8">
                                <h2 className="font-semibold mb-4">What we&apos;ll import:</h2>
                                <ul className="space-y-2 text-left">
                                    <li className="flex items-center gap-2 text-gray-300">
                                        <span className="text-green-500">✓</span> Posts & Media
                                    </li>
                                    <li className="flex items-center gap-2 text-gray-300">
                                        <span className="text-green-500">✓</span> Captions & Hashtags
                                    </li>
                                    <li className="flex items-center gap-2 text-gray-300">
                                        <span className="text-green-500">✓</span> Followers & Following
                                    </li>
                                    <li className="flex items-center gap-2 text-gray-300">
                                        <span className="text-green-500">✓</span> Original timestamps
                                    </li>
                                </ul>
                            </div>

                            <button
                                onClick={handleStartUpload}
                                className="bg-white text-gray-950 font-semibold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                Start Import
                            </button>
                        </motion.div>
                    )}

                    {/* Step 4: Processing */}
                    {step === 'processing' && (
                        <motion.div
                            key="processing"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="text-center"
                        >
                            <div className="relative w-24 h-24 mx-auto mb-8">
                                <motion.div
                                    className="absolute inset-0 border-4 border-gray-800 rounded-full"
                                />
                                <motion.div
                                    className="absolute inset-0 border-4 border-white rounded-full"
                                    style={{
                                        clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%)`,
                                        transform: `rotate(${(uploadProgress / 100) * 360}deg)`,
                                    }}
                                    initial={{ rotate: 0 }}
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center text-xl font-bold">
                                    {uploadProgress}%
                                </div>
                            </div>

                            <h1 className="text-2xl font-bold mb-2">
                                {uploadProgress < 100 ? 'Uploading...' : 'Processing...'}
                            </h1>

                            <div className="space-y-2 text-gray-400">
                                {['Extracting files...', 'Parsing content...', 'Importing posts...', 'Finding connections...'].map((text, i) => (
                                    <div
                                        key={i}
                                        className={`flex items-center justify-center gap-2 transition-colors
                      ${processingStep > i ? 'text-green-500' : processingStep === i ? 'text-white' : ''}`}
                                    >
                                        {processingStep > i ? '✓' : processingStep === i ? '•' : '○'} {text}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Step 5: Connections */}
                    {step === 'connections' && (
                        <motion.div
                            key="connections"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <div className="text-center mb-8">
                                <div className="text-6xl mb-4">🎉</div>
                                <h1 className="text-2xl font-bold mb-2">Import Complete!</h1>
                                <p className="text-gray-400">Your content has been imported to Six22</p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3 mb-8">
                                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-center">
                                    <div className="text-3xl font-bold mb-1">{connections.matched}</div>
                                    <div className="text-gray-400 text-sm">Already on Six22</div>
                                </div>
                                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-center">
                                    <div className="text-3xl font-bold mb-1">{connections.invitable}</div>
                                    <div className="text-gray-400 text-sm">Can be invited</div>
                                </div>
                                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-center">
                                    <div className="text-3xl font-bold mb-1">{connections.total}</div>
                                    <div className="text-gray-400 text-sm">Total connections</div>
                                </div>
                            </div>

                            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-8">
                                <h2 className="font-semibold mb-4">Invite your connections</h2>
                                <p className="text-gray-400 text-sm mb-4">
                                    We found {connections.invitable} connections with email addresses who can be invited to join Caravan.
                                </p>

                                <div className="flex items-center gap-2 mb-4">
                                    <input
                                        type="checkbox"
                                        id="selectAll"
                                        className="w-4 h-4 rounded border-gray-700 bg-gray-800"
                                        onChange={(e) => {
                                            setSelectedConnections(e.target.checked ? ['all'] : []);
                                        }}
                                    />
                                    <label htmlFor="selectAll" className="text-sm">
                                        Select all {connections.invitable} invitable connections
                                    </label>
                                </div>

                                <button
                                    onClick={() => setStep('invite')}
                                    className="w-full bg-white text-gray-950 font-semibold py-3 rounded-xl hover:bg-gray-100 transition-colors"
                                >
                                    Preview & Send Invites
                                </button>
                            </div>

                            <button
                                onClick={() => setStep('complete')}
                                className="w-full text-gray-500 hover:text-white transition-colors text-sm"
                            >
                                Skip for now
                            </button>
                        </motion.div>
                    )}

                    {/* Step 6: Invite Preview */}
                    {step === 'invite' && (
                        <motion.div
                            key="invite"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <h1 className="text-2xl font-bold mb-6">Preview Invite</h1>

                            <div className="bg-white text-gray-950 rounded-2xl p-6 mb-8 max-w-lg mx-auto">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 bg-gray-950 rounded-lg flex items-center justify-center">
                                        <span className="text-white font-bold text-sm">C</span>
                                    </div>
                                    <span className="font-semibold text-sm">Six22</span>
                                </div>

                                <h2 className="text-xl font-bold mb-3">You&apos;ve been invited to Six22!</h2>
                                <p className="text-gray-600 mb-4">
                                    A friend moved to Six22 and wants to stay connected with you.
                                </p>

                                <ul className="space-y-2 mb-6">
                                    <li className="flex items-center gap-2 text-sm">
                                        <span className="text-green-600">✓</span> Completely free
                                    </li>
                                    <li className="flex items-center gap-2 text-sm">
                                        <span className="text-green-600">✓</span> Privacy-first
                                    </li>
                                    <li className="flex items-center gap-2 text-sm">
                                        <span className="text-green-600">✓</span> No ads or manipulation
                                    </li>
                                </ul>

                                <div className="bg-gray-950 text-white text-center py-3 rounded-lg font-semibold">
                                    Join Six22 Free →
                                </div>
                            </div>

                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={() => setStep('connections')}
                                    className="px-6 py-3 border border-gray-700 rounded-xl hover:bg-gray-900 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleSendInvites}
                                    className="bg-white text-gray-950 font-semibold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors"
                                >
                                    Send {selectedConnections.includes('all') ? connections.invitable : selectedConnections.length} Invites
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 7: Complete */}
                    {step === 'complete' && (
                        <motion.div
                            key="complete"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="text-center"
                        >
                            <motion.div
                                className="text-8xl mb-6"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 10 }}
                            >
                                🏕️
                            </motion.div>
                            <h1 className="text-3xl font-bold mb-3">Welcome to Your Six22!</h1>
                            <p className="text-gray-400 mb-8 max-w-md mx-auto">
                                Your content has been imported and invites are on their way.
                                Start exploring your new home.
                            </p>

                            <div className="flex gap-4 justify-center">
                                <a
                                    href="/dashboard"
                                    className="bg-white text-gray-950 font-semibold px-8 py-3 rounded-xl hover:bg-gray-100 transition-colors"
                                >
                                    Go to Your Trail
                                </a>
                                <a
                                    href="/migration"
                                    className="px-6 py-3 border border-gray-700 rounded-xl hover:bg-gray-900 transition-colors"
                                >
                                    Import Another Platform
                                </a>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
