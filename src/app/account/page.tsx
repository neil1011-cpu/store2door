'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LayoutGrid, BellRing, Package, LifeBuoy, User, LogOut, Calculator, Wallet, TrendingDown, TrendingUp, AlertCircle, CheckCircle2, Loader2, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';
import { DashboardTab, WarehouseAddressCard } from './dashboard-components';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAccountProfile } from './layout';
import { useState, useEffect } from 'react';
import { useSupabase } from '@/components/supabase-provider';
import { Separator } from '@/components/ui/separator';

const featureCards = [
    {
        href: '/account/pre-alert',
        title: 'Pre-Alert',
        description: 'Notify us of incoming items.',
        icon: <BellRing className="h-5 w-5" />,
        color: 'bg-orange-500 text-white',
    },
    {
        href: '/account/packages',
        title: 'My Packages',
        description: 'Track your shipments.',
        icon: <Package className="h-5 w-5" />,
        color: 'bg-green-500 text-white',
    },
    {
        href: '/account/calculator',
        title: 'Calculator',
        description: 'Estimate customs costs.',
        icon: <Calculator className="h-5 w-5" />,
        color: 'bg-indigo-500 text-white',
    },
    {
        href: '/account/profile',
        title: 'My Profile',
        description: 'Manage details & addresses.',
        icon: <User className="h-5 w-5" />,
        color: 'bg-red-500 text-white',
    },
];

export default function AccountPage() {
    const { profile: userProfile, totalToBePaid } = useAccountProfile();
    const [mounted, setMounted] = useState(false);
    const [year, setYear] = useState<number | null>(null);

    useEffect(() => {
        setMounted(true);
        setYear(new Date().getFullYear());
    }, []);

    if (!userProfile || !mounted) return (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="animate-spin text-primary h-8 w-8" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Syncing with Registry...</p>
        </div>
    );

    const hasDues = totalToBePaid > 0;

    return (
        <div className="container mx-auto px-4 md:px-6 pb-20 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter">Welcome, {userProfile.full_name?.split(' ')[0] || 'User'}!</h1>
                    <div className="flex items-center gap-4 mt-2">
                        <Badge variant="outline" className="h-8 px-4 font-black italic tracking-widest border-2">MAILBOX: {userProfile.mailbox_number}</Badge>
                        <Badge className="bg-primary text-primary-foreground font-black italic text-[9px] uppercase h-8 px-4">Status: Verified</Badge>
                    </div>
                </div>
                <div className="hidden lg:flex items-center gap-4 text-right">
                    <div>
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest italic">Registry Balance</p>
                        <p className={cn("text-xl font-black italic tracking-tighter leading-none mt-1", hasDues ? "text-red-600" : "text-primary")}>
                            JMD ${totalToBePaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-8">
                    {/* Settlement Banner */}
                    <Card className={cn(
                        "border-2 shadow-xl rounded-[2rem] overflow-hidden transition-all relative group",
                        hasDues ? "bg-red-50 border-red-200" : "bg-primary/5 border-primary/20"
                    )}>
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                            <Wallet size={120} />
                        </div>
                        <CardContent className="p-8 md:p-10 relative z-10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck className={cn("h-5 w-5", hasDues ? "text-red-600" : "text-primary")} />
                                        <h2 className={cn("text-xl font-black uppercase italic tracking-tighter", hasDues ? "text-red-700" : "text-primary")}>Authorized Standing</h2>
                                    </div>
                                    <p className="text-sm font-medium leading-relaxed opacity-70 max-w-md text-foreground">
                                        {hasDues 
                                            ? "Immediate settlement is required for packages currently waiting at our local collection hub." 
                                            : "Your registry is clear. We'll notify you as soon as new items arrive at our warehouse."}
                                    </p>
                                    <div className="pt-2">
                                        <h3 className={cn("text-3xl font-black italic tracking-tighter", hasDues ? "text-red-600" : "text-primary")}>JMD ${totalToBePaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">Dues for collection</p>
                                    </div>
                                </div>
                                <div className="shrink-0">
                                    <Button variant={hasDues ? "destructive" : "default"} className="h-14 px-8 rounded-xl font-black uppercase italic shadow-lg" asChild>
                                        <Link href="/account/packages">
                                            {hasDues ? "Settle Now" : "Manage Registry"} <ArrowRight className="ml-2 h-5 w-5" />
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Feature Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {featureCards.map(card => (
                            <Link href={card.href} key={card.href}>
                                <Card className="h-full cursor-pointer hover:shadow-xl transition-all group overflow-hidden border-2 rounded-[2rem] hover:border-primary/20">
                                    <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                                        <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110 shadow-lg", card.color)}>
                                            {card.icon}
                                        </div>
                                        <div>
                                            <CardTitle className="text-xs font-black uppercase italic tracking-widest">{card.title}</CardTitle>
                                            <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-60">{card.description}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>

                    <div className="space-y-4 pt-4">
                        <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                            <LayoutGrid className="h-5 w-5 text-primary" /> Active Registry Feed
                        </h2>
                        <DashboardTab details={userProfile} />
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    <WarehouseAddressCard details={userProfile} />

                    <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-zinc-950 text-white">
                        <CardHeader className="bg-white/5 border-b p-8 pb-6">
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 text-zinc-400">
                                <LifeBuoy className="h-4 w-4 text-primary" /> Logistics Support
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <p className="text-xs font-medium leading-relaxed opacity-60 italic">
                                Need assistance with tracking, customs, or delivery scheduling? Our worldwide helpdesk is standing by.
                            </p>
                            <div className="grid gap-3">
                                <Button className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 font-black uppercase italic shadow-xl rounded-xl" asChild>
                                    <Link href="https://wa.me/18765069727" target="_blank">WhatsApp Hub</Link>
                                </Button>
                                <Button variant="outline" className="w-full h-14 border-white/10 hover:bg-white/5 font-black uppercase italic text-xs rounded-xl" asChild>
                                    <Link href="/account/support">Email Helpdesk</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="p-8 rounded-[2rem] border-4 border-dashed bg-muted/20 flex flex-col items-center text-center gap-4 group hover:bg-muted/30 transition-all">
                        <div className="bg-primary/10 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                            <MapPin className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-black uppercase italic tracking-tighter text-lg">Collection Station</h4>
                            <p className="text-[10px] font-bold uppercase text-muted-foreground mt-1">Portmore, St. Catherine, Jamaica</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-16 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-t pt-8 opacity-40">
                <p>&copy; {year} FromStore2Door Global Logistics. All Rights Reserved.</p>
            </div>
        </div>
    );
}
