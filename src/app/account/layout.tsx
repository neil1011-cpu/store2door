
'use client';

import { useEffect, type ReactNode, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { createContext, useContext } from 'react';
import { AppLogo } from '@/components/app-logo';
import { Separator } from '@/components/ui/separator';
import { Wallet } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

// Create a context to share the user profile data with child pages
const UserProfileContext = createContext<UserProfile | null>(null);

export const useAccountProfile = () => useContext(UserProfileContext);

export default function AccountLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const userProfileRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    useEffect(() => {
        if (!isUserLoading && !user && isMounted) {
            router.push('/signin');
        }
    }, [user, isUserLoading, router, isMounted]);

    // Force Password Reset Check
    useEffect(() => {
        if (userProfile?.needsPasswordReset && pathname !== '/account/change-password' && isMounted) {
            router.push('/account/change-password');
        }
    }, [userProfile, pathname, router, isMounted]);

    // Global Address Auto-Repair: Ensures existing users are migrated to Lauderdale Lake
    useEffect(() => {
        if (userProfile && userProfile.address?.address1 !== '3507 NW 19th ST' && isMounted) {
            const mailbox = userProfile.mailboxNumber || 'HUB';
            updateDoc(doc(firestore, 'users', userProfile.id), {
                address: {
                    address1: '3507 NW 19th ST',
                    address2: `${mailbox}-FSTD`,
                    city: 'Lauderdale Lake',
                    state: 'FL',
                    zip: '33311-4224',
                }
            }).catch(e => console.error("Address auto-repair failed", e));
        }
    }, [userProfile, firestore, isMounted]);

    if (isUserLoading || isProfileLoading || !isMounted) {
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
                {/* User Account Sub-Header with Balance */}
                <div className="bg-background border-b shadow-sm sticky top-0 z-40 print:hidden">
                    <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <AppLogo className="scale-90" />
                            <Separator orientation="vertical" className="h-6 hidden sm:block" />
                            <span className="text-[10px] font-black uppercase italic tracking-tighter opacity-40 hidden sm:block">Account Console</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/5 border-2 border-primary/10 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-inner">
                                <Wallet className="h-4 w-4 text-primary" />
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground leading-none">Wallet Balance</span>
                                    <span className="text-sm font-black italic tracking-tighter leading-tight">JMD ${(userProfile.walletBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
                <div className="py-8">
                    {children}
                </div>
            </div>
        </UserProfileContext.Provider>
    );
}
