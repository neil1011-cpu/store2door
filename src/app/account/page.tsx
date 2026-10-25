'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
    LayoutGrid, 
    BellRing, 
    Package, 
    LifeBuoy, 
    User, 
    Calculator, 
    ShieldCheck, 
    MapPin,
    Loader2,
    ArrowRight
} from 'lucide-react';
import { DashboardTab, WarehouseAddressCard } from './dashboard-components';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAccountProfile } from './layout';
import { useState, useEffect } from 'react';

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
        color: 'bg-red-50 text-red-500',
    },
];

export default function AccountPage() {
    const { profile: userProfile, totalToBePaid } = useAccountProfile();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
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
                    <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-foreground">Welcome, {userProfile.full_name?.split(' ')[0] || 'User'}!</h1>
                    <div className="flex items-center gap-4 mt-2">
                        <Badge variant="outline" className="h-8 px-4 font-black italic tracking-widest border-2">MAILBOX: {userProfile.mailbox_number}</Badge>
                        <Badge className="bg-primary text-primary-foreground font-black italic text-[9px] uppercase h-8 px-4">Verified Client</Badge>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-8">
                    {/* Authorized Standing Card (Original Compact Design) */}
                    <Card className="border shadow-sm max-w-sm">
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className={cn("h-4 w-4", hasDues ? "text-red-600" : "text-primary/40")} />
                                <div>
                                    <p className="text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground italic">Authorized Standing</p>
                                    <p className={cn("text-lg font-black italic tracking-tighter leading-none mt-1", hasDues ? "text-red-600" : "text-primary")}>
                                        JMD ${totalToBePaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                            <Button variant={hasDues ? "destructive" : "outline"} size="sm" className="h-7 text-[8px] font-black uppercase px-3" asChild>
                                <Link href="/account/packages">{hasDues ? "Settle Dues" : "Registry"}</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Feature Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {featureCards.map(card => (
                            <Link href={card.href} key={card.href}>
                                <Card className="h-full cursor-pointer hover:shadow-lg transition-all border-2 rounded-2xl overflow-hidden group">
                                    <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                                        <div className={cn("p-4 rounded-xl shadow-sm transition-transform group-hover:scale-110", card.color)}>
                                            {card.icon}
                                        </div>
                                        <div>
                                            <CardTitle className="text-[10px] font-black uppercase tracking-widest">{card.title}</CardTitle>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>

                    <div className="space-y-4 pt-4">
                        <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3 text-foreground">
                            <LayoutGrid className="h-5 w-5 text-primary" /> Recent Activity
                        </h2>
                        <DashboardTab details={userProfile} />
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    <WarehouseAddressCard details={userProfile} />

                    {/* Logistics Support Card (Fixed Button Contrast) */}
                    <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-zinc-950 text-white">
                        <CardHeader className="bg-white/5 border-b p-6">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 text-zinc-400">
                                <LifeBuoy className="h-4 w-4 text-primary" /> Support Hub
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <p className="text-xs font-medium leading-relaxed opacity-60 italic">
                                Need assistance with tracking, customs, or delivery? Our worldwide helpdesk is standing by.
                            </p>
                            <div className="grid gap-3">
                                <Button className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 font-black uppercase italic shadow-xl text-white border-none" asChild>
                                    <Link href="https://wa.me/18765069727" target="_blank">WhatsApp Command</Link>
                                </Button>
                                <Button variant="outline" className="w-full h-12 border-white/40 hover:bg-white/10 font-black uppercase italic text-white rounded-xl shadow-lg" asChild>
                                    <Link href="/account/support">Email Helpdesk</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="p-6 rounded-2xl border-2 border-dashed bg-muted/20 flex items-center gap-4 group hover:bg-muted/30 transition-all">
                        <div className="bg-primary/10 p-3 rounded-xl">
                            <MapPin className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-black uppercase italic tracking-tighter text-sm">Collection Hub</h4>
                            <p className="text-[9px] font-bold uppercase text-muted-foreground mt-0.5">Portmore, St. Catherine, JA</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-16 text-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-t pt-8 opacity-40">
                <p>&copy; {new Date().getFullYear()} FromStore2Door Global Logistics. SECURE REGISTRY.</p>
            </div>
        </div>
    );
}
