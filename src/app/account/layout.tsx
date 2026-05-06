
'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { createContext, useContext } from 'react';

// Create a context to share the user profile data with child pages
const UserProfileContext = createContext<UserProfile | null>(null);

export const useAccountProfile = () => useContext(UserProfileContext);

export default function AccountLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/signin');
        }
    }, [user, isUserLoading, router]);

    // Force Password Reset Check
    useEffect(() => {
        if (userProfile?.needsPasswordReset && pathname !== '/account/change-password') {
            router.push('/account/change-password');
        }
    }, [userProfile, pathname, router]);

    if (isUserLoading || isProfileLoading) {
        return (
            <div className="container mx-auto py-12 px-4 md:px-6">
                <div className="mb-8">
                    <Skeleton className="h-9 w-64 mb-2" />
                    <Skeleton className="h-5 w-80" />
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    if (!userProfile) {
        return (
            <div className="container mx-auto py-12 px-4 md:px-6 text-center">
                 <h1 className="text-2xl font-bold italic uppercase tracking-tighter">Authentication Error</h1>
                <p className="text-muted-foreground mt-2">Critical profile data missing from system. Contact worldwide support center.</p>
            </div>
        );
    }

    return (
        <UserProfileContext.Provider value={userProfile}>
            <div className="min-h-screen bg-muted/20">
                {children}
            </div>
        </UserProfileContext.Provider>
    );
}
