'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck, X } from 'lucide-react';
import Link from 'next/link';

/**
 * @fileOverview Standard Cookie Consent banner for FromStore2Door.
 * Ensures compliance with GDPR/CCPA tracking regulations.
 */
export function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('fstd-cookie-consent');
        if (!consent) {
            setIsVisible(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('fstd-cookie-consent', 'accepted');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 left-4 right-4 z-[100] md:left-auto md:right-6 md:max-w-md animate-in slide-in-from-bottom-10 duration-500">
            <Card className="border-2 shadow-2xl bg-background/95 backdrop-blur-md">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black uppercase tracking-tight">Privacy Preference</h3>
                                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2" onClick={() => setIsVisible(false)} aria-label="Close">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                We use cookies to enhance your logistics experience and analyze site traffic. By clicking "Accept", you agree to our <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>.
                            </p>
                            <div className="flex gap-2 pt-1">
                                <Button size="sm" onClick={handleAccept} className="font-bold uppercase text-[10px] h-8 px-6">Accept All</Button>
                                <Button variant="outline" size="sm" asChild className="font-bold uppercase text-[10px] h-8 px-4">
                                    <Link href="/privacy">Manage</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
