
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check } from 'lucide-react';
import Link from 'next/link';

type AccountDetails = {
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

export default function AccountPage() {
    const [details, setDetails] = useState<AccountDetails | null>(null);
    const router = useRouter();
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        try {
            const storedDetails = localStorage.getItem('accountDetails');
            if (storedDetails) {
                setDetails(JSON.parse(storedDetails));
            } else {
                // If no details are found, redirect back to sign up.
                router.push('/signup');
            }
        } catch (error) {
             console.error("Could not read from local storage", error);
             router.push('/signup');
        }
    }, [router]);
    
    if (!details) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p>Loading account details...</p>
            </div>
        );
    }

    const fullAddress = `${details.address.address1}\n${details.address.address2}\n${details.address.city}, ${details.address.state} ${details.address.zip}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(fullAddress);
        setCopied(true);
        toast({
            title: 'Address Copied!',
            description: 'Your US address has been copied to the clipboard.',
        });
        setTimeout(() => setCopied(false), 2000); // Reset icon after 2 seconds
    };

    return (
        <div className="container mx-auto py-12 px-4 md:px-6 max-w-3xl">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">Welcome, {details.fullName}!</CardTitle>
                    <CardDescription>
                        Your account has been successfully created. Here is your personal US shipping address.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Your New US Address</h3>
                        <div className="relative rounded-lg border bg-muted p-4 space-y-1">
                            <p className="font-mono">{details.address.address1}</p>
                            <p className="font-mono font-bold text-primary">{details.address.address2}</p>
                            <p className="font-mono">{details.address.city}, {details.address.state} {details.address.zip}</p>
                             <Button 
                                size="icon" 
                                variant="ghost" 
                                className="absolute top-2 right-2 h-8 w-8"
                                onClick={handleCopy}
                            >
                                {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                             </Button>
                        </div>
                         <p className="text-sm text-muted-foreground mt-2">
                            Use this address as your shipping destination when shopping from US stores.
                        </p>
                    </div>

                    <Separator />

                    <div>
                        <h3 className="font-semibold text-lg mb-2">Account Details</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Full Name:</span>
                                <span>{details.fullName}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Email:</span>
                                <span>{details.email}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Phone Number:</span>
                                <span>{details.phone}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Mailbox Number:</span>
                                <span className="font-mono">{details.mailboxNumber}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button asChild>
                        <Link href="/admin">Go to My Dashboard</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

