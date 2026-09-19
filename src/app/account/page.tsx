'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LayoutGrid, BellRing, Package, LifeBuoy, User, LogOut, Calculator, Wallet, TrendingDown, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DashboardTab } from './dashboard-components';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAccountProfile } from './layout';
import { useState, useEffect } from 'react';
import { useSupabase } from '@/components/supabase-provider';

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
    {
        href: '/account/support',
        title: 'Support',
        description: 'Need help? Contact our team.',
        icon: <LifeBuoy className="h-5 w-5 sm:h-6 sm:w-6" />,
        color: 'bg-purple-500 text-white',
    },
];

export default function AccountPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { supabase } = useSupabase();
    const { profile: userProfile, balance: walletBalance } = useAccountProfile();
    const [mounted, setMounted] = useState(false);
    const [year, setYear] = useState<number>(new Date().getFullYear());

    useEffect(() => {
        setMounted(true);
        setYear(new Date().getFullYear());
    }, []);

    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut();
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

    const isIndebted = walletBalance < 0;

    return (
        <div className="container mx-auto px-4 md:px-6 pb-20">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                <div className="text-center md:text-left">
                    <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter">Welcome, {userProfile.full_name?.split(' ')[0] || 'User'}!</h1>
                    <p className="text-muted-foreground text-xs sm:text-sm font-bold uppercase tracking-widest opacity-60 mt-1">Global Mailbox: {userProfile.mailbox_number}</p>
                </div>
                <div className="flex items-center justify-center md:justify-end gap-2">
                    <Button variant="outline" onClick={handleSignOut} size="sm" className="font-black uppercase italic border-2 px-6 h-10">
                        <LogOut className="mr-2 h-4 w-4" /> Sign Out
                    </Button>
                </div>
            </div>

            <div className="space-y-8">
                {/* Feature Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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

                <div className="space-y-6">
                    <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                        <LayoutGrid className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                        Activity Terminal
                    </h2>
                    <DashboardTab details={userProfile} />
                </div>

                {/* Thinner Ledger Card at the Bottom */}
                <Card className={cn(
                    "border-none shadow-lg rounded-2xl overflow-hidden transition-all",
                    isIndebted ? "bg-red-50 border-l-4 border-l-red-600" : "bg-primary text-primary-foreground"
                )}>
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "h-12 w-12 rounded-xl flex items-center justify-center shadow-sm",
                                    isIndebted ? "bg-red-600 text-white" : "bg-white/10 text-white"
                                )}>
                                    <Wallet className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className={cn(
                                        "text-[10px] font-black uppercase tracking-widest",
                                        isIndebted ? "text-red-600/70" : "text-white/60"
                                    )}>Ledger Standing</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className={cn(
                                            "text-2xl font-black italic tracking-tighter",
                                            isIndebted ? "text-red-600" : "text-white"
                                        )}>
                                            JMD ${Math.abs(walletBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                        <Badge className={cn(
                                            "uppercase text-[8px] font-black italic tracking-widest",
                                            isIndebted ? "bg-red-600 text-white" : "bg-white/20 text-white border-white/10"
                                        )}>
                                            {isIndebted ? 'Outstanding' : 'Credit'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            
                            <div className={cn(
                                "flex-1 sm:max-w-md p-3 rounded-xl flex items-center gap-3",
                                isIndebted ? "bg-red-100/50" : "bg-white/5 border border-white/10"
                            )}>
                                {isIndebted ? <AlertCircle className="h-4 w-4 text-red-600 shrink-0" /> : <CheckCircle2 className="h-4 w-4 text-white/60 shrink-0" />}
                                <p className={cn(
                                    "text-[9px] font-bold leading-tight uppercase tracking-tight",
                                    isIndebted ? "text-red-800" : "text-white/90"
                                )}>
                                    {isIndebted 
                                        ? "Settlement required upon package arrival in Jamaica." 
                                        : "Account in good standing. Credits auto-apply to transits."}
                                </p>
                            </div>

                            <Button variant="outline" size="sm" className={cn(
                                "font-black uppercase italic tracking-tighter h-10 px-6 shrink-0 border-2",
                                isIndebted ? "border-red-200 text-red-600 hover:bg-red-100" : "bg-white/10 border-white/20 hover:bg-white/20 text-white"
                            )} asChild>
                                <Link href="/account/packages">Billing Details</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-16 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-t pt-8 opacity-40">
                <p>&copy; {year} FromStore2Door Global Logistics. Portmore, Jamaica.</p>
            </div>
        </div>
    );
}
