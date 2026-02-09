'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiFetch } from '@/lib/api';

interface SecurityFeature {
    id: string;
    label: string;
    description: string;
    points: number;
    enabled: boolean;
    actionUrl?: string;
    actionLabel?: string;
}

export function PrivacyScore({ compact = false }: { compact?: boolean }) {
    const [features, setFeatures] = useState<SecurityFeature[]>([]);
    const [score, setScore] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkFeatures = async () => {
            try {
                // Check various security features
                const [authData, twoFaStatus] = await Promise.all([
                    apiFetch('/api/v1/auth/me').then(r => r?.error ? null : r).catch(() => null),
                    apiFetch('/api/v1/auth/2fa/status').then(r => r?.error ? null : r).catch(() => null),
                ]);

                // Check if E2E keys exist in IndexedDB
                let hasE2EKeys = false;
                try {
                    const db = await new Promise<IDBDatabase>((resolve, reject) => {
                        const req = indexedDB.open('0g_e2e_keys', 1);
                        req.onsuccess = () => resolve(req.result);
                        req.onerror = () => reject(req.error);
                    });
                    const tx = db.transaction('keys', 'readonly');
                    const keyId = await new Promise<string | undefined>((resolve) => {
                        const req = tx.objectStore('keys').get('currentIdentityKeyId');
                        req.onsuccess = () => resolve(req.result);
                        req.onerror = () => resolve(undefined);
                    });
                    hasE2EKeys = !!keyId;
                    db.close();
                } catch {}

                const featureList: SecurityFeature[] = [
                    {
                        id: 'account',
                        label: 'Account Created',
                        description: 'You have an active account',
                        points: 10,
                        enabled: true,
                    },
                    {
                        id: 'email-verified',
                        label: 'Email Verified',
                        description: 'Your email address is verified',
                        points: 15,
                        enabled: !!authData?.emailVerified || !!authData?.email,
                    },
                    {
                        id: '2fa',
                        label: 'Two-Factor Authentication',
                        description: 'Extra protection on your account',
                        points: 25,
                        enabled: twoFaStatus?.enabled === true,
                        actionUrl: '/settings',
                        actionLabel: 'Enable 2FA',
                    },
                    {
                        id: 'e2e-keys',
                        label: 'End-to-End Encryption',
                        description: 'Your messages are encrypted on-device',
                        points: 25,
                        enabled: hasE2EKeys,
                        actionUrl: '/settings',
                        actionLabel: 'Set Up Encryption',
                    },
                    {
                        id: 'strong-password',
                        label: 'Strong Password',
                        description: 'Your password meets security standards',
                        points: 15,
                        enabled: true, // Enforced at signup
                    },
                    {
                        id: 'privacy-review',
                        label: 'Privacy Reviewed',
                        description: 'You\'ve reviewed our privacy practices',
                        points: 10,
                        enabled: localStorage.getItem('0g_privacy_reviewed') === 'true',
                        actionUrl: '/transparency',
                        actionLabel: 'Review Now',
                    },
                ];

                setFeatures(featureList);
                setScore(featureList.filter(f => f.enabled).reduce((sum, f) => sum + f.points, 0));
            } catch {}
            setIsLoading(false);
        };

        checkFeatures();
    }, []);

    const getScoreColor = (s: number) => {
        if (s >= 80) return '#10B981'; // Emerald
        if (s >= 50) return '#F59E0B'; // Amber
        return '#EF4444'; // Red
    };

    const getScoreLabel = (s: number) => {
        if (s >= 80) return 'Excellent';
        if (s >= 50) return 'Good';
        if (s >= 30) return 'Fair';
        return 'Needs Attention';
    };

    if (isLoading) return null;

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <div className="relative w-8 h-8">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                        <motion.circle
                            cx="18" cy="18" r="16" fill="none"
                            stroke={getScoreColor(score)}
                            strokeWidth="3"
                            strokeDasharray={`${score} 100`}
                            strokeLinecap="round"
                            initial={{ strokeDasharray: '0 100' }}
                            animate={{ strokeDasharray: `${score} 100` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                        />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                        {score}
                    </span>
                </div>
                <span className="text-xs text-white/50">Privacy</span>
            </div>
        );
    }

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            {/* Score circle */}
            <div className="flex items-center gap-6 mb-6">
                <div className="relative w-24 h-24 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                        <motion.circle
                            cx="18" cy="18" r="16" fill="none"
                            stroke={getScoreColor(score)}
                            strokeWidth="2.5"
                            strokeDasharray={`${score} 100`}
                            strokeLinecap="round"
                            initial={{ strokeDasharray: '0 100' }}
                            animate={{ strokeDasharray: `${score} 100` }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.span
                            className="text-2xl font-bold text-white"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            {score}
                        </motion.span>
                        <span className="text-[10px] text-white/40">/ 100</span>
                    </div>
                </div>
                <div>
                    <h3 className="text-white font-semibold text-lg">Privacy Score</h3>
                    <p className="text-sm" style={{ color: getScoreColor(score) }}>{getScoreLabel(score)}</p>
                    <p className="text-white/40 text-xs mt-1">
                        {features.filter(f => !f.enabled).length} improvements available
                    </p>
                </div>
            </div>

            {/* Feature list */}
            <div className="space-y-2">
                {features.map((feature) => (
                    <div
                        key={feature.id}
                        className={`flex items-center gap-3 p-3 rounded-xl ${feature.enabled ? 'bg-emerald-500/5' : 'bg-white/5'}`}
                    >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            feature.enabled ? 'bg-emerald-500/20' : 'bg-white/10'
                        }`}>
                            {feature.enabled ? (
                                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={3}>
                                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : (
                                <span className="text-white/30 text-xs">+{feature.points}</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${feature.enabled ? 'text-white' : 'text-white/60'}`}>
                                {feature.label}
                            </p>
                            <p className="text-white/30 text-xs">{feature.description}</p>
                        </div>
                        {!feature.enabled && feature.actionUrl && (
                            <a
                                href={feature.actionUrl}
                                className="text-[#D4AF37] text-xs font-medium hover:underline flex-shrink-0"
                            >
                                {feature.actionLabel}
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
