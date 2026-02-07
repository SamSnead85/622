'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect old /migration to /migrate
export default function MigrationRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/migrate');
    }, [router]);
    return <div className="min-h-screen bg-black" />;
}
