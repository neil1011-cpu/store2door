'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * @fileOverview Alias for /reset-password to maintain backward compatibility.
 */
export default function ChangePasswordRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/reset-password');
    }, [router]);
    return null;
}
