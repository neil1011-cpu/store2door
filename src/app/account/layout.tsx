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
import { Wallet, Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Create a context to share the user profile data with child pages
const UserProfileContext = createContext<UserProfile | null>(null);

export const useAccountProfile = () => useContext(UserProfileContext);

const accountNavLinks = [
    { href: '/account', label: 'Dashboard' },
    { href: '/account/pre-alert', label: 'Pre-Alert' },
    { href: '/account/packages', label: 'Packages' },
    { href: '/account/profile', label: 'Profile' },
];

export default function AccountLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [isMounted, setIsMounted] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
                    <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 md:gap-4 shrink-0">
                            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" className="md:hidden">
                                        <Menu className="h-5 w-5" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="w-[300px]">
                                    <SheetHeader className="mb-8">
                                        <SheetTitle><AppLogo onClick={() => setIsMobileMenuOpen(false)} /></SheetTitle>
                                    </SheetHeader>
                                    <nav className="flex flex-col gap-2">
                                        {accountNavLinks.map(link => (
                                            <Link 
                                                key={link.href}
                                                href={link.href}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={cn(
                                                    "text-base font-bold uppercase tracking-wider p-4 rounded-lg transition-colors",
                                                    pathname === link.href ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                                                )}
                                            >
                                                {link.label}
                                            </Link>
                                        ))}
                                        <Separator className="my-4" />
                                        <Link href="/tracking" className="p-4 text-sm font-bold opacity-60 uppercase">Public Tracking</Link>
                                        <Link href="/support" className="p-4 text-sm font-bold opacity-60 uppercase">Get Help</Link>
                                    </nav>
                                </SheetContent>
                            </Sheet>
                            <AppLogo className="scale-75 sm:scale-90" />
                            <Separator orientation="vertical" className="h-6 hidden lg:block" />
                            <span className="text-[10px] font-black uppercase italic tracking-tighter opacity-40 hidden lg:block">Console</span>
                        </div>
                        
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end overflow-hidden">
                            <div className="bg-primary/5 border-2 border-primary/10 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 shadow-inner max-w-[180px] sm:max-w-none">
                                <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-muted-foreground leading-none">Wallet</span>
                                    <span className="text-xs sm:text-sm font-black italic tracking-tighter leading-tight truncate">JMD ${(userProfile.walletBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                            <div className="shrink-0"><ThemeToggle /></div>
                        </div>
                    </div>
                </div>
                <div className="py-4 sm:py-8">
                    {children}
                </div>
            </div>
        </UserProfileContext.Provider>
    );
}
