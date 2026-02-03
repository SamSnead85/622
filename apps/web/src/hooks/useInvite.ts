'use client';

import { useState, useCallback } from 'react';
import { API_URL, apiFetch } from '@/lib/api';

// ============================================
// TYPES
// ============================================
export interface Invite {
    id: string;
    email?: string;
    referralCode: string;
    status: 'PENDING' | 'OPENED' | 'JOINED' | 'EXPIRED';
    createdAt: string;
}

export interface InviteSender {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
}

// ============================================
// INVITE API ENDPOINTS
// ============================================
const INVITE_ENDPOINTS = {
    base: `${API_URL}/api/v1/invite`,
    createLink: `${API_URL}/api/v1/invite/link`,
    sendEmail: `${API_URL}/api/v1/invite/email`,
    validate: (code: string) => `${API_URL}/api/v1/invite/validate/${code}`,
};

// ============================================
// INVITE HOOK
// Handle invite link generation and sharing
// ============================================
export function useInvite() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [remainingInvites, setRemainingInvites] = useState<number>(10);

    // Generate a new invite link
    const generateLink = useCallback(async (): Promise<{ code: string; url: string } | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await apiFetch(INVITE_ENDPOINTS.createLink, {
                method: 'POST',
            });

            if (response.ok) {
                const data = await response.json();
                setInviteCode(data.code);
                setInviteLink(data.url);
                return { code: data.code, url: data.url };
            } else {
                const errorData = await response.json().catch(() => ({}));
                setError(errorData.error || 'Failed to generate invite link');
                return null;
            }
        } catch (err) {
            console.error('Error generating invite link:', err);
            setError('Network error');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Send email invite
    const sendEmailInvite = useCallback(async (email: string, message?: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await apiFetch(INVITE_ENDPOINTS.sendEmail, {
                method: 'POST',
                body: JSON.stringify({ email, message }),
            });

            if (response.ok) {
                // Refresh remaining invites after sending
                await fetchInvites();
                return true;
            } else {
                const errorData = await response.json().catch(() => ({}));
                setError(errorData.error || 'Failed to send invite');
                return false;
            }
        } catch (err) {
            console.error('Error sending email invite:', err);
            setError('Network error');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch user's invite history
    const fetchInvites = useCallback(async () => {
        try {
            const response = await apiFetch(INVITE_ENDPOINTS.base);

            if (response.ok) {
                const data = await response.json();
                setInvites(data.invites || []);
                setRemainingInvites(data.remainingToday ?? 10);
            }
        } catch (err) {
            console.error('Error fetching invites:', err);
        }
    }, []);

    // Validate an invite code (for signup flow)
    const validateCode = useCallback(async (code: string): Promise<{ valid: boolean; sender?: InviteSender }> => {
        try {
            const response = await apiFetch(INVITE_ENDPOINTS.validate(code), {
                method: 'POST',
            });

            if (response.ok) {
                const data = await response.json();
                return { valid: true, sender: data.sender };
            } else {
                return { valid: false };
            }
        } catch {
            return { valid: false };
        }
    }, []);

    // Copy invite link to clipboard
    const copyLink = useCallback(async (): Promise<boolean> => {
        if (!inviteLink) {
            const result = await generateLink();
            if (!result) return false;
        }

        try {
            await navigator.clipboard.writeText(inviteLink!);
            return true;
        } catch {
            return false;
        }
    }, [inviteLink, generateLink]);

    // Share invite via native share API
    const shareNative = useCallback(async (displayName?: string): Promise<boolean> => {
        let link = inviteLink;
        if (!link) {
            const result = await generateLink();
            if (!result) return false;
            link = result.url;
        }

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join me on 0G!',
                    text: displayName
                        ? `${displayName} invited you to join 0G - Zero Gravity Social`
                        : "You're invited to join 0G - Zero Gravity Social",
                    url: link,
                });
                return true;
            } catch {
                return false;
            }
        }
        return false;
    }, [inviteLink, generateLink]);

    // Generate share URL for specific platforms
    const getShareUrl = useCallback((platform: 'whatsapp' | 'twitter' | 'telegram' | 'sms' | 'email', displayName?: string): string => {
        const link = inviteLink || 'https://0g.social';
        const text = displayName
            ? `${displayName} invited you to join 0G! 🚀 `
            : "You're invited to join 0G! 🚀 ";

        const fullText = `${text}${link}`;

        switch (platform) {
            case 'whatsapp':
                return `https://wa.me/?text=${encodeURIComponent(fullText)}`;
            case 'twitter':
                return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
            case 'telegram':
                return `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
            case 'sms':
                return `sms:?body=${encodeURIComponent(fullText)}`;
            case 'email':
                return `mailto:?subject=${encodeURIComponent('Join me on 0G!')}&body=${encodeURIComponent(fullText)}`;
            default:
                return link;
        }
    }, [inviteLink]);

    return {
        isLoading,
        error,
        inviteLink,
        inviteCode,
        invites,
        remainingInvites,
        generateLink,
        sendEmailInvite,
        fetchInvites,
        validateCode,
        copyLink,
        shareNative,
        getShareUrl,
    };
}
