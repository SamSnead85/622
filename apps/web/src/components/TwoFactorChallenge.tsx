'use client';

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldIcon, KeyIcon, ArrowLeftIcon } from '@/components/icons';

// ============================================
// TYPES
// ============================================
interface TwoFactorChallengeProps {
    isOpen: boolean;
    onVerify: (code: string) => Promise<{ success: boolean; error?: string }>;
    onCancel: () => void;
    onUseBackupCode?: () => void;
    email?: string;
}

// ============================================
// 6-DIGIT CODE INPUT WITH AUTO-FOCUS
// ============================================
function CodeInput({
    value,
    onChange,
    onComplete,
    disabled,
    error,
}: {
    value: string;
    onChange: (value: string) => void;
    onComplete: (code: string) => void;
    disabled?: boolean;
    error?: boolean;
}) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [localValues, setLocalValues] = useState<string[]>(Array(6).fill(''));

    // Sync external value
    useEffect(() => {
        const chars = value.split('').slice(0, 6);
        const newValues = Array(6).fill('');
        chars.forEach((char, i) => {
            newValues[i] = char;
        });
        setLocalValues(newValues);
    }, [value]);

    const focusInput = (index: number) => {
        if (index >= 0 && index < 6 && inputRefs.current[index]) {
            inputRefs.current[index]?.focus();
        }
    };

    const handleChange = (index: number, newValue: string) => {
        // Only allow digits
        const digit = newValue.replace(/\D/g, '').slice(-1);

        const newValues = [...localValues];
        newValues[index] = digit;
        setLocalValues(newValues);

        const fullCode = newValues.join('');
        onChange(fullCode);

        // Auto-advance to next input
        if (digit && index < 5) {
            focusInput(index + 1);
        }

        // Auto-submit when complete
        if (fullCode.length === 6 && !fullCode.includes('')) {
            onComplete(fullCode);
        }
    };

    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if (!localValues[index] && index > 0) {
                // Move to previous input if current is empty
                focusInput(index - 1);
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            focusInput(index - 1);
        } else if (e.key === 'ArrowRight' && index < 5) {
            focusInput(index + 1);
        }
    };

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

        if (pastedData.length > 0) {
            const newValues = Array(6).fill('');
            pastedData.split('').forEach((char, i) => {
                if (i < 6) newValues[i] = char;
            });
            setLocalValues(newValues);
            onChange(pastedData);

            // Focus the next empty input or last input
            const nextEmpty = newValues.findIndex(v => !v);
            focusInput(nextEmpty === -1 ? 5 : nextEmpty);

            if (pastedData.length === 6) {
                onComplete(pastedData);
            }
        }
    };

    return (
        <div className="flex items-center justify-center gap-2 sm:gap-3">
            {Array(6).fill(null).map((_, index) => (
                <motion.input
                    key={index}
                    ref={el => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={localValues[index]}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    disabled={disabled}
                    className={`
                        w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold
                        rounded-xl border-2 bg-white/5
                        focus:outline-none focus:ring-2 focus:ring-offset-0
                        transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${error
                            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30 text-red-400'
                            : localValues[index]
                                ? 'border-[#7C8FFF]/50 text-white'
                                : 'border-white/20 focus:border-[#7C8FFF] focus:ring-[#7C8FFF]/30 text-white'
                        }
                    `}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{
                        scale: 1,
                        opacity: 1,
                        x: error ? [0, -5, 5, -5, 5, 0] : 0
                    }}
                    transition={{
                        delay: index * 0.05,
                        x: { duration: 0.4 }
                    }}
                    autoFocus={index === 0}
                />
            ))}
        </div>
    );
}

// ============================================
// MAIN 2FA CHALLENGE COMPONENT
// ============================================
export function TwoFactorChallenge({
    isOpen,
    onVerify,
    onCancel,
    onUseBackupCode,
    email,
}: TwoFactorChallengeProps) {
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setCode('');
            setError('');
            setIsLoading(false);
        }
    }, [isOpen]);

    const handleVerify = async (verifyCode: string) => {
        if (verifyCode.length !== 6) return;

        setIsLoading(true);
        setError('');

        try {
            const result = await onVerify(verifyCode);
            if (!result.success) {
                setError(result.error || 'Invalid code. Please try again.');
                setCode('');
            }
        } catch (err) {
            setError('Verification failed. Please try again.');
            setCode('');
        } finally {
            setIsLoading(false);
        }
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onCancel}
                />

                {/* Modal */}
                <motion.div
                    className="relative w-full max-w-md bg-[#0A0A0F] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50"
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                    {/* Back button */}
                    <button
                        onClick={onCancel}
                        className="absolute top-6 left-6 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeftIcon size={20} />
                    </button>

                    {/* Header */}
                    <div className="text-center mb-8">
                        <motion.div
                            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#7C8FFF]/20 to-[#6070EE]/20 border border-[#7C8FFF]/30 flex items-center justify-center"
                            initial={{ rotate: -10, scale: 0.8 }}
                            animate={{ rotate: 0, scale: 1 }}
                            transition={{ type: 'spring', damping: 15 }}
                        >
                            <ShieldIcon size={32} className="text-[#7C8FFF]" />
                        </motion.div>

                        <h2 className="text-2xl font-bold text-white mb-2">
                            Two-Factor Authentication
                        </h2>
                        <p className="text-white/50 text-sm">
                            Enter the 6-digit code from your authenticator app
                            {email && (
                                <span className="block mt-1 text-white/30">
                                    for {email}
                                </span>
                            )}
                        </p>
                    </div>

                    {/* Code Input */}
                    <div className="mb-6">
                        <CodeInput
                            value={code}
                            onChange={setCode}
                            onComplete={handleVerify}
                            disabled={isLoading}
                            error={!!error}
                        />
                    </div>

                    {/* Error Message */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Verify Button */}
                    <button
                        onClick={() => handleVerify(code)}
                        disabled={code.length !== 6 || isLoading}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#7C8FFF] to-[#6070EE] text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <motion.div
                                    className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                />
                                Verifying...
                            </span>
                        ) : (
                            'Verify Code'
                        )}
                    </button>

                    {/* Backup Code Link */}
                    {onUseBackupCode && (
                        <div className="mt-6 text-center">
                            <button
                                onClick={onUseBackupCode}
                                className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
                            >
                                <KeyIcon size={16} />
                                Use a backup code instead
                            </button>
                        </div>
                    )}

                    {/* Help Text */}
                    <p className="mt-6 text-center text-xs text-white/30">
                        Open your authenticator app (Google Authenticator, Authy, etc.)
                        to view your verification code.
                    </p>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// ============================================
// BACKUP CODE INPUT COMPONENT
// ============================================
export function BackupCodeChallenge({
    isOpen,
    onVerify,
    onCancel,
    onUseAuthenticator,
}: {
    isOpen: boolean;
    onVerify: (code: string) => Promise<{ success: boolean; error?: string }>;
    onCancel: () => void;
    onUseAuthenticator?: () => void;
}) {
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setCode('');
            setError('');
            setIsLoading(false);
        }
    }, [isOpen]);

    const handleVerify = async () => {
        if (code.length < 8) return;

        setIsLoading(true);
        setError('');

        try {
            const result = await onVerify(code.toUpperCase().replace(/\s/g, ''));
            if (!result.success) {
                setError(result.error || 'Invalid backup code. Please try again.');
            }
        } catch (err) {
            setError('Verification failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
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
                    onClick={onCancel}
                />

                {/* Modal */}
                <motion.div
                    className="relative w-full max-w-md bg-[#0A0A0F] border border-white/10 rounded-3xl p-8 shadow-2xl"
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                >
                    {/* Back button */}
                    <button
                        onClick={onCancel}
                        className="absolute top-6 left-6 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeftIcon size={20} />
                    </button>

                    {/* Header */}
                    <div className="text-center mb-8">
                        <motion.div
                            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center"
                        >
                            <KeyIcon size={32} className="text-amber-400" />
                        </motion.div>

                        <h2 className="text-2xl font-bold text-white mb-2">
                            Enter Backup Code
                        </h2>
                        <p className="text-white/50 text-sm">
                            Enter one of your saved backup codes
                        </p>
                    </div>

                    {/* Backup Code Input */}
                    <div className="mb-6">
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="XXXX-XXXX-XXXX"
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white text-center text-lg font-mono tracking-wider placeholder:text-white/30 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                            autoFocus
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Verify Button */}
                    <button
                        onClick={handleVerify}
                        disabled={code.length < 8 || isLoading}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Verifying...' : 'Verify Backup Code'}
                    </button>

                    {/* Switch to authenticator */}
                    {onUseAuthenticator && (
                        <div className="mt-6 text-center">
                            <button
                                onClick={onUseAuthenticator}
                                className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
                            >
                                <ShieldIcon size={16} />
                                Use authenticator app instead
                            </button>
                        </div>
                    )}

                    {/* Warning */}
                    <p className="mt-6 text-center text-xs text-amber-400/70">
                        ⚠️ Each backup code can only be used once
                    </p>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

export default TwoFactorChallenge;
