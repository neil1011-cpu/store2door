
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LayoutDashboard, FileUp, Package, MessageSquare, User, LogOut } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardTab, PreAlertTab, PackagesTab, SupportTab, AccountTab } from './dashboard-components';

export type AccountDetails = {
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
    }
}

export type Shipment = {
  id: string;
  trackingNumber: string;
  contents: string;
  status: 'Pending' | 'Processed' | 'In Transit' | 'Customs' | 'Delivered';
  date: string;
  cost?: number;
  paymentStatus?: 'Paid' | 'Unpaid';
  invoiceUrl: string;
};


export default function AccountPage() {
    const [details, setDetails] = useState<AccountDetails | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        try {
            const storedDetails = localStorage.getItem('accountDetails');
            if (storedDetails) {
                const parsedDetails = JSON.parse(storedDetails);
                // The address is nested in the user object from the API now
                const accountDetails: AccountDetails = {
                    ...parsedDetails,
                    address: {
                        address1: parsedDetails.address1,
                        address2: parsedDetails.address2,
                        city: parsedDetails.city,
                        state: parsedDetails.state,
                        zip: parsedDetails.zip,
                    }
                };
                setDetails(accountDetails);
            } else {
                router.push('/signup');
            }
        } catch (error) {
             console.error("Could not read from local storage", error);
             router.push('/signup');
        }
    }, [router]);

    const handleSignOut = () => {
        try {
            localStorage.removeItem('accountDetails');
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
    
    if (!details) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p>Loading account details...</p>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto py-12 px-4 md:px-6">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Welcome, {details.fullName}!</h1>
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
                        <DashboardTab details={details} />
                    </TabsContent>
                    <TabsContent value="pre-alert">
                        <PreAlertTab customerName={details.fullName} />
                    </TabsContent>
                    <TabsContent value="packages">
                        <PackagesTab />
                    </TabsContent>
                    <TabsContent value="support">
                        <SupportTab customerName={details.fullName} />
                    </TabsContent>
                    <TabsContent value="account">
                        <AccountTab details={details} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

    
