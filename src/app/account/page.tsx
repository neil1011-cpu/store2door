'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LayoutGrid, BellRing, Package, LifeBuoy, User, LogOut, Calculator, ArrowRight } from 'lucide-react';
import { DashboardTab } from './dashboard-components';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAccountProfile } from './layout';
import { useState, useEffect } from 'react';

const featureCards = [
    {
        href: '/account/pre-alert',
        title: 'Pre-Alert',
        description: 'Notify us of an incoming package.',
        icon: <BellRing className="h-6 w-6 sm:h-8 sm:w-8" />,
        color: 'bg-orange-500 text-white',
    },
    {
        href: '/account/packages',
        title: 'My Packages',
        description: 'Track all your shipments and invoices.',
        icon: <Package className="h-6 w-6 sm:h-8 sm:w-8" />,
        color: 'bg-green-500 text-white',
    },
    {
        href: '/account/calculator',
        title: 'Calculator',
        description: 'Estimate your customs and shipping costs.',
        icon: <Calculator className="h-6 w-6 sm:h-8 sm:w-8" />,
        color: 'bg-indigo-500 text-white',
    },
    {
        href: '/account/support',
        title: 'Support',
        description: 'Get help via our WhatsApp channel.',
        icon: <LifeBuoy className="h-6 w-6 sm:h-8 sm:w-8" />,
        color: 'bg-purple-500 text-white',
    },
    {
        href: '/account/profile',
        title: 'My Account',
        description: 'Manage your profile and addresses.',
        icon: <User className="h-6 w-6 sm:h-8 sm:w-8" />,
        color: 'bg-red-500 text-white',
    },
];

export default function AccountPage() {
    const router = useRouter();
    const { toast } = useToast();
    const auth = useAuth();
    const userProfile = useAccountProfile();
    const [year, setYear] = useState<number | null>(null);

    useEffect(() => {
        setYear(new Date().getFullYear());
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
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

    if (!userProfile) return null;

    return (
        <div className="container mx-auto px-4 md:px-6 pb-20">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-12">
                {featureCards.map(card => (
                    <Link href={card.href} key={card.href}>
                         <Card className="h-full cursor-pointer hover:shadow-xl transition-all group overflow-hidden border-none shadow-md rounded-2xl active:scale-[0.98]">
                            <CardHeader className="flex flex-row items-center gap-4 p-4 sm:p-6">
                                <div className={cn("p-3 sm:p-4 rounded-xl transition-transform group-hover:scale-110", card.color)}>
                                    {card.icon}
                                </div>
                                <div className="space-y-0.5">
                                    <CardTitle className="text-base sm:text-xl font-black uppercase italic tracking-tight">{card.title}</CardTitle>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-widest line-clamp-1">{card.description}</p>
                                </div>
                                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="space-y-6 sm:space-y-8">
                <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    Account Overview
                </h2>
                <DashboardTab details={userProfile} />
            </div>

            <div className="mt-16 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-t pt-8 opacity-40">
                <p>&copy; {year || '...'} FromStore2Door Global Logistics. Portmore, Jamaica.</p>
            </div>
        </div>
    );
}
