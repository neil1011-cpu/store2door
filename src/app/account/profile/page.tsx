'use client';

import { useAccountProfile } from '../layout';
import { AccountTab } from '../dashboard-components';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, LifeBuoy, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

export default function ProfilePage() {
    const { profile: userProfile } = useAccountProfile();

    if (!userProfile) return null;

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/account">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <User className="h-6 w-6 text-red-500" />
                            My Profile
                        </h1>
                        <p className="text-muted-foreground">Manage your personal details and addresses.</p>
                    </div>
                </div>
            </div>
            
            <AccountTab details={userProfile} />

            <Card className="mt-12 border-2 border-dashed border-primary/20 bg-primary/5">
                <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-xl">
                            <LifeBuoy className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="font-black uppercase italic tracking-tight">Need Assistance?</h3>
                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Our worldwide helpdesk is standing by.</p>
                        </div>
                    </div>
                    <Button variant="outline" className="font-black uppercase italic border-2" asChild>
                        <Link href="/account/support">
                            Support Center <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}