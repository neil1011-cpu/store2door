
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LayoutDashboard, FileUp, Package, MessageSquare, User, LogOut } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardTab, PreAlertTab, PackagesTab, SupportTab, AccountTab } from './dashboard-components';
import { useUser, useAuth, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

// Define the shape of your User document in Firestore
export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  mailboxNumber: string;
  address: {
    address1: string;
    address2: string;
    city: string;
    state: string;
    zip: string;
  };
};

export type Shipment = {
  id: string;
  trackingNumber: string;
  contents: string;
  status: 'Pending' | 'Processed' | 'In Transit' | 'Customs' | 'Delivered';
  date: string;
  cost?: number;
  paymentStatus?: 'Paid' | 'Unpaid';
  invoiceUrl: string;
  invoiceId?: string;
  customerId: string;
};


export default function AccountPage() {
    const router = useRouter();
    const { toast } = useToast();
    const auth = useAuth();
    const firestore = useFirestore();

    // useUser hook provides the auth user object and loading state
    const { user, isUserLoading } = useUser();
    
    const userDocRef = useMemoFirebase(() => {
      if (!user) return null;
      return doc(firestore, 'users', user.uid);
    }, [firestore, user]);
    
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

    useEffect(() => {
        // If auth is done loading and there's no user, redirect to sign-in
        if (!isUserLoading && !user) {
            router.push('/signin');
        }
    }, [isUserLoading, user, router]);

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
    
    // Show a loading screen while auth state or user profile is being fetched
    if (isUserLoading || isProfileLoading) {
        return (
            <div className="container mx-auto py-12 px-4 md:px-6">
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <Skeleton className="h-9 w-64 mb-2" />
                        <Skeleton className="h-5 w-80" />
                    </div>
                </div>
                <div className="flex flex-col md:flex-row gap-6">
                    <Skeleton className="h-60 md:w-1/5" />
                    <Skeleton className="h-96 flex-1" />
                </div>
            </div>
        );
    }
    
    if (!userProfile) {
        // This case might happen briefly or if the user doc doesn't exist
        return (
             <div className="flex justify-center items-center h-screen">
                <p>Could not load user profile. Please try again.</p>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto py-12 px-4 md:px-6">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Welcome, {userProfile.fullName}!</h1>
                    <p className="text-muted-foreground">Manage your shipments and account details here.</p>
                </div>
            </div>
             <Tabs defaultValue="dashboard" className="flex flex-col md:flex-row gap-6">
                <div className="flex flex-col gap-2 md:w-1/5">
                    <TabsList className="flex md:flex-col h-auto p-2">
                        <TabsTrigger value="dashboard" className="w-full justify-start gap-2">
                            <LayoutDashboard className="h-5 w-5" /> Dashboard
                        </TabsTrigger>
                        <TabsTrigger value="pre-alert" className="w-full justify-start gap-2">
                            <FileUp className="h-5 w-5" /> Pre-Alert
                        </TabsTrigger>
                        <TabsTrigger value="packages" className="w-full justify-start gap-2">
                            <Package className="h-5 w-5" /> My Packages
                        </TabsTrigger>
                        <TabsTrigger value="support" className="w-full justify-start gap-2">
                            <MessageSquare className="h-5 w-5" /> Support
                        </TabsTrigger>
                        <TabsTrigger value="account" className="w-full justify-start gap-2">
                            <User className="h-5 w-5" /> My Account
                        </TabsTrigger>
                    </TabsList>
                     <Button variant="outline" onClick={handleSignOut} className="w-full justify-start gap-2 p-2 h-auto text-sm font-medium">
                        <LogOut className="h-5 w-5" /> Sign Out
                    </Button>
                </div>


                <div className="flex-1">
                    <TabsContent value="dashboard">
                        <DashboardTab details={userProfile} />
                    </TabsContent>
                    <TabsContent value="pre-alert">
                        <PreAlertTab customerId={userProfile.id} customerName={userProfile.fullName} />
                    </TabsContent>
                    <TabsContent value="packages">
                        <PackagesTab customerId={userProfile.id} />
                    </TabsContent>
                    <TabsContent value="support">
                        <SupportTab details={userProfile} />
                    </TabsContent>
                    <TabsContent value="account">
                        <AccountTab details={userProfile} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

