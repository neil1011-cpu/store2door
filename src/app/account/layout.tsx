
'use client';

import { useEffect, type ReactNode, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { createContext, useContext } from 'react';
import { AppLogo } from '@/components/app-logo';
import { Separator } from '@/components/ui/separator';
import { Wallet, Menu, TrendingDown, Loader2, LogOut, RefreshCcw } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
    const auth = useAuth();
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

    // IDENTITY AUTO-REPAIR (Silent & Non-Blocking)
    useEffect(() => {
        if (!isUserLoading && user && !isProfileLoading && !userProfile && isMounted && firestore) {
            const repairIdentity = async () => {
                try {
                    const mailbox = `FSTD-${user.uid.substring(0, 5).toUpperCase()}`;
                    await setDoc(doc(firestore, 'users', user.uid), {
                        id: user.uid,
                        fullName: user.displayName || user.email?.split('@')[0] || 'Member',
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
                } catch (e) {
                    console.error("[IDENTITY REPAIR] FAILED:", e);
                }
            };
            repairIdentity();
        }
    }, [user, isUserLoading, userProfile, isProfileLoading, isMounted, firestore]);

    const handleSignOut = async () => {
        if (auth) {
            await signOut(auth);
            window.location.href = '/signin';
        }
    };

    // ONLY block on Auth state, NOT profile data.
    if (isUserLoading || !isMounted) {
        return (
            <div className="container mx-auto py-24 px-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-6" />
                <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-2">Connecting to Hub</h2>
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest animate-pulse">Establishing secure worldwide link...</p>
            </div>
        );
    }

    if (!user) return null;

    const safeProfile = userProfile || {
        id: user.uid,
        fullName: user.displayName || 'Loading...',
        email: user.email || '',
        phone: '',
        mailboxNumber: '...',
        trn: '',
        address: { address1: '', address2: '', city: '', state: '', zip: '' },
        walletBalance: 0,
        createdAt: null
    } as UserProfile;

    const isSecurityPage = pathname === '/account/change-password';
    const walletBalance = safeProfile.walletBalance || 0;
    const isIndebted = walletBalance < 0;

    return (
        <UserProfileContext.Provider value={safeProfile}>
            <div className="min-h-screen bg-muted/20">
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
                                            <Button onClick={handleSignOut} variant="destructive" className="w-full h-12 font-black uppercase italic mt-4">
                                                <LogOut className="mr-2 h-4 w-4" /> Sign Out
                                            </Button>
                                        </nav>
                                    </SheetContent>
                                </Sheet>
                            )}
                            <AppLogo className="scale-75 sm:scale-90" />
                        </div>
                        
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end overflow-hidden">
                            {!isSecurityPage && (
                                <div className={cn(
                                    "border-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 shadow-inner max-w-[200px] sm:max-w-none transition-colors",
                                    isIndebted ? "bg-red-50 border-red-200" : "bg-primary/5 border-primary/10"
                                )}>
                                    {isIndebted ? <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 shrink-0" /> : <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />}
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest leading-none">
                                            {isIndebted ? 'Outstanding' : 'Credit'}
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
                            <Button variant="ghost" size="icon" onClick={handleSignOut} className="hidden sm:flex text-muted-foreground hover:text-destructive">
                                <LogOut className="h-5 w-5" />
                            </Button>
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
