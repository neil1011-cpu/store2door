'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LayoutGrid, BellRing, Package, LifeBuoy, User, LogOut, Calculator, ArrowRight, Wallet, TrendingDown, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DashboardTab } from './dashboard-components';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAccountProfile } from './layout';
import { useState, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';

const featureCards = [
    {
        href: '/account/pre-alert',
        title: 'Pre-Alert',
        description: 'Notify us of an incoming package.',
        icon: <BellRing className="h-5 w-5 sm:h-6 sm:w-6" />,
        color: 'bg-orange-500 text-white',
    },
    {
        href: '/account/packages',
        title: 'My Packages',
        description: 'Track all your shipments.',
        icon: <Package className="h-5 w-5 sm:h-6 sm:w-6" />,
        color: 'bg-green-500 text-white',
    },
    {
        href: '/account/calculator',
        title: 'Calculator',
        description: 'Estimate your customs costs.',
        icon: <Calculator className="h-5 w-5 sm:h-6 sm:w-6" />,
        color: 'bg-indigo-500 text-white',
    },
    {
        href: '/account/profile',
        title: 'My Account',
        description: 'Manage profile and addresses.',
        icon: <User className="h-5 w-5 sm:h-6 sm:w-6" />,
        color: 'bg-red-500 text-white',
    },
];

export default function AccountPage() {
    const router = useRouter();
    const { toast } = useToast();
    const auth = useAuth();
    const userProfile = useAccountProfile();
    const [mounted, setMounted] = useState(false);
    const [year, setYear] = useState<number>(2024);

    useEffect(() => {
        setMounted(true);
        setYear(new Date().getFullYear());
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut(auth!);
            toast({
                title: 'Signed Out',
                description: 'You have been successfully signed out.',
            });
            router.push('/');
        } catch (error) {
            toast({
                title: 'Sign Out Failed',
                variant: 'destructive',
            });
        }
    };

    if (!userProfile || !mounted) return null;

    const walletBalance = userProfile.walletBalance || 0;
    const isIndebted = walletBalance < 0;

    return (
        <div className="container mx-auto px-4 md:px-6 pb-20">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                <div className="text-center md:text-left">
                    <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter">Welcome, {userProfile.fullName.split(' ')[0]}!</h1>
                    <p className="text-muted-foreground text-xs sm:text-sm font-bold uppercase tracking-widest opacity-60 mt-1">Global Mailbox: {userProfile.mailboxNumber}</p>
                </div>
                <div className="flex items-center justify-center md:justify-end gap-2">
                    <Button variant="outline" onClick={handleSignOut} size="sm" className="font-black uppercase italic border-2 px-6 h-10">
                        <LogOut className="mr-2 h-4 w-4" /> Sign Out
                    </Button>
                </div>
            </div>

            <div className="space-y-6 mb-12">
                {/* Optimized Horizontal Ledger Banner */}
                <Card className={cn(
                    "border-none shadow-xl rounded-2xl overflow-hidden relative group transition-all",
                    isIndebted ? "bg-red-600 text-white" : "bg-primary text-primary-foreground"
                )}>
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <Wallet size={100} />
                    </div>
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Official Ledger Standing</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl sm:text-4xl font-black italic tracking-tighter">
                                        JMD ${Math.abs(walletBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                    <Badge className="bg-white/20 text-white border-white/10 uppercase text-[8px] font-black italic tracking-widest">
                                        {isIndebted ? 'Outstanding' : 'Credit'}
                                    </Badge>
                                </div>
                            </div>
                            
                            <div className="flex-1 sm:max-w-md bg-white/5 p-3 rounded-xl border border-white/10 flex items-center gap-3">
                                {isIndebted ? <AlertCircle className="h-5 w-5 text-white/60 shrink-0" /> : <CheckCircle2 className="h-5 w-5 text-white/60 shrink-0" />}
                                <p className="text-[9px] font-bold leading-tight uppercase tracking-tight opacity-90">
                                    {isIndebted 
                                        ? "Settlement required upon package arrival in Jamaica to facilitate delivery." 
                                        : "Your account is in good standing. Credits are automatically applied to new transits."}
                                </p>
                            </div>

                            <Button variant="outline" size="sm" className="bg-white/10 border-white/20 hover:bg-white/20 text-white font-black uppercase italic tracking-tighter h-10 px-6 shrink-0" asChild>
                                <Link href="/account/packages">Billing Details</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Compact Feature Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {featureCards.map(card => (
                        <Link href={card.href} key={card.href}>
                            <Card className="h-full cursor-pointer hover:shadow-lg transition-all group overflow-hidden border-none shadow-md rounded-xl active:scale-[0.98]">
                                <CardHeader className="flex flex-row items-center gap-3 p-4">
                                    <div className={cn("p-2.5 rounded-lg transition-transform group-hover:scale-110", card.color)}>
                                        {card.icon}
                                    </div>
                                    <div className="space-y-0.5">
                                        <CardTitle className="text-sm font-black uppercase italic tracking-tight">{card.title}</CardTitle>
                                        <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest line-clamp-1">{card.description}</p>
                                    </div>
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>

            <div className="space-y-6 sm:space-y-8">
                <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    Activity Terminal
                </h2>
                <DashboardTab details={userProfile} />
            </div>

            <div className="mt-16 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-t pt-8 opacity-40">
                <p>&copy; {year} FromStore2Door Global Logistics. Portmore, Jamaica.</p>
            </div>
        </div>
    );
}
