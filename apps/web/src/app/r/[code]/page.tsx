'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function InviteRedirectPage() {
    const router = useRouter();
    const params = useParams();

    useEffect(() => {
        const code = params?.code as string;

        if (code) {
            // Store invite code for attribution (mock)
            localStorage.setItem('0g_referral_code', code);

            // Redirect to signup
            // We use replace so they can't go "back" to the redirect page
            router.replace('/signup?ref=' + code);
        } else {
            router.replace('/');
        }
    }, [params, router]);

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
            <div className="w-16 h-16 rounded-full border-4 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin mb-4" />
            <p className="text-white/60">Redirecting to ZeroG...</p>
        </div>
    );
}
