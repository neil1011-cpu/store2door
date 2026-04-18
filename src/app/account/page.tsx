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
import { ThemeToggle } from '@/components/theme-toggle';

const featureCards = [
    {
        href: '/account/pre-alert',
        title: 'Pre-Alert',
        description: 'Notify us of an incoming package.',
        icon: <BellRing className="h-8 w-8" />,
        color: 'bg-orange-500 text-white',
    },
    {
        href: '/account/packages',
        title: 'My Packages',
        description: 'Track all your shipments and invoices.',
        icon: <Package className="h-8 w-8" />,
        color: 'bg-green-500 text-white',
    },
    {
        href: '/account/calculator',
        title: 'Calculator',
        description: 'Estimate your customs and shipping costs.',
        icon: <Calculator className="h-8 w-8" />,
        color: 'bg-indigo-500 text-white',
    },
    {
        href: '/account/support',
        title: 'Support',
        description: 'Get help via our WhatsApp channel.',
        icon: <LifeBuoy className="h-8 w-8" />,
        color: 'bg-purple-500 text-white',
    },
    {
        href: '/account/profile',
        title: 'My Account',
        description: 'Manage your profile and addresses.',
        icon: <User className="h-8 w-8" />,
        color: 'bg-red-500 text-white',
    },
];

export default function AccountPage() {
    const router = useRouter();
    const { toast } = useToast();
    const auth = useAuth();
    const userProfile = useAccountProfile();

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
        <div className="container mx-auto py-8 px-4 md:px-6">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Welcome, {userProfile.fullName}!</h1>
                    <p className="text-muted-foreground mt-1">Manage your imports and account settings.</p>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <Button variant="outline" onClick={handleSignOut} size="sm">
                        <LogOut className="mr-2 h-4 w-4" /> Sign Out
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {featureCards.map(card => (
                    <Link href={card.href} key={card.href}>
                         <Card className="h-full cursor-pointer hover:shadow-lg transition-all group overflow-hidden border-none shadow-md">
                            <CardHeader className="flex flex-row items-center gap-4 p-6">
                                <div className={cn("p-4 rounded-xl transition-transform group-hover:scale-110", card.color)}>
                                    {card.icon}
                                </div>
                                <div className="space-y-1">
                                    <CardTitle className="text-xl">{card.title}</CardTitle>
                                    <p className="text-sm text-muted-foreground line-clamp-1">{card.description}</p>
                                </div>
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="space-y-8">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <LayoutGrid className="h-6 w-6 text-primary" />
                    Overview
                </h2>
                <DashboardTab details={userProfile} />
            </div>

            <div className="mt-16 text-center text-sm text-muted-foreground border-t pt-8">
                <p>&copy; {new Date().getFullYear()} FromStore2Door. All rights reserved.</p>
            </div>
        </div>
    );
}
