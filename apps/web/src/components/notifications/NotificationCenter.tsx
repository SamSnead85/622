'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';

interface NotificationPrefs {
    pushEnabled: boolean;
    emailDigest: string;
    quietHoursFrom: string | null;
    quietHoursTo: string | null;
    quietTimezone: string | null;
    channels: Record<string, boolean>;
}

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
    const [prefs, setPrefs] = useState<NotificationPrefs>({
        pushEnabled: true,
        emailDigest: 'daily',
        quietHoursFrom: null,
        quietHoursTo: null,
        quietTimezone: null,
        channels: { social: true, communities: true, messages: true, system: true },
    });
    const [isSaving, setIsSaving] = useState(false);
    const [pushPermission, setPushPermission] = useState<string>('default');

    useEffect(() => {
        if (!isOpen) return;
        apiFetch('/api/v1/push/preferences')
            .then(data => { if (data && !data.error) setPrefs(data); })
            .catch(() => {});

        if ('Notification' in window) {
            setPushPermission(Notification.permission);
        }
    }, [isOpen]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await apiFetch('/api/v1/push/preferences', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(prefs),
            });
        } catch {}
        setIsSaving(false);
    };

    const requestPushPermission = async () => {
        if (!('Notification' in window)) return;
        const permission = await Notification.requestPermission();
        setPushPermission(permission);

        if (permission === 'granted' && 'serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
                });
                const json = subscription.toJSON();
                await apiFetch('/api/v1/push/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        endpoint: json.endpoint,
                        keys: json.keys,
                    }),
                });
            } catch (err) {
                console.error('Push subscription failed:', err);
            }
        }
    };

    const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
        <div className="flex items-center justify-between py-2">
            <span className="text-white text-sm">{label}</span>
            <button
                onClick={() => onChange(!checked)}
                className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-[#00D4FF]' : 'bg-white/20'}`}
                role="switch"
                aria-checked={checked}
                aria-label={label}
            >
                <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform mx-1 ${checked ? 'translate-x-4' : ''}`} />
            </button>
        </div>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="bg-[#12121A] border border-white/10 rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto"
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-white font-semibold text-lg mb-5">Notification Preferences</h3>

                        {/* Push notifications */}
                        <div className="mb-6">
                            <h4 className="text-white/40 text-xs uppercase tracking-wider mb-3">Push Notifications</h4>
                            {pushPermission !== 'granted' ? (
                                <button
                                    onClick={requestPushPermission}
                                    className="w-full py-2.5 rounded-xl bg-[#00D4FF]/20 text-[#00D4FF] text-sm font-medium"
                                >
                                    Enable Push Notifications
                                </button>
                            ) : (
                                <Toggle label="Push notifications" checked={prefs.pushEnabled}
                                    onChange={(v) => setPrefs(p => ({ ...p, pushEnabled: v }))} />
                            )}
                        </div>

                        {/* Channels */}
                        <div className="mb-6">
                            <h4 className="text-white/40 text-xs uppercase tracking-wider mb-3">Channels</h4>
                            {Object.entries(prefs.channels).map(([key, enabled]) => (
                                <Toggle
                                    key={key}
                                    label={key.charAt(0).toUpperCase() + key.slice(1)}
                                    checked={enabled}
                                    onChange={(v) => setPrefs(p => ({ ...p, channels: { ...p.channels, [key]: v } }))}
                                />
                            ))}
                        </div>

                        {/* Email digest */}
                        <div className="mb-6">
                            <h4 className="text-white/40 text-xs uppercase tracking-wider mb-3">Email Digest</h4>
                            <div className="flex gap-2">
                                {['none', 'daily', 'weekly'].map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => setPrefs(p => ({ ...p, emailDigest: opt }))}
                                        className={`px-4 py-2 rounded-lg text-sm capitalize ${
                                            prefs.emailDigest === opt ? 'bg-[#00D4FF] text-black font-semibold' : 'bg-white/10 text-white/60'
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quiet hours */}
                        <div className="mb-6">
                            <h4 className="text-white/40 text-xs uppercase tracking-wider mb-3">Quiet Hours</h4>
                            <div className="flex gap-3 items-center">
                                <input
                                    type="time"
                                    value={prefs.quietHoursFrom || ''}
                                    onChange={(e) => setPrefs(p => ({ ...p, quietHoursFrom: e.target.value || null }))}
                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                    aria-label="Quiet hours start"
                                />
                                <span className="text-white/40 text-sm">to</span>
                                <input
                                    type="time"
                                    value={prefs.quietHoursTo || ''}
                                    onChange={(e) => setPrefs(p => ({ ...p, quietHoursTo: e.target.value || null }))}
                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                    aria-label="Quiet hours end"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full py-2.5 rounded-xl bg-[#00D4FF] text-black font-semibold text-sm disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Save Preferences'}
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
