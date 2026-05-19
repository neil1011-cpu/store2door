
'use client';

import { useAccountProfile } from '../layout';
import { PackagesTab } from '../dashboard-components';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package } from 'lucide-react';
import Link from 'next/link';

export default function PackagesPage() {
    const userProfile = useAccountProfile();

    if (!userProfile) return null;

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/account">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Package className="h-6 w-6 text-green-500" />
                            My Packages
                        </h1>
                        <p className="text-muted-foreground">Track status and view invoices.</p>
                    </div>
                </div>
            </div>
            
            <PackagesTab customerId={userProfile.id} mailboxNumber={userProfile.mailboxNumber} />
        </div>
    );
}
