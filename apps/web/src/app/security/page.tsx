'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { NavigationSidebar } from '@/components/dashboard/NavigationSidebar';
import { API_URL } from '@/lib/api';

const API = API_URL;
const getToken = () => typeof window !== 'undefined'
    ? (localStorage.getItem('token') || localStorage.getItem('0g_token') || '')
    : '';

// ============================================
// TYPES
// ============================================
interface SecurityFeature {
    id: string;
    title: string;
    description: string;
    icon: string;
    status: 'active' | 'setup' | 'available';
    link?: string;
    color: string;
}

interface SafetyGuide {
    id: string;
    title: string;
    content: string[];
    icon: string;
    severity: 'critical' | 'important' | 'recommended';
}

// ============================================
// MAIN PAGE
// ============================================
export default function SecurityCenterPage() {
    const { user, isStealth } = useAuth();
    const [activeSection, setActiveSection] = useState<'overview' | 'features' | 'guides' | 'emergency'>('overview');
    const [panicConfirm, setPanicConfirm] = useState(false);
    const [panicLoading, setPanicLoading] = useState(false);
    const [panicResult, setPanicResult] = useState<string | null>(null);

    const features: SecurityFeature[] = [
        {
            id: 'travel-shield',
            title: 'Travel Shield',
            description: 'Activate a decoy profile to protect your identity at checkpoints and in high-risk zones. Triple-tap your avatar to toggle.',
            icon: '🛡️',
            status: isStealth ? 'active' : 'available',
            link: '/settings',
            color: 'from-emerald-500/20 to-emerald-600/5',
        },
        {
            id: 'metadata-strip',
            title: 'Auto Metadata Stripping',
            description: 'All uploaded images are automatically stripped of EXIF data, GPS coordinates, device info, and timestamps before storage. This is always on.',
            icon: '📷',
            status: 'active',
            color: 'from-blue-500/20 to-blue-600/5',
        },
        {
            id: '2fa',
            title: 'Two-Factor Authentication',
            description: 'Add a second layer of security to your account with TOTP-based 2FA.',
            icon: '🔐',
            status: (user as any)?.twoFactorEnabled ? 'active' : 'setup',
            link: '/settings',
            color: 'from-violet-500/20 to-violet-600/5',
        },
        {
            id: 'panic',
            title: 'Panic Button',
            description: 'Instantly lock your account, terminate all sessions, and wipe local data. Use in emergency situations.',
            icon: '🚨',
            status: 'available',
            color: 'from-red-500/20 to-red-600/5',
        },
        {
            id: 'privacy-score',
            title: 'Privacy Score',
            description: 'Track your overall privacy posture and get recommendations to improve your security.',
            icon: '📊',
            status: 'active',
            link: '/settings',
            color: 'from-cyan-500/20 to-cyan-600/5',
        },
        {
            id: 'e2e-encryption',
            title: 'End-to-End Encryption',
            description: 'Direct messages use end-to-end encryption with the Signal Protocol. Only you and the recipient can read your messages.',
            icon: '🔒',
            status: 'active',
            color: 'from-amber-500/20 to-amber-600/5',
        },
    ];

    const safetyGuides: SafetyGuide[] = [
        {
            id: 'at-risk',
            title: 'For Users in Conflict Zones',
            icon: '⚠️',
            severity: 'critical',
            content: [
                'Enable Travel Shield BEFORE entering high-risk areas. Triple-tap your avatar or set it up in Settings.',
                'Use a VPN (we recommend Mullvad or ProtonVPN) alongside 0G for maximum protection.',
                'Never use your real name or identifying information in your username or display name.',
                'Disable location services on your device before posting content.',
                'Use the Panic Button if your device may be seized — it instantly locks your account and wipes local data.',
                'Set up 2FA immediately — it prevents unauthorized access even if someone knows your password.',
                'Do not share screenshots of the app that show your username or profile.',
            ],
        },
        {
            id: 'journalists',
            title: 'For Journalists & Content Creators',
            icon: '📰',
            severity: 'critical',
            content: [
                'All images you upload are automatically stripped of GPS coordinates and device metadata.',
                'For video content, be aware that background details (landmarks, signs) can reveal location.',
                'Use the scheduled post feature to delay posting — this prevents real-time location tracking.',
                'Consider using a separate device for 0G that has no personal accounts or apps.',
                'Enable disappearing messages for sensitive communications.',
                'Regularly check your active sessions in Settings and revoke any you do not recognize.',
            ],
        },
        {
            id: 'general',
            title: 'General Security Best Practices',
            icon: '✅',
            severity: 'recommended',
            content: [
                'Use a strong, unique password (at least 12 characters with mixed case, numbers, and symbols).',
                'Enable Two-Factor Authentication (2FA) in your account settings.',
                'Review your privacy settings regularly — set your profile to private if needed.',
                'Be cautious about accepting connection requests from people you do not know.',
                'Never share your password or 2FA codes with anyone, even if they claim to be 0G support.',
                'Keep your device operating system and browser up to date.',
                'Use a privacy-focused browser (Firefox, Brave) when accessing 0G on the web.',
            ],
        },
        {
            id: 'compromised',
            title: 'If Your Account is Compromised',
            icon: '🔴',
            severity: 'important',
            content: [
                'Use the Panic Button immediately to lock your account and terminate all sessions.',
                'If you can still access your account, change your password right away.',
                'Enable or reset 2FA to prevent the attacker from re-accessing your account.',
                'Review your recent activity — check for posts, messages, or changes you did not make.',
                'Contact our support team through a trusted channel to report the compromise.',
                'If you used the same password elsewhere, change those passwords immediately.',
                'Consider whether your email account may also be compromised — secure it first.',
            ],
        },
    ];

    const handlePanic = async () => {
        if (!panicConfirm) {
            setPanicConfirm(true);
            return;
        }

        setPanicLoading(true);
        try {
            const res = await fetch(`${API}/api/v1/auth/panic`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            const data = await res.json();

            if (data.success) {
                // Wipe all local data
                localStorage.clear();
                sessionStorage.clear();
                setPanicResult('Account locked. All sessions terminated. Local data wiped.');

                // Redirect to login after 3 seconds
                setTimeout(() => {
                    window.location.href = '/login';
                }, 3000);
            } else {
                setPanicResult(data.error || 'Failed to activate panic mode.');
            }
        } catch {
            setPanicResult('Network error. Try again.');
        } finally {
            setPanicLoading(false);
        }
    };

    const severityColors = {
        critical: 'border-red-500/20 bg-red-500/[0.03]',
        important: 'border-amber-500/20 bg-amber-500/[0.03]',
        recommended: 'border-green-500/20 bg-green-500/[0.03]',
    };

    const severityLabels = {
        critical: 'text-red-400',
        important: 'text-amber-400',
        recommended: 'text-green-400',
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            <NavigationSidebar />
            <div className="lg:ml-20 xl:ml-64 pb-24 lg:pb-8">
            {/* Header */}
            <div className="border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-30">
                <div className="max-w-4xl mx-auto px-4 py-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 flex items-center justify-center">
                            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Security Center</h1>
                            <p className="text-xs text-white/40">Your safety is our highest priority</p>
                        </div>
                    </div>

                    <div className="flex gap-1">
                        {(['overview', 'features', 'guides', 'emergency'] as const).map(section => (
                            <button
                                key={section}
                                onClick={() => setActiveSection(section)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                    activeSection === section
                                        ? 'bg-white/10 text-white'
                                        : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                                }`}
                            >
                                {section === 'emergency' ? (
                                    <span className="text-red-400">Emergency</span>
                                ) : (
                                    section.charAt(0).toUpperCase() + section.slice(1)
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-6">
                <AnimatePresence mode="wait">
                    {/* OVERVIEW */}
                    {activeSection === 'overview' && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            {/* Security Status */}
                            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Platform Security Active</h2>
                                        <p className="text-xs text-white/40">0G protects your data by default</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-xl bg-white/[0.03] p-3">
                                        <div className="text-xs text-emerald-400 font-medium">Metadata Stripping</div>
                                        <div className="text-[10px] text-white/30 mt-0.5">Always On — GPS and device data removed from all uploads</div>
                                    </div>
                                    <div className="rounded-xl bg-white/[0.03] p-3">
                                        <div className="text-xs text-emerald-400 font-medium">Encrypted Transport</div>
                                        <div className="text-[10px] text-white/30 mt-0.5">TLS 1.3 — All data encrypted in transit</div>
                                    </div>
                                    <div className="rounded-xl bg-white/[0.03] p-3">
                                        <div className={`text-xs font-medium ${isStealth ? 'text-emerald-400' : 'text-white/40'}`}>
                                            Travel Shield: {isStealth ? 'Active' : 'Off'}
                                        </div>
                                        <div className="text-[10px] text-white/30 mt-0.5">Decoy profile for checkpoints</div>
                                    </div>
                                    <div className="rounded-xl bg-white/[0.03] p-3">
                                        <div className={`text-xs font-medium ${(user as any)?.twoFactorEnabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            2FA: {(user as any)?.twoFactorEnabled ? 'Enabled' : 'Not Set Up'}
                                        </div>
                                        <div className="text-[10px] text-white/30 mt-0.5">
                                            {(user as any)?.twoFactorEnabled ? 'Extra login protection active' : 'Strongly recommended'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <Link href="/settings" className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition text-center">
                                    <div className="text-xl mb-1">🛡️</div>
                                    <div className="text-xs text-white/70">Travel Shield</div>
                                </Link>
                                <Link href="/settings" className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition text-center">
                                    <div className="text-xl mb-1">🔐</div>
                                    <div className="text-xs text-white/70">Setup 2FA</div>
                                </Link>
                                <button onClick={() => setActiveSection('emergency')} className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-4 hover:bg-red-500/[0.06] transition text-center">
                                    <div className="text-xl mb-1">🚨</div>
                                    <div className="text-xs text-red-400">Panic Button</div>
                                </button>
                                <button onClick={() => setActiveSection('guides')} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition text-center">
                                    <div className="text-xl mb-1">📖</div>
                                    <div className="text-xs text-white/70">Safety Guides</div>
                                </button>
                            </div>

                            {/* Mission Statement */}
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                                <h3 className="text-sm font-semibold text-white mb-2">Our Security Promise</h3>
                                <p className="text-xs text-white/50 leading-relaxed">
                                    0G was built to give voice to the voiceless. We know that for many of our users — journalists,
                                    activists, and people living in conflict zones — security is not a feature, it&apos;s a lifeline.
                                    Every upload is stripped of identifying metadata. Every connection is encrypted. And our Travel
                                    Shield creates a convincing decoy profile to protect you at checkpoints. We collect only what is
                                    strictly necessary and never sell your data. Your safety is our highest priority.
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* FEATURES */}
                    {activeSection === 'features' && (
                        <motion.div
                            key="features"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Security Features</h2>
                            <div className="grid md:grid-cols-2 gap-3">
                                {features.map((f, i) => (
                                    <motion.div
                                        key={f.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className={`rounded-xl border border-white/[0.06] bg-gradient-to-br ${f.color} p-5`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="text-2xl">{f.icon}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                                f.status === 'active'
                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                    : f.status === 'setup'
                                                    ? 'bg-amber-500/20 text-amber-400'
                                                    : 'bg-white/[0.06] text-white/40'
                                            }`}>
                                                {f.status === 'active' ? 'Active' : f.status === 'setup' ? 'Setup Required' : 'Available'}
                                            </span>
                                        </div>
                                        <h3 className="text-sm font-semibold text-white mb-1">{f.title}</h3>
                                        <p className="text-xs text-white/40 leading-relaxed">{f.description}</p>
                                        {f.link && (
                                            <Link href={f.link} className="text-[10px] text-[#D4AF37] mt-2 inline-block hover:underline">
                                                Configure →
                                            </Link>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* GUIDES */}
                    {activeSection === 'guides' && (
                        <motion.div
                            key="guides"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Safety Guides</h2>
                            {safetyGuides.map((guide, i) => (
                                <motion.div
                                    key={guide.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.08 }}
                                    className={`rounded-xl border ${severityColors[guide.severity]} p-5`}
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-lg">{guide.icon}</span>
                                        <h3 className="text-sm font-semibold text-white">{guide.title}</h3>
                                        <span className={`text-[9px] uppercase tracking-wider font-medium ${severityLabels[guide.severity]}`}>
                                            {guide.severity}
                                        </span>
                                    </div>
                                    <ul className="space-y-2">
                                        {guide.content.map((item, j) => (
                                            <li key={j} className="flex gap-2 text-xs text-white/50">
                                                <span className="text-white/20 shrink-0 mt-0.5">•</span>
                                                <span className="leading-relaxed">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}

                    {/* EMERGENCY */}
                    {activeSection === 'emergency' && (
                        <motion.div
                            key="emergency"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-900/5 p-6">
                                <div className="text-center mb-6">
                                    <div className="text-4xl mb-3">🚨</div>
                                    <h2 className="text-xl font-bold text-red-400">Emergency Lockdown</h2>
                                    <p className="text-xs text-white/40 mt-1 max-w-md mx-auto">
                                        Activating the Panic Button will immediately lock your account, terminate all active sessions,
                                        and clear all local data from this device. You will need your email and password to recover access.
                                    </p>
                                </div>

                                <div className="rounded-xl bg-red-500/[0.08] border border-red-500/20 p-4 mb-6">
                                    <h4 className="text-xs font-semibold text-red-400 mb-2">What happens when you press Panic:</h4>
                                    <ul className="space-y-1.5">
                                        <li className="flex gap-2 text-xs text-white/50">
                                            <span className="text-red-400">1.</span> Your account is immediately locked
                                        </li>
                                        <li className="flex gap-2 text-xs text-white/50">
                                            <span className="text-red-400">2.</span> All active sessions are terminated (every device)
                                        </li>
                                        <li className="flex gap-2 text-xs text-white/50">
                                            <span className="text-red-400">3.</span> Local storage and session data is wiped from this device
                                        </li>
                                        <li className="flex gap-2 text-xs text-white/50">
                                            <span className="text-red-400">4.</span> Your profile becomes inaccessible to others
                                        </li>
                                        <li className="flex gap-2 text-xs text-white/50">
                                            <span className="text-red-400">5.</span> You can recover your account later with your email and password
                                        </li>
                                    </ul>
                                </div>

                                {panicResult ? (
                                    <div className="text-center py-4">
                                        <div className="text-2xl mb-2">🔒</div>
                                        <p className="text-sm text-red-400 font-medium">{panicResult}</p>
                                        <p className="text-[10px] text-white/30 mt-1">Redirecting to login...</p>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        {panicConfirm && (
                                            <p className="text-xs text-red-400 font-medium mb-3 animate-pulse">
                                                Are you sure? This action cannot be undone from this device.
                                            </p>
                                        )}
                                        <button
                                            onClick={handlePanic}
                                            disabled={panicLoading}
                                            className={`px-8 py-3 rounded-xl font-semibold text-sm transition ${
                                                panicConfirm
                                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                                    : 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                                            } disabled:opacity-50`}
                                        >
                                            {panicLoading
                                                ? 'Activating...'
                                                : panicConfirm
                                                ? 'CONFIRM EMERGENCY LOCKDOWN'
                                                : 'Activate Panic Button'
                                            }
                                        </button>
                                        {panicConfirm && (
                                            <button
                                                onClick={() => setPanicConfirm(false)}
                                                className="block mx-auto mt-3 text-xs text-white/30 hover:text-white/50 transition"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Recovery Info */}
                            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                                <h3 className="text-sm font-semibold text-white mb-2">Account Recovery</h3>
                                <p className="text-xs text-white/40 leading-relaxed">
                                    After a panic lockdown, you can recover your account by visiting the login page and entering
                                    your email and password. Your account data is preserved — only access is locked. If you have
                                    2FA enabled, you will also need your authenticator app or backup codes.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            </div>
        </div>
    );
}
