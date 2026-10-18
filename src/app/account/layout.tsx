'use client';

import { useEffect, type ReactNode, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSupabase } from '@/components/supabase-provider';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { createContext, useContext } from 'react';
import { AppLogo } from '@/components/app-logo';
import { Separator } from '@/components/ui/separator';
import { Wallet, Menu, TrendingDown, Loader2, LogOut, AlertTriangle, RefreshCcw } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import Link from 'next/link';
import { cn, shouldShowPrice } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

const UserProfileContext = createContext<{ profile: UserProfile | null; balance: number; actionableBalance: number }>({ profile: null, balance: 0, actionableBalance: 0 });
export const useAccountProfile = () => useContext(UserProfileContext);

const accountNavLinks = [
    { href: '/account', label: 'Dashboard' },
    { href: '/account/pre-alert', label: 'Pre-Alert' },
    { href: '/account/packages', label: 'Packages' },
    { href: '/account/profile', label: 'Profile' },
    { href: '/account/support', label: 'Support' },
];

export default function AccountLayout({ children }: { children: ReactNode }) {
    const { supabase, user, isLoading: isAuthLoading } = useSupabase();
    const router = useRouter();
    const pathname = usePathname();
    
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [balance, setBalance] = useState(0);
    const [actionableBalance, setActionableBalance] = useState(0);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

    const fetchData = useCallback(async () => {
        if (!user) return;

        setIsDataLoading(true);
        setError(null);
        try {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();
            
            if (profileError) throw profileError;
            
            if (profileData) {
                setProfile(profileData);

                // 1. Fetch Ledger entries
                const { data: ledgerData } = await supabase
                    .from('financial_ledger')
                    .select('*')
                    .eq('profile_id', user.id);
                
                const totalBalance = ledgerData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
                setBalance(totalBalance);

                // 2. Determine Actionable Balance (Debt for items ready for pickup/delivered)
                const { data: shipments } = await supabase
                    .from('shipments')
                    .select('tracking_number, status')
                    .eq('profile_id', user.id);
                
                const readyTrackingNumbers = (shipments || [])
                    .filter(s => shouldShowPrice(s.status))
                    .map(s => s.tracking_number);

                const actionableSum = ledgerData?.reduce((acc, curr) => {
                    const isGeneral = !curr.description?.includes('Shipping Fee:');
                    const isLinkedToReady = readyTrackingNumbers.some(tn => curr.description?.includes(tn));
                    
                    if (isGeneral || isLinkedToReady) {
                        return acc + Number(curr.amount);
                    }
                    return acc;
                }, 0) || 0;

                setActionableBalance(actionableSum);
                
                if (retryTimerRef.current) {
                    clearTimeout(retryTimerRef.current);
                    retryTimerRef.current = null;
                }
            } else {
                if (retryCount < 12) {
                    retryTimerRef.current = setTimeout(() => {
                        setRetryCount(prev => prev + 1);
                    }, 2000);
                } else {
                    setError("Identity sync timed out. Please check your account registration.");
                }
            }
        } catch (error: any) {
            console.error('Account Fetch Error:', error);
            setError(error.message);
        } finally {
            setIsDataLoading(false);
        }
    }, [user, supabase, retryCount]);

    useEffect(() => {
        if (!isAuthLoading && !user) {
            router.push('/signin');
        }
    }, [user, isAuthLoading, router]);

    useEffect(() => {
        if (user) {
            fetchData();

            // Real-time listener for financial and shipment updates
            const channel = supabase
                .channel(`user-account-sync-${user.id}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_ledger', filter: `profile_id=eq.${user.id}` }, () => fetchData())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments', filter: `profile_id=eq.${user.id}` }, () => fetchData())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => fetchData())
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
                if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
            };
        }
    }, [fetchData, user, supabase]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/signin');
    };

    if (isAuthLoading || (user && isDataLoading && !profile && retryCount === 0)) {
        return (
            <div className="container mx-auto py-24 px-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-6" />
                <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-2">Establishing Uplink</h2>
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest animate-pulse">Syncing with worldwide registry...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto py-24 px-4 flex items-center justify-center min-h-[80vh]">
                <Card className="max-w-md w-full border-destructive/20 shadow-2xl">
                    <CardContent className="pt-10 pb-10 text-center space-y-6">
                        <div className="bg-destructive/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto">
                            <AlertTriangle className="h-10 w-10 text-destructive" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Registry Failure</h2>
                            <p className="text-muted-foreground text-sm font-medium leading-relaxed">{error}</p>
                        </div>
                        <Button onClick={() => window.location.reload()} className="w-full h-12 font-black uppercase italic">Retry Connection</Button>
                        <Button variant="ghost" onClick={handleSignOut} className="w-full text-xs font-bold uppercase opacity-60">Sign Out</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!user || !profile) return null;

    const isSecurityPage = pathname === '/account/change-password';
    const isIndebted = actionableBalance < 0;

    return (
        <UserProfileContext.Provider value={{ profile, balance, actionableBalance }}>
            <div className="min-h-screen bg-muted/20">
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
                                        <Button onClick={handleSignOut} variant="destructive" className="w-full h-12 font-black uppercase italic mt-4">
                                            <LogOut className="mr-2 h-4 w-4" /> Sign Out
                                        </Button>
                                    </nav>
                                </SheetContent>
                            </Sheet>
                            <AppLogo className="scale-75 sm:scale-90" />
                        </div>
                        
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end overflow-hidden">
                            {!isSecurityPage && (
                                <div className={cn(
                                    "border-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 shadow-inner max-w-[200px] sm:max-w-none transition-all",
                                    isIndebted ? "bg-red-50 border-red-200" : "bg-primary/5 border-primary/10 opacity-40 hover:opacity-100"
                                )}>
                                    {isIndebted ? <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 shrink-0" /> : <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />}
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest leading-none">
                                            {isIndebted ? 'Actionable Due' : 'Balance'}
                                        </span>
                                        <span className={cn(
                                            "text-xs sm:text-sm font-black italic tracking-tighter leading-tight truncate",
                                            isIndebted ? "text-red-600" : "text-foreground"
                                        )}>
                                            JMD ${Math.abs(actionableBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
