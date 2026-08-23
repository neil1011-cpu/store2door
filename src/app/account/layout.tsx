'use client';

import { useEffect, type ReactNode, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { createContext, useContext } from 'react';
import { AppLogo } from '@/components/app-logo';
import { Separator } from '@/components/ui/separator';
import { Wallet, Menu, TrendingDown, Loader2, RefreshCcw, ShieldAlert } from 'lucide-react';
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
    const [isRepairing, setIsRepairing] = useState(false);
    const [syncTimeout, setSyncTimeout] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        // Fallback: If still syncing after 8 seconds, show retry UI
        const timer = setTimeout(() => {
            setSyncTimeout(true);
        }, 8000);
        return () => clearTimeout(timer);
    }, []);

    const userProfileRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    
    const { data: userProfile, isLoading: isProfileLoading, error: profileError } = useDoc<UserProfile>(userProfileRef);

    useEffect(() => {
        if (!isUserLoading && !user && isMounted) {
            router.push('/signin');
        }
    }, [user, isUserLoading, router, isMounted]);

    // IDENTITY AUTO-REPAIR: If user is authenticated but the Firestore document is missing,
    // we initialize their profile now to prevent "Authentication Error" locks.
    useEffect(() => {
        if (!isUserLoading && user && !isProfileLoading && !userProfile && isMounted && firestore && !isRepairing) {
            const repairIdentity = async () => {
                setIsRepairing(true);
                try {
                    const mailbox = `FSTD-${user.uid.substring(0, 5).toUpperCase()}`;
                    await setDoc(doc(firestore, 'users', user.uid), {
                        id: user.uid,
                        fullName: user.displayName || user.email?.split('@')[0] || 'Authenticated User',
                        email: user.email || '',
                        phone: 'N/A',
                        trn: 'N/A',
                        mailboxNumber: mailbox,
                        address: {
                            address1: '3507 NW 19th ST',
                            address2: `${mailbox}-FSTD`,
                            city: 'Lauderdale Lake',
                            state: 'FL',
                            zip: '33311-4224',
                        },
                        walletBalance: 0,
                        createdAt: serverTimestamp(),
                        needsPasswordReset: false,
                        pickupPersonnel: [],
                        dropoffAddresses: [],
                    }, { merge: true });
                    console.log("[IDENTITY REPAIR] Profile successfully synced.");
                } catch (e) {
                    console.error("[IDENTITY REPAIR] FAILED:", e);
                } finally {
                    setIsRepairing(false);
                }
            };
            repairIdentity();
        }
    }, [user, isUserLoading, userProfile, isProfileLoading, isMounted, firestore, isRepairing]);

    // Force Password Reset Check
    useEffect(() => {
        if (userProfile?.needsPasswordReset && pathname !== '/account/change-password' && isMounted) {
            router.push('/account/change-password');
        }
    }, [userProfile, pathname, router, isMounted]);

    if (isUserLoading || (isProfileLoading && !userProfile) || isRepairing || !isMounted) {
        return (
            <div className="container mx-auto py-24 px-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="bg-primary/5 p-8 rounded-full mb-6 relative">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-ping" />
                </div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-2">Syncing Logistics Identity</h2>
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest animate-pulse max-w-xs mx-auto">
                    Establishing secure link with worldwide database...
                </p>
                
                {syncTimeout && (
                    <div className="mt-12 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <p className="text-[10px] text-destructive font-bold uppercase">Connection taking longer than expected</p>
                        <Button onClick={() => window.location.reload()} variant="outline" className="border-2 font-black uppercase italic h-12 px-8 shadow-lg">
                            <RefreshCcw className="mr-2 h-4 w-4" /> Force Hub Reconnect
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    if (!userProfile && !isRepairing) {
        return (
            <div className="container mx-auto py-24 px-4 md:px-6 text-center">
                <div className="bg-orange-100 p-6 rounded-3xl w-24 h-24 flex items-center justify-center mx-auto mb-6">
                    <ShieldAlert className="h-12 w-12 text-orange-600" />
                </div>
                 <h1 className="text-3xl font-black italic uppercase tracking-tighter">Identity Sync Failed</h1>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">We were unable to establish a secure link with your registry record. This may be due to a temporary network interruption.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                    <Button onClick={() => window.location.reload()} className="font-black uppercase italic h-14 px-10 shadow-xl">
                        <RefreshCcw className="mr-2 h-5 w-5" /> Retry Sync
                    </Button>
                    <Button variant="outline" asChild className="h-14 font-bold border-2">
                        <Link href="/signin">Return to Sign In</Link>
                    </Button>
                </div>
            </div>
        );
    }

    const isSecurityPage = pathname === '/account/change-password';
    const walletBalance = userProfile?.walletBalance || 0;
    const isIndebted = walletBalance < 0;

    return (
        <UserProfileContext.Provider value={userProfile}>
            <div className="min-h-screen bg-muted/20">
                {/* User Account Sub-Header with Real-time Balance */}
                <div className="bg-background border-b shadow-sm sticky top-0 z-40 print:hidden">
                    <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 md:gap-4 shrink-0">
                            {!isSecurityPage && (
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
                            )}
                            <AppLogo className="scale-75 sm:scale-90" />
                            <Separator orientation="vertical" className="h-6 hidden lg:block" />
                            <span className="text-[10px] font-black uppercase italic tracking-tighter opacity-40 hidden lg:block">Console</span>
                        </div>
                        
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end overflow-hidden">
                            {!isSecurityPage && userProfile && (
                                <div className={cn(
                                    "border-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 shadow-inner max-w-[200px] sm:max-w-none transition-colors",
                                    isIndebted ? "bg-red-50 border-red-200" : "bg-primary/5 border-primary/10"
                                )}>
                                    {isIndebted ? <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 shrink-0" /> : <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />}
                                    <div className="flex flex-col min-w-0">
                                        <span className={cn(
                                            "text-[7px] sm:text-[8px] font-black uppercase tracking-widest leading-none",
                                            isIndebted ? "text-red-700" : "text-muted-foreground"
                                        )}>
                                            {isIndebted ? 'Outstanding Dues' : 'Account Credit'}
                                        </span>
                                        <span className={cn(
                                            "text-xs sm:text-sm font-black italic tracking-tighter leading-tight truncate",
                                            isIndebted ? "text-red-600" : "text-foreground"
                                        )}>
                                            JMD ${Math.abs(walletBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            )}
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
