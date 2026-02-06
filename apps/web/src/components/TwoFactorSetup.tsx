'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldIcon, QrCodeIcon, CopyIcon, CheckCircleIcon, SmartphoneIcon, KeyIcon, DownloadIcon, CloseIcon } from '@/components/icons';

// ============================================
// TYPES
// ============================================
interface TwoFactorSetupProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

interface SetupData {
    qrCodeUrl: string;
    secret: string;
}

// ============================================
// API FUNCTIONS
// ============================================
import { API_URL } from '@/lib/api';

const API_BASE = `${API_URL}/api/v1/auth`;

async function setupTwoFactor(): Promise<{ success: boolean; data?: SetupData; error?: string }> {
    try {
        const token = localStorage.getItem('0g_token');
        const response = await fetch(`${API_BASE}/2fa/setup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });
        const data = await response.json();
        if (response.ok) {
            return { success: true, data: { qrCodeUrl: data.qrCodeUrl, secret: data.secret } };
        }
        return { success: false, error: data.error || 'Failed to set up 2FA' };
    } catch (error) {
        return { success: false, error: 'Network error. Please try again.' };
    }
}

async function verifyAndEnable(code: string): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
    try {
        const token = localStorage.getItem('0g_token');
        const response = await fetch(`${API_BASE}/2fa/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ code }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
            return { success: true, backupCodes: data.backupCodes };
        }
        return { success: false, error: data.error || 'Invalid code' };
    } catch (error) {
        return { success: false, error: 'Network error. Please try again.' };
    }
}

// ============================================
// CODE INPUT COMPONENT
// ============================================
function VerificationCodeInput({
    onComplete,
    disabled,
}: {
    onComplete: (code: string) => void;
    disabled?: boolean;
}) {
    const [code, setCode] = useState('');
    const [error, setError] = useState(false);

    const handleChange = (value: string) => {
        // Only digits
        const cleaned = value.replace(/\D/g, '').slice(0, 6);
        setCode(cleaned);
        setError(false);

        if (cleaned.length === 6) {
            onComplete(cleaned);
        }
    };

    return (
        <div className="relative">
            <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="000000"
                disabled={disabled}
                className={`
                    w-full px-4 py-3 text-center text-2xl font-mono tracking-[0.5em]
                    rounded-xl bg-white/5 border-2
                    focus:outline-none focus:ring-2 focus:ring-offset-0
                    transition-all duration-200
                    placeholder:text-white/20
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${error
                        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30 text-red-400'
                        : code.length === 6
                            ? 'border-green-500/50 text-white'
                            : 'border-white/20 focus:border-[#00D4FF] focus:ring-[#00D4FF]/30 text-white'
                    }
                `}
            />
        </div>
    );
}

// ============================================
// BACKUP CODES DISPLAY
// ============================================
function BackupCodesDisplay({ codes, onDone }: { codes: string[]; onDone: () => void }) {
    const [copied, setCopied] = useState(false);
    const [downloaded, setDownloaded] = useState(false);

    const copyToClipboard = () => {
        const text = codes.join('\n');
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const downloadCodes = () => {
        const text = `0G Two-Factor Authentication Backup Codes\n${'='.repeat(45)}\n\nStore these codes in a safe place. Each code can only be used once.\n\n${codes.map((code, i) => `${i + 1}. ${code}`).join('\n')}\n\nGenerated: ${new Date().toLocaleDateString()}`;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '0g-backup-codes.txt';
        a.click();
        URL.revokeObjectURL(url);
        setDownloaded(true);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
        >
            {/* Success Icon */}
            <motion.div
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15, delay: 0.2 }}
            >
                <CheckCircleIcon size={40} className="text-green-400" />
            </motion.div>

            <h3 className="text-xl font-bold text-white mb-2">
                2FA Enabled Successfully!
            </h3>
            <p className="text-white/50 text-sm mb-6">
                Save these backup codes in a secure location
            </p>

            {/* Backup Codes Grid */}
            <div className="bg-white/5 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-2 gap-2">
                    {codes.map((code, i) => (
                        <motion.div
                            key={code}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 + 0.3 }}
                            className="py-2 px-3 rounded-lg bg-white/5 font-mono text-sm text-white/90"
                        >
                            {code}
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Warning */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
                <p className="text-amber-400 text-sm">
                    ⚠️ These codes will only be shown once.
                    Make sure to save them before closing this window.
                </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
                <button
                    onClick={copyToClipboard}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${copied
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
                        }`}
                >
                    {copied ? <CheckCircleIcon size={18} /> : <CopyIcon size={18} />}
                    {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                    onClick={downloadCodes}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${downloaded
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
                        }`}
                >
                    {downloaded ? <CheckCircleIcon size={18} /> : <DownloadIcon size={18} />}
                    {downloaded ? 'Downloaded!' : 'Download'}
                </button>
            </div>

            {/* Done Button */}
            <button
                onClick={onDone}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-black font-semibold hover:opacity-90 transition-opacity"
            >
                Done
            </button>
        </motion.div>
    );
}

// ============================================
// MAIN 2FA SETUP COMPONENT
// ============================================
export function TwoFactorSetup({ isOpen, onClose, onComplete }: TwoFactorSetupProps) {
    const [step, setStep] = useState<'loading' | 'scan' | 'verify' | 'backup'>('loading');
    const [setupData, setSetupData] = useState<SetupData | null>(null);
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [secretCopied, setSecretCopied] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState('');

    // Initialize setup when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep('loading');
            setSetupData(null);
            setBackupCodes([]);
            setError('');

            // Start setup
            setupTwoFactor().then(result => {
                if (result.success && result.data) {
                    setSetupData(result.data);
                    setStep('scan');
                } else {
                    setError(result.error || 'Failed to initialize 2FA setup');
                    setStep('scan');
                }
            });
        }
    }, [isOpen]);

    const handleVerify = async (code: string) => {
        setIsVerifying(true);
        setError('');

        const result = await verifyAndEnable(code);

        if (result.success && result.backupCodes) {
            setBackupCodes(result.backupCodes);
            setStep('backup');
        } else {
            setError(result.error || 'Invalid verification code');
        }

        setIsVerifying(false);
    };

    const copySecret = () => {
        if (setupData?.secret) {
            navigator.clipboard.writeText(setupData.secret);
            setSecretCopied(true);
            setTimeout(() => setSecretCopied(false), 2000);
        }
    };

    const handleDone = () => {
        onComplete();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Backdrop */}
                <motion.div
                    className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                    onClick={step !== 'backup' ? onClose : undefined}
                />

                {/* Modal */}
                <motion.div
                    className="relative w-full max-w-md bg-[#0A0A0F] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        <h2 className="text-xl font-bold text-white">
                            {step === 'backup' ? '2FA Enabled!' : 'Set Up Two-Factor Authentication'}
                        </h2>
                        {step !== 'backup' && (
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <CloseIcon size={20} />
                            </button>
                        )}
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {step === 'loading' && (
                            <div className="text-center py-12">
                                <motion.div
                                    className="w-12 h-12 mx-auto border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                />
                                <p className="mt-4 text-white/50">Setting up 2FA...</p>
                            </div>
                        )}

                        {step === 'scan' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                {/* Step indicator */}
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="w-6 h-6 rounded-full bg-[#00D4FF] text-black text-xs font-bold flex items-center justify-center">1</span>
                                    <span className="text-sm text-white/70">Scan QR Code</span>
                                    <div className="flex-1 h-px bg-white/10" />
                                    <span className="w-6 h-6 rounded-full bg-white/10 text-white/50 text-xs font-bold flex items-center justify-center">2</span>
                                    <span className="text-sm text-white/50">Verify</span>
                                </div>

                                {/* Instructions */}
                                <div className="flex items-start gap-3 mb-6 p-4 rounded-xl bg-white/5">
                                    <SmartphoneIcon size={24} className="text-[#00D4FF] flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-white/80 font-medium">
                                            Open your authenticator app
                                        </p>
                                        <p className="text-xs text-white/50 mt-1">
                                            Google Authenticator, Authy, 1Password, or similar
                                        </p>
                                    </div>
                                </div>

                                {/* QR Code */}
                                {setupData ? (
                                    <div className="bg-white rounded-2xl p-4 mb-4">
                                        <img
                                            src={setupData.qrCodeUrl}
                                            alt="2FA QR Code"
                                            className="w-full aspect-square"
                                        />
                                    </div>
                                ) : error ? (
                                    <div className="p-8 text-center">
                                        <p className="text-red-400">{error}</p>
                                        <button
                                            onClick={() => {
                                                setStep('loading');
                                                setError('');
                                                setupTwoFactor().then(result => {
                                                    if (result.success && result.data) {
                                                        setSetupData(result.data);
                                                        setStep('scan');
                                                    } else {
                                                        setError(result.error || 'Failed to initialize');
                                                        setStep('scan');
                                                    }
                                                });
                                            }}
                                            className="mt-4 px-4 py-2 rounded-lg bg-white/10 text-white text-sm"
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                ) : null}

                                {/* Manual Entry */}
                                {setupData && (
                                    <div className="mb-6">
                                        <p className="text-xs text-white/50 text-center mb-2">
                                            Or enter this code manually:
                                        </p>
                                        <button
                                            onClick={copySecret}
                                            className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
                                        >
                                            <code className="text-sm font-mono text-white/80 truncate">
                                                {setupData.secret}
                                            </code>
                                            {secretCopied ? (
                                                <CheckCircleIcon size={18} className="text-green-400 flex-shrink-0" />
                                            ) : (
                                                <CopyIcon size={18} className="text-white/50 group-hover:text-white flex-shrink-0" />
                                            )}
                                        </button>
                                    </div>
                                )}

                                {/* Continue Button */}
                                <button
                                    onClick={() => setStep('verify')}
                                    disabled={!setupData}
                                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#8B5CF6] text-black font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Continue
                                </button>
                            </motion.div>
                        )}

                        {step === 'verify' && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                            >
                                {/* Step indicator */}
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="w-6 h-6 rounded-full bg-green-500 text-black text-xs font-bold flex items-center justify-center">✓</span>
                                    <span className="text-sm text-white/50">Scan QR Code</span>
                                    <div className="flex-1 h-px bg-white/10" />
                                    <span className="w-6 h-6 rounded-full bg-[#00D4FF] text-black text-xs font-bold flex items-center justify-center">2</span>
                                    <span className="text-sm text-white/70">Verify</span>
                                </div>

                                {/* Instructions */}
                                <div className="text-center mb-6">
                                    <KeyIcon size={48} className="mx-auto text-[#00D4FF] mb-4" />
                                    <h3 className="text-lg font-semibold text-white mb-2">
                                        Enter Verification Code
                                    </h3>
                                    <p className="text-sm text-white/50">
                                        Enter the 6-digit code from your authenticator app
                                    </p>
                                </div>

                                {/* Code Input */}
                                <div className="mb-6">
                                    <VerificationCodeInput
                                        onComplete={handleVerify}
                                        disabled={isVerifying}
                                    />
                                </div>

                                {/* Error */}
                                {error && (
                                    <motion.div
                                        className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                {/* Loading State */}
                                {isVerifying && (
                                    <div className="text-center py-4">
                                        <motion.div
                                            className="w-8 h-8 mx-auto border-2 border-[#00D4FF]/30 border-t-[#00D4FF] rounded-full"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                        />
                                        <p className="mt-2 text-sm text-white/50">Verifying...</p>
                                    </div>
                                )}

                                {/* Back Button */}
                                <button
                                    onClick={() => setStep('scan')}
                                    disabled={isVerifying}
                                    className="w-full py-3 rounded-xl bg-white/5 text-white/70 font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
                                >
                                    ← Back to QR Code
                                </button>
                            </motion.div>
                        )}

                        {step === 'backup' && (
                            <BackupCodesDisplay codes={backupCodes} onDone={handleDone} />
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

export default TwoFactorSetup;
