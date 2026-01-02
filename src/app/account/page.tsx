
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LayoutGrid, BellRing, Package, LifeBuoy, User, LogOut } from 'lucide-react';
import { DashboardTab, PreAlertTab, PackagesTab, SupportTab, AccountTab } from './dashboard-components';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type View = 'dashboard' | 'pre-alert' | 'packages' | 'support' | 'account';

const featureCards = [
    {
        view: 'dashboard' as View,
        title: 'Dashboard',
        description: 'View a summary of your account activity.',
        icon: <LayoutGrid className="h-8 w-8" />,
        color: 'bg-blue-500 text-white',
    },
    {
        view: 'pre-alert' as View,
        title: 'Pre-Alert',
        description: 'Notify us of an incoming package.',
        icon: <BellRing className="h-8 w-8" />,
        color: 'bg-orange-500 text-white',
    },
    {
        view: 'packages' as View,
        title: 'My Packages',
        description: 'Track all your shipments and invoices.',
        icon: <Package className="h-8 w-8" />,
        color: 'bg-green-500 text-white',
    },
    {
        view: 'support' as View,
        title: 'Support',
        description: 'Get help via our WhatsApp channel.',
        icon: <LifeBuoy className="h-8 w-8" />,
        color: 'bg-purple-500 text-white',
    },
    {
        view: 'account' as View,
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
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [currentView, setCurrentView] = useState<View>('dashboard');

    const userProfileRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    useEffect(() => {
        if (isUserLoading) return;
        if (!user) router.push('/signin');
    }, [user, isUserLoading, router]);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            toast({
                title: 'Signed Out',
                description: 'You have been successfully signed out.',
            });
            router.push('/');
        } catch (error) {
            console.error("Could not sign out", error);
            toast({
                title: 'Sign Out Failed',
                description: 'Something went wrong. Please try again.',
                variant: 'destructive',
            });
        }
    }
    
    if (isUserLoading || isProfileLoading) {
        return (
            <div className="container mx-auto py-12 px-4 md:px-6">
                <div className="mb-8">
                    <Skeleton className="h-9 w-64 mb-2" />
                    <Skeleton className="h-5 w-80" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
                </div>
            </div>
        );
    }

    if (!userProfile) {
        return (
            <div className="container mx-auto py-12 px-4 md:px-6">
                 <h1 className="text-2xl md:text-3xl font-bold">Account Not Found</h1>
                <p className="text-muted-foreground">We couldn't find your account details. Please contact support.</p>
                <Button onClick={handleSignOut} className="mt-4">Sign Out</Button>
            </div>
        );
    }

    const renderContent = () => {
        switch (currentView) {
            case 'dashboard': return <DashboardTab details={userProfile} />;
            case 'pre-alert': return <PreAlertTab customerId={userProfile.id} customerName={userProfile.fullName} />;
            case 'packages': return <PackagesTab customerId={userProfile.id} />;
            case 'support': return <SupportTab details={userProfile} />;
            case 'account': return <AccountTab details={userProfile} />;
            default: return <DashboardTab details={userProfile} />;
        }
    };
    
    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold">Welcome, {userProfile.fullName}!</h1>
                <p className="text-muted-foreground">Manage your shipments and account details here.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
                {featureCards.map(card => (
                     <Card 
                        key={card.view}
                        className={cn(
                            "cursor-pointer transform transition-transform hover:scale-105 hover:shadow-lg",
                            currentView === card.view ? "ring-2 ring-primary ring-offset-2" : "border"
                         )}
                         onClick={() => setCurrentView(card.view)}
                    >
                        <CardHeader className="items-center text-center p-4">
                            <div className={cn("p-4 rounded-lg mb-2", card.color)}>
                                {card.icon}
                            </div>
                            <CardTitle className="text-base font-semibold">{card.title}</CardTitle>
                        </CardHeader>
                    </Card>
                ))}
            </div>

            <div className="min-w-0">
                {renderContent()}
            </div>
            
            <div className="mt-12 text-center">
                 <Button variant="outline" onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </Button>
            </div>
        </div>
    );
}
